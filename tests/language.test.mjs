import test from 'node:test';
import assert from 'node:assert/strict';
import { grammarScore, normalizeInput } from '../src/language.mjs';
import { loadModel } from '../src/model-loader.mjs';

const model = await loadModel();

test('normalization is Unicode-aware and conservative', () => {
  const result = normalizeInput('Waht colr is Lumen?', model);
  assert.equal(result.normalized, 'what color is lumen ?');
  assert.deepEqual(result.corrections.map(({ to }) => to), ['what', 'color']);
});

test('grammar preference penalizes adjacent repetition', () => {
  assert.ok(grammarScore('Where is Mira?', model).score > grammarScore('Mira Mira where?', model).score);
});
