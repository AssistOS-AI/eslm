import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBenchmarkStrategyConfiguration,
  createAdapterBenchmarkStrategyConfiguration,
  createRuntimeBenchmarkStrategyConfiguration,
} from '../src/evaluation/benchmark-strategy-configuration.mjs';
import { approximateControlledEnglish } from '../src/language/heuristic-cnl-approximation.mjs';
import { resolveWorkPolicy } from '../src/runtime/work-policy.mjs';

function runtimeResult(text, workPolicy) {
  const approximation = approximateControlledEnglish(text, {
    limits: {
      maximumInputBytes: 16_384, maximumTokens: 768, maximumSentences: 48,
      maximumProposals: 96, maximumCandidates: 24,
      maximumEditDistanceEvaluations: 8_192, maximumReceiptBytes: 524_288,
    },
    minimumCandidateConfidence: 0.68,
  });
  return { workPolicy, approximation };
}

test('runtime benchmark strategy snapshots bind work policy and all stage receipts', () => {
  const workPolicy = resolveWorkPolicy('balanced');
  const configuration = createRuntimeBenchmarkStrategyConfiguration([
    runtimeResult('Nara is an zoral.', workPolicy),
    runtimeResult('Tarin is an velin.', workPolicy),
  ]);
  assert.equal(assertBenchmarkStrategyConfiguration(configuration), configuration);
  assert.equal(configuration.mode, 'runtime-work-policy');
  assert.equal(configuration.selection.effectiveProfile, 'balanced');
  const language = configuration.stageReceipts.find((item) =>
    item.stage === 'runtime.language.interpret');
  assert.equal(language.executions, 2);
  assert.equal(language.completeExecutions + language.incompleteExecutions, 2);
  assert.equal(language.uniqueReceipts.reduce((sum, item) => sum + item.occurrences, 0), 2);
});

test('benchmark strategy snapshots reject digest and batch-count mutations', () => {
  const configuration = createAdapterBenchmarkStrategyConfiguration({
    adapterId: 'adapter:nonce-graph', adapterVersion: '4',
    stateFormat: 'nonce-graph-policy-v1', state: { route: 'typed-edges', depth: 3 },
  });
  assert.equal(assertBenchmarkStrategyConfiguration(configuration), configuration);
  assert.throws(() => assertBenchmarkStrategyConfiguration({
    ...configuration, configurationDigest: `sha256:${'0'.repeat(64)}`,
  }), /digest does not match/u);

  const runtime = createRuntimeBenchmarkStrategyConfiguration([
    runtimeResult('Nara is an zoral.', resolveWorkPolicy('balanced')),
  ]);
  const [stage] = runtime.stageReceipts;
  assert.throws(() => assertBenchmarkStrategyConfiguration({
    ...runtime,
    stageReceipts: [{ ...stage, executions: stage.executions + 1 }],
  }), /counts|digest/u);
});

test('one benchmark row cannot aggregate different work policies', () => {
  assert.throws(() => createRuntimeBenchmarkStrategyConfiguration([
    runtimeResult('Nara is an zoral.', resolveWorkPolicy('quick')),
    runtimeResult('Tarin is an velin.', resolveWorkPolicy('balanced')),
  ]), /same work policy/u);
});
