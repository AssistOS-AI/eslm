import { sha256, stableStringify } from '../util.mjs';
import { PROCESSING_GRAPH_CATALOG_PROTOCOL } from '../processing-graph/index.mjs';
import { PROCESSING_GRAPH_DISCOVERY_TECHNIQUES } from './processing-graph-discovery-strategies.mjs';
import {
  assertResearchAnalysisCoverage,
  researchSplitCoverage,
} from './research-analysis-coverage.mjs';
import {
  assertResearchImplementationIdentity,
  currentProcessingGraphBaseline,
  processingGraphResearchImplementationIdentity,
} from './research-implementation-identity.mjs';
import {
  RESEARCH_EPISODE_FEATURE_PROTOCOL,
  RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST,
  RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS,
} from './research-episode-features.mjs';
import {
  PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL,
  computeProcessingGraphHypothesisScore,
  processingGraphCandidateSignature,
  processingGraphCorrelationGroups,
} from './processing-graph-hypothesis-coordinator.mjs';
import { assertProcessingGraphHypothesis } from './processing-graph-hypothesis-contract.mjs';
import {
  assertMetamorphicAuditLedger,
  assertProcessingGraphProposalLedger,
  reproduceProcessingGraphTechniqueLayer,
  reproduceProcessingGraphHypotheses,
} from './research-proposal-ledger-contract.mjs';
import {
  assertResearchFeatureWorkReplay,
  assertResearchWorkReplay,
  deriveResearchAuthorization,
  deriveResearchOmissions,
} from './research-work-replay-contract.mjs';
import {
  assertExpectedResearchRegistry,
  assertResearchAnalysisLineage,
} from './research-analysis-lineage-contract.mjs';

export const PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL = 'eslm-processing-graph-research-analysis-v6';
export const PROCESSING_GRAPH_RESEARCH_HANDOFF_PROTOCOL = 'eslm-processing-graph-research-handoff-v1';

export function processingGraphResearchVerifierInputs(progressionStage) {
  return [
    PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL,
    'eslm-rl-dataset-discovery-plan-v2',
    'eslm-rl-dataset-discovery-cycle-v3',
    'eslm-rl-dataset-source-manifest-v2',
    'projection-membership-digest', 'rights-receipts', 'split-ledger',
    ...(['pilot', 'scale'].includes(progressionStage)
      ? ['eslm-rl-large-source-readiness-v1'] : []),
  ].toSorted();
}

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>-][a-z0-9]+)*$/u;
const TECHNIQUE_IDS = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map((item) => item.id);
import {
  PROCESSING_GRAPH_RESEARCH_POLICY_PROTOCOL,
  PROCESSING_GRAPH_RESEARCH_PROGRESSION_STAGES,
  assertProcessingGraphResearchWorkPolicy,
  resolveProcessingGraphResearchWorkPolicy,
} from './processing-graph-research-work-policy.mjs';

export {
  PROCESSING_GRAPH_RESEARCH_POLICY_PROTOCOL,
  assertProcessingGraphResearchWorkPolicy,
  resolveProcessingGraphResearchWorkPolicy,
};

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exact(value, fields, path) {
  record(value, path);
  if (stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function positiveCount(value, path, maximum = Number.MAX_SAFE_INTEGER) {
  count(value, path, maximum);
  if (value < 1) throw new TypeError(`${path} must be positive.`);
}

function identifier(value, path, maximum = 256) {
  if (typeof value !== 'string' || value.length > maximum || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) throw new TypeError(`${path} must be a SHA-256 digest.`);
}

function canonicalStrings(value, path, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 256)
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical string array.`);
  }
}

export {
  PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL,
  computeProcessingGraphHypothesisScore,
  processingGraphCandidateSignature,
};

function assertTechniqueReceipts(receipts, policy) {
  if (!Array.isArray(receipts) || receipts.length !== TECHNIQUE_IDS.length) {
    throw new TypeError('Research analysis must report every discovery technique.');
  }
  for (const [index, receipt] of receipts.entries()) {
    const descriptor = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES[index];
    const commonFields = [
      'techniqueId', 'correlationGroup', 'eventsAvailable', 'eventsVisited',
      'proposalsAvailable', 'proposalsRetained', 'complete',
    ];
    const metamorphicFields = [
      'transformProtocol', 'preservingTransformIds', 'controlTransformIds',
      'preservationChecks', 'preservationFailures', 'controlChecks', 'controlFailures',
    ];
    exact(receipt, descriptor.transformProtocol
      ? [...commonFields, ...metamorphicFields] : commonFields, `Technique receipt[${index}]`);
    if (receipt.techniqueId !== TECHNIQUE_IDS[index]) throw new TypeError('Technique receipts are not canonical.');
    identifier(receipt.correlationGroup, 'Technique correlation group');
    for (const field of ['eventsAvailable', 'eventsVisited', 'proposalsAvailable', 'proposalsRetained']) {
      count(receipt[field], `Technique ${field}`);
    }
    const budget = policy.techniqueBudgets[receipt.techniqueId];
    let metamorphicComplete = true;
    if (descriptor.transformProtocol) {
      if (receipt.transformProtocol !== descriptor.transformProtocol
          || stableStringify(receipt.preservingTransformIds)
            !== stableStringify(descriptor.preservingTransformIds)
          || stableStringify(receipt.controlTransformIds)
            !== stableStringify(descriptor.controlTransformIds)) {
        throw new TypeError('Metamorphic receipt transform families are not canonical.');
      }
      for (const field of [
        'preservationChecks', 'preservationFailures', 'controlChecks', 'controlFailures',
      ]) count(receipt[field], `Technique ${field}`);
      if (receipt.preservationFailures > receipt.preservationChecks
          || receipt.controlFailures > receipt.controlChecks) {
        throw new TypeError('Metamorphic receipt failures exceed their checks.');
      }
      metamorphicComplete = receipt.preservationFailures === 0 && receipt.controlFailures === 0;
    }
    if (receipt.eventsVisited > Math.min(receipt.eventsAvailable, budget.maxEvents)
        || receipt.proposalsRetained > Math.min(receipt.proposalsAvailable, budget.maxProposals)
        || receipt.complete !== (receipt.eventsAvailable === receipt.eventsVisited
          && receipt.proposalsAvailable === receipt.proposalsRetained
          && metamorphicComplete)) {
      throw new TypeError('Technique receipt does not reconcile with its work budget.');
    }
  }
}

export function assertProcessingGraphResearchAnalysis(report) {
  exact(report, [
    'format', 'implementationIdentity', 'baselineGraph', 'analysis', 'registry',
    'featureSchema', 'workPolicy', 'authorization', 'inputMembership', 'evidenceLedger',
    'featureLedger',
    'coverage', 'splitCoverage', 'work', 'techniques', 'metamorphicAuditLedger',
    'proposalLedger',
    'correlationGroups', 'hypotheses', 'omissions', 'completeness', 'handoff',
    'authority', 'receiptDigest',
  ], 'Processing-graph research analysis');
  if (report.format !== PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL) {
    throw new TypeError('Processing-graph research analysis protocol is unsupported.');
  }
  assertResearchImplementationIdentity(report.implementationIdentity);
  exact(report.baselineGraph, [
    'format', 'catalogDigest', 'topologyDigest',
  ], 'Research baseline graph');
  if (report.baselineGraph.format !== PROCESSING_GRAPH_CATALOG_PROTOCOL) {
    throw new TypeError('Research baseline graph protocol is unsupported.');
  }
  digest(report.baselineGraph.catalogDigest, 'Research baseline catalog digest');
  digest(report.baselineGraph.topologyDigest, 'Research baseline topology digest');
  exact(report.analysis, [
    'analysisId', 'version', 'seed', 'progressionStage', 'inputMode', 'selectionMethod',
  ], 'Research analysis identity');
  for (const field of ['analysisId', 'version', 'seed']) identifier(report.analysis[field], `Analysis ${field}`);
  if (!PROCESSING_GRAPH_RESEARCH_PROGRESSION_STAGES.includes(report.analysis.progressionStage)
      || report.analysis.inputMode !== 'iterable-or-async-iterable'
      || report.analysis.selectionMethod !== 'bounded-min-hash-v1') {
    throw new TypeError('Research analysis streaming identity is unsupported.');
  }
  exact(report.featureSchema, ['format', 'digest', 'excludedSemanticFields'], 'Research feature schema');
  if (report.featureSchema.format !== RESEARCH_EPISODE_FEATURE_PROTOCOL
      || report.featureSchema.digest !== RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST
      || stableStringify(report.featureSchema.excludedSemanticFields)
        !== stableStringify(RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS)) {
    throw new TypeError('Research feature schema identity is unsupported.');
  }
  canonicalStrings(report.featureSchema.excludedSemanticFields, 'Excluded semantic fields');
  assertProcessingGraphResearchWorkPolicy(report.workPolicy);
  if (report.workPolicy.progressionStage !== report.analysis.progressionStage) {
    throw new TypeError('Research analysis and work-policy progression stages must match.');
  }
  exact(report.authorization, [
    'episodesAllowed', 'episodesDenied', 'receiptsDigest',
  ], 'Research authorization summary');
  count(report.authorization.episodesAllowed, 'Research allowed episodes');
  count(report.authorization.episodesDenied, 'Research denied episodes');
  digest(report.authorization.receiptsDigest, 'Research authorization receipt digest');
  if (report.authorization.episodesDenied !== 0) {
    throw new TypeError('Denied episodes cannot enter an analysis receipt.');
  }
  exact(report.work, [
    'episodesAvailable', 'episodesReceived', 'episodesSelected', 'episodesAnalyzed', 'sourceBytesDeclared',
    'sourceBytesSelected', 'sourceBytesAnalyzed', 'tokensDeclared', 'tokensSelected',
    'tokensAnalyzed', 'actionsDeclared', 'actionsSelected',
    'actionsAnalyzed', 'dependenciesDeclared', 'dependenciesSelected', 'dependenciesAnalyzed',
    'membershipFeatureEvaluations', 'membershipMetamorphicTransformsAttempted',
    'projectionCommittedMetamorphicTransformsApplied',
    'eventsAvailable', 'eventsVisited', 'votesAvailable', 'votesRetained',
    'hypothesesAvailable', 'hypothesesRetained',
  ], 'Research work');
  for (const [field, value] of Object.entries(report.work)) count(value, `Research work.${field}`);
  if (report.work.episodesReceived !== report.authorization.episodesAllowed
      || report.work.episodesReceived > report.work.episodesAvailable
      || report.work.episodesAnalyzed > report.work.episodesSelected
      || report.work.episodesSelected > report.work.episodesReceived
      || report.work.sourceBytesAnalyzed > report.work.sourceBytesSelected
      || report.work.sourceBytesSelected > report.work.sourceBytesDeclared
      || report.work.tokensAnalyzed > report.work.tokensSelected
      || report.work.tokensSelected > report.work.tokensDeclared
      || report.work.actionsAnalyzed > report.work.actionsSelected
      || report.work.actionsSelected > report.work.actionsDeclared
      || report.work.dependenciesAnalyzed > report.work.dependenciesSelected
      || report.work.dependenciesSelected > report.work.dependenciesDeclared
      || report.work.votesRetained > report.work.votesAvailable
      || report.work.hypothesesRetained > report.work.hypothesesAvailable
      || report.work.hypothesesRetained !== report.hypotheses.length) {
    throw new TypeError('Research work counters do not reconcile.');
  }
  const { evidenceLedger, memberships } = assertResearchAnalysisLineage(report);
  if (stableStringify(report.authorization) !== stableStringify(deriveResearchAuthorization(report))) {
    throw new TypeError('Research authorization summary does not reproduce from committed members.');
  }
  assertTechniqueReceipts(report.techniques, report.workPolicy);
  const metamorphicReceipt = report.techniques.find((receipt) =>
    receipt.techniqueId === 'metamorphic-recurrence-v1');
  assertMetamorphicAuditLedger(
    report.metamorphicAuditLedger, evidenceLedger, metamorphicReceipt,
  );
  const reproducedTechniques = reproduceProcessingGraphTechniqueLayer({
    featureLedger: report.featureLedger,
    metamorphicAuditLedger: report.metamorphicAuditLedger,
    evidenceLedger,
    policy: report.workPolicy,
  });
  assertResearchFeatureWorkReplay(report, memberships, evidenceLedger);
  if (stableStringify(report.techniques)
      !== stableStringify(reproducedTechniques.techniqueReceipts)
      || stableStringify(report.metamorphicAuditLedger)
        !== stableStringify(reproducedTechniques.strategyRun.metamorphicAuditLedger)
      || stableStringify(report.proposalLedger)
        !== stableStringify(reproducedTechniques.proposalLedger)) {
    throw new TypeError('Research technique receipts and proposals do not reproduce from committed features.');
  }
  if (report.work.eventsAvailable !== report.techniques
    .reduce((sum, item) => sum + item.eventsAvailable, 0)
      || report.work.eventsVisited !== report.techniques
        .reduce((sum, item) => sum + item.eventsVisited, 0)
      || report.work.votesAvailable !== report.techniques
        .reduce((sum, item) => sum + item.proposalsAvailable, 0)) {
    throw new TypeError('Research event and proposal counters do not reconcile with technique receipts.');
  }
  if (!Array.isArray(report.correlationGroups)
      || stableStringify(report.correlationGroups.map((item) => item.id))
        !== stableStringify(report.correlationGroups.map((item) => item.id).toSorted())) {
    throw new TypeError('Research correlation groups must be canonical.');
  }
  if (stableStringify(report.correlationGroups)
      !== stableStringify(processingGraphCorrelationGroups())) {
    throw new TypeError('Research correlation groups do not reproduce from sealed techniques.');
  }
  for (const item of report.correlationGroups) {
    exact(item, ['id', 'techniqueIds'], 'Research correlation group');
    identifier(item.id, 'Research correlation group id');
    canonicalStrings(item.techniqueIds, 'Research correlation technique IDs');
  }
  if (!Array.isArray(report.hypotheses) || report.hypotheses.length > report.workPolicy.limits.maxHypotheses) {
    throw new TypeError('Research hypotheses must be bounded.');
  }
  const sourceIdentifiers = [...new Set([
    ...report.coverage.sources.flatMap((item) => [
      item.sourceId, item.revision, item.independenceGroup,
    ]),
    ...report.coverage.componentProjections.flatMap((item) => [
      item.sourceId, item.revision, item.componentId, item.projectionId,
    ]),
  ])].toSorted();
  assertProcessingGraphProposalLedger({
    ledger: report.proposalLedger,
    policy: report.workPolicy,
    techniqueReceipts: report.techniques,
    evidenceLedger,
    sourceIdentifiers,
  });
  const reproducedHypotheses = reproduceProcessingGraphHypotheses(
    report.proposalLedger, report.workPolicy, evidenceLedger,
  );
  for (const [index, hypothesis] of report.hypotheses.entries()) {
    assertProcessingGraphHypothesis({
      hypothesis, index, policy: report.workPolicy, sourceIdentifiers, evidenceLedger,
      techniqueIds: TECHNIQUE_IDS,
    });
  }
  if (stableStringify(report.hypotheses) !== stableStringify(reproducedHypotheses.retained)
      || report.work.hypothesesAvailable !== reproducedHypotheses.available.length
      || report.work.hypothesesRetained !== reproducedHypotheses.retained.length) {
    throw new TypeError('Research hypotheses do not reproduce from the retained proposal ledger.');
  }
  if (report.work.votesRetained !== report.hypotheses
    .reduce((sum, hypothesis) => sum + hypothesis.votes.length, 0)) {
    throw new TypeError('Research retained votes do not reconcile with hypothesis votes.');
  }
  if (!Array.isArray(report.omissions)) throw new TypeError('Research omissions must be an array.');
  for (const omission of report.omissions) {
    exact(omission, ['scope', 'reason', 'count', 'frontierDigest'], 'Research omission');
    identifier(omission.scope, 'Research omission scope');
    identifier(omission.reason, 'Research omission reason');
    positiveCount(omission.count, 'Research omission count');
    digest(omission.frontierDigest, 'Research omission frontier digest');
  }
  exact(report.completeness, [
    'complete', 'inputComplete', 'techniquesComplete', 'votesComplete',
    'hypothesesComplete', 'scopeAbsenceClaimsAllowed',
  ], 'Research completeness');
  for (const value of Object.values(report.completeness)) {
    if (typeof value !== 'boolean') throw new TypeError('Research completeness fields must be boolean.');
  }
  const replay = assertResearchWorkReplay(report);
  const expectedOmissions = deriveResearchOmissions({
    report,
    replay,
    strategyRun: reproducedTechniques.strategyRun,
    proposalLedger: reproducedTechniques.proposalLedger,
    hypothesisBuild: reproducedHypotheses,
  });
  if (stableStringify(report.omissions) !== stableStringify(expectedOmissions)) {
    throw new TypeError('Research omissions do not reproduce from deterministic work replay.');
  }
  const expectedInputComplete = replay.authenticated
    && replay.received.length === replay.selected.length
    && replay.selected.length === replay.analyzed.length
    && replay.analyzed.every((member) => member.work.complete);
  const expectedTechniquesComplete = report.techniques.every((receipt) => receipt.complete);
  const expectedVotesComplete = report.proposalLedger.length === report.work.votesAvailable;
  const expectedHypothesesComplete = reproducedHypotheses.retained.length
    === reproducedHypotheses.available.length;
  const recomputedComplete = expectedInputComplete && expectedTechniquesComplete
    && expectedVotesComplete && expectedHypothesesComplete;
  if (report.completeness.inputComplete !== expectedInputComplete
      || report.completeness.techniquesComplete !== expectedTechniquesComplete
      || report.completeness.votesComplete !== expectedVotesComplete
      || report.completeness.hypothesesComplete !== expectedHypothesesComplete) {
    throw new TypeError('Research completeness phases do not reproduce from machine work.');
  }
  if (report.completeness.complete !== recomputedComplete
      || report.completeness.scopeAbsenceClaimsAllowed !== recomputedComplete
      || (report.omissions.length === 0) !== recomputedComplete) {
    throw new TypeError('Research completeness does not reconcile with omissions.');
  }
  if (!replay.authenticated
      && !report.omissions.some((item) => item.reason === 'membership-not-authenticated')) {
    throw new TypeError('Unauthenticated membership must be an explicit analysis omission.');
  }
  assertResearchAnalysisCoverage(report.coverage, {
    registry: report.registry,
    work: report.work,
    inputComplete: report.completeness.inputComplete,
  });
  if (!Array.isArray(report.splitCoverage)
      || stableStringify(report.splitCoverage)
        !== stableStringify(researchSplitCoverage(report.coverage))) {
    throw new TypeError('Research split coverage does not reproduce from component execution work.');
  }
  const coveredIndependenceGroupCount = new Set(report.coverage.sources
    .map((item) => item.independenceGroup)).size;
  if (report.registry.independenceGroupCount !== coveredIndependenceGroupCount) {
    throw new TypeError('Research independence-group count does not reproduce from coverage.');
  }
  if (stableStringify(report.registry.independenceGroups)
      !== stableStringify([...new Set(report.coverage.sources
        .map((item) => item.independenceGroup))].toSorted())) {
    throw new TypeError('Research independence-group identities do not reproduce from coverage.');
  }
  exact(report.handoff, [
    'format', 'currentStage', 'recommendedStage', 'eligible', 'independenceGroupCount',
    'requiredVerifierInputs',
    'blockingReasons', 'shardContract', 'authority',
  ], 'Research handoff');
  if (report.handoff.format !== PROCESSING_GRAPH_RESEARCH_HANDOFF_PROTOCOL
      || report.handoff.currentStage !== report.analysis.progressionStage
      || typeof report.handoff.eligible !== 'boolean'
      || report.handoff.independenceGroupCount !== report.registry.independenceGroupCount
      || report.handoff.authority !== 'recommendation-only') {
    throw new TypeError('Research handoff identity is inconsistent.');
  }
  canonicalStrings(report.handoff.requiredVerifierInputs, 'Research verifier inputs');
  if (stableStringify(report.handoff.requiredVerifierInputs)
      !== stableStringify(processingGraphResearchVerifierInputs(report.analysis.progressionStage))) {
    throw new TypeError('Research verifier inputs do not reproduce from the handoff protocol.');
  }
  canonicalStrings(report.handoff.blockingReasons, 'Research handoff blockers');
  const expectedBlockingReasons = [...new Set([
    ...report.omissions.map((item) => item.reason),
    ...(report.registry.independenceGroupCount < 2 ? ['insufficient-independent-sources'] : []),
    ...(report.hypotheses.length < 1 ? ['no-hypotheses-retained'] : []),
  ])].toSorted();
  if (stableStringify(report.handoff.blockingReasons)
      !== stableStringify(expectedBlockingReasons)) {
    throw new TypeError('Research handoff blockers do not reproduce from evidence and lineage.');
  }
  const expectedEligible = report.completeness.complete
    && report.registry.independenceGroupCount >= 2
    && report.handoff.blockingReasons.length === 0;
  const expectedRecommendation = expectedEligible
    ? { probe: 'pilot', pilot: 'scale', scale: 'manual-review' }[report.analysis.progressionStage]
    : 'hold';
  if (report.handoff.eligible !== expectedEligible
      || report.handoff.recommendedStage !== expectedRecommendation) {
    throw new TypeError('Research handoff recommendation does not reproduce from its blockers.');
  }
  exact(report.handoff.shardContract, [
    'inputMode', 'selection', 'mergeOrder', 'requiresShardMembershipDigest',
  ], 'Research shard contract');
  if (report.handoff.shardContract.inputMode !== 'iterable-or-async-iterable'
      || report.handoff.shardContract.selection !== 'bounded-min-hash-v1'
      || report.handoff.shardContract.mergeOrder !== 'semantic-digest'
      || report.handoff.shardContract.requiresShardMembershipDigest !== true) {
    throw new TypeError('Research shard handoff contract is unsupported.');
  }
  exact(report.authority, ['answer', 'runtime', 'proof', 'promotion', 'executablePolicy'], 'Research authority');
  if (stableStringify(report.authority) !== stableStringify({
    answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
    executablePolicy: false,
  })) throw new TypeError('Research analysis must remain non-authoritative and inert.');
  digest(report.receiptDigest, 'Research analysis receipt digest');
  const unsigned = { ...report };
  delete unsigned.receiptDigest;
  if (report.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Research analysis receipt digest does not match its canonical content.');
  }
  return report;
}

export async function assertCurrentProcessingGraphResearchAnalysis(
  report, { expectedRegistryDigest } = {},
) {
  assertProcessingGraphResearchAnalysis(report);
  assertExpectedResearchRegistry(report, expectedRegistryDigest);
  const [implementationIdentity, baselineGraph] = await Promise.all([
    processingGraphResearchImplementationIdentity(),
    Promise.resolve(currentProcessingGraphBaseline()),
  ]);
  if (stableStringify(report.implementationIdentity) !== stableStringify(implementationIdentity)) {
    throw new TypeError('Processing-graph research analysis has a stale implementation identity.');
  }
  if (stableStringify(report.baselineGraph) !== stableStringify(baselineGraph)) {
    throw new TypeError('Processing-graph research analysis has a stale baseline processing graph.');
  }
  return report;
}
