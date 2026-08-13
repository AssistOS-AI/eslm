import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import {
  STRATEGY_IMPLEMENTATION_STATES, STRATEGY_STAGES, strategyIdentity,
} from '../strategy/strategy-contract.mjs';
import { sha256, stableStringify } from '../util.mjs';
import {
  PROCESSING_GRAPH_CATALOG, PROCESSING_GRAPH_CATALOG_PROTOCOL,
} from './processing-graph-catalog.mjs';
import {
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
} from './processing-graph-packet-catalog.mjs';
import {
  assertProcessingGraphPacketContractCatalog, processingGraphPacketContractCatalogDigest,
} from './processing-graph-packet-contract.mjs';

export const PROCESSING_GRAPH_VALIDATION_RECEIPT_PROTOCOL =
  'eslm-processing-graph-validation-receipt-v1';

export const PROCESSING_GRAPH_NODE_KINDS = Object.freeze([
  'source', 'process', 'coordinator', 'authority-gate', 'sink',
]);
export const PROCESSING_GRAPH_EDGE_KINDS = Object.freeze([
  'data', 'control', 'exception', 'rollback', 'authority', 'resource',
]);
export const PROCESSING_GRAPH_AUTHORITIES = Object.freeze([
  'none', 'interpretation-selection', 'plan-selection', 'work-policy', 'session-state',
  'routing-scope', 'evidence-admission', 'claim-admission', 'witness-verification', 'failure-eligibility',
  'result-validation', 'source-rights', 'record-validation', 'promotion',
  'package-validation', 'research-visibility', 'hypothesis-review',
]);

const EXPECTED_COUNTS = Object.freeze({ circuits: 22, nodes: 52, edges: 79 });
const ROOTS = Object.freeze({
  runtime: 'node:runtime:request-ingress',
  compiler: 'node:compiler:frozen-source-ingress',
  research: 'node:research:episode-source',
});
const VOTING_NODE_IDS = new Set([
  'node:compiler:identity-resolution-coordinator',
  'node:compiler:knowledge-extraction-coordinator',
  'node:research:hypothesis-coordinator',
  'node:runtime:evidence-assessment-coordinator',
  'node:runtime:interpretation-arbiter',
  'node:runtime:knowledge-focus-coordinator',
  'node:runtime:language-proposal-coordinator',
  'node:runtime:method-plan-coordinator',
  'node:runtime:request-plan-coordinator',
  'node:runtime:sentence-realization-coordinator',
  'node:runtime:document-assembly-coordinator',
]);
const ROLLBACK_PACKET_TYPES = new Set([
  'packet:runtime:request-session-snapshot-v1',
]);
const IMPLEMENTATION_STATE_RANK = new Map([
  ['planned', 0],
  ['instrumented-local', 1],
  ['coordinated', 2],
]);
const NODE_FIELDS = new Set([
  'nodeId', 'label', 'circuitId', 'kind', 'stageRef', 'role', 'inputPacketTypes',
  'outputPacketTypes', 'authority', 'implementationState', 'ownerModule', 'strategyRefs',
  'strategyFamilyRefs', 'resourceDimensions', 'canVote', 'answerAuthority', 'normalEdges',
  'exceptionalEdges',
]);
const EDGE_FIELDS = new Set(['edgeId', 'from', 'to', 'kind', 'packetType', 'condition']);
const CIRCUIT_FIELDS = new Set(['circuitId', 'parentCircuitId', 'label', 'role']);
const FAMILY_FIELDS = new Set(['familyId', 'members']);
const CATALOG_FIELDS = new Set([
  'format', 'rootCircuitId', 'conventions', 'circuits', 'strategyFamilies', 'nodes',
  'edges', 'packetTypes', 'resourceDimensions',
]);
const CONVENTION_FIELDS = new Set([
  'oneRequestIsAcyclic', 'strategyRefsAreExactVersionedIdentities', 'authorityGatesVote',
  'relevanceAndLanguageHaveAnswerAuthority', 'resourcesArePreallocatedAndReceipted',
  'researchEvidenceIsInert',
]);
const FORBIDDEN_METADATA = /\b(?:babi|gsm8k|helpsteer|prm800k|oasst|mind2web|tau2|appworld|gaia|webgpt|benchmark|expected-answer|gold-label|source-row|record-id|question-hash)\b/iu;
const IDENTIFIER = /^[a-z0-9]+(?::[a-z0-9][a-z0-9-]*)+(?:@\d+)?$/u;

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exactFields(value, fields, path) {
  record(value, path);
  const unknown = Object.keys(value).filter((field) => !fields.has(field));
  const missing = [...fields].filter((field) => !(field in value));
  if (unknown.length > 0 || missing.length > 0) {
    throw new TypeError(`${path} has a non-closed field set; unknown=${unknown.join(',')}; missing=${missing.join(',')}.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 192 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded namespaced identifier.`);
  }
}

function text(value, path, maximum = 1_024) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum
      || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError(`${path} must be bounded visible text.`);
  }
}

function canonicalIdentifiers(value, path, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 128) {
    throw new TypeError(`${path} must be a bounded${allowEmpty ? '' : ' non-empty'} array.`);
  }
  for (const [index, item] of value.entries()) identifier(item, `${path}[${index}]`);
  if (stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be unique and canonically ordered.`);
  }
}

function assertCanonicalRows(rows, identityField, path, expectedCount) {
  if (!Array.isArray(rows) || rows.length !== expectedCount) {
    throw new TypeError(`${path} must contain exactly ${expectedCount} entries.`);
  }
  const identities = rows.map((item) => item[identityField]);
  if (new Set(identities).size !== identities.length) throw new TypeError(`${path} identities must be unique.`);
  return new Map(rows.map((item) => [item[identityField], item]));
}

function canonicalTopologicalOrder(ids, relations, label) {
  const outgoing = new Map(ids.map((id) => [id, []]));
  const indegree = new Map(ids.map((id) => [id, 0]));
  for (const [from, to] of relations) {
    outgoing.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }
  for (const values of outgoing.values()) values.sort();
  const ready = ids.filter((id) => indegree.get(id) === 0).toSorted();
  const order = [];
  while (ready.length > 0) {
    const current = ready.shift();
    order.push(current);
    for (const target of outgoing.get(current)) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) {
        ready.push(target);
        ready.sort();
      }
    }
  }
  if (order.length !== ids.length) throw new TypeError(`${label} must be a directed acyclic graph.`);
  return order;
}

function reachableFrom(root, edgeRows) {
  const outgoing = new Map();
  for (const edge of edgeRows) {
    const targets = outgoing.get(edge.from) ?? [];
    targets.push(edge.to);
    outgoing.set(edge.from, targets);
  }
  const reached = new Set([root]);
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.shift();
    for (const target of outgoing.get(current) ?? []) {
      if (reached.has(target)) continue;
      reached.add(target);
      pending.push(target);
    }
  }
  return reached;
}

function planeForNode(nodeId) {
  return nodeId.split(':')[1];
}

function canonicalCatalogView(catalog) {
  return {
    format: catalog.format,
    rootCircuitId: catalog.rootCircuitId,
    conventions: catalog.conventions,
    circuits: [...catalog.circuits].toSorted((left, right) => left.circuitId.localeCompare(right.circuitId)),
    strategyFamilies: [...catalog.strategyFamilies]
      .toSorted((left, right) => left.familyId.localeCompare(right.familyId)),
    nodes: catalog.nodes.map((item) => {
      const identity = { ...item };
      delete identity.ownerModule;
      return identity;
    }).toSorted((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...catalog.edges].toSorted((left, right) => left.edgeId.localeCompare(right.edgeId)),
    packetTypes: [...catalog.packetTypes].toSorted(),
    resourceDimensions: [...catalog.resourceDimensions].toSorted(),
  };
}

function topologyView(catalog) {
  return {
    rootCircuitId: catalog.rootCircuitId,
    circuits: catalog.circuits.map(({ circuitId, parentCircuitId }) => ({ circuitId, parentCircuitId }))
      .toSorted((left, right) => left.circuitId.localeCompare(right.circuitId)),
    nodes: catalog.nodes.map(({ nodeId, circuitId, kind, stageRef }) => ({ nodeId, circuitId, kind, stageRef }))
      .toSorted((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: catalog.edges.map(({ edgeId, from, to, kind, packetType }) =>
      ({ edgeId, from, to, kind, packetType })).toSorted((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
}

export function processingGraphCatalogDigest(catalog = PROCESSING_GRAPH_CATALOG) {
  return `sha256:${sha256(stableStringify(canonicalCatalogView(catalog)))}`;
}

export function processingGraphTopologyDigest(catalog = PROCESSING_GRAPH_CATALOG) {
  return `sha256:${sha256(stableStringify(topologyView(catalog)))}`;
}

export function assertProcessingGraphCatalog(catalog) {
  exactFields(catalog, CATALOG_FIELDS, 'Processing graph catalog');
  if (catalog.format !== PROCESSING_GRAPH_CATALOG_PROTOCOL) {
    throw new TypeError(`Processing graph catalog format must be ${PROCESSING_GRAPH_CATALOG_PROTOCOL}.`);
  }
  identifier(catalog.rootCircuitId, 'Processing graph rootCircuitId');
  exactFields(catalog.conventions, CONVENTION_FIELDS, 'Processing graph conventions');
  const requiredConventions = {
    oneRequestIsAcyclic: true,
    strategyRefsAreExactVersionedIdentities: true,
    authorityGatesVote: false,
    relevanceAndLanguageHaveAnswerAuthority: false,
    resourcesArePreallocatedAndReceipted: true,
    researchEvidenceIsInert: true,
  };
  if (stableStringify(catalog.conventions) !== stableStringify(requiredConventions)) {
    throw new TypeError('Processing graph conventions must preserve the closed authority contract.');
  }

  const circuits = assertCanonicalRows(catalog.circuits, 'circuitId', 'Processing graph circuits',
    EXPECTED_COUNTS.circuits);
  for (const [index, circuit] of catalog.circuits.entries()) {
    exactFields(circuit, CIRCUIT_FIELDS, `Circuit[${index}]`);
    identifier(circuit.circuitId, `Circuit[${index}].circuitId`);
    if (circuit.parentCircuitId !== null) identifier(circuit.parentCircuitId, `Circuit[${index}].parentCircuitId`);
    text(circuit.label, `Circuit[${index}].label`, 128);
    text(circuit.role, `Circuit[${index}].role`);
    if (FORBIDDEN_METADATA.test(`${circuit.circuitId} ${circuit.label} ${circuit.role}`)) {
      throw new TypeError(`Circuit ${circuit.circuitId} contains source-specific dispatch metadata.`);
    }
  }
  const root = circuits.get(catalog.rootCircuitId);
  if (!root || root.parentCircuitId !== null
      || catalog.circuits.filter((item) => item.parentCircuitId === null).length !== 1) {
    throw new TypeError('Processing graph hierarchy must have exactly one declared root circuit.');
  }
  const circuitRelations = catalog.circuits.filter((item) => item.parentCircuitId !== null)
    .map((item) => {
      if (!circuits.has(item.parentCircuitId)) throw new TypeError(`Unknown parent circuit ${item.parentCircuitId}.`);
      return [item.parentCircuitId, item.circuitId];
    });
  const circuitOrder = canonicalTopologicalOrder([...circuits.keys()], circuitRelations,
    'Processing graph circuit hierarchy');
  const reachedCircuits = reachableFrom(catalog.rootCircuitId,
    circuitRelations.map(([from, to]) => ({ from, to })));
  if (reachedCircuits.size !== circuits.size) throw new TypeError('Every circuit must descend from the root circuit.');

  if (!Array.isArray(catalog.strategyFamilies) || catalog.strategyFamilies.length !== 6) {
    throw new TypeError('Processing graph must contain exactly six closed strategy families.');
  }
  const currentDescriptors = builtinStrategyDescriptors();
  const currentStrategies = new Map(currentDescriptors.map((item) => [strategyIdentity(item), item]));
  const families = new Map();
  for (const [index, family] of catalog.strategyFamilies.entries()) {
    exactFields(family, FAMILY_FIELDS, `Strategy family[${index}]`);
    identifier(family.familyId, `Strategy family[${index}].familyId`);
    canonicalIdentifiers(family.members, `Strategy family[${index}].members`, { allowEmpty: false });
    if (families.has(family.familyId)) throw new TypeError(`Duplicate strategy family ${family.familyId}.`);
    for (const identity of family.members) {
      if (!currentStrategies.has(identity)) throw new TypeError(`Unknown strategy family member ${identity}.`);
    }
    families.set(family.familyId, family);
  }

  const nodes = assertCanonicalRows(catalog.nodes, 'nodeId', 'Processing graph nodes', EXPECTED_COUNTS.nodes);
  const referencedStrategies = new Set();
  for (const [index, item] of catalog.nodes.entries()) {
    exactFields(item, NODE_FIELDS, `Node[${index}]`);
    identifier(item.nodeId, `Node[${index}].nodeId`);
    identifier(item.circuitId, `Node[${index}].circuitId`);
    if (!circuits.has(item.circuitId)) throw new TypeError(`Node ${item.nodeId} has an unknown circuit.`);
    text(item.label, `Node[${index}].label`, 128);
    text(item.role, `Node[${index}].role`);
    text(item.ownerModule, `Node[${index}].ownerModule`, 256);
    if (!PROCESSING_GRAPH_NODE_KINDS.includes(item.kind)) throw new TypeError(`Node ${item.nodeId} has unknown kind.`);
    if (!STRATEGY_IMPLEMENTATION_STATES.includes(item.implementationState)) {
      throw new TypeError(`Node ${item.nodeId} has unknown implementation state.`);
    }
    if (item.stageRef !== null && !STRATEGY_STAGES.includes(item.stageRef)) {
      throw new TypeError(`Node ${item.nodeId} has unknown DS027 stage ${item.stageRef}.`);
    }
    if (!PROCESSING_GRAPH_AUTHORITIES.includes(item.authority)) {
      throw new TypeError(`Node ${item.nodeId} has unknown authority ${item.authority}.`);
    }
    for (const [field, allowEmpty] of [
      ['inputPacketTypes', item.kind === 'source'], ['outputPacketTypes', item.kind === 'sink'],
      ['strategyRefs', true], ['strategyFamilyRefs', true], ['resourceDimensions', false],
      ['normalEdges', item.kind === 'sink'], ['exceptionalEdges', true],
    ]) canonicalIdentifiers(item[field], `Node ${item.nodeId}.${field}`, { allowEmpty });
    if (typeof item.canVote !== 'boolean') throw new TypeError(`Node ${item.nodeId}.canVote must be Boolean.`);
    if (item.canVote && item.kind !== 'coordinator') {
      throw new TypeError(`Only coordinator nodes may vote; ${item.nodeId} is ${item.kind}.`);
    }
    if (item.kind === 'authority-gate' && item.canVote) {
      throw new TypeError(`Authority gate ${item.nodeId} cannot vote.`);
    }
    if (item.canVote !== VOTING_NODE_IDS.has(item.nodeId)) {
      throw new TypeError(`Node ${item.nodeId} contradicts the exact processing-graph voting inventory.`);
    }
    if (!['none', 'verified-only'].includes(item.answerAuthority)) {
      throw new TypeError(`Node ${item.nodeId} has unknown answer authority.`);
    }
    if (item.answerAuthority !== 'none'
        && (item.nodeId !== 'node:runtime:witness-verification-gate'
          || item.authority !== 'witness-verification' || item.kind !== 'authority-gate')) {
      throw new TypeError(`Only the witness verification gate may declare verified answer authority.`);
    }
    if ((item.stageRef === 'runtime.language.interpret' || item.stageRef === 'runtime.evidence.assess')
        && item.answerAuthority !== 'none') {
      throw new TypeError(`Language and relevance node ${item.nodeId} cannot authorize an answer.`);
    }
    if (FORBIDDEN_METADATA.test(`${item.nodeId} ${item.label} ${item.role}`)) {
      throw new TypeError(`Node ${item.nodeId} contains source-specific dispatch metadata.`);
    }
    const resolved = [];
    for (const identity of item.strategyRefs) {
      const descriptor = currentStrategies.get(identity);
      if (!descriptor) throw new TypeError(`Node ${item.nodeId} references unknown strategy ${identity}.`);
      referencedStrategies.add(identity);
      resolved.push(descriptor);
    }
    for (const familyId of item.strategyFamilyRefs) {
      const family = families.get(familyId);
      if (!family) throw new TypeError(`Node ${item.nodeId} references unknown strategy family ${familyId}.`);
      for (const identity of family.members) {
        referencedStrategies.add(identity);
        resolved.push(currentStrategies.get(identity));
      }
    }
    if (resolved.some((descriptor) => descriptor.stage !== item.stageRef)) {
      throw new TypeError(`Node ${item.nodeId} strategy stage does not match ${item.stageRef}.`);
    }
    if (resolved.length > 0) {
      const expectedState = resolved.reduce((state, descriptor) =>
        IMPLEMENTATION_STATE_RANK.get(descriptor.implementationState)
          > IMPLEMENTATION_STATE_RANK.get(state)
          ? descriptor.implementationState : state, 'planned');
      if (item.implementationState !== expectedState) {
        throw new TypeError(`Node ${item.nodeId} implementation state contradicts its resolved strategy inventory.`);
      }
    }
    for (const descriptor of resolved) {
      if ((descriptor.stage === 'runtime.language.interpret'
          || descriptor.epistemicRole === 'relevance-estimate')
          && descriptor.answerAuthority !== 'none') {
        throw new TypeError(`Language or relevance strategy ${strategyIdentity(descriptor)} has answer authority.`);
      }
    }
  }
  const expectedStrategyIds = [...currentStrategies.keys()].toSorted();
  if (stableStringify([...referencedStrategies].toSorted()) !== stableStringify(expectedStrategyIds)) {
    throw new TypeError('Processing graph strategy references must map the exact current strategy catalog.');
  }
  const votingNodeIds = catalog.nodes.filter((item) => item.canVote).map((item) => item.nodeId).toSorted();
  if (stableStringify(votingNodeIds) !== stableStringify([...VOTING_NODE_IDS].toSorted())) {
    throw new TypeError('Processing graph voting nodes must match the exact v1 voting inventory.');
  }
  const stageRefs = [...new Set(catalog.nodes.map((item) => item.stageRef).filter(Boolean))].toSorted();
  if (stableStringify(stageRefs) !== stableStringify([...STRATEGY_STAGES].toSorted())) {
    throw new TypeError('Processing graph nodes must map every exact DS027 stage once or more.');
  }

  const edges = assertCanonicalRows(catalog.edges, 'edgeId', 'Processing graph edges', EXPECTED_COUNTS.edges);
  for (const [index, item] of catalog.edges.entries()) {
    exactFields(item, EDGE_FIELDS, `Edge[${index}]`);
    for (const field of ['edgeId', 'from', 'to', 'packetType']) identifier(item[field], `Edge[${index}].${field}`);
    text(item.condition, `Edge[${index}].condition`, 256);
    if (!PROCESSING_GRAPH_EDGE_KINDS.includes(item.kind)) throw new TypeError(`Edge ${item.edgeId} has unknown kind.`);
    const from = nodes.get(item.from);
    const to = nodes.get(item.to);
    if (!from || !to) throw new TypeError(`Edge ${item.edgeId} has a dangling endpoint.`);
    if (planeForNode(from.nodeId) !== planeForNode(to.nodeId)) {
      throw new TypeError(`Edge ${item.edgeId} crosses runtime, compiler, or research authority planes.`);
    }
    if (!from.outputPacketTypes.includes(item.packetType) || !to.inputPacketTypes.includes(item.packetType)) {
      throw new TypeError(`Edge ${item.edgeId} packet is not declared by both endpoints.`);
    }
    if (item.kind === 'authority' && from.kind !== 'authority-gate') {
      throw new TypeError(`Authority edge ${item.edgeId} must originate at an authority gate.`);
    }
    if (item.kind === 'rollback' && !ROLLBACK_PACKET_TYPES.has(item.packetType)) {
      throw new TypeError(`Rollback edge ${item.edgeId} must carry a declared host snapshot.`);
    }
    if (FORBIDDEN_METADATA.test(`${item.edgeId} ${item.condition}`)) {
      throw new TypeError(`Edge ${item.edgeId} contains source-specific dispatch metadata.`);
    }
  }
  for (const item of catalog.nodes) {
    const outgoing = catalog.edges.filter((edge) => edge.from === item.nodeId);
    const normal = outgoing.filter((edge) => edge.kind !== 'exception').map((edge) => edge.edgeId).toSorted();
    const exceptional = outgoing.filter((edge) => edge.kind === 'exception').map((edge) => edge.edgeId).toSorted();
    if (stableStringify(item.normalEdges) !== stableStringify(normal)
        || stableStringify(item.exceptionalEdges) !== stableStringify(exceptional)) {
      throw new TypeError(`Node ${item.nodeId} edge inventory does not match the edge catalog.`);
    }
  }

  canonicalIdentifiers(catalog.packetTypes, 'Processing graph packetTypes', { allowEmpty: false });
  canonicalIdentifiers(catalog.resourceDimensions, 'Processing graph resourceDimensions', { allowEmpty: false });
  const derivedPackets = [...new Set(catalog.nodes.flatMap((item) =>
    [...item.inputPacketTypes, ...item.outputPacketTypes]))].toSorted();
  const derivedResources = [...new Set(catalog.nodes.flatMap((item) => item.resourceDimensions))].toSorted();
  if (stableStringify(catalog.packetTypes) !== stableStringify(derivedPackets)
      || stableStringify(catalog.resourceDimensions) !== stableStringify(derivedResources)) {
    throw new TypeError('Processing graph packet and resource catalogs must exactly match node contracts.');
  }
  const nodeRelations = catalog.edges.map((item) => [item.from, item.to]);
  const nodeOrder = canonicalTopologicalOrder([...nodes.keys()], nodeRelations, 'Processing graph');
  for (const [plane, rootNodeId] of Object.entries(ROOTS)) {
    if (!nodes.has(rootNodeId)) throw new TypeError(`Missing ${plane} graph source ${rootNodeId}.`);
    const planeNodes = catalog.nodes.filter((item) => planeForNode(item.nodeId) === plane);
    const planeEdges = catalog.edges.filter((item) => planeForNode(item.from) === plane);
    const reached = reachableFrom(rootNodeId, planeEdges);
    const missing = planeNodes.filter((item) => !reached.has(item.nodeId)).map((item) => item.nodeId);
    if (missing.length > 0) throw new TypeError(`${plane} graph contains unreachable nodes: ${missing.join(', ')}.`);
    const sources = planeNodes.filter((item) => item.kind === 'source');
    if (sources.length !== 1 || sources[0].nodeId !== rootNodeId) {
      throw new TypeError(`${plane} graph must have exactly one declared source node.`);
    }
    if (!planeNodes.some((item) => item.kind === 'sink')) throw new TypeError(`${plane} graph requires a sink.`);
  }
  assertProcessingGraphPacketContractCatalog(PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG, catalog);
  return Object.freeze({ circuitOrder: Object.freeze(circuitOrder), nodeOrder: Object.freeze(nodeOrder) });
}

export function processingGraphValidationReceipt(catalog = PROCESSING_GRAPH_CATALOG) {
  const { circuitOrder, nodeOrder } = assertProcessingGraphCatalog(catalog);
  const planeCounts = Object.fromEntries(Object.keys(ROOTS).map((plane) => [plane,
    catalog.nodes.filter((item) => planeForNode(item.nodeId) === plane).length]));
  return Object.freeze({
    format: PROCESSING_GRAPH_VALIDATION_RECEIPT_PROTOCOL,
    catalogFormat: catalog.format,
    catalogDigest: processingGraphCatalogDigest(catalog),
    topologyDigest: processingGraphTopologyDigest(catalog),
    packetContractFormat: PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.format,
    packetContractDigest: processingGraphPacketContractCatalogDigest(),
    valid: true,
    counts: Object.freeze({
      circuits: catalog.circuits.length,
      nodes: catalog.nodes.length,
      edges: catalog.edges.length,
      packetTypes: catalog.packetTypes.length,
      packetContracts: PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts.length,
      resourceDimensions: catalog.resourceDimensions.length,
      strategiesMapped: builtinStrategyDescriptors().length,
      ...planeCounts,
    }),
    canonicalCircuitOrder: circuitOrder,
    canonicalNodeOrder: nodeOrder,
    checks: Object.freeze({
      closedSchemas: true,
      hierarchyAcyclicAndRooted: true,
      graphAcyclic: true,
      allPlaneNodesReachable: true,
      edgePacketsClosed: true,
      packetContractsClosedAndComplete: true,
      authorityEdgesFromGates: true,
      rollbackSnapshotsDeclared: true,
      authorityGatesNonVoting: true,
      exactVotingInventory: true,
      languageAndRelevanceHaveNoAnswerAuthority: true,
      exactStrategyStagesMapped: true,
      strategyStatesMatchResolvedDescriptors: true,
      ownerPathsExcludedFromCatalogIdentity: true,
      renameNeutralMetadata: true,
    }),
  });
}
