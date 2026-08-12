const OPERATOR_IDENTITIES = Object.freeze({
  negation: Object.freeze({
    not: 'negation', never: 'never', neither: 'neither', no: 'no', without: 'without',
    nu: 'negation', niciodată: 'never', nici: 'neither', fără: 'without',
  }),
  quantifier: Object.freeze({
    every: 'universal', all: 'universal', each: 'universal', any: 'free-choice',
    some: 'existential', none: 'none', fiecare: 'universal', 'toți': 'universal',
    toate: 'universal', orice: 'free-choice', unii: 'existential', unele: 'existential',
    niciun: 'none', nicio: 'none',
  }),
  modality: Object.freeze({
    may: 'possibility', might: 'possibility', can: 'possibility', could: 'possibility',
    must: 'necessity', should: 'advisability', would: 'hypothetical', poate: 'possibility',
    pot: 'possibility', possible: 'possibility', posibil: 'possibility', trebuie: 'necessity',
  }),
  conditional: Object.freeze({
    if: 'antecedent', unless: 'unless', then: 'consequent', 'dacă': 'antecedent', atunci: 'consequent',
  }),
  temporal: Object.freeze({
    before: 'before', earlier: 'before', after: 'after', later: 'after', first: 'first',
    last: 'last', finally: 'finally', next: 'next', 'înainte': 'before', anterior: 'before',
    'după': 'after', ulterior: 'after', apoi: 'next',
  }),
  conjunction: Object.freeze({
    and: 'and', both: 'both', 'și': 'and', iar: 'and', ambele: 'both', ambii: 'both',
  }),
  disjunction: Object.freeze({ or: 'or', either: 'either', sau: 'or', ori: 'or', fie: 'either' }),
  'directed-relation': Object.freeze({
    left: 'left', right: 'right', north: 'north', south: 'south', above: 'above', below: 'below',
    inside: 'inside', in: 'inside', contains: 'contains', 'stânga': 'left', dreapta: 'right',
    nord: 'north', sud: 'south', deasupra: 'above', dedesubt: 'below', 'înăuntru': 'inside',
    'în': 'inside', 'conține': 'contains',
  }),
});

const INTERROGATIVE_IDENTITIES = Object.freeze({
  who: 'who', what: 'what', where: 'where', when: 'when', why: 'why', how: 'how', which: 'which',
  cine: 'who', ce: 'what', unde: 'where', 'când': 'when', cum: 'how', care: 'which',
});
const ROMANIAN_OPERATOR_WORDS = new Set([
  'nu', 'niciodată', 'nici', 'fără', 'fiecare', 'toți', 'toate', 'orice', 'unii', 'unele',
  'niciun', 'nicio', 'poate', 'pot', 'posibil', 'trebuie', 'dacă', 'atunci', 'înainte',
  'anterior', 'după', 'ulterior', 'apoi', 'și', 'iar', 'ambele', 'ambii', 'sau', 'ori', 'fie',
  'stânga', 'dreapta', 'nord', 'sud', 'deasupra', 'dedesubt', 'înăuntru', 'în', 'conține',
]);
const ROMANIAN_INTERROGATIVE_WORDS = new Set('cine ce unde când cum care'.split(' '));
const COMPARISON_PATTERNS = Object.freeze([
  Object.freeze({
    pattern: /\b(?:more|greater|larger|bigger)\s+than\b/giu,
    identity: 'magnitude-greater', language: 'en',
  }),
  Object.freeze({
    pattern: /\b(?:less|smaller)\s+than\b/giu,
    identity: 'magnitude-less', language: 'en',
  }),
  Object.freeze({ pattern: /\bolder\s+than\b/giu, identity: 'age-greater', language: 'en' }),
  Object.freeze({ pattern: /\byounger\s+than\b/giu, identity: 'age-less', language: 'en' }),
  Object.freeze({ pattern: /\bhigher\s+than\b/giu, identity: 'height-greater', language: 'en' }),
  Object.freeze({ pattern: /\blower\s+than\b/giu, identity: 'height-less', language: 'en' }),
  Object.freeze({
    pattern: /\bmai\s+(?:mult|mare)\s+decât\b/giu,
    identity: 'magnitude-greater', language: 'ro',
  }),
  Object.freeze({
    pattern: /\bmai\s+(?:puțin|mic)\s+decât\b/giu,
    identity: 'magnitude-less', language: 'ro',
  }),
  Object.freeze({ pattern: /(?:<=|>=|<|>)/gu, identity: 'symbolic-order', language: 'neutral' }),
]);

export const ROMANIAN_ENGLISH_LEXICAL_EQUIVALENCES = new Map([
  ['unde', new Set(['where'])],
  ['este', new Set(['is'])],
  ['e', new Set(['is'])],
  ['sunt', new Set(['are'])],
  ['camera', new Set(['room'])],
  ['ce', new Set(['what'])],
  ['faci', new Set(['do', 'doing'])],
  ['ce mai faci', new Set(['how are you'])],
  ['ce mai face', new Set(['how is he', 'how is she'])],
  ['ce mai fac', new Set(['how are they'])],
  ['înoată', new Set(['swim', 'swims'])],
]);
export const ENGLISH_FUNCTION_WORDS = new Set(
  ('a an the am is are was were be been being do does did have has had who what where when why how which '
    + 'that of to for from by with as at please')
    .split(' '),
);
export const ROMANIAN_FUNCTION_WORDS = new Set(
  'ce cine unde când cum care este e sunt mai oare de la cu pentru un o unei unui ale al ai a'.split(' '),
);
const ROMANIAN_LANGUAGE_CUES = new Set(
  'ce cine unde când cum care este sunt faci face fac mai oare de la cu pentru dacă atunci și sau nu nici poate trebuie'
    .split(' '),
);
const ENGLISH_LANGUAGE_CUES = new Set(
  'who what where when why how which is are do does did can could would should the a an in at of and or not please'
    .split(' '),
);
const SENTENCE_FUNCTION_WORDS = new Set(
  ('who what where when why how which is are can could does do did in on at the a an cine ce unde când de '
    + 'cum care este sunt poate pot dacă oare')
    .split(' '),
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
  return COMPARISON_PATTERNS.flatMap(({ pattern, identity, language }) => {
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
    return anchor('answer-option', match[1].toLocaleLowerCase('en-US'), match[1], start, start + match[1].length);
  });
}

function protectedAnchorRecords(text) {
  const normalized = text.normalize('NFKC');
  const words = wordOccurrences(normalized);
  const records = [];
  for (const occurrence of words) {
    for (const [kind, identities] of Object.entries(OPERATOR_IDENTITIES)) {
      const identity = identities[occurrence.normalized];
      if (identity) {
        records.push(anchor(
          kind, identity, occurrence.surface, occurrence.start, occurrence.end,
          ROMANIAN_OPERATOR_WORDS.has(occurrence.normalized) ? 'ro' : 'en',
        ));
      }
    }
  }
  records.push(...comparisonAnchors(normalized));
  const wellbeingMatches = [...normalized.matchAll(/\bCe\s+mai\s+(?:faci|face|fac)\b/giu)];
  const wellbeingCeStarts = new Set(wellbeingMatches.map((match) => match.index));
  for (const occurrence of words) {
    const identity = INTERROGATIVE_IDENTITIES[occurrence.normalized];
    if (!identity) continue;
    const contextualIdentity = occurrence.normalized === 'ce' && wellbeingCeStarts.has(occurrence.start)
      ? 'how'
      : identity;
    records.push(anchor(
      'interrogative', contextualIdentity, occurrence.surface, occurrence.start, occurrence.end,
      ROMANIAN_INTERROGATIVE_WORDS.has(occurrence.normalized) ? 'ro' : 'en',
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
  for (const match of normalized.matchAll(/\b\p{Lu}[\p{L}\p{M}'’-]*\b/gu)) {
    const lower = match[0].toLocaleLowerCase('en-US');
    const start = match.index;
    const end = match.index + match[0].length;
    const alreadyTyped = records.some((record) => record.start === start
      && record.end === end
      && (record.kind === 'interrogative' || Object.hasOwn(OPERATOR_IDENTITIES, record.kind)));
    if (!SENTENCE_FUNCTION_WORDS.has(lower) && !alreadyTyped) {
      records.push(anchor('named-entity', lower, match[0], match.index, match.index + match[0].length));
    }
  }
  return Object.freeze(records.sort((left, right) => left.start - right.start
    || left.end - right.end
    || left.kind.localeCompare(right.kind)));
}

export function classifyNormalizationOperation(text) {
  const words = normalizedWords(text);
  const romanianScore = words.filter((word) => ROMANIAN_LANGUAGE_CUES.has(word)).length;
  const englishScore = words.filter((word) => ENGLISH_LANGUAGE_CUES.has(word)).length;
  const hasRomanianCharacters = /[ăâîșț]/iu.test(text);
  const operation = hasRomanianCharacters || romanianScore >= 2 && romanianScore > englishScore
    ? 'translation'
    : 'simplification';
  return Object.freeze({
    operation,
    confidence: hasRomanianCharacters || Math.abs(romanianScore - englishScore) >= 2 ? 'high' : 'low',
    evidence: Object.freeze({ romanianCueCount: romanianScore, englishCueCount: englishScore }),
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
