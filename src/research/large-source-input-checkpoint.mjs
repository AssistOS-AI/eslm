import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { sha256, stableStringify } from '../util.mjs';
import { assertResearchEpisode, researchEpisodeAuditDigest } from './research-episode-contract.mjs';
import { currentProcessingGraphBaseline,
  processingGraphResearchImplementationIdentity } from './research-implementation-identity.mjs';
import { researchProjectionMembershipDigest } from './research-projection-membership.mjs';
import { researchDiscoveryPlanDigest } from './research-discovery-plan-contract.mjs';
import { largeSourcePreflightImplementationIdentity } from
  './large-source-preflight-implementation-identity.mjs';
import { loadResearchSourceAdmissionGate } from './research-source-admission-gate.mjs';
import {
  OASST1_LARGE_SOURCE,
  inventoryOasst1LargeSource,
  oasst1ProjectionManifestDigest,
  projectOasst1LargeSource,
} from './sources/oasst1-large-source.mjs';
import { loadOasst1ValidationMembership } from './sources/oasst1-validation-membership.mjs';

export const LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL =
  'eslm-rl-large-source-input-checkpoint-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const MAX_CHECKPOINT_JSONL_BYTES = 67_108_864;

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

function shardIdentity(shard) {
  return {
    index: shard.index,
    file: shard.file,
    rows: shard.rows,
    sha256: shard.sha256,
    episodeMembershipDigest: shard.episodeMembershipDigest,
    contentMembershipDigest: shard.contentMembershipDigest,
  };
}

function assertShardIdentity(shard, index, path) {
  exact(shard, [
    'index', 'file', 'rows', 'sha256', 'episodeMembershipDigest',
    'contentMembershipDigest',
  ], path);
  if (shard.index !== index || shard.file !== `shard-${String(index).padStart(2, '0')}.jsonl`) {
    throw new TypeError(`${path} is not the canonical shard identity.`);
  }
  count(shard.rows, `${path}.rows`);
  digest(shard.sha256, `${path}.sha256`);
  digest(shard.episodeMembershipDigest, `${path}.episodeMembershipDigest`);
  digest(shard.contentMembershipDigest, `${path}.contentMembershipDigest`);
}

function parseCheckpointShard(shard, expected, path) {
  exact(shard, [
    'index', 'file', 'rows', 'sha256', 'episodeMembershipDigest',
    'contentMembershipDigest', 'jsonl',
  ], path);
  const identity = shardIdentity(shard);
  if (stableStringify(identity) !== stableStringify(expected)) {
    throw new TypeError(`${path} does not bind its projection-manifest shard.`);
  }
  if (typeof shard.jsonl !== 'string' || !shard.jsonl.endsWith('\n')
      || Buffer.byteLength(shard.jsonl) > MAX_CHECKPOINT_JSONL_BYTES
      || `sha256:${sha256(shard.jsonl)}` !== shard.sha256) {
    throw new TypeError(`${path} JSONL bytes do not match the frozen shard.`);
  }
  const lines = shard.jsonl.slice(0, -1).split('\n');
  if (lines.length !== shard.rows || lines.some((line) => line.length === 0)) {
    throw new TypeError(`${path} JSONL row count is invalid.`);
  }
  const episodes = lines.map((line) => {
    const episode = JSON.parse(line);
    assertResearchEpisode(episode);
    return episode;
  });
  const membershipDigest = researchProjectionMembershipDigest(
    `${OASST1_LARGE_SOURCE.projectionId}:shard-${shard.index}`,
    episodes.map(researchEpisodeAuditDigest), episodes.length,
  );
  if (membershipDigest !== shard.episodeMembershipDigest) {
    throw new TypeError(`${path} episode membership does not match the frozen shard.`);
  }
  return episodes;
}

export function assertLargeSourceInputCheckpoint(checkpoint) {
  exact(checkpoint, [
    'format', 'implementationDigest', 'preflightImplementationDigest', 'baselineGraph',
    'source', 'projection', 'boundary', 'prefixShards', 'complete', 'receiptDigest',
  ], 'Large-source input checkpoint');
  if (checkpoint.format !== LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL
      || checkpoint.complete !== true) {
    throw new TypeError('Large-source input checkpoint protocol or completeness is invalid.');
  }
  digest(checkpoint.implementationDigest, 'Large-source input checkpoint implementation digest');
  digest(checkpoint.preflightImplementationDigest,
    'Large-source input checkpoint preflight implementation digest');
  exact(checkpoint.baselineGraph, ['catalogDigest', 'topologyDigest'],
    'Large-source input checkpoint baseline graph');
  digest(checkpoint.baselineGraph.catalogDigest, 'Large-source checkpoint catalog digest');
  digest(checkpoint.baselineGraph.topologyDigest, 'Large-source checkpoint topology digest');
  exact(checkpoint.source, [
    'sourceRevision', 'sourceManifestDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest', 'registryDigest', 'componentId',
    'validationMembershipDigest',
  ], 'Large-source input checkpoint source');
  for (const field of ['sourceRevision', 'componentId']) {
    if (typeof checkpoint.source[field] !== 'string' || checkpoint.source[field].length < 1) {
      throw new TypeError(`Large-source checkpoint source.${field} must be text.`);
    }
  }
  for (const field of [
    'sourceManifestDigest', 'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest',
    'sourceAdmissionReceiptDigest', 'registryDigest', 'validationMembershipDigest',
  ]) digest(checkpoint.source[field], `Large-source checkpoint source.${field}`);
  exact(checkpoint.projection, [
    'projectionId', 'projectionDigest', 'manifestDigest', 'episodes', 'shards',
  ], 'Large-source input checkpoint projection');
  if (checkpoint.projection.projectionId !== OASST1_LARGE_SOURCE.projectionId) {
    throw new TypeError('Large-source checkpoint projection identity is unsupported.');
  }
  digest(checkpoint.projection.projectionDigest, 'Large-source checkpoint projection digest');
  digest(checkpoint.projection.manifestDigest, 'Large-source checkpoint projection manifest digest');
  count(checkpoint.projection.episodes, 'Large-source checkpoint projection episodes', 1);
  if (!Array.isArray(checkpoint.projection.shards)
      || checkpoint.projection.shards.length !== OASST1_LARGE_SOURCE.shardCount) {
    throw new TypeError('Large-source checkpoint projection shards are invalid.');
  }
  checkpoint.projection.shards.forEach((shard, index) =>
    assertShardIdentity(shard, index, `Large-source checkpoint projection.shards[${index}]`));
  exact(checkpoint.boundary, [
    'checkpointShard', 'prefixShards', 'prefixEpisodes', 'suffixShards', 'suffixEpisodes',
  ], 'Large-source input checkpoint boundary');
  for (const field of [
    'checkpointShard', 'prefixShards', 'prefixEpisodes', 'suffixShards', 'suffixEpisodes',
  ]) count(checkpoint.boundary[field], `Large-source checkpoint boundary.${field}`, 1);
  if (checkpoint.boundary.checkpointShard !== checkpoint.boundary.prefixShards
      || checkpoint.boundary.prefixShards + checkpoint.boundary.suffixShards
        !== checkpoint.projection.shards.length
      || checkpoint.boundary.prefixEpisodes + checkpoint.boundary.suffixEpisodes
        !== checkpoint.projection.episodes
      || !Array.isArray(checkpoint.prefixShards)
      || checkpoint.prefixShards.length !== checkpoint.boundary.prefixShards) {
    throw new TypeError('Large-source checkpoint boundary does not partition the projection.');
  }
  let prefixEpisodes = 0;
  for (const [index, shard] of checkpoint.prefixShards.entries()) {
    prefixEpisodes += parseCheckpointShard(
      shard, checkpoint.projection.shards[index],
      `Large-source checkpoint prefixShards[${index}]`,
    ).length;
  }
  if (prefixEpisodes !== checkpoint.boundary.prefixEpisodes
      || checkpoint.projection.shards.slice(checkpoint.boundary.checkpointShard)
        .reduce((sum, shard) => sum + shard.rows, 0) !== checkpoint.boundary.suffixEpisodes) {
    throw new TypeError('Large-source checkpoint prefix or suffix episode count is invalid.');
  }
  digest(checkpoint.receiptDigest, 'Large-source input checkpoint receipt digest');
  const unsigned = { ...checkpoint };
  delete unsigned.receiptDigest;
  if (checkpoint.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Large-source input checkpoint receipt digest is invalid.');
  }
  return checkpoint;
}

export async function createOasst1LargeSourceInputCheckpoint({
  sourcePath, projectionRoot, validationMembershipPath, sourceManifestPath,
  discoveryPlanPath, checkpointShard, outputPath,
}) {
  count(checkpointShard, 'Large-source input checkpoint shard', 1);
  const baselineGraph = currentProcessingGraphBaseline();
  const [
    manifestBytes, planBytes, validationMembership, implementationIdentity,
    preflightImplementationIdentity,
  ] = await Promise.all([
    readFile(resolve(sourceManifestPath)),
    readFile(resolve(discoveryPlanPath)),
    loadOasst1ValidationMembership(resolve(validationMembershipPath)),
    processingGraphResearchImplementationIdentity(),
    largeSourcePreflightImplementationIdentity(),
  ]);
  const admission = await loadResearchSourceAdmissionGate({
    manifestPaths: [resolve(sourceManifestPath)],
    discoveryPlanPath: resolve(discoveryPlanPath),
    baselineGraphDigest: baselineGraph.catalogDigest,
    expectedSources: [OASST1_LARGE_SOURCE],
  });
  if (admission.manifestBindings[0]?.manifestDigest !== `sha256:${sha256(manifestBytes)}`
      || admission.planBinding.planArtifactDigest !== `sha256:${sha256(planBytes)}`
      || admission.planBinding.planContentDigest !== researchDiscoveryPlanDigest(
        JSON.parse(planBytes.toString('utf8')),
      )) {
    throw new Error('Large-source input checkpoint admission changed while being frozen.');
  }
  const inventory = await inventoryOasst1LargeSource(resolve(sourcePath), validationMembership);
  const projection = await projectOasst1LargeSource(
    resolve(sourcePath), inventory, resolve(projectionRoot), validationMembership,
  );
  if (checkpointShard >= projection.manifest.shards.length) {
    throw new TypeError('Large-source input checkpoint must precede the final shard.');
  }
  const prefixShards = await Promise.all(
    projection.manifest.shards.slice(0, checkpointShard).map(async (shard) => ({
      ...shardIdentity(shard),
      jsonl: await readFile(join(projection.path, shard.file), 'utf8'),
    })),
  );
  const checkpoint = {
    format: LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL,
    implementationDigest: implementationIdentity.aggregateDigest,
    preflightImplementationDigest: preflightImplementationIdentity.aggregateDigest,
    baselineGraph: {
      catalogDigest: baselineGraph.catalogDigest,
      topologyDigest: baselineGraph.topologyDigest,
    },
    source: {
      sourceRevision: `${OASST1_LARGE_SOURCE.sourceId}@${OASST1_LARGE_SOURCE.revision}`,
      sourceManifestDigest: admission.manifestBindings[0].manifestDigest,
      discoveryPlanArtifactDigest: admission.planBinding.planArtifactDigest,
      discoveryPlanContentDigest: admission.planBinding.planContentDigest,
      sourceAdmissionReceiptDigest: admission.receiptDigest,
      registryDigest: admission.registry.digest,
      componentId: OASST1_LARGE_SOURCE.componentId,
      validationMembershipDigest: validationMembership.membershipDigest,
    },
    projection: {
      projectionId: projection.manifest.projectionId,
      projectionDigest: projection.manifest.projectionDigest,
      manifestDigest: oasst1ProjectionManifestDigest(projection.manifest),
      episodes: projection.manifest.episodes,
      shards: projection.manifest.shards.map(shardIdentity),
    },
    boundary: {
      checkpointShard,
      prefixShards: checkpointShard,
      prefixEpisodes: projection.manifest.shards.slice(0, checkpointShard)
        .reduce((sum, shard) => sum + shard.rows, 0),
      suffixShards: projection.manifest.shards.length - checkpointShard,
      suffixEpisodes: projection.manifest.shards.slice(checkpointShard)
        .reduce((sum, shard) => sum + shard.rows, 0),
    },
    prefixShards,
    complete: true,
  };
  checkpoint.receiptDigest = `sha256:${sha256(stableStringify(checkpoint))}`;
  assertLargeSourceInputCheckpoint(checkpoint);
  await writeFile(resolve(outputPath), `${JSON.stringify(checkpoint)}\n`, 'utf8');
  return checkpoint;
}

async function* restoredCheckpointEpisodes(checkpoint, projectionPath) {
  for (const [index, shard] of checkpoint.prefixShards.entries()) {
    for (const episode of parseCheckpointShard(
      shard, checkpoint.projection.shards[index], `Restored checkpoint prefixShards[${index}]`,
    )) yield episode;
  }
  for (const shard of checkpoint.projection.shards.slice(checkpoint.boundary.checkpointShard)) {
    const path = join(projectionPath, shard.file);
    const hash = createHash('sha256');
    const episodeDigests = [];
    const episodes = [];
    const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of lines) {
      hash.update(`${line}\n`);
      const episode = JSON.parse(line);
      assertResearchEpisode(episode);
      episodes.push(episode);
      episodeDigests.push(researchEpisodeAuditDigest(episode));
    }
    const membershipDigest = researchProjectionMembershipDigest(
      `${OASST1_LARGE_SOURCE.projectionId}:shard-${shard.index}`,
      episodeDigests, episodes.length,
    );
    if (episodes.length !== shard.rows || `sha256:${hash.digest('hex')}` !== shard.sha256
        || membershipDigest !== shard.episodeMembershipDigest) {
      throw new Error(`Restored large-source suffix shard ${shard.index} is invalid.`);
    }
    for (const episode of episodes) yield episode;
  }
}

export async function restoreOasst1LargeSourceInputCheckpoint({
  checkpointPath, expectedCheckpointFileDigest, projectionRoot, validationMembershipPath,
  sourceManifestPath, discoveryPlanPath,
}) {
  const checkpointBytes = await readFile(resolve(checkpointPath));
  if (`sha256:${sha256(checkpointBytes)}` !== expectedCheckpointFileDigest) {
    throw new Error('Large-source input checkpoint file digest is invalid.');
  }
  const checkpoint = assertLargeSourceInputCheckpoint(
    JSON.parse(checkpointBytes.toString('utf8')),
  );
  const baselineGraph = currentProcessingGraphBaseline();
  const [
    manifestBytes, planBytes, validationMembership, implementationIdentity,
    preflightImplementationIdentity,
  ] = await Promise.all([
    readFile(resolve(sourceManifestPath)),
    readFile(resolve(discoveryPlanPath)),
    loadOasst1ValidationMembership(resolve(validationMembershipPath)),
    processingGraphResearchImplementationIdentity(),
    largeSourcePreflightImplementationIdentity(),
  ]);
  if (checkpoint.implementationDigest !== implementationIdentity.aggregateDigest
      || checkpoint.preflightImplementationDigest
        !== preflightImplementationIdentity.aggregateDigest
      || checkpoint.baselineGraph.catalogDigest !== baselineGraph.catalogDigest
      || checkpoint.baselineGraph.topologyDigest !== baselineGraph.topologyDigest
      || checkpoint.source.sourceManifestDigest !== `sha256:${sha256(manifestBytes)}`
      || checkpoint.source.discoveryPlanArtifactDigest !== `sha256:${sha256(planBytes)}`
      || checkpoint.source.discoveryPlanContentDigest !== researchDiscoveryPlanDigest(
        JSON.parse(planBytes.toString('utf8')),
      )
      || checkpoint.source.validationMembershipDigest !== validationMembership.membershipDigest) {
    throw new Error('Large-source input checkpoint is stale against live governance.');
  }
  const admission = await loadResearchSourceAdmissionGate({
    manifestPaths: [resolve(sourceManifestPath)],
    discoveryPlanPath: resolve(discoveryPlanPath),
    baselineGraphDigest: baselineGraph.catalogDigest,
    expectedSources: [OASST1_LARGE_SOURCE],
  });
  if (admission.manifestBindings[0]?.manifestDigest
        !== checkpoint.source.sourceManifestDigest
      || admission.planBinding.planArtifactDigest
        !== checkpoint.source.discoveryPlanArtifactDigest
      || admission.planBinding.planContentDigest
        !== checkpoint.source.discoveryPlanContentDigest) {
    throw new Error('Large-source input checkpoint admission is stale.');
  }
  if (admission.receiptDigest !== checkpoint.source.sourceAdmissionReceiptDigest
      || admission.registry.digest !== checkpoint.source.registryDigest) {
    throw new Error('Large-source input checkpoint source admission identity is stale.');
  }
  const projectionPath = join(resolve(projectionRoot), checkpoint.projection.projectionDigest.slice(7));
  const projectionManifest = JSON.parse(await readFile(join(projectionPath, 'manifest.json'), 'utf8'));
  if (checkpoint.projection.manifestDigest !== oasst1ProjectionManifestDigest(projectionManifest)
      || checkpoint.projection.manifestDigest !== OASST1_LARGE_SOURCE.projectionManifestDigest
      || stableStringify(checkpoint.projection.shards)
        !== stableStringify(projectionManifest.shards.map(shardIdentity))) {
    throw new Error('Large-source input checkpoint projection manifest is stale.');
  }
  return {
    checkpoint,
    checkpointFileDigest: expectedCheckpointFileDigest,
    admission,
    baselineGraph,
    implementationIdentity,
    episodes: restoredCheckpointEpisodes(checkpoint, projectionPath),
  };
}
