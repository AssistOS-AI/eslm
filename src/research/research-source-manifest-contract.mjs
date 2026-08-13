import { stableStringify } from '../util.mjs';

export const RESEARCH_SOURCE_MANIFEST_PROTOCOL = 'eslm-rl-dataset-source-manifest-v2';

export const RESEARCH_SOURCE_MANIFEST_FIELDS = Object.freeze([
  'format', 'sourceId', 'revision', 'owner', 'officialUrl', 'paperUrl', 'citation',
  'registryState', 'independenceGroup', 'acquisition', 'identityFileId', 'identity', 'deliveredFiles',
  'components', 'rightsReview', 'extractionInventory', 'removalObligations',
]);

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>-][a-z0-9]+)*$/u;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function identifier(value, path) {
  if (typeof value !== 'string' || value.length > 256 || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a canonical identifier.`);
  }
}

function boundedText(value, path, maximum = 8_192) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function https(value, path) {
  if (typeof value !== 'string' || !/^https:\/\//u.test(value) || value.length > 2_048) {
    throw new TypeError(`${path} must be a bounded HTTPS URL.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) throw new TypeError(`${path} must be a SHA-256 digest.`);
}

function count(value, path, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a ${positive ? 'positive' : 'non-negative'} safe integer.`);
  }
}

function uniqueStrings(value, path, { minimum = 0, maximum = 128 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 512)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique string array.`);
  }
}

function assertIdentity(identity, path, { rows = false } = {}) {
  exact(identity, rows ? ['sha256', 'bytes', 'rows', 'mediaType'] : ['sha256', 'bytes', 'mediaType'], path);
  digest(identity.sha256, `${path}.sha256`);
  count(identity.bytes, `${path}.bytes`, true);
  boundedText(identity.mediaType, `${path}.mediaType`, 128);
  if (rows) count(identity.rows, `${path}.rows`);
}

function assertIdentityMatchesFile(identity, file, path) {
  if (identity.sha256 !== file.sha256 || identity.bytes !== file.bytes
      || identity.mediaType !== file.mediaType) {
    throw new TypeError(`${path} must equal its named delivered-file identity.`);
  }
}

function assertComponent(component, path, deliveredFiles) {
  exact(component, [
    'componentId', 'kind', 'licenseId', 'licenseUrl', 'rightsState', 'allowedUses',
    'redistribution', 'identityFileId', 'supportingFileIds', 'splits', 'projection', 'identity',
  ], path);
  for (const field of ['componentId', 'kind', 'licenseId']) identifier(component[field], `${path}.${field}`);
  https(component.licenseUrl, `${path}.licenseUrl`);
  if (!['approved', 'denied', 'review-required', 'withdrawn'].includes(component.rightsState)) {
    throw new TypeError(`${path}.rightsState is unsupported.`);
  }
  uniqueStrings(component.allowedUses, `${path}.allowedUses`, { minimum: 1, maximum: 16 });
  if (component.rightsState === 'approved'
      && !component.allowedUses.includes('processing-graph-discovery')) {
    throw new TypeError(`${path} approval omits processing-graph-discovery.`);
  }
  if (!['allowed', 'metadata-only', 'forbidden'].includes(component.redistribution)) {
    throw new TypeError(`${path}.redistribution is unsupported.`);
  }
  identifier(component.identityFileId, `${path}.identityFileId`);
  uniqueStrings(component.supportingFileIds, `${path}.supportingFileIds`, { maximum: 32 });
  if (component.supportingFileIds.includes(component.identityFileId)) {
    throw new TypeError(`${path}.supportingFileIds must exclude the identity file.`);
  }
  const identityFile = deliveredFiles.get(component.identityFileId);
  if (!identityFile) throw new TypeError(`${path}.identityFileId cites an absent delivered file.`);
  if (component.supportingFileIds.some((fileId) => !deliveredFiles.has(fileId))) {
    throw new TypeError(`${path}.supportingFileIds cites an absent delivered file.`);
  }
  if (!Array.isArray(component.splits) || component.splits.length < 1 || component.splits.length > 32) {
    throw new TypeError(`${path}.splits must be bounded and non-empty.`);
  }
  const splitNames = new Set();
  for (const [index, split] of component.splits.entries()) {
    exact(split, ['name', 'visibility', 'rows'], `${path}.splits[${index}]`);
    identifier(split.name, `${path}.splits[${index}].name`);
    if (splitNames.has(split.name)) throw new TypeError(`${path}.split names must be unique.`);
    splitNames.add(split.name);
    if (!['training-visible', 'development-visible', 'protected'].includes(split.visibility)) {
      throw new TypeError(`${path}.splits[${index}].visibility is unsupported.`);
    }
    count(split.rows, `${path}.splits[${index}].rows`);
  }
  exact(component.projection, [
    'projectionId', 'membershipDigest', 'contentMembershipDigest', 'shardCount', 'shardFormat',
    'allowedFields', 'excludedFields', 'privacyReview', 'safetyReview',
  ], `${path}.projection`);
  identifier(component.projection.projectionId, `${path}.projection.projectionId`);
  digest(component.projection.membershipDigest, `${path}.projection.membershipDigest`);
  digest(component.projection.contentMembershipDigest,
    `${path}.projection.contentMembershipDigest`);
  count(component.projection.shardCount, `${path}.projection.shardCount`, true);
  if (!['json', 'jsonl', 'synthetic-memory'].includes(component.projection.shardFormat)) {
    throw new TypeError(`${path}.projection.shardFormat is unsupported.`);
  }
  uniqueStrings(component.projection.allowedFields, `${path}.projection.allowedFields`, { minimum: 1 });
  uniqueStrings(component.projection.excludedFields, `${path}.projection.excludedFields`);
  for (const field of ['privacyReview', 'safetyReview']) {
    if (!['passed', 'not-applicable', 'blocked'].includes(component.projection[field])) {
      throw new TypeError(`${path}.projection.${field} is unsupported.`);
    }
  }
  assertIdentity(component.identity, `${path}.identity`, { rows: true });
  assertIdentityMatchesFile(component.identity, identityFile, `${path}.identity`);
  if (component.splits.reduce((sum, split) => sum + split.rows, 0) !== component.identity.rows) {
    throw new TypeError(`${path} split rows do not reconcile with component identity rows.`);
  }
}

export function assertResearchSourceManifest(manifest) {
  exact(manifest, RESEARCH_SOURCE_MANIFEST_FIELDS, 'Research source manifest');
  if (manifest.format !== RESEARCH_SOURCE_MANIFEST_PROTOCOL) {
    throw new TypeError('Research source manifest protocol is unsupported.');
  }
  for (const field of ['sourceId', 'revision', 'independenceGroup']) identifier(manifest[field], `Source.${field}`);
  boundedText(manifest.owner, 'Source.owner');
  https(manifest.officialUrl, 'Source.officialUrl');
  https(manifest.paperUrl, 'Source.paperUrl');
  boundedText(manifest.citation, 'Source.citation');
  if (!['pilot-approved', 'next-candidate', 'evaluation-only', 'rights-review', 'excluded', 'tombstoned']
    .includes(manifest.registryState)) throw new TypeError('Source.registryState is unsupported.');
  exact(manifest.acquisition, [
    'method', 'authorizedUrl', 'accessTerms', 'cachePolicy', 'credentialPolicy',
  ], 'Source.acquisition');
  identifier(manifest.acquisition.method, 'Source.acquisition.method');
  https(manifest.acquisition.authorizedUrl, 'Source.acquisition.authorizedUrl');
  for (const field of ['accessTerms', 'cachePolicy', 'credentialPolicy']) {
    boundedText(manifest.acquisition[field], `Source.acquisition.${field}`);
  }
  assertIdentity(manifest.identity, 'Source.identity');
  identifier(manifest.identityFileId, 'Source.identityFileId');
  if (!Array.isArray(manifest.deliveredFiles) || manifest.deliveredFiles.length < 1
      || manifest.deliveredFiles.length > 128) throw new TypeError('Source.deliveredFiles must be bounded.');
  const deliveredPaths = new Set();
  const deliveredFiles = new Map();
  for (const [index, file] of manifest.deliveredFiles.entries()) {
    exact(file, ['fileId', 'role', 'path', 'sourceUrl', 'sha256', 'bytes', 'mediaType'], `Delivered file[${index}]`);
    identifier(file.fileId, `Delivered file[${index}].fileId`);
    identifier(file.role, `Delivered file[${index}].role`);
    if (deliveredFiles.has(file.fileId)) throw new TypeError('Delivered file IDs must be unique.');
    boundedText(file.path, `Delivered file[${index}].path`);
    if (file.path.startsWith('/') || file.path.includes('..') || deliveredPaths.has(file.path)) {
      throw new TypeError('Delivered file paths must be unique safe relative cache paths.');
    }
    deliveredPaths.add(file.path);
    https(file.sourceUrl, `Delivered file[${index}].sourceUrl`);
    digest(file.sha256, `Delivered file[${index}].sha256`);
    count(file.bytes, `Delivered file[${index}].bytes`, true);
    boundedText(file.mediaType, `Delivered file[${index}].mediaType`, 128);
    deliveredFiles.set(file.fileId, file);
  }
  const sourceIdentityFile = deliveredFiles.get(manifest.identityFileId);
  if (!sourceIdentityFile) throw new TypeError('Source.identityFileId cites an absent delivered file.');
  assertIdentityMatchesFile(manifest.identity, sourceIdentityFile, 'Source.identity');
  if (!Array.isArray(manifest.components) || manifest.components.length < 1 || manifest.components.length > 128) {
    throw new TypeError('Source.components must be bounded and non-empty.');
  }
  const componentIds = new Set();
  for (const [index, component] of manifest.components.entries()) {
    assertComponent(component, `Source.components[${index}]`, deliveredFiles);
    if (componentIds.has(component.componentId)) throw new TypeError('Source component IDs must be unique.');
    componentIds.add(component.componentId);
  }
  exact(manifest.rightsReview, [
    'reviewId', 'reviewAuthority', 'reviewedRevision', 'evidenceFileIds', 'evidenceUrls',
    'decision', 'limitations',
  ], 'Source.rightsReview');
  identifier(manifest.rightsReview.reviewId, 'Source.rightsReview.reviewId');
  if (manifest.rightsReview.reviewAuthority !== 'repository-policy-review') {
    throw new TypeError('Source rights review authority is unsupported.');
  }
  if (manifest.rightsReview.reviewedRevision !== manifest.revision) {
    throw new TypeError('Source rights review must bind the exact revision.');
  }
  uniqueStrings(manifest.rightsReview.evidenceFileIds, 'Source.rightsReview.evidenceFileIds', { minimum: 1 });
  if (manifest.rightsReview.evidenceFileIds.some((fileId) =>
    !manifest.deliveredFiles.some((file) => file.fileId === fileId))) {
    throw new TypeError('Source rights review cites an absent delivered file.');
  }
  if (!Array.isArray(manifest.rightsReview.evidenceUrls)
      || manifest.rightsReview.evidenceUrls.length < 1
      || manifest.rightsReview.evidenceUrls.length > 32) {
    throw new TypeError('Source rights review evidence URLs must be bounded and non-empty.');
  }
  for (const [index, url] of manifest.rightsReview.evidenceUrls.entries()) {
    https(url, `Source.rightsReview.evidenceUrls[${index}]`);
  }
  if (!['admit-declared-projection', 'hold', 'deny'].includes(manifest.rightsReview.decision)) {
    throw new TypeError('Source rights review decision is unsupported.');
  }
  uniqueStrings(manifest.rightsReview.limitations, 'Source.rightsReview.limitations', { minimum: 1 });
  if (manifest.registryState === 'pilot-approved'
      && manifest.rightsReview.decision !== 'admit-declared-projection') {
    throw new TypeError('Pilot-approved source lacks a matching rights-review decision.');
  }
  exact(manifest.extractionInventory, [
    'selectedComponentIds', 'excludedComponentKinds', 'retainedRawSource', 'projectionLossRecorded',
  ], 'Source.extractionInventory');
  uniqueStrings(manifest.extractionInventory.selectedComponentIds,
    'Source.extractionInventory.selectedComponentIds', { minimum: 1 });
  if (manifest.extractionInventory.selectedComponentIds.some((componentId) => !componentIds.has(componentId))) {
    throw new TypeError('Source extraction inventory selects an absent component.');
  }
  uniqueStrings(manifest.extractionInventory.excludedComponentKinds,
    'Source.extractionInventory.excludedComponentKinds');
  if (manifest.extractionInventory.retainedRawSource !== true
      || manifest.extractionInventory.projectionLossRecorded !== true) {
    throw new TypeError('Source extraction inventory must preserve raw bytes and projection loss.');
  }
  uniqueStrings(manifest.removalObligations, 'Source.removalObligations', { minimum: 1, maximum: 32 });
  return manifest;
}
