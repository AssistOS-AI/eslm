import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  evaluateControlledLogicalArgument, inventoryLogicBenchSource, runLogicBenchDevelopmentProbe,
} from '../src/benchmark-adapters/logicbench.mjs';
import { atom, binary, decideFiniteEntailment, negate } from '../src/reasoning/finite-entailment.mjs';
import { decidePreferredEntailment } from '../src/reasoning/preferred-entailment.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

const CACHE_ROOT = join(PROJECT_ROOT, 'training/.cache/benchmarks/logicbench');

test('finite entailment proves valid forms and returns a countermodel for converse inference', () => {
  const antecedent = atom('nonce:antecedent');
  const consequent = atom('nonce:consequent');
  const rule = binary('implies', antecedent, consequent);
  const modusTollens = decideFiniteEntailment({ premises: [rule, negate(consequent)], query: negate(antecedent) });
  assert.equal(modusTollens.status, 'SOLVED');
  assert.equal(modusTollens.entailed, true);
  assert.equal(modusTollens.witness.kind, 'finite-exhaustive-entailment');
  const converse = decideFiniteEntailment({ premises: [rule, consequent], query: antecedent });
  assert.equal(converse.entailed, false);
  assert.equal(converse.witness.kind, 'finite-countermodel');
  assert.equal(converse.witness.assignment['nonce:antecedent'], false);
});

test('finite entailment is invariant under complete atom renaming and premise reordering', () => {
  function evaluate(prefix, reverse) {
    const left = atom(`${prefix}:left`);
    const middle = atom(`${prefix}:middle`);
    const right = atom(`${prefix}:right`);
    const premises = [binary('implies', left, middle), binary('implies', middle, right), left];
    return decideFiniteEntailment({ premises: reverse ? premises.reverse() : premises, query: right });
  }
  assert.equal(evaluate('violet', false).entailed, true);
  assert.equal(evaluate('quartz', true).entailed, true);
});

test('preferred entailment applies defaults skeptically and preserves explicit exceptions', () => {
  const member = atom('nonce:member');
  const property = atom('nonce:property');
  const ordinary = decidePreferredEntailment({
    premises: [member], defaults: [{ antecedent: member, consequent: property, priority: 0 }], query: property,
  });
  assert.equal(ordinary.entailed, true);
  const exception = decidePreferredEntailment({
    premises: [member, negate(property)],
    defaults: [{ antecedent: member, consequent: property, priority: 0 }], query: property,
  });
  assert.equal(exception.entailed, false);
});

test('priority is semantic metadata rather than insertion order', () => {
  const evidenceOne = atom('nonce:evidence-one');
  const evidenceTwo = atom('nonce:evidence-two');
  const claim = atom('nonce:claim');
  const result = decidePreferredEntailment({
    premises: [evidenceTwo, evidenceOne],
    defaults: [
      { antecedent: evidenceTwo, consequent: negate(claim), priority: 1 },
      { antecedent: evidenceOne, consequent: claim, priority: 2 },
    ],
    query: claim,
  });
  assert.equal(result.entailed, true);
  assert.deepEqual(result.penaltyPriorities, [2, 1]);
});

test('controlled logical argument parser handles renamed predicates and rejects affirming the consequent', () => {
  const valid = evaluateControlledLogicalArgument(
    'If someone calibrates a zephyr gauge, then they record a quartz pulse.',
    'If Nira calibrates a zephyr gauge, does this imply that she records a quartz pulse?',
  );
  assert.equal(valid.status, 'SOLVED');
  assert.equal(valid.entailed, true);
  const invalid = evaluateControlledLogicalArgument(
    'If someone calibrates a zephyr gauge, then they record a quartz pulse.',
    'If Nira records a quartz pulse, does this imply that she calibrates a zephyr gauge?',
  );
  assert.equal(invalid.status, 'SOLVED');
  assert.equal(invalid.entailed, false);
  assert.equal(invalid.witness.kind, 'finite-countermodel');
});

test('pinned source inventory validates every source-native shard without opening fresh rows', async (context) => {
  try {
    await readFile(join(CACHE_ROOT, 'source/c014153303c98de4d5f09d41c3a235cd869be5c8.tar.gz'));
  } catch {
    context.skip('Pinned local source cache is unavailable.');
    return;
  }
  const inventory = await inventoryLogicBenchSource(CACHE_ROOT);
  assert.equal(inventory.development.files, 25);
  assert.equal(inventory.development.samples, 3_752);
  assert.equal(inventory.development.cases, 12_908);
  assert.equal(inventory.evaluation.BQA.cases, 1_520);
  assert.equal(inventory.evaluation.MCQA.cases, 500);
  assert.equal(inventory.evaluation.MCQA.schemaAnomalies, 1);
  assert.equal(inventory.evaluationInspection, 'schema-and-aggregate-only');
});

test('development probe executes the complete visible source with no Coding Agent', async (context) => {
  try {
    await readFile(join(CACHE_ROOT, 'source/c014153303c98de4d5f09d41c3a235cd869be5c8.tar.gz'));
  } catch {
    context.skip('Pinned local source cache is unavailable.');
    return;
  }
  const report = await runLogicBenchDevelopmentProbe(CACHE_ROOT);
  assert.equal(report.total, 12_908);
  assert.equal(report.codingAgentInvocations, 0);
  assert.ok(report.correct >= 10_000);
  assert.ok(report.directSymbolicRate >= 0.9);
});

test('generic reasoning modules contain no source identity or source axiom dispatch', async () => {
  for (const file of ['src/reasoning/finite-entailment.mjs', 'src/reasoning/preferred-entailment.mjs']) {
    const source = await readFile(join(PROJECT_ROOT, file), 'utf8');
    assert.doesNotMatch(source, /LogicBench|logicbench|axiom|dataset|benchmark|modus|dilemma|syllogism/iu);
  }
});
