import { parseFactoidQuestion } from '../language/factoid-question.mjs';
import { runOptionalProviderQuery } from '../runtime/provider-query-lifecycle.mjs';

const INDEXED_LOOKUP_METHOD = 'method:core:indexed-lookup';

function boundedDiagnostic(error) {
  try { return String(error?.message ?? error).slice(0, 240); } catch { return 'unprintable provider method declaration'; }
}

function providerMethodDiagnostic(provider, error) {
  return Object.freeze({
    provider: provider?.manifest?.id,
    kbId: provider?.manifest?.kbId ?? provider?.manifest?.id,
    kbVersion: provider?.manifest?.kbVersion,
    operation: 'provider-method-selection',
    stage: 'methodSelection',
    diagnostic: `Provider method selection failed: ${boundedDiagnostic(error)}`,
  });
}

function declaredQuestionMethod(provider, text) {
  const declared = typeof provider.reasoningMethodForQuestion === 'function'
    ? provider.reasoningMethodForQuestion(text) : INDEXED_LOOKUP_METHOD;
  if (declared && typeof declared.then === 'function') {
    throw new TypeError('Provider reasoningMethodForQuestion must be synchronous.');
  }
  if (declared === undefined || declared === null) return undefined;
  if (typeof declared !== 'string' || !/^method:[a-z0-9][a-z0-9:-]*$/u.test(declared)) {
    throw new TypeError('Provider reasoningMethodForQuestion returned an invalid method identity.');
  }
  return declared;
}

function methodAllowed(options, methodId) {
  return typeof options.methodAllowed !== 'function' || options.methodAllowed(methodId) === true;
}

function preparedProviders(providers, candidates, options) {
  const ordered = [...providers].toSorted((left, right) =>
    left.manifest.id.localeCompare(right.manifest.id));
  const prepared = [];
  const blockedMethods = new Set();
  const providerErrors = [];
  for (const provider of ordered) {
    const eligible = [];
    try {
      for (const candidate of candidates) {
        const methodId = declaredQuestionMethod(provider, candidate.text);
        if (!methodId) continue;
        if (!methodAllowed(options, methodId)) {
          blockedMethods.add(methodId);
          continue;
        }
        eligible.push(Object.freeze({ candidate, methodId }));
      }
    } catch (error) {
      providerErrors.push(providerMethodDiagnostic(provider, error));
      continue;
    }
    if (eligible.length > 0) prepared.push(Object.freeze({ provider, candidates: Object.freeze(eligible) }));
  }
  return Object.freeze({
    prepared: Object.freeze(prepared),
    eligibleMethodIds: Object.freeze([...new Set(prepared.flatMap((item) =>
      item.candidates.map((candidate) => candidate.methodId)))].toSorted()),
    blockedMethodIds: Object.freeze([...blockedMethods].toSorted()),
    providerErrors: Object.freeze(providerErrors),
  });
}

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

async function askProvider(provider, candidates) {
  let firstFailure;
  for (const planned of candidates) {
    const { candidate, methodId } = planned;
    const result = await provider.ask(candidate.text);
    if (!result) continue;
    if (result.reasoning?.methodId !== methodId) {
      throw new TypeError(`Provider result method ${String(result.reasoning?.methodId)} does not match declared ${methodId}.`);
    }
    const match = Object.freeze({ provider, candidate, methodId, result });
    if ((result.values?.length ?? 0) > 0 || result.status === 'AMBIGUOUS' || result.ambiguity) return match;
    firstFailure ??= match;
  }
  return firstFailure;
}

async function askProviderDirectly(provider, planned) {
  const result = await provider.ask(planned.candidate.text);
  if (result && result.reasoning?.methodId !== planned.methodId) {
    throw new TypeError(`Provider result method ${String(result.reasoning?.methodId)} does not match declared ${planned.methodId}.`);
  }
  return result ? Object.freeze({ provider, ...planned, result }) : undefined;
}

function routedMethodAccounting(matches) {
  return {
    routedMethodIds: [...new Set(matches.map((match) => match.methodId))].toSorted(),
    providerMethods: matches.map((match) => ({
      provider: match.provider.manifest.id,
      methodId: match.methodId,
    })).toSorted((left, right) => left.provider.localeCompare(right.provider)
      || left.methodId.localeCompare(right.methodId)),
  };
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
      ...routedMethodAccounting(matches),
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
    reasoning: {
      method: 'typed-provider-ambiguity', routing: 'exhaustive-provider-consultation',
      ...routedMethodAccounting(matches),
    },
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
    reasoning: {
      method: 'typed-provider-outcome-ambiguity', routing: 'exhaustive-provider-consultation',
      ...routedMethodAccounting(matches),
    },
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

function providerBudgetResult(frame, diagnostic) {
  return {
    status: 'RESOURCE_LIMIT',
    answer: 'I stopped before provider retrieval because the selected bounded work policy cannot cover the '
      + 'complete provider search.',
    values: [],
    provenance: [],
    reasoning: { method: 'bounded-provider-routing', complete: false, diagnostic },
    query: frame ? { factoidFrame: frame } : { operation: 'direct-provider-question' },
    learned: [], learnedRules: [], context: {},
  };
}

function providerLimits(options = {}) {
  const maximumSources = options.maximumSources ?? 64;
  const maximumParaphrases = options.maximumParaphrases ?? 16;
  if (!Number.isSafeInteger(maximumSources) || maximumSources < 1 || maximumSources > 64) {
    throw new Error('Provider maximumSources must be an integer from 1 to 64.');
  }
  if (!Number.isSafeInteger(maximumParaphrases) || maximumParaphrases < 1
    || maximumParaphrases > 16) {
    throw new Error('Provider maximumParaphrases must be an integer from 1 to 16.');
  }
  return { maximumSources, maximumParaphrases };
}

async function collectProviderOutcomes(prepared, operation, ask) {
  const outcomes = await Promise.all(prepared.map(async (item) => ({
    item,
    queried: await runOptionalProviderQuery(item.provider, operation, () => ask(item)),
  })));
  return {
    matches: outcomes.map((outcome) => outcome.queried.value).filter(Boolean),
    consultedProviders: prepared.map(({ provider }) => ({
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
export async function routeFactoidQuestion(providers, text, options = {}) {
  const frame = parseFactoidQuestion(text);
  if (!frame || !Array.isArray(providers) || providers.length === 0) {
    return {
      frame, result: undefined, consultedProviders: [], providerErrors: [],
      eligibleMethodIds: [], blockedMethodIds: [], policyExcluded: false,
    };
  }
  const limits = providerLimits(options);
  const planning = preparedProviders(providers, frame.candidates, options);
  if (planning.prepared.length === 0) {
    return {
      frame, result: undefined, consultedProviders: [],
      providerErrors: planning.providerErrors,
      eligibleMethodIds: planning.eligibleMethodIds,
      blockedMethodIds: planning.blockedMethodIds,
      policyExcluded: planning.blockedMethodIds.length > 0,
    };
  }
  if (planning.prepared.length > limits.maximumSources) {
    return {
      frame,
      result: providerBudgetResult(
        frame, `${planning.prepared.length} sources exceed the ${limits.maximumSources}-source limit.`,
      ),
      consultedProviders: [],
      providerErrors: planning.providerErrors,
      eligibleMethodIds: planning.eligibleMethodIds,
      blockedMethodIds: planning.blockedMethodIds,
      policyExcluded: false,
    };
  }
  if (frame.candidates.length > limits.maximumParaphrases) {
    return {
      frame,
      result: providerBudgetResult(
        frame, `${frame.candidates.length} paraphrases exceed the ${limits.maximumParaphrases}-paraphrase limit.`,
      ),
      consultedProviders: [],
      providerErrors: planning.providerErrors,
      eligibleMethodIds: planning.eligibleMethodIds,
      blockedMethodIds: planning.blockedMethodIds,
      policyExcluded: false,
    };
  }
  const collected = await collectProviderOutcomes(
    planning.prepared, 'factoid-question', (item) => askProvider(item.provider, item.candidates),
  );
  return {
    frame,
    result: providerOutcome(collected.matches, frame),
    consultedProviders: collected.consultedProviders,
    providerErrors: [...planning.providerErrors, ...collected.providerErrors],
    eligibleMethodIds: planning.eligibleMethodIds,
    blockedMethodIds: planning.blockedMethodIds,
    policyExcluded: false,
  };
}

/**
 * Ask every provider that recognizes an operation outside the generic factoid
 * frame. This preserves legacy provider-specific surfaces without allowing
 * registration order to select among incompatible semantic answers.
 */
export async function routeDirectProviderQuestion(providers, text, options = {}) {
  if (!Array.isArray(providers) || providers.length === 0) {
    return {
      result: undefined, consultedProviders: [], providerErrors: [],
      eligibleMethodIds: [], blockedMethodIds: [], policyExcluded: false,
    };
  }
  const limits = providerLimits(options);
  const planning = preparedProviders(providers, [{ text }], options);
  if (planning.prepared.length === 0) {
    return {
      result: undefined, consultedProviders: [], providerErrors: planning.providerErrors,
      eligibleMethodIds: planning.eligibleMethodIds,
      blockedMethodIds: planning.blockedMethodIds,
      policyExcluded: planning.blockedMethodIds.length > 0,
    };
  }
  if (planning.prepared.length > limits.maximumSources) {
    return {
      result: providerBudgetResult(
        undefined, `${planning.prepared.length} sources exceed the ${limits.maximumSources}-source limit.`,
      ),
      consultedProviders: [],
      providerErrors: planning.providerErrors,
      eligibleMethodIds: planning.eligibleMethodIds,
      blockedMethodIds: planning.blockedMethodIds,
      policyExcluded: false,
    };
  }
  const collected = await collectProviderOutcomes(
    planning.prepared,
    'direct-provider-question',
    (item) => askProviderDirectly(item.provider, item.candidates[0]),
  );
  return {
    result: providerOutcome(collected.matches, undefined),
    consultedProviders: collected.consultedProviders,
    providerErrors: [...planning.providerErrors, ...collected.providerErrors],
    eligibleMethodIds: planning.eligibleMethodIds,
    blockedMethodIds: planning.blockedMethodIds,
    policyExcluded: false,
  };
}
