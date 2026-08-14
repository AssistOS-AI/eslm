import { BASIC_QUESTION_FAMILIES } from '../language/basic-question-taxonomy.mjs';
import { assertGroundingExtension } from './result-grounding-contract.mjs';
import {
  array, boolean, boundedJson, integer, kbIdentityArray, record, string, stringArray, text,
} from './result-payload-shapes.mjs';
import { assertResultStrategySelection } from './result-strategy-contract.mjs';

const CONTEXT_FORMAT = 'eslm-task-knowledge-context-v1';
const CONTEXT_STATUSES = new Set(['CONTEXT_FOUND', 'NO_CONTEXT_FOUND', 'CONTEXT_INCOMPLETE']);
const QUESTION_ANALYSIS_FORMAT = 'eslm-basic-question-analysis-v1';
const QUESTION_FAMILIES = new Set([
  ...BASIC_QUESTION_FAMILIES.map((family) => family.family), 'open', 'unresolved',
]);
const REALIZATION_STATUSES = new Set(['context-only', 'contextual-fallback']);

function questionAnalysis(value) {
  const analysis = record(value, 'Runtime result knowledgeContext.questionAnalysis');
  if (analysis.format !== QUESTION_ANALYSIS_FORMAT || analysis.taxonomyVersion !== '1') {
    throw new TypeError(`Task context question analysis must use ${QUESTION_ANALYSIS_FORMAT}.`);
  }
  const questions = array(analysis.questions,
    'Runtime result knowledgeContext.questionAnalysis.questions', 16);
  const ids = new Set();
  let previousEnd = -1;
  questions.forEach((question, index) => {
    const path = `Runtime result knowledgeContext.questionAnalysis.questions[${index}]`;
    const item = record(question, path);
    string(item.questionId, `${path}.questionId`, 64);
    if (ids.has(item.questionId)) throw new TypeError('Task context question IDs must be unique.');
    ids.add(item.questionId);
    const span = record(item.sourceSpan, `${path}.sourceSpan`);
    integer(span.start, `${path}.sourceSpan.start`, 65_536);
    integer(span.end, `${path}.sourceSpan.end`, 65_536, span.start);
    if (span.start < previousEnd) throw new TypeError('Task context question spans must follow source order.');
    previousEnd = span.end;
    boolean(item.embedded, `${path}.embedded`);
    string(item.family, `${path}.family`, 64);
    if (!QUESTION_FAMILIES.has(item.family)) {
      throw new TypeError(`${path}.family is absent from the basic-question taxonomy.`);
    }
    for (const field of ['construction', 'surface']) {
      string(item[field], `${path}.${field}`, field === 'surface' ? 4_096 : 480);
    }
    for (const field of ['relationSurface', 'subjectSurface', 'direction', 'wh']) {
      if (item[field] !== undefined) string(item[field], `${path}.${field}`, 480);
    }
    if (item.objectSurface !== undefined) text(item.objectSurface, `${path}.objectSurface`, 480);
    if (item.topicSurfaces !== undefined) {
      stringArray(item.topicSurfaces, `${path}.topicSurfaces`, 8, 480);
      if (item.topicSurfaces.length < 2 || new Set(item.topicSurfaces).size !== item.topicSurfaces.length
        || item.subjectSurface === undefined) {
        throw new TypeError(`${path}.topicSurfaces must contain distinct coordinated subjects.`);
      }
    }
    if (item.canonicalCandidates !== undefined) {
      stringArray(item.canonicalCandidates, `${path}.canonicalCandidates`, 8, 1_024);
    }
    if (item.referenceResolution !== undefined) {
      string(item.referenceResolution, `${path}.referenceResolution`, 120);
    }
  });
  for (const field of ['observedQuestionSurfaces', 'retainedQuestionSurfaces', 'omittedQuestionSurfaces']) {
    integer(analysis[field], `Runtime result knowledgeContext.questionAnalysis.${field}`, 65_536);
  }
  boolean(analysis.complete, 'Runtime result knowledgeContext.questionAnalysis.complete');
  if (analysis.retainedQuestionSurfaces !== questions.length
    || analysis.observedQuestionSurfaces
      !== analysis.retainedQuestionSurfaces + analysis.omittedQuestionSurfaces
    || analysis.complete && analysis.omittedQuestionSurfaces !== 0) {
    throw new TypeError('Task context question analysis accounting is inconsistent.');
  }
  return analysis;
}

function selfQuestionPlan(value) {
  const plan = record(value, 'Runtime result knowledgeContext.selfQuestionPlan');
  if (plan.strategy !== 'question-facet-expansion-v1') {
    throw new TypeError('Task context self-question plan has an unsupported strategy.');
  }
  const topics = array(plan.topics, 'Runtime result knowledgeContext.selfQuestionPlan.topics', 8);
  stringArray(topics, 'Runtime result knowledgeContext.selfQuestionPlan.topics', 8, 480);
  if (new Set(topics).size !== topics.length) throw new TypeError('Task context topics must be unique.');
  const questions = array(plan.questions,
    'Runtime result knowledgeContext.selfQuestionPlan.questions', 64);
  const ids = new Set();
  questions.forEach((question, index) => {
    const path = `Runtime result knowledgeContext.selfQuestionPlan.questions[${index}]`;
    const item = record(question, path);
    string(item.selfQuestionId, `${path}.selfQuestionId`, 64);
    if (ids.has(item.selfQuestionId)) throw new TypeError('Task context self-question IDs must be unique.');
    ids.add(item.selfQuestionId);
    string(item.topic, `${path}.topic`, 480);
    if (!topics.includes(item.topic)) throw new TypeError(`${path}.topic is absent from the topic list.`);
    string(item.family, `${path}.family`, 64);
    if (!QUESTION_FAMILIES.has(item.family)) {
      throw new TypeError(`${path}.family is absent from the basic-question taxonomy.`);
    }
    string(item.relationSurface, `${path}.relationSurface`, 480);
    if (!['explicit', 'explicit-related-topic', 'default-context'].includes(item.disposition)) {
      throw new TypeError(`${path}.disposition is unsupported.`);
    }
    integer(item.priority, `${path}.priority`, 1_000_000);
    text(item.canonicalQuestion, `${path}.canonicalQuestion`, 1_024);
  });
  integer(plan.observedQuestions, 'Runtime result knowledgeContext.selfQuestionPlan.observedQuestions', 65_536);
  integer(plan.omittedQuestions, 'Runtime result knowledgeContext.selfQuestionPlan.omittedQuestions', 65_536);
  boolean(plan.complete, 'Runtime result knowledgeContext.selfQuestionPlan.complete');
  if (plan.observedQuestions !== questions.length + plan.omittedQuestions
    || plan.complete && plan.omittedQuestions !== 0) {
    throw new TypeError('Task context self-question accounting is inconsistent.');
  }
  return plan;
}

function realization(value, context) {
  const receipt = record(value, 'Runtime result knowledgeContext.realization');
  if (!REALIZATION_STATUSES.has(receipt.status)) {
    throw new TypeError('Task context realization has an unsupported status.');
  }
  string(receipt.originalStatus, 'Runtime result knowledgeContext.realization.originalStatus', 80);
  stringArray(receipt.realizedEntryIds,
    'Runtime result knowledgeContext.realization.realizedEntryIds', 4, 768);
  if (!['none', 'source-claim-only'].includes(receipt.answerAuthority)) {
    throw new TypeError('Task context realization answer authority is unsupported.');
  }
  boolean(receipt.preciseAnswerEstablished,
    'Runtime result knowledgeContext.realization.preciseAnswerEstablished');
  const entryIds = new Set(context.entries.map((entry) =>
    `${entry.kbId}@${entry.kbVersion}:${entry.recordId}`));
  if (receipt.realizedEntryIds.some((identity) => !entryIds.has(identity))) {
    throw new TypeError('Task context realization cites an entry absent from its context frontier.');
  }
  if ((receipt.status === 'contextual-fallback') !== (receipt.answerAuthority === 'source-claim-only')
    || receipt.preciseAnswerEstablished && receipt.status === 'contextual-fallback') {
    throw new TypeError('Task context realization status contradicts its authority declaration.');
  }
}

export function assertKnowledgeContextExtension(value, result) {
  const context = record(value, 'Runtime result knowledgeContext');
  if (context.format !== CONTEXT_FORMAT || !CONTEXT_STATUSES.has(context.status)) {
    throw new TypeError(`Runtime result knowledgeContext must use ${CONTEXT_FORMAT} and a supported status.`);
  }
  if (context.answerSupported !== false || context.premiseAuthority !== 'none'
    || context.interpretationAuthority !== 'none') {
    throw new TypeError('Task context must deny answer, premise, and interpretation authority.');
  }
  const strategy = record(context.strategy, 'Runtime result knowledgeContext.strategy');
  if (strategy.stage !== 'runtime.context.construct'
    || strategy.identity !== 'strategy:context:question-facet-expansion@1'
    || strategy.implementationState !== 'instrumented-local') {
    throw new TypeError('Task context strategy identity or implementation state is unsupported.');
  }
  assertResultStrategySelection({
    mode: strategy.mode,
    identities: strategy.selection,
    stage: strategy.stage,
    result,
    path: 'Runtime result knowledgeContext strategy selection',
  });
  text(context.queryText, 'Runtime result knowledgeContext.queryText', 4_096);
  const analysis = questionAnalysis(context.questionAnalysis);
  const selfQuestions = selfQuestionPlan(context.selfQuestionPlan);
  kbIdentityArray(context.selectedKbVersions,
    'Runtime result knowledgeContext.selectedKbVersions', 256, true);
  kbIdentityArray(context.consultedKbVersions,
    'Runtime result knowledgeContext.consultedKbVersions', 256, true);
  const selected = new Set(context.selectedKbVersions.map((item) => `${item.kbId}\0${item.version}`));
  if (context.consultedKbVersions.some((item) => !selected.has(`${item.kbId}\0${item.version}`))) {
    throw new TypeError('Task context consulted KBs must be a subset of selected KBs.');
  }

  const groundingStatus = context.entries.length > 0 ? 'RELATED_EVIDENCE_FOUND'
    : context.search.complete ? 'NO_RELATED_EVIDENCE' : 'SEARCH_INCOMPLETE';
  assertGroundingExtension({
    format: 'eslm-grounding-bundle-v1',
    status: groundingStatus,
    triggerStatus: 'UNKNOWN',
    queryText: context.queryText,
    answerSupported: false,
    interpretation: 'Task-context validation projection; related evidence is not an answer.',
    focus: context.focus,
    search: context.search,
    entries: context.entries,
    limits: context.limits,
  }, {
    ...result,
    status: 'UNKNOWN',
    languageRoute: 'task-context-contract-validation',
    requestPlanning: undefined,
  });

  const completeness = record(context.completeness, 'Runtime result knowledgeContext.completeness');
  for (const field of ['questions', 'selfQuestions', 'focus', 'retrieval', 'complete']) {
    boolean(completeness[field], `Runtime result knowledgeContext.completeness.${field}`);
  }
  if (completeness.questions !== analysis.complete
    || completeness.selfQuestions !== selfQuestions.complete
    || completeness.focus !== context.search.termSelectionComplete
    || completeness.retrieval !== context.search.complete
    || completeness.complete !== (analysis.complete && selfQuestions.complete && context.search.complete)) {
    throw new TypeError('Task context completeness contradicts its component receipts.');
  }
  const expectedStatus = context.entries.length > 0 ? 'CONTEXT_FOUND'
    : context.search.complete ? 'NO_CONTEXT_FOUND' : 'CONTEXT_INCOMPLETE';
  if (context.status !== expectedStatus) {
    throw new TypeError('Task context status contradicts its evidence and search receipt.');
  }
  realization(context.realization, context);
  boundedJson(context, 'Runtime result knowledgeContext', 2_097_152);
  return context;
}
