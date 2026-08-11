import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  adaptDefeasibleNliDevelopmentRecord,
  classifyDefeasibleNliTask,
  compileDefeasibleNliEvidenceTask,
  DEFEASIBLE_NLI_SOURCE,
  hasDefeasibleNliSource,
  inventoryDefeasibleNliSource,
  loadDefeasibleNliDevelopmentPool,
  runDefeasibleNliDevelopmentProbe,
  runDefeasibleNliTypedDevelopmentProbe,
} from '../src/benchmark-adapters/defeasible-nli.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function atomicRecord(overrides = {}) {
  return {
    DataSource: 'ATOMIC',
    AssignmentIdAnon: 11,
    WorkerIdAnon: 19,
    Hypothesis: 'As a result, Vela feels prepared',
    Update: 'Vela rehearsed the procedure twice.',
    UpdateType: 'strengthener',
    UpdateTypeImpossible: false,
    UpdateTypeImpossibleReason: '',
    Premise: 'Vela begins the demonstration',
    AtomicEventId: 'nonce-event',
    AtomicEventRelationId: 'nonce-relation',
    AtomicInference: 'feels prepared',
    AtomicRelationType: 'xReact',
    ...overrides,
  };
}

test('Defeasible NLI adapter keeps the development label and worker metadata outside the visible task', () => {
  const adapted = adaptDefeasibleNliDevelopmentRecord(atomicRecord(), 'atomic', 7);
  const contrastiveOracle = adaptDefeasibleNliDevelopmentRecord(
    atomicRecord({ UpdateType: 'weakener' }), 'atomic', 7,
  );
  assert.deepEqual(adapted.visible.outputContract.values, ['strengthener', 'weakener']);
  assert.equal(adapted.visible.premise, 'Vela begins the demonstration');
  for (const forbidden of ['UpdateType', 'answer', 'oracle', 'AssignmentIdAnon', 'WorkerIdAnon']) {
    assert.equal(Object.hasOwn(adapted.visible, forbidden), false);
  }
  assert.deepEqual(adapted.oracle, { excluded: false, label: 'strengthener' });
  assert.deepEqual(contrastiveOracle.visible, adapted.visible);
  assert.deepEqual(contrastiveOracle.oracle, { excluded: false, label: 'weakener' });
});

test('Defeasible NLI adapter rejects schema drift and retains owner-declared impossible rows as exclusions', () => {
  assert.throws(() => adaptDefeasibleNliDevelopmentRecord({ ...atomicRecord(), hiddenHint: true }, 'atomic'),
    /expected exactly/u);
  assert.throws(() => adaptDefeasibleNliDevelopmentRecord(atomicRecord({ UpdateType: 'maybe' }), 'atomic'),
    /strengthener or weakener/u);
  const impossible = adaptDefeasibleNliDevelopmentRecord(atomicRecord({
    Update: '', UpdateTypeImpossible: true, UpdateTypeImpossibleReason: 'No coherent update was collected.',
  }), 'atomic');
  assert.equal(impossible.visible, null);
  assert.deepEqual(impossible.oracle, { excluded: true, reason: 'No coherent update was collected.' });
});

test('typed defeasible update comparison generalizes across renamed events and abstains without evidence', () => {
  const supportive = adaptDefeasibleNliDevelopmentRecord(atomicRecord({
    Premise: 'Qorin began the norvex trial.',
    Hypothesis: 'Qorin felt prepared.',
    Update: 'Qorin felt prepared.',
  }), 'atomic', 31).visible;
  const opposing = adaptDefeasibleNliDevelopmentRecord(atomicRecord({
    Premise: 'Qorin began the norvex trial.',
    Hypothesis: 'Qorin felt prepared.',
    Update: 'Qorin did not feel prepared.',
  }), 'atomic', 32).visible;
  const unrelated = adaptDefeasibleNliDevelopmentRecord(atomicRecord({
    Premise: 'Qorin began the norvex trial.',
    Hypothesis: 'Qorin felt prepared.',
    Update: 'Miro painted a distant wall.',
  }), 'atomic', 33).visible;

  assert.ok(compileDefeasibleNliEvidenceTask(supportive).evidence.every((item) => item.provenance));
  assert.deepEqual(classifyDefeasibleNliTask(supportive).values, ['strengthener']);
  assert.deepEqual(classifyDefeasibleNliTask(opposing).values, ['weakener']);
  assert.equal(classifyDefeasibleNliTask(unrelated).status, 'UNKNOWN');
  assert.equal(classifyDefeasibleNliTask(supportive).witnessValid, true);
  assert.equal(classifyDefeasibleNliTask(opposing).witnessValid, true);
});

test('full pinned Defeasible NLI release validates and preserves every official split', async (context) => {
  if (!await hasDefeasibleNliSource()) {
    context.skip(`Pinned source absent at ${DEFEASIBLE_NLI_SOURCE.extractedPath}.`);
    return;
  }
  const inventory = await inventoryDefeasibleNliSource();
  assert.equal(inventory.sourceSetSha256, '0a3258f0221ef2fbfdedb2dd0466220ab8ca6e9bd3bc981b25191b126c3c97bd');
  assert.deepEqual(inventory.aggregate, {
    train: { rows: 213_226, eligible: 200_692, impossible: 12_534 },
    dev: { rows: 16_008, eligible: 14_968, impossible: 1_040 },
    test: { rows: 16_486, eligible: 15_414, impossible: 1_072 },
  });
  assert.equal(inventory.files.length, 9);
  assert.match(inventory.lifecycle, /test remains evaluator-only/u);
  assert.match(inventory.sizePolicy, /no arbitrary source-byte or row-count rejection/u);
});

test('complete official development probe is direct-only and leaves the test oracle sealed',
  async (context) => {
    if (!await hasDefeasibleNliSource()) {
      context.skip(`Pinned source absent at ${DEFEASIBLE_NLI_SOURCE.extractedPath}.`);
      return;
    }
    const pool = await loadDefeasibleNliDevelopmentPool();
    assert.equal(pool.officialSourceRows, 16_008);
    assert.equal(pool.experimentalCases, 14_968);
    assert.deepEqual(pool.excludedImpossible, { atomic: 470, snli: 103, social: 467 });
    assert.equal(pool.oracle, 'host-only-not-returned');
    assert.ok(pool.cases.every((task) => !Object.hasOwn(task, 'UpdateType')
      && !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'oracle')));

    const engine = new EslmEngine(await createCoreModel());
    const result = await runDefeasibleNliDevelopmentProbe(engine);
    assert.equal(result.tested, 14_968);
    assert.equal(result.answered, 0);
    assert.equal(result.correct, 0);
    assert.equal(result.accuracyOnAnswered, null);
    assert.deepEqual(result.statusCounts, { NO_APPLICABLE_METHOD: 14_968 });
    assert.equal(result.languageAgentInvocations, 0);
    assert.equal(result.test.executed, false);
  });

test('typed Defeasible NLI development probe remains direct-only and reports explicit coverage',
  async (context) => {
    if (!await hasDefeasibleNliSource()) {
      context.skip(`Pinned source absent at ${DEFEASIBLE_NLI_SOURCE.extractedPath}.`);
      return;
    }
    const result = await runDefeasibleNliTypedDevelopmentProbe();
    assert.equal(result.tested, 14_968);
    assert.equal(result.answered + result.unknown, result.tested);
    assert.equal(result.coverage, result.answered / result.tested);
    assert.equal(result.witnessValid, result.answered);
    assert.equal(result.languageAgentInvocations, 0);
    assert.equal(result.test.executed, false);
  });

test('Defeasible NLI receipts preserve source identity and the no-core-change decision', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/defeasible-nli');
  const source = JSON.parse(await readFile(join(root, 'source-manifest.json'), 'utf8'));
  const result = JSON.parse(await readFile(join(root, 'development-result.json'), 'utf8'));
  const proposal = JSON.parse(await readFile(join(root, 'core-change-proposal.json'), 'utf8'));
  const typed = JSON.parse(await readFile(join(root, 'typed-evidence-development-result.json'), 'utf8'));
  const review = JSON.parse(await readFile(join(root, 'typed-evidence-core-review.json'), 'utf8'));
  assert.equal(source.revision, DEFEASIBLE_NLI_SOURCE.revision);
  assert.equal(source.sourceRows, 245_720);
  assert.equal(result.tested, 14_968);
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.test.executed, false);
  assert.equal(proposal.decision, 'no-generic-core-change');
  assert.deepEqual({ tested: typed.tested, answered: typed.answered, correct: typed.correct },
    { tested: 14_968, answered: 5_519, correct: 2_721 });
  assert.equal(typed.test.executed, false);
  assert.equal(typed.decision, 'reject-automatic-frame-overlap-as-a-defeasible-semantic-projection');
  assert.equal(review.guardianDecision, 'accept-isolated-mechanism-reject-source-claim');
});
