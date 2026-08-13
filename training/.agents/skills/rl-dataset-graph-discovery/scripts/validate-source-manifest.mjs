#!/usr/bin/env node
import {
  boundedText, digest, enumValue, exactKeys, identifier, integer, output, readJsonArgument, uniqueStrings,
} from './contract-helpers.mjs';

const manifest = await readJsonArgument(process.argv[2], 'Usage: validate-source-manifest.mjs SOURCE_MANIFEST.json');
exactKeys(manifest, [
  'format', 'sourceId', 'revision', 'owner', 'officialUrl', 'paperUrl', 'citation',
  'registryState', 'independenceGroup', 'acquisition', 'identityFileId', 'identity', 'deliveredFiles',
  'components', 'rightsReview', 'extractionInventory', 'removalObligations',
], 'Source manifest');
if (manifest.format !== 'eslm-rl-dataset-source-manifest-v2') throw new TypeError('Invalid source manifest format.');
for (const field of ['sourceId', 'revision', 'independenceGroup']) identifier(manifest[field], `Source.${field}`);
boundedText(manifest.owner, 'Source.owner');
boundedText(manifest.citation, 'Source.citation', 8_192);
if (typeof manifest.officialUrl !== 'string' || !/^https:\/\//u.test(manifest.officialUrl)) {
  throw new TypeError('Source.officialUrl must be HTTPS.');
}
if (typeof manifest.paperUrl !== 'string' || !/^https:\/\//u.test(manifest.paperUrl)) {
  throw new TypeError('Source.paperUrl must be HTTPS.');
}
enumValue(manifest.registryState, [
  'pilot-approved', 'next-candidate', 'evaluation-only', 'rights-review', 'excluded', 'tombstoned',
], 'Source.registryState');
exactKeys(manifest.identity, ['sha256', 'bytes', 'mediaType'], 'Source.identity');
identifier(manifest.identityFileId, 'Source.identityFileId');
digest(manifest.identity.sha256, 'Source.identity.sha256');
integer(manifest.identity.bytes, 'Source.identity.bytes', 1);
boundedText(manifest.identity.mediaType, 'Source.identity.mediaType', 128);
exactKeys(manifest.acquisition, [
  'method', 'authorizedUrl', 'accessTerms', 'cachePolicy', 'credentialPolicy',
], 'Source.acquisition');
identifier(manifest.acquisition.method, 'Source.acquisition.method');
if (typeof manifest.acquisition.authorizedUrl !== 'string'
    || !/^https:\/\//u.test(manifest.acquisition.authorizedUrl)) {
  throw new TypeError('Source.acquisition.authorizedUrl must be HTTPS.');
}
for (const field of ['accessTerms', 'cachePolicy', 'credentialPolicy']) {
  boundedText(manifest.acquisition[field], `Source.acquisition.${field}`);
}
if (!Array.isArray(manifest.deliveredFiles) || manifest.deliveredFiles.length < 1
    || manifest.deliveredFiles.length > 128) {
  throw new TypeError('Source.deliveredFiles must be bounded and non-empty.');
}
const deliveredFileIds = new Set();
const deliveredFiles = new Map();
const deliveredPaths = new Set();
for (const [index, file] of manifest.deliveredFiles.entries()) {
  const path = `Source.deliveredFiles[${index}]`;
  exactKeys(file, ['fileId', 'role', 'path', 'sourceUrl', 'sha256', 'bytes', 'mediaType'], path);
  identifier(file.fileId, `${path}.fileId`);
  identifier(file.role, `${path}.role`);
  if (deliveredFileIds.has(file.fileId)) throw new TypeError('Delivered file IDs must be unique.');
  deliveredFileIds.add(file.fileId);
  boundedText(file.path, `${path}.path`);
  if (file.path.startsWith('/') || file.path.includes('..') || deliveredPaths.has(file.path)) {
    throw new TypeError('Delivered file paths must be unique safe relative paths.');
  }
  deliveredPaths.add(file.path);
  if (typeof file.sourceUrl !== 'string' || !/^https:\/\//u.test(file.sourceUrl)) {
    throw new TypeError(`${path}.sourceUrl must be HTTPS.`);
  }
  digest(file.sha256, `${path}.sha256`);
  integer(file.bytes, `${path}.bytes`, 1);
  boundedText(file.mediaType, `${path}.mediaType`, 128);
  deliveredFiles.set(file.fileId, file);
}
const sourceIdentityFile = deliveredFiles.get(manifest.identityFileId);
if (!sourceIdentityFile) throw new TypeError('Source.identityFileId cites an absent delivered file.');
if (manifest.identity.sha256 !== sourceIdentityFile.sha256
    || manifest.identity.bytes !== sourceIdentityFile.bytes
    || manifest.identity.mediaType !== sourceIdentityFile.mediaType) {
  throw new TypeError('Source.identity must equal its named delivered-file identity.');
}
uniqueStrings(manifest.removalObligations, 'Source.removalObligations', { minimum: 1, maximum: 32 });
if (!Array.isArray(manifest.components) || manifest.components.length === 0 || manifest.components.length > 128) {
  throw new TypeError('Source.components must be a bounded non-empty array.');
}
const componentIds = new Set();
for (const [index, component] of manifest.components.entries()) {
  const path = `Source.components[${index}]`;
  exactKeys(component, [
    'componentId', 'kind', 'licenseId', 'licenseUrl', 'rightsState', 'allowedUses',
    'redistribution', 'identityFileId', 'supportingFileIds', 'splits', 'projection', 'identity',
  ], path);
  identifier(component.componentId, `${path}.componentId`);
  if (componentIds.has(component.componentId)) throw new TypeError('Component identifiers must be unique.');
  componentIds.add(component.componentId);
  identifier(component.kind, `${path}.kind`);
  identifier(component.licenseId, `${path}.licenseId`);
  if (typeof component.licenseUrl !== 'string' || !/^https:\/\//u.test(component.licenseUrl)) {
    throw new TypeError(`${path}.licenseUrl must be HTTPS.`);
  }
  enumValue(component.rightsState, ['approved', 'denied', 'review-required', 'withdrawn'], `${path}.rightsState`);
  uniqueStrings(component.allowedUses, `${path}.allowedUses`, { minimum: 1, maximum: 16 });
  if (!component.allowedUses.includes('processing-graph-discovery') && component.rightsState === 'approved') {
    throw new TypeError(`${path} is approved but does not allow processing-graph-discovery.`);
  }
  enumValue(component.redistribution, ['allowed', 'metadata-only', 'forbidden'], `${path}.redistribution`);
  identifier(component.identityFileId, `${path}.identityFileId`);
  uniqueStrings(component.supportingFileIds, `${path}.supportingFileIds`, { maximum: 32 });
  if (component.supportingFileIds.includes(component.identityFileId)) {
    throw new TypeError(`${path}.supportingFileIds must exclude the identity file.`);
  }
  const componentIdentityFile = deliveredFiles.get(component.identityFileId);
  if (!componentIdentityFile) throw new TypeError(`${path}.identityFileId cites an absent delivered file.`);
  if (component.supportingFileIds.some((fileId) => !deliveredFiles.has(fileId))) {
    throw new TypeError(`${path}.supportingFileIds cites an absent delivered file.`);
  }
  if (!Array.isArray(component.splits) || component.splits.length === 0 || component.splits.length > 32) {
    throw new TypeError(`${path}.splits must be bounded and non-empty.`);
  }
  const splitNames = new Set();
  for (const [splitIndex, split] of component.splits.entries()) {
    exactKeys(split, ['name', 'visibility', 'rows'], `${path}.splits[${splitIndex}]`);
    identifier(split.name, `${path}.splits[${splitIndex}].name`);
    if (splitNames.has(split.name)) throw new TypeError(`${path}.splits names must be unique.`);
    splitNames.add(split.name);
    enumValue(split.visibility, ['training-visible', 'development-visible', 'protected'],
      `${path}.splits[${splitIndex}].visibility`);
    integer(split.rows, `${path}.splits[${splitIndex}].rows`);
  }
  exactKeys(component.projection, [
    'projectionId', 'membershipDigest', 'contentMembershipDigest', 'shardCount', 'shardFormat',
    'allowedFields', 'excludedFields', 'privacyReview', 'safetyReview',
  ], `${path}.projection`);
  identifier(component.projection.projectionId, `${path}.projection.projectionId`);
  digest(component.projection.membershipDigest, `${path}.projection.membershipDigest`);
  digest(component.projection.contentMembershipDigest,
    `${path}.projection.contentMembershipDigest`);
  integer(component.projection.shardCount, `${path}.projection.shardCount`, 1);
  enumValue(component.projection.shardFormat, ['json', 'jsonl', 'synthetic-memory'],
    `${path}.projection.shardFormat`);
  uniqueStrings(component.projection.allowedFields, `${path}.projection.allowedFields`, { minimum: 1 });
  uniqueStrings(component.projection.excludedFields, `${path}.projection.excludedFields`);
  for (const field of ['privacyReview', 'safetyReview']) {
    enumValue(component.projection[field], ['passed', 'not-applicable', 'blocked'], `${path}.projection.${field}`);
  }
  exactKeys(component.identity, ['sha256', 'bytes', 'rows', 'mediaType'], `${path}.identity`);
  digest(component.identity.sha256, `${path}.identity.sha256`);
  integer(component.identity.bytes, `${path}.identity.bytes`, 1);
  integer(component.identity.rows, `${path}.identity.rows`);
  boundedText(component.identity.mediaType, `${path}.identity.mediaType`, 128);
  if (component.identity.sha256 !== componentIdentityFile.sha256
      || component.identity.bytes !== componentIdentityFile.bytes
      || component.identity.mediaType !== componentIdentityFile.mediaType) {
    throw new TypeError(`${path}.identity must equal its named delivered-file identity.`);
  }
  const splitRows = component.splits.reduce((sum, split) => sum + split.rows, 0);
  if (splitRows !== component.identity.rows) {
    throw new TypeError(`${path} split rows must reconcile with component identity rows.`);
  }
}
exactKeys(manifest.rightsReview, [
  'reviewId', 'reviewAuthority', 'reviewedRevision', 'evidenceFileIds', 'evidenceUrls',
  'decision', 'limitations',
], 'Source.rightsReview');
identifier(manifest.rightsReview.reviewId, 'Source.rightsReview.reviewId');
if (manifest.rightsReview.reviewAuthority !== 'repository-policy-review'
    || manifest.rightsReview.reviewedRevision !== manifest.revision
    || !['admit-declared-projection', 'hold', 'deny'].includes(manifest.rightsReview.decision)) {
  throw new TypeError('Source rights review is inconsistent with the manifest revision or policy.');
}
uniqueStrings(manifest.rightsReview.evidenceFileIds, 'Source.rightsReview.evidenceFileIds', {
  minimum: 1, maximum: 128,
});
if (manifest.rightsReview.evidenceFileIds.some((fileId) => !deliveredFileIds.has(fileId))) {
  throw new TypeError('Source rights review cites an absent delivered file.');
}
if (!Array.isArray(manifest.rightsReview.evidenceUrls)
    || manifest.rightsReview.evidenceUrls.length < 1
    || manifest.rightsReview.evidenceUrls.some((url) => typeof url !== 'string'
      || !/^https:\/\//u.test(url))) {
  throw new TypeError('Source rights review evidence URLs must be bounded HTTPS URLs.');
}
uniqueStrings(manifest.rightsReview.limitations, 'Source.rightsReview.limitations', { minimum: 1 });
if (manifest.registryState === 'pilot-approved'
    && manifest.rightsReview.decision !== 'admit-declared-projection') {
  throw new TypeError('Pilot-approved source lacks an admitting rights review.');
}
exactKeys(manifest.extractionInventory, [
  'selectedComponentIds', 'excludedComponentKinds', 'retainedRawSource', 'projectionLossRecorded',
], 'Source.extractionInventory');
uniqueStrings(manifest.extractionInventory.selectedComponentIds,
  'Source.extractionInventory.selectedComponentIds', { minimum: 1 });
uniqueStrings(manifest.extractionInventory.excludedComponentKinds,
  'Source.extractionInventory.excludedComponentKinds');
if (manifest.extractionInventory.selectedComponentIds.some((componentId) => !componentIds.has(componentId))
    || manifest.extractionInventory.retainedRawSource !== true
    || manifest.extractionInventory.projectionLossRecorded !== true) {
  throw new TypeError('Source extraction inventory is incomplete or selects an absent component.');
}
output({ valid: true, format: manifest.format, sourceId: manifest.sourceId, components: manifest.components.length });
