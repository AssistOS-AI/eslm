import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const DEFAULT_MAXIMUM_BYTES = 64 * 1024 * 1024;
const ABSOLUTE_MAXIMUM_BYTES = 512 * 1024 * 1024;
const DEFAULT_LIMIT = 25;
const MAXIMUM_LIMIT = 500;
const MAXIMUM_PREVIEW_BYTES = 4096;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function confined(root, target, label) {
  const rel = relative(root, target);
  requireValue(rel !== '' && !rel.startsWith('..') && !rel.includes(`..${process.platform === 'win32' ? '\\' : '/'}`),
    `${label} escapes the package root.`);
  return target;
}

function wildcardExpression(pattern) {
  const surface = String(pattern ?? '*').trim() || '*';
  const wildcard = surface.includes('*') || surface.includes('?') ? surface : `*${surface}*`;
  const escaped = wildcard.replace(/[.+^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('*', '.*').replaceAll('?', '.');
  return new RegExp(`^${escaped}$`, 'isu');
}

function topLevelEntries(value) {
  if (Array.isArray(value)) return value.map((record, index) => [String(index), record]);
  if (value && typeof value === 'object') return Object.entries(value);
  return [['value', value]];
}

function boundedRecord(value) {
  const serialized = JSON.stringify(value);
  return Buffer.byteLength(serialized) <= MAXIMUM_PREVIEW_BYTES
    ? { record: value }
    : { preview: `${serialized.slice(0, MAXIMUM_PREVIEW_BYTES)}…`, truncated: true };
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function numericOption(value, fallback, maximum, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  requireValue(Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum,
    `${label} must be an integer from 1 to ${maximum}.`);
  return parsed;
}

export async function inspectKnowledgePackage({
  kbId,
  manifestPath,
  pattern = '*',
  limit,
  maximumBytes,
}) {
  const boundedLimit = numericOption(limit, DEFAULT_LIMIT, MAXIMUM_LIMIT, 'Inspection limit');
  const byteLimit = numericOption(
    maximumBytes, DEFAULT_MAXIMUM_BYTES, ABSOLUTE_MAXIMUM_BYTES, 'Inspection byte limit',
  );
  const manifestFile = resolve(manifestPath);
  const packageRoot = dirname(manifestFile);
  const manifestBytes = await readFile(manifestFile);
  requireValue(manifestBytes.length <= 4 * 1024 * 1024, 'Knowledge package manifest exceeds 4 MiB.');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  requireValue(manifest.kbId === kbId, `Manifest ${manifestFile} belongs to ${manifest.kbId}, not ${kbId}.`);
  requireValue(typeof manifest.shardDirectoryRef === 'string' && manifest.shardDirectoryRef.length > 0,
    `Knowledge package ${kbId} has no shard directory reference.`);
  const shardDirectoryPath = confined(packageRoot, resolve(packageRoot, manifest.shardDirectoryRef), 'Shard directory');
  const shardDirectoryBytes = await readFile(shardDirectoryPath);
  requireValue(shardDirectoryBytes.length <= 16 * 1024 * 1024, 'Shard directory exceeds 16 MiB.');
  const shards = JSON.parse(shardDirectoryBytes.toString('utf8'));
  requireValue(Array.isArray(shards), `Knowledge package ${kbId} shard directory must be an array.`);

  const matcher = wildcardExpression(pattern);
  const matches = [];
  const stopReasons = [];
  let bytesRead = manifestBytes.length + shardDirectoryBytes.length;
  let shardsRead = 0;
  let entriesInspected = 0;

  shardLoop:
  for (const shard of [...shards].sort((left, right) => String(left.shardId).localeCompare(String(right.shardId)))) {
    requireValue(typeof shard.dataRef === 'string' && shard.dataRef.length > 0,
      `Knowledge package ${kbId} has a shard without dataRef.`);
    const shardPath = confined(packageRoot, resolve(packageRoot, shard.dataRef), `Shard ${shard.shardId}`);
    const metadata = await stat(shardPath);
    requireValue(metadata.isFile() && metadata.size > 0, `Shard ${shard.shardId} is not a non-empty regular file.`);
    if (bytesRead + metadata.size > byteLimit) {
      stopReasons.push('byte-budget');
      break;
    }
    const bytes = await readFile(shardPath);
    if (typeof shard.checksum === 'string') {
      requireValue(sha256(bytes) === shard.checksum, `Shard ${shard.shardId} checksum mismatch.`);
    }
    bytesRead += bytes.length;
    shardsRead += 1;
    const decoded = JSON.parse(bytes.toString('utf8'));
    for (const [entryKey, record] of topLevelEntries(decoded)) {
      entriesInspected += 1;
      const searchable = `${entryKey}\n${JSON.stringify(record)}`;
      if (!matcher.test(searchable)) continue;
      matches.push({
        kbId,
        kbVersion: manifest.kbVersion,
        shardId: shard.shardId,
        shardKind: shard.shardKind,
        entryKey,
        ...boundedRecord(record),
      });
      if (matches.length >= boundedLimit) {
        stopReasons.push('result-limit');
        break shardLoop;
      }
    }
  }

  return Object.freeze({
    format: 'eslm-kb-inspection',
    kbId,
    kbVersion: manifest.kbVersion,
    pattern: String(pattern ?? '*'),
    limit: boundedLimit,
    maximumBytes: byteLimit,
    complete: stopReasons.length === 0,
    stopReasons: Object.freeze([...new Set(stopReasons)]),
    work: Object.freeze({ bytesRead, shardsRead, entriesInspected }),
    matches: Object.freeze(matches),
  });
}
