import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeSpatialExtentTask,
  verifySpatialExtentResult,
} from '../src/reasoning/spatial-extent.mjs';

const SYSTEM = Object.freeze({
  schema: 'typed-spatial-extent-system-v1',
  systemId: 'system:nonce-extents',
  dimensions: Object.freeze(['axis:flint', 'axis:moss']),
  relations: Object.freeze([
    { id: 'relation:coral', dimension: 'axis:flint', polarity: 'positive', output: true },
    { id: 'relation:slate', dimension: 'axis:flint', polarity: 'negative', output: true },
    { id: 'relation:iris', dimension: 'axis:moss', polarity: 'positive', output: true },
    { id: 'relation:umber', dimension: 'axis:moss', polarity: 'negative', output: true },
  ]),
});

function task(overrides = {}) {
  return {
    schema: 'typed-spatial-extent-task-v1',
    systemId: SYSTEM.systemId,
    orthogonalPolicy: 'overlap-unmentioned-dimensions',
    facts: [
      { id: 'fact:one', subject: 'node:a', object: 'node:b', relations: ['relation:coral', 'relation:iris'] },
      { id: 'fact:two', subject: 'node:b', object: 'node:c', relations: ['relation:coral', 'relation:iris'] },
      { id: 'fact:distractor', subject: 'node:u', object: 'node:v', relations: ['relation:slate'] },
    ],
    query: { subject: 'node:a', object: 'node:c' },
    ...overrides,
  };
}

test('renamed extent inequalities compose same-direction separations and replay every witness', () => {
  const result = executeSpatialExtentTask(task(), SYSTEM);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['relation:coral', 'relation:iris']);
  assert.equal(result.evidence.length, 2);
  assert.equal(result.evidence.every((item) => item.path.length >= 3), true);
  assert.equal(verifySpatialExtentResult(task(), SYSTEM, result), true);
  assert.equal(verifySpatialExtentResult(task(), SYSTEM, { ...result, evidence: result.evidence.slice(0, 1) }), false);
});

test('query reversal returns declared inverse polarities under complete renaming', () => {
  const reversed = task({ query: { subject: 'node:c', object: 'node:a' } });
  const result = executeSpatialExtentTask(reversed, SYSTEM);
  assert.deepEqual(result.values, ['relation:slate', 'relation:umber']);
  assert.equal(verifySpatialExtentResult(reversed, SYSTEM, result), true);
});

test('orthogonal overlap does not fabricate separation across a mixed-direction chain', () => {
  const mixed = task({
    facts: [
      { id: 'fact:one', subject: 'node:a', object: 'node:b', relations: ['relation:coral'] },
      { id: 'fact:two', subject: 'node:b', object: 'node:c', relations: ['relation:iris'] },
    ],
  });
  assert.equal(executeSpatialExtentTask(mixed, SYSTEM).status, 'UNDERDETERMINED');
});

test('fact reordering is deterministic and opposite separations fail visibly', () => {
  const original = executeSpatialExtentTask(task(), SYSTEM);
  const reorderedTask = task({ facts: [...task().facts].reverse() });
  const reordered = executeSpatialExtentTask(reorderedTask, SYSTEM);
  assert.deepEqual(reordered.values, original.values);
  assert.equal(verifySpatialExtentResult(reorderedTask, SYSTEM, reordered), true);

  const conflict = task({
    facts: [
      { id: 'fact:one', subject: 'node:a', object: 'node:b', relations: ['relation:coral'] },
      { id: 'fact:two', subject: 'node:b', object: 'node:a', relations: ['relation:coral'] },
    ],
    query: { subject: 'node:a', object: 'node:b' },
  });
  assert.equal(executeSpatialExtentTask(conflict, SYSTEM).status, 'INCONSISTENT_CONTEXT');
});
