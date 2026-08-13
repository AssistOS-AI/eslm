function quoteValues(text) {
  return [...text.matchAll(/[“"]([^”"]+)[”"]/gu)].map((match) => match[1].trim());
}

function frame(operation, inputs, output = {}) {
  return Object.freeze({
    format: 'eslm-everyday-task-frame', operation,
    inputs: Object.freeze(inputs), output: Object.freeze({ mode: 'direct', ...output }),
  });
}

function sentiment(text) {
  if (!/^classify\s+the\s+tone\s+as\s+/iu.test(text)) return undefined;
  const quoted = quoteValues(text).at(-1);
  return quoted ? frame('sentiment-classification', {
    text: quoted, labels: Object.freeze(['positive', 'negative', 'neutral']),
  }, { kind: 'classification', maximumWords: 1 }) : undefined;
}

function intent(text) {
  const match = text.match(/^classify\s+the\s+request\s+as\s+(.+?)\.\s*[“"]([^”"]+)[”"]/iu);
  if (!match) return undefined;
  const labels = match[1].split(/,|\s+or\s+/iu).map((value) => value.trim()).filter(Boolean);
  return labels.length >= 2 ? frame('intent-classification', {
    text: match[2].trim(), labels: Object.freeze(labels),
  }, { kind: 'classification', maximumWords: 3 }) : undefined;
}

function extraction(text) {
  if (!/^from\s+the\s+text\s+/iu.test(text)) return undefined;
  const supplied = quoteValues(text)[0];
  if (!supplied) return undefined;
  const target = /extract\s+only\s+the\s+city/iu.test(text) ? 'city'
    : /extract\s+the\s+full\s+name\s+and\s+age/iu.test(text) ? 'person-and-age' : undefined;
  return target ? frame('supplied-text-extraction', { text: supplied, target }, {
    kind: target === 'city' ? 'entity' : 'record',
  }) : undefined;
}

function structuredExtraction(text) {
  if (!/^extract\s+only\s+explicit\s+information\s+and\s+return\s+a\s+table\s+with:/iu.test(text)) {
    return undefined;
  }
  const supplied = text.match(/\btext:\s*[“"]([\s\S]+?)[”"]\s*$/iu)?.[1];
  return supplied ? frame('structured-field-extraction', {
    text: supplied,
    fields: Object.freeze(['company', 'monthly_fee', 'currency', 'payment_term_days',
      'initial_duration_months']),
    missingValue: 'unknown', observations: 2,
  }, { kind: 'table-and-observations' }) : undefined;
}

function correction(text) {
  if (!/^correct\s+the\s+capitalization\s+and\s+punctuation\s*:/iu.test(text)) return undefined;
  const supplied = quoteValues(text).at(-1);
  return supplied ? frame('capitalization-and-punctuation', { text: supplied }, {
    kind: 'sentence', preserveMeaning: true,
  }) : undefined;
}

function politeRewrite(text) {
  if (!/^rephrase\s+more\s+politely\s+without\s+changing\s+the\s+meaning\s*:/iu.test(text)) {
    return undefined;
  }
  const supplied = quoteValues(text).at(-1);
  return supplied ? frame('polite-imperative-rewrite', { text: supplied }, {
    kind: 'sentence', tone: 'polite', preserveMeaning: true,
  }) : undefined;
}

function title(text) {
  const match = text.match(/^turn\s+the\s+sentence\s+into\s+a\s+title\s+of\s+no\s+more\s+than\s+(\w+)\s+words?/iu);
  if (!match) return undefined;
  const supplied = quoteValues(text).at(-1);
  const names = new Map([['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10]]);
  const maximumWords = Number(match[1]) || names.get(match[1].toLocaleLowerCase('en-US'));
  return supplied && maximumWords ? frame('bounded-title-generation', { text: supplied, maximumWords }, {
    kind: 'title', maximumWords,
  }) : undefined;
}

const FRAMERS = Object.freeze([
  sentiment, intent, structuredExtraction, extraction, correction, politeRewrite, title,
]);

export function frameEverydaySuppliedTextTask(text) {
  for (const framer of FRAMERS) {
    const candidate = framer(text);
    if (candidate) return candidate;
  }
  return undefined;
}

