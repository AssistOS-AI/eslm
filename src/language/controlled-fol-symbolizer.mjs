import { createHash } from 'node:crypto';

const MAX_CHARACTERS = 4_096;
const MAX_DEPTH = 24;
const MAX_LEXICON_ENTRIES = 256;
const MAX_FRAME_CHARACTERS = 512;
const VARIABLE_NAMES = Object.freeze(['x', 'y', 'z', 'u', 'v', 'w']);

function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function node(type, fields) {
  return Object.freeze({ type, ...fields });
}

function predicate(predicateId, terms) {
  return node('predicate', { predicate: predicateId, terms: Object.freeze([...terms]) });
}

function negate(operand) {
  return operand.type === 'not' ? operand.operand : node('not', { operand });
}

function binary(operator, left, right) {
  return node('binary', { operator, left, right });
}

function quantify(quantifier, variable, body) {
  return node('quantifier', { quantifier, variable, body });
}

function normalizedText(value) {
  return value.normalize('NFKC').trim().replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ');
}

function lexicalTokens(value) {
  const expanded = normalizedText(value)
    .replace(/[’']/gu, "'")
    .replace(/\b(is|are|was|were)n't\b/giu, '$1 not')
    .replace(/\b(do|does|did)n't\b/giu, '$1 not')
    .replace(/\b(will|can)n't\b/giu, '$1 not')
    .toLocaleLowerCase('en-US');
  return (expanded.match(/[\p{L}\p{N}]+/gu) ?? []).map((token) => {
    if (/^(?:is|are|was|were)$/u.test(token)) return 'be';
    if (token.length > 4 && token.endsWith('ied')) return `${token.slice(0, -3)}y`;
    if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2).replace(/([a-z])\1$/u, '$1');
    return token;
  });
}

function lexicalKey(value) {
  return lexicalTokens(value).join('\0');
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function pluralForms(noun) {
  const forms = new Set([noun]);
  if (/[^aeiou]y$/iu.test(noun)) forms.add(`${noun.slice(0, -1)}ies`);
  else if (/(?:s|x|z|ch|sh)$/iu.test(noun)) forms.add(`${noun}es`);
  else forms.add(`${noun}s`);
  return forms;
}

function compileLexicon(input) {
  invariant(Array.isArray(input?.predicates) && Array.isArray(input?.constants), 'lexicon',
    'predicates and constants must be arrays.');
  invariant(input.predicates.length + input.constants.length <= MAX_LEXICON_ENTRIES, 'lexicon',
    'entry count exceeds the configured bound.');
  const symbols = new Set();
  const constants = input.constants.map((entry, index) => {
    invariant(typeof entry?.symbol === 'string' && entry.symbol, `constants[${index}].symbol`,
      'expected a non-empty identifier.');
    invariant(typeof entry.surface === 'string' && entry.surface.trim(), `constants[${index}].surface`,
      'expected non-empty text.');
    invariant(entry.surface.length <= MAX_FRAME_CHARACTERS, `constants[${index}].surface`,
      'surface exceeds the configured bound.');
    invariant(!symbols.has(entry.symbol), `constants[${index}].symbol`, 'duplicate logical identifier.');
    symbols.add(entry.symbol);
    return Object.freeze({ symbol: entry.symbol, surface: normalizedText(entry.surface) });
  });
  const predicates = input.predicates.map((entry, index) => {
    invariant(typeof entry?.symbol === 'string' && entry.symbol, `predicates[${index}].symbol`,
      'expected a non-empty identifier.');
    invariant(entry.arity === 1 || entry.arity === 2, `predicates[${index}].arity`,
      'only unary and binary predicate frames are supported.');
    invariant(typeof entry.frame === 'string' && entry.frame.trim(), `predicates[${index}].frame`,
      'expected a non-empty frame.');
    invariant(entry.frame.length <= MAX_FRAME_CHARACTERS, `predicates[${index}].frame`,
      'frame exceeds the configured bound.');
    invariant(!symbols.has(entry.symbol), `predicates[${index}].symbol`, 'duplicate logical identifier.');
    symbols.add(entry.symbol);
    const frame = normalizedText(entry.frame);
    invariant((frame.match(/\[1\]/gu) ?? []).length === 1, `predicates[${index}].frame`,
      'frame must contain [1] exactly once.');
    invariant((frame.match(/\[2\]/gu) ?? []).length === entry.arity - 1, `predicates[${index}].frame`,
      'binary frames must contain [2] exactly once and unary frames must omit it.');
    return Object.freeze({ symbol: entry.symbol, arity: entry.arity, frame });
  });
  const classes = predicates.flatMap((entry) => {
    if (entry.arity !== 1) return [];
    const match = /^\[1\]\s+(?:is|are|was|were)\s+(?:a|an)\s+(.+)$/iu.exec(entry.frame);
    if (!match) return [];
    const singular = normalizedText(match[1]);
    return [Object.freeze({ symbol: entry.symbol, singular, forms: pluralForms(singular) })];
  });
  return Object.freeze({ constants: Object.freeze(constants), predicates: Object.freeze(predicates),
    classes: Object.freeze(classes) });
}

function stripSubject(frame) {
  return normalizedText(frame.replace('[1]', '')).trim();
}

function positivePredication(source) {
  const text = normalizedText(source);
  const patterns = [
    [/^(is|are|was|were)\s+not\s+(.+)$/iu, (match) => `${match[1]} ${match[2]}`],
    [/^(is|are|was|were)n't\s+(.+)$/iu, (match) => `${match[1]} ${match[2]}`],
    [/^(do|does|did)\s+not\s+(.+)$/iu, (match) => match[2]],
    [/^(do|does|did)n't\s+(.+)$/iu, (match) => match[2]],
    [/^(will|can)\s+not\s+(.+)$/iu, (match) => `${match[1]} ${match[2]}`],
  ];
  for (const [pattern, replacement] of patterns) {
    const match = pattern.exec(text);
    if (match) return Object.freeze({ negative: true, surface: replacement(match) });
  }
  return Object.freeze({ negative: false, surface: text });
}

function nextVariable(boundVariables) {
  const candidate = VARIABLE_NAMES.find((name) => !boundVariables.has(name));
  invariant(candidate, 'sentence', 'quantifier nesting exceeds the supported variable supply.');
  return candidate;
}

function matchClassPrefix(source, prefix, lexicon) {
  const remainder = source.slice(prefix.length).trim();
  for (const entry of [...lexicon.classes].sort((left, right) => right.singular.length - left.singular.length)) {
    for (const form of [...entry.forms].sort((left, right) => right.length - left.length)) {
      if (remainder.toLocaleLowerCase('en-US') === form.toLocaleLowerCase('en-US')) {
        return Object.freeze({ entry, remainder: '' });
      }
      if (remainder.toLocaleLowerCase('en-US').startsWith(`${form.toLocaleLowerCase('en-US')} `)) {
        return Object.freeze({ entry, remainder: remainder.slice(form.length).trim() });
      }
    }
  }
  return undefined;
}

function relationPrefix(entry) {
  const afterSubject = stripSubject(entry.frame);
  const marker = afterSubject.indexOf('[2]');
  invariant(marker >= 0, 'lexicon', 'binary predicate frame lost its object marker.');
  return normalizedText(afterSubject.slice(0, marker));
}

function parseObjectPhrase(source, subjectTerm, entry, lexicon, boundVariables, depth) {
  const relation = relationPrefix(entry);
  if (!lexicalKey(source).startsWith(`${lexicalKey(relation)}\0`) && lexicalKey(source) !== lexicalKey(relation)) {
    return undefined;
  }
  const relationWords = lexicalTokens(relation).length;
  const originalWords = normalizedText(source).split(/\s+/u);
  const relationOriginalWords = normalizedText(relation).split(/\s+/u).length;
  if (relationWords !== relationOriginalWords) return undefined;
  const objectSurface = originalWords.slice(relationOriginalWords).join(' ');
  for (const constant of lexicon.constants) {
    if (lexicalKey(objectSurface) === lexicalKey(constant.surface)) {
      return predicate(entry.symbol, [subjectTerm, constant.symbol]);
    }
  }
  const quantifiers = [
    { prefix: 'every ', quantifier: 'forall', connective: 'implies', negative: false },
    { prefix: 'all ', quantifier: 'forall', connective: 'implies', negative: false },
    { prefix: 'a ', quantifier: 'exists', connective: 'and', negative: false },
    { prefix: 'an ', quantifier: 'exists', connective: 'and', negative: false },
    { prefix: 'some ', quantifier: 'exists', connective: 'and', negative: false },
    { prefix: 'no ', quantifier: 'exists', connective: 'and', negative: true },
  ];
  for (const option of quantifiers) {
    if (!objectSurface.toLocaleLowerCase('en-US').startsWith(option.prefix)) continue;
    const matched = matchClassPrefix(objectSurface, option.prefix, lexicon);
    if (!matched || matched.remainder) continue;
    const variable = nextVariable(boundVariables);
    const membership = predicate(matched.entry.symbol, [variable]);
    const relationAtom = predicate(entry.symbol, [subjectTerm, variable]);
    const body = binary(option.connective, membership, relationAtom);
    const quantified = quantify(option.quantifier, variable, body);
    return option.negative ? negate(quantified) : quantified;
  }
  return undefined;
}

function parsePredication(source, subjectTerm, lexicon, boundVariables, depth) {
  invariant(depth <= MAX_DEPTH, 'sentence', 'composition depth exceeds the configured bound.');
  const positive = positivePredication(source);
  const candidates = [];
  for (const entry of lexicon.predicates) {
    let formula;
    if (entry.arity === 1 && lexicalKey(positive.surface) === lexicalKey(stripSubject(entry.frame))) {
      formula = predicate(entry.symbol, [subjectTerm]);
    } else if (entry.arity === 2) {
      formula = parseObjectPhrase(positive.surface, subjectTerm, entry, lexicon, boundVariables, depth + 1);
    }
    if (formula) candidates.push(positive.negative ? negate(formula) : formula);
  }
  const unique = new Map(candidates.map((formula) => [canonicalFormula(formula), formula]));
  if (unique.size !== 1) return undefined;
  return [...unique.values()][0];
}

function parseNamedClause(source, lexicon, boundVariables, depth) {
  for (const constant of [...lexicon.constants].sort((left, right) => right.surface.length - left.surface.length)) {
    const prefix = `${constant.surface} `;
    if (!source.toLocaleLowerCase('en-US').startsWith(prefix.toLocaleLowerCase('en-US'))) continue;
    const remainder = source.slice(prefix.length);
    const parsed = parsePredication(remainder, constant.symbol, lexicon, boundVariables, depth + 1);
    if (parsed) return parsed;
  }
  return undefined;
}

function parseQuantifiedClause(source, lexicon, boundVariables, depth) {
  const options = [
    { prefixes: ['not all '], quantifier: 'exists', connective: 'and', negatePredication: true },
    { prefixes: ['every ', 'all ', 'each '], quantifier: 'forall', connective: 'implies' },
    { prefixes: ['no '], quantifier: 'exists', connective: 'and', negateWhole: true },
    { prefixes: ['a ', 'an ', 'some '], quantifier: 'exists', connective: 'and' },
    { prefixes: ['only '], quantifier: 'forall', connective: 'reverse-implies' },
  ];
  for (const option of options) {
    for (const prefix of option.prefixes) {
      if (!source.toLocaleLowerCase('en-US').startsWith(prefix)) continue;
      const matched = matchClassPrefix(source, prefix, lexicon);
      if (!matched?.remainder) continue;
      const variable = nextVariable(boundVariables);
      const nested = new Set(boundVariables).add(variable);
      let predication = parsePredication(matched.remainder, variable, lexicon, nested, depth + 1);
      if (!predication) continue;
      if (option.negatePredication) predication = negate(predication);
      const membership = predicate(matched.entry.symbol, [variable]);
      const body = option.connective === 'reverse-implies'
        ? binary('implies', predication, membership)
        : binary(option.connective, membership, predication);
      const quantified = quantify(option.quantifier, variable, body);
      return option.negateWhole ? negate(quantified) : quantified;
    }
  }
  return undefined;
}

function splitConnector(source, connector) {
  const index = source.toLocaleLowerCase('en-US').indexOf(connector);
  if (index < 0) return undefined;
  return Object.freeze({ left: source.slice(0, index).trim(), right: source.slice(index + connector.length).trim() });
}

function parseFormula(source, lexicon, boundVariables = new Set(), depth = 0) {
  invariant(depth <= MAX_DEPTH, 'sentence', 'composition depth exceeds the configured bound.');
  const text = normalizedText(source);
  const explicitNegation = /^it is not the case that\s+(.+)$/iu.exec(text);
  if (explicitNegation) {
    const operand = parseFormula(explicitNegation[1], lexicon, boundVariables, depth + 1);
    return operand ? negate(operand) : undefined;
  }
  const conditional = /^if\s+(.+?),\s*then\s+(.+)$/iu.exec(text);
  if (conditional) {
    const left = parseFormula(conditional[1], lexicon, boundVariables, depth + 1);
    const right = parseFormula(conditional[2], lexicon, boundVariables, depth + 1);
    return left && right ? binary('implies', left, right) : undefined;
  }
  for (const connector of [' if and only if ', ' just in case ']) {
    const parts = splitConnector(text, connector);
    if (!parts) continue;
    const left = parseFormula(parts.left, lexicon, boundVariables, depth + 1);
    const right = parseFormula(parts.right, lexicon, boundVariables, depth + 1);
    return left && right ? binary('iff', left, right) : undefined;
  }
  const onlyIf = splitConnector(text, ' only if ');
  if (onlyIf) {
    const left = parseFormula(onlyIf.left, lexicon, boundVariables, depth + 1);
    const right = parseFormula(onlyIf.right, lexicon, boundVariables, depth + 1);
    return left && right ? binary('implies', left, right) : undefined;
  }
  const unless = splitConnector(text, ' unless ');
  if (unless) {
    const left = parseFormula(unless.left, lexicon, boundVariables, depth + 1);
    const right = parseFormula(unless.right, lexicon, boundVariables, depth + 1);
    return left && right ? binary('implies', negate(right), left) : undefined;
  }
  const simple = parseQuantifiedClause(text, lexicon, boundVariables, depth)
    ?? parseNamedClause(text, lexicon, boundVariables, depth);
  if (simple) return simple;
  for (const [connector, operator] of [[' but ', 'and'], [' and ', 'and'], [' or ', 'or']]) {
    const parts = splitConnector(text, connector);
    if (!parts) continue;
    const left = parseFormula(parts.left, lexicon, boundVariables, depth + 1);
    const right = parseFormula(parts.right, lexicon, boundVariables, depth + 1);
    if (left && right) return binary(operator, left, right);
  }
  return undefined;
}

function canonicalNode(formula, environment, level) {
  if (formula?.type === 'predicate') {
    invariant(typeof formula.predicate === 'string' && Array.isArray(formula.terms), 'formula',
      'predicate nodes require an identifier and terms.');
    return `p:${JSON.stringify(formula.predicate)}(${formula.terms
      .map((term) => environment.get(term) ?? `c:${JSON.stringify(term)}`).join(',')})`;
  }
  if (formula?.type === 'not') {
    if (formula.operand?.type === 'not') return canonicalNode(formula.operand.operand, environment, level);
    return `not(${canonicalNode(formula.operand, environment, level)})`;
  }
  if (formula?.type === 'binary') {
    if (formula.operator === 'and' || formula.operator === 'or') {
      const operands = [];
      function collect(candidate) {
        if (candidate?.type === 'binary' && candidate.operator === formula.operator) {
          collect(candidate.left);
          collect(candidate.right);
        } else {
          operands.push(canonicalNode(candidate, environment, level));
        }
      }
      collect(formula);
      return `${formula.operator}(${operands.sort().join(',')})`;
    }
    const left = canonicalNode(formula.left, environment, level);
    const right = canonicalNode(formula.right, environment, level);
    const operands = formula.operator === 'iff' ? [left, right].sort() : [left, right];
    return `${formula.operator}(${operands.join(',')})`;
  }
  if (formula?.type === 'quantifier') {
    const next = new Map(environment).set(formula.variable, `v:${level}`);
    return `${formula.quantifier}(${canonicalNode(formula.body, next, level + 1)})`;
  }
  throw new Error('formula: unsupported typed node.');
}

function freeVariables(formula, bound = new Set()) {
  if (formula?.type === 'predicate') {
    return new Set(formula.terms.filter((term) => VARIABLE_NAMES.includes(term) && !bound.has(term)));
  }
  if (formula?.type === 'not') return freeVariables(formula.operand, bound);
  if (formula?.type === 'binary') {
    return new Set([...freeVariables(formula.left, bound), ...freeVariables(formula.right, bound)]);
  }
  if (formula?.type === 'quantifier') {
    return freeVariables(formula.body, new Set(bound).add(formula.variable));
  }
  return new Set();
}

function normalizeEquivalenceShape(formula) {
  if (formula?.type === 'predicate') return formula;
  if (formula?.type === 'not') {
    const operand = normalizeEquivalenceShape(formula.operand);
    return operand.type === 'not' ? normalizeEquivalenceShape(operand.operand) : node('not', { operand });
  }
  if (formula?.type === 'binary') {
    return node('binary', { operator: formula.operator,
      left: normalizeEquivalenceShape(formula.left), right: normalizeEquivalenceShape(formula.right) });
  }
  if (formula?.type === 'quantifier') {
    const body = normalizeEquivalenceShape(formula.body);
    if (formula.quantifier === 'exists' && body.type === 'binary' && body.operator === 'and') {
      if (body.right.type === 'quantifier' && body.right.quantifier === 'exists'
        && !freeVariables(body.left).has(body.right.variable)) {
        return quantify('exists', formula.variable, quantify('exists', body.right.variable,
          normalizeEquivalenceShape(binary('and', body.left, body.right.body))));
      }
      if (body.left.type === 'quantifier' && body.left.quantifier === 'exists'
        && !freeVariables(body.right).has(body.left.variable)) {
        return quantify('exists', formula.variable, quantify('exists', body.left.variable,
          normalizeEquivalenceShape(binary('and', body.left.body, body.right))));
      }
    }
    if (formula.quantifier === 'forall' && body.type === 'binary' && body.operator === 'implies'
      && body.right.type === 'quantifier' && body.right.quantifier === 'forall'
      && body.right.body.type === 'binary' && body.right.body.operator === 'implies'
      && !freeVariables(body.left).has(body.right.variable)) {
      return quantify('forall', formula.variable, quantify('forall', body.right.variable,
        normalizeEquivalenceShape(binary('implies',
          binary('and', body.left, body.right.body.left), body.right.body.right))));
    }
    return quantify(formula.quantifier, formula.variable, body);
  }
  throw new Error('formula: unsupported typed node.');
}

export function canonicalFormula(formula) {
  return canonicalNode(normalizeEquivalenceShape(formula), new Map(), 0);
}

export function controlledFolFormulasEquivalent(left, right) {
  try {
    return canonicalFormula(left) === canonicalFormula(right);
  } catch {
    return false;
  }
}

export function compileControlledFolSentence(input) {
  try {
    invariant(typeof input?.sentence === 'string' && input.sentence.trim(), 'sentence',
      'expected non-empty controlled language.');
    invariant(input.sentence.length <= MAX_CHARACTERS, 'sentence', 'input exceeds the character bound.');
    const lexicon = compileLexicon(input.lexicon);
    const formula = parseFormula(input.sentence, lexicon);
    if (!formula) return Object.freeze({ status: 'UNPARSED', diagnostic: 'unsupported controlled construction' });
    const source = Object.freeze({ sentence: normalizedText(input.sentence), lexicon: input.lexicon });
    return Object.freeze({
      status: 'SOLVED',
      formula,
      witness: Object.freeze({
        kind: 'controlled-fol-derivation-v1',
        sourceSha256: digest(source),
        normalizedFormula: canonicalFormula(formula),
      }),
    });
  } catch (error) {
    return Object.freeze({ status: /bound|exceeds/iu.test(error.message) ? 'RESOURCE_LIMIT' : 'UNPARSED',
      diagnostic: error.message });
  }
}

export function verifyControlledFolSymbolization(input, result) {
  if (result?.status !== 'SOLVED' || result.witness?.kind !== 'controlled-fol-derivation-v1') return false;
  try {
    const source = Object.freeze({ sentence: normalizedText(input.sentence), lexicon: input.lexicon });
    if (result.witness.sourceSha256 !== digest(source)) return false;
    const replay = compileControlledFolSentence(input);
    return replay.status === 'SOLVED'
      && controlledFolFormulasEquivalent(replay.formula, result.formula)
      && result.witness.normalizedFormula === canonicalFormula(result.formula);
  } catch {
    return false;
  }
}
