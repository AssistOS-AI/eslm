import { validateBenchmarkCatalogFields } from './benchmark-report-catalog.mjs';
import {
  assertBenchmarkStrategyConfiguration,
} from './benchmark-strategy-configuration.mjs';

export const BENCHMARK_TRACKS = Object.freeze({
  RAW_LANGUAGE: 'raw-language',
  STRUCTURED_TASK: 'structured-task',
  SOLVER_CONFORMANCE: 'solver-conformance',
});

export const BENCHMARK_INPUT_ROUTES = Object.freeze({
  RAW_LANGUAGE: 'raw-language',
  SOURCE_TEMPLATE: 'source-template',
  STRUCTURED_TASK: 'structured-task',
  SOURCE_ANNOTATION: 'source-annotation',
});

const TRACKS_BY_BENCHMARK = Object.freeze({
  blimp: { track: 'raw-language', inputRoute: 'raw-language' },
  babi: { track: 'structured-task', inputRoute: 'source-template' },
  clutrr: { track: 'structured-task', inputRoute: 'structured-task' },
  entityTracking: { track: 'structured-task', inputRoute: 'source-template' },
  ewok: { track: 'solver-conformance', inputRoute: 'source-template' },
  storyCloze: { track: 'structured-task', inputRoute: 'source-template' },
  simpleqa: { track: 'raw-language', inputRoute: 'raw-language' },
  logicbench: { track: 'raw-language', inputRoute: 'source-template' },
  iibench: { track: 'structured-task', inputRoute: 'source-template' },
  proofwriter: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  prontoqa: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  'slr-bench': { track: 'structured-task', inputRoute: 'structured-task' },
  logicskills: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  folio: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  proverqa: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  stepgame: { track: 'structured-task', inputRoute: 'source-template' },
  'sparc-sparp': { track: 'solver-conformance', inputRoute: 'source-annotation' },
  satbench: { track: 'solver-conformance', inputRoute: 'source-annotation' },
  zebralogic: { track: 'solver-conformance', inputRoute: 'source-template' },
  'defeasible-nli': { track: 'structured-task', inputRoute: 'structured-task' },
  'alpha-nli-art': { track: 'structured-task', inputRoute: 'structured-task' },
  reclor: { track: 'structured-task', inputRoute: 'structured-task' },
  logiqa: { track: 'structured-task', inputRoute: 'structured-task' },
});

const FORCED_CHOICE_BY_BENCHMARK = Object.freeze({
  blimp: true,
  babi: false,
  clutrr: true,
  entityTracking: false,
  ewok: true,
  storyCloze: true,
  simpleqa: false,
  logicbench: true,
  iibench: true,
  proofwriter: true,
  prontoqa: true,
  'slr-bench': false,
  logicskills: false,
  folio: true,
  proverqa: true,
  stepgame: true,
  'sparc-sparp': false,
  satbench: true,
  zebralogic: false,
  'defeasible-nli': true,
  'alpha-nli-art': true,
  reclor: true,
  logiqa: true,
});

function optionalCount(value, name) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer or null.`);
  }
  return value;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

export function benchmarkTrack(id) {
  const value = TRACKS_BY_BENCHMARK[id];
  if (!value) throw new Error(`Benchmark ${id} has no report track classification.`);
  return Object.freeze({ ...value });
}

export function benchmarkTaskContract(id) {
  const classification = benchmarkTrack(id);
  const forcedChoice = FORCED_CHOICE_BY_BENCHMARK[id];
  if (typeof forcedChoice !== 'boolean') {
    throw new Error(`Benchmark ${id} has no forced-choice classification.`);
  }
  return Object.freeze({ ...classification, forcedChoice });
}

export function benchmarkOutcomeMetrics(data) {
  const total = optionalCount(data.total, 'total');
  const attempted = optionalCount(data.attempted, 'attempted');
  let correct = optionalCount(data.correct, 'correct');
  if (data.forcedChoice && total !== null && total > 0 && attempted === null) {
    throw new Error('attempted is required for a non-empty forced-choice denominator.');
  }
  if (data.forcedChoice && total !== null && attempted === 0 && correct === null) correct = 0;
  if (total !== null && attempted !== null && attempted > total) throw new Error('attempted cannot exceed total.');
  if (total !== null && correct !== null && correct > total) throw new Error('correct cannot exceed total.');
  if (attempted !== null && correct !== null && correct > attempted) {
    throw new Error('correct cannot exceed attempted.');
  }
  const endToEndAccuracy = total !== null && correct !== null ? ratio(correct, total) : null;
  return Object.freeze({
    total,
    correct,
    attempted,
    endToEndAccuracy,
    attemptCoverage: total !== null && attempted !== null ? ratio(attempted, total) : null,
    selectiveAccuracy: attempted !== null && attempted > 0 && correct !== null ? correct / attempted : null,
  });
}

export function legacyDirectSymbolicRate(classification, normalizationCandidates, total) {
  if (classification.inputRoute !== BENCHMARK_INPUT_ROUTES.RAW_LANGUAGE) return null;
  if (!Number.isSafeInteger(normalizationCandidates) || !Number.isSafeInteger(total) || total <= 0) return null;
  if (normalizationCandidates < 0 || normalizationCandidates > total) {
    throw new Error('normalizationCandidates must be between zero and total.');
  }
  return (total - normalizationCandidates) / total;
}

export function benchmarkReportFields(id, data) {
  const { forcedChoice, ...classification } = benchmarkTaskContract(id);
  if (data.forcedChoice !== undefined && data.forcedChoice !== forcedChoice) {
    throw new Error(`${id}: row factory forcedChoice differs from the registered task contract.`);
  }
  const metrics = benchmarkOutcomeMetrics({ ...data, forcedChoice });
  return Object.freeze({
    ...classification,
    forcedChoice,
    ...metrics,
    accuracy: metrics.endToEndAccuracy,
    accuracySemantics: metrics.endToEndAccuracy === null ? null : 'end-to-end-over-declared-denominator',
    directSymbolicRate: legacyDirectSymbolicRate(classification, data.normalizationCandidates, metrics.total),
  });
}

function sameMetric(left, right) {
  if (left === right) return true;
  return Number.isFinite(left) && Number.isFinite(right)
    && Math.abs(left - right) <= 1e-12 * Math.max(1, Math.abs(left), Math.abs(right));
}

function validateKbVersions(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
  const identities = new Set();
  for (const value of values) {
    if (!value || typeof value.kbId !== 'string' || !value.kbId) {
      throw new Error(`${label} requires object entries with kbId.`);
    }
    if (value.version !== undefined && (typeof value.version !== 'string' || !value.version)) {
      throw new Error(`${label} contains an invalid version.`);
    }
    const identity = `${value.kbId}\u0000${value.version ?? ''}`;
    if (identities.has(identity)) throw new Error(`${label} contains duplicate ${value.kbId}.`);
    identities.add(identity);
  }
}

export function validatePublicBenchmarkRow(row, options = {}) {
  if (!row || typeof row.id !== 'string') throw new Error('Public benchmark rows require an id.');
  validateBenchmarkCatalogFields(row);
  const { forcedChoice, ...classification } = benchmarkTaskContract(row.id);
  if (row.forcedChoice !== forcedChoice) {
    throw new Error(`${row.id}: forcedChoice differs from the registered task contract.`);
  }
  if (row.track !== classification.track || row.inputRoute !== classification.inputRoute) {
    throw new Error(`${row.id}: report track or input route differs from the registered classification.`);
  }
  if (!['current-execution', 'stored-receipt', 'access-gated'].includes(row.resultOrigin)) {
    throw new Error(`${row.id}: unsupported result origin.`);
  }
  if (row.executionEvidence?.origin !== (row.resultOrigin === 'access-gated' ? 'not-executed' : row.resultOrigin)) {
    throw new Error(`${row.id}: execution evidence origin differs from result origin.`);
  }
  if (row.total === null) {
    if (row.correct !== null || row.accuracy !== null || row.endToEndAccuracy !== null) {
      throw new Error(`${row.id}: an unexecuted row cannot carry an accuracy.`);
    }
  } else {
    const metrics = benchmarkOutcomeMetrics({
      total: row.total, correct: row.correct, attempted: row.attempted,
      forcedChoice,
    });
    for (const key of ['endToEndAccuracy', 'attemptCoverage', 'selectiveAccuracy']) {
      if (!sameMetric(row[key], metrics[key])) throw new Error(`${row.id}: inconsistent ${key}.`);
    }
    if (!sameMetric(row.accuracy, row.endToEndAccuracy)) {
      throw new Error(`${row.id}: accuracy is not the end-to-end metric.`);
    }
    const expectedAccuracySemantics = metrics.endToEndAccuracy === null
      ? null : 'end-to-end-over-declared-denominator';
    if (row.accuracySemantics !== expectedAccuracySemantics) {
      throw new Error(`${row.id}: accuracySemantics does not describe the reported denominator.`);
    }
    if (row.sampleCoverage?.tested !== row.total
        || !Number.isSafeInteger(row.sampleCoverage?.available)
        || row.sampleCoverage.available < row.total) {
      throw new Error(`${row.id}: tested/available coverage does not support the denominator.`);
    }
    const statuses = Object.values(row.statusCounts ?? {});
    if (!statuses.every((count) => Number.isSafeInteger(count) && count >= 0)
        || statuses.reduce((sum, count) => sum + count, 0) !== row.total) {
      throw new Error(`${row.id}: status counts must partition the denominator.`);
    }
    if (!Array.isArray(row.sourceEvidence) || row.sourceEvidence.length === 0
        || row.sourceEvidence.some((item) => typeof item.path !== 'string'
          || !/^[0-9a-f]{64}$/u.test(item.sha256))) {
      throw new Error(`${row.id}: source evidence requires a path and SHA-256 digest.`);
    }
  }

  const normalizationCandidates = optionalCount(
    row.normalizationCandidates, `${row.id} normalizationCandidates`,
  );
  if (row.total === null && normalizationCandidates !== null) {
    throw new Error(`${row.id}: an unexecuted row cannot report normalization candidates.`);
  }
  if (row.total !== null && normalizationCandidates !== null && normalizationCandidates > row.total) {
    throw new Error(`${row.id}: normalizationCandidates cannot exceed total.`);
  }
  const expectedNormalizationRate = row.total > 0 && normalizationCandidates !== null
    ? normalizationCandidates / row.total : null;
  const expectedDirectSymbolicRate = legacyDirectSymbolicRate(
    classification, normalizationCandidates, row.total,
  );
  if (classification.inputRoute !== BENCHMARK_INPUT_ROUTES.RAW_LANGUAGE
      && (normalizationCandidates !== null || row.normalizationCandidateRate !== null)) {
    throw new Error(`${row.id}: normalization coverage is defined only for raw-language input.`);
  }
  if (!sameMetric(row.normalizationCandidateRate, expectedNormalizationRate)
      || !sameMetric(row.directSymbolicRate, expectedDirectSymbolicRate)) {
    throw new Error(`${row.id}: direct-language route metrics are inconsistent with their counts.`);
  }

  const agentInvocations = optionalCount(row.agentInvocations, `${row.id} agentInvocations`);
  if (row.total === null && agentInvocations !== null) {
    throw new Error(`${row.id}: an unexecuted row cannot report Language Agent invocations.`);
  }
  if (row.total !== null && agentInvocations !== null && agentInvocations > row.total) {
    throw new Error(`${row.id}: agentInvocations cannot exceed total.`);
  }
  const expectedAgentInvocationRate = row.total > 0 && agentInvocations !== null
    ? agentInvocations / row.total : null;
  if (!sameMetric(row.agentInvocationRate, expectedAgentInvocationRate)) {
    throw new Error(`${row.id}: agentInvocationRate is inconsistent with agentInvocations.`);
  }
  if (!Array.isArray(row.selectedMethods)
      || row.selectedMethods.some((method) => typeof method !== 'string' || !method)) {
    throw new Error(`${row.id}: selectedMethods must be an array of method identifiers.`);
  }
  validateKbVersions(row.usedKbVersions, `${row.id} usedKbVersions`);
  validateKbVersions(row.selectedKbVersions, `${row.id} selectedKbVersions`);
  if (Number.isInteger(row.completionCount)) {
    if (row.correct !== null || !Number.isFinite(row.completionRate)
        || !sameMetric(row.completionRate, row.completionCount / row.total)) {
      throw new Error(`${row.id}: completion evidence must remain separate from unavailable accuracy.`);
    }
  }
  if (!row.evidenceState || typeof row.diagnosis !== 'string' || !row.diagnosis.trim()) {
    throw new Error(`${row.id}: evidence state and diagnosis are required.`);
  }
  if (row.checkpointState && ![
    'current', 'historical-stale', 'historical-unrecoverable', 'historical-unverified',
    'invalid', 'unavailable',
  ].includes(row.checkpointState)) throw new Error(`${row.id}: unsupported checkpoint state.`);
  if (row.resultOrigin === 'stored-receipt' && !row.checkpointState) {
    throw new Error(`${row.id}: every stored receipt requires an explicit checkpoint state.`);
  }
  if (row.resultOrigin === 'current-execution') {
    assertBenchmarkStrategyConfiguration(row.strategyConfiguration);
  } else if (row.strategyConfiguration !== undefined && row.strategyConfiguration !== null) {
    assertBenchmarkStrategyConfiguration(row.strategyConfiguration, { requireCurrentCatalog: false });
  }
  if (options.requireExecutionResources && row.resultOrigin === 'current-execution') {
    if (!Number.isFinite(row.resourceEvidence?.sampledPeakRssBytes)
        || !Number.isFinite(row.resourceEvidence?.wallMilliseconds)
        || !Number.isFinite(row.resourcePolicy?.requestedMemoryMb)) {
      throw new Error(`${row.id}: a published current execution requires measured resources.`);
    }
    if (typeof row.replayCommand !== 'string' || !row.replayCommand
        || row.behaviorDependency?.format !== 'eslm-benchmark-behavior-identity-v1'
        || !/^[0-9a-f]{64}$/u.test(row.behaviorDependency?.digest)) {
      throw new Error(`${row.id}: a published current execution requires replay and behavior identity.`);
    }
  }
  return true;
}

export function validatePublicBenchmarkRows(rows, requestedIds, options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Public benchmark report requires rows.');
  const ids = rows.map((row) => row.id);
  if (new Set(ids).size !== ids.length) throw new Error('Public benchmark report contains duplicate row ids.');
  const requested = [...requestedIds];
  if (requested.length !== ids.length || requested.some((id) => !ids.includes(id))) {
    throw new Error('Public benchmark report rows differ from the requested benchmark set.');
  }
  rows.forEach((row) => validatePublicBenchmarkRow(row, options));
  return true;
}
