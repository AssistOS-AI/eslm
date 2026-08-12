import { assertWorkPolicy } from '../runtime/work-policy.mjs';
import { assertBenchmarkStrategyConfiguration } from './benchmark-strategy-configuration.mjs';

const REPORT_PROTOCOL = 'eslm-generated-heuristic-benchmark-report-v1';
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RAW_DIGEST = /^[0-9a-f]{64}$/u;
const REPORT_FIELDS = Object.freeze([
  'format', 'createdAt', 'evidenceRegime', 'benchmarkComparable', 'claimScope',
  'generator', 'execution', 'workPolicy', 'strategyConfiguration', 'total', 'passed',
  'failed', 'accuracy', 'aggregates', 'failureClusters', 'representativeFailures',
  'conclusions',
]);
const AGGREGATE_DIMENSIONS = Object.freeze([
  'domain', 'technique', 'targetFamily', 'oracleLevel', 'status', 'route', 'confidence',
  'resource', 'complexity',
]);
const FAILURE_STAGES = new Set([
  'execution', 'resource', 'route', 'status', 'candidate', 'strategy-family',
  'semantic-query', 'request-plan', 'safety', 'answer',
]);

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
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

function count(value, path, maximum = 20_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function rate(value, path) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${path} must be a finite rate from zero through one.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function stringArray(value, path, maximum) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || !item || item.length > 256)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique string array.`);
  }
}

function jsonValue(value, path, depth = 0) {
  if (depth > 12 || value === undefined || typeof value === 'function'
      || typeof value === 'symbol' || typeof value === 'bigint'
      || typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`${path} must be bounded JSON.`);
  }
  if (value === null || typeof value !== 'object') return;
  if (!Array.isArray(value)) record(value, path);
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  let observed = 0;
  for (const [key, item] of entries) {
    observed += 1;
    if (observed > 2_048) throw new TypeError(`${path} has too many values.`);
    jsonValue(item, `${path}.${key}`, depth + 1);
  }
}

function validateGenerator(generator, total) {
  exactFields(generator, [
    'format', 'seed', 'requestedCases', 'casesGenerated', 'definitionDigest',
    'suiteDigest', 'domains', 'techniques',
  ], 'Generated benchmark generator');
  if (generator.format !== 'eslm-generated-heuristic-benchmark-suite-v1') {
    throw new TypeError('Generated benchmark uses an unsupported generator protocol.');
  }
  boundedText(generator.seed, 'Generated benchmark seed', 128);
  count(generator.requestedCases, 'Generated requested cases');
  count(generator.casesGenerated, 'Generated cases');
  count(generator.domains, 'Generated domains', 256);
  count(generator.techniques, 'Generated techniques', 256);
  if (generator.requestedCases !== total || generator.casesGenerated !== total
      || generator.domains < 2 || generator.techniques < 2) {
    throw new TypeError('Generated benchmark denominator or structural coverage is inconsistent.');
  }
  digest(generator.definitionDigest, 'Generator definition digest');
  digest(generator.suiteDigest, 'Generated suite digest');
}

function validateExecution(execution, total) {
  exactFields(execution, [
    'casesExecuted', 'grounding', 'externalLanguageAgent', 'replayCommand',
    'runtimeIdentity', 'behaviorIdentity', 'wallMilliseconds', 'startRssBytes',
    'endRssBytes', 'sampledPeakRssBytes',
  ], 'Generated benchmark execution');
  count(execution.casesExecuted, 'Executed cases');
  if (execution.casesExecuted !== total || execution.grounding !== false
      || execution.externalLanguageAgent !== false) {
    throw new TypeError('Generated benchmark must execute every case through the offline ungrounded route.');
  }
  boundedText(execution.replayCommand, 'Generated benchmark replay command');
  exactFields(execution.runtimeIdentity, ['modelId', 'knowledgeBases'], 'Generated runtime identity');
  boundedText(execution.runtimeIdentity.modelId, 'Generated model identity', 256);
  stringArray(execution.runtimeIdentity.knowledgeBases, 'Generated knowledge bases', 64);
  record(execution.behaviorIdentity, 'Generated behavior identity');
  if (typeof execution.behaviorIdentity.digest !== 'string'
      || !RAW_DIGEST.test(execution.behaviorIdentity.digest)) {
    throw new TypeError('Generated behavior digest must be a raw SHA-256 digest.');
  }
  if (execution.behaviorIdentity.format !== 'eslm-benchmark-behavior-identity-v1') {
    throw new TypeError('Generated benchmark behavior identity uses an unsupported format.');
  }
  for (const field of ['wallMilliseconds', 'startRssBytes', 'endRssBytes', 'sampledPeakRssBytes']) {
    if (!Number.isFinite(execution[field]) || execution[field] < 0) {
      throw new TypeError(`Generated execution ${field} must be finite and non-negative.`);
    }
  }
}

function validateAggregateRows(rows, dimension, total) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 512) {
    throw new TypeError(`Generated ${dimension} aggregate must be a bounded non-empty array.`);
  }
  let denominator = 0;
  let previous = '';
  for (const row of rows) {
    exactFields(row, ['key', 'total', 'passed', 'failed', 'passRate'], `${dimension} aggregate row`);
    boundedText(row.key, `${dimension} aggregate key`, 256);
    count(row.total, `${dimension} aggregate total`);
    count(row.passed, `${dimension} aggregate passed`);
    count(row.failed, `${dimension} aggregate failed`);
    rate(row.passRate, `${dimension} aggregate pass rate`);
    if (row.key <= previous || row.passed + row.failed !== row.total
        || row.passRate !== row.passed / row.total) {
      throw new TypeError(`Generated ${dimension} aggregate is not canonical or arithmetically exact.`);
    }
    denominator += row.total;
    previous = row.key;
  }
  if (denominator !== total) throw new TypeError(`Generated ${dimension} aggregate loses cases.`);
}

function validateCluster(cluster, total) {
  exactFields(cluster, [
    'id', 'stage', 'code', 'targetFamily', 'count', 'representativeCaseIds',
    'techniques', 'domains',
  ], 'Generated failure cluster');
  for (const field of ['id', 'code', 'targetFamily']) boundedText(cluster[field], `Cluster ${field}`, 256);
  if (!FAILURE_STAGES.has(cluster.stage)) throw new TypeError('Generated cluster uses an unknown failure stage.');
  count(cluster.count, 'Generated cluster count', total);
  if (cluster.count < 1) throw new TypeError('Generated failure cluster must contain at least one case.');
  stringArray(cluster.representativeCaseIds, 'Generated cluster representative IDs', 3);
  for (const dimension of ['techniques', 'domains']) {
    if (!Array.isArray(cluster[dimension]) || cluster[dimension].length < 1
        || cluster[dimension].length > 256) {
      throw new TypeError(`Generated cluster ${dimension} must be bounded and non-empty.`);
    }
    let sum = 0;
    for (const item of cluster[dimension]) {
      const label = dimension === 'techniques' ? 'technique' : 'domain';
      exactFields(item, [label, 'count'], `Cluster ${dimension} item`);
      boundedText(item[label], `Cluster ${label}`, 256);
      count(item.count, `Cluster ${label} count`, total);
      sum += item.count;
    }
    if (sum !== cluster.count) throw new TypeError(`Generated cluster ${dimension} counts do not sum.`);
  }
}

function validateRepresentative(value) {
  exactFields(value, [
    'id', 'domain', 'technique', 'targetFamily', 'input', 'oracle', 'actual', 'failures',
  ], 'Generated representative failure');
  for (const field of ['id', 'domain', 'technique', 'targetFamily']) {
    boundedText(value[field], `Representative ${field}`, 256);
  }
  boundedText(value.input, 'Representative input', 4_096);
  jsonValue(value.oracle, 'Representative oracle');
  jsonValue(value.actual, 'Representative actual result');
  if (!Array.isArray(value.failures) || value.failures.length < 1 || value.failures.length > 16) {
    throw new TypeError('Representative failures must contain bounded diagnostics.');
  }
  for (const failure of value.failures) {
    exactFields(failure, ['stage', 'code', 'explanation'], 'Representative failure diagnostic');
    if (!FAILURE_STAGES.has(failure.stage)) throw new TypeError('Representative failure stage is unknown.');
    boundedText(failure.code, 'Representative failure code', 256);
    boundedText(failure.explanation, 'Representative failure explanation', 1_024);
  }
}

export function assertGeneratedHeuristicBenchmarkReport(report) {
  exactFields(report, REPORT_FIELDS, 'Generated heuristic benchmark report');
  if (report.format !== REPORT_PROTOCOL || report.evidenceRegime !== 'internal-generated-development'
      || report.benchmarkComparable !== false
      || report.claimScope !== 'heuristic-strategy-development-and-regression-only'
      || Number.isNaN(Date.parse(report.createdAt))) {
    throw new TypeError('Generated benchmark report identity or claim scope is invalid.');
  }
  count(report.total, 'Generated benchmark total');
  count(report.passed, 'Generated benchmark passed', report.total);
  count(report.failed, 'Generated benchmark failed', report.total);
  rate(report.accuracy, 'Generated benchmark accuracy');
  if (report.total < 1 || report.passed + report.failed !== report.total
      || report.accuracy !== report.passed / report.total) {
    throw new TypeError('Generated benchmark top-level arithmetic is inconsistent.');
  }
  validateGenerator(report.generator, report.total);
  validateExecution(report.execution, report.total);
  assertWorkPolicy(report.workPolicy);
  assertBenchmarkStrategyConfiguration(report.strategyConfiguration);
  exactFields(report.aggregates, AGGREGATE_DIMENSIONS, 'Generated benchmark aggregates');
  for (const dimension of AGGREGATE_DIMENSIONS) {
    validateAggregateRows(report.aggregates[dimension], dimension, report.total);
  }
  if (!Array.isArray(report.failureClusters) || report.failureClusters.length > 512) {
    throw new TypeError('Generated benchmark failure clusters must be bounded.');
  }
  for (const cluster of report.failureClusters) validateCluster(cluster, report.total);
  if (report.failureClusters.reduce((sum, cluster) => sum + cluster.count, 0) !== report.failed) {
    throw new TypeError('Generated failure clusters must preserve the failed denominator exactly.');
  }
  if (!Array.isArray(report.representativeFailures) || report.representativeFailures.length > 100) {
    throw new TypeError('Generated representative failures must be bounded.');
  }
  for (const representative of report.representativeFailures) validateRepresentative(representative);
  if (!Array.isArray(report.conclusions) || report.conclusions.length > 12) {
    throw new TypeError('Generated benchmark conclusions must be bounded.');
  }
  for (const [index, conclusion] of report.conclusions.entries()) {
    exactFields(conclusion, [
      'rank', 'clusterId', 'count', 'shareOfSuite', 'recommendation', 'promotionGate',
    ], 'Generated benchmark conclusion');
    if (conclusion.rank !== index + 1) throw new TypeError('Generated conclusions must have canonical ranks.');
    boundedText(conclusion.clusterId, 'Generated conclusion cluster', 256);
    count(conclusion.count, 'Generated conclusion count', report.total);
    rate(conclusion.shareOfSuite, 'Generated conclusion suite share');
    if (conclusion.shareOfSuite !== conclusion.count / report.total) {
      throw new TypeError('Generated conclusion share is inconsistent.');
    }
    boundedText(conclusion.recommendation, 'Generated conclusion recommendation', 1_024);
    boundedText(conclusion.promotionGate, 'Generated conclusion promotion gate', 1_024);
  }
  return report;
}
