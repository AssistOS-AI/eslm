export class EslmRuntime {
  constructor(core, providers = [], selected = []) {
    this.core = core;
    this.providers = providers;
    this.selected = selected;
    this.model = core.model;
  }

  ask(text, context = {}) {
    for (const provider of this.providers) {
      const result = provider.ask(text);
      if (!result) continue;
      return {
        ...result,
        context,
        model: {
          id: `${this.core.model.manifest.modelId}+${this.providers.map((item) => item.manifest.id).join('+')}`,
          knowledgeBases: this.selected,
          benchmarkComparable: false,
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
      },
    };
  }

  score(text) {
    return this.core.score(text);
  }
}
