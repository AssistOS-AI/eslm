import { randomUUID } from 'node:crypto';
import { access, mkdir, open, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import {
  DEFAULT_PACKAGE_VALIDATION_LIMITS,
  openKnowledgePackage,
  packageIdentityFromEnvelope,
  validateKnowledgePackage,
} from './package.mjs';
import { parseStableSemver, satisfiesVersionRange } from './semver.mjs';

const CATALOG_FORMAT = 'eslm-kb-catalog-v1';
const RECEIPT_FORMAT = 'eslm-kb-registration-receipt-v1';
const CATALOG_MAXIMUM_BYTES = 16 * 1024 * 1024;
const CATALOG_MAXIMUM_PACKAGES = 10_000;
const CATALOG_KEYS = new Set(['format', 'packages']);
const ENTRY_KEYS = new Set([
  'kbId', 'kbVersion', 'manifestPath', 'namespace', 'languages', 'domains', 'capabilities', 'trustLevel',
  'packageDigest', 'immutableIdentityDigest', 'resolvedDependencies', 'registrationReceipt',
]);
const RESOLUTION_KEYS = new Set([
  'kbId', 'requestedVersionRange', 'kbVersion', 'namespace', 'packageDigest', 'immutableIdentityDigest',
]);
const RECEIPT_KEYS = new Set([
  'format', 'kbId', 'kbVersion', 'namespace', 'manifestDigest', 'shardDirectoryDigest', 'packageDigest',
  'immutableIdentityDigest', 'canonicalSource', 'compiler', 'resolvedDependencies', 'validation',
]);
const VALIDATION_KEYS = new Set([
  'recordsValidated', 'shardsValidated', 'sourceBytes', 'workBounds', 'retainedValidationIndex',
  'referenceAudit', 'recordStructureAudit',
]);
const REFERENCE_AUDIT_KEYS = new Set([
  'status', 'declaredIdentifiers', 'uniqueRequiredReferences', 'resolvedReferences', 'retainedEntries',
  'maximumRetainedEntries', 'retainedUtf8Bytes', 'maximumRetainedUtf8Bytes',
]);
const RECORD_STRUCTURE_AUDIT_KEYS = new Set([
  'status', 'recordsAudited', 'maximumObservedNodes', 'maximumObservedArrayEntries',
  'maximumObservedObjectKeys', 'maximumObservedUtf8StringBytes', 'maximumObservedDepth',
]);
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAllowedKeys(value, allowed, label) {
  requireValue(isObject(value), `${label} must be an object.`);
  for (const key of Object.keys(value)) requireValue(allowed.has(key), `${label} contains unsupported field ${key}.`);
}

function assertDigest(value, label) {
  requireValue(typeof value === 'string' && SHA256_PATTERN.test(value), `${label} must be a sha256 digest.`);
}

function assertString(value, label, maximumLength = 4096) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= maximumLength
    && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be a bounded plain string.`);
}

function assertStringArray(value, label) {
  requireValue(Array.isArray(value) && value.length <= 128, `${label} must be a bounded array.`);
  const unique = new Set();
  for (const [index, item] of value.entries()) {
    assertString(item, `${label}[${index}]`, 256);
    requireValue(!unique.has(item), `${label} contains duplicate ${item}.`);
    unique.add(item);
  }
}

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function validateResolution(resolution, label) {
  assertAllowedKeys(resolution, RESOLUTION_KEYS, label);
  for (const field of ['kbId', 'namespace']) {
    requireValue(typeof resolution[field] === 'string'
      && IDENTIFIER_PATTERN.test(resolution[field]), `${label}.${field} is invalid.`);
  }
  parseStableSemver(resolution.kbVersion, `${label}.kbVersion`);
  assertString(resolution.requestedVersionRange, `${label}.requestedVersionRange`, 128);
  assertDigest(resolution.packageDigest, `${label}.packageDigest`);
  assertDigest(resolution.immutableIdentityDigest, `${label}.immutableIdentityDigest`);
}

function validateResolutionList(resolutions, label) {
  requireValue(Array.isArray(resolutions) && resolutions.length <= 256, `${label} must be a bounded array.`);
  const ids = new Set();
  for (const [index, resolution] of resolutions.entries()) {
    validateResolution(resolution, `${label}[${index}]`);
    requireValue(!ids.has(resolution.kbId), `${label} contains duplicate dependency ${resolution.kbId}.`);
    ids.add(resolution.kbId);
  }
}

function validateRegistrationReceipt(receipt, entry, label) {
  assertAllowedKeys(receipt, RECEIPT_KEYS, label);
  requireValue(receipt.format === RECEIPT_FORMAT, `${label} has unsupported format.`);
  for (const field of ['kbId', 'kbVersion', 'namespace', 'packageDigest', 'immutableIdentityDigest']) {
    requireValue(receipt[field] === entry[field], `${label}.${field} disagrees with the catalog entry.`);
  }
  assertDigest(receipt.manifestDigest, `${label}.manifestDigest`);
  assertDigest(receipt.shardDirectoryDigest, `${label}.shardDirectoryDigest`);
  assertAllowedKeys(receipt.canonicalSource, new Set(['checksum', 'recordCount']), `${label}.canonicalSource`);
  assertDigest(receipt.canonicalSource.checksum, `${label}.canonicalSource.checksum`);
  requireValue(Number.isSafeInteger(receipt.canonicalSource.recordCount)
    && receipt.canonicalSource.recordCount >= 0, `${label}.canonicalSource.recordCount is invalid.`);
  assertAllowedKeys(receipt.compiler, new Set(['version', 'configurationDigest']), `${label}.compiler`);
  assertString(receipt.compiler.version, `${label}.compiler.version`, 128);
  assertDigest(receipt.compiler.configurationDigest, `${label}.compiler.configurationDigest`);
  validateResolutionList(receipt.resolvedDependencies, `${label}.resolvedDependencies`);
  requireValue(JSON.stringify(receipt.resolvedDependencies) === JSON.stringify(entry.resolvedDependencies),
    `${label}.resolvedDependencies disagrees with the catalog entry.`);
  assertAllowedKeys(receipt.validation, VALIDATION_KEYS, `${label}.validation`);
  for (const field of ['recordsValidated', 'shardsValidated', 'sourceBytes']) {
    requireValue(Number.isSafeInteger(receipt.validation[field]) && receipt.validation[field] >= 0,
      `${label}.validation.${field} is invalid.`);
  }
  requireValue(receipt.validation.retainedValidationIndex
    === 'record-identities-and-unique-cross-record-references',
    `${label}.validation.retainedValidationIndex is invalid.`);
  assertAllowedKeys(receipt.validation.workBounds,
    new Set(Object.keys(DEFAULT_PACKAGE_VALIDATION_LIMITS)), `${label}.validation.workBounds`);
  for (const [name, value] of Object.entries(receipt.validation.workBounds)) {
    requireValue(Number.isSafeInteger(value) && value > 0, `${label}.validation.workBounds.${name} is invalid.`);
  }
  for (const name of Object.keys(DEFAULT_PACKAGE_VALIDATION_LIMITS)) {
    requireValue(receipt.validation.workBounds[name] !== undefined,
      `${label}.validation.workBounds requires ${name}.`);
  }
  requireValue(receipt.validation.recordsValidated === receipt.canonicalSource.recordCount,
    `${label}.validation.recordsValidated disagrees with canonicalSource.recordCount.`);
  requireValue(receipt.validation.shardsValidated > 0 && receipt.validation.sourceBytes > 0,
    `${label}.validation must describe a non-empty validated package.`);
  const referenceAudit = receipt.validation.referenceAudit;
  assertAllowedKeys(referenceAudit, REFERENCE_AUDIT_KEYS, `${label}.validation.referenceAudit`);
  requireValue(referenceAudit.status === 'complete',
    `${label}.validation.referenceAudit must be complete.`);
  for (const field of [
    'declaredIdentifiers', 'uniqueRequiredReferences', 'resolvedReferences', 'retainedEntries',
    'maximumRetainedEntries', 'retainedUtf8Bytes', 'maximumRetainedUtf8Bytes',
  ]) {
    requireValue(Number.isSafeInteger(referenceAudit[field]) && referenceAudit[field] >= 0,
      `${label}.validation.referenceAudit.${field} is invalid.`);
  }
  requireValue(referenceAudit.declaredIdentifiers === receipt.validation.recordsValidated
    && referenceAudit.resolvedReferences === referenceAudit.uniqueRequiredReferences
    && referenceAudit.retainedEntries
      === referenceAudit.declaredIdentifiers + referenceAudit.uniqueRequiredReferences
    && referenceAudit.maximumRetainedEntries
      === receipt.validation.workBounds.maximumRetainedReferenceEntries
    && referenceAudit.maximumRetainedUtf8Bytes
      === receipt.validation.workBounds.maximumRetainedReferenceUtf8Bytes
    && referenceAudit.retainedEntries <= referenceAudit.maximumRetainedEntries
    && referenceAudit.retainedUtf8Bytes <= referenceAudit.maximumRetainedUtf8Bytes,
  `${label}.validation.referenceAudit accounting does not reconcile.`);

  const structureAudit = receipt.validation.recordStructureAudit;
  assertAllowedKeys(structureAudit, RECORD_STRUCTURE_AUDIT_KEYS,
    `${label}.validation.recordStructureAudit`);
  requireValue(structureAudit.status === 'complete'
    && structureAudit.recordsAudited === receipt.validation.recordsValidated,
  `${label}.validation.recordStructureAudit is incomplete.`);
  const observedToLimit = {
    maximumObservedNodes: 'maximumRecordNodes',
    maximumObservedArrayEntries: 'maximumRecordArrayEntries',
    maximumObservedObjectKeys: 'maximumRecordObjectKeys',
    maximumObservedUtf8StringBytes: 'maximumRecordUtf8StringBytes',
    maximumObservedDepth: 'maximumRecordDepth',
  };
  for (const [field, limitName] of Object.entries(observedToLimit)) {
    requireValue(Number.isSafeInteger(structureAudit[field]) && structureAudit[field] >= 0
      && structureAudit[field] <= receipt.validation.workBounds[limitName],
    `${label}.validation.recordStructureAudit.${field} is invalid.`);
  }
}

function validateCatalogEntry(entry, index) {
  const label = `Catalog package ${index}`;
  assertAllowedKeys(entry, ENTRY_KEYS, label);
  for (const field of ['kbId', 'namespace']) {
    requireValue(typeof entry[field] === 'string'
      && IDENTIFIER_PATTERN.test(entry[field]), `${label}.${field} is invalid.`);
  }
  parseStableSemver(entry.kbVersion, `${label}.kbVersion`);
  assertString(entry.manifestPath, `${label}.manifestPath`);
  assertStringArray(entry.languages, `${label}.languages`);
  assertStringArray(entry.domains, `${label}.domains`);
  assertStringArray(entry.capabilities, `${label}.capabilities`);
  assertString(entry.trustLevel, `${label}.trustLevel`, 128);
  assertDigest(entry.packageDigest, `${label}.packageDigest`);
  assertDigest(entry.immutableIdentityDigest, `${label}.immutableIdentityDigest`);
  validateResolutionList(entry.resolvedDependencies, `${label}.resolvedDependencies`);
  validateRegistrationReceipt(entry.registrationReceipt, entry, `${label}.registrationReceipt`);
  return deepFreeze(entry);
}

function validateCatalog(value, path) {
  assertAllowedKeys(value, CATALOG_KEYS, `${path} catalog`);
  requireValue(value.format === CATALOG_FORMAT && Array.isArray(value.packages),
    `${path} is not an ${CATALOG_FORMAT} catalog.`);
  requireValue(value.packages.length <= CATALOG_MAXIMUM_PACKAGES,
    `${path} exceeds the ${CATALOG_MAXIMUM_PACKAGES}-package catalog limit.`);
  const entries = new Map();
  const namespaces = new Set();
  for (const [index, rawEntry] of value.packages.entries()) {
    const entry = validateCatalogEntry(rawEntry, index);
    requireValue(!entries.has(entry.kbId), `${path} contains duplicate kbId ${entry.kbId}.`);
    requireValue(!namespaces.has(entry.namespace), `${path} contains duplicate namespace ${entry.namespace}.`);
    entries.set(entry.kbId, entry);
    namespaces.add(entry.namespace);
  }
  for (const entry of entries.values()) {
    for (const dependency of entry.resolvedDependencies) {
      const target = entries.get(dependency.kbId);
      requireValue(target, `${path} entry ${entry.kbId} resolves missing dependency ${dependency.kbId}.`);
      for (const field of ['kbVersion', 'namespace', 'packageDigest', 'immutableIdentityDigest']) {
        requireValue(dependency[field] === target[field],
          `${path} entry ${entry.kbId} has stale dependency resolution ${dependency.kbId}.${field}.`);
      }
      requireValue(satisfiesVersionRange(target.kbVersion, dependency.requestedVersionRange),
        `${path} entry ${entry.kbId} has unsatisfied dependency resolution ${dependency.kbId}.`);
    }
  }
  return entries;
}

function registrationEntry(packageHandle, validation, manifestPath, catalogPath, resolvedDependencies) {
  const { manifest } = packageHandle;
  const compilerConfigurationDigest = manifest.compiler.configurationDigest ?? manifest.compiler.configurationHash;
  const receipt = {
    format: RECEIPT_FORMAT,
    kbId: manifest.kbId,
    kbVersion: manifest.kbVersion,
    namespace: manifest.namespace,
    manifestDigest: packageHandle.manifestDigest,
    shardDirectoryDigest: packageHandle.shardDirectoryDigest,
    packageDigest: validation.packageDigest,
    immutableIdentityDigest: validation.immutableIdentityDigest,
    canonicalSource: {
      checksum: manifest.canonicalSource.checksum,
      recordCount: manifest.canonicalSource.recordCount,
    },
    compiler: {
      version: manifest.compiler.version,
      configurationDigest: compilerConfigurationDigest,
    },
    resolvedDependencies,
    validation: {
      recordsValidated: validation.recordsValidated,
      shardsValidated: validation.shardsValidated,
      sourceBytes: validation.sourceBytes,
      workBounds: validation.workBounds,
      retainedValidationIndex: validation.retainedValidationIndex,
      referenceAudit: validation.referenceAudit,
      recordStructureAudit: validation.recordStructureAudit,
    },
  };
  return deepFreeze({
    kbId: manifest.kbId,
    kbVersion: manifest.kbVersion,
    manifestPath: relative(dirname(catalogPath), resolve(manifestPath)),
    namespace: manifest.namespace,
    languages: manifest.languages,
    domains: manifest.domains,
    capabilities: manifest.capabilities,
    trustLevel: manifest.trustLevel,
    packageDigest: validation.packageDigest,
    immutableIdentityDigest: validation.immutableIdentityDigest,
    resolvedDependencies,
    registrationReceipt: receipt,
  });
}

export class KnowledgeCatalog {
  constructor(path, options = {}) {
    this.path = resolve(path);
    this.entries = new Map();
    this.validationLimits = options.validationLimits;
    this.loaded = false;
  }

  async load() {
    if (!await exists(this.path)) {
      this.loaded = true;
      return this;
    }
    const handle = await open(this.path, 'r');
    let bytes;
    try {
      const metadata = await handle.stat();
      requireValue(metadata.isFile(), `${this.path} must be a regular catalog file.`);
      requireValue(metadata.size <= CATALOG_MAXIMUM_BYTES,
        `${this.path} exceeds the ${CATALOG_MAXIMUM_BYTES}-byte catalog limit.`);
      bytes = await handle.readFile();
      requireValue(bytes.length === metadata.size, `${this.path} changed while it was being read.`);
    } finally {
      await handle.close();
    }
    let value;
    try { value = JSON.parse(bytes.toString('utf8')); }
    catch (error) { throw new Error(`${this.path}: ${error.message}`); }
    const entries = validateCatalog(value, this.path);
    for (const entry of entries.values()) await this.validateEntryEnvelope(entry);
    this.entries = entries;
    this.loaded = true;
    return this;
  }

  list() {
    return [...this.entries.values()].sort((left, right) => left.kbId.localeCompare(right.kbId));
  }

  async validateEntryEnvelope(entry) {
    const manifestPath = resolve(dirname(this.path), entry.manifestPath);
    const packageHandle = await openKnowledgePackage(manifestPath, { limits: this.validationLimits });
    requireValue(packageHandle.manifest.kbId === entry.kbId
      && packageHandle.manifest.kbVersion === entry.kbVersion
      && packageHandle.manifest.namespace === entry.namespace,
    `Catalog entry ${entry.kbId} disagrees with its package manifest.`);
    requireValue(packageHandle.manifestDigest === entry.registrationReceipt.manifestDigest
      && packageHandle.shardDirectoryDigest === entry.registrationReceipt.shardDirectoryDigest,
    `Catalog entry ${entry.kbId} package envelope changed after registration.`);
    const envelopeIdentity = packageIdentityFromEnvelope(packageHandle);
    requireValue(envelopeIdentity.packageDigest === entry.packageDigest
      && envelopeIdentity.immutableIdentityDigest === entry.immutableIdentityDigest,
    `Catalog entry ${entry.kbId} immutable identity changed after registration.`);
    const compilerConfigurationDigest = packageHandle.manifest.compiler.configurationDigest
      ?? packageHandle.manifest.compiler.configurationHash;
    requireValue(entry.registrationReceipt.canonicalSource.checksum
      === packageHandle.manifest.canonicalSource.checksum
      && entry.registrationReceipt.canonicalSource.recordCount
      === packageHandle.manifest.canonicalSource.recordCount
      && entry.registrationReceipt.compiler.version === packageHandle.manifest.compiler.version
      && entry.registrationReceipt.compiler.configurationDigest === compilerConfigurationDigest,
    `Catalog entry ${entry.kbId} registration receipt disagrees with its package manifest.`);
    const declaredShardBytes = packageHandle.shards
      .reduce((total, shard) => total + shard.compressedBytes, 0);
    requireValue(entry.registrationReceipt.validation.shardsValidated === packageHandle.shards.length
      && entry.registrationReceipt.validation.sourceBytes === declaredShardBytes,
    `Catalog entry ${entry.kbId} validation receipt disagrees with its shard inventory.`);
    return packageHandle;
  }

  async validateEntry(entry) {
    const manifestPath = resolve(dirname(this.path), entry.manifestPath);
    const packageHandle = await this.validateEntryEnvelope(entry);
    const validation = await validateKnowledgePackage(packageHandle);
    requireValue(validation.packageDigest === entry.packageDigest
      && validation.immutableIdentityDigest === entry.immutableIdentityDigest,
    `Catalog entry ${entry.kbId} no longer matches its registered immutable package identity.`);
    const declaredDependencies = packageHandle.manifest.dependencies ?? [];
    requireValue(declaredDependencies.length === entry.resolvedDependencies.length,
      `Catalog entry ${entry.kbId} has stale dependency resolution count.`);
    for (const dependency of declaredDependencies) {
      const resolved = entry.resolvedDependencies.find((item) => item.kbId === dependency.kbId);
      requireValue(resolved?.requestedVersionRange === dependency.versionRange,
        `Catalog entry ${entry.kbId} has stale dependency resolution for ${dependency.kbId}.`);
    }
    const resolvedDependencies = entry.resolvedDependencies;
    return registrationEntry(packageHandle, validation, manifestPath, this.path, resolvedDependencies);
  }

  async register(manifestPath) {
    if (!this.loaded) await this.load();
    const packageHandle = await openKnowledgePackage(manifestPath, { limits: this.validationLimits });
    parseStableSemver(packageHandle.manifest.kbVersion, 'Package kbVersion');
    const validation = await validateKnowledgePackage(packageHandle);
    const existing = this.entries.get(packageHandle.manifest.kbId);
    if (existing) {
      const validatedExisting = await this.validateEntry(existing);
      requireValue(validatedExisting.packageDigest === validation.packageDigest, `Knowledge base ${existing.kbId} `
        + 'is already registered with different package bytes; immutable versions cannot be overwritten.');
      return validatedExisting;
    }

    for (const entry of this.entries.values()) {
      requireValue(entry.namespace !== packageHandle.manifest.namespace,
        `Namespace ${packageHandle.manifest.namespace} is already owned by knowledge base ${entry.kbId}.`);
    }

    const nextEntries = new Map(this.entries);
    const resolvedDependencies = [];
    for (const dependency of packageHandle.manifest.dependencies ?? []) {
      let dependencyEntry = nextEntries.get(dependency.kbId);
      requireValue(dependencyEntry, `Knowledge base ${packageHandle.manifest.kbId} `
        + `has missing dependency ${dependency.kbId}.`);
      dependencyEntry = await this.validateEntry(dependencyEntry);
      nextEntries.set(dependencyEntry.kbId, dependencyEntry);
      requireValue(satisfiesVersionRange(dependencyEntry.kbVersion, dependency.versionRange),
        `Dependency ${dependency.kbId}@${dependencyEntry.kbVersion} does not satisfy ${dependency.versionRange}.`);
      resolvedDependencies.push(deepFreeze({
        kbId: dependencyEntry.kbId,
        requestedVersionRange: dependency.versionRange,
        kbVersion: dependencyEntry.kbVersion,
        namespace: dependencyEntry.namespace,
        packageDigest: dependencyEntry.packageDigest,
        immutableIdentityDigest: dependencyEntry.immutableIdentityDigest,
      }));
    }
    resolvedDependencies.sort((left, right) => left.kbId.localeCompare(right.kbId));
    deepFreeze(resolvedDependencies);
    const entry = registrationEntry(
      packageHandle, validation, manifestPath, this.path, resolvedDependencies,
    );
    nextEntries.set(entry.kbId, entry);
    await this.save(nextEntries);
    this.entries = nextEntries;
    return entry;
  }

  async unregister(kbId) {
    if (!this.loaded) await this.load();
    if (!this.entries.has(kbId)) return false;
    for (const entry of this.entries.values()) {
      if (entry.kbId === kbId) continue;
      requireValue(!(entry.resolvedDependencies ?? []).some((dependency) => dependency.kbId === kbId),
        `Knowledge base ${kbId} cannot be unregistered while ${entry.kbId} depends on it.`);
    }
    const nextEntries = new Map(this.entries);
    nextEntries.delete(kbId);
    await this.save(nextEntries);
    this.entries = nextEntries;
    return true;
  }

  async save(entries = this.entries) {
    const value = { format: CATALOG_FORMAT, packages: [...entries.values()].sort((left, right) =>
      left.kbId.localeCompare(right.kbId)) };
    const output = `${JSON.stringify(value, null, 2)}\n`;
    requireValue(Buffer.byteLength(output) <= CATALOG_MAXIMUM_BYTES,
      `Catalog output exceeds the ${CATALOG_MAXIMUM_BYTES}-byte limit.`);
    await mkdir(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, output, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporaryPath, this.path);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  resolve(kbId) {
    const entry = this.entries.get(kbId);
    if (!entry) throw new Error(`Knowledge base is not registered: ${kbId}.`);
    return resolve(dirname(this.path), entry.manifestPath);
  }
}
