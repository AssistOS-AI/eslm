import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { regressionSmokeCases, smokeCatalogSummary, smokeExamples } from '../src/conversation-smoke.mjs';

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

test('multi-thousand nonce smoke corpus is deterministic and passes without agent assistance', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const cases = regressionSmokeCases();
  assert.equal(cases.length, 4096);
  assert.equal(smokeCatalogSummary().total, 4096);
  assert.equal(new Set(cases.map((item) => item.input)).size, 4096);
  for (const item of cases) {
    if (item.kind === 'preference') {
      assert.ok(engine.score(item.good).score > engine.score(item.bad).score, item.id);
      continue;
    }
    const result = item.kind === 'task' ? engine.executeTask(item.taskFrame) : engine.ask(item.input, {});
    assert.equal(result.status, item.expectedStatus, item.id);
    assert.deepEqual(result.values ?? [], item.expectedValues ?? [], item.id);
    assert.equal(result.languageRoute, item.kind === 'task' ? 'direct-symbolic-task-adapter' : 'direct-symbolic', item.id);
  }
});

test('generic state transitions and the declarative bAbI policy solve renamed temporal and induction cases', async () => {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('babi-v1.2-language')]);
  const engine = new EslmEngine(model);
  const carried = engine.ask('Nara moved to the vault. Nara grabbed the token. Nara journeyed to the garden. Where is the token?');
  assert.deepEqual(carried.values, ['garden']);
  assert.equal(carried.languageRoute, 'direct-symbolic');
  const temporal = engine.ask('Nara moved to the vault. Nara grabbed the token. Nara journeyed to the garden. Nara moved to the hall. Where was the token before the hall?');
  assert.deepEqual(temporal.values, ['garden']);
  assert.equal(temporal.plan.methodId, 'method:core:temporal-state-predecessor');
  const induced = engine.ask('Ari is a zorb. Bela is a zorb. Cora is a zorb. Ari is yellow. Cora is green. What color is Bela?');
  assert.deepEqual(induced.values, ['green']);
  assert.equal(induced.reasoning.selection, 'latest-member');
});

test('property induction follows renamed predicate metadata instead of a benchmark relation constant', async () => {
  const model = await createCoreModel();
  model.reasoning.propertyValues = { texture: ['rough', 'smooth'] };
  model.reasoning.induction = {
    enabled: true, predicates: ['texture'], implicitPredicates: ['texture'],
    minSupport: 1, minCoverage: 0.25,
    byPredicate: { texture: { minSupport: 1, minCoverage: 0.25, selection: 'latest-member' } },
  };
  const result = new EslmEngine(model).ask(
    'Ivo is a neral. Pema is a neral. Suri is a neral. Ivo is rough. Suri is smooth. What texture is Pema?',
  );
  assert.deepEqual(result.values, ['smooth']);
  assert.equal(result.query.predicate, 'texture');
  assert.equal(result.reasoning.selection, 'latest-member');
});

test('container-state core executes a renamed semantic program without dataset surface vocabulary', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const result = engine.executeTask({
    operation: 'complete-container-contents', taskId: 'nonce-container-program',
    stateProgram: {
      schema: 'finite-relation-state-program-v1', relation: 'holds',
      initial: [
        { subject: 'vessel:orion', relation: 'holds', values: ['quartz', 'reed'] },
        { subject: 'vessel:lyra', relation: 'holds', values: [] },
      ],
      transitions: [
        { operator: 'transfer', relation: 'holds', values: ['quartz'], from: 'vessel:orion', to: 'vessel:lyra' },
        { operator: 'add', relation: 'holds', values: ['amber'], to: 'vessel:orion' },
        { operator: 'remove', relation: 'holds', values: ['reed'], from: 'vessel:orion' },
      ],
      query: { subject: 'vessel:orion', relation: 'holds' },
    },
  });
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['amber']);
  assert.equal(result.reasoning.relation, 'holds');
  assert.equal(result.plan.methodId, 'method:core:container-state-transitions');
});
