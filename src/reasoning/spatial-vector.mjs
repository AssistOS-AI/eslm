const MAX_DIMENSIONS = 8;
const MAX_FACTS = 10_000;
const MAX_ENTITIES = 10_000;
const MAX_PATH_DEPTH = 64;

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

function equalVector(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function negateVector(vector) {
  return vector.map((value) => -value);
}

function signVector(vector) {
  return vector.map((value) => Math.sign(value));
}

function advanceState(state, vector, policy) {
  const values = [];
  const unknown = [];
  for (let index = 0; index < vector.length; index += 1) {
    if (state.unknown[index]) {
      values.push(0);
      unknown.push(true);
    } else if (policy === 'invalidate-opposed-steps' && state.values[index] * vector[index] < 0) {
      values.push(0);
      unknown.push(true);
    } else {
      values.push(state.values[index] + vector[index]);
      unknown.push(false);
    }
  }
  return Object.freeze({ values: Object.freeze(values), unknown: Object.freeze(unknown) });
}

function equalState(left, right) {
  return equalVector(left.values, right.values) && equalVector(left.unknown, right.unknown);
}

function validateSystem(system) {
  if (system?.schema !== 'typed-spatial-vector-system-v1') {
    throw new Error('A typed spatial vector system is required.');
  }
  requireIdentifier(system.systemId, 'systemId');
  if (!Array.isArray(system.dimensions) || system.dimensions.length === 0
    || system.dimensions.length > MAX_DIMENSIONS) {
    throw new Error(`Spatial vector systems require between 1 and ${MAX_DIMENSIONS} dimensions.`);
  }
  const dimensions = system.dimensions.map((dimension, index) =>
    requireIdentifier(dimension, `dimension ${index}`));
  if (new Set(dimensions).size !== dimensions.length) throw new Error('Spatial dimensions must be unique.');
  if (!Array.isArray(system.relations) || system.relations.length === 0) {
    throw new Error('Spatial vector systems require relation definitions.');
  }
  const relations = new Map();
  const outputs = new Map();
  for (const [index, relation] of system.relations.entries()) {
    const id = requireIdentifier(relation?.id, `relation ${index} id`);
    if (relations.has(id)) throw new Error(`Duplicate spatial relation ${id}.`);
    if (!Array.isArray(relation.vector) || relation.vector.length !== dimensions.length
      || relation.vector.some((value) => !Number.isSafeInteger(value))) {
      throw new Error(`Spatial relation ${id} requires one safe-integer component per dimension.`);
    }
    if (relation.vector.every((value) => value === 0) && relation.output !== true) {
      throw new Error(`Zero-vector relation ${id} must be declared as an output.`);
    }
    const frozen = Object.freeze({ id, vector: Object.freeze([...relation.vector]), output: relation.output === true });
    relations.set(id, frozen);
    if (frozen.output) {
      const signature = signVector(frozen.vector).join(',');
      if (outputs.has(signature)) throw new Error(`Several output relations classify sign vector ${signature}.`);
      outputs.set(signature, frozen);
    }
  }
  if (outputs.size === 0) throw new Error('Spatial vector systems require at least one output relation.');
  return Object.freeze({ dimensions: Object.freeze(dimensions), relations, outputs });
}

function validateTask(task, system, compiled) {
  if (task?.schema !== 'typed-spatial-vector-task-v1') throw new Error('Typed spatial vector task schema is required.');
  if (task.systemId !== system.systemId) throw new Error('The requested spatial vector system is not active.');
  if (!Array.isArray(task.facts) || task.facts.length > MAX_FACTS) {
    throw new Error(`Spatial vector tasks permit at most ${MAX_FACTS} facts.`);
  }
  const maxDepth = task.maxDepth ?? MAX_PATH_DEPTH;
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_PATH_DEPTH) {
    throw new RangeError(`Spatial path depth must be between 1 and ${MAX_PATH_DEPTH}.`);
  }
  const compositionPolicy = task.compositionPolicy ?? 'exact-integer';
  if (!['exact-integer', 'invalidate-opposed-steps'].includes(compositionPolicy)) {
    throw new Error(`Unknown spatial composition policy ${compositionPolicy}.`);
  }
  const facts = task.facts.map((fact, index) => {
    const id = requireIdentifier(fact?.id ?? `fact:${index}`, `fact ${index} id`);
    const subject = requireIdentifier(fact?.subject, `fact ${index} subject`);
    const object = requireIdentifier(fact?.object, `fact ${index} object`);
    const relation = requireIdentifier(fact?.relation, `fact ${index} relation`);
    if (!compiled.relations.has(relation)) throw new Error(`Fact ${id} uses undeclared relation ${relation}.`);
    return Object.freeze({ id, subject, object, relation });
  });
  const subject = requireIdentifier(task.query?.subject, 'query subject');
  const object = requireIdentifier(task.query?.object, 'query object');
  return Object.freeze({ facts: Object.freeze(facts), subject, object, maxDepth, compositionPolicy });
}

function adjacencyFor(facts, relations) {
  const adjacency = new Map();
  const add = (from, to, vector, fact, direction) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(Object.freeze({ from, to, vector, factId: fact.id, relation: fact.relation, direction }));
  };
  for (const fact of facts) {
    const vector = relations.get(fact.relation).vector;
    add(fact.object, fact.subject, vector, fact, 'asserted');
    add(fact.subject, fact.object, negateVector(vector), fact, 'inverse');
  }
  for (const edges of adjacency.values()) edges.sort((left, right) =>
    left.to.localeCompare(right.to) || left.factId.localeCompare(right.factId) || left.direction.localeCompare(right.direction));
  return adjacency;
}

function reconstructPath(predecessors, endpoint) {
  const path = [];
  let cursor = endpoint;
  while (predecessors.has(cursor)) {
    const edge = predecessors.get(cursor);
    path.push(edge);
    cursor = edge.from;
  }
  return path.reverse();
}

export function executeSpatialVectorTask(task, system) {
  let compiled;
  let accepted;
  try {
    compiled = validateSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch (error) {
    if (error instanceof RangeError) return emptyResult('RESOURCE_LIMIT', error.message);
    return emptyResult('UNPARSED', error.message);
  }
  const entities = new Set(accepted.facts.flatMap((fact) => [fact.subject, fact.object]));
  if (entities.size > MAX_ENTITIES) return emptyResult('RESOURCE_LIMIT', 'Spatial task exceeds the entity limit.');
  if (!entities.has(accepted.subject) || !entities.has(accepted.object)) {
    return emptyResult('UNKNOWN', 'A query endpoint has no accepted spatial evidence.');
  }
  const adjacency = adjacencyFor(accepted.facts, compiled.relations);
  const origin = Object.freeze({
    values: Object.freeze(compiled.dimensions.map(() => 0)),
    unknown: Object.freeze(compiled.dimensions.map(() => false)),
  });
  const coordinates = new Map([[accepted.object, origin]]);
  const depths = new Map([[accepted.object, 0]]);
  const predecessors = new Map();
  const frontier = [accepted.object];
  for (let cursor = 0; cursor < frontier.length; cursor += 1) {
    const from = frontier[cursor];
    const depth = depths.get(from);
    for (const edge of adjacency.get(from) ?? []) {
      if (depth >= accepted.maxDepth) continue;
      const candidate = advanceState(coordinates.get(from), edge.vector, accepted.compositionPolicy);
      const previous = coordinates.get(edge.to);
      if (previous && accepted.compositionPolicy === 'exact-integer' && !equalState(previous, candidate)) {
        return emptyResult('INCONSISTENT_CONTEXT', 'The query-connected spatial constraints assign incompatible coordinates.', {
          conflict: Object.freeze({
            entity: edge.to,
            established: previous.values,
            establishedUnknown: previous.unknown,
            conflicting: candidate.values,
            conflictingUnknown: candidate.unknown,
            establishedPath: Object.freeze(reconstructPath(predecessors, edge.to)),
            conflictingEdge: edge,
          }),
        });
      }
      if (previous) continue;
      if (!previous) {
        coordinates.set(edge.to, candidate);
        depths.set(edge.to, depth + 1);
        predecessors.set(edge.to, edge);
        frontier.push(edge.to);
      }
    }
  }
  const displacementState = coordinates.get(accepted.subject);
  if (!displacementState) {
    return emptyResult('UNKNOWN', 'The query endpoints are disconnected within the declared path-depth bound.');
  }
  if (displacementState.unknown.some(Boolean) && displacementState.values.every((value) => value === 0)) {
    return emptyResult('UNDERDETERMINED', 'No nonzero spatial dimension remains known under the declared composition policy.', {
      unknownDimensions: compiled.dimensions,
    });
  }
  const displacement = displacementState.values;
  const signature = signVector(displacement).join(',');
  const output = compiled.outputs.get(signature);
  if (!output) {
    return emptyResult('NO_APPLICABLE_METHOD', `No declared output classifies sign vector ${signature}.`, {
      displacement: Object.freeze(displacement),
    });
  }
  const path = Object.freeze(reconstructPath(predecessors, accepted.subject));
  return Object.freeze({
    status: 'SOLVED',
    values: Object.freeze([output.id]),
    evidence: path,
    diagnostic: 'The relation follows from the exact sum of the query-connected displacement constraints.',
    reasoning: Object.freeze({
      method: 'spatial-vector-constraint-propagation',
      compositionPolicy: accepted.compositionPolicy,
      dimensions: compiled.dimensions,
      displacement: Object.freeze(displacement),
      signVector: Object.freeze(signVector(displacement)),
      unknownDimensions: Object.freeze(compiled.dimensions.filter((_, index) => displacementState.unknown[index])),
      pathLength: path.length,
      inspectedEntities: coordinates.size,
    }),
  });
}

export function verifySpatialVectorResult(task, system, result) {
  if (result?.status !== 'SOLVED' || !Array.isArray(result.evidence) || result.values?.length !== 1) return false;
  let compiled;
  let accepted;
  try {
    compiled = validateSystem(system);
    accepted = validateTask(task, system, compiled);
  } catch {
    return false;
  }
  const facts = new Map(accepted.facts.map((fact) => [fact.id, fact]));
  let current = accepted.object;
  let state = Object.freeze({
    values: Object.freeze(compiled.dimensions.map(() => 0)),
    unknown: Object.freeze(compiled.dimensions.map(() => false)),
  });
  const used = new Set();
  for (const edge of result.evidence) {
    const fact = facts.get(edge?.factId);
    if (!fact || used.has(`${edge.factId}\u0000${edge.direction}`) || edge.from !== current) return false;
    const relation = compiled.relations.get(fact.relation);
    const asserted = edge.direction === 'asserted' && edge.from === fact.object && edge.to === fact.subject;
    const inverse = edge.direction === 'inverse' && edge.from === fact.subject && edge.to === fact.object;
    if (!asserted && !inverse) return false;
    state = advanceState(state, asserted ? relation.vector : negateVector(relation.vector), accepted.compositionPolicy);
    current = edge.to;
    used.add(`${edge.factId}\u0000${edge.direction}`);
  }
  if (current !== accepted.subject) return false;
  if (state.unknown.some(Boolean) && state.values.every((value) => value === 0)) return false;
  const output = compiled.outputs.get(signVector(state.values).join(','));
  return output?.id === result.values[0]
    && result.reasoning?.compositionPolicy === accepted.compositionPolicy
    && equalVector(state.values, result.reasoning?.displacement ?? [])
    && equalVector(signVector(state.values), result.reasoning?.signVector ?? [])
    && equalVector(compiled.dimensions.filter((_, index) => state.unknown[index]),
      result.reasoning?.unknownDimensions ?? []);
}
