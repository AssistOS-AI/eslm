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

function workBudgetDetail(result) {
  const policy = result?.workPolicy;
  const limits = policy?.effective?.limits;
  if (!limits) return undefined;
  return `Resource budget: ${policy.effective.profile}; up to ${limits.maximumHeuristicCandidates} local interpretations, `
    + `${limits.maximumHeuristicReparses} reparses, ${limits.maximumProviderSources} provider sources, `
    + `${limits.maximumGroundingLookups} context lookups, and `
    + `${limits.maximumHornJoinAttempts.toLocaleString('en-US')} rule joins.`;
}

function resultOutcome(status) {
  return ({
    SOLVED: 'a precise symbolic answer was established',
    DEFEASIBLE: 'an evidence-backed but defeasible answer was found',
    PARTIAL: 'only a supported partial answer could be constructed',
    UNKNOWN: 'the request was understood, but no answer was established',
    UNPARSED: 'the full request could not be represented',
    AMBIGUOUS: 'more than one interpretation or answer remains',
    MISSING_KNOWLEDGE: 'the required knowledge is not available',
    NO_APPLICABLE_METHOD: 'no enabled symbolic method applies',
    UNDERDETERMINED: 'the available premises do not determine one result',
    INCONSISTENT_CONTEXT: 'the supplied premises conflict',
    RESOURCE_LIMIT: 'processing stopped at a declared resource limit',
    UNSUPPORTED_OUTPUT: 'the requested output cannot be produced safely',
    UNVERIFIED_NORMALIZATION: 'an external language proposal could not be verified',
  })[status] ?? 'processing completed with the reported machine status';
}

function routeDescription(route) {
  return ({
    'direct-symbolic': 'direct local symbolic processing',
    'direct-symbolic-task-adapter': 'direct local task adapter',
    'bounded-operation-executed': 'verified bounded operation',
    'knowledge-context-fallback': 'query-local KB context fallback',
  })[route] ?? String(route ?? 'direct local symbolic processing').replaceAll('-', ' ');
}

function knowledgeContextDetails(result) {
  const context = result?.knowledgeContext;
  if (!context) return [];
  const questions = context.questionAnalysis?.questions ?? [];
  const families = [...new Set(questions.map((question) => question.family))];
  const topics = context.selfQuestionPlan?.topics ?? [];
  const sourceCount = new Set((context.entries ?? []).map((entry) =>
    `${entry.kbId}@${entry.kbVersion}`)).size;
  const details = [
    `Question context: ${questions.length} question(s); ${families.length
      ? `families ${families.join(', ')}` : 'family unresolved'}; topics ${topics.join(', ') || 'none selected'}.`,
    `KB context: ${(context.entries ?? []).length} related record(s) from ${sourceCount} source(s); retrieval `
      + `${context.search?.complete
        ? 'complete within the selected budget' : 'stopped at a declared coverage bound'}.`,
  ];
  if (context.realization?.status === 'contextual-fallback') {
    details.push(`Answer construction: no precise conclusion was proved from status `
      + `${context.realization.originalStatus}; ${context.realization.realizedEntryIds.length} relevant source `
      + 'claim(s) were returned as context only.');
  }
  return details;
}

function optionalLanguageAssistanceDetail(result) {
  if (result?.normalization?.attempted) return undefined;
  const localStatus = result?.knowledgeContext?.realization?.originalStatus ?? result?.status;
  if (localStatus !== 'UNPARSED') return undefined;
  return 'Optional language help: the local symbolic parser could not represent the full request. '
    + 'Retry explicitly with /normalize on (or --external-language-agent) only if external disclosure is acceptable.';
}

function processingAnswer(style, details, answer, result) {
  const muted = style.gray ?? style.dim;
  const budget = workBudgetDetail(result);
  const completeDetails = budget ? [...details, budget] : details;
  const thinking = [style.bold(muted('Thinking · symbolic processing')),
    ...completeDetails.map((detail) => muted(`  ${detail}`))].join('\n');
  return `${thinking}\n\n${style.bold('Answer')}\n${coherentInteractiveAnswer(answer)}`;
}

export function interactiveFailureText(error, style) {
  const message = String(error?.message ?? error);
  const diagnostic = /normalization.*(?:status|route)|(?:status|route).*normalization/iu.test(message)
    ? 'A language-route receipt disagreed with the final result state.'
    : 'An internal consistency check rejected the intermediate result.';
  return processingAnswer(style, [
    `Safety stop: ${diagnostic}`,
    'Session state: unchanged; the interactive prompt remains available.',
    'Recovery: this request was discarded safely and a later request may still be attempted.',
  ], 'I could not complete this request because an internal result check failed. The session is still active.');
}

export function interactiveResultText(result, original, style) {
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
      ?? 'Translate the request to English, or leave the Language Agent enabled to request an auditable translation proposal.', result);
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
      `Request plan coordinator: ${operations}; ${plan.subrequests.length} bounded subrequests; `
        + `confidence ${plan.confidence.toFixed(3)} (${plan.confidenceBand}).`,
      `Output contract: ${plan.outputContract.length} ${plan.outputContract.artifact}, ${plan.outputContract.format}.`,
      `Evidence admission: ${realized} KB claim(s) realized; ${rejected} related claim(s) withheld from the answer.`,
      'Processing nodes: Result construction coordinator → Claim admission gate → Rhetorical plan builder '
        + '→ Sentence realization coordinator → Document assembly coordinator → Result schema gate.',
      `Selected strategies: ${strategyNames || 'no realization strategy receipt'}.`,
      `Construction confidence: ${Number(realization?.confidence ?? 0).toFixed(3)}; status ${result.status}.`,
      'Authority boundary: citations support wording; relevance alone does not become proof.',
    ], result.answer, result);
  }
  if (result.languageRoute === 'heuristic-cnl-approximated') {
    const candidate = result.approximation.selectedCandidate;
    const families = candidate.supportingFamilies.join(', ');
    return processingAnswer(style, [
      'Language route: local heuristic interpretation; no Language Agent.',
      `Original: ${original}`,
      `Interpreted CNL: ${candidate.text}`,
      `Confidence: ${candidate.confidence.toFixed(3)} (${candidate.confidenceBand}); votes: ${families}.`,
      `Session effects: query-local and discarded after this result; status ${result.status}.`,
    ], result.answer, result);
  }
  if (result.languageRoute === 'heuristic-cnl-ambiguous') {
    const reparses = result.approximation.reparses.filter((item) => item.acceptedSemanticIr);
    return processingAnswer(style, [
      'Language route: local heuristic interpretations remain ambiguous.',
      `Original: ${original}`,
      ...reparses.slice(0, 4).map((item) =>
        `${item.rank}. ${item.text} — ${item.status}; confidence ${item.confidence.toFixed(3)}.`),
      'No candidate was committed; /trace exposes votes and reparse outcomes.',
    ], result.answer ?? 'I found several plausible interpretations and need the request clarified.', result);
  }
  if (result.languageRoute === 'language-agent-normalized') {
    const operation = result.normalization.candidate.operation === 'translation' ? 'Translation' : 'Simplification';
    const cache = result.normalization.cacheHit ? ' (validated cache hit)' : '';
    const activity = `${result.normalization.proposalCount ?? 1}/${result.normalization.proposalLimit ?? 3} `
      + `proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s)`;
    return processingAnswer(style, [
      `Language Agent ${operation.toLocaleLowerCase('en-US')} accepted${cache}.`,
      `Original: ${original}`,
      `${operation}: ${result.normalization.candidate.normalizedEnglish}`,
      `Agent activity: ${activity}; symbolic status ${result.status}.`,
    ], result.answer, result);
  }
  let confidenceDetail = null;
  if (Number.isFinite(result.reasoning?.confidence)) {
    const qualification = result.reasoning.assumption
      ? `Assumption: ${result.reasoning.assumption}`
      : 'the result remains explicitly non-strict';
    const punctuation = /[.!?]$/u.test(qualification) ? '' : '.';
    confidenceDetail = `Confidence: ${result.reasoning.confidence.toFixed(3)}; ${qualification}${punctuation}`;
  }
  const details = [
    `Route: ${routeDescription(result.languageRoute)}.`,
    `Outcome: ${resultOutcome(result.status)} (${result.status}).`,
    `Method: ${result.reasoning?.method ?? result.plan?.methodId ?? 'bounded symbolic execution'}.`,
    ...(confidenceDetail ? [confidenceDetail] : []),
    `Cited support: ${(result.provenance ?? []).length} provenance item(s); `
      + `${(result.usedKbVersions ?? []).length} contributing KB version(s).`,
    'Authority boundary: the displayed wording does not change the machine result status.',
    ...knowledgeContextDetails(result),
  ];
  const assistance = optionalLanguageAssistanceDetail(result);
  if (assistance) details.push(assistance);
  if (result.approximation && result.approximation.status !== 'accepted-reparse') {
    const reparses = result.approximation.reparses ?? [];
    details.push(`Local heuristics: ${result.approximation.status}; `
      + `${result.approximation.candidates?.length ?? 0} candidate(s), ${reparses.length} symbolic reparse(s).`);
  }
  if (result.normalization && !result.normalization.attempted) {
    details.push(`External language assistance: not needed; local symbolic processing reached `
      + `${result.normalization.triggerStatus} before optional context construction.`);
  }
  if (result.normalization?.attempted && result.normalization.status !== 'accepted') {
    const operation = result.normalization.candidate?.operation
      ?? result.normalization.requestedOperation ?? 'normalization';
    details.push(`Language Agent ${operation} ${result.normalization.status}.`);
    details.push(`Original: ${original}`);
    if (result.normalization.candidate?.normalizedEnglish) {
      details.push(`Proposed English: ${result.normalization.candidate.normalizedEnglish}`);
    }
    if (Number.isInteger(result.normalization.proposalCount)) {
      details.push(`Agent activity: ${result.normalization.proposalCount}/${result.normalization.proposalLimit ?? 3} `
        + `proposal slots; ${result.normalization.externalInvocations ?? 0} external invocation(s).`);
    }
    details.push(`Reason: ${result.normalization.diagnostic
      ?? result.normalization.validation?.errors?.join('; ')
      ?? `the second symbolic parse returned ${result.normalization.reparseStatus ?? 'an unsupported result'}`}`);
  }
  return processingAnswer(style, details, result.answer, result);
}
