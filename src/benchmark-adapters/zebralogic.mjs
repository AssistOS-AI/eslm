import { atom, binary, negate } from '../reasoning/finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from '../reasoning/sat-entailment.mjs';
import {
  hasZebraLogicSource,
  inventoryZebraLogicSource,
  partitionZebraLogicSource,
  requireZebraLogicCondition,
  streamZebraLogicSource,
  validateZebraLogicSourceRecord,
  zebraLogicMembershipDigest,
  ZEBRALOGIC_DATASET_REVISION,
  ZEBRALOGIC_PARTITION,
  ZEBRALOGIC_PARTITION_SEED,
  ZEBRALOGIC_SOURCE,
} from './zebralogic-source.mjs';

export { hasZebraLogicSource, inventoryZebraLogicSource, ZEBRALOGIC_PARTITION, ZEBRALOGIC_SOURCE };

const ORDINALS = Object.freeze({ first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 });
const NUMBER_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5 });
const LEXICAL_ALIASES = Object.freeze({
  brit: ['british'], swede: ['swedish'], jan: ['january'], feb: ['february'], mar: ['march'],
  sept: ['september'], painting: ['paints'], roses: ['rose'],
});
const REFERENCE_CUES = Object.freeze({
  Animal: /\b(?:animal|aquarium|enthusiast|fish|keeper|keeps|owner)\b/u,
  Birthday: /\bbirthday\b/u,
  BookGenre: /\bbook/u,
  CarModel: /\b(?:car|owns)\b/u,
  Children: /\bchild\b/u,
  Cigar: /\b(?:cigar|smok)/u,
  Color: /\bfavorite color\b/u,
  Drink: /\bdrink/u,
  Education: /\b(?:degree|diploma|attended|education)\b/u,
  FavoriteSport: /\b(?:sport|plays)\b/u,
  Flower: /\b(?:arrangement|bo?uquet|vase|flower)\b/u,
  Food: /\b(?:eat|food|lunch)\b/u,
  HairColor: /\bhair\b/u,
  Height: /\b(?:height|short|tall)\b/u,
  Hobby: /\bhobb/u,
  HouseStyle: /\b(?:home|house|villa)\b/u,
  Mother: /\bmother\b/u,
  MusicGenre: /\bmusic\b/u,
  Name: /^\s*[\p{L}\p{N}'-]+\s*$/u,
  Nationality: /\b(?:person|dane|german|norwegian|swedish|british|chinese)\b/u,
  Occupation: /\b(?:occupation|artist|doctor|engineer|lawyer|teacher)\b/u,
  Pet: /\bpet\b/u,
  PhoneModel: /\b(?:phone|uses)\b/u,
  Smoothie: /\bsmoothie\b/u,
  Vacation: /\b(?:break|retreat|trip|vacation|going on)\b/u,
});

function requireCondition(condition, path, message) {
  requireZebraLogicCondition(condition, path, message);
}

function normalizedTokens(value) {
  return value.toLocaleLowerCase('en-US').replace(/([a-z])([0-9])/gu, '$1 $2')
    .replace(/([0-9])([a-z])/gu, '$1 $2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/u)
    .filter(Boolean).map((token) => {
      if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
      if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3).replace(/(.)\1$/u, '$1');
      if (token.endsWith('es') && token.length > 4) return token.slice(0, -1);
      if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) return token.slice(0, -1);
      return token;
    });
}
function containsSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  return haystack.some((_token, index) => needle.every((token, offset) => haystack[index + offset] === token));
}
function aliases(value) {
  return [value, ...(LEXICAL_ALIASES[value.toLocaleLowerCase('en-US')] ?? [])];
}
function referenceCueScore(header, phrase) {
  const normalized = phrase.toLocaleLowerCase('en-US');
  if (header === 'Children' && /\bchild\b/u.test(normalized)) return 4;
  if (header === 'Mother' && /\bmother\b/u.test(normalized)) return 4;
  if (header === 'HairColor' && /\bhair\b/u.test(normalized)) return 4;
  if (header === 'Color' && /\bfavorite color\b/u.test(normalized)) return 4;
  if (header === 'Pet' && /\bpet\b/u.test(normalized)) return 4;
  if (header === 'Pet' && /\baquarium\b/u.test(normalized)) return 4;
  if (header === 'Pet' && /\bhas (?:a|an)\b/u.test(normalized)) return 3;
  if (header === 'Animal' && /\bpet\b/u.test(normalized)) return 0;
  return REFERENCE_CUES[header]?.test(normalized) ? 1 : 0;
}
function resolveReference(phrase, domains) {
  const phraseTokens = normalizedTokens(phrase);
  const candidates = [];
  for (const domain of domains) {
    for (const value of domain.values) {
      for (const alias of aliases(value)) {
        const tokens = normalizedTokens(alias);
        if (containsSequence(phraseTokens, tokens)) {
          candidates.push({ attribute: domain.index, header: domain.header, value,
            specificity: tokens.length * 1_000 + tokens.join('').length,
            cue: referenceCueScore(domain.header, phrase) });
        }
      }
    }
  }
  requireCondition(candidates.length > 0, 'clue reference', `could not resolve “${phrase}”.`);
  const bestSpecificity = Math.max(...candidates.map((item) => item.specificity));
  const specific = candidates.filter((item) => item.specificity === bestSpecificity);
  const bestCue = Math.max(...specific.map((item) => item.cue));
  const preferred = specific.filter((item) => item.cue === bestCue);
  const unique = [...new Map(preferred.map((item) => [`${item.attribute}\0${item.value}`, item])).values()];
  requireCondition(unique.length === 1, 'clue reference',
    `ambiguous reference “${phrase}” (${unique.map((item) => item.header).join(', ')}).`);
  return Object.freeze({ attribute: unique[0].attribute, value: unique[0].value });
}

function resolvableSplit(text, delimiter, domains) {
  const candidates = [];
  let offset = 0;
  while (true) {
    const index = text.indexOf(delimiter, offset);
    if (index < 0) break;
    const leftText = text.slice(0, index);
    const rightText = text.slice(index + delimiter.length);
    if (delimiter === ' is ' && ((/\bchild$/iu.test(leftText) && /^named\b/iu.test(rightText))
      || /\bwho$/iu.test(leftText))) {
      offset = index + delimiter.length;
      continue;
    }
    try {
      candidates.push([resolveReference(leftText, domains), resolveReference(rightText, domains)]);
    } catch {}
    offset = index + delimiter.length;
  }
  requireCondition(candidates.length >= 1, 'clue relation',
    `expected a resolvable “${delimiter.trim()}” split in “${text}”.`);
  return candidates[0];
}
function parseClue(rawClue, domains, houses) {
  const clue = rawClue.replace(/^\d+\.\s*/u, '').replace(/\.$/u, '');
  let match = clue.match(/^(.+) is (not )?in the (first|second|third|fourth|fifth|sixth) house$/u);
  if (match) {
    const position = ORDINALS[match[3]];
    requireCondition(position <= houses, 'clue position', `position ${position} exceeds ${houses} houses.`);
    return Object.freeze({ kind: match[2] ? 'not-position' : 'position',
      left: resolveReference(match[1], domains), position, source: rawClue });
  }
  match = clue.match(/^(.+) is directly left of (.+)$/u);
  if (match) return Object.freeze({ kind: 'direct-left', left: resolveReference(match[1], domains),
    right: resolveReference(match[2], domains), source: rawClue });
  match = clue.match(/^(.+) is somewhere to the (left|right) of (.+)$/u);
  if (match) return Object.freeze({ kind: match[2] === 'left' ? 'left' : 'right',
    left: resolveReference(match[1], domains), right: resolveReference(match[3], domains), source: rawClue });
  match = clue.match(/^(.+) are next to each other$/u);
  if (match) {
    const [left, right] = resolvableSplit(match[1], ' and ', domains);
    return Object.freeze({ kind: 'adjacent', left, right, source: rawClue });
  }
  match = clue.match(/^There (?:is|are) (one|two|three|four|five) houses? between (.+)$/u);
  if (match) {
    const [left, right] = resolvableSplit(match[2], ' and ', domains);
    return Object.freeze({ kind: 'distance', left, right, distance: NUMBER_WORDS[match[1]] + 1,
      source: rawClue });
  }
  const [left, right] = resolvableSplit(clue, ' is ', domains);
  return Object.freeze({ kind: 'same', left, right, source: rawClue });
}

export function parseZebraLogicPuzzle(record, path = 'record') {
  validateZebraLogicSourceRecord(record, path);
  const [houses, attributeCount] = record.size.split('*').map(Number);
  const sections = record.puzzle.split('\n## Clues:\n');
  requireCondition(sections.length === 2, path, 'expected one Clues section.');
  const bulletLines = sections[0].split('\n').filter((line) => line.startsWith(' - '));
  requireCondition(bulletLines.length === attributeCount, path, 'attribute bullet count disagrees with size.');
  const headers = record.solution.header.slice(1);
  const domains = bulletLines.map((line, index) => {
    const values = [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
    requireCondition(values.length === houses, `${path}.attribute[${index}]`,
      `expected ${houses} backtick-delimited values.`);
    requireCondition(new Set(values.map((value) => value.toLocaleLowerCase('en-US'))).size === houses,
      `${path}.attribute[${index}]`, 'duplicate domain value.');
    return Object.freeze({ index, header: headers[index], description: line.slice(3),
      values: Object.freeze(values) });
  });
  const clueLines = sections[1].trim().split('\n').filter(Boolean);
  const constraints = clueLines.map((line) => parseClue(line, domains, houses));
  return Object.freeze({ houses, domains: Object.freeze(domains), constraints: Object.freeze(constraints),
    clueCount: clueLines.length });
}

function variableId(attribute, valueIndex, position) {
  return `csp:${attribute}:${valueIndex}:${position}`;
}
function clauseFormula(clause) {
  const formulas = clause.map((literal) => literal.startsWith('-')
    ? negate(atom(literal.slice(1))) : atom(literal));
  return formulas.slice(1).reduce((left, right) => binary('or', left, right), formulas[0]);
}
function exactlyOne(variables, clauses) {
  clauses.push([...variables]);
  for (let left = 0; left < variables.length; left += 1) {
    for (let right = left + 1; right < variables.length; right += 1) {
      clauses.push([`-${variables[left]}`, `-${variables[right]}`]);
    }
  }
}
function refVariables(parsed, reference) {
  const domain = parsed.domains[reference.attribute];
  const valueIndex = domain.values.indexOf(reference.value);
  return Array.from({ length: parsed.houses }, (_unused, position) =>
    variableId(reference.attribute, valueIndex, position + 1));
}
function relationAllowed(kind, left, right, distance = undefined) {
  if (kind === 'same') return left === right;
  if (kind === 'direct-left') return left + 1 === right;
  if (kind === 'left') return left < right;
  if (kind === 'right') return left > right;
  if (kind === 'adjacent') return Math.abs(left - right) === 1;
  if (kind === 'distance') return Math.abs(left - right) === distance;
  throw new Error(`ZebraLogic constraint: unsupported relation ${kind}.`);
}
export function compileZebraLogicCsp(parsed, blockingAssignment = undefined) {
  const clauses = [];
  for (const domain of parsed.domains) {
    for (let valueIndex = 0; valueIndex < parsed.houses; valueIndex += 1) {
      exactlyOne(Array.from({ length: parsed.houses }, (_unused, position) =>
        variableId(domain.index, valueIndex, position + 1)), clauses);
    }
    for (let position = 1; position <= parsed.houses; position += 1) {
      exactlyOne(domain.values.map((_value, valueIndex) => variableId(domain.index, valueIndex, position)), clauses);
    }
  }
  for (const constraint of parsed.constraints) {
    const left = refVariables(parsed, constraint.left);
    if (constraint.kind === 'position' || constraint.kind === 'not-position') {
      const variable = left[constraint.position - 1];
      clauses.push([constraint.kind === 'position' ? variable : `-${variable}`]);
      continue;
    }
    const right = refVariables(parsed, constraint.right);
    for (let leftPosition = 1; leftPosition <= parsed.houses; leftPosition += 1) {
      for (let rightPosition = 1; rightPosition <= parsed.houses; rightPosition += 1) {
        if (!relationAllowed(constraint.kind, leftPosition, rightPosition, constraint.distance)) {
          clauses.push([`-${left[leftPosition - 1]}`, `-${right[rightPosition - 1]}`]);
        }
      }
    }
  }
  if (blockingAssignment) clauses.push(blockingAssignment.map((id) => `-${id}`));
  const witness = variableId(0, 0, 1);
  return Object.freeze({ clauses: Object.freeze(clauses.map((clause) => Object.freeze(clause))),
    premises: Object.freeze(clauses.map(clauseFormula)),
    query: binary('or', atom(witness), negate(atom(witness))), inconsistencyPolicy: 'report' });
}
function solverInput(task, budgets) {
  return { premises: task.premises, query: task.query, inconsistencyPolicy: task.inconsistencyPolicy, budgets };
}
function decodeAssignment(parsed, model) {
  const positions = parsed.domains.map((domain) => domain.values.map((_value, valueIndex) => {
    const matches = Array.from({ length: parsed.houses }, (_unused, position) => position + 1)
      .filter((position) => model[variableId(domain.index, valueIndex, position)] === true);
    requireCondition(matches.length === 1, 'assignment', 'expected exactly one true position per value.');
    return matches[0];
  }));
  return Object.freeze(positions.map((row) => Object.freeze(row)));
}
function referencePosition(parsed, assignment, reference) {
  return assignment[reference.attribute][parsed.domains[reference.attribute].values.indexOf(reference.value)];
}
export function verifyZebraLogicAssignment(parsed, assignment) {
  if (!Array.isArray(assignment) || assignment.length !== parsed.domains.length) return false;
  for (const row of assignment) {
    if (!Array.isArray(row) || row.length !== parsed.houses
      || new Set(row).size !== parsed.houses
      || row.some((position) => !Number.isInteger(position) || position < 1 || position > parsed.houses)) return false;
  }
  return parsed.constraints.every((constraint) => {
    const left = referencePosition(parsed, assignment, constraint.left);
    if (constraint.kind === 'position') return left === constraint.position;
    if (constraint.kind === 'not-position') return left !== constraint.position;
    const right = referencePosition(parsed, assignment, constraint.right);
    return relationAllowed(constraint.kind, left, right, constraint.distance);
  });
}
function chosenVariables(parsed, assignment) {
  return assignment.flatMap((row, attribute) => row.map((position, valueIndex) =>
    variableId(attribute, valueIndex, position)));
}
export function solveZebraLogicCsp(parsed, options = {}) {
  const task = compileZebraLogicCsp(parsed);
  const input = solverInput(task, options.budgets);
  const result = decideBooleanEntailment(input);
  const coreWitnessValid = verifyBooleanEntailmentResult(input, result);
  if (result.status !== 'SOLVED' || result.entailed !== true || !coreWitnessValid) {
    return Object.freeze({ status: result.status, valid: false, unique: false,
      languageAgentInvocations: 0, resources: result.resources });
  }
  const assignment = decodeAssignment(parsed, result.witness.contextModel);
  const assignmentValid = verifyZebraLogicAssignment(parsed, assignment);
  const blockedTask = compileZebraLogicCsp(parsed, chosenVariables(parsed, assignment));
  const blockedInput = solverInput(blockedTask, options.uniquenessBudgets ?? options.budgets);
  const uniqueness = decideBooleanEntailment(blockedInput);
  const uniquenessWitnessValid = verifyBooleanEntailmentResult(blockedInput, uniqueness);
  return Object.freeze({
    status: assignmentValid && uniqueness.status === 'INCONSISTENT_CONTEXT' && uniquenessWitnessValid
      ? 'SOLVED' : uniqueness.status === 'RESOURCE_LIMIT' ? 'RESOURCE_LIMIT' : 'INVALID_OR_NON_UNIQUE',
    assignment, valid: assignmentValid,
    unique: uniqueness.status === 'INCONSISTENT_CONTEXT' && uniquenessWitnessValid,
    witnessValid: coreWitnessValid && assignmentValid && uniquenessWitnessValid,
    witnessKind: 'full-assignment-plus-uniqueness-certificate',
    languageAgentInvocations: 0,
    resources: Object.freeze({ solve: result.resources, uniqueness: uniqueness.resources }),
  });
}

function visibleCase(record, metadata, visibility) {
  const parsed = parseZebraLogicPuzzle(record, metadata.id);
  return Object.freeze({ id: metadata.id, kind: 'finite-domain-constraint-satisfaction', parsed,
    metadata: Object.freeze({ family: 'ZebraLogic', sourceRevision: ZEBRALOGIC_DATASET_REVISION, visibility,
      size: record.size, houses: parsed.houses, attributes: parsed.domains.length,
      clues: parsed.clueCount, evaluationTrack: 'public-clue-csp-symbolic' }) });
}
export async function loadZebraLogicDevelopmentPool(options = {}) {
  const partition = await partitionZebraLogicSource(options);
  const selected = new Set(partition.development);
  const pool = [];
  await streamZebraLogicSource(options, (record, metadata) => {
    if (selected.has(metadata.id)) pool.push(visibleCase(record, metadata, 'development-visible'));
  });
  pool.sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze({ format: 'eslm-zebralogic-development-pool-v1', inventory: partition.inventory,
    pool: Object.freeze(pool), partition: Object.freeze({ seed: ZEBRALOGIC_PARTITION_SEED, count: pool.length,
      membershipSha256: zebraLogicMembershipDigest(pool.map((item) => item.id)) }),
    track: Object.freeze({ id: 'public-clue-csp-symbolic',
      claimBoundary: 'independent public-clue validity and uniqueness; not an official private-label score' }) });
}
function maximum(left, right) {
  return left === undefined ? right : right === undefined ? left : Math.max(left, right);
}
export function evaluateZebraLogicDevelopment(pool, options = {}) {
  requireCondition(Array.isArray(pool), 'evaluation', 'pool must be an array.');
  const outcomes = pool.map((item) => {
    const result = solveZebraLogicCsp(item.parsed, options);
    return Object.freeze({ id: item.id, size: item.metadata.size, status: result.status,
      pass: result.status === 'SOLVED' && result.valid && result.unique && result.witnessValid,
      witnessValid: result.witnessValid ?? false, resources: result.resources });
  });
  const passed = outcomes.filter((item) => item.pass).length;
  const statusCounts = Object.fromEntries([...new Set(outcomes.map((item) => item.status))].sort()
    .map((status) => [status, outcomes.filter((item) => item.status === status).length]));
  const maxima = {};
  for (const item of outcomes) for (const phase of ['solve', 'uniqueness']) {
    for (const [key, value] of Object.entries(item.resources?.[phase] ?? {})) {
      if (typeof value === 'number') maxima[`${phase}.${key}`] = maximum(maxima[`${phase}.${key}`], value);
    }
  }
  return Object.freeze({ format: 'eslm-zebralogic-development-result-v1', tested: outcomes.length,
    passed, completionRate: outcomes.length === 0 ? 0 : passed / outcomes.length,
    validAssignments: outcomes.filter((item) => item.witnessValid).length,
    languageAgentInvocations: 0, statusCounts: Object.freeze(statusCounts),
    resourceWitnessMaxima: Object.freeze(maxima), outcomes: Object.freeze(outcomes) });
}

export async function evaluateZebraLogicSealedFresh(options = {}) {
  requireCondition(options.authorization === 'DS017_AGGREGATE_ONLY', 'fresh evaluation',
    'explicit aggregate-only authorization is required.');
  const partition = await partitionZebraLogicSource(options);
  const selected = new Set(partition.fresh);
  const statusCounts = {};
  const sizeStrata = {};
  const maxima = {};
  let tested = 0;
  let passed = 0;
  let witnessValid = 0;
  await streamZebraLogicSource(options, (record, metadata) => {
    if (!selected.has(metadata.id)) return;
    tested += 1;
    const size = record.size;
    sizeStrata[size] ??= { tested: 0, passed: 0 };
    sizeStrata[size].tested += 1;
    let result;
    try {
      result = solveZebraLogicCsp(parseZebraLogicPuzzle(record, 'sealed-fresh-record'), options);
    } catch {
      result = { status: 'PARSE_ERROR', witnessValid: false, resources: undefined };
    }
    const success = result.status === 'SOLVED' && result.valid && result.unique && result.witnessValid;
    passed += Number(success);
    witnessValid += Number(success);
    sizeStrata[size].passed += Number(success);
    statusCounts[result.status] = (statusCounts[result.status] ?? 0) + 1;
    for (const phase of ['solve', 'uniqueness']) {
      for (const [key, value] of Object.entries(result.resources?.[phase] ?? {})) {
        if (typeof value === 'number') maxima[`${phase}.${key}`] = maximum(maxima[`${phase}.${key}`], value);
      }
    }
  });
  requireCondition(tested === ZEBRALOGIC_PARTITION.freshCount, 'fresh evaluation',
    `expected ${ZEBRALOGIC_PARTITION.freshCount} rows, executed ${tested}.`);
  return Object.freeze({ format: 'eslm-zebralogic-sealed-fresh-aggregate-v1',
    track: 'public-clue-csp-symbolic', tested, passed,
    completionRate: passed / tested, witnessValid, directSymbolic: tested,
    languageAgentInvocations: 0,
    statusCounts: Object.freeze(Object.fromEntries(Object.entries(statusCounts).sort())),
    sizeStrata: Object.freeze(Object.fromEntries(Object.entries(sizeStrata).sort()
      .map(([size, counts]) => [size, Object.freeze({ ...counts, completionRate: counts.passed / counts.tested })]))),
    resourceWitnessMaxima: Object.freeze(maxima),
    disclosure: 'aggregate-only; no fresh text, identity, assignment, clue, or per-case outcome returned' });
}
