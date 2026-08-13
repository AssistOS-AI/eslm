import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PROCESSING_GRAPH_CATALOG,
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
  assertProcessingGraphCatalog,
  assertProcessingGraphPacketContractCatalog,
  assertProcessingGraphPacketEnvelope,
  processingGraphCatalogDigest,
  processingGraphInventory,
  processingGraphPacketContract,
  processingGraphPacketContractCatalogDigest,
  processingGraphTopologyDigest,
  processingGraphValidationReceipt,
} from '../src/processing-graph/index.mjs';
import { builtinStrategyDescriptors } from '../src/strategy/builtin-strategy-catalog.mjs';
import { STRATEGY_STAGES, strategyIdentity } from '../src/strategy/strategy-contract.mjs';

function mutableCatalog() {
  return structuredClone(PROCESSING_GRAPH_CATALOG);
}

function mutablePacketCatalog() {
  return structuredClone(PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG);
}

function node(catalog, nodeId) {
  return catalog.nodes.find((item) => item.nodeId === nodeId);
}

function edge(catalog, edgeId) {
  return catalog.edges.find((item) => item.edgeId === edgeId);
}

function sorted(values) {
  return [...new Set(values)].toSorted();
}

test('the hierarchical processing graph catalogs 57 concrete nodes across three authority planes', () => {
  const receipt = processingGraphValidationReceipt();
  assert.equal(receipt.valid, true);
  assert.equal(receipt.checks.authorityEdgesFromGates, true);
  assert.equal(receipt.checks.rollbackSnapshotsDeclared, true);
  assert.equal(receipt.checks.packetContractsClosedAndComplete, true);
  assert.equal(receipt.checks.exactVotingInventory, true);
  assert.equal(receipt.checks.strategyStatesMatchResolvedDescriptors, true);
  assert.equal(receipt.checks.ownerPathsExcludedFromCatalogIdentity, true);
  assert.deepEqual(receipt.counts, {
    circuits: 22,
    nodes: 57,
    edges: 87,
    packetTypes: 66,
    packetContracts: 66,
    resourceDimensions: 27,
    strategiesMapped: 79,
    runtime: 37,
    compiler: 12,
    research: 8,
  });
  assert.equal(new Set(receipt.canonicalNodeOrder).size, 57);
  assert.deepEqual(PROCESSING_GRAPH_CATALOG.nodes.filter((item) => item.kind === 'source')
    .map((item) => item.nodeId).toSorted(), [
    'node:compiler:frozen-source-ingress',
    'node:research:episode-source',
    'node:runtime:request-ingress',
  ]);
  assert.deepEqual(PROCESSING_GRAPH_CATALOG.nodes.filter((item) => item.kind === 'sink')
    .map((item) => item.nodeId).toSorted(), [
    'node:compiler:package-sink',
    'node:research:promotion-proposal-sink',
    'node:runtime:result-sink',
  ]);
});

test('inventory exposes deterministic zoom levels, states, kinds, stages, and circuit nesting', () => {
  const inventory = processingGraphInventory();
  assert.equal(inventory.format, 'eslm-processing-graph-inventory');
  assert.deepEqual(inventory.implementationStates, {
    coordinated: 1,
    'instrumented-local': 49,
    planned: 7,
  });
  assert.deepEqual(inventory.nodeKinds, {
    source: 3,
    process: 17,
    coordinator: 12,
    'authority-gate': 22,
    sink: 3,
  });
  assert.deepEqual(inventory.zoomLevels.map((item) => item.depth), [0, 1, 2, 3]);
  assert.equal(inventory.circuits.find((item) =>
    item.circuitId === 'circuit:runtime:request-cycle').nestedNodeCount, 37);
  assert.equal(inventory.circuits.find((item) =>
    item.circuitId === 'circuit:runtime:grounded-response-construction').nestedNodeCount, 6);
  assert.equal(inventory.circuits.find((item) =>
    item.circuitId === 'circuit:compiler:knowledge-build').nestedNodeCount, 12);
  assert.equal(inventory.circuits.find((item) =>
    item.circuitId === 'circuit:research:graph-discovery').nestedNodeCount, 8);
  assert.equal(inventory.stages.length, STRATEGY_STAGES.length);
  assert.ok(inventory.stages.every((item) => item.nodeIds.length > 0));
  assert.equal(inventory.nodes.length, 57);
  assert.deepEqual(inventory.nodes.map((item) => item.nodeId), inventory.canonicalNodeOrder);
});

test('catalog references map every exact current strategy identity to its exact DS027 stage', () => {
  const descriptors = builtinStrategyDescriptors();
  const descriptorStages = new Map(descriptors.map((item) => [strategyIdentity(item), item.stage]));
  const families = new Map(PROCESSING_GRAPH_CATALOG.strategyFamilies
    .map((item) => [item.familyId, item.members]));
  const referenced = new Map();
  for (const item of PROCESSING_GRAPH_CATALOG.nodes) {
    const identities = [
      ...item.strategyRefs,
      ...item.strategyFamilyRefs.flatMap((familyId) => families.get(familyId)),
    ];
    for (const identity of identities) {
      assert.equal(descriptorStages.get(identity), item.stageRef);
      referenced.set(identity, item.nodeId);
    }
  }
  assert.deepEqual([...referenced.keys()].toSorted(), [...descriptorStages.keys()].toSorted());
  assert.deepEqual([...new Set(PROCESSING_GRAPH_CATALOG.nodes.map((item) => item.stageRef)
    .filter(Boolean))].toSorted(), [...STRATEGY_STAGES].toSorted());

  const mutated = mutableCatalog();
  node(mutated, 'node:runtime:method-executor').stageRef = 'runtime.method.plan';
  assert.throws(() => assertProcessingGraphCatalog(mutated), /strategy stage does not match/u);
});

test('grounded response construction is a concrete nested circuit with typed strategy ownership', () => {
  const circuit = PROCESSING_GRAPH_CATALOG.circuits.find((item) =>
    item.circuitId === 'circuit:runtime:grounded-response-construction');
  assert.equal(circuit.parentCircuitId, 'circuit:runtime:failure-result');
  assert.deepEqual(PROCESSING_GRAPH_CATALOG.nodes.filter((item) =>
    item.circuitId === circuit.circuitId).map((item) => item.nodeId).toSorted(), [
    'node:runtime:claim-admission-gate',
    'node:runtime:document-assembly-coordinator',
    'node:runtime:result-construction-coordinator',
    'node:runtime:rhetorical-plan-builder',
    'node:runtime:sentence-realization-coordinator',
    'node:runtime:typed-operation-result-assembler',
  ]);
  assert.deepEqual(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:rhetorical-plan-builder').strategyRefs, [
    'strategy:result:rhetorical-section-planner@1',
  ]);
  assert.deepEqual(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:sentence-realization-coordinator').strategyRefs, [
    'strategy:result:defeasible-relation-sentence@1',
    'strategy:result:lexical-definition-sentence@1',
    'strategy:result:source-summary-sentence@1',
    'strategy:result:typed-fact-sentence@1',
  ]);
  assert.deepEqual(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:document-assembly-coordinator').strategyRefs, [
    'strategy:result:claim-fusion@1',
    'strategy:result:comparison-bridge@1',
    'strategy:result:coverage-gap-sentence@1',
    'strategy:result:outline-assembly@1',
    'strategy:result:prose-assembly@1',
    'strategy:result:sectioned-document-assembly@1',
    'strategy:result:table-assembly@1',
  ]);
  assert.equal(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:claim-admission-gate').canVote, false);
  for (const packetType of [
    'packet:runtime:construction-work-order',
    'packet:runtime:admitted-claim-ledger',
    'packet:runtime:rhetorical-plan',
    'packet:runtime:grounded-sentence-ledger',
  ]) assert.ok(PROCESSING_GRAPH_CATALOG.packetTypes.includes(packetType), packetType);
});

test('node implementation state matches the most advanced resolved strategy state', () => {
  const coordinatedAsPlanned = mutableCatalog();
  node(coordinatedAsPlanned,
    'node:runtime:language-proposal-coordinator').implementationState = 'planned';
  assert.throws(() => assertProcessingGraphCatalog(coordinatedAsPlanned),
    /implementation state contradicts its resolved strategy inventory/u);

  const plannedAsCoordinated = mutableCatalog();
  node(plannedAsCoordinated,
    'node:compiler:knowledge-extraction-coordinator').implementationState = 'coordinated';
  assert.throws(() => assertProcessingGraphCatalog(plannedAsCoordinated),
    /implementation state contradicts its resolved strategy inventory/u);

  const mixedAsPlanned = mutableCatalog();
  node(mixedAsPlanned, 'node:runtime:method-executor').implementationState = 'planned';
  assert.throws(() => assertProcessingGraphCatalog(mixedAsPlanned),
    /implementation state contradicts its resolved strategy inventory/u);

  assert.equal(node(PROCESSING_GRAPH_CATALOG,
    'node:compiler:promotion-gate').implementationState, 'planned');
});

test('the packet-contract catalog exactly covers live packet identities and graph endpoints', () => {
  assertProcessingGraphPacketContractCatalog();
  const receipt = processingGraphValidationReceipt();
  const inventory = processingGraphInventory();
  assert.equal(PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts.length, 66);
  assert.deepEqual(PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts
    .map((item) => item.packetType), PROCESSING_GRAPH_CATALOG.packetTypes);
  assert.equal(receipt.packetContractFormat,
    'eslm-processing-graph-packet-contract-catalog');
  assert.equal(receipt.packetContractDigest, processingGraphPacketContractCatalogDigest());
  assert.equal(inventory.packetContractDigest, receipt.packetContractDigest);

  for (const contract of PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts) {
    const producers = PROCESSING_GRAPH_CATALOG.nodes.filter((item) =>
      item.outputPacketTypes.includes(contract.packetType)).map((item) => item.nodeId).toSorted();
    const consumers = PROCESSING_GRAPH_CATALOG.nodes.filter((item) =>
      item.inputPacketTypes.includes(contract.packetType)).map((item) => item.nodeId).toSorted();
    assert.deepEqual(contract.producers, producers, contract.packetType);
    assert.deepEqual(contract.consumers, consumers, contract.packetType);
    assert.ok(contract.requiredFields.length > 0, contract.packetType);
    assert.ok(contract.boundResourceRefs.length > 0, contract.packetType);
    assert.ok(contract.absenceMeaning.length > 0, contract.packetType);
    assert.ok(contract.validationOwner.length > 0, contract.packetType);
    assert.ok(contract.privacy.length > 0, contract.packetType);
    assert.ok(contract.provenance.length > 0, contract.packetType);
    assert.ok(contract.lifetime.length > 0, contract.packetType);
    assert.ok(contract.authorityEffect.length > 0, contract.packetType);
  }

  assert.equal(processingGraphPacketContract(
    'packet:runtime:request-session-snapshot').authorityEffect, 'rollback-only');
  assert.equal(processingGraphPacketContract(
    'packet:runtime:runtime-result').privacy, 'request-private');
  assert.equal(processingGraphPacketContract(
    'packet:compiler:immutable-package').privacy, 'source-controlled');
  assert.equal(processingGraphPacketContract(
    'packet:research:promotion-proposal').authorityEffect, 'non-authoritative-proposal');
});

test('packet contracts and high-level envelopes reject drift and unknown fields', () => {
  const unknownContractField = mutablePacketCatalog();
  unknownContractField.contracts[0].schemaNotes = 'forbidden';
  assert.throws(() => assertProcessingGraphPacketContractCatalog(unknownContractField),
    /non-closed field set/u);

  const missingContract = mutablePacketCatalog();
  missingContract.contracts.pop();
  assert.throws(() => assertProcessingGraphPacketContractCatalog(missingContract),
    /exactly cover every live processing-graph packet identity/u);

  const endpointDrift = mutablePacketCatalog();
  endpointDrift.contracts.find((item) =>
    item.packetType === 'packet:runtime:bounded-request').consumers = [];
  assert.throws(() => assertProcessingGraphPacketContractCatalog(endpointDrift),
    /producer or consumer inventory contradicts/u);

  const unrelatedValidationOwner = mutablePacketCatalog();
  unrelatedValidationOwner.contracts.find((item) =>
    item.packetType === 'packet:research:source-status').validationOwner =
      'node:runtime:result-sink';
  assert.throws(() => assertProcessingGraphPacketContractCatalog(unrelatedValidationOwner),
    /validation owner must be a declared producer or consumer endpoint/u);

  const nonGapConsumerOwner = mutablePacketCatalog();
  nonGapConsumerOwner.contracts.find((item) =>
    item.packetType === 'packet:runtime:bounded-request').validationOwner =
      'node:runtime:session-snapshot';
  assert.throws(() => assertProcessingGraphPacketContractCatalog(nonGapConsumerOwner),
    /validation owner must produce a non-gap packet/u);

  const gateDecisionConsumerOwner = mutablePacketCatalog();
  gateDecisionConsumerOwner.contracts.find((item) =>
    item.packetType === 'packet:compiler:package-validation').validationOwner =
      'node:compiler:package-sink';
  assert.throws(() => assertProcessingGraphPacketContractCatalog(gateDecisionConsumerOwner),
    /validation-owner kind sink contradicts authority effect records-gate-decision/u);

  const sharedOwnerOnOrdinaryPacket = mutablePacketCatalog();
  sharedOwnerOnOrdinaryPacket.contracts.find((item) =>
    item.packetType === 'packet:runtime:bounded-request').validationOwner =
      'owner:shared:strategy-coordination';
  assert.throws(() => assertProcessingGraphPacketContractCatalog(sharedOwnerOnOrdinaryPacket),
    /unknown or packet-ineligible validation owner/u);

  const contract = processingGraphPacketContract('packet:runtime:bounded-request');
  const validEnvelope = Object.fromEntries(contract.requiredFields.map((field) => [field, null]));
  assert.equal(assertProcessingGraphPacketEnvelope(contract.packetType, validEnvelope), validEnvelope);
  assert.throws(() => assertProcessingGraphPacketEnvelope(contract.packetType, {
    ...validEnvelope,
    hiddenExpectedAnswer: 'forbidden',
  }), /unknown semantic fields=hiddenExpectedAnswer/u);
  const missingRequired = { ...validEnvelope };
  delete missingRequired[contract.requiredFields[0]];
  assert.throws(() => assertProcessingGraphPacketEnvelope(contract.packetType, missingRequired),
    /missing=/u);
  assert.throws(() => assertProcessingGraphPacketEnvelope('packet:runtime:unknown', {}),
    /Unknown processing-graph packet identity/u);
});

test('authority gates never vote and language or relevance nodes never authorize answers', () => {
  for (const item of PROCESSING_GRAPH_CATALOG.nodes.filter((candidate) =>
    candidate.kind === 'authority-gate')) assert.equal(item.canVote, false, item.nodeId);
  for (const item of PROCESSING_GRAPH_CATALOG.nodes.filter((candidate) =>
    ['runtime.language.interpret', 'runtime.evidence.assess'].includes(candidate.stageRef))) {
    assert.equal(item.answerAuthority, 'none', item.nodeId);
  }
  assert.equal(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:witness-verification-gate').answerAuthority, 'verified-only');
  assert.deepEqual(PROCESSING_GRAPH_CATALOG.nodes.filter((item) => item.canVote)
    .map((item) => item.nodeId).toSorted(), [
    'node:compiler:identity-resolution-coordinator',
    'node:compiler:knowledge-extraction-coordinator',
    'node:research:hypothesis-coordinator',
    'node:runtime:document-assembly-coordinator',
    'node:runtime:evidence-assessment-coordinator',
    'node:runtime:interpretation-arbiter',
    'node:runtime:knowledge-focus-coordinator',
    'node:runtime:language-proposal-coordinator',
    'node:runtime:method-plan-coordinator',
    'node:runtime:request-plan-coordinator',
    'node:runtime:sentence-realization-coordinator',
  ]);

  const votingGate = mutableCatalog();
  node(votingGate, 'node:runtime:semantic-preservation-gate').canVote = true;
  assert.throws(() => assertProcessingGraphCatalog(votingGate), /Only coordinator nodes may vote|cannot vote/u);

  const languageAuthority = mutableCatalog();
  node(languageAuthority, 'node:runtime:language-proposal-coordinator').answerAuthority = 'verified-only';
  assert.throws(() => assertProcessingGraphCatalog(languageAuthority), /Only the witness verification gate/u);

  const undeclaredVotingCoordinator = mutableCatalog();
  node(undeclaredVotingCoordinator, 'node:research:hypothesis-coordinator').canVote = false;
  assert.throws(() => assertProcessingGraphCatalog(undeclaredVotingCoordinator),
    /exact processing-graph voting inventory/u);
});

test('authority and rollback edges preserve their exact gate and snapshot semantics', () => {
  const nodes = new Map(PROCESSING_GRAPH_CATALOG.nodes.map((item) => [item.nodeId, item]));
  for (const item of PROCESSING_GRAPH_CATALOG.edges.filter((candidate) =>
    candidate.kind === 'authority')) {
    assert.equal(nodes.get(item.from).kind, 'authority-gate', item.edgeId);
  }
  for (const source of PROCESSING_GRAPH_CATALOG.nodes.filter((item) => item.kind === 'source')) {
    assert.equal(PROCESSING_GRAPH_CATALOG.edges.some((item) =>
      item.from === source.nodeId && item.kind === 'authority'), false, source.nodeId);
  }
  const rollbackEdges = PROCESSING_GRAPH_CATALOG.edges.filter((item) => item.kind === 'rollback');
  assert.deepEqual(rollbackEdges, [{
    edgeId: 'edge:runtime:snapshot-session-rollback',
    from: 'node:runtime:session-snapshot',
    to: 'node:runtime:session-effect-gate',
    kind: 'rollback',
    packetType: 'packet:runtime:request-session-snapshot',
    condition: 'explicit-request-plan-selected',
  }]);
  assert.ok(node(PROCESSING_GRAPH_CATALOG,
    'node:runtime:session-effect-gate').inputPacketTypes
    .includes('packet:runtime:request-session-snapshot'));
  assert.equal(edge(PROCESSING_GRAPH_CATALOG, 'edge:runtime:snapshot-work').kind, 'data');
  assert.equal(edge(PROCESSING_GRAPH_CATALOG, 'edge:runtime:request-plan-session').kind, 'data');

  const sourceAuthority = mutableCatalog();
  edge(sourceAuthority, 'edge:research:source-rights-status').kind = 'authority';
  assert.throws(() => assertProcessingGraphCatalog(sourceAuthority),
    /must originate at an authority gate/u);

  const unnamedRollback = mutableCatalog();
  const rollback = edge(unnamedRollback, 'edge:runtime:snapshot-session-rollback');
  rollback.packetType = 'packet:runtime:request-plan';
  node(unnamedRollback, 'node:runtime:session-snapshot').outputPacketTypes = sorted([
    ...node(unnamedRollback, 'node:runtime:session-snapshot').outputPacketTypes,
    rollback.packetType,
  ]);
  assert.throws(() => assertProcessingGraphCatalog(unnamedRollback),
    /must carry a declared host snapshot/u);
});

test('closed validators reject unknown fields, packet mismatches, dangling strategies, and edge drift', () => {
  const unknownNodeField = mutableCatalog();
  node(unknownNodeField, 'node:runtime:request-ingress').datasetSwitch = 'forbidden';
  assert.throws(() => assertProcessingGraphCatalog(unknownNodeField), /non-closed field set/u);

  const mismatchedPacket = mutableCatalog();
  edge(mismatchedPacket, 'edge:runtime:focus-scope').packetType = 'packet:runtime:forged';
  assert.throws(() => assertProcessingGraphCatalog(mismatchedPacket), /packet is not declared by both endpoints/u);

  const danglingStrategy = mutableCatalog();
  node(danglingStrategy, 'node:runtime:direct-parser-gate').strategyRefs = [
    'strategy:language:missing@1',
  ];
  assert.throws(() => assertProcessingGraphCatalog(danglingStrategy), /unknown strategy/u);

  const edgeDrift = mutableCatalog();
  node(edgeDrift, 'node:runtime:request-ingress').normalEdges = [];
  assert.throws(() => assertProcessingGraphCatalog(edgeDrift),
    /normalEdges must be a bounded non-empty array|edge inventory does not match/u);
});

test('hierarchy and processing edges are acyclic, rooted, and fully reachable in every plane', () => {
  const hierarchyCycle = mutableCatalog();
  hierarchyCycle.circuits.find((item) => item.circuitId === 'circuit:runtime:request-cycle')
    .parentCircuitId = 'circuit:runtime:request-session';
  assert.throws(() => assertProcessingGraphCatalog(hierarchyCycle), /circuit hierarchy.*acyclic/u);

  const graphCycle = mutableCatalog();
  const cycleEdge = edge(graphCycle, 'edge:runtime:schema-sink-failure');
  cycleEdge.from = 'node:runtime:result-sink';
  cycleEdge.to = 'node:runtime:english-likelihood-gate';
  cycleEdge.kind = 'exception';
  cycleEdge.packetType = 'packet:runtime:runtime-result';
  node(graphCycle, 'node:runtime:result-schema-gate').exceptionalEdges = [];
  node(graphCycle, 'node:runtime:result-sink').exceptionalEdges = [cycleEdge.edgeId];
  const englishGate = node(graphCycle, 'node:runtime:english-likelihood-gate');
  englishGate.inputPacketTypes = sorted([...englishGate.inputPacketTypes, cycleEdge.packetType]);
  assert.throws(() => assertProcessingGraphCatalog(graphCycle), /Processing graph must be a directed acyclic graph/u);

  const unreachable = mutableCatalog();
  const transfer = edge(unreachable, 'edge:research:neutrality-transfer');
  transfer.to = 'node:research:promotion-proposal-sink';
  const sink = node(unreachable, 'node:research:promotion-proposal-sink');
  sink.inputPacketTypes = sorted([...sink.inputPacketTypes, transfer.packetType]);
  assert.throws(() => assertProcessingGraphCatalog(unreachable), /research graph contains unreachable nodes/u);
});

test('canonical receipts ignore registration order while topology ignores rename-neutral display metadata', () => {
  const reordered = mutableCatalog();
  reordered.circuits.reverse();
  reordered.strategyFamilies.reverse();
  reordered.nodes.reverse();
  reordered.edges.reverse();
  const originalReceipt = processingGraphValidationReceipt(PROCESSING_GRAPH_CATALOG);
  const reorderedReceipt = processingGraphValidationReceipt(reordered);
  assert.equal(reorderedReceipt.catalogDigest, originalReceipt.catalogDigest);
  assert.deepEqual(reorderedReceipt.canonicalNodeOrder, originalReceipt.canonicalNodeOrder);

  const renamed = mutableCatalog();
  const renamedNode = node(renamed, 'node:runtime:method-executor');
  renamedNode.label = 'Nonce semantic machine';
  renamedNode.role = 'Executes one finite declared operation over renamed symbols and emits a witness.';
  assertProcessingGraphCatalog(renamed);
  assert.notEqual(processingGraphCatalogDigest(renamed),
    processingGraphCatalogDigest(PROCESSING_GRAPH_CATALOG));
  assert.equal(processingGraphTopologyDigest(renamed),
    processingGraphTopologyDigest(PROCESSING_GRAPH_CATALOG));

  const relocatedOwner = mutableCatalog();
  node(relocatedOwner, 'node:runtime:method-executor').ownerModule =
    'src/runtime/renamed-method-owner.mjs';
  assertProcessingGraphCatalog(relocatedOwner);
  assert.equal(processingGraphCatalogDigest(relocatedOwner),
    processingGraphCatalogDigest(PROCESSING_GRAPH_CATALOG));
  assert.equal(processingGraphTopologyDigest(relocatedOwner),
    processingGraphTopologyDigest(PROCESSING_GRAPH_CATALOG));

  const sourceSpecific = mutableCatalog();
  node(sourceSpecific, 'node:runtime:method-executor').role = 'A special GSM8K benchmark solver.';
  assert.throws(() => assertProcessingGraphCatalog(sourceSpecific), /source-specific dispatch metadata/u);
});

test('resource, correlation, coordinator, authority, and research-scale packets remain explicit', () => {
  for (const packetType of [
    'packet:runtime:resource-reservation-ledger',
    'packet:runtime:language-vote-ledger',
    'packet:shared:coordinator-receipt',
    'packet:shared:correlation-ledger',
    'packet:research:source-status',
    'packet:research:scale-progress-receipt',
    'packet:research:promotion-proposal',
  ]) assert.ok(PROCESSING_GRAPH_CATALOG.packetTypes.includes(packetType), packetType);
  assert.ok(PROCESSING_GRAPH_CATALOG.resourceDimensions.includes('resource:resource-reservations'));
  assert.ok(PROCESSING_GRAPH_CATALOG.resourceDimensions.includes('resource:hypotheses'));
});

test('the descriptive catalog is not imported into deployed runtime entry points', async () => {
  for (const path of ['src/runtime/engine.mjs', 'src/runtime/runtime.mjs']) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /processing-graph/u, path);
  }
});
