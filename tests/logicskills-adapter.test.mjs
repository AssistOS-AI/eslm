import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildLogicSkillsPartition,
  inventoryLogicSkillsSource,
  loadLogicSkillsDevelopmentPool,
  logicSkillsSourceRoot,
  runLogicSkillsDevelopmentProbe,
  runLogicSkillsFreshCountermodelAggregate,
} from '../src/benchmark-adapters/logicskills.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';

function row(task, index) {
  if (task === 'countermodel') {
    return {
      id: `countermodel-${index}`, task, language: 'formal',
      input: `Construct a finite model for nonce argument ${index}.\n\nArgument:\n\n∀x(Px→Qx), Pa |= Qa∧Ra`,
      answer: null,
    };
  }
  const language = index % 2 === 0 ? 'english' : 'carroll';
  return {
    id: `${task}-${index}`, task, language,
    input: `Solve ${language} ${task} item ${index} over renamed predicates.`,
    answer: task === 'symbolization' ? `(forall x (P${index} x))` : [(index % 6) + 1],
  };
}

async function sourceTree() {
  const root = await mkdtemp(join(tmpdir(), 'eslm-logicskills-'));
  const data = join(root, 'logicskills', 'data');
  await mkdir(data, { recursive: true });
  for (const [file, task, count] of [
    ['symbolization.jsonl', 'symbolization', 600],
    ['validity.jsonl', 'validity', 600],
    ['countermodel.jsonl', 'countermodel', 300],
  ]) {
    const rows = Array.from({ length: count }, (_, index) => JSON.stringify(row(task, index)));
    await writeFile(join(data, file), `${rows.join('\n')}\n`, 'utf8');
  }
  return root;
}

test('LogicSkills streams the complete normalized fixed evaluation set through closed schemas', async () => {
  const root = await sourceTree();
  const inventory = await inventoryLogicSkillsSource(root);
  assert.equal(inventory.rows, 1_500);
  assert.equal(inventory.files.length, 3);
  assert.deepEqual(inventory.files.map((item) => item.rows), [600, 600, 300]);
  assert.match(inventory.sourceSetSha256, /^[a-f0-9]{64}$/u);
});

test('LogicSkills partition is label-blind and balances every task-language stratum', async () => {
  const root = await sourceTree();
  const before = await buildLogicSkillsPartition(root);
  const path = join(root, 'logicskills', 'data', 'validity.jsonl');
  const lines = (await readFile(path, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first.answer = [first.answer[0] === 6 ? 1 : 6];
  lines[0] = JSON.stringify(first);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
  const after = await buildLogicSkillsPartition(root);
  assert.equal(after.membershipSha256, before.membershipSha256);
  assert.equal(after.development, 1_200);
  assert.equal(after.fresh, 300);
  assert.ok(after.strata.every((stratum) => stratum.development === 240 && stratum.fresh === 60));
});

test('LogicSkills development tasks omit every oracle and current-core gaps remain explicit', async () => {
  const root = await sourceTree();
  const pool = await loadLogicSkillsDevelopmentPool(root);
  assert.equal(pool.available, 1_200);
  assert.equal(pool.freshHeldOut, 300);
  assert.equal(pool.cases.some((item) => Object.hasOwn(item, 'answer')), false);
  assert.equal(JSON.stringify(pool.cases).includes('(forall x (P0 x))'), false);

  const engine = { executeTask: () => ({ status: 'NO_APPLICABLE_METHOD', values: [] }) };
  const result = await runLogicSkillsDevelopmentProbe(engine, root);
  assert.equal(result.tested, 1_200);
  assert.equal(result.answered, 0);
  assert.equal(result.statusCounts.NO_APPLICABLE_METHOD, 1_200);
  assert.equal(result.languageAgentInvocations, 0);
});

test('LogicSkills fresh countermodel evaluator returns aggregates without protected cases or models', async () => {
  const root = await sourceTree();
  const engine = {
    executeTask: (task) => ({ status: 'SOLVED', countermodel: {
      domain: ['0', '1', '2'], constants: { a: '0' },
      predicates: { P: [['0']], Q: [['0']], R: [] },
    } }),
  };
  const result = await runLogicSkillsFreshCountermodelAggregate(engine, root);
  assert.equal(result.tested, 60);
  assert.equal(result.correct, 60);
  assert.equal(result.retainedProtectedItems, 0);
  assert.doesNotMatch(JSON.stringify(result), /countermodel-\d/u);
  assert.equal(Object.hasOwn(result, 'cases'), false);
});

test('LogicSkills rejects unknown source fields and malformed task-dependent oracle shapes', async () => {
  const root = await sourceTree();
  const path = join(root, 'logicskills', 'data', 'symbolization.jsonl');
  const lines = (await readFile(path, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first.unreviewed = true;
  lines[0] = JSON.stringify(first);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
  await assert.rejects(() => inventoryLogicSkillsSource(root), /expected exactly these fields/u);
});

test('generic finite model reasoning verifies every development countermodel without an agent', async () => {
  const result = await runLogicSkillsDevelopmentProbe(
    new EslmEngine(await createCoreModel()),
    logicSkillsSourceRoot(),
  );
  assert.equal(result.tested, 1_200);
  assert.equal(result.verifiedCountermodels, 240);
  assert.equal(result.symbolizationAttempts, 288);
  assert.equal(result.verifiedSymbolizations, 288);
  assert.equal(result.correctSymbolizations, 288);
  assert.equal(result.symbolizationAccuracy, 0.6);
  assert.deepEqual(result.symbolizationMismatchClusters, {});
  assert.equal(result.statusCounts.SOLVED, 528);
  assert.equal(result.statusCounts.NO_APPLICABLE_METHOD, 672);
  assert.equal(result.languageAgentInvocations, 0);
});

test('LogicSkills development receipt separates attempted symbolization, validity abstention, and countermodels',
  async () => {
    const receipt = JSON.parse(await readFile(new URL(
      '../training/benchmark-sources/logicskills/development-result.json', import.meta.url,
    ), 'utf8'));
    assert.equal(receipt.tested, 1_200);
    assertSymbolizationTrack(receipt.symbolizationTrack);
    assert.deepEqual(receipt.validityTrack, {
      tested: 480,
      attempted: 0,
      correct: null,
      accuracy: null,
      status: 'not-scored-no-applicable-validity-method',
    });
    assert.equal(receipt.semanticTrack.correct, 240);
    assert.equal(receipt.languageAgentInvocations, 0);
    assert.match(receipt.protectedBoundary, /not loaded, executed, inspected, or rescored/iu);
  });

function assertSymbolizationTrack(track) {
  assert.equal(track.tested, 480);
  assert.equal(track.attempted, 288);
  assert.equal(track.witnessVerified, 288);
  assert.equal(track.correct, 288);
  assert.equal(track.accuracyOverCompleteDevelopmentTrack, 0.6);
  assert.equal(track.accuracyOnAttempted, 1);
  assert.equal(track.abstained, 192);
  assert.equal(track.mismatches, 0);
}
