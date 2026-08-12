export const SESSION_LIMITS = Object.freeze({
  maximumInputBytes: 64 * 1024,
  maximumSegments: 128,
  maximumSegmentBytes: 8 * 1024,
  maximumEntities: 512,
  maximumFacts: 1_024,
  maximumRules: 256,
  maximumHistoryEvents: 1_024,
  maximumNamesPerEntity: 16,
  maximumStringBytes: 4 * 1024,
});

export class SessionResourceLimitError extends Error {
  constructor(resource, observed, limit) {
    super(`Session ${resource} limit exceeded: observed ${observed}, limit ${limit}.`);
    this.name = 'SessionResourceLimitError';
    this.resource = resource;
    this.observed = observed;
    this.limit = limit;
  }
}

export class SessionContextValidationError extends TypeError {
  constructor(message, field = 'context') {
    super(message);
    this.name = 'SessionContextValidationError';
    this.field = field;
  }
}

export class SessionInputValidationError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'SessionInputValidationError';
  }
}

function boundedArray(value, field, limit) {
  if (!Array.isArray(value)) {
    throw new SessionContextValidationError(`context.session.${field} must be an array.`, field);
  }
  if (value.length > limit) throw new SessionResourceLimitError(field, value.length, limit);
  return value;
}

function boundedString(value, field, { optional = false } = {}) {
  if (optional && value === undefined) return value;
  if (typeof value !== 'string' || value.length === 0) {
    throw new SessionContextValidationError(`${field} must be a non-empty string.`, field);
  }
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes > SESSION_LIMITS.maximumStringBytes) {
    throw new SessionResourceLimitError(field, bytes, SESSION_LIMITS.maximumStringBytes);
  }
  return value;
}

function requireExactKeys(value, allowed, field) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new SessionContextValidationError(`${field} contains unsupported field ${key}.`, `${field}.${key}`);
    }
  }
}

function optionalBoolean(value, field) {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new SessionContextValidationError(`${field} must be a boolean when present.`, field);
  }
}

function boundedStringArray(value, field, limit) {
  const values = boundedArray(value, field, limit);
  for (const [index, item] of values.entries()) boundedString(item, `${field}[${index}]`);
  return values;
}

export function emptySessionContext() {
  return { session: { entities: [], facts: [], rules: [], history: [] } };
}

export function validateSessionContext(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new SessionContextValidationError('Runtime context must be an object.');
  }
  requireExactKeys(context, new Set(['session', 'lastEntity']), 'Runtime context');
  boundedString(context.lastEntity, 'context.lastEntity', { optional: true });
  const session = context.session;
  if (session === undefined) return;
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw new SessionContextValidationError('context.session must be an object.', 'context.session');
  }
  requireExactKeys(session, new Set(['entities', 'facts', 'rules', 'history']), 'context.session');
  const entities = boundedArray(session.entities, 'entities', SESSION_LIMITS.maximumEntities);
  const facts = boundedArray(session.facts, 'facts', SESSION_LIMITS.maximumFacts);
  const rules = boundedArray(session.rules, 'rules', SESSION_LIMITS.maximumRules);
  const history = boundedArray(session.history ?? [], 'history', SESSION_LIMITS.maximumHistoryEvents);
  for (const [index, entity] of entities.entries()) {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
      throw new SessionContextValidationError(
        `context.session.entities[${index}] must be an object.`, `context.session.entities[${index}]`,
      );
    }
    requireExactKeys(entity, new Set(['id', 'names', 'kind', 'session']),
      `context.session.entities[${index}]`);
    boundedString(entity.id, `context.session.entities[${index}].id`);
    const names = boundedArray(entity.names, `entities[${index}].names`, SESSION_LIMITS.maximumNamesPerEntity);
    for (const [nameIndex, name] of names.entries()) {
      boundedString(name, `context.session.entities[${index}].names[${nameIndex}]`);
    }
    boundedString(entity.kind, `context.session.entities[${index}].kind`);
    optionalBoolean(entity.session, `context.session.entities[${index}].session`);
  }
  for (const [index, fact] of facts.entries()) {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) {
      throw new SessionContextValidationError(
        `context.session.facts[${index}] must be an object.`, `context.session.facts[${index}]`,
      );
    }
    requireExactKeys(fact, new Set([
      'id', 'subject', 'predicate', 'object', 'value', 'provenance', 'sourceText', 'session',
    ]), `context.session.facts[${index}]`);
    for (const field of ['id', 'subject', 'predicate']) {
      boundedString(fact[field], `context.session.facts[${index}].${field}`);
    }
    if ((fact.object === undefined) === (fact.value === undefined)) {
      throw new SessionContextValidationError(
        `context.session.facts[${index}] requires exactly one object or value.`,
        `context.session.facts[${index}].object-or-value`,
      );
    }
    boundedString(fact.object ?? fact.value, `context.session.facts[${index}].object-or-value`);
    boundedStringArray(fact.provenance, `facts[${index}].provenance`, 16);
    boundedString(fact.sourceText, `context.session.facts[${index}].sourceText`, { optional: true });
    optionalBoolean(fact.session, `context.session.facts[${index}].session`);
  }
  for (const [index, rule] of rules.entries()) {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      throw new SessionContextValidationError(
        `context.session.rules[${index}] must be an object.`, `context.session.rules[${index}]`,
      );
    }
    requireExactKeys(rule, new Set(['kind', 'id', 'when', 'then', 'source', 'sourceText', 'session']),
      `context.session.rules[${index}]`);
    if (rule.kind !== undefined && rule.kind !== 'rule') {
      throw new SessionContextValidationError(
        `context.session.rules[${index}].kind must be rule.`, `context.session.rules[${index}].kind`,
      );
    }
    boundedString(rule.id, `context.session.rules[${index}].id`);
    const premises = boundedArray(rule.when, `rules[${index}].when`, 16);
    for (const [premiseIndex, premise] of premises.entries()) {
      if (!Array.isArray(premise) || premise.length !== 3) {
        throw new SessionContextValidationError(
          `context.session.rules[${index}].when[${premiseIndex}] must be one triple.`,
          `context.session.rules[${index}].when[${premiseIndex}]`,
        );
      }
      for (const [termIndex, term] of premise.entries()) boundedString(
        term, `context.session.rules[${index}].when[${premiseIndex}][${termIndex}]`,
      );
    }
    if (!Array.isArray(rule.then) || rule.then.length !== 3) {
      throw new SessionContextValidationError(
        `context.session.rules[${index}].then must be one triple.`, `context.session.rules[${index}].then`,
      );
    }
    for (const [termIndex, term] of rule.then.entries()) {
      boundedString(term, `context.session.rules[${index}].then[${termIndex}]`);
    }
    boundedString(rule.source, `context.session.rules[${index}].source`, { optional: true });
    boundedString(rule.sourceText, `context.session.rules[${index}].sourceText`, { optional: true });
    optionalBoolean(rule.session, `context.session.rules[${index}].session`);
  }
  for (const [index, event] of history.entries()) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new SessionContextValidationError(
        `context.session.history[${index}] must be an object.`, `context.session.history[${index}]`,
      );
    }
    requireExactKeys(event, new Set([
      'id', 'sequence', 'subject', 'predicate', 'object', 'factId', 'provenance', 'sourceText',
    ]), `context.session.history[${index}]`);
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) {
      throw new SessionContextValidationError(
        `context.session.history[${index}].sequence must be a non-negative integer.`,
        `context.session.history[${index}].sequence`,
      );
    }
    for (const field of ['id', 'subject', 'predicate', 'object', 'factId']) {
      boundedString(event[field], `context.session.history[${index}].${field}`);
    }
    boundedStringArray(event.provenance, `history[${index}].provenance`, 16);
    boundedString(event.sourceText, `context.session.history[${index}].sourceText`, { optional: true });
  }
}

export function sessionContextSnapshot(context = {}) {
  validateSessionContext(context);
  const source = context.session ?? emptySessionContext().session;
  return {
    ...(context.lastEntity ? { lastEntity: context.lastEntity } : {}),
    session: {
      entities: source.entities.map((entity) => ({ ...entity, names: [...entity.names] })),
      facts: source.facts.map((fact) => ({ ...fact, provenance: [...fact.provenance] })),
      rules: source.rules.map((rule) => ({
        ...rule, when: rule.when.map((premise) => [...premise]), then: [...rule.then],
      })),
      history: (source.history ?? []).map((event) => ({
        ...event, provenance: [...event.provenance],
      })),
    },
  };
}
