import {
  assessEnglishLikelihood,
  assertEnglishLikelihoodReceipt,
} from './english-likelihood.mjs';

const OPERATOR_IDENTITIES = Object.freeze({
  negation: Object.freeze({
    not: 'negation', never: 'never', neither: 'neither', no: 'no', without: 'without',
  }),
  quantifier: Object.freeze({
    every: 'universal', all: 'universal', each: 'universal', any: 'free-choice',
    some: 'existential', none: 'none',
  }),
  modality: Object.freeze({
    may: 'possibility', might: 'possibility', can: 'possibility', could: 'possibility',
    must: 'necessity', should: 'advisability', would: 'hypothetical',
  }),
  conditional: Object.freeze({ if: 'antecedent', unless: 'unless', then: 'consequent' }),
  temporal: Object.freeze({
    before: 'before', earlier: 'before', after: 'after', later: 'after', first: 'first',
    last: 'last', finally: 'finally', next: 'next',
  }),
  conjunction: Object.freeze({ and: 'and', both: 'both' }),
  disjunction: Object.freeze({ or: 'or', either: 'either' }),
  'directed-relation': Object.freeze({
    left: 'left', right: 'right', north: 'north', south: 'south', above: 'above', below: 'below',
    inside: 'inside', in: 'inside', contains: 'contains',
  }),
});

const INTERROGATIVE_IDENTITIES = Object.freeze({
  who: 'who', what: 'what', where: 'where', when: 'when', why: 'why', how: 'how', which: 'which',
});
const COMPARISON_PATTERNS = Object.freeze([
  Object.freeze({ pattern: /\b(?:more|greater|larger|bigger)\s+than\b/giu, identity: 'magnitude-greater' }),
  Object.freeze({ pattern: /\b(?:less|smaller)\s+than\b/giu, identity: 'magnitude-less' }),
  Object.freeze({ pattern: /\bolder\s+than\b/giu, identity: 'age-greater' }),
  Object.freeze({ pattern: /\byounger\s+than\b/giu, identity: 'age-less' }),
  Object.freeze({ pattern: /\bhigher\s+than\b/giu, identity: 'height-greater' }),
  Object.freeze({ pattern: /\blower\s+than\b/giu, identity: 'height-less' }),
  Object.freeze({ pattern: /(?:<=|>=|<|>)/gu, identity: 'symbolic-order', language: 'neutral' }),
]);

export const ENGLISH_FUNCTION_WORDS = new Set(
  ('a an the am is are was were be been being do does did have has had who what where when why how which '
    + 'that of to for from by with as at please').split(' '),
);
const SENTENCE_FUNCTION_WORDS = new Set(
  'who what where when why how which is are can could does do did in on at the a an'.split(' '),
);

export function normalizedWords(text) {
  return text.normalize('NFKC').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}_-]+/gu) ?? [];
}

export function wordOccurrences(text) {
  return [...text.normalize('NFKC').matchAll(/[\p{L}\p{M}\p{N}_-]+/gu)].map((match) => Object.freeze({
    surface: match[0],
    normalized: match[0].toLocaleLowerCase('en-US'),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function anchor(kind, identity, surface, start, end, language = 'neutral') {
  return Object.freeze({ kind, identity, surface, start, end, language });
}

export function normalizationAnchorOverlaps(record, occurrence) {
  return occurrence.start < record.end && occurrence.end > record.start;
}

function comparisonAnchors(text) {
  return COMPARISON_PATTERNS.flatMap(({ pattern, identity, language = 'en' }) => {
    const matcher = new RegExp(pattern.source, pattern.flags);
    return [...text.matchAll(matcher)].map((match) => anchor(
      'comparison', identity, match[0], match.index, match.index + match[0].length, language,
    ));
  }).sort((left, right) => left.start - right.start || left.end - right.end);
}

function answerOptionAnchors(text) {
  const matcher = /(?:^|[\s([])([A-Ha-h]|[1-9])(?=[).:]\s)/gu;
  return [...text.matchAll(matcher)].map((match) => {
    const offset = match[0].lastIndexOf(match[1]);
    const start = match.index + offset;
    return anchor('answer-option', match[1].toLocaleLowerCase('en-US'), match[1], start,
      start + match[1].length);
  });
}

function protectedAnchorRecords(text) {
  const normalized = text.normalize('NFKC');
  const words = wordOccurrences(normalized);
  const records = [];
  for (const occurrence of words) {
    for (const [kind, identities] of Object.entries(OPERATOR_IDENTITIES)) {
      const identity = identities[occurrence.normalized];
      if (identity) records.push(anchor(
        kind, identity, occurrence.surface, occurrence.start, occurrence.end, 'en',
      ));
    }
  }
  records.push(...comparisonAnchors(normalized));
  for (const occurrence of words) {
    const identity = INTERROGATIVE_IDENTITIES[occurrence.normalized];
    if (identity) records.push(anchor(
      'interrogative', identity, occurrence.surface, occurrence.start, occurrence.end, 'en',
    ));
  }
  for (const match of normalized.matchAll(/\p{N}+(?:[.,]\p{N}+)*/gu)) {
    records.push(anchor('number', match[0], match[0], match.index, match.index + match[0].length));
  }
  records.push(...answerOptionAnchors(normalized));
  for (const match of normalized.matchAll(/["“]([^"”]{1,256})["”]/gu)) {
    const start = match.index + 1;
    records.push(anchor('quoted-material', match[1], match[1], start, start + match[1].length));
  }
  for (const match of normalized.matchAll(
    /(?<![\p{L}\p{M}])\p{Lu}[\p{L}\p{M}'’-]*(?![\p{L}\p{M}])/gu,
  )) {
    const lower = match[0].toLocaleLowerCase('en-US');
    const start = match.index;
    const end = match.index + match[0].length;
    const alreadyTyped = records.some((record) => record.start === start && record.end === end
      && (record.kind === 'interrogative' || Object.hasOwn(OPERATOR_IDENTITIES, record.kind)));
    if (!SENTENCE_FUNCTION_WORDS.has(lower) && !alreadyTyped) {
      records.push(anchor('named-entity', lower, match[0], start, end));
    }
  }
  return Object.freeze(records.sort((left, right) => left.start - right.start
    || left.end - right.end || left.kind.localeCompare(right.kind)));
}

export function classifyNormalizationOperation(text, suppliedAssessment) {
  const languageAssessment = suppliedAssessment ?? assessEnglishLikelihood(text);
  assertEnglishLikelihoodReceipt(languageAssessment);
  const operation = languageAssessment.classification === 'likely-non-english'
    ? 'translation' : 'simplification';
  return Object.freeze({
    operation,
    confidence: languageAssessment.classification === 'indeterminate' ? 'low' : 'high',
    evidence: Object.freeze({ languageAssessment }),
  });
}

export function extractProtectedAnchors(text) {
  const normalized = text.normalize('NFKC');
  const records = protectedAnchorRecords(normalized);
  const operators = Object.fromEntries([
    ...Object.keys(OPERATOR_IDENTITIES), 'comparison',
  ].map((kind) => [kind, Object.freeze(records.filter((record) => record.kind === kind)
    .map((record) => record.identity))]));
  return Object.freeze({
    numbers: Object.freeze(records.filter((record) => record.kind === 'number').map((record) => record.surface)),
    answerOptions: Object.freeze(records.filter((record) => record.kind === 'answer-option')
      .map((record) => record.surface)),
    quoted: Object.freeze(records.filter((record) => record.kind === 'quoted-material')
      .map((record) => record.surface)),
    names: Object.freeze(records.filter((record) => record.kind === 'named-entity').map((record) => record.surface)),
    interrogatives: Object.freeze(records.filter((record) => record.kind === 'interrogative')
      .map((record) => record.identity)),
    operators: Object.freeze(operators),
    records,
    question: /\?\s*$/u.test(normalized.trim()),
  });
}
