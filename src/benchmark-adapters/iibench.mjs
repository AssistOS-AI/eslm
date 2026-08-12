import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { equivalentCategoricalPropositions } from '../reasoning/categorical-logic.mjs';

export const IIBENCH_RELEASE = Object.freeze({
  id: 'iibench-acl-2026',
  paperUrl: 'https://aclanthology.org/2026.acl-long.808/',
  paperPdfUrl: 'https://aclanthology.org/2026.acl-long.808.pdf',
  paperSha256: 'a8a125834f776f649fafba37b34c0798f9eac3c871b46e5b760ce8984068a50c',
  repositoryUrl: 'https://github.com/michaellu5475/IIBench',
  revision: '5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8',
  archiveUrl: 'https://github.com/michaellu5475/IIBench/archive/5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8.tar.gz',
  archiveBytes: 322_908,
  archiveSha256: 'e1f0cacf12547560d19b8c77bc4b8d8dddbf153b3304ab9c99af3106fc3d54a7',
  extractedDirectory: 'IIBench-5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8',
  licenseStatus: 'no-repository-license-file',
});

const FILES = Object.freeze({
  'AEIO_truth.jsonl': Object.freeze({ kind: 'truth', rows: 1_100 }),
  'Conversion_generation.jsonl': Object.freeze({ kind: 'conversion', rows: 1_300 }),
  'Obversion_generation.jsonl': Object.freeze({ kind: 'obversion', rows: 1_200 }),
  'Contraposition_generation.jsonl': Object.freeze({ kind: 'contraposition', rows: 1_300 }),
  'Syllogism_generation.jsonl': Object.freeze({ kind: 'syllogism', rows: 384 }),
});

const FORMS = new Set(['A', 'E', 'I', 'O']);
const TRUTH_LABELS = new Set(['True', 'False', 'Undetermined']);
const CONDITIONS = new Set(['fact', 'counterfactual', 'anonymous']);
const SYLLOGISM_CATEGORIES = new Set(['standard', 'conversion', 'obversion', 'contraposition']);

function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, path) {
  invariant(typeof value === 'string' && value.length > 0, path, 'expected a non-empty string.');
}

function nullableString(value, path) {
  invariant(value === null || (typeof value === 'string' && value.length > 0), path,
    'expected null or a non-empty string.');
}

function nonNegativeInteger(value, path) {
  invariant(Number.isInteger(value) && value >= 0, path, 'expected a non-negative integer.');
}

function exactKeys(value, expected, path) {
  invariant(plainObject(value), path, 'expected an object.');
  const actual = Object.keys(value).toSorted();
  const wanted = [...expected].toSorted();
  invariant(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), path,
    `expected exactly these fields: ${wanted.join(', ')}; received: ${actual.join(', ')}.`);
}

function categoricalTermFields(record, prefix, path, { canonical = false, nullable = false } = {}) {
  const term = record[`${prefix}_term`];
  if (nullable) nullableString(term, `${path}.${prefix}_term`);
  else requiredString(term, `${path}.${prefix}_term`);
  if (canonical) requiredString(record[`${prefix}_canonical`], `${path}.${prefix}_canonical`);
  nonNegativeInteger(record[`${prefix}_neg_depth`], `${path}.${prefix}_neg_depth`);
}

function validateImmediate(record, path, kind) {
  const common = [
    'id', 'family', 'subtask', 'category', 'premise', 'premise_form',
    'subject_term', 'subject_canonical', 'subject_neg_depth',
    'predicate_term', 'predicate_canonical', 'predicate_neg_depth',
    'candidate', 'candidate_form', 'candidate_subject_neg_depth', 'candidate_predicate_neg_depth',
  ];
  const keys = kind === 'truth'
    ? [...common, 'relation_type', 'gold_label', 'candidate_subject_canonical', 'candidate_predicate_canonical']
    : kind === 'conversion' || kind === 'contraposition'
      ? [...common, 'candidate_subject_term', 'candidate_predicate_term']
      : common;
  exactKeys(record, keys, path);
  requiredString(record.id, `${path}.id`);
  invariant(record.family === 'AEIO', `${path}.family`, 'expected AEIO.');
  requiredString(record.category, `${path}.category`);
  requiredString(record.premise, `${path}.premise`);
  invariant(FORMS.has(record.premise_form), `${path}.premise_form`, 'expected A, E, I, or O.');
  categoricalTermFields(record, 'subject', path, { canonical: true });
  categoricalTermFields(record, 'predicate', path, { canonical: true });

  if (kind === 'truth') {
    invariant(record.subtask === 'truth_judgement', `${path}.subtask`, 'expected truth_judgement.');
    invariant(record.relation_type === 'aeio_truth', `${path}.relation_type`, 'expected aeio_truth.');
    requiredString(record.candidate, `${path}.candidate`);
    invariant(FORMS.has(record.candidate_form), `${path}.candidate_form`, 'expected A, E, I, or O.');
    requiredString(record.candidate_subject_canonical, `${path}.candidate_subject_canonical`);
    requiredString(record.candidate_predicate_canonical, `${path}.candidate_predicate_canonical`);
    invariant(TRUTH_LABELS.has(record.gold_label), `${path}.gold_label`,
      'expected True, False, or Undetermined.');
  } else {
    invariant(record.subtask === `${kind}_generation`, `${path}.subtask`, `expected ${kind}_generation.`);
    const invalid = kind === 'conversion' ? record.premise_form === 'O'
      : kind === 'contraposition' ? ['E', 'I'].includes(record.premise_form) : false;
    if (invalid) {
      requiredString(record.candidate, `${path}.candidate`);
      invariant(record.candidate_form === null, `${path}.candidate_form`,
        'invalid source forms require a null candidate_form and retain the source invalidity answer text.');
    } else {
      requiredString(record.candidate, `${path}.candidate`);
      invariant(FORMS.has(record.candidate_form), `${path}.candidate_form`, 'expected A, E, I, or O.');
    }
    if (kind === 'conversion' || kind === 'contraposition') {
      categoricalTermFields(record, 'candidate_subject', path, { nullable: invalid });
      categoricalTermFields(record, 'candidate_predicate', path, { nullable: invalid });
    } else {
      nonNegativeInteger(record.candidate_subject_neg_depth, `${path}.candidate_subject_neg_depth`);
      nonNegativeInteger(record.candidate_predicate_neg_depth, `${path}.candidate_predicate_neg_depth`);
    }
  }
}

const SYLLOGISM_KEYS = Object.freeze([
  'id', 'base_id', 'family', 'subtask', 'split', 'category', 'condition',
  'mood', 'figure', 'premise1', 'premise1_form', 'premise1_subject_term',
  'premise1_subject_canonical', 'premise1_subject_neg_depth', 'premise1_predicate_term',
  'premise1_predicate_canonical', 'premise1_predicate_neg_depth', 'premise2', 'premise2_form',
  'premise2_subject_term', 'premise2_subject_canonical', 'premise2_subject_neg_depth',
  'premise2_predicate_term', 'premise2_predicate_canonical', 'premise2_predicate_neg_depth',
  'candidate_gold', 'candidate_form', 'candidate_subject_term', 'candidate_subject_canonical',
  'candidate_subject_neg_depth', 'candidate_predicate_term', 'candidate_predicate_canonical',
  'candidate_predicate_neg_depth', 'transformation_note', 'source_instance',
]);

function validateSyllogism(record, path) {
  const expected = [
    ...SYLLOGISM_KEYS,
    ...['source_id', 'gold_recomputed', 'nonce_map'].filter((key) => record[key] !== undefined),
  ];
  exactKeys(record, expected, path);
  for (const key of ['id', 'base_id', 'mood', 'premise1', 'premise2', 'candidate_gold']) {
    requiredString(record[key], `${path}.${key}`);
  }
  if (record.source_id !== undefined) requiredString(record.source_id, `${path}.source_id`);
  invariant(record.family === 'syllogism', `${path}.family`, 'expected syllogism.');
  invariant(record.subtask === 'generation', `${path}.subtask`, 'expected generation.');
  invariant(record.split === 'test', `${path}.split`, 'the official release declares only test rows.');
  invariant(SYLLOGISM_CATEGORIES.has(record.category), `${path}.category`,
    'expected standard, conversion, obversion, or contraposition.');
  invariant(CONDITIONS.has(record.condition), `${path}.condition`,
    'expected fact, counterfactual, or anonymous.');
  invariant(Number.isInteger(record.figure) && record.figure >= 1 && record.figure <= 4,
    `${path}.figure`, 'expected an integer from 1 through 4.');
  invariant(/^([AEIO])([AEIO])([AEIO])-([1-4])$/u.test(record.mood), `${path}.mood`,
    'expected a categorical mood and figure such as EAO-3.');
  for (const prefix of ['premise1', 'premise2', 'candidate']) {
    invariant(FORMS.has(record[`${prefix}_form`]), `${path}.${prefix}_form`, 'expected A, E, I, or O.');
    categoricalTermFields(record, `${prefix}_subject`, path, { canonical: true });
    categoricalTermFields(record, `${prefix}_predicate`, path, { canonical: true });
  }
  if (record.gold_recomputed !== undefined) {
    invariant(typeof record.gold_recomputed === 'boolean', `${path}.gold_recomputed`, 'expected a boolean.');
  }
  requiredString(record.transformation_note, `${path}.transformation_note`);
  if (record.nonce_map !== undefined) {
    exactKeys(record.nonce_map, ['S', 'M', 'P'], `${path}.nonce_map`);
    for (const key of ['S', 'M', 'P']) requiredString(record.nonce_map[key], `${path}.nonce_map.${key}`);
  }
  exactKeys(record.source_instance, [
    'S_qid', 'S_label', 'S_label_lang', 'M_qid', 'M_label', 'M_label_lang',
    'P_qid', 'P_label', 'P_label_lang', 'form_id', 'figure', 'construction',
  ], `${path}.source_instance`);
  for (const [key, value] of Object.entries(record.source_instance)) {
    if (key !== 'figure' && key !== 'construction') requiredString(value, `${path}.source_instance.${key}`);
  }
  invariant(Number.isInteger(record.source_instance.figure), `${path}.source_instance.figure`,
    'expected an integer.');
  exactKeys(record.source_instance.construction, ['form_id', 'figure', 'major', 'minor'],
    `${path}.source_instance.construction`);
  const construction = record.source_instance.construction;
  requiredString(construction.form_id, `${path}.source_instance.construction.form_id`);
  invariant(Number.isInteger(construction.figure), `${path}.source_instance.construction.figure`,
    'expected an integer.');
  for (const key of ['major', 'minor']) {
    invariant(Array.isArray(construction[key]) && construction[key].length === 3,
      `${path}.source_instance.construction.${key}`, 'expected three categorical terms.');
    construction[key].forEach((term, index) => requiredString(term,
      `${path}.source_instance.construction.${key}[${index}]`));
  }
}

function validateRecord(record, file, line) {
  const metadata = FILES[file];
  invariant(metadata, file, 'unrecognized IIBench source file.');
  const path = `${file}:${line}`;
  if (metadata.kind === 'syllogism') validateSyllogism(record, path);
  else validateImmediate(record, path, metadata.kind);
}

async function streamFile(root, file, onRecord) {
  const path = join(root, 'data', file);
  const digest = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let rows = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    rows += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${rows}: invalid JSON: ${error.message}`);
    }
    validateRecord(record, file, rows);
    await onRecord?.(record, Object.freeze({ file, kind: FILES[file].kind, line: rows }));
  }
  invariant(rows === FILES[file].rows, file,
    `expected ${FILES[file].rows} rows from the pinned release, received ${rows}.`);
  return Object.freeze({ file, kind: FILES[file].kind, rows, sha256: digest.digest('hex') });
}

export function iibenchSourceRoot(cacheRoot = join('training', '.cache')) {
  return join(cacheRoot, 'benchmarks', 'iibench', 'extracted', IIBENCH_RELEASE.extractedDirectory);
}

export async function inventoryIIBenchSource(root) {
  const readme = await stat(join(root, 'README.md'));
  const files = [];
  for (const file of Object.keys(FILES)) files.push(await streamFile(root, file));
  const sourceSetSha256 = createHash('sha256')
    .update(files.map(({ file, rows, sha256: digest }) => `${file}\0${rows}\0${digest}`).join('\n'))
    .digest('hex');
  return Object.freeze({
    protocol: 'iibench-source-inventory-v1',
    release: IIBENCH_RELEASE.id,
    files: Object.freeze(files),
    rows: files.reduce((total, item) => total + item.rows, 0),
    readmeBytes: readme.size,
    sourceSetSha256,
    validation: 'all-rows-streamed-strict-schema',
  });
}

function rowStratum(record, metadata) {
  return metadata.kind === 'syllogism'
    ? `${metadata.file}\0${record.condition}\0${record.category}`
    : `${metadata.file}\0${record.category}\0${record.premise_form}`;
}

function partitionRank(file, id) {
  return createHash('sha256').update(`iibench-public-test-partition-v1\0${file}\0${id}`).digest('hex');
}

async function partitionMembership(root, freshFraction) {
  invariant(typeof freshFraction === 'number' && freshFraction > 0 && freshFraction < 1,
    'freshFraction', 'expected a number strictly between zero and one.');
  const groups = new Map();
  for (const file of Object.keys(FILES)) {
    await streamFile(root, file, (record, metadata) => {
      const stratum = rowStratum(record, metadata);
      const rows = groups.get(stratum) ?? [];
      rows.push(Object.freeze({ file, id: record.id, rank: partitionRank(file, record.id) }));
      groups.set(stratum, rows);
    });
  }
  const development = new Set();
  const fresh = new Set();
  const strata = [];
  for (const [stratum, rows] of [...groups].toSorted(([left], [right]) => left.localeCompare(right))) {
    rows.sort((left, right) => left.rank.localeCompare(right.rank) || left.id.localeCompare(right.id));
    const freshCount = rows.length === 1 ? 0 : Math.min(rows.length - 1, Math.ceil(rows.length * freshFraction));
    rows.forEach((row, index) => (index < freshCount ? fresh : development).add(`${row.file}\0${row.id}`));
    strata.push(Object.freeze({
      stratum: stratum.replaceAll('\0', ' / '),
      available: rows.length,
      development: rows.length - freshCount,
      fresh: freshCount,
    }));
  }
  const membershipLines = [
    ...[...development].map((key) => `development\0${key}`),
    ...[...fresh].map((key) => `fresh\0${key}`),
  ].toSorted();
  return Object.freeze({
    development, fresh, strata: Object.freeze(strata),
    membershipSha256: createHash('sha256').update(membershipLines.join('\n')).digest('hex'),
  });
}

export async function buildIIBenchPartition(root, { freshFraction = 0.2 } = {}) {
  const membership = await partitionMembership(root, freshFraction);
  return Object.freeze({
    protocol: 'iibench-public-test-partition-v1',
    sourceSplit: 'official-public-test-only',
    policy: 'stable-sha256-within-visible-file-category-form-strata',
    seed: 'iibench-public-test-partition-v1',
    freshFraction,
    available: membership.development.size + membership.fresh.size,
    development: membership.development.size,
    fresh: membership.fresh.size,
    membershipSha256: membership.membershipSha256,
    strata: membership.strata,
    freshVisibility: 'host-only-oracle-not-evaluated',
  });
}

function proposition(record, prefix, { transformedBy } = {}) {
  const value = {
    text: record[prefix],
    form: record[`${prefix}_form`],
    subject: Object.freeze({
      term: record[`${prefix}_subject_term`] ?? record.subject_term,
      canonical: record[`${prefix}_subject_canonical`] ?? record.subject_canonical,
      negationDepth: record[`${prefix}_subject_neg_depth`] ?? record.subject_neg_depth,
    }),
    predicate: Object.freeze({
      term: record[`${prefix}_predicate_term`] ?? record.predicate_term,
      canonical: record[`${prefix}_predicate_canonical`] ?? record.predicate_canonical,
      negationDepth: record[`${prefix}_predicate_neg_depth`] ?? record.predicate_neg_depth,
    }),
  };
  if (transformedBy) {
    const originalSubject = transformedBy === 'conversion'
      ? value.predicate
      : transformedBy === 'contraposition'
        ? Object.freeze({
          ...value.predicate,
          canonical: `${value.predicate.negationDepth % 2 === 0 ? 'non-' : ''}${value.predicate.term}`,
          negationDepth: value.predicate.negationDepth + 1,
        })
        : value.subject;
    value.existentialTerm = originalSubject;
    value.transformationProvenance = Object.freeze({ operation: transformedBy, preserves: 'original-subject-import' });
  }
  return Object.freeze(value);
}

function visibleTask(record, metadata) {
  const common = {
    taskId: `iibench:${metadata.file}:${record.id}`,
    sourceId: record.id,
    sourceFile: metadata.file,
    sourceCategory: record.category,
    sourceSplit: 'public-test-reclassified-development',
  };
  if (metadata.kind === 'truth') {
    return Object.freeze({
      ...common,
      operation: 'judge-categorical-opposition',
      premise: proposition(record, 'premise'),
      candidate: Object.freeze({
        text: record.candidate,
        form: record.candidate_form,
        subject: Object.freeze({
          canonical: record.candidate_subject_canonical,
          negationDepth: record.candidate_subject_neg_depth,
        }),
        predicate: Object.freeze({
          canonical: record.candidate_predicate_canonical,
          negationDepth: record.candidate_predicate_neg_depth,
        }),
      }),
      outputContract: Object.freeze({ kind: 'categorical-truth-value', values: ['True', 'False', 'Undetermined'] }),
    });
  }
  if (metadata.kind === 'syllogism') {
    const transformedMatch = /(?:^|\+)P([12])_(?:conv|obv|contra)/u.exec(record.transformation_note);
    const transformedIndex = transformedMatch ? Number(transformedMatch[1]) - 1 : -1;
    const transformedBy = record.category === 'conversion' ? 'conversion'
      : record.category === 'obversion' ? 'obversion'
        : record.category === 'contraposition' ? 'contraposition' : undefined;
    return Object.freeze({
      ...common,
      operation: 'derive-categorical-syllogism',
      premises: Object.freeze([
        proposition(record, 'premise1', { transformedBy: transformedIndex === 0 ? transformedBy : undefined }),
        proposition(record, 'premise2', { transformedBy: transformedIndex === 1 ? transformedBy : undefined }),
      ]),
      figure: record.figure,
      outputContract: Object.freeze({ kind: 'categorical-proposition' }),
    });
  }
  return Object.freeze({
    ...common,
    operation: 'transform-categorical-proposition',
    transformation: metadata.kind,
    premise: proposition(record, 'premise'),
    outputContract: Object.freeze({
      kind: 'categorical-proposition-or-invalid',
      invalidAllowed: metadata.kind !== 'obversion',
    }),
  });
}

function oracleValue(record, kind) {
  if (kind === 'truth') return record.gold_label;
  if (kind === 'syllogism') return Object.freeze({
    answer: record.candidate_gold,
    proposition: proposition(record, 'candidate'),
    comparison: 'logical-equivalence-under-declared-immediate-transformations',
  });
  return Object.freeze({
    answer: record.candidate,
    proposition: record.candidate_form === null ? null : proposition(record, 'candidate'),
    comparison: 'required-operation-form-with-negation-parity-normalization',
  });
}

async function collectDevelopment(root, freshFraction) {
  return collectPartition(root, freshFraction, 'development');
}

async function collectPartition(root, freshFraction, selectedPool) {
  invariant(selectedPool === 'development' || selectedPool === 'fresh', 'selectedPool',
    'expected development or fresh.');
  const membership = await partitionMembership(root, freshFraction);
  const selected = membership[selectedPool];
  const cases = [];
  const oracle = new Map();
  for (const file of Object.keys(FILES)) {
    await streamFile(root, file, (record, metadata) => {
      const key = `${file}\0${record.id}`;
      if (!selected.has(key)) return;
      const task = visibleTask(record, metadata);
      cases.push(task);
      oracle.set(task.taskId, oracleValue(record, metadata.kind));
    });
  }
  cases.sort((left, right) => left.taskId.localeCompare(right.taskId));
  return Object.freeze({ cases: Object.freeze(cases), oracle, membership });
}

export async function loadIIBenchDevelopmentPool(root, { freshFraction = 0.2 } = {}) {
  const collected = await collectDevelopment(root, freshFraction);
  return Object.freeze({
    protocol: 'iibench-label-free-development-pool-v1',
    available: collected.membership.development.size,
    freshHeldOut: collected.membership.fresh.size,
    oracle: 'host-only-not-returned',
    cases: collected.cases,
  });
}

function normalizedAnswer(result) {
  const value = result?.values?.length === 1 ? result.values[0] : result?.answer;
  return typeof value === 'string' ? value.trim().replaceAll(/\s+/gu, ' ').toLocaleLowerCase('en-US') : value;
}

function strictPropositionMatch(left, right) {
  if (!left || !right) return left === right;
  return left.form === right.form
    && left.subject.term === right.subject.term
    && left.subject.negationDepth % 2 === right.subject.negationDepth % 2
    && left.predicate.term === right.predicate.term
    && left.predicate.negationDepth % 2 === right.predicate.negationDepth % 2;
}

function scoreResult(task, result, gold) {
  if (result?.status !== 'SOLVED') return false;
  if (task.operation === 'judge-categorical-opposition') {
    return normalizedAnswer(result) === normalizedAnswer({ answer: gold });
  }
  if (task.operation === 'derive-categorical-syllogism') {
    return Boolean(result.proposition && gold.proposition
      && equivalentCategoricalPropositions(result.proposition, gold.proposition));
  }
  if (gold.proposition === null) return normalizedAnswer(result) === normalizedAnswer(gold);
  return strictPropositionMatch(result.proposition, gold.proposition);
}

export async function runIIBenchDevelopmentBaseline(engine, root, { freshFraction = 0.2 } = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const collected = await collectDevelopment(root, freshFraction);
  const statusCounts = {};
  const correctByOperation = {};
  const testedByOperation = {};
  const testedBySourceFile = {};
  const correctBySourceFile = {};
  const testedByStructuralStratum = {};
  const correctByStructuralStratum = {};
  let correct = 0;
  for (const task of collected.cases) {
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    testedByOperation[task.operation] = (testedByOperation[task.operation] ?? 0) + 1;
    testedBySourceFile[task.sourceFile] = (testedBySourceFile[task.sourceFile] ?? 0) + 1;
    const first = task.premise ?? task.premises?.[0];
    const stratum = [task.sourceFile, first?.form, first?.subject?.negationDepth,
      first?.predicate?.negationDepth, task.sourceCategory].join(' / ');
    testedByStructuralStratum[stratum] = (testedByStructuralStratum[stratum] ?? 0) + 1;
    const gold = collected.oracle.get(task.taskId);
    if (scoreResult(task, result, gold)) {
      correct += 1;
      correctByOperation[task.operation] = (correctByOperation[task.operation] ?? 0) + 1;
      correctBySourceFile[task.sourceFile] = (correctBySourceFile[task.sourceFile] ?? 0) + 1;
      correctByStructuralStratum[stratum] = (correctByStructuralStratum[stratum] ?? 0) + 1;
    }
  }
  return Object.freeze({
    protocol: 'iibench-current-core-development-baseline-v1',
    runtimeProfile: 'direct-symbolic-no-coding-agent',
    sourceSplit: 'official-public-test-reclassified-development',
    scoring: 'typed operation scoring with required-form comparison for immediate transformations and declared logical-equivalence closure for syllogisms',
    comparability: 'complete development execution under the pinned source contract; not an untouched official test score',
    languageParsing: 'not-run; official records enter through strict typed-field validation',
    availableSourceRows: collected.membership.development.size + collected.membership.fresh.size,
    tested: collected.cases.length,
    freshNotTested: collected.membership.fresh.size,
    correct,
    accuracy: collected.cases.length === 0 ? 0 : correct / collected.cases.length,
    statusCounts: Object.freeze(statusCounts),
    testedByOperation: Object.freeze(testedByOperation),
    correctByOperation: Object.freeze(correctByOperation),
    testedBySourceFile: Object.freeze(testedBySourceFile),
    correctBySourceFile: Object.freeze(correctBySourceFile),
    testedByStructuralStratum: Object.freeze(testedByStructuralStratum),
    correctByStructuralStratum: Object.freeze(correctByStructuralStratum),
    codingAgentInvocations: 0,
    missingCapabilityFamilies: Object.freeze([
      'categorical-proposition-representation',
      'square-of-opposition-truth-judgment',
      'categorical-conversion-obversion-and-contraposition',
      'categorical-syllogism-composition',
      'categorical-surface-realization-and-equivalence-scoring',
    ]),
  });
}

export async function runIIBenchFreshEvaluation(engine, root, { freshFraction = 0.2 } = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const collected = await collectPartition(root, freshFraction, 'fresh');
  const statusCounts = {};
  const testedBySourceFile = {};
  const correctBySourceFile = {};
  let correct = 0;
  let soundSyllogismConclusions = 0;
  for (const task of collected.cases) {
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    testedBySourceFile[task.sourceFile] = (testedBySourceFile[task.sourceFile] ?? 0) + 1;
    if (task.operation === 'derive-categorical-syllogism'
      && result?.witness?.kind === 'categorical-model-entailment-v1' && status === 'SOLVED') {
      soundSyllogismConclusions += 1;
    }
    if (scoreResult(task, result, collected.oracle.get(task.taskId))) {
      correct += 1;
      correctBySourceFile[task.sourceFile] = (correctBySourceFile[task.sourceFile] ?? 0) + 1;
    }
  }
  return Object.freeze({
    protocol: 'iibench-categorical-core-fresh-v1',
    sourceSplit: 'official-public-test-reclassified-fresh',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    tested: collected.cases.length,
    correct,
    accuracy: collected.cases.length === 0 ? 0 : correct / collected.cases.length,
    statusCounts: Object.freeze(statusCounts),
    testedBySourceFile: Object.freeze(testedBySourceFile),
    correctBySourceFile: Object.freeze(correctBySourceFile),
    soundSyllogismConclusions,
    normalizationCandidates: 0,
    languageAgentInvocations: 0,
    retainedEvidence: 'aggregate-and-source-family-counts-only',
  });
}
