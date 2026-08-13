import { sha256, stableStringify } from '../util.mjs';
import { assertProcessingGraphResearchAnalysis } from './processing-graph-research-analysis-contract.mjs';
import {
  assertProcessingGraphResearchPublicReceiptForPlan,
  processingGraphResearchPublicReceiptAnalysisView,
} from './processing-graph-research-public-receipt.mjs';
import {
  assertResearchDiscoveryPlan,
  assertResearchDiscoveryPlanRegistry,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';

export const RESEARCH_DISCOVERY_CYCLE_PROTOCOL = 'eslm-rl-dataset-discovery-cycle-v3';

const AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
  decisionScope: 'research-consolidation-only',
});
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>@-][a-z0-9]+)*$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const TYPES = Object.freeze([
  'processing-node', 'coordination-node', 'authority-gate', 'strategy', 'edge',
  'packet-field', 'nested-circuit',
]);

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 256 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a canonical identifier.`);
  }
}

function boundedText(value, path, minimum = 8) {
  if (typeof value !== 'string' || value.length < minimum || Buffer.byteLength(value, 'utf8') > 2_048) {
    throw new TypeError(`${path} must be bounded meaningful text.`);
  }
}

function canonicalStrings(value, path, { minimum = 0, maximum = 256 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 512)
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical string array.`);
  }
}

function same(left, right) {
  return stableStringify(left) === stableStringify(right);
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

export function researchDiscoveryCycleSplitAccounting(analysis) {
  if (!analysis || !Array.isArray(analysis.splitCoverage)) {
    throw new TypeError('Research analysis split coverage is required for cycle accounting.');
  }
  return analysis.splitCoverage.map((row) => ({
    sourceId: row.sourceId,
    revision: row.revision,
    componentId: row.componentId,
    split: row.split,
    visibility: row.visibility,
    rowsDeclared: row.rowsDeclared,
    rowsAvailable: row.rowsAdmitted,
    rowsVisited: row.rowsReceived,
    rowsSelected: row.rowsSelected,
    rowsAnalyzed: row.rowsAnalyzed,
  }));
}

function assertSplitAccounting(splitAccounting, analysis) {
  if (!Array.isArray(splitAccounting)) {
    throw new TypeError('Research discovery cycle splitAccounting must be an array.');
  }
  for (const [index, row] of splitAccounting.entries()) {
    const path = `Research discovery cycle.splitAccounting[${index}]`;
    exact(row, [
      'sourceId', 'revision', 'componentId', 'split', 'visibility', 'rowsDeclared',
      'rowsAvailable', 'rowsVisited', 'rowsSelected', 'rowsAnalyzed',
    ], path);
    for (const field of ['sourceId', 'revision', 'componentId', 'split']) {
      identifier(row[field], `${path}.${field}`);
    }
    if (!['training-visible', 'development-visible', 'protected'].includes(row.visibility)) {
      throw new TypeError(`${path}.visibility is unsupported.`);
    }
    for (const field of [
      'rowsDeclared', 'rowsAvailable', 'rowsVisited', 'rowsSelected', 'rowsAnalyzed',
    ]) {
      if (!Number.isSafeInteger(row[field]) || row[field] < 0) {
        throw new TypeError(`${path}.${field} must be a bounded non-negative integer.`);
      }
    }
    if (row.rowsAvailable > row.rowsDeclared || row.rowsVisited > row.rowsAvailable
        || row.rowsSelected > row.rowsVisited || row.rowsAnalyzed > row.rowsSelected
        || (row.visibility !== 'training-visible'
          && [row.rowsAvailable, row.rowsVisited, row.rowsSelected, row.rowsAnalyzed]
            .some((value) => value !== 0))) {
      throw new TypeError(`${path} does not describe a valid admitted split frontier.`);
    }
  }
  const expected = researchDiscoveryCycleSplitAccounting(analysis);
  if (!same(splitAccounting, expected)) {
    throw new TypeError('Research discovery cycle split accounting does not reproduce its analysis.');
  }
}

function assertPlanAnalysisCompatibility(plan, analysis) {
  assertResearchDiscoveryPlanRegistry(plan, {
    format: analysis.registry.format,
    sources: analysis.registry.sources,
    components: analysis.registry.components,
    digest: analysis.registry.digest,
  }, { baselineGraphDigest: analysis.baselineGraph.catalogDigest });
  const analysisIdentity = {
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
    inputMode: analysis.analysis.inputMode,
    selectionMethod: analysis.analysis.selectionMethod,
  };
  if (!same(plan.workPolicy, analysis.workPolicy)
      || !same(plan.analysisIdentity, analysisIdentity)) {
    throw new TypeError('Research discovery plan and analysis disagree on identity, graph, or work policy.');
  }
}

function assertHumanHypothesis(hypothesis, path, machineHypotheses, sourceIdentifiers) {
  exact(hypothesis, [
    'hypothesisId', 'type', 'state', 'responsibility', 'containingCircuit',
    'inputPacketTypes', 'outputPacketTypes', 'authority', 'failureKinds',
    'resourceDimensions', 'analysisHypothesisIds',
  ], path);
  identifier(hypothesis.hypothesisId, `${path}.hypothesisId`);
  if (!TYPES.includes(hypothesis.type)) throw new TypeError(`${path}.type is unsupported.`);
  if (!['retained', 'merge-candidate', 'rejected', 'deferred'].includes(hypothesis.state)) {
    throw new TypeError(`${path}.state is unsupported.`);
  }
  boundedText(hypothesis.responsibility, `${path}.responsibility`);
  identifier(hypothesis.containingCircuit, `${path}.containingCircuit`);
  for (const field of [
    'inputPacketTypes', 'outputPacketTypes', 'failureKinds', 'resourceDimensions',
    'analysisHypothesisIds',
  ]) canonicalStrings(hypothesis[field], `${path}.${field}`, { minimum: 1, maximum: 64 });
  if (!['none', 'proposal', 'coordination', 'gate'].includes(hypothesis.authority)) {
    throw new TypeError(`${path}.authority is unsupported.`);
  }
  const expectedAuthority = hypothesis.type === 'coordination-node'
    ? 'coordination' : hypothesis.type === 'authority-gate' ? 'gate' : null;
  if ((expectedAuthority && hypothesis.authority !== expectedAuthority)
      || (!expectedAuthority && !['none', 'proposal'].includes(hypothesis.authority))) {
    throw new TypeError(`${path}.authority contradicts its hypothesis type.`);
  }
  if (hypothesis.analysisHypothesisIds.some((id) => !machineHypotheses.has(id))) {
    throw new TypeError(`${path} cites an absent machine-analysis hypothesis.`);
  }
  if (hypothesis.analysisHypothesisIds.some((id) =>
    machineHypotheses.get(id).candidate.type !== hypothesis.type)) {
    throw new TypeError(`${path} merges machine hypotheses with a different structural type.`);
  }
  const surface = stableStringify(hypothesis).toLowerCase();
  if (/(?:expected|reference)[-_ ]?answer|gold[-_ ]?label|answer[-_ ]?key|dataset[-_ ]?(?:id|name)|source[-_ ]?(?:native|record|row)/u
    .test(surface) || sourceIdentifiers.some((id) => id.length >= 4 && surface.includes(id.toLowerCase()))) {
    throw new TypeError(`${path} contains source- or answer-conditioned architecture.`);
  }
}

function assertResearchDiscoveryCycleAgainstValidatedAnalysis(cycle, { plan, analysis }) {
  exact(cycle, [
    'format', 'cycleId', 'state', 'planBinding', 'analysisBinding', 'review',
    'splitAccounting', 'hypotheses', 'unreviewedAnalysisHypothesisIds', 'consolidation',
    'analysisOmissionReasons', 'authority', 'receiptDigest',
  ], 'Research discovery cycle');
  if (cycle.format !== RESEARCH_DISCOVERY_CYCLE_PROTOCOL
      || !['complete', 'incomplete', 'blocked'].includes(cycle.state)
      || cycle.cycleId !== plan.cycleId) {
    throw new TypeError('Research discovery cycle protocol, state, or plan identity is invalid.');
  }
  exact(cycle.planBinding, ['planId', 'planDigest'], 'Research discovery cycle.planBinding');
  if (cycle.planBinding.planId !== plan.planId
      || cycle.planBinding.planDigest !== researchDiscoveryPlanDigest(plan)) {
    throw new TypeError('Research discovery cycle does not bind its exact pre-analysis plan.');
  }
  exact(cycle.analysisBinding, [
    'protocol', 'receiptDigest', 'implementationAggregateDigest', 'registryDigest',
    'baselineGraphDigest', 'analysisId', 'version', 'seed',
  ], 'Research discovery cycle.analysisBinding');
  if (!same(cycle.analysisBinding, analysisBinding(analysis))) {
    throw new TypeError('Research discovery cycle does not bind its exact analysis receipt.');
  }
  assertSplitAccounting(cycle.splitAccounting, analysis);
  exact(cycle.review, [
    'reviewId', 'reviewAuthority', 'reviewedSpecifications', 'decisionScope',
  ], 'Research discovery cycle.review');
  identifier(cycle.review.reviewId, 'Research discovery cycle.reviewId');
  if (cycle.review.reviewAuthority !== 'repository-maintainer-review'
      || cycle.review.decisionScope !== 'research-consolidation-only') {
    throw new TypeError('Research discovery cycle review authority is unsupported.');
  }
  canonicalStrings(cycle.review.reviewedSpecifications,
    'Research discovery cycle.reviewedSpecifications', { minimum: 2, maximum: 8 });
  if (!cycle.review.reviewedSpecifications.includes('DS028')
      || !cycle.review.reviewedSpecifications.includes('DS029')) {
    throw new TypeError('Research discovery cycle review must include DS028 and DS029.');
  }
  const machineHypotheses = new Map(analysis.hypotheses.map((hypothesis) => [
    hypothesis.hypothesisId,
    hypothesis,
  ]));
  const machineIds = new Set(machineHypotheses.keys());
  const sourceIdentifiers = [
    ...analysis.registry.sources.flatMap((source) => [source.sourceId, source.revision]),
    ...analysis.registry.components.flatMap((component) => [
      component.componentId, component.projection.projectionId,
    ]),
  ];
  if (!Array.isArray(cycle.hypotheses) || cycle.hypotheses.length > 256) {
    throw new TypeError('Research discovery cycle hypotheses must be bounded.');
  }
  const humanIds = new Set();
  const mappedMachineIds = new Set();
  for (const [index, hypothesis] of cycle.hypotheses.entries()) {
    assertHumanHypothesis(hypothesis, `Research discovery cycle.hypotheses[${index}]`,
      machineHypotheses, sourceIdentifiers);
    if (humanIds.has(hypothesis.hypothesisId)) {
      throw new TypeError('Research discovery cycle hypothesis IDs must be unique.');
    }
    humanIds.add(hypothesis.hypothesisId);
    for (const id of hypothesis.analysisHypothesisIds) {
      if (mappedMachineIds.has(id)) {
        throw new TypeError('Machine-analysis hypotheses must map to at most one reviewed hypothesis.');
      }
      mappedMachineIds.add(id);
    }
  }
  canonicalStrings(cycle.unreviewedAnalysisHypothesisIds,
    'Research discovery cycle.unreviewedAnalysisHypothesisIds');
  const accountedMachineIds = [...new Set([
    ...mappedMachineIds, ...cycle.unreviewedAnalysisHypothesisIds,
  ])].toSorted();
  if (cycle.unreviewedAnalysisHypothesisIds.some((id) => mappedMachineIds.has(id))
      || !same(accountedMachineIds, [...machineIds].toSorted())) {
    throw new TypeError('Research discovery cycle must account for every machine-analysis hypothesis exactly once.');
  }
  if (!Array.isArray(cycle.consolidation)
      || cycle.consolidation.length !== cycle.hypotheses.length) {
    throw new TypeError('Research discovery cycle consolidation must decide every reviewed hypothesis.');
  }
  const decided = new Set();
  for (const [index, decision] of cycle.consolidation.entries()) {
    const path = `Research discovery cycle.consolidation[${index}]`;
    exact(decision, ['candidateId', 'decision', 'resultId', 'reason'], path);
    if (!humanIds.has(decision.candidateId) || decided.has(decision.candidateId)) {
      throw new TypeError('Research discovery cycle consolidation references an absent or repeated candidate.');
    }
    decided.add(decision.candidateId);
    if (!['retain', 'merge', 'reject', 'defer'].includes(decision.decision)) {
      throw new TypeError(`${path}.decision is unsupported.`);
    }
    if (decision.resultId !== null) identifier(decision.resultId, `${path}.resultId`);
    const hypothesis = cycle.hypotheses.find((item) => item.hypothesisId === decision.candidateId);
    const expectedDecision = {
      retained: 'retain',
      'merge-candidate': 'merge',
      rejected: 'reject',
      deferred: 'defer',
    }[hypothesis.state];
    const requiresResult = ['retain', 'merge'].includes(decision.decision);
    if (decision.decision !== expectedDecision
        || requiresResult !== (decision.resultId !== null)) {
      throw new TypeError(`${path} contradicts the reviewed hypothesis state or result identity.`);
    }
    boundedText(decision.reason, `${path}.reason`);
  }
  canonicalStrings(cycle.analysisOmissionReasons, 'Research discovery cycle.analysisOmissionReasons');
  const omissionReasons = [...new Set(analysis.omissions.map(({ reason }) => reason))].toSorted();
  const expectedState = analysis.completeness.complete
    && cycle.unreviewedAnalysisHypothesisIds.length === 0 ? 'complete' : 'incomplete';
  if (!same(cycle.analysisOmissionReasons, omissionReasons) || cycle.state !== expectedState) {
    throw new TypeError('Research discovery cycle state or omissions contradict its analysis.');
  }
  exact(cycle.authority, Object.keys(AUTHORITY), 'Research discovery cycle.authority');
  if (!same(cycle.authority, AUTHORITY)) {
    throw new TypeError('Research discovery cycle authority is inconsistent.');
  }
  if (!DIGEST.test(cycle.receiptDigest)) {
    throw new TypeError('Research discovery cycle receipt digest is invalid.');
  }
  const unsigned = { ...cycle };
  delete unsigned.receiptDigest;
  if (cycle.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Research discovery cycle receipt digest does not reproduce.');
  }
  return cycle;
}

export function assertResearchDiscoveryCycle(cycle, { plan, analysis } = {}) {
  assertResearchDiscoveryPlan(plan);
  assertProcessingGraphResearchAnalysis(analysis);
  assertPlanAnalysisCompatibility(plan, analysis);
  return assertResearchDiscoveryCycleAgainstValidatedAnalysis(cycle, { plan, analysis });
}

export function assertResearchDiscoveryCycleAgainstPublicReceipt(
  cycle, { plan, publicReceipt, planArtifactBytes } = {},
) {
  assertResearchDiscoveryPlan(plan);
  assertProcessingGraphResearchPublicReceiptForPlan(publicReceipt, {
    plan, planArtifactBytes,
  });
  const analysis = processingGraphResearchPublicReceiptAnalysisView(publicReceipt);
  assertPlanAnalysisCompatibility(plan, analysis);
  return assertResearchDiscoveryCycleAgainstValidatedAnalysis(cycle, { plan, analysis });
}

export function sealResearchDiscoveryCycle(cycle) {
  const unsigned = structuredClone(cycle);
  delete unsigned.receiptDigest;
  const sealed = { ...unsigned, receiptDigest: `sha256:${sha256(stableStringify(unsigned))}` };
  return Object.freeze(sealed);
}
