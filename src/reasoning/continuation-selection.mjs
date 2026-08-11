const MAX_CANDIDATES = 32;
const MAX_PROVIDER_EVIDENCE = 512;
const SCORE_SCALE = 1_000;
const DEFAULT_WEIGHTS = Object.freeze({
  'participant-continuity': 420,
  'unintroduced-participant': -180,
  'resolvable-pronoun': 160,
  'recent-content-bridge': 90,
  'global-content-bridge': 30,
  'predicate-repetition': -110,
  'tense-agreement': 80,
  'polarity-conflict': -520,
  'provider-support': 250,
  'provider-causal': 250,
  'provider-contradiction': 250,
  'provider-event': 250,
  'provider-goal': 250,
  'provider-social': 250,
  'provider-state': 250,
});
const PROVIDER_SEMANTIC_FAMILIES = new Set([
  'causal', 'contradiction', 'event', 'goal', 'social', 'state',
]);
const FEATURE_IDS = new Set([
  ...Object.keys(DEFAULT_WEIGHTS),
  'content-specificity', 'predicate-specificity', 'named-participant-count',
  'pronoun-group-count', 'negative-polarity', 'non-asserted-modality',
  'past-tense', 'present-tense', 'lexical-novelty',
]);

function fail(status, diagnostic) {
  return Object.freeze({ status, values: Object.freeze([]), diagnostic, trace: Object.freeze([]) });
}

function setOverlap(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value));
}

function feature(id, value, weight, provenance) {
  return Object.freeze({ id, value, weight, contribution: value * weight, provenance });
}

function weightFor(policy, id) {
  const configured = policy?.featureWeights?.[id];
  if (configured === undefined) return DEFAULT_WEIGHTS[id] ?? 0;
  if (!Number.isInteger(configured) || configured < -10_000 || configured > 10_000) {
    throw new Error(`Narrative feature weight ${id} must be an integer from -10,000 to 10,000.`);
  }
  return configured;
}

function internalFeatures(narrative, candidate, policy) {
  const recent = narrative.events.slice(-2);
  const allContent = narrative.events.flatMap((event) => event.content);
  const recentContent = recent.flatMap((event) => event.content);
  const knownNames = narrative.discourse.namedParticipants;
  const namedOverlap = setOverlap(candidate.participants.named, knownNames);
  const newNames = candidate.participants.named.filter((name) => !knownNames.includes(name));
  const contentBridge = setOverlap(candidate.content, recentContent);
  const globalBridge = setOverlap(candidate.content, allContent);
  const predicateBridge = setOverlap(candidate.predicates, recent.flatMap((event) => event.predicates));
  const hasResolvablePronoun = candidate.participants.pronounGroups.length > 0
    && (knownNames.length > 0 || recent.some((event) => event.participants.pronounGroups.length > 0));
  const dominantTense = narrative.discourse.dominantTense;
  const tenseAgreement = dominantTense === 'unspecified' || candidate.tense === 'unspecified'
    || dominantTense === candidate.tense;
  const polarityConflict = recent.some((event) => event.polarity !== candidate.polarity
    && setOverlap(event.predicates, candidate.predicates).length > 0
    && setOverlap(event.content, candidate.content).length >= 2);
  return Object.freeze([
    feature('participant-continuity', namedOverlap.length, weightFor(policy, 'participant-continuity'),
      namedOverlap.map((name) => `narrative:participant:${name}`)),
    feature('unintroduced-participant', newNames.length, weightFor(policy, 'unintroduced-participant'),
      newNames.map((name) => `candidate:participant:${name}`)),
    feature('resolvable-pronoun', hasResolvablePronoun ? 1 : 0, weightFor(policy, 'resolvable-pronoun'),
      recent.map((event) => event.eventId)),
    feature('recent-content-bridge', Math.min(contentBridge.length, 4), weightFor(policy, 'recent-content-bridge'),
      contentBridge.map((token) => `narrative:token:${token}`)),
    feature('global-content-bridge', Math.min(globalBridge.length, 6), weightFor(policy, 'global-content-bridge'),
      globalBridge.map((token) => `narrative:token:${token}`)),
    feature('predicate-repetition', Math.min(predicateBridge.length, 2), weightFor(policy, 'predicate-repetition'),
      predicateBridge.map((token) => `narrative:predicate:${token}`)),
    feature('tense-agreement', tenseAgreement ? 1 : 0, weightFor(policy, 'tense-agreement'),
      [`narrative:tense:${dominantTense}`, `candidate:tense:${candidate.tense}`]),
    feature('polarity-conflict', polarityConflict ? 1 : 0, weightFor(policy, 'polarity-conflict'),
      recent.map((event) => event.eventId)),
    feature('content-specificity', Math.min(candidate.content.length, 16),
      weightFor(policy, 'content-specificity'), [candidate.eventId]),
    feature('predicate-specificity', Math.min(candidate.predicates.length, 8),
      weightFor(policy, 'predicate-specificity'), [candidate.eventId]),
    feature('named-participant-count', Math.min(candidate.participants.named.length, 8),
      weightFor(policy, 'named-participant-count'), [candidate.eventId]),
    feature('pronoun-group-count', Math.min(candidate.participants.pronounGroups.length, 8),
      weightFor(policy, 'pronoun-group-count'), [candidate.eventId]),
    feature('negative-polarity', candidate.polarity === 'negative' ? 1 : 0,
      weightFor(policy, 'negative-polarity'), [candidate.eventId]),
    feature('non-asserted-modality', candidate.modality === 'asserted' ? 0 : 1,
      weightFor(policy, 'non-asserted-modality'), [candidate.eventId]),
    feature('past-tense', candidate.tense === 'past' ? 1 : 0,
      weightFor(policy, 'past-tense'), [candidate.eventId]),
    feature('present-tense', candidate.tense === 'present' ? 1 : 0,
      weightFor(policy, 'present-tense'), [candidate.eventId]),
    feature('lexical-novelty', Math.min(candidate.content.filter((token) => !allContent.includes(token)).length, 12),
      weightFor(policy, 'lexical-novelty'), [candidate.eventId]),
  ]);
}

function providerFeatures(candidateId, semanticEvidence, policy) {
  const records = semanticEvidence.flatMap((provider) => provider.candidates ?? [])
    .filter((item) => item.candidateId === candidateId)
    .flatMap((item) => item.support ?? [])
    .slice(0, MAX_PROVIDER_EVIDENCE);
  return records.map((record, index) => {
    const bounded = Math.max(-1, Math.min(1, Number(record.score) || 0));
    const semanticFamily = PROVIDER_SEMANTIC_FAMILIES.has(record.semanticFamily)
      ? record.semanticFamily : bounded < 0 ? 'contradiction' : 'event';
    const weightId = `provider-${semanticFamily}`;
    const configuredFamilyWeight = policy?.featureWeights?.[weightId];
    const configuredFallbackWeight = policy?.featureWeights?.['provider-support'];
    const weight = configuredFamilyWeight ?? configuredFallbackWeight ?? DEFAULT_WEIGHTS[weightId];
    return feature(`${weightId}:${index}`, Math.round(bounded * SCORE_SCALE),
      weight / SCORE_SCALE,
      [record.sourceRef, record.relation, record.matchType].filter(Boolean));
  });
}

function validateTask(task) {
  if (task?.operation !== 'select-narrative-continuation') return 'unsupported task operation.';
  if (task.narrative?.schema !== 'narrative-sequence-v1') return 'narrative sequence schema is required.';
  if (!Array.isArray(task.narrative.events) || task.narrative.events.length < 1
    || task.narrative.events.length > 64) return 'narrative sequence must contain 1 to 64 events.';
  if (!Array.isArray(task.candidates) || task.candidates.length < 2
    || task.candidates.length > MAX_CANDIDATES) return `2 to ${MAX_CANDIDATES} candidates are required.`;
  const ids = task.candidates.map((candidate) => candidate.candidateId);
  if (ids.some((id) => typeof id !== 'string' || !/^[a-z0-9:._-]{8,160}$/u.test(id))) {
    return 'candidate identifiers are invalid.';
  }
  if (new Set(ids).size !== ids.length) return 'candidate identifiers must be unique.';
  if (task.candidates.some((candidate) => candidate.event?.schema !== 'narrative-event-frame-v1')) {
    return 'every candidate requires a narrative event frame.';
  }
  if (task.semanticEvidence !== undefined && !Array.isArray(task.semanticEvidence)) {
    return 'semantic evidence must be an array.';
  }
  if ((task.semanticEvidence?.length ?? 0) > 16) return 'semantic evidence exceeds 16 providers.';
  for (const provider of task.semanticEvidence ?? []) {
    if (!Array.isArray(provider.candidates) || provider.candidates.length > MAX_CANDIDATES) {
      return 'provider evidence has an invalid candidate list.';
    }
    if (provider.candidates.some((candidate) => !Array.isArray(candidate.support)
      || candidate.support.length > 64)) return 'provider support exceeds the per-candidate bound.';
  }
  const configuredWeights = task.policy?.featureWeights;
  if (configuredWeights !== undefined) {
    if (!configuredWeights || Array.isArray(configuredWeights) || typeof configuredWeights !== 'object') {
      return 'featureWeights must be an object.';
    }
    if (Object.keys(configuredWeights).some((id) => !FEATURE_IDS.has(id))) {
      return 'featureWeights contains an unknown feature identifier.';
    }
    try {
      for (const id of Object.keys(configuredWeights)) weightFor(task.policy, id);
    } catch (error) {
      return error.message;
    }
  }
  return undefined;
}

export function selectNarrativeContinuation(task) {
  const invalid = validateTask(task);
  if (invalid) return fail('UNPARSED', invalid);
  const semanticEvidence = task.semanticEvidence ?? [];
  const rankings = task.candidates.map((candidate) => {
    const features = [
      ...internalFeatures(task.narrative, candidate.event, task.policy),
      ...providerFeatures(candidate.candidateId, semanticEvidence, task.policy),
    ];
    return Object.freeze({
      candidateId: candidate.candidateId,
      score: features.reduce((total, item) => total + item.contribution, 0),
      features: Object.freeze(features),
    });
  }).toSorted((left, right) => right.score - left.score
    || left.candidateId.localeCompare(right.candidateId));
  const requiredMargin = Number.isInteger(task.policy?.minimumMargin)
    ? Math.max(0, Math.min(10_000, task.policy.minimumMargin)) : 1;
  const margin = rankings[0].score - rankings[1].score;
  if (margin < requiredMargin) {
    return Object.freeze({
      status: 'UNKNOWN', values: Object.freeze([]), rankings: Object.freeze(rankings),
      trace: Object.freeze(rankings.flatMap((item) => item.features)),
      uncertainty: Object.freeze({ kind: 'score-tie-or-insufficient-margin', margin, requiredMargin }),
    });
  }
  return Object.freeze({
    status: 'DEFEASIBLE',
    values: Object.freeze([rankings[0].candidateId]),
    rankings: Object.freeze(rankings),
    trace: Object.freeze(rankings.flatMap((item) => item.features)),
    witness: Object.freeze({
      method: 'bounded-feature-ranking',
      selectedCandidateId: rankings[0].candidateId,
      margin,
      requiredMargin,
      providerEvidenceRecords: semanticEvidence.reduce(
        (total, provider) => total + (provider.candidates ?? [])
          .reduce((count, candidate) => count + (candidate.support?.length ?? 0), 0),
        0,
      ),
    }),
  });
}
