import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/engine.mjs';
import { loadKnowledgeBases, mergeModels } from '../src/kbs.mjs';
import { loadModel } from '../src/model-loader.mjs';

async function engineWith(selection) {
  return new EslmEngine(mergeModels(await loadModel(), await loadKnowledgeBases(selection)));
}

test('loads child knowledge only when explicitly selected', async () => {
  const base = new EslmEngine(await loadModel());
  const withKnowledge = await engineWith('child-basic');
  assert.equal(base.ask('Jhon is a man. Is Jhon going to die?').status, 'UNKNOWN');
  const answer = withKnowledge.ask('Jhon is a man. Is Jhon going to die?');
  assert.equal(answer.status, 'ANSWERED');
  assert.deepEqual(answer.reasoning, { method: 'deduction', depth: 3 });
});

test('keeps animal exceptions as explicit facts instead of an unsafe universal rule', async () => {
  const engine = await engineWith('animals');
  assert.equal(engine.ask('Can Sparrow fly?').status, 'ANSWERED');
  assert.equal(engine.ask('Can Penguin swim?').status, 'ANSWERED');
  assert.equal(engine.ask('Can Penguin fly?').status, 'UNKNOWN');
  assert.equal(engine.ask('Is Penguin an animal?').reasoning.depth, 1);
});

test('loads all modules without duplicating shared entities and facts', async () => {
  const engine = await engineWith('all');
  assert.equal(engine.model.entities.length, 36);
  assert.equal(engine.model.facts.length, 62);
  assert.equal(engine.model.rules.length, 14);
  // Shared class predicates compose across modules: animal -> living-being can
  // activate child-basic growth and mortality rules without copying those rules.
  assert.equal(engine.facts.length, 116);
  assert.equal(engine.ask('What is north of Africa?').answer, 'Europe is north of Africa.');
  assert.equal(engine.model.manifest.benchmarkComparable, false);
});
