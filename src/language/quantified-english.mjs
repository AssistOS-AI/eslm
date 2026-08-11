const MAX_INPUT_CHARACTERS = 4_096;
const MAX_COMPOSITION_DEPTH = 24;

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Quantified English: ${message}`);
}

function node(type, fields) {
  return Object.freeze({ type, ...fields });
}

export function predicateFormula(predicate, terms) {
  requireCondition(typeof predicate === 'string' && predicate.length > 0, 'predicate must be non-empty text.');
  requireCondition(Array.isArray(terms) && terms.length > 0, 'predicate terms must be a non-empty array.');
  return node('predicate', { predicate, terms: Object.freeze([...terms]) });
}

export function negateFormula(operand) {
  requireCondition(operand?.type, 'negation requires a typed operand.');
  return node('not', { operand });
}

export function composeFormula(operator, left, right) {
  requireCondition(['and', 'or', 'xor', 'implies', 'iff'].includes(operator),
    `unsupported composition operator ${operator}.`);
  requireCondition(left?.type && right?.type, 'composition requires two typed operands.');
  return node('binary', { operator, left, right });
}

export function quantifyFormula(quantifier, variable, body) {
  requireCondition(['forall', 'exists'].includes(quantifier), `unsupported quantifier ${quantifier}.`);
  requireCondition(typeof variable === 'string' && variable.length > 0, 'quantified variable must be non-empty.');
  requireCondition(body?.type, 'quantification requires a typed body.');
  return node('quantifier', { quantifier, variable, body });
}

export function formulaConjunction(formulas) {
  requireCondition(Array.isArray(formulas) && formulas.length > 0, 'conjunction requires at least one formula.');
  return formulas.slice(1).reduce((left, right) => composeFormula('and', left, right), formulas[0]);
}

export function formulaDisjunction(formulas) {
  requireCondition(Array.isArray(formulas) && formulas.length > 0, 'disjunction requires at least one formula.');
  return formulas.slice(1).reduce((left, right) => composeFormula('or', left, right), formulas[0]);
}

const IRREGULAR = Object.freeze({
  are: 'be', is: 'be', was: 'be', were: 'be', has: 'have', does: 'do', people: 'person',
  men: 'man', women: 'woman', children: 'child', mice: 'mouse', geese: 'goose',
});

export function semanticWords(surface) {
  const separated = surface.normalize('NFKC').replace(/([\p{Ll}\d])([\p{Lu}])/gu, '$1 $2')
    .toLocaleLowerCase('en-US').replace(/[’']/gu, '');
  return (separated.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => !['a', 'an', 'the', 'their', 'his', 'her', 'its'].includes(word))
    .map((word) => {
      if (IRREGULAR[word]) return IRREGULAR[word];
      if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
      if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3).replace(/([a-z])\1$/u, '$1');
      if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2).replace(/([a-z])\1$/u, '$1');
      if (word.length > 4 && /(?:sses|shes|ches|xes|zes)$/u.test(word)) return word.slice(0, -2);
      if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
      return word;
    });
}

function fallbackIdentifier(prefix, surface) {
  const words = semanticWords(surface);
  return `${prefix}:${words.join('-') || 'unspecified'}`;
}

function resolvedSymbol(resolution, fallback, kind) {
  if (typeof resolution === 'string') return { status: 'PARSED', value: resolution };
  if (resolution?.status === 'AMBIGUOUS') {
    return { status: 'AMBIGUOUS', diagnostic: `${kind} has several equally supported interpretations.` };
  }
  if (resolution?.status === 'UNSUPPORTED') {
    return { status: 'UNSUPPORTED', diagnostic: `${kind} has no supported semantic mapping.` };
  }
  return { status: 'PARSED', value: fallback };
}

function parsePredication(surface, term, options, depth) {
  if (depth > MAX_COMPOSITION_DEPTH) {
    return { status: 'RESOURCE_LIMIT', diagnostic: 'Composition exceeds the bounded nesting depth.' };
  }
  let source = surface.trim().replace(/^[,\s]+|[,\s]+$/gu, '');
  source = source.replace(/^(?:they|he|she|it|that person)\s+/iu, '');
  let negative = false;
  if (/^(?:is|are|was|were|does|do|did|has|have|had) not\b/iu.test(source)) {
    negative = true;
    source = source.replace(/^(?:is|are|was|were|does|do|did|has|have|had) not\s+/iu, '');
  } else if (/^not\b/iu.test(source)) {
    negative = true;
    source = source.replace(/^not\s+/iu, '');
  }
  source = source.replace(/^(?:is|are|was|were)\s+(?:a|an|the)?\s*/iu, '')
    .replace(/^(?:does|do|did)\s+/iu, '').trim();
  if (!source) return { status: 'UNSUPPORTED', diagnostic: 'Predication has no semantic surface.' };

  const both = /^both\s+(.+?)\s+and\s+(.+)$/iu.exec(source);
  if (both) {
    const left = parsePredication(both[1], term, options, depth + 1);
    const right = parsePredication(both[2], term, options, depth + 1);
    if (left.status !== 'PARSED') return left;
    if (right.status !== 'PARSED') return right;
    return { status: 'PARSED', formula: composeFormula('and', left.formula, right.formula) };
  }
  const either = /^either\s+(.+?)\s+or\s+(.+)$/iu.exec(source);
  if (either) {
    const left = parsePredication(either[1], term, options, depth + 1);
    const right = parsePredication(either[2], term, options, depth + 1);
    if (left.status !== 'PARSED') return left;
    if (right.status !== 'PARSED') return right;
    return { status: 'PARSED', formula: composeFormula('xor', left.formula, right.formula) };
  }
  const neither = /^neither\s+(.+?)\s+nor\s+(.+)$/iu.exec(source);
  if (neither) {
    const left = parsePredication(neither[1], term, options, depth + 1);
    const right = parsePredication(neither[2], term, options, depth + 1);
    if (left.status !== 'PARSED') return left;
    if (right.status !== 'PARSED') return right;
    return { status: 'PARSED', formula: negateFormula(composeFormula('or', left.formula, right.formula)) };
  }
  const andParts = source.split(/\s+and\s+/iu);
  if (andParts.length > 1) {
    const parsed = andParts.map((part) => parsePredication(part, term, options, depth + 1));
    if (parsed.every((result) => result.status === 'PARSED')) {
      return { status: 'PARSED', formula: formulaConjunction(parsed.map((result) => result.formula)) };
    }
  }
  const words = source.split(/\s+/u);
  const binaryCandidates = [];
  for (let boundary = 1; boundary < words.length; boundary += 1) {
    const relationSurface = words.slice(0, boundary).join(' ');
    const objectSurface = words.slice(boundary).join(' ');
    const relation = options.resolvePredicate?.(relationSurface, 2);
    const object = options.resolveConstant?.(objectSurface);
    if (typeof relation === 'string' && typeof object === 'string') {
      binaryCandidates.push({ relation, object });
    }
  }
  const binaryKeys = new Map(binaryCandidates.map((candidate) => [
    `${candidate.relation}\0${candidate.object}`, candidate,
  ]));
  if (binaryKeys.size === 1) {
    const [{ relation, object }] = binaryKeys.values();
    const formula = predicateFormula(relation, [term, object]);
    return { status: 'PARSED', formula: negative ? negateFormula(formula) : formula };
  }
  if (binaryKeys.size > 1) {
    return { status: 'AMBIGUOUS', diagnostic: 'Predication has several relation-object segmentations.' };
  }
  const predicate = resolvedSymbol(
    options.resolvePredicate?.(source, 1), fallbackIdentifier('predicate', source), 'Predicate surface',
  );
  if (predicate.status !== 'PARSED') return predicate;
  const formula = predicateFormula(predicate.value, [term]);
  return { status: 'PARSED', formula: negative ? negateFormula(formula) : formula };
}

function resolveTerm(surface, options) {
  return resolvedSymbol(options.resolveConstant?.(surface), fallbackIdentifier('entity', surface), 'Entity surface');
}

function formulaKey(formula) {
  if (formula.type === 'predicate') return `p:${formula.predicate}(${formula.terms.join(',')})`;
  if (formula.type === 'not') return `not(${formulaKey(formula.operand)})`;
  if (formula.type === 'binary') return `${formula.operator}(${formulaKey(formula.left)},${formulaKey(formula.right)})`;
  return `${formula.quantifier}:${formula.variable}(${formulaKey(formula.body)})`;
}

function uniqueFormulaResult(candidates, ambiguityDiagnostic) {
  const unique = new Map(candidates.map((formula) => [formulaKey(formula), formula]));
  if (unique.size === 1) return { status: 'PARSED', formula: [...unique.values()][0] };
  if (unique.size > 1) return { status: 'AMBIGUOUS', diagnostic: ambiguityDiagnostic };
  return undefined;
}

function requiredResolvedSymbol(resolution, kind) {
  if (typeof resolution === 'string' && resolution) return { status: 'PARSED', value: resolution };
  if (resolution?.status === 'AMBIGUOUS') {
    return { status: 'AMBIGUOUS', diagnostic: `${kind} has several equally supported interpretations.` };
  }
  return { status: 'UNSUPPORTED', diagnostic: `${kind} has no supported semantic mapping.` };
}

function parseRelativeBoundary(remainder, membership, options, depth) {
  const words = remainder.split(/\s+/u);
  const candidates = [];
  for (let boundary = 1; boundary < words.length; boundary += 1) {
    const relative = parsePredication(words.slice(0, boundary).join(' '), '?entity', options, depth + 1);
    const consequent = parsePredication(words.slice(boundary).join(' '), '?entity', options, depth + 1);
    if (relative.status !== 'PARSED' || consequent.status !== 'PARSED') continue;
    const antecedent = membership
      ? composeFormula('and', membership, relative.formula)
      : relative.formula;
    candidates.push(quantifyFormula('forall', '?entity', composeFormula(
      'implies', antecedent, consequent.formula,
    )));
  }
  return uniqueFormulaResult(candidates, 'Relative clause has several supported attachment boundaries.');
}

function parseScopedRelative(source, options, depth) {
  let match = /^(?:everyone|everybody)\s+who\s+(.+)$/iu.exec(source);
  if (match) return parseRelativeBoundary(match[1], undefined, options, depth);
  match = /^(?:all|every|each)\s+(.+?)\s+who\s+(.+)$/iu.exec(source);
  if (!match) return undefined;
  const membership = parsePredication(match[1], '?entity', options, depth + 1);
  if (membership.status === 'AMBIGUOUS') return membership;
  if (membership.status !== 'PARSED') return undefined;
  return parseRelativeBoundary(match[2], membership.formula, options, depth);
}

function parseIndefiniteObjectClause(source, options) {
  const subjectSplit = namedSubjectSplit(source);
  if (!subjectSplit) return undefined;
  const subject = resolveTerm(subjectSplit[0], options);
  if (subject.status !== 'PARSED') return subject;
  const match = /^(.+?)\s+(?:a|an|some)\s+(.+)$/iu.exec(subjectSplit[1]);
  if (!match) return undefined;
  const relation = requiredResolvedSymbol(options.resolvePredicate?.(match[1], 2), 'Relation surface');
  const membership = requiredResolvedSymbol(options.resolvePredicate?.(match[2], 1), 'Object class surface');
  if (relation.status !== 'PARSED') return relation;
  if (membership.status !== 'PARSED') return membership;
  return { status: 'PARSED', subject: subject.value, relation: relation.value, membership: membership.value };
}

function parseBoundObjectPredication(source, subject, object, options) {
  let text = source.trim().replace(/^(?:will|can|does|do|did)\s+/iu, '');
  let negative = false;
  if (/^(?:will|can|does|do|did)\s+not\s+/iu.test(source)) {
    negative = true;
    text = source.replace(/^(?:will|can|does|do|did)\s+not\s+/iu, '');
  }
  const match = /^(.+?)\s+(?:it|them|that object)$/iu.exec(text);
  if (!match) return undefined;
  const relation = requiredResolvedSymbol(options.resolvePredicate?.(match[1], 2),
    'Coreferential relation surface');
  if (relation.status !== 'PARSED') return relation;
  const formula = predicateFormula(relation.value, [subject, object]);
  return { status: 'PARSED', formula: negative ? negateFormula(formula) : formula };
}

function parseCoreferentialConditional(source, options) {
  let operator = 'implies';
  let match = /^if\s+(.+?),?\s+then\s+(.+)$/iu.exec(source);
  if (!match) {
    match = /^if and only if\s+(.+?),\s*(.+)$/iu.exec(source);
    operator = 'iff';
  }
  if (!match) return undefined;
  const antecedent = parseIndefiniteObjectClause(match[1], options);
  if (!antecedent) return undefined;
  if (antecedent.status === 'AMBIGUOUS') return antecedent;
  if (antecedent.status !== 'PARSED') return undefined;
  const consequentMatch = /^(?:he|she|they|that person)\s+(.+)$/iu.exec(match[2]);
  if (!consequentMatch) return undefined;
  const consequent = parseBoundObjectPredication(
    consequentMatch[1], antecedent.subject, '?object', options,
  );
  if (!consequent) return undefined;
  if (consequent.status === 'AMBIGUOUS') return consequent;
  if (consequent.status !== 'PARSED') return undefined;
  const premise = composeFormula('and',
    predicateFormula(antecedent.membership, ['?object']),
    predicateFormula(antecedent.relation, [antecedent.subject, '?object']),
  );
  return { status: 'PARSED', formula: quantifyFormula('forall', '?object', composeFormula(
    operator, premise, consequent.formula,
  )) };
}

function parseConditional(source, options, depth) {
  const coreferential = parseCoreferentialConditional(source, options);
  if (coreferential) return coreferential;
  const match = /^if\s+(.+?),?\s+then\s+(.+)$/iu.exec(source);
  if (!match) return undefined;
  const generalizedLeft = /^(?:people|someone|one)\s+(.+)$/iu.exec(match[1]);
  const generalizedRight = /^(?:they|he|she|that person)\s+(.+)$/iu.exec(match[2]);
  if (generalizedLeft && generalizedRight) {
    const antecedent = parsePredication(generalizedLeft[1], '?entity', options, depth + 1);
    const consequent = parsePredication(generalizedRight[1], '?entity', options, depth + 1);
    if (antecedent.status !== 'PARSED') return antecedent;
    if (consequent.status !== 'PARSED') return consequent;
    return {
      status: 'PARSED',
      formula: quantifyFormula('forall', '?entity', composeFormula(
        'implies', antecedent.formula, consequent.formula,
      )),
    };
  }
  const indefiniteLeft = /^(?:a|an|the)\s+\S+\s+(.+)$/iu.exec(match[1]);
  if (indefiniteLeft && generalizedRight) {
    const antecedent = parsePredication(indefiniteLeft[1], '?entity', options, depth + 1);
    const consequent = parsePredication(generalizedRight[1], '?entity', options, depth + 1);
    if (antecedent.status !== 'PARSED') return antecedent;
    if (consequent.status !== 'PARSED') return consequent;
    return {
      status: 'PARSED',
      formula: quantifyFormula('forall', '?entity', composeFormula(
        'implies', antecedent.formula, consequent.formula,
      )),
    };
  }
  const namedLeft = namedSubjectSplit(match[1]);
  const pronounRight = /^(?:they|he|she|it|that person)\s+(.+)$/iu.exec(match[2]);
  if (namedLeft && pronounRight) {
    const term = resolveTerm(namedLeft[0], options);
    if (term.status !== 'PARSED') return term;
    const antecedent = parsePredication(namedLeft[1], term.value, options, depth + 1);
    const consequent = parsePredication(pronounRight[1], term.value, options, depth + 1);
    if (antecedent.status !== 'PARSED') return antecedent;
    if (consequent.status !== 'PARSED') return consequent;
    return { status: 'PARSED', formula: composeFormula('implies', antecedent.formula, consequent.formula) };
  }
  const antecedent = parseControlledQuantifiedEnglish(match[1], options, depth + 1);
  const consequent = parseControlledQuantifiedEnglish(match[2], options, depth + 1);
  if (antecedent.status !== 'PARSED') return antecedent;
  if (consequent.status !== 'PARSED') return consequent;
  return { status: 'PARSED', formula: composeFormula('implies', antecedent.formula, consequent.formula) };
}

function parseQuantified(source, options, depth) {
  const scopedRelative = parseScopedRelative(source, options, depth);
  if (scopedRelative) return scopedRelative;
  let match = /^(?:everyone|everybody)\s+(?:who\s+)?(.+)$/iu.exec(source);
  if (match) {
    const predication = parsePredication(match[1], '?entity', options, depth + 1);
    if (predication.status !== 'PARSED') return predication;
    return { status: 'PARSED', formula: quantifyFormula('forall', '?entity', predication.formula) };
  }
  match = /^no\s+one\s+(.+)$/iu.exec(source);
  if (match) {
    const predication = parsePredication(match[1], '?entity', options, depth + 1);
    if (predication.status !== 'PARSED') return predication;
    return {
      status: 'PARSED', formula: quantifyFormula('forall', '?entity', negateFormula(predication.formula)),
    };
  }
  match = /^(?:all|every|each)\s+(.+?)\s+who\s+(.+)\s+(is|are|was|were|will|can)\s+(.+)$/iu.exec(source);
  if (match) {
    const membership = parsePredication(match[1], '?entity', options, depth + 1);
    const relative = parsePredication(match[2], '?entity', options, depth + 1);
    const property = parsePredication(`${match[3]} ${match[4]}`, '?entity', options, depth + 1);
    if (membership.status !== 'PARSED') return membership;
    if (relative.status !== 'PARSED') return relative;
    if (property.status !== 'PARSED') return property;
    return {
      status: 'PARSED',
      formula: quantifyFormula('forall', '?entity', composeFormula(
        'implies', composeFormula('and', membership.formula, relative.formula), property.formula,
      )),
    };
  }
  match = /^(?:all|every|each)\s+(.+?)\s+(?:is|are)\s+(.+)$/iu.exec(source);
  if (match) {
    const membership = parsePredication(match[1], '?entity', options, depth + 1);
    const property = parsePredication(match[2], '?entity', options, depth + 1);
    if (membership.status !== 'PARSED') return membership;
    if (property.status !== 'PARSED') return property;
    return {
      status: 'PARSED',
      formula: quantifyFormula('forall', '?entity', composeFormula('implies', membership.formula, property.formula)),
    };
  }
  match = /^no\s+(.+?)\s+(?:is|are)\s+(.+)$/iu.exec(source);
  if (match) {
    const membership = parsePredication(match[1], '?entity', options, depth + 1);
    const property = parsePredication(match[2], '?entity', options, depth + 1);
    if (membership.status !== 'PARSED') return membership;
    if (property.status !== 'PARSED') return property;
    return {
      status: 'PARSED',
      formula: quantifyFormula('forall', '?entity', composeFormula(
        'implies', membership.formula, negateFormula(property.formula),
      )),
    };
  }
  match = /^some\s+(.+?)\s+(?:is|are)\s+(.+)$/iu.exec(source);
  if (match) {
    const membership = parsePredication(match[1], '?entity', options, depth + 1);
    const property = parsePredication(match[2], '?entity', options, depth + 1);
    if (membership.status !== 'PARSED') return membership;
    if (property.status !== 'PARSED') return property;
    return {
      status: 'PARSED',
      formula: quantifyFormula('exists', '?entity', composeFormula('and', membership.formula, property.formula)),
    };
  }
  match = /^there\s+(?:is|are)\s+(?:a|an|some)\s+(.+)$/iu.exec(source);
  if (match) {
    const property = parsePredication(match[1], '?entity', options, depth + 1);
    if (property.status !== 'PARSED') return property;
    return { status: 'PARSED', formula: quantifyFormula('exists', '?entity', property.formula) };
  }
  return undefined;
}

function namedSubjectSplit(source) {
  const copula = /^(.+?)\s+((?:is|are|was|were|does|do|did|has|have|had|can|will)\b.+)$/iu.exec(source);
  if (copula) return [copula[1], copula[2]];
  const tokens = source.split(/\s+/u);
  let boundary = 0;
  while (boundary < tokens.length && /^\p{Lu}/u.test(tokens[boundary])) boundary += 1;
  if (boundary > 0 && boundary < tokens.length) {
    return [tokens.slice(0, boundary).join(' '), tokens.slice(boundary).join(' ')];
  }
  return undefined;
}

function parseCoordinatedNamedSubjects(source, options, depth) {
  const match = /^(.+?)\s+and\s+(.+?)\s+((?:is|are|was|were|does|do|did|has|have|had|can|will)\b.+)$/iu.exec(source);
  if (!match) return undefined;
  const leftTerm = resolveTerm(match[1], options);
  const rightTerm = resolveTerm(match[2], options);
  if (leftTerm.status !== 'PARSED' || rightTerm.status !== 'PARSED') return undefined;
  const left = parsePredication(match[3], leftTerm.value, options, depth + 1);
  const right = parsePredication(match[3], rightTerm.value, options, depth + 1);
  if (left.status !== 'PARSED' || right.status !== 'PARSED') return undefined;
  return { status: 'PARSED', formula: composeFormula('and', left.formula, right.formula) };
}

function parseSentenceCoordination(source, options, depth) {
  const candidates = [];
  for (const [connector, operator] of [[' and ', 'and'], [' or ', 'or']]) {
    let offset = source.toLocaleLowerCase('en-US').indexOf(connector);
    while (offset >= 0) {
      const left = parseControlledQuantifiedEnglish(source.slice(0, offset), options, depth + 1);
      const right = parseControlledQuantifiedEnglish(source.slice(offset + connector.length), options, depth + 1);
      if (left.status === 'PARSED' && right.status === 'PARSED') {
        candidates.push(composeFormula(operator, left.formula, right.formula));
      }
      offset = source.toLocaleLowerCase('en-US').indexOf(connector, offset + connector.length);
    }
  }
  return uniqueFormulaResult(candidates, 'Coordination has several supported scope boundaries.');
}

export function parseControlledQuantifiedEnglish(text, options = {}, depth = 0) {
  if (typeof text !== 'string' || !text.trim()) {
    return Object.freeze({ status: 'UNSUPPORTED', diagnostic: 'Input must be non-empty text.' });
  }
  if (text.length > MAX_INPUT_CHARACTERS || depth > MAX_COMPOSITION_DEPTH) {
    return Object.freeze({ status: 'RESOURCE_LIMIT', diagnostic: 'Input exceeds a controlled parser bound.' });
  }
  const source = text.normalize('NFKC').trim().replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ');
  const conditional = parseConditional(source, options, depth);
  if (conditional) return Object.freeze(conditional);
  const quantified = parseQuantified(source, options, depth);
  if (quantified) return Object.freeze(quantified);
  const coordinatedSubjects = parseCoordinatedNamedSubjects(source, options, depth);
  if (coordinatedSubjects) return Object.freeze(coordinatedSubjects);
  const coordinatedSentences = parseSentenceCoordination(source, options, depth);
  if (coordinatedSentences) return Object.freeze(coordinatedSentences);
  const split = namedSubjectSplit(source);
  if (!split) {
    return Object.freeze({
      status: /\b(?:and|or|nor|if|unless)\b/iu.test(source) ? 'AMBIGUOUS' : 'UNSUPPORTED',
      diagnostic: 'No high-confidence subject and predication boundary was found.',
    });
  }
  const term = resolveTerm(split[0], options);
  if (term.status !== 'PARSED') return Object.freeze(term);
  const predication = parsePredication(split[1], term.value, options, depth + 1);
  return Object.freeze(predication);
}
