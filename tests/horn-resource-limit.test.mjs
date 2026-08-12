import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { deriveClosure } from '../src/reasoning/datalog.mjs';

function chainedModel(maxRounds) {
  return createCoreModel().then((model) => ({
    ...model,
    rules: [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `rule:nonce:${index}`,
        when: [['?entity', 'is_a', `level-${index}`]],
        then: ['?entity', 'is_a', `level-${index + 1}`],
        source: `source:nonce:${index}`,
      })),
      {
        id: 'rule:nonce:final', when: [['?entity', 'is_a', 'level-8']],
        then: ['?entity', 'can', 'fly'], source: 'source:nonce:final',
      },
    ],
    reasoning: { ...model.reasoning, deduction: { ...model.reasoning.deduction, maxRounds } },
  }));
}

test('Horn round exhaustion is RESOURCE_LIMIT rather than a false UNKNOWN', async () => {
  const bounded = new EslmEngine(await chainedModel(8)).ask(
    'Zara is a level-0. Can Zara fly?',
  );
  assert.equal(bounded.status, 'RESOURCE_LIMIT');
  assert.equal(bounded.values.length, 0);
  assert.ok(bounded.reasoning.frontierSize > 0);
  assert.match(bounded.unresolvedSubgoals[0].diagnostic, /round limit/u);

  const complete = new EslmEngine(await chainedModel(9)).ask(
    'Zara is a level-0. Can Zara fly?',
  );
  assert.equal(complete.status, 'SOLVED');
  assert.deepEqual(complete.values, [true]);
});

test('Horn bounds reject an oversized initial inventory and malformed limit values', async () => {
  const model = await createCoreModel();
  model.entities = [
    { id: 'entity:zara', names: ['Zara'], kind: 'entity' },
    { id: 'entity:mira', names: ['Mira'], kind: 'entity' },
  ];
  model.facts = [
    { id: 'fact:nonce:1', subject: 'zara', predicate: 'is_a', object: 'pilot' },
    { id: 'fact:nonce:2', subject: 'mira', predicate: 'is_a', object: 'pilot' },
  ];
  model.reasoning = {
    ...model.reasoning,
    deduction: { ...model.reasoning.deduction, maximumFacts: 1 },
  };

  const closure = deriveClosure(model);
  assert.equal(closure.complete, false);
  assert.equal(closure.facts.length, 2);
  assert.equal(closure.frontierSize, 1);
  assert.match(closure.diagnostic, /initial fact inventory 2 exceeds its 1-fact budget/u);

  const result = new EslmEngine(model).ask('Can Zara fly?');
  assert.equal(result.status, 'RESOURCE_LIMIT');
  assert.match(result.unresolvedSubgoals[0].diagnostic, /initial fact inventory/u);

  assert.throws(() => deriveClosure(model, { maximumFacts: -1 }), /non-negative safe integer/u);
  assert.throws(() => deriveClosure(model, { maxRounds: 0.5 }), /non-negative safe integer/u);
  assert.throws(() => deriveClosure(model, { maximumJoinAttempts: Number.POSITIVE_INFINITY }),
    /non-negative safe integer/u);
});
