import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assemblePublicBenchmarkReport, runPublicBenchmarkProbes,
} from '../src/evaluation/public-benchmark-report.mjs';
import {
  benchmarkReportFields, benchmarkTrack, validatePublicBenchmarkRow,
} from '../src/evaluation/benchmark-report-contract.mjs';
import { benchmarkCatalogFields } from '../src/evaluation/benchmark-report-catalog.mjs';
import { researchBenchmarkReportRows } from '../src/evaluation/research-benchmark-report-rows.mjs';
import {
  benchmarkCommand, executeLegacyRowsSequentially, selectedBenchmarkIds,
} from '../src/interface/benchmark-command.mjs';

test('forced-choice abstention keeps the full denominator and separates coverage from selective accuracy', () => {
  const fields = benchmarkReportFields('reclor', {
    total: 500, correct: null, attempted: 0, forcedChoice: true, normalizationCandidates: null,
  });
  assert.equal(fields.correct, 0);
  assert.equal(fields.endToEndAccuracy, 0);
  assert.equal(fields.accuracy, 0);
  assert.equal(fields.attemptCoverage, 0);
  assert.equal(fields.selectiveAccuracy, null);
  assert.equal(fields.accuracySemantics, 'end-to-end-over-declared-denominator');
});

function validRawLanguageRow() {
  return {
    id: 'blimp', ...benchmarkCatalogFields('blimp'),
    track: 'raw-language', inputRoute: 'raw-language',
    resultOrigin: 'stored-receipt', checkpointState: 'historical-unverified',
    executionEvidence: { origin: 'stored-receipt' },
    total: 4, correct: 1, attempted: 2, forcedChoice: true,
    endToEndAccuracy: 0.25, accuracy: 0.25,
    attemptCoverage: 0.5, selectiveAccuracy: 0.5,
    accuracySemantics: 'end-to-end-over-declared-denominator',
    sampleCoverage: { tested: 4, available: 4 },
    statusCounts: { SOLVED: 2, UNKNOWN: 2 },
    sourceEvidence: [{ path: 'sample.jsonl', sha256: 'a'.repeat(64) }],
    normalizationCandidates: 1, normalizationCandidateRate: 0.25, directSymbolicRate: 0.75,
    agentInvocations: 0, agentInvocationRate: 0,
    selectedMethods: [], selectedKbVersions: [], usedKbVersions: [],
    evidenceState: 'development-probe-executed', diagnosis: 'Synthetic contract test row.',
  };
}

test('public row validation rejects invented denominator and route metrics', () => {
  const row = validRawLanguageRow();
  assert.equal(validatePublicBenchmarkRow(row), true);
  for (const [field, value, message] of [
    ['forcedChoice', undefined, /forcedChoice differs/u],
    ['forcedChoice', false, /forcedChoice differs/u],
    ['attempted', null, /attempted is required/u],
    ['accuracySemantics', 'selective-over-attempts', /accuracySemantics/u],
    ['directSymbolicRate', 0.5, /route metrics/u],
    ['normalizationCandidateRate', 0.5, /route metrics/u],
    ['agentInvocationRate', 0.25, /agentInvocationRate/u],
  ]) {
    assert.throws(() => validatePublicBenchmarkRow({ ...row, [field]: value }), message, field);
  }
});

test('track and input route distinguish raw language from adapter and conformance evidence', () => {
  assert.deepEqual(benchmarkTrack('simpleqa'), { track: 'raw-language', inputRoute: 'raw-language' });
  assert.deepEqual(benchmarkTrack('stepgame'), { track: 'structured-task', inputRoute: 'source-template' });
  assert.deepEqual(benchmarkTrack('storyCloze'), { track: 'structured-task', inputRoute: 'source-template' });
  assert.deepEqual(benchmarkTrack('clutrr'), { track: 'structured-task', inputRoute: 'structured-task' });
  assert.deepEqual(benchmarkTrack('satbench'), { track: 'solver-conformance', inputRoute: 'source-annotation' });
  assert.equal(benchmarkReportFields('simpleqa', {
    total: 100, correct: 0, normalizationCandidates: 35,
  }).directSymbolicRate, 0.65);
  assert.equal(benchmarkReportFields('satbench', {
    total: 1_680, correct: 1_680, attempted: 1_680, normalizationCandidates: 0,
  }).directSymbolicRate, null);
});

test('no-method public rows report zero end-to-end accuracy without fabricating selective accuracy', async () => {
  const rows = await researchBenchmarkReportRows({
    selectedIds: ['defeasible-nli', 'alpha-nli-art', 'reclor', 'logiqa'],
  });
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.equal(row.correct, 0, row.id);
    assert.equal(row.endToEndAccuracy, 0, row.id);
    assert.equal(row.attempted, 0, row.id);
    assert.equal(row.attemptCoverage, 0, row.id);
    assert.equal(row.selectiveAccuracy, null, row.id);
    assert.equal(row.directSymbolicRate, null, row.id);
    assert.equal(row.inputRoute, 'structured-task', row.id);
  }
});

test('zero-attempt forced-choice subtracks keep their own denominator inside mixed benchmarks', async () => {
  const [row] = await researchBenchmarkReportRows({ selectedIds: ['logicskills'] });
  const validity = row.subtrackResults.find((subtrack) => subtrack.id === 'validity-development');
  assert.deepEqual({
    tested: validity.tested,
    attempted: validity.attempted,
    correct: validity.correct,
    endToEndAccuracy: validity.endToEndAccuracy,
    attemptCoverage: validity.attemptCoverage,
    selectiveAccuracy: validity.selectiveAccuracy,
  }, {
    tested: 480, attempted: 0, correct: 0, endToEndAccuracy: 0, attemptCoverage: 0,
    selectiveAccuracy: null,
  });
});

test('single-benchmark selection does not append unrelated research receipts', async () => {
  assert.deepEqual(selectedBenchmarkIds('babi'), ['babi']);
  assert.deepEqual(selectedBenchmarkIds('babi,babi'), ['babi']);
  assert.deepEqual(selectedBenchmarkIds('logicbench'), ['logicbench']);
  assert.equal(selectedBenchmarkIds('all').length, 23);
  const report = await runPublicBenchmarkProbes({}, { selected: ['babi'] });
  assert.deepEqual(report.rows.map((row) => row.id), ['babi']);
  assert.deepEqual(report.assembly.executedNowIds, []);
  assert.deepEqual(report.assembly.receiptIds, ['babi']);
  assert.deepEqual(report.assembly.notExecutedIds, []);
  assert.equal(report.assembly.mode, 'stored-receipt-assembly');
  assert.equal(typeof report.assembledAt, 'string');
  assert.equal('createdAt' in report, false);
});

test('live public rows construct and execute one runtime at a time with measured resources', async () => {
  const events = [];
  let active = 0;
  let maximumActive = 0;
  const rows = await executeLegacyRowsSequentially(
    ['clutrr', 'entityTracking'],
    { 'memory-mb': 256 },
    async (options) => {
      events.push(`construct:${options.kb}`);
      return { identity: events.length };
    },
    async (engines, options) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      events.push(`execute:${options.selected[0]}`);
      await Promise.resolve();
      active -= 1;
      return [{
        id: options.selected[0], resultOrigin: 'current-execution',
        engineKey: Object.keys(engines)[0],
      }];
    },
    async () => ({
      format: 'eslm-benchmark-behavior-identity-v1',
      state: 'content-addressed-worktree',
      digest: 'a'.repeat(64),
      files: 1,
      runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    }),
  );
  assert.equal(maximumActive, 1);
  assert.deepEqual(events.filter((event) => event.startsWith('execute:')),
    ['execute:clutrr', 'execute:entityTracking']);
  assert.deepEqual(rows.map((row) => row.engineKey), ['clutrr', 'base']);
  for (const row of rows) {
    assert.equal(row.resourcePolicy.requestedMemoryMb, 256);
    assert.equal(row.resourcePolicy.executionIsolation, 'sequential-row-in-one-cli-process');
    assert.ok(row.resourceEvidence.sampledPeakRssBytes > 0);
    assert.ok(row.resourceEvidence.wallMilliseconds >= 0);
    assert.match(row.replayCommand, /--benchmark/u);
    assert.equal(row.behaviorDependency.digest, 'a'.repeat(64));
  }
});

test('a stale fresh checkpoint is labeled as historical evidence instead of current fresh evidence', async () => {
  const report = await runPublicBenchmarkProbes({}, { selected: ['iibench'] });
  const [row] = report.rows;
  if (['historical-stale', 'historical-unrecoverable'].includes(row.checkpointState)) {
    assert.equal(row.recordedEvidenceState, 'fresh-evaluation-executed');
    assert.equal(row.evidenceState, 'historical-fresh-evaluation');
    assert.ok(row.executionEvidence.dependencyAudit.changed > 0
      || row.executionEvidence.dependencyAudit.missing > 0
      || row.executionEvidence.receiptBindingState === 'mismatch');
  } else if (row.checkpointState === 'current') {
    assert.equal(row.checkpointState, 'current');
    assert.equal(row.evidenceState, 'fresh-evaluation-executed');
  } else {
    assert.ok(['invalid', 'unavailable'].includes(row.checkpointState));
    assert.match(row.evidenceState, /^(?:invalid|unavailable)-fresh-evaluation$/u);
  }
});

test('a subtrack receipt audit never changes the parent benchmark checkpoint', async () => {
  const report = await runPublicBenchmarkProbes({}, { selected: ['logicskills'] });
  const [row] = report.rows;
  assert.equal(row.evidenceState, 'development-probe-executed');
  assert.equal(row.checkpointState, 'historical-unverified');
  assert.equal(row.executionEvidence.checkpointVerification.state, 'not-audited');
  const fresh = row.subtrackResults.find((subtrack) => subtrack.id === 'countermodel-fresh');
  assert.ok(fresh.checkpointState);
  assert.equal(fresh.executionEvidence.dependencyAudit.state, fresh.checkpointState);
});

test('ZebraLogic reports verified completion without fabricating private-oracle accuracy', async () => {
  const report = await runPublicBenchmarkProbes({}, { selected: ['zebralogic'] });
  const [row] = report.rows;
  assert.equal(row.total, 800);
  assert.equal(row.correct, null);
  assert.equal(row.accuracy, null);
  assert.equal(row.attempted, null);
  assert.equal(row.attemptCoverage, null);
  assert.equal(row.completionCount, 791);
  assert.equal(row.completionRate, 791 / 800);
});

test('a selected diagnostic cannot overwrite the published complete portfolio', async () => {
  await assert.rejects(benchmarkCommand(['probe'], { benchmark: 'reclor', publish: true }, {
    engineFor: () => { throw new Error('engine must not be constructed'); },
    printJson: () => {},
  }), /requires --benchmark all/u);
});

test('assembly distinguishes rows executed now from stored receipts', () => {
  const report = assemblePublicBenchmarkReport([
    { id: 'live', resultOrigin: 'current-execution' },
    { id: 'stored', resultOrigin: 'stored-receipt' },
  ], { selected: ['live', 'stored'], assembledAt: '2030-01-02T03:04:05.000Z' });
  assert.equal(report.assembledAt, '2030-01-02T03:04:05.000Z');
  assert.equal(report.assembly.mode, 'mixed-current-execution-and-stored-receipts');
  assert.deepEqual(report.assembly.executedNowIds, ['live']);
  assert.deepEqual(report.assembly.receiptIds, ['stored']);
  assert.deepEqual(report.assembly.notExecutedIds, []);
});

test('assembly rejects a requested benchmark whose row was not produced', async () => {
  await assert.rejects(
    runPublicBenchmarkProbes({}, { selected: ['not-a-catalog-benchmark'] }),
    /missing requested rows: not-a-catalog-benchmark/u,
  );
});
