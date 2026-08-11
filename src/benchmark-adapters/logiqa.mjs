import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PROJECT_ROOT } from '../paths.mjs';
import {
  buildLogicalMultipleChoiceTask,
  isolateLogicalMultipleChoiceOracle,
  logicalChoiceInvariant,
  requireLogicalChoiceText,
  runLogicalMultipleChoiceProbe,
} from './logical-multiple-choice.mjs';

const REVISION = 'ff6c4cbca47627b3ac2da94a29fa28204a167b41';
const SOURCE_PATH = `training/.cache/benchmarks/logiqa/source/${REVISION}`;
const FILES = Object.freeze({
  'en/train': Object.freeze({ path: 'Train.txt', rows: 7_376, bytes: 6_281_272,
    sha256: '7d5bb1f58278e33b395744cd2ad8d7600faa0b3c4d615c659a44ec1181d759fa' }),
  'en/development': Object.freeze({ path: 'Eval.txt', rows: 651, bytes: 550_021,
    sha256: '4c49e6753b7262c001506b9151135abf722247035ab075dad93acdea5789c01f' }),
  'en/test': Object.freeze({ path: 'Test.txt', rows: 651, bytes: 559_060,
    sha256: '359acb78c37802208f7fde9e2f6574b8526527c63d6a336f90a53f1932cb4701' }),
  'zh/train': Object.freeze({ path: 'zh_train.txt', rows: 7_376, bytes: 4_727_198,
    sha256: '29bcf6a15ac72729548cb4345afa2a0c70816aea13d77a5827385c18fd041466' }),
  'zh/development': Object.freeze({ path: 'zh_eval.txt', rows: 651, bytes: 438_544,
    sha256: '8d5375b94568222e0e37e8305ae5603f23721c1937c4bdeeb041e275f218c4cf' }),
  'zh/test': Object.freeze({ path: 'zh_test.txt', rows: 651, bytes: 451_802,
    sha256: '74883e3f634cc5d5fd24a7218e6094e80d376f296419ba8be7287a1142311d9d' }),
});

export const LOGIQA_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'logiqa-official-2020-11-25',
  family: 'LogiQA',
  repositoryUrl: 'https://github.com/lgw863/LogiQA-dataset',
  revision: REVISION,
  paperUrl: 'https://arxiv.org/abs/2007.08124',
  cachePath: SOURCE_PATH,
  files: FILES,
  datasetLicense: 'no-explicit-dataset-license-identifier',
  usePolicy: 'local-academic-research-no-redistribution-pending-rights-clarification',
  licenseEvidence: 'The pinned official repository publishes the source files and citation but contains no '
    + 'LICENSE file and states no dataset license in its README.',
});

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, SOURCE_PATH);
}

function parseGroup(lines, language, split, recordNumber) {
  const path = `${FILES[`${language}/${split}`].path}:record-${recordNumber}`;
  logicalChoiceInvariant(lines.length === 8, 'LogiQA', path, 'expected exactly eight physical lines.');
  logicalChoiceInvariant(lines[0] === '', 'LogiQA', `${path}.separator`,
    'expected the owner-defined blank record separator.');
  logicalChoiceInvariant(/^[abcd]$/u.test(lines[1]), 'LogiQA', `${path}.label`,
    'expected one lower-case option letter from a through d.');
  const context = requireLogicalChoiceText(lines[2], 'LogiQA', `${path}.context`);
  const question = requireLogicalChoiceText(lines[3], 'LogiQA', `${path}.question`);
  const parsedAnswers = lines.slice(4).map((line, index) => {
    const normalized = line.normalize('NFKC');
    const match = /^([A-Da-d])([.,，、·:\-\s]?)(.*)$/su.exec(normalized);
    const looksLikeUnpunctuatedPrefix = match && match[2] === '' && !/^[a-z]/u.test(match[3]);
    const recognized = match && (match[2] !== '' || looksLikeUnpunctuatedPrefix);
    const text = recognized ? match[3] : normalized;
    return Object.freeze({
      expectedLetter: String.fromCodePoint(65 + index),
      sourceLetter: recognized ? match[1].toLocaleUpperCase('en-US') : null,
      separator: recognized ? match[2] : null,
      text: requireLogicalChoiceText(text, 'LogiQA', `${path}.answers[${index}]`),
    });
  });
  const label = lines[1].codePointAt(0) - 'a'.codePointAt(0);
  return Object.freeze({ context, question,
    answers: Object.freeze(parsedAnswers.map((answer) => answer.text)), label,
    labelLetter: lines[1],
    optionPrefixAnomalies: parsedAnswers.filter((answer) => answer.sourceLetter !== answer.expectedLetter
      || answer.separator !== '.').length,
  });
}

async function streamVisibleFile(root, language, split, onRecord = undefined) {
  const descriptor = FILES[`${language}/${split}`];
  const path = join(root, descriptor.path);
  const details = await stat(path);
  logicalChoiceInvariant(details.size === descriptor.bytes, 'LogiQA', descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  const digest = createHash('sha256');
  const source = createReadStream(path);
  source.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  let group = [];
  let rows = 0;
  const labelCounts = { a: 0, b: 0, c: 0, d: 0 };
  const visibleSignatures = new Set();
  let duplicateVisibleTasks = 0;
  let optionPrefixAnomalies = 0;
  for await (const line of lines) {
    group.push(line);
    if (group.length !== 8) continue;
    rows += 1;
    const record = parseGroup(group, language, split, rows);
    const caseKey = `${language}:${split}:${rows}`;
    const task = buildLogicalMultipleChoiceTask({
      sourceFamily: 'LogiQA', sourceSplit: split, caseKey,
      passage: record.context, question: record.question, answers: record.answers,
    });
    const semanticSignature = createHash('sha256').update([
      record.context, record.question, ...record.answers,
    ].join('\0')).digest('hex');
    duplicateVisibleTasks += Number(visibleSignatures.has(semanticSignature));
    visibleSignatures.add(semanticSignature);
    labelCounts[record.labelLetter.toLocaleLowerCase('en-US')] += 1;
    optionPrefixAnomalies += record.optionPrefixAnomalies;
    await onRecord?.(task, record.label, rows);
    group = [];
  }
  logicalChoiceInvariant(group.length === 0, 'LogiQA', descriptor.path,
    `incomplete final record with ${group.length} of eight lines.`);
  logicalChoiceInvariant(rows === descriptor.rows, 'LogiQA', descriptor.path,
    `expected ${descriptor.rows} records, received ${rows}.`);
  logicalChoiceInvariant(digest.digest('hex') === descriptor.sha256, 'LogiQA', descriptor.path,
    'SHA-256 differs from the frozen source.');
  return Object.freeze({ language, split, rows, bytes: descriptor.bytes, sha256: descriptor.sha256,
    labelCounts: Object.freeze(labelCounts), duplicateVisibleTasks, optionPrefixAnomalies });
}

async function verifyOpaqueFile(root, language) {
  const descriptor = FILES[`${language}/test`];
  const path = join(root, descriptor.path);
  const details = await stat(path);
  logicalChoiceInvariant(details.size === descriptor.bytes, 'LogiQA', descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${details.size}.`);
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  logicalChoiceInvariant(digest.digest('hex') === descriptor.sha256, 'LogiQA', descriptor.path,
    'SHA-256 differs from the frozen source.');
  return Object.freeze({ language, split: 'test', rows: descriptor.rows, bytes: descriptor.bytes,
    sha256: descriptor.sha256, visibility: 'sealed-evaluator-only-content-not-opened-by-this-adapter' });
}

export async function hasLogiqaSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function inventoryLogiqaSource(options = {}) {
  const root = sourceRoot(options);
  const files = [];
  for (const language of ['en', 'zh']) {
    files.push(await streamVisibleFile(root, language, 'train'));
    files.push(await streamVisibleFile(root, language, 'development'));
    files.push(await verifyOpaqueFile(root, language));
  }
  return Object.freeze({
    format: 'eslm-logiqa-source-inventory-v1',
    source: LOGIQA_SOURCE,
    files: Object.freeze(files),
    sourceRows: files.reduce((sum, file) => sum + file.rows, 0),
    semanticCasesPerLanguage: FILES['en/train'].rows + FILES['en/development'].rows + FILES['en/test'].rows,
    sourceSetSha256: createHash('sha256').update(Object.entries(FILES)
      .map(([key, { path, bytes, sha256 }]) => `${key}\0${path}\0${bytes}\0${sha256}`).join('\n')).digest('hex'),
    validation: 'complete English and Chinese train and development files streamed through the owner-defined '
      + 'eight-line schema; protected test files retained and checked only by immutable byte identity',
    sizePolicy: 'language and split files are sequential source shards; no row or byte quota discards valid records',
    semanticProjection: Object.freeze({
      executed: 'English development',
      preservedOutsideCurrentProfile: 'Chinese train, development, and sealed test remain frozen and accounted',
    }),
    lifecycle: Object.freeze({ train: 'training-visible', development: 'development-visible-host-only-oracle',
      test: 'sealed-evaluator-only-no-loader-exported' }),
  });
}

export function adaptLogiqaDevelopmentLines(lines, line = 1) {
  logicalChoiceInvariant(Number.isInteger(line) && line > 0, 'LogiQA', 'line',
    'expected a positive record number.');
  const record = parseGroup(lines, 'en', 'development', line);
  const visible = buildLogicalMultipleChoiceTask({
    sourceFamily: 'LogiQA', sourceSplit: 'development', caseKey: `en:development:${line}`,
    passage: record.context, question: record.question, answers: record.answers,
  });
  return Object.freeze({ visible,
    oracle: isolateLogicalMultipleChoiceOracle(visible, record.label, 'LogiQA') });
}

async function collectDevelopment(options = {}) {
  const cases = [];
  const oracle = new Map();
  const inventory = await streamVisibleFile(sourceRoot(options), 'en', 'development', (task, label) => {
    logicalChoiceInvariant(!oracle.has(task.taskId), 'LogiQA', 'development',
      `duplicate derived task identifier ${task.taskId}.`);
    cases.push(task);
    oracle.set(task.taskId,
      isolateLogicalMultipleChoiceOracle(task, label, 'LogiQA').preferredCandidateId);
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle, inventory });
}

export async function loadLogiqaDevelopmentPool(options = {}) {
  const collected = await collectDevelopment(options);
  return Object.freeze({
    format: 'eslm-logiqa-label-free-development-pool-v1',
    available: collected.inventory.rows,
    cases: collected.cases,
    oracle: 'host-only-not-returned',
    currentLanguageProfile: 'English',
    ChineseDevelopmentPreservedOutsideProfile: FILES['zh/development'].rows,
    test: 'official-English-and-Chinese-test-files-sealed-no-loader-exported',
  });
}

export async function runLogiqaDevelopmentProbe(engine, options = {}) {
  const collected = await collectDevelopment(options);
  return runLogicalMultipleChoiceProbe(engine, collected, {
    family: 'LogiQA',
    resultFormat: 'eslm-logiqa-development-result-v1',
    protocol: 'logiqa-complete-official-english-evaluation-direct-symbolic-baseline-v1',
    evidenceRegime: 'complete official English evaluation split with host-only preferred-candidate oracle',
    claimBoundary: 'source-native typed logical-reading-comprehension coverage diagnostic; not an official '
      + 'leaderboard submission, not a Chinese-language score, and not evidence of unrestricted argument understanding',
    protectedSplit: Object.freeze({ available: FILES['en/test'].rows, executed: false,
      additionalPreservedChineseCases: FILES['zh/test'].rows,
      visibility: 'sealed-official-test-files-no-loader-exported' }),
  });
}

async function collectEnglishTraining(options = {}) {
  const cases = [];
  const oracle = new Map();
  const inventory = await streamVisibleFile(sourceRoot(options), 'en', 'train', (task, label) => {
    logicalChoiceInvariant(!oracle.has(task.taskId), 'LogiQA', 'train',
      `duplicate derived task identifier ${task.taskId}.`);
    cases.push(task);
    oracle.set(task.taskId,
      isolateLogicalMultipleChoiceOracle(task, label, 'LogiQA').preferredCandidateId);
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle, inventory });
}

export async function runLogiqaTrainingProjectionDiagnostic(engine, options = {}) {
  const collected = await collectEnglishTraining(options);
  return runLogicalMultipleChoiceProbe(engine, collected, {
    family: 'LogiQA',
    resultFormat: 'eslm-logiqa-training-projection-diagnostic-v1',
    protocol: 'logiqa-complete-official-english-training-categorical-projection-diagnostic-v1',
    evidenceRegime: 'complete official English training split with host-only oracle; training evidence only',
    claimBoundary: 'training-visible compiler and witness diagnostic; '
      + 'not development, Chinese, test, or leaderboard evidence',
    protectedSplit: Object.freeze({ executed: false, visibility: 'not-part-of-training-diagnostic' }),
  });
}
