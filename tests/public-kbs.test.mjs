import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublicKnowledgeBase } from '../src/public-kbs.mjs';

test('WordNet declarative shards support lazy bounded taxonomy proofs', async () => {
  const provider = await loadPublicKnowledgeBase('oewn-2025', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  const result = await provider.ask('Is a dog an animal?');
  assert.equal(result.status, 'ANSWERED');
  assert.deepEqual(result.values, [true]);
  assert.equal(provider.memorySnapshot().mode, 'lazy');
});

test('ATOMIC train shards preserve defeasible status and line provenance', async () => {
  const provider = await loadPublicKnowledgeBase('atomic-2020', { mode: 'lazy', cacheBytes: 32 * 1024 * 1024 });
  const result = await provider.ask('Why might apologize?');
  assert.equal(result.status, 'ANSWERED');
  assert.match(result.answer, /defeasible possibilities/u);
  assert.match(result.provenance[0].source[0], /^atomic-2020:train\.tsv:/u);
});
