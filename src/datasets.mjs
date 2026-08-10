import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { readJsonLines, writeJson, writeJsonLines } from './io.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { sha256 } from './util.mjs';

export const DATASET_CATALOG = Object.freeze({
  'babi-2-en-10k-v1.2': Object.freeze({
    family: 'bAbI', task: 2, taskName: 'two-supporting-facts', language: 'en', scale: '10k', version: '1.2',
    source: 'https://s3.amazonaws.com/text-datasets/babi_tasks_1-20_v1-2.tar.gz',
    expectedSha256: '84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c',
    licenseStatus: 'research dataset; cached locally and not redistributed',
    adapterStatus: 'prepared-not-synthesized', trainingStatus: 'not-started', evaluationStatus: 'not-run',
    archiveCache: 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz',
    files: Object.freeze({ train: 'qa2_two-supporting-facts_train.txt', test: 'qa2_two-supporting-facts_test.txt' }),
  }),
  'babi-3-en-10k-v1.2': Object.freeze({
    family: 'bAbI', task: 3, taskName: 'three-supporting-facts', language: 'en', scale: '10k', version: '1.2',
    source: 'https://s3.amazonaws.com/text-datasets/babi_tasks_1-20_v1-2.tar.gz',
    expectedSha256: '84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c',
    licenseStatus: 'research dataset; cached locally and not redistributed',
    adapterStatus: 'prepared-not-synthesized', trainingStatus: 'not-started', evaluationStatus: 'not-run',
    archiveCache: 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz',
    files: Object.freeze({ train: 'qa3_three-supporting-facts_train.txt', test: 'qa3_three-supporting-facts_test.txt' }),
  }),
  'babi-15-en-10k-v1.2': Object.freeze({
    family: 'bAbI',
    task: 15,
    taskName: 'basic-deduction',
    language: 'en',
    scale: '10k',
    version: '1.2',
    source: 'https://s3.amazonaws.com/text-datasets/babi_tasks_1-20_v1-2.tar.gz',
    expectedSha256: '84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c',
    licenseStatus: 'research dataset; cached locally and not redistributed',
    adapterStatus: 'implemented-and-run',
    trainingStatus: 'single-agent-full-train-analysis-recorded; ledger-not-journaled',
    evaluationStatus: '1000-of-1000-correct',
    archiveCache: 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz',
    files: Object.freeze({
      train: 'qa15_basic-deduction_train.txt',
      test: 'qa15_basic-deduction_test.txt',
    }),
  }),
  'babi-16-en-10k-v1.2': Object.freeze({
    family: 'bAbI',
    task: 16,
    taskName: 'basic-induction',
    language: 'en',
    scale: '10k',
    version: '1.2',
    source: 'https://s3.amazonaws.com/text-datasets/babi_tasks_1-20_v1-2.tar.gz',
    expectedSha256: '84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c',
    licenseStatus: 'research dataset; cached locally and not redistributed',
    adapterStatus: 'prepared-not-synthesized',
    trainingStatus: 'not-started',
    evaluationStatus: 'not-run',
    archiveCache: 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz',
    files: Object.freeze({
      train: 'qa16_basic-induction_train.txt',
      test: 'qa16_basic-induction_test.txt',
    }),
  }),
});

function datasetDirectory(id) {
  return join(PROJECT_ROOT, 'training/datasets', id);
}

async function existingArchive(path, expectedSha256) {
  try {
    const bytes = await readFile(path);
    const digest = sha256(bytes);
    if (expectedSha256 && digest !== expectedSha256) throw new Error(`Cached archive hash mismatch: ${digest}`);
    return { bytes, digest, cached: true };
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function tarEntries(archive) {
  const entries = [];
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '');
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`Invalid TAR size for ${name}.`);
    const start = offset + 512;
    entries.push({ name, bytes: archive.subarray(start, start + size) });
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}

export async function fetchDataset(id) {
  const definition = DATASET_CATALOG[id];
  if (!definition) throw new Error(`Unknown dataset: ${id}`);
  const directory = datasetDirectory(id);
  const archivePath = definition.archiveCache
    ? join(PROJECT_ROOT, definition.archiveCache)
    : join(directory, 'cache', basename(new URL(definition.source).pathname));
  let archive = await existingArchive(archivePath, definition.expectedSha256);
  if (!archive) {
    const response = await fetch(definition.source);
    if (!response.ok) throw new Error(`Dataset download failed with HTTP ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const digest = sha256(bytes);
    if (definition.expectedSha256 && digest !== definition.expectedSha256) {
      throw new Error(`Downloaded archive hash mismatch: ${digest}`);
    }
    await mkdir(dirname(archivePath), { recursive: true });
    await writeFile(archivePath, bytes);
    archive = { bytes, digest, cached: false };
  }
  const decompressed = gunzipSync(archive.bytes);
  const entries = tarEntries(decompressed);
  const extracted = {};
  for (const [split, filename] of Object.entries(definition.files)) {
    const matches = entries.filter((entry) => entry.name.endsWith(`/en-10k/${filename}`));
    if (matches.length !== 1) throw new Error(`Expected one ${filename} entry, found ${matches.length}.`);
    const output = join(directory, 'raw', filename);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, matches[0].bytes);
    extracted[split] = {
      path: relative(PROJECT_ROOT, output),
      bytes: matches[0].bytes.length,
      sha256: sha256(matches[0].bytes),
    };
  }
  const manifest = {
    format: 'eslm-dataset-cache-v1',
    id,
    definition,
    archive: {
      path: relative(PROJECT_ROOT, archivePath),
      bytes: archive.bytes.length,
      sha256: archive.digest,
      reused: archive.cached,
    },
    extracted,
  };
  await writeJson(join(directory, 'cache-manifest.json'), manifest);
  return manifest;
}

export function parseBabi(text, split, datasetId) {
  const cases = [];
  let statements = [];
  let sourceLines = new Map();
  for (const rawLine of text.split(/\r?\n/u)) {
    if (!rawLine.trim()) continue;
    const line = rawLine.match(/^(\d+)\s+(.+)$/u);
    if (!line) throw new Error(`Invalid bAbI line: ${rawLine}`);
    const lineId = Number(line[1]);
    if (lineId === 1) {
      statements = [];
      sourceLines = new Map();
    }
    const fields = line[2].split('\t');
    if (fields.length === 1) {
      statements.push(fields[0]);
      sourceLines.set(lineId, fields[0]);
      continue;
    }
    if (fields.length !== 3) throw new Error(`Invalid bAbI question line: ${rawLine}`);
    const supportIds = fields[2].split(' ').filter(Boolean).map(Number);
    cases.push({
      id: `${datasetId}:${split}:${cases.length + 1}`,
      kind: 'qa',
      context: statements.join(' '),
      text: fields[0],
      answer: fields[1],
      values: [fields[1]],
      supportIds,
      support: supportIds.map((id) => sourceLines.get(id)),
    });
  }
  return cases;
}

export async function prepareDataset(id, chunkSize = 500) {
  const definition = DATASET_CATALOG[id];
  if (!definition) throw new Error(`Unknown dataset: ${id}`);
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('chunkSize must be a positive integer.');
  const directory = datasetDirectory(id);
  const preparedDirectory = join(directory, 'prepared');
  const splits = {};
  for (const split of ['train', 'test']) {
    const rawPath = join(directory, 'raw', definition.files[split]);
    const cases = parseBabi(await readFile(rawPath, 'utf8'), split, id);
    const splitPath = join(preparedDirectory, `${split}.jsonl`);
    await writeJsonLines(splitPath, cases);
    splits[split] = {
      path: relative(PROJECT_ROOT, splitPath),
      cases: cases.length,
      sha256: sha256(await readFile(splitPath)),
    };
    if (split === 'train') {
      const chunks = [];
      for (let offset = 0; offset < cases.length; offset += chunkSize) {
        const records = cases.slice(offset, offset + chunkSize).map((item) => ({
          type: 'document', id: item.id, text: `${item.context} ${item.text}`,
          metadata: { answer: item.answer, support: item.support, task: definition.task },
        }));
        const chunkPath = join(preparedDirectory, 'train-chunks', `chunk-${String(chunks.length + 1).padStart(4, '0')}.jsonl`);
        await writeJsonLines(chunkPath, records);
        chunks.push({ path: relative(PROJECT_ROOT, chunkPath), records: records.length, sha256: sha256(await readFile(chunkPath)) });
      }
      splits.train.chunks = chunks;
    }
  }
  const manifest = {
    format: 'eslm-prepared-dataset-v1', id, definition, chunkSize, splits,
    leakagePolicy: { train: 'agent-visible', test: 'agent-hidden' },
  };
  await writeJson(join(preparedDirectory, 'manifest.json'), manifest);
  return manifest;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function analyzeDatasetTraining(id) {
  const definition = DATASET_CATALOG[id];
  if (!definition) throw new Error(`Unknown dataset: ${id}`);
  if (definition.task !== 15) {
    throw new Error(`Train analysis for ${id} requires a task-specific semantic analyzer; fetch and prepare are available.`);
  }
  const directory = datasetDirectory(id);
  const trainPath = join(directory, 'prepared', 'train.jsonl');
  const cases = await readJsonLines(trainPath);
  const names = new Set();
  const classes = new Set();
  const universalRules = new Map();
  const answers = new Map();
  const supportDepths = new Map();
  let membershipStatements = 0;
  let unsupportedStatements = 0;
  for (const item of cases) {
    increment(answers, item.answer);
    increment(supportDepths, String(item.supportIds.length));
    for (const sentence of item.context.match(/[^.]+\./gu) ?? []) {
      let match = sentence.trim().match(/^([A-Z][a-z]+) are afraid of ([a-z]+)\.$/u);
      if (match) {
        classes.add(match[1].toLocaleLowerCase('en-US'));
        classes.add(match[2]);
        increment(universalRules, `${match[1].toLocaleLowerCase('en-US')} -> ${match[2]}`);
        continue;
      }
      match = sentence.trim().match(/^([A-Z][a-z]+) is a ([a-z]+)\.$/u);
      if (match) {
        names.add(match[1]);
        classes.add(match[2]);
        membershipStatements += 1;
        continue;
      }
      unsupportedStatements += 1;
    }
  }
  const analysis = {
    format: 'eslm-training-analysis-v1',
    dataset: id,
    trainOnly: true,
    trainDigest: sha256(await readFile(trainPath)),
    cases: cases.length,
    uniqueNames: [...names].sort(),
    classes: [...classes].sort(),
    membershipStatements,
    universalRuleSignatures: universalRules.size,
    universalRuleObservations: [...universalRules.values()].reduce((sum, value) => sum + value, 0),
    answers: Object.fromEntries([...answers].sort()),
    supportDepths: Object.fromEntries([...supportDepths].sort()),
    unsupportedStatements,
    promotedStructures: {
      constructions: ['CLASS are afraid of CLASS', 'ENTITY is a CLASS', 'what is ENTITY afraid of'],
      morphology: { mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' },
      persistentEpisodeFacts: 0,
    },
  };
  await writeJson(join(directory, 'prepared', 'training-analysis.json'), analysis);
  return analysis;
}

export async function datasetStatus(id) {
  const definition = DATASET_CATALOG[id];
  if (!definition) throw new Error(`Unknown dataset: ${id}`);
  const directory = datasetDirectory(id);
  const readOptional = async (name) => {
    try { return JSON.parse(await readFile(join(directory, name), 'utf8')); } catch (error) {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }
  };
  const cache = await readOptional('cache-manifest.json');
  const prepared = await readOptional('prepared/manifest.json');
  let diskBytes = 0;
  const archivePath = definition.archiveCache
    ? join(PROJECT_ROOT, definition.archiveCache)
    : join(directory, 'cache', basename(new URL(definition.source).pathname));
  try { diskBytes = (await stat(archivePath)).size; } catch {}
  return { id, definition, cached: Boolean(cache), prepared: Boolean(prepared), diskBytes, cache, preparedManifest: prepared };
}
