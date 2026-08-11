const MAX_FACTS = 10_000;
const MAX_ENTITIES = 10_000;
const MAX_RELATIONS = 256;
const MAX_RULES = 4_096;
const MAX_DERIVATIONS = 100_000;
const MAX_PROOF_DEPTH = 128;

function emptyResult(status, diagnostic, extra = {}) {
  return Object.freeze({ status, values: Object.freeze([]), evidence: Object.freeze([]), diagnostic, ...extra });
}

function validIdentifier(value) {
  return typeof value === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,127}$/u.test(value);
}

function requireIdentifier(value, label) {
  if (!validIdentifier(value)) throw new Error(`${label} must be a bounded identifier.`);
  return value;
}

function pairKey(subject, object) {
  return `${subject}\u0000${object}`;
}

function compileSystem(system) {
  if (system?.schema !== 'declarative-qualitative-relation-system-v1') {
    throw new Error('A declarative qualitative relation system is required.');
  }
  requireIdentifier(system.systemId, 'systemId');
  if (!Array.isArray(system.relations) || system.relations.length === 0
    || system.relations.length > MAX_RELATIONS) {
    throw new RangeError(`Qualitative systems require between 1 and ${MAX_RELATIONS} relations.`);
  }
  const relations = new Map();
  for (const [index, relation] of system.relations.entries()) {
    const id = requireIdentifier(relation?.id, `relation ${index} id`);
    const inverse = requireIdentifier(relation?.inverse, `relation ${id} inverse`);
    if (relations.has(id)) throw new Error(`Duplicate qualitative relation ${id}.`);
    relations.set(id, Object.freeze({ id, inverse, output: relation.output !== false }));
  }
  for (const relation of relations.values()) {
    const inverse = relations.get(relation.inverse);
    if (!inverse || inverse.inverse !== relation.id) {
      throw new Error(`Relation ${relation.id} does not have a reciprocal declared inverse.`);
    }
  }
  if (!Array.isArray(system.compositionRules) || system.compositionRules.length > MAX_RULES) {
    throw new RangeError(`Qualitative systems permit at most ${MAX_RULES} composition rules.`);
  }
  const rules = new Map();
  const rulesByPair = new Map();
  for (const [index, rule] of system.compositionRules.entries()) {
    const id = requireIdentifier(rule?.id, `composition rule ${index} id`);
    const left = requireIdentifier(rule?.left, `composition rule ${id} left`);
    const right = requireIdentifier(rule?.right, `composition rule ${id} right`);
    if (rules.has(id) || !relations.has(left) || !relations.has(right)) {
      throw new Error(`Composition rule ${id} is duplicate or references an undeclared input.`);
    }
    if (!Array.isArray(rule.results) || rule.results.length === 0) {
      throw new Error(`Composition rule ${id} requires result relations.`);
    }
    const results = [...new Set(rule.results.map((value) => requireIdentifier(value, `rule ${id} result`)))];
    if (results.some((value) => !relations.has(value))) {
      throw new Error(`Composition rule ${id} references an undeclared result.`);
    }
    const accepted = Object.freeze({ id, left, right, results: Object.freeze(results) });
    rules.set(id, accepted);
    const key = pairKey(left, right);
    if (!rulesByPair.has(key)) rulesByPair.set(key, []);
    rulesByPair.get(key).push(accepted);
  }
  for (const values of rulesByPair.values()) values.sort((left, right) => left.id.localeCompare(right.id));
  const exclusiveGroups = [];
  for (const [index, group] of (system.exclusiveGroups ?? []).entries()) {
    if (!Array.isArray(group) || group.length < 2) throw new Error(`Exclusive group ${index} is malformed.`);
    const values = [...new Set(group.map((value) => requireIdentifier(value, `exclusive group ${index}`)))];
    if (values.some((value) => !relations.has(value))) throw new Error(`Exclusive group ${index} is undeclared.`);
    exclusiveGroups.push(Object.freeze(values));
  }
  const order = new Map();
  for (const [index, relation] of (system.outputOrder ?? []).entries()) {
    requireIdentifier(relation, `output order ${index}`);
    if (!relations.has(relation) || order.has(relation)) throw new Error('Output order is invalid.');
    order.set(relation, index);
  }
  return Object.freeze({ relations, rules, rulesByPair, exclusiveGroups: Object.freeze(exclusiveGroups), order });
}

function validateTask(task, system, compiled) {
  if (task?.schema !== 'qualitative-relation-task-v1') throw new Error('Qualitative relation task schema is required.');
  if (task.systemId !== system.systemId) throw new Error('The requested qualitative relation system is not active.');
  if (!Array.isArray(task.facts) || task.facts.length > MAX_FACTS) {
    throw new RangeError(`Qualitative tasks permit at most ${MAX_FACTS} facts.`);
  }
  const ids = new Set();
  const facts = task.facts.map((fact, index) => {
    const id = requireIdentifier(fact?.id ?? `fact:${index}`, `fact ${index} id`);
    const subject = requireIdentifier(fact?.subject, `fact ${index} subject`);
    const object = requireIdentifier(fact?.object, `fact ${index} object`);
    const relation = requireIdentifier(fact?.relation, `fact ${index} relation`);
    if (ids.has(id) || !compiled.relations.has(relation)) {
      throw new Error(`Fact ${id} is duplicate or uses an undeclared relation.`);
    }
    ids.add(id);
    return Object.freeze({ id, subject, relation, object });
  }).sort((left, right) => left.id.localeCompare(right.id));
  const subject = requireIdentifier(task.query?.subject, 'query subject');
  const object = requireIdentifier(task.query?.object, 'query object');
  return Object.freeze({ facts: Object.freeze(facts), subject, object });
}

function deriveClosure(accepted, compiled) {
  const byPair = new Map();
  const outgoing = new Map();
  const incoming = new Map();
  const queue = [];
  let proofDepthExceeded = false;
  const add = (subject, relation, object, proof, proofDepth) => {
    const key = pairKey(subject, object);
    if (!byPair.has(key)) byPair.set(key, new Map());
    if (byPair.get(key).has(relation)) return false;
    if (proofDepth > MAX_PROOF_DEPTH) {
      proofDepthExceeded = true;
      return false;
    }
    const edge = Object.freeze({ subject, relation, object, proof, proofDepth });
    byPair.get(key).set(relation, edge);
    if (!outgoing.has(subject)) outgoing.set(subject, []);
    if (!incoming.has(object)) incoming.set(object, []);
    outgoing.get(subject).push(edge);
    incoming.get(object).push(edge);
    queue.push(edge);
    return true;
  };
  for (const fact of accepted.facts) {
    const asserted = Object.freeze({
      kind: 'asserted', factId: fact.id, subject: fact.subject, relation: fact.relation, object: fact.object,
    });
    add(fact.subject, fact.relation, fact.object, asserted, 1);
    const inverse = compiled.relations.get(fact.relation).inverse;
    add(fact.object, inverse, fact.subject, Object.freeze({
      kind: 'inverse', subject: fact.object, relation: inverse, object: fact.subject, premise: asserted,
    }), 2);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (queue.length > MAX_DERIVATIONS || proofDepthExceeded) {
      return Object.freeze({ resourceLimit: true, byPair, derivations: queue.length });
    }
    const edge = queue[cursor];
    const combinations = [];
    for (const left of incoming.get(edge.subject) ?? []) combinations.push([left, edge]);
    for (const right of outgoing.get(edge.object) ?? []) combinations.push([edge, right]);
    combinations.sort(([leftA, rightA], [leftB, rightB]) =>
      leftA.subject.localeCompare(leftB.subject)
      || leftA.relation.localeCompare(leftB.relation)
      || rightA.relation.localeCompare(rightB.relation)
      || rightA.object.localeCompare(rightB.object));
    for (const [left, right] of combinations) {
      for (const rule of compiled.rulesByPair.get(pairKey(left.relation, right.relation)) ?? []) {
        for (const result of rule.results) {
          add(left.subject, result, right.object, Object.freeze({
            kind: 'composition', ruleId: rule.id, subject: left.subject, relation: result,
            object: right.object, intermediate: left.object, left: left.proof, right: right.proof,
          }), Math.max(left.proofDepth, right.proofDepth) + 1);
        }
      }
    }
  }
  if (proofDepthExceeded) return Object.freeze({ resourceLimit: true, byPair, derivations: queue.length });
  return Object.freeze({ resourceLimit: false, byPair, derivations: queue.length });
}

function orderedValues(values, order) {
  return [...values].sort((left, right) =>
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER)
    || left.localeCompare(right));
}

export function executeQualitativeRelationTask(task, system) {
  let compiled;
  let accepted;
  try {
    compiled = compileSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch (error) {
    return emptyResult(error instanceof RangeError ? 'RESOURCE_LIMIT' : 'UNPARSED', error.message);
  }
  const entities = new Set(accepted.facts.flatMap((fact) => [fact.subject, fact.object]));
  if (entities.size > MAX_ENTITIES) return emptyResult('RESOURCE_LIMIT', 'Qualitative task exceeds the entity limit.');
  if (!entities.has(accepted.subject) || !entities.has(accepted.object)) {
    return emptyResult('UNKNOWN', 'A query endpoint has no accepted qualitative evidence.');
  }
  const closure = deriveClosure(accepted, compiled);
  if (closure.resourceLimit) return emptyResult('RESOURCE_LIMIT', 'Qualitative closure exceeded its derivation bound.');
  const queryRelations = closure.byPair.get(pairKey(accepted.subject, accepted.object)) ?? new Map();
  const conflicts = compiled.exclusiveGroups.flatMap((group) => {
    const present = group.filter((relation) => queryRelations.has(relation));
    return present.length > 1 ? [Object.freeze({ group, present: Object.freeze(present) })] : [];
  });
  if (conflicts.length > 0) {
    return emptyResult('INCONSISTENT_CONTEXT', 'Mutually exclusive qualitative relations are both entailed.', {
      conflicts: Object.freeze(conflicts),
    });
  }
  const values = orderedValues([...queryRelations.keys()].filter((relation) =>
    compiled.relations.get(relation).output), compiled.order);
  if (values.length === 0) return emptyResult('UNKNOWN', 'No declared output relation connects the query endpoints.');
  return Object.freeze({
    status: 'SOLVED',
    values: Object.freeze(values),
    evidence: Object.freeze(values.map((relation) => Object.freeze({ relation, proof: queryRelations.get(relation).proof }))),
    diagnostic: 'Every returned relation is direct, inverse-derived, or licensed by declarative binary composition.',
    reasoning: Object.freeze({
      method: 'declarative-qualitative-relation-closure',
      derivedRelations: closure.derivations,
      queryRelationCount: values.length,
    }),
  });
}

function replayProof(proof, facts, compiled, depth = 0) {
  if (!proof || depth > MAX_PROOF_DEPTH) return undefined;
  if (proof.kind === 'asserted') {
    const fact = facts.get(proof.factId);
    if (!fact || fact.subject !== proof.subject || fact.relation !== proof.relation || fact.object !== proof.object) {
      return undefined;
    }
    return Object.freeze({ subject: fact.subject, relation: fact.relation, object: fact.object });
  }
  if (proof.kind === 'inverse') {
    const premise = replayProof(proof.premise, facts, compiled, depth + 1);
    if (!premise || proof.subject !== premise.object || proof.object !== premise.subject
      || proof.relation !== compiled.relations.get(premise.relation)?.inverse) return undefined;
    return Object.freeze({ subject: proof.subject, relation: proof.relation, object: proof.object });
  }
  if (proof.kind === 'composition') {
    const left = replayProof(proof.left, facts, compiled, depth + 1);
    const right = replayProof(proof.right, facts, compiled, depth + 1);
    const rule = compiled.rules.get(proof.ruleId);
    if (!left || !right || !rule || left.object !== right.subject || proof.intermediate !== left.object
      || rule.left !== left.relation || rule.right !== right.relation || !rule.results.includes(proof.relation)
      || proof.subject !== left.subject || proof.object !== right.object) return undefined;
    return Object.freeze({ subject: proof.subject, relation: proof.relation, object: proof.object });
  }
  return undefined;
}

export function verifyQualitativeRelationResult(task, system, result) {
  if (result?.status !== 'SOLVED' || !Array.isArray(result.values) || !Array.isArray(result.evidence)) return false;
  let compiled;
  let accepted;
  try {
    compiled = compileSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch {
    return false;
  }
  const closure = deriveClosure(accepted, compiled);
  if (closure.resourceLimit) return false;
  const expectedMap = closure.byPair.get(pairKey(accepted.subject, accepted.object)) ?? new Map();
  const expected = orderedValues([...expectedMap.keys()].filter((relation) =>
    compiled.relations.get(relation).output), compiled.order);
  if (JSON.stringify(expected) !== JSON.stringify(result.values)
    || result.evidence.length !== result.values.length
    || new Set(result.evidence.map((item) => item?.relation)).size !== result.evidence.length) return false;
  const facts = new Map(accepted.facts.map((fact) => [fact.id, fact]));
  for (const evidence of result.evidence) {
    const replayed = replayProof(evidence.proof, facts, compiled);
    if (!replayed || replayed.subject !== accepted.subject || replayed.object !== accepted.object
      || replayed.relation !== evidence.relation || !result.values.includes(evidence.relation)) return false;
  }
  return true;
}

export const QUALITATIVE_RELATION_LIMITS = Object.freeze({
  maxFacts: MAX_FACTS,
  maxEntities: MAX_ENTITIES,
  maxRelations: MAX_RELATIONS,
  maxRules: MAX_RULES,
  maxDerivations: MAX_DERIVATIONS,
  maxProofDepth: MAX_PROOF_DEPTH,
});
