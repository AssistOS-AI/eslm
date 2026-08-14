import {
  assessEnglishLikelihood,
} from '../language/english-likelihood.mjs';
import {
  SessionContextValidationError,
  SessionInputValidationError,
  SessionResourceLimitError,
  sessionContextSnapshot,
  validateSessionRequest,
} from '../language/session.mjs';
import { assertRuntimeTextResultContract } from './result-contract.mjs';

function selectedKnowledgeBaseVersions(runtime) {
  const versions = [
    ...(runtime.model?.manifest?.knowledgeBaseVersions ?? []),
    ...(runtime.providers ?? []).map((provider) => ({
      kbId: provider.manifest?.kbId ?? provider.manifest?.id,
      version: provider.manifest?.kbVersion ?? provider.manifest?.version,
    })),
  ].filter((item) => typeof item?.kbId === 'string' && typeof item?.version === 'string');
  return Object.freeze([...new Map(versions.map((item) => [
    `${item.kbId}\0${item.version}`, Object.freeze({ kbId: item.kbId, version: item.version }),
  ])).values()].toSorted((left, right) => left.kbId.localeCompare(right.kbId)
    || left.version.localeCompare(right.version)));
}

function rejectedResult(runtime, text, context, segments, languageAssessment) {
  const selectedKbVersions = selectedKnowledgeBaseVersions(runtime);
  return assertRuntimeTextResultContract({
    protocol: 'eslm-runtime-result-v1',
    status: 'UNPARSED',
    answer: 'The local runtime accepts English input; translate this request to English before symbolic execution.',
    languageRoute: 'english-language-gate-rejected',
    values: [],
    provenance: [],
    usedKbVersions: [],
    selectedKbVersions,
    consultedKbVersions: [],
    unresolvedSubgoals: [Object.freeze({
      operation: 'translate-input-to-english',
      gap: 'likely-non-english',
    })],
    context: sessionContextSnapshot(context),
    episode: {
      original: text,
      segments,
      unsupportedStatements: segments,
      transaction: 'english-language-gate-rejected',
    },
    model: {
      id: runtime.model?.manifest?.modelId ?? 'eslm:unknown',
      knowledgeBases: runtime.selected ?? [],
      benchmarkComparable: false,
      memory: runtime.memorySnapshot?.(),
    },
    workPolicy: runtime.workPolicy,
    languageAssessment,
  });
}

export class EnglishLanguageGateRuntime {
  constructor(runtime, options = {}) {
    this.runtime = runtime;
    this.assessmentOptions = Object.freeze({ ...options });
    this.core = runtime.core;
    this.providers = runtime.providers;
    this.selected = runtime.selected;
    this.model = runtime.model;
    this.memoryPlan = runtime.memoryPlan;
    this.workPolicy = runtime.workPolicy;
  }

  memorySnapshot() { return this.runtime.memorySnapshot(); }

  score(text) { return this.runtime.score(text); }

  scorePlausibility(text) { return this.runtime.scorePlausibility(text); }

  scoreCompatibility(context, target) { return this.runtime.scoreCompatibility(context, target); }

  executeTask(task) { return this.runtime.executeTask(task); }

  executeTaskWithKnowledge(task) { return this.runtime.executeTaskWithKnowledge(task); }

  inspectLanguage(text, context = {}) { return this.runtime.inspectLanguage(text, context); }

  buildKnowledgeContext(text, context = {}) {
    return typeof this.runtime.buildKnowledgeContext === 'function'
      ? this.runtime.buildKnowledgeContext(text, context) : undefined;
  }

  askDirect(text, context = {}, executionOptions = {}) {
    return this.runtime.askDirect(text, context, executionOptions);
  }

  attachGrounding(result) { return this.runtime.attachGrounding(result); }

  async ask(text, context = {}, executionOptions = {}) {
    let languageAssessment;
    let segments;
    try {
      segments = validateSessionRequest(text, context);
      languageAssessment = assessEnglishLikelihood(text, this.assessmentOptions);
    } catch (error) {
      if (error instanceof SessionResourceLimitError
          || error instanceof SessionContextValidationError
          || error instanceof SessionInputValidationError) {
        return this.runtime.ask(text, context, executionOptions);
      }
      throw error;
    }
    if (languageAssessment.classification === 'likely-non-english') {
      return rejectedResult(this.runtime, text, context, segments, languageAssessment);
    }
    const knowledgeContextRun = executionOptions.grounding === false
      ? undefined
      : (executionOptions.knowledgeContextRun
        ?? await this.buildKnowledgeContext(text, context));
    const result = await this.runtime.ask(text, context, {
      ...executionOptions,
      ...(knowledgeContextRun ? { knowledgeContextRun } : {}),
    });
    return assertRuntimeTextResultContract({ ...result, languageAssessment });
  }
}
