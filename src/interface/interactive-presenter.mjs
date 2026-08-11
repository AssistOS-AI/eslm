import { performance } from 'node:perf_hooks';
import { KB_CATALOG, loadKnowledgeBase, registeredKnowledgeBases, summarizeKnowledgeBase } from '../kbs.mjs';
import { PUBLIC_KB_CATALOG, publicKbStatuses } from '../public-kbs.mjs';
import {
  REGRESSION_SMOKE_CATALOG_SIZE, SMOKE_EXAMPLES_PER_PAGE, regressionSmokeCases, smokeCatalogSummary,
} from '../conversation-smoke.mjs';

export function interactiveHelp(style) {
  const command = (value) => style.blue(value.padEnd(28));
  return `${style.bold('Interactive commands')}
  ${command('Tab')}Complete slash commands, command values, and KB names.
  ${command('/help')}Explain every interactive command and its purpose.
  ${command('/kbs')}Show installed knowledge sources, sizes, roles, and load state.
  ${command('/load all')}Load every installed public KB. QUICK remains opt-in.
  ${command('/load WORDS')}Load by name, title word, wildcard, or a close spelling.
  ${command('/unload WORDS|all')}Remove matching KBs without losing session facts.
  ${command('/model')}Explain the active core, knowledge packages, session, and comparison scope.
  ${command('/memory')}Show eager/lazy strategy and current shard-cache use.
  ${command('/memory N')}Set a soft memory target in MiB and rebuild KB providers.
  ${command('/memory auto|eager|lazy')}Select adaptive, full, or shard-based loading.
  ${command('/normalize')}Show the external Language Agent normalization policy and state.
  ${command('/normalize on|off')}Enable or disable direct-first Language Agent assistance.
  ${command('/examples [PAGE] [SEED]')}Show a page of 24 diverse cases from the smoke corpus.
  ${command('/smoke [COUNT] [SEED]')}Execute the generated regression catalog.
  ${command('/trace')}Explain the sources and symbolic steps behind the last answer.
  ${command('/profile')}Show timing and memory measurements for the last answer.
  ${command('/clear')}Forget temporary conversation facts and references.
  ${command('/quit')}Leave ESLM without writing the conversation.

${style.bold('Temporary context')}
You can teach bounded session facts before a question, for example:
  Socrates is a man. Is Socrates a man?
  Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?`;
}

export function interactiveCountAndSeed(value, defaultCount, suffix) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  const parsed = /^\d+$/u.test(parts[0] ?? '') ? Number.parseInt(parts.shift(), 10) : defaultCount;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100_000) {
    throw new Error('Interactive case count must be from 1 to 100000.');
  }
  return { count: parsed, seed: parts.join(' ') || `${Date.now().toString(36)}-${suffix}` };
}

export function interactiveExamplePage(value) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  const page = /^\d+$/u.test(parts[0] ?? '') ? Number.parseInt(parts.shift(), 10) : 1;
  const pageCount = Math.ceil(REGRESSION_SMOKE_CATALOG_SIZE / SMOKE_EXAMPLES_PER_PAGE);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) {
    throw new Error(`Example page must be from 1 to ${pageCount}.`);
  }
  return { page, seed: parts.join(' ') || 'stage-a-regression-v1', pageCount };
}

export function interactiveExamples(style, seed, page = 1) {
  const groups = new Map();
  const all = regressionSmokeCases({ size: REGRESSION_SMOKE_CATALOG_SIZE, seed });
  const start = (page - 1) * SMOKE_EXAMPLES_PER_PAGE;
  const generated = all.slice(start, start + SMOKE_EXAMPLES_PER_PAGE);
  const pageCount = Math.ceil(all.length / SMOKE_EXAMPLES_PER_PAGE);
  for (const example of generated) {
    groups.set(example.group, [...(groups.get(example.group) ?? []), example]);
  }
  const catalog = [...groups].map(([group, examples]) => {
    const rendered = examples.map((example) => {
      const label = example.label ?? (example.expectedStatus === 'UNKNOWN' ? 'unknown by design' : 'supported');
      const marker = `[${label}]`;
      const colored = label === 'unsupported' ? style.red(marker)
        : label === 'unknown by design' ? style.yellow(marker) : style.green(marker);
      return `${colored} ${example.input}\n    Template: ${example.templateId}; metamorphic control: ${example.metamorphicRelation}.`;
    });
    return `${style.bold(group)} (${examples.length})\n  ${rendered.join('\n  ')}`;
  }).join('\n\n');
  return `${style.bold('What this evidence means')}
Seed: ${style.blue(seed)} — reuse it with /examples or /smoke.
Page: ${style.green(`${page} of ${pageCount}`)} — ${generated.length} cases shown, cases ${start + 1}–${start + generated.length} of ${all.length}. Use ${style.blue(`/examples ${page === pageCount ? 1 : page + 1} ${seed}`)} for the next page.
Current executable evidence: ${style.green('generated nonce regressions plus fixed fixtures')} for controlled language, state replacement, task planning, retrieval, preference scoring, and safe Horn deduction.
WordNet and ATOMIC checks are source-exposed integration evidence, ${style.yellow('not public benchmark scores')}.
The generated public report includes every registered public and research benchmark row, with fresh, development, diagnostic, unscored-method, and unavailable-oracle evidence kept distinct. Use ${style.blue('benchmark status')} and ${style.blue('benchmark probe')} for source-specific denominators and receipts; generated examples never substitute for those probes.

${catalog}`;
}

function sameExpectedValues(actual, expected) {
  return expected === undefined || JSON.stringify(actual ?? []) === JSON.stringify(expected);
}

export async function interactiveSmoke(engine, selected, style, seed, count = REGRESSION_SMOKE_CATALOG_SIZE) {
  const directEngine = engine.runtime ?? engine;
  const cases = regressionSmokeCases({ seed, size: count });
  const started = performance.now();
  const lines = [style.bold(`Generated smoke run — ${count} cases — seed ${seed}`)];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const displayedTemplates = new Set();
  for (const item of cases) {
    if (item.kb !== 'base' && !selected.includes(item.kb)) {
      skipped += 1;
      lines.push(`${style.yellow('SKIP')} ${item.input} — requires ${item.kb}`);
      continue;
    }
    const result = item.kind === 'preference'
      ? { status: 'SCORED', values: [directEngine.score(item.good).score, directEngine.score(item.bad).score] }
      : item.kind === 'task'
        ? directEngine.executeTask(item.taskFrame)
      : await directEngine.ask(item.input, {});
    const pass = item.kind === 'preference'
      ? result.values[0] > result.values[1]
      : result.status === item.expectedStatus && sameExpectedValues(result.values, item.expectedValues);
    if (pass) passed += 1; else failed += 1;
    if (!pass || !displayedTemplates.has(item.templateId)) {
      displayedTemplates.add(item.templateId);
      const marker = pass ? style.green('PASS') : style.red('FAIL');
      const answer = String(result.answer ?? result.values ?? '').replace(/\s+/gu, ' ').slice(0, 120);
      const expected = item.kind === 'preference'
        ? 'first grammatical form receives the higher score'
        : `${item.expectedStatus}; values ${JSON.stringify(item.expectedValues ?? [])}`;
      const actual = item.kind === 'preference'
        ? `${result.status}; scores ${result.values.map((value) => value.toFixed(3)).join(' versus ')}`
        : `${result.status}; ${answer}${answer.length === 120 ? '…' : ''}; values ${JSON.stringify(result.values ?? [])}`;
      lines.push(`${marker} [${item.templateId}]\n     Input: ${item.input}\n     Expected: ${expected}\n     Actual: ${actual}`);
    }
  }
  const elapsed = performance.now() - started;
  lines.push('', `${style.bold('Summary')}: ${style.green(`${passed} passed`)}, ${failed ? style.red(`${failed} failed`) : style.green('0 failed')}, ${style.yellow(`${skipped} skipped`)} in ${elapsed.toFixed(1)} ms.`);
  const summary = smokeCatalogSummary(count);
  lines.push(style.dim(`Coverage tags: ${Object.entries(summary.sourceFamilies).map(([name, total]) => `${name} ${total}`).join(', ')}.`));
  lines.push(style.dim(`${displayedTemplates.size} template shapes are shown above with their actual runtime outputs; every remaining case contributes to the aggregate.`));
  lines.push(style.dim('Cases are original nonce and metamorphic regressions inspired by capability shapes; they are not copied benchmark items or public benchmark scores.'));
  return lines.join('\n');
}

export function interactiveResultText(result, original, style) {
  if (result.languageRoute === 'language-agent-normalized') {
    const operation = result.normalization.candidate.operation === 'translation' ? 'Translation' : 'Simplification';
    const cache = result.normalization.cacheHit ? ' (validated cache hit)' : '';
    const activity = `${result.normalization.proposalCount ?? 1}/${result.normalization.proposalLimit ?? 3} proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s)`;
    return `${style.yellow(`Language Agent ${operation.toLocaleLowerCase('en-US')} accepted${cache}`)}\n  Original: ${original}\n  ${operation}: ${result.normalization.candidate.normalizedEnglish}\n  Agent activity: ${activity}\n  Symbolic result: ${style.status(result.status, `[${result.status}]`)} ${result.answer}`;
  }
  const lines = [`${style.status(result.status, `[${result.status}]`)} ${result.answer}`];
  if (result.normalization?.attempted && result.normalization.status !== 'accepted') {
    const operation = result.normalization.candidate?.operation ?? result.normalization.requestedOperation ?? 'normalization';
    lines.push(style.red(`Language Agent ${operation} ${result.normalization.status}.`));
    lines.push(`  Original: ${original}`);
    if (result.normalization.candidate?.normalizedEnglish) {
      lines.push(`  Proposed English: ${result.normalization.candidate.normalizedEnglish}`);
    }
    if (Number.isInteger(result.normalization.proposalCount)) {
      lines.push(`  Agent activity: ${result.normalization.proposalCount}/${result.normalization.proposalLimit ?? 3} proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s).`);
    }
    lines.push(`  Reason: ${result.normalization.diagnostic
      ?? result.normalization.validation?.errors?.join('; ')
      ?? `the second symbolic parse returned ${result.normalization.reparseStatus ?? 'an unsupported result'}`}`);
  }
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
