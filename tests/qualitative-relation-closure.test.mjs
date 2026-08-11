import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeQualitativeRelationTask,
  verifyQualitativeRelationResult,
} from '../src/reasoning/qualitative-relation-closure.mjs';

const RELATIONS = [
  ['relation:opal', 'relation:flint'], ['relation:flint', 'relation:opal'],
  ['relation:iris', 'relation:umber'], ['relation:umber', 'relation:iris'],
  ['relation:near-nonce', 'relation:near-nonce'], ['relation:remote-nonce', 'relation:remote-nonce'],
  ['relation:member-edge', 'relation:holder-edge'], ['relation:holder-edge', 'relation:member-edge'],
  ['relation:member-deep', 'relation:holder-deep'], ['relation:holder-deep', 'relation:member-deep'],
].map(([id, inverse]) => ({ id, inverse, output: true }));

const COMPOSITIONS = [
  ['opal-chain', 'relation:opal', 'relation:opal', 'relation:opal'],
  ['flint-chain', 'relation:flint', 'relation:flint', 'relation:flint'],
  ['iris-chain', 'relation:iris', 'relation:iris', 'relation:iris'],
  ['umber-chain', 'relation:umber', 'relation:umber', 'relation:umber'],
  ['nested-touch-touch', 'relation:member-edge', 'relation:member-edge', 'relation:member-deep'],
  ['nested-touch-deep', 'relation:member-edge', 'relation:member-deep', 'relation:member-deep'],
  ['nested-deep-touch', 'relation:member-deep', 'relation:member-edge', 'relation:member-deep'],
  ['nested-deep-deep', 'relation:member-deep', 'relation:member-deep', 'relation:member-deep'],
  ['holder-touch-touch', 'relation:holder-edge', 'relation:holder-edge', 'relation:holder-deep'],
  ['holder-touch-deep', 'relation:holder-edge', 'relation:holder-deep', 'relation:holder-deep'],
  ['holder-deep-touch', 'relation:holder-deep', 'relation:holder-edge', 'relation:holder-deep'],
  ['holder-deep-deep', 'relation:holder-deep', 'relation:holder-deep', 'relation:holder-deep'],
  ...['relation:opal', 'relation:flint', 'relation:iris', 'relation:umber', 'relation:remote-nonce'].flatMap(
    (relation) => [
      [`lift-member-edge-${relation}`, 'relation:member-edge', relation, relation],
      [`lift-member-deep-${relation}`, 'relation:member-deep', relation, relation],
      [`lift-holder-edge-${relation}`, relation, 'relation:holder-edge', relation],
      [`lift-holder-deep-${relation}`, relation, 'relation:holder-deep', relation],
    ],
  ),
].map(([id, left, right, result]) => ({ id: `rule:${id}`, left, right, results: [result] }));

const SYSTEM = Object.freeze({
  schema: 'declarative-qualitative-relation-system-v1',
  systemId: 'system:nonce-qualitative',
  relations: Object.freeze(RELATIONS),
  compositionRules: Object.freeze(COMPOSITIONS),
  exclusiveGroups: Object.freeze([
    ['relation:opal', 'relation:flint'], ['relation:iris', 'relation:umber'],
    ['relation:near-nonce', 'relation:remote-nonce'],
    ['relation:member-edge', 'relation:member-deep', 'relation:holder-edge', 'relation:holder-deep'],
  ]),
  outputOrder: Object.freeze(RELATIONS.map((relation) => relation.id)),
});

function task(overrides = {}) {
  return {
    schema: 'qualitative-relation-task-v1',
    systemId: SYSTEM.systemId,
    facts: [
      { id: 'fact:member-a', subject: 'node:a', relation: 'relation:member-edge', object: 'node:box-a' },
      { id: 'fact:box-opal', subject: 'node:box-a', relation: 'relation:opal', object: 'node:box-b' },
      { id: 'fact:box-iris', subject: 'node:box-a', relation: 'relation:iris', object: 'node:box-b' },
      { id: 'fact:box-remote', subject: 'node:box-a', relation: 'relation:remote-nonce', object: 'node:box-b' },
      { id: 'fact:member-b', subject: 'node:b', relation: 'relation:member-deep', object: 'node:box-b' },
      { id: 'fact:distractor', subject: 'node:x', relation: 'relation:flint', object: 'node:y' },
    ],
    query: { subject: 'node:a', object: 'node:b' },
    ...overrides,
  };
}

test('fully renamed containment lifting returns every licensed relation with replayable proofs', () => {
  const input = task();
  const result = executeQualitativeRelationTask(input, SYSTEM);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['relation:opal', 'relation:iris', 'relation:remote-nonce']);
  assert.equal(result.evidence.every((item) => item.proof.kind === 'composition'), true);
  assert.equal(verifyQualitativeRelationResult(input, SYSTEM, result), true);
});

test('query reversal, fact reordering, and a disconnected distractor preserve declared structure', () => {
  const reversed = task({
    facts: [...task().facts].reverse(),
    query: { subject: 'node:b', object: 'node:a' },
  });
  const result = executeQualitativeRelationTask(reversed, SYSTEM);
  assert.deepEqual(result.values, ['relation:flint', 'relation:umber', 'relation:remote-nonce']);
  assert.equal(verifyQualitativeRelationResult(reversed, SYSTEM, result), true);
});

test('an unlicensed symmetric relation does not propagate through containment', () => {
  const input = task({
    facts: [
      { id: 'fact:member-a', subject: 'node:a', relation: 'relation:member-edge', object: 'node:box-a' },
      { id: 'fact:near', subject: 'node:box-a', relation: 'relation:near-nonce', object: 'node:box-b' },
      { id: 'fact:member-b', subject: 'node:b', relation: 'relation:member-deep', object: 'node:box-b' },
    ],
  });
  assert.equal(executeQualitativeRelationTask(input, SYSTEM).status, 'UNKNOWN');
});

test('nested containment loses boundary contact and direction chains remain transitive', () => {
  const nested = task({
    facts: [
      { id: 'fact:one', subject: 'node:a', relation: 'relation:member-edge', object: 'node:b' },
      { id: 'fact:two', subject: 'node:b', relation: 'relation:member-edge', object: 'node:c' },
    ],
    query: { subject: 'node:a', object: 'node:c' },
  });
  assert.deepEqual(executeQualitativeRelationTask(nested, SYSTEM).values, ['relation:member-deep']);
  const transitive = task({
    facts: [
      { id: 'fact:one', subject: 'node:a', relation: 'relation:opal', object: 'node:b' },
      { id: 'fact:two', subject: 'node:b', relation: 'relation:opal', object: 'node:c' },
    ],
    query: { subject: 'node:a', object: 'node:c' },
  });
  assert.deepEqual(executeQualitativeRelationTask(transitive, SYSTEM).values, ['relation:opal']);
});

test('meaning-changing opposition is inconsistent and altered witnesses are rejected', () => {
  const conflict = task({
    facts: [
      { id: 'fact:one', subject: 'node:a', relation: 'relation:opal', object: 'node:b' },
      { id: 'fact:two', subject: 'node:a', relation: 'relation:flint', object: 'node:b' },
    ],
  });
  assert.equal(executeQualitativeRelationTask(conflict, SYSTEM).status, 'INCONSISTENT_CONTEXT');
  const result = executeQualitativeRelationTask(task(), SYSTEM);
  const tampered = {
    ...result,
    evidence: result.evidence.map((item, index) => index === 0
      ? { ...item, proof: { ...item.proof, ruleId: 'rule:not-declared' } } : item),
  };
  assert.equal(verifyQualitativeRelationResult(task(), SYSTEM, tampered), false);
});
