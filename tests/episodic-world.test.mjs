import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  executeEpisodicWorldTask,
  verifyEpisodicWorldResult,
} from '../src/reasoning/episodic-world.mjs';

function task(operations, query, policy = {}) {
  return { schema: 'finite-episodic-world-task-v1', operations, query, policy };
}

test('finite episodic state follows carrier movement and preserves a dropped value location', () => {
  const program = task([
    { id: 'move:1', sequence: 1, kind: 'state', predicate: 'place', subject: 'ari', values: ['dock'] },
    { id: 'take:2', sequence: 2, kind: 'relation-add', relation: 'holds', subject: 'ari', object: 'token' },
    { id: 'move:3', sequence: 3, kind: 'state', predicate: 'place', subject: 'ari', values: ['vault'] },
  ], { kind: 'state-values', predicate: 'place', subject: 'token', carrierRelation: 'holds' });
  const result = executeEpisodicWorldTask(program);
  assert.deepEqual(result.values, ['vault']);
  assert.equal(verifyEpisodicWorldResult(program, result), true);

  const released = task([
    ...program.operations,
    { id: 'drop:4', sequence: 4, kind: 'relation-remove', relation: 'holds', subject: 'ari', object: 'token' },
    { id: 'token:5', sequence: 5, kind: 'state', predicate: 'place', subject: 'token', values: ['vault'] },
    { id: 'move:6', sequence: 6, kind: 'state', predicate: 'place', subject: 'ari', values: ['ridge'] },
  ], program.query);
  const releasedResult = executeEpisodicWorldTask(released);
  assert.deepEqual(releasedResult.values, ['vault']);
  assert.equal(verifyEpisodicWorldResult(released, releasedResult), true);
});

test('event-role selection reports several semantically valid answers as ambiguity', () => {
  const program = task([
    { id: 'give:1', sequence: 1, kind: 'event', eventType: 'handoff',
      roles: { actor: 'zu', item: 'alpha', receiver: 'vek' } },
    { id: 'give:2', sequence: 2, kind: 'event', eventType: 'handoff',
      roles: { actor: 'zu', item: 'beta', receiver: 'vek' } },
  ], { kind: 'event-role', eventType: 'handoff', constraints: { actor: 'zu', receiver: 'vek' },
    outputRole: 'item', requireUnique: true });
  const result = executeEpisodicWorldTask(program);
  assert.equal(result.status, 'AMBIGUOUS');
  assert.deepEqual(result.values, ['alpha', 'beta']);
  assert.equal(verifyEpisodicWorldResult(program, result), true);
});

test('fully renamed vector and path relations preserve structure and reject a reversed contrast', () => {
  const operations = [
    { id: 'edge:1', sequence: 1, kind: 'edge', relation: 'r_up', subject: 'q0', object: 'q1' },
    { id: 'edge:2', sequence: 2, kind: 'edge', relation: 'r_right', subject: 'q1', object: 'q2' },
  ];
  const policy = {
    inverseRelations: { r_up: 'r_down', r_down: 'r_up', r_right: 'r_left', r_left: 'r_right' },
    relationVectors: { r_up: [0, 1], r_down: [0, -1], r_right: [1, 0], r_left: [-1, 0] },
    vectorQueryPolicy: 'axis-sign',
  };
  const vector = task(operations,
    { kind: 'vector-membership', subject: 'q2', relation: 'r_right', object: 'q0' }, policy);
  const vectorResult = executeEpisodicWorldTask(vector);
  assert.deepEqual(vectorResult.values, ['true']);
  assert.equal(verifyEpisodicWorldResult(vector, vectorResult), true);

  const path = task([...operations].reverse(), { kind: 'edge-path', from: 'q0', to: 'q2' }, policy);
  const pathResult = executeEpisodicWorldTask(path);
  assert.deepEqual(pathResult.values, ['r_up', 'r_right']);
  assert.equal(verifyEpisodicWorldResult(path, pathResult), true);

  const contrast = task(operations,
    { kind: 'vector-membership', subject: 'q2', relation: 'r_left', object: 'q0' }, policy);
  assert.deepEqual(executeEpisodicWorldTask(contrast).values, ['false']);
});

test('declarative strict-order aliases and induction selection survive nonce values', () => {
  const order = task([
    { id: 'e:1', sequence: 1, kind: 'edge', relation: 'dominates', subject: 'tiny', object: 'mid' },
    { id: 'e:2', sequence: 2, kind: 'edge', relation: 'dominates', subject: 'mid', object: 'huge' },
  ], { kind: 'edge-membership', relation: 'dominates', subject: 'tiny', object: 'huge' },
  { transitiveRelations: ['dominates'] });
  assert.deepEqual(executeEpisodicWorldTask(order).values, ['true']);

  const induction = task([
    { id: 't:1', sequence: 1, kind: 'type', subject: 'n0', objectClass: 'kappa' },
    { id: 't:2', sequence: 2, kind: 'type', subject: 'n1', objectClass: 'kappa' },
    { id: 'p:3', sequence: 3, kind: 'property', predicate: 'tone', subject: 'n1', value: 'vivid' },
    { id: 't:4', sequence: 4, kind: 'type', subject: 'n2', objectClass: 'kappa' },
    { id: 'p:5', sequence: 5, kind: 'property', predicate: 'tone', subject: 'n2', value: 'muted' },
  ], { kind: 'induce-property', predicate: 'tone', subject: 'n0' },
  { inductionSelection: 'latest-member' });
  const result = executeEpisodicWorldTask(induction);
  assert.deepEqual(result.values, ['muted']);
  assert.equal(verifyEpisodicWorldResult(induction, result), true);
});

test('witness verification rejects altered values and unsupported operation references', () => {
  const program = task([
    { id: 's:1', sequence: 1, kind: 'state', predicate: 'phase', subject: 'x7', values: ['warm'] },
  ], { kind: 'state-values', predicate: 'phase', subject: 'x7' });
  const result = executeEpisodicWorldTask(program);
  assert.equal(verifyEpisodicWorldResult(program, { ...result, values: ['cold'] }), false);
  assert.equal(verifyEpisodicWorldResult(program, {
    ...result, witness: { ...result.witness, operationIds: ['missing:9'] },
  }), false);
});

test('generic episodic method contains no benchmark or answer dispatch vocabulary', async () => {
  const source = await readFile(new URL('../src/reasoning/episodic-world.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /babi|benchmark|dataset|task-\d+|story-\d+|expectedAnswer|answerIndex/iu);
});
