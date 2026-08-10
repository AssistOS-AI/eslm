import test from 'node:test';
import assert from 'node:assert/strict';
import { runConversationBenchmark } from '../src/conversation-benchmark.mjs';
import { longConversationStressCases } from '../src/conversation-smoke.mjs';

test('1,000 longer conversational cases pass as an aggregate regression gate', { timeout: 120_000 }, async () => {
  const cases = longConversationStressCases(1000);
  assert.equal(cases.length, 1000);
  assert.equal(new Set(cases.map((item) => item.input)).size, 1000);
  const report = await runConversationBenchmark(cases);
  assert.equal(report.total, 1000);
  assert.deepEqual(report.failures, []);
  assert.equal(report.passed, 1000);
});
