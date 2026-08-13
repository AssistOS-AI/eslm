#!/usr/bin/env node
import {
  boundedText,
  canonicalStrings,
  digest,
  enumValue,
  exactKeys,
  identifier,
  integer,
  output,
  readJsonArgument,
} from './contract-helpers.mjs';

const REQUIRED_TECHNIQUES = Object.freeze([
  'bounded-subcircuit-motif-v1',
  'cross-source-recurrence-v1',
  'earliest-error-v1',
  'metamorphic-recurrence-v1',
  'partial-order-motif-v1',
  'phase-change-point-v1',
  'preference-axis-v1',
  'task-frame-induction-v1',
  'typed-operation-responsibility-v1',
]);

function same(left, right) {
  return JSON.stringify([...left].toSorted()) === JSON.stringify([...right].toSorted());
}

function validateWorkPolicy(policy, admittedRows) {
  exactKeys(policy, ['format', 'progressionStage', 'limits', 'techniqueBudgets'], 'Plan.workPolicy');
  if (policy.format !== 'eslm-processing-graph-research-work-policy-v1') {
    throw new TypeError('Plan work-policy format is unsupported.');
  }
  enumValue(policy.progressionStage, ['probe', 'pilot', 'scale'], 'Plan.workPolicy.progressionStage');
  exactKeys(policy.limits, [
    'maxRowsScanned', 'maxEpisodes', 'maxInputBytes', 'maxTokens', 'maxActions',
    'maxDependencies', 'maxVotes', 'maxHypotheses', 'maxEvidenceDigestsPerVote',
  ], 'Plan.workPolicy.limits');
  for (const [field, value] of Object.entries(policy.limits)) {
    integer(value, `Plan.workPolicy.limits.${field}`, 1);
  }
  if (policy.limits.maxEvidenceDigestsPerVote > 14) {
    throw new TypeError('Plan maxEvidenceDigestsPerVote cannot exceed 14 for nine techniques.');
  }
  if (policy.limits.maxRowsScanned < admittedRows) {
    throw new TypeError('Plan row-scan work policy does not cover its admitted episode scope.');
  }
  exactKeys(policy.techniqueBudgets, REQUIRED_TECHNIQUES, 'Plan.workPolicy.techniqueBudgets');
  for (const technique of REQUIRED_TECHNIQUES) {
    const budget = policy.techniqueBudgets[technique];
    exactKeys(budget, ['maxEvents', 'maxProposals'], `Plan.workPolicy.techniqueBudgets.${technique}`);
    integer(budget.maxEvents, `Plan.workPolicy.techniqueBudgets.${technique}.maxEvents`, 1);
    integer(budget.maxProposals, `Plan.workPolicy.techniqueBudgets.${technique}.maxProposals`, 1);
  }
}

const plan = await readJsonArgument(
  process.argv[2], 'Usage: validate-discovery-plan.mjs PLAN.json',
);
exactKeys(plan, [
  'format', 'planId', 'cycleId', 'state', 'question', 'nullHypothesis', 'sourceRevisions',
  'projectionDigests', 'sourceScopes', 'baselineGraphDigest', 'analysisIdentity', 'strategyIdentities',
  'workPolicy', 'authority',
], 'Discovery plan');
if (plan.format !== 'eslm-rl-dataset-discovery-plan-v2') {
  throw new TypeError('Invalid discovery-plan format.');
}
identifier(plan.planId, 'Plan.planId');
identifier(plan.cycleId, 'Plan.cycleId');
enumValue(plan.state, ['approved'], 'Plan.state');
boundedText(plan.question, 'Plan.question');
boundedText(plan.nullHypothesis, 'Plan.nullHypothesis');
if (plan.question.length < 24 || plan.nullHypothesis.length < 24) {
  throw new TypeError('Plan question and null hypothesis must be explicit and falsifiable.');
}
canonicalStrings(plan.sourceRevisions, 'Plan.sourceRevisions', { minimum: 1 });
canonicalStrings(plan.projectionDigests, 'Plan.projectionDigests', { minimum: 1 });
if (plan.sourceRevisions.some((value) => !value.includes('@'))) {
  throw new TypeError('Plan source revisions must use source@revision identities.');
}
for (const [index, value] of plan.projectionDigests.entries()) {
  digest(value, `Plan.projectionDigests[${index}]`);
}
if (!Array.isArray(plan.sourceScopes) || plan.sourceScopes.length < 1
    || plan.sourceScopes.length > 128) {
  throw new TypeError('Plan source scopes must be bounded and non-empty.');
}
const scopeIdentities = new Set();
let admittedRows = 0;
for (const [scopeIndex, scope] of plan.sourceScopes.entries()) {
  const path = `Plan.sourceScopes[${scopeIndex}]`;
  exactKeys(scope, [
    'sourceRevision', 'componentId', 'projectionId', 'projectionDigest',
    'contentMembershipDigest', 'splits',
  ], path);
  for (const field of ['sourceRevision', 'componentId', 'projectionId']) {
    identifier(scope[field], `${path}.${field}`);
  }
  if (!scope.sourceRevision.includes('@')) {
    throw new TypeError(`${path}.sourceRevision must use a source@revision identity.`);
  }
  digest(scope.projectionDigest, `${path}.projectionDigest`);
  digest(scope.contentMembershipDigest, `${path}.contentMembershipDigest`);
  const scopeIdentity = `${scope.sourceRevision}\u0000${scope.componentId}`;
  if (scopeIdentities.has(scopeIdentity)) {
    throw new TypeError('Plan source-scope identities must be unique.');
  }
  scopeIdentities.add(scopeIdentity);
  if (!Array.isArray(scope.splits) || scope.splits.length < 1 || scope.splits.length > 32) {
    throw new TypeError(`${path}.splits must be bounded and non-empty.`);
  }
  const splitNames = new Set();
  for (const [splitIndex, split] of scope.splits.entries()) {
    const splitPath = `${path}.splits[${splitIndex}]`;
    exactKeys(split, ['name', 'visibility', 'rowsDeclared', 'rowsAdmitted'], splitPath);
    identifier(split.name, `${splitPath}.name`);
    if (splitNames.has(split.name)) throw new TypeError(`${path} split names must be unique.`);
    splitNames.add(split.name);
    enumValue(split.visibility, [
      'training-visible', 'development-visible', 'protected',
    ], `${splitPath}.visibility`);
    integer(split.rowsDeclared, `${splitPath}.rowsDeclared`);
    integer(split.rowsAdmitted, `${splitPath}.rowsAdmitted`);
    if (split.rowsAdmitted > split.rowsDeclared
        || (split.visibility !== 'training-visible' && split.rowsAdmitted !== 0)) {
      throw new TypeError(`${splitPath} admits rows outside reviewed training visibility.`);
    }
    admittedRows += split.rowsAdmitted;
  }
}
if (!same(plan.sourceRevisions, new Set(plan.sourceScopes.map((scope) => scope.sourceRevision)))
    || !same(plan.projectionDigests,
      new Set(plan.sourceScopes.map((scope) => scope.projectionDigest)))) {
  throw new TypeError('Plan source and projection identities do not reconcile with its scopes.');
}
if (admittedRows < 1) {
  throw new TypeError('Plan must admit at least one reviewed training-visible row.');
}
digest(plan.baselineGraphDigest, 'Plan.baselineGraphDigest');
exactKeys(plan.analysisIdentity, [
  'analysisId', 'version', 'seed', 'inputMode', 'selectionMethod',
], 'Plan.analysisIdentity');
for (const field of ['analysisId', 'version', 'seed']) {
  identifier(plan.analysisIdentity[field], `Plan.analysisIdentity.${field}`);
}
if (plan.analysisIdentity.inputMode !== 'iterable-or-async-iterable'
    || plan.analysisIdentity.selectionMethod !== 'bounded-min-hash-v1') {
  throw new TypeError('Plan analysis identity uses an unsupported execution contract.');
}
canonicalStrings(plan.strategyIdentities, 'Plan.strategyIdentities', { minimum: 2 });
if (!same(plan.strategyIdentities, REQUIRED_TECHNIQUES)) {
  throw new TypeError('Plan strategy identities must equal the portable discovery techniques.');
}
validateWorkPolicy(plan.workPolicy, admittedRows);
exactKeys(plan.authority, ['analysisAdmission', 'answer', 'runtime', 'proof', 'promotion'],
  'Plan.authority');
if (plan.authority.analysisAdmission !== 'reviewed-training-projections-only'
    || ['answer', 'runtime', 'proof', 'promotion'].some((field) => plan.authority[field] !== 'none')) {
  throw new TypeError('Plan authority is inconsistent.');
}
output({
  valid: true,
  planId: plan.planId,
  cycleId: plan.cycleId,
  sources: plan.sourceRevisions.length,
  components: plan.sourceScopes.length,
  admittedRows,
  stage: plan.workPolicy.progressionStage,
});
