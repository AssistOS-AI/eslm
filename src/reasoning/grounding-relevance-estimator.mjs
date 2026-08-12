import { normalizedGroundingSurface } from './grounding-query-focus.mjs';

const MAX_ENTRIES = 512;
const MAX_TERMS = 32;
const MAX_ACTIVE_OCCURRENCES = 10_000_000;

function tokens(value) {
  const surface = normalizedGroundingSurface(value);
  return surface ? surface.split(' ').filter(Boolean) : [];
}

function containsPhrase(surfaceTokens, phraseTokens) {
  if (phraseTokens.length === 0 || phraseTokens.length > surfaceTokens.length) return false;
  return surfaceTokens.some((_, index) =>
    phraseTokens.every((token, offset) => surfaceTokens[index + offset] === token));
}

function searchableSurfaces(entry) {
  const semantic = Object.values(entry.semantic ?? {}).flatMap((value) =>
    Array.isArray(value) ? value : [value]).filter((value) =>
    typeof value === 'string' || typeof value === 'number');
  return [entry.statement, ...semantic].map(tokens).filter((value) => value.length > 0);
}

function selectedTermRoles(request) {
  const roles = new Map();
  for (const candidate of request?.termSelection?.candidates ?? []) {
    if (candidate?.selected !== true || typeof candidate.term !== 'string') continue;
    const term = normalizedGroundingSurface(candidate.term);
    if (!term || roles.has(term)) continue;
    roles.set(term, candidate.role ?? 'content');
  }
  for (const term of (request?.terms ?? []).slice(0, MAX_TERMS)) {
    const normalized = normalizedGroundingSurface(term);
    if (normalized && !roles.has(normalized)) roles.set(normalized, 'content');
  }
  return roles;
}

function queryBridge(entry, request) {
  const query = request?.query;
  if (!query || typeof query !== 'object') return Object.freeze({ score: 0, reasons: [] });
  const semantic = entry.semantic ?? {};
  const fields = [
    ['subject', 5], ['predicate', 5], ['object', 4], ['target', 3],
  ];
  let score = 0;
  const reasons = [];
  let principalMatches = 0;
  for (const [field, weight] of fields) {
    const expected = normalizedGroundingSurface(query[field]);
    if (!expected) continue;
    const actualValues = [semantic[field], field === 'object' ? semantic.value : undefined]
      .map(normalizedGroundingSurface).filter(Boolean);
    if (!actualValues.includes(expected)) continue;
    score += weight;
    reasons.push(`answer-bridge-${field}`);
    if (field === 'subject' || field === 'predicate') principalMatches += 1;
  }
  if (principalMatches === 2) {
    score += 6;
    reasons.push('answer-bridge-frame');
  }
  return Object.freeze({ score, reasons: Object.freeze(reasons) });
}

function boundedOccurrences(value) {
  if (!Number.isSafeInteger(value) || value < 0) return 0;
  return Math.min(value, MAX_ACTIVE_OCCURRENCES);
}

/**
 * Estimate related-evidence relevance on a bounded candidate frontier. This is
 * ranking evidence only: it never changes answer support or executes a proof.
 */
export function estimateGroundingRelevance(entries, request) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) {
    throw new Error(`Grounding relevance estimation accepts at most ${MAX_ENTRIES} entries.`);
  }
  const termRoles = selectedTermRoles(request);
  const terms = [...termRoles.keys()].slice(0, MAX_TERMS);
  const prepared = entries.map((entry) => {
    const surfaces = searchableSurfaces(entry);
    const matchedTerms = terms.filter((term) => {
      const phrase = tokens(term);
      return surfaces.some((surface) => containsPhrase(surface, phrase));
    });
    return Object.freeze({ entry, matchedTerms: Object.freeze(matchedTerms) });
  });
  const frontierFrequency = new Map(terms.map((term) => [
    term, prepared.filter((item) => item.matchedTerms.includes(term)).length,
  ]));

  return Object.freeze(prepared.map(({ entry, matchedTerms }) => {
    const distinctRoles = new Set(matchedTerms.map((term) => termRoles.get(term)));
    const phraseMatches = matchedTerms.filter((term) => term.includes(' ')).length;
    const cooccurrence = Math.max(0, matchedTerms.length - 1);
    const frequencyEvidence = matchedTerms.reduce((sum, term) =>
      sum + Math.log2(1 + (frontierFrequency.get(term) ?? 0)), 0);
    const activeKbOccurrences = boundedOccurrences(entry.relevance?.activeKbOccurrences
      ?? (entry.relevance?.activePostingSize && matchedTerms.length > 0
        ? entry.relevance.activePostingSize : 0));
    const activeFrequencyVote = Math.min(3, Math.log10(1 + activeKbOccurrences));
    const bridge = queryBridge(entry, request);
    const estimatorScore = Number((
      matchedTerms.length * 1.5
      + distinctRoles.size * 1.25
      + phraseMatches * 2
      + cooccurrence * cooccurrence * 1.5
      + Math.min(2.5, frequencyEvidence * 0.35)
      + activeFrequencyVote
      + bridge.score
    ).toFixed(6));
    const reasons = [
      ...(matchedTerms.length > 0 ? [`focus-term-coverage:${matchedTerms.length}`] : []),
      ...(distinctRoles.size > 1 ? [`focus-role-coverage:${distinctRoles.size}`] : []),
      ...(cooccurrence > 0 ? [`focus-term-cooccurrence:${matchedTerms.length}`] : []),
      ...(phraseMatches > 0 ? [`exact-focus-phrases:${phraseMatches}`] : []),
      ...(activeKbOccurrences > 0 ? ['bounded-active-kb-frequency-vote'] : []),
      ...(bridge.score > 0 ? [`answer-bridge:${bridge.score}`] : []),
    ].slice(0, 6);
    return Object.freeze({
      ...entry,
      relevance: Object.freeze({
        ...entry.relevance,
        score: Number(((entry.relevance?.score ?? 0) + estimatorScore).toFixed(6)),
        reasons: Object.freeze([...(entry.relevance?.reasons ?? []), ...reasons]),
        estimator: Object.freeze({
          protocol: 'eslm-grounding-relevance-estimate-v1',
          matchedTerms: Object.freeze(matchedTerms),
          matchedRoles: Object.freeze([...distinctRoles].toSorted()),
          frontierDocumentFrequency: Object.freeze(Object.fromEntries(matchedTerms.map((term) => [
            term, frontierFrequency.get(term),
          ]))),
          activeKbOccurrences,
          answerBridgeScore: bridge.score,
          additiveScore: estimatorScore,
          answerSupported: false,
        }),
      }),
    });
  }));
}
