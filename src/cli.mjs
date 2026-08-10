#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { appendFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { EslmEngine } from './engine.mjs';
import { EslmRuntime } from './runtime.mjs';
import {
  BENCHMARK_CATALOG, PUBLIC_RESULT_CATALOG, exportBenchmark, importComparison, runBenchmark,
  scoreExternalPredictions,
} from './benchmarks.mjs';
import { checkDocumentation, publishReport } from './docs-reports.mjs';
import {
  DATASET_CATALOG, analyzeDatasetTraining, datasetStatus, fetchDataset, prepareDataset,
} from './datasets.mjs';
import { corpusCatalog, corpusStatuses } from './corpora.mjs';
import { evaluate } from './evaluation.mjs';
import { readBatch } from './io.mjs';
import { buildKnowledgeBases } from './kb-training.mjs';
import {
  KB_CATALOG, loadKnowledgeBases, loadKnowledgeBase, mergeModels, selectedKbIds, summarizeKnowledgeBase,
} from './kbs.mjs';
import {
  PUBLIC_KB_CATALOG, loadPublicKnowledgeBases, publicKbStatuses, validatePublicKnowledgeBase,
} from './public-kbs.mjs';
import { loadModel } from './model-loader.mjs';
import { PROJECT_ROOT, resolveProjectPath } from './paths.mjs';
import { prepareTraining, validateGeneratedModel, writeCandidateSkeleton } from './training.mjs';
import { parseArgs } from './util.mjs';

const runFile = promisify(execFile);

function printJson(value) {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help() {
  stdout.write(`ESLM — offline executable symbolic language model

Usage:
  eslm                         interactive conversation
  eslm ask <question>          answer one question
  eslm run --input FILE [--output FILE]
  eslm train prepare --input FILE [--output FILE]
  eslm train candidate --packet FILE --output DIRECTORY
  eslm train validate [--model DIRECTORY]
  eslm dataset catalog
  eslm dataset fetch --dataset ID
  eslm dataset prepare --dataset ID [--chunk-size 500]
  eslm dataset analyze --dataset ID
  eslm dataset status --dataset ID
  eslm corpus catalog
  eslm corpus status [--corpus ID[,ID]|all]
  eslm corpus probe --corpus oewn-2025 --archive FILE
  eslm kb list
  eslm kb show ID
  eslm kb build ID|all
  eslm kb validate ID|all
  eslm evaluate --suite FILE [--publish]
  eslm benchmark catalog
  eslm benchmark references
  eslm benchmark run --suite FILE [--publish]
  eslm benchmark export --suite FILE --output FILE
  eslm benchmark score-predictions --suite FILE --input FILE --model-name NAME [--output FILE]
  eslm benchmark import-results --input FILE [--output FILE]
  eslm docs check|publish

Global options:
  --model training/model/manifest.mjs
  --kb quick,oewn-2025          knowledge modules; use --kb all for every top-level module
  --profile                      include per-stage timing, CPU, memory deltas, and work counts
`);
}

function selectedRuntimeKbIds(value) {
  if (!value) return [];
  const known = new Set([...Object.keys(KB_CATALOG), ...Object.keys(PUBLIC_KB_CATALOG)]);
  const requested = String(value).split(',').map((item) => item.trim().toLocaleLowerCase('en-US')).filter(Boolean);
  const ids = requested.includes('all')
    ? ['quick', ...Object.keys(PUBLIC_KB_CATALOG)]
    : requested;
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`Unknown knowledge base: ${id}`);
  }
  return [...new Set(ids)];
}

async function engineFor(options) {
  const modelCandidate = options.model ?? 'training/model/manifest.mjs';
  const base = await loadModel(modelCandidate);
  const selected = selectedRuntimeKbIds(options.kb);
  const graphIds = selected.filter((id) => KB_CATALOG[id]);
  const publicIds = selected.filter((id) => PUBLIC_KB_CATALOG[id]);
  const knowledgeBases = await loadKnowledgeBases(graphIds.join(','));
  const core = new EslmEngine(mergeModels(base, knowledgeBases), { profile: options.profile });
  return new EslmRuntime(core, await loadPublicKnowledgeBases(publicIds), selected);
}

function interactiveHelp() {
  return `Interactive commands:
  /help                 show this command guide
  /kbs                  list available KBs, their role, size, and load state
  /load ID[,ID]         load QUICK, oewn-2025, atomic-2020, or a QUICK component
  /unload ID[,ID]|all   unload knowledge without losing conversation context
  /model                show the active model and KBs
  /examples [ID]        show working and deliberately unsupported examples
  /trace                show provenance for the last answer
  /profile              show profiling for the last answer
  /clear                clear session facts and discourse context
  /quit                 leave ESLM

You can also teach bounded session facts before a question, for example:
  Socrates is a man. Is Socrates a man?
  Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?`;
}

function interactiveExamples(filter) {
  const groups = {
    quick: [
      '[works] Jhon is a man. Is Jhon going to die?',
      '[works] Can Penguin swim?',
      '[works] Where is Neptune?',
      '[unknown by design] Can Penguin fly? — absence is not treated as false',
    ],
    'oewn-2025': [
      '[works] Define dog',
      '[works] What are synonyms of dog?',
      '[works] How many senses does bank have?',
      '[works] Is a dog an animal?',
    ],
    'atomic-2020': [
      '[works] Why might apologize?',
      '[works] What might happen after PersonX apologizes profusely?',
      '[works] How might PersonX feel after PersonX apologizes profusely?',
      '[works] What could prevent PersonX apologizes to PersonX\'s boss?',
    ],
    limits: [
      '[unsupported] Write a new poem — no open-ended generative executor',
      '[unsupported] Prove an arbitrary theorem — no general theorem prover',
      '[unsupported] What will certainly happen after an ATOMIC event? — ATOMIC is defeasible, not certain',
      '[unsupported] Is every missing fact false? — ESLM uses open-world UNKNOWN',
    ],
  };
  const keys = filter && groups[filter] ? [filter] : Object.keys(groups);
  return keys.map((key) => `${key}:\n  ${groups[key].join('\n  ')}`).join('\n\n');
}

async function interactiveKbText(loaded) {
  const quick = summarizeKnowledgeBase(await loadKnowledgeBase('quick'));
  const publicStatuses = await publicKbStatuses();
  const rows = [{
    id: 'quick', title: 'QUICK development fixtures', role: 'smoke tests/tutorials; authored, not public training',
    available: true, size: `${quick.directFactCount} direct / ${quick.executableFactCount} executable facts`,
  }, ...publicStatuses.map((status) => ({
    id: status.id, title: status.title, role: status.role, available: status.available,
    size: status.counts ? (status.id === 'oewn-2025'
      ? `${status.counts.synsets} synsets / ${status.counts.uniqueLemmas} lemmas`
      : `${status.counts.retainedUniqueNonNoneTuples} tuples / ${status.counts.uniqueEvents} events`) : 'not built',
  }))];
  return rows.map((row) => `${loaded.includes(row.id) ? '[loaded]' : row.available ? '[ready] ' : '[missing]'} ${row.id}\n  ${row.title}: ${row.size}\n  ${row.role}`).join('\n\n');
}

async function chat(options) {
  let selected = selectedRuntimeKbIds(options.kb ?? 'quick,oewn-2025,atomic-2020');
  let engine = await engineFor({ ...options, kb: selected.join(',') });
  const terminal = createInterface({ input: stdin, output: stdout });
  let context = {};
  let last;
  stdout.write(`ESLM ready with ${selected.join(', ')}. Use /help for commands or /examples for tested questions.\n`);
  while (true) {
    const line = (await terminal.question('eslm> ')).trim();
    if (!line) continue;
    if (['/quit', '/exit'].includes(line)) break;
    if (line === '/help') { stdout.write(`${interactiveHelp()}\n`); continue; }
    if (line === '/kbs') { stdout.write(`${await interactiveKbText(selected)}\n`); continue; }
    if (line === '/model') {
      printJson({ id: engine.model.manifest.modelId, loadedKnowledgeBases: selected, contextFacts: context.session?.facts?.length ?? 0 });
      continue;
    }
    if (line === '/clear') { context = {}; last = undefined; stdout.write('Session context cleared.\n'); continue; }
    if (line.startsWith('/examples')) {
      const filter = line.split(/\s+/u)[1]?.toLocaleLowerCase('en-US');
      stdout.write(`${interactiveExamples(filter)}\n`);
      continue;
    }
    if (line.startsWith('/load ')) {
      const requested = selectedRuntimeKbIds(line.slice('/load '.length));
      selected = [...new Set([...selected, ...requested])];
      engine = await engineFor({ ...options, kb: selected.join(',') });
      stdout.write(`Loaded: ${selected.join(', ')}.\n`);
      continue;
    }
    if (line.startsWith('/unload ')) {
      const value = line.slice('/unload '.length).trim();
      const removed = value === 'all' ? selected : selectedRuntimeKbIds(value);
      selected = selected.filter((id) => !removed.includes(id));
      engine = await engineFor({ ...options, kb: selected.join(',') });
      stdout.write(`Loaded: ${selected.length > 0 ? selected.join(', ') : '(base model only)'}.\n`);
      continue;
    }
    if (line === '/trace') { printJson(last?.provenance ?? []); continue; }
    if (line === '/profile') { printJson(last?.profile ?? { enabled: false }); continue; }
    last = engine.ask(line, context);
    context = last.context ?? context;
    stdout.write(`${last.answer}\n`);
    if (last.input?.corrections?.length) stdout.write(`[normalized: ${last.input.normalized}]\n`);
  }
  terminal.close();
}

async function ask(args, options) {
  const text = args.join(' ');
  if (!text) throw new Error('ask requires a question.');
  printJson((await engineFor(options)).ask(text));
}

async function runBatch(options) {
  if (!options.input) throw new Error('run requires --input.');
  const inputPath = await resolveProjectPath(options.input);
  const records = await readBatch(inputPath);
  const engine = await engineFor(options);
  const outputs = records.map((record) => ({ id: record.id, ...engine.ask(record.text ?? record.input ?? '') }));
  const serialized = `${outputs.map((record) => JSON.stringify(record)).join('\n')}\n`;
  if (options.output) await writeFile(resolve(options.output), serialized, 'utf8');
  else stdout.write(serialized);
}

async function train(args, options) {
  const action = args[0];
  if (action === 'prepare') {
    if (!options.input) throw new Error('train prepare requires --input.');
    const input = await resolveProjectPath(options.input);
    const output = resolve(options.output ?? 'training/work/packet.json');
    printJson(await prepareTraining({
      input, output, split: options.split ?? 'train', profile: options.profile,
    }));
    return;
  }
  if (action === 'candidate') {
    if (!options.packet || !options.output) throw new Error('train candidate requires --packet and --output.');
    printJson(await writeCandidateSkeleton(resolve(options.packet), resolve(options.output)));
    return;
  }
  if (action === 'validate') {
    printJson(await validateGeneratedModel(options.model ?? resolve(PROJECT_ROOT, 'training/model')));
    return;
  }
  throw new Error('Unknown train action.');
}

async function evaluateCommand(options) {
  if (!options.suite) throw new Error('evaluate requires --suite.');
  const suite = await resolveProjectPath(options.suite);
  const publish = options.publish ? resolve(PROJECT_ROOT, 'docs/results/latest-evaluation.json') : undefined;
  const report = await evaluate(await engineFor(options), suite, publish);
  if (publish) await publishReport('evaluation');
  printJson(report);
}

async function dataset(args, options) {
  const action = args[0];
  if (action === 'catalog') { printJson(DATASET_CATALOG); return; }
  if (!options.dataset) throw new Error(`dataset ${action ?? ''} requires --dataset.`);
  if (action === 'fetch') { printJson(await fetchDataset(options.dataset)); return; }
  if (action === 'prepare') {
    const chunkSize = Number.parseInt(options['chunk-size'] ?? '500', 10);
    printJson(await prepareDataset(options.dataset, chunkSize));
    return;
  }
  if (action === 'status') { printJson(await datasetStatus(options.dataset)); return; }
  if (action === 'analyze') { printJson(await analyzeDatasetTraining(options.dataset)); return; }
  throw new Error('Unknown dataset action.');
}

async function corpus(args, options) {
  const action = args[0];
  if (action === 'catalog') { printJson(corpusCatalog()); return; }
  if (action === 'status') { printJson(await corpusStatuses(options.corpus ?? 'all')); return; }
  if (action === 'probe') {
    if (options.corpus !== 'oewn-2025') throw new Error('corpus probe currently supports only --corpus oewn-2025.');
    if (!options.archive) throw new Error('corpus probe requires --archive FILE.');
    const archive = await resolveProjectPath(options.archive);
    const output = resolve(PROJECT_ROOT, options.output ?? 'training/KBs/oewn-2025/probe/probe-report.json');
    const publishOutput = resolve(PROJECT_ROOT, 'docs/results/latest-oewn-probe.json');
    const script = resolve(PROJECT_ROOT, 'scripts/probe-oewn.mjs');
    const result = await runFile(process.execPath, [
      script, '--archive', archive, '--output', output, '--publish-output', publishOutput,
    ], { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 });
    printJson(JSON.parse(result.stdout.trim()));
    return;
  }
  throw new Error('Unknown corpus action. Fetch, prepare, and build are added only with a validated source adapter.');
}

async function knowledgeBase(args) {
  const action = args[0];
  if (action === 'list') {
    const entries = [];
    for (const id of Object.keys(KB_CATALOG)) {
      entries.push({ ...KB_CATALOG[id], ...summarizeKnowledgeBase(await loadKnowledgeBase(id)) });
    }
    entries.push(...await publicKbStatuses());
    printJson(entries);
    return;
  }
  const target = args[1];
  if (!target) throw new Error(`kb ${action ?? ''} requires an ID or all.`);
  const ids = selectedRuntimeKbIds(target);
  if (action === 'show') {
    if (ids.length !== 1) throw new Error('kb show accepts exactly one ID.');
    if (PUBLIC_KB_CATALOG[ids[0]]) {
      printJson((await publicKbStatuses()).find((item) => item.id === ids[0]));
    } else {
      printJson({ ...KB_CATALOG[ids[0]], ...summarizeKnowledgeBase(await loadKnowledgeBase(ids[0])) });
    }
    return;
  }
  if (action === 'build') {
    const results = [];
    const graphIds = ids.filter((id) => KB_CATALOG[id]);
    if (graphIds.length > 0) results.push(...await buildKnowledgeBases(graphIds));
    for (const id of ids.filter((item) => PUBLIC_KB_CATALOG[item])) {
      const script = resolve(PROJECT_ROOT, id === 'oewn-2025' ? 'scripts/build-oewn-kb.mjs' : 'scripts/build-atomic-kb.mjs');
      const result = await runFile(process.execPath, [script], { cwd: PROJECT_ROOT, maxBuffer: 4 * 1024 * 1024 });
      results.push(JSON.parse(result.stdout));
    }
    printJson(results);
    return;
  }
  if (action === 'validate') {
    const results = [];
    for (const id of ids) {
      if (PUBLIC_KB_CATALOG[id]) results.push(await validatePublicKnowledgeBase(id));
      else results.push(await validateGeneratedModel(dirname(resolve(PROJECT_ROOT, KB_CATALOG[id].model))));
    }
    printJson(results);
    return;
  }
  throw new Error('Unknown kb action.');
}

async function benchmark(args, options) {
  const action = args[0];
  if (action === 'catalog') { printJson(BENCHMARK_CATALOG); return; }
  if (action === 'references') { printJson(PUBLIC_RESULT_CATALOG); return; }
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

async function docs(args) {
  if (args[0] === 'check') { printJson(await checkDocumentation()); return; }
  if (args[0] === 'publish') {
    const published = [];
    for (const kind of ['evaluation', 'benchmark']) {
      try { published.push(await publishReport(kind)); } catch {}
    }
    printJson({ published });
    return;
  }
  throw new Error('Unknown docs action.');
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, ...args] = positional;
  if (!command || command === 'chat') return chat(options);
  if (['help', '-h'].includes(command) || options.help) return help();
  if (command === 'ask') return ask(args, options);
  if (command === 'run') return runBatch(options);
  if (command === 'train') return train(args, options);
  if (command === 'dataset') return dataset(args, options);
  if (command === 'corpus') return corpus(args, options);
  if (command === 'kb') return knowledgeBase(args);
  if (command === 'evaluate') return evaluateCommand(options);
  if (command === 'benchmark') return benchmark(args, options);
  if (command === 'docs') return docs(args);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`eslm: ${error.message}\n`);
  process.exitCode = 1;
});
