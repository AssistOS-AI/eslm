import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  evaluateZebraLogicDevelopment,
  evaluateZebraLogicSealedFresh,
  hasZebraLogicSource,
  inventoryZebraLogicSource,
  loadZebraLogicDevelopmentPool,
  parseZebraLogicPuzzle,
  solveZebraLogicCsp,
  verifyZebraLogicAssignment,
  ZEBRALOGIC_PARTITION,
  ZEBRALOGIC_SOURCE,
} from '../src/benchmark-adapters/zebralogic.mjs';

function fixtureRecord({
  names = ['Neral', 'Ovik', 'Tessa'],
  colors = ['zaffre', 'umber', 'ecru'],
  clues = [
    `${names[0]} is in the first house.`,
    `The person whose favorite color is ${colors[0]} is ${names[0]}.`,
    `${names[1]} is directly left of ${names[2]}.`,
    `The person whose favorite color is ${colors[1]} is ${names[2]}.`,
  ],
} = {}) {
  return {
    id: 'lgp-test-3x2-999', size: '3*2',
    puzzle: [
      'There are 3 houses, numbered 1 to 3 from left to right, as seen from across the street.',
      ` - Each person has a unique name: ${names.map((value) => `\`${value}\``).join(', ')}`,
      ` - Each person has a favorite color: ${colors.map((value) => `\`${value}\``).join(', ')}`,
      '', '## Clues:', ...clues.map((clue, index) => `${index + 1}. ${clue}`), '',
    ].join('\n'),
    solution: { header: ['House', 'Name', 'Color'],
      rows: Array.from({ length: 3 }, () => ['___', '___', '___']) },
    created_at: '2024-07-11T00:00:00.000000',
  };
}

test('ZebraLogic CSP solves nonce domains with direct clue and uniqueness verification', () => {
  const parsed = parseZebraLogicPuzzle(fixtureRecord(), 'nonce-fixture');
  const result = solveZebraLogicCsp(parsed);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.valid, true);
  assert.equal(result.unique, true);
  assert.equal(result.witnessValid, true);
  assert.equal(verifyZebraLogicAssignment(parsed, result.assignment), true);
  assert.equal(result.languageAgentInvocations, 0);
});

test('entity renaming and clue reordering preserve CSP behavior', () => {
  const renamed = fixtureRecord({
    names: ['Vela', 'Quorin', 'Miro'], colors: ['ochre', 'indigo', 'sienna'],
    clues: [
      'The person whose favorite color is indigo is Miro.',
      'Quorin is directly left of Miro.',
      'The person whose favorite color is ochre is Vela.',
      'Vela is in the first house.',
    ],
  });
  const result = solveZebraLogicCsp(parseZebraLogicPuzzle(renamed, 'renamed-fixture'));
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.valid, true);
  assert.equal(result.unique, true);
});

test('removing a necessary clue yields a verified non-unique contrast', () => {
  const record = fixtureRecord();
  const clues = record.puzzle.split('\n').filter((line) => !line.includes('directly left of'));
  record.puzzle = clues.join('\n').replace(/^4\. /mu, '3. ');
  const result = solveZebraLogicCsp(parseZebraLogicPuzzle(record, 'contrast-fixture'));
  assert.equal(result.valid, true);
  assert.equal(result.unique, false);
  assert.equal(result.status, 'INVALID_OR_NON_UNIQUE');
});

test('strict adapter rejects source-schema drift and unredacted public oracle cells', () => {
  assert.throws(() => parseZebraLogicPuzzle({ ...fixtureRecord(), expectedAnswer: {} }), /expected exactly/u);
  const unredacted = fixtureRecord();
  unredacted.solution.rows[0][1] = 'Neral';
  assert.throws(() => parseZebraLogicPuzzle(unredacted), /redacted placeholder/u);
});

test('official ZebraLogic source is fully streamed and fresh membership remains sealed', async (context) => {
  if (!await hasZebraLogicSource()) {
    context.skip(`Official cache absent at ${ZEBRALOGIC_SOURCE.datasetPath}.`);
    return;
  }
  const inventory = await inventoryZebraLogicSource();
  assert.equal(inventory.records, 1_000);
  assert.equal(inventory.redactedSolutions, 1_000);
  assert.equal(Object.keys(inventory.sizes).length, 25);
  assert.ok(Object.values(inventory.sizes).every((count) => count === 40));
  assert.equal(inventory.partition.development.count, 200);
  assert.equal(inventory.partition.fresh.count, 800);
  assert.equal(inventory.partition.development.membershipSha256,
    ZEBRALOGIC_PARTITION.developmentMembershipSha256);
  assert.equal(inventory.partition.fresh.membershipSha256,
    ZEBRALOGIC_PARTITION.freshMembershipSha256);
  const development = await loadZebraLogicDevelopmentPool();
  assert.equal(development.pool.length, 200);
  assert.equal(Object.hasOwn(development, 'freshPool'), false);
  assert.ok(development.pool.every((item) => !Object.hasOwn(item, 'solution')));
  assert.ok(development.pool.every((item) => !Object.hasOwn(item, 'oracle')));
});

test('one official development case per size has a complete independently verified unique assignment',
  async (context) => {
    if (!await hasZebraLogicSource()) {
      context.skip(`Official cache absent at ${ZEBRALOGIC_SOURCE.datasetPath}.`);
      return;
    }
    const { pool } = await loadZebraLogicDevelopmentPool();
    const sizes = new Set();
    const sample = pool.filter((item) => {
      if (sizes.has(item.metadata.size)) return false;
      sizes.add(item.metadata.size);
      return true;
    });
    const result = evaluateZebraLogicDevelopment(sample);
    assert.equal(result.tested, 25);
    assert.equal(result.passed, 25);
    assert.equal(result.validAssignments, 25);
    assert.deepEqual(result.statusCounts, { SOLVED: 25 });
    assert.equal(result.languageAgentInvocations, 0);
  });

test('sealed fresh evaluation requires explicit aggregate-only authorization', async () => {
  await assert.rejects(() => evaluateZebraLogicSealedFresh(), /aggregate-only authorization/u);
});

test('ZebraLogic integration has no source-size rejection or benchmark dispatch in generic core', async () => {
  const [adapter, source, core] = await Promise.all([
    readFile(new URL('../src/benchmark-adapters/zebralogic.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/benchmark-adapters/zebralogic-source.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/reasoning/sat-entailment.mjs', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(`${adapter}\n${source}`, /MAX_(?:FILE|SOURCE)_BYTES/u);
  assert.doesNotMatch(`${adapter}\n${source}`, /file exceeds \d+ MiB/iu);
  assert.doesNotMatch(core, /ZebraLogic|zebralogic|datasetId|recordId|expectedAnswer/u);
});
