import { exactKeys, same, sha256, stable } from './contract-helpers.mjs';

export function componentKey(value) {
  const revision = value.sourceRevision ?? `${value.sourceId}@${value.revision}`;
  return `${revision}\u0000${value.componentId}`;
}

export function bindPlanToManifests(manifestArtifacts, plan) {
  const manifests = new Map();
  const components = new Map();
  const projectionIds = new Set();
  const projectionDigests = new Set();
  for (const artifact of manifestArtifacts) {
    const manifest = artifact.value;
    const sourceRevision = `${manifest.sourceId}@${manifest.revision}`;
    if (manifests.has(sourceRevision)) {
      throw new TypeError(`Bundle source revision identities must be unique: ${sourceRevision}.`);
    }
    manifests.set(sourceRevision, { ...artifact, sourceRevision });
    for (const component of manifest.components) {
      const key = `${sourceRevision}\u0000${component.componentId}`;
      if (components.has(key)) throw new TypeError(`Bundle component scope is duplicated: ${key}.`);
      if (projectionIds.has(component.projection.projectionId)
          || projectionDigests.has(component.projection.membershipDigest)) {
        throw new TypeError('Bundle projection identities and membership digests must be unique.');
      }
      projectionIds.add(component.projection.projectionId);
      projectionDigests.add(component.projection.membershipDigest);
      components.set(key, { component, sourceRevision, manifestArtifact: artifact });
    }
  }
  if (!same(plan.sourceRevisions, [...manifests.keys()].toSorted())) {
    throw new TypeError('Discovery-plan source revisions must exactly match the supplied source manifests.');
  }
  const scopes = new Map();
  for (const scope of plan.sourceScopes) {
    const key = componentKey(scope);
    const binding = components.get(key);
    if (!binding || scopes.has(key)
        || scope.projectionId !== binding.component.projection.projectionId
        || scope.projectionDigest !== binding.component.projection.membershipDigest
        || scope.contentMembershipDigest !== binding.component.projection.contentMembershipDigest) {
      throw new TypeError('Discovery-plan scope does not bind one exact manifest component projection.');
    }
    const declaredSplits = new Map(binding.component.splits.map((split) => [split.name, split]));
    if (scope.splits.length !== declaredSplits.size) {
      throw new TypeError('Discovery-plan split scopes must exactly cover their manifest component.');
    }
    const seen = new Set();
    for (const split of scope.splits) {
      const declared = declaredSplits.get(split.name);
      if (!declared || seen.has(split.name) || split.visibility !== declared.visibility
          || split.rowsDeclared !== declared.rows || split.rowsAdmitted > declared.rows
          || (split.visibility !== 'training-visible' && split.rowsAdmitted !== 0)) {
        throw new TypeError('Discovery-plan split admission drifts from manifest visibility or rows.');
      }
      seen.add(split.name);
    }
    scopes.set(key, { scope, binding });
  }
  if (scopes.size !== components.size
      || !same(plan.projectionDigests, [...projectionDigests].toSorted())) {
    throw new TypeError('Discovery plan must exactly cover every supplied manifest projection.');
  }
  return { manifests, components, projectionDigests, scopes };
}

export function expectedRegistry(bindings) {
  const sources = [...bindings.manifests.values()].map(({ value: manifest }) => ({
    format: 'eslm-research-source-registry-entry-v1',
    sourceId: manifest.sourceId,
    revision: manifest.revision,
    owner: manifest.owner,
    officialUrl: manifest.officialUrl,
    citation: manifest.citation,
    independenceGroup: manifest.independenceGroup,
    identity: structuredClone(manifest.identity),
    registryState: manifest.registryState,
  })).toSorted((left, right) =>
    `${left.sourceId}@${left.revision}`.localeCompare(`${right.sourceId}@${right.revision}`));
  const components = [...bindings.scopes.values()].map(({ scope, binding }) => {
    const { component } = binding;
    const projectedRows = scope.splits.reduce((sum, split) => sum + split.rowsAdmitted, 0);
    return {
      format: 'eslm-research-component-registry-entry-v1',
      sourceId: binding.manifestArtifact.value.sourceId,
      componentId: component.componentId,
      revision: binding.manifestArtifact.value.revision,
      kind: component.kind,
      identity: { sha256: component.identity.sha256, rows: component.identity.rows },
      rights: {
        state: component.rightsState,
        licenseId: component.licenseId,
        allowedUses: [...component.allowedUses].toSorted(),
        redistribution: component.redistribution,
      },
      visibility: scope.splits.map((split) => ({
        split: split.name, visibility: split.visibility,
        rowsDeclared: split.rowsDeclared, rowsAdmitted: split.rowsAdmitted,
      })).toSorted((left, right) => left.split.localeCompare(right.split)),
      projection: {
        projectionId: component.projection.projectionId,
        membershipDigest: component.projection.membershipDigest,
        contentMembershipDigest: component.projection.contentMembershipDigest,
        rows: projectedRows,
        shardCount: component.projection.shardCount,
        shardFormat: component.projection.shardFormat,
        allowedFields: [...component.projection.allowedFields].toSorted(),
        excludedFields: [...component.projection.excludedFields].toSorted(),
        privacyReview: component.projection.privacyReview,
        safetyReview: component.projection.safetyReview,
      },
    };
  }).toSorted((left, right) => componentKey(left).localeCompare(componentKey(right)));
  const unsigned = {
    format: 'eslm-research-source-component-registry-v1', sources, components,
  };
  const digest = sha256(stable(unsigned));
  const independenceGroups = [...new Set(sources.map((item) => item.independenceGroup))].toSorted();
  return {
    ...unsigned,
    digest,
    sourceCount: sources.length,
    independenceGroupCount: independenceGroups.length,
    independenceGroups,
    componentCount: components.length,
    projectionDigests: [...new Set(components
      .map((item) => item.projection.membershipDigest))].toSorted(),
  };
}

export function assertPlanIdentity(plan, analysis) {
  exactKeys(plan.analysisIdentity, [
    'analysisId', 'version', 'seed', 'inputMode', 'selectionMethod',
  ], 'Discovery plan.analysisIdentity');
  const expected = {
    ...plan.analysisIdentity,
    progressionStage: plan.workPolicy.progressionStage,
  };
  if (!same(analysis.analysis, expected)
      || analysis.baselineGraph.catalogDigest !== plan.baselineGraphDigest
      || !same(analysis.workPolicy, plan.workPolicy)) {
    throw new TypeError('Analysis identity, baseline, or work policy drifts from the approved plan.');
  }
}
