#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalize(value) {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en-US');
}

function bucket(value) {
  return createHash('sha256').update(value).digest('hex')[0];
}

function dataSource(value) {
  return `${JSON.stringify(value)}\n`;
}

async function streamEntry(archive, entry, onLine) {
  const child = spawn('unzip', ['-p', archive, entry], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    lineNumber += 1;
    await onLine(line, lineNumber);
  }
  const exitCode = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('close', accept);
  });
  if (exitCode !== 0) throw new Error(`unzip failed (${exitCode}): ${stderr}`);
  return lineNumber;
}

const archive = resolve(option('--archive', join(root, 'training/.cache/corpora/atomic-2020/atomic2020_data-feb2021.zip')));
const output = resolve(option('--output', join(root, 'training/KBs/atomic-2020/package')));
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const archiveBytes = await readFile(archive);
const shards = Object.fromEntries('0123456789abcdef'.split('').map((key) => [key, Object.create(null)]));
const relationCounts = {};
const relationRetainedCounts = {};
const seen = new Set();
let sourceRows = 0;
let retainedRows = 0;
let noneRows = 0;
let malformedRows = 0;
let repairedRows = 0;
await streamEntry(archive, 'atomic2020_data-feb2021/train.tsv', (line, lineNumber) => {
  sourceRows += 1;
  const fields = line.split('\t');
  if (fields.length < 3) { malformedRows += 1; return; }
  if (fields.length > 3) repairedRows += 1;
  const [head, relation, ...tailFields] = fields;
  const tail = tailFields.join('\t').replace(/^"|"$/gu, '');
  relationCounts[relation] = (relationCounts[relation] ?? 0) + 1;
  if (normalize(tail) === 'none') { noneRows += 1; return; }
  const signature = `${head}\u0000${relation}\u0000${tail}`;
  if (seen.has(signature)) return;
  seen.add(signature);
  const key = normalize(head);
  const target = shards[bucket(key)];
  if (!Object.hasOwn(target, key)) target[key] = { h: head, r: Object.create(null) };
  if (!Object.hasOwn(target[key].r, relation)) target[key].r[relation] = [];
  target[key].r[relation].push([tail, lineNumber]);
  relationRetainedCounts[relation] = (relationRetainedCounts[relation] ?? 0) + 1;
  retainedRows += 1;
});

await mkdir(join(output, 'events'), { recursive: true });
for (const [key, values] of Object.entries(shards)) {
  await writeFile(join(output, 'events', `${key}.json`), dataSource(values), 'utf8');
}
const manifest = {
  manifestType: 'knowledgeBasePackage', format: 'eslm-kb-package-v1', schemaVersion: '1',
  kbId: 'atomic-2020', kbVersion: '2020.2', namespace: 'atomic-2020',
  id: 'atomic-2020', title: 'ATOMIC 2020', version: 'February 2021',
  kind: 'defeasible-event-commonsense', generatedBy: 'coding-agent+deterministic-node-compiler',
  sourceArchive: basename(archive), sourceDigest: digest(archiveBytes), sourceSplit: 'train.tsv',
  license: 'CC BY; retain ATOMIC 2020 paper and dataset attribution', trainOnly: true,
  benchmarkEligible: false,
  counts: {
    sourceTrainRows: sourceRows, retainedUniqueNonNoneTuples: retainedRows,
    ignoredNoneRows: noneRows, repairedRows, malformedRows,
    uniqueEvents: Object.values(shards).reduce((sum, values) => sum + Object.keys(values).length, 0),
  },
  relations: relationRetainedCounts,
  capabilities: ['intent', 'precondition', 'effect', 'reaction', 'desire', 'event-order', 'defeasible-cause'],
  limitations: ['answers are plausible candidates, not certain facts', 'event matching is lexical and bounded', 'dev/test tuples are not compiled'],
  provider: 'atomic-compact-source-v1',
  shardDirectoryRef: 'shards.json',
  canonicalSource: { checksum: `sha256:${digest(archiveBytes)}`, recordCount: retainedRows },
};
const shardDirectory = Object.keys(shards).map((key) => ({
  shardId: `events-${key}`, shardKind: 'sourceEventIndex', accessPath: 'normalized-event-hash',
  dataRef: `events/${key}.json`, recordCount: Object.keys(shards[key]).length,
}));
for (const shard of shardDirectory) {
  const bytes = await readFile(join(output, shard.dataRef));
  shard.compressedBytes = bytes.length;
  shard.checksum = `sha256:${digest(bytes)}`;
  shard.dependencies = [];
}
await writeFile(join(output, 'shards.json'), `${JSON.stringify(shardDirectory, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
const outputFiles = [...Object.keys(shards).map((key) => join(output, 'events', `${key}.json`)), join(output, 'shards.json'), join(output, 'manifest.json')];
let generatedBytes = 0;
for (const file of outputFiles) generatedBytes += (await stat(file)).size;
const report = {
  format: 'eslm-kb-build-report-v2', dataset: 'atomic-2020', status: 'compiled-source-profile', manifest,
  source: { archive: relative(root, archive), bytes: archiveBytes.length, split: 'train.tsv' },
  generated: { directory: relative(root, output), files: outputFiles.length, bytes: generatedBytes },
  profile: {
    elapsedMilliseconds, recordsPerSecond: sourceRows / (elapsedMilliseconds / 1000),
    rssDeltaBytes: process.memoryUsage().rss - startMemory.rss,
    heapUsedDeltaBytes: process.memoryUsage().heapUsed - startMemory.heapUsed,
  },
};
await writeFile(join(dirname(output), 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(dirname(output), 'source-manifest.json'), `${JSON.stringify({
  format: 'eslm-source-manifest-v1', id: 'atomic-2020', officialSource: 'https://github.com/allenai/comet-atomic-2020',
  archive: relative(root, archive), archiveBytes: archiveBytes.length, archiveSha256: digest(archiveBytes),
  release: manifest.version, splitPolicy: { train: 'compiled', dev: 'evaluation-only', test: 'evaluation-only' },
  license: manifest.license,
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
