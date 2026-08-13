import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sha256, stableStringify } from '../util.mjs';
import {
  LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH,
  assertLargeSourcePreflightReceipt,
} from './large-source-preflight.mjs';
import { processingGraphResearchImplementationIdentity } from './research-implementation-identity.mjs';
import { largeSourcePreflightImplementationIdentity } from
  './large-source-preflight-implementation-identity.mjs';
import {
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import {
  RESEARCH_SOURCE_MANIFEST_PROTOCOL,
  assertResearchSourceManifest,
} from './research-source-manifest-contract.mjs';
import { loadResearchSourceAdmissionGate } from './research-source-admission-gate.mjs';

export const LARGE_SOURCE_READINESS_PROTOCOL = 'eslm-rl-large-source-readiness-v1';
export const LARGE_SOURCE_READINESS_GATE_PROTOCOL =
  'eslm-processing-graph-large-source-readiness-gate-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const AUTHORITY = Object.freeze({
  executionAdmission: 'exact-frozen-projection-only',
  answer: 'none',
  runtime: 'none',
  proof: 'none',
  promotion: 'none',
});

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${path} must be a bounded integer >= ${minimum}.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function bool(value, path) {
  if (typeof value !== 'boolean') throw new TypeError(`${path} must be boolean.`);
}

function boundedStrings(value, path) {
  if (!Array.isArray(value) || value.length > 128
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 256)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique string array.`);
  }
}

function computedFailures(readiness) {
  const failures = [];
  if (!readiness.pilot.complete
      || readiness.pilot.rowsVisited !== readiness.pilot.rowsAvailable
      || readiness.pilot.strataVisited !== readiness.pilot.strataAvailable) {
    failures.push('pilot-incomplete');
  }
  if (!readiness.streaming.deterministicReplay || !readiness.streaming.shardEquivalence
      || !readiness.streaming.inputStreamResumeTested) failures.push('streaming-not-verified');
  if (readiness.streaming.peakBytes > readiness.streaming.maximumPeakBytes) {
    failures.push('peak-memory-exceeded');
  }
  if (readiness.rights.state !== 'approved' || !readiness.rights.removalPlanTested) {
    failures.push('rights-gate-open');
  }
  if (!readiness.contamination.lineageFrozen
      || !readiness.contamination.protectedIsolationVerified) {
    failures.push('contamination-gate-open');
  }
  return failures;
}

export function assertLargeSourceReadiness(readiness) {
  exact(readiness, [
    'format', 'sourceRevision', 'componentId', 'projectionId', 'sourceManifestDigest',
    'pilotProjectionDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest', 'preflightReceiptDigest',
    'pilot', 'streaming', 'rights',
    'contamination', 'scalePlan', 'decision',
  ], 'Large-source readiness');
  if (readiness.format !== LARGE_SOURCE_READINESS_PROTOCOL) {
    throw new TypeError('Large-source readiness protocol is unsupported.');
  }
  for (const field of ['sourceRevision', 'componentId', 'projectionId']) {
    if (typeof readiness[field] !== 'string' || readiness[field].length < 1
        || readiness[field].length > 192) {
      throw new TypeError(`Large-source readiness ${field} must be bounded text.`);
    }
  }
  for (const field of [
    'sourceManifestDigest', 'pilotProjectionDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest', 'preflightReceiptDigest',
  ]) {
    digest(readiness[field], `Large-source readiness ${field}`);
  }
  exact(readiness.pilot, [
    'rowsAvailable', 'rowsVisited', 'strataAvailable', 'strataVisited',
    'projectionLossRate', 'complete',
  ], 'Large-source readiness pilot');
  for (const field of ['rowsAvailable', 'rowsVisited', 'strataAvailable', 'strataVisited']) {
    count(readiness.pilot[field], `Large-source readiness pilot.${field}`, 1);
  }
  if (!Number.isFinite(readiness.pilot.projectionLossRate)
      || readiness.pilot.projectionLossRate < 0 || readiness.pilot.projectionLossRate > 1) {
    throw new TypeError('Large-source readiness projection loss must be a finite rate.');
  }
  bool(readiness.pilot.complete, 'Large-source readiness pilot.complete');
  exact(readiness.streaming, [
    'deterministicReplay', 'shardEquivalence', 'inputStreamResumeTested', 'peakBytes',
    'maximumPeakBytes',
  ], 'Large-source readiness streaming');
  for (const field of ['deterministicReplay', 'shardEquivalence', 'inputStreamResumeTested']) {
    bool(readiness.streaming[field], `Large-source readiness streaming.${field}`);
  }
  count(readiness.streaming.peakBytes, 'Large-source readiness streaming.peakBytes');
  count(readiness.streaming.maximumPeakBytes,
    'Large-source readiness streaming.maximumPeakBytes', 1);
  exact(readiness.rights, ['state', 'removalPlanTested'], 'Large-source readiness rights');
  if (!['approved', 'review-required', 'denied', 'withdrawn'].includes(readiness.rights.state)) {
    throw new TypeError('Large-source readiness rights state is unsupported.');
  }
  bool(readiness.rights.removalPlanTested, 'Large-source readiness removal plan');
  exact(readiness.contamination, [
    'lineageFrozen', 'protectedIsolationVerified', 'knownOverlaps',
  ], 'Large-source readiness contamination');
  bool(readiness.contamination.lineageFrozen, 'Large-source readiness frozen lineage');
  bool(readiness.contamination.protectedIsolationVerified,
    'Large-source readiness protected isolation');
  boundedStrings(readiness.contamination.knownOverlaps,
    'Large-source readiness known overlaps');
  exact(readiness.scalePlan, [
    'stage', 'shards', 'maximumRows', 'maximumBytes', 'maximumPeakBytes',
    'checkpointEveryShards', 'stopConditions',
  ], 'Large-source readiness scale plan');
  if (readiness.scalePlan.stage !== 'large-corpus') {
    throw new TypeError('Large-source readiness scale stage must be large-corpus.');
  }
  for (const field of [
    'shards', 'maximumRows', 'maximumBytes', 'maximumPeakBytes', 'checkpointEveryShards',
  ]) count(readiness.scalePlan[field], `Large-source readiness scalePlan.${field}`, 1);
  boundedStrings(readiness.scalePlan.stopConditions, 'Large-source readiness stop conditions');
  if (!['admit', 'block'].includes(readiness.decision)
      || (computedFailures(readiness).length === 0) !== (readiness.decision === 'admit')
      || readiness.scalePlan.maximumPeakBytes !== readiness.streaming.maximumPeakBytes) {
    throw new TypeError('Large-source readiness decision contradicts its independent gates.');
  }
  return readiness;
}

function assertBoundSource(
  readiness, manifest, plan, admission, preflight, bindings, liveImplementation,
  livePreflightImplementation, livePreflightScriptDigest, preflightPath,
) {
  assertResearchSourceManifest(manifest);
  assertResearchDiscoveryPlan(plan);
  const [sourceId, revision] = readiness.sourceRevision.split('@');
  const component = manifest.components?.find((item) => item.componentId === readiness.componentId);
  const scope = plan.sourceScopes?.find((item) => item.componentId === readiness.componentId
    && item.sourceRevision === readiness.sourceRevision);
  const projectedRows = scope?.splits?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rowsAdmitted, 0);
  const declaredRows = scope?.splits?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rowsDeclared, 0);
  const manifestRows = component?.splits?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const hiddenPlanRows = scope?.splits?.filter((item) => item.visibility !== 'training-visible')
    .reduce((sum, item) => sum + item.rowsAdmitted, 0);
  const manifestNonTrainingRows = component?.splits
    ?.filter((item) => item.visibility !== 'training-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const removalObligationsDigest = `sha256:${sha256(stableStringify(manifest.removalObligations))}`;
  if (manifest.format !== RESEARCH_SOURCE_MANIFEST_PROTOCOL
      || manifest.sourceId !== sourceId || manifest.revision !== revision
      || manifest.registryState !== 'pilot-approved'
      || !Array.isArray(manifest.removalObligations) || manifest.removalObligations.length < 1
      || !component || !scope
      || component.rightsState !== 'approved'
      || !component.allowedUses?.includes('processing-graph-discovery')
      || component.redistribution === 'forbidden'
      || component.projection?.privacyReview !== 'passed'
      || component.projection?.safetyReview !== 'passed'
      || plan.state !== 'approved'
      || plan.workPolicy.progressionStage !== 'scale'
      || plan.workPolicy.limits.maxEpisodes < projectedRows
      || plan.workPolicy.limits.maxRowsScanned < projectedRows
      || hiddenPlanRows !== 0
      || readiness.sourceManifestDigest !== bindings.sourceManifestDigest
      || readiness.discoveryPlanArtifactDigest !== bindings.discoveryPlanArtifactDigest
      || readiness.discoveryPlanContentDigest !== bindings.discoveryPlanContentDigest
      || readiness.sourceAdmissionReceiptDigest !== bindings.sourceAdmissionReceiptDigest
      || readiness.preflightReceiptDigest !== bindings.preflightReceiptDigest
      || component.projection?.projectionId !== readiness.projectionId
      || component.projection?.membershipDigest !== readiness.pilotProjectionDigest
      || scope.projectionId !== readiness.projectionId
      || scope.projectionDigest !== readiness.pilotProjectionDigest
      || plan.baselineGraphDigest !== bindings.baselineGraphDigest
      || projectedRows !== readiness.pilot.rowsAvailable
      || projectedRows !== readiness.pilot.rowsVisited
      || declaredRows !== manifestRows
      || manifestRows !== readiness.scalePlan.maximumRows
      || component.projection.shardCount !== readiness.scalePlan.shards
      || component.identity?.bytes > readiness.scalePlan.maximumBytes
      || preflight.source.sourceRevision !== readiness.sourceRevision
      || preflight.source.sourceManifestDigest !== bindings.sourceManifestDigest
      || preflight.source.discoveryPlanArtifactDigest
        !== bindings.discoveryPlanArtifactDigest
      || preflight.source.discoveryPlanContentDigest
        !== bindings.discoveryPlanContentDigest
      || preflight.source.sourceAdmissionReceiptDigest
        !== bindings.sourceAdmissionReceiptDigest
      || preflight.source.registryDigest !== admission.registry.digest
      || preflight.analysisReplay.registryDigest !== admission.registry.digest
      || preflight.analysisReplay.workPolicyDigest
        !== `sha256:${sha256(stableStringify(plan.workPolicy))}`
      || admission.planBinding.planArtifactDigest
        !== bindings.discoveryPlanArtifactDigest
      || admission.planBinding.planContentDigest
        !== bindings.discoveryPlanContentDigest
      || admission.manifestBindings[0]?.manifestDigest !== bindings.sourceManifestDigest
      || stableStringify(admission.workPolicy) !== stableStringify(plan.workPolicy)
      || preflight.source.componentId !== readiness.componentId
      || preflight.source.projectionId !== readiness.projectionId
      || preflight.source.projectionDigest !== readiness.pilotProjectionDigest
      || preflight.baselineGraph.catalogDigest !== bindings.baselineGraphDigest
      || preflight.implementationIdentity.aggregateDigest !== liveImplementation.aggregateDigest
      || preflight.preflightImplementationIdentity.aggregateDigest
        !== livePreflightImplementation.aggregateDigest
      || preflight.command.executable !== process.execPath
      || preflight.command.arguments.length !== 3
      || preflight.command.arguments[0] !== LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH
      || preflight.command.arguments[1] !== '--output'
      || resolve(preflight.command.arguments[2]) !== resolve(preflightPath)
      || preflight.command.scriptDigest !== livePreflightScriptDigest
      || preflight.projection.episodes !== readiness.pilot.rowsAvailable
      || preflight.projection.shards.length !== readiness.scalePlan.shards
      || preflight.analysisReplay.inputStreamCheckpoint.checkpointShard
        !== readiness.scalePlan.checkpointEveryShards
      || preflight.streaming.peakRssBytes !== readiness.streaming.peakBytes
      || preflight.streaming.maximumPeakRssBytes !== readiness.streaming.maximumPeakBytes
      || preflight.removal.obligationsDigest !== removalObligationsDigest
      || preflight.contamination.developmentRowsInSource !== manifestNonTrainingRows
      || preflight.contamination.developmentRowsVisited !== 0
      || preflight.contamination.protectedRowsVisited !== 0) {
    throw new TypeError('Large-source readiness does not bind the frozen source, plan, or projection.');
  }
}

export function assertLargeSourceReadinessGate(gate) {
  exact(gate, [
    'format', 'readiness', 'bindings', 'decision', 'failures', 'authority', 'receiptDigest',
  ], 'Large-source readiness gate');
  if (gate.format !== LARGE_SOURCE_READINESS_GATE_PROTOCOL) {
    throw new TypeError('Large-source readiness gate protocol is unsupported.');
  }
  assertLargeSourceReadiness(gate.readiness);
  exact(gate.bindings, [
    'sourceManifestDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest',
    'preflightReceiptDigest', 'baselineGraphDigest',
  ], 'Large-source readiness bindings');
  for (const field of Object.keys(gate.bindings)) {
    digest(gate.bindings[field], `Large-source readiness binding.${field}`);
  }
  boundedStrings(gate.failures, 'Large-source readiness gate failures');
  exact(gate.authority, Object.keys(AUTHORITY), 'Large-source readiness gate authority');
  if (gate.decision !== gate.readiness.decision
      || stableStringify(gate.failures) !== stableStringify(computedFailures(gate.readiness))
      || stableStringify(gate.authority) !== stableStringify(AUTHORITY)) {
    throw new TypeError('Large-source readiness gate decision or authority is inconsistent.');
  }
  digest(gate.receiptDigest, 'Large-source readiness gate receipt digest');
  const unsigned = { ...gate };
  delete unsigned.receiptDigest;
  if (gate.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Large-source readiness gate receipt digest is invalid.');
  }
  return gate;
}

export async function loadLargeSourceReadinessGate({
  readinessPath,
  sourceManifestPath,
  discoveryPlanPath,
  preflightPath,
  baselineGraphDigest,
  expected = null,
}) {
  if (!expected) {
    throw new TypeError('Large-source readiness requires an exact expected source contract.');
  }
  const [
    readinessBytes, manifestBytes, planBytes, preflightBytes, liveImplementation,
    livePreflightImplementation, livePreflightScriptBytes,
  ] = await Promise.all([
    readFile(resolve(readinessPath)), readFile(resolve(sourceManifestPath)),
    readFile(resolve(discoveryPlanPath)), readFile(resolve(preflightPath)),
    processingGraphResearchImplementationIdentity(),
    largeSourcePreflightImplementationIdentity(),
    readFile(new URL('../../scripts/run-oasst1-large-source-preflight.mjs', import.meta.url)),
  ]);
  const readiness = assertLargeSourceReadiness(JSON.parse(readinessBytes.toString('utf8')));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const plan = JSON.parse(planBytes.toString('utf8'));
  const preflight = assertLargeSourcePreflightReceipt(JSON.parse(preflightBytes.toString('utf8')));
  const admission = await loadResearchSourceAdmissionGate({
    manifestPaths: [resolve(sourceManifestPath)],
    discoveryPlanPath: resolve(discoveryPlanPath),
    baselineGraphDigest,
    expectedSources: [expected],
  });
  const bindings = {
    sourceManifestDigest: `sha256:${sha256(manifestBytes)}`,
    discoveryPlanArtifactDigest: `sha256:${sha256(planBytes)}`,
    discoveryPlanContentDigest: researchDiscoveryPlanDigest(plan),
    sourceAdmissionReceiptDigest: admission.receiptDigest,
    preflightReceiptDigest: `sha256:${sha256(preflightBytes)}`,
    baselineGraphDigest,
  };
  assertBoundSource(
    readiness, manifest, plan, admission, preflight, bindings, liveImplementation,
    livePreflightImplementation,
    `sha256:${sha256(livePreflightScriptBytes)}`,
    preflightPath,
  );
  const expectedTrainingRows = expected.trainingRows ?? expected.rawRows ?? expected.rawTrees;
  const expectedDevelopmentRows = expected.developmentRows ?? 0;
  const manifestTrainingRows = manifest.components?.[0]?.splits
    ?.filter((item) => item.visibility === 'training-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const manifestDevelopmentRows = manifest.components?.[0]?.splits
    ?.filter((item) => item.visibility === 'development-visible')
    .reduce((sum, item) => sum + item.rows, 0);
  const expectedProjectedRows = expected.projectedRows ?? expected.projectedTrees;
  const expectedProjectionLoss = Number(
    (1 - expectedProjectedRows / expectedTrainingRows).toFixed(6),
  );
  if (readiness.sourceRevision !== `${expected.sourceId}@${expected.revision}`
      || readiness.componentId !== expected.componentId
      || readiness.projectionId !== expected.projectionId
      || manifest.identity?.sha256 !== `sha256:${expected.sha256}`
      || manifest.identity?.bytes !== expected.bytes
      || manifest.components[0]?.identity?.sha256 !== `sha256:${expected.sha256}`
      || manifest.components[0]?.identity?.rows !== (expected.rawRows ?? expected.rawTrees)
      || readiness.pilotProjectionDigest !== expected.projectionDigest
      || readiness.pilot.rowsAvailable !== expectedProjectedRows
      || readiness.pilot.projectionLossRate !== expectedProjectionLoss
      || readiness.scalePlan.shards !== expected.shardCount
      || preflight.projection.manifestDigest !== expected.projectionManifestDigest
      || preflight.source.validationMembershipDigest !== expected.validationMembershipDigest
      || readiness.scalePlan.maximumRows !== expectedTrainingRows
      || manifestTrainingRows !== expectedTrainingRows
      || manifestDevelopmentRows !== expectedDevelopmentRows
      || readiness.scalePlan.maximumBytes < expected.bytes) {
    throw new TypeError('Large-source readiness does not match the selected source adapter.');
  }
  const gate = {
    format: LARGE_SOURCE_READINESS_GATE_PROTOCOL,
    readiness,
    bindings,
    decision: readiness.decision,
    failures: computedFailures(readiness),
    authority: AUTHORITY,
  };
  gate.receiptDigest = `sha256:${sha256(stableStringify(gate))}`;
  assertLargeSourceReadinessGate(gate);
  if (gate.decision !== 'admit') {
    throw new Error(`Large-source execution is blocked: ${gate.failures.join(', ')}.`);
  }
  return Object.freeze(gate);
}
