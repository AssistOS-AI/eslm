function requireCondition(condition, message) {
  if (!condition) throw new Error(`Compact FOL: ${message}`);
}

const TOKEN_TYPES = new Map([
  ['¬', 'not'], ['∧', 'and'], ['∨', 'or'], ['⊕', 'xor'], ['→', 'implies'], ['↔', 'iff'],
  ['∀', 'forall'], ['∃', 'exists'], ['(', '('], [')', ')'], [',', ','],
]);

function tokenize(source) {
  requireCondition(typeof source === 'string' && source.trim(), 'source must be non-empty text.');
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    if (/\s/u.test(source[offset])) {
      offset += 1;
      continue;
    }
    if (source.startsWith('|=', offset)) {
      tokens.push(Object.freeze({ type: 'turnstile', offset }));
      offset += 2;
      continue;
    }
    const type = TOKEN_TYPES.get(source[offset]);
    if (type) {
      tokens.push(Object.freeze({ type, source: source[offset], offset }));
      offset += 1;
      continue;
    }
    const match = /^[\p{L}\p{N}_]+/u.exec(source.slice(offset));
    requireCondition(match, `unsupported token at character ${offset}.`);
    tokens.push(Object.freeze({ type: 'identifier', value: match[0], offset }));
    offset += match[0].length;
  }
  return tokens;
}

function node(type, fields) {
  return Object.freeze({ type, ...fields });
}

function splitCompactAtom(value) {
  requireCondition(/^\p{Lu}[\p{Ll}\p{N}_]*$/u.test(value), `invalid compact atom ${value}.`);
  const symbols = [...value];
  return node('predicate', {
    predicate: symbols[0],
    terms: Object.freeze(symbols.slice(1)),
  });
}

function parseFormulaTokens(tokens, path) {
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
    requireCondition(token, `${path}: expected ${type} at token ${cursor.index + 1}.`);
    return token;
  };
  let parseIff;
  function parsePrimary() {
    if (take('(')) {
      const formula = parseIff();
      expect(')');
      return formula;
    }
    if (take('not')) return node('not', { operand: parsePrimary() });
    const quantifier = take('forall') ?? take('exists');
    if (quantifier) {
      const variableToken = expect('identifier');
      const [variable, ...remainder] = [...variableToken.value];
      requireCondition(/^\p{Ll}$/u.test(variable), `${path}: quantifier variable must begin with one lower-case symbol.`);
      if (remainder.length > 0) {
        tokens.splice(cursor.index, 0, Object.freeze({
          type: 'identifier', value: remainder.join(''), offset: variableToken.offset + variable.length,
        }));
      }
      return node('quantifier', { quantifier: quantifier.type, variable, body: parsePrimary() });
    }
    return splitCompactAtom(expect('identifier').value);
  }
  function left(next, operator) {
    let result = next();
    while (take(operator)) result = node('binary', { operator, left: result, right: next() });
    return result;
  }
  const parseAnd = () => left(parsePrimary, 'and');
  const parseOr = () => left(parseAnd, 'or');
  const parseXor = () => left(parseOr, 'xor');
  function parseImplies() {
    const antecedent = parseXor();
    return take('implies')
      ? node('binary', { operator: 'implies', left: antecedent, right: parseImplies() })
      : antecedent;
  }
  parseIff = () => left(parseImplies, 'iff');
  const formula = parseIff();
  requireCondition(cursor.index === tokens.length, `${path}: unexpected token ${cursor.index + 1}.`);
  return formula;
}

export function parseCompactFolFormula(source, path = 'formula') {
  const tokens = tokenize(source.normalize('NFKC').trim().replace(/[.]$/u, '').trim());
  requireCondition(tokens.length > 0 && !tokens.some((token) => token.type === 'turnstile' || token.type === ','),
    `${path}: expected one formula without a turnstile or top-level separator.`);
  return parseFormulaTokens(tokens, path);
}

export function parseCompactFolArgument(source) {
  const tokens = tokenize(source.normalize('NFKC').trim());
  let depth = 0;
  let turnstile = -1;
  const separators = [];
  for (const [index, token] of tokens.entries()) {
    if (token.type === '(') depth += 1;
    if (token.type === ')') depth -= 1;
    requireCondition(depth >= 0, 'unbalanced closing parenthesis.');
    if (depth === 0 && token.type === ',') separators.push(index);
    if (depth === 0 && token.type === 'turnstile') {
      requireCondition(turnstile === -1, 'argument contains more than one top-level turnstile.');
      turnstile = index;
    }
  }
  requireCondition(depth === 0, 'unbalanced opening parenthesis.');
  requireCondition(turnstile > 0 && turnstile < tokens.length - 1, 'argument requires premises |= conclusion.');
  requireCondition(separators.every((index) => index < turnstile), 'conclusion cannot contain a top-level comma.');
  const boundaries = [-1, ...separators, turnstile];
  const premises = boundaries.slice(1).map((end, index) => {
    const start = boundaries[index] + 1;
    requireCondition(end > start, `premise ${index + 1} is empty.`);
    return parseFormulaTokens(tokens.slice(start, end), `premise ${index + 1}`);
  });
  return Object.freeze({
    type: 'first-order-argument',
    premises: Object.freeze(premises),
    conclusion: parseFormulaTokens(tokens.slice(turnstile + 1), 'conclusion'),
  });
}
