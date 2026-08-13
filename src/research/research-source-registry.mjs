import { sha256, stableStringify } from '../util.mjs';

export const RESEARCH_SOURCE_PROTOCOL = 'eslm-research-source-registry-entry-v1';
export const RESEARCH_COMPONENT_PROTOCOL = 'eslm-research-component-registry-entry-v1';
export const RESEARCH_REGISTRY_PROTOCOL = 'eslm-research-source-component-registry-v1';
export const RESEARCH_AUTHORIZATION_PROTOCOL = 'eslm-research-episode-authorization-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;
const SOURCE_STATES = new Set([
  'pilot-approved', 'next-candidate', 'evaluation-only', 'rights-review', 'excluded',
  'tombstoned',
]);
const RIGHTS_STATES = new Set(['approved', 'denied', 'review-required', 'withdrawn']);
const VISIBILITIES = new Set(['training-visible', 'development-visible', 'protected']);

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exact(value, fields, path) {
  record(value, path);
  if (stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 128 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function text(value, path, maximum = 1_024) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function count(value, path, maximum = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function canonicalIdentifiers(value, path, maximum = 64) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || !IDENTIFIER.test(item))
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical identifier array.`);
  }
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function validateSource(source, path) {
  exact(source, [
    'format', 'sourceId', 'revision', 'owner', 'officialUrl', 'citation',
    'independenceGroup', 'identity', 'registryState',
  ], path);
  if (source.format !== RESEARCH_SOURCE_PROTOCOL) throw new TypeError(`${path} protocol is unsupported.`);
  identifier(source.sourceId, `${path}.sourceId`);
  identifier(source.revision, `${path}.revision`);
  text(source.owner, `${path}.owner`, 256);
  text(source.citation, `${path}.citation`, 2_048);
  identifier(source.independenceGroup, `${path}.independenceGroup`);
  try {
    const url = new URL(source.officialUrl);
    if (url.protocol !== 'https:') throw new Error('not HTTPS');
  } catch {
    throw new TypeError(`${path}.officialUrl must be an HTTPS URL.`);
  }
  exact(source.identity, ['sha256', 'bytes', 'mediaType'], `${path}.identity`);
  digest(source.identity.sha256, `${path}.identity.sha256`);
  count(source.identity.bytes, `${path}.identity.bytes`);
  if (source.identity.bytes < 1) throw new TypeError(`${path}.identity.bytes must be positive.`);
  text(source.identity.mediaType, `${path}.identity.mediaType`, 128);
  if (!SOURCE_STATES.has(source.registryState)) throw new TypeError(`${path}.registryState is unknown.`);
}

function validateComponent(component, path) {
  exact(component, [
    'format', 'sourceId', 'componentId', 'revision', 'kind', 'identity', 'rights',
    'visibility', 'projection',
  ], path);
  if (component.format !== RESEARCH_COMPONENT_PROTOCOL) {
    throw new TypeError(`${path} protocol is unsupported.`);
  }
  for (const field of ['sourceId', 'componentId', 'revision', 'kind']) {
    identifier(component[field], `${path}.${field}`);
  }
  exact(component.identity, ['sha256', 'rows'], `${path}.identity`);
  digest(component.identity.sha256, `${path}.identity.sha256`);
  count(component.identity.rows, `${path}.identity.rows`);
  if (component.identity.rows < 1) throw new TypeError(`${path}.identity.rows must be positive.`);
  exact(component.rights, ['state', 'licenseId', 'allowedUses', 'redistribution'], `${path}.rights`);
  if (!RIGHTS_STATES.has(component.rights.state)) throw new TypeError(`${path}.rights.state is unknown.`);
  identifier(component.rights.licenseId, `${path}.rights.licenseId`);
  canonicalIdentifiers(component.rights.allowedUses, `${path}.rights.allowedUses`);
  if (!['allowed', 'aggregate-only', 'metadata-only', 'forbidden'].includes(component.rights.redistribution)) {
    throw new TypeError(`${path}.rights.redistribution is unknown.`);
  }
  if (!Array.isArray(component.visibility) || component.visibility.length < 1
      || component.visibility.length > 32) {
    throw new TypeError(`${path}.visibility must be a bounded non-empty array.`);
  }
  let prior = '';
  let declaredRows = 0;
  let admittedRows = 0;
  for (const [index, mapping] of component.visibility.entries()) {
    exact(mapping, [
      'split', 'visibility', 'rowsDeclared', 'rowsAdmitted',
    ], `${path}.visibility[${index}]`);
    identifier(mapping.split, `${path}.visibility[${index}].split`);
    count(mapping.rowsDeclared, `${path}.visibility[${index}].rowsDeclared`);
    count(mapping.rowsAdmitted, `${path}.visibility[${index}].rowsAdmitted`);
    if (!VISIBILITIES.has(mapping.visibility)
        || mapping.split <= prior) throw new TypeError(`${path}.visibility is not canonical.`);
    if (mapping.rowsAdmitted > mapping.rowsDeclared
        || (mapping.visibility !== 'training-visible' && mapping.rowsAdmitted !== 0)) {
      throw new TypeError(`${path}.visibility admits rows outside training visibility.`);
    }
    declaredRows += mapping.rowsDeclared;
    admittedRows += mapping.rowsAdmitted;
    prior = mapping.split;
  }
  exact(component.projection, [
    'projectionId', 'membershipDigest', 'contentMembershipDigest', 'rows', 'shardCount',
    'shardFormat', 'allowedFields', 'excludedFields', 'privacyReview', 'safetyReview',
  ], `${path}.projection`);
  identifier(component.projection.projectionId, `${path}.projection.projectionId`);
  digest(component.projection.membershipDigest, `${path}.projection.membershipDigest`);
  digest(component.projection.contentMembershipDigest,
    `${path}.projection.contentMembershipDigest`);
  count(component.projection.rows, `${path}.projection.rows`, 1_000_000_000);
  count(component.projection.shardCount, `${path}.projection.shardCount`, 1_000_000);
  if (component.projection.rows < 1 || component.projection.shardCount < 1
      || component.projection.rows > component.identity.rows
      || component.projection.shardCount > component.projection.rows
      || !['json', 'jsonl', 'synthetic-memory'].includes(component.projection.shardFormat)) {
    throw new TypeError(`${path}.projection must declare bounded inert shards.`);
  }
  if (declaredRows !== component.identity.rows || admittedRows !== component.projection.rows) {
    throw new TypeError(`${path} split rows do not reconcile with source and projection membership.`);
  }
  canonicalIdentifiers(component.projection.allowedFields, `${path}.projection.allowedFields`);
  canonicalIdentifiers(component.projection.excludedFields, `${path}.projection.excludedFields`);
  if (component.projection.allowedFields.some((field) =>
    component.projection.excludedFields.includes(field))) {
    throw new TypeError(`${path}.projection allowed and excluded fields must be disjoint.`);
  }
  if (!['passed', 'not-applicable'].includes(component.projection.privacyReview)
      || !['passed', 'not-applicable'].includes(component.projection.safetyReview)) {
    throw new TypeError(`${path}.projection reviews must be passed or not-applicable.`);
  }
}

export function assertResearchSourceRegistry(registry) {
  exact(registry, ['format', 'sources', 'components', 'digest'], 'Research registry');
  if (registry.format !== RESEARCH_REGISTRY_PROTOCOL) throw new TypeError('Research registry protocol is unsupported.');
  if (!Array.isArray(registry.sources) || registry.sources.length < 1
      || !Array.isArray(registry.components) || registry.components.length < 1) {
    throw new TypeError('Research registry sources and components must be non-empty arrays.');
  }
  let priorSource = '';
  const sources = new Map();
  for (const [index, source] of registry.sources.entries()) {
    validateSource(source, `Research source[${index}]`);
    const key = `${source.sourceId}@${source.revision}`;
    if (key <= priorSource) throw new TypeError('Research sources must be unique and canonical.');
    sources.set(key, source);
    priorSource = key;
  }
  let priorComponent = '';
  for (const [index, component] of registry.components.entries()) {
    validateComponent(component, `Research component[${index}]`);
    const key = `${component.sourceId}@${component.revision}:${component.componentId}`;
    if (key <= priorComponent) throw new TypeError('Research components must be unique and canonical.');
    if (!sources.has(`${component.sourceId}@${component.revision}`)) {
      throw new TypeError(`Research component ${component.componentId} has no registered source revision.`);
    }
    priorComponent = key;
  }
  for (const sourceKey of sources.keys()) {
    if (!registry.components.some((component) =>
      `${component.sourceId}@${component.revision}` === sourceKey)) {
      throw new TypeError(`Research source ${sourceKey} has no registered component.`);
    }
  }
  digest(registry.digest, 'Research registry digest');
  const unsigned = { format: registry.format, sources: registry.sources, components: registry.components };
  if (registry.digest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Research registry digest does not match its canonical content.');
  }
  return registry;
}

export function createResearchSourceRegistry({ sources, components }) {
  const unsigned = {
    format: RESEARCH_REGISTRY_PROTOCOL,
    sources: structuredClone(sources).toSorted((left, right) =>
      `${left.sourceId}@${left.revision}`.localeCompare(`${right.sourceId}@${right.revision}`)),
    components: structuredClone(components).toSorted((left, right) =>
      `${left.sourceId}@${left.revision}:${left.componentId}`
        .localeCompare(`${right.sourceId}@${right.revision}:${right.componentId}`)),
  };
  const registry = { ...unsigned, digest: `sha256:${sha256(stableStringify(unsigned))}` };
  assertResearchSourceRegistry(registry);
  return freezeDeep(registry);
}

export function authorizeResearchEpisode(registry, episode) {
  assertResearchSourceRegistry(registry);
  const source = registry.sources.find((item) => item.sourceId === episode?.source?.sourceId
    && item.revision === episode?.source?.revision);
  const component = registry.components.find((item) => item.sourceId === episode?.source?.sourceId
    && item.revision === episode?.source?.revision
    && item.componentId === episode?.source?.componentId);
  const reasons = [];
  if (!source) reasons.push('source-revision-unregistered');
  if (!component) reasons.push('component-unregistered');
  if (source && source.registryState !== 'pilot-approved') reasons.push('source-not-pilot-approved');
  if (component && component.rights.state !== 'approved') reasons.push('component-rights-not-approved');
  if (component && !component.rights.allowedUses.includes('processing-graph-discovery')) {
    reasons.push('analysis-use-not-authorized');
  }
  const mapping = component?.visibility.find((item) => item.split === episode?.source?.split);
  if (!mapping) reasons.push('split-unregistered');
  if (mapping && mapping.visibility !== 'training-visible') reasons.push('split-not-training-visible');
  if (mapping && mapping.rowsAdmitted < 1) reasons.push('split-not-admitted');
  if (episode?.source?.visibility !== 'training-visible') reasons.push('episode-not-training-visible');
  if (component && episode?.source?.projectionId !== component.projection.projectionId) {
    reasons.push('projection-identity-mismatch');
  }
  if (component && episode?.source?.projectionDigest !== component.projection.membershipDigest) {
    reasons.push('projection-membership-mismatch');
  }
  if (component && (episode?.source?.licenseId !== component.rights.licenseId
      || episode?.source?.rightsState !== component.rights.state)) reasons.push('rights-identity-mismatch');
  if (component && episode?.source?.componentDigest !== component.identity.sha256) {
    reasons.push('component-identity-mismatch');
  }
  const canonicalReasons = [...new Set(reasons)].toSorted();
  return freezeDeep({
    format: RESEARCH_AUTHORIZATION_PROTOCOL,
    episodeId: episode?.episodeId ?? 'invalid-episode',
    sourceId: episode?.source?.sourceId ?? 'unknown-source',
    componentId: episode?.source?.componentId ?? 'unknown-component',
    split: episode?.source?.split ?? 'unknown-split',
    allowed: canonicalReasons.length === 0,
    reasons: canonicalReasons,
    analysisUse: 'processing-graph-discovery',
    authority: 'analysis-input-only',
  });
}
