import { assertBenchmarkBehaviorIdentity } from './benchmark-execution-identity.mjs';

export const INTERNAL_EVALUATION_REPORT_PROTOCOL = 'eslm-evaluation-report-v3';
export const INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL = 'eslm-benchmark-report-v3';
export const INTERNAL_REGRESSION_PROTOCOL = 'eslm-internal-regression-v2';

const RAW_DIGEST = /^[0-9a-f]{64}$/u;
const MAXIMUM_CASES = 100_000;

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exactFields(value, fields, path) {
  record(value, path);
  const actual = Object.keys(value).toSorted();
  const expected = [...fields].toSorted();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function boundedText(value, path, maximum = 4_096) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function isoTimestamp(value, path) {
  boundedText(value, path, 32);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      || new Date(value).toISOString() !== value) {
    throw new TypeError(`${path} must be an exact canonical UTC ISO timestamp.`);
  }
}

function count(value, path, maximum = MAXIMUM_CASES) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function rate(value, path, nullable = false) {
  if (nullable && value === null) return;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${path} must be ${nullable ? 'null or ' : ''}a finite rate from zero through one.`);
  }
}

function jsonValue(value, path, depth = 0) {
  if (depth > 12 || value === undefined || typeof value === 'function'
      || typeof value === 'symbol' || typeof value === 'bigint'
      || typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`${path} must be bounded JSON.`);
  }
  if (typeof value === 'string' && Buffer.byteLength(value, 'utf8') > 16_384) {
    throw new TypeError(`${path} contains oversized text.`);
  }
  if (value === null || typeof value !== 'object') return;
  if (!Array.isArray(value)) record(value, path);
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  let observed = 0;
  for (const [key, item] of entries) {
    observed += 1;
    if (observed > 2_048) throw new TypeError(`${path} contains too many values.`);
    jsonValue(item, `${path}.${key}`, depth + 1);
  }
}

function assertDataset(value, path, evaluation) {
  exactFields(value, evaluation ? ['path', 'sha256', 'authoredFixture'] : ['path', 'sha256'], path);
  boundedText(value.path, `${path}.path`, 2_048);
  if (typeof value.sha256 !== 'string' || !RAW_DIGEST.test(value.sha256)) {
    throw new TypeError(`${path}.sha256 must be a raw lowercase SHA-256 digest.`);
  }
  if (evaluation && value.authoredFixture !== true) {
    throw new TypeError(`${path}.authoredFixture must be true.`);
  }
}

function assertModel(value, path) {
  exactFields(value, ['id', 'knowledgeBases', 'comparable'], path);
  boundedText(value.id, `${path}.id`, 256);
  if (!Array.isArray(value.knowledgeBases) || value.knowledgeBases.length > 64
      || value.knowledgeBases.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 256)
      || new Set(value.knowledgeBases).size !== value.knowledgeBases.length
      || JSON.stringify(value.knowledgeBases) !== JSON.stringify(value.knowledgeBases.toSorted())) {
    throw new TypeError(`${path}.knowledgeBases must be a bounded unique canonical string array.`);
  }
  if (value.comparable !== false) {
    throw new TypeError(`${path}.comparable must remain false for an internal authored fixture.`);
  }
}

function assertBase(report, format, caseField, passedField, evaluation) {
  const fields = [
    'format', 'protocol', 'createdAt', 'evidenceRegime', 'claimScope', 'behaviorIdentity',
    'dataset', 'model', 'total', passedField, 'accuracy', caseField,
    ...(evaluation ? ['durationMs'] : ['language']),
  ];
  exactFields(report, fields, 'Internal authored report');
  if (report.format !== format || report.protocol !== INTERNAL_REGRESSION_PROTOCOL
      || report.evidenceRegime !== 'internal-authored-smoke-fixture'
      || report.claimScope !== 'implementation-regression-only') {
    throw new TypeError('Internal authored report identity or claim scope is invalid.');
  }
  isoTimestamp(report.createdAt, 'Internal authored report createdAt');
  assertBenchmarkBehaviorIdentity(report.behaviorIdentity, 'Internal authored report behaviorIdentity');
  assertDataset(report.dataset, 'Internal authored report dataset', evaluation);
  assertModel(report.model, 'Internal authored report model');
  count(report.total, 'Internal authored report total');
  count(report[passedField], `Internal authored report ${passedField}`, report.total);
  rate(report.accuracy, 'Internal authored report accuracy');
  if (report.total < 1 || report.accuracy !== report[passedField] / report.total) {
    throw new TypeError('Internal authored report denominator or accuracy is inconsistent.');
  }
  if (!Array.isArray(report[caseField]) || report[caseField].length !== report.total) {
    throw new TypeError(`Internal authored report ${caseField} must preserve the complete denominator.`);
  }
}

function assertUniqueCaseIds(rows, path) {
  const ids = new Set();
  for (const row of rows) {
    boundedText(row.id, `${path}.id`, 512);
    if (ids.has(row.id)) throw new TypeError(`${path} contains duplicate case ID ${row.id}.`);
    ids.add(row.id);
  }
}

export function assertInternalEvaluationReport(report) {
  assertBase(report, INTERNAL_EVALUATION_REPORT_PROTOCOL, 'outcomes', 'passed', true);
  if (!Number.isFinite(report.durationMs) || report.durationMs < 0) {
    throw new TypeError('Internal evaluation durationMs must be finite and non-negative.');
  }
  for (const outcome of report.outcomes) {
    exactFields(outcome, ['id', 'pass', 'expected', 'actual', 'answer'], 'Internal evaluation outcome');
    if (typeof outcome.pass !== 'boolean') throw new TypeError('Internal evaluation outcome.pass must be boolean.');
    jsonValue(outcome.expected, 'Internal evaluation outcome.expected');
    jsonValue(outcome.actual, 'Internal evaluation outcome.actual');
    jsonValue(outcome.answer, 'Internal evaluation outcome.answer');
  }
  assertUniqueCaseIds(report.outcomes, 'Internal evaluation outcomes');
  if (report.outcomes.filter((item) => item.pass).length !== report.passed) {
    throw new TypeError('Internal evaluation passed count does not match its outcomes.');
  }
  return report;
}

function expectedLanguageMetrics(results) {
  const attempts = results.filter((item) => item.normalizationAttempted);
  const direct = results.filter((item) => !item.normalizationAttempted);
  const normalized = results.filter((item) => item.languageRoute === 'language-agent-normalized');
  const accuracy = (rows) => rows.length ? rows.filter((item) => item.pass).length / rows.length : null;
  const routes = Object.fromEntries([...new Set(results.map((item) => item.languageRoute))]
    .sort().map((route) => [route, results.filter((item) => item.languageRoute === route).length]));
  return {
    directSymbolicCases: direct.length,
    directSymbolicRate: results.length ? direct.length / results.length : 0,
    specialAnalysisCases: attempts.length,
    specialAnalysisRate: results.length ? attempts.length / results.length : 0,
    externalInvocations: attempts.filter((item) => item.normalizationExternalInvocation).length,
    cacheHits: attempts.filter((item) => item.normalizationCacheHit).length,
    acceptedNormalizations: normalized.length,
    rejectedNormalizations: attempts.filter((item) => item.normalizationStatus !== 'accepted').length,
    directAccuracy: accuracy(direct),
    normalizedAccuracy: accuracy(normalized),
    routes,
  };
}

function assertBenchmarkResult(result) {
  record(result, 'Internal authored benchmark result');
  const allowed = new Set([
    'id', 'pass', 'actual', 'status', 'languageRoute', 'normalizationAttempted',
    'normalizationStatus', 'normalizationCacheHit', 'normalizationExternalInvocation',
  ]);
  const unexpected = Object.keys(result).filter((field) => !allowed.has(field));
  if (unexpected.length > 0) {
    throw new TypeError(`Internal authored benchmark result has unsupported fields: ${unexpected.join(', ')}.`);
  }
  for (const field of [
    'id', 'pass', 'actual', 'status', 'languageRoute', 'normalizationAttempted',
    'normalizationExternalInvocation',
  ]) {
    if (!(field in result)) throw new TypeError(`Internal authored benchmark result requires ${field}.`);
  }
  if (typeof result.pass !== 'boolean' || typeof result.normalizationAttempted !== 'boolean'
      || typeof result.normalizationExternalInvocation !== 'boolean') {
    throw new TypeError('Internal authored benchmark result flags must be boolean.');
  }
  boundedText(result.status, 'Internal authored benchmark result.status', 256);
  boundedText(result.languageRoute, 'Internal authored benchmark result.languageRoute', 256);
  jsonValue(result.actual, 'Internal authored benchmark result.actual');
  if ('normalizationCacheHit' in result && typeof result.normalizationCacheHit !== 'boolean') {
    throw new TypeError('Internal authored benchmark result.normalizationCacheHit must be boolean.');
  }
  if ('normalizationStatus' in result) {
    boundedText(result.normalizationStatus, 'Internal authored benchmark result.normalizationStatus', 256);
  }
  if (!result.normalizationAttempted
      && (result.normalizationExternalInvocation
        || 'normalizationStatus' in result || 'normalizationCacheHit' in result)) {
    throw new TypeError('A direct authored benchmark row cannot carry normalization activity.');
  }
  if (result.normalizationCacheHit === true
      && (!result.normalizationAttempted || result.normalizationExternalInvocation)) {
    throw new TypeError('A cached authored benchmark row must be attempted and cannot claim an external invocation.');
  }
  if (result.normalizationExternalInvocation
      && (!result.normalizationAttempted || result.normalizationCacheHit === true)) {
    throw new TypeError('An external authored benchmark invocation requires an uncached normalization attempt.');
  }
}

export function assertInternalAuthoredBenchmarkReport(report) {
  assertBase(report, INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL, 'results', 'correct', false);
  for (const result of report.results) assertBenchmarkResult(result);
  assertUniqueCaseIds(report.results, 'Internal authored benchmark results');
  if (report.results.filter((item) => item.pass).length !== report.correct) {
    throw new TypeError('Internal authored benchmark correct count does not match its results.');
  }
  exactFields(report.language, [
    'directSymbolicCases', 'directSymbolicRate', 'specialAnalysisCases', 'specialAnalysisRate',
    'externalInvocations', 'cacheHits', 'acceptedNormalizations', 'rejectedNormalizations',
    'directAccuracy', 'normalizedAccuracy', 'routes',
  ], 'Internal authored benchmark language metrics');
  const expected = expectedLanguageMetrics(report.results);
  if (JSON.stringify(report.language) !== JSON.stringify(expected)) {
    throw new TypeError('Internal authored benchmark language metrics do not reproduce its case evidence.');
  }
  return report;
}
