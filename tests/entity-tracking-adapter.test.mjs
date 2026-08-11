import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptEntityTrackingJsonl,
  ENTITY_TRACKING_SOURCE,
  scoreEntityTrackingSpan,
} from '../src/benchmark-adapters/entity-tracking.mjs';

function fixture(overrides = {}) {
  return JSON.stringify({
    sentence: 'Box 0 contains the coffee. Box 0 contains the coffee.',
    sentence_masked: 'Box 0 contains the coffee. Box 0 contains <extra_id_0> .',
    masked_content: '<extra_id_0> the coffee',
    sample_id: 4,
    numops: 0,
    ...overrides,
  });
}

test('Entity Tracking adapter isolates masked-span labels from visible cases', () => {
  const adapted = adaptEntityTrackingJsonl(`${fixture()}\n`, { datasetId: 'fixture-v1', split: 'dev' });
  assert.equal(adapted.pool.length, 1);
  assert.equal(JSON.stringify(adapted.pool[0]).includes('expectedSpan'), false);
  assert.equal(adapted.pool[0].kind, 'masked-span');
  assert.equal(adapted.pool[0].taskFrame.operation, 'complete-container-contents');
  assert.equal(adapted.pool[0].taskFrame.stateProgram.schema, 'finite-relation-state-program-v1');
  assert.equal(adapted.pool[0].taskFrame.stateProgram.relation, 'contains');
  assert.deepEqual(adapted.pool[0].taskFrame.stateProgram.initial[0].values, ['coffee']);
  assert.equal(adapted.pool[0].metadata.localOperationCount, 0);
  assert.equal(adapted.pool[0].metadata.globalOperationCount, 0);
  assert.equal(adapted.oracle[0].expectedSpan, 'the coffee');
  assert.equal(adapted.leakagePolicy.pool, 'development-visible');
  assert.match(ENTITY_TRACKING_SOURCE.license, /No LICENSE file/u);
  assert.equal(scoreEntityTrackingSpan('contains the coffee', adapted.oracle[0]).pass, true);
  assert.equal(scoreEntityTrackingSpan('the tea', adapted.oracle[0]).pass, false);
});

test('Entity Tracking scorer treats item order as irrelevant without accepting extra items', () => {
  const oracle = { expectedSpan: 'the boot and the dress' };
  assert.equal(scoreEntityTrackingSpan('the dress and the boot', oracle).pass, true);
  assert.equal(scoreEntityTrackingSpan(['dress', 'boot'], oracle).pass, true);
  assert.equal(scoreEntityTrackingSpan('the dress and the boot and the tea', oracle).pass, false);
  assert.equal(scoreEntityTrackingSpan('nothing', { expectedSpan: 'nothing' }).pass, true);
});

test('Entity Tracking adapter rejects labels that do not reconstruct the official sentence', () => {
  assert.throws(
    () => adaptEntityTrackingJsonl(`${fixture({ masked_content: '<extra_id_0> the pipe' })}\n`),
    /does not reconstruct sentence/u,
  );
});

test('Entity Tracking adapter rejects unknown source operations before the generic executor', () => {
  assert.throws(() => adaptEntityTrackingJsonl(`${fixture({
    sentence: 'Box 0 contains the coffee. Swap coffee with Box 1. Box 0 contains the coffee.',
    sentence_masked: 'Box 0 contains the coffee. Swap coffee with Box 1. Box 0 contains <extra_id_0> .',
  })}\n`), /unsupported operation/u);
});

test('Entity Tracking sampling is deterministic and stratified by operation count', () => {
  const records = Array.from({ length: 12 }, (_, index) => fixture({
    sentence: `Box 0 contains the object${index}. Box 0 contains the object${index}.`,
    sentence_masked: `Box 0 contains the object${index}. Box 0 contains <extra_id_0> .`,
    masked_content: `<extra_id_0> the object${index}`,
    sample_id: index,
    numops: index % 3,
  })).join('\n');
  const first = adaptEntityTrackingJsonl(records, { limit: 6, seed: 'fixed' });
  const replay = adaptEntityTrackingJsonl(records, { limit: 6, seed: 'fixed' });
  assert.deepEqual(first.pool.map((item) => item.id), replay.pool.map((item) => item.id));
  assert.deepEqual(first.strata.numOperations, { 0: 2, 1: 2, 2: 2 });
});
