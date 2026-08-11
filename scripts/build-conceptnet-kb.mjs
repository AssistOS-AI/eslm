#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import {
  CONCEPTNET_RELATIONS, conceptBucket, conceptName, normalizeConceptTerm,
} from '../src/public-kb-providers/conceptnet-relations.mjs';
import { hashFile } from '../src/util.mjs';

const root = resolve(import.meta.dirname, '..');
const expectedSha256 = 'accd65fe94038584295574ddc26e1500c1919c8c4532bf771811cafd0948af7e';
const buckets = ['0', ...'abcdefghijklmnopqrstuvwxyz'];
const reverseRelations = new Set(['UsedFor']);

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function edgePartitions(relations = Object.keys(CONCEPTNET_RELATIONS)) {
  return Object.fromEntries([...relations].map((relation) => [relation,
    Object.fromEntries(buckets.map((bucket) => [bucket, Object.create(null)]))]));
}

function addEdge(partitions, relation, key, value, weight, provenanceId, row) {
  const bucket = partitions[relation][conceptBucket(key)];
  if (!Object.hasOwn(bucket, key)) bucket[key] = [];
  let edge = bucket[key].find((candidate) => candidate[0] === value);
  if (!edge) { edge = [value, weight, [], []]; bucket[key].push(edge); }
  edge[1] = Math.max(edge[1], weight);
  if (!edge[2].includes(provenanceId)) edge[2].push(provenanceId);
  edge[3].push(row);
}

function provenanceRecord(metadata) {
  return { dataset: metadata.dataset, license: metadata.license, sources: metadata.sources };
}

const archive = resolve(option('--archive', join(root, 'training/.cache/corpora/conceptnet-5.7.0/conceptnet-assertions-5.7.0.csv.gz')));
const output = resolve(option('--output', join(root, 'training/KBs/conceptnet-5.7.0-en/package')));
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const archiveStat = await stat(archive);
const archiveSha256 = await hashFile(archive);
if (archiveSha256 !== expectedSha256) throw new Error(`Frozen ConceptNet source mismatch: ${archiveSha256}.`);
const forward = edgePartitions();
const reverse = edgePartitions(reverseRelations);
const provenance = [];
const provenanceIds = new Map();
const relationCounts = Object.fromEntries(Object.keys(CONCEPTNET_RELATIONS).map((relation) => [relation, 0]));
let sourceRows = 0;
let includedRows = 0;
let invalidRows = 0;
let peakRssBytes = startMemory.rss;
const input = createReadStream(archive).pipe(createGunzip());
for await (const line of createInterface({ input, crlfDelay: Infinity })) {
  sourceRows += 1;
  if (sourceRows % 100_000 === 0) peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  const fields = line.split('\t');
  if (fields.length !== 5) { invalidRows += 1; continue; }
  const relation = fields[1].replace(/^\/r\//u, '');
  if (!CONCEPTNET_RELATIONS[relation]) continue;
  const subject = conceptName(fields[2]);
  const object = conceptName(fields[3]);
  if (!subject || !object) continue;
  let metadata;
  try { metadata = JSON.parse(fields[4]); } catch { invalidRows += 1; continue; }
  const weight = Number(metadata.weight);
  if (!Number.isFinite(weight) || weight <= 0 || typeof metadata.dataset !== 'string'
    || typeof metadata.license !== 'string' || !Array.isArray(metadata.sources)) { invalidRows += 1; continue; }
  const source = provenanceRecord(metadata);
  const sourceKey = JSON.stringify(source);
  let provenanceId = provenanceIds.get(sourceKey);
  if (provenanceId === undefined) {
    provenanceId = provenance.length;
    provenanceIds.set(sourceKey, provenanceId);
    provenance.push(source);
  }
  addEdge(forward, relation, subject, object, weight, provenanceId, sourceRows);
  if (reverseRelations.has(relation)) addEdge(reverse, relation, object, subject, weight, provenanceId, sourceRows);
  relationCounts[relation] += 1;
  includedRows += 1;
}
peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
await mkdir(join(output, 'forward'), { recursive: true });
await mkdir(join(output, 'reverse'), { recursive: true });
await mkdir(join(output, 'provenance'), { recursive: true });
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value)}\n`, 'utf8');
const shards = [];
for (const [direction, partitions] of [['forward', forward], ['reverse', reverse]]) {
  for (const [relation, relationBuckets] of Object.entries(partitions)) {
    for (const [bucket, values] of Object.entries(relationBuckets)) {
      for (const edges of Object.values(values)) edges.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
      const dataRef = `${direction}/${relation.toLocaleLowerCase('en-US')}-${bucket}.json`;
      await writeJson(join(output, dataRef), values);
      shards.push({ shardId: `${direction}-${relation}-${bucket}`, shardKind: 'sourceRelationIndex',
        accessPath: `${direction}-normalized-term`, relation, direction, dataRef,
        recordCount: Object.values(values).reduce((sum, edges) => sum + edges.length, 0), dependencies: [] });
    }
  }
}
await writeJson(join(output, 'provenance', 'all.json'), provenance);
shards.push({ shardId: 'provenance-all', shardKind: 'sourceProvenance', accessPath: 'provenance-id',
  dataRef: 'provenance/all.json', recordCount: provenance.length, dependencies: [] });
for (const shard of shards) {
  const bytes = await readFile(join(output, shard.dataRef));
  shard.compressedBytes = bytes.length;
  shard.checksum = `sha256:${digest(bytes)}`;
}
const uniqueEdges = shards.filter((item) => item.direction === 'forward').reduce((sum, item) => sum + item.recordCount, 0);
const manifest = {
  manifestType: 'knowledgeBasePackage', format: 'eslm-kb-package-v1', schemaVersion: '1',
  kbId: 'conceptnet-5.7.0-en', kbVersion: '5.7.0', namespace: 'conceptnet', id: 'conceptnet-5.7.0-en',
  title: 'ConceptNet 5.7 reviewed English relation profile', version: '5.7.0', kind: 'general-relational-commonsense',
  generatedBy: 'deterministic-streaming-node-compiler', sourceRelease: '5.7.0',
  sourceArchive: basename(archive), sourceDigest: archiveSha256,
  license: 'CC BY-SA 4.0; per-assertion source and license metadata retained', trainOnly: false, benchmarkEligible: false,
  counts: { sourceRows, includedRows, uniqueEdges, provenanceRecords: provenance.length, invalidRows, relations: relationCounts },
  relationPolicy: CONCEPTNET_RELATIONS,
  capabilities: Object.values(CONCEPTNET_RELATIONS).map((item) => item.family).filter((item, index, all) => all.indexOf(item) === index),
  limitations: ['English endpoints only', 'reviewed relation allowlist only', 'defeasible edges are not universal laws', 'no answer-specific benchmark augmentation'],
  provider: 'conceptnet-query-directed-v1', shardDirectoryRef: 'shards.json',
  canonicalSource: { checksum: `sha256:${archiveSha256}`, recordCount: includedRows },
};
const probePath = join(dirname(output), 'probe', 'probe-report.json');
const probe = JSON.parse(await readFile(probePath, 'utf8'));
let equivalenceChecked = 0;
let equivalenceFailures = 0;
for (const sample of Object.values(probe.stratifiedProbe.strata).flat()) {
  if (!forward[sample.relation]) continue;
  const sampleStart = normalizeConceptTerm(sample.start);
  const sampleEnd = normalizeConceptTerm(sample.end);
  equivalenceChecked += 1;
  const edges = forward[sample.relation][conceptBucket(sampleStart)][sampleStart] ?? [];
  if (!edges.some((edge) => edge[0] === sampleEnd && edge[1] >= sample.weight)) equivalenceFailures += 1;
  if (reverseRelations.has(sample.relation)) {
    equivalenceChecked += 1;
    const reverseEdges = reverse[sample.relation][conceptBucket(sampleEnd)][sampleEnd] ?? [];
    if (!reverseEdges.some((edge) => edge[0] === sampleStart && edge[1] >= sample.weight)) equivalenceFailures += 1;
  }
}
if (equivalenceFailures > 0) throw new Error(`ConceptNet compiled access-path equivalence failed ${equivalenceFailures}/${equivalenceChecked} checks.`);
await writeJson(join(output, 'shards.json'), shards);
await writeJson(join(output, 'manifest.json'), manifest);
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
const generatedBytes = (await Promise.all(shards.map((shard) => stat(join(output, shard.dataRef))))).reduce((sum, value) => sum + value.size, 0);
const report = {
  format: 'eslm-kb-build-report-v2', dataset: manifest.kbId, status: 'compiled-source-profile', manifest,
  source: { archive: relative(root, archive), bytes: archiveStat.size, rows: sourceRows },
  generated: { directory: relative(root, output), shards: shards.length, bytes: generatedBytes },
  profile: { elapsedMilliseconds, rowsPerSecond: sourceRows / (elapsedMilliseconds / 1000), peakRssBytes,
    rssDeltaBytes: process.memoryUsage().rss - startMemory.rss, heapUsedDeltaBytes: process.memoryUsage().heapUsed - startMemory.heapUsed },
  equivalenceGate: { canonicalSample: 'training/KBs/conceptnet-5.7.0-en/probe/probe-report.json',
    checked: equivalenceChecked, failures: equivalenceFailures,
    requirement: 'compiled forward and required reverse access paths reproduce the frozen stratified source rows' },
};
await writeJson(join(dirname(output), 'build-report.json'), report);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
