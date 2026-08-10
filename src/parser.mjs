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
  return { missing: phrase };
}

function predicateQuery(intent, subject, predicate, object, target = 'object') {
  return { intent, subject, predicate, object, target };
}

export function parseQuestion(normalized, model, context = {}) {
  const words = normalized.tokens.filter((token) => !/^[?.!,;:]$/u.test(token));
  const joined = words.join(' ');
  let match;
  let entity;

  if ((match = joined.match(/^(?:where is|where can i find) (.+)$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('location', entity.id, 'located_in', undefined, 'object');
  }
  if ((match = joined.match(/^who owns (.+)$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('owner', undefined, 'owns', entity.id, 'subject');
  }
  if ((match = joined.match(/^what color is (.+)$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('color', entity.id, 'color', undefined, 'value');
  }
  if ((match = joined.match(/^what is (.+?) afraid of$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('fear-object', entity.id, 'afraid_of', undefined, 'value');
  }
  if ((match = joined.match(/^what does (.+?) own$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('possessions', entity.id, 'owns', undefined, 'object');
  }
  if ((match = joined.match(/^can (.+?) ([a-z][a-z0-9_-]*)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('yes-no', subject.id, 'can', match[2], 'boolean');
    entity = subject;
  }
  if ((match = joined.match(/^what is north of (.+)$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('relation', undefined, 'north_of', entity.id, 'subject');
  }
  if ((match = joined.match(/^what could explain why (.+?) is (.+)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) {
      return {
        ...predicateQuery('abductive-explanation', subject.id, 'has_property', match[2], 'hypotheses'),
        reasoning: 'abduction',
      };
    }
    entity = subject;
  }
  if ((match = joined.match(/^(?:who|what) is (?:in|at) (.+)$/u))) {
    entity = resolveEntityPhrase(match[1].split(' '), model, context);
    if (entity.id) return predicateQuery('contents', undefined, 'located_in', entity.id, 'subject');
  }
  if ((match = joined.match(/^is (.+?) (?:in|at) (.+)$/u))) {
    const left = resolveEntityPhrase(match[1].split(' '), model, context);
    const right = resolveEntityPhrase(match[2].split(' '), model, context);
    if (left.id && right.id) return predicateQuery('yes-no', left.id, 'located_in', right.id, 'boolean');
    entity = left.id ? right : left;
  }
  if ((match = joined.match(/^is (.+?) going to die$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('yes-no', subject.id, 'will_die', 'eventually', 'boolean');
    entity = subject;
  }
  if ((match = joined.match(/^why is (.+?) going to die$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('explanation', subject.id, 'will_die', 'eventually', 'boolean');
    entity = subject;
  }
  if ((match = joined.match(/^is (.+?) likely to ([a-z][a-z0-9_-]*)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) {
      return {
        ...predicateQuery('likelihood', subject.id, 'can', match[2], 'boolean'),
        reasoning: 'induction',
      };
    }
    entity = subject;
  }
  if ((match = joined.match(/^is (.+?) (?:a|an) (.+)$/u))) {
    const left = resolveEntityPhrase(match[1].split(' '), model, context);
    if (left.id) return predicateQuery('yes-no', left.id, 'is_a', match[2], 'boolean');
    entity = left;
  }
  if ((match = joined.match(/^is (.+?) ([a-z][a-z0-9_-]*)$/u))) {
    const subject = resolveEntityPhrase(match[1].split(' '), model, context);
    if (subject.id) return predicateQuery('yes-no', subject.id, 'is_a', match[2], 'boolean');
    entity = subject;
  }
  if ((match = joined.match(/^why is (.+?) (?:in|at) (.+)$/u))) {
    const left = resolveEntityPhrase(match[1].split(' '), model, context);
    const right = resolveEntityPhrase(match[2].split(' '), model, context);
    if (left.id && right.id) return predicateQuery('explanation', left.id, 'located_in', right.id, 'boolean');
    entity = left.id ? right : left;
  }
  if (entity?.ambiguous) return { status: 'AMBIGUOUS', candidates: entity.ambiguous };
  return {
    status: 'UNSUPPORTED',
    diagnostic: 'No supported question construction matched the normalized input.',
    normalized: joined,
  };
}
