#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { appendFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { EslmEngine } from './runtime/engine.mjs';
import { EslmRuntime } from './runtime/runtime.mjs';
import {
  BENCHMARK_CATALOG, PUBLIC_RESULT_CATALOG, exportBenchmark, importComparison, runBenchmark,
  scoreExternalPredictions,
} from './benchmarks.mjs';
import { checkDocumentation, publishReport } from './docs-reports.mjs';
import {
  DATASET_CATALOG, datasetStatus, fetchDataset, prepareDataset,
} from './datasets.mjs';
import { corpusCatalog, corpusStatuses } from './corpora.mjs';
import { evaluate } from './evaluation.mjs';
import { readBatch } from './io.mjs';
import { buildKnowledgeBases } from './kb-training.mjs';
import { compileKnowledgeBase } from './kb/compiler.mjs';
import {
  KB_CATALOG, KB_CATALOG_PATH, loadKnowledgeBases, loadKnowledgeBase, mergeModels, registerKnowledgeBase,
  registeredKnowledgeBases, summarizeKnowledgeBase, unregisterKnowledgeBase,
} from './kbs.mjs';
import {
  PUBLIC_KB_CATALOG, loadPublicKnowledgeBases, publicKbStatuses, validatePublicKnowledgeBase,
} from './public-kbs.mjs';
import { createCoreModel } from './runtime/core-model.mjs';
import { PROJECT_ROOT, resolveProjectPath } from './paths.mjs';
import { prepareTraining, validateGeneratedModel, writeCandidateSkeleton } from './training/packet.mjs';
import { prepareAgentWorkspace, runCodexTraining, TRAINING_SKILLS } from './training/agent-runner.mjs';
import { parseArgs } from './util.mjs';
import { editDistance } from './util.mjs';
import { createTerminalStyle } from './terminal-style.mjs';
import {
  interactiveExamples, interactiveHelp, interactiveKbText, interactiveSmoke, memoryText, modelText, profileText,
  traceText,
} from './interface/interactive-presenter.mjs';
const runFile = promisify(execFile);
let writeOutput = (text) => stdout.write(text);

function printJson(value) {
  writeOutput(`${JSON.stringify(value, null, 2)}\n`);
}
function help() {
  stdout.write(`ESLM — offline executable symbolic language model

Usage:
  eslm                         interactive conversation
  eslm ask <question>          answer one question
  eslm run --input FILE [--output FILE]
  eslm train prepare --input FILE --namespace ID [--output FILE]
  eslm train candidate --packet FILE --output DIRECTORY
  eslm train run --packet FILE --output DIRECTORY --skill NAME [--dry-run]
  eslm train validate [--model KB_PACKAGE_DIRECTORY]
  eslm dataset catalog
  eslm dataset fetch --dataset ID
  eslm dataset prepare --dataset ID [--chunk-size 500]
  eslm dataset status --dataset ID
  eslm corpus catalog
  eslm corpus status [--corpus ID[,ID]|all]
  eslm corpus probe --corpus oewn-2025 --archive FILE
  eslm kb list
  eslm kb show ID
  eslm kb register MANIFEST
  eslm kb unregister ID
  eslm kb compile --input RECORDS --output DIRECTORY --id ID --version VERSION --namespace ID
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
  --kb quick,oewn-2025          declarative knowledge packages; use --kb all for every catalog entry
  --memory-mb 512               soft process-memory target; enables adaptive shard loading
  --memory-policy auto          auto, eager, or lazy public-KB loading
  --color auto                  auto, always, or never; structured output is never colored
  --profile                      include per-stage timing, CPU, memory deltas, and work counts
`);
}
async function selectedRuntimeKbIds(value) {
  if (!value) return [];
  const registered = await registeredKnowledgeBases();
  const known = new Set([...Object.keys(KB_CATALOG), ...Object.keys(PUBLIC_KB_CATALOG), ...registered.map((entry) => entry.kbId)]);
  const requested = String(value).split(',').map((item) => item.trim().toLocaleLowerCase('en-US')).filter(Boolean);
  const ids = requested.includes('all') ? [...known] : requested;
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`Unknown knowledge base: ${id}`);
  }
  return [...new Set(ids)];
}
async function engineFor(options) {
  const base = await createCoreModel(options.model);
  const selected = await selectedRuntimeKbIds(options.kb);
  const publicIds = selected.filter((id) => PUBLIC_KB_CATALOG[id]);
  const graphIds = selected.filter((id) => !PUBLIC_KB_CATALOG[id]);
  const knowledgeBases = await loadKnowledgeBases(graphIds.join(','));
  const core = new EslmEngine(mergeModels(base, knowledgeBases), { profile: options.profile });
  const loaded = await loadPublicKnowledgeBases(publicIds, {
    memoryMb: options['memory-mb'], memoryPolicy: options['memory-policy'],
  });
  return new EslmRuntime(core, loaded.providers, selected, loaded.memoryPlan);
}
function globExpression(value) {
  return new RegExp(`^${value.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('.*')}$`, 'iu');
}

async function matchInteractiveKnowledgeBases(value, { includeQuick = true } = {}) {
  const registered = (await registeredKnowledgeBases()).map((entry) => ({
    ...entry, id: entry.kbId, title: entry.kbId, role: `registered ${entry.namespace} package`,
  }));
  const catalog = [
    ...Object.values(PUBLIC_KB_CATALOG),
    ...Object.values(KB_CATALOG).filter((item) => includeQuick && !item.internal),
    ...registered,
  ];
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

async function chat(options) {
  const style = createTerminalStyle(options.color, stdout);
  let runtimeOptions = { ...options };
  let selected = await selectedRuntimeKbIds(options.kb ?? Object.keys(PUBLIC_KB_CATALOG).join(','));
  let engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
  const terminal = createInterface({ input: stdin, output: stdout });
  let context = {};
  let last;
  stdout.write(`${style.bold(style.blue('ESLM'))} is ready. Public knowledge: ${style.green(selected.join(', ') || 'none')}.\nUse ${style.blue('/help')} for an explanation, ${style.blue('/examples')} for varied examples, or ${style.blue('/smoke')} to execute a quick check.\n`);
  while (true) {
    let answer;
    try { answer = await terminal.question(style.blue('eslm> ')); }
    catch (error) {
      if (error.code === 'ERR_USE_AFTER_CLOSE') break;
      throw error;
    }
    const line = answer.trim();
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
    if (line === '/examples' || line.startsWith('/examples ')) {
      const seed = line.slice('/examples'.length).trim() || `${Date.now().toString(36)}-examples`;
      stdout.write(`${interactiveExamples(style, seed)}\n`);
      continue;
    }
    if (line === '/smoke' || line.startsWith('/smoke ')) {
      const seed = line.slice('/smoke'.length).trim() || `${Date.now().toString(36)}-smoke`;
      stdout.write(`${await interactiveSmoke(engine, selected, style, seed)}\n`);
      continue;
    }
    if (line.startsWith('/load ')) {
      try {
        const requested = await matchInteractiveKnowledgeBases(line.slice('/load '.length));
        selected = [...new Set([...selected, ...requested])];
        engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
        stdout.write(`${style.green('Loaded knowledge:')} ${selected.join(', ')}.\n`);
      } catch (error) { stdout.write(`${style.red(error.message)}\n`); }
      continue;
    }
    if (line.startsWith('/unload ')) {
      const value = line.slice('/unload '.length).trim();
      try {
        const removed = value === 'all' ? selected : await matchInteractiveKnowledgeBases(value);
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
    const output = resolve(options.output ?? resolve(tmpdir(), 'eslm-training', 'packet.json'));
    printJson(await prepareTraining({
      input, output, split: options.split ?? 'train', targetNamespace: options.namespace ?? 'local-candidate',
      profile: options.profile,
    }));
    return;
  }
  if (action === 'candidate') {
    if (!options.packet || !options.output) throw new Error('train candidate requires --packet and --output.');
    printJson(await writeCandidateSkeleton(resolve(options.packet), resolve(options.output)));
    return;
  }
  if (action === 'run') {
    if (!options.packet || !options.output) throw new Error('train run requires --packet and --output.');
    const skill = options.skill ?? 'document-to-kb-builder';
    if (!TRAINING_SKILLS[skill]) throw new Error(`train run --skill must be one of: ${Object.keys(TRAINING_SKILLS).join(', ')}.`);
    const prepared = await prepareAgentWorkspace({
      projectRoot: PROJECT_ROOT,
      packetPath: resolve(options.packet),
      outputDirectory: resolve(options.output),
      skill,
    });
    printJson({ ...prepared, receipt: await runCodexTraining({
      workspace: prepared.workspace,
      dryRun: Boolean(options['dry-run']),
      codexCommand: options['codex-command'],
    }) });
    return;
  }
  if (action === 'validate') {
    printJson(await validateGeneratedModel(options.model ?? resolve(PROJECT_ROOT, 'training/KBs/quick/package')));
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

async function knowledgeBase(args, options) {
  const action = args[0];
  if (action === 'list') {
    const entries = [];
    for (const id of Object.keys(KB_CATALOG)) {
      entries.push({ ...KB_CATALOG[id], ...summarizeKnowledgeBase(await loadKnowledgeBase(id)) });
    }
    for (const entry of await registeredKnowledgeBases()) {
      entries.push({ ...entry, ...summarizeKnowledgeBase(await loadKnowledgeBase(entry.kbId)), registered: true });
    }
    entries.push(...await publicKbStatuses());
    printJson(entries);
    return;
  }
  if (action === 'compile') {
    for (const field of ['input', 'output', 'id', 'version', 'namespace']) {
      if (!options[field]) throw new Error(`kb compile requires --${field}.`);
    }
    for (const [name, value] of [['id', options.id], ['namespace', options.namespace]]) {
      if (!/^[a-z][a-z0-9-]*$/u.test(value)) throw new Error(`kb compile --${name} must be a lowercase identifier.`);
    }
    printJson(await compileKnowledgeBase({
      canonicalPath: resolve(options.input),
      outputDirectory: resolve(options.output),
      packageMetadata: {
        kbId: options.id,
        kbVersion: options.version,
        namespace: options.namespace,
        languages: String(options.language ?? 'en').split(',').filter(Boolean),
        domains: String(options.domain ?? 'local').split(',').filter(Boolean),
        capabilities: String(options.capability ?? '').split(',').filter(Boolean),
        trustLevel: options.trust ?? 'unpromoted-candidate',
        benchmarkEligible: false,
        license: options.license ?? 'undeclared-candidate-license',
      },
    }));
    return;
  }
  const target = args[1];
  if (!target) throw new Error(`kb ${action ?? ''} requires an ID or all.`);
  if (action === 'register') {
    printJson(await registerKnowledgeBase(resolve(target)));
    return;
  }
  if (action === 'unregister') {
    printJson({ kbId: target, removed: await unregisterKnowledgeBase(target) });
    return;
  }
  const ids = action === 'build' && target === 'all'
    ? [...Object.keys(KB_CATALOG), ...Object.keys(PUBLIC_KB_CATALOG)]
    : await selectedRuntimeKbIds(target);
  const registered = new Map((await registeredKnowledgeBases()).map((entry) => [entry.kbId, entry]));
  if (action === 'show') {
    if (ids.length !== 1) throw new Error('kb show accepts exactly one ID.');
    if (PUBLIC_KB_CATALOG[ids[0]]) {
      printJson((await publicKbStatuses()).find((item) => item.id === ids[0]));
    } else {
      printJson({ ...(KB_CATALOG[ids[0]] ?? registered.get(ids[0])), ...summarizeKnowledgeBase(await loadKnowledgeBase(ids[0])) });
    }
    return;
  }
  if (action === 'build') {
    const results = [];
    const graphIds = ids.filter((id) => KB_CATALOG[id]);
    if (graphIds.length > 0) results.push(...await buildKnowledgeBases(graphIds));
    const unbuildable = ids.filter((id) => registered.has(id) && !KB_CATALOG[id]);
    if (unbuildable.length > 0) throw new Error(`Registered packages have no repository build adapter: ${unbuildable.join(', ')}.`);
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
      else {
        const manifest = KB_CATALOG[id]
          ? resolve(PROJECT_ROOT, KB_CATALOG[id].model)
          : resolve(dirname(KB_CATALOG_PATH), registered.get(id).manifestPath);
        results.push(await validateGeneratedModel(dirname(manifest)));
      }
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

async function dispatch(arguments_) {
  const { positional, options } = parseArgs(arguments_);
  const [command, ...args] = positional;
  if (!command || command === 'chat') return chat(options);
  if (['help', '-h'].includes(command) || options.help) return help();
  if (command === 'ask') return ask(args, options);
  if (command === 'run') return runBatch(options);
  if (command === 'train') return train(args, options);
  if (command === 'dataset') return dataset(args, options);
  if (command === 'corpus') return corpus(args, options);
  if (command === 'kb') return knowledgeBase(args, options);
  if (command === 'evaluate') return evaluateCommand(options);
  if (command === 'benchmark') return benchmark(args, options);
  if (command === 'docs') return docs(args);
  throw new Error(`Unknown command: ${command}`);
}

export async function main(arguments_ = process.argv.slice(2), io = {}) {
  const previousWriter = writeOutput;
  writeOutput = io.write ?? previousWriter;
  try {
    return await dispatch(arguments_);
  } finally {
    writeOutput = previousWriter;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    process.stderr.write(`eslm: ${error.message}\n`);
    process.exitCode = 1;
  });
}
