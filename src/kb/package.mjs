import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { validateCanonicalRecord } from './schema.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertManifest(manifest, path) {
  if (manifest?.format !== 'eslm-kb-package-v1' || manifest.manifestType !== 'knowledgeBasePackage') {
    throw new Error(`${path} is not an eslm-kb-package-v1 manifest.`);
  }
  for (const field of ['kbId', 'kbVersion', 'namespace', 'schemaVersion', 'shardDirectoryRef']) {
    if (typeof manifest[field] !== 'string' || !manifest[field]) throw new Error(`${path} requires ${field}.`);
  }
  if (!/^[a-z0-9-]+\.json$/u.test(manifest.shardDirectoryRef)) {
    throw new Error(`${path} has a non-allowlisted shardDirectoryRef.`);
  }
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`${path}: ${error.message}`); }
}

export async function openKnowledgePackage(manifestPath) {
  const path = resolve(manifestPath);
  const manifest = await readJson(path);
  assertManifest(manifest, path);
  const root = dirname(path);
  const shards = await readJson(join(root, manifest.shardDirectoryRef));
  if (!Array.isArray(shards)) throw new Error(`${manifest.shardDirectoryRef} must contain an array.`);
  const ids = new Set();
  for (const shard of shards) {
    if (ids.has(shard.shardId)) throw new Error(`Duplicate shardId ${shard.shardId}.`);
    ids.add(shard.shardId);
    if (!/^segments\/[a-z0-9-]+\.json$/u.test(shard.dataRef)) {
      throw new Error(`Shard ${shard.shardId} has a non-allowlisted dataRef.`);
    }
  }
  return Object.freeze({ root, manifest: Object.freeze(manifest), shards: Object.freeze(shards) });
}

export async function readPackageShard(packageHandle, shard) {
  if (!packageHandle.shards.includes(shard)) throw new Error(`Shard ${shard?.shardId} is not in the package directory.`);
  const path = join(packageHandle.root, shard.dataRef);
  const bytes = await readFile(path);
  const expected = shard.checksum.replace(/^sha256:/u, '');
  if (sha256(bytes) !== expected) throw new Error(`Checksum mismatch for shard ${shard.shardId}.`);
  const records = JSON.parse(bytes.toString('utf8'));
  if (!Array.isArray(records) || records.length !== shard.recordCount) {
    throw new Error(`Record count mismatch for shard ${shard.shardId}.`);
  }
  for (const record of records) validateCanonicalRecord(record);
  return Object.freeze({ records: Object.freeze(records), sourceBytes: bytes.length });
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
  return Object.freeze({ records: Object.freeze(values), selectedShards: selected.map((shard) => shard.shardId) });
}
