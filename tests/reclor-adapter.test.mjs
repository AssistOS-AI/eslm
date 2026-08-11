import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as reclorModule from '../src/benchmark-adapters/reclor.mjs';
import {
  adaptReclorDevelopmentRecord,
  hasReclorSource,
  inventoryReclorSource,
  loadReclorDevelopmentPool,
  RECLOR_SOURCE,
  runReclorDevelopmentProbe,
  runReclorTrainingProjectionDiagnostic,
} from '../src/benchmark-adapters/reclor.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function record(overrides = {}) {
  return {
    context: 'Every norvex is stable. Teral is a norvex.',
    question: 'Which conclusion follows from the statements?',
    answers: ['Teral is stable.', 'No norvex is stable.', 'Teral is not a norvex.', 'Nothing follows.'],
    label: 0,
    id_string: 'val_7',
    ...overrides,
  };
}

test('ReClor adaptation keeps the label outside the visible task', () => {
  const first = adaptReclorDevelopmentRecord(record(), 8);
  const second = adaptReclorDevelopmentRecord(record({ label: 2 }), 8);
  assert.deepEqual(first.visible, second.visible);
  assert.equal(first.visible.operation, 'select-logical-reading-comprehension-option');
  assert.equal(first.visible.candidates.length, 4);
  assert.equal(first.oracle.preferredCandidateId, first.visible.candidates[0].candidateId);
  assert.equal(second.oracle.preferredCandidateId, second.visible.candidates[2].candidateId);
  for (const forbidden of ['label', 'answer', 'oracle', 'id_string']) {
    assert.equal(Object.hasOwn(first.visible, forbidden), false);
  }
});

test('ReClor projection survives nonce renaming, option permutation, and a meaning-changing contrast', () => {
  const original = adaptReclorDevelopmentRecord(record(), 8);
  const renamed = adaptReclorDevelopmentRecord(record({
    context: 'Every glim is quiet. Varo is a glim.',
    answers: ['Varo is quiet.', 'No glim is quiet.', 'Varo is not a glim.', 'Nothing follows.'],
    id_string: 'val_91',
  }), 92);
  assert.match(renamed.visible.passage, /glim/u);
  assert.notEqual(renamed.visible.taskId, original.visible.taskId);

  const permuted = adaptReclorDevelopmentRecord(record({
    answers: [record().answers[3], record().answers[1], record().answers[2], record().answers[0]],
    label: 3,
  }), 8);
  const selectedText = (adapted) => adapted.visible.candidates
    .find((candidate) => candidate.candidateId === adapted.oracle.preferredCandidateId).text;
  assert.equal(selectedText(original), selectedText(permuted));

  const contrast = adaptReclorDevelopmentRecord(record({
    context: 'No norvex is stable. Teral is a norvex.',
  }), 8);
  assert.notEqual(contrast.visible.taskId, original.visible.taskId);
  assert.notEqual(contrast.visible.passage, original.visible.passage);
});

test('ReClor adapter rejects schema drift, invalid labels, and malformed choices', () => {
  assert.throws(() => adaptReclorDevelopmentRecord({ ...record(), expected: 0 }), /expected exactly/u);
  assert.throws(() => adaptReclorDevelopmentRecord(record({ label: 4 })), /0 through 3/u);
  assert.throws(() => adaptReclorDevelopmentRecord(record({ answers: ['only one'] })), /four answer/u);
});

test('complete pinned ReClor source is accounted without opening the evaluator-only test content',
  async (context) => {
    if (!await hasReclorSource()) {
      context.skip(`Pinned source absent at ${RECLOR_SOURCE.extractedPath}.`);
      return;
    }
    const inventory = await inventoryReclorSource();
    assert.equal(inventory.sourceRows, 6_138);
    assert.equal(inventory.visibleValidatedRows, 5_138);
    assert.equal(inventory.splits.train.rows, 4_638);
    assert.equal(inventory.splits.development.rows, 500);
    assert.equal(inventory.splits.test.rows, 1_000);
    assert.match(inventory.splits.test.visibility, /content-not-opened/u);
    assert.match(inventory.sizePolicy, /no row or byte quota discards valid records/u);
    assert.equal(Object.hasOwn(reclorModule, 'loadReclorTestPool'), false);
  });

test('complete ReClor validation probe is direct-only and remains unscored without a method', async (context) => {
  if (!await hasReclorSource()) {
    context.skip(`Pinned source absent at ${RECLOR_SOURCE.extractedPath}.`);
    return;
  }
  const pool = await loadReclorDevelopmentPool();
  assert.equal(pool.available, 500);
  assert.equal(pool.cases.length, 500);
  assert.equal(pool.oracle, 'host-only-not-returned');
  assert.ok(pool.cases.every((task) => !Object.hasOwn(task, 'label')
    && !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'oracle')));

  const result = await runReclorDevelopmentProbe(new EslmEngine(await createCoreModel()));
  assert.equal(result.tested, 500);
  assert.equal(result.available, 500);
  assert.equal(result.answered, 0);
  assert.equal(result.correct, null);
  assert.equal(result.benchmarkAccuracy, null);
  assert.equal(result.scoreStatus, 'not-scored-no-applicable-method');
  assert.deepEqual(result.statusCounts, { NO_APPLICABLE_METHOD: 500 });
  assert.equal(result.categoricalMethodAttempts, 0);
  assert.deepEqual(result.projectionFailureCounts,
    { 'question-operation': 466, 'premise-semantics': 23, 'argument-boundary': 11 });
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.protectedSplit.executed, false);
});

test('complete ReClor training projection diagnostic rejects unsafe partial interpretations', async (context) => {
  if (!await hasReclorSource()) {
    context.skip(`Pinned source absent at ${RECLOR_SOURCE.extractedPath}.`);
    return;
  }
  const result = await runReclorTrainingProjectionDiagnostic(new EslmEngine(await createCoreModel()));
  assert.equal(result.tested, 4_638);
  assert.equal(result.categoricalMethodAttempts, 0);
  assert.equal(result.projectionDiagnosticCounts['missing categorical quantifier'], 207);
  assert.equal(result.projectionDiagnosticCounts['requires exactly one explicit conclusion marker'], 80);
});

test('ReClor committed receipts preserve identity, split boundary, and honest score absence', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/reclor');
  const source = JSON.parse(await readFile(join(root, 'source-manifest.json'), 'utf8'));
  const result = JSON.parse(await readFile(join(root, 'development-result.json'), 'utf8'));
  const decision = JSON.parse(await readFile(join(root, 'core-change-decision.json'), 'utf8'));
  assert.equal(source.codeRevision, RECLOR_SOURCE.codeRevision);
  assert.equal(source.sourceRows, 6_138);
  assert.equal(result.tested, 500);
  assert.equal(result.benchmarkAccuracy, null);
  assert.equal(result.protectedSplit.executed, false);
  assert.equal(decision.decision, 'no-generic-core-promotion');
});
