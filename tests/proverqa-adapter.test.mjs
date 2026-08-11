import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  adaptProverqaDevelopmentRecord,
  buildProverqaPartition,
  compileProverqaFormulaTask,
  evaluateProverqaFormulaTask,
  hasProverqaSource,
  inventoryProverqaSource,
  loadProverqaDevelopmentPool,
  PROVERQA_SOURCE,
  runProverqaDevelopmentProbe,
} from '../src/benchmark-adapters/proverqa.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function sourceRecord(overrides = {}) {
  return {
    id: 7,
    options: ['A) True', 'B) False', 'C) Uncertain'],
    answer: 'A',
    question: 'Is Nira stable?',
    reasoning: 'Nira glows, and every glowing object is stable.',
    context: 'Nira glows. Every glowing object is stable.',
    nl2fol: {
      'Nira glows.': 'glows(Nira)',
      'Every glowing object is stable.': '∀x (glow(x) → stable(x))',
    },
    conclusion_fol: 'stable(Nira)',
    ...overrides,
  };
}

test('ProverQA formula projection executes renamed finite-domain entailment in the generic Boolean method', () => {
  const positive = compileProverqaFormulaTask([
    'shimmers(Orin)', '∀x (shimmer(x) → balanced(x))',
  ], 'balanced(Orin)');
  assert.equal(evaluateProverqaFormulaTask(positive).predicted, 'A');

  const negative = compileProverqaFormulaTask(['¬balanced(Orin)'], 'balanced(Orin)');
  assert.equal(evaluateProverqaFormulaTask(negative).predicted, 'B');

  const unresolved = compileProverqaFormulaTask(['shimmers(Orin)'], 'balanced(Orin)');
  assert.equal(evaluateProverqaFormulaTask(unresolved).predicted, 'C');
});

test('ProverQA source-local predicate reconciliation is label-blind and survives nonce morphology', () => {
  const task = compileProverqaFormulaTask([
    'observes_quickly(Tarin)', '∀x (quick_observation(x) → remains_calm(x))',
  ], 'remain_calm(Tarin)');
  const result = evaluateProverqaFormulaTask(task);
  assert.equal(result.predicted, 'A');
  assert.equal(result.witnessValid, true);
  assert.ok(result.normalization.mergedPredicates >= 2);
});

test('ProverQA predicate reconciliation accepts only a surface-supported omitted modifier', () => {
  const supported = compileProverqaFormulaTask([
    'tracks_signal(Tarin)', '∀x (tracks_signal_care(x) → remains_calm(x))',
  ], 'remains_calm(Tarin)', {
    premiseStatements: ['Tarin tracks a signal with care.', 'Anyone who tracks a signal with care remains calm.'],
  });
  assert.equal(evaluateProverqaFormulaTask(supported).predicted, 'A');

  const unsupported = compileProverqaFormulaTask([
    'tracks_signal(Tarin)', '∀x (tracks_signal_care(x) → remains_calm(x))',
  ], 'remains_calm(Tarin)', {
    premiseStatements: ['Tarin tracks a signal.', 'Anyone who tracks a signal with care remains calm.'],
  });
  assert.equal(evaluateProverqaFormulaTask(unsupported).predicted, 'C');
});

test('ProverQA adapter keeps the answer and reference reasoning outside the visible task', () => {
  const adapted = adaptProverqaDevelopmentRecord(sourceRecord(), 'easy');
  assert.equal(Object.hasOwn(adapted.visible, 'answer'), false);
  assert.equal(Object.hasOwn(adapted.visible, 'reasoning'), false);
  assert.equal(Object.hasOwn(adapted.visible, 'oracle'), false);
  assert.equal(adapted.oracle.answer, 'A');
  assert.equal(adapted.visible.evidenceRegime, 'annotation-assisted-logical-form-development-diagnostic');
});

test('ProverQA adapter rejects unknown fields and malformed answer domains', () => {
  assert.throws(() => adaptProverqaDevelopmentRecord({ ...sourceRecord(), unreviewed: true }, 'easy'),
    /expected exactly/u);
  assert.throws(() => adaptProverqaDevelopmentRecord(sourceRecord({ answer: 'D' }), 'easy'), /expected A, B, or C/u);
});

test('pinned ProverQA source validates every native file and keeps the fresh pool sealed', async (context) => {
  if (!await hasProverqaSource()) {
    context.skip(`Pinned source absent at ${PROVERQA_SOURCE.cachePath}.`);
    return;
  }
  const inventory = await inventoryProverqaSource();
  assert.equal(inventory.sourceSetSha256, '45022f6eae95e1f1905bf8afdce672f2bf12c1d3f629dd2439f25acb59b23741');
  assert.equal(inventory.evaluationRecords, 1_500);
  assert.equal(inventory.trainingRecords, 5_000);
  assert.equal(inventory.validEmbeddedTrainingOutputs, 4_997);
  assert.equal(inventory.malformedEmbeddedTrainingOutputs, 3);
  assert.equal(inventory.formulaAnnotations, 17_342);
  assert.equal(inventory.formulaOperators.exists, 0);
  assert.equal(inventory.partition.development, 300);
  assert.equal(inventory.partition.fresh, 1_200);
  assert.match(inventory.partition.freshVisibility, /no fresh loader is exported/u);

  const partition = await buildProverqaPartition();
  assert.equal(partition.membershipSha256, '5de79e39983cc3578cc9de6bd75b52221343e215fddd2d0509920f5749cfc013');
});

test('ProverQA development pool is label-free and the logical-form probe is witnessed and agent-free',
  async (context) => {
    if (!await hasProverqaSource()) {
      context.skip(`Pinned source absent at ${PROVERQA_SOURCE.cachePath}.`);
      return;
    }
    const pool = await loadProverqaDevelopmentPool();
    assert.equal(pool.development, 300);
    assert.equal(pool.freshHeldOut, 1_200);
    assert.equal(pool.oracle, 'host-only-not-returned');
    assert.ok(pool.cases.every((item) => !Object.hasOwn(item, 'answer') && !Object.hasOwn(item, 'reasoning')));

    const result = await runProverqaDevelopmentProbe();
    assert.equal(result.tested, 300);
    assert.equal(result.correct, 300);
    assert.equal(result.byLevel.easy.correct, 100);
    assert.equal(result.byLevel.medium.correct, 100);
    assert.equal(result.byLevel.hard.correct, 100);
    assert.equal(result.proofOrCountermodelWitnessesValid, 300);
    assert.equal(result.languageAgentInvocations, 0);
    assert.equal(result.fresh.executed, false);
  });

test('ProverQA receipts retain source identity, evidence regime, and no-core-change decision', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/proverqa');
  const source = JSON.parse(await readFile(join(root, 'source-manifest.json'), 'utf8'));
  const partition = JSON.parse(await readFile(join(root, 'partition-manifest.json'), 'utf8'));
  const result = JSON.parse(await readFile(join(root, 'development-result.json'), 'utf8'));
  const proposal = JSON.parse(await readFile(join(root, 'core-change-proposal.json'), 'utf8'));
  assert.equal(source.datasetRevision, PROVERQA_SOURCE.datasetRevision);
  assert.equal(source.license, 'no-explicit-dataset-license-identifier');
  assert.equal(partition.fresh.executed, true);
  assert.equal(result.correct, 300);
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(proposal.decision, 'no-generic-core-change');
});
