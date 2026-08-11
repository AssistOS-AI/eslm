import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionBlimpCases } from '../src/benchmark-adapters/blimp-partition.mjs';

function fixtureCases() {
  return ['alpha', 'beta'].flatMap((paradigm) => Array.from({ length: 5 }, (_, index) => ({
    id: `case:${paradigm}:${index}`,
    good: `Grammatical fixture ${index}.`,
    bad: `Ungrammatical fixture ${index}.`,
    metadata: { paradigm },
  })));
}

const OPTIONS = Object.freeze({
  seed: 'partition-test-v1',
  developmentPerParadigm: 3,
  freshPerParadigm: 2,
  expectedParadigms: 2,
  expectedCasesPerParadigm: 5,
});

test('grouped partition is deterministic and independent of source ordering', () => {
  const forward = partitionBlimpCases(fixtureCases(), OPTIONS);
  const reversed = partitionBlimpCases(fixtureCases().reverse(), OPTIONS);
  assert.deepEqual(forward.receipt, reversed.receipt);
  assert.deepEqual(forward.development.map((item) => item.id).sort(),
    reversed.development.map((item) => item.id).sort());
  assert.deepEqual(forward.fresh.map((item) => item.id).sort(), reversed.fresh.map((item) => item.id).sort());
});

test('grouped partition covers every case once and preserves each stratum', () => {
  const partition = partitionBlimpCases(fixtureCases(), OPTIONS);
  assert.equal(partition.development.length, 6);
  assert.equal(partition.fresh.length, 4);
  assert.equal(new Set([...partition.development, ...partition.fresh].map((item) => item.id)).size, 10);
  assert.ok(partition.development.every((item) => !partition.fresh.includes(item)));
  assert.ok(partition.receipt.strata.every((item) => item.development === 3 && item.fresh === 2));
});

test('grouped partition rejects duplicate IDs and incomplete strata', () => {
  const duplicate = fixtureCases();
  duplicate[1] = { ...duplicate[1], id: duplicate[0].id };
  assert.throws(() => partitionBlimpCases(duplicate, OPTIONS), /duplicate case ID/u);
  assert.throws(() => partitionBlimpCases(fixtureCases().slice(1), OPTIONS), /has 4 cases/u);
});
