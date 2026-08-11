import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTypedRelationTask } from '../src/reasoning/relation-algebra.mjs';

const RENAMED_ALGEBRA = Object.freeze({
  schema: 'typed-relation-algebra-v1',
  algebraId: 'algebra:nonce-lattice',
  relations: Object.freeze([
    { id: 'value:wire', semanticClass: 'class:forward' },
    { id: 'value:amber', semanticClass: 'class:forward', targetFeatures: { facet: 'kind:a' } },
    { id: 'value:violet', semanticClass: 'class:forward', targetFeatures: { facet: 'kind:b' } },
    { id: 'value:cobalt', semanticClass: 'class:reverse', targetFeatures: { facet: 'kind:a' } },
    { id: 'value:silver', semanticClass: 'class:reverse', targetFeatures: { facet: 'kind:b' } },
    { id: 'value:ochre', semanticClass: 'class:twice', targetFeatures: { facet: 'kind:a' } },
    { id: 'value:indigo', semanticClass: 'class:twice', targetFeatures: { facet: 'kind:b' } },
    { id: 'value:teal', semanticClass: 'class:side', targetFeatures: { facet: 'kind:a' } },
    { id: 'value:rose', semanticClass: 'class:side', targetFeatures: { facet: 'kind:b' } },
  ]),
  inverses: Object.freeze([
    { relationClass: 'class:forward', inverseClass: 'class:reverse' },
    { relationClass: 'class:reverse', inverseClass: 'class:forward' },
    { relationClass: 'class:twice', inverseClass: 'class:twice' },
    { relationClass: 'class:side', inverseClass: 'class:side' },
  ]),
  compositions: Object.freeze([
    { left: 'class:forward', right: 'class:forward', results: ['class:twice'] },
    { left: 'class:reverse', right: 'class:forward', results: ['class:side'] },
    { left: 'class:side', right: 'class:forward', results: ['class:forward'] },
    { left: 'class:forward', right: 'class:side', results: ['class:twice'] },
  ]),
});

function task(overrides = {}) {
  return {
    schema: 'typed-relation-task-v1', algebraId: RENAMED_ALGEBRA.algebraId, maxDepth: 8,
    facts: [
      { id: 'evidence:one', subject: 'node:x1', relation: 'value:amber', object: 'node:x2' },
      { id: 'evidence:two', subject: 'node:x2', relation: 'value:violet', object: 'node:x3' },
    ],
    features: [{ entity: 'node:x3', facet: 'facet', value: 'kind:b', source: 'observation:three' }],
    query: { subject: 'node:x1', object: 'node:x3' },
    ...overrides,
  };
}

test('typed relation algebra composes a fully renamed graph and emits an ordered witness', () => {
  const result = executeTypedRelationTask(task(), RENAMED_ALGEBRA);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['value:indigo']);
  assert.deepEqual(result.evidence.map((item) => item.factId), ['evidence:one', 'evidence:two']);
  assert.equal(result.reasoning.pathLength, 2);
  assert.deepEqual(result.reasoning.semanticClasses, ['class:twice']);
});

test('inverse traversal uses declared class semantics and endpoint features', () => {
  const result = executeTypedRelationTask(task({
    features: [{ entity: 'node:x1', facet: 'facet', value: 'kind:a' }],
    query: { subject: 'node:x2', object: 'node:x1' },
  }), RENAMED_ALGEBRA);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['value:cobalt']);
  assert.equal(result.evidence[0].direction, 'inverse');
});

test('missing refinement evidence is ambiguous instead of guessed', () => {
  const result = executeTypedRelationTask(task({
    facts: [
      { id: 'evidence:one', subject: 'node:x1', relation: 'value:wire', object: 'node:x2' },
      { id: 'evidence:two', subject: 'node:x2', relation: 'value:wire', object: 'node:x3' },
    ],
    features: [],
  }), RENAMED_ALGEBRA);
  assert.equal(result.status, 'AMBIGUOUS');
  assert.deepEqual(result.alternatives, ['value:indigo', 'value:ochre']);
});

test('conflicting typed features are inconsistent and disconnected endpoints remain unknown', () => {
  const inconsistent = executeTypedRelationTask(task({
    features: [
      { entity: 'node:x3', facet: 'facet', value: 'kind:a' },
      { entity: 'node:x3', facet: 'facet', value: 'kind:b' },
    ],
  }), RENAMED_ALGEBRA);
  assert.equal(inconsistent.status, 'INCONSISTENT_CONTEXT');
  const unknown = executeTypedRelationTask(task({
    facts: [...task().facts, { id: 'evidence:other', subject: 'node:y1', relation: 'value:amber', object: 'node:y2' }],
    query: { subject: 'node:x1', object: 'node:y2' },
  }), RENAMED_ALGEBRA);
  assert.equal(unknown.status, 'UNKNOWN');
});

test('meaning-changing relation order does not reuse the forward composition answer', () => {
  const changed = executeTypedRelationTask(task({
    facts: [
      { id: 'evidence:one', subject: 'node:x1', relation: 'value:cobalt', object: 'node:x2' },
      { id: 'evidence:two', subject: 'node:x2', relation: 'value:violet', object: 'node:x3' },
    ],
  }), RENAMED_ALGEBRA);
  assert.equal(changed.status, 'SOLVED');
  assert.deepEqual(changed.values, ['value:rose']);
  assert.notDeepEqual(changed.values, ['value:indigo']);
});

test('composition considers every bounded binary parenthesization and records its tree', () => {
  const result = executeTypedRelationTask(task({
    facts: [
      { id: 'evidence:p1', subject: 'node:x1', relation: 'value:wire', object: 'node:x2' },
      { id: 'evidence:p2', subject: 'node:x2', relation: 'value:cobalt', object: 'node:x4' },
      { id: 'evidence:p3', subject: 'node:x4', relation: 'value:wire', object: 'node:x3' },
    ],
  }), RENAMED_ALGEBRA);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['value:indigo']);
  assert.equal(result.reasoning.compositionProof.relationClass, 'class:twice');
  assert.equal(result.reasoning.compositionProof.right.relationClass, 'class:side');
});

test('bounded paths fail visibly rather than searching past policy', () => {
  const limited = executeTypedRelationTask(task({ maxDepth: 1 }), RENAMED_ALGEBRA);
  assert.equal(limited.status, 'UNKNOWN');
  const invalid = executeTypedRelationTask(task({ maxDepth: 33 }), RENAMED_ALGEBRA);
  assert.equal(invalid.status, 'RESOURCE_LIMIT');
});
