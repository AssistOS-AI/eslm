#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { hashFile } from '../src/util.mjs';

const EXPECTED_SHA256 = 'accd65fe94038584295574ddc26e1500c1919c8c4532bf771811cafd0948af7e';
const RELATION_POLICY = Object.freeze({
  IsA: { family: 'taxonomy', direction: 'forward', inference: 'transitive-with-cycle-guard' },
  InstanceOf: { family: 'taxonomy', direction: 'forward', inference: 'instance-to-class' },
  PartOf: { family: 'mereology', direction: 'forward', inference: 'declared-edge-only' },
  HasA: { family: 'mereology', direction: 'forward', inference: 'declared-edge-only' },
  UsedFor: { family: 'purpose', direction: 'forward', inference: 'defeasible-edge' },
  CapableOf: { family: 'capability', direction: 'forward', inference: 'defeasible-edge' },
  AtLocation: { family: 'location', direction: 'forward', inference: 'defeasible-edge' },
  HasProperty: { family: 'property', direction: 'forward', inference: 'defeasible-edge' },
  MadeOf: { family: 'material', direction: 'forward', inference: 'declared-edge-only' },
  Causes: { family: 'causal', direction: 'forward', inference: 'defeasible-edge' },
  MotivatedByGoal: { family: 'intentional', direction: 'forward', inference: 'defeasible-edge' },
  ReceivesAction: { family: 'affordance', direction: 'forward', inference: 'defeasible-edge' },
  Antonym: { family: 'lexical-opposition', direction: 'symmetric', inference: 'declared-edge-only' },
  Synonym: { family: 'lexical-equivalence', direction: 'symmetric', inference: 'declared-edge-only' },
});

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function increment(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

function top(object, limit = 30) {
  return Object.fromEntries(Object.entries(object).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, limit));
}

function concept(uri) {
  const match = uri.match(/^\/c\/([^/]+)\/([^/]+)(?:\/([^/]+))?/u);
  return match ? { language: match[1], term: match[2], sense: match[3] } : undefined;
}

function stableSample(samples, stratum, record, limit = 3) {
  const hash = createHash('sha256').update(`${stratum}\0${record.relation}\0${record.start}\0${record.end}`).digest('hex');
  const values = samples[stratum] ?? [];
  values.push({ hash, ...record });
  values.sort((left, right) => left.hash.localeCompare(right.hash));
  if (values.length > limit) values.pop();
  samples[stratum] = values;
}

const archive = resolve(option('--archive', 'training/.cache/corpora/conceptnet-5.7.0/conceptnet-assertions-5.7.0.csv.gz'));
const output = resolve(option('--output', 'training/KBs/conceptnet-5.7.0-en/probe/probe-report.json'));
const sourceSha256 = await hashFile(archive);
if (sourceSha256 !== EXPECTED_SHA256) throw new Error(`Frozen ConceptNet source mismatch: ${sourceSha256}.`);
const archiveBytes = (await stat(archive)).size;
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const counts = { relations: {}, languages: {}, englishRelations: {}, datasets: {}, licenses: {}, weightBands: {} };
const samples = {};
let rows = 0;
let schemaMalformed = 0;
let nonConceptEndpoints = 0;
let englishBoth = 0;
let policyCovered = 0;
let metadataFailures = 0;
let maximumMetadataBytes = 0;
let peakRssBytes = startMemory.rss;
const input = createReadStream(archive).pipe(createGunzip());
for await (const line of createInterface({ input, crlfDelay: Infinity })) {
  rows += 1;
  if (rows % 100_000 === 0) peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  const fields = line.split('\t');
  if (fields.length !== 5) { schemaMalformed += 1; continue; }
  const [, relationUri, startUri, endUri, metadataText] = fields;
  const relation = relationUri.replace(/^\/r\//u, '');
  const start = concept(startUri);
  const end = concept(endUri);
  if (!relation || !start || !end) { nonConceptEndpoints += 1; continue; }
  increment(counts.relations, relation);
  increment(counts.languages, `${start.language}->${end.language}`);
  maximumMetadataBytes = Math.max(maximumMetadataBytes, Buffer.byteLength(metadataText));
  let metadata;
  try { metadata = JSON.parse(metadataText); } catch { metadataFailures += 1; continue; }
  increment(counts.datasets, metadata.dataset ?? 'missing');
  increment(counts.licenses, metadata.license ?? 'missing');
  const weight = Number(metadata.weight);
  const weightBand = !Number.isFinite(weight) ? 'invalid' : weight < 1 ? '<1' : weight < 2 ? '1..<2' : weight < 5 ? '2..<5' : '>=5';
  increment(counts.weightBands, weightBand);
  if (start.language !== 'en' || end.language !== 'en') continue;
  englishBoth += 1;
  increment(counts.englishRelations, relation);
  if (RELATION_POLICY[relation]) policyCovered += 1;
  stableSample(samples, `${relation}:${weightBand}`, {
    relation, start: start.term, end: end.term, weight, dataset: metadata.dataset,
    license: metadata.license, sourceCount: Array.isArray(metadata.sources) ? metadata.sources.length : 0,
  });
}
peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
const report = {
  format: 'eslm-corpus-probe-v1', corpus: 'conceptnet-5.7.0-en', status: 'probe-complete-gate-review-required',
  source: {
    release: '5.7.0', officialUrl: 'https://conceptnet.s3.amazonaws.com/downloads/2019/edges/conceptnet-assertions-5.7.0.csv.gz',
    license: 'CC BY-SA 4.0; per-assertion license and source metadata retained', sha256: sourceSha256, compressedBytes: archiveBytes,
  },
  inventory: {
    rows, schemaMalformed, nonConceptEndpoints, metadataFailures, englishToEnglishRows: englishBoth,
    policyCoveredEnglishRows: policyCovered, policyCoverageRate: englishBoth ? policyCovered / englishBoth : 0,
    maximumMetadataBytes, relations: top(counts.relations, 80), englishRelations: top(counts.englishRelations, 80),
    languagePairs: top(counts.languages), datasets: top(counts.datasets), licenses: top(counts.licenses), weightBands: counts.weightBands,
  },
  stratifiedProbe: {
    policy: 'three stable-hash-minimum rows per observed English relation and weight band',
    strata: Object.fromEntries(Object.entries(samples).sort(([left], [right]) => left.localeCompare(right))),
  },
  semanticMapping: RELATION_POLICY,
  scope: {
    include: 'English-to-English assertions in the allowlisted relation policy with finite positive weight and parseable source metadata.',
    exclude: 'Non-English endpoints, non-concept endpoints, malformed metadata, non-positive weights, and relations without a reviewed semantic policy.',
    provenance: 'Retain relation, normalized endpoint URIs, dataset, license, sources, weight, and source-row identity.',
  },
  physicalPlan: {
    adapter: 'stream gzip line-by-line; never materialize the source archive',
    canonicalShape: 'typed relation edge plus weight and provenance',
    shards: 'relation family, then stable subject-name bucket; independent reverse index where query direction requires it',
    runtime: 'query-directed immutable shard reads under byte-accounted LRU cache',
    equivalence: 'compare a frozen stratified canonical sample against every compiled access path before promotion',
  },
  resourceBudget: {
    maximumCompressedSourceBytes: 600_000_000, maximumCompilerRssBytes: 768 * 1024 * 1024,
    targetShardBytes: 16 * 1024 * 1024, maximumRetainedEnglishEdges: 20_000_000,
  },
  profile: {
    elapsedMilliseconds, rowsPerSecond: rows / (elapsedMilliseconds / 1000), peakRssBytes,
    rssDeltaBytes: process.memoryUsage().rss - startMemory.rss,
  },
  gateReview: {
    sourceFrozen: sourceSha256 === EXPECTED_SHA256, schemasValidated: schemaMalformed === 0 && metadataFailures === 0,
    stratificationPresent: Object.keys(samples).length > 0, semanticPolicyExplicit: Object.keys(RELATION_POLICY).length > 0,
    streamingAdapterDemonstrated: true, compactShardPlanPresent: true, queryDirectedPlanPresent: true,
  },
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await mkdir(dirname(dirname(output)), { recursive: true });
await writeFile(resolve(dirname(dirname(output)), 'source-manifest.json'), `${JSON.stringify({
  format: 'eslm-source-manifest-v1', id: report.corpus, officialSource: report.source.officialUrl,
  archive: 'training/.cache/corpora/conceptnet-5.7.0/conceptnet-assertions-5.7.0.csv.gz',
  archiveBytes, archiveSha256: sourceSha256, release: report.source.release, license: report.source.license,
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ corpus: report.corpus, status: report.status, inventory: report.inventory,
  profile: report.profile, gateReview: report.gateReview }, null, 2)}\n`);
