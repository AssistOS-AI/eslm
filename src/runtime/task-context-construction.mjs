import { normalizedGroundingSurface } from '../reasoning/grounding-query-focus.mjs';

export const TASK_CONTEXT_FALLBACK_ROUTE = 'knowledge-context-fallback';

const FALLBACK_STATUSES = new Set([
  'MISSING_KNOWLEDGE', 'NO_APPLICABLE_METHOD', 'UNDERDETERMINED', 'UNKNOWN', 'UNPARSED',
  'UNSUPPORTED_OUTPUT',
]);
const MAX_REALIZED_CONTEXT_CLAIMS = 4;

function entryIdentity(entry) {
  return `${entry.kbId}@${entry.kbVersion}:${entry.recordId}`;
}

function sentence(value) {
  const surface = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (!surface) return '';
  return /[.!?]$/u.test(surface) ? surface : `${surface}.`;
}

function displayRelation(value) {
  return String(value ?? '').replaceAll('_', ' ').replace(/([a-z])([A-Z])/gu, '$1 $2')
    .toLocaleLowerCase('en-US').trim();
}

function realizeEntry(entry) {
  const semantic = entry.semantic ?? {};
  if (semantic.kind === 'lexical-sense' && semantic.lemma && semantic.definition) {
    return sentence(`The selected lexical source defines “${semantic.lemma}” as ${semantic.definition}`);
  }
  if (semantic.kind === 'typed-relation-edge') {
    const relation = displayRelation(semantic.relation);
    const defeasible = String(entry.epistemicStatus).includes('defeasible');
    return sentence(`The source ${defeasible ? 'defeasibly associates' : 'records'} “${semantic.subject}” `
      + `with “${semantic.object}” through the ${relation} relation`);
  }
  if (semantic.kind === 'defeasible-event-relation') {
    return sentence(`The event source records a defeasible ${displayRelation(semantic.relation)} candidate for `
      + `“${semantic.event}”: “${semantic.value}”`);
  }
  return sentence(entry.statement);
}

function entryTopicKey(entry) {
  const semantic = entry.semantic ?? {};
  return normalizedGroundingSurface(semantic.lemma ?? semantic.subject ?? semantic.event
    ?? semantic.name ?? semantic.relation ?? entry.recordId);
}

function entryEntitySurfaces(entry) {
  const semantic = entry.semantic ?? {};
  return [semantic.lemma, semantic.subject, semantic.event, semantic.name,
    ...(entry.relevance?.estimator?.matchedTerms ?? [])]
    .map((value) => normalizedGroundingSurface(value))
    .filter(Boolean);
}

function constituentOnlyEntityMatch(primary, context) {
  const missingEntity = normalizedGroundingSurface(primary?.query?.missingEntity);
  const missingTokens = missingEntity.split(' ').filter(Boolean);
  if (missingTokens.length < 2) return false;
  const requestedTokens = new Set(missingTokens);
  const surfaces = (context?.entries ?? []).flatMap(entryEntitySurfaces);
  if (surfaces.includes(missingEntity)) return false;
  return surfaces.some((surface) => {
    const tokens = surface.split(' ').filter(Boolean);
    return tokens.length > 0 && tokens.length < missingTokens.length
      && tokens.every((token) => requestedTokens.has(token));
  });
}

function selectEntries(context) {
  const explicitFamilies = new Set((context.selfQuestionPlan?.questions ?? [])
    .filter((question) => question.disposition === 'explicit')
    .map((question) => question.family));
  const facetMatches = explicitFamilies.size === 0 ? [] : (context.entries ?? []).filter((entry) =>
    (entry.semantic?.questionFamilies ?? []).some((family) => explicitFamilies.has(family)));
  const candidates = facetMatches.length > 0 ? facetMatches : (context.entries ?? []);
  const selected = [];
  const seenEntries = new Set();
  const seenLexicalTopics = new Set();
  for (const entry of candidates) {
    const identity = entryIdentity(entry);
    if (seenEntries.has(identity)) continue;
    const topic = entryTopicKey(entry);
    if (entry.semantic?.kind === 'lexical-sense' && seenLexicalTopics.has(topic)) continue;
    const realized = realizeEntry(entry);
    if (!realized) continue;
    seenEntries.add(identity);
    if (entry.semantic?.kind === 'lexical-sense') seenLexicalTopics.add(topic);
    selected.push(Object.freeze({ entry, identity, sentence: realized }));
    if (selected.length >= MAX_REALIZED_CONTEXT_CLAIMS) break;
  }
  return Object.freeze(selected);
}

function kbVersions(entries) {
  return Object.freeze([...new Map(entries.map(({ entry }) => [
    `${entry.kbId}\u0000${entry.kbVersion}`,
    Object.freeze({ kbId: entry.kbId, version: entry.kbVersion }),
  ])).values()].toSorted((left, right) => left.kbId.localeCompare(right.kbId)
    || left.version.localeCompare(right.version)));
}

export function canRealizeTaskContextFallback(primary, context) {
  return FALLBACK_STATUSES.has(primary?.status) && (context?.entries?.length ?? 0) > 0
    && primary?.requestPlanning?.status !== 'PLANNED'
    && primary?.query?.invalidNominal === undefined
    && !constituentOnlyEntityMatch(primary, context);
}

export function realizeTaskContextFallback(primary, context) {
  if (!canRealizeTaskContextFallback(primary, context)) return null;
  const selected = selectEntries(context);
  if (selected.length === 0) return null;
  const inability = primary.status === 'UNPARSED'
    ? 'I could not represent the full request precisely.'
    : 'I could not establish a precise answer to the full request.';
  const lines = [inability, 'Relevant source-backed context:'];
  selected.forEach((item, index) => lines.push(`- ${item.sentence} [${index + 1}]`));
  lines.push('These source claims provide context; they do not establish the missing conclusion.');
  return Object.freeze({
    status: 'PARTIAL',
    languageRoute: TASK_CONTEXT_FALLBACK_ROUTE,
    answer: lines.join('\n'),
    values: Object.freeze([]),
    provenance: Object.freeze(selected.map(({ entry }) => Object.freeze({
      fact: entry.recordId,
      kbId: entry.kbId,
      kbVersion: entry.kbVersion,
      source: entry.provenance,
      method: 'query-local-contextual-source-realization',
      sourceClaim: true,
    }))),
    usedKbVersions: kbVersions(selected),
    realization: Object.freeze({
      status: 'contextual-fallback',
      originalStatus: primary.status,
      realizedEntryIds: Object.freeze(selected.map((item) => item.identity)),
      answerAuthority: 'source-claim-only',
      preciseAnswerEstablished: false,
    }),
  });
}
