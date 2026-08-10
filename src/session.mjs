import { tokenize } from './language.mjs';

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

function assertionFrom(text, model, entities, ruleNumber) {
  const normalized = normalizedPhrase(text);
  let match;
  if ((match = normalized.match(/^(.+?) are afraid of (.+)$/u))) {
    const className = singularClass(match[1], model);
    const fearedClass = singularClass(match[2], model);
    return {
      kind: 'rule',
      id: `session:r${ruleNumber}`,
      when: [['?entity', 'is_a', className]],
      then: ['?entity', 'afraid_of', fearedClass],
      source: `session:rule:${ruleNumber + 1}`,
      sourceText: text,
      session: true,
    };
  }
  if ((match = normalized.match(/^(.+?) is (?:in|at) (.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'located_in',
      object: ensureEntity(match[2], 'place', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) owns (?:a |an |the )?(.+)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'owns',
      object: ensureEntity(match[2], 'object', model, entities), sourceText: text,
    };
  }
  if ((match = normalized.match(/^(.+?) can ([a-z][a-z0-9_-]*)$/u))) {
    return {
      subject: ensureEntity(match[1], 'entity', model, entities), predicate: 'can',
      value: match[2], sourceText: text,
    };
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
  return text.match(/[^.!?]+[.!?]?/gu)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

export function compileSessionEpisode(text, model, context = {}) {
  const previous = context.session ?? { entities: [], facts: [], rules: [] };
  const entities = previous.entities.map((entity) => ({ ...entity, names: [...entity.names] }));
  let facts = previous.facts.map((fact) => ({ ...fact, provenance: [...fact.provenance] }));
  const rules = (previous.rules ?? []).map((rule) => ({
    ...rule, when: rule.when.map((premise) => [...premise]), then: [...rule.then],
  }));
  const segments = splitEpisode(text);
  const final = segments.at(-1) ?? '';
  const finalWords = normalizedPhrase(final).split(' ');
  const questionStarters = new Set(['where', 'what', 'who', 'which', 'why', 'how', 'is', 'does', 'can']);
  const hasQuestion = final.endsWith('?') || questionStarters.has(finalWords[0]);
  const statementSegments = hasQuestion ? segments.slice(0, -1) : segments;
  const learned = [];
  const learnedRules = [];
  const unsupportedStatements = [];
  let nextFactNumber = facts.reduce((highest, fact) => {
    const number = Number.parseInt(fact.id.match(/^session:f(\d+)$/u)?.[1] ?? '-1', 10);
    return Math.max(highest, number + 1);
  }, 0);
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
        learnedRules.push(assertion);
      }
      continue;
    }
    const duplicate = facts.some((fact) => fact.subject === assertion.subject
      && fact.predicate === assertion.predicate
      && (fact.object ?? fact.value) === (assertion.object ?? assertion.value));
    if (duplicate) continue;
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
    learned.push(fact);
    nextFactNumber += 1;
  }
  return {
    question: hasQuestion ? final.replace(/[.!?]+$/u, '').trim() : undefined,
    session: { entities, facts, rules },
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
