import {
  baseThirdPersonSingular, primaryProgressiveLemma,
} from '../language/heuristic-cnl-morphology.mjs';

const FUNCTION_WORDS = new Set([
  'a', 'about', 'all', 'am', 'an', 'and', 'another', 'any', 'anything', 'are', 'as', 'at', 'be', 'been',
  'being', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'each', 'either', 'enough', 'every',
  'everything', 'few', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'less', 'least', 'many', 'may', 'me', 'might', 'more', 'most', 'much', 'must', 'neither', 'no',
  'none', 'of', 'on', 'or', 'other', 'ought', 'own', 'please', 'several', 'shall', 'should', 'some', 'such',
  'than', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'to', 'us', 'was', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
]);

const PHRASE_CONNECTORS = new Set([
  'about', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'than', 'to', 'with',
]);

const REQUEST_DIRECTIVES = new Set([
  'answer', 'create', 'define', 'describe', 'discuss', 'draft', 'explain', 'find', 'generate', 'give', 'list',
  'outline', 'produce', 'provide', 'report', 'review', 'show', 'summarise', 'summarize', 'tell', 'write',
]);
const REQUEST_PREFIX_WORDS = new Set([
  'can', 'could', 'do', 'may', 'please', 'should', 'will', 'would', 'you',
]);
const REQUEST_HEAD_WORDS = new Set([
  ...REQUEST_DIRECTIVES,
  'analysis', 'answer', 'details', 'everything', 'explanation', 'facts', 'information', 'know', 'known',
  'material', 'overview', 'report', 'response', 'summary',
]);
const REQUEST_ARTIFACT_WORDS = new Set([
  'analysis', 'answer', 'article', 'details', 'essay', 'explanation', 'facts', 'information', 'note', 'overview',
  'paragraph', 'report', 'response', 'summary', 'text',
]);
const REQUEST_STYLE_WORDS = new Set([
  'brief', 'briefly', 'clear', 'clearly', 'comprehensive', 'concise', 'concisely', 'detailed', 'plain', 'short',
  'simple',
]);
const REQUEST_TOPIC_MARKERS = new Set(['about', 'concerning', 'regarding']);
const REQUEST_ARTIFACT_MARKERS = new Set(['of', 'on']);

function normalizedSurface(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US').replaceAll('_', ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function singularVariants(token) {
  const irregular = {
    children: 'child', feet: 'foot', geese: 'goose', men: 'man', mice: 'mouse',
    news: undefined, people: 'person', series: undefined, species: undefined,
    teeth: 'tooth', women: 'woman', wolves: 'wolf',
  };
  const values = [token, irregular[token]];
  if (token.endsWith('ics') || token.endsWith('is') || token.endsWith('us')) return unique(values);
  if (token.endsWith('ies') && token.length > 4) values.unshift(`${token.slice(0, -3)}y`);
  else if (token.length > 4 && /(?:ches|shes|sses|xes|zes|oes)$/u.test(token)) {
    values.unshift(token.slice(0, -2));
  } else if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    values.unshift(token.slice(0, -1));
  }
  return unique(values);
}

function surfaceTokenRecords(value) {
  const normalized = String(value ?? '').normalize('NFKD').replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US').replaceAll('_', ' ');
  return [...normalized.matchAll(/[\p{L}\p{N}]+/gu)].map((match, index) => Object.freeze({
    index,
    surface: match[0],
    span: Object.freeze({ start: match.index, end: match.index + match[0].length }),
  }));
}

function finalQuestionRecords(value) {
  const records = surfaceTokenRecords(value);
  const source = String(value ?? '').normalize('NFKD').replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US').replaceAll('_', ' ');
  const questionEnd = source.lastIndexOf('?');
  if (questionEnd < 0) return [];
  const questionStart = Math.max(source.lastIndexOf('.', questionEnd - 1),
    source.lastIndexOf('!', questionEnd - 1), source.lastIndexOf('?', questionEnd - 1)) + 1;
  return records.filter((record) => record.span.start >= questionStart && record.span.end <= questionEnd);
}

const QUESTION_AUXILIARIES = new Set([
  'am', 'are', 'can', 'could', 'did', 'do', 'does', 'has', 'have', 'is', 'may', 'might', 'must',
  'shall', 'should', 'was', 'were', 'will', 'would',
]);

function questionRoles(value) {
  const records = finalQuestionRecords(value);
  const roles = new Map();
  if (records.length === 0) return roles;
  let cursor = 0;
  while (cursor < records.length && FUNCTION_WORDS.has(records[cursor].surface)
    && !QUESTION_AUXILIARIES.has(records[cursor].surface)) cursor += 1;
  if (!QUESTION_AUXILIARIES.has(records[cursor]?.surface)) return roles;
  cursor += 1;
  while (cursor < records.length && FUNCTION_WORDS.has(records[cursor].surface)) cursor += 1;
  const subject = records[cursor];
  if (subject) roles.set(subject.span.start, 'entity');
  cursor += 1;
  while (cursor < records.length && FUNCTION_WORDS.has(records[cursor].surface)) cursor += 1;
  const predicate = records[cursor];
  if (predicate) roles.set(predicate.span.start, 'predicate');
  cursor += 1;
  for (; cursor < records.length; cursor += 1) {
    if (!FUNCTION_WORDS.has(records[cursor].surface)) roles.set(records[cursor].span.start, 'object');
  }
  return roles;
}

function morphologyVariants(token, role) {
  if (role === 'predicate' || token.endsWith('ing')) {
    const lemma = token.endsWith('ing') ? primaryProgressiveLemma(token) : baseThirdPersonSingular(token);
    return unique([lemma, token]);
  }
  return singularVariants(token);
}

function candidateKey(candidate) {
  return `${candidate.term}\u0000${candidate.role}\u0000${candidate.kind}\u0000${candidate.span?.start ?? -1}`;
}

function makeCandidate({ term, surface = term, role, kind, score, span, variantOf, excludedReason }) {
  return Object.freeze({
    candidateId: '', term, surface, role, kind, score,
    ...(span ? { span } : {}),
    ...(variantOf ? { variantOf } : {}),
    included: !excludedReason,
    ...(excludedReason ? { exclusionReason: excludedReason } : {}),
  });
}

function rankedFocusCandidates(value, { maximumWords, semanticFocus = [] }) {
  const candidates = [];
  const metaTokens = metalinguisticTopicTokens(value);
  const metalinguistic = metaTokens.length > 0;
  for (const focus of semanticFocus) {
    const term = normalizedSurface(focus?.term);
    if (!term || (isGroundingStructuralTerm(term) && !metalinguistic)) continue;
    candidates.push(makeCandidate({
      term, role: focus.role ?? 'semantic', kind: 'accepted-semantic-ir', score: 130,
    }));
  }

  if (metalinguistic) {
    const phrase = metaTokens.slice(0, maximumWords).join(' ');
    if (phrase) candidates.push(makeCandidate({
      term: phrase, surface: phrase, role: 'metalinguistic-topic', kind: 'exact-phrase', score: 125,
    }));
    if (metaTokens.length === 1) {
      for (const term of singularVariants(metaTokens[0])) {
        if (term === phrase) continue;
        candidates.push(makeCandidate({
          term, surface: phrase, role: 'metalinguistic-topic', kind: 'morphological-variant',
          score: 115, variantOf: phrase,
        }));
      }
    }
    return candidates;
  }

  const roles = requestDirectiveIndex(normalizedTokens(value)) >= 0 ? new Map() : questionRoles(value);
  const records = surfaceTokenRecords(value);
  const focused = new Set(focusedSurfaceTokens(value));
  const finalRecords = finalQuestionRecords(value);
  const phraseRecords = finalRecords.filter((record) => !FUNCTION_WORDS.has(record.surface));
  if (phraseRecords.length >= 2 && phraseRecords.length <= maximumWords) {
    candidates.push(makeCandidate({
      term: phraseRecords.map((record) => record.surface).join(' '),
      surface: phraseRecords.map((record) => record.surface).join(' '),
      role: 'question-focus', kind: 'exact-phrase', score: 120,
      span: Object.freeze({ start: phraseRecords[0].span.start, end: phraseRecords.at(-1).span.end }),
    }));
  }
  const focusedPhrase = trimmedPhraseTokens(focusedSurfaceTokens(value));
  if (focusedPhrase.length >= 2 && focusedPhrase.length <= maximumWords
    && !focusedPhrase.some((token, index) => FUNCTION_WORDS.has(token)
      && index > 0 && index < focusedPhrase.length - 1 && !PHRASE_CONNECTORS.has(token))) {
    candidates.push(makeCandidate({
      term: focusedPhrase.join(' '), surface: focusedPhrase.join(' '), role: 'request-focus',
      kind: 'exact-phrase', score: 121,
    }));
  }

  for (const record of records) {
    const role = roles.get(record.span.start) ?? 'content';
    const excludedReason = FUNCTION_WORDS.has(record.surface) && !(metalinguistic && metaTokens.includes(record.surface))
      ? 'grammatical-or-request-scaffolding'
      : record.surface.length < 3 && !roles.has(record.span.start)
        ? 'content-token-too-short'
      : !focused.has(record.surface) && !roles.has(record.span.start) && !metaTokens.includes(record.surface)
        ? 'outside-focused-request-envelope' : undefined;
    if (excludedReason) {
      candidates.push(makeCandidate({
        term: record.surface, surface: record.surface, role: 'operator', kind: 'surface-token',
        score: 0, span: record.span, excludedReason,
      }));
      continue;
    }
    const variants = morphologyVariants(record.surface, role);
    for (const [variantIndex, term] of variants.entries()) {
      const isVariant = term !== record.surface;
      const roleBoost = role === 'predicate' ? 14 : ['entity', 'object'].includes(role) ? 10 : 0;
      const variantAdjustment = isVariant ? (role === 'content' ? -1 : 3) : 0;
      candidates.push(makeCandidate({
        term, surface: record.surface, role,
        kind: isVariant ? 'morphological-variant' : 'surface-token',
        score: 90 + roleBoost + variantAdjustment - (isVariant ? variantIndex : 0),
        span: record.span,
        ...(isVariant ? { variantOf: record.surface } : {}),
      }));
    }
  }
  return candidates;
}

export function selectGroundingTerms(value, options = {}) {
  const maximumTerms = options.maximumTerms ?? 12;
  const maximumWords = options.maximumWords ?? 3;
  const maximumCandidates = options.maximumCandidates ?? Math.max(512, maximumTerms);
  if (!Number.isInteger(maximumTerms) || maximumTerms < 1 || maximumTerms > 10_000) {
    throw new Error('Grounding maximumTerms must be an integer from 1 to 10000.');
  }
  if (!Number.isInteger(maximumWords) || maximumWords < 1 || maximumWords > 5) {
    throw new Error('Grounding maximumWords must be an integer from 1 to 5.');
  }
  if (!Number.isInteger(maximumCandidates) || maximumCandidates < maximumTerms
    || maximumCandidates > 20_000) {
    throw new Error('Grounding maximumCandidates must contain selected terms and be at most 20000.');
  }
  const observed = rankedFocusCandidates(value, {
    maximumWords, semanticFocus: options.semanticFocus,
  });
  const retained = observed.slice(0, maximumCandidates);
  const eligible = retained.filter((candidate) => candidate.included)
    .toSorted((left, right) => right.score - left.score || left.term.localeCompare(right.term)
      || candidateKey(left).localeCompare(candidateKey(right)));
  const selected = [];
  const selectedTerms = new Set();
  for (const candidate of eligible) {
    if (selectedTerms.has(candidate.term)) continue;
    selectedTerms.add(candidate.term);
    selected.push(candidate);
    if (selected.length >= maximumTerms) break;
  }
  const selectedSet = new Set(selected.map(candidateKey));
  const audited = retained.map((candidate, index) => Object.freeze({
    ...candidate,
    candidateId: `focus:${String(index + 1).padStart(4, '0')}`,
    selected: selectedSet.has(candidateKey(candidate)),
    ...(!selectedSet.has(candidateKey(candidate)) && candidate.included
      ? { exclusionReason: selectedTerms.has(candidate.term) ? 'duplicate-term' : 'term-selection-budget' }
      : {}),
  }));
  const uniqueEligibleTerms = new Set(eligible.map((candidate) => candidate.term)).size;
  return Object.freeze({
    strategy: 'semantic-role-phrase-morphology-v3',
    terms: Object.freeze(selected.map((candidate) => candidate.term)),
    candidates: Object.freeze(audited),
    observedCandidates: observed.length,
    retainedCandidates: retained.length,
    omittedCandidates: Math.max(0, observed.length - retained.length),
    complete: observed.length <= maximumCandidates && uniqueEligibleTerms <= maximumTerms,
  });
}

function normalizedTokens(value) {
  const surface = normalizedSurface(value);
  return surface ? surface.split(' ') : [];
}

function explicitAcronyms(value) {
  return new Set((String(value ?? '').normalize('NFKC').match(/\b\p{Lu}{2,}\b/gu) ?? [])
    .map((token) => normalizedSurface(token)));
}

function metalinguisticTopicTokens(value) {
  const surface = normalizedSurface(value);
  const match = surface.match(/^(?:what is the meaning of|what does) (.+?)(?: mean)?$/u)
    ?? surface.match(/^define (.+)$/u)
    ?? surface.match(/^what is the (?:word|term) (.+)$/u);
  return match ? normalizedTokens(match[1]) : [];
}

function requestDirectiveIndex(tokens) {
  const maximumPrefix = Math.min(tokens.length - 1, 4);
  for (let index = 0; index <= maximumPrefix; index += 1) {
    if (!REQUEST_DIRECTIVES.has(tokens[index])) continue;
    if (tokens.slice(0, index).every((token) => REQUEST_PREFIX_WORDS.has(token))) return index;
  }
  return -1;
}

function markerFocus(tokens, allowUnqualifiedTopicMarker) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const marker = tokens[index];
    const head = tokens.slice(0, index).filter((token) => !FUNCTION_WORDS.has(token));
    const isTopicMarker = REQUEST_TOPIC_MARKERS.has(marker)
      && (allowUnqualifiedTopicMarker || head.every((token) => REQUEST_HEAD_WORDS.has(token)));
    const isArtifactMarker = REQUEST_ARTIFACT_MARKERS.has(marker)
      && head.some((token) => REQUEST_ARTIFACT_WORDS.has(token))
      && head.every((token) => REQUEST_HEAD_WORDS.has(token) || REQUEST_STYLE_WORDS.has(token));
    if (isTopicMarker || isArtifactMarker) return tokens.slice(index + 1);
  }
  return undefined;
}

function focusedSurfaceTokens(value) {
  const tokens = normalizedTokens(value);
  const directiveIndex = requestDirectiveIndex(tokens);
  if (directiveIndex >= 0) {
    const tail = tokens.slice(directiveIndex + 1);
    const marked = markerFocus(tail, true);
    if (marked?.some((token) => !FUNCTION_WORDS.has(token))) return marked;
    let first = 0;
    while (first < tail.length
      && (FUNCTION_WORDS.has(tail[first]) || REQUEST_STYLE_WORDS.has(tail[first]))) first += 1;
    return tail.slice(first);
  }
  const marked = markerFocus(tokens, false);
  return marked?.some((token) => !FUNCTION_WORDS.has(token)) ? marked : tokens;
}

function trimmedPhraseTokens(tokens) {
  let first = 0;
  let last = tokens.length;
  while (first < last && FUNCTION_WORDS.has(tokens[first])) first += 1;
  while (last > first && FUNCTION_WORDS.has(tokens[last - 1])) last -= 1;
  return tokens.slice(first, last);
}

function addPhraseWithSingularTail(terms, tokens) {
  if (tokens.length < 2 || FUNCTION_WORDS.has(tokens[0]) || FUNCTION_WORDS.has(tokens.at(-1))) return;
  if (tokens.slice(1, -1).some((token) => FUNCTION_WORDS.has(token) && !PHRASE_CONNECTORS.has(token))) return;
  if (tokens.filter((token) => !FUNCTION_WORDS.has(token)).length < 2) return;
  terms.add(tokens.join(' '));
  for (const variant of singularVariants(tokens.at(-1))) {
    if (variant !== tokens.at(-1)) terms.add([...tokens.slice(0, -1), variant].join(' '));
  }
}

function finalQuestionPhraseTokens(value) {
  const source = String(value ?? '').normalize('NFKC');
  const questionMark = source.lastIndexOf('?');
  if (questionMark < 0) return [];
  const prefix = source.slice(0, questionMark);
  const clause = prefix.slice(Math.max(prefix.lastIndexOf('.'), prefix.lastIndexOf('!')) + 1);
  return trimmedPhraseTokens(normalizedTokens(clause));
}

export function groundingTokens(value) {
  const acronyms = explicitAcronyms(value);
  return focusedSurfaceTokens(value)
    .filter((token) => (token.length >= 3 || acronyms.has(token)) && !FUNCTION_WORDS.has(token));
}

export function groundingTerms(value, options = {}) {
  return [...selectGroundingTerms(value, options).terms];
}

export function isGroundingFunctionWord(value) {
  return FUNCTION_WORDS.has(normalizedSurface(value));
}

export function isGroundingStructuralTerm(value) {
  const tokens = normalizedTokens(value);
  return tokens.length > 0 && tokens.every((token) => FUNCTION_WORDS.has(token));
}

export { normalizedSurface as normalizedGroundingSurface };
