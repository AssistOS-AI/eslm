import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  adaptAlphaNliArtDevelopmentRecord,
  ALPHA_NLI_ART_SOURCE,
  compileAlphaNliArtEvidenceTask,
  hasAlphaNliArtSource,
  inventoryAlphaNliArtSource,
  loadAlphaNliArtDevelopmentPool,
  runAlphaNliArtDevelopmentProbe,
  runAlphaNliArtTypedDevelopmentProbe,
  selectAlphaNliArtBridge,
} from '../src/benchmark-adapters/alpha-nli-art.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function record(overrides = {}) {
  return {
    story_id: 'nonce-story-17',
    obs1: 'Vela placed a sealed vial on the bench.',
    obs2: 'The liquid in the vial had turned violet.',
    hyp1: 'Vela added a reagent that changes color in acid.',
    hyp2: 'Vela stored an empty box in another room.',
    ...overrides,
  };
}

test('alphaNLI/ART adaptation keeps the preferred bridge outside the visible task', () => {
  const first = adaptAlphaNliArtDevelopmentRecord(record(), '1', 7);
  const second = adaptAlphaNliArtDevelopmentRecord(record(), '2', 7);
  assert.deepEqual(first.visible, second.visible);
  assert.equal(first.visible.operation, 'select-narrative-bridge');
  assert.equal(first.visible.before.surface, record().obs1);
  assert.equal(first.visible.after.surface, record().obs2);
  assert.equal(first.visible.candidates.length, 2);
  assert.equal(first.oracle.preferredCandidateId, first.visible.candidates[0].candidateId);
  assert.equal(second.oracle.preferredCandidateId, second.visible.candidates[1].candidateId);
  for (const forbidden of ['label', 'answer', 'oracle', 'preferredCandidateId', 'story_id']) {
    assert.equal(Object.hasOwn(first.visible, forbidden), false);
  }
});

test('alphaNLI/ART task projection remains structural after full entity and event renaming', () => {
  const renamed = adaptAlphaNliArtDevelopmentRecord(record({
    story_id: 'another-source-key',
    obs1: 'Qorin switched on the norvex chamber.',
    obs2: 'A strip inside the chamber emitted blue light.',
    hyp1: 'Qorin inserted a luminescent trel before closing it.',
    hyp2: 'Qorin mailed a paper map to Zava.',
  }), '1', 9);
  assert.equal(renamed.visible.operation, 'select-narrative-bridge');
  assert.deepEqual(renamed.visible.outputContract, { kind: 'candidate-id' });
  assert.notEqual(renamed.visible.taskId,
    adaptAlphaNliArtDevelopmentRecord(record(), '1', 7).visible.taskId);
  assert.match(renamed.visible.before.surface, /Qorin/u);
});

test('alphaNLI/ART candidate permutation preserves oracle meaning and changed aftermath changes the task', () => {
  const original = adaptAlphaNliArtDevelopmentRecord(record(), '1', 3);
  const permuted = adaptAlphaNliArtDevelopmentRecord(record({
    hyp1: record().hyp2,
    hyp2: record().hyp1,
  }), '2', 3);
  const selectedText = (adapted) => adapted.visible.candidates
    .find((candidate) => candidate.candidateId === adapted.oracle.preferredCandidateId).bridgeText;
  assert.equal(selectedText(original), selectedText(permuted));
  assert.notDeepEqual(original.visible.candidates, permuted.visible.candidates);

  const contrast = adaptAlphaNliArtDevelopmentRecord(record({
    obs2: 'The liquid in the vial remained completely clear.',
  }), '1', 3);
  assert.notEqual(contrast.visible.taskId, original.visible.taskId);
  assert.notDeepEqual(contrast.visible.after, original.visible.after);
});

test('typed narrative bridge selection survives nonce renaming and candidate permutation', () => {
  const source = record({
    story_id: 'nonce-bridge-source',
    obs1: 'Zava carried the trel through the gate.',
    obs2: 'Zava stored the trel in the chamber.',
    hyp1: 'Zava carried the trel into the chamber.',
    hyp2: 'Miro painted a distant wall.',
  });
  const original = adaptAlphaNliArtDevelopmentRecord(source, '1', 41).visible;
  const originalResult = selectAlphaNliArtBridge(original);
  assert.equal(originalResult.status, 'DEFEASIBLE');
  assert.equal(originalResult.values[0], original.candidates[0].candidateId);
  assert.equal(originalResult.witnessValid, true);
  assert.ok(compileAlphaNliArtEvidenceTask(original).evidence.every((item) => item.provenance));

  const permuted = adaptAlphaNliArtDevelopmentRecord({
    ...source,
    story_id: 'nonce-bridge-permuted',
    hyp1: source.hyp2,
    hyp2: source.hyp1,
  }, '2', 42).visible;
  const permutedResult = selectAlphaNliArtBridge(permuted);
  assert.equal(permutedResult.status, 'DEFEASIBLE');
  assert.equal(permutedResult.values[0], permuted.candidates[1].candidateId);
});

test('typed narrative bridge selection returns UNKNOWN when only the shared temporal slot is known', () => {
  const task = adaptAlphaNliArtDevelopmentRecord(record({
    story_id: 'nonce-unknown-bridge',
    obs1: 'Zava inspected a trel.',
    obs2: 'Qorin repaired a norvex.',
    hyp1: 'Miro painted a distant wall.',
    hyp2: 'Sela counted three lanterns.',
  }), '1', 43).visible;
  const result = selectAlphaNliArtBridge(task);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.uncertainty.kind, 'score-tie-or-insufficient-margin');
  assert.equal(result.witnessValid, true);
});

test('alphaNLI/ART adapter rejects schema drift, invalid labels, and invalid text', () => {
  assert.throws(() => adaptAlphaNliArtDevelopmentRecord({ ...record(), expected: 1 }), /expected exactly/u);
  assert.throws(() => adaptAlphaNliArtDevelopmentRecord(record(), '0'), /expected label 1 or 2/u);
  assert.throws(() => adaptAlphaNliArtDevelopmentRecord(record({ hyp2: '' }), '2'), /expected non-empty text/u);
});

test('complete pinned alphaNLI/ART source validates without discarding source rows', async (context) => {
  if (!await hasAlphaNliArtSource()) {
    context.skip(`Pinned source absent at ${ALPHA_NLI_ART_SOURCE.extractedPath}.`);
    return;
  }
  const inventory = await inventoryAlphaNliArtSource();
  assert.equal(inventory.sourceRows, 174_245);
  assert.equal(inventory.sourceSetSha256, 'b2e3ea025d1f5771264716bd6b5a4cabd6a28bb16c96d7a4035bcec10f6d2c9c');
  assert.deepEqual(inventory.splits.map((split) => ({
    split: split.split,
    rows: split.rows,
    identicalHypotheses: split.identicalHypotheses,
    duplicateVisibleCases: split.duplicateVisibleCases,
  })), [
    { split: 'train', rows: 169_654, identicalHypotheses: 52, duplicateVisibleCases: 1_445 },
    { split: 'dev', rows: 1_532, identicalHypotheses: 0, duplicateVisibleCases: 0 },
    { split: 'test', rows: 3_059, identicalHypotheses: 0, duplicateVisibleCases: 0 },
  ]);
  assert.match(inventory.sizePolicy, /no row or byte quota discards valid records/u);
  assert.match(inventory.lifecycle.test, /sealed-fresh/u);
});

test('complete official development probe is direct-only and leaves official test sealed', async (context) => {
  if (!await hasAlphaNliArtSource()) {
    context.skip(`Pinned source absent at ${ALPHA_NLI_ART_SOURCE.extractedPath}.`);
    return;
  }
  const pool = await loadAlphaNliArtDevelopmentPool();
  assert.equal(pool.available, 1_532);
  assert.equal(pool.cases.length, 1_532);
  assert.equal(pool.oracle, 'host-only-not-returned');
  assert.ok(pool.cases.every((task) => !Object.hasOwn(task, 'label')
    && !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'oracle')));

  const engine = new EslmEngine(await createCoreModel());
  const result = await runAlphaNliArtDevelopmentProbe(engine);
  assert.equal(result.tested, 1_532);
  assert.equal(result.available, 1_532);
  assert.equal(result.answered, 0);
  assert.equal(result.correct, 0);
  assert.equal(result.accuracyOnAnswered, null);
  assert.deepEqual(result.statusCounts, { NO_APPLICABLE_METHOD: 1_532 });
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.fresh.executed, false);
  assert.equal(result.fresh.available, 3_059);
});

test('typed alphaNLI/ART development probe remains direct-only and reports explicit coverage',
  async (context) => {
    if (!await hasAlphaNliArtSource()) {
      context.skip(`Pinned source absent at ${ALPHA_NLI_ART_SOURCE.extractedPath}.`);
      return;
    }
    const result = await runAlphaNliArtTypedDevelopmentProbe();
    assert.equal(result.tested, 1_532);
    assert.equal(result.answered + result.unknown, result.tested);
    assert.equal(result.coverage, result.answered / result.tested);
    assert.equal(result.witnessValid, result.answered);
    assert.equal(result.languageAgentInvocations, 0);
    assert.equal(result.fresh.executed, false);
  });

test('alphaNLI/ART receipts preserve source identity and the no-core-change checkpoint', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/alpha-nli-art');
  const source = JSON.parse(await readFile(join(root, 'source-manifest.json'), 'utf8'));
  const result = JSON.parse(await readFile(join(root, 'development-result.json'), 'utf8'));
  const proposal = JSON.parse(await readFile(join(root, 'core-change-proposal.json'), 'utf8'));
  const typed = JSON.parse(await readFile(join(root, 'typed-evidence-development-result.json'), 'utf8'));
  const review = JSON.parse(await readFile(join(root, 'typed-evidence-core-review.json'), 'utf8'));
  assert.equal(source.codeRevision, ALPHA_NLI_ART_SOURCE.codeRevision);
  assert.equal(source.sourceRows, 174_245);
  assert.equal(result.tested, 1_532);
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.fresh.executed, false);
  assert.equal(proposal.decision, 'no-generic-core-change');
  assert.deepEqual({ tested: typed.tested, answered: typed.answered, correct: typed.correct },
    { tested: 1_532, answered: 826, correct: 440 });
  assert.equal(typed.fresh.executed, false);
  assert.equal(typed.decision, 'reject-automatic-frame-overlap-as-a-narrative-bridge-selector');
  assert.equal(review.guardianDecision, 'accept-isolated-mechanism-reject-source-claim');
});
