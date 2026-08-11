import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import {
  buildLogicalMultipleChoiceTask,
  isolateLogicalMultipleChoiceOracle,
  logicalChoiceInvariant,
  requireLogicalChoiceText,
  runLogicalMultipleChoiceProbe,
} from './logical-multiple-choice.mjs';
import { streamJsonObjectArray } from './source-streams.mjs';

const CODE_REVISION = '19b9d6c6025866ceafb4a4028819654b3817069b';
const EXTRACTED_PATH = 'training/.cache/benchmarks/reclor/extracted/v1';
const FILES = Object.freeze({
  train: Object.freeze({ name: 'ReClor train.json', path: 'train.json', rows: 4_638, bytes: 4_962_601,
    sha256: 'e9b92a11e5d89e0966aadee7b35773d48e5d6ec86c03ba5f6011acd475d04157' }),
  development: Object.freeze({ name: 'ReClor val.json', path: 'val.json', rows: 500, bytes: 545_706,
    sha256: '49a43973d7cf00d5e0d645daad864efca8e10497ced241f32afa4bd260233159' }),
  test: Object.freeze({ name: 'ReClor test.json', path: 'test.json', rows: 1_000, bytes: 1_080_957,
    sha256: '94f568119bc30696459db950da4489c7f6b41a1865bca0b5f44368cf4588ed36' }),
  questionTypes: Object.freeze({ name: 'ReClor question_type_names.json', path: 'question_type_names.json',
    rows: null, bytes: 287, sha256: 'ab8eb9909ba91c2382c35dc1c04d4c28263e9985420f692556b0ea0a406cb015' }),
  sourceList: Object.freeze({ name: 'ReClor source_list.txt', path: 'source_list.txt', rows: null, bytes: 540,
    sha256: '5bc64dfe30ed38dfefe97946ec3614449a78acd45ae1536381e5ec5231912ec3' }),
  useItems: Object.freeze({ name: 'ReClor use_items.txt', path: 'use_items.txt', rows: null, bytes: 659,
    sha256: 'bd80d35fc4bd7db8b19ecfb25880fea3fc586b26fee0d979f8f5854b4451c865' }),
});

export const RECLOR_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'reclor-official-v1',
  family: 'ReClor',
  repositoryUrl: 'https://github.com/yuweihao/reclor',
  codeRevision: CODE_REVISION,
  paperUrl: 'https://openreview.net/forum?id=HJgJtT4tvB',
  archiveUrl: 'https://github.com/yuweihao/reclor/releases/download/v1/reclor_data.zip',
  archivePath: 'training/.cache/benchmarks/reclor/source/v1/reclor_data.zip',
  archiveBytes: 1_974_536,
  archiveSha256: 'fc64ad8755e88d7ab353a4679101f6b9a7f22c7718ce57f993abd974920f055b',
  extractedPath: EXTRACTED_PATH,
  files: FILES,
  datasetLicense: 'no-explicit-dataset-license-identifier',
  usePolicy: 'officially-delivered-for-noncommercial-research-only-no-redistribution',
  accessEvidence: 'The pinned official README supplies the release URL, extraction password, and the condition '
    + 'for_non-commercial_research_purpose_only. It does not state a separate dataset license identifier.',
});

function exactObject(record, fields, path) {
  logicalChoiceInvariant(record !== null && typeof record === 'object' && !Array.isArray(record),
    'ReClor', path, 'expected a JSON object.');
  const actual = Object.keys(record).toSorted();
  const expected = [...fields].toSorted();
  logicalChoiceInvariant(actual.length === expected.length
    && actual.every((field, index) => field === expected[index]), 'ReClor', path,
  `expected exactly ${expected.join(', ')}; received ${actual.join(', ')}.`);
}

function validateRecord(record, split, line) {
  const path = `${split}.json:${line}`;
  exactObject(record, ['context', 'question', 'answers', 'label', 'id_string'], path);
  const context = requireLogicalChoiceText(record.context, 'ReClor', `${path}.context`);
  const question = requireLogicalChoiceText(record.question, 'ReClor', `${path}.question`);
  logicalChoiceInvariant(Array.isArray(record.answers) && record.answers.length === 4,
    'ReClor', `${path}.answers`, 'expected exactly four answer candidates.');
  const answers = record.answers.map((answer, index) =>
    requireLogicalChoiceText(answer, 'ReClor', `${path}.answers[${index}]`));
  logicalChoiceInvariant(Number.isInteger(record.label) && record.label >= 0 && record.label <= 3,
    'ReClor', `${path}.label`, 'expected an integer from 0 through 3.');
  logicalChoiceInvariant(typeof record.id_string === 'string'
    && new RegExp(`^${split}_[0-9]+$`, 'u').test(record.id_string),
  'ReClor', `${path}.id_string`, `expected the official ${split}_N form.`);
  return Object.freeze({ context, question, answers: Object.freeze(answers), label: record.label,
    idString: record.id_string });
}

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, EXTRACTED_PATH);
}

async function verifyOpaqueFile(root, descriptor) {
  const path = join(root, descriptor.path);
  const details = await stat(path);
  logicalChoiceInvariant(details.size === descriptor.bytes, 'ReClor', descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  logicalChoiceInvariant(digest.digest('hex') === descriptor.sha256, 'ReClor', descriptor.path,
    'SHA-256 differs from the frozen source.');
  return Object.freeze({ path: descriptor.path, bytes: descriptor.bytes, sha256: descriptor.sha256 });
}

async function streamVisibleSplit(root, split, descriptor, onRecord = undefined) {
  const ids = new Set();
  const taskSignatures = new Set();
  const labelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let duplicateVisibleTasks = 0;
  const file = await streamJsonObjectArray(join(root, descriptor.path), descriptor, async (sourceRecord, line) => {
    const record = validateRecord(sourceRecord, split, line);
    logicalChoiceInvariant(!ids.has(record.idString), 'ReClor', `${descriptor.path}:${line}.id_string`,
      `duplicate identifier ${record.idString}.`);
    ids.add(record.idString);
    const task = buildLogicalMultipleChoiceTask({
      sourceFamily: 'ReClor', sourceSplit: split, caseKey: record.idString,
      passage: record.context, question: record.question, answers: record.answers,
    });
    const semanticSignature = createHash('sha256').update([
      record.context, record.question, ...record.answers,
    ].join('\0')).digest('hex');
    duplicateVisibleTasks += Number(taskSignatures.has(semanticSignature));
    taskSignatures.add(semanticSignature);
    labelCounts[record.label] += 1;
    await onRecord?.(task, record.label, line);
  });
  return Object.freeze({ split, ...file, uniqueIds: ids.size, duplicateVisibleTasks,
    labelCounts: Object.freeze(labelCounts) });
}

export async function hasReclorSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function inventoryReclorSource(options = {}) {
  const root = sourceRoot(options);
  const train = await streamVisibleSplit(root, 'train', FILES.train);
  const development = await streamVisibleSplit(root, 'val', FILES.development);
  const protectedTest = await verifyOpaqueFile(root, FILES.test);
  const auxiliary = [];
  for (const descriptor of [FILES.questionTypes, FILES.sourceList, FILES.useItems]) {
    auxiliary.push(await verifyOpaqueFile(root, descriptor));
  }
  return Object.freeze({
    format: 'eslm-reclor-source-inventory-v1',
    source: RECLOR_SOURCE,
    sourceRows: FILES.train.rows + FILES.development.rows + FILES.test.rows,
    visibleValidatedRows: train.rows + development.rows,
    splits: Object.freeze({ train, development,
      test: Object.freeze({ ...protectedTest, rows: FILES.test.rows,
        visibility: 'sealed-evaluator-only-content-not-opened-by-this-adapter' }) }),
    auxiliary: Object.freeze(auxiliary),
    sourceSetSha256: createHash('sha256').update(Object.values(FILES)
      .map(({ path, bytes, sha256 }) => `${path}\0${bytes}\0${sha256}`).join('\n')).digest('hex'),
    validation: 'complete train and validation arrays streamed through a closed schema; protected test retained '
      + 'and checked only by immutable byte identity',
    sizePolicy: 'native split files are sequential source shards; no row or byte quota discards valid records',
    lifecycle: Object.freeze({ train: 'training-visible', development: 'development-visible-host-only-oracle',
      test: 'sealed-evaluator-only-no-loader-exported' }),
  });
}

export function adaptReclorDevelopmentRecord(sourceRecord, line = 1) {
  logicalChoiceInvariant(Number.isInteger(line) && line > 0, 'ReClor', 'line',
    'expected a positive source line number.');
  const record = validateRecord(sourceRecord, 'val', line);
  const visible = buildLogicalMultipleChoiceTask({
    sourceFamily: 'ReClor', sourceSplit: 'validation', caseKey: record.idString,
    passage: record.context, question: record.question, answers: record.answers,
  });
  return Object.freeze({ visible,
    oracle: isolateLogicalMultipleChoiceOracle(visible, record.label, 'ReClor') });
}

async function collectDevelopment(options = {}) {
  const cases = [];
  const oracle = new Map();
  const inventory = await streamVisibleSplit(sourceRoot(options), 'val', FILES.development, (task, label) => {
    const adjusted = Object.freeze({ ...task, sourceSplit: 'validation' });
    logicalChoiceInvariant(!oracle.has(adjusted.taskId), 'ReClor', 'validation',
      `duplicate derived task identifier ${adjusted.taskId}.`);
    cases.push(adjusted);
    oracle.set(adjusted.taskId,
      isolateLogicalMultipleChoiceOracle(adjusted, label, 'ReClor').preferredCandidateId);
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle, inventory });
}

export async function loadReclorDevelopmentPool(options = {}) {
  const collected = await collectDevelopment(options);
  return Object.freeze({
    format: 'eslm-reclor-label-free-development-pool-v1',
    available: collected.inventory.rows,
    cases: collected.cases,
    oracle: 'host-only-not-returned',
    test: 'official-test-split-sealed-no-loader-exported',
  });
}

export async function runReclorDevelopmentProbe(engine, options = {}) {
  const collected = await collectDevelopment(options);
  return runLogicalMultipleChoiceProbe(engine, collected, {
    family: 'ReClor',
    resultFormat: 'eslm-reclor-development-result-v1',
    protocol: 'reclor-complete-official-validation-direct-symbolic-baseline-v1',
    evidenceRegime: 'complete official validation split with host-only preferred-candidate oracle',
    claimBoundary: 'source-native typed logical-reading-comprehension coverage diagnostic; not an official '
      + 'leaderboard submission and not evidence of unrestricted English argument understanding',
    protectedSplit: Object.freeze({ available: FILES.test.rows, executed: false,
      visibility: 'sealed-official-test-split-no-loader-exported' }),
  });
}

async function collectTraining(options = {}) {
  const cases = [];
  const oracle = new Map();
  const inventory = await streamVisibleSplit(sourceRoot(options), 'train', FILES.train, (task, label) => {
    logicalChoiceInvariant(!oracle.has(task.taskId), 'ReClor', 'train',
      `duplicate derived task identifier ${task.taskId}.`);
    cases.push(task);
    oracle.set(task.taskId,
      isolateLogicalMultipleChoiceOracle(task, label, 'ReClor').preferredCandidateId);
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle, inventory });
}

export async function runReclorTrainingProjectionDiagnostic(engine, options = {}) {
  const collected = await collectTraining(options);
  return runLogicalMultipleChoiceProbe(engine, collected, {
    family: 'ReClor',
    resultFormat: 'eslm-reclor-training-projection-diagnostic-v1',
    protocol: 'reclor-complete-official-training-categorical-projection-diagnostic-v1',
    evidenceRegime: 'complete official training split with host-only oracle; training evidence only',
    claimBoundary: 'training-visible compiler and witness diagnostic; '
      + 'not development, fresh, test, or leaderboard evidence',
    protectedSplit: Object.freeze({ executed: false, visibility: 'not-part-of-training-diagnostic' }),
  });
}
