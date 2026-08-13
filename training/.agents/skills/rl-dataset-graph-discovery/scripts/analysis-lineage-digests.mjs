import { createHash } from 'node:crypto';

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function observedMembershipDigest(entry) {
  return sha256(stable({
    projectionId: entry.projectionId,
    rawRows: entry.rawRows,
    projectedRows: entry.members.length,
    memberDigests: entry.members.map((member) => member.recordDigest).toSorted(),
  }));
}

export function observedContentMembershipDigest(entry) {
  const members = structuredClone(entry.members)
    .toSorted((left, right) => left.recordDigest.localeCompare(right.recordDigest));
  return sha256(stable({
    format: 'eslm-research-projection-content-membership-v2',
    projectionId: entry.projectionId,
    rawRows: entry.rawRows,
    projectedEpisodes: members.length,
    members,
  }));
}

export function evidenceReferenceDigest(entry) {
  return sha256(stable({
    format: 'eslm-research-evidence-reference-v3',
    sourceId: entry.sourceId,
    revision: entry.revision,
    componentId: entry.componentId,
    projectionDigest: entry.projectionDigest,
    recordDigest: entry.recordDigest,
    episodeContentDigest: entry.episodeContentDigest,
    featureSemanticDigest: entry.featureSemanticDigest,
    metamorphicAuditDigest: entry.metamorphicAuditDigest,
  }));
}
