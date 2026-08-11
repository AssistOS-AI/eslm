import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PROJECT_ROOT } from '../paths.mjs';
import { atom, binary, negate } from '../reasoning/finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../reasoning/sat-entailment.mjs';
const CODE_REVISION = '3c93c5b6ee89c563fff279bdf286845d8b7cbe36';
const DATASET_REVISION = '186740e5fb7c0fede11d13f3fbcf7d7d92d70dc9';
const PARTITION_SEED = 'eslm-satbench-clause-stratified-partition-v1';
const EXPECTED_ROWS = 2_100;
const DEVELOPMENT_PER_CLAUSE_STRATUM = 28;
const EXPECTED_CLAUSE_COUNTS = Object.freeze([4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
const TEXT_CHARACTER_BOUND = 65_536;
const ARRAY_ITEM_BOUND = 4_096;
export const SATBENCH_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'satbench-v1.0.0-official',
  repository: 'https://github.com/Anjiang-Wei/SATBench',
  codeRevision: CODE_REVISION,
  codeArchiveUrl: `https://codeload.github.com/Anjiang-Wei/SATBench/tar.gz/${CODE_REVISION}`,
  codeArchivePath: `training/.cache/benchmarks/satbench/source/${CODE_REVISION}.tar.gz`,
  codeArchiveBytes: 22_392,
  codeArchiveSha256: '2f47f48049bc10b360ec177f7d6c65df5f3a9387f90602f00b7272c26e66502a',
  dataset: 'https://huggingface.co/datasets/LLM4Code/SATBench',
  datasetRevision: DATASET_REVISION,
  datasetPath: `training/.cache/benchmarks/satbench/dataset/SATBench-problems-${DATASET_REVISION}.jsonl`,
  datasetBytes: 32_618_716,
  datasetSha256: 'd32ee8ca8ccee4ee3dcb322e174d4cbe5ffebbd1b76dcdb702d397afd34294b5',
  datasetCardSha256: 'ff0cd042a14cb85ecc7291e69b1797966e987ffa3512762fd2ce512af33cdea4',
  license: 'Apache-2.0',
  paper: 'https://aclanthology.org/2025.emnlp-main.1716/',
});
export const SATBENCH_PARTITION = Object.freeze({
  format: 'eslm-benchmark-partition-policy-v1',
  seed: PARTITION_SEED,
  strata: 'official num_clauses value; labels and answer explanations are excluded from ranking',
  developmentPerStratum: DEVELOPMENT_PER_CLAUSE_STRATUM,
  developmentCount: 420,
  developmentMembershipSha256: 'c1317f7ca944583464d34f4830a1c840b510d1c506a38531323584c4bbee415f',
  freshCount: 1_680,
  freshMembershipSha256: 'bff899604f6e9d0ef2dde8b43960f1d125f8cfa2d16030fd5707dacad3a1457d',
  allMembershipSha256: '87cbc449ca9253dafc4c71efab12f3838d19f924cdabf99e1ac68a6e074ab073',
});
function requireCondition(condition, path, message) {
  if (!condition) throw new Error(`SATBench ${path}: ${message}`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function requireText(value, path) {
  requireCondition(typeof value === 'string' && value.length > 0, path, 'expected non-empty text.');
  requireCondition(value.length <= TEXT_CHARACTER_BOUND, path,
    `text exceeds the ${TEXT_CHARACTER_BOUND}-character record-field safety bound.`);
  requireCondition(!value.includes('\0') && !value.includes('\uFFFD'), path,
    'text contains an invalid character.');
}
function exactFields(value, expected, path) {
  requireCondition(plainObject(value), path, 'expected an object.');
  requireCondition(Object.keys(value).sort().join('\0') === [...expected].sort().join('\0'), path,
    `expected exactly ${expected.join(', ')}.`);
}
function validateTextArray(value, path) {
  requireCondition(Array.isArray(value) && value.length > 0 && value.length <= ARRAY_ITEM_BOUND, path,
    `expected 1 through ${ARRAY_ITEM_BOUND} text items.`);
  value.forEach((item, index) => requireText(item, `${path}[${index}]`));
}
function validateConsistencyHistory(value, path) {
  requireCondition(Array.isArray(value) && value.length > 0 && value.length <= ARRAY_ITEM_BOUND, path,
    `expected 1 through ${ARRAY_ITEM_BOUND} validation attempts.`);
  for (const [index, attempt] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    exactFields(attempt, ['attempt', 'conditions', 'question', 'trace'], itemPath);
    requireCondition(Number.isInteger(attempt.attempt) && attempt.attempt >= 1, `${itemPath}.attempt`,
      'expected a positive integer.');
    validateTextArray(attempt.conditions, `${itemPath}.conditions`);
    requireText(attempt.question, `${itemPath}.question`);
    requireText(attempt.trace, `${itemPath}.trace`);
  }
}
function expectedFields(satisfiable) {
  return [
    'dims', 'num_vars', 'num_clauses', 'clauses', 'readable', 'satisfiable',
    satisfiable ? 'sat_reason' : 'unsat_reason',
    'scenario', 'variable_mapping', 'conditions', 'question', 'formula_equivalence_check',
    'recovered_formula', 'recovered_formula_full_text', 'consistency_check_trace_history',
  ];
}
function validateSourceRecord(record, lineNumber) {
  const path = `SATBench-problems.jsonl:${lineNumber}`;
  requireCondition(plainObject(record), path, 'expected a JSON object.');
  requireCondition(typeof record.satisfiable === 'boolean', `${path}.satisfiable`, 'expected a Boolean.');
  exactFields(record, expectedFields(record.satisfiable), path);
  requireCondition(Array.isArray(record.dims) && record.dims.length >= 1 && record.dims.length <= 8,
    `${path}.dims`, 'expected one through eight dimensions.');
  record.dims.forEach((value, index) => requireCondition(Number.isInteger(value) && value >= 1,
    `${path}.dims[${index}]`, 'expected a positive integer.'));
  requireCondition(Number.isInteger(record.num_vars) && record.num_vars >= 1,
    `${path}.num_vars`, 'expected a positive integer.');
  requireCondition(record.dims.reduce((product, value) => product * value, 1) === record.num_vars,
    `${path}.num_vars`, 'must equal the product of dims.');
  requireCondition(Number.isInteger(record.num_clauses) && record.num_clauses >= 1,
    `${path}.num_clauses`, 'expected a positive integer.');
  requireCondition(Array.isArray(record.clauses) && record.clauses.length === record.num_clauses,
    `${path}.clauses`, 'must contain exactly num_clauses clauses.');
  for (const [clauseIndex, clause] of record.clauses.entries()) {
    const clausePath = `${path}.clauses[${clauseIndex}]`;
    requireCondition(Array.isArray(clause) && clause.length >= 1 && clause.length <= record.num_vars,
      clausePath, 'expected a non-empty finite clause.');
    const literals = new Set();
    for (const [literalIndex, literal] of clause.entries()) {
      requireCondition(Number.isInteger(literal) && literal !== 0 && Math.abs(literal) <= record.num_vars,
        `${clausePath}[${literalIndex}]`, 'expected a nonzero signed variable within num_vars.');
      requireCondition(!literals.has(literal), `${clausePath}[${literalIndex}]`, 'duplicate literal.');
      requireCondition(!literals.has(-literal), `${clausePath}[${literalIndex}]`, 'tautological clause.');
      literals.add(literal);
    }
  }
  for (const field of [
    'readable', 'scenario', 'variable_mapping', 'question', 'formula_equivalence_check',
    'recovered_formula', 'recovered_formula_full_text', record.satisfiable ? 'sat_reason' : 'unsat_reason',
  ]) requireText(record[field], `${path}.${field}`);
  requireCondition(record.formula_equivalence_check === '[EQUIVALENT]',
    `${path}.formula_equivalence_check`, 'expected the official equivalence validation marker.');
  validateTextArray(record.conditions, `${path}.conditions`);
  validateConsistencyHistory(record.consistency_check_trace_history,
    `${path}.consistency_check_trace_history`);
}

function visibleIdentity(record) {
  return {
    dims: record.dims,
    num_vars: record.num_vars,
    num_clauses: record.num_clauses,
    clauses: record.clauses,
    readable: record.readable,
    scenario: record.scenario,
    variable_mapping: record.variable_mapping,
    conditions: record.conditions,
    question: record.question,
  };
}
function caseId(record) {
  return `satbench:${sha256(JSON.stringify(visibleIdentity(record)))}`;
}
function membershipDigest(ids) {
  return sha256(`${[...ids].sort().join('\n')}\n`);
}

function sourcePath(options = {}) {
  return options.file ?? join(PROJECT_ROOT, SATBENCH_SOURCE.datasetPath);
}

export async function hasSatbenchSource(options = {}) {
  try {
    return (await stat(sourcePath(options))).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function streamSource(options = {}, onRecord = undefined) {
  const path = sourcePath(options);
  const details = await stat(path);
  requireCondition(details.size === SATBENCH_SOURCE.datasetBytes, path,
    `expected ${SATBENCH_SOURCE.datasetBytes} bytes, found ${details.size}.`);
  const digest = createHash('sha256');
  const source = createReadStream(path);
  source.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  const clauseCounts = new Map();
  const labels = { SAT: 0, UNSAT: 0 };
  const ids = new Set();
  let records = 0;
  let conditionCountMismatches = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    records += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`SATBench SATBench-problems.jsonl:${records}: invalid JSON: ${error.message}`);
    }
    validateSourceRecord(record, records);
    const id = caseId(record);
    requireCondition(!ids.has(id), `SATBench-problems.jsonl:${records}`, 'duplicate label-free case identity.');
    ids.add(id);
    clauseCounts.set(record.num_clauses, (clauseCounts.get(record.num_clauses) ?? 0) + 1);
    labels[record.satisfiable ? 'SAT' : 'UNSAT'] += 1;
    conditionCountMismatches += Number(record.conditions.length !== record.num_clauses);
    await onRecord?.(record, Object.freeze({ id, lineNumber: records }));
  }
  requireCondition(records === EXPECTED_ROWS, path, `expected ${EXPECTED_ROWS} records, found ${records}.`);
  const fileSha256 = digest.digest('hex');
  requireCondition(fileSha256 === SATBENCH_SOURCE.datasetSha256, path,
    'content digest differs from the pinned dataset revision.');
  requireCondition(
    [...clauseCounts].sort(([left], [right]) => left - right).every(([count, rows], index) =>
      count === EXPECTED_CLAUSE_COUNTS[index] && rows === 140),
    path,
    'the frozen 15-by-140 clause-count inventory changed.',
  );
  return Object.freeze({
    format: 'eslm-satbench-source-inventory-v1', source: SATBENCH_SOURCE,
    records, bytes: details.size, sha256: fileSha256,
    labels: Object.freeze(labels),
    clauseCounts: Object.freeze(Object.fromEntries([...clauseCounts].sort(([left], [right]) => left - right))),
    conditionCountMismatches,
  });
}

async function partitionSource(options = {}) {
  const strata = new Map();
  const inventory = await streamSource(options, (record, metadata) => {
    if (!strata.has(record.num_clauses)) strata.set(record.num_clauses, []);
    strata.get(record.num_clauses).push(Object.freeze({
      id: metadata.id,
      rank: sha256(`${PARTITION_SEED}\0${record.num_clauses}\0${metadata.id}`),
    }));
  });
  const development = [];
  const fresh = [];
  for (const [numClauses, cases] of [...strata].sort(([left], [right]) => left - right)) {
    requireCondition(cases.length === 140, `partition.${numClauses}`, 'expected 140 source cases.');
    cases.sort((left, right) => left.rank.localeCompare(right.rank));
    development.push(...cases.slice(0, DEVELOPMENT_PER_CLAUSE_STRATUM).map((item) => item.id));
    fresh.push(...cases.slice(DEVELOPMENT_PER_CLAUSE_STRATUM).map((item) => item.id));
  }
  requireCondition(development.length === SATBENCH_PARTITION.developmentCount,
    'partition.development', 'count changed.');
  requireCondition(fresh.length === SATBENCH_PARTITION.freshCount, 'partition.fresh', 'count changed.');
  requireCondition(membershipDigest(development) === SATBENCH_PARTITION.developmentMembershipSha256,
    'partition.development', 'membership digest changed.');
  requireCondition(membershipDigest(fresh) === SATBENCH_PARTITION.freshMembershipSha256,
    'partition.fresh', 'membership digest changed.');
  requireCondition(membershipDigest([...development, ...fresh]) === SATBENCH_PARTITION.allMembershipSha256,
    'partition.all', 'membership digest changed.');
  return Object.freeze({
    inventory,
    development: Object.freeze(development),
    fresh: Object.freeze(fresh),
  });
}

export async function inventorySatbenchSource(options = {}) {
  const partition = await partitionSource(options);
  return Object.freeze({
    ...partition.inventory,
    partition: Object.freeze({
      development: Object.freeze({
        count: partition.development.length,
        membershipSha256: membershipDigest(partition.development),
      }),
      fresh: Object.freeze({
        count: partition.fresh.length,
        membershipSha256: membershipDigest(partition.fresh),
        visibility: 'sealed-membership-only; no fresh-case loader is exported',
      }),
    }),
  });
}

function variableAtom(variable) {
  return atom(`variable:${variable}`);
}

function clauseFormula(clause) {
  const formulas = clause.map((literal) => {
    const value = variableAtom(Math.abs(literal));
    return literal > 0 ? value : negate(value);
  });
  return formulas.slice(1).reduce((left, right) => binary('or', left, right), formulas[0]);
}

export function compileSatbenchFormulaTask(record, id = 'satbench-formula-case') {
  validateSourceRecord(record, id);
  const witnessVariable = variableAtom(1);
  return Object.freeze({
    schema: 'boolean-satisfiability-via-entailment-task-v1',
    operation: 'decide-boolean-entailment',
    premises: Object.freeze(record.clauses.map((clause) => clauseFormula(clause))),
    query: binary('or', witnessVariable, negate(witnessVariable)),
    inconsistencyPolicy: 'report',
    clauses: Object.freeze(record.clauses.map((clause) => Object.freeze([...clause]))),
    numVariables: record.num_vars,
    metadata: Object.freeze({
      projection: 'official-cnf-annotation',
      decisionMapping: 'consistent-context-is-SAT; inconsistent-context-is-UNSAT',
    }),
  });
}

function difficulty(numClauses) {
  if (numClauses <= 15) return 'easy';
  if (numClauses <= 30) return 'medium';
  return 'hard';
}

function adaptRecord(record, metadata, visibility) {
  const task = compileSatbenchFormulaTask(record, metadata.id);
  return Object.freeze({
    visible: Object.freeze({
      id: metadata.id,
      kind: 'boolean-satisfiability',
      scenario: record.scenario,
      variableMapping: record.variable_mapping,
      conditions: Object.freeze([...record.conditions]),
      question: record.question,
      task,
      metadata: Object.freeze({
        family: 'SATBench',
        sourceRevision: DATASET_REVISION,
        visibility,
        numVariables: record.num_vars,
        numClauses: record.num_clauses,
        dimensions: Object.freeze([...record.dims]),
        difficulty: difficulty(record.num_clauses),
        evaluationTrack: 'source-annotated-formula-symbolic',
      }),
    }),
    oracle: Object.freeze({
      id: metadata.id,
      satisfiable: record.satisfiable,
      referenceReason: record.satisfiable ? record.sat_reason : record.unsat_reason,
    }),
  });
}

export async function loadSatbenchDevelopmentPool(options = {}) {
  const partition = await partitionSource(options);
  const selected = new Set(partition.development);
  const pool = [];
  const oracle = [];
  await streamSource(options, (record, metadata) => {
    if (!selected.has(metadata.id)) return;
    const adapted = adaptRecord(record, metadata, 'development-visible');
    pool.push(adapted.visible);
    oracle.push(adapted.oracle);
  });
  pool.sort((left, right) => left.id.localeCompare(right.id));
  oracle.sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze({
    format: 'eslm-satbench-development-pool-v1',
    inventory: partition.inventory,
    pool: Object.freeze(pool),
    oracle: Object.freeze(oracle),
    partition: Object.freeze({
      seed: PARTITION_SEED,
      count: pool.length,
      membershipSha256: membershipDigest(pool.map((item) => item.id)),
      strata: '28 label-blind stable-hash members for each official num_clauses value',
    }),
    track: Object.freeze({
      id: 'source-annotated-formula-symbolic',
      input: 'the official clauses field compiled to the generic Boolean formula AST',
      claimBoundary: 'separate from the official natural-language-only prompt track',
    }),
  });
}

function assignmentSatisfiesClauses(task, assignment) {
  if (!plainObject(assignment)) return false;
  return task.clauses.every((clause) => clause.some((literal) => {
    const value = assignment[`variable:${Math.abs(literal)}`] ?? false;
    return literal > 0 ? value === true : value === false;
  }));
}

function executeFormulaTask(task, budgets = undefined) {
  const input = {
    premises: task.premises,
    query: task.query,
    inconsistencyPolicy: task.inconsistencyPolicy,
    budgets,
  };
  const result = decideBooleanEntailment(input);
  const coreWitnessValid = verifyBooleanEntailmentResult(input, result);
  if (result.status === 'INCONSISTENT_CONTEXT') {
    return Object.freeze({
      status: 'SOLVED', satisfiable: false, value: 'UNSAT',
      witnessValid: coreWitnessValid,
      witnessKind: result.witness?.kind,
      resources: result.resources,
    });
  }
  if (result.status === 'SOLVED' && result.entailed === true) {
    const assignmentValid = assignmentSatisfiesClauses(task, result.witness?.contextModel);
    return Object.freeze({
      status: 'SOLVED', satisfiable: true, value: 'SAT',
      witnessValid: coreWitnessValid && assignmentValid,
      witnessKind: 'satisfying-assignment',
      resources: result.resources,
    });
  }
  return Object.freeze({
    status: result.status,
    satisfiable: undefined,
    value: undefined,
    witnessValid: coreWitnessValid,
    witnessKind: result.witness?.kind,
    resources: result.resources,
  });
}

function aggregateOutcomes(outcomes) {
  const correct = outcomes.filter((item) => item.pass).length;
  const statusCounts = Object.fromEntries([...new Set(outcomes.map((item) => item.status))].sort()
    .map((status) => [status, outcomes.filter((item) => item.status === status).length]));
  const witnessKinds = Object.fromEntries([...new Set(outcomes.map((item) => item.witnessKind))].sort()
    .map((kind) => [kind, outcomes.filter((item) => item.witnessKind === kind).length]));
  return Object.freeze({
    correct,
    statusCounts: Object.freeze(statusCounts),
    witnessKinds: Object.freeze(witnessKinds),
  });
}

export function scoreSatbenchDevelopment(pool, oracle, options = {}) {
  requireCondition(Array.isArray(pool) && Array.isArray(oracle), 'score', 'pool and oracle must be arrays.');
  const oracleById = new Map(oracle.map((item) => [item.id, item]));
  const outcomes = pool.map((item) => {
    const expected = oracleById.get(item.id);
    requireCondition(typeof expected?.satisfiable === 'boolean', `score.${item.id}`, 'missing host oracle.');
    const result = executeFormulaTask(item.task, options.budgets);
    return Object.freeze({
      id: item.id,
      pass: result.status === 'SOLVED' && result.satisfiable === expected.satisfiable && result.witnessValid,
      status: result.status,
      satisfiable: result.satisfiable,
      witnessValid: result.witnessValid,
      witnessKind: result.witnessKind,
      resources: result.resources,
    });
  });
  const aggregate = aggregateOutcomes(outcomes);
  return Object.freeze({
    format: 'eslm-satbench-development-result-v1',
    tested: outcomes.length,
    correct: aggregate.correct,
    accuracy: outcomes.length === 0 ? null : aggregate.correct / outcomes.length,
    directSymbolic: outcomes.length,
    languageAgentInvocations: 0,
    statusCounts: aggregate.statusCounts,
    witnessKinds: aggregate.witnessKinds,
    methodId: 'method:core:scalable-boolean-entailment',
    track: 'source-annotated-formula-symbolic',
    outcomes: Object.freeze(outcomes),
  });
}

export async function scoreSatbenchFreshAggregate(options = {}) {
  requireCondition(options.sealedEvaluation === true, 'fresh',
    'requires explicit sealedEvaluation authorization after dependency freeze.');
  const partition = await partitionSource(options);
  const selected = new Set(partition.fresh);
  const totals = { tested: 0, correct: 0, witnessValid: 0 };
  const statuses = new Map();
  const strata = new Map();
  await streamSource(options, (record, metadata) => {
    if (!selected.has(metadata.id)) return;
    const adapted = adaptRecord(record, metadata, 'sealed-fresh-host-only');
    const result = executeFormulaTask(adapted.visible.task, options.budgets);
    const pass = result.status === 'SOLVED'
      && result.satisfiable === adapted.oracle.satisfiable
      && result.witnessValid;
    totals.tested += 1;
    if (pass) totals.correct += 1;
    if (result.witnessValid) totals.witnessValid += 1;
    statuses.set(result.status, (statuses.get(result.status) ?? 0) + 1);
    const key = `${adapted.visible.metadata.difficulty}-${adapted.oracle.satisfiable ? 'SAT' : 'UNSAT'}`;
    const value = strata.get(key) ?? { tested: 0, correct: 0 };
    value.tested += 1;
    if (pass) value.correct += 1;
    strata.set(key, value);
  });
  requireCondition(totals.tested === SATBENCH_PARTITION.freshCount, 'fresh', 'denominator changed.');
  return Object.freeze({
    format: 'eslm-satbench-sealed-fresh-aggregate-v1',
    track: 'source-annotated-formula-symbolic',
    partitionMembershipSha256: SATBENCH_PARTITION.freshMembershipSha256,
    tested: totals.tested,
    correct: totals.correct,
    accuracy: totals.correct / totals.tested,
    witnessValid: totals.witnessValid,
    directSymbolic: totals.tested,
    languageAgentInvocations: 0,
    methodId: 'method:core:scalable-boolean-entailment',
    statusCounts: Object.freeze(Object.fromEntries([...statuses].sort(([left], [right]) =>
      left.localeCompare(right)))),
    strata: Object.freeze(Object.fromEntries([...strata].sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Object.freeze({ ...value, accuracy: value.correct / value.tested })]))),
  });
}
