import { damerauDistance } from '../util.mjs';

export const GRAMMATICAL_WORDS = Object.freeze([
  'a', 'all', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'before', 'both', 'by', 'can',
  'could', 'did', 'do', 'does', 'each', 'either', 'every', 'for', 'from', 'has', 'have',
  'how', 'if', 'in', 'is', 'later', 'may', 'might', 'must', 'never', 'no', 'none', 'not',
  'of', 'or', 'please', 'should', 'some', 'than', 'that', 'the', 'then', 'to', 'unless',
  'until', 'was', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who',
  'why', 'will', 'with', 'would',
]);

const GRAMMATICAL_SET = new Set(GRAMMATICAL_WORDS);
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export function verbLemmaCandidates(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  const candidates = new Set([word]);
  if (word.length > 4 && word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    candidates.add(stem);
    candidates.add(`${stem}e`);
    if (/^[^aeiou]ying$/u.test(word)) candidates.add(`${word.slice(0, -4)}ie`);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && !VOWELS.has(stem.at(-1))) {
      candidates.add(stem.slice(0, -1));
    }
  }
  if (word.length > 3 && word.endsWith('ied')) candidates.add(`${word.slice(0, -3)}y`);
  if (word.length > 3 && word.endsWith('ed')) {
    const stem = word.slice(0, -2);
    candidates.add(stem);
    candidates.add(`${stem}e`);
  }
  if (word.length > 3 && word.endsWith('ies')) {
    candidates.add(`${word.slice(0, -3)}y`);
    candidates.add(`${word.slice(0, -3)}ie`);
  }
  if (word.length > 3 && /(?:ches|shes|sses|xes|zes|oes)$/u.test(word)) candidates.add(word.slice(0, -2));
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) candidates.add(word.slice(0, -1));
  const ordered = [...candidates].sort((left, right) => left.length - right.length
    || left.localeCompare(right));
  if (word.endsWith('ies')) {
    const preferred = baseThirdPersonSingular(word);
    ordered.splice(ordered.indexOf(preferred), 1);
    ordered.unshift(preferred);
  }
  return Object.freeze(ordered);
}

export function primaryProgressiveLemma(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  if (!word.endsWith('ing') || word.length <= 4) return word;
  if (/^[^aeiou]ying$/u.test(word)) return `${word.slice(0, -4)}ie`;
  const stem = word.slice(0, -3);
  if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && !VOWELS.has(stem.at(-1))
      && !['s', 'z'].includes(stem.at(-1))) {
    return stem.slice(0, -1);
  }
  return stem;
}

export function thirdPersonSingular(lemma) {
  const word = lemma.toLocaleLowerCase('en-US');
  if (/[^aeiou]y$/u.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh|o)$/u.test(word)) return `${word}es`;
  return `${word}s`;
}

export function baseThirdPersonSingular(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  const irregular = { does: 'do', goes: 'go', has: 'have' };
  if (irregular[word]) return irregular[word];
  if (word.length > 3 && word.endsWith('ies')) {
    const stem = word.slice(0, -3);
    return stem.length === 1 ? `${stem}ie` : `${stem}y`;
  }
  if (word.length > 4 && /(?:ches|shes|sses|xes|zes|oes)$/u.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function looksLikeThirdPersonVerb(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  return word.length > 3 && /s$/u.test(word) && !/(?:ss|ous)$/u.test(word);
}

function sharedCharacterCount(left, right) {
  const counts = new Map();
  for (const character of left) counts.set(character, (counts.get(character) ?? 0) + 1);
  let shared = 0;
  for (const character of right) {
    const available = counts.get(character) ?? 0;
    if (available === 0) continue;
    shared += 1;
    counts.set(character, available - 1);
  }
  return shared;
}

export function closestUniqueWord(surface, vocabulary, maximumDistance, budget, options = {}) {
  let closestDistance = Number.POSITIVE_INFINITY;
  const closest = [];
  for (const word of vocabulary) {
    if (budget.distanceEvaluations >= budget.maximumEditDistanceEvaluations) {
      budget.distanceLimitReached = true;
      break;
    }
    budget.distanceEvaluations += 1;
    const distance = damerauDistance(surface, word);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest.length = 0;
      closest.push(word);
    } else if (distance === closestDistance) {
      closest.push(word);
    }
  }
  if (closestDistance > maximumDistance) return undefined;
  if (closest.length === 1) return Object.freeze({ word: closest[0], distance: closestDistance });
  if (options.preferCharacterCoverage !== true) return undefined;
  const ranked = closest.map((word) => Object.freeze({
    word, coverage: sharedCharacterCount(surface, word),
  })).sort((left, right) => right.coverage - left.coverage || left.word.localeCompare(right.word));
  if (ranked.length < 2 || ranked[0].coverage === ranked[1].coverage) return undefined;
  return Object.freeze({
    word: ranked[0].word, distance: closestDistance, tieBreak: 'source-character-coverage',
  });
}

export function grammaticalSpellingCorrection(surface, budget) {
  const word = surface.toLocaleLowerCase('en-US');
  if (GRAMMATICAL_SET.has(word) || word.length < 3 || word.length > 12) return undefined;
  return closestUniqueWord(word, GRAMMATICAL_WORDS, 1, budget);
}

export function isGrammaticalWord(surface) {
  return GRAMMATICAL_SET.has(surface.toLocaleLowerCase('en-US'));
}
