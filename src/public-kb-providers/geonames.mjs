import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ShardCache } from '../memory-policy.mjs';
import { sha256 } from '../util.mjs';
import { makeGroundingEntry } from '../reasoning/grounding-retrieval.mjs';

const CONTINENTS = Object.freeze({ AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe',
  NA: 'North America', OC: 'Oceania', SA: 'South America' });

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

async function readShard(path, expectedChecksum) {
  const bytes = await readFile(path);
  if (`sha256:${sha256(bytes)}` !== expectedChecksum) throw new Error(`Checksum mismatch for GeoNames shard ${path}.`);
  return { value: Object.freeze(JSON.parse(bytes.toString('utf8'))), sourceBytes: bytes.length };
}

function result(provider, answer, values, facts, ambiguity = false) {
  return {
    status: values.length > 0 && !ambiguity ? 'SOLVED' : ambiguity ? 'AMBIGUOUS' : 'UNKNOWN',
    answer, values, ambiguity,
    provenance: facts.map((id) => ({
      fact: `geonames:${id}`,
      kbId: provider.manifest.kbId,
      kbVersion: provider.manifest.kbVersion,
      source: [`GeoNames:${id}`],
      method: 'source-retrieval',
    })),
    reasoning: { method: ambiguity ? 'typed-ambiguity-preservation' : 'indexed-lookup' },
    query: { provider: provider.manifest.id }, learned: [], learnedRules: [], context: {},
  };
}

function cleanQuestion(text) {
  return text.trim().replace(/^(?:please|can you tell me|could you tell me)\s+/iu, '').replace(/[?.!]+$/u, '');
}

export class GeoNamesProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.modelDirectory = options.modelDirectory;
    this.shardsByRef = options.shardsByRef;
    this.mode = options.mode ?? 'eager';
    if (this.mode === 'eager') this.data = model.data;
    else this.cache = new ShardCache(options.cacheBytes, 6);
  }

  beginQuery() { this.queryShards = new Map(); }
  endQuery() { this.queryShards = undefined; }

  async load(ref) {
    if (this.queryShards?.has(ref)) return this.queryShards.get(ref);
    const shard = this.shardsByRef.get(ref);
    const loader = () => readShard(join(this.modelDirectory, ref), shard.checksum);
    const value = this.mode === 'eager' ? this.data[ref] : await this.cache.get(ref, loader);
    this.queryShards?.set(ref, value);
    return value;
  }

  async countryData() { return this.load('countries/all.json'); }

  async country(value) {
    const data = await this.countryData();
    const code = data.index[normalize(value)];
    return code ? { code, record: data.countries[code] } : undefined;
  }

  async places(value) {
    const key = normalize(value);
    const ids = (await this.load(`names/${nameBucket(key)}.json`))[key] ?? [];
    const places = [];
    for (const id of ids) places.push({ id, record: (await this.load(`places/${idBucket(id)}.json`))[id] });
    return places;
  }

  memorySnapshot() {
    return this.mode === 'eager'
      ? { mode: 'eager', estimatedBytes: 48 * 1024 * 1024 }
      : { mode: 'lazy', ...this.cache.snapshot() };
  }

  async retrieveGrounding(request) {
    const maximumLookups = Math.min(request.limits.maximumLookups, request.terms.length, 8);
    const maximumValues = request.limits.maximumValuesPerLookup;
    const entries = [];
    const truncationReasons = [];
    let considered = 0;
    for (const [termIndex, term] of request.terms.slice(0, maximumLookups).entries()) {
      considered += 1;
      const country = await this.country(term);
      if (country) {
        const record = country.record;
        entries.push(makeGroundingEntry({
          kbId: this.manifest.kbId,
          kbVersion: this.manifest.kbVersion,
          recordId: `geonames:${record[11]}`,
          statement: `${record[0]} is a country in ${CONTINENTS[record[2]] ?? record[2]}; its capital is ${record[1]}.`,
          semantic: {
            kind: 'country-summary',
            name: record[0],
            capital: record[1],
            continent: CONTINENTS[record[2]] ?? record[2],
            currencyCode: record[3],
            languages: record[5],
          },
          epistemicStatus: 'source-assertion',
          provenance: [`GeoNames:${record[11]}`],
          relevance: { score: 30 - termIndex * 0.25, reasons: ['exact-country-name-match'] },
        }));
      }
      const key = normalize(term);
      const ids = (await this.load(`names/${nameBucket(key)}.json`))[key] ?? [];
      if (ids.length > maximumValues) truncationReasons.push('place-ambiguity-budget');
      for (const id of ids.slice(0, maximumValues)) {
        const record = (await this.load(`places/${idBucket(id)}.json`))[id];
        if (!record) continue;
        const countryRecord = (await this.country(record[2]))?.record;
        entries.push(makeGroundingEntry({
          kbId: this.manifest.kbId,
          kbVersion: this.manifest.kbVersion,
          recordId: `geonames:${id}`,
          statement: `${record[0]} is a populated place${countryRecord ? ` in ${countryRecord[0]}` : ''}.`,
          semantic: {
            kind: 'populated-place',
            name: record[0],
            countryCode: record[2],
            country: countryRecord?.[0],
            population: record[3],
            latitude: record[4],
            longitude: record[5],
            timezone: record[6],
          },
          epistemicStatus: 'source-assertion',
          provenance: [`GeoNames:${id}`],
          relevance: { score: 24 - termIndex * 0.25, reasons: ['exact-place-name-match'] },
        }));
      }
    }
    if (request.terms.length > maximumLookups) truncationReasons.push('lookup-budget');
    return {
      entries,
      receipt: {
        kbId: this.manifest.kbId,
        kbVersion: this.manifest.kbVersion,
        status: entries.length > 0 ? 'matches-found' : 'no-match',
        coverage: 'bounded-exact-country-and-populated-place-name-lookup',
        complete: truncationReasons.length === 0 && request.termSelection.complete,
        candidatesConsidered: considered,
        truncationReasons: [...new Set([
          ...truncationReasons,
          ...(!request.termSelection.complete ? ['term-selection-budget'] : []),
        ])],
      },
    };
  }

  async countryProperty(subject, property) {
    const country = await this.country(subject);
    if (!country) return undefined;
    const fields = { capital: 1, continent: 2, 'currency code': 3, currency: 4, languages: 5,
      population: 6, area: 7, 'country code': 8 };
    const field = fields[property];
    let value = country.record[field];
    if (property === 'continent') value = CONTINENTS[value] ?? value;
    if (property === 'languages') value = value.map((item) => item.split('-')[0]);
    const values = Array.isArray(value) ? value : value === '' || value === undefined ? [] : [value];
    return result(this, values.join(', '), values, [country.record[11]]);
  }

  async placeProperty(subject, property) {
    const matches = await this.places(subject);
    if (matches.length === 0) return undefined;
    const values = [];
    for (const place of matches) {
      const record = place.record;
      const value = property === 'country' ? (await this.country(record[2]))?.record[0]
        : property === 'population' ? record[3]
          : property === 'timezone' ? record[6]
            : property === 'coordinates' ? `${record[4]}, ${record[5]}` : undefined;
      if (value !== undefined && !values.includes(value)) values.push(value);
    }
    return result(this, values.join(', '), values, matches.map((item) => item.id), values.length > 1);
  }

  async ask(text) {
    const clean = cleanQuestion(text);
    let match = clean.match(/^(?:what|which) is the (capital|continent|currency|currency code|population|area|country code) of (.+)$/iu)
      ?? clean.match(/^what (?:languages are spoken|language is spoken) in (.+)$/iu);
    if (match) {
      const property = match[1]?.toLocaleLowerCase('en-US') ?? 'languages';
      const subject = match[2] ?? match[1];
      return this.countryProperty(subject, property);
    }
    match = clean.match(/^what country (?:is|contains) (.+?)(?: in)?$/iu)
      ?? clean.match(/^(?:where is|where are) (.+?) located$/iu)
      ?? clean.match(/^(.+?) is (?:a city|located) in what country$/iu);
    if (match) return this.placeProperty(match[1], 'country');
    match = clean.match(/^what is the (population|timezone) of (.+)$/iu)
      ?? clean.match(/^what are the coordinates of (.+)$/iu);
    if (match) return (await this.countryProperty(match[2], match[1].toLocaleLowerCase('en-US')))
      ?? this.placeProperty(match[2], match[1].toLocaleLowerCase('en-US'));
    match = clean.match(/^which country has (.+?) as (?:its )?capital$/iu);
    if (match) {
      const data = await this.countryData();
      const found = Object.entries(data.countries).filter(([, record]) => normalize(record[1]) === normalize(match[1]));
      return found.length ? result(this, found.map(([, record]) => record[0]).join(', '), found.map(([, record]) => record[0]), found.map(([, record]) => record[11]), found.length > 1) : undefined;
    }
    return undefined;
  }
}
