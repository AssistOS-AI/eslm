import { performance } from 'node:perf_hooks';
import { relative } from 'node:path';
import { readJsonLines, writeJson } from './io.mjs';
import { benchmarkBehaviorIdentity } from './evaluation/benchmark-execution-identity.mjs';
import {
  assertInternalEvaluationReport,
  INTERNAL_EVALUATION_REPORT_PROTOCOL,
  INTERNAL_REGRESSION_PROTOCOL,
} from './evaluation/internal-authored-report-contract.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { hashFile } from './util.mjs';

function equalValues(actual = [], expected = []) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

export async function evaluate(engine, suitePath, publishPath) {
  const cases = await readJsonLines(suitePath);
  const behaviorIdentity = await benchmarkBehaviorIdentity();
  const started = performance.now();
  const outcomes = [];
  for (const testCase of cases) {
    const input = testCase.context ? `${testCase.context} ${testCase.text}` : testCase.text;
    const result = await engine.ask(input);
    const pass = testCase.status
      ? result.status === testCase.status
      : equalValues(result.values, testCase.values);
    outcomes.push({
      id: testCase.id,
      pass,
      expected: testCase.values ?? testCase.status ?? null,
      actual: result.values ?? result.status ?? null,
      answer: result.answer ?? null,
    });
  }
  const report = {
    format: INTERNAL_EVALUATION_REPORT_PROTOCOL,
    protocol: INTERNAL_REGRESSION_PROTOCOL,
    createdAt: new Date().toISOString(),
    evidenceRegime: 'internal-authored-smoke-fixture',
    claimScope: 'implementation-regression-only',
    behaviorIdentity,
    dataset: {
      path: relative(PROJECT_ROOT, suitePath),
      sha256: await hashFile(suitePath),
      authoredFixture: true,
    },
    model: {
      id: engine.model.manifest.modelId,
      knowledgeBases: [...new Set(engine.model.manifest.knowledgeBases ?? [])].toSorted(),
      comparable: false,
    },
    total: outcomes.length,
    passed: outcomes.filter((item) => item.pass).length,
    accuracy: outcomes.length ? outcomes.filter((item) => item.pass).length / outcomes.length : 0,
    durationMs: performance.now() - started,
    outcomes,
  };
  assertInternalEvaluationReport(report);
  if (publishPath) await writeJson(publishPath, report);
  return report;
}
