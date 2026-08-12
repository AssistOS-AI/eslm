import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BENCHMARK_REPORT_CATALOG,
  benchmarkCatalogFields,
  validateBenchmarkCatalogFields,
  validateBenchmarkReportCatalog,
} from '../src/evaluation/benchmark-report-catalog.mjs';
import { validatePublicBenchmarkRow } from '../src/evaluation/benchmark-report-contract.mjs';
import { executePublicBenchmarkRows } from '../src/evaluation/public-benchmark-probes.mjs';
import { runPublicBenchmarkProbes } from '../src/evaluation/public-benchmark-report.mjs';
import { researchBenchmarkReportRows } from '../src/evaluation/research-benchmark-report-rows.mjs';

test('typed report catalog covers every public row identity and validates its lifecycle fields', () => {
  assert.equal(validateBenchmarkReportCatalog(), true);
  assert.equal(Object.keys(BENCHMARK_REPORT_CATALOG).length, 23);
  assert.deepEqual(benchmarkCatalogFields('simpleqa'), {
    adapterState: 'implemented-development',
    evaluationState: 'diagnostic-probe-executed',
    access: {
      state: 'public-direct-download',
      actionUrl: 'https://github.com/openai/simple-evals',
    },
  });
});

test('stored development receipts are explicitly historical and expose missing execution time', async () => {
  const [row] = await researchBenchmarkReportRows({ selectedIds: ['reclor'] });
  assert.equal(row.resultOrigin, 'stored-receipt');
  assert.equal(row.checkpointState, 'historical-unverified');
  assert.equal(row.executionEvidence.checkpointVerification.state, 'not-audited');
  assert.equal(row.executionEvidence.checkpointVerification.currentnessClaim, false);
  assert.equal('executedAt' in row.executionEvidence, false);
  assert.deepEqual(row.executionEvidence.reportingCompleteness, {
    state: 'incomplete', missingFields: ['executedAt'],
  });
});

test('legacy stored receipts receive the same unverified checkpoint boundary', async () => {
  const [row] = await executePublicBenchmarkRows({}, { selected: ['babi'] });
  assert.equal(row.resultOrigin, 'stored-receipt');
  assert.equal(row.checkpointState, 'historical-unverified');
  assert.equal(row.executionEvidence.checkpointVerification.state, 'not-audited');
  assert.equal(row.adapterState, BENCHMARK_REPORT_CATALOG.babi.adapterState);
  assert.equal(row.evaluationState, BENCHMARK_REPORT_CATALOG.babi.evaluationState);
  assert.deepEqual(row.access, BENCHMARK_REPORT_CATALOG.babi.access);
});

test('a registered receipt audit replaces the unverified checkpoint but preserves catalog truth', async () => {
  const [row] = (await runPublicBenchmarkProbes({}, { selected: ['logicbench'] })).rows;
  assert.notEqual(row.checkpointState, 'historical-unverified');
  assert.equal(row.executionEvidence.checkpointVerification.state, 'cryptographic-audit');
  assert.equal(row.executionEvidence.checkpointVerification.outcome, row.checkpointState);
  assert.equal(validateBenchmarkCatalogFields(row), true);
});

test('public row validation rejects lifecycle or access metadata invented outside the catalog', async () => {
  const [row] = await researchBenchmarkReportRows({ selectedIds: ['reclor'] });
  assert.equal(validatePublicBenchmarkRow(row), true);
  assert.throws(
    () => validatePublicBenchmarkRow({ ...row, adapterState: 'implemented-fresh' }),
    /adapterState differs from the typed benchmark catalog/u,
  );
  assert.throws(
    () => validatePublicBenchmarkRow({ ...row, evaluationState: 'fresh-evaluation-executed' }),
    /evaluationState differs from the typed benchmark catalog/u,
  );
  assert.throws(
    () => validatePublicBenchmarkRow({ ...row, access: { ...row.access, state: 'public-direct' } }),
    /access metadata differs from the typed benchmark catalog/u,
  );
});
