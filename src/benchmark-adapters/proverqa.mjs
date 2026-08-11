import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { compileFolioFormulaSet } from './folio.mjs';
import { negate } from '../reasoning/finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../reasoning/sat-entailment.mjs';

const DATASET_REVISION = 'e2561beed450272690da658d21ae667570dbbafc';
const CODE_REVISION = '1d8abd227912cee0b24819eb373ceba80979cb49';
const PARTITION_SEED = 'proverqa-public-evaluation-partition-v1';
const LEVELS = Object.freeze(['easy', 'medium', 'hard']);
const DEVELOPMENT_PER_LEVEL = 100;

const SOURCE_FILES = Object.freeze({
  readme: Object.freeze({
    path: 'README.md', bytes: 8_140,
    sha256: 'bf49f9c0433a0b63998411dd6e459c66e163bdd0a6c3b1338b4cdd3a4f815d7a', records: null,
  }),
  easy: Object.freeze({
    path: 'dev/easy.json', bytes: 738_436,
    sha256: 'b38f8da5207e29bee19a6db1093f0b2a44d50402c9a4c86bec9f3aa41c606d7f', records: 500,
  }),
  medium: Object.freeze({
    path: 'dev/medium.json', bytes: 1_524_251,
    sha256: '053210391c40a46e3f126a3ef54067659232cbc02204a6fdbe09df32a396c61e', records: 500,
  }),
  hard: Object.freeze({
    path: 'dev/hard.json', bytes: 2_662_475,
    sha256: '79428ef614d43729ce82e4d065055fdc6a39abad0f20cb226c5288fc315468e4', records: 500,
  }),
  train: Object.freeze({
    path: 'train/provergen-5000.json', bytes: 9_092_500,
    sha256: 'c5895d323f88c456cededb28b0935155a61dc9b3d3f573addf4200d552abdc46', records: 5_000,
  }),
});

export const PROVERQA_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'proverqa-official-2025-06-11',
  family: 'ProverQA',
  datasetUrl: 'https://huggingface.co/datasets/opendatalab/ProverQA',
  datasetRevision: DATASET_REVISION,
  codeUrl: 'https://github.com/opendatalab/ProverGen',
  codeRevision: CODE_REVISION,
  paperUrl: 'https://openreview.net/forum?id=C25SgeXWjE',
  cachePath: `training/.cache/benchmarks/proverqa/source/${DATASET_REVISION}`,
  files: SOURCE_FILES,
  codeArchive: Object.freeze({
    path: `training/.cache/benchmarks/proverqa/code/${CODE_REVISION}.tar.gz`,
    bytes: 4_411_701,
    sha256: '06b1a87e6ab5978987af07c1af570f5c994c08ab8c5186f2762b4b8e8b72a94b',
  }),
  license: 'no-explicit-dataset-license-identifier',
  usePolicy: 'local-academic-research-no-redistribution-pending-rights-clarification',
  licenseEvidence: 'The pinned dataset card states academic/research purpose and component-source licensing, but '
    + 'does not grant the assembled dataset an SPDX license.',
});

function invariant(condition, path, message) {
  if (!condition) throw new Error(`ProverQA ${path}: ${message}`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireText(value, path) {
  invariant(typeof value === 'string' && value.length > 0, path, 'expected non-empty text.');
  invariant(!value.includes('\0') && !value.includes('\uFFFD'), path, 'contains an invalid text character.');
}

function requireExactFields(value, expected, path) {
  invariant(plainObject(value), path, 'expected a JSON object.');
  const actual = Object.keys(value).toSorted();
  const wanted = [...expected].toSorted();
  invariant(actual.length === wanted.length && actual.every((field, index) => field === wanted[index]), path,
    `expected exactly ${wanted.join(', ')}; received ${actual.join(', ')}.`);
}

function validateDevelopmentRecord(record, level, index) {
  const path = `dev/${level}.json:${index + 1}`;
  requireExactFields(record,
    ['id', 'options', 'answer', 'question', 'reasoning', 'context', 'nl2fol', 'conclusion_fol'], path);
  invariant(Number.isInteger(record.id) && record.id >= 0, `${path}.id`, 'expected a non-negative integer.');
  invariant(Array.isArray(record.options), `${path}.options`, 'expected an array.');
  invariant(JSON.stringify(record.options) === JSON.stringify(['A) True', 'B) False', 'C) Uncertain']),
    `${path}.options`, 'expected the official ordered True, False, Uncertain options.');
  invariant(['A', 'B', 'C'].includes(record.answer), `${path}.answer`, 'expected A, B, or C.');
  requireText(record.question, `${path}.question`);
  requireText(record.reasoning, `${path}.reasoning`);
  requireText(record.context, `${path}.context`);
  requireText(record.conclusion_fol, `${path}.conclusion_fol`);
  invariant(plainObject(record.nl2fol) && Object.keys(record.nl2fol).length > 0,
    `${path}.nl2fol`, 'expected a non-empty statement-to-formula object.');
  for (const [statement, formula] of Object.entries(record.nl2fol)) {
    requireText(statement, `${path}.nl2fol key`);
    requireText(formula, `${path}.nl2fol[${JSON.stringify(statement)}]`);
  }
}

function validateTrainingRecord(record, index) {
  const path = `train/provergen-5000.json:${index + 1}`;
  requireExactFields(record, ['system', 'output', 'input', 'instruction'], path);
  for (const field of ['system', 'output', 'input', 'instruction']) requireText(record[field], `${path}.${field}`);
  let output;
  try {
    output = JSON.parse(record.output);
  } catch (error) {
    return Object.freeze({ embeddedOutputJson: false, diagnostic: error.message });
  }
  requireExactFields(output, ['reasoning', 'answer'], `${path}.output`);
  requireText(output.reasoning, `${path}.output.reasoning`);
  invariant(['A', 'B', 'C'].includes(output.answer), `${path}.output.answer`, 'expected A, B, or C.');
  return Object.freeze({ embeddedOutputJson: true });
}

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, PROVERQA_SOURCE.cachePath);
}

async function readPinnedFile(root, descriptor) {
  const path = join(root, descriptor.path);
  const bytes = await readFile(path);
  invariant(bytes.length === descriptor.bytes, descriptor.path,
    `expected ${descriptor.bytes} bytes, received ${bytes.length}.`);
  invariant(sha256(bytes) === descriptor.sha256, descriptor.path, 'SHA-256 differs from the frozen source.');
  return bytes;
}

async function readPinnedArray(root, descriptor) {
  const bytes = await readPinnedFile(root, descriptor);
  let rows;
  try {
    rows = JSON.parse(bytes);
  } catch (error) {
    throw new Error(`ProverQA ${descriptor.path}: invalid JSON: ${error.message}`);
  }
  invariant(Array.isArray(rows), descriptor.path, 'expected a JSON array.');
  invariant(rows.length === descriptor.records, descriptor.path,
    `expected ${descriptor.records} records, received ${rows.length}.`);
  return rows;
}

export async function hasProverqaSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function caseKey(level, id) {
  return `${level}\0${id}`;
}

function caseId(level, id) {
  return `proverqa:${level}:${id}`;
}

function partitionRank(level, id) {
  return sha256(`${PARTITION_SEED}\0${level}\0${id}`);
}

function partitionLevel(level, rows) {
  const ranked = rows.map((record) => ({
    key: caseKey(level, record.id),
    rank: partitionRank(level, record.id),
  })).toSorted((left, right) => left.rank.localeCompare(right.rank) || left.key.localeCompare(right.key));
  return Object.freeze({
    development: Object.freeze(ranked.slice(0, DEVELOPMENT_PER_LEVEL).map((item) => item.key)),
    fresh: Object.freeze(ranked.slice(DEVELOPMENT_PER_LEVEL).map((item) => item.key)),
  });
}

function membershipDigest(development, fresh) {
  return sha256([
    ...development.map((key) => `development\0${key}`),
    ...fresh.map((key) => `fresh\0${key}`),
  ].toSorted().join('\n'));
}

async function inspectSource(options = {}) {
  const root = sourceRoot(options);
  await readPinnedFile(root, SOURCE_FILES.readme);
  const development = [];
  const fresh = [];
  const levelInventory = {};
  const rowsByLevel = new Map();
  const formulaOperators = { not: 0, and: 0, or: 0, xor: 0, implies: 0, forall: 0, exists: 0 };
  let formulaCount = 0;
  let premiseCount = 0;
  for (const level of LEVELS) {
    const rows = await readPinnedArray(root, SOURCE_FILES[level]);
    const ids = new Set();
    let minimumPremises = Infinity;
    let maximumPremises = 0;
    for (const [index, record] of rows.entries()) {
      validateDevelopmentRecord(record, level, index);
      invariant(!ids.has(record.id), `dev/${level}.json:${index + 1}.id`, `duplicate ID ${record.id}.`);
      ids.add(record.id);
      const formulas = [...Object.values(record.nl2fol), record.conclusion_fol];
      premiseCount += formulas.length - 1;
      formulaCount += formulas.length;
      minimumPremises = Math.min(minimumPremises, formulas.length - 1);
      maximumPremises = Math.max(maximumPremises, formulas.length - 1);
      for (const formula of formulas) {
        for (const symbol of formula.match(/[¬∧∨⊕→∀∃]/gu) ?? []) {
          const operatorNames = {
            '¬': 'not', '∧': 'and', '∨': 'or', '⊕': 'xor', '→': 'implies', '∀': 'forall', '∃': 'exists',
          };
          const name = operatorNames[symbol];
          formulaOperators[name] += 1;
        }
      }
    }
    rowsByLevel.set(level, rows);
    const partition = partitionLevel(level, rows);
    development.push(...partition.development);
    fresh.push(...partition.fresh);
    levelInventory[level] = Object.freeze({
      records: rows.length, minimumPremises, maximumPremises,
      development: partition.development.length, fresh: partition.fresh.length,
    });
  }
  const trainingRows = await readPinnedArray(root, SOURCE_FILES.train);
  let validEmbeddedTrainingOutputs = 0;
  let malformedEmbeddedTrainingOutputs = 0;
  trainingRows.forEach((record, index) => {
    const result = validateTrainingRecord(record, index);
    validEmbeddedTrainingOutputs += Number(result.embeddedOutputJson);
    malformedEmbeddedTrainingOutputs += Number(!result.embeddedOutputJson);
  });
  return Object.freeze({
    root, rowsByLevel,
    inventory: Object.freeze({
      format: 'eslm-proverqa-source-inventory-v1', source: PROVERQA_SOURCE,
      files: Object.freeze(Object.fromEntries(Object.entries(SOURCE_FILES).map(([name, value]) => [name, value]))),
      evaluationRecords: development.length + fresh.length,
      trainingRecords: trainingRows.length,
      validEmbeddedTrainingOutputs,
      malformedEmbeddedTrainingOutputs,
      premiseAnnotations: premiseCount,
      formulaAnnotations: formulaCount,
      formulaOperators: Object.freeze(formulaOperators),
      levels: Object.freeze(levelInventory),
      sourceSetSha256: sha256(Object.values(SOURCE_FILES)
        .map(({ path, bytes, sha256: digest }) => `${path}\0${bytes}\0${digest}`).join('\n')),
      validation: 'all-four-native-JSON-arrays-and-the-dataset-card-validated-with-closed-schemas',
      sizePolicy: 'exact frozen file identity; no arbitrary file-size or record-count rejection',
      redistribution: PROVERQA_SOURCE.usePolicy,
    }),
    partition: Object.freeze({
      format: 'eslm-proverqa-evaluation-partition-v1', seed: PARTITION_SEED,
      policy: 'stable-SHA-256-order-within-official-difficulty-level',
      available: development.length + fresh.length,
      development: development.length, fresh: fresh.length,
      membershipSha256: membershipDigest(development, fresh),
      developmentMembershipSha256: sha256([...development].toSorted().join('\n')),
      freshMembershipSha256: sha256([...fresh].toSorted().join('\n')),
      strata: Object.freeze(levelInventory),
      freshVisibility: 'sealed-membership-only; no fresh loader is exported',
    }),
    development: new Set(development),
  });
}

export async function inventoryProverqaSource(options = {}) {
  const inspected = await inspectSource(options);
  return Object.freeze({ ...inspected.inventory, partition: inspected.partition });
}

export async function buildProverqaPartition(options = {}) {
  return (await inspectSource(options)).partition;
}

function lexicalRoot(word) {
  const normalized = word.normalize('NFKC').toLocaleLowerCase('en-US');
  if (normalized.length > 5 && normalized.endsWith('ies')) return `${normalized.slice(0, -3)}y`;
  if (normalized.length > 5 && normalized.endsWith('ing')) return normalized.slice(0, -3);
  if (normalized.length > 4 && normalized.endsWith('ed')) return normalized.slice(0, -2);
  if (normalized.length > 4 && normalized.endsWith('ly')) return normalized.slice(0, -2);
  if (normalized.length > 3 && normalized.endsWith('s')) return normalized.slice(0, -1);
  return normalized;
}

function predicateRoots(identifier) {
  return identifier.normalize('NFKC').toLocaleLowerCase('en-US').split('_')
    .filter((word) => word && !['is', 'are', 'was', 'were', 'can', 'could', 'to', 'the', 'a', 'an'].includes(word))
    .map(lexicalRoot).toSorted();
}

function rootsEquivalent(left, right) {
  if (left === right) return true;
  let shared = 0;
  while (shared < left.length && shared < right.length && left[shared] === right[shared]) shared += 1;
  return shared >= 5 && shared / Math.min(left.length, right.length) >= 0.75;
}

function signatureEquivalent(left, right) {
  return left.length === right.length
    && left.every((word) => right.some((candidate) => rootsEquivalent(word, candidate)))
    && right.every((word) => left.some((candidate) => rootsEquivalent(word, candidate)));
}

function sourceRoots(source) {
  return new Set((source.normalize('NFKC').toLocaleLowerCase('en-US').match(/\p{L}+/gu) ?? [])
    .filter((word) => !['is', 'are', 'was', 'were', 'can', 'could', 'to', 'the', 'a', 'an'].includes(word))
    .map(lexicalRoot));
}

function signatureSubset(smaller, larger) {
  return smaller.every((word) => larger.includes(word));
}

function surfaceSupportedOmission(left, right, supportByIdentifier) {
  if (left.length === right.length || Math.min(left.length, right.length) < 2) return false;
  const [smaller, larger, shorterSupports] = left.length < right.length
    ? [left, right, supportByIdentifier.left]
    : [right, left, supportByIdentifier.right];
  if (larger.length - smaller.length !== 1 || !signatureSubset(smaller, larger)) return false;
  const omitted = larger.filter((word) => !smaller.includes(word));
  return shorterSupports.length > 0
    && shorterSupports.every((roots) => omitted.every((word) => roots.has(word)));
}

function predicateOccurrences(source) {
  return [...source.matchAll(/([\p{L}_][\p{L}\p{N}_.'’+-]*)\s*\(([^()]*)\)/gu)].map((match) => Object.freeze({
    identifier: match[1],
    arity: match[2].split(',').length,
  }));
}

function reconcileFormulaPredicates(sources, surfaceStatements = []) {
  const identifiers = [...new Set(sources.flatMap((source) =>
    [...source.matchAll(/([\p{L}_][\p{L}\p{N}_.'’+-]*)\s*(?=\()/gu)].map((match) => match[1])))];
  const support = new Map();
  const arities = new Map();
  sources.forEach((source, index) => {
    const roots = sourceRoots(surfaceStatements[index] ?? '');
    for (const occurrence of predicateOccurrences(source)) {
      if (!support.has(occurrence.identifier)) support.set(occurrence.identifier, []);
      support.get(occurrence.identifier).push(roots);
      if (!arities.has(occurrence.identifier)) arities.set(occurrence.identifier, new Set());
      arities.get(occurrence.identifier).add(occurrence.arity);
    }
  });
  const groups = [];
  for (const identifier of identifiers) {
    const signature = predicateRoots(identifier);
    const group = groups.find((candidate) => {
      const sameArity = [...(arities.get(identifier) ?? [])].every((arity) => candidate.arities.has(arity))
        && [...candidate.arities].every((arity) => arities.get(identifier)?.has(arity));
      return sameArity && (signatureEquivalent(candidate.signature, signature)
        || surfaceSupportedOmission(candidate.signature, signature, {
          left: candidate.supports,
          right: support.get(identifier) ?? [],
        }));
    });
    if (group) group.identifiers.push(identifier);
    else groups.push({
      signature, identifiers: [identifier],
      arities: arities.get(identifier) ?? new Set(),
      supports: support.get(identifier) ?? [],
    });
  }
  const replacements = new Map();
  let mergedPredicates = 0;
  for (const group of groups) {
    group.identifiers.sort((left, right) => left.length - right.length || left.localeCompare(right));
    const canonical = group.identifiers[0];
    for (const identifier of group.identifiers) {
      replacements.set(identifier, canonical);
      mergedPredicates += Number(identifier !== canonical);
    }
  }
  return Object.freeze({
    sources: Object.freeze(sources.map((source) => source.replace(
      /([\p{L}_][\p{L}\p{N}_.'’+-]*)\s*(?=\()/gu,
      (identifier) => replacements.get(identifier) ?? identifier,
    ))),
    mergedPredicates,
  });
}

export function compileProverqaFormulaTask(premises, query, options = {}) {
  invariant(Array.isArray(premises) && premises.length > 0, 'formulaTask.premises',
    'expected a non-empty formula array.');
  premises.forEach((formula, index) => requireText(formula, `formulaTask.premises[${index}]`));
  requireText(query, 'formulaTask.query');
  const premiseStatements = options.premiseStatements ?? [];
  invariant(Array.isArray(premiseStatements), 'formulaTask.premiseStatements', 'expected an array when provided.');
  invariant(premiseStatements.length === 0 || premiseStatements.length === premises.length,
    'formulaTask.premiseStatements', 'must align one-to-one with the premise formulas.');
  premiseStatements.forEach((statement, index) => requireText(statement, `formulaTask.premiseStatements[${index}]`));
  const reconciled = reconcileFormulaPredicates(
    [...premises, query],
    [...premiseStatements, options.queryStatement ?? ''],
  );
  const reconciledQuery = reconciled.sources.at(-1);
  const task = compileFolioFormulaSet(reconciled.sources.slice(0, -1), reconciledQuery);
  return Object.freeze({ ...task, sourceAnnotationNormalization: Object.freeze({
    policy: 'predicate-morphology-and-surface-evidence-v2', mergedPredicates: reconciled.mergedPredicates,
  }) });
}

export function evaluateProverqaFormulaTask(task) {
  const positive = decideBooleanEntailment(task);
  if (positive.status !== 'SOLVED') {
    return Object.freeze({ status: positive.status, predicted: undefined, witnessValid: false });
  }
  const positiveValid = verifyBooleanEntailmentResult(task, positive);
  if (positive.entailed) {
    return Object.freeze({ status: 'SOLVED', predicted: 'A', witnessValid: positiveValid,
      normalization: task.sourceAnnotationNormalization });
  }
  const negativeTask = Object.freeze({ ...task, query: negate(task.query) });
  const negative = decideBooleanEntailment(negativeTask);
  if (negative.status !== 'SOLVED') {
    return Object.freeze({ status: negative.status, predicted: undefined, witnessValid: false });
  }
  return Object.freeze({
    status: 'SOLVED', predicted: negative.entailed ? 'B' : 'C',
    witnessValid: positiveValid && verifyBooleanEntailmentResult(negativeTask, negative),
    normalization: task.sourceAnnotationNormalization,
  });
}

function adaptRecord(record, level) {
  const annotations = Object.entries(record.nl2fol);
  const id = caseId(level, record.id);
  const visible = Object.freeze({
    id, operation: 'classify-first-order-entailment', level,
    context: record.context, question: record.question,
    options: Object.freeze([...record.options]),
    logicalFormTask: compileProverqaFormulaTask(
      annotations.map(([, formula]) => formula),
      record.conclusion_fol,
      { premiseStatements: annotations.map(([statement]) => statement), queryStatement: record.question },
    ),
    evidenceRegime: 'annotation-assisted-logical-form-development-diagnostic',
  });
  const oracle = Object.freeze({ id, answer: record.answer, referenceReasoning: record.reasoning });
  return Object.freeze({ visible, oracle });
}

export function adaptProverqaDevelopmentRecord(record, level = 'easy') {
  invariant(LEVELS.includes(level), 'level', `expected one of ${LEVELS.join(', ')}.`);
  validateDevelopmentRecord(record, level, record.id ?? 0);
  return adaptRecord(record, level);
}

async function collectDevelopment(options = {}) {
  const inspected = await inspectSource(options);
  const cases = [];
  const oracle = new Map();
  for (const level of LEVELS) {
    for (const record of inspected.rowsByLevel.get(level)) {
      if (!inspected.development.has(caseKey(level, record.id))) continue;
      const adapted = adaptRecord(record, level);
      cases.push(adapted.visible);
      oracle.set(adapted.oracle.id, adapted.oracle);
    }
  }
  cases.sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze({ cases: Object.freeze(cases), oracle, inspected });
}

export async function loadProverqaDevelopmentPool(options = {}) {
  const collected = await collectDevelopment(options);
  return Object.freeze({
    format: 'eslm-proverqa-label-free-development-pool-v1',
    available: collected.inspected.partition.available,
    development: collected.cases.length,
    freshHeldOut: collected.inspected.partition.fresh,
    oracle: 'host-only-not-returned', cases: collected.cases,
  });
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

export async function runProverqaDevelopmentProbe(options = {}) {
  const collected = await collectDevelopment(options);
  const byLevel = Object.fromEntries(LEVELS.map((level) => [level, { tested: 0, correct: 0 }]));
  const byAnswer = Object.fromEntries(['A', 'B', 'C'].map((answer) => [answer, { tested: 0, correct: 0 }]));
  const statusCounts = {};
  let correct = 0;
  let witnessValid = 0;
  let casesWithPredicateReconciliation = 0;
  let mergedPredicates = 0;
  for (const item of collected.cases) {
    const expected = collected.oracle.get(item.id).answer;
    const result = evaluateProverqaFormulaTask(item.logicalFormTask);
    const passed = result.predicted === expected;
    correct += Number(passed);
    witnessValid += Number(result.witnessValid);
    increment(statusCounts, result.status);
    byLevel[item.level].tested += 1;
    byLevel[item.level].correct += Number(passed);
    byAnswer[expected].tested += 1;
    byAnswer[expected].correct += Number(passed);
    const merges = result.normalization?.mergedPredicates ?? 0;
    casesWithPredicateReconciliation += Number(merges > 0);
    mergedPredicates += merges;
  }
  return Object.freeze({
    format: 'eslm-proverqa-development-result-v1',
    evidenceRegime: 'development-visible-annotation-assisted-logical-form-diagnostic',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    sourceAvailable: collected.inspected.partition.available,
    tested: collected.cases.length,
    freshHeldOut: collected.inspected.partition.fresh,
    correct, accuracy: correct / collected.cases.length,
    statusCounts: Object.freeze(statusCounts),
    byLevel: Object.freeze(byLevel), byAnswer: Object.freeze(byAnswer),
    proofOrCountermodelWitnessesValid: witnessValid,
    casesWithPredicateReconciliation, mergedPredicates,
    languageAgentInvocations: 0, normalizationCandidates: 0,
    scorer: 'A when the query is entailed, B when its negation is entailed, C when neither is entailed',
    limitation: 'Uses official nl2fol and conclusion_fol annotations; it is not a direct natural-language score.',
    fresh: Object.freeze({ executed: false, cases: collected.inspected.partition.fresh,
      visibility: collected.inspected.partition.freshVisibility }),
  });
}

export async function runProverqaFreshAggregate(options = {}) {
  const inspected = await inspectSource(options);
  const byLevel = Object.fromEntries(LEVELS.map((level) => [level, { tested: 0, correct: 0 }]));
  const byAnswer = Object.fromEntries(['A', 'B', 'C'].map((answer) => [answer, { tested: 0, correct: 0 }]));
  const statusCounts = {};
  let tested = 0;
  let correct = 0;
  let witnessValid = 0;
  let casesWithPredicateReconciliation = 0;
  let mergedPredicates = 0;
  for (const level of LEVELS) {
    for (const record of inspected.rowsByLevel.get(level)) {
      if (inspected.development.has(caseKey(level, record.id))) continue;
      const adapted = adaptRecord(record, level);
      const result = evaluateProverqaFormulaTask(adapted.visible.logicalFormTask);
      const passed = result.predicted === adapted.oracle.answer;
      tested += 1;
      correct += Number(passed);
      witnessValid += Number(result.witnessValid);
      increment(statusCounts, result.status);
      byLevel[level].tested += 1;
      byLevel[level].correct += Number(passed);
      byAnswer[adapted.oracle.answer].tested += 1;
      byAnswer[adapted.oracle.answer].correct += Number(passed);
      const merges = result.normalization?.mergedPredicates ?? 0;
      casesWithPredicateReconciliation += Number(merges > 0);
      mergedPredicates += merges;
    }
  }
  return Object.freeze({
    format: 'eslm-proverqa-sealed-fresh-aggregate-v1',
    evidenceState: 'sealed-fresh-aggregate-only',
    track: 'source-annotation-assisted-finite-entailment',
    tested, available: inspected.partition.fresh,
    correct, accuracy: correct / tested,
    statusCounts: Object.freeze(statusCounts),
    byLevel: Object.freeze(byLevel),
    byAnswer: Object.freeze(byAnswer),
    proofOrCountermodelWitnessesValid: witnessValid,
    sourceAnnotationNormalization: Object.freeze({
      policy: 'predicate-morphology-and-surface-evidence-v2',
      casesWithReconciliation: casesWithPredicateReconciliation,
      mergedPredicates,
      usesAnswerOrReferenceReasoning: false,
    }),
    languageAgentInvocations: 0,
    normalizationCandidates: 0,
    partitionMembershipSha256: inspected.partition.freshMembershipSha256,
    oracleBoundary: 'The evaluator returns aggregate and declared-stratum counts only; no case, identifier, formula, sentence, answer, reasoning trace, witness, or per-case outcome is returned.',
    claimBoundary: 'Fresh evidence for the frozen annotation-assisted logical-form track; not a direct natural-language score or an official leaderboard submission.',
  });
}
