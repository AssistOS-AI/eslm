const MAX_CONTEXT_EVENTS = 64;
const MAX_CANDIDATES = 32;
const MAX_EVIDENCE_PER_CANDIDATE = 24;
const SEMANTIC_FAMILIES = new Set([
  'causal', 'contradiction', 'event', 'goal', 'social', 'state',
]);

function boundedSignedScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return 0;
  return numeric / (1 + Math.abs(numeric));
}

function evidenceSourceRefs(provider, item) {
  const explicit = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  const proof = Array.isArray(item.proof) ? item.proof : [];
  const refs = [...explicit, ...proof.map((entry) => `${provider.manifest.id}:proof:${entry}`)]
    .filter((entry) => typeof entry === 'string' && entry.length > 0 && entry.length <= 512);
  return refs.length > 0 ? [...new Set(refs)].slice(0, 8) : [`${provider.manifest.id}:semantic-compatibility`];
}

function supportRecord(provider, item, aggregateScore) {
  const contribution = boundedSignedScore(item.contribution ?? item.weight ?? aggregateScore);
  const declaredFamily = typeof item.semanticFamily === 'string'
    ? item.semanticFamily : undefined;
  const semanticFamily = SEMANTIC_FAMILIES.has(declaredFamily)
    ? declaredFamily : contribution < 0 ? 'contradiction' : 'event';
  return Object.freeze({
    relation: item.relation ?? item.target?.relation ?? item.target?.concept ?? 'semantic-compatibility',
    score: contribution,
    sourceRef: evidenceSourceRefs(provider, item)[0],
    sourceRefs: Object.freeze(evidenceSourceRefs(provider, item)),
    matchType: contribution < 0 ? 'declared-semantic-conflict' : 'declared-semantic-support',
    semanticFamily,
  });
}

export async function collectCompatibilityEvidence(provider, request) {
  if (request?.kind !== 'event-continuation-ranking') return undefined;
  const events = request.narrative?.events;
  const candidates = request.candidates;
  if (!Array.isArray(events) || events.length < 1 || events.length > MAX_CONTEXT_EVENTS
    || !Array.isArray(candidates) || candidates.length < 2 || candidates.length > MAX_CANDIDATES) {
    return undefined;
  }
  if (typeof provider.scoreCompatibility !== 'function') return undefined;
  const context = events.map((event) => event.surface).join(' ');
  const results = [];
  for (const candidate of candidates) {
    const scored = await provider.scoreCompatibility(context, candidate.event.surface);
    const items = Array.isArray(scored?.evidence) ? scored.evidence : [];
    const support = items.slice(0, MAX_EVIDENCE_PER_CANDIDATE)
      .map((item) => supportRecord(provider, item, scored.score));
    if (support.length === 0 && boundedSignedScore(scored?.score) !== 0) {
      support.push(supportRecord(provider, {}, scored.score));
    }
    results.push(Object.freeze({
      candidateId: candidate.candidateId,
      support: Object.freeze(support),
    }));
  }
  return Object.freeze({
    providerId: provider.manifest.id,
    providerVersion: provider.manifest.kbVersion,
    semanticType: 'provider-neutral-semantic-compatibility-v1',
    candidates: Object.freeze(results),
  });
}
