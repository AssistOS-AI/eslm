import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline';
import { atom, binary, decideFiniteEntailment, negate } from '../reasoning/finite-entailment.mjs';
import { decideBooleanEntailment } from '../reasoning/sat-entailment.mjs';
import { parseControlledQuantifiedEnglish, semanticWords } from '../language/quantified-english.mjs';

const REVISION = '5d7bb84c7edab3fb358e057d2807f19cf5cf5e2d';
const MAX_TEXT_CHARACTERS = 16_384;
const MAX_FORMULA_CHARACTERS = 4_096;
const OFFICIAL_FILES = Object.freeze({
  train: Object.freeze({
    name: 'folio-train.jsonl', bytes: 787_496,
    sha256: '008d34b750d31fa7f014e953228adf4db81ec34bbda9e7f67c96c60438d1e6b2', records: 1_004,
  }),
  validation: Object.freeze({
    name: 'folio-validation.jsonl', bytes: 173_456,
    sha256: '6922c988ef10987bd6545568ee8e63e897af80994591fa20539767da58f8e3d1', records: 204,
  }),
});

export const FOLIO_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1',
  id: 'folio-v0.0-official',
  source: 'https://github.com/Yale-LILY/FOLIO',
  revision: REVISION,
  archiveUrl: `https://codeload.github.com/Yale-LILY/FOLIO/tar.gz/${REVISION}`,
  archivePath: `training/.cache/benchmarks/folio/source/${REVISION}.tar.gz`,
  archiveBytes: 216_478,
  archiveSha256: 'c1ab92c373a8e4f1e55781f89d44675082379a2c3d841c3667dbbe0209ee0924',
  extractedPath: `training/.cache/benchmarks/folio/extracted/FOLIO-${REVISION}/data/v0.0`,
  license: 'CC BY-SA 4.0',
  licenseSha256: 'da89f9867822be4b8adb1e601d9e9226c195016c6508015eb7593e68ead0c98a',
  files: OFFICIAL_FILES,
});

function requireCondition(condition, path, message) {
  if (!condition) throw new Error(`FOLIO ${path}: ${message}`);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireText(value, path, maximum = MAX_TEXT_CHARACTERS) {
  requireCondition(typeof value === 'string' && value.length > 0, path, 'expected non-empty text.');
  requireCondition(value.length <= maximum, path, `text exceeds ${maximum} characters.`);
  requireCondition(!value.includes('\0') && !value.includes('\uFFFD'), path, 'text contains an invalid character.');
}

function requireFormulaField(value, path) {
  requireCondition(typeof value === 'string', path, 'expected formula text.');
  requireCondition(value.length <= MAX_FORMULA_CHARACTERS, path,
    `formula exceeds ${MAX_FORMULA_CHARACTERS} characters.`);
  requireCondition(!value.includes('\0') && !value.includes('\uFFFD'), path,
    'formula contains an invalid character.');
}

function requireSourceTextField(value, path) {
  requireCondition(typeof value === 'string', path, 'expected text.');
  requireCondition(value.length <= MAX_TEXT_CHARACTERS, path, `text exceeds ${MAX_TEXT_CHARACTERS} characters.`);
  requireCondition(!value.includes('\0') && !value.includes('\uFFFD'), path, 'text contains an invalid character.');
}

function requireExactFields(record, fields, path) {
  requireCondition(
    Object.keys(record).sort().join('\0') === [...fields].sort().join('\0'),
    path,
    `expected exactly ${fields.join(', ')}.`,
  );
}

function validateTextArrays(record, path) {
  requireCondition(Array.isArray(record.premises) && record.premises.length > 0, `${path}.premises`,
    'expected a non-empty array.');
  requireCondition(Array.isArray(record['premises-FOL']), `${path}.premises-FOL`, 'expected an array.');
  record.premises.forEach((text, index) => requireSourceTextField(text, `${path}.premises[${index}]`));
  record['premises-FOL'].forEach((text, index) => requireFormulaField(text, `${path}.premises-FOL[${index}]`));
  requireText(record.conclusion, `${path}.conclusion`);
}

function validateSourceRecord(record, split, path) {
  requireCondition(plainObject(record), path, 'expected a JSON object.');
  if (split === 'train') {
    requireExactFields(record,
      ['story_id', 'example_id', 'conclusion', 'premises', 'premises-FOL', 'label', 'source'], path);
    requireCondition(Number.isInteger(record.story_id), `${path}.story_id`, 'expected an integer.');
    requireCondition(Number.isInteger(record.example_id), `${path}.example_id`, 'expected an integer.');
    requireCondition(['hyb', 'wiki'].includes(record.source), `${path}.source`, 'expected hyb or wiki.');
    requireCondition(['True', 'False', 'Unknown'].includes(record.label), `${path}.label`,
      'expected True, False, or Unknown.');
  } else {
    requireExactFields(record, ['conclusion', 'conclusion-FOL', 'premises', 'premises-FOL', 'label'], path);
    requireFormulaField(record['conclusion-FOL'], `${path}.conclusion-FOL`);
    requireCondition(['True', 'False', 'Uncertain'].includes(record.label), `${path}.label`,
      'expected True, False, or Uncertain.');
  }
  validateTextArrays(record, path);
}

async function streamSourceFile(root, split, onRecord) {
  const definition = OFFICIAL_FILES[split];
  const path = join(root, definition.name);
  const details = await stat(path);
  requireCondition(details.size === definition.bytes, definition.name,
    `expected ${definition.bytes} bytes, found ${details.size}.`);
  const digest = createHash('sha256');
  const source = createReadStream(path);
  source.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  let records = 0;
  const labels = {};
  let premises = 0;
  let emptyFormulaAnnotations = 0;
  let premiseAlignmentMismatches = 0;
  let emptyNaturalLanguagePremises = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    records += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`FOLIO ${definition.name}:${records}: invalid JSON: ${error.message}`);
    }
    validateSourceRecord(record, split, `${definition.name}:${records}`);
    labels[record.label] = (labels[record.label] ?? 0) + 1;
    premises += record.premises.length;
    premiseAlignmentMismatches += Number(record.premises.length !== record['premises-FOL'].length);
    emptyNaturalLanguagePremises += record.premises.filter((premise) => !premise.trim()).length;
    emptyFormulaAnnotations += record['premises-FOL'].filter((formula) => !formula.trim()).length;
    emptyFormulaAnnotations += Number(record['conclusion-FOL'] !== undefined && !record['conclusion-FOL'].trim());
    await onRecord?.(record, records);
  }
  requireCondition(records === definition.records, definition.name,
    `expected ${definition.records} records, found ${records}.`);
  const fileSha256 = digest.digest('hex');
  requireCondition(fileSha256 === definition.sha256, definition.name, 'content digest differs from the pinned source.');
  return Object.freeze({
    split, name: definition.name, bytes: details.size, sha256: fileSha256, records, premises, labels,
    emptyFormulaAnnotations, premiseAlignmentMismatches, emptyNaturalLanguagePremises,
  });
}

function sourceRoot(cacheRoot) {
  return join(cacheRoot, 'extracted', `FOLIO-${REVISION}`, 'data', 'v0.0');
}

export async function hasFolioSource(cacheRoot) {
  try {
    return (await stat(sourceRoot(cacheRoot))).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function inventoryFolioSource(cacheRoot) {
  const root = sourceRoot(cacheRoot);
  const train = await streamSourceFile(root, 'train');
  const validation = await streamSourceFile(root, 'validation');
  const sourceSetSha256 = createHash('sha256').update(
    `${train.name}\0${train.sha256}\n${validation.name}\0${validation.sha256}\n`,
  ).digest('hex');
  return Object.freeze({
    format: 'eslm-folio-source-inventory-v1', source: FOLIO_SOURCE,
    sourceRoot: relative(cacheRoot, root), sourceSetSha256, train, validation,
    test: Object.freeze({ records: 0, availability: 'unreleased-by-the-pinned-v0.0-source' }),
    lifecycle: 'Both locally labeled files are development-visible. No local labeled split remains eligible for a '
      + 'fresh claim.',
  });
}

const SYMBOLS = new Map([
  ['¬', 'not'], ['∧', 'and'], ['^', 'and'], ['∨', 'or'], ['⊕', 'xor'], ['→', 'implies'],
  ['↔', 'iff'], ['⟷', 'iff'], ['∀', 'forall'], ['∃', 'exists'], ['(', '('], [')', ')'], [',', ','],
]);

function tokenizeFormula(source, path) {
  requireText(source, path, MAX_FORMULA_CHARACTERS);
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const character = source[offset];
    if (/\s/u.test(character)) {
      offset += 1;
      continue;
    }
    if (SYMBOLS.has(character)) {
      tokens.push(Object.freeze({ type: SYMBOLS.get(character), source: character, offset }));
      offset += 1;
      continue;
    }
    let end = offset;
    while (end < source.length && !/\s/u.test(source[end]) && !SYMBOLS.has(source[end])) end += 1;
    const value = source.slice(offset, end);
    requireCondition(/^[\p{L}\p{N}_.'’+-]+$/u.test(value), path, `unsupported token at character ${offset}.`);
    tokens.push(Object.freeze({ type: 'identifier', value, offset }));
    offset = end;
  }
  requireCondition(tokens.length > 0, path, 'formula contains no tokens.');
  return tokens;
}

function formulaNode(type, fields) {
  return Object.freeze({ type, ...fields });
}

function parseExpressionTokens(tokens, path) {
  const cursor = { index: 0 };
  const current = () => tokens[cursor.index];
  const take = (type) => {
    if (current()?.type !== type) return undefined;
    const token = current();
    cursor.index += 1;
    return token;
  };
  const expect = (type) => {
    const token = take(type);
    requireCondition(token, path, `expected ${type} at token ${cursor.index + 1}.`);
    return token;
  };
  let parseIff;
  function parsePrimary() {
    if (take('(')) {
      const expression = parseIff();
      expect(')');
      return expression;
    }
    if (take('not')) return formulaNode('not', { operand: parsePrimary() });
    const quantifier = take('forall') ?? take('exists');
    if (quantifier) {
      const variable = expect('identifier').value;
      return formulaNode('quantifier', { quantifier: quantifier.type, variable, body: parsePrimary() });
    }
    const predicate = expect('identifier').value;
    expect('(');
    const terms = [];
    while (true) {
      const parts = [expect('identifier').value];
      while (current()?.type === 'identifier') parts.push(expect('identifier').value);
      terms.push(parts.join(' '));
      if (!take(',')) break;
    }
    expect(')');
    return formulaNode('predicate', { predicate, terms: Object.freeze(terms) });
  }
  function leftAssociative(next, operatorType) {
    let left = next();
    while (take(operatorType)) left = formulaNode('binary', { operator: operatorType, left, right: next() });
    return left;
  }
  const parseAnd = () => leftAssociative(parsePrimary, 'and');
  const parseOr = () => leftAssociative(parseAnd, 'or');
  const parseXor = () => leftAssociative(parseOr, 'xor');
  function parseImplies() {
    const left = parseXor();
    return take('implies') ? formulaNode('binary', { operator: 'implies', left, right: parseImplies() }) : left;
  }
  parseIff = () => leftAssociative(parseImplies, 'iff');
  const result = parseIff();
  requireCondition(cursor.index === tokens.length, path, `unexpected token at position ${cursor.index + 1}.`);
  return result;
}

export function parseFolioFormula(source, path = 'formula') {
  const normalized = source.normalize('NFKC').trim().replace(/[.]$/u, '').trim();
  return parseExpressionTokens(tokenizeFormula(normalized, path), path);
}

function collectConstants(node, bound, constants) {
  if (node.type === 'predicate') {
    node.terms.filter((term) => !bound.has(term)).forEach((term) => constants.add(term));
    return;
  }
  if (node.type === 'not') return collectConstants(node.operand, bound, constants);
  if (node.type === 'binary') {
    collectConstants(node.left, bound, constants);
    collectConstants(node.right, bound, constants);
    return;
  }
  const nested = new Set(bound);
  nested.add(node.variable);
  collectConstants(node.body, nested, constants);
}

function safeIdentifier(value) {
  const normalized = value.normalize('NFKD').replace(/\p{M}+/gu, '').toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
  return normalized || 'empty';
}

function groundedAtom(node, environment) {
  const terms = node.terms.map((term) => environment.get(term) ?? term);
  const readable = `fol:${safeIdentifier(node.predicate)}:${terms.map(safeIdentifier).join(':')}`;
  const id = readable.length <= 127 ? readable : `fol:${createHash('sha256').update(readable).digest('hex')}`;
  return atom(id);
}

function conjunction(formulas) {
  return formulas.slice(1).reduce((left, right) => binary('and', left, right), formulas[0]);
}

function disjunction(formulas) {
  return formulas.slice(1).reduce((left, right) => binary('or', left, right), formulas[0]);
}

function groundFormula(node, domain, environment = new Map()) {
  if (node.type === 'predicate') return groundedAtom(node, environment);
  if (node.type === 'not') return negate(groundFormula(node.operand, domain, environment));
  if (node.type === 'quantifier') {
    const instances = domain.map((member) => {
      const nested = new Map(environment);
      nested.set(node.variable, member);
      return groundFormula(node.body, domain, nested);
    });
    return node.quantifier === 'forall' ? conjunction(instances) : disjunction(instances);
  }
  const left = groundFormula(node.left, domain, environment);
  const right = groundFormula(node.right, domain, environment);
  if (node.operator === 'xor') {
    return binary('and', binary('or', left, right), negate(binary('and', left, right)));
  }
  if (node.operator === 'iff') {
    return binary('and', binary('implies', left, right), binary('implies', right, left));
  }
  return binary(node.operator, left, right);
}

function compileTypedFormulaSet(premiseAsts, queryAst) {
  const constants = new Set();
  premiseAsts.forEach((formula) => collectConstants(formula, new Set(), constants));
  collectConstants(queryAst, new Set(), constants);
  const domain = Object.freeze(constants.size ? [...constants].sort() : ['__domain_member__']);
  return Object.freeze({
    type: 'finite-named-domain-entailment-task', domain,
    premises: Object.freeze(premiseAsts.map((formula) => groundFormula(formula, domain))),
    query: groundFormula(queryAst, domain),
  });
}

export function compileFolioFormulaSet(premiseSources, querySource) {
  requireCondition(Array.isArray(premiseSources), 'premises', 'expected an array of formula strings.');
  const premiseAsts = premiseSources.map((source, index) => parseFolioFormula(source, `premises[${index}]`));
  const queryAst = parseFolioFormula(querySource, 'query');
  return compileTypedFormulaSet(premiseAsts, queryAst);
}

function evaluateCompiledTask(task, maxAtoms) {
  const decide = (query) => {
    const finite = decideFiniteEntailment({ premises: task.premises, query, maxAtoms });
    if (finite.status !== 'RESOURCE_LIMIT') return Object.freeze({ ...finite, method: 'finite-enumeration' });
    return Object.freeze({
      ...decideBooleanEntailment({ premises: task.premises, query }),
      method: 'scalable-boolean-entailment', finiteFallback: finite,
    });
  };
  const positive = decide(task.query);
  if (positive.status !== 'SOLVED') {
    return Object.freeze({ ...positive, predicted: undefined, domainSize: task.domain.length });
  }
  if (positive.entailed) return Object.freeze({ ...positive, predicted: 'True', domainSize: task.domain.length });
  const negative = decide(negate(task.query));
  if (negative.status !== 'SOLVED') {
    return Object.freeze({ ...negative, predicted: undefined, domainSize: task.domain.length });
  }
  return Object.freeze({
    status: 'SOLVED', predicted: negative.entailed ? 'False' : 'Unknown',
    domainSize: task.domain.length, atomCount: positive.atomCount,
    method: positive.method === negative.method ? positive.method : `${positive.method}+${negative.method}`,
    witness: negative.entailed ? negative.witness : positive.witness,
  });
}

export function evaluateFolioFormulaCase(premiseSources, querySource, { maxAtoms = 16 } = {}) {
  let task;
  try {
    task = compileFolioFormulaSet(premiseSources, querySource);
  } catch (error) {
    return Object.freeze({ status: 'UNSUPPORTED_FORMULA', predicted: undefined, diagnostic: error.message });
  }
  return evaluateCompiledTask(task, maxAtoms);
}

function sourceSurface(text) {
  let source = text.normalize('NFKC').trim().replace(/^\[BG\]\s*/u, '').replace(/\s+/gu, ' ');
  source = source.replace(/^people\s+(.+)$/iu, 'Everyone $1')
    .replace(/^some\s+(.+?)\s+exist[.!?]*$/iu, 'There is some $1');
  return source;
}

function collectVocabulary(node, bound, vocabulary) {
  if (node.type === 'predicate') {
    vocabulary.predicates.set(`${node.predicate}\0${node.terms.length}`, {
      name: node.predicate, arity: node.terms.length, words: semanticWords(node.predicate),
    });
    node.terms.filter((term) => !bound.has(term)).forEach((term) => vocabulary.constants.add(term));
    return;
  }
  if (node.type === 'not') return collectVocabulary(node.operand, bound, vocabulary);
  if (node.type === 'binary') {
    collectVocabulary(node.left, bound, vocabulary);
    collectVocabulary(node.right, bound, vocabulary);
    return;
  }
  const nested = new Set(bound);
  nested.add(node.variable);
  collectVocabulary(node.body, nested, vocabulary);
}

function lexicalSimilarity(surfaceWords, candidateWords) {
  if (surfaceWords.length === 0 || candidateWords.length === 0) return 0;
  const surface = new Set(surfaceWords);
  const shared = candidateWords.filter((word) => surface.has(word)).length;
  return shared / candidateWords.length;
}

function uniqueBest(candidates, minimum) {
  const ranked = candidates.toSorted((left, right) =>
    right.score - left.score || left.value.localeCompare(right.value));
  if (!ranked[0] || ranked[0].score < minimum) return { status: 'UNSUPPORTED' };
  if (ranked[1] && ranked[1].score === ranked[0].score) return { status: 'AMBIGUOUS' };
  return ranked[0].value;
}

function folioLexicalOptions(formulaSources) {
  const vocabulary = { predicates: new Map(), constants: new Set() };
  for (const [index, source] of formulaSources.entries()) {
    try {
      collectVocabulary(parseFolioFormula(source, `vocabulary[${index}]`), new Set(), vocabulary);
    } catch {
      // A malformed official annotation cannot authorize a guessed lexical mapping.
    }
  }
  return Object.freeze({
    resolvePredicate(surface, arity) {
      const words = semanticWords(surface);
      return uniqueBest([...vocabulary.predicates.values()].filter((entry) => entry.arity === arity)
        .map((entry) => ({ value: entry.name, score: lexicalSimilarity(words, entry.words) })), 0.6);
    },
    resolveConstant(surface) {
      const words = semanticWords(surface);
      return uniqueBest([...vocabulary.constants].map((constant) => ({
        value: constant, score: lexicalSimilarity(words, semanticWords(constant)),
      })), 1);
    },
  });
}

export function parseFolioNaturalLanguage(text, formulaVocabulary = []) {
  return parseControlledQuantifiedEnglish(sourceSurface(text), folioLexicalOptions(formulaVocabulary));
}

export function evaluateFolioNaturalLanguageCase(premiseTexts, conclusionText, {
  maxAtoms = 16, premiseFormulaSources = [],
} = {}) {
  requireCondition(Array.isArray(premiseTexts), 'premises', 'expected natural-language premise strings.');
  const parsedPremises = premiseTexts.map((text) => parseFolioNaturalLanguage(text, premiseFormulaSources));
  const parsedQuery = parseFolioNaturalLanguage(conclusionText, premiseFormulaSources);
  const parsedSentences = [...parsedPremises, parsedQuery].filter((result) => result.status === 'PARSED').length;
  const totalSentences = parsedPremises.length + 1;
  const failure = [...parsedPremises, parsedQuery].find((result) => result.status !== 'PARSED');
  if (failure) {
    return Object.freeze({
      status: failure.status, predicted: undefined, parsedSentences, totalSentences,
      diagnostic: failure.diagnostic,
    });
  }
  const task = compileTypedFormulaSet(parsedPremises.map((result) => result.formula), parsedQuery.formula);
  return Object.freeze({ ...evaluateCompiledTask(task, maxAtoms), parsedSentences, totalSentences });
}

export function evaluateFolioNaturalLanguageQueryCase(premiseFormulaSources, conclusionText, {
  maxAtoms = 16,
} = {}) {
  requireCondition(Array.isArray(premiseFormulaSources), 'premises', 'expected official premise formula strings.');
  const parsedQuery = parseFolioNaturalLanguage(conclusionText, premiseFormulaSources);
  if (parsedQuery.status !== 'PARSED') return Object.freeze({ ...parsedQuery, predicted: undefined });
  let premiseAsts;
  try {
    premiseAsts = premiseFormulaSources.map((source, index) => parseFolioFormula(source, `premises[${index}]`));
  } catch (error) {
    return Object.freeze({ status: 'UNSUPPORTED_FORMULA', predicted: undefined, diagnostic: error.message });
  }
  return evaluateCompiledTask(compileTypedFormulaSet(premiseAsts, parsedQuery.formula), maxAtoms);
}

function visibleValidationRecord(record, line) {
  return Object.freeze({
    id: `folio-v0.0-validation:${line}`,
    premises: Object.freeze([...record.premises]),
    premiseFormulas: Object.freeze([...record['premises-FOL']]),
    conclusion: record.conclusion,
    conclusionFormula: record['conclusion-FOL'],
  });
}

function visibleTrainingRecord(record) {
  return Object.freeze({
    id: `folio-v0.0-train:${record.example_id}`,
    storyId: record.story_id,
    sourceFamily: record.source,
    premises: Object.freeze([...record.premises]),
    premiseFormulas: Object.freeze([...record['premises-FOL']]),
    conclusion: record.conclusion,
    conclusionFormula: undefined,
  });
}

export async function loadFolioTrainingPool(cacheRoot) {
  const cases = [];
  await streamSourceFile(sourceRoot(cacheRoot), 'train', (record) => {
    cases.push(visibleTrainingRecord(record));
  });
  return Object.freeze({
    format: 'eslm-folio-label-free-training-pool-v1',
    split: 'train', cases: Object.freeze(cases), oracle: 'host-only-not-returned',
    limitation: 'The official v0.0 train file does not contain conclusion-FOL annotations.',
  });
}

export async function loadFolioDevelopmentPool(cacheRoot) {
  const cases = [];
  await streamSourceFile(sourceRoot(cacheRoot), 'validation', (record, line) => {
    cases.push(visibleValidationRecord(record, line));
  });
  return Object.freeze({
    format: 'eslm-folio-label-free-development-pool-v1',
    split: 'validation', cases: Object.freeze(cases), oracle: 'host-only-not-returned',
  });
}

function normalizedOracle(label) {
  return label === 'Uncertain' ? 'Unknown' : label;
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function canonicalFormula(node, environment = new Map(), counter = { value: 0 }) {
  if (node.type === 'predicate') {
    return ['predicate', node.predicate, ...node.terms.map((term) => environment.get(term) ?? term)];
  }
  if (node.type === 'not') return ['not', canonicalFormula(node.operand, environment, counter)];
  if (node.type === 'binary') {
    return [node.operator, canonicalFormula(node.left, environment, counter),
      canonicalFormula(node.right, environment, counter)];
  }
  const variable = `?bound-${counter.value}`;
  counter.value += 1;
  const nested = new Map(environment);
  nested.set(node.variable, variable);
  return [node.quantifier, variable, canonicalFormula(node.body, nested, counter)];
}

function formulasEqual(left, right) {
  return JSON.stringify(canonicalFormula(left)) === JSON.stringify(canonicalFormula(right));
}

export async function runFolioDevelopmentBaseline(engine, cacheRoot, { maxAtoms = 16 } = {}) {
  const formula = { tested: 0, correct: 0, statuses: {}, methods: {}, byLabel: {} };
  const naturalLanguage = {
    tested: 0, correct: 0, statuses: {}, parsedSentences: 0, totalSentences: 0,
  };
  const queryLanguage = {
    tested: 0, correct: 0, statuses: {}, methods: {}, languageCompiled: 0, executionSolved: 0,
  };
  const semanticAudit = {
    officialAnnotationsParseable: 0, candidateSentencesParsed: 0, exactSentenceFormulas: 0,
    exactQueryFormulas: 0, exactCompleteCases: 0,
  };
  const runtimeFrontend = { tested: 0, parsed: 0, statuses: {}, unsupportedStatementHistogram: {} };
  await streamSourceFile(sourceRoot(cacheRoot), 'validation', async (record) => {
    const expected = normalizedOracle(record.label);
    const result = evaluateFolioFormulaCase(record['premises-FOL'], record['conclusion-FOL'], { maxAtoms });
    formula.tested += 1;
    formula.correct += Number(result.predicted === expected);
    increment(formula.statuses, result.status);
    increment(formula.methods, result.method ?? 'not-executed');
    formula.byLabel[expected] ??= { tested: 0, correct: 0 };
    formula.byLabel[expected].tested += 1;
    formula.byLabel[expected].correct += Number(result.predicted === expected);
    const directCase = evaluateFolioNaturalLanguageCase(record.premises, record.conclusion, {
      maxAtoms, premiseFormulaSources: record['premises-FOL'],
    });
    naturalLanguage.tested += 1;
    naturalLanguage.correct += Number(directCase.predicted === expected);
    naturalLanguage.parsedSentences += directCase.parsedSentences;
    naturalLanguage.totalSentences += directCase.totalSentences;
    increment(naturalLanguage.statuses, directCase.status);
    const queryCase = evaluateFolioNaturalLanguageQueryCase(
      record['premises-FOL'], record.conclusion, { maxAtoms },
    );
    queryLanguage.tested += 1;
    queryLanguage.correct += Number(queryCase.predicted === expected);
    queryLanguage.languageCompiled += Number(!['UNSUPPORTED', 'AMBIGUOUS', 'UNSUPPORTED_FORMULA']
      .includes(queryCase.status));
    queryLanguage.executionSolved += Number(queryCase.status === 'SOLVED');
    increment(queryLanguage.statuses, queryCase.status);
    increment(queryLanguage.methods, queryCase.method ?? 'not-executed');

    let completeCase = true;
    const paired = [
      ...record.premises.map((surface, index) => [surface, record['premises-FOL'][index]]),
      [record.conclusion, record['conclusion-FOL']],
    ];
    for (let index = 0; index < paired.length; index += 1) {
      const [surface, officialSource] = paired[index];
      let official;
      try {
        official = parseFolioFormula(officialSource, `semantic-audit[${index}]`);
        semanticAudit.officialAnnotationsParseable += 1;
      } catch {
        completeCase = false;
        continue;
      }
      const candidate = parseFolioNaturalLanguage(surface, record['premises-FOL']);
      semanticAudit.candidateSentencesParsed += Number(candidate.status === 'PARSED');
      const exact = candidate.status === 'PARSED' && formulasEqual(candidate.formula, official);
      semanticAudit.exactSentenceFormulas += Number(exact);
      semanticAudit.exactQueryFormulas += Number(index === paired.length - 1 && exact);
      completeCase &&= exact;
    }
    semanticAudit.exactCompleteCases += Number(completeCase);
    if (engine) {
      const conclusion = record.conclusion.replace(/[.!?]+$/u, '');
      const response = await engine.ask(`${record.premises.join(' ')} Do these premises imply that ${conclusion}?`);
      runtimeFrontend.tested += 1;
      const parsed = !['UNPARSED', 'UNSUPPORTED'].includes(response.status);
      runtimeFrontend.parsed += Number(parsed);
      increment(runtimeFrontend.statuses, response.status);
      increment(runtimeFrontend.unsupportedStatementHistogram,
        String(response.episode?.unsupportedStatements?.length ?? 0));
    }
  });
  return Object.freeze({
    format: 'eslm-folio-development-baseline-v2',
    protocol: 'folio-v0.0-complete-validation-development-v2',
    evidenceRegime: 'development-visible-official-fol-annotations-and-separate-direct-language-diagnostic',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    tested: formula.tested, available: OFFICIAL_FILES.validation.records, comprehensive: true,
    formulaTrack: Object.freeze({
      ...formula, accuracy: formula.tested ? formula.correct / formula.tested : null,
      semantics: 'Official annotations are grounded over constants named in each case, then passed as typed formulas '
        + 'to exhaustive finite entailment when small and scalable certificate-producing Boolean entailment otherwise. '
        + 'This is a named-domain diagnostic, not full FOL validity.',
      maxAtoms,
    }),
    naturalLanguage: Object.freeze({
      ...naturalLanguage,
      accuracy: naturalLanguage.tested ? naturalLanguage.correct / naturalLanguage.tested : null,
      sentenceCompilationRate: naturalLanguage.totalSentences
        ? naturalLanguage.parsedSentences / naturalLanguage.totalSentences : null,
      contract: 'Every natural-language premise and conclusion must compile before the full-language case executes.',
    }),
    naturalLanguageQuery: Object.freeze({
      ...queryLanguage,
      accuracy: queryLanguage.tested ? queryLanguage.correct / queryLanguage.tested : null,
      languageCompilationRate: queryLanguage.tested ? queryLanguage.languageCompiled / queryLanguage.tested : null,
      solvedAccuracy: queryLanguage.executionSolved
        ? queryLanguage.correct / queryLanguage.executionSolved : null,
      contract: 'The conclusion is compiled from natural language against the predicate and constant vocabulary '
        + 'declared by the official premise annotations; the conclusion annotation and answer label are not inputs.',
    }),
    semanticAudit: Object.freeze({
      ...semanticAudit,
      exactSentenceFormulaRate: semanticAudit.officialAnnotationsParseable
        ? semanticAudit.exactSentenceFormulas / semanticAudit.officialAnnotationsParseable : null,
      exactQueryFormulaRate: formula.tested ? semanticAudit.exactQueryFormulas / formula.tested : null,
      purpose: 'Development-only host audit. Official annotations validate candidate semantic structure; they do not '
        + 'repair a candidate or enter an answer prediction.',
    }),
    runtimeFrontend: Object.freeze({
      ...runtimeFrontend,
      directSymbolicRate: runtimeFrontend.tested ? runtimeFrontend.parsed / runtimeFrontend.tested : null,
      scoring: 'Continuity diagnostic for the deployed Stage A question interface.',
      normalizationAttempts: 0, languageAgentInvocations: 0,
    }),
    lifecycle: Object.freeze({
      train: 'development-visible; v0.0 lacks conclusion-FOL in this file',
      validation: 'development-visible and fully measured',
      fresh: 'not run; the pinned official source says its test set is unreleased and no untouched labeled local '
        + 'split remains',
    }),
  });
}

export const FOLIO_SOURCE_REVISION = REVISION;
