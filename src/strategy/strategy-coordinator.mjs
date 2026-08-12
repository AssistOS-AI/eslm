import {
  createStrategyInputSnapshot, createStrategyRunResult, strategyIdentity,
} from './strategy-contract.mjs';

function selectedSet(policy, stage) {
  const selected = policy?.effective?.strategies?.selected?.[stage]
    ?? policy?.effective?.strategies?.[stage];
  return selected ? [...selected] : undefined;
}

function canonicalAllocations(entries, maximumWork) {
  return entries.map((_, index) => index < maximumWork ? 1 : 0);
}

function confidenceOf(result) {
  return result.confidence ?? 0;
}

function candidateKey(result) {
  return JSON.stringify(result.output ?? null);
}

function resultIdentity(result) {
  return `${result.strategyId}@${result.strategyVersion}`;
}

function boundedFailureMessage(error) {
  let surface = 'Unprintable strategy failure.';
  try {
    surface = error instanceof Error && typeof error.message === 'string' ? error.message : String(error);
  } catch {
    // Host containment must not depend on a thrown value's coercion hooks.
  }
  const visible = surface.replace(/[\u0000-\u001f\u007f]+/gu, ' ').trim() || 'Unspecified strategy failure.';
  let bounded = `Trusted strategy failed: ${visible}`.slice(0, 1_024);
  while (Buffer.byteLength(bounded, 'utf8') > 1_024) bounded = bounded.slice(0, -1);
  return bounded;
}

function containedFailureStatus(error) {
  try {
    return error?.code === 'INVALID_STRATEGY_OUTPUT' ? 'invalid-output' : 'failed';
  } catch {
    return 'failed';
  }
}

function decisionAuthority(value) {
  if (value === undefined) return 'candidate-ranking';
  if (!['candidate-ranking', 'accounting-only'].includes(value)) {
    throw new Error('Strategy decision authority must be candidate-ranking or accounting-only.');
  }
  return value;
}

export function arbitrateStrategyVotes(results, options = {}) {
  const authority = decisionAuthority(options.decisionAuthority);
  const applicable = results.filter((result) => result.status === 'completed');
  const byCandidate = new Map();
  for (const result of applicable) {
    const key = candidateKey(result);
    const current = byCandidate.get(key) ?? {
      output: result.output, supportByGroup: new Map(), voters: [], truthVoters: [],
    };
    current.supportByGroup.set(result.correlationGroup, Math.max(
      current.supportByGroup.get(result.correlationGroup) ?? 0,
      confidenceOf(result),
    ));
    current.voters.push(resultIdentity(result));
    if (result.truthAuthorized) current.truthVoters.push(resultIdentity(result));
    byCandidate.set(key, current);
  }
  const ranked = [...byCandidate.values()].map((candidate) => Object.freeze({
    output: candidate.output,
    support: Number([...candidate.supportByGroup.values()].reduce((sum, value) => sum + value, 0).toFixed(6)),
    voters: Object.freeze(candidate.voters.toSorted()),
    correlationGroups: Object.freeze([...candidate.supportByGroup.keys()].toSorted()),
    truthAuthorized: candidate.truthVoters.length > 0,
  })).toSorted((left, right) => right.support - left.support
    || JSON.stringify(left.output).localeCompare(JSON.stringify(right.output)));
  const ambiguous = ranked.length > 1 && ranked[0].support === ranked[1].support;
  return Object.freeze({
    mode: 'correlation-aware-additive-confidence',
    decisionAuthority: authority,
    stageOutputSelected: authority !== 'accounting-only' && ranked.length > 0,
    selected: ranked[0] ?? null,
    ambiguous,
    candidates: Object.freeze(ranked),
    truthAuthorized: !ambiguous && ranked[0]?.truthAuthorized === true,
  });
}

function failedResult(entry, reserved, status, reason) {
  return createStrategyRunResult(entry.descriptor, {
    status, reason, work: { reserved, consumed: 0 },
  });
}

function assertReservation(entry, result, reserved) {
  if (result.work.reserved === reserved) return result;
  return failedResult(
    entry, reserved, 'invalid-output',
    'The strategy result changed its immutable work allocation.',
  );
}

function stageReceipt(stage, maximumWork, entries, results, authority) {
  const consumedWork = results.reduce((sum, result) => sum + result.work.consumed, 0);
  return Object.freeze({
    format: 'eslm-strategy-execution-receipt-v1',
    stage,
    workUnit: 'coordinator-invocation-slot',
    maximumWork,
    consumedWork,
    remainingWork: maximumWork - consumedWork,
    decisionAuthority: authority,
    selectedStrategies: Object.freeze(entries.map((entry) => strategyIdentity(entry.descriptor))),
    results: Object.freeze(results),
    arbitration: arbitrateStrategyVotes(results, { decisionAuthority: authority }),
    complete: results.every((result) => !['failed', 'invalid-output', 'resource-limit'].includes(result.status)),
  });
}

export async function runStrategyStage({
  registry,
  stage,
  input,
  policy,
  maximumWork,
  context = {},
  decisionAuthority: suppliedDecisionAuthority,
}) {
  if (!Number.isSafeInteger(maximumWork) || maximumWork < 0) {
    throw new Error('A strategy stage requires a non-negative safe-integer work budget.');
  }
  registry.assertSealed();
  const authority = decisionAuthority(suppliedDecisionAuthority);
  const immutableInput = createStrategyInputSnapshot(input);
  const immutableContext = createStrategyInputSnapshot(context);
  const selected = selectedSet(policy, stage);
  const entries = registry.entries(stage, selected);
  const allocations = canonicalAllocations(entries, maximumWork);
  const results = [];
  for (const [index, entry] of entries.entries()) {
    const identity = strategyIdentity(entry.descriptor);
    const reserved = allocations[index];
    if (reserved === 0) {
      results.push(createStrategyRunResult(entry.descriptor, {
        status: 'resource-limit', reason: 'The canonical shared allocation assigned no work.',
        work: { reserved: 0, consumed: 0 },
      }));
      continue;
    }
    let result;
    try {
      result = await registry.execute(identity, immutableInput, Object.freeze({
        ...immutableContext, stage, strategyIdentity: identity, budget: Object.freeze({ reserved }),
      }));
    } catch (error) {
      result = failedResult(entry, reserved, containedFailureStatus(error), boundedFailureMessage(error));
    }
    results.push(assertReservation(entry, result, reserved));
  }
  return stageReceipt(stage, maximumWork, entries, results, authority);
}

export function runStrategyStageSync({
  registry, stage, input, policy, maximumWork, context = {},
  decisionAuthority: suppliedDecisionAuthority,
}) {
  if (!Number.isSafeInteger(maximumWork) || maximumWork < 0) {
    throw new Error('A strategy stage requires a non-negative safe-integer work budget.');
  }
  registry.assertSealed();
  const authority = decisionAuthority(suppliedDecisionAuthority);
  const immutableInput = createStrategyInputSnapshot(input);
  const immutableContext = createStrategyInputSnapshot(context);
  const entries = registry.entries(stage, selectedSet(policy, stage));
  const allocations = canonicalAllocations(entries, maximumWork);
  const results = entries.map((entry, index) => {
    const reserved = allocations[index];
    if (reserved === 0) {
      return failedResult(entry, 0, 'resource-limit', 'The canonical shared allocation assigned no work.');
    }
    let result;
    try {
      result = registry.executeSync(strategyIdentity(entry.descriptor), immutableInput, Object.freeze({
        ...immutableContext, stage, strategyIdentity: strategyIdentity(entry.descriptor),
        budget: Object.freeze({ reserved }),
      }));
    } catch (error) {
      result = failedResult(entry, reserved, containedFailureStatus(error), boundedFailureMessage(error));
    }
    return assertReservation(entry, result, reserved);
  });
  return stageReceipt(stage, maximumWork, entries, results, authority);
}
