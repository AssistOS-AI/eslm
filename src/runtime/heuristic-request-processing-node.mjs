import { planHeuristicRequest } from '../language/heuristic-request-planning.mjs';
import { sessionContextSnapshot } from '../language/session.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';
import { requiredGroundedResponseStrategies } from './grounded-response-realization.mjs';
import { synthesizeHeuristicRequest } from './heuristic-request-synthesis.mjs';
import { strategyIdentitySelected } from './work-policy.mjs';

export function requestPlanningOptions(workPolicy) {
  const work = workPolicy.effective.limits;
  return Object.freeze({
    limits: Object.freeze({
      maximumTokens: work.maximumHeuristicTokens,
      maximumInstructionSegments: Math.min(work.maximumHeuristicSegments, 128),
      maximumIntentCandidates: Math.min(work.maximumHeuristicCandidates, 64),
      minimumPlanConfidence: work.minimumHeuristicConfidence,
    }),
  });
}

function requestLocalPrimary(primary, context) {
  return Object.freeze({
    ...primary,
    learned: Object.freeze([]),
    learnedRules: Object.freeze([]),
    context: sessionContextSnapshot(context),
    episode: Object.freeze({
      ...primary.episode,
      transaction: 'heuristic-request-query-local',
    }),
  });
}

function requestTaskFrame(requestPlanning, languageRoute) {
  return {
    taskId: 'task:runtime:heuristic-request',
    instructions: requestPlanning.selectedPlan.operations.map((operation) => `request:${operation}`),
    assertions: [],
    constraints: [],
    goals: requestPlanning.selectedPlan.subrequests,
    contextStack: ['context:runtime:baseline'],
    outputContract: requestPlanning.selectedPlan.outputContract,
    languageRoute,
  };
}

function plannedSynthesisResult(primary, requestPlanning, synthesis) {
  const selectedEntries = synthesis.evidence.selected.map((item) => item.entry);
  return assertRuntimeTextResultContract({
    ...primary,
    status: 'PARTIAL',
    answer: synthesis.answer,
    languageRoute: 'heuristic-request-synthesis',
    values: [],
    provenance: selectedEntries.map((entry) => ({
      fact: entry.recordId,
      kbId: entry.kbId,
      kbVersion: entry.kbVersion,
      source: entry.provenance,
      method: 'grounded-symbolic-realization',
      sourceClaim: true,
    })),
    usedKbVersions: synthesis.contributingKbVersions,
    taskFrame: requestTaskFrame(requestPlanning, 'heuristic-request-synthesis'),
    plan: {
      methodId: 'method:language:heuristic-request-planning',
      steps: requestPlanning.selectedPlan.subrequests,
    },
    reasoning: {
      method: 'grounded-symbolic-response-construction',
      claimMode: synthesis.claimMode,
      planConfidence: requestPlanning.selectedPlan.confidence,
      constructionConfidence: synthesis.realization.confidence,
      constructionStrategies: synthesis.realization.strategyTrace,
      correlation: synthesis.correlation,
    },
    unresolvedSubgoals: synthesis.gaps.map((gap) => ({
      operation: 'close-request-coverage-gap', gap,
    })),
    requestPlanning,
    synthesis,
  });
}

export function plannedKnowledgeGapResult(primary, requestPlanning, diagnostic) {
  return assertRuntimeTextResultContract({
    ...primary,
    status: 'MISSING_KNOWLEDGE',
    answer: diagnostic ?? ('I understood the requested artifact, but no supplied material or directly related KB '
      + 'record was available within the selected work policy.'),
    languageRoute: 'heuristic-request-planned',
    values: [],
    provenance: [],
    usedKbVersions: [],
    taskFrame: requestTaskFrame(requestPlanning, 'heuristic-request-planned'),
    plan: {
      methodId: 'method:language:heuristic-request-planning',
      steps: requestPlanning.selectedPlan.subrequests,
    },
    reasoning: {
      method: 'heuristic-request-planning',
      claimMode: 'no-supported-content',
      planConfidence: requestPlanning.selectedPlan.confidence,
    },
    unresolvedSubgoals: [{
      operation: diagnostic ? 'select-result-construction-strategy' : 'supply-or-retrieve-request-content',
      topics: requestPlanning.selectedPlan.topics.map((topic) => topic.surface),
      ...(diagnostic ? { diagnostic } : {}),
    }],
    requestPlanning,
  });
}

function ambiguousRequestResult(primary, requestPlanning) {
  const candidates = requestPlanning.candidates.slice(0, 8).map((candidate) => ({
    intent: candidate.intent,
    confidence: candidate.confidence,
    evidence: candidate.votes.map((vote) => vote.patternId),
  }));
  return assertRuntimeTextResultContract({
    ...primary,
    status: 'AMBIGUOUS',
    answer: 'I found several similarly supported request interpretations and need the intended output clarified.',
    languageRoute: 'heuristic-request-ambiguous',
    values: [],
    provenance: [],
    usedKbVersions: [],
    reasoning: {
      method: 'heuristic-request-planning',
      selection: 'declined-intent-tie',
      candidateCount: candidates.length,
    },
    unresolvedSubgoals: [{
      operation: 'confirm-request-intent', candidates,
    }],
    requestPlanning,
  });
}

function planRequest(text, direct, context, workPolicy) {
  const selected = strategyIdentitySelected(
    workPolicy, 'runtime.request.plan', 'strategy:request:reviewed-pattern-ensemble@1',
  );
  const requestPlanning = selected
    ? planHeuristicRequest(text, requestPlanningOptions(workPolicy))
    : Object.freeze({ status: 'NO_SUPPORTED_INTENT' });
  if (requestPlanning.status === 'NO_SUPPORTED_INTENT') {
    return Object.freeze({ status: 'BYPASS', requestPlanning, primary: direct });
  }
  const local = requestLocalPrimary(direct, context);
  const primary = assertRuntimeTextResultContract({ ...local, requestPlanning });
  if (requestPlanning.status === 'AMBIGUOUS') {
    return Object.freeze({
      status: 'TERMINAL', requestPlanning, groundingHandled: false,
      primary: ambiguousRequestResult(primary, requestPlanning),
    });
  }
  if (requestPlanning.status === 'PLANNED') {
    return Object.freeze({ status: 'PLANNED', requestPlanning, primary });
  }
  return Object.freeze({ status: 'BYPASS', requestPlanning, primary: direct });
}

export async function processHeuristicRequest({
  text, direct, context, workPolicy, attachGrounding,
}) {
  if (typeof text !== 'string' || !direct || typeof direct !== 'object' || Array.isArray(direct)) {
    throw new TypeError('Request processing node requires text and one direct result object.');
  }
  if (typeof attachGrounding !== 'function') {
    throw new TypeError('Request processing node requires an attachGrounding function.');
  }
  const decision = planRequest(text, direct, context, workPolicy);
  if (decision.status !== 'PLANNED') return decision;
  const planned = await attachGrounding(decision.primary);
  if (planned.status !== 'UNPARSED') {
    return Object.freeze({ ...decision, status: 'TERMINAL', groundingHandled: true, primary: planned });
  }
  return Object.freeze({
    ...decision,
    status: 'TERMINAL',
    groundingHandled: true,
    primary: plannedKnowledgeGapResult(planned, decision.requestPlanning),
  });
}

export async function constructPlannedRequest({ primary, workPolicy, attachGrounding }) {
  const grounded = await attachGrounding(primary);
  if (grounded.requestPlanning?.status !== 'PLANNED') return grounded;
  const constructionStrategies = requiredGroundedResponseStrategies(
    grounded.requestPlanning.selectedPlan, grounded.grounding,
  );
  const constructionSelected = constructionStrategies.every((identity) => strategyIdentitySelected(
    workPolicy, 'runtime.result.construct', identity,
  ));
  if (!constructionSelected) {
    return plannedKnowledgeGapResult(grounded, grounded.requestPlanning,
      'A required result-construction strategy was not selected by the exact policy allowlist.');
  }
  const synthesis = synthesizeHeuristicRequest(grounded.requestPlanning, grounded.grounding);
  return synthesis ? plannedSynthesisResult(grounded, grounded.requestPlanning, synthesis) : grounded;
}
