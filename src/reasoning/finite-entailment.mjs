const OPERATORS = new Set(['atom', 'not', 'and', 'or', 'implies']);

function assertFormula(formula, path = 'formula', depth = 0) {
  if (!formula || typeof formula !== 'object' || Array.isArray(formula)) {
    throw new Error(`${path}: expected a formula object.`);
  }
  if (depth > 64) throw new Error(`${path}: formula nesting exceeds 64 levels.`);
  if (!OPERATORS.has(formula.operator)) throw new Error(`${path}: unsupported operator ${formula.operator}.`);
  if (formula.operator === 'atom') {
    if (typeof formula.id !== 'string' || !/^[a-z][a-z0-9:_-]{0,127}$/u.test(formula.id)) {
      throw new Error(`${path}.id: expected a bounded semantic atom identifier.`);
    }
    return;
  }
  if (formula.operator === 'not') {
    assertFormula(formula.operand, `${path}.operand`, depth + 1);
    return;
  }
  assertFormula(formula.left, `${path}.left`, depth + 1);
  assertFormula(formula.right, `${path}.right`, depth + 1);
}

function collectAtoms(formula, target) {
  if (formula.operator === 'atom') {
    target.add(formula.id);
    return;
  }
  if (formula.operator === 'not') {
    collectAtoms(formula.operand, target);
    return;
  }
  collectAtoms(formula.left, target);
  collectAtoms(formula.right, target);
}

export function evaluateFormula(formula, assignment) {
  assertFormula(formula);
  if (!(assignment instanceof Map)) throw new Error('assignment: expected a Map of atom identifiers to booleans.');
  switch (formula.operator) {
    case 'atom':
      if (!assignment.has(formula.id)) throw new Error(`assignment: missing atom ${formula.id}.`);
      return assignment.get(formula.id);
    case 'not': return !evaluateFormula(formula.operand, assignment);
    case 'and': return evaluateFormula(formula.left, assignment) && evaluateFormula(formula.right, assignment);
    case 'or': return evaluateFormula(formula.left, assignment) || evaluateFormula(formula.right, assignment);
    case 'implies': return !evaluateFormula(formula.left, assignment) || evaluateFormula(formula.right, assignment);
    default: throw new Error(`Unreachable formula operator: ${formula.operator}`);
  }
}

function assignmentRecord(atomIds, mask) {
  return Object.fromEntries(atomIds.map((id, index) => [id, Boolean(mask & (1 << index))]));
}

export function decideFiniteEntailment({ premises, query, maxAtoms = 16 }) {
  if (!Array.isArray(premises)) throw new Error('premises: expected an array of formulas.');
  if (!Number.isInteger(maxAtoms) || maxAtoms < 1 || maxAtoms > 20) {
    throw new Error('maxAtoms: expected an integer from 1 through 20.');
  }
  premises.forEach((premise, index) => assertFormula(premise, `premises[${index}]`));
  assertFormula(query, 'query');
  const atoms = new Set();
  premises.forEach((premise) => collectAtoms(premise, atoms));
  collectAtoms(query, atoms);
  const atomIds = [...atoms].sort();
  if (atomIds.length > maxAtoms) {
    return Object.freeze({
      status: 'RESOURCE_LIMIT', entailed: undefined, atomCount: atomIds.length,
      inspectedAssignments: 0, diagnostic: `The bounded finite evaluator permits at most ${maxAtoms} atoms.`,
    });
  }
  let satisfyingPremiseAssignments = 0;
  const limit = 2 ** atomIds.length;
  for (let mask = 0; mask < limit; mask += 1) {
    const assignment = new Map(atomIds.map((id, index) => [id, Boolean(mask & (1 << index))]));
    if (!premises.every((premise) => evaluateFormula(premise, assignment))) continue;
    satisfyingPremiseAssignments += 1;
    if (!evaluateFormula(query, assignment)) {
      return Object.freeze({
        status: 'SOLVED', entailed: false, atomCount: atomIds.length,
        inspectedAssignments: mask + 1, satisfyingPremiseAssignments,
        witness: Object.freeze({ kind: 'finite-countermodel', assignment: assignmentRecord(atomIds, mask) }),
      });
    }
  }
  if (satisfyingPremiseAssignments === 0) {
    return Object.freeze({
      status: 'INCONSISTENT_CONTEXT', entailed: undefined, atomCount: atomIds.length,
      inspectedAssignments: limit, satisfyingPremiseAssignments,
      diagnostic: 'No finite truth assignment satisfies every premise; entailment by explosion is not reported as an answer.',
    });
  }
  return Object.freeze({
    status: 'SOLVED', entailed: true, atomCount: atomIds.length,
    inspectedAssignments: limit, satisfyingPremiseAssignments,
    witness: Object.freeze({
      kind: 'finite-exhaustive-entailment', checkedAssignments: limit,
      satisfyingPremiseAssignments,
    }),
  });
}

export function atom(id) {
  const formula = Object.freeze({ operator: 'atom', id });
  assertFormula(formula);
  return formula;
}

export function negate(operand) {
  assertFormula(operand, 'operand');
  return Object.freeze({ operator: 'not', operand });
}

export function binary(operator, left, right) {
  if (!['and', 'or', 'implies'].includes(operator)) throw new Error(`Unsupported binary operator: ${operator}`);
  assertFormula(left, 'left');
  assertFormula(right, 'right');
  return Object.freeze({ operator, left, right });
}
