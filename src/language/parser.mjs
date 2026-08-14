import { genericRelationObjectSurface } from './generic-relation-surface.mjs';
import {
  analyzeNominalSurface, boundedNominalSurface, canonicalClassSurface,
} from './nominal-surface.mjs';

function resolveEntityPhrase(words, model, context) {
  const original = words.join(' ').trim();
  const nominal = analyzeNominalSurface(original);
  if (!nominal.accepted) return { invalid: original, nominal };
  const phrase = nominal.surface;
  if (['it', 'he', 'she', 'they'].includes(phrase) && context.lastEntity) {
    return { id: context.lastEntity, confidence: 0.65, source: 'discourse' };
  }
  const candidates = [];
  for (const entity of model.entities) {
    for (const name of entity.names) {
      const normalizedName = boundedNominalSurface(name);
      if (normalizedName && phrase === normalizedName) candidates.push(entity.id);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return { id: unique[0], confidence: 1, source: 'alias' };
  if (unique.length > 1) return { ambiguous: unique };
  return { missing: phrase };
}

const POSSESSION_LOCATION_CONFIDENCE = 0.62;

function matchingEntityIds(surface, model) {
  const target = boundedNominalSurface(surface)?.replace(/^(?:the|a|an) /u, '');
  if (!target) return [];
  const aliases = model.entities.filter((entity) => entity.names.some((name) =>
    boundedNominalSurface(name)?.replace(/^(?:the|a|an) /u, '') === target)).map((entity) => entity.id);
  const typed = model.facts.filter((fact) => fact.predicate === 'is_a'
    && (fact.object ?? fact.value) === target).map((fact) => fact.subject);
  return [...new Set([...aliases, ...typed])];
}

function possessedEntity(owner, headSurface, model) {
  if (!owner) return { missing: cleanPossessiveSurface(headSurface) };
  const candidates = new Set(matchingEntityIds(headSurface, model));
  const possessions = model.facts.filter((fact) => fact.subject === owner
    && fact.predicate === 'owns' && candidates.has(fact.object));
  const objectIds = [...new Set(possessions.map((fact) => fact.object))];
  if (objectIds.length === 1) {
    return {
      id: objectIds[0], confidence: 0.9, source: 'unique-possessive-relation',
      possession: possessions.find((fact) => fact.object === objectIds[0]), owner,
    };
  }
  if (objectIds.length > 1) return { ambiguous: objectIds };
  return { missing: cleanPossessiveSurface(headSurface) };
}

function cleanPossessiveSurface(value) {
  return String(value ?? '').trim().replace(/^(?:the|a|an) /u, '');
}

function resolvePossessiveEntityPhrase(surface, model, context) {
  const normalized = surface.trim();
  let match = normalized.match(/^(?:his|her|their|its) (.+)$/u);
  if (match) return possessedEntity(context.lastEntity, match[1], model);
  match = normalized.match(/^(.+?)(?:'s|’s) (.+)$/u);
  if (!match) {
    const ownerMatches = model.entities.flatMap((entity) => entity.names.flatMap((name) => {
      const alias = boundedNominalSurface(name);
      const prefix = alias ? `${alias}s ` : undefined;
      return prefix && normalized.startsWith(prefix)
        ? [{ owner: entity.id, head: normalized.slice(prefix.length) }] : [];
    }));
    const owners = [...new Set(ownerMatches.map((item) => item.owner))];
    if (owners.length === 1) {
      return possessedEntity(owners[0], ownerMatches.find((item) => item.owner === owners[0]).head, model);
    }
    return owners.length > 1
      ? { ambiguous: owners }
      : resolveEntityPhrase(normalized.split(' '), model, context);
  }
  const owner = resolveEntityPhrase(match[1].split(' '), model, context);
  if (!owner.id) return owner;
  return possessedEntity(owner.id, match[2], model);
}

function possessionLocationQuery(resolved, model) {
  const exact = model.facts.some((fact) => fact.subject === resolved.id
    && fact.predicate === 'located_in');
  if (exact || !resolved.possession || !resolved.owner) {
    return predicateQuery('location', resolved.id, 'located_in', undefined, 'object');
  }
  const ownerLocations = model.facts.filter((fact) => fact.subject === resolved.owner
    && fact.predicate === 'located_in');
  const locations = [...new Set(ownerLocations.map((fact) => fact.object))];
  if (locations.length !== 1) {
    return predicateQuery('location', resolved.id, 'located_in', undefined, 'object');
  }
  const locationFact = ownerLocations.find((fact) => fact.object === locations[0]);
  return {
    ...predicateQuery('location', resolved.id, 'located_in', undefined, 'object'),
    reasoning: 'finite-episodic-possession-location',
    confidence: POSSESSION_LOCATION_CONFIDENCE,
    assumption: 'The possessed entity normally shares the current location of its owner.',
    owner: resolved.owner,
    episodicTask: {
      schema: 'finite-episodic-world-task-v1',
      operations: [
        {
          id: locationFact.id, sequence: 0, kind: 'state', predicate: 'located_in',
          subject: resolved.owner, values: [locationFact.object],
        },
        {
          id: resolved.possession.id, sequence: 1, kind: 'relation-add', relation: 'owns',
          subject: resolved.owner, object: resolved.id,
        },
      ],
      query: {
        kind: 'state-values', predicate: 'located_in', subject: resolved.id, carrierRelation: 'owns',
      },
      policy: {},
    },
  };
}

function predicateQuery(intent, subject, predicate, object, target = 'object') {
  return { intent, subject, predicate, object, target };
}

function resolvedEntityQuery(resolved, build) {
  if (resolved.id) return build(resolved.id);
  if (resolved.ambiguous) return { status: 'AMBIGUOUS', candidates: resolved.ambiguous };
  if (resolved.invalid) return {
    status: 'UNSUPPORTED', invalidNominal: resolved.invalid,
    diagnostic: `The entity surface is unsafe as one nominal phrase (${resolved.nominal.reason}).`,
  };
  return {
    status: 'UNKNOWN', missingEntity: resolved.missing,
    diagnostic: 'The question construction is supported, but the referenced entity is not known in the active session or knowledge bases.',
  };
}

function singularClass(value, model) {
  return canonicalClassSurface(value, model);
}

function classMembershipQuery(subjectSurface, classSurface, model, context) {
  const className = singularClass(classSurface, model);
  if (!className) return {
    status: 'UNSUPPORTED', invalidNominal: classSurface,
    diagnostic: 'The class surface contains protected material or is not one bounded nominal phrase.',
  };
  return resolvedEntityQuery(resolveEntityPhrase(subjectSurface.split(' '), model, context), (id) =>
    predicateQuery('yes-no', id, 'is_a', className, 'boolean'));
}

function declaredProperty(surface, model) {
  const requested = surface.trim().replaceAll(' ', '_');
  return Object.keys(model.reasoning?.propertyValues ?? {}).find((predicate) =>
    predicate.replaceAll(' ', '_') === requested);
}

const RESERVED_RELATION_VERBS = new Set([
  'all', 'and', 'are', 'be', 'been', 'being', 'can', 'could', 'did', 'do', 'does', 'every', 'has', 'have',
  'if', 'is', 'may', 'might', 'must', 'not', 'or', 'should', 'was', 'were', 'will', 'would',
]);

function genericRelationObject(surface, model) {
  const normalized = surface.replace(/^(?:the|a|an) /u, '').trim();
  const safeSurface = genericRelationObjectSurface(normalized);
  if (!safeSurface) return undefined;
  const resolved = resolveEntityPhrase(normalized.split(' '), model, {});
  return resolved.id ?? safeSurface;
}

export function parseQuestion(normalized, model, context = {}) {
  const words = normalized.tokens.filter((token) => !/^[?.!,;:]$/u.test(token));
  const joined = words.join(' ');
  let match;

  if (/^(?:who are you|what are you|tell me who you are)$/u.test(joined)) return { intent: 'system-identity', target: 'meta' };
  if (/^(?:who am i|do you know who i am)$/u.test(joined)) return { intent: 'user-identity', target: 'meta' };
  if (/^(?:what can you do|what do you do|show me what you can do)$/u.test(joined)) return { intent: 'system-capabilities', target: 'meta' };
  if (/^(?:how are you|how are you doing|how have you been|how is it going|what are you doing|what are you up to)$/u.test(joined)) {
    return { intent: 'system-operational-status', target: 'meta' };
  }

  if ((match = joined.match(/^where was (.+?) before (.+)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    const boundary = resolveEntityPhrase(match[2].split(' '), model, context);
    if (!subject.id) return resolvedEntityQuery(subject, () => undefined);
    return resolvedEntityQuery(boundary, (boundaryId) => ({
      intent: 'location-before', subject: subject.id, predicate: 'located_in', before: boundaryId,
      target: 'object', reasoning: 'temporal-predecessor',
    }));
  }

  if ((match = joined.match(/^where (?:is|are) (.+?) living$/u))
    || (match = joined.match(/^where (?:do|does) (.+?) live$/u))) {
    const resolved = resolvePossessiveEntityPhrase(match[1], model, context);
    return resolvedEntityQuery(resolved, () => possessionLocationQuery(resolved, model));
  }
  if ((match = joined.match(/^(?:where is|where can i find|in which place is) (.+?)(?: located)?$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('location', id, 'located_in', undefined, 'object'));
  }
  if ((match = joined.match(/^which place contains (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('location', id, 'located_in', undefined, 'object'));
  }
  if ((match = joined.match(/^who owns (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('owner', undefined, 'owns', id, 'subject'));
  }
  let propertySurface;
  let propertySubject;
  if ((match = joined.match(/^(?:what|which) ([a-z][a-z0-9_-]*) is (.+)$/u))) {
    [, propertySurface, propertySubject] = match;
  } else if ((match = joined.match(/^(?:what is|tell me) the ([a-z][a-z0-9_-]*) of (.+)$/u))) {
    [, propertySurface, propertySubject] = match;
  }
  const property = propertySurface ? declaredProperty(propertySurface, model) : undefined;
  if (property) {
    return resolvedEntityQuery(resolveEntityPhrase(propertySubject.split(' '), model, context), (id) => ({
      ...predicateQuery('property-value', id, property, undefined, 'value'),
      ...(model.reasoning?.induction?.implicitPredicates?.includes(property) ? { reasoning: 'induction' } : {}),
    }));
  }
  if ((match = joined.match(/^(?:what is (.+?) afraid of|what does (.+?) fear|who does (.+?) fear)$/u))) {
    const phrase = match[1] ?? match[2] ?? match[3];
    return resolvedEntityQuery(resolveEntityPhrase(phrase.split(' '), model, context), (id) =>
      predicateQuery('fear-object', id, 'afraid_of', undefined, 'value'));
  }
  if ((match = joined.match(/^(?:what does (.+?) (?:own|have)|which object belongs to (.+)|what is (.+?) carrying)$/u))) {
    const phrase = match[1] ?? match[2] ?? match[3];
    return resolvedEntityQuery(resolveEntityPhrase(phrase.split(' '), model, context), (id) =>
      predicateQuery('possessions', id, 'owns', undefined, 'object'));
  }
  if ((match = joined.match(/^can (.+?) ([a-z][a-z0-9_-]*)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'can', match[2], 'boolean'));
  }
  if ((match = joined.match(/^is (.+?) able to ([a-z][a-z0-9_-]*)$/u))
    || (match = joined.match(/^does (.+?) have the ability to ([a-z][a-z0-9_-]*)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'can', match[2], 'boolean'));
  }
  if ((match = joined.match(/^is ([a-z][a-z0-9_-]*) something (.+?) can do$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[2].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'can', match[1], 'boolean'));
  }
  if ((match = joined.match(/^what is north of (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('relation', undefined, 'north_of', id, 'subject'));
  }
  if ((match = joined.match(/^what could explain why (.+?) is (.+)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) {
      return {
        ...predicateQuery('abductive-explanation', subject.id, 'has_property', match[2], 'hypotheses'),
        reasoning: 'abduction',
      };
    }
    return resolvedEntityQuery(subject, () => undefined);
  }
  if ((match = joined.match(/^(?:who|what) is (?:in|at) (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('contents', undefined, 'located_in', id, 'subject'));
  }
  if ((match = joined.match(/^is (.+?) (?:in|at) (.+)$/u))) {
    const left = resolveEntityPhrase(match[1].split(' '), model, context);
    const right = resolveEntityPhrase(match[2].split(' '), model, context);
    if (!left.id) return resolvedEntityQuery(left, () => undefined);
    return resolvedEntityQuery(right, (rightId) => predicateQuery('yes-no', left.id, 'located_in', rightId, 'boolean'));
  }
  if ((match = joined.match(/^(?:is (.+?) going to die|will (.+?) eventually die)$/u))) {
    const phrase = match[1] ?? match[2];
    return resolvedEntityQuery(resolveEntityPhrase(phrase.split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'will_die', 'eventually', 'boolean'));
  }
  if ((match = joined.match(/^why is (.+?) going to die$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('explanation', subject.id, 'will_die', 'eventually', 'boolean');
    return resolvedEntityQuery(subject, () => undefined);
  }
  if ((match = joined.match(/^is (.+?) likely to ([a-z][a-z0-9_-]*)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) {
      return {
        ...predicateQuery('likelihood', subject.id, 'can', match[2], 'boolean'),
        reasoning: 'induction',
      };
    }
    return resolvedEntityQuery(subject, () => undefined);
  }
  if ((match = joined.match(/^does (.+?) belong to the (.+?) class$/u))
    || (match = joined.match(/^is (.+?) classified as (?:a|an) (.+)$/u))
    || (match = joined.match(/^would you classify (.+?) as (?:a|an) (.+)$/u))) {
    return classMembershipQuery(match[1], match[2], model, context);
  }
  if ((match = joined.match(/^does the (.+?) category include (.+)$/u))) {
    return classMembershipQuery(match[2], match[1], model, context);
  }
  if ((match = joined.match(/^does (.+?) ([a-z][a-z0-9_-]*) (.+)$/u))) {
    const predicate = match[2];
    const object = genericRelationObject(match[3], model);
    if (!RESERVED_RELATION_VERBS.has(predicate) && predicate.length >= 3 && object) {
      return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
        predicateQuery('yes-no', id, predicate, object, 'boolean'));
    }
  }
  if ((match = joined.match(/^is (.+?) (?:a|an) (.+)$/u))) {
    return classMembershipQuery(match[1], match[2], model, context);
  }
  if ((match = joined.match(/^(?:who is|what is|what kind of thing is) (.+)$/u))
    || (match = joined.match(/^which class does (.+?) belong to$/u))
    || (match = joined.match(/^how is (.+?) classified$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('entity-description', id, 'is_a', undefined, 'value'));
  }
  if ((match = joined.match(/^is (.+?) ([a-z][a-z0-9_-]*)$/u))) {
    return classMembershipQuery(match[1], match[2], model, context);
  }
  if ((match = joined.match(/^why is (.+?) (?:in|at) (.+)$/u))) {
    const left = resolveEntityPhrase(match[1].split(' '), model, context);
    const right = resolveEntityPhrase(match[2].split(' '), model, context);
    if (!left.id) return resolvedEntityQuery(left, () => undefined);
    return resolvedEntityQuery(right, (rightId) => predicateQuery('explanation', left.id, 'located_in', rightId, 'boolean'));
  }
  return {
    status: 'UNSUPPORTED',
    diagnostic: 'No supported question construction matched the normalized input.',
    normalized: joined,
  };
}
