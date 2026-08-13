export function ordinaryClosureResourceResponse({
  text, context, episode, normalized, query, taskFrame, plan, closure,
}) {
  return {
    status: 'RESOURCE_LIMIT',
    answer: 'I could not establish an answer because bounded Horn deduction did not reach its fixed point.',
    input: normalized,
    query,
    taskFrame,
    plan: { methodId: plan?.methodId, steps: plan?.steps },
    values: [],
    provenance: [],
    reasoning: {
      method: 'deduction', complete: false, rounds: closure.rounds,
      joinAttempts: closure.joinAttempts, frontierSize: closure.frontierSize,
    },
    learned: episode.learned,
    learnedRules: episode.learnedRules,
    context: { ...context, session: episode.session },
    episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
    unresolvedSubgoals: [{ operation: 'safe-horn-deduction', diagnostic: closure.diagnostic }],
  };
}

export function ordinaryVerificationResourceResponse({
  text, context, episode, normalized, query, taskFrame, plan, verified,
}) {
  return {
    status: 'RESOURCE_LIMIT',
    answer: 'I could not accept the candidate answer because bounded witness verification exhausted its work.',
    input: normalized,
    query,
    taskFrame,
    plan: { methodId: plan?.methodId, steps: plan?.steps },
    values: [],
    provenance: [],
    reasoning: verified.reasoning,
    learned: episode.learned,
    learnedRules: episode.learnedRules,
    context: { ...context, session: episode.session },
    episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
    unresolvedSubgoals: [verified.resourceLimit],
  };
}

export function ordinaryAnswerResponse({
  text, context, episode, activeModel, normalized, query, result, status, reasoning, taskFrame, plan,
}, realizeAnswer) {
  const evidence = result.evidence.map((fact) => ({
    fact: fact.id,
    kbId: fact.kbId,
    kbVersion: fact.kbVersion,
    kbSources: fact.kbSources ?? (fact.kbId ? [{
      kbId: fact.kbId,
      ...(fact.kbVersion ? { version: fact.kbVersion } : {}),
    }] : []),
    source: fact.provenance ?? (fact.ruleSource ? [fact.ruleSource] : []),
    rule: fact.rule,
    support: fact.support,
    observation: fact.observation,
    hypotheses: fact.hypotheses,
    confidence: fact.confidence ?? fact.score,
    method: fact.reasoning,
  }));
  return {
    status,
    answer: realizeAnswer(),
    input: normalized,
    query,
    taskFrame,
    plan: { methodId: plan?.methodId, steps: plan?.steps },
    values: result.values,
    provenance: evidence,
    reasoning,
    hypotheses: result.hypotheses,
    learned: episode.learned,
    learnedRules: episode.learnedRules,
    context: {
      ...context,
      session: episode.session,
      lastEntity: query.subject
        ?? (activeModel.entities.some((entity) => entity.id === query.object) ? query.object : undefined)
        ?? context.lastEntity,
    },
    episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
  };
}
