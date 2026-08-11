import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { smokeExamples } from '../src/conversation-smoke.mjs';

test('runtime compiles session language, plans deduction, and emits a proof-bearing result', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const result = engine.ask('Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?');
  assert.equal(result.protocol, 'eslm-runtime-result-v1');
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['wolf']);
  assert.equal(result.taskFrame.languageRoute, 'direct-symbolic');
  assert.equal(result.plan.methodId, 'method:core:safe-horn-deduction');
  assert.equal(result.provenance[0].support[0], 'session:f0');
});

test('unsupported language is UNPARSED and missing evidence is UNKNOWN', async () => {
  const engine = new EslmEngine(await createCoreModel());
  assert.equal(engine.ask('Write a poem about rain.').status, 'UNPARSED');
  const learned = engine.ask('Ada is a person.');
  assert.equal(engine.ask('Can Ada fly?', learned.context).status, 'UNKNOWN');
});

test('selected QUICK package supplies declarative facts and safe rules', async () => {
  const engine = new EslmEngine(mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]));
  assert.equal(engine.ask('Can Penguin swim?').status, 'SOLVED');
  const result = engine.ask('Jhon is a man. Is Jhon going to die?');
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.reasoning.depth, 3);
});

test('interactive smoke catalog agrees with the implemented base and QUICK runtime', async () => {
  const engine = new EslmEngine(mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]));
  const cases = smokeExamples({ seed: 'test', maxPerGroup: 100 })
    .filter((item) => ['base', 'quick'].includes(item.kb));
  for (const item of cases) {
    const result = engine.ask(item.input, {});
    assert.equal(result.status, item.expectedStatus, item.id);
    if (item.expectedValues !== undefined) assert.deepEqual(result.values ?? [], item.expectedValues, item.id);
  }
});
