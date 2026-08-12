import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  auditFreshBenchmarkReceipts, FRESH_RECEIPT_AUDIT_DEFINITIONS,
} from '../src/evaluation/benchmark-receipt-audit.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from '../src/evaluation/benchmark-research-catalog.mjs';
import { sha256 } from '../src/util.mjs';

function sampleDefinition() {
  return {
    id: 'sample', freezePath: 'receipts/freeze.json', resultPath: 'receipts/result.json',
    dependencyPaths: ['dependencies'], bindings: [['partition', 'partition']],
    resultIdentity: ['protocol', 'sample-fresh-v1'],
    denominatorPath: 'tested', successPath: 'correct', metricPath: 'accuracy',
    resultDependencyPath: 'dependencies',
  };
}

function completeExecutionMetadata() {
  return {
    behaviorDependency: {
      format: 'eslm-benchmark-behavior-identity-v1', digest: 'a'.repeat(64),
    },
    resourcePolicy: { requestedMemoryMb: 256 },
    resourceEvidence: { sampledPeakRssBytes: 1024, wallMilliseconds: 12 },
    replayCommand: 'node src/cli.mjs benchmark probe --benchmark sample',
    evaluationIdentities: { scorer: 'sample-scorer-v1', oracle: 'sample-oracle-v1',
      partition: 'partition-v1' },
    selectedMethods: ['method:core:sample'],
    selectedKbVersions: [], usedKbVersions: [],
    languagePolicy: { externalLanguageAgent: false },
  };
}

test('receipt audit marks an exact dependency current and a changed dependency historical-stale', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-receipt-audit-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'receipts'));
  const dependencyPath = 'behavior.mjs';
  const original = 'export const behavior = 1;\n';
  await writeFile(join(root, dependencyPath), original, 'utf8');
  await writeFile(join(root, 'receipts/freeze.json'), JSON.stringify({
    frozenAt: '2030-01-01T00:00:00Z',
    partition: 'partition-v1',
    dependencies: { [dependencyPath]: sha256(original) },
  }), 'utf8');
  await writeFile(join(root, 'receipts/result.json'), JSON.stringify({
    protocol: 'sample-fresh-v1', executedAt: '2030-01-02T00:00:00Z',
    partition: 'partition-v1', tested: 2, correct: 1, accuracy: 0.5,
    dependencies: { [dependencyPath]: sha256(original) },
    ...completeExecutionMetadata(),
  }), 'utf8');
  const definition = sampleDefinition();
  const current = await auditFreshBenchmarkReceipts({ root, definitions: [definition] });
  assert.deepEqual(current.summary, {
    checked: 1, current: 1, historicalStale: 0, historicalUnrecoverable: 0, invalid: 0, unavailable: 0,
  });
  assert.equal(current.rows[0].dependencies.files[0].state, 'match');

  await writeFile(join(root, dependencyPath), 'export const behavior = 2;\n', 'utf8');
  const stale = await auditFreshBenchmarkReceipts({ root, definitions: [definition] });
  assert.deepEqual(stale.summary, {
    checked: 1, current: 0, historicalStale: 1, historicalUnrecoverable: 0, invalid: 0, unavailable: 0,
  });
  assert.equal(stale.rows[0].dependencies.changed, 1);
  assert.equal(stale.rows[0].dependencies.files[0].state, 'changed');
});

test('a dependency-matching receipt without release execution evidence is invalid and incomplete', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-receipt-incomplete-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'receipts'));
  const dependencyPath = 'behavior.mjs';
  const source = 'export const behavior = 1;\n';
  await writeFile(join(root, dependencyPath), source, 'utf8');
  await writeFile(join(root, 'receipts/freeze.json'), JSON.stringify({
    frozenAt: '2030-01-01T00:00:00Z', partition: 'partition-v1',
    dependencies: { [dependencyPath]: sha256(source) },
  }), 'utf8');
  await writeFile(join(root, 'receipts/result.json'), JSON.stringify({
    protocol: 'sample-fresh-v1', executedAt: '2030-01-02T00:00:00Z',
    partition: 'partition-v1', tested: 2, correct: 1, accuracy: 0.5,
    dependencies: { [dependencyPath]: sha256(source) },
  }), 'utf8');
  const report = await auditFreshBenchmarkReceipts({ root, definitions: [sampleDefinition()] });
  assert.equal(report.rows[0].state, 'invalid');
  assert.equal(report.rows[0].receiptValidity.integrity, 'valid');
  assert.equal(report.rows[0].receiptValidity.reportingCompleteness, 'incomplete');
  assert.match(report.rows[0].receiptValidity.issues.join(' '), /resourcePolicy|replayCommand/u);
});

test('receipt audit distinguishes unavailable, invalid, and unrecoverable evidence', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-receipt-states-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'receipts'));
  const dependencyPath = 'missing-behavior.mjs';
  const digest = sha256('historical behavior\n');
  await writeFile(join(root, 'receipts/freeze.json'), JSON.stringify({
    partition: 'partition-v1', dependencies: { [dependencyPath]: digest },
  }), 'utf8');

  const unavailable = await auditFreshBenchmarkReceipts({ root, definitions: [sampleDefinition()] });
  assert.equal(unavailable.rows[0].state, 'unavailable');

  await writeFile(join(root, 'receipts/result.json'), JSON.stringify({
    protocol: 'sample-fresh-v1', executedAt: '2030-01-02T00:00:00Z',
    partition: 'partition-v1', tested: 2, correct: 1, accuracy: 0.5,
    dependencies: { [dependencyPath]: digest },
  }), 'utf8');
  const unrecoverable = await auditFreshBenchmarkReceipts({ root, definitions: [sampleDefinition()] });
  assert.equal(unrecoverable.rows[0].state, 'historical-unrecoverable');
  assert.equal(unrecoverable.rows[0].dependencies.missing, 1);

  await writeFile(join(root, dependencyPath), 'historical behavior\n', 'utf8');
  await writeFile(join(root, 'receipts/result.json'), JSON.stringify({
    protocol: 'sample-fresh-v1', executedAt: '2030-01-02T00:00:00Z',
    partition: 'partition-v1', tested: 2, correct: 3, accuracy: 1.5,
    dependencies: { [dependencyPath]: digest },
  }), 'utf8');
  const invalid = await auditFreshBenchmarkReceipts({ root, definitions: [sampleDefinition()] });
  assert.equal(invalid.rows[0].state, 'invalid');
  assert.equal(invalid.rows[0].receiptValidity.integrity, 'invalid');
  assert.match(invalid.rows[0].receiptValidity.issues.join(' '), /correct|accuracy/u);
});

test('repository fresh receipt audit is complete and every state is explicit', async () => {
  const report = await auditFreshBenchmarkReceipts();
  assert.equal(report.rows.length, FRESH_RECEIPT_AUDIT_DEFINITIONS.length);
  assert.equal(report.format, 'eslm-benchmark-receipt-audit-v2');
  assert.equal(report.summary.checked, report.summary.current + report.summary.historicalStale
    + report.summary.historicalUnrecoverable + report.summary.invalid + report.summary.unavailable);
  assert.equal(new Set(report.rows.map((row) => row.id)).size, report.rows.length);
  const expected = new Set([
    'blimp', 'ewok', 'logicskills',
    ...Object.values(RESEARCH_BENCHMARK_CATALOG)
      .filter((entry) => entry.evaluationState === 'fresh-evaluation-executed')
      .map((entry) => entry.id),
  ]);
  assert.deepEqual(new Set(report.rows.map((row) => row.id)), expected);
  for (const row of report.rows) {
    assert.ok(['current', 'historical-stale', 'historical-unrecoverable', 'invalid', 'unavailable']
      .includes(row.state));
    assert.equal(row.dependencies.checked,
      row.dependencies.matching + row.dependencies.changed + row.dependencies.missing);
    if (row.state !== 'unavailable') {
      assert.match(row.freeze.sha256, /^[0-9a-f]{64}$/u);
      assert.match(row.result.sha256, /^[0-9a-f]{64}$/u);
    }
  }
  assert.deepEqual(report.rows.find((row) => row.id === 'logicskills').scope,
    { kind: 'subtrack', id: 'countermodel-fresh' });
});
