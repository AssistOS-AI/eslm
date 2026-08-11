const MAX_EXAMPLES = 512;
const MAX_FACTS = 20_000;
const MAX_ARITY = 8;
const MAX_BODY_LITERALS = 10;
const MAX_VARIABLES = 7;
const MAX_CANDIDATES = 100_000;
const MAX_MATCH_STEPS = 2_000_000;

function emptyResult(status, diagnostic, reasoning = {}) {
  return Object.freeze({ status, rule: undefined, evidence: Object.freeze([]), diagnostic,
    reasoning: Object.freeze(reasoning) });
}

function validIdentifier(value) {
  return typeof value === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,127}$/u.test(value);
}

function boundedValue(value) {
  return (typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0'))
    || (typeof value === 'number' && Number.isSafeInteger(value));
}

function valueKey(value) {
  return `${typeof value}:${JSON.stringify(value)}`;
}

function termKey(term) {
  return term.kind === 'variable' ? `?${term.id}` : `=${valueKey(term.value)}`;
}

function literalKey(literal) {
  return `${literal.predicate}(${literal.arguments.map(termKey).join(',')})`;
}

function factKey(fact) {
  return `${fact.predicate}(${fact.arguments.map((term) => `${term.kind}:${valueKey(term.value)}`).join(',')})`;
}

function validateFact(fact, path) {
  if (!validIdentifier(fact?.id) || !validIdentifier(fact?.predicate)
    || !Array.isArray(fact?.arguments) || fact.arguments.length === 0 || fact.arguments.length > MAX_ARITY) {
    throw new Error(`${path} is not a bounded typed fact.`);
  }
  const argumentsList = fact.arguments.map((term, index) => {
    if (!['entity', 'value'].includes(term?.kind) || !boundedValue(term.value)) {
      throw new Error(`${path}.arguments[${index}] is not an entity or value term.`);
    }
    if (term.kind === 'entity' && typeof term.value !== 'string') {
      throw new Error(`${path}.arguments[${index}] entity identifiers must be strings.`);
    }
    return Object.freeze({ kind: term.kind, value: term.value });
  });
  return Object.freeze({ id: fact.id, predicate: fact.predicate, arguments: Object.freeze(argumentsList) });
}

function validateTask(task) {
  if (task?.schema !== 'finite-conjunctive-rule-induction-task-v1' || !validIdentifier(task.targetPredicate)) {
    throw new Error('A finite conjunctive rule-induction task and target predicate are required.');
  }
  if (!Array.isArray(task.examples) || task.examples.length < 2 || task.examples.length > MAX_EXAMPLES) {
    throw new RangeError(`Rule induction requires between 2 and ${MAX_EXAMPLES} examples.`);
  }
  let totalFacts = 0;
  const ids = new Set();
  const examples = task.examples.map((example, exampleIndex) => {
    if (!validIdentifier(example?.id) || ids.has(example.id)
      || !['positive', 'negative'].includes(example?.classification)
      || typeof example?.root !== 'string' || !boundedValue(example.root)
      || !Array.isArray(example?.facts) || example.facts.length === 0) {
      throw new Error(`examples[${exampleIndex}] is malformed or duplicate.`);
    }
    ids.add(example.id);
    const factIds = new Set();
    const facts = example.facts.map((fact, factIndex) => {
      const accepted = validateFact(fact, `examples[${exampleIndex}].facts[${factIndex}]`);
      if (factIds.has(accepted.id)) throw new Error(`Duplicate fact ${accepted.id} in example ${example.id}.`);
      factIds.add(accepted.id);
      return accepted;
    }).sort((left, right) => factKey(left).localeCompare(factKey(right)) || left.id.localeCompare(right.id));
    totalFacts += facts.length;
    if (!facts.some((fact) => fact.arguments.some((term) =>
      term.kind === 'entity' && term.value === example.root))) {
      throw new Error(`Example ${example.id} has no fact connected to its root.`);
    }
    return Object.freeze({ id: example.id, classification: example.classification,
      root: example.root, facts: Object.freeze(facts) });
  });
  if (totalFacts > MAX_FACTS) throw new RangeError(`Rule induction permits at most ${MAX_FACTS} facts.`);
  if (!examples.some((example) => example.classification === 'positive')
    || !examples.some((example) => example.classification === 'negative')) {
    throw new Error('Rule induction requires both positive and negative examples.');
  }
  const limits = task.limits ?? {};
  const bounded = (name, fallback, maximum) => {
    const value = limits[name] ?? fallback;
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      throw new RangeError(`${name} must be between 1 and ${maximum}.`);
    }
    return value;
  };
  return Object.freeze({ targetPredicate: task.targetPredicate, examples: Object.freeze(examples),
    limits: Object.freeze({
      maxBodyLiterals: bounded('maxBodyLiterals', 6, MAX_BODY_LITERALS),
      maxVariables: bounded('maxVariables', 5, MAX_VARIABLES),
      maxCandidates: bounded('maxCandidates', 25_000, MAX_CANDIDATES),
      maxMatchSteps: bounded('maxMatchSteps', 250_000, MAX_MATCH_STEPS),
    }) });
}

function permutations(values) {
  if (values.length < 2) return [values];
  const output = [];
  for (let index = 0; index < values.length; index += 1) {
    const head = values[index];
    const rest = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const tail of permutations(rest)) output.push([head, ...tail]);
  }
  return output;
}

function canonicalCandidate(seedFacts, selected, root, maxVariables) {
  const provisional = selected.map((index) => Object.freeze({
    predicate: seedFacts[index].predicate,
    arguments: Object.freeze(seedFacts[index].arguments.map((term) => term.kind === 'entity'
      ? Object.freeze({ kind: 'variable', id: term.value })
      : Object.freeze({ kind: 'value', value: term.value }))),
  }));
  const variables = [...new Set(provisional.flatMap((literal) => literal.arguments
    .filter((term) => term.kind === 'variable').map((term) => term.id)))];
  if (!variables.includes(root) || variables.length > maxVariables) return undefined;
  const others = variables.filter((value) => value !== root);
  let best;
  for (const order of permutations(others)) {
    const names = new Map([[root, 'v0'], ...order.map((value, index) => [value, `v${index + 1}`])]);
    const body = provisional.map((literal) => Object.freeze({
      predicate: literal.predicate,
      arguments: Object.freeze(literal.arguments.map((term) => term.kind === 'variable'
        ? Object.freeze({ kind: 'variable', id: names.get(term.id) }) : term)),
    })).sort((left, right) => literalKey(left).localeCompare(literalKey(right)));
    const key = body.map(literalKey).join('&');
    if (!best || key < best.key) best = Object.freeze({ key, body: Object.freeze(body) });
  }
  return best;
}

function unifyLiteral(literal, fact, binding) {
  if (literal.predicate !== fact.predicate || literal.arguments.length !== fact.arguments.length) return undefined;
  const next = new Map(binding);
  for (let index = 0; index < literal.arguments.length; index += 1) {
    const pattern = literal.arguments[index];
    const actual = fact.arguments[index];
    if (pattern.kind === 'value') {
      if (actual.kind !== 'value' || valueKey(actual.value) !== valueKey(pattern.value)) return undefined;
      continue;
    }
    if (actual.kind !== 'entity') return undefined;
    const bound = next.get(pattern.id);
    if (bound !== undefined && bound !== actual.value) return undefined;
    next.set(pattern.id, actual.value);
  }
  return next;
}

function findMatch(body, example, budget) {
  const byShape = new Map();
  for (const fact of example.facts) {
    const key = `${fact.predicate}/${fact.arguments.length}`;
    if (!byShape.has(key)) byShape.set(key, []);
    byShape.get(key).push(fact);
  }
  const indexed = body.map((literal, index) => ({ literal, index,
    candidates: byShape.get(`${literal.predicate}/${literal.arguments.length}`) ?? [] }));
  const support = Array(body.length);
  const search = (remaining, binding) => {
    if (remaining.length === 0) return Object.freeze({ binding, support: Object.freeze([...support]) });
    const ordered = [...remaining].sort((left, right) => {
      const leftBound = left.literal.arguments.filter((term) =>
        term.kind === 'variable' && binding.has(term.id)).length;
      const rightBound = right.literal.arguments.filter((term) =>
        term.kind === 'variable' && binding.has(term.id)).length;
      return rightBound - leftBound || left.candidates.length - right.candidates.length
        || literalKey(left.literal).localeCompare(literalKey(right.literal));
    });
    const current = ordered[0];
    const nextRemaining = remaining.filter((item) => item.index !== current.index);
    for (const fact of current.candidates) {
      budget.steps += 1;
      if (budget.steps > budget.maximum) return 'RESOURCE_LIMIT';
      const next = unifyLiteral(current.literal, fact, binding);
      if (!next) continue;
      support[current.index] = fact;
      const result = search(nextRemaining, next);
      if (result) return result;
    }
    return undefined;
  };
  return search(indexed, new Map([['v0', example.root]]));
}

function candidateEvaluation(body, examples, budget) {
  const coverage = [];
  const rejections = [];
  for (const example of examples) {
    const before = budget.steps;
    const match = findMatch(body, example, budget);
    if (match === 'RESOURCE_LIMIT') return Object.freeze({ resourceLimit: true });
    if (example.classification === 'positive') {
      if (!match) return Object.freeze({ coversAllPositive: false, resourceLimit: false });
      coverage.push(Object.freeze({ exampleId: example.id,
        bindings: Object.freeze([...match.binding.entries()].sort(([left], [right]) => left.localeCompare(right))
          .map(([variable, value]) => Object.freeze({ variable, value }))),
        factIds: Object.freeze(match.support.map((fact) => fact.id)) }));
    } else if (match) {
      return Object.freeze({ coversAllPositive: true, rejectsAllNegative: false, resourceLimit: false });
    } else {
      rejections.push(Object.freeze({ exampleId: example.id, exploredMatchSteps: budget.steps - before }));
    }
  }
  return Object.freeze({ coversAllPositive: true, rejectsAllNegative: true, resourceLimit: false,
    coverage: Object.freeze(coverage), rejections: Object.freeze(rejections) });
}

function connectedFact(seedFacts, selectedEntities, index) {
  return seedFacts[index].arguments.some((term) => term.kind === 'entity' && selectedEntities.has(term.value));
}

function selectedEntities(seedFacts, selected) {
  return new Set(selected.flatMap((index) => seedFacts[index].arguments
    .filter((term) => term.kind === 'entity').map((term) => term.value)));
}

function ruleFromCandidate(targetPredicate, candidate) {
  return Object.freeze({ schema: 'finite-conjunctive-rule-v1',
    head: Object.freeze({ predicate: targetPredicate,
      arguments: Object.freeze([Object.freeze({ kind: 'variable', id: 'v0' })]) }),
    body: candidate.body });
}

function validateRule(rule) {
  if (rule?.schema !== 'finite-conjunctive-rule-v1' || !validIdentifier(rule.head?.predicate)
    || !Array.isArray(rule.head?.arguments) || rule.head.arguments.length !== 1
    || rule.head.arguments[0]?.kind !== 'variable' || rule.head.arguments[0].id !== 'v0'
    || !Array.isArray(rule.body) || rule.body.length === 0 || rule.body.length > MAX_BODY_LITERALS) {
    throw new Error('A bounded unary-head finite conjunctive rule is required.');
  }
  const body = rule.body.map((literal, literalIndex) => {
    if (!validIdentifier(literal?.predicate) || !Array.isArray(literal?.arguments)
      || literal.arguments.length === 0 || literal.arguments.length > MAX_ARITY) {
      throw new Error(`Rule body literal ${literalIndex} is malformed.`);
    }
    const argumentsList = literal.arguments.map((term, termIndex) => {
      if (term?.kind === 'variable' && /^v\d{1,2}$/u.test(term.id)) {
        return Object.freeze({ kind: 'variable', id: term.id });
      }
      if (term?.kind === 'value' && boundedValue(term.value)) {
        return Object.freeze({ kind: 'value', value: term.value });
      }
      throw new Error(`Rule body literal ${literalIndex} term ${termIndex} is malformed.`);
    });
    if (!argumentsList.some((term) => term.kind === 'variable')) {
      throw new Error(`Rule body literal ${literalIndex} is not range-restricted.`);
    }
    return Object.freeze({ predicate: literal.predicate, arguments: Object.freeze(argumentsList) });
  });
  const connected = new Set(['v0']);
  let changed = true;
  while (changed) {
    changed = false;
    for (const literal of body) {
      const variables = literal.arguments.filter((term) => term.kind === 'variable').map((term) => term.id);
      if (!variables.some((variable) => connected.has(variable))) continue;
      for (const variable of variables) {
        if (!connected.has(variable)) { connected.add(variable); changed = true; }
      }
    }
  }
  const allVariables = new Set(body.flatMap((literal) => literal.arguments
    .filter((term) => term.kind === 'variable').map((term) => term.id)));
  if (![...allVariables].every((variable) => connected.has(variable))) {
    throw new Error('Every rule variable must connect to the head variable.');
  }
  return Object.freeze({ schema: rule.schema, head: Object.freeze({ predicate: rule.head.predicate,
    arguments: Object.freeze([Object.freeze({ kind: 'variable', id: 'v0' })]) }), body: Object.freeze(body) });
}

export function induceFiniteConjunctiveRule(task) {
  let accepted;
  try {
    accepted = validateTask(task);
  } catch (error) {
    return emptyResult(error instanceof RangeError ? 'RESOURCE_LIMIT' : 'UNPARSED', error.message);
  }
  const positives = accepted.examples.filter((example) => example.classification === 'positive');
  const seed = [...positives].sort((left, right) => left.facts.length - right.facts.length
    || left.id.localeCompare(right.id))[0];
  const budget = { steps: 0, maximum: accepted.limits.maxMatchSteps };
  let testedCandidates = 0;
  let frontier = seed.facts.map((fact, index) => ({ fact, index }))
    .filter(({ fact }) => fact.arguments.some((term) => term.kind === 'entity' && term.value === seed.root))
    .map(({ index }) => Object.freeze({ selected: Object.freeze([index]) }));
  const seen = new Set();
  for (let depth = 1; depth <= accepted.limits.maxBodyLiterals; depth += 1) {
    const next = new Map();
    const layer = new Map();
    for (const state of frontier) {
      const candidate = canonicalCandidate(seed.facts, state.selected, seed.root, accepted.limits.maxVariables);
      if (candidate && !seen.has(candidate.key)) layer.set(candidate.key, Object.freeze({ state, candidate }));
    }
    for (const key of [...layer.keys()].sort()) {
      const { state, candidate } = layer.get(key);
      seen.add(key);
      testedCandidates += 1;
      if (testedCandidates > accepted.limits.maxCandidates) {
        return emptyResult('RESOURCE_LIMIT', 'Conjunctive induction exceeded its candidate budget.',
          { testedCandidates, matchSteps: budget.steps });
      }
      const evaluation = candidateEvaluation(candidate.body, accepted.examples, budget);
      if (evaluation.resourceLimit) return emptyResult('RESOURCE_LIMIT',
        'Conjunctive induction exceeded its match-search budget.', { testedCandidates, matchSteps: budget.steps });
      if (!evaluation.coversAllPositive) continue;
      if (evaluation.rejectsAllNegative) {
        const rule = ruleFromCandidate(accepted.targetPredicate, candidate);
        return Object.freeze({ status: 'SOLVED', rule,
          evidence: Object.freeze({ coverage: evaluation.coverage, rejections: evaluation.rejections }),
          diagnostic: 'The shortest enumerated connected conjunction covers every positive and rejects every negative.',
          reasoning: Object.freeze({ method: 'finite-conjunctive-rule-induction', bodyLiterals: depth,
            variables: new Set(candidate.body.flatMap((literal) => literal.arguments
              .filter((term) => term.kind === 'variable').map((term) => term.id))).size,
            testedCandidates, matchSteps: budget.steps }) });
      }
      if (depth === accepted.limits.maxBodyLiterals) continue;
      const entities = selectedEntities(seed.facts, state.selected);
      const selectedSet = new Set(state.selected);
      for (let index = 0; index < seed.facts.length; index += 1) {
        if (selectedSet.has(index) || !connectedFact(seed.facts, entities, index)) continue;
        const selected = Object.freeze([...state.selected, index].sort((left, right) => left - right));
        const expanded = canonicalCandidate(seed.facts, selected, seed.root, accepted.limits.maxVariables);
        if (expanded && !seen.has(expanded.key) && !next.has(expanded.key)) {
          next.set(expanded.key, Object.freeze({ selected }));
        }
      }
    }
    frontier = [...next.values()];
    if (frontier.length === 0) break;
  }
  return emptyResult('UNKNOWN', 'No separating rule exists inside the declared finite conjunctive hypothesis space.',
    { testedCandidates, matchSteps: budget.steps });
}

export function evaluateFiniteConjunctiveRule(rule, examples, { maxMatchSteps = MAX_MATCH_STEPS } = {}) {
  let acceptedRule;
  try { acceptedRule = validateRule(rule); } catch (error) {
    return Object.freeze({ status: 'UNPARSED', diagnostic: error.message });
  }
  const task = { schema: 'finite-conjunctive-rule-induction-task-v1',
    targetPredicate: acceptedRule.head.predicate, examples, limits: { maxMatchSteps } };
  let accepted;
  try { accepted = validateTask(task); } catch (error) {
    return Object.freeze({ status: error instanceof RangeError ? 'RESOURCE_LIMIT' : 'UNPARSED',
      diagnostic: error.message });
  }
  const budget = { steps: 0, maximum: accepted.limits.maxMatchSteps };
  const evaluation = candidateEvaluation(acceptedRule.body, accepted.examples, budget);
  if (evaluation.resourceLimit) return Object.freeze({ status: 'RESOURCE_LIMIT', matchSteps: budget.steps });
  return Object.freeze({ status: 'SOLVED',
    coversAllPositive: evaluation.coversAllPositive,
    rejectsAllNegative: evaluation.rejectsAllNegative === true,
    exact: evaluation.coversAllPositive && evaluation.rejectsAllNegative === true,
    evidence: evaluation.rejectsAllNegative ? Object.freeze({ coverage: evaluation.coverage,
      rejections: evaluation.rejections }) : undefined,
    matchSteps: budget.steps });
}

export function verifyFiniteConjunctiveRuleResult(task, result) {
  if (!result || !['SOLVED', 'UNKNOWN', 'RESOURCE_LIMIT', 'UNPARSED'].includes(result.status)) return false;
  const replayed = induceFiniteConjunctiveRule(task);
  if (replayed.status !== result.status || replayed.diagnostic !== result.diagnostic) return false;
  if (result.status !== 'SOLVED') return true;
  return JSON.stringify(replayed.rule) === JSON.stringify(result.rule)
    && JSON.stringify(replayed.evidence) === JSON.stringify(result.evidence)
    && JSON.stringify(replayed.reasoning) === JSON.stringify(result.reasoning);
}

export const FINITE_CONJUNCTIVE_INDUCTION_LIMITS = Object.freeze({
  maxExamples: MAX_EXAMPLES, maxFacts: MAX_FACTS, maxArity: MAX_ARITY,
  maxBodyLiterals: MAX_BODY_LITERALS, maxVariables: MAX_VARIABLES,
  maxCandidates: MAX_CANDIDATES, maxMatchSteps: MAX_MATCH_STEPS,
});
