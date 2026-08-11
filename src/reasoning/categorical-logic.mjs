const FORMS = new Set(['A', 'E', 'I', 'O']);
const TRANSFORMATIONS = new Set(['conversion', 'obversion', 'contraposition']);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function validateTerm(term, path) {
  invariant(term && typeof term === 'object', `${path} must be an object.`);
  invariant(typeof term.canonical === 'string' && term.canonical.length > 0,
    `${path}.canonical must be a non-empty string.`);
  invariant(Number.isInteger(term.negationDepth) && term.negationDepth >= 0,
    `${path}.negationDepth must be a non-negative integer.`);
  const inferredTerm = Array.from({ length: term.negationDepth }).reduce(
    (value) => value.startsWith('non-') ? value.slice(4) : value,
    term.canonical,
  );
  const surfaceTerm = term.term ?? inferredTerm;
  invariant(typeof surfaceTerm === 'string' && surfaceTerm.length > 0,
    `${path}.term must be a non-empty string when it cannot be recovered from canonical.`);
  return Object.freeze({
    term: surfaceTerm,
    canonical: term.canonical,
    negationDepth: term.negationDepth,
  });
}

function validateProposition(proposition, path) {
  invariant(proposition && typeof proposition === 'object', `${path} must be an object.`);
  invariant(FORMS.has(proposition.form), `${path}.form must be A, E, I, or O.`);
  const value = {
    form: proposition.form,
    subject: validateTerm(proposition.subject, `${path}.subject`),
    predicate: validateTerm(proposition.predicate, `${path}.predicate`),
  };
  if (proposition.existentialTerm) value.existentialTerm = validateTerm(
    proposition.existentialTerm, `${path}.existentialTerm`,
  );
  return Object.freeze(value);
}

function complement(term) {
  return Object.freeze({ ...term, negationDepth: term.negationDepth + 1 });
}

function renderTerm(term) {
  return `${term.negationDepth % 2 === 0 ? '' : 'non-'}${term.term}`;
}

export function realizeCategoricalProposition(proposition) {
  const value = validateProposition(proposition, 'proposition');
  const subject = renderTerm(value.subject);
  const predicate = renderTerm(value.predicate);
  if (value.form === 'A') return `All ${subject} are ${predicate}.`;
  if (value.form === 'E') return `No ${subject} are ${predicate}.`;
  if (value.form === 'I') return `Some ${subject} are ${predicate}.`;
  return `Some ${subject} are not ${predicate}.`;
}

function normalizedPropositionSignature(proposition) {
  const value = validateProposition(proposition, 'proposition');
  return [value.form, termKey(value.subject), value.subject.negationDepth % 2,
    termKey(value.predicate), value.predicate.negationDepth % 2].join('\0');
}

function equivalentNeighbors(proposition) {
  const values = [Object.freeze({
    form: Object.freeze({ A: 'E', E: 'A', I: 'O', O: 'I' })[proposition.form],
    subject: proposition.subject,
    predicate: complement(proposition.predicate),
  })];
  if (proposition.form === 'E' || proposition.form === 'I') {
    values.push(Object.freeze({
      form: proposition.form, subject: proposition.predicate, predicate: proposition.subject,
    }));
  }
  if (proposition.form === 'A' || proposition.form === 'O') {
    values.push(Object.freeze({
      form: proposition.form,
      subject: complement(proposition.predicate),
      predicate: complement(proposition.subject),
    }));
  }
  return values;
}

export function equivalentCategoricalPropositions(left, right) {
  const target = normalizedPropositionSignature(right);
  const queue = [validateProposition(left, 'left')];
  const seen = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    const signature = normalizedPropositionSignature(current);
    if (signature === target) return true;
    if (seen.has(signature)) continue;
    seen.add(signature);
    for (const neighbor of equivalentNeighbors(current)) {
      const next = normalizedPropositionSignature(neighbor);
      if (!seen.has(next)) queue.push(neighbor);
    }
  }
  return false;
}

const OPPOSITION = Object.freeze({
  A: Object.freeze({ A: 'True', E: 'False', I: 'True', O: 'False' }),
  E: Object.freeze({ A: 'False', E: 'True', I: 'False', O: 'True' }),
  I: Object.freeze({ A: 'Undetermined', E: 'False', I: 'True', O: 'Undetermined' }),
  O: Object.freeze({ A: 'False', E: 'Undetermined', I: 'Undetermined', O: 'True' }),
});

function comparableTerm(left, right) {
  return left.canonical === right.canonical && left.negationDepth === right.negationDepth;
}

export function judgeCategoricalOpposition(task) {
  const premise = validateProposition(task?.premise, 'task.premise');
  const candidate = validateProposition(task?.candidate, 'task.candidate');
  if (!comparableTerm(premise.subject, candidate.subject)
    || !comparableTerm(premise.predicate, candidate.predicate)) {
    return Object.freeze({
      status: 'UNKNOWN', values: [],
      witness: Object.freeze({ kind: 'categorical-opposition-v1', reason: 'different-term-pair' }),
    });
  }
  const value = OPPOSITION[premise.form][candidate.form];
  return Object.freeze({
    status: 'ANSWERED', answer: value, values: Object.freeze([value]),
    witness: Object.freeze({
      kind: 'categorical-opposition-v1', premiseForm: premise.form, candidateForm: candidate.form,
      existentialImport: 'traditional-square', value,
    }),
  });
}

export function transformCategoricalProposition(task) {
  invariant(TRANSFORMATIONS.has(task?.transformation),
    'task.transformation must be conversion, obversion, or contraposition.');
  const premise = validateProposition(task.premise, 'task.premise');
  let proposition;
  if (task.transformation === 'conversion') {
    if (premise.form === 'O') return invalidTransformation('conversion', premise);
    proposition = Object.freeze({
      form: premise.form === 'A' ? 'I' : premise.form,
      subject: premise.predicate,
      predicate: premise.subject,
    });
  } else if (task.transformation === 'obversion') {
    const form = Object.freeze({ A: 'E', E: 'A', I: 'O', O: 'I' })[premise.form];
    proposition = Object.freeze({ form, subject: premise.subject, predicate: complement(premise.predicate) });
  } else {
    if (premise.form === 'E' || premise.form === 'I') return invalidTransformation('contraposition', premise);
    proposition = Object.freeze({
      form: premise.form,
      subject: complement(premise.predicate),
      predicate: complement(premise.subject),
    });
  }
  const answer = realizeCategoricalProposition(proposition);
  return Object.freeze({
    status: 'ANSWERED', answer, values: Object.freeze([answer]), proposition,
    witness: Object.freeze({
      kind: 'categorical-transformation-v1', operation: task.transformation,
      premise, conclusion: proposition,
    }),
  });
}

function invalidTransformation(operation, premise) {
  const answer = `No valid ${operation}.`;
  return Object.freeze({
    status: 'ANSWERED', answer, values: Object.freeze([answer]), invalid: true,
    witness: Object.freeze({ kind: 'categorical-transformation-v1', operation, premise, conclusion: null }),
  });
}

function termKey(term) {
  return term.term;
}

function literalValue(term, valuation, atomOrder) {
  const index = atomOrder.indexOf(termKey(term));
  invariant(index >= 0, `Unknown categorical term ${term.term}.`);
  const positive = Boolean(valuation & (1 << index));
  return term.negationDepth % 2 === 0 ? positive : !positive;
}

function propositionHolds(proposition, population, atomOrder) {
  const members = population.filter((valuation) => literalValue(proposition.subject, valuation, atomOrder));
  const existentialTerm = proposition.existentialTerm ?? proposition.subject;
  const existentialImport = population.some((valuation) => literalValue(existentialTerm, valuation, atomOrder));
  if (proposition.form === 'A') {
    return existentialImport && members.every((valuation) =>
      literalValue(proposition.predicate, valuation, atomOrder));
  }
  if (proposition.form === 'E') {
    return existentialImport && members.every((valuation) =>
      !literalValue(proposition.predicate, valuation, atomOrder));
  }
  if (proposition.form === 'I') {
    return members.some((valuation) => literalValue(proposition.predicate, valuation, atomOrder));
  }
  return members.some((valuation) => !literalValue(proposition.predicate, valuation, atomOrder));
}

function endpointTerms(premises) {
  const occurrences = new Map();
  for (const premise of premises) {
    for (const term of [premise.subject, premise.predicate]) {
      const values = occurrences.get(termKey(term)) ?? [];
      values.push(term);
      occurrences.set(termKey(term), values);
    }
  }
  const endpoints = [...occurrences.values()].filter((values) => values.length === 1).map(([term]) => term);
  invariant(endpoints.length === 2 && [...occurrences.values()].filter((values) => values.length === 2).length === 1,
    'Categorical syllogism requires exactly three terms and one shared middle term.');
  return endpoints;
}

function enumeratePopulations(atomOrder) {
  invariant(atomOrder.length <= 4, 'Categorical syllogism execution supports at most four atomic terms.');
  const valuations = Array.from({ length: 2 ** atomOrder.length }, (_, value) => value);
  const populations = [];
  for (let mask = 1; mask < 2 ** valuations.length; mask += 1) {
    const population = valuations.filter((_, index) => mask & (1 << index));
    populations.push(Object.freeze(population));
  }
  return populations;
}

export function deriveCategoricalSyllogism(task) {
  invariant(Array.isArray(task?.premises) && task.premises.length === 2,
    'task.premises must contain exactly two categorical propositions.');
  invariant(Number.isInteger(task.figure) && task.figure >= 1 && task.figure <= 4,
    'task.figure must be an integer from 1 through 4.');
  const premises = Object.freeze(task.premises.map((item, index) =>
    validateProposition(item, `task.premises[${index}]`)));
  const atomOrder = [...new Set(premises.flatMap((item) => [termKey(item.subject), termKey(item.predicate)]))]
    .toSorted();
  const models = enumeratePopulations(atomOrder).filter((population) =>
    premises.every((premise) => propositionHolds(premise, population, atomOrder)));
  if (models.length === 0) {
    return Object.freeze({
      status: 'INCONSISTENT_CONTEXT', values: [],
      witness: Object.freeze({ kind: 'categorical-model-entailment-v1', atomOrder, modelCount: 0 }),
    });
  }
  const endpoints = endpointTerms(premises);
  const literalVariants = endpoints.map((term) => [0, 1].map((negationDepth) => Object.freeze({
    ...term, canonical: `${negationDepth === 1 ? 'non-' : ''}${term.term}`, negationDepth,
  })));
  const orientations = literalVariants[0].flatMap((left) => literalVariants[1].flatMap((right) => [
    Object.freeze({ subject: left, predicate: right }),
    Object.freeze({ subject: right, predicate: left }),
  ])).toSorted((left, right) =>
    (left.subject.negationDepth + left.predicate.negationDepth)
      - (right.subject.negationDepth + right.predicate.negationDepth)
    || left.subject.term.localeCompare(right.subject.term)
    || left.predicate.term.localeCompare(right.predicate.term));
  const formRank = Object.freeze({ A: 0, E: 1, I: 2, O: 3 });
  const candidates = ['A', 'E', 'I', 'O'].flatMap((form) =>
    orientations.map((terms) => Object.freeze({ form, ...terms }))).toSorted((left, right) =>
    (left.subject.negationDepth + left.predicate.negationDepth)
      - (right.subject.negationDepth + right.predicate.negationDepth)
    || formRank[left.form] - formRank[right.form]
    || left.subject.term.localeCompare(right.subject.term)
    || left.predicate.term.localeCompare(right.predicate.term));
  const conclusion = candidates.find((candidate) =>
    models.every((population) => propositionHolds(candidate, population, atomOrder)));
  if (!conclusion) {
    return Object.freeze({
      status: 'UNDERDETERMINED', values: [],
      witness: Object.freeze({
        kind: 'categorical-model-entailment-v1', atomOrder, modelCount: models.length,
        testedConclusionForms: Object.freeze(candidates.map((item) => item.form)),
      }),
    });
  }
  const answer = realizeCategoricalProposition(conclusion);
  return Object.freeze({
    status: 'ANSWERED', answer, values: Object.freeze([answer]), proposition: conclusion,
    witness: Object.freeze({
      kind: 'categorical-model-entailment-v1', atomOrder, modelCount: models.length,
      conclusionForm: conclusion.form, existentialImport: 'traditional-categorical',
    }),
  });
}

export function executeCategoricalTask(task) {
  if (task?.operation === 'judge-categorical-opposition') return judgeCategoricalOpposition(task);
  if (task?.operation === 'transform-categorical-proposition') return transformCategoricalProposition(task);
  if (task?.operation === 'derive-categorical-syllogism') return deriveCategoricalSyllogism(task);
  throw new Error('Unsupported categorical operation.');
}
