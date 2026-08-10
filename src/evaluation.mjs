import { performance } from 'node:perf_hooks';
import { relative } from 'node:path';
import { readJsonLines, writeJson } from './io.mjs';
import { PROJECT_ROOT } from './paths.mjs';

function equalValues(actual = [], expected = []) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

export async function evaluate(engine, suitePath, publishPath) {
  const cases = await readJsonLines(suitePath);
  const started = performance.now();
  const outcomes = [];
  for (const testCase of cases) {
    const input = testCase.context ? `${testCase.context} ${testCase.text}` : testCase.text;
    const result = await engine.ask(input);
    const pass = testCase.status
      ? result.status === testCase.status
      : equalValues(result.values, testCase.values);
    outcomes.push({ id: testCase.id, pass, expected: testCase.values ?? testCase.status, actual: result.values ?? result.status, answer: result.answer });
  }
  const report = {
    format: 'eslm-evaluation-report-v1',
    createdAt: new Date().toISOString(),
    suite: relative(PROJECT_ROOT, suitePath),
    model: {
      id: engine.model.manifest.modelId,
      knowledgeBases: engine.model.manifest.knowledgeBases ?? [],
      comparable: engine.model.manifest.benchmarkComparable !== false,
    },
    total: outcomes.length,
    passed: outcomes.filter((item) => item.pass).length,
    accuracy: outcomes.length ? outcomes.filter((item) => item.pass).length / outcomes.length : 0,
    durationMs: performance.now() - started,
    outcomes,
  };
  if (publishPath) await writeJson(publishPath, report);
  return report;
}
