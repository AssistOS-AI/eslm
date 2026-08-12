import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile, sha256, stableStringify } from '../util.mjs';

const SHA256 = /^[0-9a-f]{64}$/u;
const AUDIT_STATES = Object.freeze([
  'current',
  'historical-stale',
  'historical-unrecoverable',
  'invalid',
  'unavailable',
]);

export const FRESH_RECEIPT_AUDIT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'blimp',
    freezePath: 'training/benchmark-sources/blimp-acceptability/candidate-manifest.json',
    resultPath: 'training/benchmark-sources/blimp-acceptability/fresh-result.json',
    dependencyPaths: ['frozenFiles'],
    resultIdentity: ['protocol', 'blimp-feature-acceptability-fresh-v1'],
    denominatorPath: 'total', successPath: 'correct', metricPath: 'accuracy',
    bindings: [
      ['partition.freshIdSha256', 'membership'],
      ['partition.fresh', 'total'],
    ],
  }),
  Object.freeze({
    id: 'ewok',
    freezePath: 'training/benchmark-sources/ewok-core-1.0/pre-fresh-freeze.json',
    resultPath: 'training/benchmark-sources/ewok-core-1.0/fresh-result.json',
    dependencyPaths: ['behaviorHashes'],
    resultDependencyPath: 'behaviorHashes',
    resultIdentity: ['format', 'eslm-ewok-fresh-aggregate-v1'],
    denominatorPath: 'total', successPath: 'correct', metricPath: 'accuracy',
    auxiliaryReceipts: [Object.freeze({
      role: 'partition',
      path: 'training/benchmark-sources/ewok-core-1.0/fresh-partition.json',
      bindings: [
        ['freshMembershipSha256', 'partitionMembershipSha256'],
        ['freshDecisions', 'total'],
      ],
    })],
  }),
  Object.freeze({
    id: 'logicbench',
    freezePath: 'training/benchmark-sources/logicbench/candidate-manifest.json',
    resultPath: 'training/benchmark-sources/logicbench/fresh-result.json',
    dependencyPaths: ['dependencies'],
    dependencyDigestPath: 'dependencySetSha256',
    resultIdentity: ['format', 'eslm-logicbench-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [['sourceSetSha256', 'sourceSetSha256']],
  }),
  Object.freeze({
    id: 'iibench',
    freezePath: 'training/benchmark-sources/iibench/pre-fresh-freeze.json',
    resultPath: 'training/benchmark-sources/iibench/fresh-result.json',
    dependencyPaths: ['behaviorHashes', 'testHashes', 'specificationHash'],
    resultIdentity: ['protocol', 'iibench-categorical-core-fresh-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [
      ['partitionMembershipSha256', 'partitionMembershipSha256'],
      ['freshCases', 'tested'],
    ],
  }),
  Object.freeze({
    id: 'logicskills',
    scope: Object.freeze({ kind: 'subtrack', id: 'countermodel-fresh' }),
    freezePath: 'training/benchmark-sources/logicskills/pre-fresh-countermodel-freeze.json',
    resultPath: 'training/benchmark-sources/logicskills/fresh-countermodel-aggregate.json',
    dependencyPaths: ['dependencies'],
    freezeDigestPath: 'preFreshFreezeSha256',
    resultIdentity: ['protocol', 'logicskills-countermodel-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [['partitionMembershipSha256', 'sourcePartitionSha256']],
  }),
  Object.freeze({
    id: 'prontoqa',
    freezePath: 'training/benchmark-sources/prontoqa-ood/pre-fresh-freeze.json',
    resultPath: 'training/benchmark-sources/prontoqa-ood/fresh-aggregate.json',
    dependencyPaths: ['dependencies'],
    freezeDigestPath: 'preFreshFreeze.sha256',
    resultIdentity: ['format', 'eslm-prontoqa-sealed-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [
      ['freshPolicy.partitionMembershipSha256', 'partitionMembershipSha256'],
      ['freshPolicy.partitionCount', 'tested'],
    ],
  }),
  Object.freeze({
    id: 'proverqa',
    freezePath: 'training/benchmark-sources/proverqa/pre-fresh-freeze-v2.json',
    resultPath: 'training/benchmark-sources/proverqa/fresh-aggregate.json',
    dependencyPaths: ['behaviorDependencies'],
    freezeDigestPath: 'preFreshFreeze.sha256',
    resultIdentity: ['format', 'eslm-proverqa-sealed-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [
      ['fresh.membershipSha256', 'partitionMembershipSha256'],
      ['fresh.members', 'tested'],
    ],
  }),
  Object.freeze({
    id: 'satbench',
    freezePath: 'training/benchmark-sources/satbench/pre-fresh-freeze.json',
    resultPath: 'training/benchmark-sources/satbench/fresh-aggregate.json',
    dependencyPaths: ['dependencies'],
    freezeDigestPath: 'preFreshFreeze.sha256',
    resultIdentity: ['format', 'eslm-satbench-sealed-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    bindings: [
      ['freshPolicy.partitionMembershipSha256', 'partitionMembershipSha256'],
      ['freshPolicy.partitionCount', 'tested'],
    ],
  }),
  Object.freeze({
    id: 'zebralogic',
    freezePath: 'training/benchmark-sources/zebralogic/pre-fresh-freeze.json',
    resultPath: 'training/benchmark-sources/zebralogic/fresh-aggregate.json',
    dependencyPaths: ['dependencies'],
    freezeDigestPath: 'preFreshFreeze.sha256',
    resultIdentity: ['format', 'eslm-zebralogic-sealed-fresh-aggregate-v1'],
    denominatorPath: 'tested', successPath: 'passed', metricPath: 'completionRate',
    bindings: [
      ['freshPolicy.partitionMembershipSha256', 'partitionMembershipSha256'],
      ['freshPolicy.partitionCount', 'tested'],
    ],
  }),
]);

function atPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDefinition(definition) {
  if (!isRecord(definition) || typeof definition.id !== 'string' || !definition.id
      || typeof definition.freezePath !== 'string' || typeof definition.resultPath !== 'string') {
    throw new Error('Benchmark receipt audit definitions require id, freezePath, and resultPath.');
  }
  if (!Array.isArray(definition.dependencyPaths) || definition.dependencyPaths.length === 0) {
    throw new Error(`${definition.id}: at least one dependency digest map is required.`);
  }
  if (!Array.isArray(definition.resultIdentity) || definition.resultIdentity.length !== 2) {
    throw new Error(`${definition.id}: a result identity field and expected value are required.`);
  }
}

function dependencyMap(freeze, definition) {
  const entries = [];
  for (const path of definition.dependencyPaths) {
    const group = atPath(freeze, path);
    if (!isRecord(group)) throw new Error(`${definition.id}: ${path} is not a dependency digest map.`);
    entries.push(...Object.entries(group));
  }
  for (const [path, digest] of entries) {
    if (typeof path !== 'string' || !path || !SHA256.test(digest)) {
      throw new Error(`${definition.id}: dependency entries require a non-empty path and lowercase SHA-256 digest.`);
    }
  }
  const dependencies = Object.fromEntries(entries);
  if (Object.keys(dependencies).length !== entries.length) {
    throw new Error(`${definition.id}: duplicate dependency path across digest groups.`);
  }
  return dependencies;
}

async function readReceiptArtifact(root, path, role) {
  let text;
  try {
    text = await readFile(join(root, path), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return Object.freeze({ role, path, sha256: null, state: 'unavailable', value: null,
      issues: Object.freeze([`${role} receipt is missing`]) });
  }
  const digest = sha256(text);
  try {
    const value = JSON.parse(text);
    if (!isRecord(value)) throw new Error('top level is not an object');
    return Object.freeze({ role, path, sha256: digest, state: 'available', value,
      issues: Object.freeze([]) });
  } catch (error) {
    return Object.freeze({ role, path, sha256: digest, state: 'invalid', value: null,
      issues: Object.freeze([`${role} receipt is not valid object JSON: ${error.message}`]) });
  }
}

function receiptBindingIssues(definition, freeze, result, freezeSha256, auxiliaryArtifacts) {
  const issues = [];
  const compare = (source, sourcePath, resultPath, label = 'receipt') => {
    const frozenValue = atPath(source, sourcePath);
    const resultValue = atPath(result, resultPath);
    if (frozenValue === undefined || resultValue === undefined) {
      issues.push(`${label} binding field missing: ${sourcePath} or ${resultPath}`);
    } else if (stableStringify(frozenValue) !== stableStringify(resultValue)) {
      issues.push(`${label} binding mismatch: ${sourcePath} != ${resultPath}`);
    }
  };
  for (const [freezePath, resultPath] of definition.bindings ?? []) {
    compare(freeze, freezePath, resultPath);
  }
  for (let index = 0; index < (definition.auxiliaryReceipts ?? []).length; index += 1) {
    const auxiliaryDefinition = definition.auxiliaryReceipts[index];
    const artifact = auxiliaryArtifacts[index];
    for (const [sourcePath, resultPath] of auxiliaryDefinition.bindings ?? []) {
      compare(artifact.value, sourcePath, resultPath, `${auxiliaryDefinition.role} receipt`);
    }
  }
  if (definition.freezeDigestPath && atPath(result, definition.freezeDigestPath) !== freezeSha256) {
    issues.push(`result does not bind the freeze receipt at ${definition.freezeDigestPath}`);
  }
  const dependencies = dependencyMap(freeze, definition);
  if (definition.resultDependencyPath
      && stableStringify(atPath(result, definition.resultDependencyPath)) !== stableStringify(dependencies)) {
    issues.push(`result dependency map differs from ${definition.resultDependencyPath}`);
  }
  if (definition.dependencyDigestPath) {
    const expected = sha256(JSON.stringify(dependencies));
    if (atPath(result, definition.dependencyDigestPath) !== expected) {
      issues.push(`result dependency digest differs at ${definition.dependencyDigestPath}`);
    }
  }
  return issues;
}

function closeRatio(left, right) {
  return Math.abs(left - right) <= 1e-12 * Math.max(1, Math.abs(left), Math.abs(right));
}

function validateMetricObject(value, location, issues) {
  if (!isRecord(value)) return;
  const denominatorKey = Object.hasOwn(value, 'tested') ? 'tested' : Object.hasOwn(value, 'total') ? 'total' : null;
  const denominator = denominatorKey ? value[denominatorKey] : undefined;
  if (denominatorKey && (!Number.isSafeInteger(denominator) || denominator < 0)) {
    issues.push(`${location}.${denominatorKey} must be a non-negative safe integer`);
  }
  for (const countKey of ['available', 'correct', 'passed', 'ties', 'wrong', 'reverse']) {
    if (!Object.hasOwn(value, countKey)) continue;
    const count = value[countKey];
    if (!Number.isSafeInteger(count) || count < 0) {
      issues.push(`${location}.${countKey} must be a non-negative safe integer`);
    } else if (Number.isSafeInteger(denominator) && ['correct', 'passed'].includes(countKey)
        && count > denominator) {
      issues.push(`${location}.${countKey} exceeds ${denominatorKey}`);
    }
  }
  if (Number.isSafeInteger(denominator) && Number.isSafeInteger(value.available)
      && value.available < denominator) issues.push(`${location}.available is smaller than ${denominatorKey}`);
  for (const [metricKey, numeratorKey] of [['accuracy', 'correct'], ['completionRate', 'passed']]) {
    if (!Object.hasOwn(value, metricKey)) continue;
    const metric = value[metricKey];
    const numerator = value[numeratorKey];
    if (!Number.isFinite(metric) || metric < 0 || metric > 1) {
      issues.push(`${location}.${metricKey} must be a finite ratio from zero through one`);
    } else if (Number.isSafeInteger(denominator) && denominator > 0 && Number.isSafeInteger(numerator)
        && !closeRatio(metric, numerator / denominator)) {
      issues.push(`${location}.${metricKey} does not equal ${numeratorKey}/${denominatorKey}`);
    }
  }
  if (Number.isSafeInteger(denominator) && Number.isSafeInteger(value.correct)
      && Number.isSafeInteger(value.ties)) {
    const remainder = Number.isSafeInteger(value.wrong) ? value.wrong
      : Number.isSafeInteger(value.reverse) ? value.reverse : undefined;
    if (remainder !== undefined && value.correct + value.ties + remainder !== denominator) {
      issues.push(`${location} preference outcome counts do not sum to ${denominatorKey}`);
    }
  }
  if (Number.isSafeInteger(denominator) && isRecord(value.statusCounts)) {
    const statuses = Object.values(value.statusCounts);
    if (!statuses.every((count) => Number.isSafeInteger(count) && count >= 0)) {
      issues.push(`${location}.statusCounts contains an invalid count`);
    } else if (statuses.reduce((sum, count) => sum + count, 0) !== denominator) {
      issues.push(`${location}.statusCounts does not sum to ${denominatorKey}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (isRecord(child)) validateMetricObject(child, `${location}.${key}`, issues);
  }
}

function resultIntegrityIssues(definition, result) {
  const issues = [];
  const [identityPath, expectedIdentity] = definition.resultIdentity;
  if (atPath(result, identityPath) !== expectedIdentity) {
    issues.push(`result identity differs at ${identityPath}`);
  }
  const denominator = atPath(result, definition.denominatorPath);
  const success = atPath(result, definition.successPath);
  const metric = atPath(result, definition.metricPath);
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    issues.push(`result ${definition.denominatorPath} must be a positive safe integer`);
  }
  if (!Number.isSafeInteger(success) || success < 0 || success > denominator) {
    issues.push(`result ${definition.successPath} must be a bounded safe integer`);
  }
  if (!Number.isFinite(metric) || !Number.isSafeInteger(denominator) || denominator <= 0
      || !Number.isSafeInteger(success) || !closeRatio(metric, success / denominator)) {
    issues.push(
      `result ${definition.metricPath} does not equal ${definition.successPath}/${definition.denominatorPath}`,
    );
  }
  validateMetricObject(result, 'result', issues);
  return [...new Set(issues)];
}

function reportingIssues(definition, freeze, result) {
  const issues = [];
  const executionTime = result.executedAt ?? result.measuredAt ?? result.createdAt;
  if (typeof executionTime !== 'string' || !Number.isFinite(Date.parse(executionTime))) {
    issues.push('execution timestamp is not recorded as an ISO-compatible date');
  }
  const strongBinding = Boolean(definition.freezeDigestPath
    || definition.dependencyDigestPath || definition.resultDependencyPath);
  if (!strongBinding) issues.push('result has no cryptographic freeze or behavior-dependency binding');
  if (!isRecord(result.behaviorDependency)
      || result.behaviorDependency.format !== 'eslm-benchmark-behavior-identity-v1'
      || !SHA256.test(result.behaviorDependency.digest)) {
    issues.push('behaviorDependency must record a content-addressed execution identity');
  }
  if (!isRecord(result.resourcePolicy)
      || !Number.isFinite(result.resourcePolicy.requestedMemoryMb)
      || result.resourcePolicy.requestedMemoryMb <= 0) {
    issues.push('resourcePolicy.requestedMemoryMb is not recorded');
  }
  if (!isRecord(result.resourceEvidence)
      || !Number.isFinite(result.resourceEvidence.sampledPeakRssBytes)
      || result.resourceEvidence.sampledPeakRssBytes < 0
      || !Number.isFinite(result.resourceEvidence.wallMilliseconds)
      || result.resourceEvidence.wallMilliseconds < 0) {
    issues.push('resourceEvidence must record non-negative sampled peak RSS and wall time');
  }
  if (typeof result.replayCommand !== 'string' || !result.replayCommand.trim()) {
    issues.push('replayCommand is not recorded');
  }
  if (!isRecord(result.evaluationIdentities)
      || ['scorer', 'oracle', 'partition'].some((key) =>
        typeof result.evaluationIdentities[key] !== 'string'
        || !result.evaluationIdentities[key].trim())) {
    issues.push('evaluationIdentities must name scorer, oracle, and partition');
  }
  if (!Array.isArray(result.selectedMethods)
      || result.selectedMethods.some((method) => typeof method !== 'string' || !method)) {
    issues.push('selectedMethods is not recorded as a method-identifier array');
  }
  for (const key of ['selectedKbVersions', 'usedKbVersions']) {
    if (!Array.isArray(result[key])) issues.push(`${key} is not recorded as a KB-version array`);
  }
  if (!isRecord(result.languagePolicy)
      || typeof result.languagePolicy.externalLanguageAgent !== 'boolean') {
    issues.push('languagePolicy.externalLanguageAgent is not recorded');
  }
  const frozenAt = freeze.frozenAt;
  if (frozenAt !== undefined && (typeof frozenAt !== 'string' || !Number.isFinite(Date.parse(frozenAt)))) {
    issues.push('freeze timestamp is invalid');
  }
  return issues;
}

async function inspectDependency(root, path, expectedSha256) {
  try {
    const actualSha256 = await hashFile(join(root, path));
    return Object.freeze({
      path, expectedSha256, actualSha256,
      state: actualSha256 === expectedSha256 ? 'match' : 'changed',
    });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return Object.freeze({ path, expectedSha256, actualSha256: null, state: 'missing' });
  }
}

function unavailableAudit(definition, artifacts, state, issues) {
  return Object.freeze({
    id: definition.id,
    scope: Object.freeze(definition.scope ?? { kind: 'benchmark', id: definition.id }),
    state,
    freeze: Object.freeze({ path: definition.freezePath,
      sha256: artifacts.find((item) => item.role === 'freeze')?.sha256 ?? null }),
    result: Object.freeze({ path: definition.resultPath,
      sha256: artifacts.find((item) => item.role === 'result')?.sha256 ?? null }),
    auxiliaryArtifacts: Object.freeze(artifacts.filter((item) => !['freeze', 'result'].includes(item.role))
      .map((item) => Object.freeze({ role: item.role, path: item.path, sha256: item.sha256, state: item.state }))),
    frozenAt: null,
    executedAt: null,
    receiptBinding: Object.freeze({ state: 'unverified', issues: Object.freeze(issues) }),
    receiptValidity: Object.freeze({ integrity: state === 'invalid' ? 'invalid' : 'unavailable',
      reportingCompleteness: 'unavailable', issues: Object.freeze(issues) }),
    dependencies: Object.freeze({ checked: 0, matching: 0, changed: 0, missing: 0, files: Object.freeze([]) }),
  });
}

export async function auditFreshBenchmarkReceipt(definition, root = PROJECT_ROOT) {
  validateDefinition(definition);
  const artifacts = await Promise.all([
    readReceiptArtifact(root, definition.freezePath, 'freeze'),
    readReceiptArtifact(root, definition.resultPath, 'result'),
    ...(definition.auxiliaryReceipts ?? []).map((item) => readReceiptArtifact(root, item.path, item.role)),
  ]);
  const unavailable = artifacts.filter((item) => item.state === 'unavailable');
  if (unavailable.length > 0) {
    return unavailableAudit(definition, artifacts, 'unavailable', unavailable.flatMap((item) => item.issues));
  }
  const malformed = artifacts.filter((item) => item.state === 'invalid');
  if (malformed.length > 0) {
    return unavailableAudit(definition, artifacts, 'invalid', malformed.flatMap((item) => item.issues));
  }
  const [freezeArtifact, resultArtifact, ...auxiliaryArtifacts] = artifacts;
  const freeze = freezeArtifact.value;
  const result = resultArtifact.value;
  let dependencies;
  try {
    dependencies = dependencyMap(freeze, definition);
  } catch (error) {
    return unavailableAudit(definition, artifacts, 'invalid', [error.message]);
  }
  const dependencyResults = await Promise.all(Object.entries(dependencies)
    .map(([path, expected]) => inspectDependency(root, path, expected)));
  const bindingIssues = receiptBindingIssues(
    definition, freeze, result, freezeArtifact.sha256, auxiliaryArtifacts,
  );
  const integrityIssues = resultIntegrityIssues(definition, result);
  const completenessIssues = reportingIssues(definition, freeze, result);
  const changed = dependencyResults.filter((item) => item.state === 'changed').length;
  const missing = dependencyResults.filter((item) => item.state === 'missing').length;
  const state = bindingIssues.length > 0 || integrityIssues.length > 0 ? 'invalid'
    : missing > 0 ? 'historical-unrecoverable'
      : changed > 0 ? 'historical-stale'
        : completenessIssues.length > 0 ? 'invalid' : 'current';
  return Object.freeze({
    id: definition.id,
    scope: Object.freeze(definition.scope ?? { kind: 'benchmark', id: definition.id }),
    state,
    freeze: Object.freeze({ path: definition.freezePath, sha256: freezeArtifact.sha256 }),
    result: Object.freeze({ path: definition.resultPath, sha256: resultArtifact.sha256 }),
    auxiliaryArtifacts: Object.freeze(auxiliaryArtifacts.map((artifact) => Object.freeze({
      role: artifact.role, path: artifact.path, sha256: artifact.sha256, state: artifact.state,
    }))),
    frozenAt: freeze.frozenAt ?? null,
    executedAt: result.executedAt ?? result.measuredAt ?? result.createdAt ?? null,
    receiptBinding: Object.freeze({ state: bindingIssues.length === 0 ? 'match' : 'mismatch',
      issues: Object.freeze(bindingIssues) }),
    receiptValidity: Object.freeze({
      integrity: integrityIssues.length === 0 ? 'valid' : 'invalid',
      reportingCompleteness: completenessIssues.length === 0 ? 'complete' : 'incomplete',
      issues: Object.freeze([...integrityIssues, ...completenessIssues]),
    }),
    dependencies: Object.freeze({
      checked: dependencyResults.length,
      matching: dependencyResults.length - changed - missing,
      changed,
      missing,
      files: Object.freeze(dependencyResults),
    }),
  });
}

export async function auditFreshBenchmarkReceipts(options = {}) {
  const root = options.root ?? PROJECT_ROOT;
  const definitions = options.definitions ?? FRESH_RECEIPT_AUDIT_DEFINITIONS;
  const rows = await Promise.all(definitions.map((definition) => auditFreshBenchmarkReceipt(definition, root)));
  const count = (state) => rows.filter((row) => row.state === state).length;
  const summary = {
    checked: rows.length,
    current: count('current'),
    historicalStale: count('historical-stale'),
    historicalUnrecoverable: count('historical-unrecoverable'),
    invalid: count('invalid'),
    unavailable: count('unavailable'),
  };
  if (Object.values(summary).slice(1).reduce((sum, value) => sum + value, 0) !== rows.length) {
    throw new Error(`Receipt audit produced a state outside ${AUDIT_STATES.join(', ')}.`);
  }
  return Object.freeze({
    format: 'eslm-benchmark-receipt-audit-v2',
    summary: Object.freeze(summary),
    rows: Object.freeze(rows),
  });
}
