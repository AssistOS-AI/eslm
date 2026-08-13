import {
  canonicalStrings, digest, exactKeys, identifier, integer, same, sha256, stable,
} from './contract-helpers.mjs';
import {
  evidenceReferenceDigest, observedContentMembershipDigest, observedMembershipDigest,
} from './analysis-lineage-digests.mjs';
import {
  MEANING_CHANGING_CONTROLS,
  PRESERVING_TRANSFORMS,
} from './research-contract.mjs';

const TRANSFORMS = [...PRESERVING_TRANSFORMS, ...MEANING_CHANGING_CONTROLS].toSorted();
const REGISTRY_IDENTIFIER = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;

function registryIdentifier(value, path) {
  if (typeof value !== 'string' || value.length > 128 || !REGISTRY_IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded registry identifier.`);
  }
}

function canonicalRegistryIdentifiers(value, path) {
  if (!Array.isArray(value) || value.length > 64
      || value.some((item) => typeof item !== 'string' || !REGISTRY_IDENTIFIER.test(item))
      || !same(value, [...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical registry-identifier array.`);
  }
}

export function componentKey(value) {
  const revision = value.sourceRevision ?? `${value.sourceId}@${value.revision}`;
  return `${revision}\u0000${value.componentId}`;
}

function assertRegistry(registry) {
  exactKeys(registry, [
    'format', 'digest', 'sources', 'components', 'sourceCount', 'independenceGroupCount',
    'independenceGroups', 'componentCount', 'projectionDigests',
  ], 'Analysis registry');
  if (registry.format !== 'eslm-research-source-component-registry-v1'
      || !Array.isArray(registry.sources) || registry.sources.length < 1
      || !Array.isArray(registry.components) || registry.components.length < 1) {
    throw new TypeError('Analysis registry protocol or collections are invalid.');
  }
  let priorSource = '';
  const sources = new Map();
  for (const [index, source] of registry.sources.entries()) {
    const path = `Analysis registry.sources[${index}]`;
    exactKeys(source, [
      'format', 'sourceId', 'revision', 'owner', 'officialUrl', 'citation',
      'independenceGroup', 'identity', 'registryState',
    ], path);
    if (source.format !== 'eslm-research-source-registry-entry-v1') {
      throw new TypeError(`${path} protocol is unsupported.`);
    }
    for (const field of ['sourceId', 'revision', 'independenceGroup']) {
      registryIdentifier(source[field], `${path}.${field}`);
    }
    let officialUrl;
    try {
      officialUrl = new URL(source.officialUrl);
    } catch {
      officialUrl = null;
    }
    if (typeof source.owner !== 'string' || source.owner.length < 1
        || Buffer.byteLength(source.owner, 'utf8') > 256
        || typeof source.citation !== 'string' || source.citation.length < 1
        || Buffer.byteLength(source.citation, 'utf8') > 2_048
        || officialUrl?.protocol !== 'https:'
        || !['pilot-approved', 'next-candidate', 'evaluation-only', 'rights-review',
          'excluded', 'tombstoned'].includes(source.registryState)) {
      throw new TypeError(`${path} metadata or registry state is invalid.`);
    }
    exactKeys(source.identity, ['sha256', 'bytes', 'mediaType'], `${path}.identity`);
    digest(source.identity.sha256, `${path}.identity.sha256`);
    integer(source.identity.bytes, `${path}.identity.bytes`, 1);
    if (source.identity.bytes > 1_000_000_000
        || typeof source.identity.mediaType !== 'string' || source.identity.mediaType.length < 1
        || Buffer.byteLength(source.identity.mediaType, 'utf8') > 128) {
      throw new TypeError(`${path}.identity.mediaType must be non-empty.`);
    }
    const key = `${source.sourceId}@${source.revision}`;
    if (key <= priorSource) throw new TypeError('Analysis registry sources must be canonical.');
    sources.set(key, source);
    priorSource = key;
  }
  let priorComponent = '';
  for (const [index, component] of registry.components.entries()) {
    const path = `Analysis registry.components[${index}]`;
    exactKeys(component, [
      'format', 'sourceId', 'componentId', 'revision', 'kind', 'identity', 'rights',
      'visibility', 'projection',
    ], path);
    if (component.format !== 'eslm-research-component-registry-entry-v1') {
      throw new TypeError(`${path} protocol is unsupported.`);
    }
    for (const field of ['sourceId', 'componentId', 'revision', 'kind']) {
      registryIdentifier(component[field], `${path}.${field}`);
    }
    exactKeys(component.identity, ['sha256', 'rows'], `${path}.identity`);
    digest(component.identity.sha256, `${path}.identity.sha256`);
    integer(component.identity.rows, `${path}.identity.rows`, 1);
    if (component.identity.rows > 1_000_000_000) {
      throw new TypeError(`${path}.identity.rows exceeds the registry bound.`);
    }
    exactKeys(component.rights, [
      'state', 'licenseId', 'allowedUses', 'redistribution',
    ], `${path}.rights`);
    registryIdentifier(component.rights.licenseId, `${path}.rights.licenseId`);
    canonicalRegistryIdentifiers(component.rights.allowedUses, `${path}.rights.allowedUses`);
    if (!['approved', 'denied', 'review-required', 'withdrawn'].includes(component.rights.state)
        || !['allowed', 'aggregate-only', 'metadata-only', 'forbidden']
          .includes(component.rights.redistribution)) {
      throw new TypeError(`${path}.rights is unsupported.`);
    }
    if (!Array.isArray(component.visibility) || component.visibility.length < 1
        || component.visibility.length > 32) {
      throw new TypeError(`${path}.visibility must be bounded and non-empty.`);
    }
    let priorSplit = '';
    let declaredRows = 0;
    let admittedRows = 0;
    for (const [splitIndex, split] of component.visibility.entries()) {
      const splitPath = `${path}.visibility[${splitIndex}]`;
      exactKeys(split, ['split', 'visibility', 'rowsDeclared', 'rowsAdmitted'], splitPath);
      registryIdentifier(split.split, `${splitPath}.split`);
      integer(split.rowsDeclared, `${splitPath}.rowsDeclared`);
      integer(split.rowsAdmitted, `${splitPath}.rowsAdmitted`);
      if (split.rowsDeclared > 1_000_000_000 || split.rowsAdmitted > 1_000_000_000
          || split.split <= priorSplit
          || !['training-visible', 'development-visible', 'protected'].includes(split.visibility)
          || split.rowsAdmitted > split.rowsDeclared
          || (split.visibility !== 'training-visible' && split.rowsAdmitted !== 0)) {
        throw new TypeError(`${splitPath} is not canonical admitted visibility.`);
      }
      priorSplit = split.split;
      declaredRows += split.rowsDeclared;
      admittedRows += split.rowsAdmitted;
    }
    exactKeys(component.projection, [
      'projectionId', 'membershipDigest', 'contentMembershipDigest', 'rows', 'shardCount',
      'shardFormat', 'allowedFields', 'excludedFields', 'privacyReview', 'safetyReview',
    ], `${path}.projection`);
    registryIdentifier(component.projection.projectionId, `${path}.projection.projectionId`);
    digest(component.projection.membershipDigest, `${path}.projection.membershipDigest`);
    digest(component.projection.contentMembershipDigest,
      `${path}.projection.contentMembershipDigest`);
    integer(component.projection.rows, `${path}.projection.rows`, 1);
    integer(component.projection.shardCount, `${path}.projection.shardCount`, 1);
    canonicalRegistryIdentifiers(component.projection.allowedFields,
      `${path}.projection.allowedFields`);
    canonicalRegistryIdentifiers(component.projection.excludedFields,
      `${path}.projection.excludedFields`);
    if (!['json', 'jsonl', 'synthetic-memory'].includes(component.projection.shardFormat)
        || !['passed', 'not-applicable'].includes(component.projection.privacyReview)
        || !['passed', 'not-applicable'].includes(component.projection.safetyReview)
        || component.projection.rows > 1_000_000_000
        || component.projection.shardCount > 1_000_000
        || declaredRows !== component.identity.rows || admittedRows !== component.projection.rows
        || component.projection.shardCount > component.projection.rows
        || component.projection.allowedFields.some((field) =>
          component.projection.excludedFields.includes(field))) {
      throw new TypeError(`${path}.projection does not reconcile with its component.`);
    }
    const key = componentKey(component);
    if (key <= priorComponent
        || !sources.has(`${component.sourceId}@${component.revision}`)) {
      throw new TypeError('Analysis registry components must be canonical and source-bound.');
    }
    priorComponent = key;
  }
  for (const sourceKey of sources.keys()) {
    if (!registry.components.some((component) =>
      `${component.sourceId}@${component.revision}` === sourceKey)) {
      throw new TypeError('Every analysis registry source must own a component.');
    }
  }
  const unsigned = {
    format: registry.format, sources: registry.sources, components: registry.components,
  };
  const independenceGroups = [...new Set(registry.sources
    .map((item) => item.independenceGroup))].toSorted();
  const projectionDigests = [...new Set(registry.components
    .map((item) => item.projection.membershipDigest))].toSorted();
  if (registry.digest !== sha256(stable(unsigned))
      || registry.sourceCount !== registry.sources.length
      || registry.componentCount !== registry.components.length
      || registry.independenceGroupCount !== independenceGroups.length
      || !same(registry.independenceGroups, independenceGroups)
      || !same(registry.projectionDigests, projectionDigests)) {
    throw new TypeError('Analysis registry summary does not reproduce its canonical content.');
  }
}

function assertWork(work, path) {
  exactKeys(work, ['sourceBytes', 'tokens', 'actions', 'dependencies', 'complete'], path);
  for (const field of ['sourceBytes', 'tokens', 'actions', 'dependencies']) {
    integer(work[field], `${path}.${field}`);
  }
  if (work.sourceBytes < 1 || work.tokens < 1 || typeof work.complete !== 'boolean') {
    throw new TypeError(`${path} must contain positive source/token work and boolean completeness.`);
  }
}

function assertProjectionWork(work, path) {
  exactKeys(work, [
    'featureEvaluations', 'metamorphicTransformsAttempted',
    'metamorphicTransformsApplied', 'appliedTransformIds', 'complete',
  ], path);
  integer(work.featureEvaluations, `${path}.featureEvaluations`, 1);
  integer(work.metamorphicTransformsAttempted, `${path}.metamorphicTransformsAttempted`, 1);
  integer(work.metamorphicTransformsApplied, `${path}.metamorphicTransformsApplied`);
  canonicalStrings(work.appliedTransformIds, `${path}.appliedTransformIds`);
  if (work.featureEvaluations !== 10 || work.metamorphicTransformsAttempted !== 9
      || work.metamorphicTransformsApplied !== work.appliedTransformIds.length
      || work.appliedTransformIds.some((item) => !TRANSFORMS.includes(item))
      || work.complete !== true) {
    throw new TypeError(`${path} does not reproduce the sealed projection work contract.`);
  }
}

function assertMember(member, path, priorRecord) {
  exactKeys(member, [
    'episodeId', 'recordDigest', 'episodeContentDigest', 'featureSemanticDigest',
    'metamorphicAuditDigest', 'split', 'visibility', 'work', 'projectionWork',
  ], path);
  identifier(member.episodeId, `${path}.episodeId`);
  for (const field of [
    'recordDigest', 'episodeContentDigest', 'featureSemanticDigest', 'metamorphicAuditDigest',
  ]) digest(member[field], `${path}.${field}`);
  identifier(member.split, `${path}.split`);
  if (!['training-visible', 'development-visible', 'protected'].includes(member.visibility)
      || member.recordDigest <= priorRecord) {
    throw new TypeError(`${path} is not canonical or uses unsupported visibility.`);
  }
  assertWork(member.work, `${path}.work`);
  assertProjectionWork(member.projectionWork, `${path}.projectionWork`);
}

function assertMembership(analysis) {
  const components = new Map(analysis.registry.components.map((item) => [componentKey(item), item]));
  const coverage = new Map(analysis.coverage.componentProjections
    .map((item) => [componentKey(item), item]));
  if (!Array.isArray(analysis.inputMembership)
      || analysis.inputMembership.length !== components.size) {
    throw new TypeError('Analysis input membership must cover every registry component.');
  }
  const memberships = new Map();
  const episodeIds = new Set();
  let priorKey = '';
  for (const [entryIndex, entry] of analysis.inputMembership.entries()) {
    const path = `Analysis inputMembership[${entryIndex}]`;
    exactKeys(entry, [
      'sourceId', 'revision', 'componentId', 'projectionId', 'rawRows', 'expectedEpisodes',
      'receivedEpisodes', 'expectedMembershipDigest', 'observedMembershipDigest',
      'expectedContentMembershipDigest', 'observedContentMembershipDigest', 'members', 'complete',
    ], path);
    const key = componentKey(entry);
    const component = components.get(key);
    const row = coverage.get(key);
    if (key <= priorKey || !component || !row || !Array.isArray(entry.members)) {
      throw new TypeError('Analysis membership identities must be canonical and registry-bound.');
    }
    let priorRecord = '';
    for (const [memberIndex, member] of entry.members.entries()) {
      assertMember(member, `${path}.members[${memberIndex}]`, priorRecord);
      if (episodeIds.has(member.episodeId)) {
        throw new TypeError('Analysis membership episode identities must be globally unique.');
      }
      episodeIds.add(member.episodeId);
      priorRecord = member.recordDigest;
    }
    const complete = entry.receivedEpisodes === entry.expectedEpisodes
      && entry.observedMembershipDigest === entry.expectedMembershipDigest
      && entry.observedContentMembershipDigest === entry.expectedContentMembershipDigest;
    if (entry.members.length !== entry.receivedEpisodes
        || entry.members.length > 1_000_000
        || entry.projectionId !== component.projection.projectionId
        || entry.rawRows !== component.identity.rows
        || entry.expectedEpisodes !== component.projection.rows
        || entry.expectedMembershipDigest !== component.projection.membershipDigest
        || entry.expectedContentMembershipDigest !== component.projection.contentMembershipDigest
        || entry.receivedEpisodes !== row.received.episodes
        || entry.observedMembershipDigest !== observedMembershipDigest(entry)
        || entry.observedContentMembershipDigest !== observedContentMembershipDigest(entry)
        || entry.complete !== complete) {
      throw new TypeError('Analysis input membership does not reproduce its registry-bound projection.');
    }
    memberships.set(key, new Map(entry.members.map((member) => [member.recordDigest, member])));
    priorKey = key;
  }
  return memberships;
}

function assertEvidence(analysis, memberships) {
  if (!Array.isArray(analysis.evidenceLedger)
      || analysis.evidenceLedger.length !== analysis.work.episodesAnalyzed) {
    throw new TypeError('Analysis evidence ledger must cover every analyzed episode.');
  }
  const evidence = new Map();
  let prior = '';
  for (const [index, entry] of analysis.evidenceLedger.entries()) {
    const path = `Analysis evidenceLedger[${index}]`;
    exactKeys(entry, [
      'evidenceDigest', 'sourceId', 'revision', 'componentId', 'projectionDigest',
      'recordDigest', 'episodeContentDigest', 'featureSemanticDigest',
      'metamorphicAuditDigest', 'independenceGroup',
    ], path);
    for (const field of [
      'evidenceDigest', 'projectionDigest', 'recordDigest', 'episodeContentDigest',
      'featureSemanticDigest', 'metamorphicAuditDigest',
    ]) digest(entry[field], `${path}.${field}`);
    const key = componentKey(entry);
    const member = memberships.get(key)?.get(entry.recordDigest);
    const component = analysis.registry.components.find((item) => componentKey(item) === key);
    const source = analysis.registry.sources.find((item) => item.sourceId === entry.sourceId
      && item.revision === entry.revision);
    if (entry.evidenceDigest <= prior || evidence.has(entry.evidenceDigest)
        || !member || !component || !source
        || entry.projectionDigest !== component.projection.membershipDigest
        || entry.independenceGroup !== source.independenceGroup
        || entry.episodeContentDigest !== member.episodeContentDigest
        || entry.featureSemanticDigest !== member.featureSemanticDigest
        || entry.metamorphicAuditDigest !== member.metamorphicAuditDigest
        || entry.evidenceDigest !== evidenceReferenceDigest(entry)) {
      throw new TypeError('Analysis evidence ledger is not canonical and membership-bound.');
    }
    evidence.set(entry.evidenceDigest, entry);
    prior = entry.evidenceDigest;
  }
  return evidence;
}

export function assertAnalysisLineage(analysis, expectedRegistry) {
  assertRegistry(analysis.registry);
  if (expectedRegistry && !same(analysis.registry, expectedRegistry)) {
    throw new TypeError('Analysis registry does not reproduce from supplied manifests and plan projections.');
  }
  const memberships = assertMembership(analysis);
  const evidence = assertEvidence(analysis, memberships);
  return { memberships, evidence };
}
