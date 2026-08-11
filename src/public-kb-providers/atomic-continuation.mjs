export function atomicEventTokens(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/gu, ' ')
    .replace(/[?.!]+$/gu, '').trim().replace(/person\s*x/gu, 'personx')
    .replace(/person\s*y/gu, 'persony').split(/[^a-z0-9']+/u).filter(Boolean)
    .filter((token) => !['personx', 'persony', 'someone', 'the', 'a', 'an', 'to'].includes(token))
    .map((token) => token.endsWith('izing') ? `${token.slice(0, -3)}e`
      : token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token);
}

function semanticTokenCoverage(source, target) {
  const sourceTokens = new Set(atomicEventTokens(source));
  const targetTokens = new Set(atomicEventTokens(target));
  if (sourceTokens.size === 0 || targetTokens.size === 0) return 0;
  const overlap = [...targetTokens].filter((token) => sourceTokens.has(token)).length;
  return overlap / targetTokens.size;
}

function relationFamily(relation) {
  if (['xWant', 'oWant', 'xIntent', 'xReason'].includes(relation)) return 'goal';
  if (['xReact', 'oReact', 'xAttr'].includes(relation)) return 'social';
  if (['xEffect', 'oEffect', 'Causes'].includes(relation)) return 'causal';
  return 'event';
}

export async function collectAtomicContinuationEvidence(provider, request) {
  if (request?.kind !== 'event-continuation-ranking') return undefined;
  const context = request.narrative?.events;
  const candidates = request.candidates;
  if (!Array.isArray(context) || context.length === 0 || context.length > 64
    || !Array.isArray(candidates) || candidates.length < 2 || candidates.length > 32) return undefined;
  const recent = context.slice(-3);
  const contextMatches = [];
  for (const event of recent) {
    const match = await provider.findEvent(event.content.join(' '));
    if (match) contextMatches.push({ frame: event, match });
  }
  const results = [];
  for (const candidate of candidates) {
    const support = [];
    for (const { frame, match } of contextMatches) {
      for (const relation of [
        'xEffect', 'oEffect', 'xWant', 'oWant', 'xReact', 'oReact', 'isAfter', 'Causes',
      ]) {
        for (const [tail, line] of match.event.r[relation] ?? []) {
          const coverage = semanticTokenCoverage(tail, candidate.event.content.join(' '));
          if (coverage < 0.2) continue;
          support.push({
            relation, score: coverage * match.score, sourceRef: `atomic-2020:train:${line}`,
            matchType: 'candidate-supported-as-context-consequence', contextEventId: frame.eventId,
            semanticFamily: relationFamily(relation),
          });
        }
      }
    }
    const candidateMatch = await provider.findEvent(candidate.event.content.join(' '));
    if (candidateMatch) {
      const contextSurface = recent.flatMap((event) => event.content).join(' ');
      for (const relation of ['xNeed', 'isBefore', 'xIntent', 'xReason']) {
        for (const [tail, line] of candidateMatch.event.r[relation] ?? []) {
          const coverage = semanticTokenCoverage(tail, contextSurface);
          if (coverage < 0.2) continue;
          support.push({
            relation, score: coverage * candidateMatch.score, sourceRef: `atomic-2020:train:${line}`,
            matchType: 'context-supported-as-candidate-prerequisite',
            candidateEventId: candidate.event.eventId,
            semanticFamily: relationFamily(relation),
          });
        }
      }
    }
    const selected = support.toSorted((left, right) => right.score - left.score
      || left.sourceRef.localeCompare(right.sourceRef)).slice(0, 12);
    results.push(Object.freeze({
      candidateId: candidate.candidateId,
      support: Object.freeze(selected.map((item) => Object.freeze(item))),
    }));
  }
  return Object.freeze({
    providerId: provider.manifest.id,
    providerVersion: provider.manifest.kbVersion,
    semanticType: 'defeasible-event-continuation-support-v1',
    candidates: Object.freeze(results),
  });
}
