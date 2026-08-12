import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline';
import { deriveClosure } from '../reasoning/datalog.mjs';
import { sha256 } from '../util.mjs';

export const PROOFWRITER_RELEASE = Object.freeze({
  id: 'proofwriter-v2020.12.3',
  version: 'V2020.12.3',
  archiveUrl: 'https://aristo-data-public.s3.amazonaws.com/proofwriter/proofwriter-dataset-V2020.12.3.zip',
  archiveBytes: 214_185_889,
  archiveSha256: 'bbc5694901e8306d0bd659aa1ad53ccfd02c201864f4b320ffa3777827d1fc26',
  extractedDirectory: 'proofwriter-dataset-V2020.12.3',
});

const MAIN_DEPTHS = Object.freeze([0, 1, 2, 3, 5]);
const VARIABLE_TERMS = new Set(['someone', 'something', 'they']);
const ANSWERS = new Set([true, false, 'Unknown']);

function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, path) {
  invariant(typeof value === 'string' && value.length > 0, path, 'expected a non-empty string.');
}

function tokenizeRepresentation(source, path) {
  requiredString(source, path);
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const whitespace = source.slice(offset).match(/^\s+/u)?.[0];
    if (whitespace) {
      offset += whitespace.length;
      continue;
    }
    if (source.startsWith('->', offset)) {
      tokens.push('->');
      offset += 2;
      continue;
    }
    const character = source[offset];
    if (character === '(' || character === ')') {
      tokens.push(character);
      offset += 1;
      continue;
    }
    if (character === '"') {
      let end = offset + 1;
      let escaped = false;
      while (end < source.length) {
        const current = source[end];
        if (!escaped && current === '"') break;
        escaped = !escaped && current === '\\';
        if (current !== '\\') escaped = false;
        end += 1;
      }
      invariant(end < source.length, path, `unterminated quoted token at byte ${offset}.`);
      const encoded = source.slice(offset, end + 1);
      try {
        tokens.push(JSON.parse(encoded));
      } catch (error) {
        throw new Error(`${path}: invalid quoted token at byte ${offset}: ${error.message}`);
      }
      offset = end + 1;
      continue;
    }
    throw new Error(`${path}: unexpected representation token at byte ${offset}.`);
  }
  return tokens;
}

function parseNode(tokens, cursor, path) {
  invariant(cursor.index < tokens.length, path, 'representation ended unexpectedly.');
  const token = tokens[cursor.index];
  cursor.index += 1;
  if (token !== '(') return token;
  const values = [];
  while (tokens[cursor.index] !== ')') {
    invariant(cursor.index < tokens.length, path, 'missing closing parenthesis.');
    values.push(parseNode(tokens, cursor, path));
  }
  cursor.index += 1;
  return values;
}

export function parseProofWriterRepresentation(source, path = 'representation') {
  const tokens = tokenizeRepresentation(source, path);
  const cursor = { index: 0 };
  const parsed = parseNode(tokens, cursor, path);
  invariant(cursor.index === tokens.length, path, 'trailing representation tokens are not allowed.');
  return parsed;
}

function literalFromNode(node, path) {
  invariant(Array.isArray(node) && node.length === 4, path, 'a literal must contain four quoted terms.');
  node.forEach((term, index) => requiredString(term, `${path}[${index}]`));
  invariant(['+', '-', '~'].includes(node[3]), `${path}[3]`, 'polarity must be +, -, or ~.');
  return Object.freeze({ subject: node[0], relation: node[1], object: node[2], polarity: node[3] });
}

export function parseProofWriterLiteral(source, path = 'literal') {
  return literalFromNode(parseProofWriterRepresentation(source, path), path);
}

export function parseProofWriterRule(source, path = 'rule') {
  const node = parseProofWriterRepresentation(source, path);
  invariant(Array.isArray(node) && node.length === 3 && node[1] === '->', path,
    'a rule must contain an antecedent list, ->, and one conclusion.');
  invariant(Array.isArray(node[0]) && node[0].length > 0, `${path}.antecedents`,
    'a rule requires at least one antecedent.');
  return Object.freeze({
    when: Object.freeze(node[0].map((literal, index) => literalFromNode(literal, `${path}.when[${index}]`))),
    then: literalFromNode(node[2], `${path}.then`),
  });
}

function validateTripleOrRuleMap(value, kind, path, { representationRequired = true } = {}) {
  invariant(plainObject(value), path, `expected a ${kind} object.`);
  for (const [id, item] of Object.entries(value)) {
    invariant(plainObject(item), `${path}.${id}`, `expected a ${kind} record.`);
    requiredString(item.text, `${path}.${id}.text`);
    if (representationRequired || item.representation !== undefined) {
      requiredString(item.representation, `${path}.${id}.representation`);
      if (kind === 'triple') parseProofWriterLiteral(item.representation, `${path}.${id}.representation`);
      else parseProofWriterRule(item.representation, `${path}.${id}.representation`);
    }
  }
}

function validateMainRecord(record, path, { inspectOracle }) {
  invariant(plainObject(record), path, 'expected a JSON object.');
  requiredString(record.id, `${path}.id`);
  invariant(Number.isInteger(record.maxD) && record.maxD >= 0, `${path}.maxD`, 'expected a non-negative integer.');
  invariant(Number.isInteger(record.NFact) && record.NFact >= 0, `${path}.NFact`, 'expected a non-negative integer.');
  invariant(Number.isInteger(record.NRule) && record.NRule >= 0, `${path}.NRule`, 'expected a non-negative integer.');
  requiredString(record.theory, `${path}.theory`);
  validateTripleOrRuleMap(record.triples, 'triple', `${path}.triples`);
  validateTripleOrRuleMap(record.rules, 'rule', `${path}.rules`);
  const countMismatches = Number(Object.keys(record.triples).length !== record.NFact)
    + Number(Object.keys(record.rules).length !== record.NRule);
  invariant(plainObject(record.questions), `${path}.questions`, 'expected a question object.');
  for (const [id, question] of Object.entries(record.questions)) {
    const questionPath = `${path}.questions.${id}`;
    invariant(plainObject(question), questionPath, 'expected a question record.');
    requiredString(question.question, `${questionPath}.question`);
    requiredString(question.representation, `${questionPath}.representation`);
    parseProofWriterLiteral(question.representation, `${questionPath}.representation`);
    invariant(ANSWERS.has(question.answer), `${questionPath}.answer`, 'expected true, false, or Unknown.');
    invariant(Number.isInteger(question.QDep) && question.QDep >= 0, `${questionPath}.QDep`,
      'expected a non-negative proof depth.');
    requiredString(question.strategy, `${questionPath}.strategy`);
    if (inspectOracle) requiredString(question.proofs, `${questionPath}.proofs`);
  }
  requiredString(record.allProofs, `${path}.allProofs`);
  invariant(Array.isArray(record.proofDetails), `${path}.proofDetails`, 'expected a proof-detail array.');
  return { items: Object.keys(record.questions).length, countMismatches };
}

function validateAbductionRecord(record, path) {
  invariant(plainObject(record), path, 'expected a JSON object.');
  requiredString(record.id, `${path}.id`);
  validateTripleOrRuleMap(record.triples, 'triple', `${path}.triples`);
  validateTripleOrRuleMap(record.rules, 'rule', `${path}.rules`);
  invariant(plainObject(record.abductions), `${path}.abductions`, 'expected an abduction object.');
  for (const [id, abduction] of Object.entries(record.abductions)) {
    const itemPath = `${path}.abductions.${id}`;
    requiredString(abduction?.question, `${itemPath}.question`);
    invariant(Array.isArray(abduction.answers), `${itemPath}.answers`, 'expected an answer array.');
    for (let index = 0; index < abduction.answers.length; index += 1) {
      const answer = abduction.answers[index];
      requiredString(answer?.text, `${itemPath}.answers[${index}].text`);
      requiredString(answer?.proof, `${itemPath}.answers[${index}].proof`);
    }
  }
  return { items: Object.keys(record.abductions).length, countMismatches: 0 };
}

function validateStageRecord(record, path) {
  invariant(plainObject(record), path, 'expected a JSON object.');
  requiredString(record.id, `${path}.id`);
  validateTripleOrRuleMap(record.triples, 'triple', `${path}.triples`, { representationRequired: false });
  validateTripleOrRuleMap(record.rules, 'rule', `${path}.rules`);
  invariant(Array.isArray(record.allInferences), `${path}.allInferences`, 'expected an inference array.');
  for (let index = 0; index < record.allInferences.length; index += 1) {
    const inference = record.allInferences[index];
    requiredString(inference?.text, `${path}.allInferences[${index}].text`);
    requiredString(inference?.proofs, `${path}.allInferences[${index}].proofs`);
  }
  return { items: record.allInferences.length, countMismatches: 0 };
}

async function jsonlFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
    }
  }
  await visit(root);
  return files.toSorted();
}

function fileMetadata(root, path) {
  const name = relative(root, path).replaceAll('\\', '/');
  const match = name.match(/^(CWA|OWA)\/(.+)\/meta-(?:(stage|abduct)-)?(train|dev|test)\.jsonl$/u);
  invariant(match, name, 'unrecognized ProofWriter JSONL path.');
  return Object.freeze({
    name,
    assumption: match[1],
    variant: match[2],
    kind: match[3] ?? 'main',
    split: match[4],
  });
}

async function streamValidatedFile(root, path, onRecord) {
  const metadata = fileMetadata(root, path);
  const digest = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let records = 0;
  let items = 0;
  let countMismatches = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    records += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${metadata.name}:${records}: invalid JSON: ${error.message}`);
    }
    const pathPrefix = `${metadata.name}:${records}`;
    const validation = metadata.kind === 'main'
      ? validateMainRecord(record, pathPrefix, { inspectOracle: metadata.split !== 'test' })
      : metadata.kind === 'abduct'
        ? validateAbductionRecord(record, pathPrefix)
        : validateStageRecord(record, pathPrefix);
    items += validation.items;
    countMismatches += validation.countMismatches;
    await onRecord?.(record, metadata, records);
  }
  return Object.freeze({ ...metadata, records, items, countMismatches, sha256: digest.digest('hex') });
}

export async function inventoryProofWriterSource(root) {
  const files = await jsonlFiles(root);
  const inventory = [];
  for (const path of files) inventory.push(await streamValidatedFile(root, path));
  const total = (field) => inventory.reduce((sum, file) => sum + file[field], 0);
  return Object.freeze({
    format: 'eslm-proofwriter-source-inventory-v1',
    release: PROOFWRITER_RELEASE,
    files: Object.freeze(inventory),
    totals: Object.freeze({ files: inventory.length, records: total('records'), items: total('items') }),
    testBoundary: 'Test records were schema-validated in a streaming host-only pass; '
      + 'text, labels, and proofs were not emitted.',
  });
}

function symbolicTerm(value, variable = false) {
  if (variable || VARIABLE_TERMS.has(value.toLocaleLowerCase('en-US'))) return '?entity';
  return value.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function symbolicLiteral(literal) {
  return [
    symbolicTerm(literal.subject),
    `${literal.polarity === '+' ? 'positive' : 'negative'}:${symbolicTerm(literal.relation)}`,
    symbolicTerm(literal.object),
  ];
}

function sourceProgram(record, caseId) {
  const facts = Object.entries(record.triples).map(([id, triple]) => {
    const [subject, predicate, object] = symbolicLiteral(parseProofWriterLiteral(
      triple.representation, `${caseId}.triples.${id}`,
    ));
    return Object.freeze({
      id: `${caseId}:${id}`, subject, predicate, object,
      provenance: [`proofwriter:${record.id}:${id}`],
    });
  });
  const rules = Object.entries(record.rules).map(([id, sourceRule]) => {
    const parsed = parseProofWriterRule(sourceRule.representation, `${caseId}.rules.${id}`);
    return Object.freeze({
      id: `${caseId}:${id}`,
      when: Object.freeze(parsed.when.map(symbolicLiteral)),
      then: Object.freeze(symbolicLiteral(parsed.then)),
      source: `proofwriter:${record.id}:${id}`,
    });
  });
  return Object.freeze({ facts: Object.freeze(facts), rules: Object.freeze(rules) });
}

function inverseTriple(triple) {
  const polarity = triple[1].startsWith('positive:') ? 'negative:' : 'positive:';
  return [triple[0], `${polarity}${triple[1].split(':').slice(1).join(':')}`, triple[2]];
}

function tripleSignature(triple) {
  return triple.join('\u0000');
}

function factTriple(fact) {
  return [fact.subject, fact.predicate, fact.object ?? fact.value];
}

function selectCandidate(selected, stratum, candidate, count) {
  const members = selected.get(stratum) ?? [];
  members.push(candidate);
  members.sort((left, right) => left.selectionKey.localeCompare(right.selectionKey));
  if (members.length > count) members.length = count;
  selected.set(stratum, members);
}

async function collectProofWriterDevelopmentSample(root, { perStratum = 20 } = {}) {
  invariant(Number.isInteger(perStratum) && perStratum > 0, 'perStratum', 'must be a positive integer.');
  const selected = new Map();
  const availableByStratum = {};
  const files = [];
  for (const depth of MAIN_DEPTHS) {
    const path = join(root, 'OWA', `depth-${depth}`, 'meta-dev.jsonl');
    files.push(await streamValidatedFile(root, path, (record) => {
      for (const [questionId, question] of Object.entries(record.questions)) {
        const expected = String(question.answer);
        const stratum = `depth-${depth}:${expected}`;
        availableByStratum[stratum] = (availableByStratum[stratum] ?? 0) + 1;
        const id = `${record.id}:${questionId}`;
        const visible = Object.freeze({
          id,
          depth,
          assumption: 'OWA',
          theoryId: record.id,
          questionId,
          theory: record.theory,
          question: question.question,
          queryRepresentation: question.representation,
          questionDepth: question.QDep,
          program: sourceProgram(record, id),
        });
        selectCandidate(selected, stratum, Object.freeze({
          visible,
          oracle: Object.freeze({ answer: question.answer }),
          selectionKey: sha256(`proofwriter-development-v1\u0000${id}`),
        }), perStratum);
      }
    }));
  }
  const cases = [...selected.entries()].sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, members]) => members).map(({ visible, oracle }) => Object.freeze({ visible, oracle }));
  return Object.freeze({
    format: 'eslm-proofwriter-development-sample-v1',
    protocol: 'proofwriter-owa-main-depth-stratified-development-v1',
    selection: Object.freeze({ method: 'smallest-stable-sha256-per-depth-and-answer', perStratum }),
    files: Object.freeze(files),
    available: Object.values(availableByStratum).reduce((sum, count) => sum + count, 0),
    availableByStratum: Object.freeze(availableByStratum),
    cases: Object.freeze(cases),
  });
}

export async function loadProofWriterDevelopmentPool(root, options = {}) {
  const sample = await collectProofWriterDevelopmentSample(root, options);
  return Object.freeze({
    format: 'eslm-proofwriter-label-free-development-pool-v1',
    protocol: sample.protocol,
    selection: sample.selection,
    files: sample.files,
    available: sample.available,
    availableByStratum: sample.availableByStratum,
    cases: Object.freeze(sample.cases.map((item) => item.visible)),
    oracle: 'host-only-not-returned',
  });
}

function executeLogicalCase(item) {
  const query = symbolicLiteral(parseProofWriterLiteral(
    item.visible.queryRepresentation, `${item.visible.id}.query`,
  ));
  const closureResult = deriveClosure({
    facts: item.visible.program.facts,
    rules: item.visible.program.rules,
    reasoning: { deduction: { maxRounds: 8 } },
  }, 8);
  if (!closureResult.complete) {
    return Object.freeze({ predicted: 'RESOURCE_LIMIT', proofValid: true, witnessDepth: 0 });
  }
  const closure = closureResult.facts;
  const bySignature = new Map(closure.map((fact) => [tripleSignature(factTriple(fact)), fact]));
  const queryWitness = bySignature.get(tripleSignature(query));
  const inverseWitness = bySignature.get(tripleSignature(inverseTriple(query)));
  const predicted = queryWitness && inverseWitness ? 'INCONSISTENT'
    : queryWitness ? true : inverseWitness ? false : 'Unknown';
  const witness = queryWitness ?? inverseWitness;
  const factIds = new Set(closure.map((fact) => fact.id));
  const ruleIds = new Set(item.visible.program.rules.map((rule) => rule.id));
  const proofValid = predicted === 'Unknown' || predicted === 'INCONSISTENT' ? !witness : Boolean(witness)
    && (witness.support ?? []).every((id) => factIds.has(id))
    && (!witness.rule || ruleIds.has(witness.rule));
  return Object.freeze({ predicted, proofValid, witnessDepth: witness?.depth ?? 0 });
}

function increment(object, key) {
  object[key] = (object[key] ?? 0) + 1;
}

export async function runProofWriterDevelopmentBaseline(engine, root, options = {}) {
  const sample = await collectProofWriterDevelopmentSample(root, options);
  const outcomeCounts = {};
  const directStatusCounts = {};
  const directUnsupportedStatementCounts = {};
  const byDepth = {};
  let correct = 0;
  let proofValid = 0;
  for (const item of sample.cases) {
    const logical = executeLogicalCase(item);
    const expected = item.oracle.answer;
    const pass = logical.predicted === expected;
    correct += Number(pass);
    proofValid += Number(logical.proofValid);
    increment(outcomeCounts, pass ? 'correct' : `expected-${String(expected)}:predicted-${String(logical.predicted)}`);
    const depthKey = String(item.visible.depth);
    byDepth[depthKey] ??= { tested: 0, correct: 0 };
    byDepth[depthKey].tested += 1;
    byDepth[depthKey].correct += Number(pass);
    if (engine) {
      const question = `${item.visible.question.replace(/[.!?]+$/u, '')}?`;
      const direct = await engine.ask(`${item.visible.theory} ${question}`);
      increment(directStatusCounts, direct.status);
      increment(directUnsupportedStatementCounts, String(direct.episode?.unsupportedStatements?.length ?? 0));
    }
  }
  const tested = sample.cases.length;
  return Object.freeze({
    format: 'eslm-proofwriter-development-baseline-v1',
    protocol: sample.protocol,
    evidenceRegime: 'development-visible-source-logical-form-with-separate-direct-language-diagnostic',
    runtimeProfile: 'direct-symbolic-no-coding-agent',
    tested,
    available: sample.available,
    comprehensive: tested === sample.available,
    correct,
    accuracy: tested ? correct / tested : null,
    proofValid,
    proofValidityRate: tested ? proofValid / tested : null,
    outcomeCounts: Object.freeze(outcomeCounts),
    byDepth: Object.freeze(byDepth),
    directLanguage: Object.freeze({
      tested: engine ? tested : 0,
      statusCounts: Object.freeze(directStatusCounts),
      unsupportedStatementCountHistogram: Object.freeze(directUnsupportedStatementCounts),
      codingAgentInvocations: 0,
    }),
    selection: sample.selection,
    sourceFiles: sample.files.map(({ name, records, items, sha256: digest }) => ({
      name, records, items, sha256: digest,
    })),
    scoring: Object.freeze({
      true: 'the query literal is present in the independently derived Horn closure',
      false: 'the polarity-inverted query literal is present in the independently derived Horn closure',
      Unknown: 'neither query polarity is derivable under the open-world assumption',
      inconsistent: 'both polarities are derivable; this is never silently coerced to an official answer',
    }),
    missingCapabilityFamilies: Object.freeze([
      'direct controlled-English support for generic unary and binary predicates',
      'direct controlled-English support for explicit negative facts and conclusions',
      'a first-class three-valued query result that distinguishes false from open-world unknown',
      'proof rendering from the runtime trace in the ProofWriter proof contract',
      'single-fact abduction and staged implication enumeration are inventoried but not scored by this baseline',
    ]),
  });
}
