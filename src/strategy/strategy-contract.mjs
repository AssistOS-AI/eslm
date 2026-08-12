export const STRATEGY_DESCRIPTOR_PROTOCOL = 'eslm-strategy-descriptor-v1';
export const STRATEGY_REGISTRY_PROTOCOL = 'eslm-strategy-registry-v1';
export const STRATEGY_RUN_PROTOCOL = 'eslm-strategy-result-v1';

export const STRATEGY_STAGES = Object.freeze([
  'runtime.language.interpret',
  'runtime.request.plan',
  'runtime.knowledge.focus',
  'runtime.knowledge.retrieve',
  'runtime.evidence.assess',
  'runtime.method.plan',
  'runtime.reason.execute',
  'runtime.result.verify',
  'runtime.failure.ground',
  'runtime.result.construct',
  'compiler.source.decode',
  'compiler.source.segment',
  'compiler.knowledge.extract',
  'compiler.identity.resolve',
  'compiler.record.standardize',
  'compiler.record.validate',
  'compiler.package.compile',
]);

// V1 exact allowlists are accepted only where the owning executor actually
// checks the selection before doing work. Catalog visibility alone is not an
// execution control.
export const STRATEGY_EXACT_SELECTION_STAGES = Object.freeze([
  'runtime.language.interpret',
  'runtime.request.plan',
  'runtime.knowledge.focus',
  'runtime.evidence.assess',
  'runtime.reason.execute',
  'runtime.result.construct',
]);

export const STRATEGY_EPISTEMIC_ROLES = Object.freeze([
  'interpretation-proposal',
  'request-constraint',
  'retrieval-focus',
  'relevance-estimate',
  'method-candidate',
  'answer-candidate',
  'answer-verifier',
  'presentation-construction',
  'knowledge-normalization',
]);

export const STRATEGY_IMPLEMENTATION_STATES = Object.freeze([
  'coordinated',
  'instrumented-local',
  'planned',
]);

const RESULT_STATUSES = new Set([
  'completed', 'abstained', 'ineligible', 'resource-limit', 'failed', 'invalid-output',
]);
const RESULT_FIELDS = new Set([
  'format', 'strategyId', 'strategyVersion', 'stage', 'status', 'confidence',
  'confidenceKind', 'correlationGroup', 'output', 'reason', 'work', 'truthAuthorized',
]);
const DESCRIPTOR_FIELDS = new Set([
  'format', 'strategyId', 'version', 'stage', 'inputTypes', 'outputTypes', 'preconditions',
  'determinism', 'epistemicRole', 'confidenceKind', 'costModel', 'budgetKeys', 'witnessKind',
  'answerAuthority', 'correlationGroup', 'configurationSchema', 'failureClasses',
  'implementationState',
]);
const MAX_IDENTIFIER_CHARACTERS = 160;
const MAX_DESCRIPTOR_ITEMS = 32;
const MAX_RECEIPT_CHARACTERS = 1_024;
const MAX_RESULT_BYTES = 65_536;
const MAX_INPUT_BYTES = 1_048_576;
const MAX_RESULT_DEPTH = 10;
const MAX_RESULT_ITEMS = 1_024;

function identifier(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IDENTIFIER_CHARACTERS
    || !/^[a-z0-9]+(?::[a-z0-9][a-z0-9-]*)+$/u.test(value)) {
    throw new Error(`${path} must be a bounded namespaced identifier.`);
  }
  return value;
}

function version(value, path) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value)) {
    throw new Error(`${path} must be a positive protocol revision string.`);
  }
  return value;
}

function stringList(value, path, maximum = MAX_DESCRIPTOR_ITEMS) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) {
    throw new Error(`${path} must be a non-empty bounded array.`);
  }
  const result = value.map((item, index) => identifier(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) throw new Error(`${path} must not contain duplicates.`);
  return result;
}

function optionalStringList(value, path) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_DESCRIPTOR_ITEMS) {
    throw new Error(`${path} must be a bounded array.`);
  }
  const result = value.map((item, index) => identifier(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) throw new Error(`${path} must not contain duplicates.`);
  return result;
}

function boundedText(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RECEIPT_CHARACTERS
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${path} must be bounded visible text.`);
  }
  return value;
}

function finiteConfidence(value, path) {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${path} must be a finite number from 0 through 1.`);
  }
  return value;
}

function canonicalValue(value, path = 'Strategy result', depth = 0, seen = new Set()) {
  if (depth > MAX_RESULT_DEPTH) throw new Error(`${path} exceeds its depth limit.`);
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol'
    || typeof value === 'bigint' || typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path} contains a non-JSON value.`);
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) throw new Error(`${path} contains a cycle.`);
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} contains a non-plain object.`);
    }
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (value.length > MAX_RESULT_ITEMS) throw new Error(`${path} exceeds its item limit.`);
    result = value.map((item, index) => canonicalValue(item, `${path}[${index}]`, depth + 1, seen));
  } else {
    const entries = Object.entries(value);
    if (entries.length > MAX_RESULT_ITEMS) throw new Error(`${path} contains too many fields.`);
    result = Object.fromEntries(entries.toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalValue(item, `${path}.${key}`, depth + 1, seen)]));
  }
  seen.delete(value);
  return result;
}

function freezeDeep(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeDeep(child, seen);
  return Object.freeze(value);
}

export function strategyIdentity(value) {
  const descriptor = assertStrategyDescriptor(value);
  return `${descriptor.strategyId}@${descriptor.version}`;
}

export function createStrategyInputSnapshot(value) {
  const canonical = canonicalValue(value, 'Strategy stage input');
  if (Buffer.byteLength(JSON.stringify(canonical), 'utf8') > MAX_INPUT_BYTES) {
    throw new Error(`Strategy stage input exceeds its ${MAX_INPUT_BYTES}-byte limit.`);
  }
  return freezeDeep(canonical);
}

export function assertStrategyDescriptor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.format !== STRATEGY_DESCRIPTOR_PROTOCOL) {
    throw new Error(`Strategy descriptor format must be ${STRATEGY_DESCRIPTOR_PROTOCOL}.`);
  }
  identifier(value.strategyId, 'Strategy descriptor strategyId');
  version(value.version, 'Strategy descriptor version');
  const unknownFields = Object.keys(value).filter((field) => !DESCRIPTOR_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`Strategy descriptor contains unknown fields: ${unknownFields.join(', ')}.`);
  }
  if (!STRATEGY_STAGES.includes(value.stage)) throw new Error(`Unknown strategy stage: ${value.stage}.`);
  stringList(value.inputTypes, 'Strategy descriptor inputTypes');
  stringList(value.outputTypes, 'Strategy descriptor outputTypes');
  optionalStringList(value.preconditions, 'Strategy descriptor preconditions');
  optionalStringList(value.budgetKeys, 'Strategy descriptor budgetKeys');
  if (!STRATEGY_EPISTEMIC_ROLES.includes(value.epistemicRole)) {
    throw new Error(`Unknown strategy epistemic role: ${value.epistemicRole}.`);
  }
  identifier(value.confidenceKind, 'Strategy descriptor confidenceKind');
  if (value.determinism !== 'deterministic') {
    throw new Error('Deployed strategies must declare deterministic execution.');
  }
  identifier(value.costModel, 'Strategy descriptor costModel');
  identifier(value.witnessKind, 'Strategy descriptor witnessKind');
  identifier(value.correlationGroup, 'Strategy descriptor correlationGroup');
  identifier(value.configurationSchema, 'Strategy descriptor configurationSchema');
  stringList(value.failureClasses, 'Strategy descriptor failureClasses');
  if (!STRATEGY_IMPLEMENTATION_STATES.includes(value.implementationState)) {
    throw new Error(`Unknown strategy implementation state: ${value.implementationState}.`);
  }
  if (value.answerAuthority !== 'none' && value.answerAuthority !== 'verified-only') {
    throw new Error('Strategy descriptor answerAuthority must be none or verified-only.');
  }
  if (value.epistemicRole !== 'answer-verifier' && value.answerAuthority !== 'none') {
    throw new Error('Only an answer-verifier strategy may declare verified answer authority.');
  }
  return value;
}

export function createStrategyDescriptor(value) {
  const descriptor = {
    format: STRATEGY_DESCRIPTOR_PROTOCOL,
    strategyId: value.strategyId,
    version: value.version ?? '1',
    stage: value.stage,
    inputTypes: Object.freeze([...(value.inputTypes ?? [])]),
    outputTypes: Object.freeze([...(value.outputTypes ?? [])]),
    preconditions: Object.freeze([...(value.preconditions ?? [])]),
    determinism: value.determinism ?? 'deterministic',
    epistemicRole: value.epistemicRole,
    confidenceKind: value.confidenceKind ?? `${value.epistemicRole}:confidence`,
    costModel: value.costModel,
    budgetKeys: Object.freeze([...(value.budgetKeys ?? [])]),
    witnessKind: value.witnessKind,
    answerAuthority: value.answerAuthority ?? 'none',
    correlationGroup: value.correlationGroup ?? value.strategyId,
    configurationSchema: value.configurationSchema ?? `${value.strategyId}:config`,
    failureClasses: Object.freeze([...(value.failureClasses ?? [
      'failure:ineligible', 'failure:resource-limit', 'failure:invalid-output',
    ])]),
    implementationState: value.implementationState ?? 'instrumented-local',
  };
  assertStrategyDescriptor(descriptor);
  return Object.freeze(descriptor);
}

export function assertStrategyRunResult(value, descriptor) {
  assertStrategyDescriptor(descriptor);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.format !== STRATEGY_RUN_PROTOCOL) {
    throw new Error(`Strategy result format must be ${STRATEGY_RUN_PROTOCOL}.`);
  }
  const unknownFields = Object.keys(value).filter((field) => !RESULT_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`Strategy result contains unknown fields: ${unknownFields.join(', ')}.`);
  }
  if (!value.work || typeof value.work !== 'object' || Array.isArray(value.work)
      || Object.keys(value.work).some((field) => !['reserved', 'consumed'].includes(field))) {
    throw new Error('Strategy result work must contain only reserved and consumed counters.');
  }
  if (value.strategyId !== descriptor.strategyId || value.strategyVersion !== descriptor.version
    || value.stage !== descriptor.stage) {
    throw new Error('Strategy result identity must match its registered descriptor.');
  }
  if (!RESULT_STATUSES.has(value.status)) throw new Error(`Unknown strategy result status: ${value.status}.`);
  finiteConfidence(value.confidence, 'Strategy result confidence');
  if (!Number.isSafeInteger(value.work?.consumed) || value.work.consumed < 0
    || !Number.isSafeInteger(value.work?.reserved) || value.work.reserved < value.work.consumed) {
    throw new Error('Strategy result must report bounded reserved and consumed work.');
  }
  if (value.confidenceKind !== descriptor.confidenceKind) {
    throw new Error('Strategy result confidence kind must match its registered descriptor.');
  }
  if (value.correlationGroup !== descriptor.correlationGroup) {
    throw new Error('Strategy result correlation group must match its registered descriptor.');
  }
  if (value.status === 'completed' && value.output === undefined) {
    throw new Error('A completed strategy result requires an output.');
  }
  if (value.status !== 'completed' && value.reason === undefined) {
    throw new Error('A non-completed strategy result requires a reason.');
  }
  if (value.reason !== undefined) boundedText(value.reason, 'Strategy result reason');
  if (value.truthAuthorized === true && descriptor.answerAuthority !== 'verified-only') {
    throw new Error('A non-verifier strategy cannot authorize answer truth.');
  }
  if (value.truthAuthorized === true && value.status !== 'completed') {
    throw new Error('Only a completed verifier result can authorize answer truth.');
  }
  return value;
}

export function createStrategyRunResult(descriptor, value) {
  const candidate = {
    format: STRATEGY_RUN_PROTOCOL,
    strategyId: descriptor.strategyId,
    strategyVersion: descriptor.version,
    stage: descriptor.stage,
    status: value.status,
    ...(value.confidence === undefined ? {} : { confidence: value.confidence }),
    confidenceKind: descriptor.confidenceKind,
    correlationGroup: descriptor.correlationGroup,
    ...(value.output === undefined ? {} : { output: canonicalValue(value.output) }),
    ...(value.reason === undefined ? {} : { reason: value.reason }),
    work: Object.freeze({ reserved: value.work.reserved, consumed: value.work.consumed }),
    truthAuthorized: value.truthAuthorized === true,
  };
  const canonical = canonicalValue(candidate);
  if (Buffer.byteLength(JSON.stringify(canonical), 'utf8') > MAX_RESULT_BYTES) {
    throw new Error(`Strategy result exceeds its ${MAX_RESULT_BYTES}-byte limit.`);
  }
  assertStrategyRunResult(canonical, descriptor);
  return freezeDeep(canonical);
}
