import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  adaptSpaRpRecord,
  inspectSpaRpJsonFile,
  qualitativeValuesToSpaRpTargets,
  scoreSpaRpTargets,
  spatialVectorValuesToSpaRpTargets,
  SPARP_EXTENT_SYSTEM,
  SPARP_QUALITATIVE_SYSTEM,
  SPARP_SOURCE,
} from '../src/benchmark-adapters/sparp.mjs';
import { STEPGAME_VECTOR_SYSTEM } from '../src/benchmark-adapters/stepgame.mjs';
import { executeSpatialVectorTask, verifySpatialVectorResult } from '../src/reasoning/spatial-vector.mjs';
import { executeSpatialExtentTask, verifySpatialExtentResult } from '../src/reasoning/spatial-extent.mjs';
import {
  executeQualitativeRelationTask,
  verifyQualitativeRelationResult,
} from '../src/reasoning/qualitative-relation-closure.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';

function record(overrides = {}) {
  const choices = ['above', 'below', 'right', 'overlapping', 'left'];
  return {
    instruction: 'Find every supported relation.',
    context: 'R is right of Q. S is above R.',
    question: 'Where is S relative to Q?',
    targets: ['above', 'right'],
    target_choices: choices,
    target_scores: [1, 0, 1, 0, 0],
    reasoning: 'private answer-bearing reasoning',
    source_data: 'StepGame',
    context_id: 'fixture/context',
    question_id: 1,
    symbolic_context: JSON.stringify({ 'R-->Q': ['right'], 'S-->R': ['above'] }),
    symbolic_entity_map: JSON.stringify({ Q: 'Q', R: 'R', S: 'S' }),
    symbolic_question: ['S', 'Q'],
    symbolic_reasoning: JSON.stringify([{ private: true }]),
    num_context_entities: 3,
    num_question_entities: 2,
    question_type: 'FR',
    reasoning_types: [],
    spatial_types: [],
    commonsense_question: '',
    num_hop: 2,
    canary: '',
    comments: [],
    ...overrides,
  };
}

test('PS2 adapter isolates targets and proof text before generic vector execution', () => {
  const adapted = adaptSpaRpRecord(record(), { config: 'ps2', split: 'validation', rowNumber: 1 });
  assert.equal(adapted.visible.methodState, 'direct-symbolic-executable');
  assert.equal(Object.hasOwn(adapted.visible, 'targets'), false);
  assert.equal(JSON.stringify(adapted.visible).includes('private answer-bearing reasoning'), false);
  assert.deepEqual(adapted.oracle.expectedRelations, ['above', 'right']);
  const task = adapted.visible.taskFrame.relationTask;
  const result = executeSpatialVectorTask(task, STEPGAME_VECTOR_SYSTEM);
  assert.equal(result.status, 'SOLVED');
  assert.equal(verifySpatialVectorResult(task, STEPGAME_VECTOR_SYSTEM, result), true);
  const predicted = spatialVectorValuesToSpaRpTargets(result.values);
  assert.deepEqual(predicted, ['above', 'right']);
  assert.equal(scoreSpaRpTargets(predicted, adapted.oracle).exact, true);
  assert.equal(SPARP_SOURCE.license, 'CC-BY-SA-4.0');
});

test('property sets select declared composition semantics and route extent witnesses through the engine', async () => {
  const ps3 = adaptSpaRpRecord(record(), { config: 'ps3', split: 'validation', rowNumber: 1 });
  assert.equal(ps3.visible.methodState, 'direct-symbolic-executable');
  assert.deepEqual(ps3.visible.properties, ['point-object', 'relation-complete', 'unquantified']);
  assert.equal(ps3.visible.taskFrame.relationTask.compositionPolicy, 'invalidate-opposed-steps');
  const ps4 = adaptSpaRpRecord(record({
    symbolic_context: JSON.stringify({
      'R-->Q': ['above', 'right'],
      'S-->R': ['above', 'right'],
    }),
  }), { config: 'ps4', split: 'validation', rowNumber: 1 });
  assert.equal(ps4.visible.methodState, 'direct-symbolic-executable');
  assert.deepEqual(ps4.visible.properties, ['extended-object', 'relation-complete', 'unquantified']);
  const result = new EslmEngine(await createCoreModel()).executeTask(ps4.visible.taskFrame);
  assert.equal(result.plan.methodId, 'method:core:spatial-extent-inequalities');
  assert.deepEqual(result.values, ['above', 'right']);
  assert.equal(verifySpatialExtentResult(ps4.visible.taskFrame.extentTask, SPARP_EXTENT_SYSTEM, result), true);
});

test('PS1 projects topology and containment into the registered declarative qualitative closure', async () => {
  const adapted = adaptSpaRpRecord(record({
    source_data: 'SpaRTUN',
    target_choices: ['above', 'far', 'outside', 'near'],
    targets: ['above', 'far', 'outside'],
    target_scores: [1, 1, 1, 0],
    symbolic_context: JSON.stringify({
      'shape-->box-a': ['tpp'],
      'box-a-->box-b': ['above', 'far', 'dc'],
      'box-b-->item': ['tppi'],
    }),
    symbolic_entity_map: JSON.stringify({ shape: 'shape', 'box-a': 'box-a', 'box-b': 'box-b', item: 'item' }),
    symbolic_question: ['shape', 'item'],
  }), { config: 'ps1', split: 'validation', rowNumber: 1 });
  assert.equal(adapted.visible.methodState, 'direct-symbolic-executable');
  assert.deepEqual(adapted.visible.unsupportedRelations, []);
  const task = adapted.visible.taskFrame.qualitativeTask;
  const result = new EslmEngine(await createCoreModel()).executeTask(adapted.visible.taskFrame);
  assert.equal(result.plan.methodId, 'method:core:declarative-qualitative-relation-closure');
  assert.equal(verifyQualitativeRelationResult(task, SPARP_QUALITATIVE_SYSTEM, result), true);
  const prediction = qualitativeValuesToSpaRpTargets(result.values);
  assert.deepEqual(prediction, ['above', 'far', 'outside']);
  assert.equal(scoreSpaRpTargets(prediction, adapted.oracle).exact, true);
});

test('source inspection streams a top-level JSON array and never passes an oracle by default', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-sparp-'));
  const path = join(directory, 'validation.json');
  await writeFile(path, JSON.stringify([record(), record({ context_id: 'fixture/other' })], null, 2));
  let seen = 0;
  const report = await inspectSpaRpJsonFile(path, {
    config: 'ps2', split: 'validation', includeOracle: false,
    onCase: async (visible, oracle) => {
      seen += 1;
      assert.equal(visible.methodState, 'direct-symbolic-executable');
      assert.equal(oracle, undefined);
    },
  });
  assert.equal(seen, 2);
  assert.equal(report.counts.rows, 2);
  assert.equal(report.counts.directSymbolicExecutable, 2);
  assert.deepEqual(report.counts.byTargetCount, {});
  assert.equal(report.leakagePolicy.languageAgentInvocations, 0);
});

test('schema and redundant oracle encodings must agree', () => {
  assert.throws(() => adaptSpaRpRecord(record({ target_scores: [0, 0, 1, 0, 0] }), {
    config: 'ps2', split: 'validation', rowNumber: 4,
  }), /targets disagree/u);
  assert.throws(() => adaptSpaRpRecord(record({ extra: true }), {
    config: 'ps2', split: 'validation', rowNumber: 4,
  }), /unexpected or missing fields/u);
});
