import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  BENCHMARK_CATALOG, PUBLIC_RESULT_CATALOG, exportBenchmark, importComparison, runBenchmark,
  scoreExternalPredictions,
} from '../benchmarks.mjs';
import { publishGeneratedHeuristicBenchmark, publishReport } from '../docs-reports.mjs';
import {
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  GENERATED_HEURISTIC_BENCHMARK_SEED,
  runGeneratedHeuristicBenchmark,
} from '../evaluation/generated-heuristic-benchmark.mjs';
import {
  executePublicBenchmarkRows,
} from '../evaluation/public-benchmark-probes.mjs';
import { runPublicBenchmarkProbes } from '../evaluation/public-benchmark-report.mjs';
import { publicBenchmarkCacheStatus } from '../evaluation/public-benchmark-status.mjs';
import {
  RESEARCH_BENCHMARK_CATALOG, researchBenchmarkCacheStatus,
} from '../evaluation/benchmark-research-catalog.mjs';
import { benchmarkBehaviorIdentity } from '../evaluation/benchmark-execution-identity.mjs';
import { PROJECT_ROOT, resolveProjectPath } from '../paths.mjs';

export function selectedBenchmarkIds(value) {
  const legacyAliases = {
    blimp: 'blimp', babi: 'babi', clutrr: 'clutrr', ewok: 'ewok', simpleqa: 'simpleqa',
    'entity-tracking': 'entityTracking', entitytracking: 'entityTracking',
    'story-cloze': 'storyCloze', storycloze: 'storyCloze',
  };
  const aliases = {
    ...legacyAliases,
    ...Object.fromEntries(Object.keys(RESEARCH_BENCHMARK_CATALOG).map((id) => [id.toLocaleLowerCase('en-US'), id])),
  };
  const requested = String(value ?? 'all').split(',')
    .map((item) => item.trim().toLocaleLowerCase('en-US'));
  if (requested.includes('all') && requested.length !== 1) {
    throw new Error('Benchmark selector "all" must be used alone.');
  }
  if (requested[0] === 'all') {
    return [...new Set([...Object.values(legacyAliases), ...Object.keys(RESEARCH_BENCHMARK_CATALOG)])];
  }
  return [...new Set(requested.map((item) => {
    if (!aliases[item]) throw new Error(`Unknown public benchmark ID: ${item}.`);
    return aliases[item];
  }))];
}

const LIVE_LEGACY_IDS = Object.freeze(['clutrr', 'entityTracking', 'storyCloze', 'simpleqa']);
const RECEIPT_LEGACY_IDS = Object.freeze(['blimp', 'babi', 'ewok']);

async function observeResources(operation) {
  const started = performance.now();
  const startedCpu = process.cpuUsage();
  const startRssBytes = process.memoryUsage().rss;
  let sampledPeakRssBytes = startRssBytes;
  let samples = 1;
  const sample = () => {
    sampledPeakRssBytes = Math.max(sampledPeakRssBytes, process.memoryUsage().rss);
    samples += 1;
  };
  const interval = setInterval(sample, 25);
  interval.unref();
  try {
    const value = await operation();
    sample();
    const cpu = process.cpuUsage(startedCpu);
    return Object.freeze({
      value,
      evidence: Object.freeze({
        measurement: 'in-process-25ms-rss-sampling',
        wallMilliseconds: performance.now() - started,
        cpuUserMicroseconds: cpu.user,
        cpuSystemMicroseconds: cpu.system,
        startRssBytes,
        endRssBytes: process.memoryUsage().rss,
        sampledPeakRssBytes,
        rssSamples: samples,
      }),
    });
  } finally {
    clearInterval(interval);
  }
}

function engineConfiguration(id, options) {
  const selectedKb = String(options.kb ?? '').split(',').filter(Boolean);
  const kbByBenchmark = {
    clutrr: [...new Set([...selectedKb, 'clutrr-kinship-algebra'])].join(','),
    entityTracking: selectedKb.join(','),
    storyCloze: options.kb ?? 'world-relations-1.0,atomic-2020,conceptnet-5.7.0-en',
    simpleqa: options.kb ?? 'quick,oewn-2025,atomic-2020,geonames-2026,conceptnet-5.7.0-en',
  };
  return {
    ...options,
    kb: kbByBenchmark[id],
    'memory-mb': options['memory-mb'] ?? 256,
    'external-language-agent': false,
    'no-external-language-agent': true,
  };
}

export async function executeLegacyRowsSequentially(
  selected, options, engineFor, executeRows = executePublicBenchmarkRows,
  behaviorIdentityFor = benchmarkBehaviorIdentity,
) {
  const selectedSet = new Set(selected);
  const rows = [];
  const receiptIds = RECEIPT_LEGACY_IDS.filter((id) => selectedSet.has(id));
  if (receiptIds.length > 0) {
    rows.push(...await executeRows({}, { selected: receiptIds }));
  }
  const liveIds = LIVE_LEGACY_IDS.filter((item) => selectedSet.has(item));
  const behaviorDependency = liveIds.length > 0 ? await behaviorIdentityFor() : undefined;
  const selectorById = {
    clutrr: 'clutrr',
    entityTracking: 'entity-tracking',
    storyCloze: 'story-cloze',
    simpleqa: 'simpleqa',
  };
  for (const id of liveIds) {
    const configuration = engineConfiguration(id, options);
    const measured = await observeResources(async () => {
      const engine = await engineFor(configuration);
      const key = id === 'entityTracking' ? 'base' : id;
      return executeRows({ [key]: engine }, { selected: [id] });
    });
    rows.push(...measured.value.map((row) => Object.freeze({
      ...row,
      resourcePolicy: Object.freeze({
        state: 'declared-soft-process-target',
        requestedMemoryMb: Number(configuration['memory-mb']),
        executionIsolation: 'sequential-row-in-one-cli-process',
      }),
      resourceEvidence: measured.evidence,
      replayCommand: `node src/cli.mjs benchmark probe --benchmark ${selectorById[id]} `
        + `--memory-mb ${configuration['memory-mb']} --no-external-language-agent`,
      behaviorDependency,
    })));
  }
  return Object.freeze(rows);
}

async function probe(options, engineFor) {
  if (options['external-language-agent']) {
    throw new Error(
      'Public catalog probes are direct-symbolic. Use a frozen suite run for a separately labeled '
        + 'Language-Agent-assisted track.',
    );
  }
  const selected = selectedBenchmarkIds(options.benchmark);
  if (options.publish) {
    const completePortfolio = selectedBenchmarkIds('all');
    const selectedSetForPublish = new Set(selected);
    if (selectedSetForPublish.size !== completePortfolio.length
        || completePortfolio.some((id) => !selectedSetForPublish.has(id))) {
      throw new Error(
        'Publishing latest-public-benchmark-probes.json requires --benchmark all. '
          + 'A selected probe is diagnostic output only.',
      );
    }
    if (options.kb) {
      throw new Error(
        'Publishing the canonical public portfolio does not accept --kb overrides. '
          + 'Run an unpublishing diagnostic for custom KB selections.',
      );
    }
    if (options['memory-mb'] !== undefined && Number(options['memory-mb']) !== 256) {
      throw new Error(
        'Publishing the canonical public portfolio requires --memory-mb 256. '
          + 'Other budgets are diagnostic runs.',
      );
    }
  }
  const legacyRows = await executeLegacyRowsSequentially(selected, options, engineFor);
  const report = await runPublicBenchmarkProbes({}, {
    selected, legacyRows, requireExecutionResources: options.publish === true,
  });
  if (options.publish) {
    const path = resolve(PROJECT_ROOT, 'docs/results/latest-public-benchmark-probes.json');
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}

const GENERATED_RUNTIME_OPTION = /^(?:work|work-profile|strategy-preset|strategy-select|profile|memory-mb|memory-policy|heuristic-|horn-|provider-|grounding-)/u;

function enabled(value) {
  return value === true || ['1', 'true', 'yes'].includes(String(value).toLocaleLowerCase('en-US'));
}

function shellArgument(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function generatedReplayCommand(options, size, seed) {
  const tokens = [
    'node', 'src/cli.mjs', 'benchmark', 'generated', '--cases', String(size),
    '--seed', shellArgument(seed),
  ];
  if (options.kb) tokens.push('--kb', shellArgument(options.kb));
  for (const [key, value] of Object.entries(options).toSorted(([left], [right]) => left.localeCompare(right))) {
    if (!GENERATED_RUNTIME_OPTION.test(key) || ['profile'].includes(key) && !enabled(value)) continue;
    if (['kb', 'cases', 'seed'].includes(key) || value === undefined || value === false) continue;
    tokens.push(`--${key}`);
    if (value !== true) tokens.push(shellArgument(value));
  }
  tokens.push('--no-external-language-agent');
  return tokens.join(' ');
}

function assertCanonicalGeneratedPublish(options, size, seed) {
  if (size !== DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE
      || seed !== GENERATED_HEURISTIC_BENCHMARK_SEED
      || options.kb !== 'quick') {
    throw new Error(
      'Publishing the generated development checkpoint requires the default 1,200 cases, fixed seed, and --kb quick.',
    );
  }
  const nonCanonical = Object.keys(options).filter((key) =>
    GENERATED_RUNTIME_OPTION.test(key)
      && !(['work-profile', 'work'].includes(key) && options[key] === 'balanced')
      && !(key === 'strategy-preset' && options[key] === 'all'));
  if (nonCanonical.length > 0) {
    throw new Error(
      `Publishing the generated checkpoint rejects runtime overrides: ${nonCanonical.toSorted().join(', ')}. `
        + 'Run the configuration without --publish for diagnostic evidence.',
    );
  }
}

async function generated(options, engineFor) {
  if (enabled(options['external-language-agent'])) {
    throw new Error('The generated heuristic benchmark is an offline local-strategy track.');
  }
  const size = options.cases === undefined
    ? DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE : Number(options.cases);
  const seed = options.seed === undefined ? GENERATED_HEURISTIC_BENCHMARK_SEED : String(options.seed);
  if (options.publish) assertCanonicalGeneratedPublish(options, size, seed);
  const runtimeOptions = {
    ...options, 'external-language-agent': false, 'no-external-language-agent': true,
  };
  const report = await runGeneratedHeuristicBenchmark(await engineFor(runtimeOptions), {
    size, seed, replayCommand: generatedReplayCommand(runtimeOptions, size, seed),
  });
  if (options.publish) {
    const path = resolve(PROJECT_ROOT, 'docs/results/latest-generated-heuristic-benchmark.json');
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await publishGeneratedHeuristicBenchmark();
  }
  return report;
}

export async function benchmarkCommand(args, options, services) {
  const { engineFor, printJson } = services;
  const action = args[0];
  if (action === 'catalog') { printJson(BENCHMARK_CATALOG); return; }
  if (action === 'references') { printJson(PUBLIC_RESULT_CATALOG); return; }
  if (action === 'status') {
    printJson([
      ...await publicBenchmarkCacheStatus(),
      ...await researchBenchmarkCacheStatus(),
    ]);
    return;
  }
  if (action === 'probe') { printJson(await probe(options, engineFor)); return; }
  if (action === 'generated') { printJson(await generated(options, engineFor)); return; }
  if (action === 'run') {
    if (!options.suite) throw new Error('benchmark run requires --suite.');
    const suite = await resolveProjectPath(options.suite);
    const publish = options.publish ? resolve(PROJECT_ROOT, 'docs/results/latest-benchmark.json') : undefined;
    const report = await runBenchmark(await engineFor(options), suite, publish);
    if (publish) await publishReport('benchmark');
    printJson(report);
    return;
  }
  if (action === 'export') {
    if (!options.suite || !options.output) throw new Error('benchmark export requires --suite and --output.');
    printJson(await exportBenchmark(await resolveProjectPath(options.suite), resolve(options.output)));
    return;
  }
  if (action === 'score-predictions') {
    if (!options.suite || !options.input || !options['protocol-metadata']) {
      throw new Error('benchmark score-predictions requires --suite, --input, and --protocol-metadata.');
    }
    const metadataPath = resolve(options['protocol-metadata']);
    const protocolMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const output = resolve(options.output ?? 'docs/results/external-comparison.json');
    printJson(await scoreExternalPredictions(
      await resolveProjectPath(options.suite), resolve(options.input), protocolMetadata, output,
    ));
    return;
  }
  if (action === 'import-results') {
    if (!options.input) throw new Error('benchmark import-results requires --input.');
    const output = resolve(options.output ?? 'docs/results/imported-comparison.json');
    printJson(await importComparison(resolve(options.input), output));
    return;
  }
  throw new Error('Unknown benchmark action.');
}
