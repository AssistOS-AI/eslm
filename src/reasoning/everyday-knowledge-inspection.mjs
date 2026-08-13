import { editDistance } from '../util.mjs';

const MAXIMUM_INSPECTED_ENTITIES = 50_000;
const MAXIMUM_INSPECTED_FACTS = 250_000;
const MAXIMUM_SUMMARY_SENTENCES = 4;
const MAXIMUM_LISTED_ENTITIES = 64;

function normalized(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function kbIdentities(values) {
  const unique = new Map(values.flatMap((value) => value.kbSources ?? (value.kbId
    ? [{ kbId: value.kbId, version: value.kbVersion }] : [])).filter((value) => value?.kbId)
    .map((value) => [`${value.kbId}\0${value.version ?? ''}`, {
      kbId: value.kbId, ...(value.version ? { version: value.version } : {}),
    }]));
  return [...unique.values()].toSorted((left, right) => left.kbId.localeCompare(right.kbId)
    || String(left.version).localeCompare(String(right.version)));
}

function findEntity(model, surface) {
  const target = normalized(surface);
  const inspectedEntities = model.entities.slice(0, MAXIMUM_INSPECTED_ENTITIES);
  const names = inspectedEntities.flatMap((entity) => entity.names.map((name) => ({ entity, name,
    normalized: normalized(name) })));
  const exact = names.filter((item) => item.normalized === target);
  if (exact.length === 1) return { match: { ...exact[0], corrected: false },
    complete: inspectedEntities.length === model.entities.length };
  const close = names.map((item) => ({ ...item, distance: editDistance(target, item.normalized) }))
    .filter((item) => item.distance <= 1)
    .toSorted((left, right) => left.distance - right.distance || left.normalized.localeCompare(right.normalized));
  const match = close.length === 1 || (close[0] && close[0].distance < close[1]?.distance)
    ? { ...close[0], corrected: true } : undefined;
  return { match, complete: inspectedEntities.length === model.entities.length };
}

function factPhrase(subject, fact) {
  const value = fact.value ?? fact.object;
  if (fact.predicate === 'is_a') return `${subject} is ${/^[aeiou]/iu.test(value) ? 'an' : 'a'} ${value}`;
  if (fact.predicate === 'can') return `${subject} can ${value}`;
  if (fact.predicate === 'known_for') return `${subject} is known for ${value}`;
  if (fact.predicate === 'lived_in') return `${subject} lived in ${value}`;
  if (fact.predicate === 'will_die') return `${subject} will die ${value}`;
  return `${subject}'s ${fact.predicate.replaceAll('_', ' ')} is ${value}`;
}

function provenance(facts) {
  return facts.map((fact) => ({
    fact: fact.id,
    ...(fact.kbId ? { kbId: fact.kbId, kbVersion: fact.kbVersion } : {}),
    source: fact.provenance,
    method: 'grounded-knowledge-summary',
  }));
}

function personClassFacts(facts, entity) {
  return facts.filter((fact) => fact.subject === entity.id && fact.predicate === 'is_a'
    && ['person', 'human', 'man', 'woman', 'philosopher', 'scientist', 'artist', 'writer']
      .includes(normalized(fact.value ?? fact.object)));
}

function summarizeKnowledge(model, inputs, output) {
  const resolution = findEntity(model, inputs.subjectSurface);
  const inspectedFacts = model.facts.slice(0, MAXIMUM_INSPECTED_FACTS);
  const factFrontierComplete = inspectedFacts.length === model.facts.length;
  const consultedKbVersions = kbIdentities(inspectedFacts);
  if (!resolution.match && !resolution.complete) return {
    status: 'RESOURCE_LIMIT',
    answer: `I could not complete the bounded entity search for ${inputs.subjectSurface}.`,
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'entity-resolution-bound', method: 'grounded-knowledge-summary',
    verification: 'incomplete-entity-frontier', witness: {
      requestedSurface: inputs.subjectSurface, inspectedEntities: MAXIMUM_INSPECTED_ENTITIES,
      totalEntities: model.entities.length,
    },
  };
  const match = resolution.match;
  if (!match) return {
    status: 'UNKNOWN',
    answer: `I do not have any admitted facts about ${inputs.subjectSurface} in the loaded knowledge bases.`,
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'unknown-knowledge-entity', method: 'grounded-knowledge-summary',
    verification: 'no-matching-entity', witness: { requestedSurface: inputs.subjectSurface },
  };
  const facts = inspectedFacts.filter((fact) => fact.subject === match.entity.id)
    .toSorted((left, right) => left.predicate.localeCompare(right.predicate)
      || String(left.value ?? left.object).localeCompare(String(right.value ?? right.object)));
  if (facts.length === 0 && !factFrontierComplete) return {
    status: 'RESOURCE_LIMIT',
    answer: `I recognized ${match.name}, but I could not complete the bounded fact search.`,
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'fact-inspection-bound', method: 'grounded-knowledge-summary',
    verification: 'incomplete-fact-frontier', witness: {
      entity: match.entity.id, inspectedFacts: MAXIMUM_INSPECTED_FACTS, totalFacts: model.facts.length,
    },
  };
  if (facts.length === 0) return {
    status: 'UNKNOWN', answer: `I recognize ${match.name}, but the loaded knowledge bases contain no facts I can state about it.`,
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'known-entity-without-facts', method: 'grounded-knowledge-summary',
    verification: 'empty-fact-set', witness: { entity: match.entity.id },
  };
  const subject = match.name;
  const maximumSentences = Math.max(1, Math.min(
    Number(output?.maximumSentences) || MAXIMUM_SUMMARY_SENTENCES,
    MAXIMUM_SUMMARY_SENTENCES,
  ));
  const selectedFacts = facts.slice(0, maximumSentences);
  const sentences = selectedFacts.map((fact) => `${factPhrase(subject, fact)}.`);
  const prefix = match.corrected ? `I interpreted “${inputs.subjectSurface}” as ${subject}. ` : '';
  const bounded = facts.length > selectedFacts.length || !factFrontierComplete
    ? ` This is a bounded summary of ${selectedFacts.length} admitted fact${selectedFacts.length === 1 ? '' : 's'}.`
    : '';
  return {
    status: 'SOLVED', answer: `${prefix}${sentences.join(' ')}${bounded}`,
    values: selectedFacts.map((fact) => fact.value ?? fact.object),
    provenance: provenance(selectedFacts), usedKbVersions: kbIdentities(selectedFacts), consultedKbVersions,
    method: 'grounded-knowledge-summary', verification: 'exact-model-fact-replay',
    witness: { requestedSurface: inputs.subjectSurface, entity: match.entity.id,
      corrected: match.corrected, factIds: selectedFacts.map((fact) => fact.id),
      omittedFacts: facts.length - selectedFacts.length, factFrontierComplete },
  };
}

function listKnowledgeEntities(model, inputs) {
  const inspectedEntities = model.entities.slice(0, MAXIMUM_INSPECTED_ENTITIES);
  const inspectedFacts = model.facts.slice(0, MAXIMUM_INSPECTED_FACTS);
  const entities = inspectedEntities.filter((entity) => inputs.entityClass !== 'person'
    || personClassFacts(inspectedFacts, entity).length > 0);
  const selectedEntities = entities.slice(0, MAXIMUM_LISTED_ENTITIES);
  const names = selectedEntities.map((entity) => entity.names[0]).toSorted();
  const frontierComplete = inspectedEntities.length === model.entities.length
    && inspectedFacts.length === model.facts.length && selectedEntities.length === entities.length;
  const consultedKbVersions = kbIdentities(inspectedFacts);
  if (names.length === 0 && !frontierComplete) return {
    status: 'RESOURCE_LIMIT',
    answer: `I could not complete the bounded search for loaded ${inputs.entityClass} entities.`,
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'entity-list-bound', method: 'grounded-knowledge-entity-list',
    verification: 'incomplete-class-frontier', witness: { entityClass: inputs.entityClass,
      inspectedEntities: inspectedEntities.length, inspectedFacts: inspectedFacts.length },
  };
  if (names.length === 0) return {
    status: 'UNKNOWN', answer: 'The loaded knowledge bases do not currently contain any people I can list.',
    values: [], provenance: [], usedKbVersions: [], consultedKbVersions,
    gap: 'no-entities-in-requested-class', method: 'grounded-knowledge-entity-list',
    verification: 'empty-class-membership', witness: { entityClass: inputs.entityClass },
  };
  const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
  const facts = inspectedFacts.filter((fact) => selectedIds.has(fact.subject)
    && personClassFacts([fact], { id: fact.subject }).length > 0);
  return {
    status: 'SOLVED', answer: `${frontierComplete ? 'The loaded knowledge bases contain facts about'
      : 'Within the bounded loaded frontier, I found facts about'} ${names.join(', ')}.`,
    values: names, provenance: provenance(facts), usedKbVersions: kbIdentities(facts), consultedKbVersions,
    method: 'grounded-knowledge-entity-list', verification: 'exact-model-entity-enumeration',
    witness: { entityClass: inputs.entityClass,
      entityIds: selectedEntities.map((entity) => entity.id), frontierComplete },
  };
}

export function executeEverydayKnowledgeInspection(frame, model) {
  if (!model || !Array.isArray(model.entities) || !Array.isArray(model.facts)) return undefined;
  if (frame.operation === 'knowledge-summary') return summarizeKnowledge(model, frame.inputs, frame.output);
  if (frame.operation === 'knowledge-entity-list') return listKnowledgeEntities(model, frame.inputs);
  return undefined;
}
