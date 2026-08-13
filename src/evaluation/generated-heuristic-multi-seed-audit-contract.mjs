import { assertWorkPolicy } from '../runtime/work-policy.mjs';
import { assertBenchmarkBehaviorIdentity } from './benchmark-execution-identity.mjs';
import { assertBenchmarkStrategyConfiguration } from './benchmark-strategy-configuration.mjs';
import { GENERATED_HEURISTIC_ORACLE_LEVELS } from './generated-heuristic-oracle-contract.mjs';
import { sha256, stableStringify } from '../util.mjs';

export const GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL =
  'eslm-generated-heuristic-multi-seed-audit-v1';

const PLAN_PROTOCOL = 'eslm-generated-heuristic-multi-seed-plan-v1';
const SHARED_IDENTITY_PROTOCOL = 'eslm-generated-heuristic-multi-seed-identity-v1';
const RUN_PROTOCOL = 'eslm-generated-heuristic-seed-run-v1';
const AGGREGATE_PROTOCOL = 'eslm-generated-heuristic-multi-seed-aggregate-v1';
const REPORT_PROTOCOL = 'eslm-generated-heuristic-benchmark-report-v1';
const GENERATOR_PROTOCOL = 'eslm-generated-heuristic-benchmark-suite-v1';
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const MAXIMUM_SEEDS = 16;
const MAXIMUM_CASES_PER_SEED = 20_000;
const MAXIMUM_TOTAL_CASES = MAXIMUM_SEEDS * MAXIMUM_CASES_PER_SEED;
const MAXIMUM_RECEIPT_BYTES = 8 * 1_024 * 1_024;
const ORACLE_LEVELS = new Set(GENERATED_HEURISTIC_ORACLE_LEVELS);
const COUNT_DIMENSIONS = Object.freeze(['oracleLevel', 'route', 'status']);
const FAILURE_STAGES = new Set([
  'execution', 'resource', 'route', 'status', 'candidate', 'strategy-family',
  'semantic-query', 'request-plan', 'safety', 'answer',
]);

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
  if (stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function boundedText(value, path, maximum = 4_096) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function count(value, path, maximum = MAXIMUM_TOTAL_CASES) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function rate(value, path) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${path} must be a finite rate from zero through one.`);
  }
}

function assertDigest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function stringArray(value, path, maximum = 256) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum
      || value.some((item) => typeof item !== 'string' || !item || item.length > 256)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique string array.`);
  }
}

function assertRuntimeIdentity(value, path) {
  exactFields(value, ['modelId', 'knowledgeBases'], path);
  boundedText(value.modelId, `${path} model`, 256);
  if (!Array.isArray(value.knowledgeBases) || value.knowledgeBases.length > 64
      || value.knowledgeBases.some((identity) => typeof identity !== 'string' || !identity)
      || new Set(value.knowledgeBases).size !== value.knowledgeBases.length) {
    throw new TypeError(`${path} knowledge bases must be a bounded unique string array.`);
  }
}

function assertGenerator(value, total, path) {
  exactFields(value, [
    'format', 'seed', 'requestedCases', 'casesGenerated', 'uniqueInputs', 'definitionDigest',
    'suiteDigest', 'domains', 'techniques', 'observedTargetFamilies', 'observedOracleLevels',
    'observedTechniqueDomainCells',
  ], path);
  if (value.format !== GENERATOR_PROTOCOL) throw new TypeError(`${path} uses an unsupported format.`);
  boundedText(value.seed, `${path} seed`, 128);
  for (const field of ['requestedCases', 'casesGenerated', 'uniqueInputs']) {
    count(value[field], `${path} ${field}`, MAXIMUM_CASES_PER_SEED);
  }
  if (value.requestedCases !== total || value.casesGenerated !== total || value.uniqueInputs !== total) {
    throw new TypeError(`${path} loses its fixed denominator or unique-input contract.`);
  }
  for (const field of [
    'domains', 'techniques', 'observedTargetFamilies', 'observedOracleLevels',
    'observedTechniqueDomainCells',
  ]) count(value[field], `${path} ${field}`, 65_536);
  if (value.domains < 2 || value.techniques < 2 || value.observedTargetFamilies < 1
      || value.observedOracleLevels < 1 || value.observedOracleLevels > ORACLE_LEVELS.size
      || value.observedTechniqueDomainCells < 1
      || value.observedTechniqueDomainCells > Math.min(total, value.domains * value.techniques)) {
    throw new TypeError(`${path} has inconsistent structural coverage.`);
  }
  assertDigest(value.definitionDigest, `${path} definition digest`);
  assertDigest(value.suiteDigest, `${path} suite digest`);
}

function assertExecution(value, total, path) {
  exactFields(value, [
    'casesExecuted', 'grounding', 'externalLanguageAgent', 'replayCommand', 'runtimeIdentity',
    'behaviorIdentity', 'wallMilliseconds', 'startRssBytes', 'endRssBytes', 'sampledPeakRssBytes',
  ], path);
  count(value.casesExecuted, `${path} cases`, MAXIMUM_CASES_PER_SEED);
  if (value.casesExecuted !== total || value.grounding !== false || value.externalLanguageAgent !== false) {
    throw new TypeError(`${path} must be a complete offline, ungrounded execution.`);
  }
  boundedText(value.replayCommand, `${path} replay command`);
  assertRuntimeIdentity(value.runtimeIdentity, `${path} runtime identity`);
  assertBenchmarkBehaviorIdentity(value.behaviorIdentity, `${path} behavior identity`);
  for (const field of ['wallMilliseconds', 'startRssBytes', 'endRssBytes', 'sampledPeakRssBytes']) {
    if (!Number.isFinite(value[field]) || value[field] < 0) {
      throw new TypeError(`${path} ${field} must be finite and non-negative.`);
    }
  }
}

function assertCountRows(rows, dimension, total, path) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 512) {
    throw new TypeError(`${path} must be a bounded non-empty array.`);
  }
  let denominator = 0;
  let previous = '';
  for (const row of rows) {
    exactFields(row, ['key', 'total', 'passed', 'failed', 'passRate'], `${path} row`);
    boundedText(row.key, `${path} key`, 256);
    if (dimension === 'oracleLevel' && !ORACLE_LEVELS.has(row.key)) {
      throw new TypeError(`${path} contains an unknown oracle level.`);
    }
    count(row.total, `${path} total`);
    count(row.passed, `${path} passed`);
    count(row.failed, `${path} failed`);
    rate(row.passRate, `${path} pass rate`);
    if (row.key <= previous || row.passed + row.failed !== row.total
        || row.passRate !== row.passed / row.total) {
      throw new TypeError(`${path} is not canonical or arithmetically exact.`);
    }
    denominator += row.total;
    previous = row.key;
  }
  if (denominator !== total) throw new TypeError(`${path} loses cases from its denominator.`);
}

function assertCountSet(value, total, path) {
  exactFields(value, COUNT_DIMENSIONS, path);
  for (const dimension of COUNT_DIMENSIONS) {
    assertCountRows(value[dimension], dimension, total, `${path} ${dimension}`);
  }
}

function assertDimensionCounts(rows, field, total, path) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 512) {
    throw new TypeError(`${path} must be bounded and non-empty.`);
  }
  let sum = 0;
  const seen = new Set();
  for (const row of rows) {
    exactFields(row, [field, 'count'], `${path} row`);
    boundedText(row[field], `${path} ${field}`, 256);
    count(row.count, `${path} count`);
    if (seen.has(row[field])) throw new TypeError(`${path} contains a duplicate ${field}.`);
    seen.add(row[field]);
    sum += row.count;
  }
  if (sum !== total) throw new TypeError(`${path} counts do not sum to the cluster total.`);
}

function assertRunFailureCluster(value, total) {
  exactFields(value, [
    'id', 'stage', 'code', 'targetFamily', 'count', 'representativeCaseIds',
    'techniques', 'domains',
  ], 'Seed-run failure cluster');
  for (const field of ['id', 'code', 'targetFamily']) boundedText(value[field], `Cluster ${field}`, 256);
  if (!FAILURE_STAGES.has(value.stage)) throw new TypeError('Failure cluster uses an unknown stage.');
  count(value.count, 'Failure cluster count', total);
  if (value.count < 1) throw new TypeError('Failure cluster count must be positive.');
  stringArray(value.representativeCaseIds, 'Failure cluster representative IDs', 3);
  assertDimensionCounts(value.techniques, 'technique', value.count, 'Failure cluster techniques');
  assertDimensionCounts(value.domains, 'domain', value.count, 'Failure cluster domains');
}

function assertAggregateFailureCluster(value, total, planSeeds) {
  exactFields(value, [
    'id', 'stage', 'code', 'targetFamily', 'count', 'seedCount', 'seeds', 'techniques', 'domains',
  ], 'Aggregate failure cluster');
  for (const field of ['id', 'code', 'targetFamily']) boundedText(value[field], `Aggregate cluster ${field}`, 256);
  if (!FAILURE_STAGES.has(value.stage)) throw new TypeError('Aggregate failure cluster uses an unknown stage.');
  count(value.count, 'Aggregate failure cluster count', total);
  count(value.seedCount, 'Aggregate failure cluster seed count', planSeeds.length);
  stringArray(value.seeds, 'Aggregate failure cluster seeds', planSeeds.length);
  if (value.seedCount !== value.seeds.length
      || value.seeds.some((seed) => !planSeeds.includes(seed))) {
    throw new TypeError('Aggregate failure cluster seed coverage is inconsistent.');
  }
  assertDimensionCounts(value.techniques, 'technique', value.count, 'Aggregate cluster techniques');
  assertDimensionCounts(value.domains, 'domain', value.count, 'Aggregate cluster domains');
}

function aggregateRows(runs, dimension) {
  const values = new Map();
  for (const run of runs) {
    for (const row of run.counts[dimension]) {
      const current = values.get(row.key) ?? { key: row.key, total: 0, passed: 0, failed: 0 };
      current.total += row.total;
      current.passed += row.passed;
      current.failed += row.failed;
      values.set(row.key, current);
    }
  }
  return [...values.values()].toSorted((left, right) => left.key.localeCompare(right.key))
    .map((row) => ({ ...row, passRate: row.passed / row.total }));
}

function dimensionRows(map, field) {
  return [...map.entries()].map(([label, itemCount]) => ({ [field]: label, count: itemCount }))
    .toSorted((left, right) => right.count - left.count || left[field].localeCompare(right[field]));
}

function aggregateFailureClusters(runs) {
  const values = new Map();
  for (const run of runs) {
    for (const cluster of run.failureClusters) {
      const current = values.get(cluster.id) ?? {
        id: cluster.id, stage: cluster.stage, code: cluster.code, targetFamily: cluster.targetFamily,
        count: 0, seeds: new Set(), techniques: new Map(), domains: new Map(),
      };
      if (current.stage !== cluster.stage || current.code !== cluster.code
          || current.targetFamily !== cluster.targetFamily) {
        throw new TypeError('One failure-cluster identity has inconsistent semantics across seeds.');
      }
      current.count += cluster.count;
      current.seeds.add(run.seed);
      for (const row of cluster.techniques) {
        current.techniques.set(row.technique, (current.techniques.get(row.technique) ?? 0) + row.count);
      }
      for (const row of cluster.domains) {
        current.domains.set(row.domain, (current.domains.get(row.domain) ?? 0) + row.count);
      }
      values.set(cluster.id, current);
    }
  }
  return [...values.values()].map((cluster) => ({
    id: cluster.id, stage: cluster.stage, code: cluster.code, targetFamily: cluster.targetFamily,
    count: cluster.count, seedCount: cluster.seeds.size, seeds: [...cluster.seeds].toSorted(),
    techniques: dimensionRows(cluster.techniques, 'technique'),
    domains: dimensionRows(cluster.domains, 'domain'),
  })).toSorted((left, right) => right.count - left.count || left.id.localeCompare(right.id));
}

function expectedAggregates(runs) {
  const total = runs.reduce((sum, run) => sum + run.total, 0);
  const passed = runs.reduce((sum, run) => sum + run.passed, 0);
  const failed = runs.reduce((sum, run) => sum + run.failed, 0);
  return {
    format: AGGREGATE_PROTOCOL,
    seeds: runs.length,
    total,
    passed,
    failed,
    mixedContractRate: passed / total,
    seedsWithFailures: runs.filter((run) => run.failed > 0).length,
    counts: Object.fromEntries(COUNT_DIMENSIONS.map((dimension) => [dimension, aggregateRows(runs, dimension)])),
    failureClusters: aggregateFailureClusters(runs),
  };
}

function assertPlan(value) {
  exactFields(value, ['format', 'casesPerSeed', 'seeds', 'totalPlanned', 'replayCommand'], 'Seed-audit plan');
  if (value.format !== PLAN_PROTOCOL) throw new TypeError('Seed-audit plan uses an unsupported format.');
  count(value.casesPerSeed, 'Seed-audit cases per seed', MAXIMUM_CASES_PER_SEED);
  if (value.casesPerSeed < 1) throw new TypeError('Seed-audit cases per seed must be positive.');
  stringArray(value.seeds, 'Seed-audit seeds', MAXIMUM_SEEDS);
  if (value.seeds.length < 2) throw new TypeError('Seed audit requires at least two independent seeds.');
  count(value.totalPlanned, 'Seed-audit planned denominator');
  if (value.totalPlanned !== value.casesPerSeed * value.seeds.length) {
    throw new TypeError('Seed-audit planned denominator is inconsistent.');
  }
  boundedText(value.replayCommand, 'Seed-audit replay command');
}

function assertSharedIdentity(value) {
  exactFields(value, [
    'format', 'reportFormat', 'generatorFormat', 'definitionDigest', 'behaviorIdentity',
    'runtimeIdentity', 'workPolicy', 'workPolicyDigest', 'catalog', 'selection', 'arbiters',
    'grounding', 'externalLanguageAgent',
  ], 'Seed-audit shared identity');
  if (value.format !== SHARED_IDENTITY_PROTOCOL || value.reportFormat !== REPORT_PROTOCOL
      || value.grounding !== false || value.externalLanguageAgent !== false) {
    throw new TypeError('Seed-audit shared identity uses an unsupported execution boundary.');
  }
  if (value.generatorFormat !== GENERATOR_PROTOCOL) {
    throw new TypeError('Seed-audit shared identity uses an unsupported generator format.');
  }
  assertDigest(value.definitionDigest, 'Seed-audit definition digest');
  assertBenchmarkBehaviorIdentity(value.behaviorIdentity, 'Seed-audit shared behavior identity');
  assertRuntimeIdentity(value.runtimeIdentity, 'Seed-audit shared runtime identity');
  assertWorkPolicy(value.workPolicy);
  assertDigest(value.workPolicyDigest, 'Seed-audit work-policy digest');
  if (value.workPolicyDigest !== `sha256:${sha256(stableStringify(value.workPolicy))}`) {
    throw new TypeError('Seed-audit work-policy digest does not match its snapshot.');
  }
  exactFields(value.catalog, ['format', 'digest'], 'Seed-audit catalog identity');
  boundedText(value.catalog.format, 'Seed-audit catalog format', 128);
  assertDigest(value.catalog.digest, 'Seed-audit catalog digest');
  record(value.selection, 'Seed-audit strategy selection');
  if (!Array.isArray(value.arbiters)) throw new TypeError('Seed-audit arbiters must be an array.');
}

function assertRun(value, plan) {
  exactFields(value, [
    'format', 'ordinal', 'seed', 'reportDigest', 'reportCreatedAt', 'generator', 'execution',
    'workPolicyDigest', 'strategyConfiguration', 'total', 'passed', 'failed',
    'mixedContractRate', 'counts', 'failureClusters',
  ], 'Seed-audit run');
  if (value.format !== RUN_PROTOCOL || Number.isNaN(Date.parse(value.reportCreatedAt))) {
    throw new TypeError('Seed-audit run identity is invalid.');
  }
  count(value.ordinal, 'Seed-audit run ordinal', plan.seeds.length);
  if (value.ordinal < 1 || value.seed !== plan.seeds[value.ordinal - 1]) {
    throw new TypeError('Seed-audit run order does not match the plan.');
  }
  assertDigest(value.reportDigest, 'Seed-audit source report digest');
  count(value.total, 'Seed-audit run total', MAXIMUM_CASES_PER_SEED);
  count(value.passed, 'Seed-audit run passed', value.total);
  count(value.failed, 'Seed-audit run failed', value.total);
  rate(value.mixedContractRate, 'Seed-audit run mixed-contract rate');
  if (value.total !== plan.casesPerSeed || value.passed + value.failed !== value.total
      || value.mixedContractRate !== value.passed / value.total) {
    throw new TypeError('Seed-audit run arithmetic is inconsistent.');
  }
  assertGenerator(value.generator, value.total, 'Seed-audit run generator');
  if (value.generator.seed !== value.seed) throw new TypeError('Seed-audit run generator seed differs from its plan.');
  assertExecution(value.execution, value.total, 'Seed-audit run execution');
  assertDigest(value.workPolicyDigest, 'Seed-audit run work-policy digest');
  assertBenchmarkStrategyConfiguration(value.strategyConfiguration, { requireCurrentCatalog: false });
  assertCountSet(value.counts, value.total, 'Seed-audit run counts');
  if (!Array.isArray(value.failureClusters) || value.failureClusters.length > 512) {
    throw new TypeError('Seed-audit run failure clusters must be bounded.');
  }
  for (const cluster of value.failureClusters) assertRunFailureCluster(cluster, value.total);
  if (value.failureClusters.reduce((sum, cluster) => sum + cluster.count, 0) !== value.failed) {
    throw new TypeError('Seed-audit run failure clusters lose failed cases.');
  }
}

function assertSharedRunIdentity(run, shared) {
  const configuration = run.strategyConfiguration;
  const matches = run.generator.format === shared.generatorFormat
    && run.generator.definitionDigest === shared.definitionDigest
    && stableStringify(run.execution.behaviorIdentity) === stableStringify(shared.behaviorIdentity)
    && stableStringify(run.execution.runtimeIdentity) === stableStringify(shared.runtimeIdentity)
    && run.workPolicyDigest === shared.workPolicyDigest
    && stableStringify(configuration.catalog) === stableStringify(shared.catalog)
    && stableStringify(configuration.selection) === stableStringify(shared.selection)
    && stableStringify(configuration.arbiters) === stableStringify(shared.arbiters)
    && run.execution.grounding === shared.grounding
    && run.execution.externalLanguageAgent === shared.externalLanguageAgent;
  if (!matches) throw new TypeError(`Seed ${run.seed} does not share the intended source and configuration identity.`);
}

function assertVerification(value) {
  exactFields(value, [
    'uniqueSeeds', 'distinctSuiteDigests', 'sharedDefinitionIdentity', 'sharedBehaviorIdentity',
    'sharedRuntimeIdentity', 'sharedWorkPolicyIdentity', 'sharedCatalogIdentity',
    'sharedStrategySelectionIdentity', 'sharedArbiterIdentity', 'completeDenominator',
    'allRunsShareIntendedIdentity',
  ], 'Seed-audit verification');
  if (Object.values(value).some((item) => item !== true)) {
    throw new TypeError('Every seed-audit verification gate must pass before a receipt is valid.');
  }
}

export function assertGeneratedHeuristicMultiSeedAudit(value) {
  exactFields(value, [
    'format', 'createdAt', 'evidenceRegime', 'benchmarkComparable', 'claimScope', 'plan',
    'sharedIdentity', 'runs', 'aggregates', 'verification', 'receiptDigest',
  ], 'Generated heuristic multi-seed audit');
  if (value.format !== GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL
      || value.evidenceRegime !== 'internal-generated-multi-seed-development-audit'
      || value.benchmarkComparable !== false
      || value.claimScope !== 'same-definition-cross-seed-stability-only'
      || Number.isNaN(Date.parse(value.createdAt))) {
    throw new TypeError('Generated heuristic multi-seed audit identity is invalid.');
  }
  assertPlan(value.plan);
  assertSharedIdentity(value.sharedIdentity);
  if (!Array.isArray(value.runs) || value.runs.length !== value.plan.seeds.length) {
    throw new TypeError('Seed-audit runs must cover every planned seed exactly once.');
  }
  for (const run of value.runs) {
    assertRun(run, value.plan);
    assertSharedRunIdentity(run, value.sharedIdentity);
  }
  if (new Set(value.runs.map((run) => run.generator.suiteDigest)).size !== value.runs.length) {
    throw new TypeError('Independent seed runs must have distinct suite digests.');
  }
  exactFields(value.aggregates, [
    'format', 'seeds', 'total', 'passed', 'failed', 'mixedContractRate', 'seedsWithFailures',
    'counts', 'failureClusters',
  ], 'Seed-audit aggregates');
  if (value.aggregates.format !== AGGREGATE_PROTOCOL) {
    throw new TypeError('Seed-audit aggregates use an unsupported format.');
  }
  const expected = expectedAggregates(value.runs);
  if (stableStringify(value.aggregates) !== stableStringify(expected)) {
    throw new TypeError('Seed-audit aggregates do not reproduce the complete per-seed evidence.');
  }
  for (const cluster of value.aggregates.failureClusters) {
    assertAggregateFailureCluster(cluster, value.aggregates.total, value.plan.seeds);
  }
  assertVerification(value.verification);
  assertDigest(value.receiptDigest, 'Seed-audit receipt digest');
  const core = { ...value };
  delete core.receiptDigest;
  if (value.receiptDigest !== `sha256:${sha256(stableStringify(core))}`) {
    throw new TypeError('Seed-audit receipt digest does not match its content.');
  }
  if (Buffer.byteLength(stableStringify(value), 'utf8') > MAXIMUM_RECEIPT_BYTES) {
    throw new TypeError('Seed-audit receipt exceeds its bounded machine-report budget.');
  }
  return value;
}
