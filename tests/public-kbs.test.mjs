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

test('GeoNames uses typed source relations and preserves place-name ambiguity', async () => {
  const provider = await loadPublicKnowledgeBase('geonames-2026', { mode: 'lazy', cacheBytes: 16 * 1024 * 1024 });
  const capital = await provider.ask('What is the capital of Romania?');
  assert.equal(capital.status, 'ANSWERED');
  assert.equal(capital.answer, 'Bucharest');
  assert.match(capital.provenance[0].source[0], /^GeoNames:/u);

  const renamedForm = await provider.ask('Which country has Bucharest as its capital?');
  assert.equal(renamedForm.answer, 'Romania');
  assert.equal(provider.memorySnapshot().mode, 'lazy');
});

test('ConceptNet retrieves typed relation edges without treating them as universal laws', async () => {
  const provider = await loadPublicKnowledgeBase('conceptnet-5.7.0-en', { mode: 'lazy', cacheBytes: 16 * 1024 * 1024 });
  const result = await provider.ask('What is a knife used for?');
  assert.equal(result.status, 'ANSWERED');
  assert.equal(result.reasoning.relation, 'UsedFor');
  assert.equal(result.reasoning.policy, 'defeasible-edge');
  assert.match(result.provenance[0].source[0], /^ConceptNet-5\.7\.0:/u);
});
