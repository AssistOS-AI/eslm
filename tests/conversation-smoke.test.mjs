import test from 'node:test';
import assert from 'node:assert/strict';
import {
  conversationShape, conversationSmokeCases, REGRESSION_SMOKE_SEED, smokeExamples,
} from '../src/conversation-smoke.mjs';
import { EslmEngine } from '../src/engine.mjs';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { loadModel } from '../src/model-loader.mjs';
import { loadPublicKnowledgeBase } from '../src/public-kbs.mjs';
import { EslmRuntime } from '../src/runtime.mjs';

const base = await loadModel();
const runtimes = {
  base: new EslmRuntime(new EslmEngine(base)),
  quick: new EslmRuntime(new EslmEngine(mergeModels(base, [await loadKnowledgeBase('quick')]))),
  'oewn-2025': new EslmRuntime(new EslmEngine(base), [await loadPublicKnowledgeBase('oewn-2025', { mode: 'lazy', cacheBytes: 64 * 1024 * 1024 })], ['oewn-2025']),
  'atomic-2020': new EslmRuntime(new EslmEngine(base), [await loadPublicKnowledgeBase('atomic-2020', { mode: 'lazy', cacheBytes: 64 * 1024 * 1024 })], ['atomic-2020']),
};

test('generated conversational smoke catalog enforces surface and structural diversity', () => {
  const cases = conversationSmokeCases({ seed: REGRESSION_SMOKE_SEED });
  const shapes = Map.groupBy(cases, (item) => conversationShape(item.input));
  const largestCloneFamily = Math.max(...[...shapes.values()].map((items) => items.length));
  assert.ok(cases.length >= 200);
  assert.ok(new Set(cases.map((item) => item.group)).size >= 10);
  assert.equal(new Set(cases.map((item) => item.input)).size, cases.length);
  assert.ok(shapes.size >= 160, `expected at least 160 structural shapes, received ${shapes.size}`);
  assert.ok(largestCloneFamily <= 4, `one structural template was cloned ${largestCloneFamily} times`);
  const fresh = conversationSmokeCases({ seed: 'fresh-seed-for-generator-audit' });
  assert.ok(cases.filter((item, index) => item.input !== fresh[index].input).length >= 100);
});

test('displayed examples vary the final question form within each capability group', () => {
  for (const [group, examples] of Map.groupBy(smokeExamples({ seed: 'display-audit-seed' }), (item) => item.group)) {
    const finalShapes = new Set(examples.map((item) => {
      const finalSegment = item.input.match(/[^.!?]+[.!?]?/gu)?.at(-1)?.trim() ?? item.input;
      return conversationShape(finalSegment);
    }));
    assert.ok(finalShapes.size >= Math.min(3, examples.length), `${group} repeats one visible question form`);
  }
});

for (const item of conversationSmokeCases({ seed: REGRESSION_SMOKE_SEED })) {
  test(`conversation smoke: ${item.id}`, async () => {
    const result = await runtimes[item.kb].ask(item.input);
    assert.equal(result.status, item.expectedStatus);
    if (item.expectedValues) assert.deepEqual(result.values, item.expectedValues);
    if (['UNKNOWN', 'UNSUPPORTED'].includes(result.status)) assert.ok(result.answer.length > 40);
  });
}

test('a fresh generated seed preserves core and QUICK semantics', async () => {
  const fresh = conversationSmokeCases({ seed: 'fresh-semantic-regression-seed' })
    .filter((item) => ['base', 'quick'].includes(item.kb));
  for (const item of fresh) {
    const result = await runtimes[item.kb].ask(item.input);
    assert.equal(result.status, item.expectedStatus, item.input);
    if (item.expectedValues) assert.deepEqual(result.values, item.expectedValues, item.input);
  }
});
