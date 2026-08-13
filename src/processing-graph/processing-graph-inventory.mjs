import {
  STRATEGY_IMPLEMENTATION_STATES, STRATEGY_STAGES,
} from '../strategy/strategy-contract.mjs';
import { PROCESSING_GRAPH_CATALOG } from './processing-graph-catalog.mjs';
import {
  PROCESSING_GRAPH_NODE_KINDS, processingGraphValidationReceipt,
} from './processing-graph-contract.mjs';

export const PROCESSING_GRAPH_INVENTORY_PROTOCOL = 'eslm-processing-graph-inventory';

function hierarchyDepth(circuitId, circuits, memo = new Map()) {
  if (memo.has(circuitId)) return memo.get(circuitId);
  const circuit = circuits.get(circuitId);
  const depth = circuit.parentCircuitId === null
    ? 0 : hierarchyDepth(circuit.parentCircuitId, circuits, memo) + 1;
  memo.set(circuitId, depth);
  return depth;
}

function descendants(circuitId, circuits) {
  const result = new Set([circuitId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const circuit of circuits.values()) {
      if (circuit.parentCircuitId !== null && result.has(circuit.parentCircuitId)
          && !result.has(circuit.circuitId)) {
        result.add(circuit.circuitId);
        changed = true;
      }
    }
  }
  return result;
}

function circuitInventoryRows(catalog, receipt, circuits, depths) {
  return receipt.canonicalCircuitOrder.map((circuitId) => {
    const circuit = circuits.get(circuitId);
    const nested = descendants(circuitId, circuits);
    const directNodes = catalog.nodes.filter((item) => item.circuitId === circuitId);
    const nestedNodes = catalog.nodes.filter((item) => nested.has(item.circuitId));
    return Object.freeze({
      circuitId,
      parentCircuitId: circuit.parentCircuitId,
      label: circuit.label,
      depth: depths.get(circuitId),
      directNodeCount: directNodes.length,
      nestedNodeCount: nestedNodes.length,
      implementationStates: Object.freeze(Object.fromEntries(
        STRATEGY_IMPLEMENTATION_STATES.map((state) => [
          state, nestedNodes.filter((item) => item.implementationState === state).length,
        ]),
      )),
    });
  });
}

function nodeInventoryRows(catalog, receipt) {
  return receipt.canonicalNodeOrder.map((nodeId) => {
    const item = catalog.nodes.find((candidate) => candidate.nodeId === nodeId);
    return Object.freeze({
      nodeId: item.nodeId,
      label: item.label,
      role: item.role,
      circuitId: item.circuitId,
      kind: item.kind,
      stageRef: item.stageRef,
      implementationState: item.implementationState,
      ownerModule: item.ownerModule,
      authority: item.authority,
      canVote: item.canVote,
      answerAuthority: item.answerAuthority,
      inputPacketTypes: item.inputPacketTypes,
      outputPacketTypes: item.outputPacketTypes,
      strategyRefs: item.strategyRefs,
      strategyFamilyRefs: item.strategyFamilyRefs,
      resourceDimensions: item.resourceDimensions,
      normalEdgeCount: item.normalEdges.length,
      exceptionalEdgeCount: item.exceptionalEdges.length,
    });
  });
}

export function processingGraphInventory(catalog = PROCESSING_GRAPH_CATALOG) {
  const receipt = processingGraphValidationReceipt(catalog);
  const circuits = new Map(catalog.circuits.map((item) => [item.circuitId, item]));
  const depths = new Map(catalog.circuits.map((item) => [
    item.circuitId, hierarchyDepth(item.circuitId, circuits),
  ]));
  return Object.freeze({
    format: PROCESSING_GRAPH_INVENTORY_PROTOCOL,
    catalogDigest: receipt.catalogDigest,
    topologyDigest: receipt.topologyDigest,
    packetContractDigest: receipt.packetContractDigest,
    rootCircuitId: catalog.rootCircuitId,
    counts: receipt.counts,
    implementationStates: Object.freeze(Object.fromEntries(
      STRATEGY_IMPLEMENTATION_STATES.map((state) => [
        state, catalog.nodes.filter((item) => item.implementationState === state).length,
      ]),
    )),
    nodeKinds: Object.freeze(Object.fromEntries(PROCESSING_GRAPH_NODE_KINDS.map((kind) => [
      kind, catalog.nodes.filter((item) => item.kind === kind).length,
    ]))),
    stages: Object.freeze(STRATEGY_STAGES.map((stageRef) => Object.freeze({
      stageRef,
      nodeIds: Object.freeze(catalog.nodes.filter((item) => item.stageRef === stageRef)
        .map((item) => item.nodeId).toSorted()),
    }))),
    zoomLevels: Object.freeze([...new Set(depths.values())].toSorted((left, right) => left - right)
      .map((depth) => Object.freeze({
        depth,
        circuitIds: Object.freeze(catalog.circuits.filter((item) => depths.get(item.circuitId) === depth)
          .map((item) => item.circuitId).toSorted()),
      }))),
    circuits: Object.freeze(circuitInventoryRows(catalog, receipt, circuits, depths)),
    nodes: Object.freeze(nodeInventoryRows(catalog, receipt)),
    canonicalNodeOrder: receipt.canonicalNodeOrder,
  });
}
