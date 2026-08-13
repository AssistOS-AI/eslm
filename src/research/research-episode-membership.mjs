import {
  assertResearchEpisode,
  researchEpisodeContentDigest,
} from './research-episode-contract.mjs';
import {
  RESEARCH_MEANING_CHANGING_CONTROLS,
  RESEARCH_PRESERVING_TRANSFORMS,
  projectCompactResearchMetamorphicAudit,
  researchMetamorphicAuditDigest,
} from './research-metamorphic-controls.mjs';

export const RESEARCH_EPISODE_PROJECTION_WORK = Object.freeze({
  featureEvaluations: 1 + RESEARCH_PRESERVING_TRANSFORMS.length
    + RESEARCH_MEANING_CHANGING_CONTROLS.length,
  metamorphicTransformsAttempted: RESEARCH_PRESERVING_TRANSFORMS.length
    + RESEARCH_MEANING_CHANGING_CONTROLS.length,
  complete: true,
});

export function researchEpisodeMembershipProjection(episode) {
  assertResearchEpisode(episode);
  const { features, metamorphicAudit } = projectCompactResearchMetamorphicAudit(episode);
  const appliedTransformIds = [
    ...metamorphicAudit.preserving, ...metamorphicAudit.controls,
  ].filter((variant) => variant.applied).map((variant) => variant.transformId).toSorted();
  const member = {
    episodeId: episode.episodeId,
    recordDigest: episode.provenance.recordDigest,
    episodeContentDigest: metamorphicAudit.baselineEpisodeContentDigest,
    featureSemanticDigest: features.semanticDigest,
    metamorphicAuditDigest: researchMetamorphicAuditDigest(metamorphicAudit),
    split: episode.source.split,
    visibility: episode.source.visibility,
    work: structuredClone(episode.work),
    projectionWork: {
      ...structuredClone(RESEARCH_EPISODE_PROJECTION_WORK),
      metamorphicTransformsApplied: appliedTransformIds.length,
      appliedTransformIds,
    },
  };
  return { member, features, metamorphicAudit };
}

export function researchEpisodeContentMember(episode) {
  return researchEpisodeMembershipProjection(episode).member;
}
