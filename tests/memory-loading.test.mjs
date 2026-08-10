import test from 'node:test';
import assert from 'node:assert/strict';
import { planPublicKnowledgeMemory, ShardCache } from '../src/memory-policy.mjs';
import { loadPublicKnowledgeBase, PUBLIC_KB_CATALOG } from '../src/public-kbs.mjs';
import { createTerminalStyle } from '../src/terminal-style.mjs';

test('adaptive memory planning stays eager when ample and becomes mixed when constrained', () => {
  const ids = ['oewn-2025', 'atomic-2020'];
  const defaultPlan = planPublicKnowledgeMemory(ids, PUBLIC_KB_CATALOG);
  assert.deepEqual(defaultPlan.providers.map((item) => item.mode), ['eager', 'eager']);
  const mixed = planPublicKnowledgeMemory(ids, PUBLIC_KB_CATALOG, { memoryMb: 512 });
  assert.deepEqual(mixed.providers.map((item) => item.mode), ['eager', 'lazy']);
  const constrained = planPublicKnowledgeMemory(ids, PUBLIC_KB_CATALOG, { memoryMb: 256 });
  assert.deepEqual(constrained.providers.map((item) => item.mode), ['lazy', 'lazy']);
});

test('shard cache is LRU and does not retain a shard larger than its target', async () => {
  const cache = new ShardCache(10, 1);
  await cache.get('a', async () => ({ value: { a: true }, sourceBytes: 6 }));
  await cache.get('b', async () => ({ value: { b: true }, sourceBytes: 6 }));
  assert.equal(cache.snapshot().loadedShards, 1);
  assert.equal(cache.snapshot().evictions, 1);
  await cache.get('huge', async () => ({ value: { huge: true }, sourceBytes: 20 }));
  assert.equal(cache.snapshot().loadedShards, 1);
  assert.equal(cache.snapshot().oversizedLoads, 1);
});

test('lazy WordNet and ATOMIC providers preserve representative eager semantics', async () => {
  const wordnet = await loadPublicKnowledgeBase('oewn-2025', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  wordnet.beginQuery();
  const taxonomy = await wordnet.ask('Is a dog an animal?');
  wordnet.endQuery();
  assert.equal(taxonomy.values[0], true);
  assert.equal(taxonomy.reasoning.method, 'bounded-deduction');

  const atomic = await loadPublicKnowledgeBase('atomic-2020', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  const intention = await atomic.ask('Why might apologize?');
  assert.equal(intention.status, 'ANSWERED');
  assert.equal(intention.reasoning.method, 'defeasible-retrieval');
});

test('terminal color is explicit and never leaks when disabled', () => {
  const plain = createTerminalStyle('never', { isTTY: true });
  assert.equal(plain.green('ready'), 'ready');
  const colored = createTerminalStyle('always', { isTTY: false });
  assert.match(colored.green('ready'), /\u001b\[32m/u);
});
