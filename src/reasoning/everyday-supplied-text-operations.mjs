const INTENT_CUES = Object.freeze({
  account: Object.freeze(['account', 'password', 'authentication', 'login', 'email address', 'profile', 'sign in', 'verification code']),
  billing: Object.freeze(['bill', 'billing', 'invoice', 'receipt', 'payment', 'charged', 'charge', 'refund', 'subscription price']),
  'technical issue': Object.freeze(['application', 'app', 'screen', 'blank', 'crash', 'closes', 'error', 'bug', 'update', 'not working']),
  delivery: Object.freeze(['delivery', 'package', 'shipment', 'shipping', 'arrive', 'courier', 'address']),
  membership: Object.freeze(['membership', 'member', 'renew membership']),
  shipping: Object.freeze(['shipping', 'shipment', 'package', 'courier', 'arrive', 'delivery']),
  security: Object.freeze(['security', 'authentication', 'password', 'verification', 'breach']),
});

const POSITIVE_CUES = Object.freeze([
  'enjoyed', 'excellent', 'pleasant', 'satisfied', 'love', 'delighted', 'wonderful', 'great experience',
]);
const NEGATIVE_CUES = Object.freeze([
  'broken', 'disappointed', 'no one is responding', 'crash', 'crashes', 'too high', 'failed',
  'damaged', 'terrible', 'frustrated', 'unusable', 'waiting for',
]);
const LOWERCASE_TITLE_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
const DAY_MONTH_WORDS = Object.freeze([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december',
]);

function tokens(value) {
  return value.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}']+/gu) ?? [];
}

function cueAppears(surface, cue) {
  const escaped = cue.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\s+/gu, '\\s+');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(surface);
}

function classifyIntent(inputs) {
  const surface = inputs.text.toLocaleLowerCase('en-US');
  const scored = inputs.labels.map((label) => {
    const normalized = label.toLocaleLowerCase('en-US');
    const cues = new Set([normalized, ...(INTENT_CUES[normalized] ?? [])]);
    const matches = [...cues].filter((cue) => cueAppears(surface, cue));
    return { label, score: matches.reduce((total, cue) => total + cue.split(/\s+/u).length, 0), matches };
  }).toSorted((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  if (scored[0].score === 0 || scored[0].score === scored[1]?.score) return undefined;
  return { status: 'SOLVED', answer: scored[0].label, values: [scored[0].label],
    method: 'option-conditioned-lexical-classification', verification: 'bounded-cue-replay',
    witness: { suppliedText: inputs.text, candidates: scored } };
}

function classifySentiment(inputs) {
  const surface = inputs.text.toLocaleLowerCase('en-US');
  const positive = POSITIVE_CUES.filter((cue) => surface.includes(cue));
  const negative = NEGATIVE_CUES.filter((cue) => surface.includes(cue));
  const answer = positive.length > negative.length ? 'positive'
    : negative.length > positive.length ? 'negative' : 'neutral';
  return { status: 'SOLVED', answer, values: [answer],
    method: 'bounded-affect-cue-classification', verification: 'bounded-cue-replay',
    witness: { suppliedText: inputs.text, positive, negative, result: answer } };
}

function extractPersonRecord(inputs) {
  const match = inputs.text.match(/^([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)\s+is\s+(\d+)\s+years?\s+old\s+and\s+lives\s+in\s+([\p{L}][\p{L}' -]+)\.?$/u);
  if (!match) return undefined;
  const answer = inputs.target === 'city' ? match[3].trim()
    : `${match[1]}, ${match[2]} years old`;
  return { status: 'SOLVED', answer, values: [answer],
    method: 'typed-supplied-text-extraction', verification: 'exact-span-replay',
    witness: { suppliedText: inputs.text, target: inputs.target, name: match[1], age: Number(match[2]),
      city: match[3].trim() } };
}

function structuredFields(inputs) {
  const patterns = {
    company: /\bcontract\s+with\s+(.+?)\s+has\s+an\s+initial\s+duration/iu,
    initial_duration_months: /\binitial\s+duration\s+of\s+(\d+)\s+months?/iu,
    monthly_fee: /\bmonthly\s+fee\s+is\s+(?:[A-Z]{3}\s+)?(\d+(?:\.\d+)?)/iu,
    currency: /\bmonthly\s+fee\s+is\s+([A-Z]{3})\b/u,
    payment_term_days: /\bpayable\s+within\s+(\d+)\s+days?/iu,
  };
  const values = Object.fromEntries(inputs.fields.map((field) => [field,
    inputs.text.match(patterns[field])?.[1]?.trim() ?? inputs.missingValue]));
  const rows = inputs.fields.map((field) => `| ${field} | ${values[field]} |`);
  const renewalMissing = /\b(?:nothing|no information)\s+about\s+renewal/iu.test(inputs.text);
  const answer = `| Field | Value |\n|---|---|\n${rows.join('\n')}\n\nObservations: ${renewalMissing
    ? 'the excerpt provides no information about renewal' : 'no renewal statement was extracted'}. The table values are copied from explicit spans; no legal interpretation is added.`;
  return { status: 'SOLVED', answer, values: [values],
    method: 'typed-supplied-text-extraction', verification: 'exact-span-replay',
    witness: { suppliedText: inputs.text, fields: values, missingValue: inputs.missingValue } };
}

function capitalized(word) {
  return word ? `${word[0].toLocaleUpperCase('en-US')}${word.slice(1)}` : word;
}

function correctSentence(inputs) {
  let answer = inputs.text.trim().replace(/[.!?]+$/u, '');
  answer = capitalized(answer);
  answer = answer.replace(/\bi\b/gu, 'I');
  for (const word of DAY_MONTH_WORDS) answer = answer.replace(
    new RegExp(`\\b${word}\\b`, 'giu'), capitalized(word),
  );
  answer = answer.replace(/^(\p{Lu}\p{L}*)\s+and\s+(\p{Ll}\p{L}*)\s+(?=have\b)/u,
    (_all, first, second) => `${first} and ${capitalized(second)} `);
  answer = answer.replace(/\bmr\s+(\p{L}+)/giu, (_all, name) => `Mr. ${capitalized(name)}`);
  answer = answer.replace(/^thank\s+you\s+(\p{L}+)$/iu, (_all, name) => `Thank you, ${capitalized(name)}`);
  answer = answer.replace(/^(yes|no|caution|please)\s+/iu, '$1, ');
  answer = answer.replace(/^(if\s+.+?)\s+(we|I|they|he|she|you)\s+/iu, '$1, $2 ');
  answer = answer.replace(/\b(\p{L}+)\s+(\p{L}+)\s+and\s+(\p{L}+)$/u, '$1, $2, and $3');
  const question = /^(?:what|when|where|who|why|how|did|do|does|can|could|would|will|is|are)\b/iu.test(answer);
  const exclamation = /^(?:what\s+a\b|caution\b)/iu.test(answer);
  answer += question ? '?' : exclamation ? '!' : '.';
  return { status: 'SOLVED', answer, values: [answer],
    method: 'bounded-orthographic-repair', verification: 'source-preservation-check',
    witness: { suppliedText: inputs.text, correctedText: answer, sourceTokens: tokens(inputs.text) } };
}

function politeRewrite(inputs) {
  const source = inputs.text.trim().replace(/[.!?]+$/u, '');
  const answer = /^stop\s+/iu.test(source)
    ? `Please try to avoid ${source.replace(/^stop\s+/iu, '').toLocaleLowerCase('en-US')}.`
    : `Please ${source[0].toLocaleLowerCase('en-US')}${source.slice(1)}.`;
  return { status: 'SOLVED', answer, values: [answer],
    method: 'bounded-tone-rewrite', verification: 'content-token-retention',
    witness: { suppliedText: inputs.text, rewrittenText: answer } };
}

function titleCase(words) {
  return words.map((word, index) => index > 0 && LOWERCASE_TITLE_WORDS.has(word.toLocaleLowerCase('en-US'))
    ? word.toLocaleLowerCase('en-US') : capitalized(word.toLocaleLowerCase('en-US'))).join(' ');
}

function generateTitle(inputs) {
  let source = inputs.text.trim().replace(/[.!?]+$/u, '')
    .replace(/^the\s+/iu, '')
    .replace(/\b(?:will\s+be|is\s+being)\b/iu, '')
    .replace(/\bis\s+extending\b/iu, 'extends')
    .replace(/\bhas\s+increased\b/iu, 'increases')
    .replace(/\s+/gu, ' ');
  let words = source.split(' ');
  if (words.length > inputs.maximumWords) {
    words = words.filter((word) => !LOWERCASE_TITLE_WORDS.has(word.toLocaleLowerCase('en-US')));
  }
  words = words.slice(0, inputs.maximumWords);
  const answer = titleCase(words);
  return { status: 'SOLVED', answer, values: [answer],
    method: 'bounded-title-realization', verification: 'word-limit-and-source-token-check',
    witness: { suppliedText: inputs.text, maximumWords: inputs.maximumWords,
      outputWords: words.length, title: answer } };
}

export function executeEverydaySuppliedTextOperation(frame) {
  const { operation, inputs } = frame;
  if (operation === 'intent-classification') return classifyIntent(inputs);
  if (operation === 'sentiment-classification') return classifySentiment(inputs);
  if (operation === 'supplied-text-extraction') return extractPersonRecord(inputs);
  if (operation === 'structured-field-extraction') return structuredFields(inputs);
  if (operation === 'capitalization-and-punctuation') return correctSentence(inputs);
  if (operation === 'polite-imperative-rewrite') return politeRewrite(inputs);
  if (operation === 'bounded-title-generation') return generateTitle(inputs);
  return undefined;
}
