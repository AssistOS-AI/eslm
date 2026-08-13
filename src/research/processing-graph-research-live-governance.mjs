import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadLargeSourceReadinessGate } from './large-source-readiness-gate.mjs';
import { currentProcessingGraphBaseline } from './research-implementation-identity.mjs';
import { loadResearchSourceAdmissionGate } from './research-source-admission-gate.mjs';
import { assertProcessingGraphResearchWorkPolicy } from
  './processing-graph-research-work-policy.mjs';
import {
  RESEARCH_SOURCE_MANIFEST_PROTOCOL,
  assertResearchSourceManifest,
} from './research-source-manifest-contract.mjs';
import {
  DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS,
  DEFAULT_PROCESSING_GRAPH_PILOT_PATHS,
  loadProcessingGraphPilotAdmission,
} from './processing-graph-pilot-runner.mjs';
import {
  DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN,
  DEFAULT_OASST1_DISCOVERY_PLAN,
  DEFAULT_OASST1_PATH,
  DEFAULT_OASST1_PREFLIGHT,
  DEFAULT_OASST1_READINESS,
  DEFAULT_OASST1_SOURCE_MANIFEST,
  OASST1_LARGE_SOURCE,
} from './processing-graph-scale-runner.mjs';
import { HELPSTEER2_PILOT } from './sources/helpsteer2-pilot.mjs';
import { GSM8K_SOCRATIC_PILOT } from './sources/gsm8k-socratic-pilot.mjs';

export const PROCESSING_GRAPH_LIVE_GOVERNANCE_PROTOCOL =
  'eslm-processing-graph-live-governance-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const LIVE_SOURCE_PATHS = Object.freeze({
  helpsteer2: DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.helpSteer2,
  gsm8k: DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.gsm8kSocratic,
  oasst1: DEFAULT_OASST1_PATH,
});

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function nullableDigest(value, path) {
  if (value !== null) digest(value, path);
}

function boundedText(value, path) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) {
    throw new TypeError(`${path} must be bounded text.`);
  }
}

function nullableText(value, path) {
  if (value !== null) boundedText(value, path);
}

async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return `sha256:${hash.digest('hex')}`;
}

async function inspectFrozenCache(root, relativePath, identity) {
  const path = resolve(root, relativePath);
  try {
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size !== identity.bytes) {
      return {
        state: 'blocked', expectedBytes: identity.bytes,
        observedBytes: metadata.isFile() ? metadata.size : null,
        identityVerified: false, stopReason: 'cached-source-size-mismatch',
      };
    }
    const observedDigest = await sha256File(path);
    if (observedDigest !== identity.sha256) {
      return {
        state: 'blocked', expectedBytes: identity.bytes, observedBytes: metadata.size,
        identityVerified: false, stopReason: 'cached-source-digest-mismatch',
      };
    }
    return {
      state: 'cached', expectedBytes: identity.bytes, observedBytes: metadata.size,
      identityVerified: true, stopReason: null,
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return {
      state: 'reviewed', expectedBytes: identity.bytes, observedBytes: null,
      identityVerified: false, stopReason: 'frozen-source-cache-absent',
    };
  }
}

function manifestSnapshot(bytes, manifest, cache) {
  const path = `Live source manifest ${manifest?.sourceId ?? '<unknown>'}`;
  assertResearchSourceManifest(manifest);
  if (manifest?.format !== RESEARCH_SOURCE_MANIFEST_PROTOCOL) {
    throw new TypeError(`${path} uses an unsupported protocol.`);
  }
  boundedText(manifest.sourceId, `${path}.sourceId`);
  boundedText(manifest.revision, `${path}.revision`);
  digest(manifest.identity?.sha256, `${path}.identity.sha256`);
  count(manifest.identity?.bytes, `${path}.identity.bytes`, { positive: true });
  if (!Array.isArray(manifest.components) || manifest.components.length !== 1) {
    throw new TypeError(`${path} must contain exactly one selected component.`);
  }
  const component = manifest.components[0];
  boundedText(component.componentId, `${path}.componentId`);
  boundedText(component.kind, `${path}.kind`);
  boundedText(component.rightsState, `${path}.rightsState`);
  count(component.identity?.rows, `${path}.identity.rows`, { positive: true });
  digest(component.projection?.membershipDigest, `${path}.projection.membershipDigest`);
  digest(component.projection?.contentMembershipDigest,
    `${path}.projection.contentMembershipDigest`);
  count(component.projection?.shardCount, `${path}.projection.shardCount`, { positive: true });
  if (!Array.isArray(component.splits) || component.splits.length < 1) {
    throw new TypeError(`${path}.splits must be non-empty.`);
  }
  const splits = component.splits.map((split, index) => {
    boundedText(split.name, `${path}.splits[${index}].name`);
    if (!['training-visible', 'development-visible', 'protected'].includes(split.visibility)) {
      throw new TypeError(`${path}.splits[${index}].visibility is unsupported.`);
    }
    count(split.rows, `${path}.splits[${index}].rows`);
    return { name: split.name, visibility: split.visibility, rows: split.rows };
  });
  return {
    sourceId: manifest.sourceId,
    revision: manifest.revision,
    manifestDigest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    manifestRegistryState: manifest.registryState,
    sourceDigest: manifest.identity.sha256,
    sourceBytes: manifest.identity.bytes,
    sourceRows: component.identity.rows,
    componentId: component.componentId,
    componentKind: component.kind,
    rightsState: component.rightsState,
    splits,
    projectionId: component.projection.projectionId,
    projectionDigest: component.projection.membershipDigest,
    contentMembershipDigest: component.projection.contentMembershipDigest,
    shardCount: component.projection.shardCount,
    shardFormat: component.projection.shardFormat,
    acquisition: cache,
  };
}

function gateOutcome(result, failureReason) {
  if (result.status === 'fulfilled') {
    return {
      state: 'admitted', receiptDigest: result.value.receiptDigest,
      registryDigest: result.value.registry.digest,
      planBinding: structuredClone(result.value.planBinding),
      workPolicy: structuredClone(result.value.workPolicy), stopReason: null,
    };
  }
  return {
    state: 'blocked', receiptDigest: null, registryDigest: null,
    planBinding: null, workPolicy: null, stopReason: failureReason,
  };
}

function readinessOutcome(result, failureReason) {
  if (result.status === 'fulfilled') {
    return {
      state: 'admitted', receiptDigest: result.value.receiptDigest,
      bindings: structuredClone(result.value.bindings), stopReason: null,
      stage: result.value.readiness.scalePlan.stage,
    };
  }
  return {
    state: 'blocked', receiptDigest: null, bindings: null,
    stopReason: failureReason, stage: null,
  };
}

function sourceGateOutcome(result, sourceId, failureReason) {
  if (result.status !== 'fulfilled') {
    return {
      state: 'blocked', receiptDigest: null, projectedRows: null,
      projectionDigest: null, contentMembershipDigest: null, shardCount: null,
      discoveryPlanArtifactDigest: null, discoveryPlanContentDigest: null,
      stopReason: failureReason,
    };
  }
  const binding = result.value.manifestBindings.find((item) =>
    item.sourceRevision.startsWith(`${sourceId}@`));
  if (!binding) throw new TypeError(`Admission gate omits source ${sourceId}.`);
  return {
    state: 'admitted', receiptDigest: result.value.receiptDigest,
    projectedRows: binding.projectedRows, projectionDigest: binding.projectionDigest,
    contentMembershipDigest: binding.contentMembershipDigest,
    shardCount: binding.shardCount,
    discoveryPlanArtifactDigest: result.value.planBinding.planArtifactDigest,
    discoveryPlanContentDigest: result.value.planBinding.planContentDigest, stopReason: null,
  };
}

export async function loadLiveProcessingGraphResearchGovernance({
  root = process.cwd(),
} = {}) {
  const baselineGraphDigest = currentProcessingGraphBaseline().catalogDigest;
  const manifestPaths = [
    ...DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests,
    DEFAULT_OASST1_SOURCE_MANIFEST,
  ];
  const manifestArtifacts = await Promise.all(manifestPaths.map(async (relativePath) => {
    const bytes = await readFile(resolve(root, relativePath));
    return { bytes, value: JSON.parse(bytes.toString('utf8')) };
  }));
  const cacheInspections = await Promise.all(manifestArtifacts.map(({ value }) => {
    const relativePath = LIVE_SOURCE_PATHS[value.sourceId];
    if (!relativePath) {
      throw new TypeError(`No live cache identity path is registered for ${value.sourceId}.`);
    }
    return inspectFrozenCache(root, relativePath, value.identity);
  }));
  const [
    pilotAdmissionResult, largeAdmissionResult, combinedAdmissionResult, readinessResult,
  ] = await Promise.allSettled([
    loadProcessingGraphPilotAdmission({
      manifests: DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests
        .map((path) => resolve(root, path)),
      plan: resolve(root, DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.plan),
    }),
    loadResearchSourceAdmissionGate({
      manifestPaths: [resolve(root, DEFAULT_OASST1_SOURCE_MANIFEST)],
      discoveryPlanPath: resolve(root, DEFAULT_OASST1_DISCOVERY_PLAN),
      baselineGraphDigest,
      expectedSources: [OASST1_LARGE_SOURCE],
    }),
    loadResearchSourceAdmissionGate({
      manifestPaths: manifestPaths.map((path) => resolve(root, path)),
      discoveryPlanPath: resolve(root, DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN),
      baselineGraphDigest,
      expectedSources: [HELPSTEER2_PILOT, GSM8K_SOCRATIC_PILOT, OASST1_LARGE_SOURCE],
    }),
    loadLargeSourceReadinessGate({
      readinessPath: resolve(root, DEFAULT_OASST1_READINESS),
      sourceManifestPath: resolve(root, DEFAULT_OASST1_SOURCE_MANIFEST),
      discoveryPlanPath: resolve(root, DEFAULT_OASST1_DISCOVERY_PLAN),
      preflightPath: resolve(root, DEFAULT_OASST1_PREFLIGHT),
      baselineGraphDigest,
      expected: OASST1_LARGE_SOURCE,
    }),
  ]);
  const pilotAdmission = gateOutcome(
    pilotAdmissionResult, 'pilot-source-admission-gate-rejected',
  );
  const largeAdmission = gateOutcome(
    largeAdmissionResult, 'large-source-admission-gate-rejected',
  );
  const combinedAdmission = gateOutcome(
    combinedAdmissionResult, 'combined-source-admission-gate-rejected',
  );
  const readiness = readinessOutcome(
    readinessResult, 'large-source-readiness-gate-rejected',
  );
  const sources = manifestArtifacts.map(({ bytes, value }, index) => ({
    ...manifestSnapshot(bytes, value, cacheInspections[index]),
    admission: sourceGateOutcome(
      value.sourceId === OASST1_LARGE_SOURCE.sourceId
        ? largeAdmissionResult : pilotAdmissionResult,
      value.sourceId,
      value.sourceId === OASST1_LARGE_SOURCE.sourceId
        ? 'large-source-admission-gate-rejected' : 'pilot-source-admission-gate-rejected',
    ),
  })).toSorted((left, right) => left.sourceId.localeCompare(right.sourceId));
  const combinedRegistryDigest = combinedAdmissionResult.status === 'fulfilled'
    ? combinedAdmissionResult.value.registry.digest : null;
  return {
    format: PROCESSING_GRAPH_LIVE_GOVERNANCE_PROTOCOL,
    checkedAgainstBaselineGraphDigest: baselineGraphDigest,
    sources,
    pilotAdmission,
    largeSourceAdmission: largeAdmission,
    combinedAdmission,
    combinedRegistryDigest,
    readiness,
  };
}

function assertLiveGate(value, path, { readiness = false } = {}) {
  exact(value, readiness
    ? ['state', 'receiptDigest', 'bindings', 'stopReason', 'stage']
    : ['state', 'receiptDigest', 'registryDigest', 'planBinding', 'workPolicy',
      'stopReason'], path);
  if (!['admitted', 'blocked'].includes(value.state)) {
    throw new TypeError(`${path}.state is unsupported.`);
  }
  nullableDigest(value.receiptDigest, `${path}.receiptDigest`);
  if (!readiness) nullableDigest(value.registryDigest, `${path}.registryDigest`);
  const binding = readiness ? value.bindings : value.planBinding;
  if (binding !== null) {
    const fields = readiness
      ? ['sourceManifestDigest', 'discoveryPlanArtifactDigest',
        'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest',
        'preflightReceiptDigest', 'baselineGraphDigest']
      : ['planId', 'cycleId', 'planArtifactDigest', 'planContentDigest',
        'baselineGraphDigest'];
    exact(binding, fields, `${path}.${readiness ? 'bindings' : 'planBinding'}`);
    for (const field of fields.filter((item) => item.endsWith('Digest'))) {
      digest(binding[field], `${path}.${readiness ? 'bindings' : 'planBinding'}.${field}`);
    }
    if (!readiness) {
      boundedText(binding.planId, `${path}.planBinding.planId`);
      boundedText(binding.cycleId, `${path}.planBinding.cycleId`);
    }
  }
  if (!readiness && value.workPolicy !== null) {
    assertProcessingGraphResearchWorkPolicy(value.workPolicy);
  }
  nullableText(value.stopReason, `${path}.stopReason`);
  if ((value.state === 'admitted') !== (value.receiptDigest !== null
      && binding !== null && (readiness || value.registryDigest !== null)
      && (readiness || value.workPolicy !== null)
      && value.stopReason === null)) {
    throw new TypeError(`${path} state, identity, and stop reason are inconsistent.`);
  }
  if (readiness && value.stage !== null && value.stage !== 'large-corpus') {
    throw new TypeError(`${path}.stage must be large-corpus when present.`);
  }
}

function assertLiveSource(value, index) {
  const path = `Live research governance source[${index}]`;
  exact(value, [
    'sourceId', 'revision', 'manifestDigest', 'manifestRegistryState', 'sourceDigest',
    'sourceBytes', 'sourceRows', 'componentId', 'componentKind', 'rightsState', 'splits',
    'projectionId', 'projectionDigest', 'contentMembershipDigest', 'shardCount',
    'shardFormat', 'acquisition',
    'admission',
  ], path);
  for (const field of [
    'sourceId', 'revision', 'manifestRegistryState', 'componentId', 'componentKind',
    'rightsState', 'projectionId', 'shardFormat',
  ]) boundedText(value[field], `${path}.${field}`);
  for (const field of [
    'manifestDigest', 'sourceDigest', 'projectionDigest', 'contentMembershipDigest',
  ]) {
    digest(value[field], `${path}.${field}`);
  }
  count(value.sourceBytes, `${path}.sourceBytes`, { positive: true });
  count(value.sourceRows, `${path}.sourceRows`, { positive: true });
  count(value.shardCount, `${path}.shardCount`, { positive: true });
  if (!Array.isArray(value.splits) || value.splits.length < 1) {
    throw new TypeError(`${path}.splits must be non-empty.`);
  }
  let splitRows = 0;
  for (const [splitIndex, split] of value.splits.entries()) {
    exact(split, ['name', 'visibility', 'rows'], `${path}.splits[${splitIndex}]`);
    boundedText(split.name, `${path}.splits[${splitIndex}].name`);
    if (!['training-visible', 'development-visible', 'protected'].includes(split.visibility)) {
      throw new TypeError(`${path}.splits[${splitIndex}].visibility is unsupported.`);
    }
    count(split.rows, `${path}.splits[${splitIndex}].rows`);
    splitRows += split.rows;
  }
  if (splitRows !== value.sourceRows) {
    throw new TypeError(`${path} split rows do not reproduce source rows.`);
  }
  exact(value.acquisition, [
    'state', 'expectedBytes', 'observedBytes', 'identityVerified', 'stopReason',
  ], `${path}.acquisition`);
  if (!['reviewed', 'cached', 'blocked'].includes(value.acquisition.state)
      || value.acquisition.expectedBytes !== value.sourceBytes
      || (value.acquisition.observedBytes !== null
        && (!Number.isSafeInteger(value.acquisition.observedBytes)
          || value.acquisition.observedBytes < 0))
      || typeof value.acquisition.identityVerified !== 'boolean') {
    throw new TypeError(`${path}.acquisition is inconsistent.`);
  }
  nullableText(value.acquisition.stopReason, `${path}.acquisition.stopReason`);
  if (value.acquisition.state === 'cached'
      && (!value.acquisition.identityVerified
        || value.acquisition.observedBytes !== value.sourceBytes
        || value.acquisition.stopReason !== null)) {
    throw new TypeError(`${path}.acquisition cannot claim an unverified cache.`);
  }
  exact(value.admission, [
    'state', 'receiptDigest', 'projectedRows', 'projectionDigest', 'contentMembershipDigest',
    'shardCount',
    'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest', 'stopReason',
  ], `${path}.admission`);
  if (!['admitted', 'blocked'].includes(value.admission.state)) {
    throw new TypeError(`${path}.admission state is unsupported.`);
  }
  nullableDigest(value.admission.receiptDigest, `${path}.admission.receiptDigest`);
  nullableDigest(value.admission.projectionDigest, `${path}.admission.projectionDigest`);
  nullableDigest(value.admission.contentMembershipDigest,
    `${path}.admission.contentMembershipDigest`);
  nullableDigest(value.admission.discoveryPlanArtifactDigest,
    `${path}.admission.discoveryPlanArtifactDigest`);
  nullableDigest(value.admission.discoveryPlanContentDigest,
    `${path}.admission.discoveryPlanContentDigest`);
  nullableText(value.admission.stopReason, `${path}.admission.stopReason`);
  for (const field of ['projectedRows', 'shardCount']) {
    if (value.admission[field] !== null) {
      count(value.admission[field], `${path}.admission.${field}`, { positive: true });
    }
  }
  const admitted = value.admission.receiptDigest !== null
    && value.admission.projectedRows !== null
    && value.admission.discoveryPlanArtifactDigest !== null
    && value.admission.discoveryPlanContentDigest !== null
    && value.admission.projectionDigest === value.projectionDigest
    && value.admission.contentMembershipDigest === value.contentMembershipDigest
    && value.admission.shardCount === value.shardCount
    && value.admission.stopReason === null;
  if ((value.admission.state === 'admitted') !== admitted) {
    throw new TypeError(`${path}.admission does not bind its live projection.`);
  }
}

export function assertLiveProcessingGraphResearchGovernance(value) {
  exact(value, [
    'format', 'checkedAgainstBaselineGraphDigest', 'sources', 'pilotAdmission',
    'largeSourceAdmission', 'combinedAdmission', 'combinedRegistryDigest', 'readiness',
  ], 'Live research governance');
  if (value.format !== PROCESSING_GRAPH_LIVE_GOVERNANCE_PROTOCOL) {
    throw new TypeError('Live research governance protocol is unsupported.');
  }
  digest(value.checkedAgainstBaselineGraphDigest,
    'Live research governance baseline graph digest');
  if (!Array.isArray(value.sources) || value.sources.length !== 3) {
    throw new TypeError('Live research governance must contain the three selected sources.');
  }
  value.sources.forEach(assertLiveSource);
  const sourceIds = value.sources.map((item) => item.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length
      || JSON.stringify(sourceIds) !== JSON.stringify(sourceIds.toSorted())) {
    throw new TypeError('Live research governance sources must be unique and sorted.');
  }
  assertLiveGate(value.pilotAdmission, 'Live research pilot admission');
  assertLiveGate(value.largeSourceAdmission, 'Live research large-source admission');
  assertLiveGate(value.combinedAdmission, 'Live research combined admission');
  assertLiveGate(value.readiness, 'Live research readiness', { readiness: true });
  nullableDigest(value.combinedRegistryDigest, 'Live research combined registry digest');
  if ((value.combinedAdmission.state === 'admitted')
      !== (value.combinedRegistryDigest !== null)
      || (value.combinedAdmission.state === 'admitted'
        && (value.pilotAdmission.state !== 'admitted'
          || value.largeSourceAdmission.state !== 'admitted'))) {
    throw new TypeError('Live research combined registry identity contradicts source admission.');
  }
  return value;
}
