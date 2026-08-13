export const HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL =
  'eslm-homepage-processing-graph-projection';

const PROCESSING_NODE_KINDS = Object.freeze([
  'source',
  'process',
  'coordinator',
  'authority-gate',
  'sink',
]);

const EXTERNAL_PACKET_NEIGHBOURS = Object.freeze({
  'packet:runtime:bounded-request': Object.freeze({
    label: 'CLI operator or library client', kind: 'external-actor-system',
  }),
  'packet:runtime:runtime-result': Object.freeze({
    label: 'CLI operator or library client', kind: 'external-actor-system',
  }),
  'packet:compiler:frozen-source': Object.freeze({
    label: 'Source acquisition and frozen-file store', kind: 'external-system',
  }),
  'packet:compiler:immutable-package': Object.freeze({
    label: 'Package catalog and immutable storage', kind: 'external-system',
  }),
  'packet:research:episode-batch': Object.freeze({
    label: 'Authorized dataset projection', kind: 'external-system',
  }),
  'packet:research:source-status': Object.freeze({
    label: 'Authorized dataset projection', kind: 'external-system',
  }),
  'packet:research:promotion-proposal': Object.freeze({
    label: 'Human review and promotion decision', kind: 'external-actor',
  }),
});

function externalNeighbour(packetTypes, fallbackLabel) {
  const neighbours = packetTypes.map((packetType) => EXTERNAL_PACKET_NEIGHBOURS[packetType])
    .filter(Boolean);
  if (neighbours.length === 0) return { label: fallbackLabel, kind: 'external-system' };
  const labels = [...new Set(neighbours.map((item) => item.label))];
  const kinds = [...new Set(neighbours.map((item) => item.kind))];
  return {
    label: labels.join(' / '),
    kind: kinds.length === 1 ? kinds[0] : 'external-actor-system',
  };
}

function identityOf(strategy) {
  return `${strategy.strategyId}@${strategy.version}`;
}

function uniqueIndex(rows, key, label) {
  const result = new Map();
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(`${label} requires a non-empty ${key}.`);
    }
    if (result.has(value)) throw new TypeError(`${label} repeats ${value}.`);
    result.set(value, row);
  }
  return result;
}

function rows(values, label) {
  if (!Array.isArray(values) || values.some((value) => value === null || typeof value !== 'object')) {
    throw new TypeError(`${label} must be an array of records.`);
  }
  return [...values];
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/**
 * Build the documentation-only projection from the executable descriptive catalogs.
 * The checked-in browser snapshot is tested against this function, so catalog drift
 * cannot silently leave the homepage with stale circuit, node, or strategy names.
 */
export function buildHomepageProcessingGraphProjection(catalog, strategyCatalog) {
  if (!catalog || !strategyCatalog) throw new TypeError('Both catalogs are required.');
  const circuits = rows(catalog.circuits, 'catalog.circuits');
  const nodes = rows(catalog.nodes, 'catalog.nodes');
  const edges = rows(catalog.edges, 'catalog.edges');
  const strategies = rows(strategyCatalog.strategies, 'strategyCatalog.strategies');
  const circuitById = uniqueIndex(circuits, 'circuitId', 'catalog.circuits');
  const nodeById = uniqueIndex(nodes, 'nodeId', 'catalog.nodes');
  const edgeById = uniqueIndex(edges, 'edgeId', 'catalog.edges');
  const familyById = uniqueIndex(catalog.strategyFamilies, 'familyId', 'catalog.strategyFamilies');
  const packetTypes = new Set(catalog.packetTypes);
  const resourceDimensions = new Set(catalog.resourceDimensions);
  const strategyByIdentity = new Map();
  for (const strategy of strategies) {
    const identity = identityOf(strategy);
    if (strategyByIdentity.has(identity)) {
      throw new TypeError(`strategyCatalog.strategies repeats ${identity}.`);
    }
    strategyByIdentity.set(identity, strategy);
  }
  const familyNodeIds = new Map([...familyById.keys()].map((familyId) => [familyId, []]));
  if (!circuitById.has(catalog.rootCircuitId)) {
    throw new TypeError(`Unknown root circuit ${catalog.rootCircuitId}.`);
  }
  if (circuitById.get(catalog.rootCircuitId).parentCircuitId !== null) {
    throw new TypeError('The root circuit must not have a parent.');
  }
  for (const circuit of circuits) {
    if (circuit.parentCircuitId !== null && !circuitById.has(circuit.parentCircuitId)) {
      throw new TypeError(`${circuit.circuitId} references unknown parent ${circuit.parentCircuitId}.`);
    }
  }
  const reachableCircuitIds = new Set();
  const visitCircuit = (circuitId, ancestors = new Set()) => {
    if (ancestors.has(circuitId)) throw new TypeError(`Circuit cycle reaches ${circuitId}.`);
    if (reachableCircuitIds.has(circuitId)) return;
    reachableCircuitIds.add(circuitId);
    const nextAncestors = new Set([...ancestors, circuitId]);
    for (const child of circuits.filter((candidate) => candidate.parentCircuitId === circuitId)) {
      visitCircuit(child.circuitId, nextAncestors);
    }
  };
  visitCircuit(catalog.rootCircuitId);
  if (reachableCircuitIds.size !== circuits.length) {
    const omitted = circuits.filter((circuit) => !reachableCircuitIds.has(circuit.circuitId))
      .map((circuit) => circuit.circuitId);
    throw new TypeError(`Homepage circuit hierarchy omits ${omitted.join(', ')}.`);
  }

  const strategyNodeIds = new Map([...strategyByIdentity.keys()].map((identity) => [identity, []]));
  const projectedNodes = nodes.map((node) => {
    if (!circuitById.has(node.circuitId)) {
      throw new TypeError(`${node.nodeId} references unknown circuit ${node.circuitId}.`);
    }
    for (const packetType of [...node.inputPacketTypes, ...node.outputPacketTypes]) {
      if (!packetTypes.has(packetType)) {
        throw new TypeError(`${node.nodeId} references unknown packet ${packetType}.`);
      }
    }
    for (const resourceDimension of node.resourceDimensions) {
      if (!resourceDimensions.has(resourceDimension)) {
        throw new TypeError(`${node.nodeId} references unknown resource ${resourceDimension}.`);
      }
    }
    const familyMembers = node.strategyFamilyRefs.flatMap((familyId) => {
      const family = familyById.get(familyId);
      if (!family) throw new TypeError(`${node.nodeId} references unknown family ${familyId}.`);
      return family.members;
    });
    const strategyIdentities = [...new Set([...node.strategyRefs, ...familyMembers])].toSorted();
    for (const familyId of node.strategyFamilyRefs) familyNodeIds.get(familyId).push(node.nodeId);
    for (const identity of strategyIdentities) {
      if (!strategyByIdentity.has(identity)) {
        throw new TypeError(`${node.nodeId} references unknown strategy ${identity}.`);
      }
      strategyNodeIds.get(identity).push(node.nodeId);
    }
    const outgoingEdgeIds = edges.filter((edge) => edge.from === node.nodeId)
      .map((edge) => edge.edgeId);
    const incomingEdgeIds = edges.filter((edge) => edge.to === node.nodeId)
      .map((edge) => edge.edgeId);
    return {
      nodeId: node.nodeId,
      label: node.label,
      circuitId: node.circuitId,
      kind: node.kind,
      stageRef: node.stageRef,
      role: node.role,
      authority: node.authority,
      answerAuthority: node.answerAuthority,
      canVote: node.canVote,
      implementationState: node.implementationState,
      ownerModule: node.ownerModule,
      inputPacketTypes: [...node.inputPacketTypes],
      outputPacketTypes: [...node.outputPacketTypes],
      resourceDimensions: [...node.resourceDimensions],
      strategyFamilyIds: [...node.strategyFamilyRefs],
      directStrategyIdentities: [...node.strategyRefs].toSorted(),
      strategyIdentities,
      incomingEdgeIds,
      outgoingEdgeIds,
    };
  });

  const projectedCircuits = circuits.map((circuit) => ({
    circuitId: circuit.circuitId,
    parentCircuitId: circuit.parentCircuitId,
    label: circuit.label,
    role: circuit.role,
    childCircuitIds: circuits.filter((candidate) => candidate.parentCircuitId === circuit.circuitId)
      .map((candidate) => candidate.circuitId),
    nodeIds: nodes.filter((node) => node.circuitId === circuit.circuitId)
      .map((node) => node.nodeId),
  }));

  const projectedEdges = edges.map((edge) => {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new TypeError(`${edge.edgeId} references an unknown node.`);
    }
    if (!packetTypes.has(edge.packetType)) {
      throw new TypeError(`${edge.edgeId} references unknown packet ${edge.packetType}.`);
    }
    return {
      edgeId: edge.edgeId,
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      packetType: edge.packetType,
      condition: edge.condition,
    };
  });
  if (edgeById.size !== projectedEdges.length) throw new TypeError('Edge projection is incomplete.');

  const projectedStrategies = strategies.map((strategy) => {
    const identity = identityOf(strategy);
    return {
      identity,
      strategyId: strategy.strategyId,
      version: strategy.version,
      stage: strategy.stage,
      epistemicRole: strategy.epistemicRole,
      confidenceKind: strategy.confidenceKind,
      costModel: strategy.costModel,
      budgetKeys: [...strategy.budgetKeys],
      inputTypes: [...strategy.inputTypes],
      outputTypes: [...strategy.outputTypes],
      preconditions: [...strategy.preconditions],
      failureClasses: [...strategy.failureClasses],
      witnessKind: strategy.witnessKind,
      correlationGroup: strategy.correlationGroup,
      answerAuthority: strategy.answerAuthority,
      implementationState: strategy.implementationState,
      nodeIds: [...strategyNodeIds.get(identity)].toSorted(),
    };
  });
  const unmappedStrategyIdentities = projectedStrategies
    .filter((strategy) => strategy.nodeIds.length === 0)
    .map((strategy) => strategy.identity);
  if (unmappedStrategyIdentities.length > 0) {
    throw new TypeError(`Unmapped homepage strategies: ${unmappedStrategyIdentities.join(', ')}.`);
  }

  const projectedStrategyFamilies = [...familyById.values()].map((family) => ({
    familyId: family.familyId,
    label: family.familyId.split(':').at(-1).replaceAll('-', ' '),
    memberIdentities: [...family.members],
    nodeIds: [...familyNodeIds.get(family.familyId)].toSorted(),
  }));

  return deepFreeze({
    format: HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL,
    catalogProtocol: catalog.format,
    strategyCatalogProtocol: strategyCatalog.format,
    rootCircuitId: catalog.rootCircuitId,
    conventions: { ...catalog.conventions },
    circuits: projectedCircuits,
    nodes: projectedNodes,
    edges: projectedEdges,
    strategyFamilies: projectedStrategyFamilies,
    strategies: projectedStrategies,
    packetTypes: [...catalog.packetTypes],
    resourceDimensions: [...catalog.resourceDimensions],
  });
}

function explorerIndexes(projection) {
  return {
    circuitById: uniqueIndex(rows(projection.circuits, 'projection.circuits'), 'circuitId',
      'projection.circuits'),
    nodeById: uniqueIndex(rows(projection.nodes, 'projection.nodes'), 'nodeId', 'projection.nodes'),
    familyById: uniqueIndex(rows(projection.strategyFamilies, 'projection.strategyFamilies'), 'familyId',
      'projection.strategyFamilies'),
    strategyByIdentity: uniqueIndex(rows(projection.strategies, 'projection.strategies'), 'identity',
      'projection.strategies'),
  };
}

function circuitPath(circuitId, circuitById) {
  const path = [];
  const visited = new Set();
  let current = circuitById.get(circuitId);
  while (current) {
    if (visited.has(current.circuitId)) {
      throw new TypeError(`Circuit breadcrumb cycle reaches ${current.circuitId}.`);
    }
    visited.add(current.circuitId);
    path.unshift(current);
    current = current.parentCircuitId === null ? null : circuitById.get(current.parentCircuitId);
  }
  return path;
}

function descendantCircuitIds(circuitId, circuitById) {
  const result = [];
  const visit = (currentId) => {
    result.push(currentId);
    for (const childId of circuitById.get(currentId).childCircuitIds) visit(childId);
  };
  visit(circuitId);
  return result;
}

function circuitInventory(circuitId, projection, indexes) {
  const circuitIds = new Set(descendantCircuitIds(circuitId, indexes.circuitById));
  const nodeIds = projection.nodes
    .filter((node) => circuitIds.has(node.circuitId))
    .map((node) => node.nodeId);
  const strategies = new Set(nodeIds.flatMap((nodeId) => indexes.nodeById.get(nodeId).strategyIdentities));
  const circuit = indexes.circuitById.get(circuitId);
  return {
    subcomponentCount: circuit.childCircuitIds.length + circuit.nodeIds.length,
    descendantCircuitCount: circuitIds.size - 1,
    processingNodeCount: nodeIds.length,
    strategyCount: strategies.size,
    kindCounts: kindCountsForNodes(nodeIds, indexes),
  };
}

function kindCountsForNodes(nodeIds, indexes) {
  const counts = Object.fromEntries(PROCESSING_NODE_KINDS.map((kind) => [kind, 0]));
  for (const nodeId of nodeIds) counts[indexes.nodeById.get(nodeId).kind] += 1;
  return counts;
}

function semanticCircuitTier(circuitId, circuitById) {
  const depth = circuitPath(circuitId, circuitById).length - 1;
  return depth === 1 ? 'plane' : depth === 2 ? 'circuit-group' : 'circuit';
}

function immediateCircuitChild(circuitId, descendantId, circuitById) {
  const path = circuitPath(descendantId, circuitById);
  const parentIndex = path.findIndex((circuit) => circuit.circuitId === circuitId);
  if (parentIndex < 0 || parentIndex === path.length - 1) return null;
  return path[parentIndex + 1].circuitId;
}

function visibleEntityForNode(node, circuitId, circuitById) {
  if (node.circuitId === circuitId) return `node:${node.nodeId}`;
  const childCircuitId = immediateCircuitChild(circuitId, node.circuitId, circuitById);
  return childCircuitId === null ? null : `circuit:${childCircuitId}`;
}

function aggregateVisibleFlowLinks(projection, circuitId, indexes) {
  const aggregate = new Map();
  for (const edge of projection.edges) {
    const from = visibleEntityForNode(indexes.nodeById.get(edge.from), circuitId, indexes.circuitById);
    const to = visibleEntityForNode(indexes.nodeById.get(edge.to), circuitId, indexes.circuitById);
    if (from === null || to === null || from === to) continue;
    const key = `${from}\u0000${to}`;
    if (!aggregate.has(key)) {
      aggregate.set(key, {
        linkKind: 'flow',
        from,
        to,
        edgeIds: [],
        edgeKinds: [],
        packetTypes: [],
        conditions: [],
      });
    }
    const link = aggregate.get(key);
    link.edgeIds.push(edge.edgeId);
    if (!link.edgeKinds.includes(edge.kind)) link.edgeKinds.push(edge.kind);
    if (!link.packetTypes.includes(edge.packetType)) link.packetTypes.push(edge.packetType);
    if (!link.conditions.includes(edge.condition)) link.conditions.push(edge.condition);
  }
  return [...aggregate.values()].map((link) => ({
    ...link,
    edgeCount: link.edgeIds.length,
  }));
}

function boundaryPortGraphForCircuit(projection, circuitId, indexes) {
  const circuitIds = new Set(descendantCircuitIds(circuitId, indexes.circuitById));
  const scopedNodeIds = new Set(projection.nodes
    .filter((node) => circuitIds.has(node.circuitId))
    .map((node) => node.nodeId));
  const grouped = new Map();
  const add = (direction, entityKey, packetType, neighbourLabel, edgeId = null, {
    neighbourNodeId = null,
    externalEndpoint = false,
    externalEndpointKind = null,
  } = {}) => {
    const neighbourKey = neighbourNodeId ?? (externalEndpoint ? neighbourLabel : 'shared-boundary');
    const key = `${direction}\u0000${entityKey}\u0000${neighbourKey}`;
    if (!grouped.has(key)) grouped.set(key, {
      direction,
      entityKey,
      packetTypes: [],
      neighbourLabels: [],
      navigationNodeIds: [],
      navigationNodeKinds: [],
      edgeIds: [],
      externalEndpoint,
      externalEndpointKind,
    });
    const group = grouped.get(key);
    if (!group.packetTypes.includes(packetType)) group.packetTypes.push(packetType);
    if (neighbourLabel && !group.neighbourLabels.includes(neighbourLabel)) {
      group.neighbourLabels.push(neighbourLabel);
    }
    if (edgeId && !group.edgeIds.includes(edgeId)) group.edgeIds.push(edgeId);
    if (neighbourNodeId && !group.navigationNodeIds.includes(neighbourNodeId)) {
      group.navigationNodeIds.push(neighbourNodeId);
      group.navigationNodeKinds.push(indexes.nodeById.get(neighbourNodeId).kind);
    }
  };

  for (const edge of projection.edges) {
    const fromInside = scopedNodeIds.has(edge.from);
    const toInside = scopedNodeIds.has(edge.to);
    if (!fromInside && toInside) {
      const target = visibleEntityForNode(indexes.nodeById.get(edge.to), circuitId, indexes.circuitById);
      if (target) add('input', target, edge.packetType, indexes.nodeById.get(edge.from).label, edge.edgeId, {
        neighbourNodeId: edge.from,
      });
    }
    if (fromInside && !toInside) {
      const source = visibleEntityForNode(indexes.nodeById.get(edge.from), circuitId, indexes.circuitById);
      if (source) add('output', source, edge.packetType, indexes.nodeById.get(edge.to).label, edge.edgeId, {
        neighbourNodeId: edge.to,
      });
    }
  }

  for (const node of projection.nodes.filter((candidate) => scopedNodeIds.has(candidate.nodeId))) {
    const visible = visibleEntityForNode(node, circuitId, indexes.circuitById);
    if (visible === null) continue;
    const globalIncoming = projection.edges.filter((edge) => edge.to === node.nodeId);
    const globalOutgoing = projection.edges.filter((edge) => edge.from === node.nodeId);
    if (globalIncoming.length === 0) {
      const exposedInputTypes = node.inputPacketTypes.length > 0
        ? node.inputPacketTypes : node.outputPacketTypes;
      const neighbour = externalNeighbour(exposedInputTypes, `${node.label} external source`);
      for (const packetType of exposedInputTypes) {
        add('input', visible, packetType, neighbour.label, null, {
            externalEndpoint: true, externalEndpointKind: neighbour.kind,
          });
      }
    }
    if (globalOutgoing.length === 0) {
      const neighbour = externalNeighbour(node.outputPacketTypes, `${node.label} external consumer`);
      for (const packetType of node.outputPacketTypes) {
        add('output', visible, packetType, neighbour.label, null, {
            externalEndpoint: true, externalEndpointKind: neighbour.kind,
          });
      }
    }
  }

  const ports = [...grouped.values()].map((group, index) => {
    const portId = `port:${group.direction}:${index}:${group.entityKey}`;
    return {
      ...group,
      portId,
      label: group.neighbourLabels.length === 0 ? `${sentenceCaseLocal(group.direction)} boundary`
        : group.neighbourLabels.join(' / '),
    };
  });
  return {
    inputPorts: ports.filter((port) => port.direction === 'input'),
    outputPorts: ports.filter((port) => port.direction === 'output'),
    links: ports.map((port) => ({
      linkKind: 'boundary-flow',
      from: port.direction === 'input' ? port.portId : port.entityKey,
      to: port.direction === 'input' ? port.entityKey : port.portId,
      edgeCount: Math.max(1, port.edgeIds.length),
      edgeIds: port.edgeIds,
      edgeKinds: ['boundary'],
      packetTypes: port.packetTypes,
      conditions: ['circuit-boundary'],
    })),
  };
}

function sentenceCaseLocal(value) {
  return value.replaceAll('-', ' ').replace(/^./u, (initial) => initial.toUpperCase());
}

function alternativePortGraph(inputTypes, outputTypes, items, selfEntityKey, {
  selfIsImplementation = false,
  inputLabel = null,
  outputLabel = null,
  navigationNodeId = null,
  navigationNodeKind = null,
  externalInput = null,
  externalOutput = null,
} = {}) {
  const exposesImplementations = items.length > 0 || selfIsImplementation;
  const linkKind = exposesImplementations ? 'implementation-flow' : 'flow';
  const targetKeys = items.length > 0 ? items.map((item) => item.entityKey) : [selfEntityKey];
  const inputPorts = inputTypes.length === 0 ? [] : [{
    portId: `port:input:${selfEntityKey}`,
    direction: 'input',
    label: externalInput?.label ?? inputLabel ?? (exposesImplementations ? 'Owner input' : 'Declared input'),
    packetTypes: [...new Set(inputTypes)].toSorted(),
    neighbourLabels: [externalInput?.label ?? (exposesImplementations ? 'Owner envelope' : 'Selected component')],
    navigationNodeIds: navigationNodeId === null ? [] : [navigationNodeId],
    navigationNodeKinds: navigationNodeKind === null ? [] : [navigationNodeKind],
    edgeIds: [],
    externalEndpoint: externalInput !== null,
    externalEndpointKind: externalInput?.kind ?? null,
  }];
  const outputPorts = outputTypes.length === 0 ? [] : [{
    portId: `port:output:${selfEntityKey}`,
    direction: 'output',
    label: externalOutput?.label ?? outputLabel ?? (exposesImplementations ? 'Accepted output' : 'Declared output'),
    packetTypes: [...new Set(outputTypes)].toSorted(),
    neighbourLabels: [externalOutput?.label ?? (exposesImplementations ? 'Owner envelope' : 'Selected component')],
    navigationNodeIds: navigationNodeId === null ? [] : [navigationNodeId],
    navigationNodeKinds: navigationNodeKind === null ? [] : [navigationNodeKind],
    edgeIds: [],
    externalEndpoint: externalOutput !== null,
    externalEndpointKind: externalOutput?.kind ?? null,
  }];
  const links = [];
  for (const port of inputPorts) {
    for (const target of targetKeys) links.push({
      linkKind: port.externalEndpoint ? 'boundary-flow' : linkKind,
      from: port.portId, to: target, edgeCount: 1, edgeIds: [],
      edgeKinds: [port.externalEndpoint ? 'boundary' : exposesImplementations ? 'strategy-input' : 'component-input'],
      packetTypes: port.packetTypes,
      conditions: [port.externalEndpoint ? 'exterior-interaction'
        : exposesImplementations ? 'eligible-alternative' : 'declared-contract'],
    });
  }
  for (const port of outputPorts) {
    for (const source of targetKeys) links.push({
      linkKind: port.externalEndpoint ? 'boundary-flow' : linkKind,
      from: source, to: port.portId, edgeCount: 1, edgeIds: [],
      edgeKinds: [port.externalEndpoint ? 'boundary' : exposesImplementations ? 'strategy-output' : 'component-output'],
      packetTypes: port.packetTypes,
      conditions: [port.externalEndpoint ? 'exterior-interaction'
        : exposesImplementations ? 'accepted-candidate' : 'declared-contract'],
    });
  }
  return { inputPorts, outputPorts, links };
}

function circuitItem(circuit, projection, indexes) {
  return {
    entityKind: 'circuit',
    entityKey: `circuit:${circuit.circuitId}`,
    id: circuit.circuitId,
    label: circuit.label,
    role: circuit.role,
    implementationState: null,
    nodeKind: null,
    semanticTier: semanticCircuitTier(circuit.circuitId, indexes.circuitById),
    ...circuitInventory(circuit.circuitId, projection, indexes),
  };
}

function nodeItem(node, indexes) {
  return {
    entityKind: 'node',
    entityKey: `node:${node.nodeId}`,
    id: node.nodeId,
    label: node.label,
    role: node.role,
    implementationState: node.implementationState,
    nodeKind: node.kind,
    semanticTier: 'node',
    subcomponentCount: 0,
    descendantCircuitCount: 0,
    processingNodeCount: 1,
    strategyCount: node.strategyIdentities.length,
    kindCounts: kindCountsForNodes([node.nodeId], indexes),
  };
}

function familyItem(family, indexes) {
  return {
    entityKind: 'family',
    entityKey: `family:${family.familyId}`,
    id: family.familyId,
    label: family.label,
    role: `Reviewed family of ${family.memberIdentities.length} strategies.`,
    implementationState: null,
    nodeKind: null,
    semanticTier: 'strategy-family',
    subcomponentCount: family.memberIdentities.length,
    descendantCircuitCount: 0,
    processingNodeCount: family.nodeIds.length,
    strategyCount: family.memberIdentities.length,
    kindCounts: kindCountsForNodes(family.nodeIds, indexes),
  };
}

function strategyItem(strategy, indexes) {
  return {
    entityKind: 'strategy',
    entityKey: `strategy:${strategy.identity}`,
    id: strategy.identity,
    label: strategy.strategyId.split(':').at(-1).replaceAll('-', ' '),
    role: `${strategy.epistemicRole}; ${strategy.confidenceKind}.`,
    implementationState: strategy.implementationState,
    nodeKind: 'strategy',
    semanticTier: 'strategy',
    subcomponentCount: 0,
    descendantCircuitCount: 0,
    processingNodeCount: strategy.nodeIds.length,
    strategyCount: 1,
    kindCounts: kindCountsForNodes(strategy.nodeIds, indexes),
  };
}

function circuitBreadcrumbs(circuitId, circuitById) {
  return circuitPath(circuitId, circuitById).map((circuit) => ({
    label: circuit.label,
    focus: { kind: 'circuit', id: circuit.circuitId },
  }));
}

/**
 * Project one semantic camera position. Only immediate children are returned;
 * deeper catalog details remain reachable through successive focus changes.
 */
export function buildProcessingGraphExplorerView(projection, requestedFocus = null) {
  if (!projection || projection.format !== HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL) {
    throw new TypeError('A valid homepage processing-graph projection is required.');
  }
  const indexes = explorerIndexes(projection);
  const focus = requestedFocus ?? { kind: 'circuit', id: projection.rootCircuitId };

  if (focus.kind === 'circuit') {
    const circuit = indexes.circuitById.get(focus.id);
    if (!circuit) throw new TypeError(`Unknown explorer circuit ${focus.id}.`);
    const items = [
      ...circuit.childCircuitIds.map((id) => circuitItem(indexes.circuitById.get(id), projection, indexes)),
      ...circuit.nodeIds.map((id) => nodeItem(indexes.nodeById.get(id), indexes)),
    ];
    const breadcrumbs = circuitBreadcrumbs(circuit.circuitId, indexes.circuitById);
    const boundary = boundaryPortGraphForCircuit(projection, circuit.circuitId, indexes);
    return deepFreeze({
      focus: { kind: 'circuit', id: circuit.circuitId },
      label: circuit.label,
      role: circuit.role,
      inventory: circuitInventory(circuit.circuitId, projection, indexes),
      breadcrumbs,
      parentFocus: breadcrumbs.length > 1 ? breadcrumbs.at(-2).focus : null,
      items,
      inputPorts: boundary.inputPorts,
      outputPorts: boundary.outputPorts,
      links: [...boundary.links, ...aggregateVisibleFlowLinks(projection, circuit.circuitId, indexes)],
      detail: circuit,
    });
  }

  if (focus.kind === 'node') {
    const node = indexes.nodeById.get(focus.id);
    if (!node) throw new TypeError(`Unknown explorer node ${focus.id}.`);
    const items = [
      ...node.strategyFamilyIds.map((familyId) => familyItem(indexes.familyById.get(familyId), indexes)),
      ...node.directStrategyIdentities.map((identity) => strategyItem(
        indexes.strategyByIdentity.get(identity), indexes,
      )),
    ];
    const breadcrumbs = [
      ...circuitBreadcrumbs(node.circuitId, indexes.circuitById),
      { label: node.label, focus: { kind: 'node', id: node.nodeId } },
    ];
    const selfEntityKey = `self:node:${node.nodeId}`;
    const hasIncomingEdge = projection.edges.some((edge) => edge.to === node.nodeId);
    const hasOutgoingEdge = projection.edges.some((edge) => edge.from === node.nodeId);
    const visibleInputTypes = node.inputPacketTypes.length > 0
      ? node.inputPacketTypes : node.outputPacketTypes;
    const visibleOutputTypes = node.outputPacketTypes.length > 0
      ? node.outputPacketTypes : node.inputPacketTypes;
    const boundary = alternativePortGraph(visibleInputTypes, visibleOutputTypes, items, selfEntityKey, {
      outputLabel: items.length > 0 ? 'Owner decision' : null,
      externalInput: hasIncomingEdge ? null
        : externalNeighbour(visibleInputTypes, `${node.label} external source`),
      externalOutput: hasOutgoingEdge ? null
        : externalNeighbour(visibleOutputTypes, `${node.label} external consumer`),
    });
    return deepFreeze({
      focus: { kind: 'node', id: node.nodeId },
      label: node.label,
      role: node.role,
      inventory: {
        subcomponentCount: 0,
        descendantCircuitCount: 0,
        processingNodeCount: 1,
        strategyCount: node.strategyIdentities.length,
        kindCounts: kindCountsForNodes([node.nodeId], indexes),
      },
      breadcrumbs,
      parentFocus: breadcrumbs.at(-2).focus,
      items,
      selfEntityKey,
      inputPorts: boundary.inputPorts,
      outputPorts: boundary.outputPorts,
      links: boundary.links,
      detail: node,
      incomingEdges: projection.edges.filter((edge) => edge.to === node.nodeId),
      outgoingEdges: projection.edges.filter((edge) => edge.from === node.nodeId),
    });
  }

  if (focus.kind === 'family') {
    const family = indexes.familyById.get(focus.id);
    if (!family) throw new TypeError(`Unknown explorer strategy family ${focus.id}.`);
    const parentNode = focus.parentNodeId === undefined ? null : indexes.nodeById.get(focus.parentNodeId);
    const parentBreadcrumbs = parentNode === null
      ? [{ label: 'Processing graph', focus: { kind: 'circuit', id: projection.rootCircuitId } }]
      : [
          ...circuitBreadcrumbs(parentNode.circuitId, indexes.circuitById),
          { label: parentNode.label, focus: { kind: 'node', id: parentNode.nodeId } },
        ];
    const breadcrumbs = [
      ...parentBreadcrumbs,
      { label: family.label, focus: { ...focus } },
    ];
    const familyStrategies = family.memberIdentities.map((identity) =>
      indexes.strategyByIdentity.get(identity));
    const selfEntityKey = `self:family:${family.familyId}`;
    const items = familyStrategies.map((strategy) => strategyItem(strategy, indexes));
    const boundary = alternativePortGraph(
      familyStrategies.flatMap((strategy) => strategy.inputTypes),
      familyStrategies.flatMap((strategy) => strategy.outputTypes),
      items,
      selfEntityKey,
      {
        inputLabel: 'Family input',
        outputLabel: 'Candidate handoff',
        navigationNodeId: parentNode?.nodeId ?? null,
        navigationNodeKind: parentNode?.kind ?? null,
      },
    );
    return deepFreeze({
      focus: { ...focus },
      label: family.label,
      role: `Reviewed family of ${family.memberIdentities.length} strategies.`,
      inventory: {
        subcomponentCount: family.memberIdentities.length,
        descendantCircuitCount: 0,
        processingNodeCount: family.nodeIds.length,
        strategyCount: family.memberIdentities.length,
        kindCounts: kindCountsForNodes(family.nodeIds, indexes),
      },
      breadcrumbs,
      parentFocus: parentBreadcrumbs.at(-1).focus,
      items,
      selfEntityKey,
      inputPorts: boundary.inputPorts,
      outputPorts: boundary.outputPorts,
      links: boundary.links,
      detail: family,
      reusedByNodes: family.nodeIds.map((nodeId) => indexes.nodeById.get(nodeId)),
    });
  }

  if (focus.kind === 'strategy') {
    const strategy = indexes.strategyByIdentity.get(focus.id);
    if (!strategy) throw new TypeError(`Unknown explorer strategy ${focus.id}.`);
    const parentNode = focus.parentNodeId === undefined ? null : indexes.nodeById.get(focus.parentNodeId);
    const parentFamily = focus.parentFamilyId === undefined
      ? null : indexes.familyById.get(focus.parentFamilyId);
    const nodeBreadcrumbs = parentNode === null
      ? [{ label: 'Processing graph', focus: { kind: 'circuit', id: projection.rootCircuitId } }]
      : [
          ...circuitBreadcrumbs(parentNode.circuitId, indexes.circuitById),
          { label: parentNode.label, focus: { kind: 'node', id: parentNode.nodeId } },
        ];
    const parentBreadcrumbs = parentFamily === null ? nodeBreadcrumbs : [
      ...nodeBreadcrumbs,
      { label: parentFamily.label, focus: {
        kind: 'family', id: parentFamily.familyId, ...(parentNode === null
          ? {} : { parentNodeId: parentNode.nodeId }),
      } },
    ];
    const breadcrumbs = [
      ...parentBreadcrumbs,
      { label: strategyItem(strategy, indexes).label, focus: { ...focus } },
    ];
    const selfEntityKey = `self:strategy:${strategy.identity}`;
    const boundary = alternativePortGraph(
      strategy.inputTypes,
      strategy.outputTypes,
      [],
      selfEntityKey,
      {
        selfIsImplementation: true,
        inputLabel: 'Strategy input',
        outputLabel: 'Candidate output',
        navigationNodeId: parentNode?.nodeId ?? null,
        navigationNodeKind: parentNode?.kind ?? null,
      },
    );
    return deepFreeze({
      focus: { ...focus },
      label: strategyItem(strategy, indexes).label,
      role: `${strategy.epistemicRole}; ${strategy.confidenceKind}.`,
      inventory: {
        subcomponentCount: 0,
        descendantCircuitCount: 0,
        processingNodeCount: strategy.nodeIds.length,
        strategyCount: 1,
        kindCounts: kindCountsForNodes(strategy.nodeIds, indexes),
      },
      breadcrumbs,
      parentFocus: parentBreadcrumbs.at(-1).focus,
      items: [],
      selfEntityKey,
      inputPorts: boundary.inputPorts,
      outputPorts: boundary.outputPorts,
      links: boundary.links,
      detail: strategy,
      reusedByNodes: strategy.nodeIds.map((nodeId) => indexes.nodeById.get(nodeId)),
    });
  }

  throw new TypeError(`Unknown explorer focus kind ${focus.kind}.`);
}
