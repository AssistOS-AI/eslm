const OPERATIONS = new Set(['select-entailed-candidate', 'select-sufficient-premise']);
const QUANTIFIERS = new Set(['all', 'none', 'some', 'some-not']);

function boundedInteger(value, fallback, minimum, maximum) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) return undefined;
  return value;
}

function termId(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256 || /[\0\r\n]/u.test(value)) {
    throw new Error(`${path} must be a bounded non-empty semantic identifier.`);
  }
  return value;
}

function proposition(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  if (!QUANTIFIERS.has(value.quantifier)) throw new Error(`${path}.quantifier is unsupported.`);
  return Object.freeze({
    quantifier: value.quantifier,
    subject: termId(value.subject, `${path}.subject`),
    predicate: termId(value.predicate, `${path}.predicate`),
  });
}

function propositionSignature(value) {
  return `${value.quantifier}\0${value.subject}\0${value.predicate}`;
}

function negateProposition(value) {
  return Object.freeze({
    quantifier: Object.freeze({ all: 'some-not', none: 'some', some: 'none', 'some-not': 'all' })[
      value.quantifier
    ],
    subject: value.subject,
    predicate: value.predicate,
  });
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('task must be an object.');
  if (task.schema !== 'categorical-argument-selection-v1') throw new Error('task.schema is unsupported.');
  if (!OPERATIONS.has(task.operation)) throw new Error('task.operation is unsupported.');
  if (!Array.isArray(task.premises)) throw new Error('task.premises must be an array.');
  if (!Array.isArray(task.candidates) || task.candidates.length < 2) {
    throw new Error('task.candidates must contain at least two candidates.');
  }
  const limits = Object.freeze({
    maximumTerms: boundedInteger(task.limits?.maximumTerms, 32, 2, 128),
    maximumPropositions: boundedInteger(task.limits?.maximumPropositions, 128, 1, 512),
    maximumCandidates: boundedInteger(task.limits?.maximumCandidates, 16, 2, 128),
    maximumClosureSteps: boundedInteger(task.limits?.maximumClosureSteps, 16_384, 1, 1_000_000),
  });
  if (Object.values(limits).some((value) => value === undefined)) throw new Error('task.limits is invalid.');
  const premises = task.premises.map((value, index) => proposition(value, `task.premises[${index}]`))
    .toSorted((left, right) => propositionSignature(left).localeCompare(propositionSignature(right)));
  const candidates = task.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(`task.candidates[${index}] must be an object.`);
    }
    return Object.freeze({
      candidateId: termId(candidate.candidateId, `task.candidates[${index}].candidateId`),
      proposition: proposition(candidate.proposition, `task.candidates[${index}].proposition`),
    });
  }).toSorted((left, right) => left.candidateId.localeCompare(right.candidateId));
  if (new Set(candidates.map((candidate) => candidate.candidateId)).size !== candidates.length) {
    throw new Error('task.candidates contains duplicate candidate identifiers.');
  }
  const conclusion = task.operation === 'select-sufficient-premise'
    ? proposition(task.conclusion, 'task.conclusion') : undefined;
  return Object.freeze({ operation: task.operation, premises: Object.freeze(premises),
    candidates: Object.freeze(candidates), conclusion, limits });
}

function addToMap(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function constraintSystem(propositions, limits) {
  const implications = new Map();
  const reverseImplications = new Map();
  const exclusions = new Map();
  const existentialRequirements = [];
  const terms = new Set();
  for (const value of propositions) {
    terms.add(value.subject);
    terms.add(value.predicate);
    if (value.quantifier === 'all') {
      addToMap(implications, value.subject, value.predicate);
      addToMap(reverseImplications, value.predicate, value.subject);
    } else if (value.quantifier === 'none') {
      addToMap(exclusions, value.subject, value.predicate);
      addToMap(exclusions, value.predicate, value.subject);
    } else if (value.quantifier === 'some') {
      existentialRequirements.push(Object.freeze({ positive: [value.subject, value.predicate], negative: [],
        source: propositionSignature(value) }));
    } else {
      existentialRequirements.push(Object.freeze({ positive: [value.subject], negative: [value.predicate],
        source: propositionSignature(value) }));
    }
  }
  if (terms.size > limits.maximumTerms || propositions.length > limits.maximumPropositions) {
    return Object.freeze({ status: 'RESOURCE_LIMIT', termCount: terms.size,
      propositionCount: propositions.length });
  }
  return Object.freeze({ status: 'READY', implications, reverseImplications, exclusions,
    existentialRequirements, terms: Object.freeze([...terms].toSorted()) });
}

function closeRequirement(requirement, system, limit) {
  const positive = new Set(requirement.positive);
  const negative = new Set(requirement.negative);
  const queue = [
    ...requirement.positive.map((term) => Object.freeze({ polarity: 'positive', term })),
    ...requirement.negative.map((term) => Object.freeze({ polarity: 'negative', term })),
  ];
  const derivations = [];
  let steps = 0;
  while (queue.length > 0) {
    if (steps >= limit) return Object.freeze({ status: 'RESOURCE_LIMIT', steps });
    steps += 1;
    const current = queue.shift();
    const edges = current.polarity === 'positive'
      ? [
        ...[...(system.implications.get(current.term) ?? [])]
          .map((target) => Object.freeze({ target, polarity: 'positive' })),
        ...[...(system.exclusions.get(current.term) ?? [])]
          .map((target) => Object.freeze({ target, polarity: 'negative' })),
      ]
      : [...(system.reverseImplications.get(current.term) ?? [])]
        .map((target) => Object.freeze({ target, polarity: 'negative' }));
    edges.sort((left, right) => left.target.localeCompare(right.target)
      || left.polarity.localeCompare(right.polarity));
    for (const { target, polarity } of edges) {
      const collection = polarity === 'positive' ? positive : negative;
      if (collection.has(target)) continue;
      collection.add(target);
      queue.push(Object.freeze({ polarity, term: target }));
      derivations.push(Object.freeze({ from: current.term, fromPolarity: current.polarity,
        to: target, toPolarity: polarity }));
    }
  }
  const contradiction = [...positive].toSorted().find((term) => negative.has(term));
  return Object.freeze({
    status: contradiction ? 'CONTRADICTION' : 'SATISFIABLE',
    source: requirement.source,
    positive: Object.freeze([...positive].toSorted()),
    negative: Object.freeze([...negative].toSorted()),
    derivations: Object.freeze(derivations),
    contradiction: contradiction ?? null,
    steps,
  });
}

function satisfiability(propositions, limits) {
  const system = constraintSystem(propositions, limits);
  if (system.status === 'RESOURCE_LIMIT') return system;
  const witnesses = [];
  for (const requirement of system.existentialRequirements) {
    const witness = closeRequirement(requirement, system, limits.maximumClosureSteps);
    witnesses.push(witness);
    if (witness.status === 'RESOURCE_LIMIT') return Object.freeze({ status: 'RESOURCE_LIMIT', witnesses });
    if (witness.status === 'CONTRADICTION') {
      return Object.freeze({ status: 'UNSATISFIABLE', terms: system.terms,
        conflict: witness, witnesses: Object.freeze(witnesses) });
    }
  }
  return Object.freeze({ status: 'SATISFIABLE', terms: system.terms,
    witnesses: Object.freeze(witnesses) });
}

function decideEntailment(premises, query, limits) {
  const context = satisfiability(premises, limits);
  if (context.status === 'RESOURCE_LIMIT') return context;
  if (context.status === 'UNSATISFIABLE') {
    return Object.freeze({ status: 'INCONSISTENT_CONTEXT', entailed: null, context });
  }
  const counterexampleSearch = satisfiability([...premises, negateProposition(query)], limits);
  if (counterexampleSearch.status === 'RESOURCE_LIMIT') return counterexampleSearch;
  return Object.freeze({
    status: 'SOLVED',
    entailed: counterexampleSearch.status === 'UNSATISFIABLE',
    query,
    witness: counterexampleSearch.status === 'UNSATISFIABLE'
      ? Object.freeze({ kind: 'categorical-entailment-proof-v1', conflict: counterexampleSearch.conflict })
      : Object.freeze({ kind: 'categorical-countermodel-v1', objects: counterexampleSearch.witnesses }),
  });
}

export function selectCategoricalArgumentCandidate(task) {
  let normalized;
  try {
    normalized = normalizeTask(task);
  } catch (error) {
    return Object.freeze({ status: 'UNPARSED', values: [], diagnostic: error.message });
  }
  if (normalized.candidates.length > normalized.limits.maximumCandidates) {
    return Object.freeze({ status: 'RESOURCE_LIMIT', values: [],
      diagnostic: 'Candidate count exceeds the declared bound.' });
  }
  const baseContext = satisfiability(normalized.premises, normalized.limits);
  if (baseContext.status === 'RESOURCE_LIMIT') {
    return Object.freeze({ status: 'RESOURCE_LIMIT', values: [],
      witness: Object.freeze({ kind: 'categorical-argument-selection-v1', baseContext }) });
  }
  if (baseContext.status === 'UNSATISFIABLE') {
    return Object.freeze({ status: 'INCONSISTENT_CONTEXT', values: [],
      witness: Object.freeze({ kind: 'categorical-argument-selection-v1', baseContext }) });
  }
  const decisions = [];
  for (const candidate of normalized.candidates) {
    const premises = normalized.operation === 'select-sufficient-premise'
      ? [...normalized.premises, candidate.proposition] : normalized.premises;
    const query = normalized.operation === 'select-sufficient-premise'
      ? normalized.conclusion : candidate.proposition;
    const decision = decideEntailment(premises, query, normalized.limits);
    if (decision.status === 'RESOURCE_LIMIT') {
      return Object.freeze({ status: 'RESOURCE_LIMIT', values: [],
        witness: Object.freeze({ kind: 'categorical-argument-selection-v1', decisions }) });
    }
    decisions.push(Object.freeze({ candidateId: candidate.candidateId,
      qualifies: decision.status === 'SOLVED' && decision.entailed === true, decision }));
  }
  const selected = decisions.filter((decision) => decision.qualifies);
  const witness = Object.freeze({ kind: 'categorical-argument-selection-v1',
    operation: normalized.operation, decisions: Object.freeze(decisions) });
  if (selected.length !== 1) {
    return Object.freeze({ status: 'UNDERDETERMINED', values: [], witness,
      diagnostic: selected.length === 0 ? 'No candidate is entailed.' : 'Several candidates are entailed.' });
  }
  return Object.freeze({ status: 'SOLVED', values: Object.freeze([selected[0].candidateId]), witness });
}

function propositionHoldsInModel(value, objects) {
  const includes = (object, term) => object.positive.includes(term);
  if (value.quantifier === 'all') {
    return objects.every((object) => !includes(object, value.subject) || includes(object, value.predicate));
  }
  if (value.quantifier === 'none') {
    return objects.every((object) => !includes(object, value.subject) || !includes(object, value.predicate));
  }
  if (value.quantifier === 'some') {
    return objects.some((object) => includes(object, value.subject) && includes(object, value.predicate));
  }
  return objects.some((object) => includes(object, value.subject) && !includes(object, value.predicate));
}

function verifyCountermodel(premises, query, witness) {
  if (witness?.kind !== 'categorical-countermodel-v1' || !Array.isArray(witness.objects)) return false;
  const objects = witness.objects;
  for (const object of objects) {
    if (!Array.isArray(object.positive) || !Array.isArray(object.negative)) return false;
    if (object.positive.some((term) => object.negative.includes(term))) return false;
  }
  return premises.every((value) => propositionHoldsInModel(value, objects))
    && !propositionHoldsInModel(query, objects);
}

function sourceRequirement(value) {
  if (!value) return undefined;
  if (value.quantifier === 'some') return Object.freeze({ positive: [value.subject, value.predicate], negative: [] });
  if (value.quantifier === 'some-not') return Object.freeze({ positive: [value.subject], negative: [value.predicate] });
  return undefined;
}

function verifyConflict(propositions, conflict) {
  if (!conflict || !Array.isArray(conflict.positive) || !Array.isArray(conflict.negative)
    || !Array.isArray(conflict.derivations) || typeof conflict.source !== 'string') return false;
  const source = propositions.find((value) => propositionSignature(value) === conflict.source);
  const requirement = sourceRequirement(source);
  if (!requirement) return false;
  const positive = new Set(requirement.positive);
  const negative = new Set(requirement.negative);
  for (const edge of conflict.derivations) {
    const fromSet = edge.fromPolarity === 'positive' ? positive : negative;
    const toSet = edge.toPolarity === 'positive' ? positive : negative;
    if (!fromSet.has(edge.from) || toSet.has(edge.to)) return false;
    const licensed = edge.fromPolarity === 'positive' && edge.toPolarity === 'positive'
      ? propositions.some((value) => value.quantifier === 'all'
        && value.subject === edge.from && value.predicate === edge.to)
      : edge.fromPolarity === 'positive' && edge.toPolarity === 'negative'
        ? propositions.some((value) => value.quantifier === 'none'
          && ((value.subject === edge.from && value.predicate === edge.to)
            || (value.subject === edge.to && value.predicate === edge.from)))
        : edge.fromPolarity === 'negative' && edge.toPolarity === 'negative'
          && propositions.some((value) => value.quantifier === 'all'
            && value.subject === edge.to && value.predicate === edge.from);
    if (!licensed) return false;
    toSet.add(edge.to);
  }
  if (conflict.contradiction === null || !positive.has(conflict.contradiction)
    || !negative.has(conflict.contradiction)) return false;
  return JSON.stringify([...positive].toSorted()) === JSON.stringify(conflict.positive)
    && JSON.stringify([...negative].toSorted()) === JSON.stringify(conflict.negative);
}

function verifyEntailmentDecision(decision, premises, query) {
  if (decision.status === 'SOLVED' && decision.entailed === true) {
    return decision.witness?.kind === 'categorical-entailment-proof-v1'
      && verifyConflict([...premises, negateProposition(query)], decision.witness.conflict);
  }
  if (decision.status === 'SOLVED' && decision.entailed === false) {
    return verifyCountermodel(premises, query, decision.witness);
  }
  if (decision.status === 'INCONSISTENT_CONTEXT') {
    return verifyConflict(premises, decision.context?.conflict);
  }
  return false;
}

export function verifyCategoricalArgumentSelection(task, result) {
  let normalized;
  try {
    normalized = normalizeTask(task);
  } catch {
    return result?.status === 'UNPARSED' && Array.isArray(result.values) && result.values.length === 0;
  }
  if (result?.status === 'INCONSISTENT_CONTEXT') {
    return Array.isArray(result.values) && result.values.length === 0
      && verifyConflict(normalized.premises, result.witness?.baseContext?.conflict);
  }
  if (!['SOLVED', 'UNDERDETERMINED'].includes(result?.status)
    || !Array.isArray(result.values) || result.witness?.kind !== 'categorical-argument-selection-v1'
    || result.witness.operation !== normalized.operation || !Array.isArray(result.witness.decisions)) return false;
  const candidates = new Map(normalized.candidates.map((candidate) => [candidate.candidateId, candidate]));
  if (result.witness.decisions.length !== candidates.size) return false;
  const qualifying = [];
  for (const item of result.witness.decisions) {
    const candidate = candidates.get(item.candidateId);
    if (!candidate) return false;
    const premises = normalized.operation === 'select-sufficient-premise'
      ? [...normalized.premises, candidate.proposition] : normalized.premises;
    const query = normalized.operation === 'select-sufficient-premise'
      ? normalized.conclusion : candidate.proposition;
    if (!verifyEntailmentDecision(item.decision, premises, query)) return false;
    const qualifies = item.decision.status === 'SOLVED' && item.decision.entailed === true;
    if (item.qualifies !== qualifies) return false;
    if (qualifies) qualifying.push(item.candidateId);
    candidates.delete(item.candidateId);
  }
  if (result.status === 'SOLVED') {
    return qualifying.length === 1 && result.values.length === 1 && result.values[0] === qualifying[0];
  }
  return qualifying.length !== 1 && result.values.length === 0;
}
