import { evaluateFormula } from './finite-entailment.mjs';

function collectFormulaAtoms(formula, target) {
  if (formula.operator === 'atom') {
    target.add(formula.id);
    return;
  }
  if (formula.operator === 'not') {
    collectFormulaAtoms(formula.operand, target);
    return;
  }
  collectFormulaAtoms(formula.left, target);
  collectFormulaAtoms(formula.right, target);
}

function comparePenalty(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function assignmentFor(atomIds, mask) {
  return new Map(atomIds.map((id, index) => [id, Boolean(mask & (1 << index))]));
}

function assignmentRecord(assignment) {
  return Object.fromEntries([...assignment.entries()]);
}

export function decidePreferredEntailment({ premises, defaults, query, maxAtoms = 16 }) {
  if (!Array.isArray(premises) || !Array.isArray(defaults)) {
    throw new Error('Preferred entailment expects premise and default arrays.');
  }
  const atoms = new Set();
  premises.forEach((formula) => collectFormulaAtoms(formula, atoms));
  collectFormulaAtoms(query, atoms);
  const priorities = [...new Set(defaults.map((item) => item.priority ?? 0))].sort((left, right) => right - left);
  for (const item of defaults) {
    if (!item || typeof item !== 'object') throw new Error('Each default must be an object.');
    collectFormulaAtoms(item.antecedent, atoms);
    collectFormulaAtoms(item.consequent, atoms);
  }
  const atomIds = [...atoms].sort();
  if (atomIds.length > maxAtoms) {
    return Object.freeze({
      status: 'RESOURCE_LIMIT', entailed: undefined, atomCount: atomIds.length,
      diagnostic: `The bounded preferred-model evaluator permits at most ${maxAtoms} atoms.`,
    });
  }
  let bestPenalty;
  let preferredCount = 0;
  let queryTrueCount = 0;
  let queryFalseWitness;
  let queryTrueWitness;
  const limit = 2 ** atomIds.length;
  for (let mask = 0; mask < limit; mask += 1) {
    const assignment = assignmentFor(atomIds, mask);
    if (!premises.every((premise) => evaluateFormula(premise, assignment))) continue;
    const penalty = priorities.map((priority) => defaults.filter((item) => (item.priority ?? 0) === priority
      && evaluateFormula(item.antecedent, assignment) && !evaluateFormula(item.consequent, assignment)).length);
    const comparison = bestPenalty === undefined ? -1 : comparePenalty(penalty, bestPenalty);
    if (comparison > 0) continue;
    if (comparison < 0) {
      bestPenalty = penalty;
      preferredCount = 0;
      queryTrueCount = 0;
      queryFalseWitness = undefined;
      queryTrueWitness = undefined;
    }
    preferredCount += 1;
    if (evaluateFormula(query, assignment)) {
      queryTrueCount += 1;
      queryTrueWitness ??= assignmentRecord(assignment);
    } else {
      queryFalseWitness ??= assignmentRecord(assignment);
    }
  }
  if (bestPenalty === undefined) {
    return Object.freeze({
      status: 'INCONSISTENT_CONTEXT', entailed: undefined, atomCount: atomIds.length,
      diagnostic: 'No finite assignment satisfies the strict premises.',
    });
  }
  const entailed = queryTrueCount === preferredCount ? true : queryTrueCount === 0 ? false : undefined;
  return Object.freeze({
    status: entailed === undefined ? 'UNDERDETERMINED' : 'SOLVED', entailed,
    atomCount: atomIds.length, inspectedAssignments: limit, preferredModelCount: preferredCount,
    penaltyPriorities: priorities, bestPenalty,
    witness: Object.freeze(entailed
      ? { kind: 'preferred-model-support', assignment: queryTrueWitness }
      : { kind: 'preferred-model-counterexample', assignment: queryFalseWitness }),
  });
}
