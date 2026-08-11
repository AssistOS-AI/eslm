const MAX_OPERATIONS = 10_000;
const MAX_CONTAINERS = 10_000;
const MAX_ITEMS_PER_OPERATION = 1_000;

function fail(message) {
  return Object.freeze({ status: 'UNPARSED', values: [], evidence: [], diagnostic: message });
}

function validateValues(values) {
  if (!Array.isArray(values) || values.length > MAX_ITEMS_PER_OPERATION
    || values.some((item) => typeof item !== 'string'
      || !/^[\p{L}\p{N}][\p{L}\p{N} _-]{0,127}$/u.test(item))) {
    throw new Error('State transition contains an invalid or oversized value list.');
  }
  return [...new Set(values)];
}

function ensureContainer(state, id) {
  if (!state.has(id)) state.set(id, new Set());
  if (state.size > MAX_CONTAINERS) throw new Error('Container-state task exceeds the container limit.');
  return state.get(id);
}

function moveItems(state, items, source, destination) {
  const from = ensureContainer(state, source);
  const to = ensureContainer(state, destination);
  for (const item of items) {
    from.delete(item);
    to.add(item);
  }
}

function validateSubject(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9:_-]{0,127}$/u.test(value)) {
    throw new Error('State transition contains an invalid subject identifier.');
  }
  return value;
}

function validateRelation(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,127}$/u.test(value)) {
    throw new Error('State transition contains an invalid relation identifier.');
  }
  return value;
}

export function executeContainerStateTask(task) {
  const program = task?.stateProgram;
  if (!program || program.schema !== 'finite-relation-state-program-v1') {
    return fail('Container-state task requires a finite relation-state program.');
  }
  let relation;
  try { relation = validateRelation(program.relation); }
  catch (error) { return fail(error.message); }
  if (program.query?.relation !== relation) return fail('State task requires one consistent relation.');
  if (!Array.isArray(program.initial) || !Array.isArray(program.transitions)
    || program.transitions.length > MAX_OPERATIONS) return fail('Container-state program is malformed or oversized.');
  const state = new Map();
  const trace = [];
  try {
    for (const assertion of program.initial) {
      if (assertion?.relation !== relation) throw new Error('Initial state has an inconsistent relation.');
      const container = ensureContainer(state, validateSubject(assertion.subject));
      for (const item of validateValues(assertion.values)) container.add(item);
    }
    for (const [index, transition] of program.transitions.entries()) {
      if (transition?.relation !== relation) throw new Error('Transition has an inconsistent relation.');
      const items = validateValues(transition.values);
      if (transition.operator === 'transfer') {
        const source = validateSubject(transition.from);
        const destination = validateSubject(transition.to);
        moveItems(state, items, source, destination);
        trace.push({ step: index + 1, operator: 'transfer', values: items, from: source, to: destination });
      } else if (transition.operator === 'add') {
        const destination = ensureContainer(state, validateSubject(transition.to));
        for (const item of items) destination.add(item);
        trace.push({ step: index + 1, operator: 'add', values: items, to: transition.to });
      } else if (transition.operator === 'remove') {
        const source = ensureContainer(state, validateSubject(transition.from));
        for (const item of items) source.delete(item);
        trace.push({ step: index + 1, operator: 'remove', values: items, from: transition.from });
      } else return fail(`Unsupported state-transition operator at step ${index + 1}.`);
    }
  } catch (error) {
    return fail(error.message);
  }
  let queryContainer;
  try { queryContainer = validateSubject(program.query?.subject); }
  catch (error) { return fail(error.message); }
  let values;
  try { values = [...ensureContainer(state, queryContainer)].sort(); }
  catch (error) { return fail(error.message); }
  return Object.freeze({
    status: 'SOLVED', values: Object.freeze(values),
    answer: values.length ? values.map((item) => `the ${item}`).join(' and ') : 'nothing',
    evidence: Object.freeze(trace),
    reasoning: Object.freeze({
      method: 'container-state-transitions', relation,
      operations: trace.length, querySubject: queryContainer,
    }),
  });
}
