import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/engine.mjs';
import { loadModel } from '../src/model-loader.mjs';

const model = await loadModel('training/candidates/babi16-class-property-v1/manifest.mjs');

test('candidate transfers a typed property through a nonce class with a complete analogical proof', () => {
  const engine = new EslmEngine(model);
  const result = engine.ask('Ava is a zorb. Ava is green. Nia is a zorb. What color is Nia?');
  assert.equal(result.status, 'INDUCTIVE');
  assert.deepEqual(result.values, ['green']);
  assert.equal(result.reasoning.className, 'zorb');
  assert.equal(result.reasoning.selection, 'latest-member');
  assert.equal(result.provenance[0].support.length, 3);
});

test('latest-member policy changes its analogy when membership order changes', () => {
  const engine = new EslmEngine(model);
  const gray = engine.ask('Ava is a zorb. Ava is green. Bea is a zorb. Bea is gray. Nia is a zorb. What color is Nia?');
  const green = engine.ask('Bea is a zorb. Bea is gray. Ava is a zorb. Ava is green. Nia is a zorb. What color is Nia?');
  assert.deepEqual(gray.values, ['gray']);
  assert.deepEqual(green.values, ['green']);
});

test('candidate does not reinterpret an unconfigured adjective as a color fact', () => {
  const engine = new EslmEngine(model);
  const result = engine.ask('Ava is a zorb. Ava is blue. Nia is a zorb. What color is Nia?');
  assert.equal(result.status, 'UNKNOWN');
  assert.deepEqual(result.values, []);
  assert.deepEqual(result.episode.unsupportedStatements, ['Ava is blue.']);
});
