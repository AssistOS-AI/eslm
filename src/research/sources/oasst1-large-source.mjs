import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import { sha256, stableStringify } from '../../util.mjs';
import {
  assertResearchEpisode, createResearchEpisode, researchEpisodeAuditDigest,
} from '../research-episode-contract.mjs';
import { researchEpisodeContentMember } from '../research-episode-membership.mjs';
import {
  boundedLine, componentEntry, compressedFileSha256, estimatedTokens, exactSourceKeys,
  projectionContentMembershipDigest, projectionMembershipDigest, sourceEntry, sourceRecordDigest,
} from './source-projection-helpers.mjs';
import {
  OASST1_VALIDATION_SOURCE,
  assertOasst1ValidationMembership,
} from './oasst1-validation-membership.mjs';
export { OASST1_LARGE_SOURCE } from './oasst1-source-identity.mjs';
import { OASST1_LARGE_SOURCE } from './oasst1-source-identity.mjs';

const ROOT_KEYS = ['message_tree_id', 'prompt', 'tree_state'];
const MAX_TREE_BYTES = 262_144;
const LABEL_AXES = Object.freeze([
  { source: 'helpfulness', target: 'helpfulness', invert: false },
  { source: 'quality', target: 'quality', invert: false },
  { source: 'toxicity', target: 'safety', invert: true },
]);

function flattenTree(tree) {
  exactSourceKeys(tree, ROOT_KEYS, 'OASST1 tree');
  if (tree.tree_state !== 'ready_for_export' || !tree.prompt || typeof tree.prompt !== 'object') {
    throw new TypeError('OASST1 tree must be ready_for_export and contain a prompt root.');
  }
  const nodes = [];
  const stack = [{ message: tree.prompt, parent: null, depth: 0 }];
  while (stack.length > 0) {
    const item = stack.pop();
    const message = item.message;
    if (!message || typeof message !== 'object' || Array.isArray(message)
        || !Array.isArray(message.replies) || !['prompter', 'assistant'].includes(message.role)
        || typeof message.text !== 'string' || message.text.length === 0
        || typeof message.message_id !== 'string') {
      throw new TypeError('OASST1 message tree contains an invalid message node.');
    }
    const index = nodes.length;
    nodes.push({ message, parent: item.parent, depth: item.depth });
    for (let child = message.replies.length - 1; child >= 0; child -= 1) {
      stack.push({ message: message.replies[child], parent: index, depth: item.depth + 1 });
    }
  }
  return nodes;
}

function messageEligible(message) {
  return message.lang === 'en' && message.deleted === false && message.synthetic === false
    && message.review_result === true && Number(message.labels?.pii?.value ?? 1) === 0;
}

function treeProjection(line, validationTreeIds = null) {
  const sourceBytes = boundedLine(line, MAX_TREE_BYTES, 'OASST1 tree line');
  const tree = JSON.parse(line);
  const nodes = flattenTree(tree);
  const split = validationTreeIds?.has(tree.message_tree_id) ? 'validation' : 'training';
  const eligible = split === 'training' && nodes.every(({ message }) => messageEligible(message));
  return {
    sourceBytes,
    tree,
    nodes,
    split,
    eligible,
    recordDigest: sourceRecordDigest(line),
  };
}

function feedbackFor(nodes) {
  return nodes.flatMap(({ message }, index) => {
    if (message.role !== 'assistant') return [];
    return LABEL_AXES.flatMap(({ source, target, invert }) => {
      const raw = Number(message.labels?.[source]?.value);
      if (!Number.isFinite(raw) || raw < 0 || raw > 1) return [];
      const value = invert ? 1 - raw : raw;
      return [{
        feedbackId: `feedback:message-${index}:${target}`,
        targetKind: 'action', targetId: `action:message-${index}`, axis: target,
        polarity: value >= 0.5 ? 'positive' : 'negative',
        strength: Number(Math.abs(value - 0.5).toFixed(6)) * 2,
        sourceKind: 'human',
      }];
    });
  });
}

function preferencesFor(nodes) {
  const children = new Map();
  for (const [index, node] of nodes.entries()) {
    if (node.parent === null || node.message.role !== 'assistant') continue;
    const group = children.get(node.parent) ?? [];
    group.push({ index, rank: node.message.rank });
    children.set(node.parent, group);
  }
  return [...children].filter(([, group]) => group.length >= 2).slice(0, 64)
    .map(([parent, group]) => {
      const ranked = group.map(({ rank }) => Number.isInteger(rank) && rank >= 0 ? rank : null);
      const finite = ranked.filter((rank) => rank !== null);
      const minimum = finite.length > 0 ? Math.min(...finite) : null;
      const winners = ranked.flatMap((rank, index) => rank === minimum ? [index] : []);
      return {
        preferenceId: `preference:reply-group-${parent}`,
        candidateKinds: group.map(() => 'output'),
        preferredIndex: minimum !== null && winners.length === 1 ? winners[0] : null,
        axes: ['helpfulness', 'quality'],
        disagreement: winners.length !== 1,
      };
    });
}

function episodeFromProjection(projection, membershipDigest) {
  const actions = projection.nodes.map(({ message, parent }, index) => ({
    actionId: `action:message-${index}`,
    ordinal: index,
    phase: message.role === 'prompter' ? 'interpret' : 'construct',
    kind: message.role === 'prompter' ? 'parse-request' : 'construct-output',
    arguments: [],
    dependsOn: parent === null ? [] : [`action:message-${parent}`],
    stateDeltaKinds: message.role === 'prompter' ? ['request-structured'] : ['artifact-constructed'],
    outcome: 'succeeded', errorKind: 'none', witnessKind: 'none',
  }));
  return createResearchEpisode({
    format: 'eslm-research-episode-v1',
    episodeId: `episode:oasst1:${projection.recordDigest.slice(7, 39)}`,
    source: {
      sourceId: OASST1_LARGE_SOURCE.sourceId, componentId: OASST1_LARGE_SOURCE.componentId,
      revision: OASST1_LARGE_SOURCE.revision,
      componentDigest: `sha256:${OASST1_LARGE_SOURCE.sha256}`,
      projectionId: OASST1_LARGE_SOURCE.projectionId, projectionDigest: membershipDigest,
      split: 'training', visibility: 'training-visible', licenseId: 'apache-2.0', rightsState: 'approved',
    },
    request: {
      visibleText: 'Construct a reviewed response within a multi-turn conversation.',
      operationKinds: ['construct'], artifactKind: 'document',
      constraintKinds: ['consistency', 'safety'], requiredCapabilities: ['construct'],
      outputObligations: ['safe'],
    },
    initialState: { stateKinds: ['request-state'], unknownKinds: ['artifact-state'] },
    observations: [{
      observationId: 'observation:conversation-root', ordinal: 0, phase: 'interpret',
      kind: 'request', stateDeltaKinds: [],
    }],
    actions,
    outcome: {
      status: 'succeeded', resultKind: 'document', failureKind: 'none',
      witnessAvailable: false, criteriaKinds: ['safe'],
    },
    feedback: feedbackFor(projection.nodes),
    preferences: preferencesFor(projection.nodes),
    provenance: { recordDigest: projection.recordDigest, sourceNativeIds: [], spans: [] },
    governance: {
      truthStatus: 'unknown', epistemicStatus: 'human-feedback',
      safetyTags: ['source-text-not-retained'], privacyTags: ['pii-zero-reviewed-tree'],
      projectionLosses: [
        'message-identifiers-excluded', 'message-text-excluded', 'non-english-or-unreviewed-tree-excluded',
        'source-user-identifiers-excluded',
      ],
    },
    work: {
      sourceBytes: projection.sourceBytes,
      tokens: estimatedTokens(...projection.nodes.map(({ message }) => message.text)),
      actions: actions.length,
      dependencies: actions.filter((action) => action.dependsOn.length > 0).length,
      complete: true,
    },
  });
}

export function oasst1EpisodeFromTreeLine(line, membershipDigest, { validationTreeIds = null } = {}) {
  const projection = treeProjection(line, validationTreeIds);
  return projection.eligible ? episodeFromProjection(projection, membershipDigest) : null;
}

export async function inventoryOasst1LargeSource(path, validationMembership) {
  assertOasst1ValidationMembership(validationMembership);
  if (validationMembership?.membershipDigest !== OASST1_LARGE_SOURCE.validationMembershipDigest
      || validationMembership?.treeIds?.length !== OASST1_LARGE_SOURCE.developmentTrees) {
    throw new Error('OASST1 validation split membership is absent or differs from the pinned revision.');
  }
  const validationTreeIds = new Set(validationMembership.treeIds);
  const [identity, file] = await Promise.all([compressedFileSha256(path), stat(path)]);
  if (identity !== OASST1_LARGE_SOURCE.sha256 || file.size !== OASST1_LARGE_SOURCE.bytes) {
    throw new Error('OASST1 source identity differs from the pinned large-source component.');
  }
  const lines = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  const memberDigests = [];
  const contentMemberDigests = [];
  const rawTreeIds = new Set();
  const matchedValidationTreeIds = new Set();
  const counters = {
    rawTrees: 0, rawMessages: 0, projectedTrees: 0, projectedMessages: 0,
    trainingTrees: 0, trainingMessages: 0, developmentTrees: 0, developmentMessages: 0,
    excludedTrees: 0, excludedTrainingTrees: 0,
    maximumTreeBytes: 0, maximumMessagesPerTree: 0,
  };
  for await (const line of lines) {
    const projection = treeProjection(line, validationTreeIds);
    if (rawTreeIds.has(projection.tree.message_tree_id)) {
      throw new Error('OASST1 ready-tree source contains a duplicate tree identity.');
    }
    rawTreeIds.add(projection.tree.message_tree_id);
    counters.rawTrees += 1;
    counters.rawMessages += projection.nodes.length;
    counters.maximumTreeBytes = Math.max(counters.maximumTreeBytes, projection.sourceBytes);
    counters.maximumMessagesPerTree = Math.max(counters.maximumMessagesPerTree, projection.nodes.length);
    if (projection.split === 'validation') {
      matchedValidationTreeIds.add(projection.tree.message_tree_id);
      counters.developmentTrees += 1;
      counters.developmentMessages += projection.nodes.length;
    } else {
      counters.trainingTrees += 1;
      counters.trainingMessages += projection.nodes.length;
    }
    if (projection.eligible) {
      counters.projectedTrees += 1;
      counters.projectedMessages += projection.nodes.length;
      memberDigests.push(projection.recordDigest);
      contentMemberDigests.push(researchEpisodeContentMember(
        episodeFromProjection(projection, `sha256:${'0'.repeat(64)}`),
      ));
    } else {
      counters.excludedTrees += 1;
      if (projection.split === 'training') counters.excludedTrainingTrees += 1;
    }
  }
  if (matchedValidationTreeIds.size !== validationTreeIds.size) {
    throw new Error('OASST1 ready-tree source does not contain the complete frozen validation membership.');
  }
  for (const [field, expected] of Object.entries({
    rawTrees: OASST1_LARGE_SOURCE.rawTrees,
    rawMessages: OASST1_LARGE_SOURCE.rawMessages,
    trainingTrees: OASST1_LARGE_SOURCE.trainingTrees,
    trainingMessages: OASST1_LARGE_SOURCE.trainingMessages,
    developmentTrees: OASST1_LARGE_SOURCE.developmentTrees,
    developmentMessages: OASST1_LARGE_SOURCE.developmentMessages,
    projectedTrees: OASST1_LARGE_SOURCE.projectedTrees,
    projectedMessages: OASST1_LARGE_SOURCE.projectedMessages,
  })) {
    if (counters[field] !== expected) throw new Error(`OASST1 ${field} differs from the reviewed probe.`);
  }
  const inventory = {
    identity, bytes: file.size, ...counters,
    validationMembershipDigest: validationMembership.membershipDigest,
    validationMembershipReceiptSha256: OASST1_VALIDATION_SOURCE.receiptSha256,
    projectionDigest: projectionMembershipDigest(
      OASST1_LARGE_SOURCE.projectionId, memberDigests, counters.rawTrees,
    ),
    contentMembershipDigest: projectionContentMembershipDigest(
      OASST1_LARGE_SOURCE.projectionId, contentMemberDigests, counters.rawTrees,
    ),
  };
  if (inventory.projectionDigest !== OASST1_LARGE_SOURCE.projectionDigest
      || inventory.contentMembershipDigest !== OASST1_LARGE_SOURCE.contentMembershipDigest) {
    throw new Error(`OASST1 projected membership differs: ${inventory.contentMembershipDigest}.`);
  }
  return inventory;
}

export function oasst1RegistryEntries(inventory) {
  const source = sourceEntry({
    sourceId: OASST1_LARGE_SOURCE.sourceId, revision: OASST1_LARGE_SOURCE.revision,
    owner: 'OpenAssistant Contributors',
    officialUrl: 'https://huggingface.co/datasets/OpenAssistant/oasst1',
    citation: 'Köpf et al. OpenAssistant Conversations: Democratizing Large Language Model Alignment.',
    independenceGroup: 'openassistant-oasst1-collection', sha256: inventory.identity,
    bytes: inventory.bytes, mediaType: 'application/gzip',
  });
  const component = componentEntry({
    sourceId: OASST1_LARGE_SOURCE.sourceId, componentId: OASST1_LARGE_SOURCE.componentId,
    revision: OASST1_LARGE_SOURCE.revision, kind: 'reviewed-conversation-trees',
    sha256: inventory.identity, rawRows: inventory.rawTrees, licenseId: 'apache-2.0',
    redistribution: 'metadata-only', projectionId: OASST1_LARGE_SOURCE.projectionId,
    projectionDigest: inventory.projectionDigest, projectedRows: inventory.projectedTrees,
    contentMembershipDigest: inventory.contentMembershipDigest,
    shardCount: OASST1_LARGE_SOURCE.shardCount, shardFormat: 'jsonl',
    allowedFields: ['language', 'labels', 'reply-edges', 'review-state', 'roles'],
    excludedFields: [
      'message-identifiers', 'message-text', 'non-english-trees', 'source-user-identifiers',
      'unreviewed-or-pii-bearing-trees', 'validation-trees',
    ],
  });
  component.visibility = [
    {
      split: 'training', visibility: 'training-visible',
      rowsDeclared: inventory.trainingTrees, rowsAdmitted: inventory.projectedTrees,
    },
    {
      split: 'validation', visibility: 'development-visible',
      rowsDeclared: inventory.developmentTrees, rowsAdmitted: 0,
    },
  ];
  return {
    source,
    component,
  };
}

function shardIndex(recordDigest) {
  return Number.parseInt(recordDigest.slice(7, 15), 16) % OASST1_LARGE_SOURCE.shardCount;
}

async function closeStreams(streams) {
  for (const stream of streams) stream.end();
  await Promise.all(streams.map((stream) => finished(stream)));
}

export async function validateOasst1ProjectionManifest(path, inventory) {
  const manifest = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
  exactSourceKeys(manifest, [
    'complete', 'contentMembershipDigest', 'episodes', 'format', 'messagesRepresented',
    'projectionDigest', 'projectionId', 'shards', 'sourceDigest', 'sourceRevision',
  ], 'OASST1 projection manifest');
  if (manifest.format !== 'eslm-oasst1-projection-shards-v1'
      || manifest.sourceRevision !== `${OASST1_LARGE_SOURCE.sourceId}@${OASST1_LARGE_SOURCE.revision}`
      || manifest.sourceDigest !== `sha256:${OASST1_LARGE_SOURCE.sha256}`
      || manifest.projectionId !== OASST1_LARGE_SOURCE.projectionId
      || manifest.projectionDigest !== inventory.projectionDigest
      || manifest.contentMembershipDigest !== inventory.contentMembershipDigest
      || manifest.episodes !== inventory.projectedTrees
      || manifest.messagesRepresented !== inventory.projectedMessages
      || manifest.complete !== true
      || !Array.isArray(manifest.shards)
      || manifest.shards.length !== OASST1_LARGE_SOURCE.shardCount) {
    throw new Error('OASST1 projection shard manifest is stale or malformed.');
  }
  let totalRows = 0;
  let totalMessages = 0;
  const sourceRecordDigests = [];
  for (const [index, shard] of manifest.shards.entries()) {
    exactSourceKeys(shard, [
      'contentMembershipDigest', 'episodeMembershipDigest', 'file', 'index', 'rows', 'sha256',
    ], `OASST1 projection shard ${index}`);
    if (shard.index !== index || shard.file !== `shard-${String(index).padStart(2, '0')}.jsonl`
        || !Number.isSafeInteger(shard.rows) || shard.rows < 0
        || !/^sha256:[a-f0-9]{64}$/u.test(shard.sha256)
        || !/^sha256:[a-f0-9]{64}$/u.test(shard.contentMembershipDigest)
        || !/^sha256:[a-f0-9]{64}$/u.test(shard.episodeMembershipDigest)) {
      throw new Error(`OASST1 projection shard ${index} manifest entry is invalid.`);
    }
    const hash = createHash('sha256');
    const episodeDigests = [];
    const contentMembers = [];
    const lines = createInterface({ input: createReadStream(join(path, shard.file)), crlfDelay: Infinity });
    let rows = 0;
    for await (const line of lines) {
      boundedLine(line, MAX_TREE_BYTES, `OASST1 projection shard ${index} row ${rows}`);
      hash.update(`${line}\n`);
      const episode = JSON.parse(line);
      assertResearchEpisode(episode);
      if (episode.source.sourceId !== OASST1_LARGE_SOURCE.sourceId
          || episode.source.componentId !== OASST1_LARGE_SOURCE.componentId
          || episode.source.revision !== OASST1_LARGE_SOURCE.revision
          || episode.source.projectionId !== OASST1_LARGE_SOURCE.projectionId
          || episode.source.projectionDigest !== inventory.projectionDigest
          || shardIndex(episode.provenance.recordDigest) !== index) {
        throw new Error(`OASST1 projection shard ${index} contains an out-of-membership episode.`);
      }
      episodeDigests.push(researchEpisodeAuditDigest(episode));
      contentMembers.push(researchEpisodeContentMember(episode));
      sourceRecordDigests.push(episode.provenance.recordDigest);
      totalMessages += episode.actions.length;
      rows += 1;
    }
    const membership = projectionMembershipDigest(
      `${OASST1_LARGE_SOURCE.projectionId}:shard-${index}`, episodeDigests, rows,
    );
    const contentMembership = projectionContentMembershipDigest(
      `${OASST1_LARGE_SOURCE.projectionId}:shard-${index}`, contentMembers, rows,
    );
    if (rows !== shard.rows || `sha256:${hash.digest('hex')}` !== shard.sha256
        || membership !== shard.episodeMembershipDigest
        || contentMembership !== shard.contentMembershipDigest) {
      throw new Error(`OASST1 projection shard ${index} does not match its receipt.`);
    }
    totalRows += rows;
  }
  const sourceMembership = projectionMembershipDigest(
    OASST1_LARGE_SOURCE.projectionId,
    sourceRecordDigests,
    inventory.rawTrees,
  );
  if (totalRows !== manifest.episodes || totalMessages !== manifest.messagesRepresented
      || new Set(sourceRecordDigests).size !== sourceRecordDigests.length
      || sourceMembership !== inventory.projectionDigest) {
    throw new Error('OASST1 projection shard membership does not reconcile.');
  }
  if (inventory.rawTrees === OASST1_LARGE_SOURCE.rawTrees
      && inventory.projectionDigest === OASST1_LARGE_SOURCE.projectionDigest
      && oasst1ProjectionManifestDigest(manifest) !== OASST1_LARGE_SOURCE.projectionManifestDigest) {
    throw new Error('OASST1 projection shard identities differ from the reviewed frozen projection.');
  }
  return manifest;
}

export async function projectOasst1LargeSource(path, inventory, cacheRoot, validationMembership) {
  assertOasst1ValidationMembership(validationMembership);
  if (validationMembership?.membershipDigest !== OASST1_LARGE_SOURCE.validationMembershipDigest) {
    throw new Error('OASST1 validation split membership is absent or stale during projection.');
  }
  const validationTreeIds = new Set(validationMembership.treeIds);
  const root = resolve(cacheRoot);
  const target = join(root, inventory.projectionDigest.slice(7));
  try {
    const manifest = await validateOasst1ProjectionManifest(target, inventory);
    return { path: target, manifest, reused: true };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await mkdir(root, { recursive: true });
  const temporary = await mkdtemp(join(root, '.projection-'));
  const streams = Array.from({ length: OASST1_LARGE_SOURCE.shardCount }, (_, index) =>
    createWriteStream(join(temporary, `shard-${String(index).padStart(2, '0')}.jsonl`), { flags: 'wx' }));
  const shards = Array.from({ length: OASST1_LARGE_SOURCE.shardCount }, (_, index) => ({
    index, rows: 0, episodeDigests: [], contentMembers: [],
  }));
  try {
    const lines = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lines) {
      const projection = treeProjection(line, validationTreeIds);
      if (!projection.eligible) continue;
      const episode = episodeFromProjection(projection, inventory.projectionDigest);
      const index = shardIndex(projection.recordDigest);
      if (!streams[index].write(`${JSON.stringify(episode)}\n`)) {
        await new Promise((resolveDrain) => streams[index].once('drain', resolveDrain));
      }
      shards[index].rows += 1;
      shards[index].episodeDigests.push(researchEpisodeAuditDigest(episode));
      shards[index].contentMembers.push(researchEpisodeContentMember(episode));
    }
    await closeStreams(streams);
    const records = [];
    for (const shard of shards) {
      const file = `shard-${String(shard.index).padStart(2, '0')}.jsonl`;
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(join(temporary, file))) hash.update(chunk);
      records.push({
        index: shard.index, file, rows: shard.rows, sha256: `sha256:${hash.digest('hex')}`,
        episodeMembershipDigest: projectionMembershipDigest(
          `${OASST1_LARGE_SOURCE.projectionId}:shard-${shard.index}`,
          shard.episodeDigests,
          shard.rows,
        ),
        contentMembershipDigest: projectionContentMembershipDigest(
          `${OASST1_LARGE_SOURCE.projectionId}:shard-${shard.index}`,
          shard.contentMembers, shard.rows,
        ),
      });
    }
    const manifest = {
      format: 'eslm-oasst1-projection-shards-v1',
      sourceRevision: `${OASST1_LARGE_SOURCE.sourceId}@${OASST1_LARGE_SOURCE.revision}`,
      sourceDigest: `sha256:${OASST1_LARGE_SOURCE.sha256}`,
      projectionId: OASST1_LARGE_SOURCE.projectionId,
      projectionDigest: inventory.projectionDigest,
      contentMembershipDigest: inventory.contentMembershipDigest,
      episodes: inventory.projectedTrees,
      messagesRepresented: inventory.projectedMessages,
      shards: records,
      complete: true,
    };
    await writeFile(join(temporary, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, target);
    return { path: target, manifest: await validateOasst1ProjectionManifest(target, inventory), reused: false };
  } catch (error) {
    for (const stream of streams) stream.destroy();
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function* oasst1ProjectionEpisodes(projection, { startShard = 0 } = {}) {
  if (!Number.isSafeInteger(startShard) || startShard < 0
      || startShard > projection.manifest.shards.length) {
    throw new TypeError('OASST1 projection startShard must be a valid shard boundary.');
  }
  for (const shard of projection.manifest.shards.slice(startShard)) {
    const lines = createInterface({ input: createReadStream(join(projection.path, shard.file)), crlfDelay: Infinity });
    let rows = 0;
    for await (const line of lines) {
      const episode = JSON.parse(line);
      rows += 1;
      yield episode;
    }
    if (rows !== shard.rows) throw new Error(`OASST1 projection shard ${shard.index} row count is invalid.`);
  }
}

export function oasst1ProjectionManifestDigest(manifest) {
  return `sha256:${sha256(stableStringify(manifest))}`;
}
