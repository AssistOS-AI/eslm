import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  BENCHMARK_CATALOG, PUBLIC_RESULT_CATALOG, exportBenchmark, importComparison, runBenchmark,
  scoreExternalPredictions,
} from '../benchmarks.mjs';
import { publishReport } from '../docs-reports.mjs';
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
