import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildIIBenchPartition,
  inventoryIIBenchSource,
  loadIIBenchDevelopmentPool,
  runIIBenchDevelopmentBaseline,
  runIIBenchFreshEvaluation,
} from '../src/benchmark-adapters/iibench.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';

function immediateRow(kind, index) {
  const common = {
    id: `nonce-${kind}-${index}`, family: 'AEIO', category: 'anonymous',
    premise: `All subject${index} are predicate${index}.`, premise_form: 'A',
    subject_term: `subject${index}`, subject_canonical: `subject${index}`, subject_neg_depth: 0,
    predicate_term: `predicate${index}`, predicate_canonical: `predicate${index}`, predicate_neg_depth: 0,
    candidate: `Some predicate${index} are subject${index}.`, candidate_form: 'I',
    candidate_subject_neg_depth: 0, candidate_predicate_neg_depth: 0,
  };
  if (kind === 'truth') {
    return {
      ...common, subtask: 'truth_judgement', relation_type: 'aeio_truth', gold_label: 'True',
      candidate_subject_canonical: `predicate${index}`, candidate_predicate_canonical: `subject${index}`,
    };
  }
  const row = { ...common, subtask: `${kind}_generation` };
  if (kind === 'conversion' || kind === 'contraposition') {
    row.candidate_subject_term = `predicate${index}`;
    row.candidate_predicate_term = `subject${index}`;
  }
  if (kind === 'obversion') {
    row.candidate = `No subject${index} are non-predicate${index}.`;
    row.candidate_form = 'E';
  }
  if (kind === 'contraposition') {
    row.candidate = `All non-predicate${index} are non-subject${index}.`;
    row.candidate_form = 'A';
  }
  return row;
}

function syllogismRow(index) {
  const term = (role) => `${role}${index}`;
  return {
    id: `nonce-syllogism-${index}`, base_id: `base-${index}`, family: 'syllogism',
    subtask: 'generation', split: 'test', category: 'standard', condition: 'anonymous', mood: 'AAA-1', figure: 1,
    premise1: `All ${term('M')} are ${term('P')}.`, premise1_form: 'A',
    premise1_subject_term: term('M'), premise1_subject_canonical: term('M'), premise1_subject_neg_depth: 0,
    premise1_predicate_term: term('P'), premise1_predicate_canonical: term('P'), premise1_predicate_neg_depth: 0,
    premise2: `All ${term('S')} are ${term('M')}.`, premise2_form: 'A',
    premise2_subject_term: term('S'), premise2_subject_canonical: term('S'), premise2_subject_neg_depth: 0,
    premise2_predicate_term: term('M'), premise2_predicate_canonical: term('M'), premise2_predicate_neg_depth: 0,
    candidate_gold: `All ${term('S')} are ${term('P')}.`, candidate_form: 'A',
    candidate_subject_term: term('S'), candidate_subject_canonical: term('S'), candidate_subject_neg_depth: 0,
    candidate_predicate_term: term('P'), candidate_predicate_canonical: term('P'), candidate_predicate_neg_depth: 0,
    transformation_note: 'none',
    source_instance: {
      S_qid: `QS${index}`, S_label: term('S'), S_label_lang: 'en',
      M_qid: `QM${index}`, M_label: term('M'), M_label_lang: 'en',
      P_qid: `QP${index}`, P_label: term('P'), P_label_lang: 'en',
      form_id: 'AAA-1', figure: 1,
      construction: { form_id: 'AAA-1', figure: 1, major: ['M', 'P', 'A'], minor: ['S', 'M', 'A'] },
    },
  };
}

async function sourceTree() {
  const root = await mkdtemp(join(tmpdir(), 'eslm-iibench-'));
  const data = join(root, 'data');
  await mkdir(data);
  await writeFile(join(root, 'README.md'), 'Official-source fixture\n', 'utf8');
  const definitions = [
    ['AEIO_truth.jsonl', 'truth', 1_100],
    ['Conversion_generation.jsonl', 'conversion', 1_300],
    ['Obversion_generation.jsonl', 'obversion', 1_200],
    ['Contraposition_generation.jsonl', 'contraposition', 1_300],
  ];
  for (const [file, kind, count] of definitions) {
    const rows = Array.from({ length: count }, (_, index) => JSON.stringify(immediateRow(kind, index)));
    await writeFile(join(data, file), `${rows.join('\n')}\n`, 'utf8');
  }
  const syllogisms = Array.from({ length: 384 }, (_, index) => JSON.stringify(syllogismRow(index)));
  await writeFile(join(data, 'Syllogism_generation.jsonl'), `${syllogisms.join('\n')}\n`, 'utf8');
  return root;
}

test('IIBench adapter streams and validates every row in the pinned five-file release shape', async () => {
  const root = await sourceTree();
  const inventory = await inventoryIIBenchSource(root);
  assert.equal(inventory.files.length, 5);
  assert.equal(inventory.rows, 5_284);
  assert.equal(inventory.validation, 'all-rows-streamed-strict-schema');
  assert.match(inventory.sourceSetSha256, /^[a-f0-9]{64}$/u);
});

test('IIBench development partition is deterministic and independent of oracle labels', async () => {
  const root = await sourceTree();
  const before = await buildIIBenchPartition(root);
  const truthPath = join(root, 'data', 'AEIO_truth.jsonl');
  const lines = (await readFile(truthPath, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first.gold_label = 'False';
  lines[0] = JSON.stringify(first);
  await writeFile(truthPath, `${lines.join('\n')}\n`, 'utf8');
  const after = await buildIIBenchPartition(root);
  assert.equal(after.membershipSha256, before.membershipSha256);
  assert.equal(after.available, 5_284);
  assert.equal(after.development + after.fresh, 5_284);
});

test('IIBench pool withholds generation answers and baseline records the unsupported current-core operations', async () => {
  const root = await sourceTree();
  const pool = await loadIIBenchDevelopmentPool(root);
  assert.equal(pool.available + pool.freshHeldOut, 5_284);
  assert.equal(pool.oracle, 'host-only-not-returned');
  const serialized = JSON.stringify(pool.cases);
  assert.equal(serialized.includes('candidate_gold'), false);
  assert.equal(serialized.includes('gold_label'), false);
  const generationCases = pool.cases.filter((item) => item.operation !== 'judge-categorical-opposition');
  assert.equal(generationCases.some((item) => Object.hasOwn(item, 'candidate')), false);

  const engine = { executeTask: () => ({ status: 'NO_APPLICABLE_METHOD', values: [] }) };
  const baseline = await runIIBenchDevelopmentBaseline(engine, root);
  assert.equal(baseline.tested, pool.available);
  assert.equal(baseline.correct, 0);
  assert.equal(baseline.statusCounts.NO_APPLICABLE_METHOD, pool.available);
  assert.equal(baseline.codingAgentInvocations, 0);
});

test('IIBench rejects schema drift rather than silently accepting unknown fields', async () => {
  const root = await sourceTree();
  const truthPath = join(root, 'data', 'AEIO_truth.jsonl');
  const lines = (await readFile(truthPath, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first.unreviewed = true;
  lines[0] = JSON.stringify(first);
  await writeFile(truthPath, `${lines.join('\n')}\n`, 'utf8');
  await assert.rejects(() => inventoryIIBenchSource(root), /expected exactly these fields/u);
});

test('generic categorical execution solves renamed fixture tasks in both label-isolated pools', async () => {
  const root = await sourceTree();
  const engine = new EslmEngine(await createCoreModel());
  const development = await runIIBenchDevelopmentBaseline(engine, root);
  const fresh = await runIIBenchFreshEvaluation(engine, root);
  assert.equal(development.tested + fresh.tested, 5_284);
  assert.ok(development.correct > 0);
  assert.ok(fresh.correct > 0);
  assert.equal(fresh.languageAgentInvocations, 0);
  assert.equal(JSON.stringify(fresh).includes('nonce-'), false);
});

test('IIBench structural exception and core proposal are committed without source rows', async () => {
  const [proposal, proof] = await Promise.all([
    readFile(join('training', 'benchmark-sources', 'iibench', 'core-change-proposal.json'), 'utf8').then(JSON.parse),
    readFile(join('training', 'benchmark-sources', 'iibench', 'impossibility-proof.json'), 'utf8').then(JSON.parse),
  ]);
  assert.equal(proposal.renameTestPassed, true);
  assert.equal(proposal.forbiddenDispatchAuditPassed, true);
  assert.equal(proof.developmentEvidence.conflictingClasses, 16);
  assert.ok(proof.developmentEvidence.membersInConflictingClasses > 0);
  assert.equal(JSON.stringify(proof).includes('SYL_'), false);
});
