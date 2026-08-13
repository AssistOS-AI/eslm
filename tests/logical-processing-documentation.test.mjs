import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { PROJECT_ROOT } from '../src/paths.mjs';
import {
  PROCESSING_GRAPH_CATALOG,
  PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG,
  processingGraphInventory,
  processingGraphValidationReceipt,
} from '../src/processing-graph/index.mjs';
import { BUILTIN_STRATEGY_CATALOG } from '../src/strategy/builtin-strategy-catalog.mjs';
import { HOMEPAGE_PROCESSING_GRAPH_PROJECTION } from
  '../docs/assets/processing-graph-explorer-data.mjs';
import {
  buildHomepageProcessingGraphProjection,
  buildProcessingGraphExplorerView,
  HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL,
} from '../docs/assets/processing-graph-explorer-model.mjs';
import {
  explainBoundaryPort,
  explainProcessingGraphView,
  plainTypeLabel,
} from '../docs/assets/processing-graph-explorer-explanations.mjs';

async function projectFile(path) {
  return readFile(join(PROJECT_ROOT, path), 'utf8');
}

function removeReferenceOnlyHtml(html) {
  const withoutHeadAndExamples = html
    .replace(/<head\b[\s\S]*?<\/head>/giu, '')
    .replace(/<pre\b[\s\S]*?<\/pre>/giu, '');
  return withoutHeadAndExamples.split(/(?=<h2\b)/giu)
    .filter((section) => !/^<h2[^>]*>[^<]*(?:implementation|reference|package layout)/iu
      .test(section))
    .join('');
}

test('logical architecture separates four planes and distinguishes coordination from authority', async () => {
  const page = await projectFile('docs/architecture/logical-processing-architecture.html');
  for (const heading of [
    'Plane 1 — logical request and dataflow',
    'Plane 2 — named data and protocol boundaries',
    'Plane 3 — execution, trust, and resources',
    'Plane 4 — implementation and normative reference',
  ]) assert.match(page, new RegExp(`<h2>${heading}</h2>`, 'u'));

  for (const term of ['Processing node', 'Strategy', 'Coordination node', 'Authority gate']) {
    assert.match(page, new RegExp(`<td>${term}</td>`, 'u'));
  }
  assert.match(page, /Only coordination nodes vote/u);
  assert.match(page, /A reasoning node instead returns semantic values or hypotheses plus a method witness/u);
  assert.match(page, /processing graph is partly unified, not complete/u);
  assert.match(page, /24 local language-approximation families/u);
  assert.match(page, /<h2>Plane 4[^<]+implementation/iu);
  assert.equal((page.match(/<figure class="diagram/gu) ?? []).length, 7);
  assert.match(page, /Stage policy and allocations/u);
  assert.match(page, /Strategy A and receipt/u);
  assert.match(page, /Typed votes by correlation/u);
  assert.match(page, /Non-voting authority gate/u);
  assert.match(page, /preallocates and freezes a separate finite envelope for every eligible strategy/u);
  assert.match(page, /asynchronous coordinator starts all funded independent branches before awaiting/u);
  assert.match(page, /synchronous coordinator and the current deployed local-language path remain sequential/u);
  assert.match(page, /Concurrent execution and greater resource spend add no confidence/u);
  assert.match(page, /validated evidence from independent correlation groups contributes separate support/u);
  for (const protocol of [
    'eslm-processing-graph-catalog-v1',
    'eslm-processing-graph-packet-contract-catalog-v1',
    'eslm-processing-graph-inventory-v1',
    'eslm-processing-graph-validation-receipt-v1',
  ]) assert.match(page, new RegExp(protocol, 'u'));
  assert.match(page, /processingGraphInventory\(\)/u);
  assert.match(page, /processingGraphValidationReceipt\(\)/u);
  assert.match(page, /assertProcessingGraphPacketEnvelope\(\)/u);
  assert.match(page, /Research consolidation precedes promotion/u);
  assert.match(page, /still stops before the non-voting transfer and promotion gates/u);
  for (const protocol of [
    'eslm-rl-dataset-discovery-plan-v2',
    'eslm-processing-graph-research-analysis-v6',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ]) assert.match(page, new RegExp(protocol, 'u'));
  assert.match(page, /complete analysis-v6 records 69,467 typed actions and 41,670 dependencies/u);
  assert.match(page, /Sixteen validated training-projection shards admit 2,220 trees/u);
  assert.match(page, /approved combined plan admits 19,854 training-visible episodes/u);
  assert.match(page, /Final visited work, omissions, events, votes, hypotheses, and cycle decisions belong to analysis-v6 and cycle-v3/u);
  assert.match(page, /historical or superseded receipt remains evidence for its old identity/u);
  assert.doesNotMatch(page, /2,341|19,975|analysis-v2|Current v2 receipt/iu);
});

test('logical architecture stays synchronized with the validated processing-graph catalog', async () => {
  const page = await projectFile('docs/architecture/logical-processing-architecture.html');
  const inventory = processingGraphInventory();
  const validation = processingGraphValidationReceipt();
  assert.equal(inventory.format, 'eslm-processing-graph-inventory-v1');
  assert.equal(validation.format, 'eslm-processing-graph-validation-receipt-v1');
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.counts, {
    circuits: 22,
    nodes: 52,
    edges: 79,
    packetTypes: 62,
    packetContracts: 62,
    resourceDimensions: 27,
    strategiesMapped: 79,
    runtime: 32,
    compiler: 12,
    research: 8,
  });
  assert.deepEqual(inventory.implementationStates, {
    coordinated: 1,
    'instrumented-local': 44,
    planned: 7,
  });
  assert.deepEqual(inventory.nodeKinds, {
    source: 3,
    process: 12,
    coordinator: 12,
    'authority-gate': 22,
    sink: 3,
  });
  for (const value of [
    validation.catalogDigest,
    validation.topologyDigest,
    validation.packetContractDigest,
    ...PROCESSING_GRAPH_CATALOG.nodes.map((item) => item.nodeId),
    ...PROCESSING_GRAPH_CATALOG.circuits.map((item) => item.circuitId),
    ...PROCESSING_GRAPH_CATALOG.packetTypes,
    ...PROCESSING_GRAPH_CATALOG.resourceDimensions,
    ...PROCESSING_GRAPH_CATALOG.edges
      .filter((item) => ['exception', 'rollback'].includes(item.kind))
      .map((item) => item.edgeId),
  ]) assert.ok(page.includes(value), value);
  assert.ok(PROCESSING_GRAPH_CATALOG.nodes
    .filter((item) => item.kind === 'authority-gate')
    .every((item) => item.canVote === false));
  assert.match(page,
    /node:compiler:promotion-gate[\s\S]*?<strong>Promotion gate<\/strong><br><code>planned<\/code>/u);
});

test('logical architecture publishes every exact packet contract and policy dimension', async () => {
  const page = await projectFile('docs/architecture/logical-processing-architecture.html');
  const contractCount = PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts.length;
  const section = page.match(
    new RegExp(`<h3>Packet-contract catalog · ${contractCount} closed semantic envelopes<\\/h3>`
      + '([\\s\\S]*?)<h3>Zoom 3', 'u'),
  )?.[1] ?? '';
  assert.equal((section.match(/<tr><td><code>packet:/gu) ?? []).length, contractCount);
  assert.match(section, /unknown names fail before semantic-owner validation/u);
  for (const contract of PROCESSING_GRAPH_PACKET_CONTRACT_CATALOG.contracts) {
    const start = section.indexOf(`<tr><td><code>${contract.packetType}</code>`);
    assert.notEqual(start, -1, contract.packetType);
    const end = section.indexOf('</tr>', start);
    const row = section.slice(start, end);
    for (const value of [
      ...contract.producers,
      ...contract.consumers,
      ...contract.requiredFields,
      ...contract.optionalFields,
      contract.absenceMeaning,
      ...contract.boundResourceRefs,
      contract.validationOwner,
      contract.privacy,
      contract.provenance,
      contract.lifetime,
      contract.authorityEffect,
    ]) assert.ok(row.includes(value), `${contract.packetType}: ${value}`);
  }
});

test('logical architecture publishes every exact built-in strategy identity and state', async () => {
  const page = await projectFile('docs/architecture/logical-processing-architecture.html');
  for (const strategy of BUILTIN_STRATEGY_CATALOG.strategies) {
    assert.match(
      page,
      new RegExp(`${strategy.strategyId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}@${strategy.version}`, 'u'),
      `${strategy.strategyId}@${strategy.version}`,
    );
  }
  for (const [state, count] of [
    ['coordinated', 24], ['instrumented-local', 46], ['planned', 9],
  ]) {
    assert.equal(
      BUILTIN_STRATEGY_CATALOG.strategies.filter((item) => item.implementationState === state).length,
      count,
      state,
    );
  }
});

test('homepage processing graph exposes one catalog-derived semantic depth at a time', async () => {
  const [home, css, renderer] = await Promise.all([
    projectFile('docs/index.html'),
    projectFile('docs/assets/site.css'),
    projectFile('docs/assets/processing-graph-explorer.mjs'),
  ]);
  const projected = buildHomepageProcessingGraphProjection(
    PROCESSING_GRAPH_CATALOG,
    BUILTIN_STRATEGY_CATALOG,
  );
  assert.equal(projected.format, HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL);
  assert.deepEqual(HOMEPAGE_PROCESSING_GRAPH_PROJECTION, projected);
  assert.ok(projected.packetTypes.some((packetType) => /-v\d+$/u.test(packetType)));
  assert.ok(projected.packetTypes.every((packetType) =>
    !/\bv\d+(?:\.\d+)*\b/iu.test(plainTypeLabel(packetType))));

  const rootView = buildProcessingGraphExplorerView(projected);
  assert.equal(rootView.label, 'ESLM processing graph');
  assert.deepEqual(rootView.inventory, {
    subcomponentCount: 3,
    descendantCircuitCount: PROCESSING_GRAPH_CATALOG.circuits.length - 1,
    processingNodeCount: PROCESSING_GRAPH_CATALOG.nodes.length,
    strategyCount: BUILTIN_STRATEGY_CATALOG.strategies.length,
    kindCounts: {
      source: 3,
      process: 12,
      coordinator: 12,
      'authority-gate': 22,
      sink: 3,
    },
  });
  assert.deepEqual(rootView.items.map((item) => item.label), [
    'Runtime request cycle',
    'Knowledge build',
    'Graph discovery research',
  ]);
  assert.ok(rootView.items.every((item) => item.entityKind === 'circuit'));
  assert.equal(rootView.inputPorts.length, 3);
  assert.equal(rootView.outputPorts.length, 3);
  assert.ok([...rootView.inputPorts, ...rootView.outputPorts]
    .every((port) => port.externalEndpoint && port.navigationNodeIds.length === 0
      && ['external-actor', 'external-system', 'external-actor-system']
        .includes(port.externalEndpointKind)));
  assert.equal(rootView.links.filter((link) => link.linkKind === 'boundary-flow').length, 6);
  assert.ok(PROCESSING_GRAPH_CATALOG.edges.every((edge) => !PROCESSING_GRAPH_CATALOG.edges
    .some((candidate) => candidate.from === edge.to && candidate.to === edge.from)),
  'exact processing nodes must not have reciprocal edge pairs');

  const runtimeView = buildProcessingGraphExplorerView(projected, {
    kind: 'circuit',
    id: 'circuit:runtime:request-cycle',
  });
  assert.deepEqual(runtimeView.items.map((item) => item.label), [
    'Ingress and language',
    'Request and session',
    'Knowledge and evidence',
    'Reasoning and verification',
    'Failure and result',
  ]);
  assert.ok(runtimeView.links.some((link) => link.linkKind === 'flow' && link.edgeCount > 1));

  const ingressView = buildProcessingGraphExplorerView(projected, {
    kind: 'circuit',
    id: 'circuit:runtime:ingress-language',
  });
  const workPolicyPort = ingressView.inputPorts.find((port) =>
    port.navigationNodeIds.includes('node:runtime:work-policy-gate'));
  assert.deepEqual(workPolicyPort.navigationNodeKinds, ['authority-gate']);
  assert.equal(workPolicyPort.externalEndpoint, false);
  assert.ok(ingressView.inputPorts.some((port) => port.externalEndpoint
    && port.label === 'CLI operator or library client'));

  const languageNodeView = buildProcessingGraphExplorerView(projected, {
    kind: 'node',
    id: 'node:runtime:language-proposal-coordinator',
  });
  assert.equal(languageNodeView.inventory.strategyCount, 24);
  assert.equal(languageNodeView.items.length, 1);
  assert.equal(languageNodeView.items[0].entityKind, 'family');
  assert.equal(languageNodeView.breadcrumbs.at(-1).label, 'Language proposal coordinator');
  const familyView = buildProcessingGraphExplorerView(projected, {
    kind: 'family',
    id: languageNodeView.items[0].id,
    parentNodeId: 'node:runtime:language-proposal-coordinator',
  });
  assert.equal(familyView.items.length, 24);
  assert.ok(familyView.items.every((item) => item.entityKind === 'strategy'));
  assert.equal(familyView.inputPorts.length, 1);
  assert.equal(familyView.outputPorts.length, 1);
  assert.deepEqual(familyView.outputPorts[0].navigationNodeIds,
    ['node:runtime:language-proposal-coordinator']);
  assert.equal(familyView.outputPorts[0].label, 'Candidate handoff');
  const strategyView = buildProcessingGraphExplorerView(projected, {
    kind: 'strategy',
    id: familyView.items[0].id,
    parentFamilyId: languageNodeView.items[0].id,
    parentNodeId: 'node:runtime:language-proposal-coordinator',
  });
  assert.equal(strategyView.items.length, 0);
  assert.equal(strategyView.inputPorts.length, 1);
  assert.equal(strategyView.outputPorts.length, 1);
  assert.deepEqual(strategyView.reusedByNodes.map((node) => node.nodeId),
    ['node:runtime:language-proposal-coordinator']);

  const sourceView = buildProcessingGraphExplorerView(projected, {
    kind: 'node', id: 'node:runtime:request-ingress',
  });
  assert.equal(sourceView.inputPorts.length, 1);
  assert.equal(sourceView.inputPorts[0].externalEndpoint, true);
  assert.equal(sourceView.inputPorts[0].externalEndpointKind, 'external-actor-system');
  assert.equal(sourceView.links[0].linkKind, 'boundary-flow');
  assert.equal(sourceView.outputPorts.length, 1);

  const reachableCircuits = new Set([projected.rootCircuitId]);
  const reachableNodes = new Set();
  const reachableStrategies = new Set();
  const reachableEdges = new Set();
  for (const circuit of projected.circuits) {
    const view = buildProcessingGraphExplorerView(projected, { kind: 'circuit', id: circuit.circuitId });
    for (const item of view.items) {
      if (item.entityKind === 'circuit') reachableCircuits.add(item.id);
      if (item.entityKind === 'node') reachableNodes.add(item.id);
    }
  }
  for (const node of projected.nodes) {
    const view = buildProcessingGraphExplorerView(projected, { kind: 'node', id: node.nodeId });
    for (const item of view.items) {
      if (item.entityKind === 'strategy') reachableStrategies.add(item.id);
      if (item.entityKind === 'family') {
        const family = buildProcessingGraphExplorerView(projected, {
          kind: 'family', id: item.id, parentNodeId: node.nodeId,
        });
        for (const strategy of family.items) reachableStrategies.add(strategy.id);
      }
    }
    for (const edge of [...view.incomingEdges, ...view.outgoingEdges]) reachableEdges.add(edge.edgeId);
  }
  for (const view of [
    ...projected.circuits.map((circuit) => buildProcessingGraphExplorerView(projected, {
      kind: 'circuit', id: circuit.circuitId,
    })),
    ...projected.nodes.map((node) => buildProcessingGraphExplorerView(projected, {
      kind: 'node', id: node.nodeId,
    })),
    ...projected.strategyFamilies.map((family) => buildProcessingGraphExplorerView(projected, {
      kind: 'family', id: family.familyId,
    })),
    ...projected.strategies.map((strategy) => buildProcessingGraphExplorerView(projected, {
      kind: 'strategy', id: strategy.identity,
    })),
  ]) {
    assert.ok(view.inputPorts.length > 0, `${view.label} input boundary`);
    assert.ok(view.outputPorts.length > 0, `${view.label} output boundary`);
    assert.ok([...view.inputPorts, ...view.outputPorts]
      .filter((port) => port.externalEndpoint)
      .every((port) => ['external-actor', 'external-system', 'external-actor-system']
        .includes(port.externalEndpointKind)), `${view.label} exterior kind`);
  }
  assert.deepEqual([...reachableCircuits].toSorted(), projected.circuits.map((item) => item.circuitId).toSorted());
  assert.deepEqual([...reachableNodes].toSorted(), projected.nodes.map((item) => item.nodeId).toSorted());
  assert.deepEqual([...reachableStrategies].toSorted(),
    projected.strategies.map((item) => item.identity).toSorted());
  assert.deepEqual([...reachableEdges].toSorted(), projected.edges.map((item) => item.edgeId).toSorted());

  assert.match(home, /data-processing-graph-explorer/u);
  assert.match(home, /data-graph-viewport/u);
  assert.match(home, /purpose-built symbolic language and Executable Symbolic Language Model concepts/u);
  assert.match(home, /Explore this developing vision/u);
  assert.doesNotMatch(home, /Start here: current system, evidence, and scope/u);
  assert.doesNotMatch(home, /<h2[^>]*>Explore the processing graph<\/h2>/u);
  assert.match(home, /One fitted semantic depth at a time/u);
  assert.match(home, /breadcrumb/u);
  assert.match(home, /solid green arrows are typed catalog flows/iu);
  assert.match(home, /Human actor/u);
  assert.match(home, /Software boundary/u);
  assert.match(home, /Operator or client/u);
  assert.match(home, /Drag any component/u);
  assert.match(home, /one direct, monotonic cubic Bézier curve/u);
  assert.match(home, /exactly three use top → bottom → top/iu);
  assert.match(home, /A leaf keeps its real component between concrete input and output interactions/iu);
  assert.match(home, /Opposed aggregate paths · no exact cycle/u);
  assert.match(home, /contains no reciprocal exact-node edge pair/u);
  assert.doesNotMatch(home + renderer, /This is a leaf\. Its full contract appears below\./u);
  assert.equal((home.match(/<figure class="diagram/gu) ?? []).length, 0);
  assert.doesNotMatch(home, /Successive zooms|Zoom [1-7] ·/u);
  for (const label of ['ESLM processing graph', 'Runtime request cycle', 'Knowledge build',
    'Graph discovery research', 'Language proposal coordinator', 'Witness verification gate',
    'Result construction coordinator', 'Result schema gate', 'Session commit gate',
    'Runtime result sink']) assert.match(JSON.stringify(projected) + renderer, new RegExp(label, 'u'));
  for (const identity of BUILTIN_STRATEGY_CATALOG.strategies
    .filter((strategy) => strategy.stage === 'runtime.result.construct')
    .map((strategy) => `${strategy.strategyId}@${strategy.version}`)) {
    assert.ok(HOMEPAGE_PROCESSING_GRAPH_PROJECTION.strategies
      .some((strategy) => strategy.identity === identity), identity);
  }
  assert.match(home, /non-authoritative process/iu);
  assert.doesNotMatch(home, /sha256:|\b\d+ (?:nodes|circuits|strateg(?:y|ies)|typed edges|packet types)\b/iu);
  assert.match(renderer, /buildProcessingGraphExplorerView/u);
  assert.match(renderer, /graphEnterKind/u);
  assert.match(renderer, /graph-camera__breadcrumbs/u);
  assert.match(renderer, /graph-camera__header/u);
  assert.match(renderer, /graph-boundary-port/u);
  assert.match(renderer, /PAGE_SIZE = 6/u);
  assert.match(renderer, /drawLinks/u);
  assert.match(renderer, /applyAutomaticVerticalDistribution/u);
  assert.match(renderer, /installVerticalDragging/u);
  assert.match(renderer, /safe-lane-cycle/u);
  assert.match(renderer, /reciprocal-flow/u);
  assert.match(renderer, /directSiblingLinks\.length === 0/u);
  assert.match(renderer, /freeBezierSegment/u);
  assert.match(renderer, /simple-bezier/u);
  assert.doesNotMatch(renderer, /shortestOrthogonalRoute|intermediateWaypoints/u);
  assert.match(renderer, /Proposes \$\{outputs\} for \$\{owners\}/u);
  assert.doesNotMatch(renderer, /ONE SELECTED CIRCUIT|SOLID ARROWS ARE TYPED HANDOFFS|ONE EXACT STRATEGY/u);
  assert.doesNotMatch(home + renderer, /data-graph-(?:home|back)|graph-explorer__toolbar/u);
  assert.match(renderer, /--graph-box-inset/u);
  assert.match(renderer, /external-actor-system/u);
  assert.match(renderer, /dataset\.graphPortEnterKind/u);
  assert.match(renderer, /graph-camera__stage--parallel/u);
  assert.match(renderer, /marker-end/u);
  assert.match(renderer, /detail\.resourceDimensions/u);
  assert.match(renderer, /reusedByNodes/u);
  assert.match(css, /\.graph-explorer__viewport[^}]*overflow:visible/u);
  assert.match(css, /\.graph-camera__stage[^}]*position:relative/u);
  assert.match(css, /\.graph-camera__edges[^}]*position:absolute/u);
  assert.match(css, /\.graph-camera__edge--boundary-flow/u);
  assert.match(css, /\.graph-camera__edge--implementation-flow/u);
  assert.match(css, /\.graph-camera__edge--reciprocal-flow/u);
  for (const color of ['#007a45', '#165dcc', '#c45100', '#922a9b']) {
    assert.match(renderer + css, new RegExp(color, 'iu'));
  }
  assert.match(css, /repeat\(var\(--graph-track-count,3\),minmax\(0,1fr\)\)/u);
  assert.match(css, /\.graph-entity-icon--external-actor/u);
  assert.match(css, /\.graph-entity-icon--external-system/u);
  assert.match(css, /\.graph-node-card--plane/u);
  assert.match(css, /\.graph-node-card--circuit-group/u);
  assert.match(css, /\.graph-leaf/u);
});

test('every explorer entity and boundary receives concrete English explanation text', () => {
  const projected = buildHomepageProcessingGraphProjection(
    PROCESSING_GRAPH_CATALOG,
    BUILTIN_STRATEGY_CATALOG,
  );
  const views = [
    ...projected.circuits.map((circuit) => buildProcessingGraphExplorerView(projected, {
      kind: 'circuit', id: circuit.circuitId,
    })),
    ...projected.nodes.map((node) => buildProcessingGraphExplorerView(projected, {
      kind: 'node', id: node.nodeId,
    })),
    ...projected.strategyFamilies.map((family) => buildProcessingGraphExplorerView(projected, {
      kind: 'family', id: family.familyId,
    })),
    ...projected.strategies.map((strategy) => buildProcessingGraphExplorerView(projected, {
      kind: 'strategy', id: strategy.identity,
    })),
  ];
  const explanations = new Set();
  for (const view of views) {
    const copy = explainProcessingGraphView(view, projected);
    assert.ok(copy.summary.length >= 20, `${view.label} summary`);
    assert.ok(copy.explanation.length >= 180, `${view.label} explanation`);
    assert.ok(copy.explanation.includes(view.label) || copy.explanation.includes(view.role), view.label);
    assert.doesNotMatch(copy.summary + copy.explanation,
      /This is a leaf|full contract appears below|no hidden processing step is implied/iu);
    assert.ok(!explanations.has(copy.explanation), `duplicate explanation: ${view.label}`);
    explanations.add(copy.explanation);
    for (const port of [...view.inputPorts, ...view.outputPorts]) {
      const portCopy = explainBoundaryPort(port, view);
      assert.ok(portCopy.summary.length >= 20, `${view.label} ${port.direction} summary`);
      assert.ok(portCopy.explanation.length >= 120, `${view.label} ${port.direction} explanation`);
      assert.ok(portCopy.explanation.includes(portCopy.connectedLabel));
      assert.ok(port.packetTypes.some((packetType) =>
        portCopy.explanation.includes(plainTypeLabel(packetType))), `${view.label} ${port.portId}`);
    }
  }
  assert.equal(views.length, projected.circuits.length + projected.nodes.length
    + projected.strategyFamilies.length + projected.strategies.length);
});

test('research diagrams use protocol-neutral role labels while prose names current receipts', async () => {
  const [logical, research] = await Promise.all([
    projectFile('docs/architecture/logical-processing-architecture.html'),
    projectFile('docs/research/processing-graph-research.html'),
  ]);
  for (const page of [logical, research]) {
    assert.match(page, /P\[Approved plan\] --> A\[Machine analysis\]/u);
    assert.match(page, /R --> C\[Sealed cycle\]/u);
    assert.doesNotMatch(page, /Machine analysis v\d|Sealed cycle v\d/u);
  }
  assert.match(research, /Analysis-v6 visited all 17,634 admitted episodes/u);
  assert.doesNotMatch(research, /Analysis-v5/u);
});

test('primary technical chapters link to the logical processing model', async () => {
  for (const file of [
    'index.html', 'architecture/architecture.html', 'architecture/strategy-architecture.html',
    'language/language.html', 'knowledge/knowledge-bases.html',
    'reasoning/reasoning-methods.html', 'evaluation.html', 'operations/cli.html',
  ]) {
    assert.match(await projectFile(`docs/${file}`), /logical-processing-architecture\.html/u, file);
  }
});

test('CLI chapter documents the shared interactive processing and answer presentation', async () => {
  const page = await projectFile('docs/operations/cli.html');
  for (const phrase of [
    'Thinking · symbolic processing',
    'route, status, method, evidence count, and authority boundary',
    'five-node construction circuit',
    'selected sentence and assembly strategies',
    'A clean <em>Answer</em> block follows',
    'the JSON result retains the original typed <code>answer</code> and <code>values</code>',
    'standard error',
    'a cache hit emits no live-invocation line',
  ]) assert.ok(page.includes(phrase), phrase);
  assert.doesNotMatch(page, /Direct local execution, disabled assistance, and cache hits stay silent/u);
});

test('human architecture chapters describe grounded symbolic generation, not an extractive baseline', async () => {
  for (const path of [
    'docs/architecture/logical-processing-architecture.html',
    'docs/architecture/strategy-architecture.html',
    'docs/language/heuristic-language.html',
    'docs/research/research-horizons.html',
  ]) {
    const page = await projectFile(path);
    assert.match(page, /grounded symbolic|grounded response/iu, path);
    assert.doesNotMatch(page, /extractive construction|current construction is extractive|cited extractive drafts/iu,
      path);
  }
});

test('strategy chapter distinguishes concurrent asynchronous scheduling from sequential deployed language',
  async () => {
    const page = await projectFile('docs/architecture/strategy-architecture.html');
    assert.match(page, /asynchronous <code>runStrategyStage<\/code> starts every funded independent executor before awaiting/u);
    assert.match(page, /assembles results and arbitration in canonical identity order rather than completion order/u);
    assert.match(page, /receipt deliberately contains no timing or completion-order fields/u);
    assert.match(page, /current deployed local-language path calls this synchronous API/u);
    assert.match(page, /deployed language execution remains sequential until that owner is explicitly migrated/u);
    assert.match(page, /Concurrency and resource consumption add no confidence/u);
    assert.match(page, /independent correlation groups carrying validated evidence/u);
  });

test('product documentation uses processing-node terminology without external-extension wording', async () => {
  const files = [
    'README.md', 'AGENTS.md',
    ...(await readdir(join(PROJECT_ROOT, 'docs')))
      .filter((file) => file.endsWith('.html') && file !== 'specsLoader.html')
      .map((file) => `docs/${file}`),
    ...(await readdir(join(PROJECT_ROOT, 'docs/specs')))
      .filter((file) => file.endsWith('.md'))
      .map((file) => `docs/specs/${file}`),
  ];
  for (const file of files) {
    assert.doesNotMatch(await projectFile(file), /\bplugins?\b/iu, file);
  }
});

test('source paths stay in explicit implementation or operator reference views', async () => {
  const allowedReferencePages = new Set([
    'cli.html', 'sources.html', 'specification-architecture.html', 'specsLoader.html',
  ]);
  const files = (await readdir(join(PROJECT_ROOT, 'docs')))
    .filter((file) => file.endsWith('.html') && !allowedReferencePages.has(file));
  const sourcePath = /(?:\bsrc\/|\btests\/|\btraining\/|\bscripts\/|[a-z0-9-]+\.mjs\b)/iu;
  for (const file of files) {
    const narrative = removeReferenceOnlyHtml(await projectFile(`docs/${file}`));
    assert.doesNotMatch(narrative, sourcePath, file);
  }
});

test('authoritative specs define the processing graph and non-voting gates', async () => {
  const [architecture, planning, coordination, documentation] = await Promise.all([
    projectFile('docs/specs/DS002-architecture-and-core-kb-boundary.md'),
    projectFile('docs/specs/DS008-task-planning-methods-and-results.md'),
    projectFile('docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md'),
    projectFile('docs/specs/DS012-documentation-operations-and-status.md'),
  ]);
  assert.match(architecture, /typed directed acyclic graph of \*\*processing nodes\*\*/u);
  assert.match(architecture, /four separate planes/u);
  assert.match(planning, /proof-verification gate independently accepts or rejects each witness/u);
  assert.match(coordination, /Only coordination nodes vote/u);
  assert.match(coordination, /reasoning executor[\s\S]*not a ballot/u);
  assert.match(documentation, /Repository paths and source filenames do not substitute/u);
});
