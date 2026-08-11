import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { validateCanonicalRecords } from './schema.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function parseJsonLines(text, path = 'records.jsonl') {
  const records = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); }
    catch (error) { throw new Error(`${path}:${index + 1}: ${error.message}`); }
  }
  return records;
}

function segmentKey(record) {
  if (record.recordType === 'assertion') {
    return `assertions-${sha256(record.predicate).slice(0, 2)}`;
  }
  if (record.recordType === 'lexeme') return `lexemes-${sha256(record.language).slice(0, 2)}`;
  return record.recordType.replace(/[A-Z]/gu, (value) => `-${value.toLocaleLowerCase('en-US')}`);
}

export async function compileKnowledgeBase({ canonicalPath, outputDirectory, packageMetadata }) {
  const sourcePath = resolve(canonicalPath);
  const output = resolve(outputDirectory);
  const sourceBytes = await readFile(sourcePath);
  const records = parseJsonLines(sourceBytes.toString('utf8'), sourcePath);
  validateCanonicalRecords(records);
  const groups = new Map();
  for (const record of records) groups.set(segmentKey(record), [...(groups.get(segmentKey(record)) ?? []), record]);
  await mkdir(join(output, 'segments'), { recursive: true });
  const segments = [];
  for (const [id, values] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
    values.sort((left, right) => left.recordId.localeCompare(right.recordId));
    const data = `${stableJson(values)}\n`;
    const file = `segments/${id}.json`;
    await writeFile(join(output, file), data, 'utf8');
    segments.push({
      shardId: id,
      shardKind: values[0].recordType,
      accessPath: values[0].recordType === 'assertion' ? 'predicate-arguments' : 'record-id',
      predicates: [...new Set(values.map((record) => record.predicate).filter(Boolean))].sort(),
      dataRef: file,
      recordCount: values.length,
      compressedBytes: Buffer.byteLength(data),
      checksum: `sha256:${sha256(data)}`,
      dependencies: [],
    });
  }
  const counts = Object.fromEntries([...new Set(records.map((record) => record.recordType))]
    .sort().map((type) => [type, records.filter((record) => record.recordType === type).length]));
  const manifest = {
    manifestType: 'knowledgeBasePackage',
    format: 'eslm-kb-package-v1',
    schemaVersion: '1',
    ...packageMetadata,
    canonicalSource: {
      path: relative(output, sourcePath),
      file: basename(sourcePath),
      checksum: `sha256:${sha256(sourceBytes)}`,
      recordCount: records.length,
    },
    compiler: { version: 'eslm-kb-compiler-v1', configurationHash: `sha256:${sha256(stableJson(packageMetadata))}` },
    counts,
    shardDirectoryRef: 'shards.json',
  };
  await writeFile(join(output, 'shards.json'), `${stableJson(segments)}\n`, 'utf8');
  await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    packageDirectory: output,
    manifest,
    segments,
    generatedBytes: (await stat(join(output, 'shards.json'))).size
      + (await stat(join(output, 'manifest.json'))).size
      + segments.reduce((sum, segment) => sum + segment.compressedBytes, 0),
  };
}
