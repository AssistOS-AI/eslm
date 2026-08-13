import {
  abduceExplanations, answerQuery, deriveInductiveFacts, indexFacts,
} from '../reasoning/datalog.mjs';
import { createPlan } from '../reasoning/planner.mjs';
import { answerTemporalPredecessor } from '../reasoning/temporal-state.mjs';
import {
  assertOrdinaryMethodExecutionInput,
  assertOrdinaryMethodExecutionOutput,
  assertOrdinaryMethodPlanningInput,
  assertOrdinaryMethodPlanningOutput,
  ordinaryMethodResultBounds,
  ORDINARY_REASONING_PROTOCOLS,
  ORDINARY_REASONING_STAGES,
} from './ordinary-reasoning-contracts.mjs';

export {
  assertOrdinaryMethodExecutionInput,
  assertOrdinaryMethodExecutionOutput,
  assertOrdinaryMethodPlanningInput,
  assertOrdinaryMethodPlanningOutput,
  assertOrdinaryResultVerificationInput,
  assertOrdinaryResultVerificationOutput,
  ordinaryMethodResultBounds,
  ORDINARY_REASONING_PROTOCOLS,
} from './ordinary-reasoning-contracts.mjs';
export { verifyOrdinaryMethodResult } from './ordinary-reasoning-witness-verifier.mjs';

export function planOrdinaryMethod(value) {
  const input = assertOrdinaryMethodPlanningInput(value);
  return Object.freeze(assertOrdinaryMethodPlanningOutput({
    format: ORDINARY_REASONING_PROTOCOLS.planningOutput,
    stage: ORDINARY_REASONING_STAGES.planning,
    taskFrame: input.taskFrame,
    plan: createPlan(input.taskFrame, input.registry),
    truthAuthorized: false,
  }));
}

function executionServices(services = {}) {
  const measureSync = services.measureSync ?? ((_name, execute) => execute());
  const annotate = services.annotate ?? (() => undefined);
  if (typeof measureSync !== 'function' || typeof annotate !== 'function') {
    throw new TypeError('Ordinary method execution services must be bounded profiler functions.');
  }
  return { measureSync, annotate };
}

function resourceLimitOutput(plan, closure) {
  return {
    format: ORDINARY_REASONING_PROTOCOLS.executionOutput,
    stage: ORDINARY_REASONING_STAGES.execution,
    methodId: plan.methodId,
    requiredCapability: plan.requiredCapability,
    status: 'RESOURCE_LIMIT',
    result: { values: [], evidence: [] },
    reasoning: {
      method: 'deduction', complete: false, rounds: closure.rounds,
      joinAttempts: closure.joinAttempts, frontierSize: closure.frontierSize,
    },
    resourceLimit: { diagnostic: closure.diagnostic },
    truthAuthorized: false,
  };
}

function executeAbduction(input, services, query, activeFacts) {
  const { plan } = input.planning;
  if (!input.activeClosure.complete) return resourceLimitOutput(plan, input.activeClosure);
  const hypotheses = services.measureSync('reasoning.abduction', () => abduceExplanations(
    query, activeFacts, input.activeModel.rules, input.activeModel.reasoning?.abduction?.maxHypotheses,
  ), { facts: activeFacts.length, rules: input.activeModel.rules.length });
  return {
    format: ORDINARY_REASONING_PROTOCOLS.executionOutput,
    stage: ORDINARY_REASONING_STAGES.execution,
    methodId: plan.methodId,
    requiredCapability: plan.requiredCapability,
    status: hypotheses.length > 0 ? 'ABDUCTIVE' : 'UNKNOWN',
    result: { values: hypotheses.map((hypothesis) => hypothesis.id), evidence: hypotheses, hypotheses },
    reasoning: { method: 'abduction', candidateCount: hypotheses.length },
    resourceLimit: null,
    truthAuthorized: false,
  };
}

function executeTemporal(input, services, query) {
  const { plan } = input.planning;
  const result = services.measureSync('reasoning.temporal-predecessor', () =>
    answerTemporalPredecessor(query, input.sessionHistory), {
    historyEvents: input.sessionHistory.length,
  });
  return {
    format: ORDINARY_REASONING_PROTOCOLS.executionOutput,
    stage: ORDINARY_REASONING_STAGES.execution,
    methodId: plan.methodId,
    requiredCapability: plan.requiredCapability,
    status: result.values.length > 0 ? 'ANSWERED' : 'UNKNOWN',
    result,
    reasoning: { method: 'temporal-state-predecessor', witness: result.witness },
    resourceLimit: null,
    truthAuthorized: false,
  };
}

function executeRetrievalOrInduction(input, services, query, activeFacts) {
  const { plan } = input.planning;
  const inducedFacts = query.reasoning === 'induction'
    ? input.activeClosure.complete
      ? services.measureSync('reasoning.induction', () => deriveInductiveFacts(
        input.activeModel, activeFacts,
      ), { facts: activeFacts.length })
      : []
    : [];
  if (query.reasoning === 'induction' && !input.activeClosure.complete) {
    return resourceLimitOutput(plan, input.activeClosure);
  }
  const activeIndex = inducedFacts.length > 0
    ? services.measureSync('retrieval.query-index', () => indexFacts([...activeFacts, ...inducedFacts]), {
      facts: activeFacts.length + inducedFacts.length,
    })
    : input.hasSessionOverlay
      ? services.measureSync('retrieval.query-index', () => indexFacts(activeFacts), {
        facts: activeFacts.length,
      })
      : input.baseIndex;
  const result = services.measureSync('retrieval.answer', () => answerQuery(query, activeIndex));
  services.annotate('retrieval.answer', { values: result.values.length, evidence: result.evidence.length });
  const inferred = result.evidence.find((fact) => fact.reasoning === 'induction');
  const derived = result.evidence.filter((fact) => fact.reasoning === 'deduction');
  if (result.values.length === 0 && !input.activeClosure.complete) {
    return resourceLimitOutput(plan, input.activeClosure);
  }
  return {
    format: ORDINARY_REASONING_PROTOCOLS.executionOutput,
    stage: ORDINARY_REASONING_STAGES.execution,
    methodId: plan.methodId,
    requiredCapability: plan.requiredCapability,
    status: result.values.length === 0 ? 'UNKNOWN' : inferred ? 'INDUCTIVE' : 'ANSWERED',
    result,
    reasoning: inferred ? {
      method: 'induction', confidence: inferred.confidence, ...inferred.induction,
    } : {
      method: derived.length > 0 ? 'deduction' : 'retrieval',
      depth: Math.max(0, ...derived.map((fact) => fact.depth ?? 0)),
    },
    resourceLimit: null,
    truthAuthorized: false,
  };
}

function computeOrdinaryExecution(input, services) {
  const [query] = input.planning.taskFrame.goals;
  const activeFacts = input.activeClosure.facts;
  if (query.reasoning === 'abduction') return executeAbduction(input, services, query, activeFacts);
  if (query.reasoning === 'temporal-predecessor') return executeTemporal(input, services, query);
  return executeRetrievalOrInduction(input, services, query, activeFacts);
}

export function executeOrdinaryMethod(value, services = {}) {
  const input = assertOrdinaryMethodExecutionInput(value);
  const output = computeOrdinaryExecution(input, executionServices(services));
  return Object.freeze(assertOrdinaryMethodExecutionOutput(output, ordinaryMethodResultBounds(input)));
}
