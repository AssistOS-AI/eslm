import { sha256, stableStringify } from '../util.mjs';
import { PROCESSING_GRAPH_DISCOVERY_TECHNIQUES } from './processing-graph-discovery-strategies.mjs';
import { assertProcessingGraphResearchWorkPolicy } from './processing-graph-research-work-policy.mjs';
import { assertResearchSourceRegistry } from './research-source-registry.mjs';

export const RESEARCH_DISCOVERY_PLAN_PROTOCOL = 'eslm-rl-dataset-discovery-plan-v2';

export const RESEARCH_DISCOVERY_PLAN_AUTHORITY = Object.freeze({
  analysisAdmission: 'reviewed-training-projections-only',
  answer: 'none',
  runtime: 'none',
  proof: 'none',
  promotion: 'none',
});

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>@-][a-z0-9]+)*$/u;

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

function boundedText(value, path) {
  if (typeof value !== 'string' || value.length < 24 || Buffer.byteLength(value, 'utf8') > 2_048) {
    throw new TypeError(`${path} must be bounded, explicit, and falsifiable text.`);
  }
}

function count(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative safe integer.`);
  }
}

function canonicalStrings(value, path, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum || value.length > 128
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 512)
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a canonical bounded string array.`);
  }
}

export function researchDiscoveryPlanDigest(plan) {
  assertResearchDiscoveryPlan(plan);
  return `sha256:${sha256(stableStringify(plan))}`;
}

export function assertResearchDiscoveryPlan(plan) {
  exact(plan, [
    'format', 'planId', 'cycleId', 'state', 'question', 'nullHypothesis', 'sourceRevisions',
    'projectionDigests', 'sourceScopes', 'baselineGraphDigest', 'analysisIdentity', 'strategyIdentities',
    'workPolicy', 'authority',
  ], 'Research discovery plan');
  if (plan.format !== RESEARCH_DISCOVERY_PLAN_PROTOCOL || plan.state !== 'approved') {
    throw new TypeError('Research discovery plan protocol or state is unsupported.');
  }
  identifier(plan.planId, 'Research discovery plan.planId');
  identifier(plan.cycleId, 'Research discovery plan.cycleId');
  boundedText(plan.question, 'Research discovery plan.question');
  boundedText(plan.nullHypothesis, 'Research discovery plan.nullHypothesis');
  canonicalStrings(plan.sourceRevisions, 'Research discovery plan.sourceRevisions');
  if (plan.sourceRevisions.some((item) => !item.includes('@'))) {
    throw new TypeError('Research discovery plan source revisions must use source@revision identities.');
  }
  canonicalStrings(plan.projectionDigests, 'Research discovery plan.projectionDigests');
  if (plan.projectionDigests.some((item) => !DIGEST.test(item))) {
    throw new TypeError('Research discovery plan projections must be SHA-256 digests.');
  }
  if (!DIGEST.test(plan.baselineGraphDigest)) {
    throw new TypeError('Research discovery plan baseline must be a SHA-256 digest.');
  }
  exact(plan.analysisIdentity, [
    'analysisId', 'version', 'seed', 'inputMode', 'selectionMethod',
  ], 'Research discovery plan.analysisIdentity');
  for (const field of ['analysisId', 'version', 'seed']) {
    identifier(plan.analysisIdentity[field], `Research discovery plan.analysisIdentity.${field}`);
  }
  if (plan.analysisIdentity.inputMode !== 'iterable-or-async-iterable'
      || plan.analysisIdentity.selectionMethod !== 'bounded-min-hash-v1') {
    throw new TypeError('Research discovery plan analysis execution identity is unsupported.');
  }
  if (!Array.isArray(plan.sourceScopes) || plan.sourceScopes.length < 1
      || plan.sourceScopes.length > 128) {
    throw new TypeError('Research discovery plan source scopes must be bounded and non-empty.');
  }
  const scopeIds = new Set();
  let admittedRows = 0;
  for (const [scopeIndex, scope] of plan.sourceScopes.entries()) {
    const path = `Research discovery plan.sourceScopes[${scopeIndex}]`;
    exact(scope, [
      'sourceRevision', 'componentId', 'projectionId', 'projectionDigest',
      'contentMembershipDigest', 'splits',
    ], path);
    for (const field of ['sourceRevision', 'componentId', 'projectionId']) identifier(scope[field], `${path}.${field}`);
    if (!scope.sourceRevision.includes('@') || !DIGEST.test(scope.projectionDigest)
        || !DIGEST.test(scope.contentMembershipDigest)) {
      throw new TypeError(`${path} source or projection identity is invalid.`);
    }
    const scopeId = `${scope.sourceRevision}\u0000${scope.componentId}`;
    if (scopeIds.has(scopeId)) throw new TypeError('Research discovery plan source scopes must be unique.');
    scopeIds.add(scopeId);
    if (!Array.isArray(scope.splits) || scope.splits.length < 1 || scope.splits.length > 32) {
      throw new TypeError(`${path}.splits must be bounded and non-empty.`);
    }
    const splitNames = new Set();
    for (const [splitIndex, split] of scope.splits.entries()) {
      const splitPath = `${path}.splits[${splitIndex}]`;
      exact(split, ['name', 'visibility', 'rowsDeclared', 'rowsAdmitted'], splitPath);
      identifier(split.name, `${splitPath}.name`);
      if (splitNames.has(split.name)) throw new TypeError(`${path} split names must be unique.`);
      splitNames.add(split.name);
      if (!['training-visible', 'development-visible', 'protected'].includes(split.visibility)) {
        throw new TypeError(`${splitPath}.visibility is unsupported.`);
      }
      count(split.rowsDeclared, `${splitPath}.rowsDeclared`);
      count(split.rowsAdmitted, `${splitPath}.rowsAdmitted`);
      if (split.rowsAdmitted > split.rowsDeclared
          || (split.visibility !== 'training-visible' && split.rowsAdmitted !== 0)) {
        throw new TypeError(`${splitPath} admits rows outside its reviewed training visibility.`);
      }
      admittedRows += split.rowsAdmitted;
    }
  }
  const revisions = [...new Set(plan.sourceScopes.map((scope) => scope.sourceRevision))].toSorted();
  const projections = [...new Set(plan.sourceScopes.map((scope) => scope.projectionDigest))].toSorted();
  if (stableStringify(revisions) !== stableStringify(plan.sourceRevisions)
      || stableStringify(projections) !== stableStringify(plan.projectionDigests)) {
    throw new TypeError('Research discovery plan scope identities do not reconcile.');
  }
  assertProcessingGraphResearchWorkPolicy(plan.workPolicy);
  const techniqueIds = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map(({ id }) => id).toSorted();
  canonicalStrings(plan.strategyIdentities, 'Research discovery plan.strategyIdentities', 2);
  if (admittedRows < 1
      || stableStringify(plan.strategyIdentities) !== stableStringify(techniqueIds)
      || admittedRows > plan.workPolicy.limits.maxRowsScanned) {
    throw new TypeError('Research discovery plan techniques or row budget do not cover the admitted scope.');
  }
  exact(plan.authority, Object.keys(RESEARCH_DISCOVERY_PLAN_AUTHORITY), 'Research discovery plan.authority');
  if (stableStringify(plan.authority) !== stableStringify(RESEARCH_DISCOVERY_PLAN_AUTHORITY)) {
    throw new TypeError('Research discovery plan authority is inconsistent.');
  }
  return plan;
}

export function assertResearchDiscoveryPlanRegistry(
  plan, registry, { baselineGraphDigest } = {},
) {
  assertResearchDiscoveryPlan(plan);
  assertResearchSourceRegistry(registry);
  if (baselineGraphDigest !== undefined && plan.baselineGraphDigest !== baselineGraphDigest) {
    throw new TypeError('Research discovery plan is stale against the processing graph.');
  }
  const sourceRevisions = registry.sources
    .map((source) => `${source.sourceId}@${source.revision}`).toSorted();
  const projectionDigests = registry.components
    .map((component) => component.projection.membershipDigest).toSorted();
  if (stableStringify(plan.sourceRevisions) !== stableStringify(sourceRevisions)
      || stableStringify(plan.projectionDigests) !== stableStringify(projectionDigests)
      || plan.sourceScopes.length !== registry.components.length) {
    throw new TypeError('Research discovery plan does not cover the exact registry projections.');
  }
  const scopes = new Map(plan.sourceScopes.map((scope) => [
    `${scope.sourceRevision}\u0000${scope.componentId}`,
    scope,
  ]));
  for (const component of registry.components) {
    const sourceRevision = `${component.sourceId}@${component.revision}`;
    const scope = scopes.get(`${sourceRevision}\u0000${component.componentId}`);
    const expectedVisibility = component.visibility.map(({
      split, visibility, rowsDeclared, rowsAdmitted,
    }) => ({ name: split, visibility, rowsDeclared, rowsAdmitted }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
    const plannedVisibility = scope?.splits
      .toSorted((left, right) => left.name.localeCompare(right.name));
    const rowsDeclared = scope?.splits.reduce((sum, split) => sum + split.rowsDeclared, 0);
    const rowsAdmitted = scope?.splits.reduce((sum, split) => sum + split.rowsAdmitted, 0);
    if (!scope || scope.projectionId !== component.projection.projectionId
        || scope.projectionDigest !== component.projection.membershipDigest
        || scope.contentMembershipDigest !== component.projection.contentMembershipDigest
        || stableStringify(plannedVisibility) !== stableStringify(expectedVisibility)
        || rowsDeclared !== component.identity.rows
        || rowsAdmitted !== component.projection.rows) {
      throw new TypeError('Research discovery plan scope does not reproduce its registry component.');
    }
  }
  return plan;
}
