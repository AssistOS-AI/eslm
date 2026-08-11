import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { atom, binary, negate } from '../reasoning/finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../reasoning/sat-entailment.mjs';

const REVISION = '0a6412b6fddf46324a1cb96e066dd7b3d89b87d6';
const PARTITION_SEED = 'eslm-prontoqa-ood-partition-v1';
const BASELINE_SEED = 'eslm-prontoqa-ood-development-baseline-v1';
const EXPECTED_FILE_COUNT = 79;
const EXPECTED_CASES_PER_FILE = 100;
const DEVELOPMENT_CASES_PER_FILE = 20;
const DEFAULT_BASELINE_CASES_PER_FILE = 2;
const MAX_QUESTION_CHARACTERS = 32_768;
const MAX_QUERY_CHARACTERS = 4_096;
const MAX_PROOF_STEPS = 64;
export const PRONTOQA_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'prontoqa-ood-official-2024-10-17',
  family: 'PrOntoQA-OOD',
  source: 'https://github.com/asaparov/prontoqa',
  revision: REVISION,
  archiveUrl: `https://codeload.github.com/asaparov/prontoqa/tar.gz/${REVISION}`,
  archivePath: `training/.cache/benchmarks/prontoqa/source/${REVISION}.tar.gz`,
  archiveSha256: '9e978f96efabff27bfee721b7bf14957dfaabe4d6527b2a69f810c3fee288094',
  datasetArtifact: 'generated_ood_data.zip',
  datasetSha256: '0becba04e1e1eb80593709c6a3db2a46badd5587a29587ffaeb68ed5068c9de9',
  extractedPath: `training/.cache/benchmarks/prontoqa/extracted/${REVISION}/generated_ood_data`,
  extractedBytes: 48_629_276,
  extractedFileSetSha256: 'f9012fd2ba0b9113f733e92c71530797798b04eaeccb866de64ffe763f408bee',
  license: 'Apache-2.0',
  licenseEvidence: `LICENSE at ${REVISION}; SHA-256 4a79e06d1d3a7e4e27d51ca1e9e2af85e57d8a77b436c205189251b3c1402e3f`,
});
export const PRONTOQA_PARTITION = Object.freeze({
  format: 'eslm-benchmark-partition-policy-v1',
  seed: PARTITION_SEED,
  unit: 'official generated test example',
  strata: 'one independent stratum per official JSON experiment file',
  developmentCasesPerFile: DEVELOPMENT_CASES_PER_FILE,
  developmentCount: 1_580,
  developmentMembershipSha256: '4d61f3a3be0fda34fac8d29b46ffd3bfefc8060ba478e933f91d0760c601bc09',
  freshCount: 6_320,
  freshMembershipSha256: '68300189c0e28fc30b0629b76c7f045dbe9571fde45fa00ea96838836f3a1ba4',
  allMembershipSha256: '95394a17dedad69a7d71bf00af44ff841ba9152ae0e0d95b94e7d261c3abb0a1',
  freshVisibility: 'sealed-membership-only; no fresh loader is exported by this adapter version',
});
function requireCondition(condition, message) {
  if (!condition) throw new Error(`PrOntoQA: ${message}`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function membershipDigest(ids) {
  return sha256(`${[...ids].sort().join('\n')}\n`);
}

function requireBoundedText(value, path, maximum = MAX_QUESTION_CHARACTERS) {
  requireCondition(typeof value === 'string' && value.length > 0, `${path} must be non-empty text.`);
  requireCondition(value.length <= maximum, `${path} exceeds ${maximum} characters.`);
  requireCondition(!value.includes('\0') && !value.includes('\uFFFD'), `${path} is not valid bounded UTF-8 text.`);
}

function expectedRecordKeys(fileName) {
  const count = fileName.includes('_4shot_') ? 4 : 8;
  return [...Array.from({ length: count }, (_, index) => `in_context_example${index}`), 'test_example'];
}

function validateExample(example, path) {
  requireCondition(example && typeof example === 'object' && !Array.isArray(example), `${path} must be an object.`);
  requireCondition(
    Object.keys(example).sort().join('\0') === ['chain_of_thought', 'query', 'question'].sort().join('\0'),
    `${path} must contain exactly question, query, and chain_of_thought.`,
  );
  requireBoundedText(example.question, `${path}.question`);
  requireBoundedText(example.query, `${path}.query`, MAX_QUERY_CHARACTERS);
  requireCondition(Array.isArray(example.chain_of_thought), `${path}.chain_of_thought must be an array.`);
  requireCondition(
    example.chain_of_thought.length > 0 && example.chain_of_thought.length <= MAX_PROOF_STEPS,
    `${path}.chain_of_thought must contain 1 through ${MAX_PROOF_STEPS} steps.`,
  );
  example.chain_of_thought.forEach((step, index) =>
    requireBoundedText(step, `${path}.chain_of_thought[${index}]`, MAX_QUERY_CHARACTERS));
}

function validateSourceRecord(record, fileName, key) {
  const expectedFields = expectedRecordKeys(fileName).sort().join('\0');
  requireCondition(
    record && typeof record === 'object' && !Array.isArray(record),
    `${fileName}:${key} must be an object.`,
  );
  requireCondition(
    Object.keys(record).sort().join('\0') === expectedFields,
    `${fileName}:${key} has an unexpected in-context-example shape.`,
  );
  for (const [field, example] of Object.entries(record)) validateExample(example, `${fileName}:${key}.${field}`);
  requireCondition(
    record.test_example.query.startsWith('Prove: ') && record.test_example.query.endsWith('.'),
    `${fileName}:${key}.test_example.query must use the official proof request form.`,
  );
}

function validateSourceFile(value, fileName) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), `${fileName} root must be an object.`);
  const recordKeys = Object.keys(value);
  const expectedKeys = Array.from({ length: EXPECTED_CASES_PER_FILE }, (_, index) => `example${index + 1}`);
  requireCondition(
    [...recordKeys].sort().join('\0') === expectedKeys.sort().join('\0'),
    `${fileName} must contain exactly example1 through example${EXPECTED_CASES_PER_FILE}.`,
  );
  for (const key of recordKeys) {
    validateSourceRecord(value[key], fileName, key);
  }
  return recordKeys;
}

function caseId(fileName, recordKey) {
  return `prontoqa-ood:${fileName.replace(/\.json$/u, '')}:${recordKey}`;
}

function partitionKeys(fileName, recordKeys) {
  const ranked = recordKeys.map((recordKey) => ({
    recordKey,
    rank: sha256(`${PARTITION_SEED}\0${fileName}\0${recordKey}`),
  })).sort((left, right) => left.rank.localeCompare(right.rank));
  return Object.freeze({
    development: Object.freeze(ranked.slice(0, DEVELOPMENT_CASES_PER_FILE).map((item) => item.recordKey)),
    fresh: Object.freeze(ranked.slice(DEVELOPMENT_CASES_PER_FILE).map((item) => item.recordKey)),
  });
}

function sourceRoot(options = {}) {
  return options.root ?? join(PROJECT_ROOT, PRONTOQA_SOURCE.extractedPath);
}

export async function hasProntoqaSource(options = {}) {
  try {
    return (await stat(sourceRoot(options))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function inspectSource(options = {}, onDevelopmentRecord = undefined, onFreshRecord = undefined) {
  const root = sourceRoot(options);
  const fileNames = (await readdir(root)).filter((name) => name.endsWith('.json')).sort();
  requireCondition(fileNames.length === EXPECTED_FILE_COUNT,
    `expected ${EXPECTED_FILE_COUNT} official JSON files, found ${fileNames.length}.`);
  const inventoryLines = [];
  const developmentIds = [];
  const freshIds = [];
  let trainingVisibleDemonstrations = 0;
  let totalBytes = 0;
  for (const fileName of fileNames) {
    const bytes = await readFile(join(root, fileName));
    requireCondition(bytes.length > 0, `${fileName} must not be empty.`);
    totalBytes += bytes.length;
    inventoryLines.push(`${fileName}\0${bytes.length}\0${sha256(bytes)}\n`);
    let source;
    try {
      source = JSON.parse(bytes);
    } catch (error) {
      throw new Error(`PrOntoQA: ${fileName} is not valid JSON: ${error.message}`);
    }
    const recordKeys = validateSourceFile(source, fileName);
    const partition = partitionKeys(fileName, recordKeys);
    developmentIds.push(...partition.development.map((recordKey) => caseId(fileName, recordKey)));
    freshIds.push(...partition.fresh.map((recordKey) => caseId(fileName, recordKey)));
    if (onDevelopmentRecord) {
      for (const recordKey of partition.development) {
        trainingVisibleDemonstrations += expectedRecordKeys(fileName).length - 1;
        await onDevelopmentRecord({ fileName, recordKey, record: source[recordKey] });
      }
    } else {
      trainingVisibleDemonstrations += partition.development.length * (expectedRecordKeys(fileName).length - 1);
    }
    if (onFreshRecord) {
      for (const recordKey of partition.fresh) {
        await onFreshRecord({ fileName, recordKey, record: source[recordKey] });
      }
    }
  }
  requireCondition(totalBytes === PRONTOQA_SOURCE.extractedBytes,
    `extracted byte count changed: expected ${PRONTOQA_SOURCE.extractedBytes}, found ${totalBytes}.`);
  requireCondition(sha256(inventoryLines.join('')) === PRONTOQA_SOURCE.extractedFileSetSha256,
    'extracted file-set digest does not match the frozen official artifact.');
  requireCondition(developmentIds.length === PRONTOQA_PARTITION.developmentCount, 'development count changed.');
  requireCondition(freshIds.length === PRONTOQA_PARTITION.freshCount, 'fresh count changed.');
  requireCondition(
    membershipDigest(developmentIds) === PRONTOQA_PARTITION.developmentMembershipSha256,
    'development membership digest changed.',
  );
  requireCondition(membershipDigest(freshIds) === PRONTOQA_PARTITION.freshMembershipSha256,
    'fresh membership digest changed.',
  );
  requireCondition(
    membershipDigest([...developmentIds, ...freshIds]) === PRONTOQA_PARTITION.allMembershipSha256,
    'complete membership digest changed.',
  );
  return Object.freeze({
    source: PRONTOQA_SOURCE,
    files: fileNames.length,
    availableCases: developmentIds.length + freshIds.length,
    trainingVisibleDemonstrations,
    extractedBytes: totalBytes,
    development: Object.freeze({ count: developmentIds.length, membershipSha256: membershipDigest(developmentIds) }),
    fresh: Object.freeze({
      count: freshIds.length,
      membershipSha256: membershipDigest(freshIds),
      visibility: PRONTOQA_PARTITION.freshVisibility,
    }),
  });
}

export async function inventoryProntoqaSource(options = {}) {
  return inspectSource(options);
}

function normalizedAtomId(entity, predicate) {
  const normalize = (value, path) => {
    const normalized = value.normalize('NFKC').toLocaleLowerCase('en-US')
      .replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
    requireCondition(/^[a-z][a-z0-9-]{0,48}$/u.test(normalized), `${path} cannot form a bounded semantic identifier.`);
    return normalized;
  };
  return `entity:${normalize(entity, 'entity')}:predicate:${normalize(predicate, 'predicate')}`;
}

function combine(operator, formulas) {
  requireCondition(formulas.length > 0, `${operator} expression has no operands.`);
  return formulas.slice(1).reduce((left, right) => binary(operator, left, right), formulas[0]);
}

function normalizeListPunctuation(text) {
  const coordinator = /(?:,|\b)\s*or\s+/u.test(text) ? 'or' : 'and';
  return text.replace(/,\s*(?:and|or)\s+/gu, ` ${coordinator} `).replace(/,\s*/gu, ` ${coordinator} `);
}

function parsePredicateExpression(text, entity, path) {
  let source = text.trim().replace(/[.]$/u, '');
  const repeatedSubject = new RegExp(`\\b${entity.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')} is `, 'gu');
  source = source.replace(repeatedSubject, '').trim();
  source = normalizeListPunctuation(source);
  const orParts = source.split(/\s+or\s+/u);
  if (orParts.length > 1) {
    return combine('or', orParts.map((part, index) => parsePredicateExpression(part, entity, `${path}.or[${index}]`)));
  }
  const andParts = source.split(/\s+and\s+/u);
  if (andParts.length > 1) {
    return combine('and', andParts.map((part, index) =>
      parsePredicateExpression(part, entity, `${path}.and[${index}]`)));
  }
  let negated = false;
  if (source.startsWith('not ')) {
    negated = true;
    source = source.slice(4);
  }
  source = source.replace(/^(?:a|an)\s+/u, '').trim();
  if (/^[a-z][a-z-]*uses$/u.test(source)) source = source.slice(0, -2);
  requireCondition(/^[a-z][a-z-]*$/u.test(source), `${path} has unsupported predicate text “${source}”.`);
  const formula = atom(normalizedAtomId(entity, source));
  return negated ? negate(formula) : formula;
}

function singularizeOfficialClass(surface, path) {
  requireCondition(/^[A-Z][a-z-]*$/u.test(surface), `${path} has unsupported plural class “${surface}”.`);
  return (surface.endsWith('uses') ? surface.slice(0, -2) : surface).toLocaleLowerCase('en-US');
}

function parseUniversalSentence(sentence, path) {
  let match = sentence.match(/^Everything that is (.+) is (.+)$/u);
  if (match) return { antecedent: match[1], consequent: match[2] };
  match = sentence.match(/^(?:Every|Each) ([a-z][a-z-]*) is (.+)$/u);
  if (match) return { antecedent: `a ${match[1]}`, consequent: match[2] };
  match = sentence.match(/^([A-Z][a-z-]*) are (.+)$/u);
  if (match) return { antecedent: `a ${singularizeOfficialClass(match[1], path)}`, consequent: match[2] };
  return undefined;
}

function parseIndividualSentence(sentence, path) {
  const normalized = sentence.replace(
    /,\s*(?:(and|or)\s+)?(?=[A-Z][a-z-]* is )/gu,
    (_match, operator) => ` ${operator ?? 'and'} `,
  );
  const parts = normalized.split(/\s+(and|or)\s+(?=[A-Z][a-z-]* is )/u);
  const clauses = [];
  const operators = [];
  for (let index = 0; index < parts.length; index += 2) {
    const match = parts[index].match(/^([A-Z][a-z-]*) is (.+)$/u);
    requireCondition(Boolean(match), `${path} has unsupported clause “${parts[index]}”.`);
    clauses.push({ entity: match[1], expression: match[2] });
    if (index + 1 < parts.length) operators.push(parts[index + 1]);
  }
  let formula = parsePredicateExpression(clauses[0].expression, clauses[0].entity, `${path}.clause[0]`);
  for (let index = 1; index < clauses.length; index += 1) {
    const right = parsePredicateExpression(
      clauses[index].expression,
      clauses[index].entity,
      `${path}.clause[${index}]`,
    );
    formula = binary(operators[index - 1], formula, right);
  }
  return { entities: clauses.map((item) => item.entity), formula };
}

function questionSentences(text, path) {
  requireCondition(text.endsWith('.'), `${path} must end with a period.`);
  const sentences = text.split(/(?<=\.)\s+/u).map((sentence) => sentence.replace(/[.]$/u, ''));
  requireCondition(sentences.length > 0 && sentences.every(Boolean), `${path} contains an empty sentence.`);
  return sentences;
}

export function compileProntoqaProofTask(example, id = 'prontoqa-development-case') {
  validateExample(example, id);
  const queryMatch = example.query.match(/^Prove: ([A-Z][a-z-]*) is (.+)[.]$/u);
  requireCondition(Boolean(queryMatch), `${id}.query has unsupported proof syntax.`);
  const queryEntity = queryMatch[1];
  const entities = new Set([queryEntity]);
  const universal = [];
  const individual = [];
  for (const [index, sentence] of questionSentences(example.question, `${id}.question`).entries()) {
    const rule = parseUniversalSentence(sentence, `${id}.question[${index}]`);
    if (rule) {
      universal.push(rule);
      continue;
    }
    const assertion = parseIndividualSentence(sentence, `${id}.question[${index}]`);
    assertion.entities.forEach((entity) => entities.add(entity));
    individual.push(assertion);
  }
  const premises = individual.map((item) => item.formula);
  for (const [ruleIndex, rule] of universal.entries()) {
    for (const entity of [...entities].sort()) {
      premises.push(binary(
        'implies',
        parsePredicateExpression(rule.antecedent, entity, `${id}.rule[${ruleIndex}].antecedent`),
        parsePredicateExpression(rule.consequent, entity, `${id}.rule[${ruleIndex}].consequent`),
      ));
    }
  }
  return Object.freeze({
    schema: 'boolean-entailment-task-v1',
    operation: 'decide-boolean-entailment',
    premises: Object.freeze(premises),
    query: parsePredicateExpression(queryMatch[2], queryEntity, `${id}.query`),
    inconsistencyPolicy: 'classical-explosion',
    metadata: Object.freeze({ sourceCaseId: id, entities: Object.freeze([...entities].sort()) }),
  });
}

function fileMetadata(fileName) {
  const match = fileName.match(/^(\d+)hop_(.+)_noadj[.]json$/u);
  requireCondition(Boolean(match), `${fileName} does not match the frozen generator artifact naming contract.`);
  const tokens = match[2].split('_');
  return Object.freeze({
    trainingHops: Number(match[1]),
    outOfDistribution: tokens.includes('OOD'),
    ruleFamily: tokens.find((token) => [
      'AndElim', 'AndIntro', 'Composed', 'ModusPonens',
      'OrElim', 'OrIntro', 'ProofByContra', 'ProofsOnly',
    ].includes(token)),
    configurationTokens: Object.freeze(tokens),
  });
}

export function adaptProntoqaDevelopmentRecord({ fileName, recordKey, record }) {
  validateSourceRecord(record, fileName, recordKey);
  const id = caseId(fileName, recordKey);
  const task = compileProntoqaProofTask(record.test_example, id);
  const visible = Object.freeze({
    id,
    kind: 'proof-entailment',
    context: record.test_example.question,
    query: record.test_example.query,
    task,
    metadata: Object.freeze({
      family: 'PrOntoQA-OOD',
      sourceRevision: REVISION,
      sourceFile: fileName,
      sourceRecord: recordKey,
      visibility: 'development-visible',
      ...fileMetadata(fileName),
    }),
  });
  const oracle = Object.freeze({
    id,
    expectedEntailed: true,
    referenceProof: Object.freeze([...record.test_example.chain_of_thought]),
  });
  return Object.freeze({ visible, oracle });
}

function adaptTrainingDemonstrations({ fileName, recordKey, record }) {
  const parentId = caseId(fileName, recordKey);
  return Object.entries(record).filter(([field]) => field.startsWith('in_context_example')).map(([field, example]) => {
    const id = `${parentId}:training:${field}`;
    return Object.freeze({
      id,
      kind: 'proof-entailment-demonstration',
      context: example.question,
      query: example.query,
      task: compileProntoqaProofTask(example, id),
      referenceProof: Object.freeze([...example.chain_of_thought]),
      metadata: Object.freeze({
        family: 'PrOntoQA-OOD', sourceRevision: REVISION, sourceFile: fileName,
        sourceRecord: recordKey, sourceField: field, visibility: 'training-visible-in-context-demonstration',
        ...fileMetadata(fileName),
      }),
    });
  });
}

function selectBaselineCases(items, casesPerFile) {
  requireCondition(Number.isInteger(casesPerFile) && casesPerFile >= 1
    && casesPerFile <= DEVELOPMENT_CASES_PER_FILE,
  `casesPerFile must be from 1 through ${DEVELOPMENT_CASES_PER_FILE}.`);
  const grouped = new Map();
  for (const item of items) {
    const fileName = item.metadata.sourceFile;
    if (!grouped.has(fileName)) grouped.set(fileName, []);
    grouped.get(fileName).push(item);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).flatMap(([, cases]) =>
    cases.map((item) => ({ item, rank: sha256(`${BASELINE_SEED}\0${item.id}`) }))
      .sort((left, right) => left.rank.localeCompare(right.rank))
      .slice(0, casesPerFile)
      .map(({ item }) => item));
}

export async function loadProntoqaDevelopmentPool(options = {}) {
  const pool = [];
  const oracle = [];
  const trainingPool = [];
  const inventory = await inspectSource(options, ({ fileName, recordKey, record }) => {
    const adapted = adaptProntoqaDevelopmentRecord({ fileName, recordKey, record });
    pool.push(adapted.visible);
    oracle.push(adapted.oracle);
    if (options.includeTraining === true) {
      trainingPool.push(...adaptTrainingDemonstrations({ fileName, recordKey, record }));
    }
  });
  const sample = selectBaselineCases(pool, options.casesPerFile ?? DEFAULT_BASELINE_CASES_PER_FILE);
  return Object.freeze({
    format: 'eslm-prontoqa-development-pool-v1',
    inventory,
    pool: Object.freeze(pool),
    oracle: Object.freeze(oracle),
    trainingPool: Object.freeze(trainingPool),
    sample: Object.freeze(sample),
    samplePolicy: Object.freeze({
      seed: BASELINE_SEED,
      casesPerFile: options.casesPerFile ?? DEFAULT_BASELINE_CASES_PER_FILE,
      count: sample.length,
      membershipSha256: membershipDigest(sample.map((item) => item.id)),
    }),
    leakagePolicy: Object.freeze({
      visible: 'only the stable development members and their in-context demonstrations may be inspected',
      oracle: 'reference proof is returned in a separate host-only array and never embedded in visible tasks',
      fresh: PRONTOQA_PARTITION.freshVisibility,
    }),
  });
}

export function scoreProntoqaDevelopmentSample(sample, oracle, options = {}) {
  requireCondition(Array.isArray(sample) && Array.isArray(oracle), 'sample and oracle must be arrays.');
  const oracleById = new Map(oracle.map((item) => [item.id, item]));
  const outcomes = [];
  for (const item of sample) {
    const expected = oracleById.get(item.id);
    requireCondition(expected?.expectedEntailed === true, `host oracle is missing ${item.id}.`);
    const reasoningInput = {
      premises: item.task.premises,
      query: item.task.query,
      budgets: options.budgets,
      inconsistencyPolicy: item.task.inconsistencyPolicy,
    };
    const result = decideBooleanEntailment(reasoningInput);
    const witnessValid = verifyBooleanEntailmentResult(reasoningInput, result);
    outcomes.push(Object.freeze({
      id: item.id,
      pass: result.status === 'SOLVED' && result.entailed === true && witnessValid,
      status: result.status,
      entailed: result.entailed,
      witnessValid,
      witnessKind: result.witness?.kind,
      resources: result.resources,
    }));
  }
  const correct = outcomes.filter((item) => item.pass).length;
  const statusCounts = Object.fromEntries([...new Set(outcomes.map((item) => item.status))].sort()
    .map((status) => [status, outcomes.filter((item) => item.status === status).length]));
  return Object.freeze({
    format: 'eslm-prontoqa-development-result-v2',
    tested: outcomes.length,
    correct,
    accuracy: outcomes.length === 0 ? null : correct / outcomes.length,
    directSymbolic: outcomes.length,
    codingAgentInvocations: 0,
    statusCounts: Object.freeze(statusCounts),
    methodId: 'method:core:scalable-boolean-entailment',
    proofPolicy: 'generic query-directed DPLL entailment certificate or finite countermodel; '
      + 'official natural-language reference proof remains host-only',
    outcomes: Object.freeze(outcomes),
  });
}

export async function scoreProntoqaFreshAggregate(options = {}) {
  requireCondition(options.sealedEvaluation === true,
    'fresh evaluation requires an explicit sealedEvaluation authorization after dependency freeze.');
  const totals = { tested: 0, correct: 0, witnessValid: 0 };
  const statusCounts = new Map();
  const ruleFamilies = new Map();
  await inspectSource(options, undefined, ({ fileName, recordKey, record }) => {
    const id = caseId(fileName, recordKey);
    const task = compileProntoqaProofTask(record.test_example, id);
    const reasoningInput = {
      premises: task.premises,
      query: task.query,
      budgets: options.budgets,
      inconsistencyPolicy: task.inconsistencyPolicy,
    };
    const result = decideBooleanEntailment(reasoningInput);
    const witnessValid = verifyBooleanEntailmentResult(reasoningInput, result);
    const pass = result.status === 'SOLVED' && result.entailed === true && witnessValid;
    totals.tested += 1;
    if (pass) totals.correct += 1;
    if (witnessValid) totals.witnessValid += 1;
    statusCounts.set(result.status, (statusCounts.get(result.status) ?? 0) + 1);
    const family = fileMetadata(fileName).ruleFamily ?? 'unspecified';
    const aggregate = ruleFamilies.get(family) ?? { tested: 0, correct: 0 };
    aggregate.tested += 1;
    if (pass) aggregate.correct += 1;
    ruleFamilies.set(family, aggregate);
  });
  requireCondition(totals.tested === PRONTOQA_PARTITION.freshCount, 'fresh denominator changed during evaluation.');
  return Object.freeze({
    format: 'eslm-prontoqa-sealed-fresh-aggregate-v1',
    partitionMembershipSha256: PRONTOQA_PARTITION.freshMembershipSha256,
    tested: totals.tested,
    correct: totals.correct,
    accuracy: totals.correct / totals.tested,
    witnessValid: totals.witnessValid,
    directSymbolic: totals.tested,
    codingAgentInvocations: 0,
    methodId: 'method:core:scalable-boolean-entailment',
    statusCounts: Object.freeze(Object.fromEntries([...statusCounts].sort(([left], [right]) =>
      left.localeCompare(right)))),
    strata: Object.freeze(Object.fromEntries([...ruleFamilies].sort(([left], [right]) =>
      left.localeCompare(right)).map(([family, aggregate]) => [family, Object.freeze({
        ...aggregate,
        accuracy: aggregate.correct / aggregate.tested,
      })]))),
  });
}
