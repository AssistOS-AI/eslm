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

function moduleSource(value) {
  return `export default Object.freeze(${JSON.stringify(value)});\n`;
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
const output = resolve(option('--output', join(root, 'training/KBs/oewn-2025/model')));
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const archiveBytes = await readFile(archive);
const listing = await runFile('unzip', ['-Z1', archive], { maxBuffer: 1024 * 1024 });
const files = listing.stdout.split(/\r?\n/u).filter((name) => name.endsWith('.json'));
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

await mkdir(join(output, 'synsets'), { recursive: true });
await mkdir(join(output, 'lemmas'), { recursive: true });
for (const [bucket, values] of Object.entries(synsetsByBucket)) {
  await writeFile(join(output, 'synsets', `${bucket}.mjs`), moduleSource(values), 'utf8');
}
for (const [bucket, values] of Object.entries(lemmasByBucket)) {
  await writeFile(join(output, 'lemmas', `${bucket}.mjs`), moduleSource(values), 'utf8');
}
const synsetImports = Object.keys(synsetsByBucket).map((key) => `import s${key} from './synsets/${key}.mjs';`);
const lemmaImports = Object.keys(lemmasByBucket).map((key, index) => `import l${index} from './lemmas/${key}.mjs';`);
const synsetNames = Object.keys(synsetsByBucket).map((key) => `s${key}`).join(', ');
const lemmaNames = Object.keys(lemmasByBucket).map((_, index) => `l${index}`).join(', ');
const manifest = {
  format: 'eslm-public-kb-v1',
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
};
const manifestSource = [
  ...synsetImports, ...lemmaImports,
  '',
  `export const manifest = Object.freeze(${JSON.stringify(manifest, null, 2)});`,
  `export const data = Object.freeze({ synsets: Object.freeze(Object.assign({}, ${synsetNames})), lemmas: Object.freeze(Object.assign({}, ${lemmaNames})) });`,
  'export default Object.freeze({ manifest, data });',
  '',
].join('\n');
await writeFile(join(output, 'manifest.mjs'), manifestSource, 'utf8');
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
const outputFiles = [...Object.keys(synsetsByBucket).map((key) => join(output, 'synsets', `${key}.mjs`)),
  ...Object.keys(lemmasByBucket).map((key) => join(output, 'lemmas', `${key}.mjs`)), join(output, 'manifest.mjs')];
let generatedBytes = 0;
for (const file of outputFiles) generatedBytes += (await stat(file)).size;
const report = {
  format: 'eslm-kb-build-report-v1', dataset: 'oewn-2025', status: 'complete', manifest,
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
