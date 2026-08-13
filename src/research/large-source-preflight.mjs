import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { sha256, stableStringify } from '../util.mjs';
import {
  assertProcessingGraphResearchAnalysis,
} from './processing-graph-research-analysis-contract.mjs';
import { analyzeProcessingGraphResearch } from './processing-graph-research-analyzer.mjs';
import {
  LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL,
  restoreOasst1LargeSourceInputCheckpoint,
} from './large-source-input-checkpoint.mjs';
import {
  currentProcessingGraphBaseline,
  processingGraphResearchImplementationIdentity,
} from './research-implementation-identity.mjs';
import { loadResearchSourceAdmissionGate } from './research-source-admission-gate.mjs';
import { researchDiscoveryPlanDigest } from './research-discovery-plan-contract.mjs';
import {
  OASST1_LARGE_SOURCE,
  inventoryOasst1LargeSource,
  oasst1ProjectionEpisodes,
  oasst1ProjectionManifestDigest,
  projectOasst1LargeSource,
} from './sources/oasst1-large-source.mjs';
import { loadOasst1ValidationMembership } from './sources/oasst1-validation-membership.mjs';
import {
  LARGE_SOURCE_PREFLIGHT_AUTHORITY,
  LARGE_SOURCE_PREFLIGHT_PROTOCOL,
  LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH,
  LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES,
  assertLargeSourcePreflightReceipt,
} from './large-source-preflight-contract.mjs';
import { largeSourcePreflightImplementationIdentity } from
  './large-source-preflight-implementation-identity.mjs';

export {
  LARGE_SOURCE_PREFLIGHT_PROTOCOL,
  LARGE_SOURCE_PREFLIGHT_SCRIPT_PATH,
  LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES,
  assertLargeSourcePreflightReceipt,
};

function count(value, path, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${path} must be a bounded integer >= ${minimum}.`);
  }
}

function observedEpisodes(episodes, contamination) {
  return (async function* stream() {
    for await (const episode of episodes) {
      if (episode.source.visibility === 'training-visible' && episode.source.split === 'training') {
        contamination.trainingEpisodesVisited += 1;
      } else if (episode.source.visibility === 'development-visible') {
        contamination.developmentRowsVisited += 1;
      } else {
        contamination.protectedRowsVisited += 1;
      }
      yield episode;
    }
  }());
}

async function analyzeReplay(registry, episodes, workPolicy, analysisIdentity) {
  const report = await analyzeProcessingGraphResearch({
    registry,
    episodes,
    analysisId: analysisIdentity.analysisId,
    version: analysisIdentity.version,
    seed: analysisIdentity.seed,
    workPolicy,
  });
  assertProcessingGraphResearchAnalysis(report);
  if (!report.completeness.complete) {
    throw new Error('Large-source preflight analysis left an incomplete projection frontier.');
  }
  return report;
}

export async function runLargeSourceRemovalDrill(removalObligations) {
  const root = await mkdtemp(join(tmpdir(), 'eslm-oasst1-removal-drill-'));
  const targets = [join(root, 'raw-cache'), join(root, 'projected-cache')];
  try {
    for (const target of targets) {
      await mkdir(target, { recursive: true });
      await writeFile(join(target, 'sentinel'), 'inert-removal-drill\n', 'utf8');
    }
    for (const target of targets) await rm(target, { recursive: true, force: true });
    let purged = 0;
    for (const target of targets) {
      try {
        await stat(target);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        purged += 1;
      }
    }
    return {
      mode: 'ephemeral-cache-purge-drill',
      obligationsDigest: `sha256:${sha256(stableStringify(removalObligations))}`,
      targetsCreated: targets.length,
      targetsPurged: purged,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function runOasst1LargeSourcePreflightReplay({
  sourcePath,
  projectionRoot,
  validationMembershipPath,
  sourceManifestPath,
  discoveryPlanPath,
  checkpointEveryShards,
  replayMode,
  checkpointPath = null,
  expectedCheckpointFileDigest = null,
}) {
  count(checkpointEveryShards, 'Large-source preflight checkpointEveryShards', 1);
  if (!['full-a', 'full-b', 'input-stream-restored'].includes(replayMode)) {
    throw new TypeError('Large-source preflight replay mode is unsupported.');
  }
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
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  let admission;
  let inventory;
  let projection;
  let projectionManifestDigest;
  let episodeStream;
  let inputCheckpoint = null;
  if (replayMode === 'input-stream-restored') {
    if (checkpointPath === null || expectedCheckpointFileDigest === null) {
      throw new TypeError('Restored preflight replay requires an exact checkpoint file identity.');
    }
    const restored = await restoreOasst1LargeSourceInputCheckpoint({
      checkpointPath, expectedCheckpointFileDigest, projectionRoot, validationMembershipPath,
      sourceManifestPath, discoveryPlanPath,
    });
    admission = restored.admission;
    projection = {
      manifest: {
        format: 'eslm-oasst1-projection-shards-v1',
        episodes: restored.checkpoint.projection.episodes,
        messagesRepresented: OASST1_LARGE_SOURCE.projectedMessages,
        shards: restored.checkpoint.projection.shards,
      },
    };
    projectionManifestDigest = restored.checkpoint.projection.manifestDigest;
    episodeStream = restored.episodes;
    inputCheckpoint = {
      format: LARGE_SOURCE_INPUT_CHECKPOINT_PROTOCOL,
      checkpointFileDigest: restored.checkpointFileDigest,
      checkpointReceiptDigest: restored.checkpoint.receiptDigest,
      analysisImplementationDigest: restored.checkpoint.implementationDigest,
      preflightImplementationDigest: restored.checkpoint.preflightImplementationDigest,
      ...structuredClone(restored.checkpoint.boundary),
    };
    inventory = {
      developmentTrees: OASST1_LARGE_SOURCE.developmentTrees,
      projectionDigest: restored.checkpoint.projection.projectionDigest,
    };
  } else {
    admission = await loadResearchSourceAdmissionGate({
      manifestPaths: [resolve(sourceManifestPath)],
      discoveryPlanPath: resolve(discoveryPlanPath),
      baselineGraphDigest: baselineGraph.catalogDigest,
      expectedSources: [OASST1_LARGE_SOURCE],
    });
    inventory = await inventoryOasst1LargeSource(resolve(sourcePath), validationMembership);
    projection = await projectOasst1LargeSource(
      resolve(sourcePath), inventory, resolve(projectionRoot), validationMembership,
    );
    projectionManifestDigest = oasst1ProjectionManifestDigest(projection.manifest);
    episodeStream = oasst1ProjectionEpisodes(projection);
  }
  if (admission.manifestBindings[0]?.manifestDigest !== `sha256:${sha256(manifestBytes)}`
      || admission.planBinding.planArtifactDigest !== `sha256:${sha256(planBytes)}`
      || admission.planBinding.planContentDigest !== researchDiscoveryPlanDigest(
        JSON.parse(planBytes.toString('utf8')),
      )) {
    throw new Error('Large-source preflight admission changed during replay.');
  }
  if (checkpointEveryShards >= projection.manifest.shards.length) {
    throw new TypeError('Large-source preflight checkpoint must precede the final shard.');
  }
  const policy = admission.workPolicy;
  const contamination = {
    developmentRowsInSource: inventory.developmentTrees,
    developmentRowsVisited: 0,
    protectedRowsVisited: 0,
    trainingEpisodesVisited: 0,
  };
  const analysis = await analyzeReplay(
    admission.registry, observedEpisodes(episodeStream, contamination), policy,
    admission.planBinding.analysisIdentity,
  );
  return Object.freeze({
    format: 'eslm-rl-large-source-preflight-replay-v1',
    replayMode,
    implementationIdentity,
    preflightImplementationIdentity,
    baselineGraph,
    source: {
      sourceRevision: `${OASST1_LARGE_SOURCE.sourceId}@${OASST1_LARGE_SOURCE.revision}`,
      sourceDigest: `sha256:${OASST1_LARGE_SOURCE.sha256}`,
      sourceBytes: OASST1_LARGE_SOURCE.bytes,
      sourceManifestDigest: admission.manifestBindings[0].manifestDigest,
      discoveryPlanArtifactDigest: admission.planBinding.planArtifactDigest,
      discoveryPlanContentDigest: admission.planBinding.planContentDigest,
      sourceAdmissionReceiptDigest: admission.receiptDigest,
      registryDigest: admission.registry.digest,
      componentId: OASST1_LARGE_SOURCE.componentId,
      projectionId: OASST1_LARGE_SOURCE.projectionId,
      projectionDigest: inventory.projectionDigest,
      validationMembershipDigest: validationMembership.membershipDigest,
    },
    projection: {
      format: projection.manifest.format,
      manifestDigest: projectionManifestDigest,
      episodes: projection.manifest.episodes,
      messagesRepresented: projection.manifest.messagesRepresented,
      shards: structuredClone(projection.manifest.shards),
    },
    analysis: {
      analysisId: analysis.analysis.analysisId,
      episodes: analysis.work.episodesAnalyzed,
      registryDigest: analysis.registry.digest,
      workPolicyDigest: `sha256:${sha256(stableStringify(analysis.workPolicy))}`,
      receiptDigest: analysis.receiptDigest,
    },
    inputCheckpoint,
    removalObligationsDigest: `sha256:${sha256(stableStringify(manifest.removalObligations))}`,
    contamination: {
      lineageDigest: `sha256:${sha256(stableStringify({
        independenceGroup: manifest.independenceGroup,
        validationMembershipDigest: validationMembership.membershipDigest,
        sourceRevision: `${manifest.sourceId}@${manifest.revision}`,
      }))}`,
      ...contamination,
    },
  });
}

export function assembleLargeSourcePreflightReceipt({
  command, replays, inputCheckpoint, maximumPeakRssBytes, elapsedMilliseconds,
  processMeasurements, removal,
}) {
  count(maximumPeakRssBytes, 'Large-source preflight maximumPeakRssBytes', 1);
  count(elapsedMilliseconds, 'Large-source preflight elapsedMilliseconds');
  if (!Array.isArray(processMeasurements) || processMeasurements.length !== 4) {
    throw new TypeError('Large-source preflight requires four external process measurements.');
  }
  if (!Array.isArray(replays) || replays.length !== 3
      || stableStringify(replays.map((item) => item.replayMode))
        !== stableStringify(['full-a', 'full-b', 'input-stream-restored'])) {
    throw new TypeError('Large-source preflight requires two full and one input-stream restored replay.');
  }
  const [first, second, restored] = replays;
  for (const [index, replay] of replays.entries()) {
    if (replay.format !== 'eslm-rl-large-source-preflight-replay-v1'
        || replay.analysis.episodes !== replay.projection.episodes) {
      throw new TypeError(`Large-source preflight replay[${index}] is incomplete.`);
    }
  }
  for (const field of [
    'implementationIdentity', 'preflightImplementationIdentity', 'baselineGraph', 'source',
    'projection', 'contamination', 'removalObligationsDigest',
  ]) {
    if (stableStringify(first[field]) !== stableStringify(second[field])
        || stableStringify(first[field]) !== stableStringify(restored[field])) {
      throw new TypeError(`Large-source preflight replays disagree on ${field}.`);
    }
  }
  if (stableStringify(first.analysis) !== stableStringify(second.analysis)
      || stableStringify(first.analysis) !== stableStringify(restored.analysis)) {
    throw new TypeError('Large-source preflight replays disagree on analysis identity.');
  }
  if (stableStringify(restored.inputCheckpoint) !== stableStringify(inputCheckpoint)) {
    throw new TypeError('Large-source preflight restored replay does not bind the created checkpoint.');
  }
  if (removal.obligationsDigest !== first.removalObligationsDigest) {
    throw new TypeError('Large-source preflight removal drill used different obligations.');
  }
  const receipt = {
    format: LARGE_SOURCE_PREFLIGHT_PROTOCOL,
    command,
    implementationIdentity: first.implementationIdentity,
    preflightImplementationIdentity: first.preflightImplementationIdentity,
    baselineGraph: first.baselineGraph,
    source: first.source,
    projection: first.projection,
    analysisReplay: {
      analysisId: first.analysis.analysisId,
      episodes: first.analysis.episodes,
      registryDigest: first.analysis.registryDigest,
      workPolicyDigest: first.analysis.workPolicyDigest,
      firstReceiptDigest: first.analysis.receiptDigest,
      secondReceiptDigest: second.analysis.receiptDigest,
      restoredReceiptDigest: restored.analysis.receiptDigest,
      inputStreamCheckpoint: {
        ...structuredClone(inputCheckpoint),
        creatorProcessExitCode: processMeasurements[2]?.exitCode,
        restorerProcessExitCode: processMeasurements[3]?.exitCode,
      },
    },
    streaming: {
      measurementProtocol: 'linux-proc-status-vmhwm-v1',
      workerHeapLimitBytes: LARGE_SOURCE_PREFLIGHT_WORKER_HEAP_LIMIT_BYTES,
      peakRssBytes: Math.max(...processMeasurements.map((item) => item.peakRssBytes)),
      maximumPeakRssBytes,
      elapsedMilliseconds,
      processes: structuredClone(processMeasurements),
    },
    removal,
    contamination: first.contamination,
    complete: true,
    authority: LARGE_SOURCE_PREFLIGHT_AUTHORITY,
  };
  receipt.receiptDigest = `sha256:${sha256(stableStringify(receipt))}`;
  assertLargeSourcePreflightReceipt(receipt);
  return Object.freeze(receipt);
}

export async function publishLargeSourcePreflight(receipt, path) {
  assertLargeSourcePreflightReceipt(receipt);
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return target;
}
