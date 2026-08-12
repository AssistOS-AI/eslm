import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cp, mkdir, mkdtemp, readFile, rename, symlink, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadPackageRecords, openKnowledgePackage, routePackageShards, validateKnowledgePackage,
} from '../src/kb/package.mjs';
import { KnowledgeCatalog } from '../src/kb/catalog.mjs';
import { compileKnowledgeBase } from '../src/kb/compiler.mjs';
import { projectCanonicalRecords } from '../src/kb/projection.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function buildTestPackage(root, {
  kbId, kbVersion = '1.0.0', namespace = kbId, dependencies, marker = kbId, records,
}) {
  const canonicalDirectory = join(root, kbId, marker, 'canonical');
  const packageDirectory = join(root, kbId, marker, 'package');
  const canonicalPath = join(canonicalDirectory, 'records.jsonl');
  await mkdir(canonicalDirectory, { recursive: true });
  const record = {
    recordType: 'provenance',
    recordId: `prov:${namespace}:${marker}`,
    kbNamespace: namespace,
    schemaVersion: '1',
    sourceId: `source:${marker}`,
    sourceChecksum: `sha256:${'a'.repeat(64)}`,
    transformation: 'test fixture',
    provenanceRefs: [],
  };
  const canonicalRecords = records ?? [record];
  await writeFile(canonicalPath, `${canonicalRecords.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  await compileKnowledgeBase({
    canonicalPath,
    outputDirectory: packageDirectory,
    packageMetadata: {
      kbId,
      kbVersion,
      namespace,
      languages: ['en'],
      domains: ['registration-test'],
      ...(dependencies ? { dependencies } : {}),
      capabilities: [],
      trustLevel: 'test-reviewed',
      benchmarkEligible: false,
      license: 'MIT test fixture',
    },
  });
  return { packageDirectory, manifestPath: join(packageDirectory, 'manifest.json') };
}

async function rewriteShard(packageDirectory, shardKind, mutate) {
  const shardDirectoryPath = join(packageDirectory, 'shards.json');
  const shards = JSON.parse(await readFile(shardDirectoryPath, 'utf8'));
  const descriptor = shards.find((shard) => shard.shardKind === shardKind);
  assert.ok(descriptor, `Missing ${shardKind} shard in test package.`);
  const shardPath = join(packageDirectory, descriptor.dataRef);
  const records = JSON.parse(await readFile(shardPath, 'utf8'));
  mutate(records);
  const bytes = `${JSON.stringify(records)}\n`;
  descriptor.compressedBytes = Buffer.byteLength(bytes);
  descriptor.checksum = `sha256:${digest(bytes)}`;
  await writeFile(shardPath, bytes, 'utf8');
  await writeFile(shardDirectoryPath, `${JSON.stringify(shards)}\n`, 'utf8');
}

function referenceGraphRecords(namespace = 'reference-graph') {
  const provenanceRefs = [`prov:${namespace}:1`];
  return [
    {
      recordType: 'provenance', recordId: provenanceRefs[0], kbNamespace: namespace, schemaVersion: '1',
      sourceId: `source:${namespace}`, sourceChecksum: `sha256:${'b'.repeat(64)}`,
      transformation: 'test graph', provenanceRefs: [],
    },
    {
      recordType: 'context', recordId: `context:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      contextKind: 'test', inherits: [], provenanceRefs,
    },
    {
      recordType: 'term', recordId: `term:${namespace}:entity`, kbNamespace: namespace, schemaVersion: '1',
      termKind: 'entity', canonicalKey: `${namespace}/entity`, provenanceRefs,
    },
    {
      recordType: 'term', recordId: `term:${namespace}:concept`, kbNamespace: namespace, schemaVersion: '1',
      termKind: 'concept', canonicalKey: `${namespace}/concept`, provenanceRefs,
    },
    {
      recordType: 'term', recordId: `term:${namespace}:predicate`, kbNamespace: namespace, schemaVersion: '1',
      termKind: 'predicate', canonicalKey: `${namespace}/predicate/relation`, provenanceRefs,
    },
    {
      recordType: 'term', recordId: `term:${namespace}:role`, kbNamespace: namespace, schemaVersion: '1',
      termKind: 'role', canonicalKey: `${namespace}/role/agent`, provenanceRefs,
    },
    {
      recordType: 'term', recordId: `term:${namespace}:event-type`, kbNamespace: namespace, schemaVersion: '1',
      termKind: 'eventType', canonicalKey: `${namespace}/event/occurrence`, provenanceRefs,
    },
    {
      recordType: 'lexeme', recordId: `lex:${namespace}:entity`, kbNamespace: namespace, schemaVersion: '1',
      language: 'en', surface: 'entity', lemma: 'entity', partOfSpeech: 'noun',
      denotes: `term:${namespace}:entity`, provenanceRefs,
    },
    {
      recordType: 'assertion', recordId: `fact:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      predicate: `term:${namespace}:predicate`,
      arguments: [`term:${namespace}:entity`, `term:${namespace}:concept`],
      polarity: 'positive', epistemicStatus: 'asserted', contextRef: `context:${namespace}:1`, provenanceRefs,
    },
    {
      recordType: 'event', recordId: `event:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      eventType: `term:${namespace}:event-type`, contextRef: `context:${namespace}:1`, provenanceRefs,
    },
    {
      recordType: 'roleEdge', recordId: `role:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      eventRef: `event:${namespace}:1`, role: `term:${namespace}:role`, filler: `term:${namespace}:entity`,
      provenanceRefs,
    },
    {
      recordType: 'rule', recordId: `rule:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      semantics: 'strict', when: [{ predicate: `term:${namespace}:predicate`, arguments: ['?x', '?y'] }],
      then: [{ predicate: `term:${namespace}:predicate`, arguments: ['?x', '?y'] }],
      contextRef: `context:${namespace}:1`, provenanceRefs,
    },
    {
      recordType: 'retraction', recordId: `retract:${namespace}:1`, kbNamespace: namespace, schemaVersion: '1',
      targetRecord: `fact:${namespace}:1`, contextRef: `context:${namespace}:1`, provenanceRefs,
    },
  ];
}

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

test('package opening enforces allowlisted immutable v1 metadata and confined regular shard files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-shape-'));
  const built = await buildTestPackage(directory, { kbId: 'shape-test' });
  const handle = await openKnowledgePackage(built.manifestPath);
  const validation = await validateKnowledgePackage(handle);
  assert.equal(validation.recordsValidated, 1);
  assert.match(validation.packageDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(validation.referenceAudit.status, 'complete');
  assert.equal(validation.referenceAudit.declaredIdentifiers, 1);
  assert.equal(validation.recordStructureAudit.recordsAudited, 1);
  assert.equal(validation.workBounds.maximumRetainedReferenceEntries, 1_000_000);
  assert.equal(validation.workBounds.maximumRetainedReferenceUtf8Bytes, 64 * 1024 * 1024);
  assert.equal(validation.retainedValidationIndex,
    'record-identities-and-unique-cross-record-references');
  assert.equal(Object.isFrozen(handle.manifest.canonicalSource), true);
  assert.equal(Object.isFrozen(handle.shards[0]), true);

  const manifest = JSON.parse(await readFile(built.manifestPath, 'utf8'));
  manifest.unreviewedExtension = true;
  await writeFile(built.manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
  await assert.rejects(openKnowledgePackage(built.manifestPath), /unsupported field unreviewedExtension/u);

  const schemaPackage = await buildTestPackage(directory, { kbId: 'manifest-schema-test' });
  const schemaManifest = JSON.parse(await readFile(schemaPackage.manifestPath, 'utf8'));
  schemaManifest.schemaVersion = '2';
  await writeFile(schemaPackage.manifestPath, `${JSON.stringify(schemaManifest)}\n`, 'utf8');
  await assert.rejects(openKnowledgePackage(schemaPackage.manifestPath), /unsupported schemaVersion 2/u);

  const descriptorPackage = await buildTestPackage(directory, { kbId: 'descriptor-shape-test' });
  const descriptorPath = join(descriptorPackage.packageDirectory, 'shards.json');
  const descriptors = JSON.parse(await readFile(descriptorPath, 'utf8'));
  descriptors[0].loaderHook = 'never-executable';
  await writeFile(descriptorPath, `${JSON.stringify(descriptors)}\n`, 'utf8');
  await assert.rejects(openKnowledgePackage(descriptorPackage.manifestPath), /unsupported field loaderHook/u);

  const executablePackage = await buildTestPackage(directory, { kbId: 'root-payload-test' });
  await writeFile(join(executablePackage.packageDirectory, 'payload.mjs'), 'throw new Error();\n', 'utf8');
  await assert.rejects(openKnowledgePackage(executablePackage.manifestPath),
    /Package root contains undeclared entry payload\.mjs/u);

  const rootLinkPackage = await buildTestPackage(directory, { kbId: 'root-link-test' });
  await symlink(rootLinkPackage.manifestPath, join(rootLinkPackage.packageDirectory, 'alias.json'));
  await assert.rejects(openKnowledgePackage(rootLinkPackage.manifestPath),
    /Package root entry alias\.json must not be a symbolic link/u);

  const symlinkPackage = await buildTestPackage(directory, { kbId: 'symlink-test' });
  const shardPath = join(symlinkPackage.packageDirectory, 'segments', 'provenance.json');
  const externalPath = join(directory, 'outside-segment.json');
  await rename(shardPath, externalPath);
  await symlink(externalPath, shardPath);
  await assert.rejects(openKnowledgePackage(symlinkPackage.manifestPath), /must not be a symbolic link/u);
});

test('registration verifies shard bytes, record schemas, namespaces, and reconciled counts sequentially', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-audit-'));
  const checksumCase = await buildTestPackage(directory, { kbId: 'checksum-test' });
  const checksumShard = join(checksumCase.packageDirectory, 'segments', 'provenance.json');
  const checksumBytes = await readFile(checksumShard, 'utf8');
  await writeFile(checksumShard, checksumBytes.replace('test fixture', 'test fixturf'), 'utf8');
  await assert.rejects(
    new KnowledgeCatalog(join(directory, 'checksum-catalog.json')).register(checksumCase.manifestPath),
    /Checksum mismatch/u,
  );

  const schemaCase = await buildTestPackage(directory, { kbId: 'schema-test' });
  const schemaShard = join(schemaCase.packageDirectory, 'segments', 'provenance.json');
  const records = JSON.parse(await readFile(schemaShard, 'utf8'));
  records[0].schemaVersion = '2';
  const invalidBytes = `${JSON.stringify(records)}\n`;
  await writeFile(schemaShard, invalidBytes, 'utf8');
  const shardDirectoryPath = join(schemaCase.packageDirectory, 'shards.json');
  const shards = JSON.parse(await readFile(shardDirectoryPath, 'utf8'));
  shards[0].compressedBytes = Buffer.byteLength(invalidBytes);
  shards[0].checksum = `sha256:${digest(invalidBytes)}`;
  await writeFile(shardDirectoryPath, `${JSON.stringify(shards)}\n`, 'utf8');
  await assert.rejects(
    new KnowledgeCatalog(join(directory, 'schema-catalog.json')).register(schemaCase.manifestPath),
    /unsupported schemaVersion 2/u,
  );

  const countCase = await buildTestPackage(directory, { kbId: 'count-test' });
  const countManifest = JSON.parse(await readFile(countCase.manifestPath, 'utf8'));
  countManifest.counts.provenance = 2;
  await writeFile(countCase.manifestPath, `${JSON.stringify(countManifest)}\n`, 'utf8');
  await assert.rejects(openKnowledgePackage(countCase.manifestPath), /counts total 2 does not match/u);

  const boundedCase = await buildTestPackage(directory, { kbId: 'bounded-test' });
  const boundedCatalog = new KnowledgeCatalog(join(directory, 'bounded-catalog.json'), {
    validationLimits: { maximumShardBytes: 32 },
  });
  await assert.rejects(boundedCatalog.register(boundedCase.manifestPath), /32-byte validation limit/u);
});

test('registration audits the complete canonical reference graph across shards under a global bound', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-references-'));
  const base = await buildTestPackage(directory, {
    kbId: 'reference-graph', records: referenceGraphRecords(),
  });
  const valid = await validateKnowledgePackage(base.manifestPath);
  assert.equal(valid.referenceAudit.status, 'complete');
  assert.equal(valid.referenceAudit.declaredIdentifiers, 13);
  assert.equal(valid.referenceAudit.resolvedReferences, valid.referenceAudit.uniqueRequiredReferences);
  assert.equal(valid.referenceAudit.retainedEntries,
    valid.referenceAudit.declaredIdentifiers + valid.referenceAudit.uniqueRequiredReferences);

  const missingCases = [
    {
      name: 'provenance', shardKind: 'assertion',
      mutate: ([record]) => { record.provenanceRefs = ['prov:reference-graph:missing']; },
      error: /references missing provenance prov:reference-graph:missing/u,
    },
    {
      name: 'term', shardKind: 'lexeme',
      mutate: ([record]) => { record.denotes = 'term:reference-graph:missing'; },
      error: /references missing denoted term term:reference-graph:missing/u,
    },
    {
      name: 'predicate', shardKind: 'rule',
      mutate: ([record]) => { record.when[0].predicate = 'term:reference-graph:missing-predicate'; },
      error: /references missing rule predicate term term:reference-graph:missing-predicate/u,
    },
    {
      name: 'context', shardKind: 'event',
      mutate: ([record]) => { record.contextRef = 'context:reference-graph:missing'; },
      error: /references missing context context:reference-graph:missing/u,
    },
    {
      name: 'event', shardKind: 'roleEdge',
      mutate: ([record]) => { record.eventRef = 'event:reference-graph:missing'; },
      error: /references missing event event:reference-graph:missing/u,
    },
    {
      name: 'retraction-target', shardKind: 'retraction',
      mutate: ([record]) => { record.targetRecord = 'fact:reference-graph:missing'; },
      error: /references missing retraction target fact:reference-graph:missing/u,
    },
  ];
  for (const referenceCase of missingCases) {
    const packageDirectory = join(directory, `missing-${referenceCase.name}`);
    await cp(base.packageDirectory, packageDirectory, { recursive: true });
    await rewriteShard(packageDirectory, referenceCase.shardKind, referenceCase.mutate);
    await assert.rejects(validateKnowledgePackage(join(packageDirectory, 'manifest.json')), referenceCase.error);
  }

  await assert.rejects(validateKnowledgePackage(base.manifestPath, {
    limits: { maximumRetainedReferenceEntries: 10 },
  }), /reference audit exceeds the 10-entry global validation limit/u);
  await assert.rejects(validateKnowledgePackage(base.manifestPath, {
    limits: { maximumRetainedReferenceUtf8Bytes: 100 },
  }), /reference audit exceeds the 100-byte global validation limit/u);
});

test('package records obey iterative UTF-8 and structural validation budgets before semantic validation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-structure-'));
  const multibyte = await buildTestPackage(directory, { kbId: 'multibyte-structure' });
  await rewriteShard(multibyte.packageDirectory, 'provenance', ([record]) => {
    record.untrustedPayload = '🧪'.repeat(100);
  });
  await assert.rejects(validateKnowledgePackage(multibyte.manifestPath, {
    limits: { maximumRecordUtf8StringBytes: 300 },
  }), /UTF-8 string bytes exceeds the 300 per-record validation limit/u);

  const deep = await buildTestPackage(directory, { kbId: 'deep-structure' });
  await rewriteShard(deep.packageDirectory, 'provenance', ([record]) => {
    let value = 'leaf';
    for (let depth = 0; depth < 20; depth += 1) value = { next: value };
    record.untrustedPayload = value;
  });
  await assert.rejects(validateKnowledgePackage(deep.manifestPath, {
    limits: { maximumRecordDepth: 8 },
  }), /JSON depth exceeds the 8 per-record validation limit/u);

  const fanout = await buildTestPackage(directory, { kbId: 'fanout-structure' });
  await rewriteShard(fanout.packageDirectory, 'provenance', ([record]) => {
    record.untrustedPayload = Array.from({ length: 12 }, (_, index) => index);
  });
  await assert.rejects(validateKnowledgePackage(fanout.manifestPath, {
    limits: { maximumRecordArrayEntries: 10 },
  }), /JSON array entries exceeds the 10 per-record validation limit/u);
});

test('catalog registration is idempotent only for byte-identical packages and rejects namespace takeover', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-identity-'));
  const catalog = await new KnowledgeCatalog(join(directory, 'catalog.json')).load();
  const original = await buildTestPackage(directory, {
    kbId: 'immutable-test', namespace: 'owned-space', marker: 'first',
  });
  const first = await catalog.register(original.manifestPath);
  const repeated = await catalog.register(original.manifestPath);
  assert.deepEqual(repeated, first);
  assert.equal(catalog.list().length, 1);

  const copiedDirectory = join(directory, 'byte-identical-copy');
  await cp(original.packageDirectory, copiedDirectory, { recursive: true });
  const copied = await catalog.register(join(copiedDirectory, 'manifest.json'));
  assert.equal(copied.manifestPath, first.manifestPath);
  assert.equal(catalog.list().length, 1);

  const replacement = await buildTestPackage(directory, {
    kbId: 'immutable-test', namespace: 'owned-space', marker: 'second',
  });
  await assert.rejects(catalog.register(replacement.manifestPath), /cannot be overwritten/u);

  const namespaceTakeover = await buildTestPackage(directory, {
    kbId: 'other-package', namespace: 'owned-space', marker: 'third',
  });
  await assert.rejects(catalog.register(namespaceTakeover.manifestPath), /already owned/u);
});

test('catalog loading rejects package envelopes changed after registration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-envelope-'));
  const catalogPath = join(directory, 'catalog.json');
  const built = await buildTestPackage(directory, { kbId: 'envelope-test' });
  await new KnowledgeCatalog(catalogPath).register(built.manifestPath);
  const manifest = JSON.parse(await readFile(built.manifestPath, 'utf8'));
  manifest.license = 'Changed license text';
  await writeFile(built.manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
  await assert.rejects(new KnowledgeCatalog(catalogPath).load(), /package envelope changed after registration/u);
});

test('registration resolves safe semantic-version dependencies to exact immutable identities', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eslm-package-dependencies-'));
  const catalogPath = join(directory, 'catalog.json');
  const catalog = await new KnowledgeCatalog(catalogPath).load();
  const dependency = await buildTestPackage(directory, {
    kbId: 'foundation', kbVersion: '1.4.2', marker: 'foundation-source',
  });
  const dependencyEntry = await catalog.register(dependency.manifestPath);
  const consumer = await buildTestPackage(directory, {
    kbId: 'consumer',
    dependencies: [{ kbId: 'foundation', versionRange: '^1.2.0' }],
  });
  const consumerEntry = await catalog.register(consumer.manifestPath);
  assert.deepEqual(consumerEntry.resolvedDependencies, [{
    kbId: 'foundation',
    requestedVersionRange: '^1.2.0',
    kbVersion: '1.4.2',
    namespace: 'foundation',
    packageDigest: dependencyEntry.packageDigest,
    immutableIdentityDigest: dependencyEntry.immutableIdentityDigest,
  }]);
  assert.deepEqual(consumerEntry.registrationReceipt.resolvedDependencies, consumerEntry.resolvedDependencies);
  const reloaded = await new KnowledgeCatalog(catalogPath).load();
  assert.equal(reloaded.list().length, 2);
  await assert.rejects(reloaded.unregister('foundation'), /consumer depends on it/u);

  const incompatible = await buildTestPackage(directory, {
    kbId: 'incompatible-consumer', marker: 'incompatible',
    dependencies: [{ kbId: 'foundation', versionRange: '~2.0.0' }],
  });
  await assert.rejects(catalog.register(incompatible.manifestPath), /does not satisfy/u);
  const missing = await buildTestPackage(directory, {
    kbId: 'missing-consumer', marker: 'missing',
    dependencies: [{ kbId: 'absent-package', versionRange: '1.0.0' }],
  });
  await assert.rejects(catalog.register(missing.manifestPath), /missing dependency absent-package/u);
  const unsafeRange = await buildTestPackage(directory, {
    kbId: 'unsafe-range', marker: 'unsafe',
    dependencies: [{ kbId: 'foundation', versionRange: '*' }],
  });
  await assert.rejects(catalog.register(unsafeRange.manifestPath), /Unsupported dependency version range/u);
});

test('projection derives runtime predicates from canonical keys and scalarizes class concepts', () => {
  const provenanceRefs = ['prov:test:1'];
  const records = [
    { recordType: 'provenance', recordId: 'prov:test:1', kbNamespace: 'test', schemaVersion: '1', sourceId: 'source:test', sourceChecksum: 'sha256:test', transformation: 'fixture', provenanceRefs: [] },
    { recordType: 'term', recordId: 'term:test:astra', kbNamespace: 'test', schemaVersion: '1', termKind: 'entity', canonicalKey: 'test/Astra', provenanceRefs },
    { recordType: 'term', recordId: 'term:test:planet', kbNamespace: 'test', schemaVersion: '1', termKind: 'concept', canonicalKey: 'test/Planet', provenanceRefs },
    { recordType: 'term', recordId: 'term:test:is-a', kbNamespace: 'test', schemaVersion: '1', termKind: 'predicate', canonicalKey: 'test/predicate/is-a', provenanceRefs },
    { recordType: 'lexeme', recordId: 'lex:test:astra', kbNamespace: 'test', schemaVersion: '1', language: 'en', surface: 'Astra', lemma: 'astra', partOfSpeech: 'properNoun', denotes: 'term:test:astra', provenanceRefs },
    {
      recordType: 'assertion', recordId: 'fact:test:astra-planet', kbNamespace: 'test', schemaVersion: '1',
      predicate: 'term:test:is-a', arguments: ['term:test:astra', 'term:test:planet'], polarity: 'positive',
      epistemicStatus: 'asserted', confidence: { value: 0.9, policy: 'fixture' },
      validity: { from: '2025', to: null }, contextRef: 'context:test:fixture', provenanceRefs,
    },
  ];
  const projected = projectCanonicalRecords(records);
  assert.equal(projected.facts[0].predicate, 'is_a');
  assert.equal(projected.facts[0].value, 'planet');
  assert.equal(projected.facts[0].polarity, 'positive');
  assert.equal(projected.facts[0].epistemicStatus, 'asserted');
  assert.deepEqual(projected.facts[0].confidence, { value: 0.9, policy: 'fixture' });
  assert.deepEqual(projected.facts[0].validity, { from: '2025', to: null });
  assert.equal(projected.facts[0].contextRef, 'context:test:fixture');
});

test('projection never promotes qualified assertions into strict runtime facts', () => {
  const base = {
    recordType: 'assertion', recordId: 'fact:test:qualified', kbNamespace: 'test', schemaVersion: '1',
    predicate: 'term:test:can', arguments: ['term:test:narl', 'fly'], polarity: 'positive',
    provenanceRefs: ['prov:test:1'],
  };
  for (const epistemicStatus of ['default', 'likely', 'possible', 'unlikely', 'contradicted', 'unknown']) {
    const model = projectCanonicalRecords([{ ...base, epistemicStatus }]);
    assert.equal(model.facts.length, 0, epistemicStatus);
  }
  assert.equal(projectCanonicalRecords([{ ...base, epistemicStatus: 'asserted' }]).facts.length, 1);
  assert.equal(projectCanonicalRecords([{ ...base, epistemicStatus: 'strict' }]).facts.length, 1);
  assert.equal(projectCanonicalRecords([{ ...base, epistemicStatus: 'asserted', arguments: ['term:test:narl'] }])
    .facts.length, 0);
});

test('projection rejects strict rules whose accepted data shape cannot be executed faithfully', () => {
  const atom = (predicate, polarity = 'positive') => ({
    predicate, arguments: ['?x', 'value'], polarity,
  });
  const base = {
    recordType: 'rule', recordId: 'rule:test:profile', kbNamespace: 'test', schemaVersion: '1',
    semantics: 'strict', when: [atom('term:test:p')], then: [atom('term:test:q')],
    contextRef: 'context:test:fixture', priority: 7, validity: { from: '2025', to: null },
    provenanceRefs: ['prov:test:2', 'prov:test:1'],
  };
  const projected = projectCanonicalRecords([base]).rules[0];
  assert.deepEqual(projected.sources, ['prov:test:1', 'prov:test:2']);
  assert.equal(projected.source, 'prov:test:1');
  assert.equal(projected.contextRef, 'context:test:fixture');
  assert.equal(projected.priority, 7);
  assert.deepEqual(projected.validity, { from: '2025', to: null });
  assert.throws(() => projectCanonicalRecords([{ ...base, when: [atom('term:test:p', 'negative')] }]),
    /positive binary single-head/u);
  assert.throws(() => projectCanonicalRecords([{ ...base, then: [atom('term:test:q'), atom('term:test:r')] }]),
    /positive binary single-head/u);
  assert.throws(() => projectCanonicalRecords([{ ...base, unless: [atom('term:test:r')] }]),
    /positive binary single-head/u);
});
