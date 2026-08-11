import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSLRBenchLifecycle,
  inventorySLRBenchSource,
  loadSLRBenchPool,
  parseSLRValidationProgram,
  runSLRBenchDevelopmentDiagnostic,
  streamSLRBenchVisibleCases,
} from '../src/benchmark-adapters/slr-bench.mjs';
import {
  buildSLRBenchInductionTask,
  buildSLRBenchValidationExamples,
} from '../src/benchmark-adapters/slr-bench-induction.mjs';
import {
  evaluateFiniteConjunctiveRule,
  induceFiniteConjunctiveRule,
  verifyFiniteConjunctiveRuleResult,
} from '../src/reasoning/finite-conjunctive-rule-induction.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';

const TRAIN_LEVEL_COUNTS = [26, 234, 793, ...Array(17).fill(1_000)];

function row(split, id, level) {
  const tier = level <= 5 ? 'basic' : level <= 10 ? 'easy' : level <= 15 ? 'medium' : 'hard';
  return {
    id,
    prompt: `Visible renamed examples for ${split}-${id}.\n\neastbound(root_${id}_p).\nlinks(root_${id}_p, item_${id}_p).\nmarker(item_${id}_p, accepted).\n\nwestbound(root_${id}_n).\nlinks(root_${id}_n, item_${id}_n).\nmarker(item_${id}_n, rejected).\n\nYour task is to formulate a hypothesis.`,
    'ground-truth rule': `target(X) :- relation(X, value_${level}).`,
    'validation program': `positive(item_${id}).\nrelation(item_${id}, value_${level}).\ncount(item_${id}, ${level}).`,
    symbols: `symbols-${level}`,
    'curriculum level': level,
    'curriculum tier': tier,
    'rule sampling': 'uniform',
    'rule complexity': '1',
    'background sampling': 'uniform',
    'problem size': 2,
    'vocabulary predicates': 3,
    'vocabulary car constants': '[]',
    validation_program_shortcuts: '',
  };
}

async function writeRows(path, rows) {
  const output = createWriteStream(path, { encoding: 'utf8' });
  for (const record of rows) {
    if (!output.write(`${JSON.stringify(record)}\n`)) await once(output, 'drain');
  }
  output.end();
  await once(output, 'finish');
}

async function sourceTree() {
  const root = await mkdtemp(join(tmpdir(), 'eslm-slr-bench-'));
  const train = join(root, 'train');
  await mkdir(train);
  let trainId = 0;
  for (let level = 1; level <= 20; level += 1) {
    const count = TRAIN_LEVEL_COUNTS[level - 1];
    for (let start = 0, part = 0; start < count; start += 250, part += 1) {
      const rows = Array.from({ length: Math.min(250, count - start) }, (_, index) =>
        row('train', trainId + index, level));
      await writeRows(join(train,
        `level-${String(level).padStart(2, '0')}-part-${String(part).padStart(2, '0')}.jsonl`), rows);
      trainId += rows.length;
    }
  }
  const validation = [];
  const fresh = [];
  for (let level = 1; level <= 20; level += 1) {
    for (let index = 0; index < 10; index += 1) validation.push(row('validation', validation.length, level));
    for (let index = 0; index < 50; index += 1) fresh.push(row('test', fresh.length, level));
  }
  await writeRows(join(root, 'validation.jsonl'), validation);
  await writeRows(join(root, 'test.jsonl'), fresh);
  return root;
}

test('SLR validation programs become inert ground-fact ASTs and executable clauses are rejected', () => {
  const facts = parseSLRValidationProgram(
    "observed(item_1, [red, part(box, 2)]).\nscore(item_1, -3).\nnamed(item_1, 'quoted atom').",
  );
  assert.equal(facts.length, 3);
  assert.equal(facts[0].functor, 'observed');
  assert.equal(facts[0].arguments[1].kind, 'list');
  assert.throws(() => parseSLRValidationProgram('target(X) :- observed(X).'), /ground terms/u);
  assert.throws(() => parseSLRValidationProgram(':- initialization(run).'), /disallowed Prolog token/u);
});

test('SLR visible examples project to generic conjunctive induction and host validation remains a later join', () => {
  const source = row('validation', 7, 1);
  const task = buildSLRBenchInductionTask(source.prompt);
  const result = induceFiniteConjunctiveRule(task);
  assert.equal(result.status, 'SOLVED');
  assert.equal(verifyFiniteConjunctiveRuleResult(task, result), true);
  assert.deepEqual(result.rule.body.map((literal) => literal.predicate), ['links', 'marker']);
  const validation = parseSLRValidationProgram(
    'eastbound(check_p).\nlinks(check_p, node_p).\nmarker(node_p, accepted).\n'
    + 'westbound(check_n).\nlinks(check_n, node_n).\nmarker(node_n, rejected).',
  );
  const scored = evaluateFiniteConjunctiveRule(result.rule, buildSLRBenchValidationExamples(validation));
  assert.equal(scored.exact, true);
});

test('SLR typed rule induction is routed through the public engine capability registry', async () => {
  const source = row('validation', 8, 1);
  const task = {
    taskId: 'nonce-rule-induction',
    operation: 'induce-symbolic-classification-rule',
    inductionTask: buildSLRBenchInductionTask(source.prompt),
  };
  const result = new EslmEngine(await createCoreModel()).executeTask(task);
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.plan.methodId, 'method:core:finite-conjunctive-rule-induction');
  assert.equal(result.values.length, 1);
  assert.equal(verifyFiniteConjunctiveRuleResult(task.inductionTask, result), true);
});

test('SLR source inventory streams every official-shape row across all twenty levels', async () => {
  const root = await sourceTree();
  const inventory = await inventorySLRBenchSource(root);
  assert.equal(inventory.rows, 19_253);
  assert.equal(inventory.facts, 19_253 * 3);
  assert.equal(inventory.splits[0].shards.length, 74);
  assert.deepEqual(Object.keys(inventory.splits[0].levels).map(Number), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(inventory.idScope, 'split-local');
  assert.equal(inventory.crossSplitRepeatedIds, 1_200);
  assert.equal(inventory.corpusProgramsExecuted, 0);
});

test('SLR official split lifecycle is label-blind and test cannot be exposed as a visible pool', async () => {
  const root = await sourceTree();
  const before = await buildSLRBenchLifecycle(root);
  const path = join(root, 'validation.jsonl');
  const lines = (await readFile(path, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first['ground-truth rule'] = 'different_reference(X) :- renamed(X).';
  lines[0] = JSON.stringify(first);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
  const after = await buildSLRBenchLifecycle(root);
  assert.equal(after.membershipSha256, before.membershipSha256);
  assert.deepEqual({ training: after.training, development: after.development, fresh: after.fresh },
    { training: 18_053, development: 200, fresh: 1_000 });
  await assert.rejects(() => loadSLRBenchPool(root, { split: 'test' }), /test remains fresh/u);
});

test('SLR label-free streaming and development diagnostic never expose or execute host oracles', async () => {
  const root = await sourceTree();
  let streamed = 0;
  await streamSLRBenchVisibleCases(root, {
    split: 'train',
    onCase: (item) => {
      streamed += 1;
      assert.equal(Object.hasOwn(item, 'ground-truth rule'), false);
      assert.equal(Object.hasOwn(item, 'validation program'), false);
      assert.equal(item.inductionTask.schema, 'finite-conjunctive-rule-induction-task-v1');
      assert.equal(item.inductionTask.examples.length, 2);
    },
  });
  assert.equal(streamed, 18_053);
  const pool = await loadSLRBenchPool(root);
  assert.equal(pool.available, 200);
  assert.equal(JSON.stringify(pool.cases).includes('target(X)'), false);

  const engine = { executeTask: () => ({ status: 'NO_APPLICABLE_METHOD', values: [] }) };
  const result = await runSLRBenchDevelopmentDiagnostic(engine, root);
  assert.equal(result.tested, 200);
  assert.equal(result.statusCounts.NO_APPLICABLE_METHOD, 200);
  assert.equal(result.languageAgentInvocations, 0);
  assert.equal(result.corpusProgramsExecuted, 0);
});

test('SLR schema drift fails at the first affected shard rather than being silently ignored', async () => {
  const root = await sourceTree();
  const path = join(root, 'train', 'level-01-part-00.jsonl');
  const lines = (await readFile(path, 'utf8')).trimEnd().split('\n');
  const first = JSON.parse(lines[0]);
  first.unreviewed = true;
  lines[0] = JSON.stringify(first);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
  await assert.rejects(() => inventorySLRBenchSource(root), /expected exactly these fields/u);
});

test('SLR development receipts preserve scope, witness validity, and implementation identity', async () => {
  const receiptRoot = new URL('../training/benchmark-sources/slr-bench/', import.meta.url);
  const candidate = JSON.parse(await readFile(new URL('candidate-result.json', receiptRoot), 'utf8'));
  const failures = JSON.parse(await readFile(new URL('failures.json', receiptRoot), 'utf8'));
  const proposal = JSON.parse(await readFile(new URL('core-change-proposal.json', receiptRoot), 'utf8'));
  const guardian = JSON.parse(await readFile(new URL('core-change-guardian-result.json', receiptRoot), 'utf8'));
  assert.deepEqual({ tested: candidate.tested, solved: candidate.solved,
    verified: candidate.witnessVerified, exact: candidate.validationExact },
  { tested: 200, solved: 126, verified: 126, exact: 126 });
  assert.deepEqual(candidate.statusCounts, { SOLVED: 126, UNKNOWN: 10, RESOURCE_LIMIT: 64 });
  assert.equal(candidate.freshNotTested, 1_000);
  assert.equal(candidate.corpusProgramsExecuted, 0);
  assert.equal(failures.failures, 74);
  assert.equal(failures.sourceVisibleRuleInventory.train.selfRecursiveTargets, 0);
  assert.equal(guardian.eligibleForImplementation, true);
  assert.deepEqual(guardian.failures, []);
  const source = await readFile(new URL('../src/reasoning/finite-conjunctive-rule-induction.mjs', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), proposal.implementationIdentity.sha256);
});
