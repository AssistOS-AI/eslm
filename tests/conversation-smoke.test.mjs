import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationSmokeCases } from '../src/conversation-smoke.mjs';
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

test('generated conversational smoke catalog covers at least 100 varied cases', () => {
  const cases = conversationSmokeCases();
  assert.ok(cases.length >= 100);
  assert.ok(new Set(cases.map((item) => item.group)).size >= 10);
  assert.equal(new Set(cases.map((item) => item.input)).size, cases.length);
});

for (const item of conversationSmokeCases()) {
  test(`conversation smoke: ${item.id}`, async () => {
    const result = await runtimes[item.kb].ask(item.input);
    assert.equal(result.status, item.expectedStatus);
    if (item.expectedValues) assert.deepEqual(result.values, item.expectedValues);
    if (['UNKNOWN', 'UNSUPPORTED'].includes(result.status)) assert.ok(result.answer.length > 40);
  });
}
