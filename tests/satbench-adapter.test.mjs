import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compileSatbenchFormulaTask,
  hasSatbenchSource,
  inventorySatbenchSource,
  loadSatbenchDevelopmentPool,
  SATBENCH_PARTITION,
  SATBENCH_SOURCE,
  scoreSatbenchDevelopment,
} from '../src/benchmark-adapters/satbench.mjs';

function sourceRecord(clauses, satisfiable) {
  const reasonField = satisfiable ? { sat_reason: 'A satisfying assignment exists.' }
    : { unsat_reason: 'The unit clauses force opposite values.' };
  return {
    dims: [3],
    num_vars: 3,
    num_clauses: clauses.length,
    clauses,
    readable: 'A finite CNF formula.',
    satisfiable,
    ...reasonField,
    scenario: 'Three independent switches may each be on or off.',
    variable_mapping: 'Each numbered variable denotes one switch.',
    conditions: clauses.map((_clause, index) => `Constraint ${index + 1}.`),
    question: 'Can all constraints be satisfied simultaneously?',
    formula_equivalence_check: '[EQUIVALENT]',
    recovered_formula: 'A finite CNF formula.',
    recovered_formula_full_text: '[A finite CNF formula.]',
    consistency_check_trace_history: [{
      attempt: 1,
      conditions: clauses.map((_clause, index) => `Constraint ${index + 1}.`),
      question: 'Can all constraints be satisfied simultaneously?',
      trace: 'The conditions and formula have the same structure.',
    }],
  };
}

function scoreFixture(record, expected) {
  const task = compileSatbenchFormulaTask(record, 'fixture');
  return scoreSatbenchDevelopment([{
    id: 'fixture', task,
  }], [{ id: 'fixture', satisfiable: expected }]);
}

test('SATBench formula projection returns verified SAT assignments and UNSAT certificates', () => {
  const satisfiable = scoreFixture(sourceRecord([[1, 2], [-1, 2]], true), true);
  assert.equal(satisfiable.correct, 1);
  assert.deepEqual(satisfiable.witnessKinds, { 'satisfying-assignment': 1 });
  assert.equal(satisfiable.outcomes[0].witnessValid, true);

  const unsatisfiable = scoreFixture(sourceRecord([[1], [-1]], false), false);
  assert.equal(unsatisfiable.correct, 1);
  assert.deepEqual(unsatisfiable.witnessKinds, { 'dpll-inconsistency-certificate': 1 });
  assert.equal(unsatisfiable.outcomes[0].witnessValid, true);
});

test('variable renaming and clause ordering preserve the decision while a removed conflict changes it', () => {
  const original = sourceRecord([[1, 2], [-1], [-2]], false);
  const renamedAndReordered = sourceRecord([[-3], [-2], [2, 3]], false);
  assert.equal(scoreFixture(original, false).correct, 1);
  assert.equal(scoreFixture(renamedAndReordered, false).correct, 1);

  const changed = sourceRecord([[1, 2], [-1]], true);
  assert.equal(scoreFixture(changed, true).correct, 1);
});

test('SATBench projection rejects schema drift, tautologies, and invalid signed variables', () => {
  assert.throws(() => compileSatbenchFormulaTask({ ...sourceRecord([[1]], true), answer: 'SAT' }),
    /expected exactly/u);
  assert.throws(() => compileSatbenchFormulaTask(sourceRecord([[1, -1]], true)), /tautological clause/u);
  assert.throws(() => compileSatbenchFormulaTask(sourceRecord([[4]], true)), /within num_vars/u);
});

test('official SATBench source is completely streamed and partitioned without label-bearing task fields',
  async (context) => {
    if (!await hasSatbenchSource()) {
      context.skip(`Official cache absent at ${SATBENCH_SOURCE.datasetPath}.`);
      return;
    }
    const inventory = await inventorySatbenchSource();
    assert.equal(inventory.records, 2_100);
    assert.deepEqual(inventory.labels, { SAT: 1_050, UNSAT: 1_050 });
    assert.equal(Object.keys(inventory.clauseCounts).length, 15);
    assert.ok(Object.values(inventory.clauseCounts).every((count) => count === 140));
    assert.equal(inventory.partition.development.count, 420);
    assert.equal(inventory.partition.fresh.count, 1_680);
    assert.equal(inventory.partition.development.membershipSha256,
      SATBENCH_PARTITION.developmentMembershipSha256);
    assert.equal(inventory.partition.fresh.membershipSha256, SATBENCH_PARTITION.freshMembershipSha256);

    const development = await loadSatbenchDevelopmentPool();
    assert.equal(development.pool.length, 420);
    assert.equal(development.oracle.length, 420);
    assert.equal(Object.hasOwn(development, 'freshPool'), false);
    assert.ok(development.pool.every((item) => !Object.hasOwn(item, 'satisfiable')));
    assert.ok(development.pool.every((item) => !Object.hasOwn(item, 'referenceReason')));
    assert.ok(development.pool.every((item) => !Object.hasOwn(item.task, 'expectedAnswer')));
  });

test('complete SATBench development partition runs directly with independently valid witnesses', async (context) => {
  if (!await hasSatbenchSource()) {
    context.skip(`Official cache absent at ${SATBENCH_SOURCE.datasetPath}.`);
    return;
  }
  const development = await loadSatbenchDevelopmentPool();
  const result = scoreSatbenchDevelopment(development.pool, development.oracle);
  assert.equal(result.tested, 420);
  assert.equal(result.correct, 420);
  assert.equal(result.accuracy, 1);
  assert.deepEqual(result.statusCounts, { SOLVED: 420 });
  assert.ok(result.outcomes.every((item) => item.witnessValid));
  assert.equal(result.languageAgentInvocations, 0);
});

test('SATBench adapter has no source-size rejection and generic SAT core has no benchmark dispatch', async () => {
  const adapter = await readFile(new URL('../src/benchmark-adapters/satbench.mjs', import.meta.url), 'utf8');
  const core = await readFile(new URL('../src/reasoning/sat-entailment.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(adapter, /MAX_(?:FILE|SOURCE)_BYTES/u);
  assert.doesNotMatch(adapter, /file exceeds \d+ MiB/iu);
  assert.doesNotMatch(core, /SATBench|datasetId|recordId|expectedAnswer|expectedSatisfiable/u);
});
