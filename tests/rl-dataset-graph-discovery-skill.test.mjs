import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  researchDiscoveryPlanDigest,
} from '../src/research/research-discovery-plan-contract.mjs';
import {
  RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-contract.mjs';
import { analyzeProcessingGraphResearch } from '../src/research/processing-graph-research-analyzer.mjs';
import { resolveProcessingGraphResearchWorkPolicy } from
  '../src/research/processing-graph-research-work-policy.mjs';
import {
  createResearchSourceRegistry,
  researchEpisodeContentMember,
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
} from '../src/research/processing-graph-research.mjs';
import { createSyntheticProcessingGraphResearchFixture } from
  './fixtures/processing-graph-research-fixture.mjs';
import { sourceAdmissionReceiptDigest } from
  '../training/.agents/skills/rl-dataset-graph-discovery/scripts/source-admission-receipt.mjs';

const execute = promisify(execFile);
const skillRoot = resolve('training/.agents/skills/rl-dataset-graph-discovery');
const digest = (character) => `sha256:${character.repeat(64)}`;
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

async function runScript(name, payload) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-rl-skill-'));
  const path = join(directory, 'input.json');
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return execute(process.execPath, [join(skillRoot, 'scripts', name), path]);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function analysisBinding(analysis) {
  return {
    protocol: analysis.format,
    receiptDigest: analysis.receiptDigest,
    implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
    registryDigest: analysis.registry.digest,
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
  };
}

function sealAnalysis(value) {
  const unsigned = structuredClone(value);
  delete unsigned.receiptDigest;
  return { ...unsigned, receiptDigest: sha256(stable(unsigned)) };
}

function manifestFromRegistry(source, component) {
  const sourceFileId = `${source.sourceId}-archive`;
  const componentFileId = `${source.sourceId}-${component.componentId}`;
  const componentBytes = 4_096;
  const protectedRows = component.identity.rows - component.projection.rows;
  return {
    format: 'eslm-rl-dataset-source-manifest-v2',
    sourceId: source.sourceId,
    revision: source.revision,
    owner: source.owner,
    officialUrl: source.officialUrl,
    paperUrl: `https://example.invalid/${source.sourceId}/paper`,
    citation: source.citation,
    registryState: source.registryState,
    independenceGroup: source.independenceGroup,
    acquisition: {
      method: 'pinned-https-download',
      authorizedUrl: `https://example.invalid/${source.sourceId}/archive.jsonl`,
      accessTerms: 'Public synthetic fixture terms.',
      cachePolicy: 'Ignored immutable cache.',
      credentialPolicy: 'No credentials retained.',
    },
    identityFileId: sourceFileId,
    identity: structuredClone(source.identity),
    deliveredFiles: [
      {
        fileId: sourceFileId,
        role: 'source-archive',
        path: `${source.sourceId}/archive.jsonl`,
        sourceUrl: `https://example.invalid/${source.sourceId}/archive.jsonl`,
        ...structuredClone(source.identity),
      },
      {
        fileId: componentFileId,
        role: 'training-source-component',
        path: `${source.sourceId}/${component.componentId}.jsonl`,
        sourceUrl: `https://example.invalid/${source.sourceId}/${component.componentId}.jsonl`,
        sha256: component.identity.sha256,
        bytes: componentBytes,
        mediaType: 'application/jsonl',
      },
    ],
    components: [{
      componentId: component.componentId,
      kind: component.kind,
      licenseId: component.rights.licenseId,
      licenseUrl: 'https://example.invalid/licenses/synthetic',
      rightsState: component.rights.state,
      allowedUses: [...component.rights.allowedUses],
      redistribution: component.rights.redistribution,
      identityFileId: componentFileId,
      supportingFileIds: [],
      splits: [
        { name: 'test', visibility: 'protected', rows: protectedRows },
        { name: 'training', visibility: 'training-visible', rows: component.projection.rows },
      ],
      projection: {
        projectionId: component.projection.projectionId,
        membershipDigest: component.projection.membershipDigest,
        contentMembershipDigest: component.projection.contentMembershipDigest,
        shardCount: component.projection.shardCount,
        shardFormat: component.projection.shardFormat,
        allowedFields: [...component.projection.allowedFields],
        excludedFields: [...component.projection.excludedFields],
        privacyReview: component.projection.privacyReview,
        safetyReview: component.projection.safetyReview,
      },
      identity: {
        sha256: component.identity.sha256,
        bytes: componentBytes,
        rows: component.identity.rows,
        mediaType: 'application/jsonl',
      },
    }],
    rightsReview: {
      reviewId: `review:${source.sourceId}`,
      reviewAuthority: 'repository-policy-review',
      reviewedRevision: source.revision,
      evidenceFileIds: [sourceFileId],
      evidenceUrls: [`https://example.invalid/${source.sourceId}/license`],
      decision: 'admit-declared-projection',
      limitations: ['Synthetic training projection only.'],
    },
    extractionInventory: {
      selectedComponentIds: [component.componentId],
      excludedComponentKinds: ['protected-labels'],
      retainedRawSource: true,
      projectionLossRecorded: true,
    },
    removalObligations: ['delete cached bytes and derived projection on withdrawal'],
  };
}

async function createBundleFixture(sourceCount) {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'nonce-bundle' });
  const sourceKeys = fixture.registry.sources.slice(0, sourceCount)
    .map((source) => `${source.sourceId}@${source.revision}`);
  const sources = fixture.registry.sources.filter((source) =>
    sourceKeys.includes(`${source.sourceId}@${source.revision}`))
    .map((source) => structuredClone(source));
  const components = fixture.registry.components.filter((component) =>
    sourceKeys.includes(`${component.sourceId}@${component.revision}`))
    .map((component) => structuredClone(component));
  const episodes = fixture.episodes.filter((episode) =>
    sourceKeys.includes(`${episode.source.sourceId}@${episode.source.revision}`))
    .map((episode) => structuredClone(episode));
  for (const component of components) {
    const members = episodes.filter((episode) => episode.source.sourceId === component.sourceId
      && episode.source.revision === component.revision
      && episode.source.componentId === component.componentId);
    component.identity.rows = component.projection.rows + 2;
    component.visibility = [
      { split: 'test', visibility: 'protected', rowsDeclared: 2, rowsAdmitted: 0 },
      {
        split: 'training', visibility: 'training-visible',
        rowsDeclared: component.projection.rows, rowsAdmitted: component.projection.rows,
      },
    ];
    component.projection.membershipDigest = researchProjectionMembershipDigest(
      component.projection.projectionId,
      members.map((episode) => episode.provenance.recordDigest),
      component.identity.rows,
    );
    for (const episode of members) {
      episode.source.projectionDigest = component.projection.membershipDigest;
      episode.source.split = 'training';
    }
    component.projection.contentMembershipDigest = researchProjectionContentMembershipDigest(
      component.projection.projectionId,
      members.map(researchEpisodeContentMember),
      component.identity.rows,
    );
  }
  const registry = createResearchSourceRegistry({ sources, components });
  const workPolicy = resolveProcessingGraphResearchWorkPolicy({
    progressionStage: 'scale',
    limits: { maxRowsScanned: episodes.length, maxEpisodes: episodes.length },
  });
  const analysis = await analyzeProcessingGraphResearch({ registry, episodes, workPolicy });
  const question = 'Do repeated dependency motifs justify a distinct source-neutral processing responsibility?';
  const nullHypothesis = 'Every repeated dependency motif is already represented by the current processing graph.';
  const plan = {
    format: 'eslm-rl-dataset-discovery-plan-v2',
    planId: `plan:nonce-bundle-${sourceCount}`,
    cycleId: `cycle:nonce-bundle-${sourceCount}`,
    state: 'approved',
    question,
    nullHypothesis,
    sourceRevisions: registry.sources
      .map((source) => `${source.sourceId}@${source.revision}`).toSorted(),
    projectionDigests: registry.components
      .map((component) => component.projection.membershipDigest).toSorted(),
    sourceScopes: registry.components.map((component) => ({
      sourceRevision: `${component.sourceId}@${component.revision}`,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      splits: [
        { name: 'test', visibility: 'protected', rowsDeclared: 2, rowsAdmitted: 0 },
        {
          name: 'training', visibility: 'training-visible',
          rowsDeclared: component.projection.rows, rowsAdmitted: component.projection.rows,
        },
      ],
    })),
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisIdentity: {
      analysisId: analysis.analysis.analysisId,
      version: analysis.analysis.version,
      seed: analysis.analysis.seed,
      inputMode: analysis.analysis.inputMode,
      selectionMethod: analysis.analysis.selectionMethod,
    },
    strategyIdentities: Object.keys(workPolicy.techniqueBudgets).toSorted(),
    workPolicy,
    authority: RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  };
  const [machine, ...unreviewed] = analysis.hypotheses;
  const reviewed = machine ? [{
    hypothesisId: 'hypothesis:reviewed-bundle-structure',
    type: machine.candidate.type,
    state: 'retained',
    responsibility: machine.candidate.responsibility,
    containingCircuit: 'circuit:research:hypothesis-discovery',
    inputPacketTypes: ['packet:research:structural-feature-batch-v1'],
    outputPacketTypes: ['packet:research:hypothesis-batch-v1'],
    authority: machine.candidate.type === 'coordination-node' ? 'coordination'
      : machine.candidate.type === 'authority-gate' ? 'gate'
        : machine.candidate.type === 'strategy' ? 'proposal' : 'none',
    failureKinds: machine.candidate.failureKinds.length > 0
      ? machine.candidate.failureKinds : ['unsupported-structure'],
    resourceDimensions: machine.candidate.resourceDimensions.length > 0
      ? machine.candidate.resourceDimensions : ['resource:episodes'],
    analysisHypothesisIds: [machine.hypothesisId],
  }] : [];
  const unreviewedAnalysisHypothesisIds = [
    ...(machine ? unreviewed : analysis.hypotheses),
  ].map((item) => item.hypothesisId).toSorted();
  const cycle = sealResearchDiscoveryCycle({
    format: RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
    cycleId: plan.cycleId,
    state: analysis.completeness.complete && unreviewedAnalysisHypothesisIds.length === 0
      ? 'complete' : 'incomplete',
    planBinding: { planId: plan.planId, planDigest: researchDiscoveryPlanDigest(plan) },
    analysisBinding: analysisBinding(analysis),
    splitAccounting: researchDiscoveryCycleSplitAccounting(analysis),
    review: {
      reviewId: `review:nonce-bundle-${sourceCount}`,
      reviewAuthority: 'repository-maintainer-review',
      reviewedSpecifications: ['DS028', 'DS029'],
      decisionScope: 'research-consolidation-only',
    },
    hypotheses: reviewed,
    unreviewedAnalysisHypothesisIds,
    consolidation: reviewed.map((item) => ({
      candidateId: item.hypothesisId,
      decision: 'retain',
      resultId: item.hypothesisId,
      reason: 'The structural candidate remains research-only pending transfer and ablation.',
    })),
    analysisOmissionReasons: [...new Set(analysis.omissions.map((item) => item.reason))].toSorted(),
    authority: {
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
      decisionScope: 'research-consolidation-only',
    },
  });
  const manifests = registry.sources.map((source) => manifestFromRegistry(
    source,
    registry.components.find((component) => component.sourceId === source.sourceId
      && component.revision === source.revision),
  ));
  return { manifests, plan, analysis, cycle };
}

function readinessReceipt() {
  return {
    format: 'eslm-rl-large-source-readiness-v1', sourceRevision: 'source:nonce-feedback@revision-a1',
    componentId: 'component:training-feedback', projectionId: 'projection:feedback-structure-v1',
    sourceManifestDigest: digest('e'), pilotProjectionDigest: digest('b'),
    discoveryPlanArtifactDigest: digest('1'), discoveryPlanContentDigest: digest('2'),
    preflightReceiptDigest: digest('7'), sourceAdmissionReceiptDigest: digest('8'),
    pilot: {
      rowsAvailable: 64, rowsVisited: 64, strataAvailable: 8, strataVisited: 8,
      projectionLossRate: 0.012, complete: true,
    },
    streaming: {
      deterministicReplay: true, shardEquivalence: true, inputStreamResumeTested: true,
      peakBytes: 8_388_608, maximumPeakBytes: 16_777_216,
    },
    rights: { state: 'approved', removalPlanTested: true },
    contamination: { lineageFrozen: true, protectedIsolationVerified: true, knownOverlaps: [] },
    scalePlan: {
      stage: 'large-corpus', shards: 2, maximumRows: 64, maximumBytes: 4_096,
      maximumPeakBytes: 16_777_216, checkpointEveryShards: 2,
      stopConditions: ['identity mismatch', 'projection loss above frozen bound', 'memory budget exhaustion'],
    },
    decision: 'admit',
  };
}

async function runBundleFixture(sourceCount, {
  mutateManifest, mutateManifests, mutatePlan, mutateAnalysis, mutateCycle,
  mutateReadiness, mutateLog, readiness = true, omitManifestIndex = null,
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-rl-bundle-'));
  const fixture = await createBundleFixture(sourceCount);
  const manifests = structuredClone(fixture.manifests);
  const plan = structuredClone(fixture.plan);
  let analysis = structuredClone(fixture.analysis);
  let cycle = structuredClone(fixture.cycle);
  mutateManifest?.(manifests[0]);
  mutateManifests?.(manifests);
  mutatePlan?.(plan);
  mutateAnalysis?.(analysis);
  analysis = sealAnalysis(analysis);
  cycle.planBinding = { planId: plan.planId, planDigest: sha256(stable(plan)) };
  cycle.analysisBinding = analysisBinding(analysis);
  mutateCycle?.(cycle);
  cycle = sealResearchDiscoveryCycle(cycle);

  const manifestTexts = manifests.map(jsonText);
  const manifestDigests = manifestTexts.map(sha256);
  const planText = jsonText(plan);
  const planDigest = sha256(planText);
  const analysisText = jsonText(analysis);
  const analysisDigest = sha256(analysisText);
  const cycleText = jsonText(cycle);
  const cycleDigest = sha256(cycleText);
  const primaryManifest = manifests[0];
  const primaryComponent = primaryManifest.components[0];
  const primaryScope = plan.sourceScopes[0];
  const admittedRows = primaryScope.splits.reduce((sum, split) => sum + split.rowsAdmitted, 0);
  const trainingRows = primaryComponent.splits
    .filter((split) => split.visibility === 'training-visible')
    .reduce((sum, split) => sum + split.rows, 0);
  const admissionScopes = new Map();
  for (const scope of plan.sourceScopes) {
    const manifestIndex = manifests.findIndex((manifest) =>
      `${manifest.sourceId}@${manifest.revision}` === scope.sourceRevision);
    const component = manifests[manifestIndex]?.components.find((item) =>
      item.componentId === scope.componentId);
    if (!component) continue;
    admissionScopes.set(`${scope.sourceRevision}\u0000${scope.componentId}`, {
      scope,
      binding: {
        component,
        manifestArtifact: { digest: manifestDigests[manifestIndex] },
      },
    });
  }
  const readinessPayload = readinessReceipt();
  Object.assign(readinessPayload, {
    sourceRevision: `${primaryManifest.sourceId}@${primaryManifest.revision}`,
    componentId: primaryComponent.componentId,
    projectionId: primaryComponent.projection.projectionId,
    sourceManifestDigest: manifestDigests[0],
    pilotProjectionDigest: primaryComponent.projection.membershipDigest,
    discoveryPlanArtifactDigest: planDigest,
    discoveryPlanContentDigest: sha256(stable(plan)),
    sourceAdmissionReceiptDigest: admissionScopes.size === plan.sourceScopes.length
      ? sourceAdmissionReceiptDigest({
        registry: analysis.registry,
        bindings: { scopes: admissionScopes },
        planArtifact: { value: plan, digest: planDigest },
      })
      : digest('8'),
  });
  Object.assign(readinessPayload.pilot, {
    rowsAvailable: admittedRows, rowsVisited: admittedRows,
    strataAvailable: 1, strataVisited: 1,
  });
  Object.assign(readinessPayload.scalePlan, {
    shards: primaryComponent.projection.shardCount,
    maximumRows: trainingRows,
    maximumBytes: primaryComponent.identity.bytes,
    checkpointEveryShards: 1,
  });
  mutateReadiness?.(readinessPayload);
  const readinessText = jsonText(readinessPayload);
  const readinessDigest = sha256(readinessText);
  const decisions = cycle.consolidation.map((item) => item.decision).join(', ') || 'defer';
  let log = [
    '# Nonce Processing-Graph Discovery Log',
    '',
    '## How one discovery cycle works',
    '',
    'This log records aggregate-only bundle evidence.',
    '',
    '## Cycle 000 — fixture baseline',
    '',
    '**Evidence scope.** Repository-owned synthetic structural evidence only.',
    '',
    '**Decision.** Retain the typed research boundary as the comparison baseline.',
    '',
    `## Cycle 001 — portable bundle (\`${cycle.cycleId}\`)`,
    '',
    `**Evidence scope.** Question: \`${plan.question}\` Null hypothesis: \`${plan.nullHypothesis}\` ` +
      `Sources ${plan.sourceRevisions.join(', ')}; projections ${plan.projectionDigests.join(', ')}.`,
    '',
    `**Receipts.** Manifests ${manifestDigests.join(', ')}; plan bytes ${planDigest}; ` +
      `analysis bytes ${analysisDigest}; analysis receipt ${analysis.receiptDigest}; ` +
      `cycle bytes ${cycleDigest}; cycle receipt ${cycle.receiptDigest}; ` +
      `registry ${analysis.registry.digest}; baseline ${plan.baselineGraphDigest}; ` +
      `readiness ${readinessDigest}.`,
    '',
    `**Consolidation decision.** ${decisions}; all candidates remain research-only pending transfer.`,
    '',
    `**Readiness decision.** ${readinessPayload.decision}.`,
    '',
    '## Next review',
    '',
    'Run an independent-source falsification before any implementation.',
    '',
  ].join('\n');
  log = mutateLog?.(log, {
    manifestDigests, planDigest, analysisDigest, analysisReceiptDigest: analysis.receiptDigest,
    cycleDigest, cycleReceiptDigest: cycle.receiptDigest, readinessDigest,
  }) ?? log;

  const manifestPaths = [];
  for (const [index, text] of manifestTexts.entries()) {
    const path = join(directory, `source-manifest-${index}.json`);
    await writeFile(path, text, 'utf8');
    if (index !== omitManifestIndex) manifestPaths.push(path);
  }
  const planPath = join(directory, 'plan.json');
  const analysisPath = join(directory, 'analysis.json');
  const cyclePath = join(directory, 'cycle.json');
  const logPath = join(directory, 'discovery-log.md');
  const readinessPath = join(directory, 'readiness.json');
  await Promise.all([
    writeFile(planPath, planText, 'utf8'),
    writeFile(analysisPath, analysisText, 'utf8'),
    writeFile(cyclePath, cycleText, 'utf8'),
    writeFile(logPath, log, 'utf8'),
    writeFile(readinessPath, readinessText, 'utf8'),
  ]);
  const argumentsList = [
    manifestPaths.join(','), planPath, analysisPath, cyclePath, logPath,
  ];
  if (readiness) argumentsList.push(readinessPath);
  return execute(process.execPath, [
    join(skillRoot, 'scripts', 'validate-discovery-bundle.mjs'), ...argumentsList,
  ]);
}

const runBundle = (options) => runBundleFixture(1, options);
const runMultiBundle = (options) => runBundleFixture(3, options);

test('RL dataset graph discovery skill is portable and routes to executable gates', async () => {
  const skill = await readFile(join(skillRoot, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: rl-dataset-graph-discovery\n/iu);
  assert.match(skill, /validate-source-manifest\.mjs/iu);
  assert.match(skill, /validate-discovery-plan\.mjs/iu);
  assert.match(skill, /audit-large-source-readiness\.mjs/iu);
  assert.match(skill, /validate-discovery-log\.mjs/iu);
  assert.match(skill, /validate-discovery-bundle\.mjs/iu);
  assert.doesNotMatch(skill, /\.\.\/\.\.\/\.\.\/src\//u);
  for (const script of [
    'validate-source-manifest.mjs', 'validate-discovery-plan.mjs', 'validate-discovery-cycle.mjs',
    'audit-large-source-readiness.mjs',
    'validate-discovery-log.mjs', 'validate-discovery-bundle.mjs',
    'source-admission-receipt.mjs', 'discovery-semantics.mjs',
    'analysis-lineage-digests.mjs', 'analysis-lineage-validator.mjs',
    'analysis-replay-validator.mjs', 'bundle-bindings.mjs', 'research-contract.mjs',
    'research-feature-contract.mjs', 'research-hypothesis-replay.mjs',
    'research-strategy-replay.mjs', 'research-work-replay.mjs', 'split-coverage.mjs',
  ]) {
    const source = await readFile(join(skillRoot, 'scripts', script), 'utf8');
    const imports = [...source.matchAll(/from ['"]([^'"]+)['"]/gu)].map((match) => match[1]);
    assert.equal(imports.every((specifier) => specifier.startsWith('node:') || specifier.startsWith('./')), true);
    assert.doesNotMatch(source, /from ['"](?:\.\.\/){2,}/u);
  }
});

test('source manifest gate preserves component rights, split visibility, and projection identity', async () => {
  const manifest = (await createBundleFixture(1)).manifests[0];
  const valid = await runScript('validate-source-manifest.mjs', manifest);
  assert.deepEqual(JSON.parse(valid.stdout), {
    valid: true, format: 'eslm-rl-dataset-source-manifest-v2',
    sourceId: 'nonce-bundle-source-1', components: 1,
  });
  const invalid = structuredClone(manifest);
  invalid.components[0].allowedUses = ['benchmarking'];
  await assert.rejects(() => runScript('validate-source-manifest.mjs', invalid),
    /does not allow processing-graph-discovery/u);
  const mismatched = structuredClone(manifest);
  mismatched.components[0].splits[0].rows -= 1;
  await assert.rejects(() => runScript('validate-source-manifest.mjs', mismatched), /split rows must reconcile/u);

  const duplicateFile = structuredClone(manifest);
  duplicateFile.deliveredFiles.push({
    ...structuredClone(duplicateFile.deliveredFiles[0]), path: 'nonce/duplicate.jsonl',
  });
  await assert.rejects(() => runScript('validate-source-manifest.mjs', duplicateFile),
    /file IDs must be unique/u);

  const unrelatedIdentity = structuredClone(manifest);
  unrelatedIdentity.components[0].identity.sha256 = digest('f');
  await assert.rejects(() => runScript('validate-source-manifest.mjs', unrelatedIdentity),
    /named delivered-file identity/u);

  const noRemovalContract = structuredClone(manifest);
  noRemovalContract.removalObligations = [];
  await assert.rejects(() => runScript('validate-source-manifest.mjs', noRemovalContract),
    /removalObligations must be a bounded unique string array/u);
});

test('large-source admission is recomputed from pilot, streaming, rights, and contamination gates', async () => {
  const valid = await runScript('audit-large-source-readiness.mjs', readinessReceipt());
  assert.deepEqual(JSON.parse(valid.stdout), {
    valid: true, eligibleForScale: true, failures: [], stage: 'large-corpus',
  });
  const invalid = readinessReceipt();
  invalid.streaming.inputStreamResumeTested = false;
  await assert.rejects(() => runScript('audit-large-source-readiness.mjs', invalid),
    /decision contradicts/iu);
});

test('large-source admission accepts only the large-corpus execution stage', async () => {
  const invalid = readinessReceipt();
  invalid.scalePlan.stage = 'sharded-development';
  await assert.rejects(() => runScript('audit-large-source-readiness.mjs', invalid),
    /large-corpus/iu);
});

test('discovery log gate requires contiguous cycles, evidence, decisions, and a next review', async () => {
  const valid = await execute(process.execPath, [
    join(skillRoot, 'scripts', 'validate-discovery-log.mjs'), resolve('processing_graph_discoveries.md'),
  ]);
  assert.equal(JSON.parse(valid.stdout).cycles, 4);
  const markdown = await readFile(resolve('processing_graph_discoveries.md'), 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'eslm-rl-log-'));
  const path = join(directory, 'discovery-log.md');
  await writeFile(path, markdown.replace('## Next review', [
    '## Cycle 004 — empty cycle (`cycle:processing-graph:004-empty`)',
    '',
    '## Next review',
  ].join('\n')), 'utf8');
  await assert.rejects(() => execute(process.execPath, [
    join(skillRoot, 'scripts', 'validate-discovery-log.mjs'), path,
  ]), /Cycle 004 is missing required cycle-local fields/iu);

  const noReceipts = markdown.replace(
    /\*\*Receipts\.\*\*[\s\S]*?\*\*Consolidation decision\.\*\*/u,
    '**Receipts.** None.\n\n**Consolidation decision.**',
  );
  await writeFile(path, noReceipts, 'utf8');
  await assert.rejects(() => execute(process.execPath, [
    join(skillRoot, 'scripts', 'validate-discovery-log.mjs'), path,
  ]), /concrete receipt digest/iu);

  const noDecision = markdown.replace(
    /\*\*Consolidation decision\.\*\*[\s\S]*?(?=\n## Cycle 002)/u,
    '**Consolidation decision.** None.\n',
  );
  await writeFile(path, noDecision, 'utf8');
  await assert.rejects(() => execute(process.execPath, [
    join(skillRoot, 'scripts', 'validate-discovery-log.mjs'), path,
  ]), /substantive consolidation decision/iu);
});

test('bundle gate binds exact manifest, cycle, projection, readiness, and log identities', async () => {
  const valid = await runBundle();
  assert.deepEqual(JSON.parse(valid.stdout), {
    valid: true,
    sourceRevision: 'nonce-bundle-source-1@1.0.0',
    manifests: 1,
    components: 1,
    projections: 1,
    trainingRowsAvailable: 5,
    trainingRowsVisited: 5,
    protectedRowsVisited: 0,
    readinessProvided: true,
    externalLicenseTruth: 'human-primary-source-verification-required',
  });
  const withoutReadiness = await runBundle({ readiness: false });
  assert.equal(JSON.parse(withoutReadiness.stdout).readinessProvided, false);
});

test('bundle gate validates three supplied source manifests and keeps single-manifest compatibility', async () => {
  const valid = await runMultiBundle();
  assert.deepEqual(JSON.parse(valid.stdout), {
    valid: true,
    sourceRevisions: [
      'nonce-bundle-source-1@1.0.0',
      'nonce-bundle-source-2@1.0.0',
      'nonce-bundle-source-3@1.0.0',
    ],
    manifests: 3,
    components: 3,
    projections: 3,
    trainingRowsAvailable: 16,
    trainingRowsVisited: 16,
    protectedRowsVisited: 0,
    readinessProvided: true,
    externalLicenseTruth: 'human-primary-source-verification-required',
  });
});

test('bundle gate rejects a missing manifest for an additional source scope', async () => {
  await assert.rejects(() => runMultiBundle({ omitManifestIndex: 2 }),
    /source revisions must exactly match the supplied source manifests/iu);
});

test('bundle gate rejects duplicate source revision and component identities', async () => {
  await assert.rejects(() => runMultiBundle({
    mutateManifests(manifests) {
      manifests[2].sourceId = manifests[1].sourceId;
      manifests[2].revision = manifests[1].revision;
    },
  }), /source revision identities must be unique/iu);
  await assert.rejects(() => runMultiBundle({
    mutateManifests(manifests) {
      manifests[2].sourceId = manifests[1].sourceId;
      manifests[2].components[0].componentId = manifests[1].components[0].componentId;
    },
  }), /source revision identities must be unique|component scope is duplicated/iu);
});

test('bundle gate rejects cross-source projection drift', async () => {
  await assert.rejects(() => runMultiBundle({
    mutatePlan(plan) {
      plan.sourceScopes[2].projectionDigest = plan.sourceScopes[1].projectionDigest;
      plan.projectionDigests = [...new Set(plan.sourceScopes
        .map((scope) => scope.projectionDigest))].toSorted();
    },
  }), /does not bind one exact manifest component projection|individual validation/iu);
});

test('bundle gate rejects source identity drift', async () => {
  await assert.rejects(() => runBundle({
    mutatePlan(plan) {
      plan.sourceRevisions = ['source:drifted@revision-a1'];
      plan.sourceScopes[0].sourceRevision = 'source:drifted@revision-a1';
    },
  }), /source revisions must exactly match|individual validation/iu);
  await assert.rejects(() => runBundle({
    mutatePlan(plan) {
      plan.sourceScopes[0].componentId = 'component:drifted';
    },
  }), /does not bind one exact manifest component|analysis disagree|individual validation/iu);
  await assert.rejects(() => runBundle({
    mutatePlan(plan) {
      plan.sourceScopes[0].projectionId = 'projection:drifted';
    },
  }), /does not bind one exact manifest component|analysis disagree|individual validation/iu);
  await assert.rejects(() => runBundle({
    mutatePlan(plan) {
      plan.sourceScopes[0].splits[0].name = 'train-drifted';
    },
  }), /split scopes must exactly cover|split admission drifts|individual validation/iu);
});

test('bundle gate rejects protected-row leakage', async () => {
  await assert.rejects(() => runBundle({
    mutatePlan(plan) {
      plan.sourceScopes[0].splits[0].rowsAdmitted = 1;
    },
  }), /outside reviewed training visibility|split admission drifts/iu);

  await assert.rejects(() => runBundle({
    mutateAnalysis(analysis) {
      const protectedRow = analysis.splitCoverage.find((row) => row.visibility === 'protected');
      protectedRow.rowsReceived = 1;
      protectedRow.rowsSelected = 1;
      protectedRow.rowsAnalyzed = 1;
    },
  }), /split coverage|canonical visible split|individual validation/iu);
});

test('bundle gate rejects readiness scale mismatch', async () => {
  await assert.rejects(() => runBundle({
    mutateReadiness(readiness) {
      readiness.scalePlan.maximumRows += 1;
    },
  }), /does not bind the exact manifest, plan, projection, or scale scope/iu);
  await assert.rejects(() => runBundle({
    mutateReadiness(readiness) {
      readiness.componentId = 'component:drifted';
    },
  }), /readiness must resolve to exactly one supplied plan component/iu);
});

test('bundle gate rejects coherently re-signed membership and evidence forgery', async () => {
  await assert.rejects(() => runBundle({
    mutateAnalysis(analysis) {
      const oldRecord = analysis.inputMembership[0].members[0].recordDigest;
      const newRecord = digest('9');
      analysis.inputMembership[0].members[0].recordDigest = newRecord;
      analysis.inputMembership[0].members.sort((left, right) =>
        left.recordDigest.localeCompare(right.recordDigest));
      analysis.inputMembership[0].observedMembershipDigest = researchProjectionMembershipDigest(
        analysis.inputMembership[0].projectionId,
        analysis.inputMembership[0].members.map((item) => item.recordDigest),
        analysis.inputMembership[0].rawRows,
      );
      const entry = analysis.evidenceLedger.find((item) => item.recordDigest === oldRecord);
      const oldEvidence = entry.evidenceDigest;
      entry.recordDigest = newRecord;
      entry.evidenceDigest = sha256(stable({
        format: 'eslm-research-evidence-reference-v1',
        sourceId: entry.sourceId,
        revision: entry.revision,
        componentId: entry.componentId,
        projectionDigest: entry.projectionDigest,
        recordDigest: entry.recordDigest,
      }));
      analysis.evidenceLedger.sort((left, right) =>
        left.evidenceDigest.localeCompare(right.evidenceDigest));
      for (const hypothesis of analysis.hypotheses) {
        hypothesis.evidence.evidenceDigests = hypothesis.evidence.evidenceDigests
          .map((value) => value === oldEvidence ? entry.evidenceDigest : value).toSorted();
        for (const vote of hypothesis.votes) {
          vote.evidence.evidenceDigests = vote.evidence.evidenceDigests
            .map((value) => value === oldEvidence ? entry.evidenceDigest : value).toSorted();
        }
      }
    },
  }), /registry-bound projection|membership|individual validation/iu);
});

test('bundle gate rejects a missing log receipt reference', async () => {
  await assert.rejects(() => runBundle({
    mutateLog(log, { cycleDigest }) {
      return log.replace(cycleDigest, 'sha256:missing-cycle-receipt');
    },
  }), /missing the cycle byte digest/iu);
});

test('bundle gate rejects plan-analysis registry and cycle-analysis drift', async () => {
  await assert.rejects(() => runBundle({
    mutateAnalysis(analysis) {
      analysis.registry.independenceGroups = ['forged-independence'];
      analysis.registry.independenceGroupCount = 1;
    },
  }), /registry does not reproduce from supplied manifests|individual validation/iu);
  await assert.rejects(() => runBundle({
    mutateCycle(cycle) {
      cycle.analysisBinding.registryDigest = digest('8');
    },
  }), /does not bind its exact analysis receipt|post-analysis cycle/iu);
  await assert.rejects(() => runBundle({
    mutateAnalysis(analysis) {
      analysis.work.eventsVisited += 1;
    },
  }), /work\.eventsVisited does not reproduce technique replay|technique, vote, hypothesis/iu);
});

test('bundle gate rejects dual readiness plan digest drift', async () => {
  await assert.rejects(() => runBundle({
    mutateReadiness(readiness) {
      readiness.discoveryPlanArtifactDigest = digest('8');
    },
  }), /does not bind the exact manifest, plan, projection, or scale scope/iu);
  await assert.rejects(() => runBundle({
    mutateReadiness(readiness) {
      readiness.discoveryPlanContentDigest = digest('8');
    },
  }), /does not bind the exact manifest, plan, projection, or scale scope/iu);
  await assert.rejects(() => runBundle({
    mutateReadiness(readiness) {
      readiness.sourceAdmissionReceiptDigest = digest('8');
    },
  }), /does not bind the exact manifest, plan, projection, or scale scope/iu);
});
