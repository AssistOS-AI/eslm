import { sha256 } from '../util.mjs';

const MAX_SENTENCES = 64;
const MAX_SENTENCE_CHARACTERS = 4_096;
const MAX_TOKENS_PER_SENTENCE = 512;
const FUNCTION_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'did', 'do', 'does',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'i', 'in', 'is', 'it',
  'its', 'me', 'my', 'of', 'on', 'or', 'our', 'ours', 'she', 'so', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'then', 'they', 'this', 'to', 'us', 'was', 'we', 'were', 'with', 'you', 'your',
]);
const LEADING_NON_NAMES = new Set([
  'a', 'after', 'an', 'as', 'at', 'before', 'during', 'finally', 'he', 'her', 'his', 'i', 'in',
  'it', 'later', 'meanwhile', 'next', 'once', 'she', 'soon', 'that', 'the', 'their', 'then', 'they',
  'this', 'today', 'we', 'when', 'while', 'yesterday', 'you',
]);
const PRONOUN_GROUPS = Object.freeze({
  he: 'person:masculine', him: 'person:masculine', his: 'person:masculine',
  she: 'person:feminine', her: 'person:feminine', hers: 'person:feminine',
  they: 'participant:plural', them: 'participant:plural', their: 'participant:plural',
  it: 'entity:singular', its: 'entity:singular',
  i: 'speaker', me: 'speaker', my: 'speaker',
  we: 'speaker:plural', us: 'speaker:plural', our: 'speaker:plural',
  you: 'addressee', your: 'addressee',
});
const NEGATION = new Set(['cannot', 'cant', 'didnt', 'doesnt', 'dont', 'never', 'no', 'not', 'wasnt', 'wont']);
const MODALITY = Object.freeze({
  can: 'possible', could: 'possible', may: 'possible', might: 'possible',
  must: 'necessary', should: 'recommended', would: 'conditional', will: 'predicted',
});
const IRREGULAR_LEMMAS = Object.freeze({
  became: 'become', began: 'begin', bought: 'buy', brought: 'bring', came: 'come',
  chose: 'choose', did: 'do', drank: 'drink', drove: 'drive', ate: 'eat', felt: 'feel',
  found: 'find', gave: 'give', got: 'get', had: 'have', heard: 'hear', kept: 'keep',
  knew: 'know', left: 'leave', lost: 'lose', made: 'make', met: 'meet', paid: 'pay',
  ran: 'run', said: 'say', saw: 'see', sent: 'send', sat: 'sit', slept: 'sleep',
  spoke: 'speak', spent: 'spend', stood: 'stand', swam: 'swim', took: 'take',
  told: 'tell', thought: 'think', went: 'go', won: 'win', wrote: 'write',
});

function fail(message) {
  throw new Error(`Invalid narrative sequence: ${message}`);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function lemma(token) {
  if (IRREGULAR_LEMMAS[token]) return IRREGULAR_LEMMAS[token];
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ing')) {
    const root = token.slice(0, -3);
    return root.endsWith(root.at(-1).repeat(2)) ? root.slice(0, -1) : root;
  }
  if (token.length > 4 && token.endsWith('ied')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('ed')) {
    const root = token.slice(0, -2);
    return root.endsWith(root.at(-1).repeat(2)) ? root.slice(0, -1) : root;
  }
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenizeSurface(sentence) {
  return sentence.normalize('NFKC').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)?/gu) ?? [];
}

function tenseOf(tokens) {
  if (tokens.some((token) => ['will', 'shall'].includes(token))) return 'future';
  if (tokens.some((token) => ['was', 'were', 'had', 'did'].includes(token)
    || token.endsWith('ed'))) return 'past';
  if (tokens.some((token) => ['is', 'are', 'has', 'does'].includes(token))) return 'present';
  return 'unspecified';
}

function participantFeatures(surfaceTokens, normalizedTokens) {
  const named = [];
  for (let index = 0; index < surfaceTokens.length; index += 1) {
    const surface = surfaceTokens[index];
    const normalized = normalizedTokens[index];
    if (!/^\p{Lu}/u.test(surface)) continue;
    if (LEADING_NON_NAMES.has(normalized)) continue;
    named.push(normalized);
  }
  const pronouns = normalizedTokens.filter((token) => PRONOUN_GROUPS[token])
    .map((token) => PRONOUN_GROUPS[token]);
  return {
    named: [...new Set(named)].sort(),
    pronounGroups: [...new Set(pronouns)].sort(),
  };
}

function predicateCandidates(tokens) {
  const candidates = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const previousSemantic = NEGATION.has(previous) ? tokens[index - 2] : previous;
    const inflected = token.endsWith('ed') || token.endsWith('ing');
    const followsSubject = index > 0 && (PRONOUN_GROUPS[previous] || index === 1);
    const followsAuxiliary = ['did', 'does', 'had', 'has', 'have', 'is', 'was', 'were', 'will']
      .includes(previousSemantic);
    if ((inflected || followsSubject || followsAuxiliary)
      && !FUNCTION_WORDS.has(token) && !NEGATION.has(token)) {
      candidates.push(lemma(token));
    }
  }
  return [...new Set(candidates)].slice(0, 8);
}

export function compileNarrativeSentence(sentence, index = 0) {
  assertCondition(typeof sentence === 'string', `sentence ${index} must be a string.`);
  assertCondition(sentence.length > 0 && sentence.length <= MAX_SENTENCE_CHARACTERS,
    `sentence ${index} must contain 1 to ${MAX_SENTENCE_CHARACTERS} characters.`);
  assertCondition(!/[\0\r\n]/u.test(sentence), `sentence ${index} contains a forbidden control character.`);
  const surfaceTokens = tokenizeSurface(sentence);
  assertCondition(surfaceTokens.length > 0 && surfaceTokens.length <= MAX_TOKENS_PER_SENTENCE,
    `sentence ${index} must contain 1 to ${MAX_TOKENS_PER_SENTENCE} tokens.`);
  const tokens = surfaceTokens.map((token) => token.toLocaleLowerCase('en-US').replaceAll('’', "'"));
  const participants = participantFeatures(surfaceTokens, tokens);
  const names = new Set(participants.named);
  const content = tokens.filter((token) => !FUNCTION_WORDS.has(token) && !NEGATION.has(token)
    && !names.has(token))
    .map(lemma);
  const modality = tokens.map((token) => MODALITY[token]).find(Boolean) ?? 'asserted';
  return Object.freeze({
    schema: 'narrative-event-frame-v1',
    eventId: `event:${index}:${sha256(sentence.normalize('NFKC')).slice(0, 16)}`,
    index,
    surface: sentence.normalize('NFKC').trim(),
    tokens: Object.freeze(tokens),
    content: Object.freeze([...new Set(content)]),
    predicates: Object.freeze(predicateCandidates(tokens)),
    participants: Object.freeze({
      named: Object.freeze(participants.named),
      pronounGroups: Object.freeze(participants.pronounGroups),
    }),
    polarity: tokens.some((token) => NEGATION.has(token)) ? 'negative' : 'positive',
    modality,
    tense: tenseOf(tokens),
  });
}

export function compileNarrativeSequence(sentences) {
  assertCondition(Array.isArray(sentences), 'sentences must be an array.');
  assertCondition(sentences.length > 0 && sentences.length <= MAX_SENTENCES,
    `sequence must contain 1 to ${MAX_SENTENCES} sentences.`);
  const events = sentences.map((sentence, index) => compileNarrativeSentence(sentence, index));
  const namedParticipants = [...new Set(events.flatMap((event) => event.participants.named))].sort();
  return Object.freeze({
    schema: 'narrative-sequence-v1',
    events: Object.freeze(events),
    discourse: Object.freeze({
      namedParticipants: Object.freeze(namedParticipants),
      dominantTense: events.map((event) => event.tense)
        .filter((tense) => tense !== 'unspecified')
        .toSorted((left, right) => events.filter((event) => event.tense === right).length
          - events.filter((event) => event.tense === left).length)[0] ?? 'unspecified',
    }),
  });
}
