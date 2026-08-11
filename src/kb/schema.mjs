import { createHash } from 'node:crypto';

export const KB_SCHEMA_VERSION = '1';
export const KB_RECORD_TYPES = Object.freeze(new Set([
  'term', 'lexeme', 'assertion', 'event', 'roleEdge', 'semanticFrame',
  'rule', 'constraint', 'context', 'provenance', 'alignment', 'retraction', 'plan',
]));

const TERM_KINDS = new Set([
  'entity', 'concept', 'predicate', 'role', 'eventType', 'unit',
  'scalarType', 'literalType', 'lexicalSense',
]);
const EPISTEMIC_STATUSES = new Set([
  'asserted', 'strict', 'default', 'likely', 'possible', 'unlikely', 'contradicted', 'unknown',
]);

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function requireString(record, field) {
  requireValue(typeof record[field] === 'string' && record[field].length > 0,
    `${record.recordId ?? 'record'} requires non-empty ${field}.`);
}

export function stableRecordId(namespace, recordType, semanticKey) {
  const digest = createHash('sha256').update(`${namespace}\u0000${recordType}\u0000${semanticKey}`)
    .digest('hex').slice(0, 32);
  return `${recordType}:${namespace}:${digest}`;
}

export function validateCanonicalRecord(record) {
  requireValue(record && typeof record === 'object' && !Array.isArray(record), 'KB record must be an object.');
  requireValue(KB_RECORD_TYPES.has(record.recordType), `Unsupported KB recordType: ${record.recordType}.`);
  requireString(record, 'recordId');
  requireString(record, 'kbNamespace');
  requireValue(record.schemaVersion === KB_SCHEMA_VERSION,
    `${record.recordId} has unsupported schemaVersion ${record.schemaVersion}.`);
  requireValue(Array.isArray(record.provenanceRefs), `${record.recordId} requires provenanceRefs.`);
  if (record.recordType !== 'provenance') {
    requireValue(record.provenanceRefs.length > 0, `${record.recordId} requires non-empty provenanceRefs.`);
  }

  if (record.recordType === 'term') {
    requireValue(TERM_KINDS.has(record.termKind), `${record.recordId} has invalid termKind.`);
    requireString(record, 'canonicalKey');
  } else if (record.recordType === 'lexeme') {
    for (const field of ['language', 'surface', 'lemma', 'partOfSpeech', 'denotes']) requireString(record, field);
  } else if (record.recordType === 'assertion') {
    requireString(record, 'predicate');
    requireValue(Array.isArray(record.arguments) && record.arguments.length >= 1,
      `${record.recordId} requires one or more arguments.`);
    requireValue(['positive', 'negative'].includes(record.polarity), `${record.recordId} has invalid polarity.`);
    requireValue(EPISTEMIC_STATUSES.has(record.epistemicStatus),
      `${record.recordId} has invalid epistemicStatus.`);
  } else if (record.recordType === 'event') {
    requireString(record, 'eventType');
    requireString(record, 'contextRef');
  } else if (record.recordType === 'roleEdge') {
    for (const field of ['eventRef', 'role', 'filler']) requireString(record, field);
  } else if (record.recordType === 'semanticFrame') {
    requireString(record, 'evokes');
    requireValue(Array.isArray(record.roles), `${record.recordId} requires roles.`);
  } else if (record.recordType === 'rule') {
    requireValue(['strict', 'default', 'causal', 'temporal', 'constraint'].includes(record.semantics),
      `${record.recordId} has unsupported rule semantics.`);
    requireValue(Array.isArray(record.when) && record.when.length > 0, `${record.recordId} requires when.`);
    requireValue(Array.isArray(record.then) && record.then.length > 0, `${record.recordId} requires then.`);
    const positiveVariables = new Set(record.when.flatMap((atom) => atom.arguments ?? [])
      .filter((value) => typeof value === 'string' && value.startsWith('?')));
    for (const variable of record.then.flatMap((atom) => atom.arguments ?? [])
      .filter((value) => typeof value === 'string' && value.startsWith('?'))) {
      requireValue(positiveVariables.has(variable), `${record.recordId} has unsafe head variable ${variable}.`);
    }
  } else if (record.recordType === 'provenance') {
    requireString(record, 'sourceId');
    requireString(record, 'sourceChecksum');
    requireString(record, 'transformation');
  } else if (record.recordType === 'alignment') {
    for (const field of ['left', 'relation', 'right']) requireString(record, field);
  } else if (record.recordType === 'retraction') {
    requireString(record, 'targetRecord');
    requireString(record, 'contextRef');
  } else if (record.recordType === 'plan') {
    requireString(record, 'goalPattern');
    requireValue(Array.isArray(record.steps) && record.steps.length > 0, `${record.recordId} requires steps.`);
  }
  return record;
}

export function validateCanonicalRecords(records) {
  const ids = new Set();
  for (const record of records) {
    validateCanonicalRecord(record);
    requireValue(!ids.has(record.recordId), `Duplicate KB recordId: ${record.recordId}.`);
    ids.add(record.recordId);
  }
  const provenanceIds = new Set(records.filter((record) => record.recordType === 'provenance')
    .map((record) => record.recordId));
  const termIds = new Set(records.filter((record) => record.recordType === 'term').map((record) => record.recordId));
  const predicateIds = new Set(records.filter((record) => record.recordType === 'term' && record.termKind === 'predicate')
    .map((record) => record.recordId));
  const contextIds = new Set(records.filter((record) => record.recordType === 'context').map((record) => record.recordId));
  const eventIds = new Set(records.filter((record) => record.recordType === 'event').map((record) => record.recordId));
  const requireReference = (set, reference, owner, role) => {
    requireValue(set.has(reference), `${owner} references missing ${role} ${reference}.`);
  };
  for (const record of records) {
    for (const provenanceRef of record.provenanceRefs) {
      requireValue(provenanceIds.has(provenanceRef),
        `${record.recordId} references missing provenance ${provenanceRef}.`);
    }
    if (record.recordType === 'term') {
      for (const parent of record.parentTerms ?? []) requireReference(termIds, parent, record.recordId, 'parent term');
    } else if (record.recordType === 'lexeme') {
      requireReference(termIds, record.denotes, record.recordId, 'denoted term');
    } else if (record.recordType === 'assertion') {
      requireReference(predicateIds, record.predicate, record.recordId, 'predicate term');
      for (const argument of record.arguments) {
        if (typeof argument === 'string' && argument.startsWith('term:')) {
          requireReference(termIds, argument, record.recordId, 'argument term');
        }
      }
      if (record.contextRef) requireReference(contextIds, record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'context') {
      for (const parent of record.inherits ?? []) requireReference(contextIds, parent, record.recordId, 'parent context');
      if (record.parentContextRef) requireReference(contextIds, record.parentContextRef, record.recordId, 'parent context');
    } else if (record.recordType === 'event') {
      if (record.eventType.startsWith('term:')) requireReference(termIds, record.eventType, record.recordId, 'event type');
      requireReference(contextIds, record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'roleEdge') {
      requireReference(eventIds, record.eventRef, record.recordId, 'event');
      if (record.role.startsWith('term:')) requireReference(termIds, record.role, record.recordId, 'role term');
      if (record.filler.startsWith('term:')) requireReference(termIds, record.filler, record.recordId, 'filler term');
    } else if (record.recordType === 'rule') {
      for (const atom of [...record.when, ...record.then, ...(record.unless ?? [])]) {
        requireReference(predicateIds, atom.predicate, record.recordId, 'rule predicate term');
        for (const argument of atom.arguments ?? []) {
          if (typeof argument === 'string' && argument.startsWith('term:')) {
            requireReference(termIds, argument, record.recordId, 'rule argument term');
          }
        }
      }
      if (record.contextRef) requireReference(contextIds, record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'retraction') {
      requireReference(ids, record.targetRecord, record.recordId, 'retraction target');
      requireReference(contextIds, record.contextRef, record.recordId, 'context');
    }
  }
  return Object.freeze({ records: records.length, recordIds: ids, provenanceIds });
}
