import { performance } from 'node:perf_hooks';
import {
  SessionContextValidationError, SessionInputValidationError, SessionResourceLimitError,
  sessionContextSnapshot, splitEpisode, validateSessionRequest,
} from '../language/session.mjs';
import {
  analyzeBasicQuestions, buildSelfQuestionPlan,
} from '../language/basic-question-taxonomy.mjs';
import { parseFactoidQuestion } from '../language/factoid-question.mjs';
import {
  routeDirectProviderQuestion, routeFactoidQuestion,
} from '../reasoning/factoid-provider-router.mjs';
import { CORE_METHOD_DESCRIPTORS } from '../reasoning/capability-registry.mjs';
import {
  createGroundingBundle, createGroundingRequest, createKnowledgeContextRequest,
  createTaskKnowledgeContext, limitGroundingRequestLookups, selectGroundingRequestSources,
  shouldRetrieveGrounding,
} from '../reasoning/grounding-retrieval.mjs';
import {
  allocateGroundingLookupBudgets, appendGroundingResult, createGroundingAccumulator,
  finalizeGroundingAccumulator, recordGroundingOmission,
} from './grounding-aggregation.mjs';
import {
  canonicalMemoryPlan, canonicalProviders, collectTaskProviderEvidence, compareText,
  contributingEvidenceProviders, kbIdentity, resultProviderIds, scoreWithProviderContributions,
  uniqueKbVersions,
} from './provider-coordination.mjs';
import { runOptionalProviderQuery } from './provider-query-lifecycle.mjs';
import {
  assertRuntimeResultContract, assertRuntimeTextResultContract, normalizeRuntimeStatus,
} from './result-contract.mjs';
import {
  groundingLimitsFromWorkPolicy, reasoningMethodSelected, resolveWorkPolicy,
  selectedStrategyIdentities,
} from './work-policy.mjs';
import {
  realizeTaskContextFallback,
} from './task-context-construction.mjs';

function contextSnapshot(context) {
  return sessionContextSnapshot(context);
}

const CORE_METHODS_BY_ID = new Map(Object.values(CORE_METHOD_DESCRIPTORS).map((descriptor) => [
  descriptor.methodId, descriptor,
]));

function providerMethodPlan(methodIds = []) {
  const canonical = [...new Set(methodIds)].toSorted();
  return {
    ...(canonical.length === 1 ? { methodId: canonical[0] } : {}),
    methodIds: canonical,
  };
}

function strategyIdentityForMethod(methodId) {
  const descriptor = CORE_METHODS_BY_ID.get(methodId);
  return descriptor
    ? `${descriptor.methodId.replace(/^method:/u, 'strategy:')}@${descriptor.implementationVersion}`
    : undefined;
}

function factoidGapAnswer(frame) {
  if (frame?.subjectSurface && frame?.relationSurface) {
    return `I could not find an admitted ${frame.relationSurface} for ${frame.subjectSurface} in the loaded knowledge bases.`;
  }
  const question = frame?.sourceText ?? 'this question';
  return `I could not find admitted knowledge that answers “${question}” in the loaded knowledge bases.`;
}

const EVENT_QUESTION_FAMILIES = new Set([
  'cause-origin', 'reason', 'intent', 'effect', 'continuation', 'change-lifecycle',
]);

const COMMON_NOMINAL_PREFIXES = new Set([
  'a', 'an', 'any', 'every', 'few', 'her', 'his', 'its', 'many', 'my', 'no', 'our',
  'several', 'some', 'that', 'the', 'their', 'these', 'this', 'those', 'your',
]);

function isProperNameSurface(value) {
  const surface = String(value ?? '').normalize('NFKC').trim();
  const words = surface.match(/[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\p{Pd}'’]*/gu) ?? [];
  if (words.length === 0 || COMMON_NOMINAL_PREFIXES.has(words[0].toLocaleLowerCase('en-US'))) return false;
  if (/['’]s\b/iu.test(surface)) return false;
  return /^\p{Lu}/u.test(words[0]);
}

function questionFocusFromAnalysis(analysis) {
  const focus = [];
  const seen = new Set();
  const add = (term, role) => {
    if (!term || focus.length >= 32) return;
    const key = `${role}\u0000${term.toLocaleLowerCase('en-US')}`;
    if (seen.has(key)) return;
    seen.add(key);
    focus.push({ focusId: `question-focus:${focus.length + 1}`, term, role });
  };
  for (const question of analysis.questions) {
    for (const subject of question.topicSurfaces ?? [question.subjectSurface]) {
      const subjectRole = EVENT_QUESTION_FAMILIES.has(question.family)
        ? 'event' : isProperNameSurface(subject) ? 'named-entity' : 'entity';
      add(subject, subjectRole);
    }
    add(question.objectSurface, 'object');
    add(question.relationSurface, 'predicate');
  }
  return focus;
}

export class EslmRuntime {
  constructor(core, providers = [], selected = [], memoryPlan, workPolicy) {
    this.core = core;
    this.providers = canonicalProviders(providers);
    this.selected = [...new Set(selected)].toSorted(compareText);
    this.model = core.model;
    this.memoryPlan = canonicalMemoryPlan(memoryPlan);
    this.workPolicy = resolveWorkPolicy(workPolicy ?? core.workPolicy);
  }

  memorySnapshot() {
    if (!this.memoryPlan) return undefined;
    return {
      ...this.memoryPlan,
      providers: this.providers.map((provider) => ({ id: provider.manifest.id, ...provider.memorySnapshot() })),
    };
  }

  inspectLanguage(text, context = {}) {
    return this.core.inspectLanguage(text, context);
  }

  async buildKnowledgeContext(text, context = {}) {
    validateSessionRequest(text, context);
    const limits = groundingLimitsFromWorkPolicy(this.workPolicy);
    const questionAnalysis = analyzeBasicQuestions(text);
    const factoidFrame = parseFactoidQuestion(text);
    const contextStrategySelection = selectedStrategyIdentities(
      this.workPolicy, 'runtime.context.construct',
    );
    const questionFocus = questionFocusFromAnalysis(questionAnalysis);
    const request = createKnowledgeContextRequest(text,
      factoidFrame ? { factoidFrame } : undefined, {
      ...limits,
      ...(questionFocus.length > 0 ? { focus: questionFocus } : {}),
      relevanceStrategySelection: selectedStrategyIdentities(
        this.workPolicy, 'runtime.evidence.assess',
      ),
      focusStrategySelection: selectedStrategyIdentities(
        this.workPolicy, 'runtime.knowledge.focus',
      ),
    });
    const selfQuestionPlan = buildSelfQuestionPlan(questionAnalysis, request.terms);
    const selectedKbVersions = this.#selectedKbVersions();
    const probe = {
      protocol: 'eslm-runtime-result-v1',
      status: 'UNKNOWN',
      answer: 'Task context construction has not attempted the primary answer.',
      languageRoute: 'task-context-construction',
      values: [],
      provenance: [],
      usedKbVersions: [],
      selectedKbVersions,
      consultedKbVersions: [],
      unresolvedSubgoals: [{ operation: 'construct-query-local-task-context' }],
      context: contextSnapshot(context),
      episode: { original: text, segments: splitEpisode(text), unsupportedStatements: [] },
      model: {
        id: `${this.core.model.manifest.modelId}+${this.providers.map((item) => item.manifest.id).join('+')}`,
        knowledgeBases: this.selected,
        benchmarkComparable: false,
        memory: this.memorySnapshot(),
      },
      workPolicy: this.workPolicy,
    };
    const retrieved = await this.#withGrounding(probe, text, context, request);
    const evidence = retrieved.grounding;
    const knowledgeContext = createTaskKnowledgeContext({
      request,
      entries: evidence?.entries ?? [],
      searchReceipts: evidence?.search?.receipts ?? [],
      maximumEntries: limits.maximumEntries,
      questionAnalysis,
      selfQuestionPlan,
      selectedKbVersions,
      consultedKbVersions: retrieved.consultedKbVersions,
      contextStrategySelection,
    });
    return Object.freeze({ request, context: knowledgeContext });
  }

  applyKnowledgeContext(primary, contextRun) {
    const annotated = assertRuntimeTextResultContract({
      ...primary,
      workPolicy: primary?.workPolicy ?? this.workPolicy,
    });
    if (!contextRun?.context || !contextRun?.request) return annotated;
    const fallback = realizeTaskContextFallback(annotated, contextRun.context);
    const status = fallback?.status ?? annotated.status;
    const knowledgeContext = Object.freeze({
      ...contextRun.context,
      realization: fallback?.realization ?? Object.freeze({
        status: 'context-only',
        originalStatus: annotated.status,
        realizedEntryIds: Object.freeze([]),
        answerAuthority: 'none',
        preciseAnswerEstablished: ['SOLVED', 'DEFEASIBLE'].includes(annotated.status),
      }),
    });
    let grounding = annotated.grounding;
    if (shouldRetrieveGrounding(status) && contextRun.context.search.receipts.length > 0) {
      const plannedFocus = annotated.requestPlanning?.status === 'PLANNED'
        ? (annotated.requestPlanning.selectedPlan?.topics ?? []).map((topic) => ({
          focusId: topic.topicId, term: topic.surface, role: 'request-topic',
        })) : [];
      const groundingRequest = plannedFocus.length > 0
        ? createGroundingRequest(
          annotated.episode.original, status, annotated.query, {
            ...contextRun.request.limits,
            relevanceStrategySelection: contextRun.request.relevanceStrategySelection,
            focusStrategySelection: contextRun.request.termSelection?.strategyMode === 'exact-allowlist'
              ? contextRun.request.termSelection.strategySelection : undefined,
            focus: plannedFocus,
          },
        )
        : contextRun.request;
      grounding = createGroundingBundle({
        request: groundingRequest,
        triggerStatus: status,
        entries: contextRun.context.entries,
        searchReceipts: contextRun.context.search.receipts,
        maximumEntries: contextRun.context.limits.maximumEntries,
      });
    }
    return assertRuntimeTextResultContract({
      ...annotated,
      ...(fallback ?? {}),
      status,
      knowledgeContext,
      consultedKbVersions: uniqueKbVersions([
        ...(annotated.consultedKbVersions ?? []),
        ...contextRun.context.consultedKbVersions,
      ]),
      ...(grounding ? { grounding } : {}),
      ...(fallback ? {
        reasoning: {
          method: 'query-local-epistemic-context-construction',
          claimMode: 'contextual-source-claims-not-precise-answer',
          originalReasoning: annotated.reasoning,
        },
        unresolvedSubgoals: [
          ...(annotated.unresolvedSubgoals ?? []),
          { operation: 'establish-precise-answer', priorStatus: annotated.status },
        ],
      } : {}),
    });
  }

  async ask(text, context = {}, executionOptions = {}) {
    try {
      validateSessionRequest(text, context);
    } catch (error) {
      if (error instanceof SessionResourceLimitError
        || error instanceof SessionContextValidationError
        || error instanceof SessionInputValidationError) {
        const refusal = this.core.ask(text, context);
        return this.#finishPrimary({
          ...refusal,
          selectedKbVersions: this.#selectedKbVersions(),
          consultedKbVersions: [],
          model: {
            ...refusal.model,
            knowledgeBases: this.selected,
            benchmarkComparable: this.selected.length === 0 && refusal.model.benchmarkComparable,
            memory: this.memorySnapshot(),
          },
        }, executionOptions);
      }
      throw error;
    }
    const knowledgeContextRun = executionOptions?.grounding === false
      ? undefined
      : (executionOptions?.knowledgeContextRun ?? await this.buildKnowledgeContext(text, context));
    const started = performance.now();
    const before = this.core.profileEnabled ? process.memoryUsage() : undefined;
    const providerLimits = {
      maximumSources: this.workPolicy.effective.limits.maximumProviderSources,
      maximumParaphrases: this.workPolicy.effective.limits.maximumProviderParaphrases,
      methodAllowed: (methodId) => {
        const descriptor = CORE_METHODS_BY_ID.get(methodId);
        return descriptor ? reasoningMethodSelected(this.workPolicy, descriptor) : false;
      },
    };
    const factoidRoute = await routeFactoidQuestion(this.providers, text, providerLimits);
    const providerRoute = factoidRoute.frame ? factoidRoute
      : await routeDirectProviderQuestion(this.providers, text, providerLimits);
    const knowledgeResult = providerRoute.result;
    const consultedProviders = [...(providerRoute.consultedProviders ?? [])];
    const providerErrors = [...(providerRoute.providerErrors ?? [])];
    if (knowledgeResult) {
      const result = knowledgeResult;
      const publicStatus = normalizeRuntimeStatus(result.status);
      const resultContext = contextSnapshot(context);
      const after = this.core.profileEnabled ? process.memoryUsage() : undefined;
      const contributorIds = (result.values?.length ?? 0) > 0 ? resultProviderIds(result) : new Set();
      const primary = {
        ...result,
        ...((result.values?.length ?? 0) === 0 ? { provenance: [] } : {}),
        protocol: 'eslm-runtime-result-v1',
        status: publicStatus,
        languageRoute: 'direct-symbolic',
        taskFrame: {
          taskId: 'task:runtime:public-kb', goals: [result.query], assertions: [], constraints: [],
          contextStack: ['context:runtime:baseline'], outputContract: { kind: 'semantic-values' },
        },
        plan: providerMethodPlan(
          result.reasoning?.routedMethodIds ?? providerRoute.eligibleMethodIds,
        ),
        usedKbVersions: uniqueKbVersions(this.providers
          .filter((provider) => contributorIds.has(provider.manifest.id))
          .map(kbIdentity)),
        selectedKbVersions: this.#selectedKbVersions(),
        consultedKbVersions: uniqueKbVersions(consultedProviders),
        unresolvedSubgoals: (result.values?.length ?? 0) > 0 ? [] : [{
          operation: 'retrieve-semantic-values',
          providerQuery: result.query,
        }],
        ...(providerErrors.length > 0 ? { knowledgeDiagnostics: providerErrors } : {}),
        context: resultContext,
        episode: { original: text, segments: splitEpisode(text), unsupportedStatements: [] },
        model: {
          id: `${this.core.model.manifest.modelId}+${this.providers.map((item) => item.manifest.id).join('+')}`,
          knowledgeBases: this.selected,
          benchmarkComparable: false,
          memory: this.memorySnapshot(),
        },
        ...(this.core.profileEnabled ? { profile: {
          initialization: this.core.initializationProfile,
          query: {
            format: 'eslm-profile-v1', operation: 'public-kb-query', status: publicStatus,
            stages: [{ name: 'public-kb.query', wallMilliseconds: performance.now() - started }],
            resources: { rssDeltaBytes: after.rss - before.rss, heapUsedDeltaBytes: after.heapUsed - before.heapUsed },
            memory: this.memorySnapshot(),
          },
        } } : {}),
      };
      return this.#finishPrimary(primary, executionOptions, knowledgeContextRun);
    }
    const result = this.core.ask(text, context);
    const metaIntent = String(result.query?.intent ?? '').startsWith('system-')
      || result.query?.intent === 'user-identity';
    const unresolvedProviderQuestion = !metaIntent && this.providers.length > 0
      && ['UNPARSED', 'UNKNOWN'].includes(result.status);
    const providerWithoutSelectedMethod = unresolvedProviderQuestion && providerRoute.policyExcluded;
    const factoidWithoutEvidence = factoidRoute.frame && unresolvedProviderQuestion
      && !providerWithoutSelectedMethod;
    const blockedStrategies = (providerRoute.blockedMethodIds ?? [])
      .map(strategyIdentityForMethod).filter(Boolean);
    const primary = {
      ...result,
      languageRoute: result.languageRoute ?? 'direct-symbolic',
      usedKbVersions: result.usedKbVersions ?? [],
      ...(providerWithoutSelectedMethod ? {
        status: 'NO_APPLICABLE_METHOD',
        answer: 'The request reached a provider question route, but the active strategy policy does not select '
          + 'its declared reasoning method.',
        values: [], provenance: [],
        query: {
          ...(result.query ?? {}),
          ...(factoidRoute.frame ? { factoidFrame: factoidRoute.frame } : {
            providerOperation: 'direct-provider-question',
          }),
          routedProviders: [],
        },
        taskFrame: {
          taskId: 'task:runtime:provider-method-gap', goals: [factoidRoute.frame
            ? { factoidFrame: factoidRoute.frame } : { operation: 'direct-provider-question' }],
          assertions: [], constraints: [], contextStack: ['context:runtime:baseline'],
          outputContract: { kind: 'semantic-values' },
        },
        plan: {
          status: 'NO_APPLICABLE_METHOD', requiredCapability: 'retrieval',
          consideredMethods: [],
          excludedMethods: providerRoute.blockedMethodIds ?? [],
          failedPreconditions: ['The provider-declared method is excluded by the exact strategy allowlist.'],
          steps: [],
        },
        reasoning: { method: 'epistemic-abstention', gap: 'method-not-selected-by-strategy-policy' },
        unresolvedSubgoals: [
          ...(result.unresolvedSubgoals ?? []),
          {
            operation: 'retrieve-semantic-values',
            gap: 'method-not-selected-by-strategy-policy',
            requiredStrategies: blockedStrategies,
          },
        ],
      } : {}),
      ...(factoidWithoutEvidence ? {
        status: 'UNKNOWN',
        answer: factoidGapAnswer(factoidRoute.frame),
        values: [], provenance: [],
        query: { ...result.query, factoidFrame: factoidRoute.frame, routedProviders: [] },
        taskFrame: {
          taskId: 'task:runtime:factoid-gap', goals: [{ factoidFrame: factoidRoute.frame }],
          assertions: [], constraints: [], contextStack: ['context:runtime:baseline'],
          outputContract: { kind: 'semantic-values' },
        },
        plan: { ...providerMethodPlan(providerRoute.eligibleMethodIds), steps: [] },
        reasoning: { method: 'epistemic-abstention', gap: 'no-provider-evidence' },
        unresolvedSubgoals: [
          ...(result.unresolvedSubgoals ?? []),
          { operation: 'retrieve-semantic-values', frame: factoidRoute.frame },
        ],
      } : {}),
      selectedKbVersions: this.#selectedKbVersions(),
      consultedKbVersions: uniqueKbVersions([
        ...consultedProviders,
        ...(result.consultedKbVersions ?? []),
      ]),
      ...(providerErrors.length > 0 ? { knowledgeDiagnostics: providerErrors } : {}),
      context: contextSnapshot(result.context ?? context),
      episode: result.episode ?? {
        original: text, segments: splitEpisode(text), unsupportedStatements: [],
      },
      model: {
        ...result.model,
        knowledgeBases: this.selected,
        benchmarkComparable: this.selected.length === 0 && result.model.benchmarkComparable,
        memory: this.memorySnapshot(),
      },
    };
    return this.#finishPrimary(primary, executionOptions, knowledgeContextRun);
  }

  #finishPrimary(primary, executionOptions, knowledgeContextRun) {
    const annotated = { ...primary, workPolicy: this.workPolicy };
    if (executionOptions?.grounding === false) return assertRuntimeTextResultContract(annotated);
    return this.attachGrounding(annotated, knowledgeContextRun);
  }

  async attachGrounding(primary, suppliedKnowledgeContextRun) {
    const annotated = assertRuntimeTextResultContract({
      ...primary,
      workPolicy: primary?.workPolicy ?? this.workPolicy,
    });
    if (JSON.stringify(annotated.workPolicy) !== JSON.stringify(this.workPolicy)) {
      throw new Error('Cannot attach grounding under a different work policy.');
    }
    if (annotated.knowledgeContext) return annotated;
    const knowledgeContextRun = suppliedKnowledgeContextRun
      ?? await this.buildKnowledgeContext(annotated.episode.original, annotated.context);
    return this.applyKnowledgeContext(annotated, knowledgeContextRun);
  }

  #selectedKbVersions() {
    return uniqueKbVersions([
      ...(this.core.model.manifest.knowledgeBaseVersions ?? []),
      ...this.providers.map(kbIdentity),
    ]);
  }

  async #withGrounding(primary, text, context, preparedRequest) {
    if (!shouldRetrieveGrounding(primary.status)) return assertRuntimeTextResultContract(primary);
    const groundingLimits = groundingLimitsFromWorkPolicy(this.workPolicy);
    const maximumEntries = groundingLimits.maximumEntries;
    const plannedFocus = primary.requestPlanning?.status === 'PLANNED'
      ? (primary.requestPlanning.selectedPlan?.topics ?? []).map((topic) => ({
        focusId: topic.topicId, term: topic.surface, role: 'request-topic',
      })) : [];
    const request = preparedRequest ?? createGroundingRequest(text, primary.status, primary.query, {
      ...groundingLimits,
      relevanceStrategySelection: selectedStrategyIdentities(
        this.workPolicy, 'runtime.evidence.assess',
      ),
      focusStrategySelection: selectedStrategyIdentities(
        this.workPolicy, 'runtime.knowledge.focus',
      ),
      ...(plannedFocus.length > 0 ? { focus: plannedFocus } : {}),
    });
    const groundingResults = createGroundingAccumulator(request);
    const ordinarySourceLimit = request.limits.maximumSources - 1;
    const orderedProviders = [...this.providers].toSorted((left, right) => {
      const leftIdentity = kbIdentity(left);
      const rightIdentity = kbIdentity(right);
      return compareText(leftIdentity.kbId, rightIdentity.kbId)
        || compareText(String(leftIdentity.version), String(rightIdentity.version));
    });
    const coreEnabled = typeof this.core.retrieveRelatedEvidence === 'function';
    const session = context?.session;
    const hasSessionKnowledge = (session?.facts?.length ?? 0) > 0
      || (session?.rules?.length ?? 0) > 0;
    const coreSources = uniqueKbVersions([
      ...(this.core.model.manifest.knowledgeBaseVersions
        ?? (this.core.model.manifest.knowledgeBases ?? []).map((kbId) => ({ kbId }))),
      ...(hasSessionKnowledge ? [{ kbId: 'session', version: 'current' }] : []),
    ]);
    const canonicalCoreSources = coreSources.filter((identity) => identity.kbId !== 'session');
    const sessionSource = coreSources.find((identity) => identity.kbId === 'session');
    const selectedCoreSources = [
      ...(sessionSource ? [sessionSource] : []),
      ...canonicalCoreSources,
    ].slice(0, ordinarySourceLimit);
    const plannedProviderCount = Math.min(
      orderedProviders.length, ordinarySourceLimit - selectedCoreSources.length,
    );
    const coreScheduled = coreEnabled && selectedCoreSources.length > 0;
    const lookupBudgets = allocateGroundingLookupBudgets(
      request.limits.maximumLookups,
      plannedProviderCount + (coreScheduled ? 1 : 0),
    );
    const invokedGrounding = [];
    let lookupBudgetIndex = 0;
    if (coreScheduled) {
      invokedGrounding.push(...selectedCoreSources.filter((identity) => identity.kbId !== 'session'));
      try {
        const coreRequest = selectGroundingRequestSources(limitGroundingRequestLookups(
          request, lookupBudgets[lookupBudgetIndex],
        ), selectedCoreSources);
        lookupBudgetIndex += 1;
        const coreResult = await this.core.retrieveRelatedEvidence(coreRequest, context);
        appendGroundingResult(groundingResults, coreResult, {
          kbId: 'canonical-runtime-index', allowedKbVersions: selectedCoreSources,
        });
      } catch (error) {
        const identities = selectedCoreSources;
        const failed = identities.length > 0 ? identities : [{ kbId: 'canonical-runtime-index' }];
        appendGroundingResult(groundingResults, { entries: [], receipts: failed.map((identity) => ({
          kbId: identity.kbId, kbVersion: identity.version, status: 'provider-error',
          coverage: 'canonical-grounding-search-failed', complete: false,
          candidatesConsidered: 0, truncationReasons: ['provider-error'],
          diagnostic: String(error?.message ?? error).slice(0, 240),
        })) }, { kbId: 'canonical-runtime-index', allowedKbVersions: selectedCoreSources });
      }
    }
    let scheduledProviders = 0;
    for (const provider of orderedProviders.slice(0, plannedProviderCount)) {
      if (groundingResults.receipts.length >= ordinarySourceLimit
        || lookupBudgetIndex >= lookupBudgets.length) break;
      scheduledProviders += 1;
      const identity = kbIdentity(provider);
      invokedGrounding.push(identity);
      if (typeof provider.retrieveGrounding !== 'function') {
        appendGroundingResult(groundingResults, {
          entries: [],
          receipt: {
            kbId: provider.manifest.kbId ?? provider.manifest.id,
            kbVersion: provider.manifest.kbVersion,
            status: 'unsupported-grounding-interface',
            coverage: 'provider-has-no-grounding-projection',
            complete: false,
            candidatesConsidered: 0,
            truncationReasons: ['provider-interface-unavailable'],
          },
        }, identity);
        continue;
      }
      const providerRequest = limitGroundingRequestLookups(
        request, lookupBudgets[lookupBudgetIndex],
      );
      lookupBudgetIndex += 1;
      const transaction = await runOptionalProviderQuery(
        provider,
        'retrieveGrounding',
        () => provider.retrieveGrounding(providerRequest),
      );
      if (transaction.diagnostics.length === 0) {
        appendGroundingResult(groundingResults, transaction.value, identity);
      } else {
        const cleanupFailed = transaction.diagnostics.some((item) => item.stage === 'endQuery');
        appendGroundingResult(groundingResults, {
          entries: [],
          receipt: {
            kbId: identity.kbId,
            kbVersion: identity.version,
            status: 'provider-error',
            coverage: cleanupFailed
              ? 'grounding-provider-cleanup-failed'
              : 'grounding-search-failed',
            complete: false,
            candidatesConsidered: 0,
            truncationReasons: ['provider-error'],
            diagnostic: transaction.diagnostics
              .map((item) => item.diagnostic).join('; ').slice(0, 240),
          },
        }, identity);
      }
    }
    const skippedProviders = orderedProviders.slice(scheduledProviders);
    const selectedCoreKeys = new Set(selectedCoreSources.map((identity) =>
      `${identity.kbId}\u0000${identity.version ?? ''}`));
    const skippedCoreSources = coreSources.filter((identity) => !selectedCoreKeys.has(
      `${identity.kbId}\u0000${identity.version ?? ''}`,
    ));
    if (skippedProviders.length > 0 || skippedCoreSources.length > 0) recordGroundingOmission(
      groundingResults,
      'aggregate-source-budget',
      skippedProviders.length + skippedCoreSources.length,
      `First skipped source: ${skippedCoreSources[0]?.kbId
        ?? kbIdentity(skippedProviders[0]).kbId}`,
    );
    finalizeGroundingAccumulator(groundingResults);
    const { entries, receipts } = groundingResults;
    if (receipts.length === 0) return assertRuntimeTextResultContract(primary);
    const consultedKbVersions = uniqueKbVersions([
      ...(primary.consultedKbVersions ?? []),
      ...invokedGrounding,
    ]);
    try {
      return assertRuntimeTextResultContract({
        ...primary,
        consultedKbVersions,
        grounding: createGroundingBundle({
          request,
          triggerStatus: primary.status,
          entries,
          searchReceipts: receipts,
          maximumEntries,
        }),
      });
    } catch (error) {
      return assertRuntimeTextResultContract({
        ...primary,
        consultedKbVersions,
        knowledgeDiagnostics: [
          ...(primary.knowledgeDiagnostics ?? []),
          {
            provider: 'grounding-aggregation',
            diagnostic: String(error?.message ?? error).slice(0, 240),
          },
        ],
      });
    }
  }

  score(text) {
    return this.core.score(text);
  }

  async scorePlausibility(text) {
    return scoreWithProviderContributions(this.core, this.providers, 'scorePlausibility', [text]);
  }

  async scoreCompatibility(context, target) {
    return scoreWithProviderContributions(
      this.core, this.providers, 'scoreCompatibility', [context, target],
    );
  }

  executeTask(task) {
    return this.core.executeTask(task);
  }

  async executeTaskWithKnowledge(task) {
    const evidence = await collectTaskProviderEvidence(this.providers, task);
    const { semanticEvidence, consultedProviders: consultedEvidenceProviders,
      providersByAdapterId, knowledgeDiagnostics } = evidence;
    const result = this.core.executeTask({ ...task, semanticEvidence: Object.freeze(semanticEvidence) });
    const selectedEvidenceProviders = contributingEvidenceProviders(
      result, semanticEvidence, providersByAdapterId,
    );
    return assertRuntimeResultContract({
      ...result,
      usedKbVersions: uniqueKbVersions([
        ...(result.usedKbVersions ?? []),
        ...selectedEvidenceProviders,
      ]),
      selectedKbVersions: this.#selectedKbVersions(),
      consultedKbVersions: uniqueKbVersions([
        ...(result.consultedKbVersions ?? []),
        ...consultedEvidenceProviders,
      ]),
      ...(knowledgeDiagnostics.length > 0 ? { knowledgeDiagnostics } : {}),
      model: {
        ...result.model,
        id: `${this.core.model.manifest.modelId}+${this.providers.map((provider) => provider.manifest.id).join('+')}`,
        knowledgeBases: this.selected,
        memory: this.memorySnapshot(),
      },
      workPolicy: this.workPolicy,
    });
  }
}
