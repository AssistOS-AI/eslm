import { performance } from 'node:perf_hooks';
import { KB_CATALOG, loadKnowledgeBase, registeredKnowledgeBases, summarizeKnowledgeBase } from '../kbs.mjs';
import { PUBLIC_KB_CATALOG, publicKbStatuses } from '../public-kbs.mjs';
import {
  REGRESSION_SMOKE_CATALOG_SIZE, REGRESSION_SMOKE_SEED,
  regressionSmokeCases, summarizeSmokeCases,
} from '../conversation-smoke.mjs';
import { assessGeneratedHeuristicCase } from '../evaluation/generated-heuristic-benchmark.mjs';
import {
  BASIC_EVAL_EXAMPLES_PER_PAGE,
  BASIC_EVAL_CASE_COUNT,
  BASIC_EVAL_SMOKE_SEED,
  BASIC_EVAL_SOURCE_CASE_COUNT,
  basicEvalExamplePage,
  basicEvalSmokeSelection,
  executionProfileForBasicEvalCase,
} from '../evaluation/basic-eval-catalog.mjs';
import { scoreBasicEvalCase } from '../evaluation/basic-eval-scoring.mjs';
import { strategyInventory } from '../strategy/strategy-inventory.mjs';

export { interactiveFailureText, interactiveResultText } from './interactive-result-presenter.mjs';

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
  ${command('/work')}Show the exact heuristic, reasoning, provider, and grounding limits.
  ${command('/work PROFILE')}Use quick, balanced, deep, or exhaustive-bounded work.
  ${command('/strategies')}Show the selected trusted strategy preset.
  ${command('/strategies PRESET')}Use all, language, retrieval, reasoning, or construction.
  ${command('/strategy STAGE=IDS')}Select exact built-in strategies; use semicolons between stages.
  ${command('/strategy clear')}Clear exact execution allowlists.
  ${command('/normalize')}Show the external Language Agent normalization policy and state.
  ${command('/normalize on|off')}Enable or disable direct-first Language Agent assistance.
  ${command('/examples [PAGE] [SEED]')}Show 24 stratified Basic Eval cases and structural controls.
  ${command('/smoke [COUNT] [SEED]')}Execute Basic Eval locally without a Language Agent.
  ${command('/trace')}Explain the sources and symbolic steps behind the last answer.
  ${command('/profile')}Show timing and memory measurements for the last answer.
  ${command('/clear')}Forget temporary conversation facts and references.
  ${command('/quit')}Leave ESLM without writing the conversation.

${style.bold('Temporary context')}
You can teach bounded session facts before a question, for example:
  Socrates is a man. Is Socrates a man?
  Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?`;
}

export function interactiveCountAndSeed(value, defaultCount, defaultSeed = REGRESSION_SMOKE_SEED) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  const parsed = /^\d+$/u.test(parts[0] ?? '') ? Number.parseInt(parts.shift(), 10) : defaultCount;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100_000) {
    throw new Error('Interactive case count must be from 1 to 100000.');
  }
  return { count: parsed, seed: parts.join(' ') || defaultSeed };
}

export function interactiveExamplePage(value) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  const page = /^\d+$/u.test(parts[0] ?? '') ? Number.parseInt(parts.shift(), 10) : 1;
  const pageCount = Math.ceil(BASIC_EVAL_CASE_COUNT / BASIC_EVAL_EXAMPLES_PER_PAGE);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) {
    throw new Error(`Example page must be from 1 to ${pageCount}.`);
  }
  return { page, seed: parts.join(' ') || BASIC_EVAL_SMOKE_SEED, pageCount };
}

export async function interactiveExamples(style, seed, page = 1) {
  const groups = new Map();
  const selection = await basicEvalExamplePage({ seed, page });
  for (const example of selection.cases) {
    groups.set(example.category, [...(groups.get(example.category) ?? []), example]);
  }
  const catalog = [...groups].map(([group, examples]) => {
    const rendered = examples.map((example) => {
      const label = example.scoring === 'exact' ? 'exact contract' : 'semantic review';
      const marker = `[${label}]`;
      const colored = example.scoring === 'exact' ? style.green(marker) : style.yellow(marker);
      const profiles = example.profiles.join(', ');
      return `${colored} ${example.prompt}\n    Case: ${example.id}; source: ${example.source.sourceId}; profile: ${profiles}; difficulty: ${example.difficulty}.`;
    });
    return `${style.bold(group)} (${examples.length})\n  ${rendered.join('\n  ')}`;
  }).join('\n\n');
  return `${style.bold('What this evidence means')}
Seed: ${style.blue(seed)} — reuse it with /examples or /smoke.
Page: ${style.green(`${page} of ${selection.pageCount}`)} — ${selection.cases.length} stratified cases shown from ${selection.total.toLocaleString('en-US')} questions and controls. Use ${style.blue(`/examples ${page === selection.pageCount ? 1 : page + 1} ${seed}`)} for the next page.
The suite contains 1,000 development-visible English projections of the assigned Romanian proposals and 10 independently authored structural controls over QUICK. Exact cases have a closed machine oracle; open-form cases require semantic review. ${style.yellow('They are not unseen benchmark evidence.')} /smoke executes them with the external Language Agent disabled.
The separate nonce and metamorphic regression catalog remains part of automated tests so changes that improve these examples cannot silently erase earlier symbolic capabilities.

${catalog}`;
}

function basicEvalExpected(testCase) {
  if (testCase.scoring === 'exact') return testCase.reference.answer;
  const required = testCase.reference.requiredConcepts ?? [];
  return required.length > 0
    ? `semantic review; must cover ${required.join(', ')}`
    : 'semantic review for correctness, grounding, completeness, instruction fit, and naturalness';
}

export async function interactiveBasicEvalSmoke(engines, style, seed, count = BASIC_EVAL_CASE_COUNT) {
  const cases = await basicEvalSmokeSelection({ seed, count });
  const started = performance.now();
  const lines = [style.bold(`Basic Eval smoke — ${count} cases and controls — seed ${seed} — Language Agent off`)];
  const totals = { pass: 0, fail: 0, review: 0 };
  const profileTotals = new Map();
  const stageTotals = new Map();
  const displayedCategories = new Set();
  let displayedFailures = 0;
  for (const testCase of cases) {
    const profile = executionProfileForBasicEvalCase(testCase);
    const engine = engines[profile];
    if (!engine?.ask) throw new TypeError(`Missing Basic Eval runtime for ${profile}.`);
    const result = await engine.ask(testCase.prompt, {}, { grounding: false });
    const assessment = scoreBasicEvalCase(testCase, result);
    totals[assessment.score.state] += 1;
    increment(profileTotals, `${profile}/${assessment.score.state}`);
    if (assessment.diagnosis.earliestStage) increment(stageTotals, assessment.diagnosis.earliestStage);
    const shouldDisplay = !displayedCategories.has(testCase.category)
      || (assessment.score.state === 'fail' && displayedFailures < 48);
    if (!shouldDisplay) continue;
    displayedCategories.add(testCase.category);
    if (assessment.score.state === 'fail') displayedFailures += 1;
    const marker = assessment.score.state === 'pass' ? style.green('PASS')
      : assessment.score.state === 'review' ? style.yellow('REVIEW') : style.red('FAIL');
    const answer = String(result.answer ?? '').replace(/\s+/gu, ' ').slice(0, 180);
    lines.push(`${marker} [${testCase.id} · ${testCase.category} · ${profile}]\n`
      + `     Input: ${testCase.prompt.replace(/\s+/gu, ' ').slice(0, 240)}\n`
      + `     Expected: ${basicEvalExpected(testCase)}\n`
      + `     Actual: ${result.status}; ${answer}${answer.length === 180 ? '…' : ''}`
      + `${assessment.diagnosis.earliestStage ? `\n     Earliest gap: ${assessment.diagnosis.earliestStage}/${assessment.diagnosis.code}` : ''}`);
  }
  const elapsed = performance.now() - started;
  lines.push('', `${style.bold('Summary')}: ${style.green(`${totals.pass} pass`)}, ${style.yellow(`${totals.review} review`)}, ${totals.fail ? style.red(`${totals.fail} fail`) : style.green('0 fail')} in ${elapsed.toFixed(1)} ms.`);
  lines.push(style.dim(`Profile outcomes: ${renderCounts(profileTotals)}.`));
  lines.push(style.dim(`Earliest failed stages: ${renderCounts(stageTotals) || 'none'}.`));
  lines.push(style.dim(`${displayedCategories.size} categories are represented above; failures are capped in the display but all selected cases contribute to the summary.`));
  lines.push(style.dim('Source prompts are development-visible English conversions; QUICK controls are separately authored. No external Language Agent is invoked.'));
  return lines.join('\n');
}

function sameExpectedValues(actual, expected) {
  return expected === undefined || JSON.stringify(actual ?? []) === JSON.stringify(expected);
}

function increment(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function renderCounts(counts) {
  return [...counts].toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, total]) => `${key} ${total}`).join(', ');
}

function heuristicExpected(item) {
  const statuses = item.oracle.acceptableStatuses?.join(' or ')
    ?? `not ${item.oracle.forbiddenStatuses?.join(' or ') ?? 'an unsafe answer'}`;
  const route = item.oracle.expectedRoute ? `; route ${item.oracle.expectedRoute}` : '';
  return `${item.oracle.oracleLevel}; status ${statuses}${route}`;
}

export async function interactiveSmoke(engine, selected, style, seed, count = REGRESSION_SMOKE_CATALOG_SIZE) {
  if (typeof engine?.askDirect !== 'function') {
    throw new TypeError('Interactive smoke requires the complete local HeuristicLanguageRuntime.');
  }
  const directEngine = engine.runtime ?? engine;
  const cases = regressionSmokeCases({ seed, size: count });
  const started = performance.now();
  const lines = [style.bold(`Generated smoke run — ${count} cases — seed ${seed}`)];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const displayedTemplates = new Set();
  const oracleLevels = new Map();
  const routes = new Map();
  const statuses = new Map();
  for (const item of cases) {
    if (item.kb !== 'base' && !selected.includes(item.kb)) {
      skipped += 1;
      lines.push(`${style.yellow('SKIP')} ${item.input} — requires ${item.kb}`);
      continue;
    }
    const result = item.catalogKind === 'heuristic-language'
      ? await engine.ask(item.input, {}, { grounding: false })
      : item.kind === 'preference'
        ? { status: 'SCORED', languageRoute: 'preference-scoring',
          values: [directEngine.score(item.good).score, directEngine.score(item.bad).score] }
        : item.kind === 'task'
          ? directEngine.executeTask(item.taskFrame)
          : await directEngine.ask(item.input, {}, { grounding: false });
    const assessment = item.catalogKind === 'heuristic-language'
      ? assessGeneratedHeuristicCase(item, result)
      : undefined;
    const pass = assessment ? assessment.pass
      : item.kind === 'preference'
        ? result.values[0] > result.values[1]
        : result.status === item.expectedStatus && sameExpectedValues(result.values, item.expectedValues);
    increment(oracleLevels, item.contractLevel);
    increment(routes, result.languageRoute ?? 'no-language-route');
    increment(statuses, result.status);
    if (pass) passed += 1; else failed += 1;
    if (!pass || !displayedTemplates.has(item.templateId)) {
      displayedTemplates.add(item.templateId);
      const marker = pass ? style.green('PASS') : style.red('FAIL');
      const answer = String(result.answer ?? result.values ?? '').replace(/\s+/gu, ' ').slice(0, 120);
      const expected = item.kind === 'preference'
        ? 'first grammatical form receives the higher score'
        : assessment ? heuristicExpected(item)
          : `${item.expectedStatus}; values ${JSON.stringify(item.expectedValues ?? [])}`;
      const actual = item.kind === 'preference'
        ? `${result.status}; scores ${result.values.map((value) => value.toFixed(3)).join(' versus ')}`
        : `${result.status}; ${answer}${answer.length === 120 ? '…' : ''}; values ${JSON.stringify(result.values ?? [])}`;
      const diagnosis = !pass && assessment
        ? `\n     Failed contract: ${assessment.failures.map((failure) => `${failure.stage}/${failure.code}`).join(', ')}`
        : '';
      lines.push(`${marker} [${item.templateId}]\n     Input: ${item.input}\n     Expected: ${expected}\n     Actual: ${actual}${diagnosis}`);
    }
  }
  const elapsed = performance.now() - started;
  lines.push('', `${style.bold('Summary')}: ${style.green(`${passed} passed`)}, ${failed ? style.red(`${failed} failed`) : style.green('0 failed')}, ${style.yellow(`${skipped} skipped`)} in ${elapsed.toFixed(1)} ms.`);
  const summary = summarizeSmokeCases(cases);
  lines.push(style.dim(`Contract levels: ${renderCounts(oracleLevels)}.`));
  lines.push(style.dim(`Observed routes: ${renderCounts(routes)}.`));
  lines.push(style.dim(`Observed statuses: ${renderCounts(statuses)}.`));
  lines.push(style.dim(`Coverage tags: ${Object.entries(summary.sourceFamilies).map(([name, total]) => `${name} ${total}`).join(', ')}.`));
  lines.push(style.dim(`${displayedTemplates.size} template shapes are shown above with their actual runtime outputs; every remaining case contributes to the aggregate.`));
  lines.push(style.dim('Cases are original nonce and metamorphic regressions inspired by capability shapes; they are not copied benchmark items or public benchmark scores.'));
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

export function workText(engine, style) {
  const policy = engine.workPolicy ?? engine.runtime?.workPolicy;
  if (!policy) return style.yellow('The active runtime does not expose a work policy.');
  const limits = policy.effective.limits;
  const overrides = Object.keys(policy.requested.overrides);
  return `${style.bold('Work profile')}: ${style.green(policy.effective.profile)}${overrides.length
    ? `; exact overrides: ${overrides.join(', ')}` : ''}.
  Strategy preset: ${policy.effective.strategies?.preset ?? 'all'}; explicit stage selections: ${Object.keys(policy.effective.strategies?.selected ?? {}).length}.
  Heuristics: ${limits.maximumHeuristicCandidates} candidates, ${limits.maximumHeuristicReparses} reparses, ${limits.maximumHeuristicSegments} segments, ${limits.maximumHeuristicTokens} tokens, confidence ≥ ${limits.minimumHeuristicConfidence}.
  Horn reasoning: ${limits.maximumHornRounds} rounds, ${limits.maximumHornFacts} facts, ${limits.maximumHornJoinAttempts} join attempts.
  Provider routing: ${limits.maximumProviderSources} sources, ${limits.maximumProviderParaphrases} paraphrases per source.
  Grounding: ${limits.maximumGroundingTerms} terms, ${limits.maximumGroundingLookups} lookups, ${limits.maximumGroundingValuesPerLookup} values per lookup, ${limits.maximumGroundingCandidateEntries} candidates, ${limits.maximumGroundingEntries} returned entries, ${limits.maximumGroundingSources} sources, ${formatBytes(limits.maximumGroundingOutputBytes)} entry payload.
${style.dim('All profiles are deterministic and bounded. They do not claim a hard wall-clock deadline.')}`;
}

export function strategiesText(engine, style) {
  const policy = engine.workPolicy ?? engine.runtime?.workPolicy;
  if (!policy) return style.yellow('The active runtime does not expose a strategy policy.');
  const inventory = strategyInventory(policy);
  const visibleRows = inventory.strategies.filter((strategy) => strategy.visible);
  const stages = inventory.stages.filter((stage) => stage.visible > 0).map((stage) => {
    const identities = visibleRows.filter((strategy) => strategy.stage === stage.stage)
      .map((strategy) => `    ${strategy.executionEnabled ? style.green('enabled') : style.yellow(strategy.state)} ${strategy.identity} — ${strategy.implementationState}`);
    return `  ${style.bold(stage.stage)}: ${stage.executionEnabled}/${stage.catalogued} execution-enabled\n${identities.join('\n')}`;
  });
  return `${style.bold('Trusted strategy catalog')}: ${inventory.catalogued} catalogued; ${inventory.executionEnabled} execution-enabled; ${inventory.coordinated} coordinated; ${inventory.instrumentedLocal} instrumented local; ${inventory.planned} planned.
Inventory view: ${style.green(inventory.inventoryView)} (${inventory.visible} visible). Named views do not change execution; exact /strategy allowlists do.
Selection: ${inventory.selectionDigest}
${stages.join('\n')}
${style.dim('Descriptors are static trusted inventory. KBs and corpora cannot supply executable strategy paths.')}`;
}

export function modelText(engine, selected, context, style) {
  const publicNames = engine.providers.map((provider) => PUBLIC_KB_CATALOG[provider.manifest.id]?.title ?? provider.manifest.id);
  const packageNames = selected.filter((id) => !PUBLIC_KB_CATALOG[id]).map((id) => KB_CATALOG[id]?.title ?? id);
  const active = [...packageNames, ...publicNames];
  return `${style.bold('Active ESLM runtime')}\nModel: ${engine.core.model.manifest.modelId}\nKnowledge: ${active.length ? active.join('; ') : 'generic symbolic core only'}\nSession: ${context.session?.facts?.length ?? 0} temporary fact(s).\nComparability: ${selected.length ? style.yellow('exploratory — selected KBs expose additional knowledge') : style.green('base-core scope')}\n\n${workText(engine, style)}\n\n${memoryText(engine, style)}`;
}

export function traceText(last, style) {
  if (!last) return style.yellow('Ask a question first; there is no trace yet.');
  const lines = [style.bold('Last answer trace'), `Status: ${style.status(last.status)}`, `Method: ${last.reasoning?.method ?? 'not recorded'}`];
  for (const [index, item] of (last.provenance ?? []).entries()) {
    const kb = item.kbId ? `; ${item.kbId}${item.kbVersion ? `@${item.kbVersion}` : ''}` : '';
    lines.push(`  ${index + 1}. ${item.fact ?? 'fact'} — ${(item.source ?? []).join(', ') || 'source not recorded'}${kb}`);
  }
  if (!(last.provenance ?? []).length) lines.push('  No source facts were used.');
  if (last.approximation) {
    lines.push('', style.bold('Local heuristic interpretation'));
    lines.push(`  Status: ${last.approximation.status}; candidates: ${last.approximation.candidates?.length ?? 0}.`);
    for (const candidate of (last.approximation.candidates ?? []).slice(0, 8)) {
      const reparse = (last.approximation.reparses ?? []).find((item) =>
        item.candidateId === candidate.candidateId);
      lines.push(`  ${candidate.rank}. ${candidate.text}`);
      lines.push(`     confidence ${candidate.confidence.toFixed(3)}; score ${candidate.rankScore.toFixed(3)}; ${candidate.supportingFamilies.join(', ')}; reparse ${reparse?.status ?? 'not attempted'}.`);
    }
    const declined = (last.approximation.receipt?.familyReceipts ?? [])
      .filter((item) => item.declined).slice(0, 8);
    if (declined.length) {
      lines.push('  Declined decomposition techniques:');
      for (const item of declined) lines.push(`    ${item.family}: ${item.declineReason}`);
    }
    if (last.approximation.ephemeralPremises) {
      lines.push(`  Query-local premises: ${last.approximation.ephemeralPremises.facts.length} fact(s), ${last.approximation.ephemeralPremises.rules.length} rule(s); committed: no.`);
    }
  }
  if (last.requestPlanning?.selectedPlan) {
    const plan = last.requestPlanning.selectedPlan;
    lines.push('', style.bold('Local request plan'));
    lines.push(`  Intent candidates: ${last.requestPlanning.candidates.map((item) => `${item.intent} ${item.confidence.toFixed(3)}`).join(', ')}.`);
    lines.push(`  Selected operations: ${plan.operations.join(' → ')}; confidence ${plan.confidence.toFixed(3)}.`);
    for (const item of plan.subrequests) {
      lines.push(`  ${item.subrequestId}: ${item.operation}; depends on ${(item.dependsOn ?? []).join(', ') || 'nothing'}.`);
    }
    lines.push(`  Output: ${plan.outputContract.length} ${plan.outputContract.artifact}; ${plan.outputContract.format}; gaps remain explicit.`);
  }
  if (last.knowledgeContext) {
    const knowledgeContext = last.knowledgeContext;
    const questions = knowledgeContext.questionAnalysis?.questions ?? [];
    lines.push('', style.bold('Query-local knowledge context'));
    lines.push(`  Questions: ${questions.map((question) =>
      `${question.family}(${(question.topicSurfaces ?? [question.subjectSurface]).filter(Boolean).join(', ') || 'unresolved'})`).join('; ') || 'none recognized'}.`);
    lines.push(`  Topics: ${knowledgeContext.selfQuestionPlan?.topics?.join(', ') || 'none selected'}.`);
    lines.push(`  Retrieval: ${(knowledgeContext.entries ?? []).length} record(s); complete: ${knowledgeContext.search?.complete ? 'yes' : 'no'}; answer authority: none.`);
    for (const receipt of knowledgeContext.search?.receipts ?? []) {
      lines.push(`  Searched ${receipt.kbId}${receipt.kbVersion ? `@${receipt.kbVersion}` : ''}: ${receipt.status}; ${receipt.coverage}.`);
    }
    if (knowledgeContext.realization?.status === 'contextual-fallback') {
      lines.push(`  Fallback: ${knowledgeContext.realization.realizedEntryIds.length} source claim(s) were shown after the precise route ended as ${knowledgeContext.realization.originalStatus}; they are not a proved conclusion.`);
    }
  }
  if (last.normalization) {
    lines.push('', style.bold('External language assistance'));
    if (!last.normalization.attempted) {
      lines.push(`  Not needed: local symbolic processing produced ${last.normalization.triggerStatus} before optional context construction.`);
    } else {
      lines.push(`  ${last.normalization.proposalCount}/${last.normalization.proposalLimit} proposal slot(s) used; ${last.normalization.externalInvocations} external call(s); status ${last.normalization.status}.`);
    }
  }
  if (last.grounding) {
    lines.push('', style.bold('Separate related-evidence search'));
    lines.push(`  Status: ${last.grounding.status}; complete: ${last.grounding.search.complete ? 'yes' : 'no'}.`);
    if (last.grounding.focus?.terms?.length) {
      lines.push(`  Focus terms: ${last.grounding.focus.terms.join(', ')}.`);
    }
    for (const receipt of last.grounding.search.receipts) {
      lines.push(`  Searched ${receipt.kbId}${receipt.kbVersion ? `@${receipt.kbVersion}` : ''}: ${receipt.status}; ${receipt.coverage}.`);
    }
    lines.push('  Related records were not used as answer premises.');
  }
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
