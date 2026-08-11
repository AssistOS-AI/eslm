const MAX_ONTOLOGY_ENTRIES = 4096;
const MAX_DERIVED_FRAMES = 16384;

function normalized(value) {
  return value.normalize('NFKD').replace(/\p{M}+/gu, '').toLocaleLowerCase('en-US')
    .replace(/[’']s\b/gu, ' possessive ').replace(/[’']/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function entity(value) {
  return normalized(value).replace(/^(?:the|a|an|there are|the amount of)\s+/u, '')
    .replace(/^(?:amount|number|surface) of\s+/u, '').replace(/^(?:the|a|an)\s+/u, '')
    .replace(/\s+(?:that|which|and)\s.*$/u, '').trim();
}

function validateOntology(ontology) {
  if (ontology?.schema !== 'semantic-compatibility-ontology-v1') throw new Error('Invalid semantic compatibility ontology.');
  for (const name of ['binaryConstructions', 'prefixComparatives', 'unaryConstructions', 'conditionalMotions',
    'sameLevelMarkers', 'levelChanges', 'relationReversals', 'propositionConstructions',
    'possessiveConstructions', 'objectPropertyConstructions', 'orientationTurns',
    'alternativeComparatives', 'choiceContrasts', 'rentalConstructions', 'ownershipComparatives',
    'numericCompatibility', 'materialConstructions', 'actionConstructions', 'affordances', 'implications']) {
    if (!Array.isArray(ontology[name])) throw new Error(`Semantic compatibility ontology requires ${name}.`);
  }
  const entries = Object.keys(ontology.relations ?? {}).length
    + Object.values(ontology).filter(Array.isArray).reduce((sum, values) => sum + values.length, 0);
  if (entries > MAX_ONTOLOGY_ENTRIES) throw new Error('Semantic compatibility ontology exceeds its entry budget.');
  return ontology;
}

function frameSignature(frame) {
  return frame.kind === 'binary'
    ? `${frame.relation}\0${frame.subject}\0${frame.object}\0${frame.polarity}`
    : frame.kind === 'unary' ? `${frame.concept}\0${frame.subject}`
      : `${frame.kind}\0${frame.concept}\0${frame.polarity ?? 1}`;
}

function parseInfix(sentence, construction) {
  const marker = normalized(construction.marker);
  const index = sentence.indexOf(` ${marker} `);
  if (index === -1) return undefined;
  const subject = entity(sentence.slice(0, index));
  const object = entity(sentence.slice(index + marker.length + 2));
  if (!subject || !object) return undefined;
  return { kind: 'binary', relation: construction.relation, polarity: construction.polarity,
    subject: construction.argumentOrder === 'reverse' ? object : subject,
    object: construction.argumentOrder === 'reverse' ? subject : object, source: sentence };
}

function parseConditionalMotion(sentence, construction) {
  if (!sentence.startsWith('if ')) return undefined;
  const moveMarker = ` ${normalized(construction.moveMarker)} `;
  const moveAt = sentence.indexOf(moveMarker);
  if (moveAt === -1) return undefined;
  const clauseAt = sentence.indexOf(' , ', moveAt + moveMarker.length);
  if (clauseAt === -1) return undefined;
  const moved = entity(sentence.slice(moveAt + moveMarker.length, clauseAt));
  const outcomeClause = sentence.slice(clauseAt + 3);
  for (const outcome of construction.outcomes) {
    const marker = ` ${normalized(outcome.marker)}`;
    if (!outcomeClause.endsWith(marker)) continue;
    const dependent = entity(outcomeClause.slice(0, -marker.length));
    if (moved && dependent) return { kind: 'binary', relation: outcome.relation, polarity: outcome.polarity,
      subject: moved, object: dependent, source: sentence };
  }
  return undefined;
}

function derivedEventFrames(sentences, ontology) {
  const frames = [];
  for (const sentence of sentences) {
    for (const construction of ontology.conditionalMotions) {
      const frame = parseConditionalMotion(sentence, construction);
      if (frame) frames.push(frame);
    }
  }
  for (let index = 0; index + 1 < sentences.length; index += 1) {
    const initial = sentences[index];
    const event = sentences[index + 1];
    for (const markerText of ontology.sameLevelMarkers) {
      const marker = ` ${normalized(markerText)}`;
      const markerAt = initial.indexOf(marker);
      if (markerAt === -1) continue;
      const pair = initial.slice(0, markerAt).replace(/^the /u, '').split(' and ').map(entity);
      if (pair.length !== 2 || pair.some((item) => !item)) continue;
      for (const change of ontology.levelChanges) {
        const suffix = ` ${normalized(change.marker)}`;
        if (!event.endsWith(suffix)) continue;
        const moved = entity(event.slice(0, -suffix.length).replace(/^then /u, ''));
        const stationary = pair.find((item) => item !== moved);
        if (stationary) frames.push({ kind: 'binary', relation: change.relation, polarity: change.polarity,
          subject: moved, object: stationary, source: `${initial}. ${event}` });
      }
    }
  }
  return frames;
}

function parsePrefixComparative(sentence, construction) {
  const prefix = normalized(construction.prefix);
  if (!sentence.startsWith(`${prefix} `)) return undefined;
  const remainder = sentence.slice(prefix.length + 1);
  const separator = ` ${normalized(construction.separator)} `;
  const index = remainder.indexOf(separator);
  if (index === -1) return undefined;
  const subject = entity(remainder.slice(0, index));
  const object = entity(remainder.slice(index + separator.length));
  if (!subject || !object) return undefined;
  return { kind: 'binary', relation: construction.relation, polarity: construction.polarity,
    subject, object, source: sentence };
}

function parseUnary(sentence, construction) {
  const suffix = normalized(construction.suffix);
  if (!sentence.endsWith(` ${suffix}`)) return undefined;
  const subject = entity(sentence.slice(0, -(suffix.length + 1)));
  return subject ? { kind: 'unary', concept: construction.concept, subject, source: sentence } : undefined;
}

function alternative(value) {
  return entity(value).split(' ').filter(Boolean).at(-1);
}

function parseAlternativeComparative(sentence, construction) {
  const prefix = ` ${normalized(construction.prefix)} `;
  const prefixAt = sentence.indexOf(prefix);
  if (prefixAt === -1) return undefined;
  const remainder = sentence.slice(prefixAt + prefix.length);
  const separator = ` ${normalized(construction.separator)} `;
  const separatorAt = remainder.indexOf(separator);
  if (separatorAt === -1) return undefined;
  const subject = alternative(remainder.slice(0, separatorAt));
  const object = alternative(remainder.slice(separatorAt + separator.length));
  return subject && object ? { kind: 'binary', relation: construction.relation, polarity: construction.polarity,
    subject, object, source: sentence } : undefined;
}

function extraRelationFrames(sentence, ontology) {
  const frames = [];
  for (const construction of ontology.alternativeComparatives) {
    const frame = parseAlternativeComparative(sentence, construction);
    if (frame) frames.push(frame);
  }
  for (const construction of ontology.choiceContrasts) {
    const marker = ` ${normalized(construction.marker)} `;
    const at = sentence.indexOf(marker);
    const separator = ` ${normalized(construction.separator)} `;
    const separatorAt = at === -1 ? -1 : sentence.indexOf(separator, at + marker.length);
    if (separatorAt === -1) continue;
    const left = alternative(sentence.slice(at + marker.length, separatorAt));
    const right = alternative(sentence.slice(separatorAt + separator.length));
    if (left && right) frames.push({ kind: 'binary', relation: construction.relation,
      polarity: construction.polarity, subject: left, object: right, source: sentence });
  }
  for (const construction of ontology.rentalConstructions) {
    const marker = ` ${normalized(construction.marker)} `;
    const at = sentence.indexOf(marker);
    const direction = ` ${normalized(construction.direction)} `;
    const directionAt = at === -1 ? -1 : sentence.lastIndexOf(direction);
    if (directionAt === -1) continue;
    const actor = entity(sentence.slice(0, at));
    const counterpart = entity(sentence.slice(directionAt + direction.length));
    if (actor && counterpart) frames.push({ kind: 'binary', relation: construction.relation, polarity: 1,
      subject: construction.provider === 'actor' ? actor : counterpart,
      object: construction.provider === 'actor' ? counterpart : actor, source: sentence });
  }
  for (const construction of ontology.ownershipComparatives) {
    const prefix = ` ${normalized(construction.prefix)} `;
    const at = sentence.indexOf(prefix);
    const separator = ` ${normalized(construction.separator)} `;
    const separatorAt = at === -1 ? -1 : sentence.indexOf(separator, at + prefix.length);
    if (separatorAt === -1) continue;
    const subject = entity(sentence.slice(0, at));
    const object = entity(sentence.slice(separatorAt + separator.length));
    if (subject && object) frames.push({ kind: 'binary', relation: construction.relation,
      polarity: construction.polarity, subject, object, source: sentence });
  }
  const owned = sentence.match(/^the .+ full of .+ that belongs to (.+?) is (bigger|smaller) than that of (.+)$/u);
  if (owned) frames.push({ kind: 'binary', relation: 'relative-quantity', polarity: owned[2] === 'bigger' ? 1 : -1,
    subject: entity(owned[1]), object: entity(owned[3]), source: sentence });
  return frames;
}

export function interpretSemanticFrames(text, sourceOntology) {
  const ontology = validateOntology(sourceOntology);
  const frames = [];
  const sentences = text.split(/[.!?]+/u)
    .map((sentence) => sentence.split(',').map(normalized).filter(Boolean).join(' , ')).filter(Boolean);
  const binary = [...ontology.binaryConstructions].sort((left, right) => right.marker.length - left.marker.length);
  const unary = [...ontology.unaryConstructions].sort((left, right) => right.suffix.length - left.suffix.length);
  for (const sentence of sentences) {
    for (const construction of binary) {
      const frame = parseInfix(sentence, construction);
      if (frame) { frames.push(frame); break; }
    }
    for (const construction of ontology.prefixComparatives) {
      const frame = parsePrefixComparative(sentence, construction);
      if (frame) { frames.push(frame); break; }
    }
    for (const construction of unary) {
      const frame = parseUnary(sentence, construction);
      if (frame) { frames.push(frame); break; }
    }
    for (const construction of ontology.propositionConstructions) {
      if (sentence.includes(normalized(construction.contains))) frames.push({ kind: 'proposition',
        concept: construction.concept, polarity: construction.polarity ?? 1, source: sentence });
    }
    for (const construction of ontology.objectPropertyConstructions) {
      const marker = ` ${normalized(construction.marker)} `;
      const at = sentence.indexOf(marker);
      if (at === -1) continue;
      const object = entity(sentence.slice(at + marker.length));
      if (object) frames.push({ kind: 'unary', concept: construction.concept, subject: object, source: sentence });
    }
    for (const construction of ontology.possessiveConstructions) {
      const suffix = ` possessive ${normalized(construction.role)}`;
      if (!sentence.endsWith(suffix)) continue;
      const copula = sentence.indexOf(' is ');
      if (copula === -1) continue;
      const first = entity(sentence.slice(0, copula));
      const second = entity(sentence.slice(copula + 4, -suffix.length));
      if (!first || !second) continue;
      frames.push({ kind: 'binary', relation: construction.relation, polarity: construction.polarity ?? 1,
        subject: construction.argumentOrder === 'reverse' ? second : first,
        object: construction.argumentOrder === 'reverse' ? first : second, source: sentence });
    }
    frames.push(...extraRelationFrames(sentence, ontology));
  }
  frames.push(...derivedEventFrames(sentences, ontology));
  for (const reversal of ontology.relationReversals) {
    const trigger = normalized(reversal.trigger);
    const event = sentences.find((sentence) => sentence.includes(trigger));
    if (!event) continue;
    const triggerAt = event.indexOf(trigger);
    const actor = entity(event.slice(0, triggerAt));
    const landmark = entity(event.slice(triggerAt + trigger.length).split(' and ')[0]);
    for (const frame of [...frames]) {
      if (frame.kind !== 'binary' || !reversal.relations.includes(frame.relation)) continue;
      if (!([frame.subject, frame.object].includes(actor) && [frame.subject, frame.object].includes(landmark))) continue;
      frame.superseded = true;
      frames.push({ ...frame, superseded: false, polarity: frame.polarity * -1, source: `${frame.source}; ${event}` });
    }
  }
  for (const turn of ontology.orientationTurns) {
    const trigger = normalized(turn.trigger);
    const event = sentences.find((sentence) => sentence.endsWith(trigger));
    if (!event) continue;
    const actor = entity(event.slice(0, -trigger.length));
    for (const frame of [...frames]) {
      if (frame.kind !== 'binary' || frame.relation !== turn.fromRelation || frame.object !== actor) continue;
      frames.push({ ...frame, relation: turn.toRelation, polarity: frame.polarity * turn.polarity,
        source: `${frame.source}; ${event}` });
    }
  }
  return frames.filter((frame) => !frame.superseded);
}

function closure(frames, ontology) {
  const derived = new Map(frames.map((frame) => [frameSignature(frame), { ...frame, proof: [frame.source] }]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of [...derived.values()]) {
      if (item.kind === 'binary') {
        const relation = ontology.relations[item.relation];
        if (relation?.inverse) {
          const inverse = { ...item, relation: relation.inverse.relation, polarity: item.polarity * relation.inverse.polarity,
            subject: item.object, object: item.subject, proof: [...item.proof, `inverse:${item.relation}`] };
          const key = frameSignature(inverse);
          if (!derived.has(key)) {
            if (derived.size >= MAX_DERIVED_FRAMES) throw new Error('Semantic compatibility closure exceeds its frame budget.');
            derived.set(key, inverse); changed = true;
          }
        }
      }
      for (const implication of ontology.implications) {
        if (item.kind !== implication.kind || (item.kind === 'unary' && item.concept !== implication.from)
          || (item.kind === 'binary' && item.relation !== implication.from)) continue;
        const next = item.kind === 'unary' || item.kind === 'proposition' ? { ...item, concept: implication.to,
          polarity: (item.polarity ?? 1) * (implication.polarity ?? 1) }
          : { ...item, relation: implication.to, polarity: item.polarity * (implication.polarity ?? 1),
            subject: implication.swapArguments ? item.object : item.subject,
            object: implication.swapArguments ? item.subject : item.object };
        next.proof = [...item.proof, `implication:${implication.from}->${implication.to}`];
        const key = frameSignature(next);
        if (!derived.has(key)) {
          if (derived.size >= MAX_DERIVED_FRAMES) throw new Error('Semantic compatibility closure exceeds its frame budget.');
          derived.set(key, next); changed = true;
        }
      }
    }
  }
  return [...derived.values()];
}

export function scoreSemanticCompatibility(context, target, sourceOntology) {
  const ontology = validateOntology(sourceOntology);
  const contextFrames = closure(interpretSemanticFrames(context, ontology), ontology);
  const targetFrames = interpretSemanticFrames(target, ontology);
  let score = 0;
  const evidence = [];
  for (const targetFrame of targetFrames) {
    for (const contextFrame of contextFrames) {
      const same = targetFrame.kind === contextFrame.kind
        && (targetFrame.kind === 'proposition' ? targetFrame.concept === contextFrame.concept
          : targetFrame.subject === contextFrame.subject && (targetFrame.kind === 'unary'
            ? targetFrame.concept === contextFrame.concept
            : targetFrame.relation === contextFrame.relation && targetFrame.object === contextFrame.object));
      if (!same) continue;
      const contribution = targetFrame.kind === 'unary' ? 3
        : (targetFrame.polarity ?? 1) === (contextFrame.polarity ?? 1) ? 3 : -3;
      score += contribution;
      evidence.push({ target: targetFrame, context: contextFrame, contribution, proof: contextFrame.proof });
    }
  }
  const contextText = normalized(context);
  const targetText = normalized(target);
  const materialClasses = ontology.materialConstructions
    .filter((item) => contextText.includes(normalized(item.contains))).map((item) => item.materialClass);
  const targetActions = ontology.actionConstructions
    .filter((item) => targetText.includes(normalized(item.contains))).map((item) => item.action);
  for (const materialClass of materialClasses) {
    for (const action of targetActions) {
      const affordance = ontology.affordances.find((item) => item.materialClass === materialClass && item.action === action);
      if (!affordance) continue;
      score += affordance.polarity * 3;
      evidence.push({ materialClass, action, contribution: affordance.polarity * 3,
        proof: [`affordance:${materialClass}->${action}`] });
    }
  }
  for (const policy of ontology.numericCompatibility) {
    if (!targetText.includes(normalized(policy.targetContains))) continue;
    const match = contextText.match(new RegExp(policy.contextPattern, 'u'));
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const compatible = (policy.maximum === undefined || value <= policy.maximum)
      && (policy.minimum === undefined || value >= policy.minimum);
    score += compatible ? 3 : -3;
    evidence.push({ numericPolicy: policy.id, value, contribution: compatible ? 3 : -3,
      proof: [`numeric-constraint:${policy.id}`] });
  }
  return { score, evidence, contextFrames, targetFrames };
}
