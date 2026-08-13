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

function coherentInteractiveAnswer(value) {
  const surface = String(value ?? '').trim();
  if (!surface) return 'No answer was produced.';
  if (surface.includes('\n') || /^(?:#|[-*]\s|\|)/u.test(surface) || /[.!?][”’"']?$/u.test(surface)) {
    return surface;
  }
  if (/^[+-]?\d+(?:\.\d+)?(?:\s+[A-Z]{3}|\s+\p{L}+s?)?$|^\d{2}:\d{2}$/u.test(surface)) {
    return surface;
  }
  const sentence = `${surface[0].toLocaleUpperCase('en-US')}${surface.slice(1)}`;
  return `${sentence}.`;
}

function processingAnswer(style, details, answer) {
  const muted = style.gray ?? style.dim;
  const thinking = [style.bold(muted('Thinking · symbolic processing')),
    ...details.map((detail) => muted(`  ${detail}`))].join('\n');
  return `${thinking}\n\n${style.bold('Answer')}\n${coherentInteractiveAnswer(answer)}`;
}

export function interactiveResultText(result, original, style) {
  // Related grounding is diagnostic context, not an answer. It remains available through /trace rather than
  // overwhelming the normal conversational response with unrelated records and package revisions.
  const appendGrounding = (primary) => primary;
  if (result.languageRoute === 'english-language-gate-rejected') {
    const assessment = result.languageAssessment;
    const confidence = Number.isFinite(assessment?.confidence)
      ? ` Confidence ${assessment.confidence.toFixed(3)} at threshold ${assessment.threshold.toFixed(3)}.`
      : '';
    return processingAnswer(style, [
      `English language gate: ${assessment?.diagnostic ?? 'The input is likely not English.'}${confidence}`,
      'Execution boundary: no parser, heuristic interpretation, KB lookup, or session update ran.',
      `Status: ${result.status}.`,
    ], result.answer
      ?? 'Translate the request to English, or leave the Language Agent enabled to request an auditable translation proposal.');
  }
  if (result.languageRoute === 'heuristic-request-synthesis') {
    const plan = result.requestPlanning.selectedPlan;
    const operations = plan.operations.join(' → ');
    const realization = result.synthesis?.realization;
    const realized = realization?.coverage?.evidenceRealized ?? 0;
    const rejected = realization?.coverage?.evidenceRejected ?? 0;
    const strategyNames = (realization?.strategyTrace ?? []).map((identity) =>
      identity.replace(/^strategy:result:/u, '').replace(/@\d+$/u, '')).join(' → ');
    return processingAnswer(style, [
      `Request plan coordinator: ${operations}; ${plan.subrequests.length} bounded subrequests; confidence ${plan.confidence.toFixed(3)} (${plan.confidenceBand}).`,
      `Output contract: ${plan.outputContract.length} ${plan.outputContract.artifact}, ${plan.outputContract.format}.`,
      `Evidence admission: ${realized} KB claim(s) realized; ${rejected} related claim(s) withheld from the answer.`,
      'Processing nodes: Result construction coordinator → Claim admission gate → Rhetorical plan builder → Sentence realization coordinator → Document assembly coordinator → Result schema gate.',
      `Selected strategies: ${strategyNames || 'no realization strategy receipt'}.`,
      `Construction confidence: ${Number(realization?.confidence ?? 0).toFixed(3)}; status ${result.status}.`,
      'Authority boundary: citations support wording; relevance alone does not become proof.',
    ], result.answer);
  }
  if (result.languageRoute === 'heuristic-cnl-approximated') {
    const candidate = result.approximation.selectedCandidate;
    const families = candidate.supportingFamilies.join(', ');
    return appendGrounding(processingAnswer(style, [
      'Language route: local heuristic interpretation; no Language Agent.',
      `Original: ${original}`,
      `Interpreted CNL: ${candidate.text}`,
      `Confidence: ${candidate.confidence.toFixed(3)} (${candidate.confidenceBand}); votes: ${families}.`,
      `Session effects: query-local and discarded after this result; status ${result.status}.`,
    ], result.answer));
  }
  if (result.languageRoute === 'heuristic-cnl-ambiguous') {
    const reparses = result.approximation.reparses.filter((item) => item.acceptedSemanticIr);
    return appendGrounding(processingAnswer(style, [
      'Language route: local heuristic interpretations remain ambiguous.',
      `Original: ${original}`,
      ...reparses.slice(0, 4).map((item) =>
        `${item.rank}. ${item.text} — ${item.status}; confidence ${item.confidence.toFixed(3)}.`),
      'No candidate was committed; /trace exposes votes and reparse outcomes.',
    ], result.answer ?? 'I found several plausible interpretations and need the request clarified.'));
  }
  if (result.languageRoute === 'language-agent-normalized') {
    const operation = result.normalization.candidate.operation === 'translation' ? 'Translation' : 'Simplification';
    const cache = result.normalization.cacheHit ? ' (validated cache hit)' : '';
    const activity = `${result.normalization.proposalCount ?? 1}/${result.normalization.proposalLimit ?? 3} proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s)`;
    return appendGrounding(processingAnswer(style, [
      `Language Agent ${operation.toLocaleLowerCase('en-US')} accepted${cache}.`,
      `Original: ${original}`,
      `${operation}: ${result.normalization.candidate.normalizedEnglish}`,
      `Agent activity: ${activity}; symbolic status ${result.status}.`,
    ], result.answer));
  }
  if (result.languageRoute === 'bounded-operation-executed') {
    return coherentInteractiveAnswer(result.answer);
  }
  const details = [
    `Route: ${result.languageRoute ?? 'direct-symbolic'}; status ${result.status}.`,
    `Method: ${result.reasoning?.method ?? result.plan?.methodId ?? 'bounded symbolic execution'}.`,
    `Evidence: ${(result.provenance ?? []).length} answer premise(s); ${(result.usedKbVersions ?? []).length} contributing KB version(s).`,
    'Authority boundary: the displayed wording does not change the machine result status.',
  ];
  if (result.approximation && result.approximation.status !== 'accepted-reparse') {
    const reparses = result.approximation.reparses ?? [];
    details.push(`Local heuristics: ${result.approximation.status}; ${result.approximation.candidates?.length ?? 0} candidate(s), ${reparses.length} symbolic reparse(s).`);
  }
  if (result.normalization?.attempted && result.normalization.status !== 'accepted') {
    const operation = result.normalization.candidate?.operation ?? result.normalization.requestedOperation ?? 'normalization';
    details.push(`Language Agent ${operation} ${result.normalization.status}.`);
    details.push(`Original: ${original}`);
    if (result.normalization.candidate?.normalizedEnglish) {
      details.push(`Proposed English: ${result.normalization.candidate.normalizedEnglish}`);
    }
    if (Number.isInteger(result.normalization.proposalCount)) {
      details.push(`Agent activity: ${result.normalization.proposalCount}/${result.normalization.proposalLimit ?? 3} proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s).`);
    }
    details.push(`Reason: ${result.normalization.diagnostic
      ?? result.normalization.validation?.errors?.join('; ')
      ?? `the second symbolic parse returned ${result.normalization.reparseStatus ?? 'an unsupported result'}`}`);
  }
  if (!result.normalization?.attempted) return coherentInteractiveAnswer(result.answer);
  return appendGrounding(processingAnswer(style, details, result.answer));
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
