import { createHash } from 'node:crypto';
import { evaluateFormula } from './finite-entailment.mjs';

const DEFAULT_BUDGETS = Object.freeze({
  maxSemanticAtoms: 4_096,
  maxVariables: 16_384,
  maxClauses: 65_536,
  maxSearchNodes: 1_000_000,
});

class ResourceLimit extends Error {}

const FORMULA_OPERATORS = new Set(['atom', 'not', 'and', 'or', 'implies']);

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Boolean entailment: ${message}`);
}

function validateFormula(formula, path = 'formula', depth = 0) {
  requireCondition(formula && typeof formula === 'object' && !Array.isArray(formula),
    `${path} must be a formula object.`);
  requireCondition(depth <= 64, `${path} exceeds 64 levels.`);
  requireCondition(FORMULA_OPERATORS.has(formula.operator), `${path} has an unsupported operator.`);
  if (formula.operator === 'atom') {
    requireCondition(typeof formula.id === 'string' && /^[a-z][a-z0-9:_-]{0,127}$/u.test(formula.id),
      `${path}.id must be a bounded semantic atom identifier.`);
    return;
  }
  if (formula.operator === 'not') {
    validateFormula(formula.operand, `${path}.operand`, depth + 1);
    return;
  }
  validateFormula(formula.left, `${path}.left`, depth + 1);
  validateFormula(formula.right, `${path}.right`, depth + 1);
}

function formulaAtomIds(formula) {
  const ids = new Set();
  const collect = (value) => {
    if (value.operator === 'atom') {
      ids.add(value.id);
      return;
    }
    if (value.operator === 'not') {
      collect(value.operand);
      return;
    }
    collect(value.left);
    collect(value.right);
  };
  collect(formula);
  return [...ids].sort();
}

function formulaKey(formula) {
  if (formula.operator === 'atom') return `a:${formula.id}`;
  if (formula.operator === 'not') return `n(${formulaKey(formula.operand)})`;
  const left = formulaKey(formula.left);
  const right = formulaKey(formula.right);
  if (formula.operator === 'and' || formula.operator === 'or') {
    return `${formula.operator}(${[left, right].sort().join(',')})`;
  }
  return `${formula.operator}(${left},${right})`;
}

function normalizedBudgets(input = {}) {
  const result = {};
  for (const [field, fallback] of Object.entries(DEFAULT_BUDGETS)) {
    const value = input[field] ?? fallback;
    requireCondition(Number.isInteger(value) && value >= 1, `${field} must be a positive integer.`);
    result[field] = value;
  }
  return Object.freeze(result);
}

function normalizedInput(input) {
  requireCondition(input && typeof input === 'object', 'input must be an object.');
  requireCondition(Array.isArray(input.premises), 'premises must be an array.');
  input.premises.forEach((formula, index) => validateFormula(formula, `premises[${index}]`));
  validateFormula(input.query, 'query');
  const premises = [...new Map(input.premises.map((formula) => [formulaKey(formula), formula])).entries()]
    .sort(([left], [right]) => left.localeCompare(right)).map(([, formula]) => formula);
  const inconsistencyPolicy = input.inconsistencyPolicy ?? 'report';
  requireCondition(['report', 'classical-explosion'].includes(inconsistencyPolicy),
    'inconsistencyPolicy must be report or classical-explosion.');
  return Object.freeze({
    premises: Object.freeze(premises),
    query: input.query,
    budgets: normalizedBudgets(input.budgets),
    inconsistencyPolicy,
  });
}

function allAtomIds(premises, query) {
  return [...new Set([...premises, query].flatMap((formula) => formulaAtomIds(formula)))].sort();
}

function normalizeClause(literals) {
  const unique = [...new Set(literals)].sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
  if (unique.some((literal) => unique.includes(-literal))) return undefined;
  return Object.freeze(unique);
}

function compileCnf(premises, query, budgets) {
  const semanticAtomIds = allAtomIds(premises, query);
  if (semanticAtomIds.length > budgets.maxSemanticAtoms) {
    throw new ResourceLimit(`semantic atom count ${semanticAtomIds.length} exceeds ${budgets.maxSemanticAtoms}`);
  }
  const variableByAtom = new Map(semanticAtomIds.map((id, index) => [id, index + 1]));
  const variableByFormula = new Map();
  const clauses = [];
  let nextVariable = semanticAtomIds.length + 1;
  const addClause = (...literals) => {
    const clause = normalizeClause(literals);
    if (clause) clauses.push(clause);
  };
  const encode = (formula) => {
    if (formula.operator === 'atom') return variableByAtom.get(formula.id);
    const key = formulaKey(formula);
    if (variableByFormula.has(key)) return variableByFormula.get(key);
    const variable = nextVariable;
    nextVariable += 1;
    variableByFormula.set(key, variable);
    if (formula.operator === 'not') {
      const operand = encode(formula.operand);
      addClause(-variable, -operand);
      addClause(variable, operand);
      return variable;
    }
    const left = encode(formula.left);
    const right = encode(formula.right);
    if (formula.operator === 'and') {
      addClause(-variable, left);
      addClause(-variable, right);
      addClause(variable, -left, -right);
    } else if (formula.operator === 'or') {
      addClause(variable, -left);
      addClause(variable, -right);
      addClause(-variable, left, right);
    } else {
      addClause(-variable, -left, right);
      addClause(variable, left);
      addClause(variable, -right);
    }
    return variable;
  };
  for (const premise of premises) addClause(encode(premise));
  const queryVariable = encode(query);
  const variableCount = nextVariable - 1;
  if (variableCount > budgets.maxVariables) {
    throw new ResourceLimit(`CNF variable count ${variableCount} exceeds ${budgets.maxVariables}`);
  }
  if (clauses.length > budgets.maxClauses) {
    throw new ResourceLimit(`CNF clause count ${clauses.length} exceeds ${budgets.maxClauses}`);
  }
  const digest = createHash('sha256').update(JSON.stringify({ variableCount, clauses })).digest('hex');
  return Object.freeze({
    clauses: Object.freeze(clauses),
    variableCount,
    semanticAtomIds: Object.freeze(semanticAtomIds),
    variableByAtom,
    queryVariable,
    sha256: digest,
  });
}

function literalState(literal, assignment) {
  const state = assignment[Math.abs(literal)];
  return state === 0 ? 0 : literal > 0 ? state : -state;
}

function propagate(clauses, assignment, metrics) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < clauses.length; index += 1) {
      const clause = clauses[index];
      metrics.clauseInspections += 1;
      let satisfied = false;
      let unassigned = 0;
      let unitLiteral = 0;
      for (const literal of clause) {
        const state = literalState(literal, assignment);
        if (state === 1) {
          satisfied = true;
          break;
        }
        if (state === 0) {
          unassigned += 1;
          unitLiteral = literal;
        }
      }
      if (satisfied) continue;
      if (unassigned === 0) {
        metrics.conflicts += 1;
        return index;
      }
      if (unassigned === 1) {
        const variable = Math.abs(unitLiteral);
        const value = unitLiteral > 0 ? 1 : -1;
        if (assignment[variable] !== 0 && assignment[variable] !== value) {
          metrics.conflicts += 1;
          return index;
        }
        if (assignment[variable] === 0) {
          assignment[variable] = value;
          metrics.propagations += 1;
          changed = true;
        }
      }
    }
  }
  return undefined;
}

function allClausesSatisfied(clauses, assignment) {
  return clauses.every((clause) => clause.some((literal) => literalState(literal, assignment) === 1));
}

function chooseVariable(clauses, assignment) {
  const counts = new Map();
  for (const clause of clauses) {
    if (clause.some((literal) => literalState(literal, assignment) === 1)) continue;
    for (const literal of clause) {
      const variable = Math.abs(literal);
      if (assignment[variable] === 0) counts.set(variable, (counts.get(variable) ?? 0) + 1);
    }
  }
  return [...counts].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
}

function completeAssignment(assignment) {
  const completed = Int8Array.from(assignment);
  for (let variable = 1; variable < completed.length; variable += 1) {
    if (completed[variable] === 0) completed[variable] = -1;
  }
  return completed;
}

function dpll(clauses, variableCount, budgets, metrics, needCertificate = false) {
  const search = (inputAssignment, depth) => {
    metrics.searchNodes += 1;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);
    if (metrics.searchNodes > budgets.maxSearchNodes) {
      throw new ResourceLimit(`search nodes exceed ${budgets.maxSearchNodes}`);
    }
    const assignment = Int8Array.from(inputAssignment);
    const conflictClause = propagate(clauses, assignment, metrics);
    if (conflictClause !== undefined) {
      return {
        status: 'unsat',
        certificate: needCertificate ? { kind: 'conflict', clause: conflictClause } : undefined,
      };
    }
    if (allClausesSatisfied(clauses, assignment)) {
      return { status: 'sat', assignment: completeAssignment(assignment) };
    }
    const variable = chooseVariable(clauses, assignment);
    requireCondition(variable !== undefined, 'solver reached an unresolved clause without a branch variable.');
    metrics.decisions += 1;
    const negative = Int8Array.from(assignment);
    negative[variable] = -1;
    const left = search(negative, depth + 1);
    if (left.status === 'sat') return left;
    const positive = Int8Array.from(assignment);
    positive[variable] = 1;
    const right = search(positive, depth + 1);
    if (right.status === 'sat') return right;
    return {
      status: 'unsat',
      certificate: needCertificate
        ? { kind: 'split', variable, negative: left.certificate, positive: right.certificate }
        : undefined,
    };
  };
  return search(new Int8Array(variableCount + 1), 0);
}

function newMetrics() {
  return {
    searchNodes: 0, clauseInspections: 0, propagations: 0,
    decisions: 0, conflicts: 0, maxDepth: 0,
  };
}

function semanticAssignment(cnf, assignment) {
  return Object.freeze(Object.fromEntries(cnf.semanticAtomIds.map((id) => [
    id,
    assignment[cnf.variableByAtom.get(id)] === 1,
  ])));
}

function assignmentMap(record) {
  return new Map(Object.entries(record));
}

function relevantPremises(premises, query) {
  const atomsByPremise = premises.map((formula) => new Set(formulaAtomIds(formula)));
  const relevantAtoms = new Set(formulaAtomIds(query));
  const included = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < premises.length; index += 1) {
      if (included.has(index) || ![...atomsByPremise[index]].some((id) => relevantAtoms.has(id))) continue;
      included.add(index);
      for (const id of atomsByPremise[index]) {
        if (!relevantAtoms.has(id)) {
          relevantAtoms.add(id);
          changed = true;
        }
      }
    }
  }
  return Object.freeze({
    premises: Object.freeze(premises.filter((_formula, index) => included.has(index))),
    included: Object.freeze([...included].sort((left, right) => left - right)),
    omitted: premises.length - included.size,
    atomIds: Object.freeze([...relevantAtoms].sort()),
  });
}

function combineCountermodel(base, relevant, relevantAtomIds) {
  const combined = { ...base };
  for (const id of relevantAtomIds) combined[id] = relevant[id];
  return Object.freeze(combined);
}

function resourceSnapshot(metrics, fullCnf, queryCnf, relevance) {
  return Object.freeze({
    ...metrics,
    fullVariables: fullCnf?.variableCount,
    fullClauses: fullCnf?.clauses.length,
    queryVariables: queryCnf?.variableCount,
    queryClauses: queryCnf?.clauses.length,
    totalPremises: relevance?.totalPremises,
    relevantPremises: relevance?.premises.length,
    omittedPremises: relevance?.omitted,
  });
}

export function decideBooleanEntailment(rawInput) {
  const input = normalizedInput(rawInput);
  const metrics = newMetrics();
  let fullCnf;
  let queryCnf;
  let relevance;
  try {
    fullCnf = compileCnf(input.premises, input.query, input.budgets);
    const context = dpll(fullCnf.clauses, fullCnf.variableCount, input.budgets, metrics, true);
    if (context.status === 'unsat') {
      if (input.inconsistencyPolicy === 'classical-explosion') {
        return Object.freeze({
          status: 'SOLVED', entailed: true,
          witness: Object.freeze({
            kind: 'classical-explosion-entailment', cnfSha256: fullCnf.sha256,
            certificate: context.certificate,
          }),
          resources: resourceSnapshot(metrics, fullCnf),
        });
      }
      return Object.freeze({
        status: 'INCONSISTENT_CONTEXT', entailed: undefined,
        witness: Object.freeze({
          kind: 'dpll-inconsistency-certificate', cnfSha256: fullCnf.sha256,
          certificate: context.certificate,
        }),
        resources: resourceSnapshot(metrics, fullCnf),
      });
    }
    const baseModel = semanticAssignment(fullCnf, context.assignment);
    relevance = { ...relevantPremises(input.premises, input.query), totalPremises: input.premises.length };
    queryCnf = compileCnf(relevance.premises, input.query, input.budgets);
    const negatedQueryClauses = Object.freeze([...queryCnf.clauses, Object.freeze([-queryCnf.queryVariable])]);
    const counterexample = dpll(
      negatedQueryClauses,
      queryCnf.variableCount,
      input.budgets,
      metrics,
      true,
    );
    if (counterexample.status === 'sat') {
      const relevantModel = semanticAssignment(queryCnf, counterexample.assignment);
      const countermodel = combineCountermodel(baseModel, relevantModel, relevance.atomIds);
      requireCondition(input.premises.every((formula) => evaluateFormula(formula, assignmentMap(countermodel))),
        'internal countermodel does not satisfy all premises.');
      requireCondition(!evaluateFormula(input.query, assignmentMap(countermodel)),
        'internal countermodel does not falsify the query.');
      return Object.freeze({
        status: 'SOLVED', entailed: false,
        witness: Object.freeze({ kind: 'finite-countermodel', assignment: countermodel }),
        relevance: Object.freeze({
          totalPremises: relevance.totalPremises,
          relevantPremises: relevance.premises.length,
          omittedPremises: relevance.omitted,
          relevantAtomCount: relevance.atomIds.length,
        }),
        resources: resourceSnapshot(metrics, fullCnf, queryCnf, relevance),
      });
    }
    return Object.freeze({
      status: 'SOLVED', entailed: true,
      witness: Object.freeze({
        kind: 'query-directed-dpll-entailment',
        contextModel: baseModel,
        negatedQueryCnfSha256: createHash('sha256').update(JSON.stringify({
          variableCount: queryCnf.variableCount, clauses: negatedQueryClauses,
        })).digest('hex'),
        certificate: counterexample.certificate,
      }),
      relevance: Object.freeze({
        totalPremises: relevance.totalPremises,
        relevantPremises: relevance.premises.length,
        omittedPremises: relevance.omitted,
        relevantAtomCount: relevance.atomIds.length,
      }),
      resources: resourceSnapshot(metrics, fullCnf, queryCnf, relevance),
    });
  } catch (error) {
    if (!(error instanceof ResourceLimit)) throw error;
    return Object.freeze({
      status: 'RESOURCE_LIMIT', entailed: undefined,
      diagnostic: error.message,
      resources: resourceSnapshot(metrics, fullCnf, queryCnf, relevance),
    });
  }
}

function verifyCertificate(clauses, variableCount, certificate, assignment = new Int8Array(variableCount + 1)) {
  const local = Int8Array.from(assignment);
  const metrics = newMetrics();
  const conflict = propagate(clauses, local, metrics);
  if (certificate?.kind === 'conflict') return conflict === certificate.clause;
  if (conflict !== undefined || certificate?.kind !== 'split') return false;
  const variable = certificate.variable;
  if (!Number.isInteger(variable) || variable < 1 || variable > variableCount || local[variable] !== 0) return false;
  const negative = Int8Array.from(local);
  negative[variable] = -1;
  const positive = Int8Array.from(local);
  positive[variable] = 1;
  return verifyCertificate(clauses, variableCount, certificate.negative, negative)
    && verifyCertificate(clauses, variableCount, certificate.positive, positive);
}

export function verifyBooleanEntailmentResult(rawInput, result) {
  const input = normalizedInput(rawInput);
  requireCondition(result && typeof result === 'object', 'result must be an object.');
  if (result.status === 'RESOURCE_LIMIT') {
    return result.entailed === undefined
      && typeof result.diagnostic === 'string'
      && result.diagnostic.length > 0
      && result.resources !== null
      && typeof result.resources === 'object';
  }
  const fullCnf = compileCnf(input.premises, input.query, input.budgets);
  if (result.status === 'INCONSISTENT_CONTEXT') {
    return result.entailed === undefined
      && result.witness?.kind === 'dpll-inconsistency-certificate'
      && result.witness.cnfSha256 === fullCnf.sha256
      && verifyCertificate(fullCnf.clauses, fullCnf.variableCount, result.witness.certificate);
  }
  requireCondition(result.status === 'SOLVED' && typeof result.entailed === 'boolean',
    'result must be solved, inconsistent, or resource-limited.');
  if (result.witness?.kind === 'classical-explosion-entailment') {
    return input.inconsistencyPolicy === 'classical-explosion'
      && result.entailed === true
      && result.witness.cnfSha256 === fullCnf.sha256
      && verifyCertificate(fullCnf.clauses, fullCnf.variableCount, result.witness.certificate);
  }
  if (!result.entailed) {
    if (result.witness?.kind !== 'finite-countermodel') return false;
    const assignment = assignmentMap(result.witness?.assignment ?? {});
    return input.premises.every((formula) => evaluateFormula(formula, assignment))
      && !evaluateFormula(input.query, assignment);
  }
  const contextAssignment = assignmentMap(result.witness?.contextModel ?? {});
  if (result.witness?.kind !== 'query-directed-dpll-entailment') return false;
  if (!input.premises.every((formula) => evaluateFormula(formula, contextAssignment))) return false;
  const relevance = relevantPremises(input.premises, input.query);
  const queryCnf = compileCnf(relevance.premises, input.query, input.budgets);
  const clauses = Object.freeze([...queryCnf.clauses, Object.freeze([-queryCnf.queryVariable])]);
  const digest = createHash('sha256').update(JSON.stringify({
    variableCount: queryCnf.variableCount, clauses,
  })).digest('hex');
  return result.witness?.negatedQueryCnfSha256 === digest
    && verifyCertificate(clauses, queryCnf.variableCount, result.witness.certificate);
}
