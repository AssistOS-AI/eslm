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
  if (word.length > 3 && word.endsWith('ies')) candidates.add(`${word.slice(0, -3)}y`);
  if (word.length > 3 && /(?:ches|shes|sses|xes|zes|oes)$/u.test(word)) candidates.add(word.slice(0, -2));
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) candidates.add(word.slice(0, -1));
  return Object.freeze([...candidates].sort((left, right) => left.length - right.length
    || left.localeCompare(right)));
}

export function primaryProgressiveLemma(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  if (!word.endsWith('ing') || word.length <= 4) return word;
  const stem = word.slice(0, -3);
  if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && !VOWELS.has(stem.at(-1))) {
    return stem.slice(0, -1);
  }
  if (stem.endsWith('y') || /[aeiou]{2}[^aeiou]?$/u.test(stem)) return stem;
  const candidates = verbLemmaCandidates(word);
  const silentE = `${stem}e`;
  return candidates.includes(silentE) && /[^aeiou][aeiou][^aeiou]$/u.test(stem) ? silentE : stem;
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
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(?:ches|shes|sses|xes|zes|oes)$/u.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function looksLikeThirdPersonVerb(surface) {
  const word = surface.toLocaleLowerCase('en-US');
  return word.length > 3 && /s$/u.test(word) && !/(?:ss|ous)$/u.test(word);
}

export function closestUniqueWord(surface, vocabulary, maximumDistance, budget) {
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
  if (closestDistance > maximumDistance || closest.length !== 1) return undefined;
  return Object.freeze({ word: closest[0], distance: closestDistance });
}

export function grammaticalSpellingCorrection(surface, budget) {
  const word = surface.toLocaleLowerCase('en-US');
  if (GRAMMATICAL_SET.has(word) || word.length < 3 || word.length > 12) return undefined;
  return closestUniqueWord(word, GRAMMATICAL_WORDS, 1, budget);
}

export function isGrammaticalWord(surface) {
  return GRAMMATICAL_SET.has(surface.toLocaleLowerCase('en-US'));
}
