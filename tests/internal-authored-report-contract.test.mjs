import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runBenchmark } from '../src/benchmarks.mjs';
import { evaluate } from '../src/evaluation.mjs';
import {
  assertInternalAuthoredBenchmarkReport,
  assertInternalEvaluationReport,
  INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL,
  INTERNAL_EVALUATION_REPORT_PROTOCOL,
  INTERNAL_REGRESSION_PROTOCOL,
} from '../src/evaluation/internal-authored-report-contract.mjs';

function fixtureEngine() {
  return {
    model: { manifest: { modelId: 'fixture-model', knowledgeBases: ['fixture-kb'] } },
    async ask() {
      return {
        status: 'SOLVED',
        answer: 'Yes.',
        values: [true],
        languageRoute: 'direct-symbolic',
      };
    },
    score(text) {
      return { score: text === 'preferred' ? 1 : 0 };
    },
  };
}

async function fixtureFile(context, name, rows) {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-authored-report-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, name);
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  return path;
}

test('authored evaluation report binds its cases to the current behavior identity', async (context) => {
  const path = await fixtureFile(context, 'evaluation.jsonl', [
    { id: 'evaluation-case', text: 'Is the fixture true?', values: [true] },
  ]);
  const report = await evaluate(fixtureEngine(), path);
  assert.equal(report.format, INTERNAL_EVALUATION_REPORT_PROTOCOL);
  assert.equal(report.protocol, INTERNAL_REGRESSION_PROTOCOL);
  assert.equal(report.behaviorIdentity.format, 'eslm-benchmark-behavior-identity-v1');
  assert.equal(report.model.comparable, false);
  assert.equal(assertInternalEvaluationReport(report), report);

  const drifted = structuredClone(report);
  drifted.behaviorIdentity.digest = '0'.repeat(64);
  assert.equal(assertInternalEvaluationReport(drifted), drifted);
  drifted.outcomes[0].pass = false;
  assert.throws(() => assertInternalEvaluationReport(drifted), /passed count/u);

  const looseTimestamp = structuredClone(report);
  looseTimestamp.createdAt = '2030-01-02';
  assert.throws(() => assertInternalEvaluationReport(looseTimestamp), /canonical UTC ISO/u);

  const unorderedKnowledgeBases = structuredClone(report);
  unorderedKnowledgeBases.model.knowledgeBases = ['zeta-kb', 'alpha-kb'];
  assert.throws(() => assertInternalEvaluationReport(unorderedKnowledgeBases), /canonical string array/u);
});

test('authored benchmark report closes its protocol and reproduces route metrics', async (context) => {
  const path = await fixtureFile(context, 'benchmark.jsonl', [
    { id: 'qa-case', text: 'Is the fixture true?', values: [true] },
    { id: 'preference-case', kind: 'preference', good: 'preferred', bad: 'rejected' },
  ]);
  const report = await runBenchmark(fixtureEngine(), path);
  assert.equal(report.format, INTERNAL_AUTHORED_BENCHMARK_REPORT_PROTOCOL);
  assert.equal(report.protocol, INTERNAL_REGRESSION_PROTOCOL);
  assert.equal(report.correct, 2);
  assert.equal(report.language.directSymbolicCases, 2);
  assert.equal(assertInternalAuthoredBenchmarkReport(report), report);

  const unknownField = structuredClone(report);
  unknownField.fresh = true;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(unknownField), /must contain exactly/u);
  const changedMetrics = structuredClone(report);
  changedMetrics.language.directSymbolicCases = 1;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(changedMetrics), /do not reproduce/u);

  const missingInvocationFlag = structuredClone(report);
  delete missingInvocationFlag.results[0].normalizationExternalInvocation;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(missingInvocationFlag), /requires normalizationExternalInvocation/u);

  const directInvocation = structuredClone(report);
  directInvocation.results[0].normalizationExternalInvocation = true;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(directInvocation), /cannot carry normalization activity/u);

  const directStatus = structuredClone(report);
  directStatus.results[0].normalizationStatus = 'accepted';
  assert.throws(() => assertInternalAuthoredBenchmarkReport(directStatus), /cannot carry normalization activity/u);

  const cachedInvocation = structuredClone(report);
  cachedInvocation.results[0].normalizationAttempted = true;
  cachedInvocation.results[0].normalizationCacheHit = true;
  cachedInvocation.results[0].normalizationExternalInvocation = true;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(cachedInvocation), /cached authored benchmark row/u);

  const unattemptedCache = structuredClone(report);
  unattemptedCache.results[0].normalizationCacheHit = true;
  assert.throws(() => assertInternalAuthoredBenchmarkReport(unattemptedCache), /cannot carry normalization activity/u);
});
