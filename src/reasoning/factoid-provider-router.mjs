import { parseFactoidQuestion } from '../language/factoid-question.mjs';
import { runOptionalProviderQuery } from '../runtime/provider-query-lifecycle.mjs';

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
  let firstFailure;
  for (const candidate of frame.candidates) {
    const result = await provider.ask(candidate.text);
    if (!result) continue;
    const match = Object.freeze({ provider, candidate, result });
    if ((result.values?.length ?? 0) > 0 || result.status === 'AMBIGUOUS' || result.ambiguity) return match;
    firstFailure ??= match;
  }
  return firstFailure;
}

async function askProviderDirectly(provider, text) {
  const result = await provider.ask(text);
  return result ? Object.freeze({ provider, candidate: { text }, result }) : undefined;
}

function normalizedStatus(status) {
  if (status === 'ANSWERED' || status === 'LEARNED') return 'SOLVED';
  if (status === 'INDUCTIVE' || status === 'ABDUCTIVE') return 'DEFEASIBLE';
  return status ?? 'UNKNOWN';
}

function agreementStatus(results) {
  const statuses = results.map((result) => normalizedStatus(result.status));
  if (statuses.includes('PARTIAL')) return 'PARTIAL';
  if (statuses.includes('DEFEASIBLE')) return 'DEFEASIBLE';
  if (statuses.every((status) => status === 'SOLVED')) return 'SOLVED';
  return statuses.length === 1 ? statuses[0] : 'PARTIAL';
}

function mergedAgreement(matches, frame) {
  const results = matches.map((match) => match.result);
  const status = agreementStatus(results);
  const first = results.find((result) => normalizedStatus(result.status) === status) ?? results[0];
  return {
    ...first,
    status,
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
      providerStatuses: matches.map((match) => ({
        provider: match.provider.manifest.id,
        status: normalizedStatus(match.result.status),
      })),
    },
  };
}

function mergedAmbiguity(matches, frame) {
  const results = matches.map((match) => match.result);
  const values = distinctValues(results);
  return {
    status: 'AMBIGUOUS',
    answer: 'Independent knowledge providers returned more than one semantic answer; '
      + 'the runtime will not choose by provider order.',
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

function mergedFailureOutcomes(matches, frame) {
  const statuses = new Set(matches.map((match) => normalizedStatus(match.result.status)));
  if (statuses.size === 1) return mergedAgreement(matches, frame);
  return {
    status: 'AMBIGUOUS',
    answer: 'Independent knowledge providers returned incompatible failure outcomes; '
      + 'the runtime will not select one by provider identity.',
    values: [],
    ambiguity: true,
    alternatives: matches.map((match) => ({
      provider: match.provider.manifest.id,
      status: normalizedStatus(match.result.status),
      values: [],
    })),
    provenance: [],
    reasoning: { method: 'typed-provider-outcome-ambiguity', routing: 'exhaustive-provider-consultation' },
    query: {
      factoidFrame: frame,
      routedProviders: matches.map((match) => match.provider.manifest.id).sort(),
    },
    learned: [], learnedRules: [], context: {},
  };
}

function providerOutcome(matches, frame) {
  if (matches.length === 0) return undefined;
  const ordered = matches.toSorted((left, right) =>
    left.provider.manifest.id.localeCompare(right.provider.manifest.id));
  const answered = ordered.filter((match) => (match.result.values?.length ?? 0) > 0);
  if (answered.length === 0) return mergedFailureOutcomes(ordered, frame);
  const ambiguous = answered.some((match) => match.result.status === 'AMBIGUOUS' || match.result.ambiguity);
  const answerSets = new Set(answered.map((match) => answerSetKey(match.result.values ?? [])));
  return ambiguous || answerSets.size > 1
    ? mergedAmbiguity(answered, frame)
    : mergedAgreement(answered, frame);
}

async function collectProviderOutcomes(providers, operation, ask) {
  const ordered = [...providers].toSorted((left, right) =>
    left.manifest.id.localeCompare(right.manifest.id));
  const outcomes = await Promise.all(ordered.map(async (provider) => ({
    provider,
    queried: await runOptionalProviderQuery(provider, operation, () => ask(provider)),
  })));
  return {
    matches: outcomes.map((outcome) => outcome.queried.value).filter(Boolean),
    consultedProviders: ordered.map((provider) => ({
      kbId: provider.manifest.kbId ?? provider.manifest.id,
      version: provider.manifest.kbVersion,
    })),
    providerErrors: outcomes.flatMap((outcome) => outcome.queried.diagnostics),
  };
}

/**
 * Ask every loaded provider that accepts one of the semantically equivalent
 * surfaces in a factoid frame. Provider order is never an answer-selection rule.
 */
export async function routeFactoidQuestion(providers, text) {
  const frame = parseFactoidQuestion(text);
  if (!frame || !Array.isArray(providers) || providers.length === 0) {
    return { frame, result: undefined, consultedProviders: [], providerErrors: [] };
  }
  const collected = await collectProviderOutcomes(
    providers, 'factoid-question', (provider) => askProvider(provider, frame),
  );
  return {
    frame,
    result: providerOutcome(collected.matches, frame),
    consultedProviders: collected.consultedProviders,
    providerErrors: collected.providerErrors,
  };
}

/**
 * Ask every provider that recognizes an operation outside the generic factoid
 * frame. This preserves legacy provider-specific surfaces without allowing
 * registration order to select among incompatible semantic answers.
 */
export async function routeDirectProviderQuestion(providers, text) {
  if (!Array.isArray(providers) || providers.length === 0) {
    return { result: undefined, consultedProviders: [], providerErrors: [] };
  }
  const collected = await collectProviderOutcomes(
    providers,
    'direct-provider-question',
    (provider) => askProviderDirectly(provider, text),
  );
  return {
    result: providerOutcome(collected.matches, undefined),
    consultedProviders: collected.consultedProviders,
    providerErrors: collected.providerErrors,
  };
}
