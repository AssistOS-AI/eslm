import { grammarScore, normalizeInput } from '../language/normalization.mjs';
import { parseQuestion } from '../language/parser.mjs';
import { deriveClosure, indexFacts } from '../reasoning/datalog.mjs';
import { realize } from '../language/realizer.mjs';
import {
  compileSessionEpisode, emptySessionContext, inspectSessionEpisode, modelWithSession,
  SessionContextValidationError,
  SessionInputValidationError, SessionResourceLimitError, sessionContextSnapshot,
} from '../language/session.mjs';
import { ExecutionProfiler } from '../profiling.mjs';
import { CapabilityRegistry, CORE_METHOD_DESCRIPTORS } from '../reasoning/capability-registry.mjs';
import { capabilityGap, taskFrameFromQuery } from '../reasoning/planner.mjs';
import { executeContainerStateTask } from '../reasoning/container-state.mjs';
import { selectNarrativeContinuation } from '../reasoning/continuation-selection.mjs';
import { executeTypedRelationTask } from '../reasoning/relation-algebra.mjs';
import { executeSpatialVectorTask } from '../reasoning/spatial-vector.mjs';
import { executeSpatialExtentTask } from '../reasoning/spatial-extent.mjs';
import { executeQualitativeRelationTask } from '../reasoning/qualitative-relation-closure.mjs';
import { executeCategoricalTask } from '../reasoning/categorical-logic.mjs';
import { decideBooleanEntailment } from '../reasoning/sat-entailment.mjs';
import { constructFiniteFirstOrderCountermodel } from '../reasoning/finite-first-order-model.mjs';
import { induceFiniteConjunctiveRule } from '../reasoning/finite-conjunctive-rule-induction.mjs';
import { executeEpisodicWorldTask } from '../reasoning/episodic-world.mjs';
import { createModelGroundingIndex } from '../reasoning/grounding-model-retrieval.mjs';
import { retrieveCoreRelatedEvidence } from './core-grounding.mjs';
import {
  executeOrdinaryMethod, ORDINARY_REASONING_PROTOCOLS, planOrdinaryMethod, verifyOrdinaryMethodResult,
} from './ordinary-reasoning-processing-nodes.mjs';
import {
  ordinaryAnswerResponse, ordinaryClosureResourceResponse, ordinaryVerificationResourceResponse,
} from './ordinary-reasoning-response.mjs';
import {
  assertRuntimeResultContract, assertRuntimeTextResultContract, directCoreMemorySnapshot, normalizeRuntimeStatus,
} from './result-contract.mjs';
import { executeTypedTask } from './typed-task-execution.mjs';
import {
  hornLimitsFromWorkPolicy, reasoningMethodSelected, resolveWorkPolicy,
} from './work-policy.mjs';

function uniqueKbVersions(values) {
  const byIdentity = new Map(values.filter((item) => item?.kbId).map((item) => [
    `${item.kbId}\u0000${item.version ?? ''}`,
    { kbId: item.kbId, ...(item.version ? { version: item.version } : {}) },
  ]));
  return [...byIdentity.values()].toSorted((left, right) =>
    left.kbId.localeCompare(right.kbId) || String(left.version).localeCompare(String(right.version)));
}

export class EslmEngine {
  constructor(model, options = {}) {
    this.model = model;
    this.profileEnabled = Boolean(options.profile);
    const declaredDeduction = model.reasoning?.deduction ?? {};
    this.workPolicy = resolveWorkPolicy(options.workPolicy ?? {
      profile: 'balanced',
      overrides: {
        ...(declaredDeduction.maxRounds === undefined
          ? {} : { maximumHornRounds: declaredDeduction.maxRounds }),
        ...(declaredDeduction.maximumFacts === undefined
          ? {} : { maximumHornFacts: declaredDeduction.maximumFacts }),
        ...(declaredDeduction.maximumJoinAttempts === undefined
          ? {} : { maximumHornJoinAttempts: declaredDeduction.maximumJoinAttempts }),
      },
    });
    this.capabilities = new CapabilityRegistry();
    const methodBindings = [
      [CORE_METHOD_DESCRIPTORS.datalog, () => undefined],
      [CORE_METHOD_DESCRIPTORS.induction, () => undefined],
      [CORE_METHOD_DESCRIPTORS.finiteConjunctiveRuleInduction, induceFiniteConjunctiveRule],
      [CORE_METHOD_DESCRIPTORS.finiteEpisodicWorld, executeEpisodicWorldTask],
      [CORE_METHOD_DESCRIPTORS.abduction, () => undefined],
      [CORE_METHOD_DESCRIPTORS.temporalPredecessor, () => undefined],
      [CORE_METHOD_DESCRIPTORS.containerState, executeContainerStateTask],
      [CORE_METHOD_DESCRIPTORS.narrativeContinuation, selectNarrativeContinuation],
      [CORE_METHOD_DESCRIPTORS.typedRelationAlgebra, executeTypedRelationTask],
      [CORE_METHOD_DESCRIPTORS.spatialVectorConstraints, executeSpatialVectorTask],
      [CORE_METHOD_DESCRIPTORS.spatialExtentInequalities, executeSpatialExtentTask],
      [CORE_METHOD_DESCRIPTORS.qualitativeRelationClosure, executeQualitativeRelationTask],
      [CORE_METHOD_DESCRIPTORS.scalableBooleanEntailment, decideBooleanEntailment],
      [CORE_METHOD_DESCRIPTORS.finiteFirstOrderCountermodel, constructFiniteFirstOrderCountermodel],
      [CORE_METHOD_DESCRIPTORS.categoricalLogic, executeCategoricalTask],
    ];
    for (const [descriptor, execute] of methodBindings) {
      if (reasoningMethodSelected(this.workPolicy, descriptor)) {
        this.capabilities.register(descriptor, execute);
      }
    }
    const profiler = new ExecutionProfiler('engine-initialization', this.profileEnabled, {
      modelId: model.manifest.modelId,
    });
    this.closure = profiler.measureSync('reasoning.full-closure', () => deriveClosure(
      model, hornLimitsFromWorkPolicy(this.workPolicy),
    ), {
      directFacts: model.facts.length, rules: model.rules.length,
    });
    this.facts = this.closure.facts;
    profiler.annotate('reasoning.full-closure', { closureFacts: this.facts.length });
    this.index = profiler.measureSync('retrieval.build-index', () => indexFacts(this.facts), {
      facts: this.facts.length,
    });
    this.groundingIndex = createModelGroundingIndex(this.model, this.index);
    this.initializationProfile = profiler.finish('ok', {
      entities: model.entities.length,
      directFacts: model.facts.length,
      closureFacts: this.facts.length,
    });
  }

  ask(text, context = {}) {
    try {
      return this.#askValidated(text, context);
    } catch (error) {
      const resourceFailure = error instanceof SessionResourceLimitError;
      const contextFailure = error instanceof SessionContextValidationError;
      const inputFailure = error instanceof SessionInputValidationError;
      if (!resourceFailure && !contextFailure && !inputFailure) throw error;
      let safeContext;
      try { safeContext = sessionContextSnapshot(context); } catch { safeContext = emptySessionContext(); }
      return assertRuntimeTextResultContract({
        protocol: 'eslm-runtime-result-v1',
        status: resourceFailure ? 'RESOURCE_LIMIT' : contextFailure ? 'INCONSISTENT_CONTEXT' : 'UNPARSED',
        answer: resourceFailure
          ? `I refused the request because the bounded session ${error.resource} limit was exceeded.`
          : contextFailure
            ? 'I refused the supplied session context because its shape is invalid.'
            : 'I could not interpret the request because runtime input must be text.',
        languageRoute: 'direct-symbolic', values: [], provenance: [],
        usedKbVersions: [], selectedKbVersions: this.model.manifest.knowledgeBaseVersions
          ?? (this.model.manifest.knowledgeBases ?? []).map((kbId) => ({ kbId })),
        consultedKbVersions: [],
        unresolvedSubgoals: [{
          operation: contextFailure ? 'validate-session-context' : inputFailure ? 'validate-input' : 'compile-session',
          ...(resourceFailure ? { resource: error.resource, observed: error.observed, limit: error.limit }
            : { field: error.field ?? 'input', diagnostic: error.message }),
        }],
        context: safeContext,
        episode: {
          original: error.resource === 'inputBytes' ? '' : typeof text === 'string' ? text : '',
          segments: [], unsupportedStatements: [], resourceRefused: true,
        },
        model: {
          id: this.model.manifest.modelId, knowledgeBases: this.model.manifest.knowledgeBases ?? [],
          benchmarkComparable: this.model.manifest.benchmarkComparable !== false,
          memory: this.memorySnapshot(),
        },
        workPolicy: this.workPolicy,
      });
    }
  }

  inspectLanguage(text, context = {}) {
    const episode = inspectSessionEpisode(text, this.model, context);
    if (episode.unsupportedStatements.length > 0 || !episode.question) {
      return { ...episode, parseStatus: episode.unsupportedStatements.length > 0 ? 'UNPARSED' : 'PARSED' };
    }
    const compiled = compileSessionEpisode(text, this.model, context);
    const activeModel = modelWithSession(this.model, compiled.session);
    const normalized = normalizeInput(episode.question, activeModel);
    const query = parseQuestion(normalized, activeModel, {
      ...context, lastEntity: compiled.lastEntity ?? context.lastEntity,
    });
    return {
      ...episode,
      normalizedQuestion: normalized.normalized,
      query,
      parseStatus: query.status === 'UNSUPPORTED' ? 'UNPARSED' : 'PARSED',
    };
  }

  #askValidated(text, context = {}) {
    context = sessionContextSnapshot(context);
    const profiler = new ExecutionProfiler('query', this.profileEnabled, {
      modelId: this.model.manifest.modelId, inputCharacters: text.length,
    });
    const complete = (response) => this.#profiled(response, profiler);
    const episode = profiler.measureSync(
      'language.compile-session', () => compileSessionEpisode(text, this.model, context),
    );
    if (episode.unsupportedStatements.length > 0) {
      const rejectedSession = context.session ?? { entities: [], facts: [], rules: [], history: [] };
      return complete({
        status: 'UNSUPPORTED',
        answer: 'I rejected the mixed episode because at least one statement was unsupported; '
          + 'no session changes were committed.',
        learned: [], learnedRules: [], provenance: [],
        context: { ...context, session: rejectedSession },
        episode: { original: text, segments: episode.segments,
          unsupportedStatements: episode.unsupportedStatements, transaction: 'rolled-back' },
      });
    }
    profiler.annotate('language.compile-session', {
      segments: episode.segments.length,
      sessionFacts: episode.session.facts.length,
      sessionRules: episode.session.rules.length,
    });
    const activeModel = profiler.measureSync(
      'model.session-overlay', () => modelWithSession(this.model, episode.session),
    );
    const hasSessionOverlay = episode.session.facts.length > 0 || episode.session.rules.length > 0;
    if (!episode.question) {
      if ((episode.learned.length > 0 || episode.learnedRules.length > 0)
        && episode.unsupportedStatements.length === 0) {
        const learnedCount = episode.learned.length + episode.learnedRules.length;
        return complete({
          status: 'LEARNED',
          answer: `I learned ${learnedCount} session item${learnedCount === 1 ? '' : 's'}.`,
          learned: episode.learned,
          learnedRules: episode.learnedRules,
          provenance: [
            ...episode.learned.map((fact) => ({ fact: fact.id, source: fact.provenance })),
            ...episode.learnedRules.map((rule) => ({ rule: rule.id, source: [rule.source] })),
          ],
          context: { ...context, session: episode.session, lastEntity: episode.learned.at(-1)?.subject },
          episode: { original: text, segments: episode.segments, unsupportedStatements: [] },
        });
      }
      return complete({
        status: 'UNSUPPORTED',
        answer: 'I could not interpret that as a supported statement or question yet. '
          + 'Try /examples for forms I can execute.',
        learned: episode.learned,
        learnedRules: episode.learnedRules,
        provenance: [],
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    const normalized = profiler.measureSync(
      'language.normalize', () => normalizeInput(episode.question, activeModel),
    );
    const query = profiler.measureSync(
      'language.parse-question', () => parseQuestion(normalized, activeModel, {
        ...context, lastEntity: episode.lastEntity ?? context.lastEntity,
      }),
    );
    if (query.status) {
      const rejectedQuestion = query.status === 'UNSUPPORTED';
      return complete({
        status: query.status,
        answer: query.status === 'AMBIGUOUS'
          ? 'The question matches more than one known entity.'
          : query.status === 'UNKNOWN'
            ? `I understand the question, but I do not know “${query.missingEntity}” in the active session or `
              + 'loaded knowledge bases.'
            : 'I do not know how to handle that kind of question yet. '
              + 'Try /examples to see the question families I can execute.',
        input: normalized,
        query,
        provenance: [],
        learned: rejectedQuestion ? [] : episode.learned,
        learnedRules: rejectedQuestion ? [] : episode.learnedRules,
        context: rejectedQuestion ? context : { ...context, session: episode.session },
        episode: {
          original: text,
          segments: episode.segments,
          unsupportedStatements: episode.unsupportedStatements,
          ...(rejectedQuestion ? { transaction: 'rolled-back' } : {}),
        },
      });
    }
    if (query.intent === 'system-identity') {
      return complete({
        status: 'ANSWERED',
        answer: 'I am ESLM, an offline executable symbolic language model. I answer by running generated knowledge '
          + 'and explicit reasoning rules, without calling an LLM at runtime.',
        values: ['eslm'], provenance: [], reasoning: { method: 'system-description' }, query,
        input: normalized, learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'user-identity') {
      return complete({
        status: 'UNKNOWN',
        answer: 'I do not know who you are from this session yet. You can tell me a supported fact about yourself, '
          + 'but I will not guess your identity.',
        values: [], provenance: [], reasoning: { method: 'epistemic-abstention' }, query,
        input: normalized, learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'system-capabilities') {
      return complete({
        status: 'ANSWERED',
        answer: 'I can learn bounded session facts, retrieve loaded knowledge, run explicit deduction and configured '
          + 'induction, return defeasible event candidates, and show provenance. Use /examples for tested questions '
          + 'and /kbs for available knowledge.',
        values: ['session-learning', 'retrieval', 'deduction', 'induction', 'provenance'],
        provenance: [], reasoning: { method: 'system-description' }, query, input: normalized,
        learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'system-operational-status') {
      return complete({
        status: 'ANSWERED',
        answer: 'I am ready. I am running as a deterministic symbolic system and waiting for a supported question '
          + 'or fact.',
        values: ['ready'], provenance: [], reasoning: { method: 'system-description' }, query,
        input: normalized, learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    const taskFrame = taskFrameFromQuery(query, {
      assertions: episode.session.facts.map((fact) => fact.id),
      contextStack: ['context:runtime:baseline', ...(hasSessionOverlay ? ['context:session:current'] : [])],
      searchNodes: this.workPolicy.effective.limits.maximumHornJoinAttempts,
    });
    const planning = planOrdinaryMethod({
      format: ORDINARY_REASONING_PROTOCOLS.planningInput,
      taskFrame,
      registry: this.capabilities,
    });
    const { plan } = planning;
    if (plan.status === 'NO_APPLICABLE_METHOD') {
      return complete({
        status: 'NO_APPLICABLE_METHOD',
        answer: 'The input was understood, but no registered method can solve the requested subproblem.',
        input: normalized, query, taskFrame, plan, capabilityGap: capabilityGap(taskFrame, plan),
        values: [], provenance: [], context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    const activeClosure = hasSessionOverlay
      ? profiler.measureSync('reasoning.session-closure', () => deriveClosure(
        activeModel, hornLimitsFromWorkPolicy(this.workPolicy),
      ), {
        directFacts: activeModel.facts.length, rules: activeModel.rules.length,
      }) : this.closure;
    if (hasSessionOverlay) {
      profiler.annotate('reasoning.session-closure', { closureFacts: activeClosure.facts.length });
    }
    const executionInput = {
      format: ORDINARY_REASONING_PROTOCOLS.executionInput,
      planning,
      activeModel,
      activeClosure,
      baseIndex: this.index,
      hasSessionOverlay,
      sessionHistory: episode.session.history ?? [],
    };
    const execution = executeOrdinaryMethod(executionInput, {
      measureSync: (name, execute, metadata) => profiler.measureSync(name, execute, metadata),
      annotate: (name, metadata) => profiler.annotate(name, metadata),
    });
    const verified = verifyOrdinaryMethodResult({
      ...executionInput,
      format: ORDINARY_REASONING_PROTOCOLS.verificationInput,
      execution,
    });
    if (verified.status === 'RESOURCE_LIMIT') {
      return complete(verified.accepted === false
        ? ordinaryVerificationResourceResponse({
          text, context, episode, normalized, query, taskFrame, plan, verified,
        })
        : ordinaryClosureResourceResponse({
          text, context, episode, normalized, query, taskFrame, plan, closure: activeClosure,
        }));
    }
    return complete(ordinaryAnswerResponse({
      text, context, episode, activeModel, normalized, query, result: verified.result, taskFrame, plan,
      status: verified.status,
      reasoning: verified.reasoning,
    }, () => profiler.measureSync(
      'language.realize', () => realize(query, verified.result, activeModel, normalized.language),
    )));
  }

  #profiled(response, profiler) {
    const status = normalizeRuntimeStatus(response.status);
    const usedKbVersions = uniqueKbVersions((response.provenance ?? []).flatMap((item) =>
      item.kbSources?.length > 0 ? item.kbSources : item.kbId ? [{
        kbId: item.kbId,
        ...(item.kbVersion ? { version: item.kbVersion } : {}),
      }] : []));
    const annotated = {
      ...response,
      protocol: 'eslm-runtime-result-v1',
      status,
      languageRoute: 'direct-symbolic',
      usedKbVersions,
      selectedKbVersions: this.model.manifest.knowledgeBaseVersions
        ?? (this.model.manifest.knowledgeBases ?? []).map((id) => ({ kbId: id })),
      consultedKbVersions: response.query
        && !String(response.query.intent ?? '').startsWith('system-')
        && response.query.intent !== 'user-identity'
        ? this.model.manifest.knowledgeBaseVersions
          ?? (this.model.manifest.knowledgeBases ?? []).map((id) => ({ kbId: id }))
        : [],
      unresolvedSubgoals: response.unresolvedSubgoals
        ?? (response.capabilityGap ? [response.capabilityGap] : []),
      model: {
        id: this.model.manifest.modelId,
        knowledgeBases: this.model.manifest.knowledgeBases ?? [],
        benchmarkComparable: this.model.manifest.benchmarkComparable !== false,
        memory: this.memorySnapshot(),
      },
      workPolicy: this.workPolicy,
    };
    if (!this.profileEnabled) return assertRuntimeTextResultContract(annotated);
    return assertRuntimeTextResultContract({
      ...annotated,
      profile: {
        initialization: this.initializationProfile,
        query: profiler.finish(response.status, {
          resultValues: response.values?.length ?? 0,
          provenanceItems: response.provenance?.length ?? 0,
        }),
      },
    });
  }

  score(text) {
    return grammarScore(text, this.model);
  }

  memorySnapshot() {
    return directCoreMemorySnapshot();
  }

  retrieveRelatedEvidence(request, context = {}) {
    return retrieveCoreRelatedEvidence({
      model: this.model,
      factIndex: this.index,
      groundingIndex: this.groundingIndex,
    }, request, context);
  }

  executeTask(task) {
    return assertRuntimeResultContract({
      ...executeTypedTask(this.model, task, {
        methodAllowed: (descriptor) => reasoningMethodSelected(this.workPolicy, descriptor),
      }),
      workPolicy: this.workPolicy,
    });
  }
}
