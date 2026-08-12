import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { benchmarkBehaviorIdentity } from '../src/evaluation/benchmark-execution-identity.mjs';
import { auditFreshBenchmarkReceipts } from '../src/evaluation/benchmark-receipt-audit.mjs';
import { validatePublicBenchmarkRows } from '../src/evaluation/benchmark-report-contract.mjs';
import { selectedBenchmarkIds } from '../src/interface/benchmark-command.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('published public portfolio is schema-valid, current where claimed, and free of metric shortcuts', async () => {
  const report = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'docs/results/latest-public-benchmark-probes.json'),
    'utf8',
  ));
  const expectedIds = selectedBenchmarkIds('all');
  assert.equal(report.format, 'eslm-public-benchmark-probe-report-v2');
  assert.equal('createdAt' in report, false);
  assert.equal(typeof report.assembledAt, 'string');
  assert.deepEqual(report.assembly.requestedBenchmarkIds, expectedIds);
  assert.equal(report.rows.length, expectedIds.length);
  validatePublicBenchmarkRows(report.rows, expectedIds, { requireExecutionResources: true });

  const partition = [
    ...report.assembly.executedNowIds,
    ...report.assembly.receiptIds,
    ...report.assembly.notExecutedIds,
  ];
  assert.equal(new Set(partition).size, expectedIds.length);
  assert.deepEqual(new Set(partition), new Set(expectedIds));
  const byId = new Map(report.rows.map((row) => [row.id, row]));

  const currentIdentity = await benchmarkBehaviorIdentity();
  for (const id of report.assembly.executedNowIds) {
    const row = byId.get(id);
    assert.equal(row.resultOrigin, 'current-execution');
    assert.equal(row.behaviorDependency.digest, currentIdentity.digest,
      `${id} was executed by a different source tree and must be republished.`);
    assert.deepEqual(row.behaviorDependency.scope, currentIdentity.scope);
    assert.equal(row.resourcePolicy.executionIsolation, 'sequential-row-in-one-cli-process');
    assert.equal(row.resourceEvidence.measurement, 'in-process-25ms-rss-sampling');
  }

  const currentAudit = await auditFreshBenchmarkReceipts();
  assert.deepEqual(report.assembly.receiptAudit, currentAudit.summary);
  for (const audit of currentAudit.rows) {
    const row = byId.get(audit.id);
    if (audit.scope.kind === 'subtrack') {
      const subtrack = row.subtrackResults.find((item) => item.id === audit.scope.id);
      assert.equal(subtrack.checkpointState, audit.state);
      assert.equal(row.checkpointState, 'historical-unverified',
        'A subtrack audit must not falsely verify its stored parent receipt.');
    } else {
      assert.equal(row.checkpointState, audit.state);
    }
  }

  for (const row of report.rows) {
    if (row.total === null) continue;
    assert.equal(row.agentInvocations, 0, `${row.id} must remain a direct public track.`);
    assert.ok(row.capabilityCoverage?.description.length > 40,
      `${row.id} needs a human coverage explanation.`);
    assert.equal(row.sampleCoverage.tested, row.total);
    assert.ok(row.sampleCoverage.available >= row.total);
    assert.equal(typeof row.sampleCoverage.comprehensive, 'boolean');
    assert.ok(row.diagnosis.length > 60);
    if (row.attempted === 0) {
      assert.equal(row.correct, 0);
      assert.equal(row.endToEndAccuracy, 0);
      assert.equal(row.attemptCoverage, 0);
      assert.equal(row.selectiveAccuracy, null);
    }
    if (Number.isInteger(row.completionCount)) {
      assert.equal(row.correct, null);
      assert.equal(row.accuracy, null);
      assert.equal(row.completionRate, row.completionCount / row.total);
    }
  }
});
