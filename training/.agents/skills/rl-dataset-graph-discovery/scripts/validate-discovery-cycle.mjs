#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  boundedText, canonicalStrings, digest, enumValue, exactKeys, identifier, output,
  readJsonArgument, sha256, stable,
} from './contract-helpers.mjs';
import {
  assertConsolidationSemantics,
  assertReviewedHypothesisSemantics, DISCOVERY_HYPOTHESIS_TYPES, expectedDiscoveryCycleState,
} from './discovery-semantics.mjs';
import { assertCycleSplitAccounting } from './split-coverage.mjs';
import { assertPortableResearchAnalysis } from './analysis-replay-validator.mjs';
import {
  RESEARCH_ANALYSIS_PROTOCOL, RESEARCH_CYCLE_PROTOCOL, RESEARCH_PLAN_PROTOCOL,
} from './research-contract.mjs';

const [planPath, analysisPath, cyclePath] = process.argv.slice(2);
if (!planPath || !analysisPath || !cyclePath) {
  throw new Error('Usage: validate-discovery-cycle.mjs DISCOVERY_PLAN.json ANALYSIS.json CYCLE.json');
}
const execute = promisify(execFile);
try {
  await execute(process.execPath, [
    fileURLToPath(new URL('./validate-discovery-plan.mjs', import.meta.url)), planPath,
  ], { maxBuffer: 4 * 1_024 * 1_024 });
} catch (error) {
  const detail = error.stderr?.trim() || error.stdout?.trim() || error.message;
  throw new TypeError(`Cycle input plan failed validation: ${detail}`);
}
const [plan, analysis, cycle] = await Promise.all([
  readJsonArgument(planPath), readJsonArgument(analysisPath), readJsonArgument(cyclePath),
]);

if (plan.format !== RESEARCH_PLAN_PROTOCOL || plan.state !== 'approved') {
  throw new TypeError('Cycle input plan must first pass validate-discovery-plan.mjs.');
}
if (analysis.format !== RESEARCH_ANALYSIS_PROTOCOL) {
  throw new TypeError('Cycle analysis must use the current v6 research-analysis protocol.');
}
assertPortableResearchAnalysis(analysis);
if (stable(analysis.analysis) !== stable({
  ...plan.analysisIdentity,
  progressionStage: plan.workPolicy.progressionStage,
})) {
  throw new TypeError('Cycle plan and analysis disagree on precommitted execution identity.');
}
const sourceRevisions = analysis.registry.sources
  .map((source) => `${source.sourceId}@${source.revision}`).toSorted();
const projectionDigests = analysis.registry.components
  .map((component) => component.projection.membershipDigest).toSorted();
if (stable(plan.sourceRevisions) !== stable(sourceRevisions)
    || stable(plan.projectionDigests) !== stable(projectionDigests)
    || plan.sourceScopes.length !== analysis.registry.components.length
    || plan.baselineGraphDigest !== analysis.baselineGraph.catalogDigest
    || stable(plan.workPolicy) !== stable(analysis.workPolicy)) {
  throw new TypeError('Cycle plan scope does not reproduce the analyzed registry and work policy.');
}
for (const component of analysis.registry.components) {
  const sourceRevision = `${component.sourceId}@${component.revision}`;
  const scope = plan.sourceScopes.find((item) => item.sourceRevision === sourceRevision
    && item.componentId === component.componentId);
  const expectedSplits = component.visibility.map(({
    split, visibility, rowsDeclared, rowsAdmitted,
  }) => ({ name: split, visibility, rowsDeclared, rowsAdmitted }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
  if (!scope || scope.projectionId !== component.projection.projectionId
      || scope.projectionDigest !== component.projection.membershipDigest
      || scope.contentMembershipDigest !== component.projection.contentMembershipDigest
      || stable(scope.splits.toSorted((left, right) => left.name.localeCompare(right.name)))
        !== stable(expectedSplits)) {
    throw new TypeError('Cycle plan scope does not reproduce its analyzed registry component.');
  }
}
exactKeys(cycle, [
  'format', 'cycleId', 'state', 'planBinding', 'analysisBinding', 'review', 'hypotheses',
  'splitAccounting', 'unreviewedAnalysisHypothesisIds', 'consolidation',
  'analysisOmissionReasons', 'authority', 'receiptDigest',
], 'Discovery cycle');
if (cycle.format !== RESEARCH_CYCLE_PROTOCOL || cycle.cycleId !== plan.cycleId) {
  throw new TypeError('Discovery cycle protocol or plan-cycle identity is invalid.');
}
enumValue(cycle.state, ['complete', 'incomplete', 'blocked'], 'Discovery cycle.state');
exactKeys(cycle.planBinding, ['planId', 'planDigest'], 'Discovery cycle.planBinding');
if (cycle.planBinding.planId !== plan.planId || cycle.planBinding.planDigest !== sha256(stable(plan))) {
  throw new TypeError('Discovery cycle does not bind its exact pre-analysis plan.');
}
exactKeys(cycle.analysisBinding, [
  'protocol', 'receiptDigest', 'implementationAggregateDigest', 'registryDigest',
  'baselineGraphDigest', 'analysisId', 'version', 'seed',
], 'Discovery cycle.analysisBinding');
const expectedAnalysisBinding = {
  protocol: analysis.format,
  receiptDigest: analysis.receiptDigest,
  implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
  registryDigest: analysis.registry.digest,
  baselineGraphDigest: analysis.baselineGraph.catalogDigest,
  analysisId: analysis.analysis.analysisId,
  version: analysis.analysis.version,
  seed: analysis.analysis.seed,
};
if (stable(cycle.analysisBinding) !== stable(expectedAnalysisBinding)) {
  throw new TypeError('Discovery cycle does not bind its exact analysis receipt.');
}
assertCycleSplitAccounting(cycle, analysis);
exactKeys(cycle.review, [
  'reviewId', 'reviewAuthority', 'reviewedSpecifications', 'decisionScope',
], 'Discovery cycle.review');
identifier(cycle.review.reviewId, 'Discovery cycle.reviewId');
canonicalStrings(cycle.review.reviewedSpecifications,
  'Discovery cycle.reviewedSpecifications', { minimum: 2, maximum: 8 });
if (cycle.review.reviewAuthority !== 'repository-maintainer-review'
    || cycle.review.decisionScope !== 'research-consolidation-only'
    || !cycle.review.reviewedSpecifications.includes('DS028')
    || !cycle.review.reviewedSpecifications.includes('DS029')) {
  throw new TypeError('Discovery cycle review authority or specification scope is invalid.');
}
if (!Array.isArray(analysis.hypotheses) || !Array.isArray(cycle.hypotheses)
    || cycle.hypotheses.length > 256) {
  throw new TypeError('Discovery cycle and analysis hypotheses must be bounded arrays.');
}
const machineHypotheses = new Map(analysis.hypotheses.map((item) => [item.hypothesisId, item]));
const machineIds = new Set(machineHypotheses.keys());
const sourceIdentifiers = [
  ...analysis.registry.sources.flatMap((source) => [source.sourceId, source.revision]),
  ...analysis.registry.components.flatMap((component) => [
    component.componentId, component.projection.projectionId,
  ]),
];
if (machineIds.size !== analysis.hypotheses.length) {
  throw new TypeError('Analysis hypothesis identities must be unique.');
}
const humanIds = new Set();
const mappedIds = new Set();
for (const [index, hypothesis] of cycle.hypotheses.entries()) {
  const path = `Discovery cycle.hypotheses[${index}]`;
  exactKeys(hypothesis, [
    'hypothesisId', 'type', 'state', 'responsibility', 'containingCircuit',
    'inputPacketTypes', 'outputPacketTypes', 'authority', 'failureKinds',
    'resourceDimensions', 'analysisHypothesisIds',
  ], path);
  identifier(hypothesis.hypothesisId, `${path}.hypothesisId`);
  if (humanIds.has(hypothesis.hypothesisId)) throw new TypeError('Reviewed hypothesis IDs must be unique.');
  humanIds.add(hypothesis.hypothesisId);
  enumValue(hypothesis.type, DISCOVERY_HYPOTHESIS_TYPES, `${path}.type`);
  enumValue(hypothesis.state, ['retained', 'merge-candidate', 'rejected', 'deferred'], `${path}.state`);
  boundedText(hypothesis.responsibility, `${path}.responsibility`);
  if (hypothesis.responsibility.length < 8) {
    throw new TypeError(`${path}.responsibility must be bounded meaningful text.`);
  }
  identifier(hypothesis.containingCircuit, `${path}.containingCircuit`);
  enumValue(hypothesis.authority, ['none', 'proposal', 'coordination', 'gate'], `${path}.authority`);
  for (const field of [
    'inputPacketTypes', 'outputPacketTypes', 'failureKinds', 'resourceDimensions',
    'analysisHypothesisIds',
  ]) canonicalStrings(hypothesis[field], `${path}.${field}`, { minimum: 1, maximum: 64 });
  for (const id of hypothesis.analysisHypothesisIds) {
    if (!machineIds.has(id) || mappedIds.has(id)) {
      throw new TypeError(`${path} cites an absent or repeated machine-analysis hypothesis.`);
    }
    mappedIds.add(id);
  }
  assertReviewedHypothesisSemantics(hypothesis, machineHypotheses, path);
  const surface = stable(hypothesis).toLowerCase();
  if (/(?:expected|reference)[-_ ]?answer|gold[-_ ]?label|answer[-_ ]?key|dataset[-_ ]?(?:id|name)|source[-_ ]?(?:native|record|row)/u.test(surface)
      || sourceIdentifiers.some((value) => value.length >= 4
        && surface.includes(value.toLowerCase()))) {
    throw new TypeError(`${path} contains source- or answer-conditioned architecture.`);
  }
}
canonicalStrings(cycle.unreviewedAnalysisHypothesisIds,
  'Discovery cycle.unreviewedAnalysisHypothesisIds', { maximum: 256 });
if (cycle.unreviewedAnalysisHypothesisIds.some((id) => mappedIds.has(id))
    || stable([...new Set([...mappedIds, ...cycle.unreviewedAnalysisHypothesisIds])].toSorted())
      !== stable([...machineIds].toSorted())) {
  throw new TypeError('Discovery cycle must account for every machine hypothesis exactly once.');
}
if (!Array.isArray(cycle.consolidation) || cycle.consolidation.length !== humanIds.size) {
  throw new TypeError('Discovery cycle consolidation must decide every reviewed hypothesis.');
}
const decided = new Set();
for (const [index, decision] of cycle.consolidation.entries()) {
  const path = `Discovery cycle.consolidation[${index}]`;
  exactKeys(decision, ['candidateId', 'decision', 'resultId', 'reason'], path);
  if (!humanIds.has(decision.candidateId) || decided.has(decision.candidateId)) {
    throw new TypeError('Discovery cycle consolidation references an absent or repeated candidate.');
  }
  decided.add(decision.candidateId);
  enumValue(decision.decision, ['retain', 'merge', 'reject', 'defer'], `${path}.decision`);
  if (decision.resultId !== null) identifier(decision.resultId, `${path}.resultId`);
  const hypothesis = cycle.hypotheses.find((item) => item.hypothesisId === decision.candidateId);
  assertConsolidationSemantics(decision, hypothesis, path);
}
canonicalStrings(cycle.analysisOmissionReasons,
  'Discovery cycle.analysisOmissionReasons', { maximum: 256 });
const omissionReasons = [...new Set(analysis.omissions.map((item) => item.reason))].toSorted();
if (stable(cycle.analysisOmissionReasons) !== stable(omissionReasons)
    || cycle.state !== expectedDiscoveryCycleState(
      analysis, cycle.unreviewedAnalysisHypothesisIds,
    )) {
  throw new TypeError('Discovery cycle state or omissions contradict its bound analysis.');
}
exactKeys(cycle.authority, ['answer', 'runtime', 'proof', 'promotion', 'decisionScope'],
  'Discovery cycle.authority');
if (['answer', 'runtime', 'proof', 'promotion'].some((field) => cycle.authority[field] !== 'none')
    || cycle.authority.decisionScope !== 'research-consolidation-only') {
  throw new TypeError('Discovery cycle authority is inconsistent.');
}
digest(cycle.receiptDigest, 'Discovery cycle.receiptDigest');
const unsignedCycle = { ...cycle };
delete unsignedCycle.receiptDigest;
if (cycle.receiptDigest !== sha256(stable(unsignedCycle))) {
  throw new TypeError('Discovery cycle receipt digest does not reproduce.');
}
output({
  valid: true, format: cycle.format, cycleId: cycle.cycleId,
  reviewedHypotheses: cycle.hypotheses.length,
  unreviewedHypotheses: cycle.unreviewedAnalysisHypothesisIds.length,
});
