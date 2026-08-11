import { serializedIndexes } from '../runtime/core-model.mjs';

function termId(value) {
  if (value.startsWith('?')) return value;
  return value.replace(/^term:/u, '').replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '')
    .toLocaleLowerCase('en-US');
}

function assertionValue(record) {
  const [, object] = record.arguments;
  return object;
}

function runtimePredicate(value, termsById) {
  const term = termsById.get(value);
  const semanticName = term?.canonicalKey?.split('/').at(-1) ?? value.replace(/^term:[^:]+:/u, '').replace(/^term:/u, '');
  return semanticName.replace(/([a-z])([A-Z])/gu, '$1_$2').replace(/[^a-z0-9]+/giu, '_')
    .replace(/^_|_$/gu, '').toLocaleLowerCase('en-US');
}

export function projectCanonicalRecords(records, packageManifests = []) {
  const termRecords = records.filter((record) => record.recordType === 'term');
  const termsById = new Map(termRecords.map((record) => [record.recordId, record]));
  const lexemes = records.filter((record) => record.recordType === 'lexeme');
  const names = new Map();
  for (const lexeme of lexemes) names.set(lexeme.denotes, [...(names.get(lexeme.denotes) ?? []), lexeme.surface]);
  const entities = termRecords.filter((record) => ['entity', 'concept'].includes(record.termKind)).map((record) => ({
    id: termId(record.recordId),
    names: [...new Set(names.get(record.recordId) ?? [record.canonicalKey.split('/').at(-1)])],
    kind: record.termKind,
    canonicalRecordId: record.recordId,
  }));
  const entityIdByRecord = new Map(entities.map((entity) => [entity.canonicalRecordId, entity.id]));
  const facts = records.filter((record) => record.recordType === 'assertion' && record.polarity === 'positive')
    .map((record) => {
      const [subject, object] = record.arguments;
      const objectId = entityIdByRecord.get(object);
      const predicate = runtimePredicate(record.predicate, termsById);
      const objectTerm = termsById.get(object);
      const scalarObject = predicate === 'is_a' && objectTerm?.termKind === 'concept'
        ? objectTerm.canonicalKey.split('/').at(-1).toLocaleLowerCase('en-US')
        : undefined;
      return {
        id: record.recordId,
        subject: entityIdByRecord.get(subject) ?? termId(subject),
        predicate,
        ...(scalarObject !== undefined ? { value: scalarObject }
          : objectId ? { object: objectId } : { value: assertionValue(record) }),
        provenance: record.provenanceRefs,
        epistemicStatus: record.epistemicStatus,
        contextRef: record.contextRef,
      };
    });
  const rules = records.filter((record) => record.recordType === 'rule' && record.semantics === 'strict')
    .map((record) => ({
      id: record.recordId,
      when: record.when.map((atom) => [
        entityIdByRecord.get(atom.arguments[0]) ?? termId(atom.arguments[0]),
        runtimePredicate(atom.predicate, termsById),
        entityIdByRecord.get(atom.arguments[1]) ?? atom.arguments[1],
      ]),
      then: [
        entityIdByRecord.get(record.then[0].arguments[0]) ?? termId(record.then[0].arguments[0]),
        runtimePredicate(record.then[0].predicate, termsById),
        entityIdByRecord.get(record.then[0].arguments[1]) ?? record.then[0].arguments[1],
      ],
      source: record.provenanceRefs[0],
    }));
  const model = {
    manifest: {
      format: 'eslm-runtime-projection-v1',
      modelId: packageManifests.length > 0
        ? packageManifests.map((manifest) => `${manifest.kbId}@${manifest.kbVersion}`).join('+')
        : 'eslm-core-empty',
      knowledgeBases: packageManifests.map((manifest) => manifest.kbId),
      benchmarkComparable: packageManifests.length === 0,
    },
    entities,
    facts,
    rules,
    lexicon: { variants: {}, constructions: [] },
    reasoning: {
      deduction: { maxRounds: 8 },
      induction: { enabled: false, predicates: [], implicitPredicates: [], minSupport: 3, minCoverage: 0.7 },
      abduction: { maxHypotheses: 4 },
      classes: { singular: { mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' } },
    },
  };
  model.indexes = serializedIndexes(facts);
  return model;
}
