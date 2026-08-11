import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BENCHMARK_CATALOG, PUBLIC_RESULT_CATALOG, exportBenchmark, importComparison, runBenchmark,
  scoreExternalPredictions,
} from '../benchmarks.mjs';
import { publishReport } from '../docs-reports.mjs';
import {
  publicBenchmarkCacheStatus, runPublicBenchmarkProbes,
} from '../evaluation/public-benchmark-probes.mjs';
import { researchBenchmarkCacheStatus } from '../evaluation/benchmark-research-catalog.mjs';
import { PROJECT_ROOT, resolveProjectPath } from '../paths.mjs';

function selectedBenchmarkIds(value) {
  const aliases = {
    blimp: 'blimp', babi: 'babi', clutrr: 'clutrr', ewok: 'ewok', simpleqa: 'simpleqa',
    'entity-tracking': 'entityTracking', entitytracking: 'entityTracking',
    'story-cloze': 'storyCloze', storycloze: 'storyCloze',
  };
  const requested = String(value ?? 'all').split(',')
    .map((item) => item.trim().toLocaleLowerCase('en-US'));
  if (requested.includes('all')) return [...new Set(Object.values(aliases))];
  return requested.map((item) => {
    if (!aliases[item]) throw new Error(`Unknown public benchmark ID: ${item}.`);
    return aliases[item];
  });
}

async function probe(options, engineFor) {
  if (options['external-language-agent']) {
    throw new Error(
      'Public catalog probes are direct-symbolic. Use a frozen suite run for a separately labeled Language-Agent-assisted track.',
    );
  }
  const selected = selectedBenchmarkIds(options.benchmark);
  const selectedSet = new Set(selected);
  const selectedKb = String(options.kb ?? '').split(',').filter(Boolean);
  const babiKb = [...new Set([...selectedKb, 'babi-v1.2-language'])].join(',');
  const clutrrKb = [...new Set([...selectedKb, 'clutrr-kinship-algebra'])].join(',');
  const simpleQaKb = options.kb ?? 'quick,oewn-2025,atomic-2020,geonames-2026,conceptnet-5.7.0-en';
  const storyKb = options.kb ?? 'world-relations-1.0,atomic-2020,conceptnet-5.7.0-en';
  const engines = {};
  if (selectedSet.has('entityTracking')) {
    engines.base = await engineFor({ ...options, kb: selectedKb.join(','), 'external-language-agent': false, 'no-external-language-agent': true });
  }
  if (selectedSet.has('babi')) {
    engines.babi = await engineFor({ ...options, kb: babiKb, 'external-language-agent': false, 'no-external-language-agent': true });
  }
  if (selectedSet.has('clutrr')) {
    engines.clutrr = await engineFor({ ...options, kb: clutrrKb, 'external-language-agent': false, 'no-external-language-agent': true });
  }
  if (selectedSet.has('storyCloze')) {
    engines.storyCloze = await engineFor({
      ...options, kb: storyKb, 'memory-mb': options['memory-mb'] ?? 256,
      'external-language-agent': false, 'no-external-language-agent': true,
    });
  }
  if (selectedSet.has('simpleqa')) {
    engines.simpleqa = await engineFor({
      ...options, kb: simpleQaKb, 'memory-mb': options['memory-mb'] ?? 256,
      'external-language-agent': false, 'no-external-language-agent': true,
    });
  }
  const report = await runPublicBenchmarkProbes(engines, { selected });
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
    if (!options.suite || !options.input || !options['model-name']) {
      throw new Error('benchmark score-predictions requires --suite, --input, and --model-name.');
    }
    const output = resolve(options.output ?? 'docs/results/external-comparison.json');
    printJson(await scoreExternalPredictions(
      await resolveProjectPath(options.suite), resolve(options.input), options['model-name'], output,
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
