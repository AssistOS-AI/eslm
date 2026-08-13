import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createResearchSourceRegistry } from './research-source-registry.mjs';
import { analyzeProcessingGraphResearch } from './processing-graph-research-analyzer.mjs';
import {
  resolveProcessingGraphResearchWorkPolicy,
} from './processing-graph-research-analysis-contract.mjs';
import { publishProcessingGraphResearchSnapshot } from './processing-graph-research-publication.mjs';
import {
  assertProcessingGraphResearchPublicReceipt, assertProcessingGraphResearchPublicReceiptForPlan,
  createProcessingGraphResearchPublicReceiptFromValidatedAnalysis,
  serializeProcessingGraphResearchPublicReceipt,
} from './processing-graph-research-public-receipt.mjs';
import { assertProcessingGraphSourceStatus } from './processing-graph-research-history.mjs';
import { currentProcessingGraphBaseline } from './research-implementation-identity.mjs';
import {
  assertResearchDiscoveryPlan,
  assertResearchDiscoveryPlanRegistry,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import {
  assertResearchDiscoveryCycle, assertResearchDiscoveryCycleAgainstPublicReceipt,
} from './research-discovery-cycle-contract.mjs';
import {
  assertLargeSourceReadinessGate,
  loadLargeSourceReadinessGate,
} from './large-source-readiness-gate.mjs';
import {
  assertPlanBoundResearchSourceAdmissionGate,
  loadResearchSourceAdmissionGate,
} from './research-source-admission-gate.mjs';
import {
  DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS,
  DEFAULT_PROCESSING_GRAPH_PILOT_PATHS,
  loadProcessingGraphPilotAdmission,
} from './processing-graph-pilot-runner.mjs';
import {
  HELPSTEER2_PILOT, helpSteer2PilotEpisodes, inventoryHelpSteer2Pilot,
} from './sources/helpsteer2-pilot.mjs';
import {
  GSM8K_SOCRATIC_PILOT, gsm8kSocraticPilotEpisodes, inventoryGsm8kSocraticPilot,
} from './sources/gsm8k-socratic-pilot.mjs';
import {
  OASST1_LARGE_SOURCE,
  inventoryOasst1LargeSource,
  oasst1ProjectionEpisodes,
  oasst1ProjectionManifestDigest,
  projectOasst1LargeSource,
} from './sources/oasst1-large-source.mjs';
import { loadOasst1ValidationMembership } from './sources/oasst1-validation-membership.mjs';
import { stableStringify } from '../util.mjs';
export const PROCESSING_GRAPH_SCALE_STATUS_PROTOCOL = 'eslm-processing-graph-scale-status-v1';
export const DEFAULT_OASST1_PATH =
  'training/.cache/processing-graph-research/oasst1-fdf72ae0/2023-04-12_oasst_ready.trees.jsonl.gz';
export const DEFAULT_OASST1_PROJECTION_ROOT =
  'training/.cache/processing-graph-research/oasst1-fdf72ae0/projected';
export const DEFAULT_OASST1_VALIDATION_MEMBERSHIP =
  'training/.cache/processing-graph-research/oasst1-fdf72ae0/validation-tree-membership.json';
export const DEFAULT_OASST1_SOURCE_MANIFEST =
  'training/research-sources/oasst1-fdf72ae0/source-manifest.json';
export const DEFAULT_OASST1_DISCOVERY_CYCLE =
  'training/research-sources/oasst1-fdf72ae0/discovery-cycle.json';
export const DEFAULT_OASST1_DISCOVERY_PLAN =
  'training/research-sources/oasst1-fdf72ae0/discovery-plan.json';
export const DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN =
  'training/research-sources/helpsteer2-gsm8k-oasst1-scale/discovery-plan.json';
export const DEFAULT_CROSS_SOURCE_DISCOVERY_CYCLE =
  'training/research-sources/helpsteer2-gsm8k-oasst1-scale/discovery-cycle.json';
export const DEFAULT_OASST1_READINESS =
  'training/research-sources/oasst1-fdf72ae0/large-source-readiness.json';
export const DEFAULT_OASST1_PREFLIGHT =
  'training/research-sources/oasst1-fdf72ae0/large-source-preflight.json';
export const DEFAULT_PROCESSING_GRAPH_RESEARCH_REPORT = 'docs/results/latest-processing-graph-research.json';
export const DEFAULT_OASST1_RESEARCH_REPORT = 'docs/results/latest-oasst1-processing-graph-research.json';
export const DEFAULT_PROCESSING_GRAPH_SCALE_STATUS = 'docs/results/latest-processing-graph-source-status.json';
export const DEFAULT_OASST1_READINESS_REPORT =
  'docs/results/latest-oasst1-large-source-readiness.json';
export const DEFAULT_OASST1_PLAN_REPORT =
  'docs/results/latest-oasst1-processing-graph-research-plan.json';
export const DEFAULT_OASST1_CYCLE_REPORT =
  'docs/results/latest-oasst1-processing-graph-research-cycle.json';
export const DEFAULT_CROSS_SOURCE_PLAN_REPORT =
  'docs/results/latest-processing-graph-research-plan.json';
export const DEFAULT_CROSS_SOURCE_CYCLE_REPORT =
  'docs/results/latest-processing-graph-research-cycle.json';
export const DEFAULT_PROCESSING_GRAPH_SCALE_PUBLICATION =
  'docs/results/latest-processing-graph-scale-publication.json';

function workPolicy(progressionStage, maxEpisodes, maxRowsScanned) {
  return resolveProcessingGraphResearchWorkPolicy({
    progressionStage,
    limits: {
      maxRowsScanned,
      maxEpisodes,
      maxInputBytes: 268_435_456,
      maxTokens: 67_108_864,
      maxActions: 400_000,
      maxDependencies: 400_000,
      maxVotes: 16_384,
      maxHypotheses: 2_048,
      maxEvidenceDigestsPerVote: 14,
    },
    techniqueBudgets: Object.fromEntries([
      'task-frame-induction-v1', 'phase-change-point-v1', 'earliest-error-v1',
      'typed-operation-responsibility-v1', 'partial-order-motif-v1',
      'bounded-subcircuit-motif-v1', 'preference-axis-v1', 'cross-source-recurrence-v1',
      'metamorphic-recurrence-v1',
    ].map((identity) => [identity, { maxEvents: 400_000, maxProposals: 8_192 }])),
  });
}

function projectedEpisodeCount(registry) {
  return registry.components.reduce((sum, component) => sum + component.projection.rows, 0);
}

export async function analyzeProcessingGraphScaleStages({
  largeSourceRegistry,
  diagnosticEpisodes,
  fullLargeSourceEpisodes,
  crossSourceRegistry,
  crossSourceEpisodes,
  crossSourceEpisodeLimit = 8_192,
  largeSourceWorkPolicy,
  crossSourceWorkPolicy,
  largeSourceAnalysisIdentity,
  crossSourceAnalysisIdentity,
}) {
  if (!Number.isSafeInteger(crossSourceEpisodeLimit) || crossSourceEpisodeLimit < 1) {
    throw new TypeError('Cross-source episode limit must be a positive bounded integer.');
  }
  if (!largeSourceAnalysisIdentity || !crossSourceAnalysisIdentity) {
    throw new TypeError('Scale analyses require plan-precommitted analysis identities.');
  }
  const largeSourceEpisodesAvailable = projectedEpisodeCount(largeSourceRegistry);
  const crossSourceEpisodesAvailable = projectedEpisodeCount(crossSourceRegistry);
  const resolvedLargePolicy = largeSourceWorkPolicy
    ?? workPolicy('scale', largeSourceEpisodesAvailable, largeSourceEpisodesAvailable);
  const resolvedCrossPolicy = crossSourceWorkPolicy
    ?? workPolicy('scale', crossSourceEpisodeLimit, crossSourceEpisodesAvailable);
  const diagnostic = await analyzeProcessingGraphResearch({
    registry: largeSourceRegistry,
    episodes: diagnosticEpisodes,
    ...largeSourceAnalysisIdentity,
    workPolicy: resolvedLargePolicy,
  });
  if (diagnostic.completeness.complete || diagnostic.handoff.eligible
      || !diagnostic.omissions.some((item) => item.reason === 'membership-not-authenticated')
      || diagnostic.hypotheses.length !== 0 || diagnostic.evidenceLedger.length !== 0) {
    throw new Error('Partial large-source diagnostic failed to preserve its incomplete membership frontier.');
  }
  const fullLargeSource = await analyzeProcessingGraphResearch({
    registry: largeSourceRegistry,
    episodes: fullLargeSourceEpisodes,
    ...largeSourceAnalysisIdentity,
    workPolicy: resolvedLargePolicy,
  });
  if (!fullLargeSource.completeness.complete
      || fullLargeSource.work.episodesReceived !== largeSourceEpisodesAvailable
      || fullLargeSource.work.episodesAnalyzed !== largeSourceEpisodesAvailable) {
    throw new Error('Complete large-source analysis did not reconcile its projected membership.');
  }
  const crossSource = await analyzeProcessingGraphResearch({
    registry: crossSourceRegistry,
    episodes: crossSourceEpisodes,
    ...crossSourceAnalysisIdentity,
    workPolicy: resolvedCrossPolicy,
  });
  if (crossSourceEpisodesAvailable > crossSourceEpisodeLimit) {
    if (crossSource.completeness.complete
        || crossSource.work.episodesAnalyzed !== crossSourceEpisodeLimit
        || !crossSource.omissions.some((item) => item.reason === 'max-episodes')) {
      throw new Error('Bounded cross-source analysis failed to preserve its explicit episode frontier.');
    }
  } else if (!crossSource.completeness.complete
      || crossSource.work.episodesAnalyzed !== crossSourceEpisodesAvailable) {
    throw new Error('Complete cross-source analysis did not reconcile its projected membership.');
  }
  return { diagnostic, fullLargeSource, crossSource };
}

async function* firstShards(projection, count) {
  const limited = { ...projection, manifest: {
    ...projection.manifest, shards: projection.manifest.shards.slice(0, count),
  } };
  yield* oasst1ProjectionEpisodes(limited);
}

async function* allEpisodes(inventories, paths, projection) {
  yield* helpSteer2PilotEpisodes(inventories.helpSteer2);
  yield* gsm8kSocraticPilotEpisodes(paths.gsm8kSocratic, inventories.gsm8kSocratic);
  yield* oasst1ProjectionEpisodes(projection);
}

function status(inventories, projection, diagnostic, oasst1Analysis, analysis, readinessGate) {
  return {
    format: PROCESSING_GRAPH_SCALE_STATUS_PROTOCOL,
    stage: 'complete-large-source-bounded-cross-source-analysis',
    sources: [
      {
        sourceId: 'helpsteer2', state: 'pilot-analyzed', rawRows: inventories.helpSteer2.rawRows,
        projectedEpisodes: inventories.helpSteer2.projectedRows,
        projectionDigest: inventories.helpSteer2.projectionDigest, complete: true,
      },
      {
        sourceId: 'gsm8k', state: 'pilot-analyzed', rawRows: inventories.gsm8kSocratic.rawRows,
        projectedEpisodes: inventories.gsm8kSocratic.projectedRows,
        projectionDigest: inventories.gsm8kSocratic.projectionDigest, complete: true,
      },
      {
        sourceId: 'oasst1', state: 'large-source-analyzed', rawRows: inventories.oasst1.rawTrees,
        rawMessages: inventories.oasst1.rawMessages, projectedEpisodes: inventories.oasst1.projectedTrees,
        projectedMessages: inventories.oasst1.projectedMessages,
        excludedRows: inventories.oasst1.excludedTrees,
        projectionDigest: inventories.oasst1.projectionDigest,
        projectionManifestDigest: oasst1ProjectionManifestDigest(projection.manifest),
        shards: projection.manifest.shards.length, complete: true,
      },
    ],
    stagedExecution: {
      diagnosticShards: 4,
      diagnosticEpisodes: diagnostic.work.episodesReceived,
      diagnosticComplete: diagnostic.completeness.complete,
      diagnosticOmissions: diagnostic.omissions.map(({ scope, reason, count }) => ({ scope, reason, count })),
      fullShards: projection.manifest.shards.length,
      fullLargeSourceEpisodes: oasst1Analysis.work.episodesAnalyzed,
      fullLargeSourceComplete: oasst1Analysis.completeness.complete,
      crossSourceEpisodesAvailable: analysis.work.episodesAvailable,
      crossSourceEpisodesAnalyzed: analysis.work.episodesAnalyzed,
      crossSourceComplete: analysis.completeness.complete,
    },
    oasst1AnalysisReceiptDigest: oasst1Analysis.receiptDigest,
    analysisReceiptDigest: analysis.receiptDigest,
    readinessGateReceiptDigest: readinessGate.receiptDigest,
    hypotheses: analysis.hypotheses.length,
    nextGate: 'manual-consolidation-and-independent-transfer',
    authority: 'research-status-only',
  };
}

export async function runProcessingGraphScale({
  pilotPaths: pilotPathOverrides = {},
  oasst1Path: oasst1PathOverride = DEFAULT_OASST1_PATH,
  projectionRoot = DEFAULT_OASST1_PROJECTION_ROOT,
  validationMembershipPath = DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
  sourceManifestPath = DEFAULT_OASST1_SOURCE_MANIFEST,
  discoveryPlanPath = DEFAULT_OASST1_DISCOVERY_PLAN,
  crossSourceDiscoveryPlanPath = DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN,
  readinessPath = DEFAULT_OASST1_READINESS,
  preflightPath = DEFAULT_OASST1_PREFLIGHT,
} = {}) {
  const baselineGraphDigest = currentProcessingGraphBaseline().catalogDigest;
  const crossSourcePlan = await readFile(resolve(crossSourceDiscoveryPlanPath), 'utf8')
    .then(JSON.parse);
  assertResearchDiscoveryPlan(crossSourcePlan);
  if (crossSourcePlan.baselineGraphDigest !== baselineGraphDigest) {
    throw new Error('Cross-source discovery plan is stale against the processing graph.');
  }
  const [
    pilotAdmissionGate, oasst1AdmissionGate, crossSourceAdmissionGate, readinessGate,
  ] = await Promise.all([
    loadProcessingGraphPilotAdmission(),
    loadResearchSourceAdmissionGate({
      manifestPaths: [sourceManifestPath], discoveryPlanPath,
      baselineGraphDigest, expectedSources: [OASST1_LARGE_SOURCE],
    }),
    loadResearchSourceAdmissionGate({
      manifestPaths: [
        ...DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests,
        sourceManifestPath,
      ],
      discoveryPlanPath: crossSourceDiscoveryPlanPath,
      baselineGraphDigest,
      expectedSources: [
        HELPSTEER2_PILOT, GSM8K_SOCRATIC_PILOT, OASST1_LARGE_SOURCE,
      ],
    }),
    loadLargeSourceReadinessGate({
      readinessPath, sourceManifestPath, discoveryPlanPath, preflightPath,
      baselineGraphDigest, expected: OASST1_LARGE_SOURCE,
    }),
  ]);
  if (readinessGate.readiness.scalePlan.stage !== 'large-corpus') {
    throw new Error('Processing-graph scale execution requires large-corpus readiness admission.');
  }
  const paths = {
    helpSteer2: resolve(pilotPathOverrides.helpSteer2 ?? DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.helpSteer2),
    gsm8kSocratic: resolve(
      pilotPathOverrides.gsm8kSocratic ?? DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.gsm8kSocratic,
    ),
    oasst1: resolve(oasst1PathOverride),
    validationMembership: resolve(validationMembershipPath),
  };
  const validationMembership = await loadOasst1ValidationMembership(paths.validationMembership);
  const [helpSteer2, gsm8kSocratic, oasst1] = await Promise.all([
    inventoryHelpSteer2Pilot(paths.helpSteer2),
    inventoryGsm8kSocraticPilot(paths.gsm8kSocratic),
    inventoryOasst1LargeSource(paths.oasst1, validationMembership),
  ]);
  const projection = await projectOasst1LargeSource(
    paths.oasst1, oasst1, resolve(projectionRoot), validationMembership,
  );
  const oasstRegistry = oasst1AdmissionGate.registry;
  const registry = createResearchSourceRegistry({
    sources: [...pilotAdmissionGate.registry.sources, ...oasst1AdmissionGate.registry.sources],
    components: [
      ...pilotAdmissionGate.registry.components, ...oasst1AdmissionGate.registry.components,
    ],
  });
  assertResearchDiscoveryPlanRegistry(crossSourcePlan, registry, { baselineGraphDigest });
  if (registry.digest !== crossSourceAdmissionGate.registry.digest
      || stableStringify(registry) !== stableStringify(crossSourceAdmissionGate.registry)) {
    throw new Error('Cross-source admission and composed source registries disagree.');
  }
  const expectedEpisodes = helpSteer2.projectedRows + gsm8kSocratic.projectedRows + oasst1.projectedTrees;
  if (expectedEpisodes !== projectedEpisodeCount(registry)) {
    throw new Error('Cross-source inventory and registry projection counts do not reconcile.');
  }
  const stages = await analyzeProcessingGraphScaleStages({
    largeSourceRegistry: oasstRegistry,
    diagnosticEpisodes: firstShards(projection, 4),
    fullLargeSourceEpisodes: oasst1ProjectionEpisodes(projection),
    crossSourceRegistry: registry,
    crossSourceEpisodes: allEpisodes({ helpSteer2, gsm8kSocratic, oasst1 }, paths, projection),
    largeSourceWorkPolicy: oasst1AdmissionGate.workPolicy,
    crossSourceWorkPolicy: crossSourcePlan.workPolicy,
    crossSourceEpisodeLimit: crossSourcePlan.workPolicy.limits.maxEpisodes,
    largeSourceAnalysisIdentity: oasst1AdmissionGate.planBinding.analysisIdentity,
    crossSourceAnalysisIdentity: crossSourceAdmissionGate.planBinding.analysisIdentity,
  });
  const { diagnostic, fullLargeSource: oasst1Analysis, crossSource: analysis } = stages;
  const inventories = { helpSteer2, gsm8kSocratic, oasst1 };
  return {
    registry, inventories, projection, pilotAdmissionGate, oasst1AdmissionGate,
    crossSourceAdmissionGate,
    crossSourcePlan, readinessGate, diagnostic, oasst1Analysis, analysis, status: status(
    inventories, projection, diagnostic, oasst1Analysis, analysis, readinessGate,
    ),
  };
}

export async function publishProcessingGraphScale(result, {
  analysisPath = DEFAULT_PROCESSING_GRAPH_RESEARCH_REPORT,
  oasst1AnalysisPath = DEFAULT_OASST1_RESEARCH_REPORT,
  statusPath = DEFAULT_PROCESSING_GRAPH_SCALE_STATUS,
  readinessPath = DEFAULT_OASST1_READINESS_REPORT,
  oasst1PlanPath = DEFAULT_OASST1_PLAN_REPORT,
  oasst1CyclePath = DEFAULT_OASST1_CYCLE_REPORT,
  crossSourcePlanPath = DEFAULT_CROSS_SOURCE_PLAN_REPORT,
  crossSourceCyclePath = DEFAULT_CROSS_SOURCE_CYCLE_REPORT,
  publicationPath = DEFAULT_PROCESSING_GRAPH_SCALE_PUBLICATION,
  oasst1DiscoveryPlanPath = DEFAULT_OASST1_DISCOVERY_PLAN,
  oasst1DiscoveryCyclePath = DEFAULT_OASST1_DISCOVERY_CYCLE,
  crossSourceDiscoveryPlanPath = DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN,
  crossSourceDiscoveryCyclePath = DEFAULT_CROSS_SOURCE_DISCOVERY_CYCLE,
  operations,
} = {}) {
  const [oasst1PlanBytes, oasst1CycleBytes, crossPlanBytes, crossCycleBytes] =
    await Promise.all([
      readFile(resolve(oasst1DiscoveryPlanPath)),
      readFile(resolve(oasst1DiscoveryCyclePath)),
      readFile(resolve(crossSourceDiscoveryPlanPath)),
      readFile(resolve(crossSourceDiscoveryCyclePath)),
    ]);
  const oasst1Plan = assertResearchDiscoveryPlan(JSON.parse(oasst1PlanBytes.toString('utf8')));
  const crossPlan = assertResearchDiscoveryPlan(JSON.parse(crossPlanBytes.toString('utf8')));
  const oasst1Analysis = result.oasst1Analysis;
  const crossAnalysis = result.analysis;
  const oasst1Cycle = JSON.parse(oasst1CycleBytes.toString('utf8'));
  const crossCycle = JSON.parse(crossCycleBytes.toString('utf8'));
  assertResearchDiscoveryCycle(oasst1Cycle, { plan: oasst1Plan, analysis: oasst1Analysis });
  assertResearchDiscoveryCycle(crossCycle, { plan: crossPlan, analysis: crossAnalysis });
  const artifactDigest = (value) =>
    `sha256:${createHash('sha256').update(value).digest('hex')}`;
  const assertBindings = ({
    largeReceipt, combinedReceipt, readiness, sourceStatus,
    largePlanBytes, combinedPlanBytes,
  }) => {
    const largeAdmission = assertPlanBoundResearchSourceAdmissionGate(
      result.oasst1AdmissionGate,
      { plan: oasst1Plan, planArtifactDigest: artifactDigest(largePlanBytes),
        baselineGraphDigest: largeReceipt.baselineGraph.catalogDigest },
    );
    const combinedAdmission = assertPlanBoundResearchSourceAdmissionGate(
      result.crossSourceAdmissionGate,
      { plan: crossPlan, planArtifactDigest: artifactDigest(combinedPlanBytes),
        baselineGraphDigest: combinedReceipt.baselineGraph.catalogDigest },
    );
    const largeFullDigest = largeReceipt.fullAnalysis?.receiptDigest ?? largeReceipt.receiptDigest;
    const combinedFullDigest = combinedReceipt.fullAnalysis?.receiptDigest
      ?? combinedReceipt.receiptDigest;
    if (largeAdmission.planBinding.planArtifactDigest !== artifactDigest(largePlanBytes)
      || largeAdmission.planBinding.planContentDigest !== researchDiscoveryPlanDigest(oasst1Plan)
      || combinedAdmission.planBinding.planArtifactDigest !== artifactDigest(combinedPlanBytes)
      || combinedAdmission.planBinding.planContentDigest !== researchDiscoveryPlanDigest(crossPlan)
      || largeAdmission.registry.digest !== largeReceipt.registry.digest
      || combinedAdmission.registry.digest !== combinedReceipt.registry.digest
      || stableStringify(largeAdmission.workPolicy) !== stableStringify(largeReceipt.workPolicy)
      || stableStringify(combinedAdmission.workPolicy) !== stableStringify(combinedReceipt.workPolicy)
      || readiness.bindings.discoveryPlanArtifactDigest
        !== largeAdmission.planBinding.planArtifactDigest
      || readiness.bindings.discoveryPlanContentDigest
        !== largeAdmission.planBinding.planContentDigest
      || readiness.bindings.sourceAdmissionReceiptDigest !== largeAdmission.receiptDigest
      || sourceStatus.oasst1AnalysisReceiptDigest !== largeFullDigest
      || sourceStatus.analysisReceiptDigest !== combinedFullDigest
      || sourceStatus.readinessGateReceiptDigest !== readiness.receiptDigest
      || sourceStatus.hypotheses !== combinedReceipt.hypotheses.length) {
      throw new TypeError('Scale publication inputs do not form admitted plan-analysis-cycle chains.');
    }
  };
  const readiness = assertLargeSourceReadinessGate(result.readinessGate);
  const sourceStatus = assertProcessingGraphSourceStatus(result.status);
  assertBindings({
    largeReceipt: oasst1Analysis,
    combinedReceipt: crossAnalysis,
    readiness,
    sourceStatus,
    largePlanBytes: oasst1PlanBytes,
    combinedPlanBytes: crossPlanBytes,
  });
  const largePublicReceipt = createProcessingGraphResearchPublicReceiptFromValidatedAnalysis({
    analysis: oasst1Analysis, plan: oasst1Plan, planArtifactBytes: oasst1PlanBytes,
  });
  const combinedPublicReceipt = createProcessingGraphResearchPublicReceiptFromValidatedAnalysis({
    analysis: crossAnalysis, plan: crossPlan, planArtifactBytes: crossPlanBytes,
  });
  const artifacts = [
    { role: 'combined-public-receipt', path: resolve(analysisPath),
      bytes: serializeProcessingGraphResearchPublicReceipt(combinedPublicReceipt) },
    { role: 'combined-cycle', path: resolve(crossSourceCyclePath), bytes: crossCycleBytes },
    { role: 'combined-plan', path: resolve(crossSourcePlanPath), bytes: crossPlanBytes },
    { role: 'large-source-public-receipt', path: resolve(oasst1AnalysisPath),
      bytes: serializeProcessingGraphResearchPublicReceipt(largePublicReceipt) },
    { role: 'large-source-cycle', path: resolve(oasst1CyclePath), bytes: oasst1CycleBytes },
    { role: 'large-source-plan', path: resolve(oasst1PlanPath), bytes: oasst1PlanBytes },
    { role: 'large-source-readiness', path: resolve(readinessPath),
      bytes: Buffer.from(`${JSON.stringify(result.readinessGate, null, 2)}\n`) },
    { role: 'source-status', path: resolve(statusPath),
      bytes: Buffer.from(`${JSON.stringify(result.status, null, 2)}\n`) },
  ];
  const validateCompactChain = (staged) => {
    const bytes = new Map(staged.map((item) => [item.role, item.bytes]));
    const stagedLargePlan = assertResearchDiscoveryPlan(
      JSON.parse(bytes.get('large-source-plan').toString('utf8')),
    );
    const stagedCombinedPlan = assertResearchDiscoveryPlan(
      JSON.parse(bytes.get('combined-plan').toString('utf8')),
    );
    const largePublicBytes = bytes.get('large-source-public-receipt');
    const combinedPublicBytes = bytes.get('combined-public-receipt');
    const stagedLargeReceipt = assertProcessingGraphResearchPublicReceipt(
      JSON.parse(largePublicBytes.toString('utf8')), { artifactBytes: largePublicBytes },
    );
    const stagedCombinedReceipt = assertProcessingGraphResearchPublicReceipt(
      JSON.parse(combinedPublicBytes.toString('utf8')), { artifactBytes: combinedPublicBytes },
    );
    assertProcessingGraphResearchPublicReceiptForPlan(stagedLargeReceipt, {
      plan: stagedLargePlan, planArtifactBytes: bytes.get('large-source-plan'),
    });
    assertProcessingGraphResearchPublicReceiptForPlan(stagedCombinedReceipt, {
      plan: stagedCombinedPlan, planArtifactBytes: bytes.get('combined-plan'),
    });
    assertResearchDiscoveryCycleAgainstPublicReceipt(
      JSON.parse(bytes.get('large-source-cycle').toString('utf8')),
      {
        plan: stagedLargePlan, publicReceipt: stagedLargeReceipt,
        planArtifactBytes: bytes.get('large-source-plan'),
      },
    );
    assertResearchDiscoveryCycleAgainstPublicReceipt(
      JSON.parse(bytes.get('combined-cycle').toString('utf8')),
      {
        plan: stagedCombinedPlan, publicReceipt: stagedCombinedReceipt,
        planArtifactBytes: bytes.get('combined-plan'),
      },
    );
    const stagedReadiness = assertLargeSourceReadinessGate(
      JSON.parse(bytes.get('large-source-readiness').toString('utf8')),
    );
    const stagedStatus = assertProcessingGraphSourceStatus(
      JSON.parse(bytes.get('source-status').toString('utf8')),
    );
    assertBindings({
      largeReceipt: stagedLargeReceipt,
      combinedReceipt: stagedCombinedReceipt,
      readiness: stagedReadiness,
      sourceStatus: stagedStatus,
      largePlanBytes: bytes.get('large-source-plan'),
      combinedPlanBytes: bytes.get('combined-plan'),
    });
  };
  validateCompactChain(artifacts);
  return publishProcessingGraphResearchSnapshot({
    snapshotId: 'processing-graph-scale', artifacts,
    manifestPath: resolve(publicationPath), operations, validate: validateCompactChain,
  });
}

export { OASST1_LARGE_SOURCE };
