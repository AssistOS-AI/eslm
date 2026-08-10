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
      const result = await provider.ask(text);
      if (!result) continue;
      return {
        ...result,
        context,
        model: {
          id: `${this.core.model.manifest.modelId}+${this.providers.map((item) => item.manifest.id).join('+')}`,
          knowledgeBases: this.selected,
          benchmarkComparable: false,
          memory: this.memorySnapshot(),
        },
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
