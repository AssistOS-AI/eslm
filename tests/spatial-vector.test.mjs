import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeSpatialVectorTask,
  verifySpatialVectorResult,
} from '../src/reasoning/spatial-vector.mjs';

const SYSTEM = Object.freeze({
  schema: 'typed-spatial-vector-system-v1',
  systemId: 'system:nonce-grid',
  dimensions: Object.freeze(['axis:ember', 'axis:mist']),
  relations: Object.freeze([
    { id: 'relation:cedar', vector: [-1, 0], output: true },
    { id: 'relation:quartz', vector: [1, 0], output: true },
    { id: 'relation:harbor', vector: [0, 1], output: true },
    { id: 'relation:basalt', vector: [0, -1], output: true },
    { id: 'relation:violet', vector: [-1, 1], output: true },
    { id: 'relation:copper', vector: [1, 1], output: true },
    { id: 'relation:linen', vector: [-1, -1], output: true },
    { id: 'relation:opal', vector: [1, -1], output: true },
    { id: 'relation:still', vector: [0, 0], output: true },
  ]),
});

function task(overrides = {}) {
  return {
    schema: 'typed-spatial-vector-task-v1',
    systemId: SYSTEM.systemId,
    maxDepth: 12,
    facts: [
      { id: 'fact:one', subject: 'node:quill', relation: 'relation:quartz', object: 'node:reed' },
      { id: 'fact:two', subject: 'node:sable', relation: 'relation:harbor', object: 'node:quill' },
      { id: 'fact:distractor', subject: 'node:ash', relation: 'relation:linen', object: 'node:fir' },
    ],
    query: { subject: 'node:sable', object: 'node:reed' },
    ...overrides,
  };
}

test('renamed vector constraints compose, ignore a disconnected distractor, and replay the witness', () => {
  const result = executeSpatialVectorTask(task(), SYSTEM);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['relation:copper']);
  assert.deepEqual(result.reasoning.displacement, [1, 1]);
  assert.deepEqual(result.evidence.map((edge) => edge.factId), ['fact:one', 'fact:two']);
  assert.equal(verifySpatialVectorResult(task(), SYSTEM, result), true);
});

test('query direction is contrastive and exact cancellation produces the declared zero class', () => {
  const reversed = task({ query: { subject: 'node:reed', object: 'node:sable' } });
  const reversedResult = executeSpatialVectorTask(reversed, SYSTEM);
  assert.deepEqual(reversedResult.values, ['relation:linen']);
  assert.equal(verifySpatialVectorResult(reversed, SYSTEM, reversedResult), true);

  const cancelled = task({
    facts: [
      { id: 'fact:a', subject: 'node:b', relation: 'relation:quartz', object: 'node:a' },
      { id: 'fact:b', subject: 'node:c', relation: 'relation:cedar', object: 'node:b' },
    ],
    query: { subject: 'node:c', object: 'node:a' },
  });
  assert.deepEqual(executeSpatialVectorTask(cancelled, SYSTEM).values, ['relation:still']);
});

test('unquantified opposed steps invalidate only the affected dimension', () => {
  const partial = task({
    compositionPolicy: 'invalidate-opposed-steps',
    facts: [
      { id: 'fact:a', subject: 'node:b', relation: 'relation:quartz', object: 'node:a' },
      { id: 'fact:b', subject: 'node:c', relation: 'relation:violet', object: 'node:b' },
    ],
    query: { subject: 'node:c', object: 'node:a' },
  });
  const partialResult = executeSpatialVectorTask(partial, SYSTEM);
  assert.deepEqual(partialResult.values, ['relation:harbor']);
  assert.deepEqual(partialResult.reasoning.unknownDimensions, ['axis:ember']);
  assert.equal(verifySpatialVectorResult(partial, SYSTEM, partialResult), true);

  const noKnownDirection = task({
    compositionPolicy: 'invalidate-opposed-steps',
    facts: [
      { id: 'fact:a', subject: 'node:b', relation: 'relation:quartz', object: 'node:a' },
      { id: 'fact:b', subject: 'node:c', relation: 'relation:cedar', object: 'node:b' },
    ],
    query: { subject: 'node:c', object: 'node:a' },
  });
  assert.equal(executeSpatialVectorTask(noKnownDirection, SYSTEM).status, 'UNDERDETERMINED');
});

test('reordered evidence is deterministic and inconsistent cycles fail visibly', () => {
  const reordered = task({ facts: [...task().facts].reverse() });
  assert.deepEqual(executeSpatialVectorTask(reordered, SYSTEM).values, ['relation:copper']);
  const inconsistent = task({
    facts: [
      ...task().facts,
      { id: 'fact:conflict', subject: 'node:sable', relation: 'relation:basalt', object: 'node:reed' },
    ],
  });
  assert.equal(executeSpatialVectorTask(inconsistent, SYSTEM).status, 'INCONSISTENT_CONTEXT');
});

test('depth bounds and disconnected endpoints remain observable', () => {
  assert.equal(executeSpatialVectorTask(task({ maxDepth: 1 }), SYSTEM).status, 'UNKNOWN');
  assert.equal(executeSpatialVectorTask(task({ maxDepth: 65 }), SYSTEM).status, 'RESOURCE_LIMIT');
  const disconnected = task({ query: { subject: 'node:ash', object: 'node:reed' } });
  assert.equal(executeSpatialVectorTask(disconnected, SYSTEM).status, 'UNKNOWN');
});
