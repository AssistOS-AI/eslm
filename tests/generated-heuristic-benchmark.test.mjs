import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { EslmRuntime } from '../src/runtime/runtime.mjs';
import { HeuristicLanguageRuntime } from '../src/runtime/heuristic-language-runtime.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';
import {
  DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE,
  GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL,
  generateHeuristicBenchmarkCases,
  runGeneratedHeuristicBenchmark,
} from '../src/evaluation/generated-heuristic-benchmark.mjs';
import { generatedHeuristicSuiteDigest } from '../src/evaluation/generated-heuristic-cases.mjs';

async function quickRuntime() {
  const workPolicy = resolveWorkPolicy('balanced');
  const model = mergeModels(await createCoreModel(), [await loadKnowledgeBase('quick')]);
  return new HeuristicLanguageRuntime(new EslmRuntime(
    new EslmEngine(model, { workPolicy }), [], ['quick'], undefined, workPolicy,
  ));
}

test('default generated heuristic suite has a deterministic broad structural distribution', () => {
  const first = generateHeuristicBenchmarkCases();
  const replay = generateHeuristicBenchmarkCases();
  assert.equal(first.length, DEFAULT_GENERATED_HEURISTIC_BENCHMARK_SIZE);
  assert.equal(first.length, 1_200);
  assert.deepEqual(first, replay);
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
  assert.equal(new Set(first.map((item) => item.domain)).size, 18);
  assert.ok(new Set(first.map((item) => item.technique)).size >= 40);
  assert.ok(new Set(first.map((item) => item.targetFamily)).size >= 24);
  assert.ok(first.every((item) => item.input.length > 10 && item.input.length < 1_024));
  assert.ok(first.every((item) => item.oracle && item.structuralTags.length > 0));
  assert.ok(first.some((item) => item.structuralTags.includes('multi-family')));
  assert.ok(first.some((item) => item.structuralTags.includes('multi-operation')));
  assert.ok(first.some((item) => item.structuralTags.includes('negative-control')));
  assert.ok(new Set(first.map((item) => item.oracle.oracleLevel)).size >= 6);
  assert.doesNotMatch(JSON.stringify(first), /\b(?:Abura|mura|bana)\b/u);
});

test('seed changes nonce surfaces and suite identity without changing structural coverage', () => {
  const left = generateHeuristicBenchmarkCases({ size: 128, seed: 'independent-left' });
  const right = generateHeuristicBenchmarkCases({ size: 128, seed: 'independent-right' });
  assert.notEqual(generatedHeuristicSuiteDigest(left, 'independent-left'),
    generatedHeuristicSuiteDigest(right, 'independent-right'));
  assert.notEqual(left[0].input, right[0].input);
  assert.deepEqual(
    [...new Set(left.map((item) => item.targetFamily))].toSorted(),
    [...new Set(right.map((item) => item.targetFamily))].toSorted(),
  );
});

test('generated runner executes the real runtime and preserves every case in aggregate denominators', async () => {
  const report = await runGeneratedHeuristicBenchmark(await quickRuntime(), {
    size: 64, seed: 'focused-runner', maximumRepresentativeFailures: 7,
    replayCommand: 'node src/cli.mjs benchmark generated --cases 64 --seed focused-runner',
  });
  assert.equal(report.format, GENERATED_HEURISTIC_BENCHMARK_REPORT_PROTOCOL);
  assert.equal(report.evidenceRegime, 'internal-generated-development');
  assert.equal(report.benchmarkComparable, false);
  assert.equal(report.generator.casesGenerated, 64);
  assert.equal(report.execution.casesExecuted, 64);
  assert.equal(report.total, 64);
  assert.equal(report.passed + report.failed, 64);
  assert.equal(report.accuracy, report.passed / 64);
  assert.ok(report.aggregates.domain.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.technique.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.targetFamily.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.aggregates.oracleLevel.reduce((sum, row) => sum + row.total, 0) === 64);
  assert.ok(report.failureClusters.reduce((sum, row) => sum + row.count, 0) === report.failed);
  assert.ok(report.representativeFailures.length <= 7);
  assert.ok(report.conclusions.every((item) => item.promotionGate.includes('independent seed')));
  assert.equal(report.strategyConfiguration.mode, 'runtime-work-policy');
  assert.equal(report.execution.grounding, false);
  assert.equal(report.execution.externalLanguageAgent, false);
  assert.equal(Object.isFrozen(report), true);
});

test('generated benchmark metadata cannot become runtime dispatch input', async () => {
  for (const path of [
    'src/runtime/engine.mjs', 'src/runtime/runtime.mjs',
    'src/runtime/heuristic-language-runtime.mjs', 'src/reasoning/datalog.mjs',
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /generated-heuristic|targetFamily|structuralTags/u, path);
  }
});

test('generated suite rejects unbounded or invalid controls', async () => {
  assert.throws(() => generateHeuristicBenchmarkCases({ size: 0 }), RangeError);
  assert.throws(() => generateHeuristicBenchmarkCases({ size: 20_001 }), RangeError);
  assert.throws(() => generateHeuristicBenchmarkCases({ seed: '' }), TypeError);
  await assert.rejects(runGeneratedHeuristicBenchmark({}, { size: 1 }), TypeError);
});
