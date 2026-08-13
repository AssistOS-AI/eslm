import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { PROJECT_ROOT } from '../src/paths.mjs';
import { processingGraphValidationReceipt } from '../src/processing-graph/index.mjs';

async function projectFile(path) {
  return readFile(join(PROJECT_ROOT, path), 'utf8');
}

test('DS028 keeps dataset evidence inert, rights-aware, and outside runtime authority', async () => {
  const spec = await projectFile(
    'docs/specs/DS028-dataset-guided-processing-graph-discovery-research.md',
  );
  assert.match(spec, /^status: in-progress$/mu);
  assert.match(spec, /`eslm-research-episode-v1`/u);
  for (const lane of [
    'Immutable source registry and raw cache',
    'Analysis and training projection',
    'Benchmark and test visibility',
    'Knowledge extraction',
    'Generic-core proposal',
  ]) assert.ok(spec.includes(`**${lane}`), lane);
  assert.match(spec, /never becomes runtime truth/u);
  assert.match(spec, /Dataset-provided[\s\S]*remain data and are\nnever executed/u);
  assert.match(spec, /An authority gate never votes/u);
  const protocolOrder = [
    'eslm-rl-dataset-discovery-plan-v1',
    'eslm-processing-graph-research-analysis-v5',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ];
  let priorProtocol = -1;
  for (const protocol of protocolOrder) {
    const index = spec.indexOf(protocol, priorProtocol + 1);
    assert.ok(index > priorProtocol, `${protocol} must appear in lifecycle order`);
    priorProtocol = index;
  }
  assert.match(spec, /analysisAdmission: reviewed-training-projections-only/u);
  assert.match(spec, /decision scope is `research-consolidation-only`/u);
  assert.match(spec, /Each machine hypothesis is accounted for exactly once as reviewed or unreviewed/u);
  assert.match(spec, /None of the four changes the DS029 catalog/u);
  for (const type of [
    'processing-node', 'coordination-node', 'authority-gate', 'strategy', 'edge', 'packet-field', 'nested-circuit',
  ]) {
    assert.match(spec, new RegExp(`\`${type}\``, 'u'));
  }
  assert.match(spec, /Promotion follows thirteen visible stages/u);
  assert.match(spec, /13\. obtain an explicit maintainer-reviewed DS promotion decision/u);
  assert.match(spec, /receipt records the decision;\n    it does not create promotion authority/u);
  assert.match(spec, /Passing a validator at one stage does not admit\n+the next/u);
  assert.match(spec, /`rowsAvailable` and `rowsVisited`; those values must reconcile with the plan's admitted projection/u);
  assert.match(spec, /protected cross-source transfer pool/u);
  assert.match(spec, /AppWorld[\s\S]*evaluation-only/u);
  assert.match(spec, /GAIA[\s\S]*protected evaluation evidence/u);
  assert.doesNotMatch(spec, /eslm-processing-graph-research-analysis-v2|eslm-rl-dataset-discovery-cycle-v1/u);
});

test('plans freeze admitted rows while cycle v3 binds analysis and human consolidation', async () => {
  const [pilotPlanText, pilotAnalysisText, pilotCycleText, oasstPlanText, combinedPlanText] =
    await Promise.all([
      projectFile('training/research-sources/helpsteer2-gsm8k-pilot/discovery-plan.json'),
      projectFile('docs/results/latest-processing-graph-pilot.json'),
      projectFile('training/research-sources/helpsteer2-gsm8k-pilot/discovery-cycle.json'),
      projectFile('training/research-sources/oasst1-fdf72ae0/discovery-plan.json'),
      projectFile('training/research-sources/helpsteer2-gsm8k-oasst1-scale/discovery-plan.json'),
    ]);
  const pilotPlan = JSON.parse(pilotPlanText);
  const pilotAnalysis = JSON.parse(pilotAnalysisText);
  const pilotCycle = JSON.parse(pilotCycleText);
  const oasstPlan = JSON.parse(oasstPlanText);
  const combinedPlan = JSON.parse(combinedPlanText);

  assert.equal(pilotPlan.format, 'eslm-rl-dataset-discovery-plan-v1');
  assert.deepEqual(pilotPlan.sourceScopes.map((scope) => scope.splits[0].rowsAdmitted),
    [10_161, 7_473]);
  assert.equal(pilotAnalysis.format, 'eslm-processing-graph-research-analysis-v5');
  assert.equal(pilotCycle.format, 'eslm-rl-dataset-discovery-cycle-v3');
  assert.equal(pilotCycle.analysisBinding.receiptDigest, pilotAnalysis.receiptDigest);
  assert.equal(pilotCycle.authority.decisionScope, 'research-consolidation-only');
  for (const authority of ['answer', 'runtime', 'proof', 'promotion']) {
    assert.equal(pilotPlan.authority[authority], 'none');
    assert.equal(pilotCycle.authority[authority], 'none');
  }
  const mappedMachineHypotheses = pilotCycle.hypotheses
    .flatMap((hypothesis) => hypothesis.analysisHypothesisIds);
  assert.equal(new Set(mappedMachineHypotheses).size, pilotAnalysis.hypotheses.length);
  assert.deepEqual(pilotCycle.unreviewedAnalysisHypothesisIds, []);

  assert.deepEqual(oasstPlan.sourceScopes[0].splits, [
    { name: 'training', visibility: 'training-visible', rowsDeclared: 9_846, rowsAdmitted: 2_220 },
    { name: 'validation', visibility: 'development-visible', rowsDeclared: 518, rowsAdmitted: 0 },
  ]);
  assert.equal(combinedPlan.sourceScopes.flatMap((scope) => scope.splits)
    .reduce((sum, split) => sum + split.rowsAdmitted, 0), 19_854);
});

test('DS029 keeps research hypotheses and proposal sinks outside promotion authority', async () => {
  const spec = await projectFile('docs/specs/DS029-hierarchical-processing-circuits-and-packet-contracts.md');
  assert.match(spec, /closed cycle receipts use seven hypothesis types/u);
  assert.match(spec, /promotion-proposal-sink` terminates with a non-authoritative proposal/u);
  assert.match(spec, /receipt records that\n+authority decision but cannot manufacture it/u);
  for (const protocol of [
    'eslm-rl-dataset-discovery-plan-v1',
    'eslm-processing-graph-research-analysis-v5',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ]) assert.match(spec, new RegExp(protocol, 'u'));
  assert.match(spec, /None may edit this catalog, register a strategy/u);
});

test('research documentation preserves protocol order, authority, and current-versus-target language', async () => {
  const paths = [
    'README.md', 'AGENTS.md',
    'docs/specs/DS007-cli-session-and-training-operations.md',
    'docs/specs/DS012-documentation-operations-and-status.md',
    'docs/specs/DS028-dataset-guided-processing-graph-discovery-research.md',
    'docs/specs/DS029-hierarchical-processing-circuits-and-packet-contracts.md',
    'docs/research/processing-graph-research.html', 'docs/architecture/logical-processing-architecture.html',
    'docs/operations/cli.html', 'docs/operations/training.html', 'docs/status.html',
  ];
  const protocols = [
    'eslm-rl-dataset-discovery-plan-v1',
    'eslm-processing-graph-research-analysis-v5',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ];
  for (const path of paths) {
    const text = await projectFile(path);
    let prior = -1;
    for (const protocol of protocols) {
      const index = text.indexOf(protocol, prior + 1);
      assert.ok(index > prior, `${path}: ${protocol}`);
      prior = index;
    }
    assert.doesNotMatch(text,
      /eslm-processing-graph-research-analysis-v2|eslm-rl-dataset-discovery-cycle-v1/u,
      path);
  }

  const home = await projectFile('docs/index.html');
  assert.match(home, /href="research\/processing-graph-research\.html"/u);
  assert.match(home, /Research plane/u);
  assert.match(home, /non-executable hypotheses/u);
  assert.doesNotMatch(home, /eslm-processing-graph-research-analysis-v\d|sha256:/u);

  const [research, status, documentationSpec] = await Promise.all([
    projectFile('docs/research/processing-graph-research.html'),
    projectFile('docs/status.html'),
    projectFile('docs/specs/DS012-documentation-operations-and-status.md'),
  ]);
  for (const text of [research, status, documentationSpec]) {
    assert.match(text, /historical/iu);
    assert.match(text, /superseded/iu);
    assert.match(text, /current/iu);
    assert.match(text, /promotion/iu);
  }
  assert.match(status, /<tr><td>Target<\/td>/u);
  assert.match(status, /Reviewed, acquired, or cached/u);
  assert.match(documentationSpec, /The plan may admit only reviewed training projections to analysis/u);
  assert.match(documentationSpec, /Every layer explicitly denies answer, runtime, proof, and promotion authority/u);
  for (const text of [research, status]) {
    assert.doesNotMatch(text, /2,341|19,975|66,221|21 retained hypotheses/iu);
  }
});

test('processing-graph research page separates measured stages from promotion authority', async () => {
  const validation = processingGraphValidationReceipt();
  const [page, horizons, header, home, matrix] = await Promise.all([
    projectFile('docs/research/processing-graph-research.html'),
    projectFile('docs/research/research-horizons.html'),
    projectFile('docs/partials/header.html'),
    projectFile('docs/index.html'),
    projectFile('docs/specs/matrix.md'),
  ]);
  assert.match(page, /Current foundation:<\/strong>/u);
  assert.match(page, new RegExp(
    `No research artifact has changed the ${validation.counts.nodes}-node catalog or runtime behavior`,
    'u',
  ));
  assert.match(page, /eslm-research-episode-v1/u);
  assert.match(page, /RL and task feedback/u);
  assert.match(page, /Reasoning task benchmarks/u);
  assert.match(page, /The exact plan, analysis, review, and cycle boundary/u);
  assert.match(page, /Promotion authority gate/u);
  assert.match(page, /Any additional source or larger execution stage requires a source-specific DS016–DS021 gate/u);
  for (const protocol of [
    'eslm-rl-dataset-discovery-plan-v1',
    'eslm-processing-graph-research-analysis-v5',
    'eslm-processing-graph-consolidation-review-v1',
    'eslm-rl-dataset-discovery-cycle-v3',
  ]) assert.match(page, new RegExp(protocol, 'u'));
  for (const value of [
    '17,634 admitted episodes', '69,467 typed actions', '41,670 dependencies',
    '14 machine hypotheses', 'four source-neutral decisions', '2,220 trees',
    '518 validation trees', '19,854 admitted training-visible episodes', '8,192',
    'rl-dataset-graph-discovery',
    validation.catalogDigest.replace('sha256:', ''),
    validation.topologyDigest.replace('sha256:', ''),
    validation.packetContractDigest.replace('sha256:', ''),
  ]) assert.ok(page.includes(value), value);
  assert.match(page, /Current<\/code> requires the complete live identity chain/u);
  assert.match(page, /Historical<\/code> preserves what one frozen execution measured/u);
  assert.match(page, /Superseded<\/code>, <code>blocked<\/code>, or <code>withdrawn<\/code>/u);
  assert.match(page, /Only the plan admits reviewed training projections/u);
  assert.match(page, /No artifact creates a catalog identity/u);
  assert.doesNotMatch(page, /2,341|19,975|analysis-v2|cycle-v1|Current v2 receipt/iu);
  for (const receipt of [
    'results/latest-processing-graph-source-status.json',
    'results/latest-oasst1-processing-graph-research.json',
    'results/latest-processing-graph-research.json',
  ]) assert.ok(page.includes('href="' + receipt + '"'), receipt);
  assert.match(home, /Research plane/u);
  assert.match(home, /non-executable hypotheses/u);
  assert.match(page, /Thirteen promotion stages/u);
  for (const source of [
    'allenai/natural-instructions', 'nvidia/HelpSteer2', 'openai/grade-school-math',
    'openai/prm800k', 'OpenAssistant/oasst1', 'openai/summarize-from-feedback',
    'OSU-NLP-Group/Mind2Web', 'sierra-research/tau2-bench',
    'StonyBrookNLP/appworld', 'gaia-benchmark/GAIA',
  ]) assert.match(page, new RegExp(source, 'u'));
  assert.match(horizons, /processing-graph-research\.html/u);
  assert.match(header, /processing-graph-research\.html/u);
  assert.match(home, /processing-graph-research\.html/u);
  assert.match(matrix, /DS028-dataset-guided-processing-graph-discovery-research\.md/u);
});
