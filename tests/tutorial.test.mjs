import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/engine.mjs';
import { loadModel } from '../src/model-loader.mjs';

const engine = new EslmEngine(await loadModel());

const examples = [
  ['Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?', 'ANSWERED', ['wolf'], 'Gertrude is afraid of wolf.'],
  ['Cats are afraid of sheep. Jessica is a cat. Waht is Jessica afraid of?', 'ANSWERED', ['sheep'], 'Jessica is afraid of sheep.'],
  ['Dana is a sparrow. Can Dana fly?', 'UNKNOWN', [], 'I understand the question, but I do not have evidence for a yes or no answer.'],
  ['Write a poem about mice.', 'UNSUPPORTED', undefined, 'I could not interpret that as a supported statement or question yet. Try /examples for forms I can execute.'],
];

test('CLI tutorial examples match the promoted model', () => {
  for (const [input, status, values, answer] of examples) {
    const result = engine.ask(input);
    assert.equal(result.status, status, input);
    if (values !== undefined) assert.deepEqual(result.values, values, input);
    assert.equal(result.answer, answer, input);
  }
});

test('CLI tutorial discourse example uses explicit returned context', () => {
  const first = engine.ask('Mice are afraid of wolves. Gertrude is a mouse.');
  const second = engine.ask('What is Gertrude afraid of?', first.context);
  assert.equal(second.answer, 'Gertrude is afraid of wolf.');
  assert.deepEqual(second.values, ['wolf']);
});

test('CLI tutorial learns and queries a fact in one session episode', () => {
  const result = engine.ask('Socrate is a man. Is Socrate a man?');
  assert.equal(result.status, 'ANSWERED');
  assert.deepEqual(result.values, [true]);
  assert.equal(result.answer, 'Yes.');
  assert.equal(result.learned.length, 1);
  assert.equal(result.provenance[0].source[0], 'session:1');
});

test('CLI tutorial keeps learned facts across interactive turns', () => {
  const learned = engine.ask('Plato is in Athens.');
  assert.equal(learned.status, 'LEARNED');
  const answer = engine.ask('Where is Plato?', learned.context);
  assert.equal(answer.answer, 'Plato is in Athens.');
  assert.deepEqual(answer.values, ['athens']);
});
