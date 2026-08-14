import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeBasicQuestions, BASIC_QUESTION_FAMILIES, buildSelfQuestionPlan,
  recognizeBasicQuestion,
} from '../src/language/basic-question-taxonomy.mjs';
import { parseFactoidQuestion } from '../src/language/factoid-question.mjs';
import { createCliRuntime } from '../src/interface/cli-runtime-composition.mjs';
import { assertRuntimeTextResultContract } from '../src/runtime/result-contract.mjs';

const FAMILY_EXAMPLES = Object.freeze([
  ['definition', 'What is a zoral?'],
  ['identity', 'Who is Nera?'],
  ['lexical-sense', 'Which meaning of bank applies?'],
  ['synonym', 'What is another word for hard?'],
  ['antonym', 'What is the opposite of hard?'],
  ['taxonomy', 'What kind of thing is a zoral?'],
  ['example', 'What is an example of a zoral?'],
  ['property', 'What properties does a zoral have?'],
  ['composition', 'What is a zoral made of?'],
  ['part-whole', 'What parts does a zoral have?'],
  ['purpose', 'What purpose does a zoral serve?'],
  ['capability', 'What can a zoral do?'],
  ['affordance', 'What can be done to a zoral?'],
  ['method', 'How do I use a zoral?'],
  ['location', 'Where is a zoral found?'],
  ['permission', 'Where is a zoral prohibited?'],
  ['requirement', 'What does a zoral require?'],
  ['cause-origin', 'What causes a zoral?'],
  ['reason', 'Why does a zoral exist?'],
  ['intent', 'What motivates a zoral?'],
  ['effect', 'What does a zoral cause?'],
  ['continuation', 'What follows a zoral?'],
  ['risk', 'What are the risks of a zoral?'],
  ['benefit', 'What are the benefits of a zoral?'],
  ['limitation', 'What are the limits of a zoral?'],
  ['agent-responsibility', 'Who controls a zoral?'],
  ['time-history', 'When does a zoral occur?'],
  ['quantity', 'How many zorals exist?'],
  ['comparison', 'How does a zoral compare with a toral?'],
  ['alternative', 'What is an alternative to a zoral?'],
  ['evidence', 'What evidence exists for a zoral?'],
  ['confidence-conflict', 'Is a zoral disputed?'],
  ['relation', 'How is a zoral related to a toral?'],
  ['change-lifecycle', 'What changed a zoral?'],
  ['stakeholder', 'Who uses a zoral?'],
]);

let wordNetRuntimePromise;

function wordNetRuntime() {
  wordNetRuntimePromise ??= createCliRuntime({
    kb: 'oewn-2025', 'no-external-language-agent': true, 'memory-policy': 'lazy',
  });
  return wordNetRuntimePromise;
}

test('the generic question taxonomy exposes one recognized nonce-renamed example for every family', () => {
  assert.equal(BASIC_QUESTION_FAMILIES.length, 35);
  assert.equal(new Set(BASIC_QUESTION_FAMILIES.map((item) => item.family)).size, 35);
  assert.deepEqual(FAMILY_EXAMPLES.map(([expected, question]) => [
    expected, recognizeBasicQuestion(question)?.family,
  ]), FAMILY_EXAMPLES.map(([family]) => [family, family]));
});

test('copular definitions are recognized without swallowing progressive or arithmetic questions', () => {
  const definition = recognizeBasicQuestion('What is a glorp?');
  assert.equal(definition.family, 'definition');
  assert.equal(definition.subjectSurface, 'glorp');
  assert.equal(recognizeBasicQuestion('What is Alice doing?'), undefined);
  assert.equal(recognizeBasicQuestion('What is 36 plus 12?'), undefined);

  const frame = parseFactoidQuestion('What is a glorp?');
  assert.equal(frame.construction, 'definition');
  assert.equal(frame.questionFamily, 'definition');
  assert.equal(frame.candidates[1].text, 'What does glorp mean?');
});

test('embedded questions retain source order and resolve only a unique adjacent topic pronoun', () => {
  const analysis = analyzeBasicQuestions(
    'Prepare a short note. What is a zoral? Where is it found? How is it used?',
  );
  assert.deepEqual(analysis.questions.map((question) => [question.family, question.subjectSurface]), [
    ['definition', 'zoral'], ['location', 'zoral'], ['method', 'zoral'],
  ]);
  assert.equal(analysis.questions[1].embedded, true);
  assert.equal(analysis.questions[1].referenceResolution, 'unique-prior-question-topic');
  assert.equal(analysis.questions[2].referenceResolution, 'unique-prior-question-topic');
  const plan = buildSelfQuestionPlan(analysis, ['zoral']);
  assert.equal(plan.questions[0].family, 'definition');
  assert.ok(plan.questions.some((question) => question.family === 'location'));
  assert.ok(plan.questions.some((question) => question.family === 'method'));
  assert.ok(plan.questions.length <= 64);
});

test('coordinated natural location questions preserve each subject as a bounded context topic', () => {
  const question = recognizeBasicQuestion('Where do zorals and velins live?');
  assert.equal(question.family, 'location');
  assert.deepEqual(question.topicSurfaces, ['zorals', 'velins']);
  const plan = buildSelfQuestionPlan(analyzeBasicQuestions(
    'Where do zorals and velins live?',
  ), []);
  assert.deepEqual(plan.topics.slice(0, 2), ['zorals', 'velins']);
  assert.deepEqual(plan.questions.filter((item) => item.disposition === 'explicit')
    .map((item) => [item.topic, item.family]), [
    ['velins', 'location'], ['zorals', 'location'],
  ]);
});

test('progressive location questions keep the possessed nominal separate from the verb', () => {
  const question = recognizeBasicQuestion('Where is her zorin living?');
  assert.equal(question.family, 'location');
  assert.equal(question.subjectSurface, 'her zorin');
  assert.doesNotMatch(question.subjectSurface, /living/u);
  const plan = buildSelfQuestionPlan(analyzeBasicQuestions(
    'Where is her zorin living?',
  ), ['her zorin living', 'zorin', 'liv', 'living']);
  assert.deepEqual(plan.topics, ['her zorin']);
});

test('a natural copular definition reaches WordNet as a precise answer and retains non-answer context', async () => {
  const runtime = await wordNetRuntime();
  const result = await runtime.ask('What is a cat?');
  assert.equal(result.status, 'SOLVED');
  assert.match(result.answer, /feline mammal/u);
  assert.equal(result.query.factoidFrame.construction, 'definition');
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'oewn-2025', version: '2025' }]);
  assert.equal(result.knowledgeContext.format, 'eslm-task-knowledge-context-v1');
  assert.equal(result.knowledgeContext.answerSupported, false);
  assert.equal(result.knowledgeContext.realization.preciseAnswerEstablished, true);
  assertRuntimeTextResultContract(result);
});

test('an unsupported precise claim becomes explicit PARTIAL context without relevance-to-truth promotion', async () => {
  const runtime = await wordNetRuntime();
  const result = await runtime.ask('Is a cat blue?');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
  assert.match(result.answer, /could not establish a precise answer/u);
  assert.match(result.answer, /provide context; they do not establish the missing conclusion/u);
  assert.deepEqual(result.values, []);
  assert.ok(result.provenance.length > 0);
  assert.ok(result.provenance.every((item) => item.sourceClaim === true
    && item.method === 'query-local-contextual-source-realization'));
  assert.equal(result.knowledgeContext.answerSupported, false);
  assert.equal(result.knowledgeContext.premiseAuthority, 'none');
  assert.equal(result.knowledgeContext.interpretationAuthority, 'none');
  assert.equal(result.knowledgeContext.realization.preciseAnswerEstablished, false);
  assertRuntimeTextResultContract(result);
});

test('context never treats a known constituent as the unknown requested entity', async () => {
  const runtime = await createCliRuntime({
    kb: 'quick', 'no-external-language-agent': true,
  });
  const result = await runtime.ask('Can fake Penguin swim?');
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.values ?? [], []);
  assert.deepEqual(result.provenance, []);
  assert.ok(result.knowledgeContext.entries.some((entry) => entry.statement === 'Penguin can swim.'));
  assert.equal(result.knowledgeContext.realization.status, 'context-only');
  assert.equal(result.knowledgeContext.realization.answerAuthority, 'none');
  assertRuntimeTextResultContract(result);
});

test('the task-context extension is closed under result validation and grounding false remains an explicit opt-out', async () => {
  const runtime = await wordNetRuntime();
  const result = await runtime.ask('What is a cat?');
  const mutated = structuredClone(result);
  mutated.knowledgeContext.answerSupported = true;
  assert.throws(() => assertRuntimeTextResultContract(mutated),
    /deny answer, premise, and interpretation authority/u);

  const local = runtime.runtime.runtime;
  const withoutContext = await local.ask('What is a cat?', {}, { grounding: false });
  assert.equal(withoutContext.knowledgeContext, undefined);
});

test('explicit assisted all-KB context fallback preserves the pre-context status without invoking normalization', async () => {
  const runtime = await createCliRuntime({
    kb: 'all', 'memory-policy': 'lazy', 'external-language-agent': true,
  });
  const result = await runtime.ask('Where do people and cats live?');
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.languageRoute, 'knowledge-context-fallback');
  assert.deepEqual(result.knowledgeContext.questionAnalysis.questions[0].topicSurfaces,
    ['people', 'cats']);
  assert.equal(result.knowledgeContext.realization.originalStatus, 'UNKNOWN');
  assert.deepEqual(result.normalization, {
    protocol: 'eslm-language-agent-normalization-result-v1',
    attempted: false,
    triggerStatus: 'UNKNOWN',
  });
  assert.match(result.answer, /“cats” with “lap”/u);
  assert.doesNotMatch(result.answer, /“people”: “anus”|“cat”: “africa”|bisexuals|Çat/u);
  assertRuntimeTextResultContract(result);
});

test('a common noun cannot surface a Unicode-folded proper place in contextual fallback', async () => {
  const runtime = await createCliRuntime({
    kb: 'all', 'memory-policy': 'lazy', 'no-external-language-agent': true,
  });
  const result = await runtime.ask(
    'Mircea is a women. Sje lives in Syndnei. She has many cats worldwide. Where are her cats living?',
  );
  assert.equal(result.status, 'PARTIAL');
  assert.doesNotMatch(result.answer, /Çat|populated place in Turkey/u);
  assert.ok(!result.knowledgeContext.entries.some((entry) => entry.semantic?.name === 'Çat'));
  const receipt = result.knowledgeContext.search.receipts.find((item) => item.kbId === 'geonames-2026');
  assert.equal(receipt.status, 'no-match');
  assert.match(receipt.diagnostic, /not typed as proper names/u);
  assert.ok(result.knowledgeContext.focus.candidates.some((candidate) =>
    candidate.term === 'cat' && candidate.role === 'content'));
  assertRuntimeTextResultContract(result);
});
