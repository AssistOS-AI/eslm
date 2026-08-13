#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const runFile = promisify(execFile);
const root = resolve(import.meta.dirname, '..');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function dataSource(value) {
  return `${JSON.stringify(value)}\n`;
}

function bucketForLemma(lemma) {
  const first = lemma.normalize('NFKD').toLocaleLowerCase('en-US').match(/[a-z]/u)?.[0];
  return first ?? '0';
}

function bucketForSynset(id) {
  return id.match(/^([0-9])/u)?.[1] ?? '0';
}

async function unzipText(archive, name) {
  const result = await runFile('unzip', ['-p', archive, name], { maxBuffer: 16 * 1024 * 1024 });
  return result.stdout;
}

const archive = resolve(option('--archive', join(root, 'training/.cache/corpora/oewn-2025/english-wordnet-2025-json.zip')));
const output = resolve(option('--output', join(root, 'training/KBs/oewn-2025/package')));
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const archiveBytes = await readFile(archive);
const listing = await runFile('unzip', ['-Z1', archive], { maxBuffer: 1024 * 1024 });
const files = listing.stdout.split(/\r?\n/u).filter((name) => name.endsWith('.json'));
const entryFiles = files.filter((name) => name.startsWith('entries-'));
const synsetFiles = files.filter((name) => !name.startsWith('entries-') && name !== 'frames.json');
const synsetsByBucket = Object.fromEntries('0123456789'.split('').map((key) => [key, Object.create(null)]));
const lemmasByBucket = Object.fromEntries(['0', ...'abcdefghijklmnopqrstuvwxyz'].map((key) => [key, Object.create(null)]));
const relationCounts = {};
let definitionCount = 0;
let exampleCount = 0;
let memberOccurrences = 0;
for (const name of synsetFiles) {
  const parsed = JSON.parse(await unzipText(archive, name));
  for (const [id, source] of Object.entries(parsed)) {
    const record = {
      p: source.partOfSpeech,
      m: source.members ?? [],
      d: source.definition ?? [],
      e: source.example ?? [],
      h: [...(source.hypernym ?? []), ...(source.instance_hypernym ?? [])],
      l: name.replace(/\.json$/u, ''),
    };
    synsetsByBucket[bucketForSynset(id)][id] = record;
    definitionCount += record.d.length;
    exampleCount += record.e.length;
    memberOccurrences += record.m.length;
    for (const member of record.m) {
      const normalized = member.normalize('NFKC').toLocaleLowerCase('en-US').replaceAll('_', ' ').trim();
      const bucket = lemmasByBucket[bucketForLemma(normalized)];
      if (!Object.hasOwn(bucket, normalized)) bucket[normalized] = [];
      bucket[normalized].push(id);
    }
    for (const [relation, targets] of Object.entries(source)) {
      if (!Array.isArray(targets) || ['definition', 'example', 'members'].includes(relation)) continue;
      relationCounts[relation] = (relationCounts[relation] ?? 0) + targets.length;
    }
  }
}

function normalizedLexeme(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US').replaceAll('_', ' ').trim();
}

function relationLemma(value) {
  return normalizedLexeme(String(value).split('%')[0]);
}

for (const name of entryFiles) {
  const parsed = JSON.parse(await unzipText(archive, name));
  for (const [lemma, partOfSpeechEntries] of Object.entries(parsed)) {
    const normalized = normalizedLexeme(lemma);
    const byPartOfSpeech = {};
    const antonymsByPartOfSpeech = {};
    const antonymGroupsByPartOfSpeech = {};
    for (const [partOfSpeech, entry] of Object.entries(partOfSpeechEntries)) {
      const senses = entry.sense ?? [];
      byPartOfSpeech[partOfSpeech] = [...new Set(senses.map((sense) => sense.synset).filter(Boolean))];
      const antonyms = [...new Set(senses.flatMap((sense) => sense.antonym ?? [])
        .map(relationLemma).filter(Boolean))];
      if (antonyms.length > 0) antonymsByPartOfSpeech[partOfSpeech] = antonyms;
      const antonymGroups = senses.map((sense) => [...new Set((sense.antonym ?? [])
        .map(relationLemma).filter(Boolean))]).filter((values) => values.length > 0);
      if (antonymGroups.length > 0) antonymGroupsByPartOfSpeech[partOfSpeech] = antonymGroups;
    }
    const orderedSenses = [...new Set(Object.values(byPartOfSpeech).flat())];
    const bucket = lemmasByBucket[bucketForLemma(normalized)];
    bucket[normalized] = {
      s: orderedSenses.length > 0 ? orderedSenses : [...(bucket[normalized] ?? [])],
      p: byPartOfSpeech,
      ...(Object.keys(antonymsByPartOfSpeech).length > 0 ? { a: antonymsByPartOfSpeech } : {}),
      ...(Object.keys(antonymGroupsByPartOfSpeech).length > 0
        ? { g: antonymGroupsByPartOfSpeech } : {}),
    };
  }
}

await mkdir(join(output, 'synsets'), { recursive: true });
await mkdir(join(output, 'lemmas'), { recursive: true });
for (const [bucket, values] of Object.entries(synsetsByBucket)) {
  await writeFile(join(output, 'synsets', `${bucket}.json`), dataSource(values), 'utf8');
}
for (const [bucket, values] of Object.entries(lemmasByBucket)) {
  await writeFile(join(output, 'lemmas', `${bucket}.json`), dataSource(values), 'utf8');
}
const manifest = {
  manifestType: 'knowledgeBasePackage', format: 'eslm-kb-package-v1', schemaVersion: '1',
  kbId: 'oewn-2025', kbVersion: '2025', namespace: 'oewn-2025',
  id: 'oewn-2025',
  title: 'Open English WordNet 2025',
  version: '2025',
  kind: 'lexical-taxonomy',
  generatedBy: 'coding-agent+deterministic-node-compiler',
  sourceRelease: '2025-12-31',
  sourceArchive: basename(archive),
  sourceDigest: digest(archiveBytes),
  license: 'CC BY 4.0; Open English WordNet and Princeton WordNet attribution required',
  trainOnly: false,
  benchmarkEligible: false,
  counts: {
    synsets: Object.values(synsetsByBucket).reduce((sum, bucket) => sum + Object.keys(bucket).length, 0),
    uniqueLemmas: Object.values(lemmasByBucket).reduce((sum, bucket) => sum + Object.keys(bucket).length, 0),
    memberOccurrences, definitions: definitionCount, examples: exampleCount,
  },
  relations: relationCounts,
  capabilities: ['define', 'list-senses', 'synonyms', 'bounded-hypernym-deduction'],
  limitations: ['no automatic word-sense disambiguation', 'no closed-world negation', 'no proper-noun Namenet extension'],
  provider: 'oewn-compact-source-v1',
  shardDirectoryRef: 'shards.json',
  canonicalSource: { checksum: `sha256:${digest(archiveBytes)}`, recordCount: Object.values(synsetsByBucket).reduce((sum, bucket) => sum + Object.keys(bucket).length, 0) },
};
const shards = [
  ...Object.keys(synsetsByBucket).map((key) => ({ shardId: `synsets-${key}`, shardKind: 'sourceSynset', accessPath: 'synset-id', dataRef: `synsets/${key}.json`, recordCount: Object.keys(synsetsByBucket[key]).length })),
  ...Object.keys(lemmasByBucket).map((key) => ({ shardId: `lemmas-${key}`, shardKind: 'sourceLexemeIndex', accessPath: 'normalized-lemma', dataRef: `lemmas/${key}.json`, recordCount: Object.keys(lemmasByBucket[key]).length })),
];
for (const shard of shards) {
  const bytes = await readFile(join(output, shard.dataRef));
  shard.compressedBytes = bytes.length;
  shard.checksum = `sha256:${digest(bytes)}`;
  shard.dependencies = [];
}
await writeFile(join(output, 'shards.json'), `${JSON.stringify(shards, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
const outputFiles = [...Object.keys(synsetsByBucket).map((key) => join(output, 'synsets', `${key}.json`)),
  ...Object.keys(lemmasByBucket).map((key) => join(output, 'lemmas', `${key}.json`)), join(output, 'shards.json'), join(output, 'manifest.json')];
let generatedBytes = 0;
for (const file of outputFiles) generatedBytes += (await stat(file)).size;
const report = {
  format: 'eslm-kb-build-report-v2', dataset: 'oewn-2025', status: 'compiled-source-profile', manifest,
  source: { archive: relative(root, archive), bytes: archiveBytes.length, files: synsetFiles.length },
  generated: { directory: relative(root, output), files: outputFiles.length, bytes: generatedBytes },
  profile: {
    elapsedMilliseconds,
    recordsPerSecond: manifest.counts.synsets / (elapsedMilliseconds / 1000),
    rssDeltaBytes: process.memoryUsage().rss - startMemory.rss,
    heapUsedDeltaBytes: process.memoryUsage().heapUsed - startMemory.heapUsed,
  },
};
await writeFile(join(dirname(output), 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(dirname(output), 'source-manifest.json'), `${JSON.stringify({
  format: 'eslm-source-manifest-v1', id: 'oewn-2025', officialSource: 'https://en-word.net/downloads',
  archive: relative(root, archive), archiveBytes: archiveBytes.length, archiveSha256: digest(archiveBytes),
  release: manifest.sourceRelease, license: manifest.license,
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
