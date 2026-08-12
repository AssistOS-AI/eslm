import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';
import { ShardCache, planPublicKnowledgeMemory } from './memory-policy.mjs';
import {
  atomicEventTokens, collectAtomicContinuationEvidence,
} from './public-kb-providers/atomic-continuation.mjs';
import { GeoNamesProvider } from './public-kb-providers/geonames.mjs';
import { ConceptNetProvider } from './public-kb-providers/conceptnet.mjs';
import { WorldRelationsProvider } from './public-kb-providers/world-relations.mjs';
import { sha256 } from './util.mjs';
import { makeGroundingEntry } from './reasoning/grounding-retrieval.mjs';

export const PUBLIC_KB_CATALOG = Object.freeze({
  'oewn-2025': Object.freeze({
    id: 'oewn-2025', title: 'Open English WordNet 2025', role: 'public lexical and taxonomic knowledge',
    model: 'training/KBs/oewn-2025/package/manifest.json', documentation: 'knowledge-bases.html',
    defaultInteractive: true, benchmarkEligible: false, priority: 1,
    estimatedEagerRssBytes: 349 * 1024 * 1024,
  }),
  'atomic-2020': Object.freeze({
    id: 'atomic-2020', title: 'ATOMIC 2020', role: 'public defeasible event and social commonsense',
    model: 'training/KBs/atomic-2020/package/manifest.json', documentation: 'knowledge-bases.html',
    defaultInteractive: true, benchmarkEligible: false, priority: 2,
    estimatedEagerRssBytes: 284 * 1024 * 1024,
  }),
  'geonames-2026': Object.freeze({
    id: 'geonames-2026', title: 'GeoNames 2026', role: 'public geographic and country knowledge',
    model: 'training/KBs/geonames-2026/package/manifest.json', documentation: 'knowledge-bases.html',
    defaultInteractive: true, benchmarkEligible: false, priority: 3,
    estimatedEagerRssBytes: 48 * 1024 * 1024,
  }),
  'conceptnet-5.7.0-en': Object.freeze({
    id: 'conceptnet-5.7.0-en', title: 'ConceptNet 5.7 English', role: 'public typed everyday relational knowledge',
    model: 'training/KBs/conceptnet-5.7.0-en/package/manifest.json', documentation: 'knowledge-bases.html',
    defaultInteractive: true, benchmarkEligible: false, priority: 4,
    estimatedEagerRssBytes: 220 * 1024 * 1024,
  }),
  'world-relations-1.0': Object.freeze({
    id: 'world-relations-1.0', title: 'World Relations 1.0', role: 'authored semantic relations, inverses, and implications',
    model: 'training/KBs/world-relations-1.0/package/manifest.json', documentation: 'knowledge-bases.html',
    defaultInteractive: true, benchmarkEligible: false, priority: 0,
    estimatedEagerRssBytes: 2 * 1024 * 1024,
  }),
});

function normalizedLemma(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replaceAll('_', ' ')
    .replace(/^(?:the|a|an)\s+/u, '').replace(/[?.!]+$/gu, '').trim();
}

function normalizedEvent(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/gu, ' ')
    .replace(/[?.!]+$/gu, '').trim().replace(/person\s*x/gu, 'personx').replace(/person\s*y/gu, 'persony');
}

function eventTokens(value) {
  return atomicEventTokens(value);
}

function conversationalQuestion(text) {
  return text.trim()
    .replace(/^(?:please tell me|could you tell me|can you tell me|please|could you|can you|using the loaded (?:knowledge|lexical knowledge),|based on the loaded (?:source|event source),)\s+/iu, '')
    .replace(/\s*,?\s*(?:please|for me|using the loaded knowledge|according to the compiled source|if the source has evidence)([?.!]*)$/iu, '$1')
    .replace(/^tell me what (.+?) means([?.!]*)$/iu, 'what does $1 mean$2')
    .replace(/^explain what (.+?) means([?.!]*)$/iu, 'what does $1 mean$2')
    .replace(/^give me (?:the )?synonyms for /iu, 'give me synonyms for ')
    .replace(/[.!]+$/u, '?');
}

function provenance(provider, source, detail) {
  return [{
    fact: `${provider.manifest.id}:${source}`,
    kbId: provider.manifest.kbId,
    kbVersion: provider.manifest.kbVersion,
    source: [detail],
    method: 'source-retrieval',
  }];
}

function response(provider, answer, values, source, detail, reasoning = 'retrieval') {
  return {
    status: values.length > 0 ? 'SOLVED' : 'UNKNOWN', answer, values,
    provenance: provenance(provider, source, detail),
    reasoning: { method: reasoning }, query: { provider: provider.manifest.id, source },
    learned: [], learnedRules: [], context: {},
  };
}

async function readGeneratedShard(path, expectedChecksum) {
  const bytes = await readFile(path);
  if (expectedChecksum && `sha256:${sha256(bytes)}` !== expectedChecksum) {
    throw new Error(`Checksum mismatch for public KB shard ${path}.`);
  }
  return { value: Object.freeze(JSON.parse(bytes.toString('utf8'))), sourceBytes: bytes.length };
}

function lemmaBucket(lemma) {
  const initial = normalizedLemma(lemma)[0] ?? '0';
  return /^[a-z]$/u.test(initial) ? initial : '0';
}

function synsetBucket(id) {
  const initial = String(id)[0] ?? '0';
  return /^[0-9]$/u.test(initial) ? initial : '0';
}

class WordNetProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.mode = options.mode ?? 'eager';
    this.modelDirectory = options.modelDirectory;
    this.shardsByRef = options.shardsByRef;
    if (this.mode === 'eager') {
      this.synsets = model.data.synsets;
      this.lemmas = model.data.lemmas;
    } else {
      this.cache = new ShardCache(options.cacheBytes, 12);
    }
  }

  beginQuery() { this.queryShards = new Map(); }
  endQuery() { this.queryShards = undefined; }

  async cachedShard(key, loader) {
    if (this.queryShards?.has(key)) return this.queryShards.get(key);
    const value = await this.cache.get(key, loader);
    this.queryShards?.set(key, value);
    return value;
  }

  async lemmaData(lemma) {
    if (this.mode === 'eager') return this.lemmas;
    const bucket = lemmaBucket(lemma);
    const ref = `lemmas/${bucket}.json`;
    return this.cachedShard(`lemma:${bucket}`, () => readGeneratedShard(join(this.modelDirectory, ref), this.shardsByRef.get(ref).checksum));
  }

  async synsetData(id) {
    if (this.mode === 'eager') return this.synsets;
    const bucket = synsetBucket(id);
    const ref = `synsets/${bucket}.json`;
    return this.cachedShard(`synset:${bucket}`, () => readGeneratedShard(join(this.modelDirectory, ref), this.shardsByRef.get(ref).checksum));
  }

  async synset(id) { return (await this.synsetData(id))[id]; }

  async senses(lemma) {
    const ids = (await this.lemmaData(lemma))[normalizedLemma(lemma)] ?? [];
    const senses = [];
    for (const id of ids) senses.push({ id, ...await this.synset(id) });
    return senses;
  }

  async hypernymProof(left, right, maxDepth = 16) {
    const starts = await this.senses(left);
    const targets = new Set((await this.senses(right)).map((sense) => sense.id));
    if (starts.length === 0 || targets.size === 0) return undefined;
    const queue = starts.map((sense) => ({ id: sense.id, path: [sense.id] }));
    const seen = new Set(queue.map((item) => item.id));
    while (queue.length > 0) {
      const current = queue.shift();
      if (targets.has(current.id)) return current.path;
      if (current.path.length > maxDepth) continue;
      const synset = await this.synset(current.id);
      for (const next of synset?.h ?? []) {
        if (seen.has(next) || !await this.synset(next)) continue;
        seen.add(next);
        queue.push({ id: next, path: [...current.path, next] });
      }
    }
    return undefined;
  }

  memorySnapshot() {
    return this.mode === 'eager'
      ? { mode: 'eager', estimatedBytes: PUBLIC_KB_CATALOG[this.manifest.id].estimatedEagerRssBytes }
      : { mode: 'lazy', ...this.cache.snapshot() };
  }

  async retrieveGrounding(request) {
    const maximumLookups = Math.min(request.limits.maximumLookups, request.terms.length);
    const maximumValues = request.limits.maximumValuesPerLookup;
    const entries = [];
    const truncationReasons = [];
    let lookups = 0;
    for (const [termIndex, term] of request.terms.slice(0, maximumLookups).entries()) {
      const senseIds = (await this.lemmaData(term))[normalizedLemma(term)] ?? [];
      lookups += 1;
      if (senseIds.length > maximumValues) truncationReasons.push('sense-value-budget');
      for (const [senseIndex, senseId] of senseIds.slice(0, maximumValues).entries()) {
        const sense = { id: senseId, ...await this.synset(senseId) };
        const definition = sense.d?.[0] ?? 'definition unavailable';
        entries.push(makeGroundingEntry({
          kbId: this.manifest.kbId,
          kbVersion: this.manifest.kbVersion,
          recordId: `oewn:${sense.id}`,
          statement: `${term}: ${definition}`,
          semantic: {
            kind: 'lexical-sense',
            lemma: term,
            synsetId: sense.id,
            partOfSpeech: sense.p,
            definition,
            synonyms: (sense.m ?? []).slice(0, 12),
          },
          epistemicStatus: 'lexical-source-record',
          provenance: [`oewn-2025:${sense.l}`],
          relevance: {
            score: 30 - termIndex * 0.25 - senseIndex * 0.01,
            reasons: ['exact-lemma-match', 'lexical-sense-neighborhood'],
            activeKbOccurrences: senseIds.length,
          },
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
        coverage: 'bounded-exact-lemma-and-sense-lookup',
        complete: truncationReasons.length === 0 && request.termSelection.complete,
        candidatesConsidered: lookups,
        truncationReasons: [...new Set([
          ...truncationReasons,
          ...(!request.termSelection.complete ? ['term-selection-budget'] : []),
        ])],
      },
    };
  }

  async ask(text) {
    const clean = conversationalQuestion(text);
    let match = clean.match(/^(?:what does (.+?) mean|define (.+?)|what is the definition of (.+?)|give me a definition of (.+?)|what is meant by (.+?)|describe the word (.+?))\??$/iu);
    if (match) {
      const lemma = match.slice(1).find(Boolean);
      const senses = await this.senses(lemma);
      if (senses.length === 0) return response(this, `Open English WordNet 2025 has no compiled sense for “${lemma}”.`, [], normalizedLemma(lemma), 'oewn-2025');
      const descriptions = senses.slice(0, 5).map((sense, index) => `${index + 1}. (${sense.p}) ${sense.d[0] ?? 'definition unavailable'}`);
      return response(this, `${normalizedLemma(lemma)} has ${senses.length} compiled sense${senses.length === 1 ? '' : 's'}:\n${descriptions.join('\n')}`, senses.map((sense) => sense.id), senses[0].id, `oewn-2025:${senses[0].l}`);
    }
    match = clean.match(/^(?:what are (?:the )?synonyms (?:of|for)|give me synonyms (?:of|for)|list synonyms (?:of|for)|which words are similar to|what other words can mean|list alternative words for|tell me some synonyms for|what words share a meaning with) (.+?)\??$/iu);
    if (match) {
      const senses = await this.senses(match[1]);
      if (senses.length === 0) return response(this, `Open English WordNet 2025 has no compiled sense for “${match[1]}”.`, [], normalizedLemma(match[1]), 'oewn-2025');
      const synonyms = [...new Set(senses.flatMap((sense) => sense.m).filter((word) => normalizedLemma(word) !== normalizedLemma(match[1])))];
      return response(this, synonyms.length > 0 ? `Possible synonyms across the compiled senses are: ${synonyms.slice(0, 20).join(', ')}.` : 'No distinct synonyms are recorded for that lemma.', synonyms, senses[0].id, `oewn-2025:${senses[0].l}`);
    }
    match = clean.match(/^(?:how many (?:senses|meanings) does (.+?) have|count the senses of (.+?))\??$/iu);
    if (match) {
      const lemma = match[1] ?? match[2];
      const senses = await this.senses(lemma);
      return response(this, `${normalizedLemma(lemma)} has ${senses.length} compiled sense${senses.length === 1 ? '' : 's'} in Open English WordNet 2025.`, senses.length > 0 ? [senses.length] : [], normalizedLemma(lemma), 'oewn-2025');
    }
    match = clean.match(/^(?:is (?:a |an )?(.+?) (?:a kind of|a type of|an|a) (.+?)|does (.+?) belong to the (.+?) category|can (.+?) be classified as (?:a|an) (.+?))\??$/iu);
    if (match) {
      const left = match[1] ?? match[3] ?? match[5];
      const right = match[2] ?? match[4] ?? match[6];
      if ((await this.senses(left)).length === 0 || (await this.senses(right)).length === 0) return undefined;
      const proof = await this.hypernymProof(left, right);
      if (!proof) return response(this, `I found no WordNet hypernym path proving that ${normalizedLemma(left)} is ${normalizedLemma(right)}. This is unknown, not proven false.`, [], normalizedLemma(left), 'oewn-2025', 'bounded-deduction');
      return response(this, `Yes. At least one sense of ${normalizedLemma(left)} reaches ${normalizedLemma(right)} through a ${proof.length - 1}-edge WordNet path.`, [true], proof.at(-1), `oewn-2025:path:${proof.join('>')}`, 'bounded-deduction');
    }
    return undefined;
  }
}

class AtomicProvider {
  constructor(model, options = {}) {
    this.manifest = model.manifest;
    this.mode = options.mode ?? 'eager';
    this.modelDirectory = options.modelDirectory;
    this.shardsByRef = options.shardsByRef;
    if (this.mode === 'eager') {
      this.events = model.data.events;
      this.keys = Object.keys(this.events);
      this.eventKeyIndex = this.buildEventKeyIndex(this.keys);
    } else {
      this.cache = new ShardCache(options.cacheBytes, 9);
    }
  }

  buildEventKeyIndex(keys) {
    const index = new Map();
    for (const key of keys) {
      for (const token of new Set(eventTokens(key))) {
        if (!index.has(token)) index.set(token, []);
        index.get(token).push(key);
      }
    }
    return index;
  }

  async ensureEventKeyIndex() {
    if (this.eventKeyIndex) return this.eventKeyIndex;
    const keys = [];
    for (const bucket of [...'0123456789abcdef']) {
      keys.push(...Object.keys(await this.eventData(bucket)));
    }
    this.eventKeyIndex = this.buildEventKeyIndex(keys);
    return this.eventKeyIndex;
  }

  async eventData(bucket) {
    if (this.mode === 'eager') return this.events;
    const ref = `events/${bucket}.json`;
    return this.cache.get(`event:${bucket}`, () => readGeneratedShard(join(this.modelDirectory, ref), this.shardsByRef.get(ref).checksum));
  }

  async findEvent(input) {
    const exact = normalizedEvent(input);
    if (this.mode === 'eager' && this.events[exact]) return { key: exact, score: 1, event: this.events[exact] };
    if (this.mode === 'lazy') {
      const bucket = sha256(exact)[0];
      const events = await this.eventData(bucket);
      if (events[exact]) return { key: exact, score: 1, event: events[exact] };
    }
    const wanted = new Set(eventTokens(exact));
    if (wanted.size === 0) return undefined;
    const index = await this.ensureEventKeyIndex();
    const candidateKeys = new Set([...wanted].flatMap((token) => index.get(token) ?? []));
    let best;
    for (const key of candidateKeys) {
      const candidate = new Set(eventTokens(key));
      const overlap = [...wanted].filter((token) => candidate.has(token)).length;
      const score = overlap / new Set([...wanted, ...candidate]).size;
      if (!best || score > best.score || (score === best.score && key.length < best.key.length)
        || (score === best.score && key.length === best.key.length && key.localeCompare(best.key) < 0)) {
        best = { key, score };
      }
    }
    if (!best || best.score < 0.5) return undefined;
    const events = this.mode === 'eager' ? this.events : await this.eventData(sha256(best.key)[0]);
    return events[best.key] ? { ...best, event: events[best.key] } : undefined;
  }

  async answerFor(eventText, relations, label) {
    const match = await this.findEvent(eventText);
    if (!match) return response(this, `ATOMIC 2020 has no sufficiently close compiled event for “${eventText}”.`, [], normalizedEvent(eventText), 'atomic-2020:train');
    const event = match.event;
    const candidates = relations.flatMap((relation) => (event.r[relation] ?? []).map(([tail, line]) => ({ tail, line, relation })));
    if (candidates.length === 0) return response(this, `ATOMIC 2020 matched “${event.h}”, but its train tuples contain no ${label} candidate.`, [], match.key, 'atomic-2020:train');
    const selected = candidates.slice(0, 8);
    const answer = `${label} candidates for “${event.h}”: ${selected.map((item) => item.tail).join('; ')}. These are defeasible possibilities, not certain facts.`;
    return {
      ...response(this, answer, selected.map((item) => item.tail), match.key, `atomic-2020:train:${selected[0].line}`, 'defeasible-retrieval'),
      status: 'DEFEASIBLE',
      match: { event: event.h, score: match.score },
      provenance: selected.map((item) => ({
        fact: `atomic-2020:train:${item.line}`,
        kbId: this.manifest.kbId,
        kbVersion: this.manifest.kbVersion,
        source: [`atomic-2020:train.tsv:${item.line}`],
        relation: item.relation,
        method: 'source-retrieval',
      })),
    };
  }

  async semanticEvidence(request) {
    return collectAtomicContinuationEvidence(this, request);
  }

  memorySnapshot() {
    return this.mode === 'eager'
      ? { mode: 'eager', estimatedBytes: PUBLIC_KB_CATALOG[this.manifest.id].estimatedEagerRssBytes }
      : { mode: 'lazy', ...this.cache.snapshot() };
  }

  async retrieveGrounding(request) {
    const maximumLookups = Math.min(request.limits.maximumLookups, request.terms.length, 6);
    const maximumValues = request.limits.maximumValuesPerLookup;
    const entries = [];
    const truncationReasons = [];
    let considered = 0;
    for (const [termIndex, term] of request.terms.slice(0, maximumLookups).entries()) {
      const exact = normalizedEvent(term);
      const source = this.mode === 'eager' ? this.events : await this.eventData(sha256(exact)[0]);
      const event = source[exact];
      const match = event ? { key: exact, score: 1, event } : undefined;
      considered += 1;
      if (!match) continue;
      const tuples = Object.entries(match.event.r).flatMap(([relation, values]) =>
        values.map(([tail, line]) => ({ relation, tail, line })));
      if (tuples.length > maximumValues) truncationReasons.push('event-neighborhood-budget');
      for (const tuple of tuples.slice(0, maximumValues)) {
        entries.push(makeGroundingEntry({
          kbId: this.manifest.kbId,
          kbVersion: this.manifest.kbVersion,
          recordId: `atomic:train:${tuple.line}`,
          statement: `ATOMIC relates “${match.event.h}” to the defeasible ${tuple.relation} candidate “${tuple.tail}”.`,
          semantic: {
            kind: 'defeasible-event-relation',
            event: match.event.h,
            relation: tuple.relation,
            value: tuple.tail,
            lexicalMatchScore: match.score,
          },
          epistemicStatus: 'defeasible-source-tuple',
          provenance: [`atomic-2020:train.tsv:${tuple.line}`],
          relevance: {
            score: 20 - termIndex * 0.25 + match.score * 10,
            reasons: ['bounded-event-token-overlap', 'source-relation-neighborhood'],
            activeKbOccurrences: tuples.length,
          },
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
        coverage: 'bounded-exact-event-and-relation-neighborhood',
        complete: truncationReasons.length === 0 && request.termSelection.complete,
        candidatesConsidered: considered,
        truncationReasons: [...new Set([
          ...truncationReasons,
          ...(!request.termSelection.complete ? ['term-selection-budget'] : []),
        ])],
      },
    };
  }

  async ask(text) {
    const clean = conversationalQuestion(text);
    let match = clean.match(/^what are possible effects of (.+?)\??$/iu)
      ?? clean.match(/^what could (.+?) lead to\??$/iu)
      ?? clean.match(/^after (.+?), what may occur\??$/iu);
    if (match) return this.answerFor(match[1], ['xEffect', 'oEffect', 'isAfter', 'Causes'], 'possible effect');
    match = clean.match(/^what might happen after (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xEffect', 'oEffect', 'isAfter', 'Causes'], 'possible effect');
    match = clean.match(/^(?:what might happen before|what might be required before) (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xNeed', 'isBefore'], 'possible prerequisite');
    match = clean.match(/^(?:why (?:might|someone might)|what intention might motivate|what reason could there be for) (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xIntent', 'xReason'], 'possible intention or reason');
    match = clean.match(/^(?:how might (?:personx|someone|they) feel after|how could (?:personx|someone|they) react after) (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xReact'], 'possible reaction');
    match = clean.match(/^what might (?:personx|someone|they) want(?: next)? after (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['xWant'], 'possible next desire');
    match = clean.match(/^(?:what could prevent|what might stop) (.+?)\??$/iu);
    if (match) return this.answerFor(match[1], ['HinderedBy'], 'possible obstacle');
    match = clean.match(/^what (?:is|are) (.+?) used for\??$/iu);
    if (match) return this.answerFor(match[1], ['ObjectUse'], 'possible use');
    match = clean.match(/^where (?:is|are) (.+?) (?:found|located)\??$/iu);
    if (match) return this.answerFor(match[1], ['AtLocation'], 'possible location');
    return undefined;
  }
}

async function exists(path) {
  try { await access(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function readManifest(id) {
  return JSON.parse(await readFile(join(PROJECT_ROOT, 'training/KBs', id, 'package/manifest.json'), 'utf8'));
}

async function loadShardDirectory(modelDirectory, manifest) {
  if (!/^[a-z0-9-]+\.json$/u.test(manifest.shardDirectoryRef)) throw new Error('Unsafe public KB shardDirectoryRef.');
  const directory = JSON.parse(await readFile(join(modelDirectory, manifest.shardDirectoryRef), 'utf8'));
  if (!Array.isArray(directory)) throw new Error('Public KB shard directory must be an array.');
  const ids = new Set();
  for (const shard of directory) {
    if (ids.has(shard.shardId)) throw new Error(`Duplicate public KB shard ${shard.shardId}.`);
    ids.add(shard.shardId);
    if (!/^(?:synsets|lemmas|events|countries|names|places|forward|reverse|provenance|ontology)\/[a-z0-9-]+\.json$/u.test(shard.dataRef)) throw new Error(`Unsafe public KB dataRef ${shard.dataRef}.`);
    if (!/^sha256:[a-f0-9]{64}$/u.test(shard.checksum)) throw new Error(`Invalid checksum for public KB shard ${shard.shardId}.`);
  }
  return directory;
}

async function loadEagerData(id, modelDirectory, directory) {
  if (id === 'oewn-2025') {
    const data = { synsets: {}, lemmas: {} };
    for (const shard of directory) {
      const value = (await readGeneratedShard(join(modelDirectory, shard.dataRef), shard.checksum)).value;
      Object.assign(shard.shardKind === 'sourceSynset' ? data.synsets : data.lemmas, value);
    }
    return data;
  }
  if (id === 'geonames-2026' || id === 'conceptnet-5.7.0-en' || id === 'world-relations-1.0') {
    const data = {};
    for (const shard of directory) data[shard.dataRef] = (await readGeneratedShard(join(modelDirectory, shard.dataRef), shard.checksum)).value;
    return data;
  }
  const data = { events: {} };
  for (const shard of directory) Object.assign(data.events,
    (await readGeneratedShard(join(modelDirectory, shard.dataRef), shard.checksum)).value);
  return data;
}

export async function publicKbStatuses() {
  const statuses = [];
  for (const definition of Object.values(PUBLIC_KB_CATALOG)) {
    const built = await exists(join(PROJECT_ROOT, definition.model));
    const manifest = built ? await readManifest(definition.id) : undefined;
    statuses.push({ ...definition, available: built, loaded: false, counts: manifest?.counts, capabilities: manifest?.capabilities, limitations: manifest?.limitations });
  }
  return statuses;
}

export async function loadPublicKnowledgeBase(id, options = {}) {
  const definition = PUBLIC_KB_CATALOG[id];
  if (!definition) throw new Error(`Unknown public knowledge base: ${id}`);
  const modelDirectory = join(PROJECT_ROOT, 'training/KBs', id, 'package');
  const mode = options.mode ?? 'eager';
  const manifest = await readManifest(id);
  if (manifest?.format !== 'eslm-kb-package-v1') throw new Error(`Invalid public KB manifest: ${id}`);
  const directory = await loadShardDirectory(modelDirectory, manifest);
  const shardsByRef = new Map(directory.map((shard) => [shard.dataRef, shard]));
  let model;
  if (mode === 'eager') {
    model = { manifest, data: await loadEagerData(id, modelDirectory, directory) };
  } else {
    model = { manifest };
  }
  const providerOptions = { ...options, mode, modelDirectory, shardsByRef };
  if (id === 'oewn-2025') return new WordNetProvider(model, providerOptions);
  if (id === 'atomic-2020') return new AtomicProvider(model, providerOptions);
  if (id === 'geonames-2026') return new GeoNamesProvider(model, providerOptions);
  if (id === 'conceptnet-5.7.0-en') return new ConceptNetProvider(model, providerOptions);
  if (id === 'world-relations-1.0') return new WorldRelationsProvider(model, providerOptions);
  throw new Error(`No runtime provider for ${id}.`);
}

export async function loadPublicKnowledgeBases(ids, options = {}) {
  const memoryPlan = planPublicKnowledgeMemory(ids, PUBLIC_KB_CATALOG, options);
  const providers = [];
  for (const planned of memoryPlan.providers) providers.push(await loadPublicKnowledgeBase(planned.id, planned));
  return { providers, memoryPlan };
}

export async function validatePublicKnowledgeBase(id) {
  const provider = await loadPublicKnowledgeBase(id, { mode: 'eager' });
  if (id === 'oewn-2025') {
    const synsets = Object.keys(provider.synsets).length;
    const lemmas = Object.keys(provider.lemmas).length;
    if (synsets !== provider.manifest.counts.synsets || lemmas !== provider.manifest.counts.uniqueLemmas) throw new Error('Open English WordNet generated counts do not match its indexes.');
    const smoke = await provider.ask('Is a dog an animal?');
    if (smoke?.values?.[0] !== true) throw new Error('Open English WordNet hypernym smoke test failed.');
    return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
  }
  if (id === 'geonames-2026') {
    const countryData = await provider.countryData();
    if (Object.keys(countryData.countries).length !== provider.manifest.counts.countries) throw new Error('GeoNames country count does not match its index.');
    const smoke = await provider.ask('What is the capital of Romania?');
    if (smoke?.answer !== 'Bucharest') throw new Error('GeoNames capital smoke test failed.');
    return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
  }
  if (id === 'conceptnet-5.7.0-en') {
    const smoke = await provider.ask('What is a knife used for?');
    if (smoke?.status !== 'DEFEASIBLE') throw new Error('ConceptNet purpose smoke test failed.');
    return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
  }
  if (id === 'world-relations-1.0') {
    const smoke = await provider.scoreCompatibility('Pavo is to the left of Luma.', 'Luma is to the right of Pavo.');
    if (smoke.score <= 0) throw new Error('World relation inverse smoke test failed.');
    return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.score };
  }
  const events = Object.keys(provider.events).length;
  if (events !== provider.manifest.counts.uniqueEvents) throw new Error('ATOMIC generated event count does not match its index.');
  const smoke = await provider.ask('Why might apologize?');
  if (smoke?.status !== 'DEFEASIBLE') throw new Error('ATOMIC intent smoke test failed.');
  return { id, valid: true, counts: provider.manifest.counts, smoke: smoke.answer };
}
