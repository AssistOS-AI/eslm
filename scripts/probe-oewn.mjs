#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { ExecutionProfiler } from '../src/profiling.mjs';
import { hashFile } from '../src/util.mjs';

function option(name, fallback) {
  const position = process.argv.indexOf(name);
  return position === -1 ? fallback : process.argv[position + 1];
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function orderedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function topEntries(map, count = 20) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, count)
    .map(([value, occurrences]) => ({ value, occurrences }));
}

function valueShape(value) {
  if (Array.isArray(value)) {
    const elementTypes = [...new Set(value.map((item) => item === null ? 'null' : typeof item))].sort();
    return `array<${elementTypes.join('|') || 'empty'}>`;
  }
  return value === null ? 'null' : typeof value;
}

const archive = resolve(option('--archive', 'training/.cache/corpora/oewn-2025/english-wordnet-2025-json.zip'));
const output = resolve(option('--output', 'training/KBs/oewn-2025/probe/probe-report.json'));
const publishOutput = option('--publish-output');
const profiler = new ExecutionProfiler('corpus-probe', true, { corpus: 'oewn-2025', sourceArtifact: 'english-wordnet-2025-json.zip' });
const metadataFields = new Set(['definition', 'example', 'ili', 'members', 'partOfSpeech', 'source']);
const externalReferenceFields = new Set(['wikidata']);

const archiveFiles = profiler.measureSync('archive.inventory', () => execFileSync(
  'unzip', ['-Z1', archive], { encoding: 'utf8', maxBuffer: 1024 * 1024 },
).trim().split('\n').filter((name) => name.endsWith('.json')).sort());
const archiveSha256 = await profiler.measure('archive.hash', () => hashFile(archive));

const entryFiles = archiveFiles.filter((name) => name.startsWith('entries-'));
const synsetFiles = archiveFiles.filter((name) => !name.startsWith('entries-') && name !== 'frames.json');
const synsetIds = new Set();
const lemmaSynsets = new Map();
const partOfSpeech = new Map();
const lexicalFiles = new Map();
const synsetFieldShapes = new Map();
const relationOccurrences = new Map();
const relationTargets = new Map();
const fileProfiles = [];
let synsetCount = 0;
let memberOccurrences = 0;
let definitionCount = 0;
let exampleCount = 0;
let maxMembers = 0;
let maxDefinitionLength = 0;

function readJson(name, pass) {
  const started = performance.now();
  const before = process.memoryUsage().heapUsed;
  const bytes = execFileSync('unzip', ['-p', archive, name], { maxBuffer: 16 * 1024 * 1024 });
  const value = JSON.parse(bytes.toString('utf8'));
  fileProfiles.push({
    pass,
    file: name,
    bytes: bytes.length,
    durationMs: Math.round((performance.now() - started) * 1000) / 1000,
    heapDeltaBytes: process.memoryUsage().heapUsed - before,
    records: Object.keys(value).length,
  });
  return value;
}

profiler.measureSync('synsets.inventory', () => {
  for (const name of synsetFiles) {
    const records = readJson(name, 'inventory');
    increment(lexicalFiles, name.replace(/\.json$/, ''), Object.keys(records).length);
    for (const [synsetId, record] of Object.entries(records)) {
      synsetIds.add(synsetId);
      synsetCount += 1;
      increment(partOfSpeech, record.partOfSpeech ?? 'missing');
      const members = Array.isArray(record.members) ? record.members : [];
      memberOccurrences += members.length;
      maxMembers = Math.max(maxMembers, members.length);
      for (const member of members) {
        const normalized = member.toLocaleLowerCase('en-US');
        let senses = lemmaSynsets.get(normalized);
        if (!senses) {
          senses = new Set();
          lemmaSynsets.set(normalized, senses);
        }
        senses.add(synsetId);
      }
      definitionCount += record.definition?.length ?? 0;
      exampleCount += record.example?.length ?? 0;
      for (const definition of record.definition ?? []) {
        maxDefinitionLength = Math.max(maxDefinitionLength, definition.length);
      }
      for (const [field, value] of Object.entries(record)) {
        increment(synsetFieldShapes, `${field}:${valueShape(value)}`);
        if (metadataFields.has(field)) continue;
        increment(relationOccurrences, field);
        increment(relationTargets, field, Array.isArray(value) ? value.length : 0);
      }
    }
  }
}, { files: synsetFiles.length });

const entryPartOfSpeech = new Map();
const entryFieldShapes = new Map();
const senseFieldShapes = new Map();
const referencedSynsets = new Set();
const senseIds = new Set();
let lemmaCount = 0;
let entryPosRecords = 0;
let senseCount = 0;
let pronunciationCount = 0;
let duplicateSenseIds = 0;

profiler.measureSync('entries.inventory', () => {
  for (const name of entryFiles) {
    const records = readJson(name, 'entries');
    for (const [, posEntries] of Object.entries(records)) {
      lemmaCount += 1;
      for (const [pos, entry] of Object.entries(posEntries)) {
        entryPosRecords += 1;
        increment(entryPartOfSpeech, pos);
        for (const [field, value] of Object.entries(entry)) {
          increment(entryFieldShapes, `${field}:${valueShape(value)}`);
        }
        pronunciationCount += entry.pronunciation?.length ?? 0;
        for (const sense of entry.sense ?? []) {
          senseCount += 1;
          if (senseIds.has(sense.id)) duplicateSenseIds += 1;
          senseIds.add(sense.id);
          if (sense.synset) referencedSynsets.add(sense.synset);
          for (const [field, value] of Object.entries(sense)) {
            increment(senseFieldShapes, `${field}:${valueShape(value)}`);
          }
        }
      }
    }
  }
}, { files: entryFiles.length });

let relationEdgeCount = 0;
let missingRelationTargets = 0;
let selfRelations = 0;
let missingEntryTargets = 0;
const missingByRelation = new Map();
const externalReferenceTargets = new Map();
const hypernymGraph = new Map();

profiler.measureSync('references.validate', () => {
  for (const name of synsetFiles) {
    const records = readJson(name, 'references');
    for (const [synsetId, record] of Object.entries(records)) {
      for (const [field, value] of Object.entries(record)) {
        if (metadataFields.has(field) || !Array.isArray(value) || value.some((item) => typeof item !== 'string')) continue;
        if (externalReferenceFields.has(field)) {
          increment(externalReferenceTargets, field, value.length);
          continue;
        }
        for (const target of value) {
          relationEdgeCount += 1;
          if (target === synsetId) selfRelations += 1;
          if (!synsetIds.has(target)) {
            missingRelationTargets += 1;
            increment(missingByRelation, field);
          }
          if (field === 'hypernym' || field === 'instance_hypernym') {
            const targets = hypernymGraph.get(synsetId) ?? [];
            targets.push(target);
            hypernymGraph.set(synsetId, targets);
          }
        }
      }
    }
  }
  for (const target of referencedSynsets) {
    if (!synsetIds.has(target)) missingEntryTargets += 1;
  }
}, { files: synsetFiles.length });

const indegree = new Map([...synsetIds].map((id) => [id, 0]));
for (const targets of hypernymGraph.values()) {
  for (const target of targets) {
    if (indegree.has(target)) indegree.set(target, indegree.get(target) + 1);
  }
}
const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
let cursor = 0;
while (cursor < queue.length) {
  const id = queue[cursor++];
  for (const target of hypernymGraph.get(id) ?? []) {
    if (!indegree.has(target)) continue;
    const degree = indegree.get(target) - 1;
    indegree.set(target, degree);
    if (degree === 0) queue.push(target);
  }
}
const nodesRemainingAfterTopologicalReduction = [...indegree.values()].filter((degree) => degree > 0).length;
const ambiguityHistogram = new Map();
for (const senses of lemmaSynsets.values()) increment(ambiguityHistogram, String(senses.size));
const ambiguousLemmas = new Map([...lemmaSynsets].map(([lemma, senses]) => [lemma, senses.size]).filter(([, count]) => count > 1));
const slowestFiles = [...fileProfiles].sort((left, right) => right.durationMs - left.durationMs).slice(0, 12);
const largestFiles = [...fileProfiles]
  .filter((item) => item.pass === 'inventory' || item.pass === 'entries')
  .sort((left, right) => right.bytes - left.bytes)
  .slice(0, 12);

const report = {
  format: 'eslm-corpus-probe-v1',
  corpus: 'oewn-2025',
  status: 'probe-complete-architecture-gate-still-blocked',
  scope: 'The complete moderate archive was scanned, while examples retained by this report remain bounded.',
  source: {
    release: '2025',
    officialUrl: 'https://en-word.net/static/english-wordnet-2025-json.zip',
    license: 'CC BY 4.0 with Princeton WordNet attribution retained',
    sha256: archiveSha256,
  },
  archive: {
    compressedBytes: statSync(archive).size,
    jsonFiles: archiveFiles.length,
    synsetFiles: synsetFiles.length,
    entryFiles: entryFiles.length,
  },
  synsets: {
    count: synsetCount,
    partOfSpeech: orderedObject(partOfSpeech),
    lexicalFiles: orderedObject(lexicalFiles),
    memberOccurrences,
    uniqueNormalizedMembers: lemmaSynsets.size,
    ambiguousNormalizedMembers: ambiguousLemmas.size,
    ambiguityHistogram: orderedObject(ambiguityHistogram),
    mostAmbiguousMembers: topEntries(ambiguousLemmas, 20),
    definitions: definitionCount,
    examples: exampleCount,
    maximumMembersPerSynset: maxMembers,
    maximumDefinitionCharacters: maxDefinitionLength,
    fieldShapes: orderedObject(synsetFieldShapes),
  },
  lexicalEntries: {
    lemmas: lemmaCount,
    partOfSpeechRecords: entryPosRecords,
    partOfSpeech: orderedObject(entryPartOfSpeech),
    senses: senseCount,
    uniqueSenseIds: senseIds.size,
    duplicateSenseIds,
    pronunciations: pronunciationCount,
    entryFieldShapes: orderedObject(entryFieldShapes),
    senseFieldShapes: orderedObject(senseFieldShapes),
  },
  relations: {
    occurrencesBySynset: orderedObject(relationOccurrences),
    targetCounts: orderedObject(relationTargets),
    totalStringTargets: relationEdgeCount,
    missingRelationTargets,
    missingByRelation: orderedObject(missingByRelation),
    externalReferenceTargets: orderedObject(externalReferenceTargets),
    selfRelations,
    missingLexicalEntryTargets: missingEntryTargets,
    hypernymNodesRemainingAfterTopologicalReduction: nodesRemainingAfterTopologicalReduction,
  },
  performance: {
    slowestFilePasses: slowestFiles,
    largestLogicalFiles: largestFiles,
    note: 'Each JSON member is parsed independently; the largest logical member bounds parser memory for this probe. Generated-model memory is not measured here.',
  },
  findings: [
    'The archive is already divided by lexical file and lemma initial; these are useful source partitions but are not necessarily optimal query shards.',
    'Surface members are many-to-many with synsets. The v1 globally unique alias table cannot represent this polysemy and must become a lemma-to-sense candidate index.',
    'Adjective satellites use a distinct s part-of-speech code and must not be silently collapsed before relation semantics are preserved.',
    'Lexical-entry part-of-speech keys may carry homograph suffixes such as n-1 and n-2; an adapter must split base POS from homograph identity instead of rejecting them as unknown POS values.',
    'Definitions and examples are textual evidence, not automatically executable universal facts.',
    'Wikidata values are external identifiers, not synset targets; reference validation must dispatch by field semantics rather than by JSON value shape alone.',
    'Synset relations include domain and lexical-semantic links with different symmetry, transitivity, and inference safety; relation-specific policies are mandatory.',
    'Lexical entry senses contain their own fields and must retain sense identity instead of treating every member of a synset as an interchangeable global entity alias.',
  ],
  gateDecision: {
    fullCompilationAuthorized: false,
    reasons: [
      'sense-aware entity resolution is not implemented',
      'dictionary and immutable relation-shard model v2 is not implemented',
      'query-directed shard loading and bounded top-down reasoning are not implemented',
      'streaming validation budgets and cold/warm query budgets are not yet enforced',
    ],
    next: 'Build a sense-aware dictionary plus noun.animal and noun.Tops shard prototype, then run ambiguity, taxonomy, negative-query, cold-import, and memory profiles.',
  },
};

report.profile = profiler.finish('ok', {
  synsets: synsetCount,
  lexicalEntries: lemmaCount,
  senses: senseCount,
  relationTargets: relationEdgeCount,
});
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
if (publishOutput) {
  const published = resolve(publishOutput);
  await mkdir(dirname(published), { recursive: true });
  await writeFile(published, `${JSON.stringify(report, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify({ output, publishOutput: publishOutput ? resolve(publishOutput) : undefined, status: report.status, synsets: synsetCount, senses: senseCount })}\n`);
