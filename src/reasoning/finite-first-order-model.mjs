import { atom, binary, negate } from './finite-entailment.mjs';
import { decideBooleanEntailment, verifyBooleanEntailmentResult } from './sat-entailment.mjs';

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Finite first-order model: ${message}`);
}

function visit(node, bound, signature, constants) {
  requireCondition(node && typeof node === 'object' && !Array.isArray(node), 'formula node must be an object.');
  if (node.type === 'predicate') {
    requireCondition(typeof node.predicate === 'string' && /^[\p{L}][\p{L}\p{N}_-]{0,63}$/u.test(node.predicate),
      'predicate identifier is invalid.');
    requireCondition(Array.isArray(node.terms), 'predicate terms must be an array.');
    const existing = signature.get(node.predicate);
    requireCondition(existing === undefined || existing === node.terms.length,
      `predicate ${node.predicate} changes arity.`);
    signature.set(node.predicate, node.terms.length);
    for (const term of node.terms) {
      requireCondition(typeof term === 'string' && /^[\p{L}\p{N}_-]{1,64}$/u.test(term), 'term is invalid.');
      if (!bound.has(term)) constants.add(term);
    }
    return;
  }
  if (node.type === 'not') return visit(node.operand, bound, signature, constants);
  if (node.type === 'binary') {
    requireCondition(['and', 'or', 'xor', 'implies', 'iff'].includes(node.operator),
      `unsupported binary operator ${node.operator}.`);
    visit(node.left, bound, signature, constants);
    visit(node.right, bound, signature, constants);
    return;
  }
  requireCondition(node.type === 'quantifier' && ['forall', 'exists'].includes(node.quantifier),
    'expected a predicate, connective, or quantifier.');
  requireCondition(typeof node.variable === 'string', 'quantifier variable is invalid.');
  const nested = new Set(bound);
  nested.add(node.variable);
  visit(node.body, nested, signature, constants);
}

function cartesianAssignments(constants, domain, maximum) {
  const count = domain.length ** constants.length;
  requireCondition(count <= maximum, `constant assignment count ${count} exceeds semantic budget ${maximum}.`);
  const assignments = [];
  for (let ordinal = 0; ordinal < count; ordinal += 1) {
    let value = ordinal;
    const assignment = new Map();
    for (const constant of constants) {
      assignment.set(constant, domain[value % domain.length]);
      value = Math.floor(value / domain.length);
    }
    assignments.push(assignment);
  }
  return assignments;
}

function atomId(predicate, terms) {
  const encoded = [predicate, ...terms].map((part) => [...part].map((character) => character.codePointAt(0).toString(16))
    .join('-')).join(':');
  return `fom:${encoded}`;
}

function conjunction(formulas) {
  requireCondition(formulas.length > 0, 'domain must contain at least one member.');
  return formulas.slice(1).reduce((left, right) => binary('and', left, right), formulas[0]);
}

function disjunction(formulas) {
  requireCondition(formulas.length > 0, 'domain must contain at least one member.');
  return formulas.slice(1).reduce((left, right) => binary('or', left, right), formulas[0]);
}

function ground(node, domain, constants, variables = new Map()) {
  if (node.type === 'predicate') {
    const terms = node.terms.map((term) => variables.get(term) ?? constants.get(term));
    requireCondition(terms.every((term) => domain.includes(term)), 'an unbound term reached grounding.');
    return atom(atomId(node.predicate, terms));
  }
  if (node.type === 'not') return negate(ground(node.operand, domain, constants, variables));
  if (node.type === 'quantifier') {
    const instances = domain.map((member) => {
      const nested = new Map(variables);
      nested.set(node.variable, member);
      return ground(node.body, domain, constants, nested);
    });
    return node.quantifier === 'forall' ? conjunction(instances) : disjunction(instances);
  }
  const left = ground(node.left, domain, constants, variables);
  const right = ground(node.right, domain, constants, variables);
  if (node.operator === 'xor') return binary('and', binary('or', left, right), negate(binary('and', left, right)));
  if (node.operator === 'iff') {
    return binary('and', binary('implies', left, right), binary('implies', right, left));
  }
  return binary(node.operator, left, right);
}

function evaluate(node, model, variables = new Map()) {
  if (node.type === 'predicate') {
    const terms = node.terms.map((term) => variables.get(term) ?? model.constants[term]);
    return model.predicates[node.predicate].some((tuple) => tuple.every((value, index) => value === terms[index]));
  }
  if (node.type === 'not') return !evaluate(node.operand, model, variables);
  if (node.type === 'quantifier') {
    const values = model.domain.map((member) => {
      const nested = new Map(variables);
      nested.set(node.variable, member);
      return evaluate(node.body, model, nested);
    });
    return node.quantifier === 'forall' ? values.every(Boolean) : values.some(Boolean);
  }
  const left = evaluate(node.left, model, variables);
  if (node.operator === 'and') return left && evaluate(node.right, model, variables);
  if (node.operator === 'or') return left || evaluate(node.right, model, variables);
  if (node.operator === 'implies') return !left || evaluate(node.right, model, variables);
  if (node.operator === 'xor') return left !== evaluate(node.right, model, variables);
  return left === evaluate(node.right, model, variables);
}

function tuples(domain, arity, prefix = []) {
  if (prefix.length === arity) return [prefix];
  return domain.flatMap((member) => tuples(domain, arity, [...prefix, member]));
}

function decodeModel(domain, constants, signature, assignment) {
  const predicates = {};
  for (const [predicate, arity] of [...signature].sort(([left], [right]) => left.localeCompare(right))) {
    predicates[predicate] = tuples(domain, arity).filter((tuple) => assignment[atomId(predicate, tuple)] === true);
  }
  return Object.freeze({
    domain: Object.freeze([...domain]),
    constants: Object.freeze(Object.fromEntries(constants)),
    predicates: Object.freeze(Object.fromEntries(Object.entries(predicates)
      .map(([predicate, extension]) => [predicate, Object.freeze(extension.map((tuple) => Object.freeze(tuple)))]))),
  });
}

export function verifyFiniteFirstOrderCountermodel(argument, model) {
  try {
    const signature = new Map();
    const constants = new Set();
    argument.premises.forEach((formula) => visit(formula, new Set(), signature, constants));
    visit(argument.conclusion, new Set(), signature, constants);
    requireCondition(Array.isArray(model.domain) && model.domain.length > 0 && new Set(model.domain).size === model.domain.length,
      'model domain must contain unique members.');
    requireCondition([...constants].every((constant) => model.domain.includes(model.constants?.[constant])),
      'model must assign every constant to a domain member.');
    for (const [predicate, arity] of signature) {
      requireCondition(Array.isArray(model.predicates?.[predicate]), `model omits predicate ${predicate}.`);
      requireCondition(model.predicates[predicate].every((tuple) => Array.isArray(tuple) && tuple.length === arity
        && tuple.every((member) => model.domain.includes(member))), `predicate ${predicate} has an invalid extension.`);
    }
    return argument.premises.every((formula) => evaluate(formula, model)) && !evaluate(argument.conclusion, model);
  } catch {
    return false;
  }
}

export function constructFiniteFirstOrderCountermodel(argument, options = {}) {
  requireCondition(argument?.type === 'first-order-argument' && Array.isArray(argument.premises),
    'argument must contain typed premises and a conclusion.');
  const domainSize = options.domainSize ?? 3;
  const maximumConstantAssignments = options.maximumConstantAssignments ?? 2_187;
  requireCondition(Number.isInteger(domainSize) && domainSize >= 1 && domainSize <= 8,
    'domainSize must be an integer from 1 through 8.');
  const domain = Object.freeze(Array.from({ length: domainSize }, (_, index) => String(index)));
  const signature = new Map();
  const constants = new Set();
  argument.premises.forEach((formula) => visit(formula, new Set(), signature, constants));
  visit(argument.conclusion, new Set(), signature, constants);
  let sawResourceLimit = false;
  for (const constantAssignment of cartesianAssignments([...constants].sort(), domain, maximumConstantAssignments)) {
    const task = Object.freeze({
      premises: Object.freeze(argument.premises.map((formula) => ground(formula, domain, constantAssignment))),
      query: ground(argument.conclusion, domain, constantAssignment),
      budgets: options.booleanBudgets,
    });
    const result = decideBooleanEntailment(task);
    if (result.status === 'RESOURCE_LIMIT') {
      sawResourceLimit = true;
      continue;
    }
    requireCondition(verifyBooleanEntailmentResult(task, result), 'Boolean solver returned an invalid witness.');
    if (result.status !== 'SOLVED' || result.entailed) continue;
    const model = decodeModel(domain, constantAssignment, signature, result.witness.assignment);
    requireCondition(verifyFiniteFirstOrderCountermodel(argument, model), 'constructed model failed independent verification.');
    return Object.freeze({ status: 'SOLVED', model, witness: Object.freeze({
      kind: 'finite-first-order-countermodel', domainSize, constantAssignmentsTried: undefined,
    }) });
  }
  return Object.freeze({
    status: sawResourceLimit ? 'RESOURCE_LIMIT' : 'NO_COUNTERMODEL_IN_DECLARED_DOMAIN',
    model: undefined,
  });
}
