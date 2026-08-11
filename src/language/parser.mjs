import { damerauDistance } from '../util.mjs';

function resolveEntityPhrase(words, model, context) {
  const phrase = words.join(' ').replace(/^(the|a|an) /u, '').trim();
  if (['it', 'he', 'she', 'they', 'el', 'ea'].includes(phrase) && context.lastEntity) {
    return { id: context.lastEntity, confidence: 0.65, source: 'discourse' };
  }
  const candidates = [];
  for (const entity of model.entities) {
    for (const name of entity.names) {
      const normalizedName = name.toLocaleLowerCase('en-US').replace(/^(the|a|an) /u, '');
      if (phrase === normalizedName || phrase.endsWith(normalizedName)) candidates.push(entity.id);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return { id: unique[0], confidence: 1, source: 'alias' };
  if (unique.length > 1) return { ambiguous: unique };
  const fuzzy = [];
  for (const candidate of model.entities) {
    for (const name of candidate.names) {
      const alias = name.toLocaleLowerCase('en-US').replace(/^(the|a|an) /u, '');
      if (alias.split(' ').length !== phrase.split(' ').length) continue;
      const distance = damerauDistance(phrase, alias);
      const limit = alias.length >= 7 ? 3 : alias.length >= 5 ? 2 : 1;
      if (distance <= limit) fuzzy.push({ id: candidate.id, distance });
    }
  }
  const bestDistance = Math.min(...fuzzy.map((item) => item.distance));
  const best = [...new Set(fuzzy.filter((item) => item.distance === bestDistance).map((item) => item.id))];
  if (best.length === 1) return { id: best[0], confidence: 0.7, source: 'bounded-name-similarity' };
  if (best.length > 1) return { ambiguous: best };
  return { missing: phrase };
}

function predicateQuery(intent, subject, predicate, object, target = 'object') {
  return { intent, subject, predicate, object, target };
}

function resolvedEntityQuery(resolved, build) {
  if (resolved.id) return build(resolved.id);
  if (resolved.ambiguous) return { status: 'AMBIGUOUS', candidates: resolved.ambiguous };
  return {
    status: 'UNKNOWN', missingEntity: resolved.missing,
    diagnostic: 'The question construction is supported, but the referenced entity is not known in the active session or knowledge bases.',
  };
}

function singularClass(value, model) {
  const normalized = value.replace(/^(?:the|a|an) /u, '').trim();
  return model.reasoning?.classes?.singular?.[normalized]
    ?? (normalized.endsWith('ies') ? `${normalized.slice(0, -3)}y`
      : normalized.endsWith('s') ? normalized.slice(0, -1) : normalized);
}

export function parseQuestion(normalized, model, context = {}) {
  const words = normalized.tokens.filter((token) => !/^[?.!,;:]$/u.test(token));
  const joined = words.join(' ');
  let match;

  if (/^(?:who are you|what are you|tell me who you are)$/u.test(joined)) return { intent: 'system-identity', target: 'meta' };
  if (/^(?:who am i|do you know who i am)$/u.test(joined)) return { intent: 'user-identity', target: 'meta' };
  if (/^(?:what can you do|what do you do|show me what you can do)$/u.test(joined)) return { intent: 'system-capabilities', target: 'meta' };

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
  if ((match = joined.match(/^(?:what color is|which color is|what is the color of|tell me the color of) (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) => ({
      ...predicateQuery('color', id, 'color', undefined, 'value'),
      ...(model.reasoning?.induction?.implicitPredicates?.includes('color') ? { reasoning: 'induction' } : {}),
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
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'is_a', singularClass(match[2], model), 'boolean'));
  }
  if ((match = joined.match(/^does the (.+?) category include (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[2].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'is_a', singularClass(match[1], model), 'boolean'));
  }
  if ((match = joined.match(/^is (.+?) (?:a|an) (.+)$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('yes-no', id, 'is_a', singularClass(match[2], model), 'boolean'));
  }
  if ((match = joined.match(/^(?:who is|what is|what kind of thing is) (.+)$/u))
    || (match = joined.match(/^which class does (.+?) belong to$/u))
    || (match = joined.match(/^how is (.+?) classified$/u))) {
    return resolvedEntityQuery(resolveEntityPhrase(match[1].split(' '), model, context), (id) =>
      predicateQuery('entity-description', id, 'is_a', undefined, 'value'));
  }
  if ((match = joined.match(/^is (.+?) ([a-z][a-z0-9_-]*)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('yes-no', subject.id, 'is_a', match[2], 'boolean');
    return resolvedEntityQuery(subject, () => undefined);
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
