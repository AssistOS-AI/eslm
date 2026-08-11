import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptProntoqaDevelopmentRecord,
  compileProntoqaProofTask,
  hasProntoqaSource,
  inventoryProntoqaSource,
  loadProntoqaDevelopmentPool,
  PRONTOQA_PARTITION,
  PRONTOQA_SOURCE,
  scoreProntoqaDevelopmentSample,
} from '../src/benchmark-adapters/prontoqa.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../src/reasoning/sat-entailment.mjs';

function example(question, query, proof = [query.replace(/^Prove: /u, '')]) {
  return { question, query, chain_of_thought: proof };
}

function eightShotRecord(testExample) {
  return Object.fromEntries([
    ...Array.from({ length: 8 }, (_, index) => [`in_context_example${index}`, testExample]),
    ['test_example', testExample],
  ]);
}

test('PrOntoQA source compiler maps renamed quantified formulas into generic boolean entailment', () => {
  const compiled = compileProntoqaProofTask(example(
    'Every nerpus is a kivus and a lumus. Ilya is a nerpus.',
    'Prove: Ilya is a kivus and a lumus.',
  ), 'nonce-conjunction');
  const result = decideBooleanEntailment(compiled);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.entailed, true);

  const contraposition = compileProntoqaProofTask(example(
    'Everything that is a kivus is a lumus. Ilya is not a lumus.',
    'Prove: Ilya is not a kivus.',
  ), 'nonce-contraposition');
  assert.equal(decideBooleanEntailment(contraposition).entailed, true);
});

test('PrOntoQA adapter separates visible source tasks from the reference-proof oracle', () => {
  const testExample = example(
    'Nerpuses are kivuses and lumuses. Ilya is a nerpus.',
    'Prove: Ilya is a lumus.',
    ['Ilya is a nerpus.', 'Nerpuses are kivuses and lumuses.', 'Ilya is a lumus.'],
  );
  const adapted = adaptProntoqaDevelopmentRecord({
    fileName: '2hop_Composed_random_noadj.json',
    recordKey: 'example7',
    record: eightShotRecord(testExample),
  });
  assert.equal(Object.hasOwn(adapted.visible, 'oracle'), false);
  assert.equal(Object.hasOwn(adapted.visible, 'referenceProof'), false);
  assert.equal(adapted.oracle.id, adapted.visible.id);
  assert.deepEqual(adapted.oracle.referenceProof, testExample.chain_of_thought);
  assert.equal(adapted.visible.metadata.ruleFamily, 'Composed');
  assert.equal(decideBooleanEntailment(adapted.visible.task).entailed, true);
});

test('PrOntoQA adapter rejects unrecognized source fields instead of ignoring them', () => {
  const testExample = example('Ilya is a nerpus.', 'Prove: Ilya is a nerpus.');
  const record = { ...eightShotRecord(testExample), expected_answer: true };
  assert.throws(() => adaptProntoqaDevelopmentRecord({
    fileName: '2hop_Composed_random_noadj.json', recordKey: 'example1', record,
  }), /unexpected in-context-example shape/u);
});

test('cached official PrOntoQA source preserves every case and keeps fresh members sealed', async (context) => {
  if (!await hasProntoqaSource()) {
    context.skip(`Official cache absent at ${PRONTOQA_SOURCE.extractedPath}.`);
    return;
  }
  const inventory = await inventoryProntoqaSource();
  assert.equal(inventory.files, 79);
  assert.equal(inventory.availableCases, 7_900);
  assert.equal(inventory.trainingVisibleDemonstrations, 11_440);
  assert.equal(inventory.development.count, 1_580);
  assert.equal(inventory.fresh.count, 6_320);
  assert.equal(inventory.fresh.membershipSha256, PRONTOQA_PARTITION.freshMembershipSha256);
  assert.match(inventory.fresh.visibility, /no fresh loader is exported/u);

  const adapted = await loadProntoqaDevelopmentPool();
  assert.equal(adapted.pool.length, 1_580);
  assert.equal(adapted.oracle.length, 1_580);
  assert.equal(adapted.trainingPool.length, 0);
  assert.equal(adapted.sample.length, 158);
  assert.equal(adapted.samplePolicy.membershipSha256,
    '5bd6fb91a0191c53148f5a7e5fbfee6276613ac3b950ed837bd8282a4b2bf8a3');
  assert.ok(adapted.pool.every((item) => !Object.hasOwn(item, 'oracle')));
  assert.ok(adapted.pool.every((item) => !Object.hasOwn(item, 'referenceProof')));
  assert.equal(Object.hasOwn(adapted, 'freshPool'), false);
});

test('PrOntoQA scalable core solves the frozen development sample with verified witnesses', async (context) => {
  if (!await hasProntoqaSource()) {
    context.skip(`Official cache absent at ${PRONTOQA_SOURCE.extractedPath}.`);
    return;
  }
  const adapted = await loadProntoqaDevelopmentPool();
  const selectedIds = new Set(adapted.sample.map((item) => item.id));
  const oracle = adapted.oracle.filter((item) => selectedIds.has(item.id));
  const result = scoreProntoqaDevelopmentSample(adapted.sample, oracle);
  assert.equal(result.tested, 158);
  assert.equal(result.correct, 158);
  assert.equal(result.accuracy, 1);
  assert.deepEqual(result.statusCounts, { SOLVED: 158 });
  assert.ok(result.outcomes.every((item) => item.witnessValid));
  assert.equal(result.codingAgentInvocations, 0);
});

test('PrOntoQA compiled task retains a verifiable generic proof under nonce renaming', () => {
  const compiled = compileProntoqaProofTask(example(
    'Every zibble is a troven. Every troven is a murket. Olya is a zibble.',
    'Prove: Olya is a murket.',
  ), 'nonce-verification');
  const result = decideBooleanEntailment(compiled);
  assert.equal(result.entailed, true);
  assert.equal(verifyBooleanEntailmentResult(compiled, result), true);
});
