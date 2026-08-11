import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openKnowledgePackage, loadPackageRecords, routePackageShards } from '../src/kb/package.mjs';
import { KnowledgeCatalog } from '../src/kb/catalog.mjs';
import { projectCanonicalRecords } from '../src/kb/projection.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('compiled QUICK package is declarative, checksummed, and projectable', async () => {
  const handle = await openKnowledgePackage(`${PROJECT_ROOT}/training/KBs/quick/package/manifest.json`);
  assert.equal(handle.manifest.format, 'eslm-kb-package-v1');
  assert.equal(handle.shards.every((shard) => shard.dataRef.endsWith('.json')), true);
  const loaded = await loadPackageRecords(handle);
  const model = projectCanonicalRecords(loaded.records, [handle.manifest]);
  assert.equal(model.entities.some((entity) => entity.names.includes('Penguin')), true);
  assert.equal(model.facts.some((fact) => fact.predicate === 'can' && fact.value === 'swim'), true);
  assert.equal(model.rules.length, 3);
});

test('generic routing stays exhaustive until a dependency-complete access graph exists', async () => {
  const handle = await openKnowledgePackage(`${PROJECT_ROOT}/training/KBs/quick/package/manifest.json`);
  const selected = routePackageShards(handle, { predicates: ['term:common:Can'] });
  assert.equal(selected.length, handle.shards.length);
  assert.equal(selected.some((shard) => shard.shardId === 'assertions-09'), true);
});

test('catalog registration is persistent and unregistration never deletes a package', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-catalog-'));
  const catalogPath = join(directory, 'catalog.json');
  const manifestPath = `${PROJECT_ROOT}/training/KBs/quick/package/manifest.json`;
  const catalog = await new KnowledgeCatalog(catalogPath).load();
  const entry = await catalog.register(manifestPath);
  assert.equal(entry.kbId, 'quick');
  assert.equal((await new KnowledgeCatalog(catalogPath).load()).resolve('quick'), manifestPath);
  assert.equal(await catalog.unregister('quick'), true);
  assert.equal((await openKnowledgePackage(manifestPath)).manifest.kbId, 'quick');
});

test('projection derives runtime predicates from canonical keys and scalarizes class concepts', () => {
  const provenanceRefs = ['prov:test:1'];
  const records = [
    { recordType: 'provenance', recordId: 'prov:test:1', kbNamespace: 'test', schemaVersion: '1', sourceId: 'source:test', sourceChecksum: 'sha256:test', transformation: 'fixture', provenanceRefs: [] },
    { recordType: 'term', recordId: 'term:test:astra', kbNamespace: 'test', schemaVersion: '1', termKind: 'entity', canonicalKey: 'test/Astra', provenanceRefs },
    { recordType: 'term', recordId: 'term:test:planet', kbNamespace: 'test', schemaVersion: '1', termKind: 'concept', canonicalKey: 'test/Planet', provenanceRefs },
    { recordType: 'term', recordId: 'term:test:is-a', kbNamespace: 'test', schemaVersion: '1', termKind: 'predicate', canonicalKey: 'test/predicate/is-a', provenanceRefs },
    { recordType: 'lexeme', recordId: 'lex:test:astra', kbNamespace: 'test', schemaVersion: '1', language: 'en', surface: 'Astra', lemma: 'astra', partOfSpeech: 'properNoun', denotes: 'term:test:astra', provenanceRefs },
    { recordType: 'assertion', recordId: 'fact:test:astra-planet', kbNamespace: 'test', schemaVersion: '1', predicate: 'term:test:is-a', arguments: ['term:test:astra', 'term:test:planet'], polarity: 'positive', epistemicStatus: 'asserted', provenanceRefs },
  ];
  const projected = projectCanonicalRecords(records);
  assert.equal(projected.facts[0].predicate, 'is_a');
  assert.equal(projected.facts[0].value, 'planet');
});
