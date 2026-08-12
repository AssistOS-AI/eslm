import {
  approximateControlledEnglish,
} from '../language/heuristic-cnl-approximation.mjs';
import { planHeuristicRequest } from '../language/heuristic-request-planning.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';
import { synthesizeHeuristicRequest } from './heuristic-request-synthesis.mjs';
import {
  selectedStrategyIdentities, strategyIdentitySelected,
} from './work-policy.mjs';

function canonicalizeSemanticIr(value) {
  if (Array.isArray(value)) return value.map(canonicalizeSemanticIr);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).toSorted().map((key) => [
    key, canonicalizeSemanticIr(value[key]),
  ]));
}

function semanticSignature(ir) {
  return JSON.stringify(canonicalizeSemanticIr({
    query: ir.query ?? null,
    assertions: ir.assertions ?? [],
    rules: ir.rules ?? [],
    unsupportedStatements: ir.unsupportedStatements ?? [],
  }));
}

function approximationOptions(workPolicy) {
  const work = workPolicy.effective.limits;
  return Object.freeze({
    limits: Object.freeze({
      maximumInputBytes: 64 * 1024,
      maximumTokens: work.maximumHeuristicTokens,
      maximumSentences: work.maximumHeuristicSegments,
      maximumProposals: Math.min(1_024, Math.max(64, work.maximumHeuristicCandidates * 4)),
      maximumCandidates: work.maximumHeuristicCandidates,
      maximumEditDistanceEvaluations: Math.min(131_072, Math.max(4_096, work.maximumHeuristicTokens * 16)),
      maximumReceiptBytes: work.maximumHeuristicReceiptBytes,
    }),
    minimumCandidateConfidence: work.minimumHeuristicConfidence,
    selectedStrategyIdentities: selectedStrategyIdentities(
      workPolicy, 'runtime.language.interpret',
    ),
  });
}

function requestPlanningOptions(workPolicy) {
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

function requiredConstructionStrategies(operation) {
  const intentStrategy = operation.intent === 'summarize' ? 'extractive-summary'
    : operation.intent === 'expand' ? 'extractive-expansion'
      : operation.intent === 'compare' ? 'comparison'
        : operation.intent === 'outline' ? 'outline' : 'sectioned-document';
  return Object.freeze([
    `strategy:result:${intentStrategy}@1`,
    ...(operation.outputContract?.format === 'table' ? ['strategy:result:table@1'] : []),
    ...(operation.outputContract?.format === 'sections' && intentStrategy !== 'sectioned-document'
      ? ['strategy:result:sectioned-document@1'] : []),
  ]);
}

function reparseReceipt(candidate, ir) {
  return Object.freeze({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    text: candidate.text,
    confidence: candidate.confidence,
    rankScore: candidate.rankScore,
    status: ir.parseStatus,
    acceptedSemanticIr: ir.parseStatus === 'PARSED',
    semanticSignature: semanticSignature(ir),
  });
}

function ambiguityResult(direct, approximation, reparses, accepted) {
  return assertRuntimeTextResultContract({
    ...direct,
    status: 'AMBIGUOUS',
    answer: 'Several similarly supported local interpretations produced different symbolic meanings.',
    languageRoute: 'heuristic-cnl-ambiguous',
    values: [],
    provenance: [],
    usedKbVersions: [],
    reasoning: {
      method: 'heuristic-language-approximation',
      selection: 'declined-semantic-tie',
      candidateCount: accepted.length,
    },
    unresolvedSubgoals: [{
      operation: 'confirm-language-interpretation',
      candidates: accepted.map((item) => item.candidate.text),
    }],
    approximation: {
      ...approximation,
      status: 'ambiguous-reparse',
      reparses,
      selectedCandidate: null,
    },
  });
}

function acceptedApproximationResult(direct, approximation, reparses, selected) {
  const interpreted = selected.result;
  const queryLocalLearningOnly = !interpreted.query
    && ((interpreted.learned?.length ?? 0) > 0 || (interpreted.learnedRules?.length ?? 0) > 0);
  const publicStatus = queryLocalLearningOnly ? 'PARTIAL'
    : interpreted.status === 'SOLVED' ? 'DEFEASIBLE' : interpreted.status;
  return assertRuntimeTextResultContract({
    ...interpreted,
    status: publicStatus,
    ...(queryLocalLearningOnly ? {
      answer: 'I found a plausible controlled-language interpretation, but kept it query-local and did not '
        + 'save it. Restate or confirm the controlled form to add it to the session.',
      values: [],
      provenance: [],
      unresolvedSubgoals: [{
        operation: 'confirm-language-interpretation-before-session-commit',
        interpretedText: selected.candidate.text,
      }],
    } : {}),
    languageRoute: 'heuristic-cnl-approximated',
    originalInput: direct.input ?? { original: direct.episode.original },
    learned: [],
    learnedRules: [],
    context: direct.context,
    episode: {
      ...direct.episode,
      interpretedText: selected.candidate.text,
      interpretedSegments: interpreted.episode?.segments ?? [],
      transaction: 'heuristic-query-local',
    },
    reasoning: {
      ...interpreted.reasoning,
      languageInterpretation: 'heuristic-non-authoritative',
      interpretationConfidence: selected.candidate.confidence,
      ...(queryLocalLearningOnly ? { sessionEffect: 'not-committed-without-confirmation' } : {}),
    },
    approximation: {
      ...approximation,
      status: 'accepted-reparse',
      selectedCandidate: selected.candidate,
      reparses,
      ephemeralPremises: Object.freeze({
        facts: Object.freeze(interpreted.learned ?? []),
        rules: Object.freeze(interpreted.learnedRules ?? []),
        committed: false,
      }),
    },
  });
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
      method: 'extractive-request-synthesis',
      sourceClaim: true,
    })),
    usedKbVersions: synthesis.contributingKbVersions,
    taskFrame: {
      taskId: 'task:runtime:heuristic-request',
      instructions: requestPlanning.selectedPlan.operations.map((operation) => `request:${operation}`),
      assertions: [],
      constraints: [],
      goals: requestPlanning.selectedPlan.subrequests,
      contextStack: ['context:runtime:baseline'],
      outputContract: requestPlanning.selectedPlan.outputContract,
      languageRoute: 'heuristic-request-synthesis',
    },
    plan: {
      methodId: 'method:language:heuristic-request-planning',
      steps: requestPlanning.selectedPlan.subrequests,
    },
    reasoning: {
      method: 'heuristic-request-synthesis',
      claimMode: synthesis.claimMode,
      planConfidence: requestPlanning.selectedPlan.confidence,
      correlation: synthesis.correlation,
    },
    unresolvedSubgoals: synthesis.gaps.map((gap) => ({
      operation: 'close-request-coverage-gap', gap,
    })),
    requestPlanning,
    synthesis,
  });
}

function plannedKnowledgeGapResult(primary, requestPlanning, diagnostic) {
  return assertRuntimeTextResultContract({
    ...primary,
    status: 'MISSING_KNOWLEDGE',
    answer: diagnostic ?? ('I understood the requested artifact, but no supplied material or directly related KB '
      + 'record was available within the selected work policy.'),
    languageRoute: 'heuristic-request-planned',
    values: [],
    provenance: [],
    usedKbVersions: [],
    taskFrame: {
      taskId: 'task:runtime:heuristic-request',
      instructions: requestPlanning.selectedPlan.operations.map((operation) => `request:${operation}`),
      assertions: [],
      constraints: [],
      goals: requestPlanning.selectedPlan.subrequests,
      contextStack: ['context:runtime:baseline'],
      outputContract: requestPlanning.selectedPlan.outputContract,
      languageRoute: 'heuristic-request-planned',
    },
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

export class HeuristicLanguageRuntime {
  constructor(runtime) {
    this.runtime = runtime;
    this.core = runtime.core;
    this.providers = runtime.providers;
    this.selected = runtime.selected;
    this.model = runtime.model;
    this.memoryPlan = runtime.memoryPlan;
    this.workPolicy = runtime.workPolicy;
  }

  memorySnapshot() {
    return this.runtime.memorySnapshot();
  }

  score(text) {
    return this.runtime.score(text);
  }

  scorePlausibility(text) {
    return this.runtime.scorePlausibility(text);
  }

  scoreCompatibility(context, target) {
    return this.runtime.scoreCompatibility(context, target);
  }

  executeTask(task) {
    return this.runtime.executeTask(task);
  }

  executeTaskWithKnowledge(task) {
    return this.runtime.executeTaskWithKnowledge(task);
  }

  askDirect(text, context = {}, executionOptions = {}) {
    return this.runtime.ask(text, context, executionOptions);
  }

  async attachGrounding(primary) {
    const grounded = await this.runtime.attachGrounding(primary);
    if (grounded.requestPlanning?.status !== 'PLANNED') return grounded;
    const operationStrategies = grounded.requestPlanning.selectedPlan.operationPlans
      .flatMap(requiredConstructionStrategies);
    const constructionSelected = operationStrategies.every((identity) => strategyIdentitySelected(
      this.workPolicy, 'runtime.result.construct', identity,
    ));
    if (!constructionSelected) {
      return plannedKnowledgeGapResult(grounded, grounded.requestPlanning,
        'A required result-construction strategy was not selected by the exact policy allowlist.');
    }
    const synthesis = synthesizeHeuristicRequest(grounded.requestPlanning, grounded.grounding);
    return synthesis ? plannedSynthesisResult(grounded, grounded.requestPlanning, synthesis) : grounded;
  }

  async ask(text, context = {}, executionOptions = {}) {
    const direct = await this.runtime.ask(text, context, { ...executionOptions, grounding: false });
    if (direct.status !== 'UNPARSED') {
      return executionOptions.grounding === false ? direct : this.attachGrounding(direct);
    }
    const requestStrategySelected = strategyIdentitySelected(
      this.workPolicy, 'runtime.request.plan', 'strategy:request:reviewed-pattern-ensemble@1',
    );
    const requestPlanning = requestStrategySelected
      ? planHeuristicRequest(text, requestPlanningOptions(this.workPolicy))
      : Object.freeze({ status: 'NO_SUPPORTED_INTENT' });
    const requestAnnotated = requestPlanning.status === 'NO_SUPPORTED_INTENT'
      ? direct : assertRuntimeTextResultContract({ ...direct, requestPlanning });
    if (requestPlanning.status === 'AMBIGUOUS') {
      const ambiguous = ambiguousRequestResult(requestAnnotated, requestPlanning);
      return executionOptions.grounding === false ? ambiguous : this.attachGrounding(ambiguous);
    }
    if (requestPlanning.status === 'PLANNED') {
      // This is planned retrieval for a recognized task, not failure-time grounding. It remains local and
      // runs before an optional Language Agent even when ordinary inability grounding is being deferred.
      const planned = await this.attachGrounding(requestAnnotated);
      if (planned.status !== 'UNPARSED') return planned;
      return plannedKnowledgeGapResult(planned, requestPlanning);
    }

    const approximation = approximateControlledEnglish(text, approximationOptions(this.workPolicy));
    const reparseLimit = Math.min(
      this.workPolicy.effective.limits.maximumHeuristicReparses,
      approximation.candidates.length,
    );
    const reparses = [];
    const accepted = [];
    for (const candidate of approximation.candidates.slice(0, reparseLimit)) {
      const ir = this.runtime.inspectLanguage(candidate.text, context);
      const receipt = reparseReceipt(candidate, ir);
      reparses.push(receipt);
      if (receipt.acceptedSemanticIr) accepted.push({ candidate, ir, receipt });
    }
    let result;
    if (accepted.length > 0) {
      const bySignature = new Map();
      for (const item of accepted) {
        const signature = item.receipt.semanticSignature;
        if (!bySignature.has(signature)) bySignature.set(signature, item);
      }
      const distinct = [...bySignature.values()].toSorted((left, right) =>
        right.candidate.rankScore - left.candidate.rankScore
        || left.candidate.rank - right.candidate.rank);
      const closeConflict = distinct.length > 1
        && distinct[0].candidate.rankScore - distinct[1].candidate.rankScore < 0.08;
      if (closeConflict) {
        result = ambiguityResult(requestAnnotated, approximation, Object.freeze(reparses), distinct);
      } else {
        const executed = await this.runtime.ask(distinct[0].candidate.text, context, { grounding: false });
        result = acceptedApproximationResult(
          requestAnnotated, approximation, Object.freeze(reparses), {
            ...distinct[0], result: executed,
          },
        );
      }
    } else {
      result = assertRuntimeTextResultContract({
        ...requestAnnotated,
        approximation: {
          ...approximation,
          status: approximation.status === 'RESOURCE_LIMIT'
            ? 'resource-limit' : 'no-accepted-reparse',
          reparses: Object.freeze(reparses),
          selectedCandidate: null,
        },
      });
    }
    return executionOptions.grounding === false ? result : this.attachGrounding(result);
  }
}
