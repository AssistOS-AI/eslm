import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('published public benchmark report separates evidence regimes and explains capability coverage', async () => {
  const report = JSON.parse(await readFile(
    join(PROJECT_ROOT, 'docs/results/latest-public-benchmark-probes.json'),
    'utf8',
  ));
  assert.equal(report.format, 'eslm-public-benchmark-probe-report-v1');
  assert.match(report.evidenceRegime, /fresh evaluations/u);
  assert.equal(report.rows.length, 23);
  const byId = new Map(report.rows.map((row) => [row.id, row]));
  for (const id of ['logicbench', 'iibench', 'proofwriter', 'prontoqa', 'folio']) {
    assert.ok(byId.has(id), `${id} must be present in the published report.`);
  }
  assert.equal(byId.get('blimp').evidenceState, 'fresh-evaluation-executed');
  assert.equal(byId.get('ewok').evidenceState, 'fresh-evaluation-executed');
  assert.equal(byId.get('storyCloze').evidenceState, 'development-probe-executed');
  assert.equal(byId.get('proverqa').correct, 1_196);
  assert.equal(byId.get('proverqa').total, 1_200);
  assert.equal(byId.get('satbench').correct, 1_680);
  assert.equal(byId.get('satbench').total, 1_680);
  assert.equal(byId.get('babi').correct, 199_872);
  assert.equal(byId.get('babi').total, 200_000);
  assert.equal(byId.get('babi').statusCounts.AMBIGUOUS, 128);
  assert.equal(byId.get('babi').sampleCoverage.comprehensive, true);
  assert.equal(byId.get('slr-bench').correct, 126);
  assert.equal(byId.get('slr-bench').total, 200);
  assert.equal(byId.get('slr-bench').statusCounts.RESOURCE_LIMIT, 64);
  assert.equal(byId.get('folio').correct, 161);
  assert.equal(byId.get('folio').total, 204);
  assert.equal(byId.get('folio').subtrackResults[0].correct, 4);
  assert.equal(byId.get('folio').subtrackResults[1].correct, 75);
  assert.equal(byId.get('stepgame').correct, 4_710);
  assert.equal(byId.get('stepgame').total, 5_000);
  assert.equal(byId.get('sparc-sparp').correct, 15_578);
  assert.equal(byId.get('sparc-sparp').total, 15_647);
  assert.equal(byId.get('sparc-sparp').sampleCoverage.available, 15_647);
  assert.equal(byId.get('zebralogic').correct, 791);
  assert.equal(byId.get('zebralogic').total, 800);
  assert.equal(byId.get('reclor').correct, null);
  assert.equal(byId.get('reclor').statusCounts.NO_APPLICABLE_METHOD, 500);
  assert.equal(byId.get('logiqa').correct, null);
  assert.equal(byId.get('logiqa').statusCounts.NO_APPLICABLE_METHOD, 651);
  for (const row of report.rows) {
    if (row.total === null) {
      assert.equal(row.correct, null);
      assert.equal(row.accuracy, null);
      assert.ok(row.access?.actionUrl, `${row.id} needs a concrete official action URL.`);
      assert.ok(row.capabilityCoverage?.description.length > 40, `${row.id} needs a planned-capability explanation.`);
      continue;
    }
    assert.equal(row.agentInvocations, 0, `${row.id} must remain a direct public track.`);
    assert.ok(row.capabilityCoverage?.description.length > 40, `${row.id} needs a human coverage explanation.`);
    assert.equal(row.sampleCoverage?.tested, row.total, `${row.id} must state the latest tested count.`);
    assert.ok(row.sampleCoverage.available >= row.sampleCoverage.tested,
      `${row.id} must state the available population behind the sample.`);
    assert.equal(typeof row.sampleCoverage.comprehensive, 'boolean');
    assert.ok(typeof row.diagnosis === 'string' && row.diagnosis.length > 60);
  }
});
