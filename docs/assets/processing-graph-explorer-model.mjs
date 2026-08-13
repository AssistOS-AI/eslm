export const HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL =
  'eslm-homepage-processing-graph-projection-v1';

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
  const strategyByIdentity = new Map();
  for (const strategy of strategies) {
    const identity = identityOf(strategy);
    if (strategyByIdentity.has(identity)) {
      throw new TypeError(`strategyCatalog.strategies repeats ${identity}.`);
    }
    strategyByIdentity.set(identity, strategy);
  }
  if (!circuitById.has(catalog.rootCircuitId)) {
    throw new TypeError(`Unknown root circuit ${catalog.rootCircuitId}.`);
  }

  const strategyNodeIds = new Map([...strategyByIdentity.keys()].map((identity) => [identity, []]));
  const projectedNodes = nodes.map((node) => {
    if (!circuitById.has(node.circuitId)) {
      throw new TypeError(`${node.nodeId} references unknown circuit ${node.circuitId}.`);
    }
    const familyMembers = node.strategyFamilyRefs.flatMap((familyId) => {
      const family = familyById.get(familyId);
      if (!family) throw new TypeError(`${node.nodeId} references unknown family ${familyId}.`);
      return family.members;
    });
    const strategyIdentities = [...new Set([...node.strategyRefs, ...familyMembers])].toSorted();
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

  return deepFreeze({
    format: HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL,
    catalogProtocol: catalog.format,
    strategyCatalogProtocol: strategyCatalog.format,
    rootCircuitId: catalog.rootCircuitId,
    conventions: { ...catalog.conventions },
    circuits: projectedCircuits,
    nodes: projectedNodes,
    edges: projectedEdges,
    strategies: projectedStrategies,
    packetTypes: [...catalog.packetTypes],
    resourceDimensions: [...catalog.resourceDimensions],
  });
}
