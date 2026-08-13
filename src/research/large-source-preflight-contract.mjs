import { sha256, stableStringify } from '../util.mjs';
import { LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL } from './large-source-input-checkpoint.mjs';
import { assertResearchImplementationIdentity } from './research-implementation-identity.mjs';
import { assertLargeSourcePreflightImplementationIdentity } from
  './large-source-preflight-implementation-identity.mjs';

export const LARGE_SOURCE_PREFLIGHT_PROTOCOL = 'eslm-rl-large-source-preflight-v1';
export const LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH =
  'scripts/run-oasst1-large-source-preflight.mjs';
export const LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES = 402_653_184;
export const LARGE_SOURCE_PREFLIGHT_AUTHORITY = Object.freeze({
  executionAdmission: 'preflight-evidence-only',
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
});

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

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

function count(value, path, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${path} must be a bounded integer >= ${minimum}.`);
  }
}

function boundedText(value, path, maximum = 512) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function assertShard(shard, index) {
  exact(shard, [
    'index', 'file', 'rows', 'sha256', 'episodeMembershipDigest',
    'contentMembershipDigest',
  ],
    `Large-source preflight shard[${index}]`);
  if (shard.index !== index || shard.file !== `shard-${String(index).padStart(2, '0')}.jsonl`) {
    throw new TypeError(`Large-source preflight shard[${index}] identity is not canonical.`);
  }
  count(shard.rows, `Large-source preflight shard[${index}].rows`);
  digest(shard.sha256, `Large-source preflight shard[${index}].sha256`);
  digest(shard.episodeMembershipDigest,
    `Large-source preflight shard[${index}].episodeMembershipDigest`);
  digest(shard.contentMembershipDigest,
    `Large-source preflight shard[${index}].contentMembershipDigest`);
}

export function assertLargeSourcePreflightReceipt(receipt) {
  exact(receipt, [
    'format', 'command', 'implementationIdentity', 'preflightImplementationIdentity',
    'baselineGraph', 'source', 'projection', 'analysisReplay', 'streaming', 'removal',
    'contamination', 'complete', 'authority', 'receiptDigest',
  ], 'Large-source preflight');
  if (receipt.format !== LARGE_SOURCE_PREFLIGHT_PROTOCOL || receipt.complete !== true) {
    throw new TypeError('Large-source preflight protocol or completeness is invalid.');
  }
  exact(receipt.command, ['executable', 'arguments', 'workingDirectory', 'scriptDigest'],
    'Large-source preflight command');
  boundedText(receipt.command.executable, 'Large-source preflight executable');
  if (!Array.isArray(receipt.command.arguments) || receipt.command.arguments.length < 1
      || receipt.command.arguments.length > 32
      || receipt.command.arguments.some((item) => typeof item !== 'string'
        || item.length < 1 || item.length > 512)) {
    throw new TypeError('Large-source preflight arguments must be bounded strings.');
  }
  if (receipt.command.workingDirectory !== 'repository-root') {
    throw new TypeError('Large-source preflight working directory must be repository-root.');
  }
  digest(receipt.command.scriptDigest, 'Large-source preflight command.scriptDigest');
  assertResearchImplementationIdentity(receipt.implementationIdentity);
  assertLargeSourcePreflightImplementationIdentity(receipt.preflightImplementationIdentity);
  const entryFile = receipt.preflightImplementationIdentity.files.find((file) =>
    file.path === receipt.preflightImplementationIdentity.entryPath);
  if (entryFile?.sha256 !== receipt.command.scriptDigest) {
    throw new TypeError('Large-source preflight command does not bind its implementation entry bytes.');
  }
  exact(receipt.baselineGraph, ['format', 'catalogDigest', 'topologyDigest'],
    'Large-source preflight baseline graph');
  for (const field of ['catalogDigest', 'topologyDigest']) {
    digest(receipt.baselineGraph[field], `Large-source preflight baselineGraph.${field}`);
  }
  exact(receipt.source, [
    'sourceRevision', 'sourceDigest', 'sourceBytes', 'sourceManifestDigest',
    'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest', 'componentId',
    'sourceAdmissionReceiptDigest', 'registryDigest', 'projectionId', 'projectionDigest',
    'validationMembershipDigest',
  ], 'Large-source preflight source');
  for (const field of ['sourceRevision', 'componentId', 'projectionId']) {
    boundedText(receipt.source[field], `Large-source preflight source.${field}`);
  }
  for (const field of [
    'sourceDigest', 'sourceManifestDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest', 'registryDigest',
    'projectionDigest',
    'validationMembershipDigest',
  ]) digest(receipt.source[field], `Large-source preflight source.${field}`);
  count(receipt.source.sourceBytes, 'Large-source preflight source.sourceBytes', 1);
  exact(receipt.projection, [
    'format', 'manifestDigest', 'episodes', 'messagesRepresented', 'shards',
  ], 'Large-source preflight projection');
  boundedText(receipt.projection.format, 'Large-source preflight projection.format');
  digest(receipt.projection.manifestDigest, 'Large-source preflight projection.manifestDigest');
  count(receipt.projection.episodes, 'Large-source preflight projection.episodes', 1);
  count(receipt.projection.messagesRepresented,
    'Large-source preflight projection.messagesRepresented', 1);
  if (!Array.isArray(receipt.projection.shards) || receipt.projection.shards.length < 1
      || receipt.projection.shards.length > 4_096) {
    throw new TypeError('Large-source preflight projection shards must be bounded and non-empty.');
  }
  receipt.projection.shards.forEach(assertShard);
  if (receipt.projection.shards.reduce((sum, item) => sum + item.rows, 0)
      !== receipt.projection.episodes) {
    throw new TypeError('Large-source preflight shard rows do not reproduce projection episodes.');
  }
  exact(receipt.analysisReplay, [
    'analysisId', 'episodes', 'registryDigest', 'workPolicyDigest', 'firstReceiptDigest',
    'secondReceiptDigest', 'restoredReceiptDigest', 'inputStreamCheckpoint',
  ], 'Large-source preflight analysis replay');
  boundedText(receipt.analysisReplay.analysisId, 'Large-source preflight analysis ID');
  count(receipt.analysisReplay.episodes, 'Large-source preflight analysisReplay.episodes', 1);
  for (const field of [
    'registryDigest', 'workPolicyDigest', 'firstReceiptDigest', 'secondReceiptDigest',
    'restoredReceiptDigest',
  ]) {
    digest(receipt.analysisReplay[field], `Large-source preflight analysisReplay.${field}`);
  }
  const checkpoint = receipt.analysisReplay.inputStreamCheckpoint;
  exact(checkpoint, [
    'format', 'checkpointFileDigest', 'checkpointReceiptDigest',
    'analysisImplementationDigest', 'preflightImplementationDigest', 'checkpointShard',
    'prefixShards', 'prefixEpisodes', 'suffixShards', 'suffixEpisodes',
    'creatorProcessExitCode', 'restorerProcessExitCode',
  ], 'Large-source preflight input-stream checkpoint');
  if (checkpoint.format !== LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL) {
    throw new TypeError('Large-source preflight input-stream checkpoint protocol is unsupported.');
  }
  for (const field of [
    'checkpointFileDigest', 'checkpointReceiptDigest', 'analysisImplementationDigest',
    'preflightImplementationDigest',
  ]) {
    digest(checkpoint[field], `Large-source preflight inputStreamCheckpoint.${field}`);
  }
  for (const field of [
    'checkpointShard', 'prefixShards', 'prefixEpisodes', 'suffixShards', 'suffixEpisodes',
  ]) count(checkpoint[field], `Large-source preflight inputStreamCheckpoint.${field}`, 1);
  if (receipt.analysisReplay.episodes !== receipt.projection.episodes
      || checkpoint.checkpointShard >= receipt.projection.shards.length
      || checkpoint.checkpointShard !== checkpoint.prefixShards
      || checkpoint.prefixShards + checkpoint.suffixShards !== receipt.projection.shards.length
      || checkpoint.prefixEpisodes + checkpoint.suffixEpisodes !== receipt.projection.episodes
      || checkpoint.creatorProcessExitCode !== 0 || checkpoint.restorerProcessExitCode !== 0
      || checkpoint.analysisImplementationDigest
        !== receipt.implementationIdentity.aggregateDigest
      || checkpoint.preflightImplementationDigest
        !== receipt.preflightImplementationIdentity.aggregateDigest
      || receipt.analysisReplay.registryDigest !== receipt.source.registryDigest
      || receipt.analysisReplay.firstReceiptDigest !== receipt.analysisReplay.secondReceiptDigest
      || receipt.analysisReplay.firstReceiptDigest !== receipt.analysisReplay.restoredReceiptDigest) {
    throw new TypeError('Large-source preflight deterministic or input-stream restore replay does not reproduce.');
  }
  exact(receipt.streaming, [
    'measurementProtocol', 'workerHeapLimitBytes', 'peakRssBytes', 'maximumPeakRssBytes',
    'elapsedMilliseconds', 'processes',
  ], 'Large-source preflight streaming');
  if (receipt.streaming.measurementProtocol !== 'linux-proc-status-vmhwm-v1') {
    throw new TypeError('Large-source preflight peak-memory measurement protocol is unsupported.');
  }
  for (const field of ['workerHeapLimitBytes', 'peakRssBytes', 'maximumPeakRssBytes']) {
    count(receipt.streaming[field], `Large-source preflight streaming.${field}`, 1);
  }
  if (receipt.streaming.workerHeapLimitBytes
      !== LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES) {
    throw new TypeError('Large-source preflight worker heap limit is not canonical.');
  }
  count(receipt.streaming.elapsedMilliseconds, 'Large-source preflight streaming.elapsedMilliseconds');
  if (!Array.isArray(receipt.streaming.processes) || receipt.streaming.processes.length !== 4) {
    throw new TypeError('Large-source preflight process measurements are incomplete.');
  }
  const processRoles = ['full-a', 'full-b', 'checkpoint-create', 'checkpoint-restore'];
  for (const [index, processReceipt] of receipt.streaming.processes.entries()) {
    exact(processReceipt, ['role', 'exitCode', 'peakRssBytes'],
      `Large-source preflight process[${index}]`);
    count(processReceipt.peakRssBytes, `Large-source preflight process[${index}].peakRssBytes`, 1);
    if (processReceipt.role !== processRoles[index] || processReceipt.exitCode !== 0) {
      throw new TypeError('Large-source preflight process execution did not complete canonically.');
    }
  }
  if (receipt.streaming.peakRssBytes
        !== Math.max(...receipt.streaming.processes.map((item) => item.peakRssBytes))
      || receipt.streaming.peakRssBytes > receipt.streaming.maximumPeakRssBytes) {
    throw new TypeError('Large-source preflight process or peak-memory measurement failed.');
  }
  exact(receipt.removal, ['mode', 'obligationsDigest', 'targetsCreated', 'targetsPurged'],
    'Large-source preflight removal');
  if (receipt.removal.mode !== 'ephemeral-cache-purge-drill') {
    throw new TypeError('Large-source preflight removal mode is unsupported.');
  }
  digest(receipt.removal.obligationsDigest, 'Large-source preflight removal obligations digest');
  count(receipt.removal.targetsCreated, 'Large-source preflight removal.targetsCreated', 2);
  count(receipt.removal.targetsPurged, 'Large-source preflight removal.targetsPurged', 2);
  if (receipt.removal.targetsCreated !== receipt.removal.targetsPurged) {
    throw new TypeError('Large-source preflight cache purge drill is incomplete.');
  }
  exact(receipt.contamination, [
    'lineageDigest', 'developmentRowsInSource', 'developmentRowsVisited',
    'protectedRowsVisited', 'trainingEpisodesVisited',
  ], 'Large-source preflight contamination');
  digest(receipt.contamination.lineageDigest, 'Large-source preflight contamination.lineageDigest');
  for (const field of [
    'developmentRowsInSource', 'developmentRowsVisited', 'protectedRowsVisited',
    'trainingEpisodesVisited',
  ]) count(receipt.contamination[field], `Large-source preflight contamination.${field}`);
  if (receipt.contamination.developmentRowsVisited !== 0
      || receipt.contamination.protectedRowsVisited !== 0
      || receipt.contamination.trainingEpisodesVisited !== receipt.projection.episodes) {
    throw new TypeError('Large-source preflight contamination isolation failed.');
  }
  exact(receipt.authority, Object.keys(LARGE_SOURCE_PREFLIGHT_AUTHORITY),
    'Large-source preflight authority');
  if (stableStringify(receipt.authority) !== stableStringify(LARGE_SOURCE_PREFLIGHT_AUTHORITY)) {
    throw new TypeError('Large-source preflight authority is inconsistent.');
  }
  digest(receipt.receiptDigest, 'Large-source preflight receipt digest');
  const unsigned = { ...receipt };
  delete unsigned.receiptDigest;
  if (receipt.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Large-source preflight receipt digest is invalid.');
  }
  return receipt;
}
