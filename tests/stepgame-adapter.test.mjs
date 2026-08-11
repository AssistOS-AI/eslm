import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  adaptStepGameRecord,
  compileStepGameTemplateCatalog,
  inspectStepGameJsonl,
  scoreStepGameRelation,
  STEPGAME_VECTOR_SYSTEM,
} from '../src/benchmark-adapters/stepgame.mjs';
import { executeSpatialVectorTask, verifySpatialVectorResult } from '../src/reasoning/spatial-vector.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';

const GENERATOR = `
def object1_left_object2(object_1, object_2):
    template_candidates = [
        "AA is west of BB.",
    ]
def object1_right_object2(object_1, object_2):
    template_candidates = [
        "BB is east of AA.",
    ]
def object1_over_object2(object_1, object_2):
    template_candidates = [
        "AA is north of BB.",
    ]
def object1_below_object2(object_1, object_2):
    template_candidates = [
        "BB is south of AA.",
    ]
def object1_lowerleft_object2(object_1, object_2):
    template_candidates = [
        "AA is southwest of BB.",
    ]
def object1_upright_object2(object_1, object_2):
    template_candidates = [
        "BB is northeast of AA.",
    ]
def object1_lowerright_object2(object_1, object_2):
    template_candidates = [
        "AA is southeast of BB.",
    ]
def object1_upleft_object2(object_1, object_2):
    template_candidates = [
        "BB is northwest of AA.",
    ]
`;

function record(overrides = {}) {
  return {
    story: ['B is east of A.', 'C is north of B.', 'X is southwest of Y.'],
    question: 'What is the relation of the agent C to the agent A?',
    label: 'upper-right',
    k_hop: '2',
    ...overrides,
  };
}

test('adapter keeps the answer in a host oracle and the engine routes the generic typed vector task', async () => {
  const catalog = compileStepGameTemplateCatalog(GENERATOR);
  const adapted = adaptStepGameRecord(record(), { split: 'validation', lineNumber: 7, catalog });
  assert.equal(Object.hasOwn(adapted.visible, 'label'), false);
  assert.equal(Object.hasOwn(adapted.visible, 'oracle'), false);
  assert.equal(adapted.oracle.expectedRelation, 'upper-right');
  assert.equal(adapted.visible.taskFrame.relationTask.facts.length, 3);
  const task = adapted.visible.taskFrame.relationTask;
  const result = executeSpatialVectorTask(task, STEPGAME_VECTOR_SYSTEM);
  assert.equal(result.status, 'SOLVED');
  assert.deepEqual(result.values, ['upper-right']);
  assert.equal(verifySpatialVectorResult(task, STEPGAME_VECTOR_SYSTEM, result), true);
  assert.equal(scoreStepGameRelation(result.values[0], adapted.oracle).pass, true);
  const routed = new EslmEngine(await createCoreModel()).executeTask(adapted.visible.taskFrame);
  assert.equal(routed.status, 'SOLVED');
  assert.deepEqual(routed.values, ['upper-right']);
  assert.equal(routed.plan.methodId, 'method:core:spatial-vector-constraints');
  assert.equal(verifySpatialVectorResult(task, STEPGAME_VECTOR_SYSTEM, routed), true);
});

test('direction reversal and renamed entity letters remain contrastive through the engine route', async () => {
  const catalog = compileStepGameTemplateCatalog(GENERATOR);
  const adapted = adaptStepGameRecord(record({
    question: 'What is the relation of the agent A to the agent C?',
    label: 'lower-left',
  }), { split: 'validation', lineNumber: 1, catalog });
  const task = adapted.visible.taskFrame.relationTask;
  const result = new EslmEngine(await createCoreModel()).executeTask(adapted.visible.taskFrame);
  assert.deepEqual(result.values, ['lower-left']);
  assert.equal(verifySpatialVectorResult(task, STEPGAME_VECTOR_SYSTEM, result), true);
  assert.equal(scoreStepGameRelation(result.values[0], adapted.oracle).pass, true);
});

test('JSONL inspection streams every row and exposes the oracle only to an explicit host callback', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-stepgame-'));
  const path = join(directory, 'validation.jsonl');
  await writeFile(path, `${JSON.stringify(record())}\n${JSON.stringify(record({ label: 'upper-right' }))}\n`);
  const catalog = compileStepGameTemplateCatalog(GENERATOR);
  let callbackOracles = 0;
  const report = await inspectStepGameJsonl(path, {
    split: 'validation', catalog, includeOracle: false,
    onCase: async (visible, oracle) => {
      assert.equal(visible.split, 'validation');
      assert.equal(oracle, undefined);
      callbackOracles += 1;
    },
  });
  assert.equal(report.counts.rows, 2);
  assert.equal(report.counts.facts, 6);
  assert.equal(callbackOracles, 2);
  assert.equal(report.leakagePolicy.languageAgentInvocations, 0);
});

test('malformed schema, answer domain, and unmatched templates fail or remain explicit', () => {
  const catalog = compileStepGameTemplateCatalog(GENERATOR);
  assert.throws(() => adaptStepGameRecord({ ...record(), extra: true }, {
    split: 'validation', lineNumber: 1, catalog,
  }), /unexpected or missing fields/u);
  assert.throws(() => adaptStepGameRecord(record({ label: 'elsewhere' }), {
    split: 'validation', lineNumber: 1, catalog,
  }), /invalid answer label/u);
  const adapted = adaptStepGameRecord(record({ story: ['A floats around B.'] }), {
    split: 'validation', lineNumber: 1, catalog,
  });
  assert.equal(adapted.visible.sourceIssues[0].status, 'UNMATCHED_TEMPLATE');
  assert.equal(adapted.visible.taskFrame.relationTask.facts.length, 0);
});
