import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGeneratedModel } from '../src/training.mjs';

test('generated model passes static and semantic validation', async () => {
  const summary = await validateGeneratedModel();
  assert.equal(summary.entityCount, 0);
  assert.equal(summary.factCount, 0);
  assert.equal(summary.ruleCount, 0);
  assert.ok(summary.files.includes('indexes.mjs'));
  assert.ok(summary.files.includes('reasoning.mjs'));
});
