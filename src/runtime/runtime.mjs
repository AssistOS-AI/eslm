import { performance } from 'node:perf_hooks';

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
    for (const provider of this.providers) {
      const started = performance.now();
      const before = this.core.profileEnabled ? process.memoryUsage() : undefined;
      provider.beginQuery?.();
      let result;
      try { result = await provider.ask(text); } finally { provider.endQuery?.(); }
      if (!result) continue;
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
    return {
      ...result,
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
}
