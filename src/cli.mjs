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
import { editDistance } from './util.mjs';
import { createTerminalStyle } from './terminal-style.mjs';

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
  --memory-mb 512               soft process-memory target; enables adaptive shard loading
  --memory-policy auto          auto, eager, or lazy public-KB loading
  --color auto                  auto, always, or never; structured output is never colored
  --profile                      include per-stage timing, CPU, memory deltas, and work counts
`);
}

function selectedRuntimeKbIds(value) {
  if (!value) return [];
  const known = new Set([...Object.keys(KB_CATALOG), ...Object.keys(PUBLIC_KB_CATALOG)]);
  const requested = String(value).split(',').map((item) => item.trim().toLocaleLowerCase('en-US')).filter(Boolean);
  const ids = requested.includes('all')
    ? Object.keys(PUBLIC_KB_CATALOG)
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
  const loaded = await loadPublicKnowledgeBases(publicIds, {
    memoryMb: options['memory-mb'], memoryPolicy: options['memory-policy'],
  });
  return new EslmRuntime(core, loaded.providers, selected, loaded.memoryPlan);
}

function interactiveHelp(style) {
  const command = (value) => style.blue(value.padEnd(28));
  return `${style.bold('Interactive commands')}
  ${command('/help')}Explain every interactive command and its purpose.
  ${command('/kbs')}Show installed knowledge sources, sizes, roles, and load state.
  ${command('/load all')}Load every installed public KB. QUICK remains opt-in.
  ${command('/load WORDS')}Load by name, title word, wildcard, or a close spelling.
  ${command('/unload WORDS|all')}Remove matching KBs without losing session facts.
  ${command('/model')}Explain what model is answering, which KBs are active, and why the run is not benchmark-clean.
  ${command('/memory')}Show eager/lazy strategy and current shard-cache use.
  ${command('/memory N')}Set a soft memory target in MiB and rebuild KB providers.
  ${command('/memory auto|eager|lazy')}Select adaptive, full, or shard-based loading.
  ${command('/examples')}Show all tested working, unknown, and unsupported examples.
  ${command('/trace')}Explain the sources and symbolic steps behind the last answer.
  ${command('/profile')}Show readable timing and memory measurements for the last answer.
  ${command('/clear')}Forget temporary conversation facts and references.
  ${command('/quit')}Leave ESLM without writing the conversation.

${style.bold('Temporary context')}
You can teach bounded session facts before a question, for example:
  Socrates is a man. Is Socrates a man?
  Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?`;
}

function interactiveExamples(style) {
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
  return Object.entries(groups).map(([key, examples]) => {
    const rendered = examples.map((example) => {
      if (example.startsWith('[works]')) return example.replace('[works]', style.green('[works]'));
      if (example.startsWith('[unsupported]')) return example.replace('[unsupported]', style.red('[unsupported]'));
      return example.replace('[unknown by design]', style.yellow('[unknown by design]'));
    });
    return `${style.bold(key)}\n  ${rendered.join('\n  ')}`;
  }).join('\n\n');
}

function globExpression(value) {
  return new RegExp(`^${value.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('.*')}$`, 'iu');
}

function matchInteractiveKnowledgeBases(value, { includeQuick = true } = {}) {
  const catalog = [...Object.values(PUBLIC_KB_CATALOG), ...Object.values(KB_CATALOG).filter((item) => includeQuick && !item.internal)];
  const terms = String(value).split(',').map((item) => item.trim().toLocaleLowerCase('en-US')).filter(Boolean);
  if (terms.includes('all')) return Object.keys(PUBLIC_KB_CATALOG);
  const matches = [];
  for (const term of terms) {
    const exact = catalog.filter((item) => item.id === term || item.title.toLocaleLowerCase('en-US') === term);
    if (exact.length === 1) { matches.push(exact[0].id); continue; }
    const wildcard = term.includes('*') ? globExpression(term) : undefined;
    const contained = catalog.filter((item) => {
      const searchable = `${item.id} ${item.title} ${item.role ?? item.domain ?? ''}`.toLocaleLowerCase('en-US');
      return wildcard ? searchable.split(/\s+/u).some((word) => wildcard.test(word)) || wildcard.test(searchable) : searchable.includes(term);
    });
    if (contained.length === 1) { matches.push(contained[0].id); continue; }
    if (contained.length > 1) throw new Error(`“${term}” matches several KBs: ${contained.map((item) => item.title).join(', ')}. Add another word.`);
    const ranked = catalog.map((item) => ({ item, distance: Math.min(...[item.id, ...item.title.toLocaleLowerCase('en-US').split(/\s+/u)].map((word) => editDistance(term, word))) }))
      .sort((left, right) => left.distance - right.distance);
    if (ranked[0]?.distance <= Math.max(1, Math.floor(term.length / 4)) && ranked[0].distance < ranked[1]?.distance) matches.push(ranked[0].item.id);
    else throw new Error(`No unambiguous KB matches “${term}”. Use /kbs to see names or /load all.`);
  }
  return [...new Set(matches)];
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'not measured';
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}

function memoryText(engine, style) {
  const memory = engine.memorySnapshot();
  if (!memory || memory.providers.length === 0) return `${style.yellow('No public KB is active.')} There is no public shard cache to report.`;
  const target = memory.softTarget ? `${memory.targetMiB} MiB soft whole-process target` : 'no memory target; full loading is preferred';
  const rows = memory.providers.map((provider) => {
    if (provider.mode === 'eager') return `  ${style.green('eager')} ${provider.id}: complete model resident, estimated ${formatBytes(provider.estimatedBytes)}`;
    return `  ${style.yellow('lazy')}  ${provider.id}: ${provider.loadedShards} shard(s), ${formatBytes(provider.estimatedBytes)} / ${formatBytes(provider.targetBytes)} cache; ${provider.hits} hits, ${provider.misses} misses, ${provider.evictions} evictions`;
  });
  return `${style.bold('Memory strategy')}: ${memory.effectivePolicy}; ${target}.\n${rows.join('\n')}\n${style.dim('The target is advisory. Use an OS or container limit when a hard cap is required.')}`;
}

function modelText(engine, selected, context, style) {
  const publicNames = engine.providers.map((provider) => PUBLIC_KB_CATALOG[provider.manifest.id]?.title ?? provider.manifest.id);
  const fixtureNames = selected.filter((id) => KB_CATALOG[id]).map((id) => KB_CATALOG[id].title);
  const active = [...fixtureNames, ...publicNames];
  return `${style.bold('Active ESLM runtime')}\nModel: ${engine.core.model.manifest.modelId}\nKnowledge: ${active.length ? active.join('; ') : 'base generated model only'}\nSession: ${context.session?.facts?.length ?? 0} temporary fact(s).\nComparability: ${selected.length ? style.yellow('exploratory — selected KBs expose additional knowledge') : style.green('base-model scope')}\n\n${memoryText(engine, style)}`;
}

function traceText(last, style) {
  if (!last) return style.yellow('Ask a question first; there is no trace yet.');
  const lines = [style.bold('Last answer trace'), `Status: ${style.status(last.status)}`, `Method: ${last.reasoning?.method ?? 'not recorded'}`];
  for (const [index, item] of (last.provenance ?? []).entries()) lines.push(`  ${index + 1}. ${item.fact ?? 'fact'} — ${(item.source ?? []).join(', ') || 'source not recorded'}`);
  if (!(last.provenance ?? []).length) lines.push('  No source facts were used.');
  return lines.join('\n');
}

function profileText(last, style) {
  if (!last?.profile) return style.yellow('Profiling is not available for the last answer. Start ESLM with --profile.');
  const profile = last.profile.query ?? last.profile;
  const stages = profile.stages ?? [];
  return `${style.bold('Last query profile')}\n${stages.map((stage) => `  ${stage.name}: ${(stage.wallMilliseconds ?? stage.durationMs ?? 0).toFixed(3)} ms`).join('\n') || '  No stage measurements recorded.'}`;
}

async function interactiveKbText(loaded, style) {
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
  return rows.map((row) => {
    const state = loaded.includes(row.id) ? style.green('[loaded]') : row.available ? style.blue('[ready] ') : style.red('[missing]');
    const fixture = row.id === 'quick' ? `\n  ${style.yellow('Fixture only: not loaded by default; use /load quick for tutorials and regression examples.')}` : '';
    return `${state} ${style.bold(row.title)}\n  Name match: ${row.id}; ${row.size}\n  ${row.role}${fixture}`;
  }).join('\n\n');
}

async function chat(options) {
  const style = createTerminalStyle(options.color, stdout);
  let runtimeOptions = { ...options };
  let selected = selectedRuntimeKbIds(options.kb ?? Object.keys(PUBLIC_KB_CATALOG).join(','));
  let engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
  const terminal = createInterface({ input: stdin, output: stdout });
  let context = {};
  let last;
  stdout.write(`${style.bold(style.blue('ESLM'))} is ready. Public knowledge: ${style.green(selected.join(', ') || 'none')}.\nUse ${style.blue('/help')} for an explanation or ${style.blue('/examples')} for every tested example.\n`);
  while (true) {
    const line = (await terminal.question(style.blue('eslm> '))).trim();
    if (!line) continue;
    if (['/quit', '/exit'].includes(line)) break;
    if (line === '/help') { stdout.write(`${interactiveHelp(style)}\n`); continue; }
    if (line === '/kbs') { stdout.write(`${await interactiveKbText(selected, style)}\n`); continue; }
    if (line === '/model') {
      stdout.write(`${modelText(engine, selected, context, style)}\n`);
      continue;
    }
    if (line === '/memory') { stdout.write(`${memoryText(engine, style)}\n`); continue; }
    if (line.startsWith('/memory ')) {
      const value = line.slice('/memory '.length).trim().toLocaleLowerCase('en-US');
      if (['auto', 'eager', 'lazy'].includes(value)) runtimeOptions = { ...runtimeOptions, 'memory-policy': value };
      else if (/^\d+(?:\.\d+)?$/u.test(value)) runtimeOptions = { ...runtimeOptions, 'memory-mb': value, 'memory-policy': 'auto' };
      else { stdout.write(`${style.red('Expected a size in MiB or auto, eager, or lazy.')}\n`); continue; }
      engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
      stdout.write(`${memoryText(engine, style)}\n`);
      continue;
    }
    if (line === '/clear') { context = {}; last = undefined; stdout.write(`${style.green('Session context cleared.')}\n`); continue; }
    if (line === '/examples') { stdout.write(`${interactiveExamples(style)}\n`); continue; }
    if (line.startsWith('/load ')) {
      try {
        const requested = matchInteractiveKnowledgeBases(line.slice('/load '.length));
        selected = [...new Set([...selected, ...requested])];
        engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
        stdout.write(`${style.green('Loaded knowledge:')} ${selected.join(', ')}.\n`);
      } catch (error) { stdout.write(`${style.red(error.message)}\n`); }
      continue;
    }
    if (line.startsWith('/unload ')) {
      const value = line.slice('/unload '.length).trim();
      try {
        const removed = value === 'all' ? selected : matchInteractiveKnowledgeBases(value);
        selected = selected.filter((id) => !removed.includes(id));
        engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
        stdout.write(`${style.green('Loaded knowledge:')} ${selected.length > 0 ? selected.join(', ') : '(base model only)'}.\n`);
      } catch (error) { stdout.write(`${style.red(error.message)}\n`); }
      continue;
    }
    if (line === '/trace') { stdout.write(`${traceText(last, style)}\n`); continue; }
    if (line === '/profile') { stdout.write(`${profileText(last, style)}\n`); continue; }
    if (line.startsWith('/')) { stdout.write(`${style.red('Unknown command.')} Use ${style.blue('/help')} to see the available commands.\n`); continue; }
    last = await engine.ask(line, context);
    context = last.context ?? context;
    stdout.write(`${style.status(last.status, `[${last.status}]`)} ${last.answer}\n`);
    if (last.input?.corrections?.length) stdout.write(`${style.magenta(`[normalized: ${last.input.normalized}]`)}\n`);
  }
  terminal.close();
}

async function ask(args, options) {
  const text = args.join(' ');
  if (!text) throw new Error('ask requires a question.');
  printJson(await (await engineFor(options)).ask(text));
}

async function runBatch(options) {
  if (!options.input) throw new Error('run requires --input.');
  const inputPath = await resolveProjectPath(options.input);
  const records = await readBatch(inputPath);
  const engine = await engineFor(options);
  const outputs = [];
  for (const record of records) outputs.push({ id: record.id, ...await engine.ask(record.text ?? record.input ?? '') });
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
