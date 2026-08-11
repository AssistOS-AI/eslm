import { parseFactoidQuestion } from '../language/factoid-question.mjs';

function valueKey(value) {
  if (typeof value === 'string') {
    return `string:${value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/gu, ' ').trim()}`;
  }
  return `${typeof value}:${JSON.stringify(value)}`;
}

function answerSetKey(values) {
  return [...new Set(values.map(valueKey))].sort().join('\u0000');
}

function distinctValues(results) {
  const byKey = new Map();
  for (const result of results) {
    for (const value of result.values ?? []) {
      const key = valueKey(value);
      if (!byKey.has(key)) byKey.set(key, value);
    }
  }
  return [...byKey.values()];
}

function distinctProvenance(results) {
  const byKey = new Map();
  for (const result of results) {
    for (const item of result.provenance ?? []) {
      const key = JSON.stringify(item);
      if (!byKey.has(key)) byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

async function askProvider(provider, frame) {
  provider.beginQuery?.();
  try {
    for (const candidate of frame.candidates) {
      const result = await provider.ask(candidate.text);
      if (result) return Object.freeze({ provider, candidate, result });
    }
    return undefined;
  } finally {
    provider.endQuery?.();
  }
}

function mergedAgreement(matches, frame) {
  const results = matches.map((match) => match.result);
  const first = results[0];
  return {
    ...first,
    values: distinctValues(results),
    provenance: distinctProvenance(results),
    query: {
      ...first.query,
      factoidFrame: frame,
      routedProviders: matches.map((match) => match.provider.manifest.id).sort(),
    },
    reasoning: {
      ...first.reasoning,
      routing: 'provider-order-independent-semantic-agreement',
    },
  };
}

function mergedAmbiguity(matches, frame) {
  const results = matches.map((match) => match.result);
  const values = distinctValues(results);
  return {
    status: 'AMBIGUOUS',
    answer: 'Independent knowledge providers returned more than one semantic answer; the runtime will not choose by provider order.',
    values,
    ambiguity: true,
    alternatives: results.map((result, index) => ({
      provider: matches[index].provider.manifest.id,
      values: result.values ?? [],
    })),
    provenance: distinctProvenance(results),
    reasoning: { method: 'typed-provider-ambiguity', routing: 'exhaustive-provider-consultation' },
    query: {
      factoidFrame: frame,
      routedProviders: matches.map((match) => match.provider.manifest.id).sort(),
    },
    learned: [], learnedRules: [], context: {},
  };
}

/**
 * Ask every loaded provider that accepts one of the semantically equivalent
 * surfaces in a factoid frame. Provider order is never an answer-selection rule.
 */
export async function routeFactoidQuestion(providers, text) {
  const frame = parseFactoidQuestion(text);
  if (!frame || !Array.isArray(providers) || providers.length === 0) return { frame, result: undefined };
  const matches = (await Promise.all(providers.map((provider) => askProvider(provider, frame)))).filter(Boolean);
  if (matches.length === 0) return { frame, result: undefined };

  const answered = matches.filter((match) => (match.result.values?.length ?? 0) > 0);
  if (answered.length === 0) return { frame, result: mergedAgreement(matches, frame) };
  const ambiguous = answered.some((match) => match.result.status === 'AMBIGUOUS' || match.result.ambiguity);
  const answerSets = new Set(answered.map((match) => answerSetKey(match.result.values ?? [])));
  return {
    frame,
    result: ambiguous || answerSets.size > 1
      ? mergedAmbiguity(answered, frame)
      : mergedAgreement(answered, frame),
  };
}

