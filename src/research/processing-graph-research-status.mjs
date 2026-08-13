import { resolve } from 'node:path';
import { assertProcessingGraphResearchPublicReceipt } from
  './processing-graph-research-public-receipt.mjs';
import {
  assertProcessingGraphHistoricalStages,
  assertProcessingGraphSourceStatus,
} from './processing-graph-research-history.mjs';
import {
  PROCESSING_GRAPH_LIVE_GOVERNANCE_PROTOCOL,
  assertLiveProcessingGraphResearchGovernance,
  loadLiveProcessingGraphResearchGovernance,
} from './processing-graph-research-live-governance.mjs';
import {
  projectHistoricalAnalysis,
  projectLiveResearchSource,
  strongestExceptionalResearchState,
} from './processing-graph-research-status-projection.mjs';
import {
  currentProcessingGraphBaseline,
  processingGraphResearchImplementationIdentity,
} from './research-implementation-identity.mjs';
import {
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import { assertResearchDiscoveryCycleAgainstPublicReceipt } from
  './research-discovery-cycle-contract.mjs';
import {
  assertProcessingGraphPublicationSnapshot,
  processingGraphPublicationArtifactDigest,
  readProcessingGraphPublicationArtifact,
} from './processing-graph-research-publication.mjs';
import { stableStringify } from '../util.mjs';

export const PROCESSING_GRAPH_RESEARCH_STATUS_PROTOCOL =
  'eslm-processing-graph-research-status-v3';
export { PROCESSING_GRAPH_LIVE_GOVERNANCE_PROTOCOL };
export {
  assertLiveProcessingGraphResearchGovernance,
  loadLiveProcessingGraphResearchGovernance,
};

export const PROCESSING_GRAPH_RESEARCH_ARTIFACTS = Object.freeze({
  pilot: 'docs/results/latest-processing-graph-pilot.json',
  pilotPlan: 'docs/results/latest-processing-graph-pilot-plan.json',
  pilotCycle: 'docs/results/latest-processing-graph-pilot-cycle.json',
  pilotPublication: 'docs/results/latest-processing-graph-pilot-publication.json',
  readiness: 'docs/results/latest-oasst1-large-source-readiness.json',
  largeSource: 'docs/results/latest-oasst1-processing-graph-research.json',
  largeSourcePlan: 'docs/results/latest-oasst1-processing-graph-research-plan.json',
  largeSourceCycle: 'docs/results/latest-oasst1-processing-graph-research-cycle.json',
  combined: 'docs/results/latest-processing-graph-research.json',
  combinedPlan: 'docs/results/latest-processing-graph-research-plan.json',
  combinedCycle: 'docs/results/latest-processing-graph-research-cycle.json',
  sourceStatus: 'docs/results/latest-processing-graph-source-status.json',
  scalePublication: 'docs/results/latest-processing-graph-scale-publication.json',
});

function planIdentity(artifact, plan) {
  return {
    protocol: plan.format,
    planId: plan.planId,
    cycleId: plan.cycleId,
    artifactDigest: processingGraphPublicationArtifactDigest(artifact.bytes),
    contentDigest: researchDiscoveryPlanDigest(plan),
  };
}

function analysisIdentity(artifact, analysis) {
  return {
    protocol: analysis.fullAnalysis.protocol,
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
    artifactDigest: processingGraphPublicationArtifactDigest(artifact.bytes),
    receiptDigest: analysis.fullAnalysis.receiptDigest,
    publicReceiptProtocol: analysis.format,
    publicReceiptDigest: analysis.receiptDigest,
    replayState: analysis.fullAnalysis.replayState,
  };
}

function cycleIdentity(artifact, cycle) {
  return {
    protocol: cycle.format,
    cycleId: cycle.cycleId,
    artifactDigest: processingGraphPublicationArtifactDigest(artifact.bytes),
    receiptDigest: cycle.receiptDigest,
  };
}

function publicationIdentity(path, snapshot) {
  return {
    path,
    protocol: snapshot.format,
    snapshotId: snapshot.snapshotId,
    receiptDigest: snapshot.receiptDigest,
    artifacts: structuredClone(snapshot.artifacts),
  };
}

function planIdentityCurrent(identity, admission) {
  return admission.state === 'admitted'
    && admission.planBinding?.planId === identity.planId
    && admission.planBinding?.cycleId === identity.cycleId
    && admission.planBinding?.planArtifactDigest === identity.artifactDigest
    && admission.planBinding?.planContentDigest === identity.contentDigest;
}

export async function processingGraphResearchStatus({
  root = process.cwd(),
  liveGovernanceLoader = loadLiveProcessingGraphResearchGovernance,
} = {}) {
  const paths = Object.fromEntries(Object.entries(PROCESSING_GRAPH_RESEARCH_ARTIFACTS)
    .map(([key, path]) => [key, resolve(root, path)]));
  const artifacts = Object.fromEntries(await Promise.all(Object.entries(paths)
    .map(async ([key, path]) => [key, await readProcessingGraphPublicationArtifact(path)])));
  const liveGovernance = assertLiveProcessingGraphResearchGovernance(
    await liveGovernanceLoader({ root }),
  );
  const [pilot, largeSource, combined] = [
    artifacts.pilot, artifacts.largeSource, artifacts.combined,
  ].map((artifact) => assertProcessingGraphResearchPublicReceipt(artifact.value, {
    artifactBytes: artifact.bytes,
  }));
  const sourceStatus = assertProcessingGraphSourceStatus(artifacts.sourceStatus.value);
  const readiness = assertProcessingGraphHistoricalStages(
    pilot, artifacts.readiness.value, largeSource, combined, sourceStatus,
  );
  const pilotPlan = assertResearchDiscoveryPlan(artifacts.pilotPlan.value);
  const largeSourcePlan = assertResearchDiscoveryPlan(artifacts.largeSourcePlan.value);
  const combinedPlan = assertResearchDiscoveryPlan(artifacts.combinedPlan.value);
  const pilotCycle = assertResearchDiscoveryCycleAgainstPublicReceipt(
    artifacts.pilotCycle.value, {
      plan: pilotPlan, publicReceipt: pilot, planArtifactBytes: artifacts.pilotPlan.bytes,
    },
  );
  const largeSourceCycle = assertResearchDiscoveryCycleAgainstPublicReceipt(
    artifacts.largeSourceCycle.value, {
      plan: largeSourcePlan, publicReceipt: largeSource,
      planArtifactBytes: artifacts.largeSourcePlan.bytes,
    },
  );
  const combinedCycle = assertResearchDiscoveryCycleAgainstPublicReceipt(
    artifacts.combinedCycle.value, {
      plan: combinedPlan, publicReceipt: combined,
      planArtifactBytes: artifacts.combinedPlan.bytes,
    },
  );
  const pilotSnapshotArtifacts = [
    ['pilot-public-receipt', 'pilot'], ['pilot-cycle', 'pilotCycle'], ['pilot-plan', 'pilotPlan'],
  ].map(([role, key]) => ({ role, path: paths[key], bytes: artifacts[key].bytes }));
  const scaleSnapshotArtifacts = [
    ['combined-public-receipt', 'combined'], ['combined-cycle', 'combinedCycle'],
    ['combined-plan', 'combinedPlan'], ['large-source-public-receipt', 'largeSource'],
    ['large-source-cycle', 'largeSourceCycle'], ['large-source-plan', 'largeSourcePlan'],
    ['large-source-readiness', 'readiness'], ['source-status', 'sourceStatus'],
  ].map(([role, key]) => ({ role, path: paths[key], bytes: artifacts[key].bytes }));
  const pilotPublication = assertProcessingGraphPublicationSnapshot(
    artifacts.pilotPublication.value,
    { snapshotId: 'processing-graph-pilot', artifacts: pilotSnapshotArtifacts },
  );
  const scalePublication = assertProcessingGraphPublicationSnapshot(
    artifacts.scalePublication.value,
    { snapshotId: 'processing-graph-scale', artifacts: scaleSnapshotArtifacts },
  );
  const [liveImplementation, liveBaseline] = await Promise.all([
    processingGraphResearchImplementationIdentity(),
    Promise.resolve(currentProcessingGraphBaseline()),
  ]);
  if (liveGovernance.checkedAgainstBaselineGraphDigest !== liveBaseline.catalogDigest) {
    throw new TypeError('Live processing-graph governance was checked against a stale baseline graph.');
  }
  const liveBySource = new Map(liveGovernance.sources.map((source) => [source.sourceId, source]));
  const statusBySource = new Map(sourceStatus.sources.map((source) => [source.sourceId, source]));
  const pilotRegistryCurrent = pilot.registry.digest
    === liveGovernance.pilotAdmission.registryDigest;
  const largeRegistryCurrent = largeSource.registry.digest
    === liveGovernance.largeSourceAdmission.registryDigest;
  const combinedRegistryCurrent = combined.registry.digest
    === liveGovernance.combinedRegistryDigest;
  const publishedPlanIdentities = {
    pilot: planIdentity(artifacts.pilotPlan, pilotPlan),
    largeSource: planIdentity(artifacts.largeSourcePlan, largeSourcePlan),
    combined: planIdentity(artifacts.combinedPlan, combinedPlan),
  };
  const publishedAnalysisIdentities = {
    pilot: analysisIdentity(artifacts.pilot, pilot),
    largeSource: analysisIdentity(artifacts.largeSource, largeSource),
    combined: analysisIdentity(artifacts.combined, combined),
  };
  const publishedCycleIdentities = {
    pilot: cycleIdentity(artifacts.pilotCycle, pilotCycle),
    largeSource: cycleIdentity(artifacts.largeSourceCycle, largeSourceCycle),
    combined: cycleIdentity(artifacts.combinedCycle, combinedCycle),
  };
  const planCurrent = {
    pilot: planIdentityCurrent(publishedPlanIdentities.pilot,
      liveGovernance.pilotAdmission),
    largeSource: planIdentityCurrent(publishedPlanIdentities.largeSource,
      liveGovernance.largeSourceAdmission),
    combined: planIdentityCurrent(publishedPlanIdentities.combined,
      liveGovernance.combinedAdmission),
  };
  const implementationCurrent = {
    pilot: stableStringify(pilot.implementationIdentity) === stableStringify(liveImplementation),
    largeSource: stableStringify(largeSource.implementationIdentity)
      === stableStringify(liveImplementation),
    combined: stableStringify(combined.implementationIdentity)
      === stableStringify(liveImplementation),
  };
  const baselineCurrent = {
    pilot: stableStringify(pilot.baselineGraph) === stableStringify(liveBaseline),
    readiness: readiness.bindings.baselineGraphDigest === liveBaseline.catalogDigest,
    largeSource: stableStringify(largeSource.baselineGraph) === stableStringify(liveBaseline),
    combined: stableStringify(combined.baselineGraph) === stableStringify(liveBaseline),
  };
  const sources = liveGovernance.sources.map((live) => projectLiveResearchSource({
    live,
    statusRow: statusBySource.get(live.sourceId),
    dedicatedAnalysis: statusBySource.get(live.sourceId)?.state === 'large-source-analyzed'
      ? largeSource : pilot,
    combinedAnalysis: combined,
    readiness: liveGovernance.readiness,
    storedReadiness: readiness,
    stagedExecution: sourceStatus.stagedExecution,
    dedicatedRegistryCurrent: statusBySource.get(live.sourceId)?.state === 'large-source-analyzed'
      ? largeRegistryCurrent : pilotRegistryCurrent,
    combinedRegistryCurrent,
    dedicatedEvidenceCurrent: statusBySource.get(live.sourceId)?.state === 'large-source-analyzed'
      ? implementationCurrent.largeSource && baselineCurrent.largeSource
        && planCurrent.largeSource
      : implementationCurrent.pilot && baselineCurrent.pilot && planCurrent.pilot,
    combinedEvidenceCurrent: implementationCurrent.combined && baselineCurrent.combined
      && planCurrent.combined,
  }));
  if (liveBySource.size !== sourceStatus.sources.length
      || sources.some((source) => !statusBySource.has(source.sourceId))) {
    throw new TypeError('Live governance and published source receipts cover different sources.');
  }
  const exceptionalState = strongestExceptionalResearchState(sources);
  const combinedStopReason = combined.handoff.blockingReasons[0] ?? null;
  const currentState = exceptionalState ?? (combined.completeness.complete
    ? 'fully-analyzed' : 'blocked');
  return Object.freeze({
    format: PROCESSING_GRAPH_RESEARCH_STATUS_PROTOCOL,
    currentState,
    stage: sourceStatus.stage,
    sources,
    stagedExecution: structuredClone(sourceStatus.stagedExecution),
    crossSourceCheckpoint: {
      stage: 'bounded-cross-source-analysis',
      episodesAvailable: combined.work.episodesAvailable,
      episodesVisited: combined.work.episodesAnalyzed,
      complete: combined.completeness.complete,
      stopReason: combinedStopReason,
      nextAllowedStage: combined.completeness.complete
        ? 'manual-consolidation-and-independent-transfer'
        : 'complete-or-independently-justify-cross-source-frontier',
    },
    publishedEvidence: {
      evidenceClass: 'historical-execution-receipts',
      validationState: exceptionalState ?? 'current',
      implementationCurrent: Object.values(implementationCurrent).every(Boolean),
      implementationCurrentByReceipt: implementationCurrent,
      baselineCurrent: Object.values(baselineCurrent).every(Boolean),
      baselineCurrentByReceipt: baselineCurrent,
      discoveryPlanCurrent: Object.values(planCurrent).every(Boolean),
      discoveryPlanCurrentByReceipt: planCurrent,
      publishedPlanIdentities,
      publishedAnalysisIdentities,
      publishedCycleIdentities,
      publicationSnapshots: {
        pilot: publicationIdentity(
          PROCESSING_GRAPH_RESEARCH_ARTIFACTS.pilotPublication, pilotPublication,
        ),
        scale: publicationIdentity(
          PROCESSING_GRAPH_RESEARCH_ARTIFACTS.scalePublication, scalePublication,
        ),
      },
      replayEvidence: {
        state: 'diagnostic-export-only',
        publishedReplayLedgers: false,
        publicReceiptsBoundToFullAnalysis: true,
      },
      sourceStatusReceipt: PROCESSING_GRAPH_RESEARCH_ARTIFACTS.sourceStatus,
    },
    liveGovernance: {
      evidenceClass: 'current-source-manifests-admission-and-readiness',
      state: exceptionalState ?? 'current',
      pilotAdmission: structuredClone(liveGovernance.pilotAdmission),
      largeSourceAdmission: structuredClone(liveGovernance.largeSourceAdmission),
      combinedAdmission: structuredClone(liveGovernance.combinedAdmission),
      combinedRegistryDigest: liveGovernance.combinedRegistryDigest,
      registryCurrent: {
        pilot: pilotRegistryCurrent,
        largeSource: largeRegistryCurrent,
        combined: combinedRegistryCurrent,
      },
      readiness: structuredClone(liveGovernance.readiness),
    },
    pilot: projectHistoricalAnalysis(pilot),
    readiness: {
      decision: liveGovernance.readiness.state === 'admitted' ? 'admit' : 'block',
      stage: readiness.readiness.scalePlan.stage,
      sourceRevision: readiness.readiness.sourceRevision,
      componentId: readiness.readiness.componentId,
      projectionId: readiness.readiness.projectionId,
      shards: readiness.readiness.scalePlan.shards,
      peakBytes: readiness.readiness.streaming.peakBytes,
      maximumPeakBytes: readiness.readiness.streaming.maximumPeakBytes,
      authority: structuredClone(readiness.authority),
      publishedReceiptDigest: readiness.receiptDigest,
      liveReceiptDigest: liveGovernance.readiness.receiptDigest,
      stopReason: liveGovernance.readiness.stopReason,
    },
    largeSource: projectHistoricalAnalysis(largeSource),
    combined: projectHistoricalAnalysis(combined),
    nextGate: exceptionalState
      ? 'resolve-live-governance-before-research-execution'
      : (combined.completeness.complete
        ? sourceStatus.nextGate : 'complete-or-justify-bounded-cross-source-frontier'),
    authority: 'research-status-only',
    artifacts: structuredClone(PROCESSING_GRAPH_RESEARCH_ARTIFACTS),
  });
}
