import { performance } from 'node:perf_hooks';
import { routeFactoidQuestion } from '../reasoning/factoid-provider-router.mjs';

export class EslmRuntime {
  constructor(core, providers = [], selected = [], memoryPlan) {
    this.core = core;
    this.providers = providers;
    this.selected = selected;
    this.model = core.model;
    this.memoryPlan = memoryPlan;
  }

  memorySnapshot() {
    if (!this.memoryPlan) return undefined;
    return {
      ...this.memoryPlan,
      providers: this.providers.map((provider) => ({ id: provider.manifest.id, ...provider.memorySnapshot() })),
    };
  }

  async ask(text, context = {}) {
    const started = performance.now();
    const before = this.core.profileEnabled ? process.memoryUsage() : undefined;
    const routed = await routeFactoidQuestion(this.providers, text);
    let knowledgeResult = routed.result;
    if (!routed.frame) {
      for (const provider of this.providers) {
        provider.beginQuery?.();
        try { knowledgeResult = await provider.ask(text); } finally { provider.endQuery?.(); }
        if (knowledgeResult) break;
      }
    }
    if (knowledgeResult) {
      const result = knowledgeResult;
      const after = this.core.profileEnabled ? process.memoryUsage() : undefined;
      return {
        ...result,
        protocol: 'eslm-runtime-result-v1',
        status: result.status === 'ANSWERED' ? 'SOLVED' : result.status,
        languageRoute: 'direct-symbolic',
        taskFrame: {
          taskId: 'task:runtime:public-kb', goals: [result.query], assertions: [], constraints: [],
          contextStack: ['context:runtime:baseline'], outputContract: { kind: 'semantic-values' },
        },
        plan: { methodId: result.reasoning?.method === 'bounded-deduction' ? 'method:core:safe-horn-deduction' : 'method:core:indexed-lookup' },
        usedKbVersions: this.providers.map((item) => ({ kbId: item.manifest.kbId, version: item.manifest.kbVersion })),
        unresolvedSubgoals: [],
        context,
        model: {
          id: `${this.core.model.manifest.modelId}+${this.providers.map((item) => item.manifest.id).join('+')}`,
          knowledgeBases: this.selected,
          benchmarkComparable: false,
          memory: this.memorySnapshot(),
        },
        ...(this.core.profileEnabled ? { profile: {
          initialization: this.core.initializationProfile,
          query: {
            format: 'eslm-profile-v1', operation: 'public-kb-query', status: result.status,
            stages: [{ name: 'public-kb.query', wallMilliseconds: performance.now() - started }],
            resources: { rssDeltaBytes: after.rss - before.rss, heapUsedDeltaBytes: after.heapUsed - before.heapUsed },
            memory: this.memorySnapshot(),
          },
        } } : {}),
      };
    }
    const result = this.core.ask(text, context);
    const factoidWithoutEvidence = routed.frame && result.status === 'UNPARSED';
    return {
      ...result,
      ...(factoidWithoutEvidence ? {
        status: 'UNKNOWN',
        answer: 'I understand this as a factoid question, but the loaded knowledge bases provide no answer.',
        values: [], provenance: [],
        query: { factoidFrame: routed.frame, routedProviders: [] },
        taskFrame: {
          taskId: 'task:runtime:factoid-gap', goals: [{ factoidFrame: routed.frame }],
          assertions: [], constraints: [], contextStack: ['context:runtime:baseline'],
          outputContract: { kind: 'semantic-values' },
        },
        plan: { methodId: 'method:core:indexed-lookup', steps: [] },
        reasoning: { method: 'epistemic-abstention', gap: 'no-provider-evidence' },
        unresolvedSubgoals: [{ operation: 'retrieve-semantic-values', frame: routed.frame }],
      } : {}),
      model: {
        ...result.model,
        knowledgeBases: this.selected,
        benchmarkComparable: this.selected.length === 0 && result.model.benchmarkComparable,
        memory: this.memorySnapshot(),
      },
    };
  }

  score(text) {
    return this.core.score(text);
  }

  async scorePlausibility(text) {
    const core = this.core.score(text);
    const evidence = [];
    let score = core.score;
    for (const provider of this.providers) {
      if (typeof provider.scorePlausibility !== 'function') continue;
      provider.beginQuery?.();
      try {
        const contribution = await provider.scorePlausibility(text);
        score += contribution.score;
        evidence.push(...contribution.evidence.map((item) => ({ provider: provider.manifest.id, ...item })));
      } finally { provider.endQuery?.(); }
    }
    return { ...core, score, evidence };
  }

  async scoreCompatibility(context, target) {
    const core = this.core.score(`${context} ${target}`);
    let score = core.score;
    const evidence = [];
    for (const provider of this.providers) {
      if (typeof provider.scoreCompatibility !== 'function') continue;
      provider.beginQuery?.();
      try {
        const contribution = await provider.scoreCompatibility(context, target);
        score += contribution.score;
        evidence.push(...contribution.evidence.map((item) => ({ provider: provider.manifest.id, ...item })));
      } finally { provider.endQuery?.(); }
    }
    return { ...core, score, evidence };
  }

  executeTask(task) {
    return this.core.executeTask(task);
  }

  async executeTaskWithKnowledge(task) {
    const semanticEvidence = [];
    const request = task?.operation === 'select-narrative-continuation'
      ? Object.freeze({
        kind: 'event-continuation-ranking',
        narrative: task.narrative,
        candidates: task.candidates,
      })
      : undefined;
    if (request) {
      for (const provider of this.providers) {
        if (typeof provider.semanticEvidence !== 'function') continue;
        provider.beginQuery?.();
        try {
          const evidence = await provider.semanticEvidence(request);
          if (evidence) semanticEvidence.push(evidence);
        } finally {
          provider.endQuery?.();
        }
      }
    }
    const result = this.core.executeTask({ ...task, semanticEvidence: Object.freeze(semanticEvidence) });
    return {
      ...result,
      usedKbVersions: this.providers.map((provider) => ({
        kbId: provider.manifest.kbId,
        version: provider.manifest.kbVersion,
      })),
      model: {
        ...result.model,
        id: `${this.core.model.manifest.modelId}+${this.providers.map((provider) => provider.manifest.id).join('+')}`,
        knowledgeBases: this.selected,
        memory: this.memorySnapshot(),
      },
    };
  }
}
