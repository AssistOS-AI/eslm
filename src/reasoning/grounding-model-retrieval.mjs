import {
  createGroundingRequest,
  DEFAULT_GROUNDING_MAX_ENTRIES,
  makeGroundingEntry,
  normalizedGroundingSurface,
  orderGroundingEntries,
} from './grounding-retrieval.mjs';

const MAX_CANDIDATE_FACTS = 512;
const MAX_POSTING_FACTS = 128;
const MAX_SESSION_GROUNDING_ENTITIES = 1_024;
const MAX_SESSION_GROUNDING_FACTS = 512;

export function createModelGroundingIndex(model, factIndex) {
  const aliases = new Map();
  const add = (map, key, value) => {
    if (!key) return;
    map.set(key, [...new Set([...(map.get(key) ?? []), value])]);
  };
  for (const entity of model.entities ?? []) {
    for (const name of entity.names ?? []) add(aliases, normalizedGroundingSurface(name), entity.id);
  }
  const predicates = new Map();
  for (const predicate of factIndex.byPredicate.keys()) {
    add(predicates, normalizedGroundingSurface(predicate), predicate);
  }
  const values = new Map();
  for (const value of factIndex.byObject.keys()) {
    if (typeof value === 'string') add(values, normalizedGroundingSurface(value), value);
  }
  return Object.freeze({ aliases, predicates, values });
}

export function createSessionGroundingProjection(session, limits = {}) {
  const maximumEntities = Math.min(
    limits.maximumEntities ?? MAX_SESSION_GROUNDING_ENTITIES,
    MAX_SESSION_GROUNDING_ENTITIES,
  );
  const maximumFacts = Math.min(
    limits.maximumFacts ?? MAX_SESSION_GROUNDING_FACTS,
    MAX_SESSION_GROUNDING_FACTS,
  );
  const sessionEntities = session?.entities ?? [];
  const sessionFacts = session?.facts ?? [];
  const entities = sessionEntities.slice(0, maximumEntities).map((entity) => ({
    ...entity,
    names: [...(entity.names ?? [])],
  }));
  const facts = sessionFacts.slice(0, maximumFacts).map((fact) => ({
    ...fact,
    provenance: [...(fact.provenance ?? [])],
  }));
  const model = Object.freeze({
    manifest: Object.freeze({
      modelId: 'session-grounding-overlay',
      knowledgeBases: ['session'],
      knowledgeBaseVersions: [Object.freeze({ kbId: 'session', version: 'current' })],
    }),
    entities: Object.freeze(entities),
    facts: Object.freeze(facts),
    rules: Object.freeze([]),
  });
  const factIndex = indexGroundingFacts(facts);
  return Object.freeze({
    model,
    factIndex,
    groundingIndex: createModelGroundingIndex(model, factIndex),
    omittedEntityCount: Math.max(0, sessionEntities.length - entities.length),
    omittedFactCount: Math.max(0, sessionFacts.length - facts.length),
    omittedRuleCount: session?.rules?.length ?? 0,
  });
}

function indexGroundingFacts(facts) {
  const index = { facts: [], bySubject: new Map(), byPredicate: new Map(), byObject: new Map() };
  const add = (map, key, fact) => map.set(key, [...(map.get(key) ?? []), fact]);
  for (const fact of facts) {
    index.facts.push(fact);
    add(index.bySubject, fact.subject, fact);
    add(index.byPredicate, fact.predicate, fact);
    add(index.byObject, semanticValue(fact), fact);
  }
  return index;
}

function entityName(id, model) {
  return model.entities.find((entity) => entity.id === id)?.names?.[0] ?? id;
}

function semanticValue(fact) {
  return fact.object ?? fact.value;
}

function indefiniteArticle(value) {
  const word = String(value).trim().toLocaleLowerCase('en-US');
  if (/^(?:honest|honor|hour|heir)/u.test(word)) return 'an';
  if (/^(?:one|once|uni(?:t|v)|use|user|euro)/u.test(word)) return 'a';
  return /^[aeiou]/u.test(word) ? 'an' : 'a';
}

function factStatement(fact, model) {
  const subject = entityName(fact.subject, model);
  const value = fact.object ? entityName(fact.object, model) : fact.value;
  if (fact.predicate === 'is_a') return `${subject} is ${indefiniteArticle(value)} ${value}.`;
  if (fact.predicate === 'can') return `${subject} can ${value}.`;
  if (fact.predicate === 'located_in') return `${subject} is located in ${value}.`;
  if (fact.predicate === 'owns') return `${subject} owns ${value}.`;
  return `${subject} — ${fact.predicate.replaceAll('_', ' ')} — ${value}.`;
}

function kbIdentity(fact, model, allowedSources) {
  const source = (fact.kbSources ?? []).find((item) => allowedSources?.has(
    `${item.kbId}\u0000${item.version ?? ''}`,
  ));
  if (source) return { kbId: source.kbId, kbVersion: source.version };
  if (fact.kbId) return { kbId: fact.kbId, kbVersion: fact.kbVersion };
  if (String(fact.id).startsWith('session:')) return { kbId: 'session', kbVersion: 'current' };
  const ids = model.manifest.knowledgeBases ?? [];
  return { kbId: ids.length === 1 ? ids[0] : 'loaded-canonical-kbs', kbVersion: undefined };
}

function querySemanticMatches(fact, query) {
  const reasons = [];
  let score = 0;
  if (query?.subject && fact.subject === query.subject) {
    score += 8;
    reasons.push('query-subject-identity');
  }
  if (query?.predicate && fact.predicate === query.predicate) {
    score += 6;
    reasons.push('query-predicate-identity');
  }
  if (query?.object && semanticValue(fact) === query.object) {
    score += 5;
    reasons.push('query-object-identity');
  }
  return { score, reasons };
}

/**
 * Rank already-loaded canonical facts as related evidence. This is deliberately
 * weaker than answering: exact semantic identities and visible lexical overlap
 * can rank a fact, but cannot turn it into a premise for an unsupported query.
 */
export function retrieveModelGrounding({
  text,
  query,
  request,
  model,
  factIndex,
  groundingIndex = createModelGroundingIndex(model, factIndex),
  maximumEntries = DEFAULT_GROUNDING_MAX_ENTRIES,
}) {
  if (!model || !factIndex) return { entries: [], receipt: undefined };
  const activeRequest = request ?? createGroundingRequest(text, 'UNKNOWN', query);
  const selectedSources = activeRequest.sourceSelection;
  const restrictSources = selectedSources?.length > 0 && selectedSources.every((identity) =>
    identity.kbId !== 'session');
  const allowedSources = restrictSources ? new Set(selectedSources.map((identity) =>
    `${identity.kbId}\u0000${identity.version ?? ''}`)) : undefined;
  const terms = activeRequest.terms;
  const semanticQuery = activeRequest.query ?? query;
  const maximumLookups = activeRequest.limits.maximumLookups;
  const maximumValues = activeRequest.limits.maximumValuesPerLookup;
  const matchedEntities = new Map();
  const predicateIds = new Set();
  const values = new Set();
  let lookupCount = 0;
  let truncated = false;
  const boundedValues = (items = []) => {
    if (items.length > maximumValues) truncated = true;
    return items.slice(0, maximumValues);
  };
  for (const term of terms) {
    if (lookupCount >= maximumLookups) { truncated = true; break; }
    lookupCount += 1;
    for (const entityId of boundedValues(groundingIndex.aliases.get(term))) {
      matchedEntities.set(entityId, Math.max(matchedEntities.get(entityId) ?? 0, 7 + term.split(' ').length));
    }
    for (const predicate of boundedValues(groundingIndex.predicates.get(term))) predicateIds.add(predicate);
    for (const value of boundedValues(groundingIndex.values.get(term))) values.add(value);
  }
  if (semanticQuery?.subject) matchedEntities.set(semanticQuery.subject, 12);
  if (semanticQuery?.object) values.add(semanticQuery.object);
  if (semanticQuery?.predicate) predicateIds.add(semanticQuery.predicate);
  const candidateFacts = new Map();
  const addPosting = (posting = []) => {
    if (lookupCount >= maximumLookups) { truncated = true; return; }
    lookupCount += 1;
    if (posting.length > MAX_POSTING_FACTS) truncated = true;
    for (const fact of posting.slice(0, MAX_POSTING_FACTS)) {
      if (allowedSources && ![...(fact.kbSources ?? []), {
        kbId: fact.kbId,
        version: fact.kbVersion,
      }].some((identity) => allowedSources.has(`${identity.kbId}\u0000${identity.version ?? ''}`))) {
        continue;
      }
      if (candidateFacts.size >= MAX_CANDIDATE_FACTS) { truncated = true; return; }
      candidateFacts.set(`${fact.kbId ?? ''}\u0000${fact.id}`, fact);
    }
  };
  for (const entityId of matchedEntities.keys()) {
    addPosting(factIndex.bySubject.get(entityId));
    addPosting(factIndex.byObject.get(entityId));
  }
  for (const predicate of predicateIds) addPosting(factIndex.byPredicate.get(predicate));
  for (const value of values) addPosting(factIndex.byObject.get(value));
  const candidates = [];
  for (const fact of candidateFacts.values()) {
    const semantic = querySemanticMatches(fact, semanticQuery);
    let score = semantic.score;
    const reasons = [...semantic.reasons];
    const subjectScore = matchedEntities.get(fact.subject);
    const objectScore = fact.object ? matchedEntities.get(fact.object) : undefined;
    if (subjectScore) {
      score += subjectScore;
      reasons.push('visible-entity-subject-match');
    }
    if (objectScore) {
      score += objectScore;
      reasons.push('visible-entity-object-match');
    }
    if (predicateIds.has(fact.predicate)) { score += 2; reasons.push('visible-predicate-match'); }
    if (values.has(semanticValue(fact))) { score += 1; reasons.push('visible-value-match'); }
    if (score <= 0 || reasons.length === 0) continue;
    const identity = kbIdentity(fact, model, allowedSources);
    const contributingKbVersions = fact.kbSources?.filter((item) => !allowedSources
      || allowedSources.has(`${item.kbId}\u0000${item.version ?? ''}`));
    candidates.push(makeGroundingEntry({
      ...identity,
      recordId: fact.id,
      statement: factStatement(fact, model),
      semantic: {
        subject: fact.subject,
        predicate: fact.predicate,
        object: semanticValue(fact),
        derived: Boolean(fact.derived),
      },
      epistemicStatus: fact.reasoning === 'induction' ? 'inductive'
        : fact.derived ? 'strict-derived' : fact.epistemicStatus ?? 'asserted',
      provenance: fact.provenance ?? [],
      contributingKbVersions: contributingKbVersions?.length > 0 ? contributingKbVersions : undefined,
      ...(fact.derived ? { witness: {
        rule: fact.rule,
        support: fact.support ?? [],
        depth: fact.depth,
      } } : {}),
      relevance: { score, reasons },
    }));
  }
  const ordered = orderGroundingEntries(candidates).slice(0, maximumEntries * 3);
  const modelIdentities = model.manifest.knowledgeBaseVersions
    ?? (model.manifest.knowledgeBases ?? []).map((kbId) => ({ kbId }));
  const identities = allowedSources
    ? modelIdentities.filter((identity) => allowedSources.has(
      `${identity.kbId}\u0000${identity.version ?? ''}`,
    ))
    : modelIdentities;
  const receiptIdentities = identities.map((identity) => ({
    kbId: identity.kbId,
    kbVersion: identity.version,
  }));
  const belongsToIdentity = (fact, identity) => identity.kbId === 'session'
    ? String(fact.id).startsWith('session:')
    : [...(fact.kbSources ?? []), ...(fact.kbId ? [{
      kbId: fact.kbId, version: fact.kbVersion,
    }] : [])].some((source) => source.kbId === identity.kbId
      && (identity.kbVersion === undefined
        || String(source.version ?? '') === String(identity.kbVersion)));
  const entryBelongsToIdentity = (entry, identity) => [
    ...(entry.contributingKbVersions ?? []),
    { kbId: entry.kbId, version: entry.kbVersion },
  ].some((source) => source.kbId === identity.kbId
    && (identity.kbVersion === undefined
      || String(source.version ?? '') === String(identity.kbVersion)));
  return {
    entries: ordered,
    receipts: receiptIdentities.map((identity) => {
      const identityCandidateCount = [...candidateFacts.values()]
        .filter((fact) => belongsToIdentity(fact, identity)).length;
      const identityEntryCount = ordered
        .filter((entry) => entryBelongsToIdentity(entry, identity)).length;
      return {
        ...identity,
        status: identityEntryCount > 0 ? 'matches-found' : 'no-match',
        coverage: `exact-loaded-postings-with-bounded-candidate-expansion; ${lookupCount} lookups`,
        complete: !truncated && activeRequest.termSelection.complete,
        candidatesConsidered: identityCandidateCount,
        truncationReasons: [
          ...(truncated ? ['candidate-posting-budget'] : []),
          ...(!activeRequest.termSelection.complete ? ['term-selection-budget'] : []),
        ],
      };
    }),
  };
}

export function retrieveSessionGrounding(request, session) {
  const projection = createSessionGroundingProjection(session, {
    maximumFacts: request.limits.maximumCandidateEntries,
  });
  const result = retrieveModelGrounding({
    request,
    ...projection,
    maximumEntries: request.limits.maximumEntries,
  });
  const incompleteReasons = [
    ...(projection.omittedFactCount > 0 ? ['session-fact-index-budget'] : []),
    ...(projection.omittedEntityCount > 0 ? ['session-entity-index-budget'] : []),
    ...(projection.omittedRuleCount > 0 ? ['session-rule-expansion-not-run'] : []),
  ];
  const receipts = result.receipts.length > 0 ? result.receipts : [{
    kbId: 'session',
    kbVersion: 'current',
    status: result.entries.length > 0 ? 'matches-found' : 'no-match',
    coverage: `bounded-direct-session-fact-postings; ${projection.factIndex.facts.length} indexed facts`,
    complete: incompleteReasons.length === 0 && request.termSelection.complete,
    candidatesConsidered: projection.factIndex.facts.length,
    truncationReasons: [
      ...incompleteReasons,
      ...(!request.termSelection.complete ? ['term-selection-budget'] : []),
    ],
  }];
  if (incompleteReasons.length === 0) return { ...result, receipts };
  return {
    ...result,
    receipts: receipts.map((receipt) => ({
      ...receipt,
      complete: false,
      coverage: `${receipt.coverage}; bounded-direct-session-facts-only`,
      truncationReasons: [...new Set([...receipt.truncationReasons, ...incompleteReasons])],
    })),
  };
}
