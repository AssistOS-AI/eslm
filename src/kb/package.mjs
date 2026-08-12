import { constants as fsConstants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import {
  auditRecordStructure,
  createCanonicalReferenceAudit,
  createRecordStructureAudit,
} from './package-record-audit.mjs';
import { canonicalJson, deepFreeze, isObject, requireValue, sha256Identity } from './package-values.mjs';
import { KB_RECORD_TYPES, KB_SCHEMA_VERSION, validateCanonicalRecord } from './schema.mjs';
import { assertSupportedVersionRange, parseStableSemver } from './semver.mjs';

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const SHARD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SHARD_REF_PATTERN = /^segments\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u;
const DIRECTORY_REF_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u;
const ACCESS_PATHS = new Set(['predicate-arguments', 'record-id']);
const MANIFEST_KEYS = new Set([
  'manifestType', 'format', 'schemaVersion', 'kbId', 'kbVersion', 'namespace', 'languages', 'domains',
  'dependencies', 'capabilities', 'trustLevel', 'trust', 'benchmarkEligible', 'license', 'canonicalSource',
  'compiler', 'counts', 'shardDirectoryRef',
]);
const CANONICAL_SOURCE_KEYS = new Set(['path', 'file', 'checksum', 'recordCount']);
const COMPILER_KEYS = new Set(['version', 'configurationHash', 'configurationDigest']);
const DEPENDENCY_KEYS = new Set(['kbId', 'versionRange']);
const TRUST_KEYS = new Set(['origin', 'validationLevel', 'signatureStatus', 'intendedUse']);
const SHARD_KEYS = new Set([
  'shardId', 'shardKind', 'accessPath', 'predicates', 'dataRef', 'recordCount', 'compressedBytes',
  'checksum', 'dependencies',
]);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export const DEFAULT_PACKAGE_VALIDATION_LIMITS = Object.freeze({
  maximumManifestBytes: 1024 * 1024,
  maximumShardDirectoryBytes: 16 * 1024 * 1024,
  maximumShards: 16_384,
  maximumShardBytes: 256 * 1024 * 1024,
  maximumTotalShardBytes: 8 * 1024 * 1024 * 1024,
  maximumRecordsPerShard: 1_000_000,
  maximumTotalRecords: 2_000_000,
  maximumRetainedReferenceEntries: 1_000_000,
  maximumRetainedReferenceUtf8Bytes: 64 * 1024 * 1024,
  maximumRecordUtf8StringBytes: 1024 * 1024,
  maximumRecordDepth: 64,
  maximumRecordNodes: 50_000,
  maximumRecordArrayEntries: 25_000,
  maximumRecordObjectKeys: 25_000,
});

function assertAllowedKeys(value, allowed, label) {
  requireValue(isObject(value), `${label} must be an object.`);
  for (const key of Object.keys(value)) {
    requireValue(allowed.has(key), `${label} contains unsupported field ${key}.`);
  }
}

function assertPlainString(value, label, maximumLength = 512) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= maximumLength
    && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be a bounded plain string.`);
}

function assertStringList(value, label, { required = true, maximumItems = 128 } = {}) {
  if (value === undefined && !required) return;
  requireValue(Array.isArray(value) && value.length <= maximumItems, `${label} must be a bounded array.`);
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    assertPlainString(item, `${label}[${index}]`, 256);
    requireValue(!seen.has(item), `${label} contains duplicate value ${item}.`);
    seen.add(item);
  }
}

function assertChecksum(value, label) {
  requireValue(typeof value === 'string' && SHA256_PATTERN.test(value), `${label} must be a sha256 digest.`);
}

function assertNonNegativeInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  requireValue(Number.isSafeInteger(value) && value >= 0 && value <= maximum,
    `${label} must be a bounded non-negative integer.`);
}

function mergeLimits(overrides = {}) {
  assertAllowedKeys(overrides, new Set(Object.keys(DEFAULT_PACKAGE_VALIDATION_LIMITS)), 'package validation limits');
  const limits = { ...DEFAULT_PACKAGE_VALIDATION_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    requireValue(Number.isSafeInteger(value) && value > 0,
      `Package validation limit ${name} must be a positive integer.`);
  }
  return Object.freeze(limits);
}

async function readRegularFile(path, maximumBytes, label) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const metadata = await handle.stat();
    requireValue(metadata.isFile(), `${label} must be a regular file: ${path}.`);
    requireValue(metadata.size <= maximumBytes,
      `${label} exceeds the ${maximumBytes}-byte validation limit: ${path}.`);
    const bytes = await handle.readFile();
    requireValue(bytes.length === metadata.size, `${label} changed while it was being read: ${path}.`);
    return bytes;
  } catch (error) {
    if (error.message?.includes(path)) throw error;
    throw new Error(`${label} cannot be read as a confined regular file ${path}: ${error.message}`);
  } finally {
    await handle?.close();
  }
}

function parseJson(bytes, path) {
  try {
    return JSON.parse(UTF8_DECODER.decode(bytes));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

async function inspectConfinedRegularFile(root, reference, label) {
  const candidate = resolve(root, reference);
  requireValue(candidate.startsWith(`${root}${sep}`), `${label} escapes the package root: ${reference}.`);
  let physicalPath;
  let symbolicMetadata;
  try {
    symbolicMetadata = await lstat(candidate);
    requireValue(!symbolicMetadata.isSymbolicLink(), `${label} must not be a symbolic link: ${reference}.`);
    requireValue(symbolicMetadata.isFile(), `${label} must be a regular file: ${reference}.`);
    physicalPath = await realpath(candidate);
  } catch (error) {
    if (error.message?.startsWith(label)) throw error;
    throw new Error(`${label} is missing or inaccessible: ${reference}: ${error.message}`);
  }
  requireValue(physicalPath.startsWith(`${root}${sep}`), `${label} resolves outside the package root: ${reference}.`);
  return { path: physicalPath, size: symbolicMetadata.size };
}

async function readConfinedRegularFile(root, reference, maximumBytes, label) {
  const inspected = await inspectConfinedRegularFile(root, reference, label);
  requireValue(inspected.size <= maximumBytes,
    `${label} exceeds the ${maximumBytes}-byte validation limit: ${reference}.`);
  const bytes = await readRegularFile(inspected.path, maximumBytes, label);
  requireValue(bytes.length === inspected.size, `${label} changed while it was being inspected: ${reference}.`);
  return { bytes, path: inspected.path };
}

function assertManifest(manifest, path, limits) {
  assertAllowedKeys(manifest, MANIFEST_KEYS, `${path} manifest`);
  requireValue(manifest.format === 'eslm-kb-package-v1'
    && manifest.manifestType === 'knowledgeBasePackage', `${path} is not an eslm-kb-package-v1 manifest.`);
  requireValue(manifest.schemaVersion === KB_SCHEMA_VERSION,
    `${path} has unsupported schemaVersion ${manifest.schemaVersion}.`);
  for (const field of ['kbId', 'namespace']) {
    requireValue(typeof manifest[field] === 'string' && IDENTIFIER_PATTERN.test(manifest[field]),
      `${path} has invalid ${field}.`);
  }
  assertPlainString(manifest.kbVersion, `${path} kbVersion`, 128);
  parseStableSemver(manifest.kbVersion, `${path} kbVersion`);
  assertStringList(manifest.languages, `${path} languages`);
  assertStringList(manifest.domains, `${path} domains`);
  assertStringList(manifest.capabilities, `${path} capabilities`);
  requireValue(typeof manifest.benchmarkEligible === 'boolean', `${path} requires boolean benchmarkEligible.`);
  assertPlainString(manifest.license, `${path} license`, 512);
  assertPlainString(manifest.trustLevel, `${path} trustLevel`, 128);
  requireValue(/^[a-z][a-z0-9-]*$/u.test(manifest.trustLevel), `${path} has invalid trustLevel.`);
  if (manifest.trust !== undefined) {
    assertAllowedKeys(manifest.trust, TRUST_KEYS, `${path} trust`);
    for (const [key, value] of Object.entries(manifest.trust)) assertPlainString(value, `${path} trust.${key}`);
    requireValue(typeof manifest.trust.origin === 'string' && typeof manifest.trust.validationLevel === 'string',
      `${path} trust requires origin and validationLevel.`);
  }

  assertAllowedKeys(manifest.canonicalSource, CANONICAL_SOURCE_KEYS, `${path} canonicalSource`);
  assertChecksum(manifest.canonicalSource.checksum, `${path} canonicalSource.checksum`);
  assertNonNegativeInteger(manifest.canonicalSource.recordCount, `${path} canonicalSource.recordCount`,
    limits.maximumTotalRecords);
  for (const field of ['path', 'file']) {
    if (manifest.canonicalSource[field] !== undefined) {
      assertPlainString(manifest.canonicalSource[field], `${path} canonicalSource.${field}`, 4096);
    }
  }

  assertAllowedKeys(manifest.compiler, COMPILER_KEYS, `${path} compiler`);
  assertPlainString(manifest.compiler.version, `${path} compiler.version`, 128);
  const configurationDigests = ['configurationDigest', 'configurationHash']
    .filter((key) => manifest.compiler[key] !== undefined);
  requireValue(configurationDigests.length === 1,
    `${path} compiler requires exactly one configurationDigest or configurationHash.`);
  assertChecksum(manifest.compiler[configurationDigests[0]], `${path} compiler.${configurationDigests[0]}`);

  const dependencies = manifest.dependencies ?? [];
  requireValue(Array.isArray(dependencies) && dependencies.length <= 256, `${path} dependencies must be bounded.`);
  const dependencyIds = new Set();
  for (const [index, dependency] of dependencies.entries()) {
    assertAllowedKeys(dependency, DEPENDENCY_KEYS, `${path} dependencies[${index}]`);
    requireValue(typeof dependency.kbId === 'string' && IDENTIFIER_PATTERN.test(dependency.kbId),
      `${path} dependencies[${index}] has invalid kbId.`);
    assertPlainString(dependency.versionRange, `${path} dependencies[${index}].versionRange`, 128);
    assertSupportedVersionRange(dependency.versionRange);
    requireValue(dependency.kbId !== manifest.kbId, `${path} cannot depend on itself.`);
    requireValue(!dependencyIds.has(dependency.kbId), `${path} has duplicate dependency ${dependency.kbId}.`);
    dependencyIds.add(dependency.kbId);
  }

  assertAllowedKeys(manifest.counts, KB_RECORD_TYPES, `${path} counts`);
  let declaredRecords = 0;
  for (const [recordType, count] of Object.entries(manifest.counts)) {
    assertNonNegativeInteger(count, `${path} counts.${recordType}`, limits.maximumTotalRecords);
    declaredRecords += count;
  }
  requireValue(declaredRecords === manifest.canonicalSource.recordCount, `${path} counts total ${declaredRecords} `
    + `does not match canonicalSource.recordCount ${manifest.canonicalSource.recordCount}.`);
  requireValue(typeof manifest.shardDirectoryRef === 'string'
    && DIRECTORY_REF_PATTERN.test(manifest.shardDirectoryRef), `${path} has a non-allowlisted shardDirectoryRef.`);
}

function assertShard(shard, index, limits) {
  const label = `Shard descriptor ${index}`;
  assertAllowedKeys(shard, SHARD_KEYS, label);
  requireValue(typeof shard.shardId === 'string' && SHARD_ID_PATTERN.test(shard.shardId),
    `${label} has invalid shardId.`);
  requireValue(KB_RECORD_TYPES.has(shard.shardKind), `${label} has unsupported shardKind ${shard.shardKind}.`);
  requireValue(ACCESS_PATHS.has(shard.accessPath), `${label} has unsupported accessPath ${shard.accessPath}.`);
  requireValue(typeof shard.dataRef === 'string' && SHARD_REF_PATTERN.test(shard.dataRef),
    `${label} has a non-allowlisted dataRef.`);
  requireValue(shard.dataRef === `segments/${shard.shardId}.json`,
    `${label} dataRef must match its immutable shardId.`);
  assertNonNegativeInteger(shard.recordCount, `${label} recordCount`);
  requireValue(shard.recordCount > 0, `${label} must not declare an empty shard.`);
  requireValue(shard.recordCount <= limits.maximumRecordsPerShard,
    `${label} exceeds the ${limits.maximumRecordsPerShard}-record validation limit.`);
  assertNonNegativeInteger(shard.compressedBytes, `${label} compressedBytes`);
  requireValue(shard.compressedBytes <= limits.maximumShardBytes,
    `${label} exceeds the ${limits.maximumShardBytes}-byte validation limit.`);
  assertChecksum(shard.checksum, `${label} checksum`);
  assertStringList(shard.predicates, `${label} predicates`);
  assertStringList(shard.dependencies, `${label} dependencies`, { maximumItems: 256 });
  for (const dependency of shard.dependencies) {
    requireValue(SHARD_ID_PATTERN.test(dependency), `${label} has invalid shard dependency ${dependency}.`);
    requireValue(dependency !== shard.shardId, `${label} cannot depend on itself.`);
  }
}

async function assertExactSegmentInventory(root, shards) {
  const segmentDirectory = join(root, 'segments');
  let directoryMetadata;
  try { directoryMetadata = await lstat(segmentDirectory); }
  catch (error) { throw new Error(`Package segments directory is missing: ${error.message}`); }
  requireValue(directoryMetadata.isDirectory() && !directoryMetadata.isSymbolicLink(),
    'Package segments must be a real directory.');
  const declared = new Set(shards.map((shard) => shard.dataRef.slice('segments/'.length)));
  const entries = await readdir(segmentDirectory, { withFileTypes: true });
  for (const entry of entries) {
    requireValue(entry.isFile() && !entry.isSymbolicLink(),
      `Package segments contains a non-regular entry: segments/${entry.name}.`);
    requireValue(declared.has(entry.name), `Package segments contains undeclared file segments/${entry.name}.`);
  }
  requireValue(entries.length === declared.size, 'Package segment inventory does not match the shard directory.');
}

async function assertExactPackageRootInventory(root, manifestName, shardDirectoryRef) {
  requireValue(DIRECTORY_REF_PATTERN.test(manifestName),
    `Package manifest basename is not allowlisted: ${manifestName}.`);
  requireValue(manifestName !== shardDirectoryRef,
    'Package manifest and shard directory must be distinct files.');
  const expected = new Map([
    [manifestName, 'file'],
    [shardDirectoryRef, 'file'],
    ['segments', 'directory'],
  ]);
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    requireValue(!entry.isSymbolicLink(),
      `Package root entry ${entry.name} must not be a symbolic link.`);
    const expectedKind = expected.get(entry.name);
    requireValue(expectedKind,
      `Package root contains undeclared entry ${entry.name}.`);
    requireValue(expectedKind === 'file' ? entry.isFile() : entry.isDirectory(),
      `Package root entry ${entry.name} must be a regular ${expectedKind}.`);
  }
  requireValue(entries.length === expected.size,
    'Package root inventory must contain only the manifest, shard directory, and segments directory.');
}

export async function openKnowledgePackage(manifestPath, options = {}) {
  const limits = mergeLimits(options.limits);
  const requestedPath = resolve(manifestPath);
  const manifestBytes = await readRegularFile(requestedPath, limits.maximumManifestBytes, 'Package manifest');
  const manifestPhysicalPath = await realpath(requestedPath);
  const root = await realpath(dirname(manifestPhysicalPath));
  const manifest = parseJson(manifestBytes, requestedPath);
  assertManifest(manifest, requestedPath, limits);
  await assertExactPackageRootInventory(root, basename(manifestPhysicalPath), manifest.shardDirectoryRef);
  const directoryFile = await readConfinedRegularFile(
    root, manifest.shardDirectoryRef, limits.maximumShardDirectoryBytes, 'Shard directory',
  );
  const shards = parseJson(directoryFile.bytes, directoryFile.path);
  requireValue(Array.isArray(shards), `${manifest.shardDirectoryRef} must contain an array.`);
  requireValue(shards.length > 0 && shards.length <= limits.maximumShards,
    `${manifest.shardDirectoryRef} must contain 1..${limits.maximumShards} shards.`);
  const ids = new Set();
  const refs = new Set();
  let declaredRecords = 0;
  let declaredBytes = 0;
  for (const [index, shard] of shards.entries()) {
    assertShard(shard, index, limits);
    requireValue(!ids.has(shard.shardId), `Duplicate shardId ${shard.shardId}.`);
    requireValue(!refs.has(shard.dataRef), `Duplicate shard dataRef ${shard.dataRef}.`);
    ids.add(shard.shardId);
    refs.add(shard.dataRef);
    declaredRecords += shard.recordCount;
    declaredBytes += shard.compressedBytes;
    requireValue(declaredRecords <= limits.maximumTotalRecords,
      `Package exceeds the ${limits.maximumTotalRecords}-record validation limit.`);
    requireValue(declaredBytes <= limits.maximumTotalShardBytes,
      `Package exceeds the ${limits.maximumTotalShardBytes}-byte validation limit.`);
  }
  requireValue(declaredRecords === manifest.canonicalSource.recordCount, `Shard record total ${declaredRecords} `
    + `does not match canonicalSource.recordCount ${manifest.canonicalSource.recordCount}.`);
  for (const shard of shards) {
    for (const dependency of shard.dependencies) {
      requireValue(ids.has(dependency), `Shard ${shard.shardId} references missing shard dependency ${dependency}.`);
    }
    const dataFile = await inspectConfinedRegularFile(root, shard.dataRef, `Shard ${shard.shardId}`);
    requireValue(dataFile.size <= limits.maximumShardBytes,
      `Shard ${shard.shardId} exceeds the ${limits.maximumShardBytes}-byte validation limit.`);
    requireValue(dataFile.size === shard.compressedBytes,
      `Byte count mismatch for shard ${shard.shardId}.`);
  }
  await assertExactSegmentInventory(root, shards);
  deepFreeze(manifest);
  deepFreeze(shards);
  return deepFreeze({
    root,
    manifestPath: manifestPhysicalPath,
    manifest,
    shards,
    limits,
    manifestDigest: sha256Identity(manifestBytes),
    shardDirectoryDigest: sha256Identity(directoryFile.bytes),
  });
}

export async function readPackageShard(packageHandle, shard, options = {}) {
  requireValue(packageHandle?.shards?.includes(shard),
    `Shard ${shard?.shardId} is not in the package directory.`);
  const dataFile = await readConfinedRegularFile(packageHandle.root, shard.dataRef,
    packageHandle.limits.maximumShardBytes, `Shard ${shard.shardId}`);
  const bytes = dataFile.bytes;
  requireValue(bytes.length === shard.compressedBytes, `Byte count mismatch for shard ${shard.shardId}.`);
  requireValue(sha256Identity(bytes) === shard.checksum, `Checksum mismatch for shard ${shard.shardId}.`);
  const records = parseJson(bytes, dataFile.path);
  requireValue(Array.isArray(records) && records.length === shard.recordCount,
    `Record count mismatch for shard ${shard.shardId}.`);
  for (const [index, record] of records.entries()) {
    const structure = auditRecordStructure(
      record, packageHandle.limits, `Shard ${shard.shardId} record ${index}`,
    );
    try { validateCanonicalRecord(record); }
    catch (error) { throw new Error(`Shard ${shard.shardId} record ${index}: ${error.message}`); }
    requireValue(record.recordType === shard.shardKind,
      `Shard ${shard.shardId} contains ${record.recordType} record ${record.recordId}; expected ${shard.shardKind}.`);
    requireValue(record.kbNamespace === packageHandle.manifest.namespace, `Shard ${shard.shardId} record `
      + `${record.recordId} belongs to namespace ${record.kbNamespace}, not ${packageHandle.manifest.namespace}.`);
    options.onValidatedRecord?.(record, structure);
  }
  return deepFreeze({ records, sourceBytes: bytes.length, checksum: sha256Identity(bytes) });
}

export function packageIdentityFromEnvelope(handle) {
  requireValue(handle?.manifest && Array.isArray(handle.shards),
    'Package identity requires an opened package handle.');
  const shardIdentities = handle.shards.map((shard) => ({
    shardId: shard.shardId,
    dataRef: shard.dataRef,
    checksum: shard.checksum,
    recordCount: shard.recordCount,
    bytes: shard.compressedBytes,
  }));
  const compilerConfigurationDigest = handle.manifest.compiler.configurationDigest
    ?? handle.manifest.compiler.configurationHash;
  const immutableIdentity = deepFreeze({
    kbId: handle.manifest.kbId,
    kbVersion: handle.manifest.kbVersion,
    schemaVersion: handle.manifest.schemaVersion,
    namespace: handle.manifest.namespace,
    canonicalSource: {
      checksum: handle.manifest.canonicalSource.checksum,
      recordCount: handle.manifest.canonicalSource.recordCount,
    },
    compiler: {
      version: handle.manifest.compiler.version,
      configurationDigest: compilerConfigurationDigest,
    },
    shardDirectoryDigest: handle.shardDirectoryDigest,
    shards: shardIdentities,
  });
  return deepFreeze({
    packageDigest: sha256Identity(canonicalJson({
      manifestDigest: handle.manifestDigest,
      shardDirectoryDigest: handle.shardDirectoryDigest,
      shards: shardIdentities.map(({ dataRef, checksum, bytes }) => ({ dataRef, checksum, bytes })),
    })),
    immutableIdentityDigest: sha256Identity(canonicalJson(immutableIdentity)),
    immutableIdentity,
  });
}

export async function validateKnowledgePackage(packageHandleOrPath, options = {}) {
  const handle = typeof packageHandleOrPath === 'string'
    ? await openKnowledgePackage(packageHandleOrPath, options)
    : packageHandleOrPath;
  requireValue(handle?.manifest && Array.isArray(handle.shards),
    'Package validation requires an opened package handle.');
  const referenceAudit = createCanonicalReferenceAudit({
    maximumRetainedEntries: handle.limits.maximumRetainedReferenceEntries,
    maximumRetainedUtf8Bytes: handle.limits.maximumRetainedReferenceUtf8Bytes,
  });
  const recordStructureAudit = createRecordStructureAudit();
  const actualCounts = Object.fromEntries([...KB_RECORD_TYPES].map((type) => [type, 0]));
  let recordsValidated = 0;
  let sourceBytes = 0;
  for (const shard of handle.shards) {
    const loaded = await readPackageShard(handle, shard, {
      onValidatedRecord(record, structure) {
        referenceAudit.addRecord(record);
        recordStructureAudit.observe(structure);
        actualCounts[record.recordType] += 1;
        recordsValidated += 1;
      },
    });
    sourceBytes += loaded.sourceBytes;
  }
  requireValue(recordsValidated === handle.manifest.canonicalSource.recordCount,
    `Validated record total ${recordsValidated} does not match canonicalSource.recordCount `
    + `${handle.manifest.canonicalSource.recordCount}.`);
  for (const type of KB_RECORD_TYPES) {
    const declared = handle.manifest.counts[type] ?? 0;
    requireValue(actualCounts[type] === declared,
      `Manifest count for ${type} is ${declared}; validated shards contain ${actualCounts[type]}.`);
  }
  const referenceAuditReceipt = referenceAudit.finish();
  const recordStructureAuditReceipt = recordStructureAudit.finish();
  const identity = packageIdentityFromEnvelope(handle);
  return deepFreeze({
    format: 'eslm-kb-package-validation-v1',
    ...identity,
    recordsValidated,
    shardsValidated: handle.shards.length,
    sourceBytes,
    workBounds: handle.limits,
    retainedValidationIndex: 'record-identities-and-unique-cross-record-references',
    referenceAudit: referenceAuditReceipt,
    recordStructureAudit: recordStructureAuditReceipt,
  });
}

export function routePackageShards(packageHandle, signature = {}) {
  const kinds = new Set(signature.recordTypes ?? []);
  if (kinds.size === 0) return [...packageHandle.shards];
  return packageHandle.shards.filter((shard) => kinds.has(shard.shardKind));
}

export async function loadPackageRecords(packageHandle, signature) {
  const selected = routePackageShards(packageHandle, signature);
  const values = [];
  for (const shard of selected) values.push(...(await readPackageShard(packageHandle, shard)).records);
  return deepFreeze({ records: values, selectedShards: selected.map((shard) => shard.shardId) });
}
