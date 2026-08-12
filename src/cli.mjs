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
import { HeuristicLanguageRuntime } from './runtime/heuristic-language-runtime.mjs';
import { LanguageAgentAssistedRuntime } from './runtime/language-agent-assisted-runtime.mjs';
import {
  CodexLanguageNormalizer, DEFAULT_CODEX_NORMALIZATION_MODEL,
} from './language/codex-normalizer.mjs';
import {
  checkDocumentation, publishGeneratedHeuristicBenchmark, publishReport,
} from './docs-reports.mjs';
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
import { editDistance, parseArgs } from './util.mjs';
import { createTerminalStyle } from './terminal-style.mjs';
import {
  interactiveCountAndSeed, interactiveExamplePage, interactiveExamples, interactiveHelp, interactiveKbText,
  interactiveResultText, interactiveSmoke, memoryText, modelText, profileText, strategiesText, traceText, workText,
} from './interface/interactive-presenter.mjs';
import { benchmarkCommand } from './interface/benchmark-command.mjs';
import {
  languageAgentNormalizationEnabled, withLanguageAgentNormalization, withWorkProfile,
  withStrategySelection, workPolicyFromCliOptions,
} from './interface/cli-runtime-policy.mjs';
import { interactiveCompletions } from './interface/interactive-completion.mjs';
import { cliHelpText, cliStartupText } from './interface/cli-help.mjs';
const runFile = promisify(execFile);
let writeOutput = (text) => stdout.write(text);
function printJson(value) { writeOutput(`${JSON.stringify(value, null, 2)}\n`); }
function help() { writeOutput(cliHelpText(DEFAULT_CODEX_NORMALIZATION_MODEL)); }
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
  const workPolicy = workPolicyFromCliOptions(options);
  const base = await createCoreModel(options.model);
  const selected = await selectedRuntimeKbIds(options.kb);
  const publicIds = selected.filter((id) => PUBLIC_KB_CATALOG[id]);
  const graphIds = selected.filter((id) => !PUBLIC_KB_CATALOG[id]);
  const knowledgeBases = await loadKnowledgeBases(graphIds.join(','));
  const core = new EslmEngine(mergeModels(base, knowledgeBases), {
    profile: options.profile,
    workPolicy,
  });
  const loaded = await loadPublicKnowledgeBases(publicIds, {
    memoryMb: options['memory-mb'], memoryPolicy: options['memory-policy'],
  });
  const runtime = new HeuristicLanguageRuntime(
    new EslmRuntime(core, loaded.providers, selected, loaded.memoryPlan, workPolicy),
  );
  if (!languageAgentNormalizationEnabled(options)) return runtime;
  const timeoutMs = Number(options['language-agent-timeout-ms'] ?? options['codex-timeout-ms'] ?? 120_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 600_000) {
    throw new Error('--language-agent-timeout-ms must be between 1000 and 600000.');
  }
  return new LanguageAgentAssistedRuntime(runtime, new CodexLanguageNormalizer({
    model: options['language-agent-model'] ?? options['codex-model'] ?? DEFAULT_CODEX_NORMALIZATION_MODEL,
    command: options['language-agent-command'] ?? options['codex-command'], timeoutMs,
    cache: !options['no-normalization-cache'],
    onExternalInvocation: options.onLanguageAgentInvocation,
  }));
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
  let runtimeOptions = {
    ...withLanguageAgentNormalization(options, languageAgentNormalizationEnabled(options)),
    onLanguageAgentInvocation: () => stdout.write(
      `${style.dim('Thinking: interpreting with the configured Language Agent…')}\n`,
    ),
  };
  let selected = await selectedRuntimeKbIds(options.kb ?? Object.keys(PUBLIC_KB_CATALOG).join(','));
  let engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
  const registeredIds = (await registeredKnowledgeBases()).map((entry) => entry.kbId);
  const completionKbIds = [...new Set([
    ...Object.keys(KB_CATALOG), ...Object.keys(PUBLIC_KB_CATALOG), ...registeredIds,
  ])];
  const terminal = createInterface({
    input: stdin,
    output: stdout,
    completer: (line) => interactiveCompletions(line, completionKbIds),
  });
  let context = {};
  let last;
  stdout.write(`${cliStartupText(style, selected, engine.workPolicy,
    runtimeOptions['external-language-agent'])}\n`);
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
    if (line === '/work') { stdout.write(`${workText(engine, style)}\n`); continue; }
    if (line.startsWith('/work ')) {
      const value = line.slice('/work '.length).trim().toLocaleLowerCase('en-US');
      if (!['quick', 'balanced', 'deep', 'exhaustive-bounded'].includes(value)) {
        stdout.write(`${style.red('Expected quick, balanced, deep, or exhaustive-bounded.')}\n`);
        continue;
      }
      runtimeOptions = withWorkProfile(runtimeOptions, value);
      engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
      stdout.write(`${workText(engine, style)}\n`);
      continue;
    }
    if (line === '/strategies') { stdout.write(`${strategiesText(engine, style)}\n`); continue; }
    if (line.startsWith('/strategies ')) {
      const value = line.slice('/strategies '.length).trim().toLocaleLowerCase('en-US');
      if (!['all', 'language', 'retrieval', 'reasoning', 'construction'].includes(value)) {
        stdout.write(`${style.red('Expected all, language, retrieval, reasoning, or construction.')}\n`);
        continue;
      }
      runtimeOptions = withWorkProfile(runtimeOptions, undefined, value);
      engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
      stdout.write(`${strategiesText(engine, style)}\n`);
      continue;
    }
    if (line.startsWith('/strategy ')) {
      const value = line.slice('/strategy '.length).trim();
      const candidateOptions = withStrategySelection(runtimeOptions, value === 'clear' ? undefined : value);
      try {
        const candidateEngine = await engineFor({ ...candidateOptions, kb: selected.join(',') });
        runtimeOptions = candidateOptions;
        engine = candidateEngine;
      } catch (error) {
        stdout.write(`${style.red(error instanceof Error ? error.message : String(error))}\n`);
        continue;
      }
      stdout.write(`${strategiesText(engine, style)}\n`);
      continue;
    }
    if (line === '/normalize') {
      const configuration = engine.normalizationConfiguration?.();
      stdout.write(configuration
        ? `${style.yellow('Language Agent normalization is on.')} Adapter: Codex; model: ${configuration.model}; reasoning: ${configuration.reasoningEffort}; proposal limit: ${configuration.proposalLimit}; cache: ${configuration.cacheEnabled ? 'on' : 'off'}. Only UNPARSED input is sent externally.\n`
        : `${style.green('Language Agent normalization is off.')} The active path is offline and direct-symbolic.\n`);
      continue;
    }
    if (line === '/normalize on' || line === '/normalize off') {
      runtimeOptions = withLanguageAgentNormalization(runtimeOptions, line.endsWith(' on'));
      engine = await engineFor({ ...runtimeOptions, kb: selected.join(',') });
      stdout.write(line.endsWith(' on')
        ? `${style.yellow('Language Agent normalization enabled.')} The current adapter invokes Codex. Otherwise-unparsed input may leave the offline runtime boundary.\n`
        : `${style.green('Language Agent normalization disabled.')} The active path is offline and direct-symbolic.\n`);
      continue;
    }
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
      try {
        const { page, seed } = interactiveExamplePage(line.slice('/examples'.length));
        stdout.write(`${interactiveExamples(style, seed, page)}\n`);
      } catch (error) { stdout.write(`${style.red(error.message)}\n`); }
      continue;
    }
    if (line === '/smoke' || line.startsWith('/smoke ')) {
      const { count, seed } = interactiveCountAndSeed(line.slice('/smoke'.length), 4096);
      const smokeEngine = await engineFor({
        kb: 'quick',
        'external-language-agent': false,
        'no-external-language-agent': true,
      });
      stdout.write(`${await interactiveSmoke(smokeEngine, ['quick'], style, seed, count)}\n`);
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
    stdout.write(`${interactiveResultText(last, line, style)}\n`);
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
      const scripts = {
        'oewn-2025': 'scripts/build-oewn-kb.mjs',
        'atomic-2020': 'scripts/build-atomic-kb.mjs',
        'geonames-2026': 'scripts/build-geonames-kb.mjs',
        'conceptnet-5.7.0-en': 'scripts/build-conceptnet-kb.mjs',
        'world-relations-1.0': 'scripts/build-world-relations-kb.mjs',
      };
      const script = resolve(PROJECT_ROOT, scripts[id]);
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

async function docs(args) {
  if (args[0] === 'check') { printJson(await checkDocumentation()); return; }
  if (args[0] === 'publish') {
    const published = [];
    for (const kind of ['evaluation', 'benchmark']) {
      try { published.push(await publishReport(kind)); } catch {}
    }
    try { published.push(await publishGeneratedHeuristicBenchmark()); } catch {}
    printJson({ published });
    return;
  }
  throw new Error('Unknown docs action.');
}

async function dispatch(arguments_) {
  const { positional, options } = parseArgs(arguments_);
  const [command, ...args] = positional;
  if (['help', '-h'].includes(command) || options.help) return help();
  if (!command || command === 'chat') return chat(options);
  if (command === 'ask') return ask(args, options);
  if (command === 'run') return runBatch(options);
  if (command === 'train') return train(args, options);
  if (command === 'dataset') return dataset(args, options);
  if (command === 'corpus') return corpus(args, options);
  if (command === 'kb') return knowledgeBase(args, options);
  if (command === 'evaluate') return evaluateCommand(options);
  if (command === 'benchmark') return benchmarkCommand(args, options, { engineFor, printJson });
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
