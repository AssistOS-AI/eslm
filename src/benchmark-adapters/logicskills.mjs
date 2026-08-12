import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseCompactFolArgument, parseCompactFolFormula } from '../language/compact-fol.mjs';
import {
  compileControlledFolSentence,
  controlledFolFormulasEquivalent,
  verifyControlledFolSymbolization,
} from '../language/controlled-fol-symbolizer.mjs';
import { verifyFiniteFirstOrderCountermodel } from '../reasoning/finite-first-order-model.mjs';

export const LOGICSKILLS_RELEASE = Object.freeze({
  id: 'logicskills-arxiv-2602.06533v2',
  paperUrl: 'https://arxiv.org/abs/2602.06533v2',
  paperPdfUrl: 'https://arxiv.org/pdf/2602.06533v2',
  paperSha256: 'd6e09bfcb72a5188456aca9a682984a98e3b079e434a949e137696f527ab5616',
  repositoryUrl: 'https://github.com/brianrabern/LogicSkills',
  revision: '1f23e684d6b1a465047f8b0d833d9b9b3388441a',
  archiveUrl: 'https://github.com/brianrabern/LogicSkills/archive/1f23e684d6b1a465047f8b0d833d9b9b3388441a.tar.gz',
  archiveBytes: 45_726_962,
  archiveSha256: '8f25d38f2fc0efd7eaed73e801bc01202076544ca776b4a0861a205341275286',
  extractedDirectory: 'LogicSkills-1f23e684d6b1a465047f8b0d833d9b9b3388441a',
  codeLicense: 'MIT',
  benchmarkDataLicense: 'CC-BY-4.0',
});

const FILES = Object.freeze({
  'symbolization.jsonl': Object.freeze({ task: 'symbolization', rows: 600, languages: ['english', 'carroll'] }),
  'validity.jsonl': Object.freeze({ task: 'validity', rows: 600, languages: ['english', 'carroll'] }),
  'countermodel.jsonl': Object.freeze({ task: 'countermodel', rows: 300, languages: ['formal'] }),
});

function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function requiredString(value, path) {
  invariant(typeof value === 'string' && value.length > 0, path, 'expected a non-empty string.');
}

function validateRecord(record, metadata, line) {
  const path = `${metadata.file}:${line}`;
  invariant(record !== null && typeof record === 'object' && !Array.isArray(record), path,
    'expected a JSON object.');
  const keys = Object.keys(record).toSorted();
  const expected = ['answer', 'id', 'input', 'language', 'task'];
  invariant(keys.length === expected.length && keys.every((key, index) => key === expected[index]), path,
    `expected exactly these fields: ${expected.join(', ')}; received: ${keys.join(', ')}.`);
  requiredString(record.id, `${path}.id`);
  requiredString(record.input, `${path}.input`);
  invariant(record.task === metadata.task, `${path}.task`, `expected ${metadata.task}.`);
  invariant(metadata.languages.includes(record.language), `${path}.language`,
    `expected one of ${metadata.languages.join(', ')}.`);
  if (metadata.task === 'symbolization') {
    requiredString(record.answer, `${path}.answer`);
  } else if (metadata.task === 'validity') {
    invariant(Array.isArray(record.answer) && record.answer.length === 1, `${path}.answer`,
      'expected exactly one selected candidate number.');
    invariant(Number.isInteger(record.answer[0]) && record.answer[0] >= 1 && record.answer[0] <= 6,
      `${path}.answer[0]`, 'expected an integer from 1 through 6.');
  } else {
    invariant(record.answer === null, `${path}.answer`,
      'countermodels have no reference answer and require semantic verification.');
  }
}

async function streamFile(root, file, onRecord) {
  const descriptor = FILES[file];
  invariant(descriptor, file, 'unrecognized LogicSkills source file.');
  const metadata = Object.freeze({ file, ...descriptor });
  const path = join(root, 'logicskills', 'data', file);
  const digest = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const ids = new Set();
  const languageCounts = {};
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
    validateRecord(record, metadata, rows);
    invariant(!ids.has(record.id), `${file}:${rows}.id`, `duplicate source ID ${record.id}.`);
    ids.add(record.id);
    languageCounts[record.language] = (languageCounts[record.language] ?? 0) + 1;
    await onRecord?.(record, metadata);
  }
  invariant(rows === descriptor.rows, file,
    `expected ${descriptor.rows} rows from the pinned release, received ${rows}.`);
  return Object.freeze({
    file, task: descriptor.task, rows, languageCounts: Object.freeze(languageCounts),
    sha256: digest.digest('hex'),
  });
}

export function logicSkillsSourceRoot(cacheRoot = join('training', '.cache')) {
  return join(cacheRoot, 'benchmarks', 'logicskills', 'extracted', LOGICSKILLS_RELEASE.extractedDirectory);
}

export async function inventoryLogicSkillsSource(root) {
  const files = [];
  const allIds = new Set();
  for (const file of Object.keys(FILES)) {
    files.push(await streamFile(root, file, (record) => {
      invariant(!allIds.has(record.id), `${file}.${record.id}`, 'duplicate ID across benchmark tasks.');
      allIds.add(record.id);
    }));
  }
  const sourceSetSha256 = createHash('sha256')
    .update(files.map(({ file, rows, sha256 }) => `${file}\0${rows}\0${sha256}`).join('\n'))
    .digest('hex');
  return Object.freeze({
    protocol: 'logicskills-source-inventory-v1',
    release: LOGICSKILLS_RELEASE.id,
    rows: allIds.size,
    files: Object.freeze(files),
    sourceSetSha256,
    validation: 'all-normalized-benchmark-rows-streamed-with-closed-task-schemas',
  });
}

function rank(file, id) {
  return createHash('sha256').update(`logicskills-public-evaluation-partition-v1\0${file}\0${id}`).digest('hex');
}

async function partitionMembership(root, freshFraction) {
  invariant(typeof freshFraction === 'number' && freshFraction > 0 && freshFraction < 1,
    'freshFraction', 'expected a number strictly between zero and one.');
  const strata = new Map();
  for (const file of Object.keys(FILES)) {
    await streamFile(root, file, (record, metadata) => {
      const stratum = `${metadata.task}\0${record.language}`;
      const rows = strata.get(stratum) ?? [];
      rows.push(Object.freeze({ file, id: record.id, rank: rank(file, record.id) }));
      strata.set(stratum, rows);
    });
  }
  const development = new Set();
  const fresh = new Set();
  const counts = [];
  for (const [stratum, rows] of [...strata].toSorted(([left], [right]) => left.localeCompare(right))) {
    rows.sort((left, right) => left.rank.localeCompare(right.rank) || left.id.localeCompare(right.id));
    const freshCount = Math.ceil(rows.length * freshFraction);
    rows.forEach((row, index) => (index < freshCount ? fresh : development).add(`${row.file}\0${row.id}`));
    counts.push(Object.freeze({
      stratum: stratum.replace('\0', ' / '), available: rows.length,
      development: rows.length - freshCount, fresh: freshCount,
    }));
  }
  const membershipLines = [
    ...[...development].map((key) => `development\0${key}`),
    ...[...fresh].map((key) => `fresh\0${key}`),
  ].toSorted();
  return Object.freeze({
    development, fresh, strata: Object.freeze(counts),
    membershipSha256: createHash('sha256').update(membershipLines.join('\n')).digest('hex'),
  });
}

export async function buildLogicSkillsPartition(root, { freshFraction = 0.2 } = {}) {
  const membership = await partitionMembership(root, freshFraction);
  return Object.freeze({
    protocol: 'logicskills-public-evaluation-partition-v1',
    sourceLifecycle: 'fixed-public-evaluation-set',
    policy: 'stable-sha256-within-visible-task-and-language-strata',
    seed: 'logicskills-public-evaluation-partition-v1',
    freshFraction,
    available: membership.development.size + membership.fresh.size,
    development: membership.development.size,
    fresh: membership.fresh.size,
    membershipSha256: membership.membershipSha256,
    strata: membership.strata,
    freshVisibility: 'host-only-not-evaluated',
  });
}

const OPERATIONS = Object.freeze({
  symbolization: 'translate-controlled-language-to-first-order-logic',
  validity: 'assess-first-order-validity',
  countermodel: 'construct-finite-countermodel',
});

function compileSymbolizationPrompt(input) {
  const match = /\nSentence:\s*\n+([\s\S]+?)\n+Abbreviations:\s*\n+([\s\S]+)$/u.exec(input);
  if (!match) return Object.freeze({ status: 'UNPARSED', diagnostic: 'symbolization prompt boundary' });
  const predicates = [];
  const constants = [];
  for (const [index, line] of match[2].split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    const entry = /^([^:\s]+):\s*(.+)$/u.exec(line.trim());
    if (!entry) return Object.freeze({ status: 'UNPARSED',
      diagnostic: `abbreviation line ${index + 1} has no symbol-frame boundary` });
    const [, symbol, surface] = entry;
    if (surface.includes('[1]')) {
      predicates.push(Object.freeze({ symbol, arity: surface.includes('[2]') ? 2 : 1, frame: surface }));
    } else {
      constants.push(Object.freeze({ symbol, surface }));
    }
  }
  if (!predicates.length) return Object.freeze({ status: 'UNPARSED', diagnostic: 'no predicate abbreviation' });
  return Object.freeze({
    status: 'PARSED',
    input: Object.freeze({
      sentence: match[1].trim(),
      lexicon: Object.freeze({ predicates: Object.freeze(predicates), constants: Object.freeze(constants) }),
    }),
  });
}

function symbolizationConstruction(sentence) {
  const surface = sentence.trim().toLocaleLowerCase('en-US');
  if (/^if\b/u.test(surface)) return surface.includes(' only if ') ? 'conditional-with-only-if' : 'conditional';
  if (surface.includes(' if and only if ') || surface.includes(' just in case ')) return 'biconditional';
  if (surface.includes(' only if ')) return 'only-if';
  if (surface.includes(' unless ')) return 'unless';
  if (surface.includes(' but ')) return 'conjunction-with-contrast';
  if (surface.includes(' and ')) return 'conjunction';
  if (surface.includes(' or ')) return 'disjunction';
  if (/^(?:not all|every|all|each|no|a|an|some|only)\b/u.test(surface)) return 'quantified-clause';
  return 'named-clause';
}

function incrementNestedCount(target, key, field) {
  const current = target[key] ?? { tested: 0, attempted: 0, witnessVerified: 0, correct: 0 };
  current[field] += 1;
  target[key] = current;
}

function formulaShape(formula) {
  if (formula?.type === 'predicate') return `atom/${formula.terms.length}`;
  if (formula?.type === 'not') return `not(${formulaShape(formula.operand)})`;
  if (formula?.type === 'binary') {
    return `${formula.operator}(${formulaShape(formula.left)},${formulaShape(formula.right)})`;
  }
  if (formula?.type === 'quantifier') return `${formula.quantifier}(${formulaShape(formula.body)})`;
  return 'invalid';
}

function visibleTask(record, metadata) {
  const argumentSource = metadata.task === 'countermodel'
    ? record.input.split(/\nArgument:\s*\n/u)[1]
    : undefined;
  if (metadata.task === 'countermodel') {
    invariant(typeof argumentSource === 'string' && argumentSource.trim(), `${metadata.file}.${record.id}.input`,
      'countermodel prompt must contain an Argument section.');
  }
  return Object.freeze({
    taskId: `logicskills:${record.id}`,
    sourceId: record.id,
    sourceFile: metadata.file,
    sourceSplit: 'public-evaluation-reclassified-development',
    operation: OPERATIONS[metadata.task],
    taskFamily: metadata.task,
    language: record.language,
    input: record.input,
    ...(metadata.task === 'countermodel' ? {
      argument: parseCompactFolArgument(argumentSource),
      domainSize: 3,
    } : {}),
    outputContract: metadata.task === 'symbolization'
      ? Object.freeze({ kind: 'first-order-formula', equivalence: 'semantic' })
      : metadata.task === 'validity'
        ? Object.freeze({ kind: 'single-candidate-index', minimum: 1, maximum: 6 })
        : Object.freeze({ kind: 'finite-countermodel', verification: 'premises-true-conclusion-false' }),
  });
}

async function collectDevelopment(root, freshFraction) {
  const membership = await partitionMembership(root, freshFraction);
  const cases = [];
  const oracle = new Map();
  for (const file of Object.keys(FILES)) {
    await streamFile(root, file, (record, metadata) => {
      if (!membership.development.has(`${file}\0${record.id}`)) return;
      const task = visibleTask(record, metadata);
      cases.push(task);
      oracle.set(task.taskId, record.answer);
    });
  }
  cases.sort((left, right) => left.taskId.localeCompare(right.taskId));
  return Object.freeze({ cases: Object.freeze(cases), oracle, membership });
}

export async function loadLogicSkillsDevelopmentPool(root, { freshFraction = 0.2 } = {}) {
  const collected = await collectDevelopment(root, freshFraction);
  return Object.freeze({
    protocol: 'logicskills-label-free-development-pool-v1',
    available: collected.cases.length,
    freshHeldOut: collected.membership.fresh.size,
    oracle: 'host-only-not-returned; countermodels-use-verification-not-reference-answers',
    cases: collected.cases,
  });
}

export async function runLogicSkillsDevelopmentProbe(engine, root, { freshFraction = 0.2 } = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const collected = await collectDevelopment(root, freshFraction);
  const statusCounts = {};
  const testedByTask = {};
  const symbolizationFailureCounts = {};
  const symbolizationByConstruction = {};
  const symbolizationByLanguage = {};
  const symbolizationMismatchClusters = {};
  let answered = 0;
  let verifiedCountermodels = 0;
  let symbolizationAttempts = 0;
  let verifiedSymbolizations = 0;
  let correctSymbolizations = 0;
  for (const task of collected.cases) {
    let result;
    if (task.taskFamily === 'symbolization') {
      const projection = compileSymbolizationPrompt(task.input);
      if (projection.status === 'PARSED') {
        const construction = symbolizationConstruction(projection.input.sentence);
        incrementNestedCount(symbolizationByConstruction, construction, 'tested');
        incrementNestedCount(symbolizationByLanguage, task.language, 'tested');
        const candidate = compileControlledFolSentence(projection.input);
        if (candidate.status === 'SOLVED') {
          symbolizationAttempts += 1;
          incrementNestedCount(symbolizationByConstruction, construction, 'attempted');
          incrementNestedCount(symbolizationByLanguage, task.language, 'attempted');
          result = candidate;
          if (verifyControlledFolSymbolization(projection.input, candidate)) {
            verifiedSymbolizations += 1;
            incrementNestedCount(symbolizationByConstruction, construction, 'witnessVerified');
            incrementNestedCount(symbolizationByLanguage, task.language, 'witnessVerified');
            try {
              const expected = parseCompactFolFormula(
                collected.oracle.get(task.taskId), 'host-only symbolization oracle',
              );
              if (controlledFolFormulasEquivalent(candidate.formula, expected)) {
                correctSymbolizations += 1;
                incrementNestedCount(symbolizationByConstruction, construction, 'correct');
                incrementNestedCount(symbolizationByLanguage, task.language, 'correct');
              } else {
                const mismatch = `${construction}: ${formulaShape(candidate.formula)} != ${formulaShape(expected)}`;
                symbolizationMismatchClusters[mismatch] = (symbolizationMismatchClusters[mismatch] ?? 0) + 1;
              }
            } catch {
              symbolizationFailureCounts['host-only oracle parse']
                = (symbolizationFailureCounts['host-only oracle parse'] ?? 0) + 1;
            }
          }
        } else {
          symbolizationFailureCounts[candidate.diagnostic]
            = (symbolizationFailureCounts[candidate.diagnostic] ?? 0) + 1;
        }
      } else {
        symbolizationFailureCounts[projection.diagnostic]
          = (symbolizationFailureCounts[projection.diagnostic] ?? 0) + 1;
      }
    }
    result ??= engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    testedByTask[task.taskFamily] = (testedByTask[task.taskFamily] ?? 0) + 1;
    if (status === 'SOLVED') answered += 1;
    if (task.taskFamily === 'countermodel' && status === 'SOLVED'
      && verifyFiniteFirstOrderCountermodel(task.argument, result.countermodel)) verifiedCountermodels += 1;
  }
  return Object.freeze({
    protocol: 'logicskills-development-symbolization-candidate-v3',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    comparability: 'development candidate and capability diagnostic, not an official LogicSkills aggregate score',
    scoring: 'Countermodels require independent semantic verification. A symbolization prediction counts only when its '
      + 'derivation replays and a sound but incomplete canonical equivalence checker matches the host-only formula. '
      + 'Unsupported symbolizations count in the 480-case denominator. Validity remains unscored without a method.',
    availableSourceRows: collected.membership.development.size + collected.membership.fresh.size,
    tested: collected.cases.length,
    freshNotTested: collected.membership.fresh.size,
    answered,
    verifiedCountermodels,
    symbolizationAttempts,
    verifiedSymbolizations,
    correctSymbolizations,
    symbolizationAccuracy: testedByTask.symbolization
      ? correctSymbolizations / testedByTask.symbolization
      : null,
    symbolizationFailureCounts: Object.freeze(symbolizationFailureCounts),
    symbolizationByConstruction: Object.freeze(Object.fromEntries(Object.entries(symbolizationByConstruction)
      .map(([construction, counts]) => [construction, Object.freeze(counts)]))),
    symbolizationByLanguage: Object.freeze(Object.fromEntries(Object.entries(symbolizationByLanguage)
      .map(([language, counts]) => [language, Object.freeze(counts)]))),
    symbolizationMismatchClusters: Object.freeze(symbolizationMismatchClusters),
    statusCounts: Object.freeze(statusCounts),
    testedByTask: Object.freeze(testedByTask),
    languageAgentInvocations: 0,
    missingCapabilityFamilies: Object.freeze([
      'controlled-language-to-first-order-symbolization-outside-the-verified-subset',
      'two-variable-first-order-validity',
      'complete-semantic-formula-equivalence-scoring',
    ]),
  });
}

export async function runLogicSkillsFreshCountermodelAggregate(engine, root, { freshFraction = 0.2 } = {}) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const membership = await partitionMembership(root, freshFraction);
  let tested = 0;
  let verified = 0;
  const statusCounts = {};
  await streamFile(root, 'countermodel.jsonl', (record, metadata) => {
    if (!membership.fresh.has(`${metadata.file}\0${record.id}`)) return;
    const task = visibleTask(record, metadata);
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    tested += 1;
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    if (status === 'SOLVED' && verifyFiniteFirstOrderCountermodel(task.argument, result.countermodel)) verified += 1;
  });
  return Object.freeze({
    protocol: 'logicskills-countermodel-fresh-aggregate-v1',
    evidenceState: 'sealed-fresh-countermodel-subtrack',
    sourcePartitionSha256: membership.membershipSha256,
    tested,
    correct: verified,
    accuracy: tested ? verified / tested : null,
    statusCounts: Object.freeze(statusCounts),
    verifiedCountermodels: verified,
    languageAgentInvocations: 0,
    retainedProtectedItems: 0,
    boundary: 'Only the countermodel subtrack was executed. Fresh symbolization and validity inputs and all reference '
      + 'answers remained unopened. No task text, identifier, model, or per-case outcome leaves this aggregate.',
  });
}
