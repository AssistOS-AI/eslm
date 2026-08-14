import {
  approximateControlledEnglish,
} from '../language/heuristic-cnl-approximation.mjs';
import { arbitrateSemanticAlternatives } from './heuristic-language-arbitration.mjs';
import {
  alternativeInterpretationRequired, inspectLanguageCandidates,
} from './heuristic-language-inspection-gate.mjs';
import {
  ambiguityResult, executeQueryLocalInterpretation, noAcceptedReparseResult,
  queryLocalInterpretationBase,
} from './heuristic-query-local-execution.mjs';
import {
  constructPlannedRequest, processHeuristicRequest,
} from './heuristic-request-processing-node.mjs';
import {
  selectedStrategyIdentities,
} from './work-policy.mjs';
import { processBoundedOperation } from './bounded-operation-processing.mjs';

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

  buildKnowledgeContext(text, context = {}) {
    return this.runtime.buildKnowledgeContext(text, context);
  }

  async attachGrounding(primary, knowledgeContextRun) {
    return constructPlannedRequest({
      primary,
      workPolicy: this.workPolicy,
      attachGrounding: (result) => this.runtime.attachGrounding(result, knowledgeContextRun),
    });
  }

  async ask(text, context = {}, executionOptions = {}) {
    const knowledgeContextRun = executionOptions.grounding === false
      ? undefined
      : (executionOptions.knowledgeContextRun ?? await this.buildKnowledgeContext(text, context));
    const attachKnowledgeContext = (result) => this.attachGrounding(result, knowledgeContextRun);
    const direct = await this.runtime.ask(text, context, { ...executionOptions, grounding: false });
    const boundedOperation = processBoundedOperation({ text, direct, model: this.model });
    if (boundedOperation) {
      return executionOptions.grounding === false
        ? boundedOperation : attachKnowledgeContext(boundedOperation);
    }
    const request = await processHeuristicRequest({
      text,
      direct,
      context,
      workPolicy: this.workPolicy,
      attachGrounding: attachKnowledgeContext,
    });
    if (request.status === 'TERMINAL') {
      return executionOptions.grounding === false || request.groundingHandled
        ? request.primary : attachKnowledgeContext(request.primary);
    }

    // UNKNOWN can mean that a surface was parsed into the wrong, unsupported semantic frame. A successful
    // direct parse can also flatten an explicit structural cue such as a comma-bounded apposition. Local
    // approximation remains interpretation-only and a changed Semantic IR is never exposed as strict evidence.
    if (!['UNPARSED', 'UNKNOWN', 'SOLVED', 'PARTIAL'].includes(direct.status)) {
      return executionOptions.grounding === false ? direct : attachKnowledgeContext(direct);
    }

    const approximation = approximateControlledEnglish(text, approximationOptions(this.workPolicy));
    const reparseLimit = Math.min(
      this.workPolicy.effective.limits.maximumHeuristicReparses,
      approximation.candidates.length,
    );
    const { reparses, accepted } = inspectLanguageCandidates({
      candidates: approximation.candidates,
      maximumReparses: reparseLimit,
      inspectLanguage: (candidateText, candidateContext) =>
        this.runtime.inspectLanguage(candidateText, candidateContext),
      context,
    });
    const directIr = this.runtime.inspectLanguage(text, context);
    if (!alternativeInterpretationRequired(direct, directIr, accepted)) {
      return executionOptions.grounding === false ? direct : attachKnowledgeContext(direct);
    }
    const interpretationBase = queryLocalInterpretationBase(direct, context);
    let result;
    if (accepted.length > 0) {
      const arbitration = arbitrateSemanticAlternatives(accepted);
      if (arbitration.status === 'AMBIGUOUS') {
        result = ambiguityResult(
          interpretationBase, approximation, reparses, arbitration.alternatives,
        );
      } else {
        result = await executeQueryLocalInterpretation({
          runtime: this.runtime,
          selected: arbitration.selected,
          context,
          direct: interpretationBase,
          approximation,
          reparses,
        });
      }
    } else if (direct.status === 'UNPARSED') {
      result = noAcceptedReparseResult(interpretationBase, approximation, reparses);
    } else {
      result = direct;
    }
    return executionOptions.grounding === false ? result : attachKnowledgeContext(result);
  }
}
