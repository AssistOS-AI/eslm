import { performance } from 'node:perf_hooks';
import { KB_CATALOG, loadKnowledgeBase, registeredKnowledgeBases, summarizeKnowledgeBase } from '../kbs.mjs';
import { PUBLIC_KB_CATALOG, publicKbStatuses } from '../public-kbs.mjs';
import {
  REGRESSION_SMOKE_CATALOG_SIZE, REGRESSION_SMOKE_SEED, SMOKE_EXAMPLES_PER_PAGE,
  regressionSmokeCases, stratifiedSmokeCases, summarizeSmokeCases,
} from '../conversation-smoke.mjs';
import { assessGeneratedHeuristicCase } from '../evaluation/generated-heuristic-benchmark.mjs';
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
  ${command('/examples [PAGE] [SEED]')}Show 24 stratified heuristic and core smoke cases.
  ${command('/smoke [COUNT] [SEED]')}Execute the combined heuristic and core regression catalog.
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
  const pageCount = Math.ceil(REGRESSION_SMOKE_CATALOG_SIZE / SMOKE_EXAMPLES_PER_PAGE);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) {
    throw new Error(`Example page must be from 1 to ${pageCount}.`);
  }
  return { page, seed: parts.join(' ') || REGRESSION_SMOKE_SEED, pageCount };
}

export function interactiveExamples(style, seed, page = 1) {
  const groups = new Map();
  const all = regressionSmokeCases({ size: REGRESSION_SMOKE_CATALOG_SIZE, seed });
  const displayOrder = stratifiedSmokeCases(all);
  const start = (page - 1) * SMOKE_EXAMPLES_PER_PAGE;
  const generated = displayOrder.slice(start, start + SMOKE_EXAMPLES_PER_PAGE);
  const pageCount = Math.ceil(all.length / SMOKE_EXAMPLES_PER_PAGE);
  for (const example of generated) {
    groups.set(example.group, [...(groups.get(example.group) ?? []), example]);
  }
  const catalog = [...groups].map(([group, examples]) => {
    const rendered = examples.map((example) => {
      const label = example.catalogKind === 'heuristic-language'
        ? example.oracle.oracleLevel
        : example.label ?? (example.expectedStatus === 'UNKNOWN' ? 'unknown by design' : 'core execution');
      const marker = `[${label}]`;
      const colored = label === 'unsupported' ? style.red(marker)
        : label === 'unknown by design' || label.includes('abstention') || label === 'proposal-only'
          ? style.yellow(marker) : style.green(marker);
      const context = example.catalogKind === 'heuristic-language'
        ? `domain: ${example.domain}; complexity: ${example.complexity}; target: ${example.targetFamily}`
        : `capability: ${example.group}`;
      return `${colored} ${example.input}\n    Template: ${example.templateId}; ${context}; control: ${example.metamorphicRelation}.`;
    });
    return `${style.bold(group)} (${examples.length})\n  ${rendered.join('\n  ')}`;
  }).join('\n\n');
  return `${style.bold('What this evidence means')}
Seed: ${style.blue(seed)} — reuse it with /examples or /smoke.
Page: ${style.green(`${page} of ${pageCount}`)} — ${generated.length} stratified cases shown, display positions ${start + 1}–${start + generated.length} of ${all.length}. Use ${style.blue(`/examples ${page === pageCount ? 1 : page + 1} ${seed}`)} for the next page.
Current executable evidence: ${style.green('1,200 heuristic-language cases plus 2,896 core regressions')} covering all 43 DS022 technique shapes and eight contract levels alongside 26 direct, state, relation, preference, and typed-task templates.
WordNet and ATOMIC checks are source-exposed integration evidence, ${style.yellow('not public benchmark scores')}.
The ${style.blue('benchmark probe --benchmark all')} report includes every registered public and research row. A single-ID probe returns only that benchmark. Each row distinguishes current execution from stored receipt assembly and current from stale frozen dependencies; generated examples never substitute for those receipts.

${catalog}`;
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

export function interactiveResultText(result, original, style) {
  const appendGrounding = (primary) => {
    if (!result.grounding) return primary;
    const bundle = result.grounding;
    const lines = [primary, '', style.bold('Related KB evidence — not an answer')];
    if (bundle.focus?.terms?.length) {
      lines.push(style.dim(`  Search focus: ${bundle.focus.terms.join(', ')}.`));
    }
    if (bundle.entries.length === 0) {
      lines.push(bundle.search.complete
        ? '  The bounded search found no related records.'
        : '  The bounded search was incomplete and found no related records.');
    } else {
      for (const [index, entry] of bundle.entries.entries()) {
        const source = `${entry.kbId}${entry.kbVersion ? `@${entry.kbVersion}` : ''}`;
        lines.push(`  ${index + 1}. ${entry.statement} [${source}]`);
      }
    }
    if (!bundle.search.complete) {
      const reasons = [...new Set(bundle.search.receipts.flatMap((receipt) => receipt.truncationReasons))];
      lines.push(style.yellow(`  Search coverage is incomplete${reasons.length ? `: ${reasons.join(', ')}` : '.'}`));
    }
    lines.push(style.dim('  These records may help a person or downstream model reformulate the question; they do not support the primary answer.'));
    return lines.join('\n');
  };
  if (result.languageRoute === 'english-language-gate-rejected') {
    const assessment = result.languageAssessment;
    const confidence = Number.isFinite(assessment?.confidence)
      ? ` Confidence ${assessment.confidence.toFixed(3)} at threshold ${assessment.threshold.toFixed(3)}.`
      : '';
    return `${style.status(result.status, `[${result.status}]`)} ${style.yellow('English language check did not accept this input.')}
  ${assessment?.diagnostic ?? 'The input is likely not English.'}${confidence}
  Translate the request to English, or leave the Language Agent enabled to request an auditable translation proposal.
  No parser, heuristic interpretation, KB lookup, or session update ran.`;
  }
  if (result.languageRoute === 'heuristic-request-synthesis') {
    const plan = result.requestPlanning.selectedPlan;
    const operations = plan.operations.join(' → ');
    const realization = result.synthesis?.realization;
    const realized = realization?.coverage?.evidenceRealized ?? 0;
    const rejected = realization?.coverage?.evidenceRejected ?? 0;
    const strategyNames = (realization?.strategyTrace ?? []).map((identity) =>
      identity.replace(/^strategy:result:/u, '').replace(/@\d+$/u, '')).join(' → ');
    const muted = style.gray ?? style.dim;
    const processing = `${style.bold('Thinking · symbolic processing')}
  Request plan coordinator: ${operations}; ${plan.subrequests.length} bounded subrequests; confidence ${plan.confidence.toFixed(3)} (${plan.confidenceBand}).
  Output contract: ${plan.outputContract.length} ${plan.outputContract.artifact}, ${plan.outputContract.format}.
  Evidence admission: ${realized} KB claim(s) realized; ${rejected} related claim(s) withheld from the answer.
  Construction circuit: ${strategyNames || 'no realization strategy receipt'}.
  Construction confidence: ${Number(realization?.confidence ?? 0).toFixed(3)}; status ${result.status}.
  Authority boundary: citations support wording; relevance alone does not become proof.`;
    return `${muted(processing)}

${style.bold('Answer')}
${result.answer}`;
  }
  if (result.languageRoute === 'heuristic-cnl-approximated') {
    const candidate = result.approximation.selectedCandidate;
    const families = candidate.supportingFamilies.join(', ');
    return appendGrounding(`${style.blue('Local heuristic interpretation accepted')} — no Language Agent
  Original: ${original}
  Interpreted CNL: ${candidate.text}
  Confidence: ${candidate.confidence.toFixed(3)} (${candidate.confidenceBand}); votes: ${families}.
  Session effects: query-local and discarded after this result.
  Symbolic result: ${style.status(result.status, `[${result.status}]`)} ${result.answer}`);
  }
  if (result.languageRoute === 'heuristic-cnl-ambiguous') {
    const reparses = result.approximation.reparses.filter((item) => item.acceptedSemanticIr);
    return appendGrounding(`${style.yellow('Local heuristic interpretations remain ambiguous')}
  Original: ${original}
${reparses.slice(0, 4).map((item) => `  ${item.rank}. ${item.text} — ${item.status}; confidence ${item.confidence.toFixed(3)}`).join('\n')}
  No candidate was committed. Use ${style.blue('/trace')} for votes and reparse outcomes.`);
  }
  if (result.languageRoute === 'language-agent-normalized') {
    const operation = result.normalization.candidate.operation === 'translation' ? 'Translation' : 'Simplification';
    const cache = result.normalization.cacheHit ? ' (validated cache hit)' : '';
    const activity = `${result.normalization.proposalCount ?? 1}/${result.normalization.proposalLimit ?? 3} proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s)`;
    return appendGrounding(`${style.yellow(`Language Agent ${operation.toLocaleLowerCase('en-US')} accepted${cache}`)}\n  Original: ${original}\n  ${operation}: ${result.normalization.candidate.normalizedEnglish}\n  Agent activity: ${activity}\n  Symbolic result: ${style.status(result.status, `[${result.status}]`)} ${result.answer}`);
  }
  const lines = [`${style.status(result.status, `[${result.status}]`)} ${result.answer}`];
  if (result.approximation && result.approximation.status !== 'accepted-reparse') {
    const reparses = result.approximation.reparses ?? [];
    lines.push(style.yellow(`Local heuristics: ${result.approximation.status}; ${result.approximation.candidates?.length ?? 0} candidate(s), ${reparses.length} symbolic reparse(s).`));
  }
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
  return appendGrounding(lines.join('\n'));
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
