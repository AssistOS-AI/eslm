import { sha256, stableStringify } from '../util.mjs';
import { RESEARCH_EPISODE_PROJECTION_WORK } from './research-episode-membership.mjs';
import {
  RESEARCH_MEANING_CHANGING_CONTROLS,
  RESEARCH_PRESERVING_TRANSFORMS,
} from './research-metamorphic-controls.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;
const CONTENT_MEMBER_FIELDS = Object.freeze([
  'episodeId', 'recordDigest', 'episodeContentDigest', 'featureSemanticDigest',
  'metamorphicAuditDigest', 'split', 'visibility', 'work',
  'projectionWork',
]);
const WORK_FIELDS = Object.freeze([
  'sourceBytes', 'tokens', 'actions', 'dependencies', 'complete',
]);
const PROJECTION_WORK_FIELDS = Object.freeze([
  'featureEvaluations', 'metamorphicTransformsAttempted',
  'metamorphicTransformsApplied', 'appliedTransformIds', 'complete',
]);
const TRANSFORM_IDS = Object.freeze([
  ...RESEARCH_PRESERVING_TRANSFORMS, ...RESEARCH_MEANING_CHANGING_CONTROLS,
].toSorted());

function assertMembershipInputs(projectionId, memberDigests, rawRows, { unique = true } = {}) {
  if (typeof projectionId !== 'string' || projectionId.length < 1
      || !Array.isArray(memberDigests)
      || memberDigests.some((value) => typeof value !== 'string' || !DIGEST.test(value))
      || (unique && new Set(memberDigests).size !== memberDigests.length)
      || !Number.isSafeInteger(rawRows) || rawRows < memberDigests.length) {
    throw new TypeError('Research projection membership inputs are invalid.');
  }
}

export function researchProjectionMembershipDigest(projectionId, memberDigests, rawRows) {
  assertMembershipInputs(projectionId, memberDigests, rawRows);
  return `sha256:${sha256(stableStringify({
    projectionId,
    rawRows,
    projectedRows: memberDigests.length,
    memberDigests: [...memberDigests].toSorted(),
  }))}`;
}

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && stableStringify(Object.keys(value).toSorted()) === stableStringify([...fields].toSorted());
}

export function assertResearchProjectionContentMembers(members, rawRows) {
  if (!Array.isArray(members) || !Number.isSafeInteger(rawRows) || rawRows < members.length) {
    throw new TypeError('Research projection content members are invalid.');
  }
  let priorDigest = '';
  for (const member of members) {
    if (!exactFields(member, CONTENT_MEMBER_FIELDS)
        || typeof member.episodeId !== 'string' || member.episodeId.length > 256
        || !IDENTIFIER.test(member.episodeId)
        || !DIGEST.test(member.recordDigest) || member.recordDigest <= priorDigest
        || !DIGEST.test(member.episodeContentDigest)
        || !DIGEST.test(member.featureSemanticDigest)
        || !DIGEST.test(member.metamorphicAuditDigest)
        || typeof member.split !== 'string' || member.split.length < 1
        || !['training-visible', 'development-visible', 'protected'].includes(member.visibility)
        || !exactFields(member.work, WORK_FIELDS)
        || !exactFields(member.projectionWork, PROJECTION_WORK_FIELDS)
        || WORK_FIELDS.slice(0, -1).some((field) =>
          !Number.isSafeInteger(member.work[field]) || member.work[field] < 0)
        || member.work.sourceBytes < 1 || member.work.tokens < 1
        || typeof member.work.complete !== 'boolean'
        || member.projectionWork.featureEvaluations !== RESEARCH_EPISODE_PROJECTION_WORK.featureEvaluations
        || member.projectionWork.metamorphicTransformsAttempted
          !== RESEARCH_EPISODE_PROJECTION_WORK.metamorphicTransformsAttempted
        || !Number.isSafeInteger(member.projectionWork.metamorphicTransformsApplied)
        || member.projectionWork.metamorphicTransformsApplied < 0
        || member.projectionWork.metamorphicTransformsApplied
          > member.projectionWork.metamorphicTransformsAttempted
        || !Array.isArray(member.projectionWork.appliedTransformIds)
        || stableStringify(member.projectionWork.appliedTransformIds)
          !== stableStringify([...new Set(member.projectionWork.appliedTransformIds)].toSorted())
        || member.projectionWork.appliedTransformIds.some((transformId) =>
          !TRANSFORM_IDS.includes(transformId))
        || member.projectionWork.metamorphicTransformsApplied
          !== member.projectionWork.appliedTransformIds.length
        || member.projectionWork.complete !== true) {
      throw new TypeError('Research projection content members must be canonical joint records.');
    }
    priorDigest = member.recordDigest;
  }
  return members;
}

export function researchProjectionContentMembershipDigest(projectionId, members, rawRows) {
  if (typeof projectionId !== 'string' || projectionId.length < 1) {
    throw new TypeError('Research projection content identity is invalid.');
  }
  const canonicalMembers = structuredClone(members)
    .toSorted((left, right) => left.recordDigest.localeCompare(right.recordDigest));
  assertResearchProjectionContentMembers(canonicalMembers, rawRows);
  return `sha256:${sha256(stableStringify({
    format: 'eslm-research-projection-content-membership-v2',
    projectionId,
    rawRows,
    projectedEpisodes: canonicalMembers.length,
    members: canonicalMembers,
  }))}`;
}
