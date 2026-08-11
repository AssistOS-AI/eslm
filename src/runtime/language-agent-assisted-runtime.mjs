const MAX_LANGUAGE_AGENT_PROPOSALS = 3;

export class LanguageAgentAssistedRuntime {
  constructor(runtime, normalizer) {
    this.runtime = runtime;
    this.normalizer = normalizer;
    this.core = runtime.core;
    this.providers = runtime.providers;
    this.selected = runtime.selected;
    this.model = runtime.model;
    this.memoryPlan = runtime.memoryPlan;
  }

  memorySnapshot() {
    return this.runtime.memorySnapshot();
  }

  normalizationConfiguration() {
    return this.normalizer.configuration();
  }

  score(text) {
    return this.runtime.score(text);
  }

  executeTask(task) {
    return this.runtime.executeTask(task);
  }

  async executeTaskWithKnowledge(task) {
    return this.runtime.executeTaskWithKnowledge(task);
  }

  async ask(text, context = {}) {
    const direct = await this.runtime.ask(text, context);
    if (direct.status !== 'UNPARSED') {
      return { ...direct, normalization: { attempted: false, triggerStatus: direct.status } };
    }
    let feedback = [];
    let previousCandidate;
    let externalInvocations = 0;
    let proposalCount = 0;
    let cacheHit = false;
    const receipts = [];
    while (proposalCount < MAX_LANGUAGE_AGENT_PROPOSALS) {
      const remainingAttempts = MAX_LANGUAGE_AGENT_PROPOSALS - proposalCount;
      if (remainingAttempts <= 0) break;
      const normalized = await this.normalizer.normalize(text, {
        feedback, previousCandidate, remainingAttempts,
      });
      externalInvocations += normalized.externalInvocations ?? 0;
      proposalCount += normalized.cacheHit
        ? 1
        : Math.max(normalized.externalInvocations ?? 0, normalized.candidate ? 1 : 0);
      cacheHit ||= normalized.cacheHit ?? false;
      receipts.push(...(normalized.receipts ?? (normalized.receipt ? [normalized.receipt] : [])));
      const common = {
        attempted: true, triggerStatus: direct.status, model: normalized.model,
        cacheHit, cacheKey: normalized.cacheKey,
        inputSha256: normalized.inputSha256, receipt: receipts.at(-1) ?? normalized.receipt,
        receipts: Object.freeze([...receipts]), externalInvocations,
        requestedOperation: normalized.requestedOperation, proposalCount,
        proposalLimit: MAX_LANGUAGE_AGENT_PROPOSALS,
      };
      if (normalized.status === 'failed') {
        return {
          ...direct, languageRoute: 'language-agent-normalization-failed',
          normalization: { ...common, status: 'failed', diagnostic: normalized.diagnostic },
        };
      }
      if (normalized.status === 'rejected') {
        return {
          ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
          normalization: { ...common, status: 'rejected', candidate: normalized.candidate, validation: normalized.validation },
        };
      }
      const reparsed = await this.runtime.ask(normalized.candidate.normalizedEnglish, context);
      if (reparsed.status === 'UNPARSED' && proposalCount < MAX_LANGUAGE_AGENT_PROPOSALS) {
        previousCandidate = normalized.candidate.normalizedEnglish;
        feedback = [
          'The previous proposal preserved the protected surface anchors but the symbolic language frontend returned UNPARSED.',
          'Produce a different conservative controlled-English formulation. Keep every fact, operator, entity, and question goal unchanged.',
        ];
        continue;
      }
      if (['UNPARSED', 'AMBIGUOUS'].includes(reparsed.status)) {
        return {
          ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
          normalization: {
            ...common, status: 'reparse-rejected', candidate: normalized.candidate,
            validation: normalized.validation, reparseStatus: reparsed.status,
          },
        };
      }
      return {
        ...reparsed,
        languageRoute: 'language-agent-normalized',
        originalInput: direct.input ?? { original: text },
        normalization: {
          ...common, status: 'accepted', candidate: normalized.candidate,
          validation: normalized.validation, reparseStatus: reparsed.status,
        },
      };
    }
    return {
      ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
      normalization: {
        attempted: true, triggerStatus: direct.status, status: 'proposal-limit-exhausted',
        proposalCount, proposalLimit: MAX_LANGUAGE_AGENT_PROPOSALS, externalInvocations,
        receipts: Object.freeze(receipts), diagnostic: 'The bounded Language Agent proposal limit was exhausted.',
      },
    };
  }
}
