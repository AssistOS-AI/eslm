import { tokenize } from './normalization.mjs';
import {
  SESSION_LIMITS,
  SessionInputValidationError,
  SessionResourceLimitError,
  sessionContextSnapshot,
  validateSessionContext,
} from './session-context.mjs';

export {
  SESSION_LIMITS,
  SessionContextValidationError,
  SessionInputValidationError,
  SessionResourceLimitError,
  emptySessionContext,
  sessionContextSnapshot,
  validateSessionContext,
} from './session-context.mjs';

function requireCapacity(resource, observed, limit) {
  if (observed > limit) throw new SessionResourceLimitError(resource, observed, limit);
}

function normalizedPhrase(value) {
  return tokenize(value).filter((token) => !/^[?.!,;:]$/u.test(token)).join(' ');
}

function entityId(value) {
  return normalizedPhrase(value).replace(/^(?:the|a|an) /u, '').replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

function displayName(value) {
  const clean = value.trim().replace(/^(?:the|a|an) /iu, '');
  return clean.split(/\s+/u).map((word) => `${word[0]?.toLocaleUpperCase('en-US') ?? ''}${word.slice(1)}`).join(' ');
}

function findEntity(phrase, model, entities) {
  const normalized = normalizedPhrase(phrase).replace(/^(?:the|a|an) /u, '');
  return [...model.entities, ...entities].find((entity) => entity.names.some((name) =>
    normalizedPhrase(name).replace(/^(?:the|a|an) /u, '') === normalized));
}

function ensureEntity(phrase, kind, model, entities) {
  const existing = findEntity(phrase, model, entities);
  if (existing) return existing.id;
  const base = entityId(phrase) || `entity-${entities.length + 1}`;
  let id = base;
  let suffix = 2;
  const used = new Set([...model.entities, ...entities].map((entity) => entity.id));
  while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
  entities.push({ id, names: [displayName(phrase)], kind, session: true });
  return id;
}

function singularClass(value, model) {
  const normalized = normalizedPhrase(value).replace(/^(?:the|a|an) /u, '');
  return model.reasoning?.classes?.singular?.[normalized]
    ?? (normalized.endsWith('ies') ? `${normalized.slice(0, -3)}y`
      : normalized.endsWith('s') ? normalized.slice(0, -1) : normalized);
}

function propertyPredicate(surface, value, model) {
  const requested = normalizedPhrase(surface).replaceAll(' ', '_');
  return Object.entries(model.reasoning?.propertyValues ?? {}).find(([predicate, values]) =>
    predicate.replaceAll(' ', '_') === requested && values.includes(value))?.[0];
}

function assertionFrom(text, model, entities, ruleNumber) {
  const normalized = normalizedPhrase(text);
  let match;
  if ((match = normalized.match(/^(?:every (.+?) fears|all (.+?) fear|(.+?) are afraid of) (.+)$/u))) {
    const sourceClass = match[1] ?? match[2] ?? match[3];
    const fearedClass = singularClass(match[4], model);
    return {
      kind: 'rule',
      id: `session:r${ruleNumber}`,
      when: [['?entity', 'is_a', singularClass(sourceClass, model)]],
      then: ['?entity', 'afraid_of', fearedClass],
      source: `session:rule:${ruleNumber + 1}`,
      sourceText: text,
      session: true,
    };
  }
  if ((match = normalized.match(/^(.+?) (?:went(?: back)?|travelled|traveled|moved|journeyed) to (?:the )?(.+?)(?: there)?$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'located_in',
      object: ensureEntity(match[2], 'place', model, entities), sourceText: text, transition: 'move',
    };
  }
  if ((match = normalized.match(/^(.+?) (?:grabbed|got|took|picked up) (?:a |an |the )?(.+?)(?: there)?$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'owns',
      object: ensureEntity(match[2], 'object', model, entities), sourceText: text, transition: 'acquire',
    };
  }
  if ((match = normalized.match(/^(.+?) (?:dropped|left|discarded|put down) (?:a |an |the )?(.+?)(?: there)?$/u))) {
    return {
      kind: 'transition', transition: 'release', subject: ensureEntity(match[1], 'entity', model, entities),
      object: ensureEntity(match[2], 'object', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) (?:is (?:located )?(?:in|at)|can be found (?:in|at)|stays (?:in|at)|occupies) (.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'located_in',
      object: ensureEntity(match[2], 'place', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) (?:belongs to the (.+?) class|is classified as (?:a|an) (.+)|is one of the (.+))$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'is_a',
      value: singularClass(match[2] ?? match[3] ?? match[4], model), sourceText: text,
    };
  }
  if ((match = normalized.match(/^the category of (.+?) is (.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'is_a',
      value: singularClass(match[2], model), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) (?:is able|has the ability) to ([a-z][a-z0-9_-]*)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'can',
      value: match[2], sourceText: text,
    };
  }
  if ((match = normalized.match(/^(?:the )?([a-z][a-z0-9_-]*) of (.+?) is ([a-z][a-z0-9_-]*)$/u))) {
    const predicate = propertyPredicate(match[1], match[3], model);
    if (predicate) return {
      subject: ensureEntity(match[2], 'entity', model, entities), predicate,
      value: match[3], sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) has ([a-z][a-z0-9_-]*) ([a-z][a-z0-9_-]*)$/u))) {
    const predicate = propertyPredicate(match[2], match[3], model);
    if (predicate) return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate,
      value: match[3], sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) (?:owns|has|carries) (?:a |an |the )?(.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'owns',
      object: ensureEntity(match[2], 'object', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(?:the )?(.+?) belongs to (.+)$/u))) {
    return {
      subject: ensureEntity(match[2], 'entity', model, entities), predicate: 'owns',
      object: ensureEntity(match[1], 'object', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) can ([a-z][a-z0-9_-]*)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'can',
      value: match[2], sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) is ([a-z][a-z0-9_-]*)$/u))) {
    const property = match[2];
    for (const [predicate, values] of Object.entries(model.reasoning?.propertyValues ?? {})) {
      if (!values.includes(property)) continue;
      return {
        subject: ensureEntity(match[1], 'entity', model, entities), predicate,
        value: property, sourceText: text,
      };
    }
  }
  if ((match = normalized.match(/^(.+?) is (?:a|an) (.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'is_a',
      value: match[2], sourceText: text,
    };
  }
  return undefined;
}

export function splitEpisode(text) {
  if (typeof text !== 'string') throw new SessionInputValidationError('Runtime input must be a string.');
  const inputBytes = Buffer.byteLength(text, 'utf8');
  requireCapacity('inputBytes', inputBytes, SESSION_LIMITS.maximumInputBytes);
  return text.match(/[^.!?]+[.!?]?/gu)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

export function validateSessionRequest(text, context = {}) {
  validateSessionContext(context);
  const segments = splitEpisode(text);
  requireCapacity('segments', segments.length, SESSION_LIMITS.maximumSegments);
  for (const segment of segments) requireCapacity(
    'segmentBytes', Buffer.byteLength(segment, 'utf8'), SESSION_LIMITS.maximumSegmentBytes,
  );
  return segments;
}

export function compileSessionEpisode(text, model, context = {}) {
  const boundedContext = sessionContextSnapshot(context);
  const previous = boundedContext.session;
  const entities = previous.entities.map((entity) => ({ ...entity, names: [...entity.names] }));
  let facts = previous.facts.map((fact) => ({ ...fact, provenance: [...fact.provenance] }));
  const rules = (previous.rules ?? []).map((rule) => ({
    ...rule, when: rule.when.map((premise) => [...premise]), then: [...rule.then],
  }));
  const history = (previous.history ?? []).map((event) => ({ ...event }));
  const segments = validateSessionRequest(text, boundedContext);
  const final = segments.at(-1) ?? '';
  const finalWords = normalizedPhrase(final).split(' ');
  const questionStarters = new Set(['where', 'what', 'who', 'which', 'why', 'how', 'is', 'does', 'can', 'will', 'would', 'in', 'tell', 'show']);
  const hasQuestion = final.endsWith('?') || questionStarters.has(finalWords[0]);
  const statementSegments = hasQuestion ? segments.slice(0, -1) : segments;
  const learned = [];
  const learnedRules = [];
  const unsupportedStatements = [];
  let nextFactNumber = facts.reduce((highest, fact) => {
    const number = Number.parseInt(fact.id.match(/^session:f(\d+)$/u)?.[1] ?? '-1', 10);
    return Math.max(highest, number + 1);
  }, 0);
  let nextEventNumber = history.reduce((highest, event) => Math.max(highest, (event.sequence ?? -1) + 1), 0);
  const currentLocation = (subject) => facts.findLast((fact) => fact.subject === subject && fact.predicate === 'located_in');
  const addFact = (assertion) => {
    const duplicate = facts.some((fact) => fact.subject === assertion.subject
      && fact.predicate === assertion.predicate
      && (fact.object ?? fact.value) === (assertion.object ?? assertion.value));
    if (duplicate && assertion.predicate !== 'located_in') return undefined;
    if (assertion.predicate === 'located_in') {
      facts = facts.filter((fact) => !(fact.session && fact.subject === assertion.subject
        && fact.predicate === 'located_in'));
    }
    const fact = {
      id: `session:f${nextFactNumber}`,
      subject: assertion.subject,
      predicate: assertion.predicate,
      ...(assertion.object ? { object: assertion.object } : { value: assertion.value }),
      provenance: [`session:${nextFactNumber + 1}`],
      sourceText: assertion.sourceText,
      session: true,
    };
    facts.push(fact);
    requireCapacity('facts', facts.length, SESSION_LIMITS.maximumFacts);
    learned.push(fact);
    nextFactNumber += 1;
    if (fact.predicate === 'located_in') {
      history.push({
        id: `session:event:${nextEventNumber}`, sequence: nextEventNumber,
        subject: fact.subject, predicate: fact.predicate, object: fact.object,
        factId: fact.id, provenance: fact.provenance, sourceText: fact.sourceText,
      });
      requireCapacity('historyEvents', history.length, SESSION_LIMITS.maximumHistoryEvents);
      nextEventNumber += 1;
    }
    return fact;
  };
  for (const segment of statementSegments) {
    const assertion = assertionFrom(segment, model, entities, rules.length);
    if (!assertion) {
      unsupportedStatements.push(segment);
      continue;
    }
    if (assertion.kind === 'rule') {
      const duplicate = rules.some((rule) => JSON.stringify(rule.when) === JSON.stringify(assertion.when)
        && JSON.stringify(rule.then) === JSON.stringify(assertion.then));
      if (!duplicate) {
        rules.push(assertion);
        requireCapacity('rules', rules.length, SESSION_LIMITS.maximumRules);
        learnedRules.push(assertion);
      }
      continue;
    }
    if (assertion.kind === 'transition' && assertion.transition === 'release') {
      facts = facts.filter((fact) => !(fact.session && fact.subject === assertion.subject
        && fact.predicate === 'owns' && fact.object === assertion.object));
      const location = currentLocation(assertion.subject);
      if (location) addFact({
        subject: assertion.object, predicate: 'located_in', object: location.object,
        sourceText: assertion.sourceText,
      });
      continue;
    }
    addFact(assertion);
    requireCapacity('entities', entities.length, SESSION_LIMITS.maximumEntities);
    if (assertion.transition === 'move') {
      const carriedObjects = facts.filter((fact) => fact.subject === assertion.subject && fact.predicate === 'owns');
      for (const possession of carriedObjects) addFact({
        subject: possession.object, predicate: 'located_in', object: assertion.object,
        sourceText: assertion.sourceText,
      });
    }
    if (assertion.transition === 'acquire') {
      const location = currentLocation(assertion.subject);
      if (location) addFact({
        subject: assertion.object, predicate: 'located_in', object: location.object,
        sourceText: assertion.sourceText,
      });
    }
  }
  validateSessionContext({ session: { entities, facts, rules, history } });
  return {
    question: hasQuestion ? final.replace(/[.!?]+$/u, '').trim() : undefined,
    session: { entities, facts, rules, history },
    learned,
    learnedRules,
    unsupportedStatements,
    segments,
  };
}

export function modelWithSession(model, session) {
  return {
    ...model,
    entities: [...model.entities, ...(session?.entities ?? [])],
    facts: [...model.facts, ...(session?.facts ?? [])],
    rules: [...model.rules, ...(session?.rules ?? [])],
  };
}
