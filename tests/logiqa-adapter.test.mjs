import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as logiqaModule from '../src/benchmark-adapters/logiqa.mjs';
import {
  adaptLogiqaDevelopmentLines,
  hasLogiqaSource,
  inventoryLogiqaSource,
  loadLogiqaDevelopmentPool,
  LOGIQA_SOURCE,
  runLogiqaDevelopmentProbe,
  runLogiqaTrainingProjectionDiagnostic,
} from '../src/benchmark-adapters/logiqa.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function lines(overrides = {}) {
  const value = {
    label: 'a',
    context: 'Every zorp is calm. Rinel is a zorp.',
    question: 'Which option is guaranteed?',
    answers: ['Rinel is calm.', 'No zorp is calm.', 'Rinel is not a zorp.', 'Nothing is guaranteed.'],
    ...overrides,
  };
  return ['', value.label, value.context, value.question,
    ...value.answers.map((answer, index) => `${String.fromCodePoint(65 + index)}.${answer}`)];
}

test('LogiQA adaptation keeps the option letter outside the visible task', () => {
  const first = adaptLogiqaDevelopmentLines(lines(), 4);
  const second = adaptLogiqaDevelopmentLines(lines({ label: 'c' }), 4);
  assert.deepEqual(first.visible, second.visible);
  assert.equal(first.visible.operation, 'select-logical-reading-comprehension-option');
  assert.equal(first.oracle.preferredCandidateId, first.visible.candidates[0].candidateId);
  assert.equal(second.oracle.preferredCandidateId, second.visible.candidates[2].candidateId);
  for (const forbidden of ['label', 'answer', 'oracle', 'correctOption']) {
    assert.equal(Object.hasOwn(first.visible, forbidden), false);
  }
});

test('LogiQA projection survives nonce renaming, option permutation, and a semantic contrast', () => {
  const original = adaptLogiqaDevelopmentLines(lines(), 4);
  const renamed = adaptLogiqaDevelopmentLines(lines({
    context: 'Every trel is bright. Olan is a trel.',
    answers: ['Olan is bright.', 'No trel is bright.', 'Olan is not a trel.', 'Nothing is guaranteed.'],
  }), 83);
  assert.match(renamed.visible.passage, /trel/u);
  assert.notEqual(renamed.visible.taskId, original.visible.taskId);

  const source = lines();
  const choices = source.slice(4).map((choice) => choice.slice(2));
  const permuted = adaptLogiqaDevelopmentLines(lines({
    label: 'd', answers: [choices[3], choices[1], choices[2], choices[0]],
  }), 4);
  const selectedText = (adapted) => adapted.visible.candidates
    .find((candidate) => candidate.candidateId === adapted.oracle.preferredCandidateId).text;
  assert.equal(selectedText(original), selectedText(permuted));

  const contrast = adaptLogiqaDevelopmentLines(lines({
    context: 'No zorp is calm. Rinel is a zorp.',
  }), 4);
  assert.notEqual(contrast.visible.taskId, original.visible.taskId);
});

test('LogiQA adapter rejects schema drift in the native eight-line records', () => {
  assert.throws(() => adaptLogiqaDevelopmentLines(lines({ label: 'e' })), /option letter/u);
  assert.throws(() => adaptLogiqaDevelopmentLines(lines().slice(1)), /eight physical lines/u);
  const wrongPrefix = lines();
  wrongPrefix[4] = '';
  assert.throws(() => adaptLogiqaDevelopmentLines(wrongPrefix), /non-empty text/u);
});

test('LogiQA follows the owner-defined physical option slots when decorative prefixes disagree', () => {
  const reordered = lines({ label: 'b' });
  [reordered[5], reordered[6]] = [reordered[6], reordered[5]];
  const adapted = adaptLogiqaDevelopmentLines(reordered, 43);
  const selected = adapted.visible.candidates
    .find((candidate) => candidate.candidateId === adapted.oracle.preferredCandidateId);
  assert.equal(selected.text, 'Rinel is not a zorp.');
});

test('complete pinned LogiQA bilingual source is accounted while test content remains sealed', async (context) => {
  if (!await hasLogiqaSource()) {
    context.skip(`Pinned source absent at ${LOGIQA_SOURCE.cachePath}.`);
    return;
  }
  const inventory = await inventoryLogiqaSource();
  assert.equal(inventory.sourceRows, 17_356);
  assert.equal(inventory.semanticCasesPerLanguage, 8_678);
  assert.equal(inventory.files.find((file) => file.language === 'en' && file.split === 'train').rows, 7_376);
  assert.equal(inventory.files.find((file) => file.language === 'en' && file.split === 'development').rows, 651);
  assert.match(inventory.files.find((file) => file.language === 'en' && file.split === 'test').visibility,
    /content-not-opened/u);
  assert.match(inventory.sizePolicy, /no row or byte quota discards valid records/u);
  assert.equal(Object.hasOwn(logiqaModule, 'loadLogiqaTestPool'), false);
});

test('complete LogiQA English development probe is direct-only and unscored without a method', async (context) => {
  if (!await hasLogiqaSource()) {
    context.skip(`Pinned source absent at ${LOGIQA_SOURCE.cachePath}.`);
    return;
  }
  const pool = await loadLogiqaDevelopmentPool();
  assert.equal(pool.available, 651);
  assert.equal(pool.cases.length, 651);
  assert.equal(pool.ChineseDevelopmentPreservedOutsideProfile, 651);
  assert.ok(pool.cases.every((task) => !Object.hasOwn(task, 'label')
    && !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'oracle')));

  const result = await runLogiqaDevelopmentProbe(new EslmEngine(await createCoreModel()));
  assert.equal(result.tested, 651);
  assert.equal(result.available, 651);
  assert.equal(result.answered, 0);
  assert.equal(result.correct, null);
  assert.equal(result.benchmarkAccuracy, null);
  assert.equal(result.scoreStatus, 'not-scored-no-applicable-method');
  assert.deepEqual(result.statusCounts, { NO_APPLICABLE_METHOD: 651 });
  assert.equal(result.categoricalMethodAttempts, 0);
  assert.deepEqual(result.projectionFailureCounts,
    { 'question-operation': 613, 'premise-semantics': 38 });
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.protectedSplit.executed, false);
});

test('complete LogiQA training projection diagnostic refuses an incompletely parsed candidate set',
  async (context) => {
    if (!await hasLogiqaSource()) {
      context.skip(`Pinned source absent at ${LOGIQA_SOURCE.cachePath}.`);
      return;
    }
    const result = await runLogiqaTrainingProjectionDiagnostic(new EslmEngine(await createCoreModel()));
    assert.equal(result.tested, 7_376);
    assert.equal(result.categoricalMethodAttempts, 0);
    assert.equal(result.projectionFailureCounts['candidate-semantics'], 1);
    assert.equal(result.projectionDiagnosticCounts['missing categorical quantifier'], 149);
  });

test('LogiQA committed receipts preserve identity, bilingual coverage, and honest score absence', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/logiqa');
  const source = JSON.parse(await readFile(join(root, 'source-manifest.json'), 'utf8'));
  const result = JSON.parse(await readFile(join(root, 'development-result.json'), 'utf8'));
  const decision = JSON.parse(await readFile(join(root, 'core-change-decision.json'), 'utf8'));
  assert.equal(source.revision, LOGIQA_SOURCE.revision);
  assert.equal(source.sourceRows, 17_356);
  assert.equal(result.tested, 651);
  assert.equal(result.benchmarkAccuracy, null);
  assert.equal(result.protectedSplit.executed, false);
  assert.equal(decision.decision, 'no-generic-core-promotion');
});
