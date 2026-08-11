import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('ProverQA fresh receipt exposes only aggregates bound to the frozen partition', async () => {
  const root = join(PROJECT_ROOT, 'training/benchmark-sources/proverqa');
  const result = JSON.parse(await readFile(join(root, 'fresh-aggregate.json'), 'utf8'));
  assert.equal(result.evidenceState, 'sealed-fresh-aggregate-only');
  assert.equal(result.tested, 1_200);
  assert.equal(result.available, 1_200);
  assert.equal(result.correct, 1_196);
  assert.equal(result.proofOrCountermodelWitnessesValid, 1_198);
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.partitionMembershipSha256,
    '06d3e3a2257edd975e4c49af2b63468c3a6020ee2ca95a5e5ae1c393165b66a1');
  const serialized = JSON.stringify(result);
  for (const forbidden of ['"cases"', '"records"', '"formulas"', '"sentences"', '"identifiers"', '"witnesses"']) {
    assert.equal(serialized.includes(forbidden), false, `fresh receipt must not contain ${forbidden}`);
  }
});

test('ProverQA records the no-output first attempt rather than hiding the evaluator failure', async () => {
  const path = join(PROJECT_ROOT, 'training/benchmark-sources/proverqa/fresh-attempt-1-aborted.json');
  const receipt = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(receipt.outcome, 'no-aggregate-returned');
  assert.match(receipt.visibility, /no case, identifier, formula, sentence, answer/u);
  assert.match(receipt.behaviorChangePermitted, /Output-only identifier correction/u);
});
