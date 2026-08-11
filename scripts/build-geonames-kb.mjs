#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const root = resolve(import.meta.dirname, '..');
const release = '2026-08-11';
const expected = Object.freeze({
  countryInfo: '93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512',
  cities15000: '984874c3f61863edea01a027f7ea17a3c67a6259d27ccd33bec83978ab2005cc',
});

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalize(value) {
  return value.normalize('NFKD').replace(/\p{M}+/gu, '').toLocaleLowerCase('en-US')
    .replace(/[’']/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function nameBucket(value) {
  const initial = normalize(value)[0] ?? '0';
  return /^[a-z]$/u.test(initial) ? initial : '0';
}

function idBucket(id) {
  return createHash('sha256').update(String(id)).digest('hex')[0];
}

function addIndex(index, key, id) {
  const normalized = normalize(key);
  if (!normalized) return;
  const bucket = index[nameBucket(normalized)];
  if (!Object.hasOwn(bucket, normalized)) bucket[normalized] = [];
  if (!bucket[normalized].includes(id)) bucket[normalized].push(id);
}

async function assertSource(path, wanted) {
  const bytes = await readFile(path);
  const actual = digest(bytes);
  if (actual !== wanted) throw new Error(`Frozen GeoNames source mismatch for ${path}: ${actual}.`);
  return { bytes: bytes.length, sha256: actual };
}

async function cityLines(archive) {
  const child = spawn('unzip', ['-p', archive, 'cities15000.txt'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const completion = new Promise((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`unzip exited ${code}.`)));
  });
  return { lines, completion };
}

const sourceDirectory = resolve(option('--source', join(root, `training/.cache/corpora/geonames-${release}`)));
const output = resolve(option('--output', join(root, 'training/KBs/geonames-2026/package')));
const countryPath = join(sourceDirectory, 'countryInfo.txt');
const cityArchive = join(sourceDirectory, 'cities15000.zip');
const started = process.hrtime.bigint();
const startMemory = process.memoryUsage();
const sources = {
  countryInfo: await assertSource(countryPath, expected.countryInfo),
  cities15000: await assertSource(cityArchive, expected.cities15000),
};

const countries = Object.create(null);
const countryIndex = Object.create(null);
for await (const line of createInterface({ input: createReadStream(countryPath), crlfDelay: Infinity })) {
  if (!line || line.startsWith('#')) continue;
  const fields = line.split('\t');
  if (fields.length !== 19) throw new Error(`GeoNames countryInfo row has ${fields.length} fields, expected 19.`);
  const [code, code3, numeric, , name, capital, area, population, continent, , currencyCode,
    currencyName, , , , languages, geonameId, neighbours] = fields;
  if (!/^[A-Z]{2}$/u.test(code) || !/^\d+$/u.test(geonameId)) throw new Error('Invalid GeoNames country identity.');
  countries[code] = [name, capital, continent, currencyCode, currencyName,
    languages.split(',').filter(Boolean), Number(population), Number(area), code3, numeric,
    neighbours.split(',').filter(Boolean), geonameId];
  for (const key of [name, code, code3]) countryIndex[normalize(key)] = code;
}

const nameIndexes = Object.fromEntries(['0', ...'abcdefghijklmnopqrstuvwxyz'].map((key) => [key, Object.create(null)]));
const placeRecords = Object.fromEntries('0123456789abcdef'.split('').map((key) => [key, Object.create(null)]));
const cityStream = await cityLines(cityArchive);
let placeCount = 0;
let aliasCount = 0;
for await (const line of cityStream.lines) {
  const fields = line.split('\t');
  if (fields.length !== 19) throw new Error(`GeoNames cities15000 row has ${fields.length} fields, expected 19.`);
  const [id, name, ascii, aliases, latitude, longitude, featureClass, featureCode, countryCode,
    , admin1, admin2, admin3, admin4, population, elevation, dem, timezone, modified] = fields;
  if (!/^\d+$/u.test(id) || !/^[A-Z]{2}$/u.test(countryCode)) throw new Error('Invalid GeoNames place identity.');
  placeRecords[idBucket(id)][id] = [name, ascii, countryCode, Number(population), Number(latitude),
    Number(longitude), timezone, featureClass, featureCode, admin1, admin2, admin3, admin4,
    elevation ? Number(elevation) : null, dem ? Number(dem) : null, modified];
  const keys = new Set([name, ascii, ...aliases.split(',').filter(Boolean)]);
  for (const key of keys) { addIndex(nameIndexes, key, id); aliasCount += 1; }
  placeCount += 1;
}
await cityStream.completion;

await mkdir(join(output, 'names'), { recursive: true });
await mkdir(join(output, 'places'), { recursive: true });
await mkdir(join(output, 'countries'), { recursive: true });
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value)}\n`, 'utf8');
await writeJson(join(output, 'countries', 'all.json'), { countries, index: countryIndex });
for (const [bucket, values] of Object.entries(nameIndexes)) await writeJson(join(output, 'names', `${bucket}.json`), values);
for (const [bucket, values] of Object.entries(placeRecords)) await writeJson(join(output, 'places', `${bucket}.json`), values);

const manifest = {
  manifestType: 'knowledgeBasePackage', format: 'eslm-kb-package-v1', schemaVersion: '1',
  kbId: 'geonames-2026', kbVersion: release, namespace: 'geonames', id: 'geonames-2026',
  title: 'GeoNames countries and cities over 15,000 residents', version: release,
  kind: 'geographic-factual', generatedBy: 'deterministic-node-compiler', sourceRelease: release,
  license: 'CC BY 4.0; GeoNames attribution required', trainOnly: false, benchmarkEligible: false,
  counts: { countries: Object.keys(countries).length, places: placeCount, indexedNames: aliasCount },
  capabilities: ['country-properties', 'capital-relation', 'place-country', 'place-population', 'place-timezone', 'place-coordinates'],
  limitations: ['cities15000 population threshold', 'source-name ambiguity is returned explicitly', 'country population is the frozen countryInfo value'],
  provider: 'geonames-query-directed-v1', shardDirectoryRef: 'shards.json',
  canonicalSource: { checksum: `sha256:${sources.cities15000.sha256}`, recordCount: placeCount },
};
const shardSpecs = [
  ['countries-all', 'sourceCountryIndex', 'country-name-or-code', 'countries/all.json', Object.keys(countries).length],
  ...Object.entries(nameIndexes).map(([key, values]) => [`names-${key}`, 'sourcePlaceNameIndex', 'normalized-place-name', `names/${key}.json`, Object.keys(values).length]),
  ...Object.entries(placeRecords).map(([key, values]) => [`places-${key}`, 'sourcePlaceRecord', 'geoname-id', `places/${key}.json`, Object.keys(values).length]),
];
const shards = [];
for (const [shardId, shardKind, accessPath, dataRef, recordCount] of shardSpecs) {
  const bytes = await readFile(join(output, dataRef));
  shards.push({ shardId, shardKind, accessPath, dataRef, recordCount, compressedBytes: bytes.length,
    checksum: `sha256:${digest(bytes)}`, dependencies: [] });
}
await writeJson(join(output, 'shards.json'), shards);
await writeJson(join(output, 'manifest.json'), manifest);
const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6;
let generatedBytes = 0;
for (const shard of shards) generatedBytes += (await stat(join(output, shard.dataRef))).size;
const report = {
  format: 'eslm-kb-build-report-v2', dataset: manifest.kbId, status: 'compiled-source-profile', manifest,
  source: { directory: relative(root, sourceDirectory), artifacts: sources },
  generated: { directory: relative(root, output), shards: shards.length, bytes: generatedBytes },
  profile: { elapsedMilliseconds, recordsPerSecond: placeCount / (elapsedMilliseconds / 1000),
    rssDeltaBytes: process.memoryUsage().rss - startMemory.rss,
    heapUsedDeltaBytes: process.memoryUsage().heapUsed - startMemory.heapUsed },
};
await writeJson(join(dirname(output), 'build-report.json'), report);
await writeJson(join(dirname(output), 'source-manifest.json'), {
  format: 'eslm-source-manifest-v1', id: manifest.kbId, officialSource: 'https://download.geonames.org/export/dump/',
  artifacts: [{ name: basename(countryPath), ...sources.countryInfo }, { name: basename(cityArchive), ...sources.cities15000 }],
  release, license: manifest.license,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
