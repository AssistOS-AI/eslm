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
  HOMEPAGE_PROCESSING_GRAPH_PROJECTION_PROTOCOL,
} from '../docs/assets/processing-graph-explorer-model.mjs';

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
    'eslm-rl-dataset-discovery-plan-v1',
    'eslm-processing-graph-research-analysis-v5',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ]) assert.match(page, new RegExp(protocol, 'u'));
  assert.match(page, /complete analysis-v5 records 69,467 typed actions and 41,670 dependencies/u);
  assert.match(page, /Sixteen validated training-projection shards admit 2,220 trees/u);
  assert.match(page, /approved combined plan admits 19,854 training-visible episodes/u);
  assert.match(page, /Final visited work, omissions, events, votes, hypotheses, and cycle decisions belong to analysis-v5 and cycle-v3/u);
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
  const section = page.match(
    /<h3>Packet-contract catalog · 58 closed semantic envelopes<\/h3>([\s\S]*?)<h3>Zoom 3/u,
  )?.[1] ?? '';
  assert.equal((section.match(/<tr><td><code>packet:/gu) ?? []).length, 58);
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

test('homepage starts with a complete live-catalog projection and successive zooms', async () => {
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
  assert.match(home, /data-processing-graph-explorer/u);
  assert.match(home, /data-graph-viewport/u);
  assert.match(home, /The first view is the map, not a summary of it/u);
  assert.match(home, /Complete nested catalog: runtime, compiler, and inert research planes/u);
  assert.equal((home.match(/<figure class="diagram/gu) ?? []).length, 7);
  for (const level of [
    'Zoom 1 · root circuit',
    'Zoom 2 · runtime request cycle',
    'Zoom 3 · direct language and recovery',
    'Zoom 4 · evidence frontier',
    'Zoom 5 · coordinator interior',
    'Zoom 6 · grounded response construction',
    'Zoom 7 · validation, commit, and emission',
  ]) assert.match(home, new RegExp(level, 'u'));
  for (const label of ['ESLM processing graph', 'Runtime request cycle', 'Knowledge build',
    'Graph discovery research', 'Language proposal coordinator', 'Witness verification gate',
    'Result construction coordinator', 'Result schema gate', 'Session commit gate',
    'Runtime result sink']) assert.match(home + renderer, new RegExp(label, 'u'));
  assert.match(home, /grammatical-spelling@1/u);
  assert.match(home, /relative-clause-extraction@1/u);
  assert.match(home, /Per-strategy resource envelopes/u);
  assert.match(home, /confidence:language-interpretation/u);
  assert.match(home, /correlation:language:/u);
  assert.match(home, /Resource spend and concurrency add no confidence/u);
  assert.match(home, /separate evidence-admission gate/u);
  assert.match(home, /only path here with verified answer authority/u);
  assert.match(home, /strategies realize admitted content/u);
  for (const nodeId of [
    'node:runtime:result-construction-coordinator',
    'node:runtime:claim-admission-gate',
    'node:runtime:rhetorical-plan-builder',
    'node:runtime:sentence-realization-coordinator',
    'node:runtime:document-assembly-coordinator',
  ]) assert.match(home, new RegExp(nodeId, 'u'));
  for (const identity of BUILTIN_STRATEGY_CATALOG.strategies
    .filter((strategy) => strategy.stage === 'runtime.result.construct')
    .map((strategy) => `${strategy.strategyId}@${strategy.version}`)) {
    assert.ok(HOMEPAGE_PROCESSING_GRAPH_PROJECTION.strategies
      .some((strategy) => strategy.identity === identity), identity);
  }
  assert.match(home, /answerSupported: false/u);
  assert.match(home, /non-executable hypotheses for manual review; they have no runtime or promotion authority/iu);
  assert.doesNotMatch(home, /sha256:|\b\d+ (?:nodes|circuits|strateg(?:y|ies)|typed edges|packet types)\b/iu);
  assert.match(renderer, /node\.strategyIdentities/u);
  assert.match(renderer, /strategy\.budgetKeys/u);
  assert.match(renderer, /strategy\.confidenceKind/u);
  assert.match(renderer, /strategy\.correlationGroup/u);
  assert.match(renderer, /node\.resourceDimensions/u);
  assert.match(css, /\.graph-explorer__viewport[^}]*overflow:auto/u);
  assert.match(css, /\.graph-explorer__canvas[^}]*min-width/u);
  assert.match(css, /--graph-zoom/u);
  assert.match(css, /\.architecture-state-key/u);
  assert.match(css, /\.architecture-zoom/u);
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
  assert.match(research, /Analysis-v5 visited all 17,634 admitted episodes/u);
  assert.doesNotMatch(research, /Analysis-v4/u);
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
