import { performance } from 'node:perf_hooks';
import {
  SessionContextValidationError, SessionInputValidationError, SessionResourceLimitError,
  sessionContextSnapshot, splitEpisode, validateSessionRequest,
} from '../language/session.mjs';
import {
  routeDirectProviderQuestion, routeFactoidQuestion,
} from '../reasoning/factoid-provider-router.mjs';
import {
  createGroundingBundle, createGroundingRequest, limitGroundingRequestLookups,
  selectGroundingRequestSources, shouldRetrieveGrounding,
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
import {
  assertRuntimeResultContract, assertRuntimeTextResultContract, normalizeRuntimeStatus,
} from './result-contract.mjs';

function contextSnapshot(context) {
  return sessionContextSnapshot(context);
}

export class EslmRuntime {
  constructor(core, providers = [], selected = [], memoryPlan) {
    this.core = core;
    this.providers = canonicalProviders(providers);
    this.selected = [...new Set(selected)].toSorted(compareText);
    this.model = core.model;
    this.memoryPlan = canonicalMemoryPlan(memoryPlan);
  }

  memorySnapshot() {
    if (!this.memoryPlan) return undefined;
    return {
      ...this.memoryPlan,
      providers: this.providers.map((provider) => ({ id: provider.manifest.id, ...provider.memorySnapshot() })),
    };
  }

  async ask(text, context = {}) {
    try {
      validateSessionRequest(text, context);
    } catch (error) {
      if (error instanceof SessionResourceLimitError
        || error instanceof SessionContextValidationError
        || error instanceof SessionInputValidationError) return this.core.ask(text, context);
      throw error;
    }
    const started = performance.now();
    const before = this.core.profileEnabled ? process.memoryUsage() : undefined;
    const routed = await routeFactoidQuestion(this.providers, text);
    let knowledgeResult = routed.result;
    const consultedProviders = [...(routed.consultedProviders ?? [])];
    const providerErrors = [...(routed.providerErrors ?? [])];
    if (!routed.frame) {
      const direct = await routeDirectProviderQuestion(this.providers, text);
      knowledgeResult = direct.result;
      consultedProviders.push(...direct.consultedProviders);
      providerErrors.push(...direct.providerErrors);
    }
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
        plan: {
          methodId: result.reasoning?.method === 'bounded-deduction'
            ? 'method:core:safe-horn-deduction' : 'method:core:indexed-lookup',
        },
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
      return this.#withGrounding(primary, text, resultContext);
    }
    const result = this.core.ask(text, context);
    const metaIntent = String(result.query?.intent ?? '').startsWith('system-')
      || result.query?.intent === 'user-identity';
    const factoidWithoutEvidence = routed.frame && !metaIntent
      && ['UNPARSED', 'UNKNOWN'].includes(result.status);
    const primary = {
      ...result,
      languageRoute: result.languageRoute ?? 'direct-symbolic',
      usedKbVersions: result.usedKbVersions ?? [],
      ...(factoidWithoutEvidence ? {
        status: 'UNKNOWN',
        answer: 'I understand this as a factoid question, but the loaded knowledge bases provide no answer.',
        values: [], provenance: [],
        query: { ...result.query, factoidFrame: routed.frame, routedProviders: [] },
        taskFrame: {
          taskId: 'task:runtime:factoid-gap', goals: [{ factoidFrame: routed.frame }],
          assertions: [], constraints: [], contextStack: ['context:runtime:baseline'],
          outputContract: { kind: 'semantic-values' },
        },
        plan: { methodId: 'method:core:indexed-lookup', steps: [] },
        reasoning: { method: 'epistemic-abstention', gap: 'no-provider-evidence' },
        unresolvedSubgoals: [
          ...(result.unresolvedSubgoals ?? []),
          { operation: 'retrieve-semantic-values', frame: routed.frame },
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
    return this.#withGrounding(primary, text, primary.context ?? context);
  }

  #selectedKbVersions() {
    return uniqueKbVersions([
      ...(this.core.model.manifest.knowledgeBaseVersions ?? []),
      ...this.providers.map(kbIdentity),
    ]);
  }

  async #withGrounding(primary, text, context) {
    if (!shouldRetrieveGrounding(primary.status)) return assertRuntimeTextResultContract(primary);
    const maximumEntries = 8;
    const request = createGroundingRequest(text, primary.status, primary.query, {
      maximumEntries,
      maximumTerms: 12,
      maximumLookups: 96,
      maximumValuesPerLookup: 4,
      maximumSources: 16,
      maximumCandidateEntries: 256,
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
      let queryStarted = false;
      try {
        provider.beginQuery?.();
        queryStarted = true;
        const providerRequest = limitGroundingRequestLookups(
          request, lookupBudgets[lookupBudgetIndex],
        );
        lookupBudgetIndex += 1;
        const result = await provider.retrieveGrounding(providerRequest);
        appendGroundingResult(groundingResults, result, identity);
      } catch (error) {
        appendGroundingResult(groundingResults, {
          entries: [],
          receipt: {
            kbId: identity.kbId,
            kbVersion: identity.version,
            status: 'provider-error',
            coverage: 'grounding-search-failed',
            complete: false,
            candidatesConsidered: 0,
            truncationReasons: ['provider-error'],
            diagnostic: String(error?.message ?? error).slice(0, 240),
          },
        }, identity);
      } finally {
        if (queryStarted) {
          try {
            provider.endQuery?.();
          } catch (error) {
            appendGroundingResult(groundingResults, {
              entries: [],
              receipt: {
                kbId: identity.kbId,
                kbVersion: identity.version,
                status: 'provider-error',
                coverage: 'grounding-provider-cleanup-failed',
                complete: false,
                candidatesConsidered: 0,
                truncationReasons: ['provider-error'],
                diagnostic: String(error?.message ?? error).slice(0, 240),
              },
            }, identity);
          }
        }
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
    });
  }
}
