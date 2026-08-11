import { grammarScore, normalizeInput } from '../language/normalization.mjs';
import { parseQuestion } from '../language/parser.mjs';
import {
  abduceExplanations, answerQuery, deriveClosure, deriveInductiveFacts, indexFacts,
} from '../reasoning/datalog.mjs';
import { realize } from '../language/realizer.mjs';
import { compileSessionEpisode, modelWithSession } from '../language/session.mjs';
import { ExecutionProfiler } from '../profiling.mjs';
import { CapabilityRegistry, CORE_METHOD_DESCRIPTORS } from '../reasoning/capability-registry.mjs';
import { capabilityGap, createPlan, taskFrameFromQuery } from '../reasoning/planner.mjs';

export class EslmEngine {
  constructor(model, options = {}) {
    this.model = model;
    this.profileEnabled = Boolean(options.profile);
    this.capabilities = new CapabilityRegistry()
      .register(CORE_METHOD_DESCRIPTORS.datalog, () => undefined)
      .register(CORE_METHOD_DESCRIPTORS.induction, () => undefined)
      .register(CORE_METHOD_DESCRIPTORS.abduction, () => undefined);
    const profiler = new ExecutionProfiler('engine-initialization', this.profileEnabled, {
      modelId: model.manifest.modelId,
    });
    this.facts = profiler.measureSync('reasoning.full-closure', () => deriveClosure(model), {
      directFacts: model.facts.length, rules: model.rules.length,
    });
    profiler.annotate('reasoning.full-closure', { closureFacts: this.facts.length });
    this.index = profiler.measureSync('retrieval.build-index', () => indexFacts(this.facts), {
      facts: this.facts.length,
    });
    this.initializationProfile = profiler.finish('ok', {
      entities: model.entities.length,
      directFacts: model.facts.length,
      closureFacts: this.facts.length,
    });
  }

  ask(text, context = {}) {
    const profiler = new ExecutionProfiler('query', this.profileEnabled, {
      modelId: this.model.manifest.modelId, inputCharacters: text.length,
    });
    const complete = (response) => this.#profiled(response, profiler);
    const episode = profiler.measureSync(
      'language.compile-session', () => compileSessionEpisode(text, this.model, context),
    );
    profiler.annotate('language.compile-session', {
      segments: episode.segments.length,
      sessionFacts: episode.session.facts.length,
      sessionRules: episode.session.rules.length,
    });
    const activeModel = profiler.measureSync(
      'model.session-overlay', () => modelWithSession(this.model, episode.session),
    );
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
        answer: 'I could not interpret that as a supported statement or question yet. Try /examples for forms I can execute.',
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
      'language.parse-question', () => parseQuestion(normalized, activeModel, context),
    );
    if (query.status) {
      return complete({
        status: query.status,
        answer: query.status === 'AMBIGUOUS'
          ? 'The question matches more than one known entity.'
          : query.status === 'UNKNOWN'
            ? `I understand the question, but I do not know “${query.missingEntity}” in the active session or loaded knowledge bases.`
            : 'I do not know how to handle that kind of question yet. Try /examples to see the question families I can execute.',
        input: normalized,
        query,
        provenance: [],
        learned: episode.learned,
        learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'system-identity') {
      return complete({
        status: 'ANSWERED',
        answer: 'I am ESLM, an offline executable symbolic language model. I answer by running generated knowledge and explicit reasoning rules, without calling an LLM at runtime.',
        values: ['eslm'], provenance: [], reasoning: { method: 'system-description' }, query,
        input: normalized, learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'user-identity') {
      return complete({
        status: 'UNKNOWN',
        answer: 'I do not know who you are from this session yet. You can tell me a supported fact about yourself, but I will not guess your identity.',
        values: [], provenance: [], reasoning: { method: 'epistemic-abstention' }, query,
        input: normalized, learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    if (query.intent === 'system-capabilities') {
      return complete({
        status: 'ANSWERED',
        answer: 'I can learn bounded session facts, retrieve loaded knowledge, run explicit deduction and configured induction, return defeasible event candidates, and show provenance. Use /examples for tested questions and /kbs for available knowledge.',
        values: ['session-learning', 'retrieval', 'deduction', 'induction', 'provenance'],
        provenance: [], reasoning: { method: 'system-description' }, query, input: normalized,
        learned: episode.learned, learnedRules: episode.learnedRules,
        context: { ...context, session: episode.session },
        episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
      });
    }
    const taskFrame = taskFrameFromQuery(query, {
      assertions: episode.session.facts.map((fact) => fact.id),
      contextStack: ['context:runtime:baseline', ...(episode.session.facts.length > 0 ? ['context:session:current'] : [])],
    });
    const plan = createPlan(taskFrame, this.capabilities);
    if (plan.status === 'NO_APPLICABLE_METHOD') {
      return complete({
        status: 'NO_APPLICABLE_METHOD', answer: 'The input was understood, but no registered method can solve the requested subproblem.',
        input: normalized, query, taskFrame, plan, capabilityGap: capabilityGap(taskFrame, plan),
        values: [], provenance: [], context: { ...context, session: episode.session },
      });
    }
    const activeFacts = episode.session.facts.length > 0
      ? profiler.measureSync('reasoning.session-closure', () => deriveClosure(activeModel), {
        directFacts: activeModel.facts.length, rules: activeModel.rules.length,
      }) : this.facts;
    if (episode.session.facts.length > 0) {
      profiler.annotate('reasoning.session-closure', { closureFacts: activeFacts.length });
    }
    if (query.reasoning === 'abduction') {
      const hypotheses = profiler.measureSync('reasoning.abduction', () => abduceExplanations(
        query, activeFacts, activeModel.rules, activeModel.reasoning?.abduction?.maxHypotheses,
      ), { facts: activeFacts.length, rules: activeModel.rules.length });
      const result = {
        values: hypotheses.map((hypothesis) => hypothesis.id),
        evidence: hypotheses,
        hypotheses,
      };
      return complete(this.#response({
        text, context, episode, activeModel, normalized, query, result, taskFrame, plan,
        status: hypotheses.length > 0 ? 'ABDUCTIVE' : 'UNKNOWN',
        reasoning: { method: 'abduction', candidateCount: hypotheses.length },
      }, profiler));
    }
    const inducedFacts = query.reasoning === 'induction'
      ? profiler.measureSync('reasoning.induction', () => deriveInductiveFacts(activeModel, activeFacts), {
        facts: activeFacts.length,
      }) : [];
    const activeIndex = inducedFacts.length > 0
      ? profiler.measureSync('retrieval.query-index', () => indexFacts([...activeFacts, ...inducedFacts]), {
        facts: activeFacts.length + inducedFacts.length,
      })
      : episode.session.facts.length > 0
        ? profiler.measureSync('retrieval.query-index', () => indexFacts(activeFacts), { facts: activeFacts.length })
        : this.index;
    const result = profiler.measureSync('retrieval.answer', () => answerQuery(query, activeIndex));
    profiler.annotate('retrieval.answer', { values: result.values.length, evidence: result.evidence.length });
    const inferred = result.evidence.find((fact) => fact.reasoning === 'induction');
    const derived = result.evidence.filter((fact) => fact.reasoning === 'deduction');
    return complete(this.#response({
      text, context, episode, activeModel, normalized, query, result, taskFrame, plan,
      status: result.values.length === 0 ? 'UNKNOWN' : inferred ? 'INDUCTIVE' : 'ANSWERED',
      reasoning: inferred ? {
        method: 'induction', confidence: inferred.confidence, ...inferred.induction,
      } : {
        method: derived.length > 0 ? 'deduction' : 'retrieval',
        depth: Math.max(0, ...derived.map((fact) => fact.depth ?? 0)),
      },
    }, profiler));
  }

  #response({ text, context, episode, activeModel, normalized, query, result, status, reasoning, taskFrame, plan }, profiler) {
    const evidence = result.evidence.map((fact) => ({
      fact: fact.id,
      source: fact.provenance ?? (fact.ruleSource ? [fact.ruleSource] : []),
      rule: fact.rule,
      support: fact.support,
      observation: fact.observation,
      hypotheses: fact.hypotheses,
      confidence: fact.confidence ?? fact.score,
      method: fact.reasoning,
    }));
    return {
      status,
      answer: profiler.measureSync(
        'language.realize', () => realize(query, result, activeModel, normalized.language),
      ),
      input: normalized,
      query,
      taskFrame,
      plan: { methodId: plan?.methodId, steps: plan?.steps },
      values: result.values,
      provenance: evidence,
      reasoning,
      hypotheses: result.hypotheses,
      learned: episode.learned,
      learnedRules: episode.learnedRules,
      context: {
        ...context,
        session: episode.session,
        lastEntity: query.subject
          ?? (activeModel.entities.some((entity) => entity.id === query.object) ? query.object : undefined)
          ?? context.lastEntity,
      },
      episode: { original: text, segments: episode.segments, unsupportedStatements: episode.unsupportedStatements },
    };
  }

  #profiled(response, profiler) {
    const statusMap = {
      ANSWERED: 'SOLVED', LEARNED: 'SOLVED', INDUCTIVE: 'SOLVED', ABDUCTIVE: 'SOLVED',
      UNSUPPORTED: 'UNPARSED',
    };
    const status = statusMap[response.status] ?? response.status;
    const annotated = {
      ...response,
      protocol: 'eslm-runtime-result-v1',
      status,
      languageRoute: 'direct-symbolic',
      usedKbVersions: (this.model.manifest.knowledgeBases ?? []).map((id) => ({ kbId: id })),
      unresolvedSubgoals: response.capabilityGap ? [response.capabilityGap] : [],
      model: {
        id: this.model.manifest.modelId,
        knowledgeBases: this.model.manifest.knowledgeBases ?? [],
        benchmarkComparable: this.model.manifest.benchmarkComparable !== false,
      },
    };
    if (!this.profileEnabled) return annotated;
    return {
      ...annotated,
      profile: {
        initialization: this.initializationProfile,
        query: profiler.finish(response.status, {
          resultValues: response.values?.length ?? 0,
          provenanceItems: response.provenance?.length ?? 0,
        }),
      },
    };
  }

  score(text) {
    return grammarScore(text, this.model);
  }
}
