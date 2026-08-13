import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  DEFAULT_PROCESSING_GRAPH_PILOT_REPORT,
} from '../src/research/processing-graph-pilot-runner.mjs';
import {
  loadLiveProcessingGraphResearchGovernance,
  processingGraphResearchStatus,
} from '../src/research/processing-graph-research-status.mjs';
import {
  analyzeProcessingGraphResearch,
  createResearchSourceRegistry,
} from '../src/research/processing-graph-research.mjs';
import { sha256, stableStringify } from '../src/util.mjs';
import { currentProcessingGraphBaseline } from '../src/research/research-implementation-identity.mjs';
import {
  createSyntheticProcessingGraphResearchFixture,
} from './fixtures/processing-graph-research-fixture.mjs';
import {
  createProcessingGraphPublicationSnapshot,
  processingGraphPublicationArtifactDigest,
} from '../src/research/processing-graph-research-publication.mjs';
import {
  createProcessingGraphResearchPublicReceipt,
} from '../src/research/processing-graph-research-public-receipt.mjs';
import { researchDiscoveryPlanDigest } from
  '../src/research/research-discovery-plan-contract.mjs';
import {
  RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-contract.mjs';

function subset(fixture, sourceIndexes) {
  const sourceIds = new Set(sourceIndexes.map((index) => fixture.registry.sources[index].sourceId));
  return {
    registry: createResearchSourceRegistry({
      sources: fixture.registry.sources.filter((row) => sourceIds.has(row.sourceId)),
      components: fixture.registry.components.filter((row) => sourceIds.has(row.sourceId)),
    }),
    episodes: fixture.episodes.filter((row) => sourceIds.has(row.source.sourceId)),
  };
}

function statusRow(analysis, sourceId, state) {
  const coverage = analysis.coverage.sources.find((row) => row.sourceId === sourceId);
  const component = analysis.coverage.componentProjections.find((row) => row.sourceId === sourceId);
  const common = {
    sourceId,
    state,
    rawRows: coverage.availableEpisodes,
    projectedEpisodes: coverage.availableEpisodes,
    projectionDigest: component.projectionDigest,
    complete: coverage.complete,
  };
  if (state === 'pilot-analyzed') return common;
  return {
    ...common,
    rawMessages: coverage.availableEpisodes * 4,
    projectedMessages: coverage.availableEpisodes * 3,
    excludedRows: 0,
    projectionManifestDigest: `sha256:${'a'.repeat(64)}`,
    shards: 2,
  };
}

async function writeJson(root, relativePath, value) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function planFor(registry, analysis, id) {
  return {
    format: 'eslm-rl-dataset-discovery-plan-v2',
    planId: `plan:status-${id}`,
    cycleId: `cycle:status-${id}`,
    state: 'approved',
    question: 'Does this exact synthetic projection expose reusable processing responsibilities?',
    nullHypothesis: 'Every observed responsibility is already represented by the current processing graph.',
    sourceRevisions: registry.sources.map((source) =>
      `${source.sourceId}@${source.revision}`).toSorted(),
    projectionDigests: registry.components.map((component) =>
      component.projection.membershipDigest).toSorted(),
    sourceScopes: registry.components.map((component) => ({
      sourceRevision: `${component.sourceId}@${component.revision}`,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      splits: component.visibility.map(({
        split, visibility, rowsDeclared, rowsAdmitted,
      }) => ({ name: split, visibility, rowsDeclared, rowsAdmitted })),
    })),
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisIdentity: {
      analysisId: analysis.analysis.analysisId,
      version: analysis.analysis.version,
      seed: analysis.analysis.seed,
      inputMode: analysis.analysis.inputMode,
      selectionMethod: analysis.analysis.selectionMethod,
    },
    strategyIdentities: Object.keys(analysis.workPolicy.techniqueBudgets).toSorted(),
    workPolicy: structuredClone(analysis.workPolicy),
    authority: {
      analysisAdmission: 'reviewed-training-projections-only',
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
    },
  };
}

function emptyCycle(plan, analysis) {
  return sealResearchDiscoveryCycle({
    format: RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
    cycleId: plan.cycleId,
    state: 'incomplete',
    planBinding: { planId: plan.planId, planDigest: researchDiscoveryPlanDigest(plan) },
    analysisBinding: {
      protocol: analysis.format,
      receiptDigest: analysis.receiptDigest,
      implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
      registryDigest: analysis.registry.digest,
      baselineGraphDigest: analysis.baselineGraph.catalogDigest,
      analysisId: analysis.analysis.analysisId,
      version: analysis.analysis.version,
      seed: analysis.analysis.seed,
    },
    splitAccounting: researchDiscoveryCycleSplitAccounting(analysis),
    review: {
      reviewId: `review:status-${analysis.analysis.analysisId}`,
      reviewAuthority: 'repository-maintainer-review',
      reviewedSpecifications: ['DS028', 'DS029'],
      decisionScope: 'research-consolidation-only',
    },
    hypotheses: [],
    unreviewedAnalysisHypothesisIds: analysis.hypotheses
      .map(({ hypothesisId }) => hypothesisId).toSorted(),
    consolidation: [],
    analysisOmissionReasons: [...new Set(analysis.omissions.map(({ reason }) => reason))]
      .toSorted(),
    authority: {
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
      decisionScope: 'research-consolidation-only',
    },
  });
}

async function writePublicationSnapshot(root, snapshotId, mappings) {
  const artifacts = [];
  for (const [role, relativePath, value] of mappings) {
    const path = join(root, relativePath);
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    artifacts.push({ role, path, bytes });
  }
  const fileName = snapshotId === 'processing-graph-pilot'
    ? 'latest-processing-graph-pilot-publication.json'
    : 'latest-processing-graph-scale-publication.json';
  await writeJson(root, `docs/results/${fileName}`,
    createProcessingGraphPublicationSnapshot({ snapshotId, artifacts }));
  return artifacts;
}

function resignReport(report) {
  delete report.receiptDigest;
  report.receiptDigest = `sha256:${sha256(stableStringify(report))}`;
}

function publicReceipt(analysis, plan) {
  return createProcessingGraphResearchPublicReceipt({
    analysis,
    plan,
    planArtifactBytes: Buffer.from(`${JSON.stringify(plan, null, 2)}\n`),
  });
}

function readinessGate(largeSource) {
  const source = largeSource.coverage.sources[0];
  const component = largeSource.coverage.componentProjections[0];
  const readiness = {
    format: 'eslm-rl-large-source-readiness-v1',
    sourceRevision: `${source.sourceId}@${source.revision}`,
    componentId: component.componentId,
    projectionId: component.projectionId,
    sourceManifestDigest: `sha256:${'1'.repeat(64)}`,
    pilotProjectionDigest: component.projectionDigest,
    discoveryPlanArtifactDigest: `sha256:${'2'.repeat(64)}`,
    discoveryPlanContentDigest: `sha256:${'3'.repeat(64)}`,
    sourceAdmissionReceiptDigest: `sha256:${'4'.repeat(64)}`,
    preflightReceiptDigest: `sha256:${'3'.repeat(64)}`,
    pilot: {
      rowsAvailable: source.availableEpisodes,
      rowsVisited: source.availableEpisodes,
      strataAvailable: 2,
      strataVisited: 2,
      projectionLossRate: 0,
      complete: true,
    },
    streaming: {
      deterministicReplay: true,
      shardEquivalence: true,
      inputStreamResumeTested: true,
      peakBytes: 1_024,
      maximumPeakBytes: 2_048,
    },
    rights: { state: 'approved', removalPlanTested: true },
    contamination: {
      lineageFrozen: true,
      protectedIsolationVerified: true,
      knownOverlaps: [],
    },
    scalePlan: {
      stage: 'large-corpus',
      shards: 2,
      maximumRows: source.availableEpisodes,
      maximumBytes: 4_096,
      maximumPeakBytes: 2_048,
      checkpointEveryShards: 1,
      stopConditions: ['identity-drift'],
    },
    decision: 'admit',
  };
  const gate = {
    format: 'eslm-processing-graph-large-source-readiness-gate-v1',
    readiness,
    bindings: {
      sourceManifestDigest: readiness.sourceManifestDigest,
      discoveryPlanArtifactDigest: readiness.discoveryPlanArtifactDigest,
      discoveryPlanContentDigest: readiness.discoveryPlanContentDigest,
      sourceAdmissionReceiptDigest: readiness.sourceAdmissionReceiptDigest,
      preflightReceiptDigest: readiness.preflightReceiptDigest,
      baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    },
    decision: 'admit',
    failures: [],
    authority: {
      executionAdmission: 'exact-frozen-projection-only',
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
    },
  };
  gate.receiptDigest = `sha256:${sha256(stableStringify(gate))}`;
  return gate;
}

function liveGate(registry, plan, planArtifactDigest, workPolicy) {
  return {
    state: 'admitted', receiptDigest: `sha256:${'8'.repeat(64)}`,
    registryDigest: registry.digest,
    planBinding: {
      planId: plan.planId, cycleId: plan.cycleId,
      planArtifactDigest,
      planContentDigest: researchDiscoveryPlanDigest(plan),
      baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    },
    workPolicy: structuredClone(workPolicy),
    stopReason: null,
  };
}

function liveGovernance(fixture, overrides = {}) {
  const pilotGate = liveGate(
    fixture.pilotRegistry, fixture.pilotPlan, fixture.planDigests.pilot,
    fixture.pilot.workPolicy,
  );
  const largeGate = liveGate(
    fixture.largeRegistry, fixture.largeSourcePlan, fixture.planDigests.largeSource,
    fixture.largeSource.workPolicy,
  );
  const combinedGate = liveGate(
    fixture.combined.registry, fixture.combinedPlan, fixture.planDigests.combined,
    fixture.combined.workPolicy,
  );
  const rowsBySource = new Map(fixture.sourceStatus.sources.map((row) => [row.sourceId, row]));
  const sourceById = new Map(fixture.registry.sources.map((row) => [row.sourceId, row]));
  const componentById = new Map(fixture.registry.components
    .map((row) => [row.sourceId, row]));
  const sources = [...sourceById.keys()].map((sourceId) => {
    const source = sourceById.get(sourceId);
    const component = componentById.get(sourceId);
    const status = rowsBySource.get(sourceId);
    return {
      sourceId,
      revision: source.revision,
      manifestDigest: `sha256:${sourceId.endsWith('1') ? '1' : sourceId.endsWith('2') ? '2' : '3'}`.padEnd(71, sourceId.endsWith('1') ? '1' : sourceId.endsWith('2') ? '2' : '3'),
      manifestRegistryState: source.registryState,
      sourceDigest: source.identity.sha256,
      sourceBytes: source.identity.bytes,
      sourceRows: status.rawRows,
      componentId: component.componentId,
      componentKind: component.kind,
      rightsState: component.rights.state,
      splits: [{ name: 'training', visibility: 'training-visible', rows: status.rawRows }],
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      shardCount: status.state === 'large-source-analyzed' ? status.shards : 1,
      shardFormat: component.projection.shardFormat,
      acquisition: {
        state: 'cached', expectedBytes: source.identity.bytes,
        observedBytes: source.identity.bytes, identityVerified: true, stopReason: null,
      },
      admission: {
        state: 'admitted', receiptDigest: `sha256:${'7'.repeat(64)}`,
        projectedRows: status.projectedEpisodes,
        projectionDigest: component.projection.membershipDigest,
        contentMembershipDigest: component.projection.contentMembershipDigest,
        shardCount: status.state === 'large-source-analyzed' ? status.shards : 1,
        discoveryPlanArtifactDigest: status.state === 'large-source-analyzed'
          ? largeGate.planBinding.planArtifactDigest : pilotGate.planBinding.planArtifactDigest,
        discoveryPlanContentDigest: status.state === 'large-source-analyzed'
          ? largeGate.planBinding.planContentDigest : pilotGate.planBinding.planContentDigest,
        stopReason: null,
      },
    };
  }).toSorted((left, right) => left.sourceId.localeCompare(right.sourceId));
  return {
    format: 'eslm-processing-graph-live-governance-v1',
    checkedAgainstBaselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    sources,
    pilotAdmission: pilotGate,
    largeSourceAdmission: largeGate,
    combinedAdmission: combinedGate,
    combinedRegistryDigest: fixture.combined.registry.digest,
    readiness: {
      state: 'admitted', receiptDigest: fixture.readiness.receiptDigest,
      bindings: structuredClone(fixture.readiness.bindings),
      stopReason: null, stage: 'large-corpus',
    },
    ...overrides,
  };
}

async function createStatusFixture() {
  const root = await mkdtemp(join(tmpdir(), 'eslm-processing-graph-status-'));
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'status-nonce' });
  const pilotInput = subset(fixture, [0, 1]);
  const largeInput = subset(fixture, [2]);
  const [pilot, largeSource, combined] = await Promise.all([
    analyzeProcessingGraphResearch({
      ...pilotInput,
      analysisId: 'helpsteer2-gsm8k-small-pilot',
      version: '1.0.0',
      seed: 'status-pilot-v1',
      workPolicy: { progressionStage: 'pilot' },
    }),
    analyzeProcessingGraphResearch({
      ...largeInput,
      analysisId: 'oasst1-complete-source-analysis',
      version: '1.0.0',
      seed: 'status-large-v1',
      workPolicy: { progressionStage: 'scale' },
    }),
    analyzeProcessingGraphResearch({
      registry: fixture.registry,
      episodes: fixture.episodes,
      analysisId: 'three-source-processing-graph-analysis',
      version: '1.0.0',
      seed: 'status-combined-v1',
      workPolicy: { progressionStage: 'scale', limits: { maxEpisodes: 8 } },
    }),
  ]);
  const pilotRows = pilot.coverage.sources.map((row) => statusRow(pilot, row.sourceId, 'pilot-analyzed'));
  const largeRows = largeSource.coverage.sources
    .map((row) => statusRow(largeSource, row.sourceId, 'large-source-analyzed'));
  const readiness = readinessGate(largeSource);
  const pilotPlan = planFor(pilotInput.registry, pilot, 'pilot');
  const largeSourcePlan = planFor(largeInput.registry, largeSource, 'large-source');
  const combinedPlan = planFor(fixture.registry, combined, 'combined');
  const pilotCycle = emptyCycle(pilotPlan, pilot);
  const largeSourceCycle = emptyCycle(largeSourcePlan, largeSource);
  const combinedCycle = emptyCycle(combinedPlan, combined);
  const pilotPublicReceipt = publicReceipt(pilot, pilotPlan);
  const largeSourcePublicReceipt = publicReceipt(largeSource, largeSourcePlan);
  const combinedPublicReceipt = publicReceipt(combined, combinedPlan);
  const sourceStatus = {
    format: 'eslm-processing-graph-scale-status-v1',
    stage: 'complete-large-source-bounded-cross-source-analysis',
    sources: [...pilotRows, ...largeRows],
    stagedExecution: {
      diagnosticShards: 1,
      diagnosticEpisodes: 1,
      diagnosticComplete: false,
      diagnosticOmissions: [{
        scope: 'input', reason: 'projection-membership-incomplete',
        count: largeSource.work.episodesAvailable - 1,
      }],
      fullShards: 2,
      fullLargeSourceEpisodes: largeSource.work.episodesAnalyzed,
      fullLargeSourceComplete: true,
      crossSourceEpisodesAvailable: combined.work.episodesAvailable,
      crossSourceEpisodesAnalyzed: combined.work.episodesAnalyzed,
      crossSourceComplete: false,
    },
    oasst1AnalysisReceiptDigest: largeSource.receiptDigest,
    analysisReceiptDigest: combined.receiptDigest,
    readinessGateReceiptDigest: readiness.receiptDigest,
    hypotheses: combined.hypotheses.length,
    nextGate: 'manual-consolidation-and-independent-transfer',
    authority: 'research-status-only',
  };
  const pilotArtifacts = await writePublicationSnapshot(root, 'processing-graph-pilot', [
    ['pilot-public-receipt', 'docs/results/latest-processing-graph-pilot.json', pilotPublicReceipt],
    ['pilot-cycle', 'docs/results/latest-processing-graph-pilot-cycle.json', pilotCycle],
    ['pilot-plan', 'docs/results/latest-processing-graph-pilot-plan.json', pilotPlan],
  ]);
  const scaleArtifacts = await writePublicationSnapshot(root, 'processing-graph-scale', [
    ['combined-public-receipt', 'docs/results/latest-processing-graph-research.json',
      combinedPublicReceipt],
    ['combined-cycle', 'docs/results/latest-processing-graph-research-cycle.json', combinedCycle],
    ['combined-plan', 'docs/results/latest-processing-graph-research-plan.json', combinedPlan],
    ['large-source-public-receipt', 'docs/results/latest-oasst1-processing-graph-research.json',
      largeSourcePublicReceipt],
    ['large-source-cycle', 'docs/results/latest-oasst1-processing-graph-research-cycle.json', largeSourceCycle],
    ['large-source-plan', 'docs/results/latest-oasst1-processing-graph-research-plan.json', largeSourcePlan],
    ['large-source-readiness', 'docs/results/latest-oasst1-large-source-readiness.json', readiness],
    ['source-status', 'docs/results/latest-processing-graph-source-status.json', sourceStatus],
  ]);
  return {
    root, pilot, readiness, largeSource, combined, sourceStatus, registry: fixture.registry,
    pilotPublicReceipt, largeSourcePublicReceipt, combinedPublicReceipt,
    pilotRegistry: pilotInput.registry, largeRegistry: largeInput.registry,
    pilotPlan, largeSourcePlan, combinedPlan, pilotCycle, largeSourceCycle, combinedCycle,
    planDigests: {
      pilot: processingGraphPublicationArtifactDigest(
        pilotArtifacts.find(({ role }) => role === 'pilot-plan').bytes,
      ),
      largeSource: processingGraphPublicationArtifactDigest(
        scaleArtifacts.find(({ role }) => role === 'large-source-plan').bytes,
      ),
      combined: processingGraphPublicationArtifactDigest(
        scaleArtifacts.find(({ role }) => role === 'combined-plan').bytes,
      ),
    },
  };
}

test('research status requires current pilot, large-source, combined, and source-stage receipts', async (context) => {
  const fixture = await createStatusFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const governance = liveGovernance(fixture);
  const status = await processingGraphResearchStatus({
    root: fixture.root, liveGovernanceLoader: async () => governance,
  });
  assert.equal(status.format, 'eslm-processing-graph-research-status-v3');
  assert.equal(status.currentState, 'blocked');
  assert.equal(status.sources.length, 3);
  assert.equal(status.sources[0].acquisitionState, 'cached');
  assert.equal(status.sources[0].projectionState, 'projected');
  assert.equal(status.sources[0].analysisStage, 'pilot-analyzed');
  assert.equal(status.sources[0].counts.excludedTrainingVisibleRows,
    status.sources[0].counts.trainingVisibleRows - status.sources[0].counts.projectedEpisodes);
  assert.equal(status.sources[0].counts.excludedNonTrainingRows,
    status.sources[0].counts.nonTrainingRows);
  assert.equal(status.sources[0].identities.sourceAdmissionReceiptDigest,
    `sha256:${'7'.repeat(64)}`);
  assert.equal(status.sources[2].checkpoint.diagnostic.complete, false);
  assert.equal(status.sources[2].checkpoint.diagnostic.stopReason,
    'projection-membership-incomplete');
  assert.equal(status.pilot.analysisId, 'helpsteer2-gsm8k-small-pilot');
  assert.equal(status.pilot.sourceCount, 2);
  assert.equal(status.pilot.complete, true);
  assert.equal(status.pilot.eligible, true);
  assert.equal(status.pilot.episodesAnalyzed, fixture.pilot.work.episodesAnalyzed);
  assert.equal(status.pilot.sourceCoverage.length, 2);
  assert.deepEqual(status.pilot.authority, {
    answer: 'none', runtime: 'none', proof: 'none',
    promotion: 'manual-review-required', executablePolicy: false,
  });
  assert.equal(status.largeSource.complete, true);
  assert.equal(status.readiness.decision, 'admit');
  assert.equal(status.readiness.authority.promotion, 'none');
  assert.equal(status.largeSource.eligible, false);
  assert.deepEqual(status.largeSource.blockers, ['insufficient-independent-sources']);
  assert.equal(status.combined.complete, false);
  assert.equal(status.combined.episodesAvailable, 16);
  assert.equal(status.combined.episodesAnalyzed, 8);
  assert.deepEqual(status.combined.blockers, ['max-episodes']);
  assert.equal(status.combined.absenceClaimsAllowed, false);
  assert.equal(status.liveGovernance.registryCurrent.combined, true);
  assert.equal(status.crossSourceCheckpoint.stopReason, 'max-episodes');
  assert.equal(status.publishedEvidence.publishedAnalysisIdentities.pilot.protocol,
    fixture.pilot.format);
  assert.equal(status.publishedEvidence.publishedAnalysisIdentities.pilot.receiptDigest,
    fixture.pilot.receiptDigest);
  assert.equal(status.publishedEvidence.publishedAnalysisIdentities.pilot.publicReceiptDigest,
    fixture.pilotPublicReceipt.receiptDigest);
  assert.deepEqual(status.publishedEvidence.replayEvidence, {
    state: 'diagnostic-export-only',
    publishedReplayLedgers: false,
    publicReceiptsBoundToFullAnalysis: true,
  });
  assert.equal(status.pilot.replayState, 'diagnostic-export-only');
  assert.equal(status.pilot.publicReceiptDigest, fixture.pilotPublicReceipt.receiptDigest);
  assert.equal(status.publishedEvidence.publishedCycleIdentities.combined.protocol,
    RESEARCH_DISCOVERY_CYCLE_PROTOCOL);
  assert.equal(status.publishedEvidence.publishedCycleIdentities.combined.receiptDigest,
    fixture.combinedCycle.receiptDigest);
  assert.equal(status.publishedEvidence.publishedPlanIdentities.pilot.protocol,
    fixture.pilotPlan.format);
  assert.equal(status.publishedEvidence.publicationSnapshots.scale.artifacts.length, 8);
  assert.equal(status.artifacts.pilot, 'docs/results/latest-processing-graph-pilot.json');
  assert.equal(status.authority, 'research-status-only');
});

test('default live governance loader binds current manifests, cache, admissions, and readiness', async () => {
  const governance = await loadLiveProcessingGraphResearchGovernance();
  assert.equal(governance.format, 'eslm-processing-graph-live-governance-v1');
  assert.equal(governance.sources.length, 3);
  assert.ok(governance.sources.every((source) => source.acquisition.state === 'cached'));
  assert.equal(governance.pilotAdmission.state, 'admitted');
  assert.equal(governance.largeSourceAdmission.state, 'admitted');
  assert.equal(governance.combinedAdmission.state, 'admitted');
  assert.match(governance.pilotAdmission.planBinding.planArtifactDigest,
    /^sha256:[0-9a-f]{64}$/u);
  assert.match(governance.largeSourceAdmission.planBinding.planContentDigest,
    /^sha256:[0-9a-f]{64}$/u);
  assert.equal(governance.readiness.state, 'blocked');
  assert.equal(governance.readiness.stage, null);
  assert.equal(governance.readiness.stopReason, 'large-source-readiness-gate-rejected');
  const oasst1 = governance.sources.find((source) => source.sourceId === 'oasst1');
  assert.equal(oasst1.sourceRows, 10_364);
  assert.equal(oasst1.splits.find((split) => split.visibility === 'training-visible').rows, 9_846);
  assert.equal(oasst1.splits.find((split) => split.visibility === 'development-visible').rows, 518);
  assert.equal(oasst1.admission.projectedRows, 2_220);
  assert.equal(oasst1.admission.discoveryPlanArtifactDigest,
    governance.largeSourceAdmission.planBinding.planArtifactDigest);
  assert.equal(oasst1.admission.discoveryPlanContentDigest,
    governance.largeSourceAdmission.planBinding.planContentDigest);
});

test('research status surfaces stale execution identity and rejects source-count drift', async (context) => {
  const fixture = await createStatusFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const governance = liveGovernance(fixture);
  const options = { root: fixture.root, liveGovernanceLoader: async () => governance };
  const stalePlanGovernance = liveGovernance(fixture);
  stalePlanGovernance.pilotAdmission.planBinding.planArtifactDigest = `sha256:${'0'.repeat(64)}`;
  const stalePlanStatus = await processingGraphResearchStatus({
    root: fixture.root, liveGovernanceLoader: async () => stalePlanGovernance,
  });
  assert.equal(stalePlanStatus.currentState, 'superseded');
  assert.equal(stalePlanStatus.publishedEvidence.discoveryPlanCurrent, false);
  assert.equal(stalePlanStatus.publishedEvidence.discoveryPlanCurrentByReceipt.pilot, false);

  const mismatchedStatus = structuredClone(fixture.sourceStatus);
  mismatchedStatus.sources[0].projectedEpisodes += 1;
  mismatchedStatus.sources[0].rawRows += 1;
  await writeJson(fixture.root, 'docs/results/latest-processing-graph-source-status.json', mismatchedStatus);
  await assert.rejects(processingGraphResearchStatus(options),
    /does not reconcile with source status|snapshot does not bind the exact artifact bytes/u);
});

test('research status surfaces withdrawn, blocked, and superseded live governance', async (context) => {
  const fixture = await createStatusFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const withdrawn = liveGovernance(fixture);
  withdrawn.sources[0].manifestRegistryState = 'tombstoned';
  withdrawn.sources[0].rightsState = 'withdrawn';
  withdrawn.sources[0].admission = {
    state: 'blocked', receiptDigest: null, projectedRows: null,
    projectionDigest: null, contentMembershipDigest: null, shardCount: null,
    discoveryPlanArtifactDigest: null, discoveryPlanContentDigest: null,
    stopReason: 'pilot-source-admission-gate-rejected',
  };
  withdrawn.pilotAdmission = {
    state: 'blocked', receiptDigest: null, registryDigest: null,
    planBinding: null, workPolicy: null,
    stopReason: 'pilot-source-admission-gate-rejected',
  };
  withdrawn.combinedAdmission = {
    state: 'blocked', receiptDigest: null, registryDigest: null,
    planBinding: null, workPolicy: null,
    stopReason: 'combined-source-admission-gate-rejected',
  };
  withdrawn.combinedRegistryDigest = null;
  const withdrawnStatus = await processingGraphResearchStatus({
    root: fixture.root, liveGovernanceLoader: async () => withdrawn,
  });
  assert.equal(withdrawnStatus.currentState, 'withdrawn');
  assert.equal(withdrawnStatus.sources[0].state, 'withdrawn');
  assert.equal(withdrawnStatus.sources[0].nextAllowedStage,
    'purge-caches-and-reassess-derived-evidence');
  assert.equal(withdrawnStatus.nextGate, 'resolve-live-governance-before-research-execution');

  const superseded = liveGovernance(fixture);
  superseded.pilotAdmission.registryDigest = `sha256:${'0'.repeat(64)}`;
  superseded.combinedRegistryDigest = `sha256:${'9'.repeat(64)}`;
  const supersededStatus = await processingGraphResearchStatus({
    root: fixture.root, liveGovernanceLoader: async () => superseded,
  });
  assert.equal(supersededStatus.currentState, 'superseded');
  assert.ok(supersededStatus.sources.slice(0, 2)
    .every((source) => source.stopReason === 'published-analysis-registry-superseded'));

  const blocked = liveGovernance(fixture);
  blocked.readiness = {
    state: 'blocked', receiptDigest: null, bindings: null,
    stopReason: 'large-source-readiness-gate-rejected', stage: null,
  };
  const blockedStatus = await processingGraphResearchStatus({
    root: fixture.root, liveGovernanceLoader: async () => blocked,
  });
  assert.equal(blockedStatus.currentState, 'blocked');
  assert.equal(blockedStatus.sources[2].state, 'blocked');
  assert.equal(blockedStatus.readiness.decision, 'block');
});

test('pilot publication target is unique and source status belongs only to scale', () => {
  assert.equal(DEFAULT_PROCESSING_GRAPH_PILOT_REPORT,
    'docs/results/latest-processing-graph-pilot.json');
  assert.notEqual(DEFAULT_PROCESSING_GRAPH_PILOT_REPORT,
    'docs/results/latest-processing-graph-source-status.json');
});

test('status rejects forged published plan, analysis, and cycle bytes', async (context) => {
  const fixture = await createStatusFixture();
  context.after(() => rm(fixture.root, { recursive: true, force: true }));
  const governance = liveGovernance(fixture);
  const options = { root: fixture.root, liveGovernanceLoader: async () => governance };
  const targets = [
    ['docs/results/latest-processing-graph-pilot-plan.json', (value) => {
      value.question = `${value.question} Forged.`;
    }],
    ['docs/results/latest-processing-graph-pilot.json', (value) => {
      value.analysis.seed = 'forged-status-seed';
      resignReport(value);
    }],
    ['docs/results/latest-processing-graph-pilot-cycle.json', (value) => {
      value.splitAccounting[0].rowsVisited -= 1;
      return sealResearchDiscoveryCycle(value);
    }],
  ];
  for (const [relativePath, mutate] of targets) {
    const path = join(fixture.root, relativePath);
    const prior = await readFile(path);
    const value = JSON.parse(prior.toString('utf8'));
    const replacement = mutate(value) ?? value;
    await writeFile(path, `${JSON.stringify(replacement, null, 2)}\n`);
    await assert.rejects(processingGraphResearchStatus(options));
    await writeFile(path, prior);
  }
});
