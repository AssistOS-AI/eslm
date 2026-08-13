import {
  assertGeneratedHeuristicBenchmarkReport,
  GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL,
  runGeneratedHeuristicBenchmark,
} from './generated-heuristic-benchmark.mjs';
import { DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE } from './generated-heuristic-cases.mjs';
import {
  assertGeneratedHeuristicMultiSeedAudit,
  GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL,
} from './generated-heuristic-multi-seed-audit-contract.mjs';
import { sha256, stableStringify } from '../util.mjs';

export { assertGeneratedHeuristicMultiSeedAudit, GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL };

export const GENERATED_HEURISTIC_MULTI_SEED_AUDIT_SEEDS = Object.freeze([
  'eslm-generated-heuristic-independent-v1-alpha',
  'eslm-generated-heuristic-independent-v1-beta',
  'eslm-generated-heuristic-independent-v1-gamma',
  'eslm-generated-heuristic-independent-v1-delta',
  'eslm-generated-heuristic-independent-v1-epsilon',
]);

const COUNT_DIMENSIONS = Object.freeze(['oracleLevel', 'route', 'status']);
const MAXIMUM_SEEDS = 16;

function frozen(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) frozen(item);
  }
  return value;
}

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function assertSeeds(seeds) {
  if (!Array.isArray(seeds) || seeds.length < 2 || seeds.length > MAXIMUM_SEEDS
      || seeds.some((seed) => typeof seed !== 'string' || seed.length < 1 || seed.length > 128)
      || new Set(seeds).size !== seeds.length) {
    throw new TypeError('Generated seed audit requires two to sixteen unique bounded seed names.');
  }
  return seeds;
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
  return frozen([...values.values()].toSorted((left, right) => left.key.localeCompare(right.key))
    .map((row) => ({ ...row, passRate: row.passed / row.total })));
}

function dimensionRows(map, field) {
  return frozen([...map.entries()].map(([label, count]) => ({ [field]: label, count }))
    .toSorted((left, right) => right.count - left.count || left[field].localeCompare(right[field])));
}

function aggregateFailureClusters(runs) {
  const values = new Map();
  for (const run of runs) {
    for (const cluster of run.failureClusters) {
      const current = values.get(cluster.id) ?? {
        id: cluster.id,
        stage: cluster.stage,
        code: cluster.code,
        targetFamily: cluster.targetFamily,
        count: 0,
        seeds: new Set(),
        techniques: new Map(),
        domains: new Map(),
      };
      if (current.stage !== cluster.stage || current.code !== cluster.code
          || current.targetFamily !== cluster.targetFamily) {
        throw new TypeError('One failure-cluster identity has inconsistent semantics across seed reports.');
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
  return frozen([...values.values()].map((cluster) => ({
    id: cluster.id,
    stage: cluster.stage,
    code: cluster.code,
    targetFamily: cluster.targetFamily,
    count: cluster.count,
    seedCount: cluster.seeds.size,
    seeds: Object.freeze([...cluster.seeds].toSorted()),
    techniques: dimensionRows(cluster.techniques, 'technique'),
    domains: dimensionRows(cluster.domains, 'domain'),
  })).toSorted((left, right) => right.count - left.count || left.id.localeCompare(right.id)));
}

function aggregateRuns(runs) {
  const total = runs.reduce((sum, run) => sum + run.total, 0);
  const passed = runs.reduce((sum, run) => sum + run.passed, 0);
  const failed = runs.reduce((sum, run) => sum + run.failed, 0);
  return frozen({
    format: 'eslm-generated-heuristic-multi-seed-aggregate-v1',
    seeds: runs.length,
    total,
    passed,
    failed,
    mixedContractRate: passed / total,
    seedsWithFailures: runs.filter((run) => run.failed > 0).length,
    counts: Object.freeze(Object.fromEntries(
      COUNT_DIMENSIONS.map((dimension) => [dimension, aggregateRows(runs, dimension)]),
    )),
    failureClusters: aggregateFailureClusters(runs),
  });
}

function runSummary(report, ordinal) {
  return frozen({
    format: 'eslm-generated-heuristic-seed-run-v1',
    ordinal,
    seed: report.generator.seed,
    reportDigest: digest(report),
    reportCreatedAt: report.createdAt,
    generator: report.generator,
    execution: report.execution,
    workPolicyDigest: digest(report.workPolicy),
    strategyConfiguration: report.strategyConfiguration,
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    mixedContractRate: report.accuracy,
    counts: Object.freeze(Object.fromEntries(
      COUNT_DIMENSIONS.map((dimension) => [dimension, report.aggregates[dimension]]),
    )),
    failureClusters: report.failureClusters,
  });
}

function sharedIdentity(report) {
  return frozen({
    format: 'eslm-generated-heuristic-multi-seed-identity-v1',
    reportFormat: GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL,
    generatorFormat: report.generator.format,
    definitionDigest: report.generator.definitionDigest,
    behaviorIdentity: report.execution.behaviorIdentity,
    runtimeIdentity: report.execution.runtimeIdentity,
    workPolicy: report.workPolicy,
    workPolicyDigest: digest(report.workPolicy),
    catalog: report.strategyConfiguration.catalog,
    selection: report.strategyConfiguration.selection,
    arbiters: report.strategyConfiguration.arbiters,
    grounding: report.execution.grounding,
    externalLanguageAgent: report.execution.externalLanguageAgent,
  });
}

export function buildGeneratedHeuristicMultiSeedAudit(reports, options = {}) {
  if (!Array.isArray(reports)) throw new TypeError('Generated seed audit requires an array of reports.');
  assertSeeds(reports.map((report) => report?.generator?.seed));
  for (const report of reports) assertGeneratedHeuristicBenchmarkReport(report);
  const casesPerSeed = reports[0].total;
  if (reports.some((report) => report.total !== casesPerSeed)) {
    throw new TypeError('Generated seed audit requires one fixed case denominator across every seed.');
  }
  const replayCommand = options.replayCommand;
  if (typeof replayCommand !== 'string' || replayCommand.length < 1 || replayCommand.length > 4_096) {
    throw new TypeError('Generated seed audit requires an explicit bounded replayCommand.');
  }
  const runs = frozen(reports.map((report, index) => runSummary(report, index + 1)));
  const plan = frozen({
    format: 'eslm-generated-heuristic-multi-seed-plan-v1',
    casesPerSeed,
    seeds: frozen(runs.map((run) => run.seed)),
    totalPlanned: casesPerSeed * runs.length,
    replayCommand,
  });
  const core = frozen({
    format: GENERATED_HEURISTIC_MULTI_SEED_AUDIT_PROTOCOL,
    createdAt: options.createdAt ?? new Date().toISOString(),
    evidenceRegime: 'internal-generated-multi-seed-development-audit',
    benchmarkComparable: false,
    claimScope: 'same-definition-cross-seed-stability-only',
    plan,
    sharedIdentity: sharedIdentity(reports[0]),
    runs,
    aggregates: aggregateRuns(runs),
    verification: frozen({
      uniqueSeeds: true,
      distinctSuiteDigests: true,
      sharedDefinitionIdentity: true,
      sharedBehaviorIdentity: true,
      sharedRuntimeIdentity: true,
      sharedWorkPolicyIdentity: true,
      sharedCatalogIdentity: true,
      sharedStrategySelectionIdentity: true,
      sharedArbiterIdentity: true,
      completeDenominator: true,
      allRunsShareIntendedIdentity: true,
    }),
  });
  const audit = frozen({ ...core, receiptDigest: digest(core) });
  assertGeneratedHeuristicMultiSeedAudit(audit);
  return audit;
}

function assertReplayCommands(seeds, commands) {
  if (!Array.isArray(commands) || commands.length !== seeds.length) {
    throw new TypeError('Generated seed audit requires one replay command for every seed.');
  }
  for (const [index, item] of commands.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || Object.keys(item).toSorted().join(',') !== 'replayCommand,seed'
        || item.seed !== seeds[index]
        || typeof item.replayCommand !== 'string' || item.replayCommand.length < 1
        || item.replayCommand.length > 4_096) {
      throw new TypeError('Generated seed replay commands must match the ordered seed plan exactly.');
    }
  }
}

export async function runGeneratedHeuristicMultiSeedAudit(runtimeForSeed, options = {}) {
  if (typeof runtimeForSeed !== 'function') {
    throw new TypeError('Generated seed audit requires a runtime factory.');
  }
  const seeds = [...(options.seeds ?? GENERATED_HEURISTIC_MULTI_SEED_AUDIT_SEEDS)];
  assertSeeds(seeds);
  const size = options.size ?? DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE;
  const replayCommands = options.seedReplayCommands;
  assertReplayCommands(seeds, replayCommands);
  const reports = [];
  for (const [index, seed] of seeds.entries()) {
    const runtime = await runtimeForSeed(Object.freeze({ seed, index, size }));
    reports.push(await runGeneratedHeuristicBenchmark(runtime, {
      size,
      seed,
      replayCommand: replayCommands[index].replayCommand,
      maximumRepresentativeFailures: options.maximumRepresentativeFailures ?? 0,
    }));
  }
  return buildGeneratedHeuristicMultiSeedAudit(reports, {
    replayCommand: options.replayCommand,
    createdAt: options.createdAt,
  });
}
