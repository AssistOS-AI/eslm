import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { compileNarrativeSentence } from '../reasoning/narrative-state.mjs';
import { deriveBridgeEvidence } from '../reasoning/typed-event-evidence.mjs';
import { compareTypedEvidence, verifyTypedEvidenceComparison } from '../reasoning/typed-evidence-comparison.mjs';
import { PROJECT_ROOT } from '../paths.mjs';

const CODE_REVISION = '8ed901f038df77b7a4d0d8889255160d351d2b49';
const SPLITS = Object.freeze(['train', 'dev', 'test']);
const FIELDS = Object.freeze(['story_id', 'obs1', 'obs2', 'hyp1', 'hyp2']);
const FILES = Object.freeze({
  train: Object.freeze({
    data: Object.freeze({ path: 'train.jsonl', bytes: 47_306_303, rows: 169_654,
      sha256: '23839e688ba80b8b0d46bde6fef70d09fbaa53d810b6d135e3b61ed664267e0c' }),
    labels: Object.freeze({ path: 'train-labels.lst', bytes: 339_308, rows: 169_654,
      sha256: 'f6876a0da8158651647ed7da9acd33d13037fd009d707b6f6eb764c0bcdc2c5e' }),
  }),
  dev: Object.freeze({
    data: Object.freeze({ path: 'dev.jsonl', bytes: 431_993, rows: 1_532,
      sha256: 'e8a7f2e50aa3812c1e998843888bc94519b2b1aae146a368799eedb235d3c51c' }),
    labels: Object.freeze({ path: 'dev-labels.lst', bytes: 3_064, rows: 1_532,
      sha256: 'd170382e8e562ab2506175b0b01aa0edc851e5f53b2d199750509cdef39a89a1' }),
  }),
  test: Object.freeze({
    data: Object.freeze({ path: 'test.jsonl', bytes: 864_812, rows: 3_059,
      sha256: '93bd86eb8961583b2181ac0834cd9bd26da3fd822f043a4d5bc7bda61a08834f' }),
    labels: Object.freeze({ path: 'test-labels.lst', bytes: 6_118, rows: 3_059,
      sha256: 'f4ffa9df8f82f0e617d9c225dfe0f861889d1a4a9099ea3742633b1ca83899d6' }),
  }),
});

export const ALPHA_NLI_ART_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'alpha-nli-art-official-iclr2020',
  family: 'alphaNLI / ART',
  sourceUrl: 'https://github.com/allenai/abductive-commonsense-reasoning',
  codeRevision: CODE_REVISION,
  codeArchive: Object.freeze({
    path: `training/.cache/benchmarks/alpha-nli-art/source/code-${CODE_REVISION}.tar.gz`,
    bytes: 6_373_037,
    sha256: 'dceb0fdbfda8ba6f0448f529b35c623cfa19a89821549041a5b0a2dcaa801f7a',
    license: 'Apache-2.0',
  }),
  dataArchive: Object.freeze({
    url: 'https://storage.googleapis.com/ai2-mosaic/public/abductive-commonsense-reasoning-iclr2020/anli.zip',
    path: 'training/.cache/benchmarks/alpha-nli-art/source/anli-iclr2020.zip',
    bytes: 5_415_361,
    sha256: '4e00551fd9ee04c92e823a8fe078e017c78b35739b36e8f9f122b4bf8a84b16b',
  }),
  extractedPath: 'training/.cache/benchmarks/alpha-nli-art/extracted/official/anli',
  dataLicense: 'no-explicit-dataset-license-identifier',
  usePolicy: 'local-noncommercial-research-no-redistribution-pending-rights-clarification',
  licenseEvidence: 'The official code repository is Apache-2.0, but neither its README nor the delivered data '
    + 'archive grants the dataset that license. The official Hugging Face card records the dataset license as unknown.',
  paperUrl: 'https://openreview.net/forum?id=Byg1v1HKDB',
  files: FILES,
});

function invariant(condition, path, message) {
  if (!condition) throw new Error(`alphaNLI/ART ${path}: ${message}`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactObject(value, expected, path) {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value), path,
    'expected a JSON object.');
  const actual = Object.keys(value).toSorted();
  const wanted = [...expected].toSorted();
  invariant(actual.length === wanted.length && actual.every((field, index) => field === wanted[index]), path,
    `expected exactly ${wanted.join(', ')}; received ${actual.join(', ')}.`);
}

function sourceText(value, path) {
  invariant(typeof value === 'string' && value.trim().length > 0, path, 'expected non-empty text.');
  return value.normalize('NFKC').trim();
}

function taskText(value) {
  return value.replace(/[\0\r\n\t]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function validateRecord(record, split, line) {
  const path = `${split}.jsonl:${line}`;
  exactObject(record, FIELDS, path);
  return Object.freeze({
    storyId: sourceText(record.story_id, `${path}.story_id`),
    observation1: sourceText(record.obs1, `${path}.obs1`),
    observation2: sourceText(record.obs2, `${path}.obs2`),
    hypothesis1: sourceText(record.hyp1, `${path}.hyp1`),
    hypothesis2: sourceText(record.hyp2, `${path}.hyp2`),
  });
}

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, ALPHA_NLI_ART_SOURCE.extractedPath);
}

async function readLabels(root, split) {
  const descriptor = FILES[split].labels;
  const bytes = await readFile(join(root, descriptor.path));
  invariant(bytes.length === descriptor.bytes, descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${bytes.length}.`);
  invariant(sha256(bytes) === descriptor.sha256, descriptor.path, 'SHA-256 differs from the frozen source.');
  const labels = bytes.toString('utf8').trimEnd().split(/\r?\n/u);
  invariant(labels.length === descriptor.rows, descriptor.path,
    `expected ${descriptor.rows} labels, received ${labels.length}.`);
  for (const [index, label] of labels.entries()) {
    invariant(label === '1' || label === '2', `${descriptor.path}:${index + 1}`, 'expected label 1 or 2.');
  }
  return labels;
}

function visibleSignature(record) {
  return sha256([
    record.storyId, record.observation1, record.observation2, record.hypothesis1, record.hypothesis2,
  ].join('\0'));
}

function taskId(split, record) {
  return `alpha-nli-art:${split}:${visibleSignature(record).slice(0, 32)}`;
}

function candidate(candidateIndex, text, eventIndex) {
  const normalizedText = taskText(text);
  return Object.freeze({
    candidateId: `candidate:${candidateIndex}:${sha256(normalizedText).slice(0, 24)}`,
    bridgeText: normalizedText,
    event: compileNarrativeSentence(normalizedText, eventIndex),
  });
}

function visibleTask(record, split) {
  return Object.freeze({
    taskId: taskId(split, record),
    operation: 'select-narrative-bridge',
    sourceSplit: split,
    before: compileNarrativeSentence(taskText(record.observation1), 0),
    after: compileNarrativeSentence(taskText(record.observation2), 2),
    candidates: Object.freeze([
      candidate(1, record.hypothesis1, 1),
      candidate(2, record.hypothesis2, 1),
    ]),
    outputContract: Object.freeze({ kind: 'candidate-id' }),
  });
}

async function streamSplit(root, split, onRecord) {
  invariant(SPLITS.includes(split), 'split', `unknown split ${split}.`);
  const descriptor = FILES[split].data;
  const details = await stat(join(root, descriptor.path));
  invariant(details.size === descriptor.bytes, descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  const labels = await readLabels(root, split);
  const digest = createHash('sha256');
  const stream = createReadStream(join(root, descriptor.path));
  stream.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const storyIds = new Set();
  const visibleCases = new Set();
  const labelCounts = { '1': 0, '2': 0 };
  let rows = 0;
  let repeatedStoryIds = 0;
  let duplicateVisibleCases = 0;
  let identicalHypotheses = 0;
  let recordsWithEmbeddedLineBreaks = 0;
  let recordsWithReplacementCharacters = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    rows += 1;
    let sourceRecord;
    try {
      sourceRecord = JSON.parse(line);
    } catch (error) {
      throw new Error(`alphaNLI/ART ${descriptor.path}:${rows}: invalid JSON: ${error.message}`);
    }
    const record = validateRecord(sourceRecord, split, rows);
    const signature = visibleSignature(record);
    repeatedStoryIds += Number(storyIds.has(record.storyId));
    duplicateVisibleCases += Number(visibleCases.has(signature));
    identicalHypotheses += Number(record.hypothesis1 === record.hypothesis2);
    recordsWithEmbeddedLineBreaks += Number([
      record.observation1, record.observation2, record.hypothesis1, record.hypothesis2,
    ].some((value) => /[\r\n]/u.test(value)));
    recordsWithReplacementCharacters += Number([
      record.observation1, record.observation2, record.hypothesis1, record.hypothesis2,
    ].some((value) => value.includes('\uFFFD')));
    storyIds.add(record.storyId);
    visibleCases.add(signature);
    labelCounts[labels[rows - 1]] += 1;
    await onRecord?.(record, labels[rows - 1], rows);
  }
  invariant(rows === descriptor.rows, descriptor.path,
    `expected ${descriptor.rows} rows, received ${rows}.`);
  invariant(digest.digest('hex') === descriptor.sha256, descriptor.path,
    'SHA-256 differs from the frozen source.');
  return Object.freeze({
    split, rows, uniqueStoryIds: storyIds.size, repeatedStoryIds, duplicateVisibleCases,
    identicalHypotheses, recordsWithEmbeddedLineBreaks, recordsWithReplacementCharacters,
    labelCounts: Object.freeze(labelCounts),
    membershipSha256: sha256([...visibleCases].toSorted().join('\n')),
    dataBytes: descriptor.bytes, dataSha256: descriptor.sha256,
    labelBytes: FILES[split].labels.bytes, labelSha256: FILES[split].labels.sha256,
  });
}

export async function hasAlphaNliArtSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function inventoryAlphaNliArtSource(options = {}) {
  const root = sourceRoot(options);
  const splits = [];
  for (const split of SPLITS) splits.push(await streamSplit(root, split));
  return Object.freeze({
    format: 'eslm-alpha-nli-art-source-inventory-v1',
    source: ALPHA_NLI_ART_SOURCE,
    splits: Object.freeze(splits),
    sourceRows: splits.reduce((sum, item) => sum + item.rows, 0),
    sourceSetSha256: sha256(splits.map((item) =>
      `${item.split}\0${item.rows}\0${item.dataSha256}\0${item.labelSha256}`).join('\n')),
    validation: 'all-official-JSONL-and-label-files-streamed-through-closed-schemas',
    sizePolicy: 'complete frozen split files retained; sequential reads; no row or byte quota discards valid records',
    lifecycle: Object.freeze({
      train: 'training-visible',
      dev: 'development-visible-with-host-only-oracle',
      test: 'sealed-fresh-official-split; source identity and aggregate schema validated; no loader exported',
    }),
  });
}

export function adaptAlphaNliArtDevelopmentRecord(sourceRecord, label = '1', line = 1) {
  invariant(Number.isInteger(line) && line > 0, 'line', 'expected a positive source line number.');
  invariant(label === '1' || label === '2', 'label', 'expected label 1 or 2.');
  const record = validateRecord(sourceRecord, 'dev', line);
  const visible = visibleTask(record, 'dev');
  return Object.freeze({
    visible,
    oracle: Object.freeze({
      preferredCandidateId: visible.candidates[Number(label) - 1].candidateId,
    }),
  });
}

export function compileAlphaNliArtEvidenceTask(task) {
  invariant(task?.operation === 'select-narrative-bridge', 'typed evidence',
    'expected a narrative bridge task.');
  const alternatives = task.candidates.map((candidate) => candidate.candidateId);
  const evidence = deriveBridgeEvidence({ before: task.before, after: task.after,
    candidates: task.candidates.map((candidate) => ({ alternativeId: candidate.candidateId,
      event: candidate.event })), taskRef: task.taskId });
  return Object.freeze({ alternatives: Object.freeze(alternatives), evidence,
    policy: Object.freeze({ minimumMargin: 100,
      familyWeights: Object.freeze({ causal: 1, contradiction: 1, participant: 1, state: 1, temporal: 1 }) }) });
}

export function selectAlphaNliArtBridge(task) {
  const evidenceTask = compileAlphaNliArtEvidenceTask(task);
  const result = compareTypedEvidence(evidenceTask);
  return Object.freeze({ ...result,
    witnessValid: verifyTypedEvidenceComparison(evidenceTask, result),
    languageAgentInvocations: 0 });
}

async function collectDevelopment(options = {}) {
  const cases = [];
  const oracle = new Map();
  const inventory = await streamSplit(sourceRoot(options), 'dev', (record, label) => {
    const visible = visibleTask(record, 'dev');
    invariant(!oracle.has(visible.taskId), 'dev', `duplicate derived task ID ${visible.taskId}.`);
    cases.push(visible);
    oracle.set(visible.taskId, visible.candidates[Number(label) - 1].candidateId);
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle, inventory });
}

export async function loadAlphaNliArtDevelopmentPool(options = {}) {
  const collected = await collectDevelopment(options);
  return Object.freeze({
    format: 'eslm-alpha-nli-art-label-free-development-pool-v1',
    available: collected.inventory.rows,
    cases: collected.cases,
    oracle: 'host-only-not-returned',
    fresh: 'official-test-split-sealed-no-loader-exported',
  });
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

export async function runAlphaNliArtDevelopmentProbe(engine, options = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine',
    'expected an ESLM-compatible task engine.');
  const collected = await collectDevelopment(options);
  const statusCounts = {};
  let answered = 0;
  let correct = 0;
  let witnessBearing = 0;
  for (const task of collected.cases) {
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    increment(statusCounts, status);
    const prediction = result?.values?.length === 1 ? result.values[0] : undefined;
    if (prediction === undefined) continue;
    answered += 1;
    correct += Number(prediction === collected.oracle.get(task.taskId));
    witnessBearing += Number(result.witness !== undefined);
  }
  return Object.freeze({
    format: 'eslm-alpha-nli-art-development-result-v1',
    evidenceRegime: 'complete-official-development-split-with-host-only-preference-oracle',
    claimBoundary: 'direct typed narrative-bridge tasks; not an official leaderboard submission and not '
      + 'evidence of unrestricted natural-language plausibility',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    tested: collected.cases.length,
    available: collected.inventory.rows,
    answered,
    correct,
    accuracyOnAnswered: answered ? correct / answered : null,
    statusCounts: Object.freeze(statusCounts),
    witnessBearing,
    normalizationCandidates: 0,
    languageAgentInvocations: 0,
    fresh: Object.freeze({
      executed: false,
      available: FILES.test.data.rows,
      visibility: 'sealed-official-test-split-no-loader-exported',
    }),
  });
}

export async function runAlphaNliArtTypedDevelopmentProbe(options = {}) {
  const collected = await collectDevelopment(options);
  const statusCounts = {};
  let answered = 0;
  let correct = 0;
  let witnessValid = 0;
  for (const task of collected.cases) {
    const result = selectAlphaNliArtBridge(task);
    increment(statusCounts, result.status);
    const prediction = result.values.length === 1 ? result.values[0] : undefined;
    if (prediction === undefined) continue;
    answered += 1;
    correct += Number(prediction === collected.oracle.get(task.taskId));
    witnessValid += Number(result.witnessValid);
  }
  return Object.freeze({ format: 'eslm-alpha-nli-art-typed-evidence-development-result-v1',
    evidenceRegime: 'complete-official-development-with-host-only-preference-oracle',
    tested: collected.cases.length, available: collected.inventory.rows,
    answered, unknown: collected.cases.length - answered, correct,
    coverage: answered / collected.cases.length,
    accuracyOnAnswered: answered ? correct / answered : null,
    statusCounts: Object.freeze(statusCounts), witnessValid,
    languageAgentInvocations: 0,
    fresh: Object.freeze({ executed: false, available: FILES.test.data.rows,
      visibility: 'sealed-official-test-split-no-loader-exported' }) });
}
