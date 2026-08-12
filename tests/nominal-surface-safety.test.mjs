import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeNominalSurface, boundedNominalSurface, NOMINAL_SURFACE_LIMITS,
} from '../src/language/nominal-surface.mjs';
import { createCoreModel, serializedIndexes } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';

test('bounded nominal analysis preserves multiword surfaces but rejects protected clause material', () => {
  assert.equal(boundedNominalSurface('the silver river guide'), 'silver river guide');
  assert.equal(boundedNominalSurface('University of the Arts'), 'university of the arts');

  for (const surface of [
    'guide and navigator', 'guide or navigator', 'guide before dawn', 'not guide',
    'every guide', 'guide because ravin waits', 'guide is ready',
  ]) {
    const analysis = analyzeNominalSurface(surface);
    assert.equal(analysis.accepted, false, surface);
    assert.equal(analysis.reason, 'protected-cue', surface);
  }

  const oversized = Array.from(
    { length: NOMINAL_SURFACE_LIMITS.maximumTokens + 1 }, (_, index) => `n${index}`,
  ).join(' ');
  assert.equal(analyzeNominalSurface(oversized).reason, 'token-limit');
});

test('assertion and query class positions reject opaque protected surfaces transactionally', async () => {
  const engine = new EslmEngine(await createCoreModel());
  const positive = engine.ask(
    'Vela Quorin is a silver river guide. Is Vela Quorin a silver river guide?',
  );
  assert.equal(positive.status, 'SOLVED');
  assert.deepEqual(positive.values, [true]);

  const classSurfaces = [
    'silver guide and navigator',
    'silver guide or navigator',
    'silver guide before dawn',
    'not silver guide',
    'every silver guide',
    'silver guide because Ravin waits',
    'silver guide is ready',
  ];
  for (const classSurface of classSurfaces) {
    const rejectedAssertion = engine.ask(`Tavra Nolin is a ${classSurface}.`);
    assert.equal(rejectedAssertion.status, 'UNPARSED', classSurface);
    assert.deepEqual(rejectedAssertion.context.session.entities, [], classSurface);
    assert.deepEqual(rejectedAssertion.context.session.facts, [], classSurface);

    const rejectedQuery = engine.ask(
      `Is Vela Quorin a ${classSurface}?`, positive.context,
    );
    assert.equal(rejectedQuery.status, 'UNPARSED', classSurface);
    assert.deepEqual(rejectedQuery.values ?? [], [], classSurface);
    assert.equal(rejectedQuery.context.session.facts.length, 1, classSurface);

    const rejectedRule = engine.ask(`Every ${classSurface} glims vepa.`);
    assert.equal(rejectedRule.status, 'UNPARSED', classSurface);
    assert.deepEqual(rejectedRule.context.session.rules, [], classSurface);
  }
});

test('assertion subjects reject protected material without leaving provisional entities', async () => {
  const engine = new EslmEngine(await createCoreModel());
  assert.equal(engine.ask('Vela Quorin can glide.').status, 'SOLVED');
  for (const subjectSurface of [
    'Vela and Quorin', 'Vela or Quorin', 'Vela before dawn', 'not Vela', 'every Vela',
    'Vela because Quorin waits', 'Vela is ready',
  ]) {
    const result = engine.ask(`${subjectSurface} can glide.`);
    assert.equal(result.status, 'UNPARSED', subjectSurface);
    assert.deepEqual(result.context.session.entities, [], subjectSurface);
    assert.deepEqual(result.context.session.facts, [], subjectSurface);
  }
});

test('entity lookup is exact after one licensed leading determiner and never resolves an alias suffix', async () => {
  const model = await createCoreModel();
  model.entities = [
    { id: 'cobalt-heron', names: ['The Cobalt Heron'], kind: 'entity' },
    { id: 'amber-lynx', names: ['Amber Lynx'], kind: 'entity' },
  ];
  model.facts = [
    {
      id: 'fact:nonce:cobalt-glide', subject: 'cobalt-heron', predicate: 'can', value: 'glide',
      provenance: ['prov:nonce:renamed'],
    },
    {
      id: 'fact:nonce:amber-pivot', subject: 'amber-lynx', predicate: 'can', value: 'pivot',
      provenance: ['prov:nonce:renamed'],
    },
  ];
  model.indexes = serializedIndexes(model.facts);
  const engine = new EslmEngine(model);

  for (const [alias, ability] of [['Cobalt Heron', 'glide'], ['Amber Lynx', 'pivot']]) {
    assert.equal(engine.ask(`Can ${alias} ${ability}?`).status, 'SOLVED', alias);
    assert.equal(engine.ask(`Can the ${alias} ${ability}?`).status, 'SOLVED', alias);
    for (const prefix of ['counterfeit', 'definitely', 'not', 'every']) {
      const result = engine.ask(`Can ${prefix} ${alias} ${ability}?`);
      assert.notEqual(result.status, 'SOLVED', `${prefix} ${alias}`);
      assert.deepEqual(result.values ?? [], [], `${prefix} ${alias}`);
    }
  }
  assert.equal(engine.ask('Can Cobalt Heron pivot?').status, 'UNKNOWN');
  assert.equal(engine.ask('Can Amber Lynx glide?').status, 'UNKNOWN');
  assert.notEqual(engine.ask('Can Cobalt Heran glide?').status, 'SOLVED');
});

test('QUICK aliases do not absorb modifiers or protected operators from the subject span', async () => {
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  const core = new EslmEngine(model);
  const runtime = new HeuristicLanguageRuntime(
    new EslmRuntime(core, [], ['quick'], undefined, core.workPolicy),
  );
  assert.equal((await runtime.ask('Can Penguin swim?')).status, 'SOLVED');
  assert.equal((await runtime.ask('Is Penguin a bird?')).status, 'SOLVED');

  for (const input of [
    'Can fake Penguin swim?',
    'Can not Penguin swim?',
    'Can definitely Penguin swim?',
    'Is not Penguin a bird?',
  ]) {
    const result = await runtime.ask(input);
    assert.notEqual(result.status, 'SOLVED', input);
    assert.deepEqual(result.values ?? [], [], input);
    assert.equal(result.provenance.length, 0, input);
  }
});
