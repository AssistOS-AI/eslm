import { NORMALIZATION_RESULT_PROTOCOL } from './result-payload-contracts.mjs';

const MAX_LANGUAGE_AGENT_PROPOSALS = 3;

function normalizationResult(value) {
  return { protocol: NORMALIZATION_RESULT_PROTOCOL, ...value };
}

export class LanguageAgentAssistedRuntime {
  constructor(runtime, normalizer) {
    this.runtime = runtime;
    this.normalizer = normalizer;
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

  attachGrounding(result) {
    return typeof this.runtime.attachGrounding === 'function'
      ? this.runtime.attachGrounding(result) : result;
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
    const direct = await this.runtime.ask(text, context, { grounding: false });
    if (direct.status !== 'UNPARSED') {
      const annotated = {
        ...direct, normalization: normalizationResult({ attempted: false, triggerStatus: direct.status }),
      };
      return this.attachGrounding(annotated);
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
        return this.attachGrounding({
          ...direct, languageRoute: 'language-agent-normalization-failed',
          normalization: normalizationResult({
            ...common, status: 'failed', diagnostic: normalized.diagnostic,
          }),
        });
      }
      if (normalized.status === 'rejected') {
        return this.attachGrounding({
          ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
          normalization: normalizationResult({
            ...common,
            status: 'rejected',
            candidate: normalized.candidate,
            validation: normalized.validation,
          }),
        });
      }
      const reparsed = typeof this.runtime.askDirect === 'function'
        ? await this.runtime.askDirect(
          normalized.candidate.normalizedEnglish, context, { grounding: false },
        )
        : await this.runtime.ask(
          normalized.candidate.normalizedEnglish, context, { grounding: false },
        );
      if (reparsed.status === 'UNPARSED' && proposalCount < MAX_LANGUAGE_AGENT_PROPOSALS) {
        previousCandidate = normalized.candidate.normalizedEnglish;
        feedback = [
          'The previous proposal preserved the protected surface anchors, but the symbolic language '
            + 'frontend returned UNPARSED.',
          'Produce a different conservative controlled-English formulation. Keep every fact, '
            + 'operator, entity, and question goal unchanged.',
        ];
        continue;
      }
      if (['UNPARSED', 'AMBIGUOUS'].includes(reparsed.status)) {
        return this.attachGrounding({
          ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
          normalization: normalizationResult({
            ...common, status: 'reparse-rejected', candidate: normalized.candidate,
            validation: normalized.validation, reparseStatus: reparsed.status,
          }),
        });
      }
      return this.attachGrounding({
        ...reparsed,
        languageRoute: 'language-agent-normalized',
        originalInput: direct.input ?? { original: text },
        normalization: normalizationResult({
          ...common, status: 'accepted', candidate: normalized.candidate,
          validation: normalized.validation, reparseStatus: reparsed.status,
        }),
      });
    }
    return this.attachGrounding({
      ...direct, status: 'UNVERIFIED_NORMALIZATION', languageRoute: 'language-agent-normalization-rejected',
      normalization: normalizationResult({
        attempted: true, triggerStatus: direct.status, status: 'proposal-limit-exhausted',
        proposalCount, proposalLimit: MAX_LANGUAGE_AGENT_PROPOSALS, externalInvocations, cacheHit,
        receipts: Object.freeze(receipts), diagnostic: 'The bounded Language Agent proposal limit was exhausted.',
      }),
    });
  }
}
