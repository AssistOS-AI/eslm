import { createHash } from 'node:crypto';
import { PROCESSING_GRAPH_CATALOG_PROTOCOL } from '../processing-graph/index.mjs';
import { sha256, stableStringify } from '../util.mjs';
import {
  PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL,
  assertProcessingGraphResearchAnalysis,
} from './processing-graph-research-analysis-contract.mjs';
import { assertProcessingGraphResearchPublicSummaries } from
  './processing-graph-research-public-summary-validation.mjs';
import {
  assertResearchAnalysisCoverage,
  researchSplitCoverage,
} from './research-analysis-coverage.mjs';
import { researchAnalysisRegistrySnapshot } from './research-analysis-lineage-contract.mjs';
import {
  assertResearchDiscoveryPlan,
  assertResearchDiscoveryPlanRegistry,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import {
  RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS,
  RESEARCH_EPISODE_FEATURE_PROTOCOL,
  RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST,
} from './research-episode-features.mjs';
import { assertResearchImplementationIdentity } from './research-implementation-identity.mjs';
import { assertResearchSourceRegistry } from './research-source-registry.mjs';
import { assertProcessingGraphResearchWorkPolicy } from
  './processing-graph-research-work-policy.mjs';

export const PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL =
  'eslm-processing-graph-research-public-receipt-v1';
export const PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES = 5 * 1_024 * 1_024;

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>@-][a-z0-9]+)*$/u;
const WORK_FIELDS = Object.freeze([
  'episodesAvailable', 'episodesReceived', 'episodesSelected', 'episodesAnalyzed',
  'sourceBytesDeclared', 'sourceBytesSelected', 'sourceBytesAnalyzed',
  'tokensDeclared', 'tokensSelected', 'tokensAnalyzed',
  'actionsDeclared', 'actionsSelected', 'actionsAnalyzed',
  'dependenciesDeclared', 'dependenciesSelected', 'dependenciesAnalyzed',
  'membershipFeatureEvaluations', 'membershipMetamorphicTransformsAttempted',
  'projectionCommittedMetamorphicTransformsApplied',
  'eventsAvailable', 'eventsVisited', 'votesAvailable', 'votesRetained',
  'hypothesesAvailable', 'hypothesesRetained',
]);
const AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
  executablePolicy: false,
});

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 256 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function byteDigest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function baseRegistry(snapshot) {
  return {
    format: snapshot.format,
    sources: snapshot.sources,
    components: snapshot.components,
    digest: snapshot.digest,
  };
}

function assertRegistry(snapshot) {
  const registry = baseRegistry(snapshot);
  assertResearchSourceRegistry(registry);
  if (stableStringify(snapshot) !== stableStringify(researchAnalysisRegistrySnapshot(registry))) {
    throw new TypeError('Public research receipt registry does not reproduce from its frozen sources.');
  }
  return registry;
}

function assertAnalysisIdentity(analysis) {
  exact(analysis, [
    'analysisId', 'version', 'seed', 'progressionStage', 'inputMode', 'selectionMethod',
  ], 'Public research analysis identity');
  for (const field of ['analysisId', 'version', 'seed']) identifier(analysis[field], `Analysis ${field}`);
  if (!['probe', 'pilot', 'scale'].includes(analysis.progressionStage)
      || analysis.inputMode !== 'iterable-or-async-iterable'
      || analysis.selectionMethod !== 'bounded-min-hash-v1') {
    throw new TypeError('Public research analysis streaming identity is unsupported.');
  }
}

function assertWork(work) {
  exact(work, WORK_FIELDS, 'Public research work');
  for (const [field, value] of Object.entries(work)) count(value, `Public research work.${field}`);
  for (const prefix of ['episodes', 'sourceBytes', 'tokens', 'actions', 'dependencies']) {
    if (work[`${prefix}Analyzed`] > work[`${prefix}Selected`]
        || work[`${prefix}Selected`] > work[prefix === 'episodes'
          ? 'episodesReceived' : `${prefix}Declared`]) {
      throw new TypeError(`Public research ${prefix} work phases do not reconcile.`);
    }
  }
  if (work.episodesReceived > work.episodesAvailable
      || work.eventsVisited > work.eventsAvailable
      || work.votesRetained > work.votesAvailable
      || work.hypothesesRetained > work.hypothesesAvailable) {
    throw new TypeError('Public research aggregate work phases do not reconcile.');
  }
}

function serializedBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertBoundedBytes(receipt, artifactBytes) {
  const bytes = artifactBytes === undefined
    ? serializedBytes(receipt)
    : Buffer.isBuffer(artifactBytes) ? artifactBytes : Buffer.from(artifactBytes);
  if (bytes.byteLength > PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES) {
    throw new TypeError('Public research receipt exceeds the 5 MiB publication limit.');
  }
  if (artifactBytes !== undefined) {
    let parsed;
    try { parsed = JSON.parse(bytes.toString('utf8')); } catch {
      throw new TypeError('Public research receipt bytes are not valid JSON.');
    }
    if (stableStringify(parsed) !== stableStringify(receipt)) {
      throw new TypeError('Public research receipt value does not match its artifact bytes.');
    }
  }
}

export function assertProcessingGraphResearchPublicReceipt(receipt, { artifactBytes } = {}) {
  exact(receipt, [
    'format', 'fullAnalysis', 'implementationIdentity', 'baselineGraph', 'analysis',
    'registry', 'planBinding', 'featureSchema', 'workPolicy', 'authorization', 'coverage',
    'splitCoverage', 'work', 'techniques', 'correlationGroups', 'hypotheses', 'omissions',
    'completeness', 'handoff', 'authority', 'receiptDigest',
  ], 'Processing-graph public research receipt');
  if (receipt.format !== PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL) {
    throw new TypeError('Processing-graph public research receipt protocol is unsupported.');
  }
  exact(receipt.fullAnalysis, ['protocol', 'receiptDigest', 'replayState'], 'Full analysis binding');
  if (receipt.fullAnalysis.protocol !== PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL
      || receipt.fullAnalysis.replayState !== 'diagnostic-export-only') {
    throw new TypeError('Public receipt must bind one diagnostic-only full analysis.');
  }
  digest(receipt.fullAnalysis.receiptDigest, 'Full analysis receipt digest');
  assertResearchImplementationIdentity(receipt.implementationIdentity);
  exact(receipt.baselineGraph, ['format', 'catalogDigest', 'topologyDigest'], 'Public baseline graph');
  if (receipt.baselineGraph.format !== PROCESSING_GRAPH_CATALOG_PROTOCOL) {
    throw new TypeError('Public baseline graph protocol is unsupported.');
  }
  digest(receipt.baselineGraph.catalogDigest, 'Public baseline catalog digest');
  digest(receipt.baselineGraph.topologyDigest, 'Public baseline topology digest');
  assertAnalysisIdentity(receipt.analysis);
  const registry = assertRegistry(receipt.registry);
  exact(receipt.planBinding, [
    'protocol', 'planId', 'cycleId', 'artifactDigest', 'contentDigest',
  ], 'Public discovery-plan binding');
  for (const field of ['planId', 'cycleId']) identifier(receipt.planBinding[field], `Plan ${field}`);
  for (const field of ['artifactDigest', 'contentDigest']) digest(receipt.planBinding[field], `Plan ${field}`);
  if (receipt.planBinding.protocol !== 'eslm-rl-dataset-discovery-plan-v2') {
    throw new TypeError('Public discovery-plan binding protocol is unsupported.');
  }
  exact(receipt.featureSchema, ['format', 'digest', 'excludedSemanticFields'], 'Public feature schema');
  if (receipt.featureSchema.format !== RESEARCH_EPISODE_FEATURE_PROTOCOL
      || receipt.featureSchema.digest !== RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST
      || stableStringify(receipt.featureSchema.excludedSemanticFields)
        !== stableStringify(RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS)) {
    throw new TypeError('Public research feature schema identity is unsupported.');
  }
  assertProcessingGraphResearchWorkPolicy(receipt.workPolicy);
  if (receipt.workPolicy.progressionStage !== receipt.analysis.progressionStage) {
    throw new TypeError('Public research work policy and analysis stage disagree.');
  }
  exact(receipt.authorization, [
    'episodesAllowed', 'episodesDenied', 'receiptsDigest',
  ], 'Public research authorization');
  count(receipt.authorization.episodesAllowed, 'Public allowed episodes');
  count(receipt.authorization.episodesDenied, 'Public denied episodes');
  digest(receipt.authorization.receiptsDigest, 'Public authorization digest');
  assertWork(receipt.work);
  if (receipt.authorization.episodesDenied !== 0
      || receipt.authorization.episodesAllowed !== receipt.work.episodesReceived) {
    throw new TypeError('Public research authorization and received work disagree.');
  }
  assertResearchAnalysisCoverage(receipt.coverage, {
    registry: receipt.registry, work: receipt.work,
    inputComplete: receipt.completeness.inputComplete,
  });
  if (stableStringify(receipt.splitCoverage)
      !== stableStringify(researchSplitCoverage(receipt.coverage))) {
    throw new TypeError('Public research split coverage does not reproduce from component coverage.');
  }
  assertProcessingGraphResearchPublicSummaries(receipt, registry);
  if (!Array.isArray(receipt.omissions)) throw new TypeError('Public research omissions must be an array.');
  const omissionKeys = new Set();
  for (const omission of receipt.omissions) {
    exact(omission, ['scope', 'reason', 'count', 'frontierDigest'], 'Public research omission');
    identifier(omission.scope, 'Public omission scope');
    identifier(omission.reason, 'Public omission reason');
    count(omission.count, 'Public omission count', { positive: true });
    digest(omission.frontierDigest, 'Public omission frontier digest');
    const key = stableStringify(omission);
    if (omissionKeys.has(key)) throw new TypeError('Public research omissions must be unique.');
    omissionKeys.add(key);
  }
  exact(receipt.authority, Object.keys(AUTHORITY), 'Public research authority');
  if (stableStringify(receipt.authority) !== stableStringify(AUTHORITY)) {
    throw new TypeError('Public research receipt must remain non-authoritative.');
  }
  digest(receipt.receiptDigest, 'Public research receipt digest');
  const unsigned = { ...receipt };
  delete unsigned.receiptDigest;
  if (receipt.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Public research receipt digest does not reproduce.');
  }
  assertBoundedBytes(receipt, artifactBytes);
  return receipt;
}

function assertPlanAnalysisCompatibility(plan, analysis) {
  assertResearchDiscoveryPlanRegistry(plan, baseRegistry(analysis.registry), {
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
  });
  const analysisIdentity = {
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
    inputMode: analysis.analysis.inputMode,
    selectionMethod: analysis.analysis.selectionMethod,
  };
  if (stableStringify(plan.analysisIdentity) !== stableStringify(analysisIdentity)
      || stableStringify(plan.workPolicy) !== stableStringify(analysis.workPolicy)) {
    throw new TypeError('Discovery plan and public research receipt disagree on analysis identity or work.');
  }
}

export function assertProcessingGraphResearchPublicReceiptForPlan(
  receipt, { plan, planArtifactBytes } = {},
) {
  assertProcessingGraphResearchPublicReceipt(receipt);
  assertResearchDiscoveryPlan(plan);
  const bytes = Buffer.isBuffer(planArtifactBytes)
    ? planArtifactBytes : Buffer.from(planArtifactBytes ?? '');
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch {
    throw new TypeError('Public research receipt requires exact discovery-plan artifact bytes.');
  }
  if (stableStringify(parsed) !== stableStringify(plan)) {
    throw new TypeError('Discovery-plan value does not match its artifact bytes.');
  }
  const expected = {
    protocol: plan.format,
    planId: plan.planId,
    cycleId: plan.cycleId,
    artifactDigest: byteDigest(bytes),
    contentDigest: researchDiscoveryPlanDigest(plan),
  };
  if (stableStringify(receipt.planBinding) !== stableStringify(expected)) {
    throw new TypeError('Public research receipt does not bind its exact discovery plan.');
  }
  assertPlanAnalysisCompatibility(plan, receipt);
  return receipt;
}

export function createProcessingGraphResearchPublicReceipt({
  analysis, plan, planArtifactBytes,
}) {
  assertProcessingGraphResearchAnalysis(analysis);
  return createProcessingGraphResearchPublicReceiptFromValidatedAnalysis({
    analysis, plan, planArtifactBytes,
  });
}

export function createProcessingGraphResearchPublicReceiptFromValidatedAnalysis({
  analysis, plan, planArtifactBytes,
}) {
  assertResearchDiscoveryPlan(plan);
  const bytes = Buffer.isBuffer(planArtifactBytes)
    ? planArtifactBytes : Buffer.from(planArtifactBytes ?? '');
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch {
    throw new TypeError('Public research receipt requires exact discovery-plan artifact bytes.');
  }
  if (stableStringify(parsed) !== stableStringify(plan)) {
    throw new TypeError('Discovery-plan value does not match its artifact bytes.');
  }
  assertPlanAnalysisCompatibility(plan, analysis);
  const unsigned = {
    format: PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL,
    fullAnalysis: {
      protocol: analysis.format,
      receiptDigest: analysis.receiptDigest,
      replayState: 'diagnostic-export-only',
    },
    implementationIdentity: structuredClone(analysis.implementationIdentity),
    baselineGraph: structuredClone(analysis.baselineGraph),
    analysis: structuredClone(analysis.analysis),
    registry: structuredClone(analysis.registry),
    planBinding: {
      protocol: plan.format,
      planId: plan.planId,
      cycleId: plan.cycleId,
      artifactDigest: byteDigest(bytes),
      contentDigest: researchDiscoveryPlanDigest(plan),
    },
    featureSchema: structuredClone(analysis.featureSchema),
    workPolicy: structuredClone(analysis.workPolicy),
    authorization: structuredClone(analysis.authorization),
    coverage: structuredClone(analysis.coverage),
    splitCoverage: structuredClone(analysis.splitCoverage),
    work: structuredClone(analysis.work),
    techniques: structuredClone(analysis.techniques),
    correlationGroups: structuredClone(analysis.correlationGroups),
    hypotheses: structuredClone(analysis.hypotheses),
    omissions: structuredClone(analysis.omissions),
    completeness: structuredClone(analysis.completeness),
    handoff: structuredClone(analysis.handoff),
    authority: structuredClone(analysis.authority),
  };
  const receipt = {
    ...unsigned,
    receiptDigest: `sha256:${sha256(stableStringify(unsigned))}`,
  };
  assertProcessingGraphResearchPublicReceiptForPlan(receipt, { plan, planArtifactBytes: bytes });
  return Object.freeze(receipt);
}

export function serializeProcessingGraphResearchPublicReceipt(receipt) {
  assertProcessingGraphResearchPublicReceipt(receipt);
  const bytes = serializedBytes(receipt);
  assertBoundedBytes(receipt, bytes);
  return bytes;
}

export function processingGraphResearchPublicReceiptAnalysisView(receipt) {
  assertProcessingGraphResearchPublicReceipt(receipt);
  return {
    format: receipt.fullAnalysis.protocol,
    receiptDigest: receipt.fullAnalysis.receiptDigest,
    implementationIdentity: receipt.implementationIdentity,
    baselineGraph: receipt.baselineGraph,
    analysis: receipt.analysis,
    registry: receipt.registry,
    workPolicy: receipt.workPolicy,
    splitCoverage: receipt.splitCoverage,
    hypotheses: receipt.hypotheses,
    omissions: receipt.omissions,
    completeness: receipt.completeness,
  };
}
