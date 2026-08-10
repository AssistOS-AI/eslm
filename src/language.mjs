import { editDistance } from './util.mjs';

const BASE_VARIANTS = Object.freeze({
  wher: 'where', were: 'where', waht: 'what', wht: 'what', ho: 'who', whos: 'who',
  iz: 'is', colr: 'color', colour: 'color', dose: 'does', ownes: 'owns',
});

const QUESTION_WORDS = new Set([
  'where', 'what', 'who', 'which', 'why', 'how', 'is', 'does', 'can',
  'tell', 'show',
]);

export function tokenize(text) {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[’']/gu, '')
    .match(/[\p{L}\p{N}_-]+|[?.!,;:]/gu) ?? [];
}

function correctionVocabulary(model) {
  const words = new Set([
    ...QUESTION_WORDS, 'in', 'at', 'of', 'color', 'own', 'owns', 'located', 'going', 'to', 'die',
    'likely', 'fly', 'could', 'explain', 'mortal', 'eventually',
  ]);
  for (const entity of model.entities) {
    for (const name of entity.names) tokenize(name).forEach((word) => words.add(word));
  }
  for (const [canonical, variants] of Object.entries(model.lexicon.variants ?? {})) {
    words.add(canonical);
    variants.forEach((word) => words.add(word));
  }
  return words;
}

export function normalizeInput(text, model) {
  const variants = { ...BASE_VARIANTS };
  for (const [canonical, spellings] of Object.entries(model.lexicon.variants ?? {})) {
    for (const spelling of spellings) variants[spelling] = canonical;
  }
  const vocabulary = correctionVocabulary(model);
  const corrections = [];
  const surfaces = text.normalize('NFKC').replace(/[’']/gu, '').match(/[\p{L}\p{N}_-]+|[?.!,;:]/gu) ?? [];
  const tokens = tokenize(text).map((token, index) => {
    if (/^[?.!,;:]$/u.test(token)) return token;
    if (variants[token]) {
      corrections.push({ from: token, to: variants[token], method: 'declared-variant' });
      return variants[token];
    }
    if (/^\p{Lu}/u.test(surfaces[index] ?? '')) return token;
    if (vocabulary.has(token) || token.length < 4) return token;
    let candidate;
    let distance = Number.POSITIVE_INFINITY;
    for (const word of vocabulary) {
      const current = editDistance(token, word);
      if (current < distance) {
        candidate = word;
        distance = current;
      }
    }
    const limit = token.length >= 8 ? 2 : 1;
    if (candidate && distance <= limit) {
      corrections.push({ from: token, to: candidate, method: 'bounded-edit-distance' });
      return candidate;
    }
    return token;
  });
  return { original: text, tokens, normalized: tokens.join(' '), corrections, language: 'en' };
}

export function grammarScore(text, model) {
  const normalized = normalizeInput(text, model);
  let score = 0;
  const reasons = [];
  const words = normalized.tokens.filter((token) => !/^[?.!,;:]$/u.test(token));
  if (words.length > 0) score += 1;
  if (QUESTION_WORDS.has(words[0])) score += 0.5;
  if (words.includes('is') || words.includes('does') || words.includes('are')) score += 0.25;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      score -= 0.75;
      reasons.push('adjacent-repetition');
    }
  }
  const known = correctionVocabulary(model);
  const unknown = words.filter((word) => !known.has(word));
  score -= Math.min(1.5, unknown.length * 0.08);
  if (normalized.corrections.length > 0) score -= normalized.corrections.length * 0.05;
  return { score, reasons, normalized };
}
