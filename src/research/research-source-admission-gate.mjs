import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sha256, stableStringify } from '../util.mjs';
import {
  assertResearchSourceRegistry,
  createResearchSourceRegistry,
} from './research-source-registry.mjs';
import {
  RESEARCH_SOURCE_MANIFEST_FIELDS,
  RESEARCH_SOURCE_MANIFEST_PROTOCOL,
  assertResearchSourceManifest,
} from './research-source-manifest-contract.mjs';
import {
  assertResearchDiscoveryPlan,
  assertResearchDiscoveryPlanRegistry,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import { assertProcessingGraphResearchWorkPolicy } from './processing-graph-research-work-policy.mjs';

export const RESEARCH_SOURCE_ADMISSION_GATE_PROTOCOL =
  'eslm-processing-graph-source-admission-gate-v2';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const AUTHORITY = Object.freeze({
  executionAdmission: 'exact-reviewed-training-projections-only',
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
});
const COMPONENT_FIELDS = [
  'componentId', 'kind', 'licenseId', 'licenseUrl', 'rightsState', 'allowedUses', 'redistribution',
  'identityFileId', 'supportingFileIds', 'splits', 'projection', 'identity',
];
const PROJECTION_FIELDS = [
  'projectionId', 'membershipDigest', 'contentMembershipDigest', 'shardCount', 'shardFormat',
  'allowedFields', 'excludedFields', 'privacyReview', 'safetyReview',
];

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function same(left, right) {
  return stableStringify([...left].toSorted()) === stableStringify([...right].toSorted());
}

function fileDigest(bytes) {
  return `sha256:${sha256(bytes)}`;
}

function manifestBindingIdentity(binding) {
  return `${binding.sourceRevision}\u0000${binding.componentId}`;
}

function compareManifestBindings(left, right) {
  const leftIdentity = manifestBindingIdentity(left);
  const rightIdentity = manifestBindingIdentity(right);
  return leftIdentity < rightIdentity ? -1 : leftIdentity > rightIdentity ? 1 : 0;
}

function selectedComponent(manifest, expected) {
  exact(manifest, RESEARCH_SOURCE_MANIFEST_FIELDS, `Source manifest ${expected.sourceId}`);
  assertResearchSourceManifest(manifest);
  if (manifest.format !== RESEARCH_SOURCE_MANIFEST_PROTOCOL
      || manifest.sourceId !== expected.sourceId || manifest.revision !== expected.revision
      || manifest.registryState !== 'pilot-approved'
      || manifest.identity?.sha256 !== `sha256:${expected.sha256}`
      || manifest.identity?.bytes !== expected.bytes
      || !Array.isArray(manifest.removalObligations)
      || manifest.removalObligations.length < 1) {
    throw new TypeError(`Source manifest ${expected.sourceId} is not an admitted frozen revision.`);
  }
  const component = manifest.components?.find((item) => item.componentId === expected.componentId);
  if (!component || manifest.components.length !== 1) {
    throw new TypeError(`Source manifest ${expected.sourceId} must select exactly one component.`);
  }
  exact(component, COMPONENT_FIELDS, `Source component ${expected.componentId}`);
  exact(component.projection, PROJECTION_FIELDS, `Source projection ${expected.projectionId}`);
  if (!Array.isArray(component.splits) || component.splits.length < 1
      || component.splits.length > 32) {
    throw new TypeError(`Source component ${expected.componentId} must declare bounded split membership.`);
  }
  const splitNames = new Set();
  for (const [index, split] of component.splits.entries()) {
    exact(split, ['name', 'visibility', 'rows'],
      `Source component ${expected.componentId} split[${index}]`);
    if (typeof split.name !== 'string' || split.name.length < 1 || split.name.length > 128
        || splitNames.has(split.name)
        || !['training-visible', 'development-visible', 'protected'].includes(split.visibility)
        || !Number.isSafeInteger(split.rows) || split.rows < 0) {
      throw new TypeError(`Source component ${expected.componentId} split membership is invalid.`);
    }
    splitNames.add(split.name);
  }
  const trainingRows = component.splits?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const nonTrainingRows = component.splits?.filter((item) => item.visibility !== 'training-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const expectedTrainingRows = expected.trainingRows ?? expected.rawRows;
  const expectedNonTrainingRows = expected.developmentRows ?? 0;
  if (component.rightsState !== 'approved'
      || !component.allowedUses?.includes('processing-graph-discovery')
      || component.redistribution === 'forbidden'
      || component.projection.privacyReview !== 'passed'
      || component.projection.safetyReview !== 'passed'
      || component.componentId !== expected.componentId
      || component.projection.projectionId !== expected.projectionId
      || component.projection.membershipDigest !== expected.projectionDigest
      || component.projection.contentMembershipDigest !== expected.contentMembershipDigest
      || component.projection.shardCount !== expected.shardCount
      || component.identity?.sha256 !== `sha256:${expected.sha256}`
      || component.identity?.bytes !== expected.bytes
      || component.identity?.rows !== expected.rawRows
      || trainingRows !== expectedTrainingRows || nonTrainingRows !== expectedNonTrainingRows
      || trainingRows + nonTrainingRows !== component.identity.rows) {
    throw new TypeError(`Source component ${expected.componentId} fails its rights or projection gate.`);
  }
  return component;
}

function assertSupportingFiles(manifest, component, expected) {
  const expectedFiles = expected.supportingFiles ?? [];
  const expectedIds = expectedFiles.map((file) => file.fileId).toSorted();
  if (!same(component.supportingFileIds, expectedIds)) {
    throw new TypeError(`Source component ${component.componentId} supporting-file scope is not frozen.`);
  }
  const deliveredFiles = new Map(manifest.deliveredFiles.map((file) => [file.fileId, file]));
  for (const file of expectedFiles) {
    const delivered = deliveredFiles.get(file.fileId);
    if (!delivered || delivered.role !== file.role || delivered.sha256 !== file.sha256
        || delivered.bytes !== file.bytes || delivered.mediaType !== file.mediaType) {
      throw new TypeError(`Source component ${component.componentId} supporting-file identity is stale.`);
    }
  }
}

function sourceScope(plan, expected, component) {
  const sourceRevision = `${expected.sourceId}@${expected.revision}`;
  const scope = plan.sourceScopes?.find((item) => item.sourceRevision === sourceRevision
    && item.componentId === expected.componentId);
  const visibleRows = scope?.splits?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rowsAdmitted, 0);
  const hiddenRows = scope?.splits?.filter((item) => item.visibility !== 'training-visible')
    .reduce((sum, item) => sum + item.rowsAdmitted, 0);
  const declared = new Map(component.splits.map((split) => [
    `${split.name}\u0000${split.visibility}`, split.rows,
  ]));
  const scopeDeclared = new Map(scope?.splits?.map((split) => [
    `${split.name}\u0000${split.visibility}`, split.rowsDeclared,
  ]));
  const projectedRows = expected.projectedRows ?? expected.projectedTrees;
  if (!scope || scope.projectionId !== expected.projectionId
      || scope.projectionDigest !== expected.projectionDigest
      || scope.contentMembershipDigest !== expected.contentMembershipDigest
      || visibleRows !== projectedRows || hiddenRows !== 0
      || stableStringify([...declared].toSorted()) !== stableStringify([...scopeDeclared].toSorted())
      || component.projection.membershipDigest !== scope.projectionDigest) {
    throw new TypeError(`Discovery plan does not cover the exact ${expected.sourceId} projection.`);
  }
  return { scope, sourceRevision };
}

function registryVisibility(scope) {
  return scope.splits.map(({ name, visibility, rowsDeclared, rowsAdmitted }) => ({
    split: name, visibility, rowsDeclared, rowsAdmitted,
  })).toSorted((left, right) => left.split.localeCompare(right.split));
}

function registryEntries(manifest, component, expected, scope) {
  const projectedRows = expected.projectedRows ?? expected.projectedTrees;
  return {
    source: {
      format: 'eslm-research-source-registry-entry-v1',
      sourceId: manifest.sourceId, revision: manifest.revision, owner: manifest.owner,
      officialUrl: manifest.officialUrl, citation: manifest.citation,
      independenceGroup: manifest.independenceGroup,
      identity: structuredClone(manifest.identity), registryState: manifest.registryState,
    },
    component: {
      format: 'eslm-research-component-registry-entry-v1',
      sourceId: manifest.sourceId, componentId: component.componentId,
      revision: manifest.revision, kind: component.kind,
      identity: { sha256: component.identity.sha256, rows: component.identity.rows },
      rights: {
        state: component.rightsState, licenseId: component.licenseId,
        allowedUses: [...component.allowedUses].toSorted(),
        redistribution: component.redistribution,
      },
      visibility: registryVisibility(scope),
      projection: {
        projectionId: component.projection.projectionId,
        membershipDigest: component.projection.membershipDigest,
        contentMembershipDigest: component.projection.contentMembershipDigest,
        rows: projectedRows, shardCount: component.projection.shardCount,
        shardFormat: component.projection.shardFormat,
        allowedFields: [...component.projection.allowedFields].toSorted(),
        excludedFields: [...component.projection.excludedFields].toSorted(),
        privacyReview: component.projection.privacyReview,
        safetyReview: component.projection.safetyReview,
      },
    },
  };
}

export function assertResearchSourceAdmissionGate(gate) {
  exact(gate, [
    'format', 'registry', 'manifestBindings', 'planBinding', 'workPolicy', 'decision', 'authority',
    'receiptDigest',
  ], 'Research source admission gate');
  if (gate.format !== RESEARCH_SOURCE_ADMISSION_GATE_PROTOCOL || gate.decision !== 'admit') {
    throw new TypeError('Research source admission gate protocol or decision is unsupported.');
  }
  assertResearchSourceRegistry(gate.registry);
  if (!Array.isArray(gate.manifestBindings)
      || gate.registry.components.length !== gate.registry.sources.length
      || gate.manifestBindings.length !== gate.registry.components.length) {
    throw new TypeError('Research source admission manifest bindings are incomplete.');
  }
  for (const [index, binding] of gate.manifestBindings.entries()) {
    exact(binding, [
      'sourceRevision', 'componentId', 'manifestDigest', 'projectionDigest',
      'contentMembershipDigest', 'projectedRows', 'shardCount',
    ], `Research source admission binding[${index}]`);
    digest(binding.manifestDigest, `Research source admission binding[${index}].manifestDigest`);
    digest(binding.projectionDigest, `Research source admission binding[${index}].projectionDigest`);
    digest(binding.contentMembershipDigest,
      `Research source admission binding[${index}].contentMembershipDigest`);
    const component = gate.registry.components.find((item) =>
      `${item.sourceId}@${item.revision}` === binding.sourceRevision
      && item.componentId === binding.componentId);
    if (!component || component.projection.membershipDigest !== binding.projectionDigest
        || component.projection.contentMembershipDigest !== binding.contentMembershipDigest
        || component.projection.rows !== binding.projectedRows
        || component.projection.shardCount !== binding.shardCount) {
      throw new TypeError('Research source admission binding contradicts its registry projection.');
    }
  }
  const expectedComponentIdentities = gate.registry.components.map((component) =>
    `${component.sourceId}@${component.revision}\u0000${component.componentId}`).toSorted();
  const expectedSourceRevisions = gate.registry.sources.map((source) =>
    `${source.sourceId}@${source.revision}`).toSorted();
  const bindingIdentities = gate.manifestBindings.map(manifestBindingIdentity);
  const bindingSourceRevisions = gate.manifestBindings.map(({ sourceRevision }) => sourceRevision);
  if (stableStringify(bindingIdentities) !== stableStringify(expectedComponentIdentities)
      || stableStringify(bindingSourceRevisions) !== stableStringify(expectedSourceRevisions)) {
    throw new TypeError(
      'Research source admission manifest bindings must be canonical, unique, and one-to-one.',
    );
  }
  exact(gate.planBinding, [
    'planId', 'cycleId', 'planArtifactDigest', 'planContentDigest', 'baselineGraphDigest',
    'analysisIdentity',
  ],
    'Research source admission plan binding');
  digest(gate.planBinding.planArtifactDigest,
    'Research source admission plan artifact digest');
  digest(gate.planBinding.planContentDigest,
    'Research source admission plan content digest');
  digest(gate.planBinding.baselineGraphDigest, 'Research source admission baseline digest');
  exact(gate.planBinding.analysisIdentity, [
    'analysisId', 'version', 'seed', 'inputMode', 'selectionMethod',
  ], 'Research source admission analysis identity');
  assertProcessingGraphResearchWorkPolicy(gate.workPolicy);
  exact(gate.authority, Object.keys(AUTHORITY), 'Research source admission authority');
  if (stableStringify(gate.authority) !== stableStringify(AUTHORITY)) {
    throw new TypeError('Research source admission authority is inconsistent.');
  }
  digest(gate.receiptDigest, 'Research source admission receipt digest');
  const unsigned = { ...gate };
  delete unsigned.receiptDigest;
  if (gate.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Research source admission receipt digest is invalid.');
  }
  return gate;
}

export function assertPlanBoundResearchSourceAdmissionGate(gate, {
  plan, planArtifactDigest, baselineGraphDigest = plan?.baselineGraphDigest,
} = {}) {
  assertResearchSourceAdmissionGate(gate);
  assertResearchDiscoveryPlan(plan);
  const expected = {
    planId: plan.planId,
    cycleId: plan.cycleId,
    planArtifactDigest,
    planContentDigest: researchDiscoveryPlanDigest(plan),
    baselineGraphDigest,
    analysisIdentity: plan.analysisIdentity,
  };
  if (typeof planArtifactDigest !== 'string' || !DIGEST.test(planArtifactDigest)
      || stableStringify(gate.planBinding) !== stableStringify(expected)
      || stableStringify(gate.workPolicy) !== stableStringify(plan.workPolicy)) {
    throw new TypeError('Research source admission is not bound to the exact discovery plan.');
  }
  return gate;
}

export async function loadResearchSourceAdmissionGate({
  manifestPaths, discoveryPlanPath, baselineGraphDigest, expectedSources,
}) {
  if (!Array.isArray(manifestPaths) || !Array.isArray(expectedSources)
      || manifestPaths.length < 1 || manifestPaths.length !== expectedSources.length) {
    throw new TypeError('Research source admission requires one manifest per expected source.');
  }
  const [manifestArtifacts, planBytes] = await Promise.all([
    Promise.all(manifestPaths.map(async (path) => {
      const bytes = await readFile(resolve(path));
      return { bytes, value: JSON.parse(bytes.toString('utf8')) };
    })),
    readFile(resolve(discoveryPlanPath)),
  ]);
  const plan = JSON.parse(planBytes.toString('utf8'));
  assertResearchDiscoveryPlan(plan);
  if (plan.baselineGraphDigest !== baselineGraphDigest) {
    throw new TypeError('Research discovery plan is stale against the processing graph.');
  }
  const sources = [];
  const components = [];
  const bindings = [];
  for (const [index, expected] of expectedSources.entries()) {
    const projectedRows = expected.projectedRows ?? expected.projectedTrees;
    const artifact = manifestArtifacts[index];
    const manifest = artifact.value;
    const component = selectedComponent(manifest, expected);
    assertSupportingFiles(manifest, component, expected);
    const { scope, sourceRevision } = sourceScope(plan, expected, component);
    const entries = registryEntries(manifest, component, expected, scope);
    sources.push(entries.source);
    components.push(entries.component);
    bindings.push({
      sourceRevision, componentId: component.componentId,
      manifestDigest: fileDigest(artifact.bytes), projectionDigest: expected.projectionDigest,
      contentMembershipDigest: expected.contentMembershipDigest,
      projectedRows, shardCount: expected.shardCount,
    });
  }
  const expectedRevisions = bindings.map((item) => item.sourceRevision);
  const expectedProjections = bindings.map((item) => item.projectionDigest);
  if (!same(plan.sourceRevisions, expectedRevisions)
      || !same(plan.projectionDigests, expectedProjections)
      || plan.sourceScopes.length !== bindings.length
      || plan.workPolicy.limits.maxRowsScanned
        < bindings.reduce((sum, item) => sum + item.projectedRows, 0)) {
    throw new TypeError('Research discovery plan does not exactly match the admitted sources.');
  }
  const registry = createResearchSourceRegistry({ sources, components });
  assertResearchDiscoveryPlanRegistry(plan, registry, { baselineGraphDigest });
  const gate = {
    format: RESEARCH_SOURCE_ADMISSION_GATE_PROTOCOL,
    registry,
    manifestBindings: bindings.toSorted(compareManifestBindings),
    planBinding: {
      planId: plan.planId, cycleId: plan.cycleId,
      planArtifactDigest: fileDigest(planBytes),
      planContentDigest: researchDiscoveryPlanDigest(plan),
      baselineGraphDigest,
      analysisIdentity: structuredClone(plan.analysisIdentity),
    },
    workPolicy: structuredClone(plan.workPolicy),
    decision: 'admit', authority: AUTHORITY,
  };
  gate.receiptDigest = `sha256:${sha256(stableStringify(gate))}`;
  assertResearchSourceAdmissionGate(gate);
  return Object.freeze(gate);
}
