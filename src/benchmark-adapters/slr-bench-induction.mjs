function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function parsePromptFactLine(line, path) {
  const match = line.match(/^([a-z][A-Za-z0-9_]*)\(([^()]*)\)\.$/u);
  if (!match) return undefined;
  const argumentsList = match[2].split(',').map((value) => value.trim()).map((value, index) => {
    if (/^-?\d+$/u.test(value)) return Object.freeze({ kind: 'number', value });
    invariant(/^[a-z][A-Za-z0-9_]*$/u.test(value), `${path}.argument[${index}]`,
      'prompt examples permit only ground atoms and integers.');
    return Object.freeze({ kind: 'atom', value });
  });
  invariant(argumentsList.length > 0, path, 'a ground fact requires at least one argument.');
  return Object.freeze({ kind: 'compound', functor: match[1], arguments: Object.freeze(argumentsList) });
}

function promptGroundFacts(prompt) {
  invariant(typeof prompt === 'string' && prompt.length > 0, 'prompt', 'expected source prompt text.');
  const facts = [];
  let insideExamples = false;
  for (const [index, sourceLine] of prompt.split(/\r?\n/u).entries()) {
    const line = sourceLine.trim();
    if (!line) continue;
    if (line.startsWith('Your task is to formulate')) break;
    const fact = parsePromptFactLine(line, `prompt.line[${index + 1}]`);
    if (!fact) {
      if (insideExamples && /^[a-z][A-Za-z0-9_]*\s*\(/u.test(line)) {
        throw new Error(`prompt.line[${index + 1}]: malformed ground example fact.`);
      }
      continue;
    }
    insideExamples = true;
    facts.push(fact);
  }
  invariant(facts.length > 0, 'prompt', 'no ground example facts were found.');
  return Object.freeze(facts);
}

function atomicValue(term, path) {
  invariant(term?.kind === 'atom' || term?.kind === 'number', path,
    'the conjunctive fragment accepts only atomic and integer ground terms.');
  return term.kind === 'number' ? Number(term.value) : term.value;
}

function examplesFromGroundFacts(facts, {
  positivePredicate = 'eastbound', negativePredicate = 'westbound', examplePrefix = 'example',
} = {}) {
  const groups = [];
  let current;
  const finish = () => {
    if (!current) return;
    invariant(current.facts.length > 0, current.id, 'a labeled example has no background facts.');
    groups.push(current);
  };
  for (const [index, fact] of facts.entries()) {
    const isPositive = fact.functor === positivePredicate;
    const isNegative = fact.functor === negativePredicate;
    if (isPositive || isNegative) {
      finish();
      invariant(fact.arguments.length === 1 && fact.arguments[0].kind === 'atom',
        `groundFacts[${index}]`, 'classification labels require one atomic root.');
      current = { id: `${examplePrefix}:${groups.length}`,
        classification: isPositive ? 'positive' : 'negative', root: fact.arguments[0].value, facts: [] };
    } else {
      invariant(current, `groundFacts[${index}]`, 'background evidence appeared before a classification label.');
      current.facts.push(fact);
    }
  }
  finish();
  invariant(groups.some((item) => item.classification === 'positive')
    && groups.some((item) => item.classification === 'negative'), examplePrefix,
  'both positive and negative examples are required.');
  return Object.freeze(groups.map((group) => {
    const entityValues = new Set([group.root]);
    for (const fact of group.facts) {
      if (fact.arguments[0]?.kind === 'atom') entityValues.add(fact.arguments[0].value);
    }
    return Object.freeze({ id: group.id, classification: group.classification, root: group.root,
      facts: Object.freeze(group.facts.map((fact, factIndex) => Object.freeze({
        id: `fact:${groups.indexOf(group)}:${factIndex}`,
        predicate: fact.functor,
        arguments: Object.freeze(fact.arguments.map((term, termIndex) => {
          const value = atomicValue(term, `${group.id}.facts[${factIndex}].arguments[${termIndex}]`);
          return Object.freeze({ kind: typeof value === 'string' && entityValues.has(value) ? 'entity' : 'value', value });
        })),
      }))) });
  }));
}

export function buildSLRBenchInductionTask(prompt, { limits, ...policy } = {}) {
  return Object.freeze({
    schema: 'finite-conjunctive-rule-induction-task-v1',
    targetPredicate: policy.positivePredicate ?? 'eastbound',
    examples: examplesFromGroundFacts(promptGroundFacts(prompt), policy),
    limits: Object.freeze({ maxBodyLiterals: 8, maxVariables: 6,
      maxCandidates: 25_000, maxMatchSteps: 250_000, ...limits }),
  });
}

export function buildSLRBenchValidationExamples(parsedFacts, policy = {}) {
  invariant(Array.isArray(parsedFacts), 'validation facts', 'expected an inert ground-fact AST array.');
  return examplesFromGroundFacts(parsedFacts, { ...policy, examplePrefix: 'validation-example' });
}
