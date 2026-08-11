const MAX_OPERATIONS = 10_000;
const MAX_PATH_DEPTH = 128;

function emptyResult(status, diagnostic) {
  return Object.freeze({ status, values: Object.freeze([]), evidence: Object.freeze([]), diagnostic });
}

function validIdentifier(value) {
  return typeof value === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,127}$/u.test(value);
}

function requireIdentifier(value, path) {
  if (!validIdentifier(value)) throw new Error(`${path} must be a bounded semantic identifier.`);
  return value;
}

function validateTask(task) {
  if (task?.schema !== 'finite-episodic-world-task-v1') {
    throw new Error('A finite episodic world task is required.');
  }
  if (!Array.isArray(task.operations) || task.operations.length > MAX_OPERATIONS) {
    throw new RangeError(`An episodic world permits at most ${MAX_OPERATIONS} operations.`);
  }
  const operationIds = new Set();
  const operations = task.operations.map((operation, index) => {
    const id = requireIdentifier(operation?.id, `operations[${index}].id`);
    if (operationIds.has(id)) throw new Error(`Duplicate episodic operation ${id}.`);
    operationIds.add(id);
    if (!Number.isSafeInteger(operation.sequence)) {
      throw new Error(`operations[${index}].sequence must be a safe integer.`);
    }
    if (!['state', 'relation-add', 'relation-remove', 'relation-transfer', 'edge', 'event',
      'type', 'class-rule', 'property'].includes(operation.kind)) {
      throw new Error(`operations[${index}] has an unsupported operation kind.`);
    }
    return Object.freeze({ ...operation });
  }).toSorted((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const query = task.query;
  if (!query || !['state-values', 'state-predecessor', 'state-membership', 'relation-values',
    'relation-count', 'edge-values', 'edge-membership', 'event-role', 'class-rule-value', 'induce-property',
    'vector-membership', 'edge-path', 'motive-goal', 'event-cause'].includes(query.kind)) {
    throw new Error('The episodic world query kind is unsupported.');
  }
  const policy = task.policy ?? {};
  return Object.freeze({ operations: Object.freeze(operations), query: Object.freeze({ ...query }), policy });
}

function operationIndex(operations) {
  return new Map(operations.map((operation) => [operation.id, operation]));
}

function stateHistory(operations, predicate, subject) {
  return operations.filter((operation) => operation.kind === 'state'
    && operation.predicate === predicate && operation.subject === subject);
}

function latestState(operations, predicate, subject) {
  return stateHistory(operations, predicate, subject).at(-1);
}

function relationState(operations, relation) {
  const state = new Map();
  const ensure = (subject) => {
    if (!state.has(subject)) state.set(subject, new Map());
    return state.get(subject);
  };
  for (const operation of operations) {
    if (operation.relation !== relation) continue;
    if (operation.kind === 'relation-add') {
      ensure(operation.subject).set(operation.object, operation.id);
    } else if (operation.kind === 'relation-remove') {
      ensure(operation.subject).delete(operation.object);
    } else if (operation.kind === 'relation-transfer') {
      ensure(operation.from).delete(operation.object);
      ensure(operation.to).set(operation.object, operation.id);
    }
  }
  return state;
}

function relationOwner(state, object) {
  for (const [subject, values] of state) if (values.has(object)) return subject;
  return undefined;
}

function directStateResult(accepted) {
  const { operations, query } = accepted;
  const direct = latestState(operations, query.predicate, query.subject);
  if (direct) return { values: [...direct.values], evidence: [direct.id], stateOperation: direct };
  if (!query.carrierRelation) return undefined;
  const possessions = relationState(operations, query.carrierRelation);
  const holder = relationOwner(possessions, query.subject);
  if (!holder) return undefined;
  const holderState = latestState(operations, query.predicate, holder);
  if (!holderState) return undefined;
  return { values: [...holderState.values], evidence: [possessions.get(holder).get(query.subject), holderState.id] };
}

function statePredecessorResult(accepted) {
  const history = stateHistory(accepted.operations, accepted.query.predicate, accepted.query.subject)
    .toSorted((left, right) => (left.semanticTime ?? left.sequence) - (right.semanticTime ?? right.sequence)
      || left.sequence - right.sequence);
  const distinct = [];
  for (const operation of history) {
    if (operation.values.length !== 1) continue;
    if (distinct.at(-1)?.values[0] !== operation.values[0]) distinct.push(operation);
  }
  let boundary = -1;
  for (let index = 0; index < distinct.length; index += 1) {
    if (distinct[index].values.includes(accepted.query.before)) boundary = index;
  }
  if (boundary < 1) return undefined;
  return { values: [...distinct[boundary - 1].values], evidence: [distinct[boundary - 1].id, distinct[boundary].id] };
}

function stateMembershipResult(accepted) {
  const result = directStateResult(accepted);
  if (!result) return undefined;
  const stateOperation = result.stateOperation;
  let values;
  if (stateOperation?.polarity === 'negative') {
    values = stateOperation.values.includes(accepted.query.value) ? ['false'] : ['unknown'];
  } else if (stateOperation?.polarity === 'possible') {
    values = stateOperation.values.includes(accepted.query.value) ? ['unknown'] : ['false'];
  } else {
    values = result.values.includes(accepted.query.value) ? ['true'] : ['false'];
  }
  return { values, evidence: result.evidence };
}

function relationValuesResult(accepted) {
  const state = relationState(accepted.operations, accepted.query.relation);
  const members = state.get(accepted.query.subject) ?? new Map();
  return { values: [...members.keys()].toSorted(), evidence: [...members.values()].toSorted() };
}

function edgeGraph(accepted, relationFilter) {
  const inverse = new Map(Object.entries(accepted.policy.inverseRelations ?? {}));
  const adjacency = new Map();
  const add = (from, to, relation, id, direction) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ from, to, relation, id, direction });
  };
  for (const operation of accepted.operations) {
    if (operation.kind !== 'edge') continue;
    if (!relationFilter || relationFilter.has(operation.relation)) {
      add(operation.subject, operation.object, operation.relation, operation.id, 'asserted');
    }
    const inverseRelation = inverse.get(operation.relation);
    if (inverseRelation && (!relationFilter || relationFilter.has(inverseRelation))) {
      add(operation.object, operation.subject, inverseRelation, operation.id, 'inverse');
    }
  }
  for (const edges of adjacency.values()) edges.sort((left, right) =>
    left.relation.localeCompare(right.relation) || left.to.localeCompare(right.to) || left.id.localeCompare(right.id));
  return adjacency;
}

function edgeValuesResult(accepted) {
  const adjacency = edgeGraph(accepted, new Set([accepted.query.relation]));
  const transitive = (accepted.policy.transitiveRelations ?? []).includes(accepted.query.relation);
  const queue = [{ entity: accepted.query.subject, path: [] }];
  const seen = new Set([accepted.query.subject]);
  const matched = [];
  while (queue.length) {
    const current = queue.shift();
    for (const edge of adjacency.get(current.entity) ?? []) {
      if (edge.relation !== accepted.query.relation || seen.has(edge.to)) continue;
      seen.add(edge.to);
      const path = [...current.path, edge];
      matched.push({ value: edge.to, path });
      if (transitive) queue.push({ entity: edge.to, path });
    }
  }
  return { values: matched.map((item) => item.value).toSorted(),
    evidence: [...new Set(matched.flatMap((item) => item.path.map((edge) => edge.id)))].toSorted() };
}

function edgeMembershipResult(accepted) {
  const valuesResult = edgeValuesResult(accepted);
  return { values: [valuesResult.values.includes(accepted.query.object) ? 'true' : 'false'],
    evidence: valuesResult.evidence };
}

function eventRoleResult(accepted) {
  let matches = accepted.operations.filter((operation) => operation.kind === 'event'
    && operation.eventType === accepted.query.eventType
    && Object.entries(accepted.query.constraints ?? {}).every(([role, value]) => operation.roles?.[role] === value));
  if (Array.isArray(accepted.query.preferredModes) && matches.length) {
    const ranks = new Map(accepted.query.preferredModes.map((mode, index) => [mode, index]));
    const bestRank = Math.min(...matches.map((operation) => ranks.get(operation.mode) ?? ranks.size));
    matches = matches.filter((operation) => (ranks.get(operation.mode) ?? ranks.size) === bestRank);
  }
  if (accepted.query.selection === 'latest' && matches.length) matches = [matches.at(-1)];
  const values = [...new Set(matches.map((operation) => operation.roles?.[accepted.query.outputRole]).filter(Boolean))];
  return { values: values.toSorted(), evidence: matches.map((operation) => operation.id).toSorted(),
    ...(accepted.query.requireUnique === true && values.length > 1 ? { status: 'AMBIGUOUS' } : {}) };
}

function classRuleResult(accepted) {
  const memberships = accepted.operations.filter((operation) => operation.kind === 'type'
    && operation.subject === accepted.query.subject);
  for (const membership of memberships) {
    const rule = accepted.operations.find((operation) => operation.kind === 'class-rule'
      && operation.subjectClass === membership.objectClass && operation.relation === accepted.query.relation);
    if (rule) return { values: [rule.objectClass], evidence: [membership.id, rule.id] };
  }
  return undefined;
}

function inductionResult(accepted) {
  const targetMembership = accepted.operations.find((operation) => operation.kind === 'type'
    && operation.subject === accepted.query.subject);
  if (!targetMembership) return undefined;
  const members = accepted.operations.filter((operation) => operation.kind === 'type'
    && operation.objectClass === targetMembership.objectClass);
  const properties = accepted.operations.filter((operation) => operation.kind === 'property'
    && operation.predicate === accepted.query.predicate
    && members.some((membership) => membership.subject === operation.subject));
  if (accepted.policy.inductionSelection === 'latest-member') {
    const orderedMembers = [...members].toSorted((left, right) => right.sequence - left.sequence);
    for (const member of orderedMembers) {
      const property = properties.filter((item) => item.subject === member.subject).at(-1);
      if (property) return { values: [property.value], evidence: [targetMembership.id, member.id, property.id] };
    }
    return undefined;
  }
  const counts = new Map();
  for (const property of properties) {
    if (!counts.has(property.value)) counts.set(property.value, []);
    counts.get(property.value).push(property);
  }
  const ranked = [...counts].sort((left, right) => right[1].length - left[1].length
    || Math.max(...right[1].map((item) => item.sequence)) - Math.max(...left[1].map((item) => item.sequence))
    || left[0].localeCompare(right[0]));
  if (!ranked.length || ranked.length > 1 && ranked[0][1].length === ranked[1][1].length) return undefined;
  return { values: [ranked[0][0]], evidence: [targetMembership.id, ...ranked[0][1].map((item) => item.id)] };
}

function vectorResult(accepted) {
  const vectors = accepted.policy.relationVectors ?? {};
  const inverse = Object.fromEntries(Object.entries(vectors).map(([relation, vector]) =>
    [relation, vector.map((value) => -value)]));
  const adjacency = new Map();
  const add = (from, to, vector, id, direction) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ from, to, vector, id, direction });
  };
  for (const operation of accepted.operations) {
    if (operation.kind !== 'edge' || !vectors[operation.relation]) continue;
    add(operation.subject, operation.object, vectors[operation.relation], operation.id, 'asserted');
    add(operation.object, operation.subject, inverse[operation.relation], operation.id, 'inverse');
  }
  const queue = [{ entity: accepted.query.object, vector: vectors[accepted.query.relation].map(() => 0), path: [] }];
  const seen = new Set([accepted.query.object]);
  while (queue.length) {
    const current = queue.shift();
    if (current.entity === accepted.query.subject) {
      const target = vectors[accepted.query.relation];
      const sign = current.vector.map(Math.sign);
      const expected = target.map(Math.sign);
      const matches = accepted.policy.vectorQueryPolicy === 'axis-sign'
        ? expected.every((value, index) => value === 0 || sign[index] === value)
        : sign.every((value, index) => value === expected[index]);
      return { values: [matches ? 'true' : 'false'],
        evidence: current.path.map((edge) => edge.id) };
    }
    if (current.path.length >= (accepted.query.maxDepth ?? MAX_PATH_DEPTH)) continue;
    for (const edge of adjacency.get(current.entity) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push({ entity: edge.to,
        vector: current.vector.map((value, index) => value + edge.vector[index]), path: [...current.path, edge] });
    }
  }
  return undefined;
}

function edgePathResult(accepted) {
  const adjacency = edgeGraph(accepted);
  const queue = [{ entity: accepted.query.from, path: [], values: [] }];
  const seen = new Set([accepted.query.from]);
  while (queue.length) {
    const current = queue.shift();
    if (current.entity === accepted.query.to) return { values: current.values, evidence: current.path.map((edge) => edge.id) };
    if (current.path.length >= (accepted.query.maxDepth ?? MAX_PATH_DEPTH)) continue;
    for (const edge of adjacency.get(current.entity) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push({ entity: edge.to, path: [...current.path, edge], values: [...current.values, edge.relation] });
    }
  }
  return undefined;
}

function motiveGoalResult(accepted) {
  const motive = latestState(accepted.operations, accepted.query.motivePredicate, accepted.query.subject);
  if (!motive || motive.values.length !== 1) return undefined;
  const goal = accepted.policy.motiveGoals?.[motive.values[0]]?.[accepted.query.goalRelation];
  if (!goal) return undefined;
  return { values: [goal], evidence: [motive.id, accepted.policy.policyId].filter(Boolean) };
}

function eventCauseResult(accepted) {
  const events = accepted.operations.filter((operation) => operation.kind === 'event'
    && operation.eventType === accepted.query.eventType
    && Object.entries(accepted.query.constraints ?? {}).every(([role, value]) => operation.roles?.[role] === value));
  const event = events.at(-1);
  if (!event) return undefined;
  const motive = stateHistory(accepted.operations, accepted.query.motivePredicate, accepted.query.subject)
    .filter((operation) => operation.sequence < event.sequence).at(-1);
  if (!motive) return undefined;
  return { values: [...motive.values], evidence: [motive.id, event.id] };
}

function evaluate(accepted) {
  const query = accepted.query;
  if (query.kind === 'state-values') return directStateResult(accepted);
  if (query.kind === 'state-predecessor') return statePredecessorResult(accepted);
  if (query.kind === 'state-membership') return stateMembershipResult(accepted);
  if (query.kind === 'relation-values' || query.kind === 'relation-count') return relationValuesResult(accepted);
  if (query.kind === 'edge-values') return edgeValuesResult(accepted);
  if (query.kind === 'edge-membership') return edgeMembershipResult(accepted);
  if (query.kind === 'event-role') return eventRoleResult(accepted);
  if (query.kind === 'class-rule-value') return classRuleResult(accepted);
  if (query.kind === 'induce-property') return inductionResult(accepted);
  if (query.kind === 'vector-membership') return vectorResult(accepted);
  if (query.kind === 'edge-path') return edgePathResult(accepted);
  if (query.kind === 'motive-goal') return motiveGoalResult(accepted);
  if (query.kind === 'event-cause') return eventCauseResult(accepted);
  return undefined;
}

function resultValues(accepted, evaluated) {
  if (accepted.query.kind !== 'relation-count') return evaluated.values;
  return [String(evaluated.values.length)];
}

export function executeEpisodicWorldTask(task) {
  let accepted;
  try {
    accepted = validateTask(task);
  } catch (error) {
    return emptyResult(error instanceof RangeError ? 'RESOURCE_LIMIT' : 'UNPARSED', error.message);
  }
  const evaluated = evaluate(accepted);
  if (!evaluated) return emptyResult('UNKNOWN', 'The finite episode does not determine the requested value.');
  const values = resultValues(accepted, evaluated);
  return Object.freeze({
    status: evaluated.status ?? 'SOLVED',
    values: Object.freeze(values),
    evidence: Object.freeze(evaluated.evidence),
    witness: Object.freeze({ queryKind: accepted.query.kind, operationIds: Object.freeze(evaluated.evidence) }),
    reasoning: Object.freeze({ method: 'finite-episodic-world', inspectedOperations: accepted.operations.length }),
  });
}

export function verifyEpisodicWorldResult(task, result) {
  if (!['SOLVED', 'AMBIGUOUS'].includes(result?.status) || !Array.isArray(result.values)
    || !Array.isArray(result.witness?.operationIds)) return false;
  let accepted;
  try {
    accepted = validateTask(task);
  } catch {
    return false;
  }
  const byId = operationIndex(accepted.operations);
  if (result.witness.operationIds.some((id) => id !== accepted.policy.policyId && !byId.has(id))) return false;
  const independentlyDerived = evaluate(accepted);
  if (!independentlyDerived) return false;
  const expectedValues = resultValues(accepted, independentlyDerived);
  return result.status === (independentlyDerived.status ?? 'SOLVED')
    && JSON.stringify([...result.values].toSorted()) === JSON.stringify([...expectedValues].toSorted())
    && JSON.stringify([...result.witness.operationIds].toSorted())
      === JSON.stringify([...independentlyDerived.evidence].toSorted());
}
