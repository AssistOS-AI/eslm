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

export function sourceAdmissionReceiptDigest({ registry, bindings, planArtifact }) {
  const admissionRegistry = {
    format: registry.format, sources: registry.sources, components: registry.components,
    digest: registry.digest,
  };
  const manifestBindings = [...bindings.scopes.values()].map(({ scope, binding }) => ({
    sourceRevision: scope.sourceRevision,
    componentId: scope.componentId,
    manifestDigest: binding.manifestArtifact.digest,
    projectionDigest: scope.projectionDigest,
    contentMembershipDigest: scope.contentMembershipDigest,
    projectedRows: scope.splits.reduce((sum, split) => sum + split.rowsAdmitted, 0),
    shardCount: binding.component.projection.shardCount,
  })).toSorted((left, right) => left.sourceRevision.localeCompare(right.sourceRevision));
  const gate = {
    format: 'eslm-processing-graph-source-admission-gate-v2',
    registry: admissionRegistry,
    manifestBindings,
    planBinding: {
      planId: planArtifact.value.planId,
      cycleId: planArtifact.value.cycleId,
      planArtifactDigest: planArtifact.digest,
      planContentDigest: sha256(stable(planArtifact.value)),
      baselineGraphDigest: planArtifact.value.baselineGraphDigest,
    },
    workPolicy: planArtifact.value.workPolicy,
    decision: 'admit',
    authority: {
      executionAdmission: 'exact-reviewed-training-projections-only',
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
    },
  };
  return sha256(stable(gate));
}
