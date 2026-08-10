import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/engine.mjs';
import model from './fixtures/reasoning-model.mjs';

const engine = new EslmEngine(model);

test('answers direct indexed facts with provenance', () => {
  const result = engine.ask('Where is Mira?');
  assert.equal(result.status, 'ANSWERED');
  assert.deepEqual(result.values, ['observatory']);
  assert.deepEqual(result.provenance[0].source, ['fixture:1']);
});

test('tolerates declared spelling variants without changing entity identity', () => {
  const result = engine.ask('wher iz mira?');
  assert.deepEqual(result.values, ['observatory']);
  assert.equal(result.input.corrections.length, 2);
});

test('derives a new fact by executing an explicit rule', () => {
  const result = engine.ask('Why is Lumen in the observatory?');
  assert.deepEqual(result.values, [true]);
  assert.match(result.answer, /owned-object-location/u);
  assert.equal(result.provenance[0].rule, 'owned-object-location');
});

test('executes a three-step deduction over a session assertion', () => {
  const result = engine.ask('Jhon is a man. Is Jhon going to die?');
  assert.equal(result.status, 'ANSWERED');
  assert.deepEqual(result.values, [true]);
  assert.deepEqual(result.reasoning, { method: 'deduction', depth: 3 });
  assert.deepEqual(result.provenance[0].source, [
    'fixture:rule:4', 'fixture:rule:3', 'fixture:rule:2', 'session:1',
  ]);
});

test('keeps induction separate from factual proof', () => {
  const factual = engine.ask('Can Dana fly?');
  const likely = engine.ask('Is Dana likely to fly?');
  assert.equal(factual.status, 'UNKNOWN');
  assert.equal(likely.status, 'INDUCTIVE');
  assert.deepEqual(likely.values, [true]);
  assert.equal(likely.reasoning.confidence, 0.75);
  assert.equal(likely.reasoning.supportCount, 3);
});

test('induces a session pattern from repeated typed examples', () => {
  const result = engine.ask([
    'Ria is a glider.', 'Ria can hover.',
    'Sia is a glider.', 'Sia can hover.',
    'Tia is a glider.', 'Tia can hover.',
    'Ula is a glider.', 'Is Ula likely to hover?',
  ].join(' '));
  assert.equal(result.status, 'INDUCTIVE');
  assert.equal(result.reasoning.className, 'glider');
  assert.equal(result.reasoning.supportCount, 3);
  assert.equal(result.reasoning.populationCount, 4);
});

test('returns ranked abductive hypotheses without asserting a cause', () => {
  const result = engine.ask('What could explain why the lawn is wet?');
  assert.equal(result.status, 'ABDUCTIVE');
  assert.deepEqual(result.values, ['abduced:rain-wets-lawn', 'abduced:sprinkler-wets-lawn']);
  assert.equal(result.hypotheses.length, 2);
  assert.match(result.answer, /hypotheses, not proven causes/u);
});

test('requires a grounded observation before abduction', () => {
  const result = engine.ask('What could explain why the lawn is dry?');
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.values, []);
});

test('uses bounded discourse reference resolution', () => {
  const first = engine.ask('Where is Mira?');
  const second = engine.ask('What does she own?', first.context);
  assert.deepEqual(second.values, ['lumen']);
});

test('abstains on an unsupported construction', () => {
  const result = engine.ask('Write a long poem about the observatory.');
  assert.equal(result.status, 'UNSUPPORTED');
});

test('does not turn missing proof into a negative fact', () => {
  const result = engine.ask('Is Mira in the garden?');
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.values, []);
  assert.match(result.answer, /no evidence/u);
});

test('does not claim support for a non-English question', () => {
  const result = engine.ask('Unde este Mira?');
  assert.equal(result.status, 'UNSUPPORTED');
});
