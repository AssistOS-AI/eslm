const REFERENCE_KINDS = Object.freeze([
  'provenance', 'term', 'predicate', 'context', 'event', 'record',
]);

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function addBounded(total, increment, maximum, label) {
  const next = total + increment;
  requireValue(Number.isSafeInteger(next) && next <= maximum,
    `${label} exceeds the ${maximum} per-record validation limit.`);
  return next;
}

export function auditRecordStructure(record, limits, label) {
  const stack = [{ value: record, depth: 1 }];
  let nodes = 0;
  let arrayEntries = 0;
  let objectKeys = 0;
  let utf8StringBytes = 0;
  let depth = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    nodes = addBounded(nodes, 1, limits.maximumRecordNodes, `${label} JSON nodes`);
    depth = Math.max(depth, current.depth);
    requireValue(depth <= limits.maximumRecordDepth,
      `${label} JSON depth exceeds the ${limits.maximumRecordDepth} per-record validation limit.`);
    if (typeof current.value === 'string') {
      utf8StringBytes = addBounded(utf8StringBytes, Buffer.byteLength(current.value),
        limits.maximumRecordUtf8StringBytes, `${label} UTF-8 string bytes`);
      continue;
    }
    if (Array.isArray(current.value)) {
      arrayEntries = addBounded(arrayEntries, current.value.length,
        limits.maximumRecordArrayEntries, `${label} JSON array entries`);
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: current.value[index], depth: current.depth + 1 });
      }
      continue;
    }
    if (current.value === null || typeof current.value !== 'object') continue;
    const keys = Object.keys(current.value);
    objectKeys = addBounded(objectKeys, keys.length,
      limits.maximumRecordObjectKeys, `${label} JSON object keys`);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      utf8StringBytes = addBounded(utf8StringBytes, Buffer.byteLength(key),
        limits.maximumRecordUtf8StringBytes, `${label} UTF-8 string bytes`);
      stack.push({ value: current.value[key], depth: current.depth + 1 });
    }
  }
  return Object.freeze({ nodes, arrayEntries, objectKeys, utf8StringBytes, depth });
}

export function createRecordStructureAudit() {
  const maxima = {
    nodes: 0,
    arrayEntries: 0,
    objectKeys: 0,
    utf8StringBytes: 0,
    depth: 0,
  };
  let recordsAudited = 0;
  return Object.freeze({
    observe(metrics) {
      recordsAudited += 1;
      for (const key of Object.keys(maxima)) maxima[key] = Math.max(maxima[key], metrics[key]);
    },
    finish() {
      return Object.freeze({
        status: 'complete',
        recordsAudited,
        maximumObservedNodes: maxima.nodes,
        maximumObservedArrayEntries: maxima.arrayEntries,
        maximumObservedObjectKeys: maxima.objectKeys,
        maximumObservedUtf8StringBytes: maxima.utf8StringBytes,
        maximumObservedDepth: maxima.depth,
      });
    },
  });
}

function recordIdentityKind(record) {
  if (record.recordType === 'provenance') return 'provenance';
  if (record.recordType === 'term') return record.termKind === 'predicate' ? 'predicate' : 'term';
  if (record.recordType === 'context') return 'context';
  if (record.recordType === 'event') return 'event';
  return 'record';
}

function isTermIdentity(kind) {
  return kind === 'term' || kind === 'predicate';
}

function identityMatches(actual, required) {
  if (required === 'record') return actual !== undefined;
  if (required === 'term') return isTermIdentity(actual);
  return actual === required;
}

export function createCanonicalReferenceAudit({ maximumRetainedEntries, maximumRetainedUtf8Bytes }) {
  const declared = new Map();
  const required = Object.fromEntries(REFERENCE_KINDS.map((kind) => [kind, new Map()]));
  let retainedEntries = 0;
  let retainedUtf8Bytes = 0;
  function retain(strings, label) {
    retainedEntries += 1;
    requireValue(retainedEntries <= maximumRetainedEntries,
      `Canonical reference audit exceeds the ${maximumRetainedEntries}-entry global validation limit at ${label}.`);
    retainedUtf8Bytes += strings.reduce((total, value) => total + Buffer.byteLength(value), 0);
    requireValue(Number.isSafeInteger(retainedUtf8Bytes) && retainedUtf8Bytes <= maximumRetainedUtf8Bytes,
      `Canonical reference audit exceeds the ${maximumRetainedUtf8Bytes}-byte global validation limit at ${label}.`);
  }
  function requireReference(kind, reference, owner, role) {
    requireValue(typeof reference === 'string' && reference.length > 0,
      `${owner} references missing ${role} ${reference}.`);
    const references = required[kind];
    if (references.has(reference)) return;
    retain([reference, owner, role], `${owner} ${role}`);
    references.set(reference, { owner, role });
  }
  function addTermReference(reference, owner, role) {
    if (typeof reference === 'string' && reference.startsWith('term:')) {
      requireReference('term', reference, owner, role);
    }
  }
  function addAtomReferences(atom, owner) {
    requireReference('predicate', atom?.predicate, owner, 'rule predicate term');
    for (const argument of atom?.arguments ?? []) addTermReference(argument, owner, 'rule argument term');
  }
  function addRecord(record) {
    requireValue(!declared.has(record.recordId), `Duplicate KB recordId across shards: ${record.recordId}.`);
    const identityKind = recordIdentityKind(record);
    retain([record.recordId, identityKind], record.recordId);
    declared.set(record.recordId, identityKind);
    for (const reference of record.provenanceRefs) {
      requireReference('provenance', reference, record.recordId, 'provenance');
    }
    if (record.recordType === 'term') {
      for (const parent of record.parentTerms ?? []) {
        requireReference('term', parent, record.recordId, 'parent term');
      }
    } else if (record.recordType === 'lexeme') {
      requireReference('term', record.denotes, record.recordId, 'denoted term');
    } else if (record.recordType === 'assertion') {
      requireReference('predicate', record.predicate, record.recordId, 'predicate term');
      for (const argument of record.arguments) addTermReference(argument, record.recordId, 'argument term');
      if (record.contextRef) requireReference('context', record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'context') {
      for (const parent of record.inherits ?? []) {
        requireReference('context', parent, record.recordId, 'parent context');
      }
      if (record.parentContextRef) {
        requireReference('context', record.parentContextRef, record.recordId, 'parent context');
      }
    } else if (record.recordType === 'event') {
      addTermReference(record.eventType, record.recordId, 'event type');
      requireReference('context', record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'roleEdge') {
      requireReference('event', record.eventRef, record.recordId, 'event');
      addTermReference(record.role, record.recordId, 'role term');
      addTermReference(record.filler, record.recordId, 'filler term');
    } else if (record.recordType === 'rule') {
      for (const atom of [...record.when, ...record.then, ...(record.unless ?? [])]) {
        addAtomReferences(atom, record.recordId);
      }
      if (record.contextRef) requireReference('context', record.contextRef, record.recordId, 'context');
    } else if (record.recordType === 'retraction') {
      requireReference('record', record.targetRecord, record.recordId, 'retraction target');
      requireReference('context', record.contextRef, record.recordId, 'context');
    }
  }
  function finish() {
    let uniqueRequiredReferences = 0;
    for (const kind of REFERENCE_KINDS) {
      for (const [reference, owner] of required[kind]) {
        uniqueRequiredReferences += 1;
        requireValue(identityMatches(declared.get(reference), kind),
          `${owner.owner} references missing ${owner.role} ${reference}.`);
      }
    }
    return Object.freeze({
      status: 'complete',
      declaredIdentifiers: declared.size,
      uniqueRequiredReferences,
      resolvedReferences: uniqueRequiredReferences,
      retainedEntries,
      maximumRetainedEntries,
      retainedUtf8Bytes,
      maximumRetainedUtf8Bytes,
    });
  }
  return Object.freeze({ addRecord, finish });
}
