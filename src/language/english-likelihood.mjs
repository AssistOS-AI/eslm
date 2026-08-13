export const ENGLISH_LIKELIHOOD_PROTOCOL = 'eslm-english-likelihood-v1';

const DEFAULT_THRESHOLD = 0.68;
const EVIDENCE_MASS_FOR_FULL_SUPPORT = 0.5;
const MAXIMUM_INPUT_BYTES = 64 * 1024;
const MAXIMUM_TOKENS = 1_024;
const CLASSIFICATIONS = new Set([
  'likely-english', 'likely-non-english', 'indeterminate',
]);
const SIGNAL_KINDS = new Set([
  'ascii-letter', 'english-function-word', 'english-operator', 'english-morphology',
  'english-sentence-frame', 'latin-diacritic', 'non-latin-script', 'technical-token',
  'formula-token', 'nonce-compatible-token',
]);
const ENGLISH_DIRECTIONAL_KINDS = new Set([
  'english-function-word', 'english-operator', 'english-sentence-frame',
]);
const ENGLISH_SUPPORT_KINDS = new Set(['english-morphology']);

const ENGLISH_FUNCTION_WORDS = new Set(
  ('a an the this that these those am is are was were be been being do does did have has had '
    + 'who what where when why how which of to for from by with as at in on into about than '
    + 'please every all each any some none no and or if then before after because while not '
    + 'can could may might must should would will').split(' '),
);
const ENGLISH_OPERATORS = new Set(
  'all every each any some none no not and or if then before after because while can may must'.split(' '),
);
const TECHNICAL_SURFACE = /^(?:[A-Za-z_$][A-Za-z0-9_$]*(?:::[A-Za-z0-9_$]+|[./_-][A-Za-z0-9_$]+)+|--?[A-Za-z][A-Za-z0-9-]*|[A-Z]{2,}[0-9]*|[a-z]+[A-Z][A-Za-z0-9]*)$/u;
const FORMULA_SURFACE = /^(?:[A-Za-z][A-Za-z0-9_]*\([^()]{0,128}\)|[A-Za-z0-9_]+(?:<=|>=|!=|=|<|>)[A-Za-z0-9_]+|[+*/^=<>()[\]{}|&!?:;.,-]+)$/u;
const LATIN_DIACRITIC_LETTER = /\p{Script=Latin}/u;
const COMBINING_MARK = /\p{M}/u;
const LETTER = /\p{L}/u;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function evidenceScores(signals, complete) {
  const positive = signals.filter((item) => ENGLISH_DIRECTIONAL_KINDS.has(item.kind))
    .reduce((sum, item) => sum + item.contribution, 0);
  const negative = -signals.filter((item) => item.contribution < 0)
    .reduce((sum, item) => sum + item.contribution, 0);
  const support = positive > 0 ? signals.filter((item) => ENGLISH_SUPPORT_KINDS.has(item.kind))
    .reduce((sum, item) => sum + Math.max(0, item.contribution), 0) : 0;
  const directionalEvidence = positive + negative;
  const evidenceMass = clamp(
    (directionalEvidence + support) / EVIDENCE_MASS_FOR_FULL_SUPPORT, 0, 1,
  );
  if (!complete || directionalEvidence === 0) {
    return Object.freeze({ english: 0, nonEnglish: 0 });
  }
  return Object.freeze({
    english: Number(((positive / directionalEvidence) * evidenceMass).toFixed(6)),
    nonEnglish: Number(((negative / directionalEvidence) * evidenceMass).toFixed(6)),
  });
}

function classificationForScores(scores, threshold) {
  if (scores.english >= threshold && scores.english > scores.nonEnglish) {
    return 'likely-english';
  }
  if (scores.nonEnglish >= threshold && scores.nonEnglish > scores.english) {
    return 'likely-non-english';
  }
  return 'indeterminate';
}

function signal(kind, count, weight, explanation) {
  return Object.freeze({
    kind, count, weight, contribution: Number((count * weight).toFixed(6)), explanation,
  });
}

function utf8Width(codePoint) {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function boundedUtf8Prefix(text) {
  let observedBytes = 0;
  let end = 0;
  for (const character of text) {
    const width = utf8Width(character.codePointAt(0));
    if (observedBytes + width > MAXIMUM_INPUT_BYTES) {
      return Object.freeze({
        text: text.slice(0, end), inputBytes: MAXIMUM_INPUT_BYTES + 1, complete: false,
      });
    }
    observedBytes += width;
    end += character.length;
  }
  return Object.freeze({ text, inputBytes: observedBytes, complete: true });
}

function boundedTokens(text) {
  const inspected = [];
  const matcher = /[\p{L}\p{M}\p{N}_$./:+*^=<>()[\]{}|&!?'-]+/gu;
  for (const match of text.normalize('NFKC').matchAll(matcher)) {
    if (inspected.length === MAXIMUM_TOKENS) {
      return Object.freeze({ inspected: Object.freeze(inspected), complete: false });
    }
    inspected.push(match[0]);
  }
  return Object.freeze({ inspected: Object.freeze(inspected), complete: true });
}

function scriptEvidence(text) {
  let asciiLetters = 0;
  let latinDiacritics = 0;
  let nonLatinLetters = 0;
  for (const character of text.normalize('NFKD')) {
    if (/[A-Za-z]/u.test(character)) asciiLetters += 1;
    else if (COMBINING_MARK.test(character)) latinDiacritics += 1;
    else if (LETTER.test(character)) {
      if (LATIN_DIACRITIC_LETTER.test(character)) latinDiacritics += 1;
      else nonLatinLetters += 1;
    }
  }
  return { asciiLetters, latinDiacritics, nonLatinLetters };
}

function sentenceFrameCount(text) {
  const normalized = text.normalize('NFKC').toLocaleLowerCase('en-US');
  const patterns = [
    /(?:^|[.!?]\s+)(?:is|are|was|were|do|does|did|can|could|may|might|must|should|would|will|who|what|where|when|why|how|which)\b/gu,
    /\b(?:is|are|was|were)\s+(?:a|an|the)\s+[\p{L}\p{N}_-]+/gu,
    /\b(?:every|all|each|some|no)\s+[\p{L}\p{N}_-]+\s+[\p{L}\p{N}_-]+/gu,
    /\b(?:does|do|did|can|could|may|might|must|should|would|will)\s+[\p{L}\p{N}_-]+\s+[\p{L}\p{N}_-]+/gu,
  ];
  return patterns.reduce((sum, pattern) => sum + [...normalized.matchAll(pattern)].length, 0);
}

function morphologyCount(words) {
  return words.filter((word) => /^[a-z]{4,}(?:ing|ed|ly|tion|ment|ness|able|ive|ous)$/u.test(word)).length;
}

export function assertEnglishLikelihoodReceipt(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('English likelihood receipt must be an object.');
  }
  const expected = [
    'protocol', 'classification', 'confidence', 'threshold', 'signals', 'tokensInspected',
    'complete', 'work', 'diagnostic',
  ].toSorted();
  if (JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify(expected)) {
    throw new TypeError('English likelihood receipt has unsupported or missing fields.');
  }
  if (value.protocol !== ENGLISH_LIKELIHOOD_PROTOCOL || !CLASSIFICATIONS.has(value.classification)) {
    throw new TypeError('English likelihood receipt identity or classification is invalid.');
  }
  for (const field of ['confidence', 'threshold']) {
    if (!Number.isFinite(value[field]) || value[field] < 0 || value[field] > 1) {
      throw new TypeError(`English likelihood ${field} must be a finite rate.`);
    }
  }
  if (!Array.isArray(value.signals) || value.signals.length !== SIGNAL_KINDS.size) {
    throw new TypeError('English likelihood signals must be a bounded array.');
  }
  const observed = new Set();
  for (const item of value.signals) {
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || JSON.stringify(Object.keys(item).toSorted())
          !== JSON.stringify(['kind', 'count', 'weight', 'contribution', 'explanation'].toSorted())
        || !SIGNAL_KINDS.has(item.kind) || observed.has(item.kind)
        || !Number.isSafeInteger(item.count) || item.count < 0 || item.count > MAXIMUM_TOKENS
        || !Number.isFinite(item.weight) || item.weight < -1 || item.weight > 1
        || !Number.isFinite(item.contribution)
        || item.contribution !== Number((item.count * item.weight).toFixed(6))
        || typeof item.explanation !== 'string' || item.explanation.length < 1
        || item.explanation.length > 240) {
      throw new TypeError('English likelihood signal is invalid or duplicated.');
    }
    observed.add(item.kind);
  }
  if (!Number.isSafeInteger(value.tokensInspected) || value.tokensInspected < 0
      || value.tokensInspected > MAXIMUM_TOKENS || typeof value.complete !== 'boolean') {
    throw new TypeError('English likelihood token work is invalid.');
  }
  const scores = evidenceScores(value.signals, value.complete);
  const expectedClassification = classificationForScores(scores, value.threshold);
  const expectedConfidence = Math.max(scores.english, scores.nonEnglish);
  if (value.classification !== expectedClassification
      || value.confidence !== expectedConfidence) {
    throw new TypeError('English likelihood classification or confidence contradicts its signals.');
  }
  if (!value.work || typeof value.work !== 'object' || Array.isArray(value.work)
      || JSON.stringify(Object.keys(value.work).toSorted())
        !== JSON.stringify(['inputBytes', 'maximumInputBytes', 'maximumTokens'].toSorted())
      || !Number.isSafeInteger(value.work.inputBytes) || value.work.inputBytes < 0
      || value.work.inputBytes > MAXIMUM_INPUT_BYTES + 1
      || value.work.maximumInputBytes !== MAXIMUM_INPUT_BYTES
      || value.work.maximumTokens !== MAXIMUM_TOKENS
      || typeof value.diagnostic !== 'string' || value.diagnostic.length < 1
      || value.diagnostic.length > 512) {
    throw new TypeError('English likelihood work or diagnostic is invalid.');
  }
  return value;
}

export function assessEnglishLikelihood(text, options = {}) {
  if (typeof text !== 'string') throw new TypeError('English likelihood input must be text.');
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).some((key) => key !== 'threshold')) {
    throw new TypeError('English likelihood options may contain only threshold.');
  }
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 0.95) {
    throw new RangeError('English likelihood threshold must be from 0.5 through 0.95.');
  }
  const boundedInput = boundedUtf8Prefix(text);
  const tokenWork = boundedTokens(boundedInput.text);
  const inspected = tokenWork.inspected;
  const complete = boundedInput.complete && tokenWork.complete;
  const words = inspected.map((token) => token.toLocaleLowerCase('en-US'));
  const scripts = scriptEvidence(boundedInput.text);
  const functionCount = words.filter((word) => ENGLISH_FUNCTION_WORDS.has(word)).length;
  const operatorCount = words.filter((word) => ENGLISH_OPERATORS.has(word)).length;
  const morphology = morphologyCount(words);
  const frames = sentenceFrameCount(boundedInput.text);
  const technical = inspected.filter((token) => TECHNICAL_SURFACE.test(token)).length;
  const formulas = inspected.filter((token) => FORMULA_SURFACE.test(token)).length;
  const nonce = words.filter((word) => /^[a-z][a-z0-9_-]{2,}$/u.test(word)
    && !ENGLISH_FUNCTION_WORDS.has(word)).length;
  const signals = Object.freeze([
    signal('ascii-letter', Math.min(64, scripts.asciiLetters), 0.006,
      'Basic Latin letters are compatibility evidence only and never authorize English.'),
    signal('english-function-word', functionCount, 0.28,
      'Reviewed English grammatical words provide positive language evidence.'),
    signal('english-operator', operatorCount, 0.18,
      'Reviewed English logical operators provide positive language evidence.'),
    signal('english-morphology', morphology, 0.12,
      'Common suffix shapes add support only after a reviewed English cue is present.'),
    signal('english-sentence-frame', Math.min(MAXIMUM_TOKENS, frames), 0.34,
      'Reviewed English clause frames provide strong positive evidence.'),
    signal('latin-diacritic', Math.min(16, scripts.latinDiacritics), -0.4,
      'Latin diacritics provide generic non-English evidence but never identify a language.'),
    signal('non-latin-script', Math.min(32, scripts.nonLatinLetters), -0.2,
      'Letters outside Latin script provide strong non-English evidence.'),
    signal('technical-token', technical, 0,
      'Technical identifiers are neutral and cannot decide language.'),
    signal('formula-token', formulas, 0,
      'Formula-shaped tokens are neutral and cannot decide language.'),
    signal('nonce-compatible-token', nonce, 0,
      'Unknown Latin tokens remain compatible with nonce controlled language.'),
  ]);
  const scores = evidenceScores(signals, complete);
  const classification = classificationForScores(scores, threshold);
  const confidence = Math.max(scores.english, scores.nonEnglish);
  const diagnostic = classification === 'likely-english'
    ? 'Bounded generic surface evidence is consistent with English.'
    : classification === 'likely-non-english'
      ? 'Bounded generic script and category evidence is unlikely to be English.'
      : complete
        ? 'Surface evidence is insufficient to classify the input; local processing may continue.'
        : 'The bounded assessment is incomplete; local resource validation remains authoritative.';
  const receipt = {
    protocol: ENGLISH_LIKELIHOOD_PROTOCOL,
    classification,
    confidence,
    threshold,
    signals,
    tokensInspected: inspected.length,
    complete,
    work: Object.freeze({
      inputBytes: boundedInput.inputBytes,
      maximumInputBytes: MAXIMUM_INPUT_BYTES,
      maximumTokens: MAXIMUM_TOKENS,
    }),
    diagnostic,
  };
  assertEnglishLikelihoodReceipt(receipt);
  return Object.freeze(receipt);
}
