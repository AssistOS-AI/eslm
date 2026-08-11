import { performance } from 'node:perf_hooks';
import { KB_CATALOG, loadKnowledgeBase, registeredKnowledgeBases, summarizeKnowledgeBase } from '../kbs.mjs';
import { PUBLIC_KB_CATALOG, publicKbStatuses } from '../public-kbs.mjs';
import { smokeExamples } from '../conversation-smoke.mjs';

export function interactiveHelp(style) {
  const command = (value) => style.blue(value.padEnd(28));
  return `${style.bold('Interactive commands')}
  ${command('/help')}Explain every interactive command and its purpose.
  ${command('/kbs')}Show installed knowledge sources, sizes, roles, and load state.
  ${command('/load all')}Load every installed public KB. QUICK remains opt-in.
  ${command('/load WORDS')}Load by name, title word, wildcard, or a close spelling.
  ${command('/unload WORDS|all')}Remove matching KBs without losing session facts.
  ${command('/model')}Explain the active core, knowledge packages, session, and comparison scope.
  ${command('/memory')}Show eager/lazy strategy and current shard-cache use.
  ${command('/memory N')}Set a soft memory target in MiB and rebuild KB providers.
  ${command('/memory auto|eager|lazy')}Select adaptive, full, or shard-based loading.
  ${command('/examples [SEED]')}Select representative Stage A examples reproducibly.
  ${command('/smoke [SEED]')}Execute a fast generated regression check.
  ${command('/trace')}Explain the sources and symbolic steps behind the last answer.
  ${command('/profile')}Show timing and memory measurements for the last answer.
  ${command('/clear')}Forget temporary conversation facts and references.
  ${command('/quit')}Leave ESLM without writing the conversation.

${style.bold('Temporary context')}
You can teach bounded session facts before a question, for example:
  Socrates is a man. Is Socrates a man?
  Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?`;
}

export function interactiveExamples(style, seed) {
  const groups = new Map();
  for (const example of smokeExamples({ seed, maxPerGroup: 4 })) {
    groups.set(example.group, [...(groups.get(example.group) ?? []), example]);
  }
  const catalog = [...groups].map(([group, examples]) => {
    const rendered = examples.map((example) => {
      const marker = `[${example.label}]`;
      const colored = example.label === 'unsupported' ? style.red(marker)
        : example.label === 'unknown by design' ? style.yellow(marker) : style.green(marker);
      return `${colored} ${example.input}`;
    });
    return `${style.bold(group)} (${examples.length})\n  ${rendered.join('\n  ')}`;
  }).join('\n\n');
  return `${style.bold('What this evidence means')}
Seed: ${style.blue(seed)} — reuse it with /examples or /smoke.
Current executable evidence: ${style.green('Stage A fixed fixtures')} for controlled language, task planning, retrieval, and safe Horn deduction.
WordNet and ATOMIC checks are source-exposed integration evidence, ${style.yellow('not public benchmark scores')}.
Prepared legacy benchmark data was cleared; adapters must be rebuilt under the current split and packet contracts.

${catalog}`;
}

function sameExpectedValues(actual, expected) {
  return expected === undefined || JSON.stringify(actual ?? []) === JSON.stringify(expected);
}

export async function interactiveSmoke(engine, selected, style, seed) {
  const cases = smokeExamples({ seed, maxPerGroup: 2 });
  const started = performance.now();
  const lines = [style.bold(`Generated smoke run — seed ${seed}`)];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const item of cases) {
    if (item.kb !== 'base' && !selected.includes(item.kb)) {
      skipped += 1;
      lines.push(`${style.yellow('SKIP')} ${item.input} — requires ${item.kb}`);
      continue;
    }
    const result = await engine.ask(item.input, {});
    const pass = result.status === item.expectedStatus && sameExpectedValues(result.values, item.expectedValues);
    if (pass) passed += 1; else failed += 1;
    const marker = pass ? style.green('PASS') : style.red('FAIL');
    const answer = String(result.answer ?? '').replace(/\s+/gu, ' ').slice(0, 120);
    lines.push(`${marker} ${item.input}\n     ${style.status(result.status, result.status)} — ${answer}${answer.length === 120 ? '…' : ''}`);
  }
  const elapsed = performance.now() - started;
  lines.push('', `${style.bold('Summary')}: ${style.green(`${passed} passed`)}, ${failed ? style.red(`${failed} failed`) : style.green('0 failed')}, ${style.yellow(`${skipped} skipped`)} in ${elapsed.toFixed(1)} ms.`);
  lines.push(style.dim('This is an internal generated regression check, not a public benchmark score.'));
  return lines.join('\n');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'not measured';
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}

export function memoryText(engine, style) {
  const memory = engine.memorySnapshot();
  if (!memory || memory.providers.length === 0) return `${style.yellow('No public KB is active.')} There is no public shard cache to report.`;
  const target = memory.softTarget
    ? `${memory.targetMiB} MiB soft whole-process target`
    : memory.requestedPolicy === 'lazy'
      ? 'lazy loading was explicitly requested; each public provider receives a 64 MiB cache'
      : memory.requestedPolicy === 'eager'
        ? 'complete loading was explicitly requested without a soft target'
        : 'no memory target; adaptive mode selected complete loading';
  const rows = memory.providers.map((provider) => provider.mode === 'eager'
    ? `  ${style.green('eager')} ${provider.id}: complete model resident, estimated ${formatBytes(provider.estimatedBytes)}`
    : `  ${style.yellow('lazy')} ${provider.id}: ${provider.loadedShards} shard(s), ${formatBytes(provider.estimatedBytes)} / ${formatBytes(provider.targetBytes)} cache; ${provider.hits} hits, ${provider.misses} misses, ${provider.evictions} evictions`);
  return `${style.bold('Memory strategy')}: ${memory.effectivePolicy}; ${target}.\n${rows.join('\n')}\n${style.dim('The target is advisory. Use an OS or container limit when a hard cap is required.')}`;
}

export function modelText(engine, selected, context, style) {
  const publicNames = engine.providers.map((provider) => PUBLIC_KB_CATALOG[provider.manifest.id]?.title ?? provider.manifest.id);
  const packageNames = selected.filter((id) => !PUBLIC_KB_CATALOG[id]).map((id) => KB_CATALOG[id]?.title ?? id);
  const active = [...packageNames, ...publicNames];
  return `${style.bold('Active ESLM runtime')}\nModel: ${engine.core.model.manifest.modelId}\nKnowledge: ${active.length ? active.join('; ') : 'generic symbolic core only'}\nSession: ${context.session?.facts?.length ?? 0} temporary fact(s).\nComparability: ${selected.length ? style.yellow('exploratory — selected KBs expose additional knowledge') : style.green('base-core scope')}\n\n${memoryText(engine, style)}`;
}

export function traceText(last, style) {
  if (!last) return style.yellow('Ask a question first; there is no trace yet.');
  const lines = [style.bold('Last answer trace'), `Status: ${style.status(last.status)}`, `Method: ${last.reasoning?.method ?? 'not recorded'}`];
  for (const [index, item] of (last.provenance ?? []).entries()) {
    lines.push(`  ${index + 1}. ${item.fact ?? 'fact'} — ${(item.source ?? []).join(', ') || 'source not recorded'}`);
  }
  if (!(last.provenance ?? []).length) lines.push('  No source facts were used.');
  return lines.join('\n');
}

export function profileText(last, style) {
  if (!last?.profile) return style.yellow('Profiling is not available for the last answer. Start ESLM with --profile.');
  const stages = (last.profile.query ?? last.profile).stages ?? [];
  return `${style.bold('Last query profile')}\n${stages.map((stage) => `  ${stage.name}: ${(stage.wallMilliseconds ?? stage.durationMs ?? 0).toFixed(3)} ms`).join('\n') || '  No stage measurements recorded.'}`;
}

export async function interactiveKbText(loaded, style) {
  const quick = summarizeKnowledgeBase(await loadKnowledgeBase('quick'));
  const publicStatuses = await publicKbStatuses();
  const registered = await registeredKnowledgeBases();
  const rows = [{
    id: 'quick', title: 'QUICK development fixtures', role: 'authored smoke tests and tutorials',
    available: true, size: `${quick.directFactCount} direct facts / ${quick.ruleCount} rules`,
  }, ...publicStatuses.map((status) => ({
    id: status.id, title: status.title, role: status.role, available: status.available,
    size: status.counts ? (status.id === 'oewn-2025'
      ? `${status.counts.synsets} synsets / ${status.counts.uniqueLemmas} lemmas`
      : `${status.counts.retainedUniqueNonNoneTuples} tuples / ${status.counts.uniqueEvents} events`) : 'not built',
  })), ...registered.map((entry) => ({
    id: entry.kbId, title: entry.kbId, role: `registered package in namespace ${entry.namespace}`,
    available: true, size: `version ${entry.kbVersion}`,
  }))];
  return rows.map((row) => {
    const state = loaded.includes(row.id) ? style.green('[loaded]') : row.available ? style.blue('[ready] ') : style.red('[missing]');
    return `${state} ${style.bold(row.title)}\n  Name match: ${row.id}; ${row.size}\n  ${row.role}`;
  }).join('\n\n');
}
