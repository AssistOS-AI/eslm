import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { stableStringify } from '../../util.mjs';
import {
  createResearchEpisode,
} from '../research-episode-contract.mjs';
import { researchEpisodeContentMember } from '../research-episode-membership.mjs';
import {
  boundedLine, componentEntry, estimatedTokens, exactSourceKeys,
  projectionContentMembershipDigest, projectionMembershipDigest, rating, ratingFeedback,
  sourceEntry, sourceRecordDigest, sourceText,
} from './source-projection-helpers.mjs';

export const HELPSTEER2_PILOT = Object.freeze({
  sourceId: 'helpsteer2',
  componentId: 'train-ratings',
  revision: '990b2711a36180dd19d9c94b8627844866f8982a',
  projectionId: 'helpsteer2-structural-feedback-v1',
  sha256: 'c0d7e91d738d42e8a08070db26c4c09a9c7631308e1f0fd380ff43d130c9f713',
  bytes: 11_315_813,
  rawRows: 20_324,
  projectedRows: 10_161,
  projectionDigest: 'sha256:091b9409be5f8de95ece02f0ea6ff14d51955818adcfa231d4612e859c36e6c0',
  contentMembershipDigest: 'sha256:24dd8fcdb1bc048ef73e1710512c5af6b330bfb22dbfca56c442ddf7520f3da7',
  shardCount: 1,
});

const AXES = ['coherence', 'complexity', 'correctness', 'helpfulness', 'verbosity'];
const SOURCE_KEYS = ['prompt', 'response', ...AXES];

async function compressedSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function addLineToGroups(groups, line, rowIndex) {
  const sourceBytes = boundedLine(line, 131_072, `HelpSteer2 row ${rowIndex}`);
  const row = JSON.parse(line);
  exactSourceKeys(row, SOURCE_KEYS, `HelpSteer2 row ${rowIndex}`);
  sourceText(row.prompt, `HelpSteer2 row ${rowIndex}.prompt`, 8_192);
  sourceText(row.response, `HelpSteer2 row ${rowIndex}.response`, 65_536);
  for (const axis of AXES) rating(row[axis], `HelpSteer2 row ${rowIndex}.${axis}`);
  const promptKey = sourceRecordDigest(row.prompt);
  const group = groups.get(promptKey) ?? { prompt: row.prompt, candidates: [] };
  if (group.prompt !== row.prompt) throw new TypeError('HelpSteer2 prompt digest collision detected.');
  group.candidates.push({
    recordDigest: sourceRecordDigest(line), sourceBytes,
    responseBytes: Buffer.byteLength(row.response),
    ratings: Object.fromEntries(AXES.map((axis) => [axis, row[axis]])),
  });
  groups.set(promptKey, group);
}

export function groupHelpSteer2Lines(lines) {
  if (!lines || typeof lines === 'string' || typeof lines[Symbol.iterator] !== 'function') {
    throw new TypeError('HelpSteer2 synthetic projection input must be an Iterable of JSONL rows.');
  }
  const groups = new Map();
  let rawRows = 0;
  for (const line of lines) {
    addLineToGroups(groups, line, rawRows);
    rawRows += 1;
  }
  return { groups, rawRows };
}

async function readGroups(path) {
  const input = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  const groups = new Map();
  let rawRows = 0;
  for await (const line of lines) {
    addLineToGroups(groups, line, rawRows);
    rawRows += 1;
  }
  return { groups, rawRows };
}

function groupDigest(group) {
  const memberDigests = group.candidates.map((item) => item.recordDigest).toSorted();
  const hash = createHash('sha256').update(stableStringify({
    projectionId: HELPSTEER2_PILOT.projectionId,
    rawRows: group.candidates.length,
    projectedRows: memberDigests.length,
    memberDigests,
  })).digest('hex');
  return `sha256:${hash}`;
}

export async function inventoryHelpSteer2Pilot(path) {
  const [identity, grouped] = await Promise.all([compressedSha256(path), readGroups(path)]);
  const file = await stat(path);
  if (identity !== HELPSTEER2_PILOT.sha256 || file.size !== HELPSTEER2_PILOT.bytes
      || grouped.rawRows !== HELPSTEER2_PILOT.rawRows) {
    throw new Error('HelpSteer2 pilot identity or row count differs from the pinned component.');
  }
  const groupDigests = [...grouped.groups.values()].map(groupDigest);
  const inventory = {
    identity, bytes: file.size, rawRows: grouped.rawRows, projectedRows: grouped.groups.size,
    projectionDigest: projectionMembershipDigest(
      HELPSTEER2_PILOT.projectionId, groupDigests, grouped.rawRows,
    ),
    groups: grouped.groups,
  };
  inventory.contentMembershipDigest = projectionContentMembershipDigest(
    HELPSTEER2_PILOT.projectionId,
    [...grouped.groups.values()].map((group) => researchEpisodeContentMember(
      helpSteer2EpisodeFromGroup(group, inventory.projectionDigest),
    )),
    grouped.rawRows,
  );
  if (inventory.projectedRows !== HELPSTEER2_PILOT.projectedRows
      || inventory.projectionDigest !== HELPSTEER2_PILOT.projectionDigest
      || inventory.contentMembershipDigest !== HELPSTEER2_PILOT.contentMembershipDigest) {
    throw new Error(`HelpSteer2 projected membership differs: ${inventory.contentMembershipDigest}.`);
  }
  return inventory;
}

export function helpSteer2RegistryEntries(inventory) {
  return {
    source: sourceEntry({
      sourceId: HELPSTEER2_PILOT.sourceId, revision: HELPSTEER2_PILOT.revision,
      owner: 'NVIDIA Corporation',
      officialUrl: 'https://huggingface.co/datasets/nvidia/HelpSteer2',
      citation: 'Wang et al. HelpSteer2: Open-source dataset for training top-performing reward models.',
      independenceGroup: 'nvidia-helpsteer2-collection', sha256: inventory.identity,
      bytes: inventory.bytes, mediaType: 'application/gzip',
    }),
    component: componentEntry({
      sourceId: HELPSTEER2_PILOT.sourceId, componentId: HELPSTEER2_PILOT.componentId,
      revision: HELPSTEER2_PILOT.revision, kind: 'response-ratings', sha256: inventory.identity,
      rawRows: inventory.rawRows, licenseId: 'cc-by-4.0', redistribution: 'metadata-only',
      projectionId: HELPSTEER2_PILOT.projectionId, projectionDigest: inventory.projectionDigest,
      contentMembershipDigest: inventory.contentMembershipDigest,
      projectedRows: inventory.projectedRows,
      allowedFields: ['prompt', ...AXES], excludedFields: ['response-text', 'source-row-index'],
    }),
  };
}

function preference(group) {
  const winners = AXES.map((axis) => {
    const ratings = group.candidates.map((item) => item.ratings[axis]);
    const maximum = Math.max(...ratings);
    const indices = ratings.flatMap((value, index) => value === maximum ? [index] : []);
    return indices.length === 1 ? indices[0] : null;
  });
  const decided = winners.filter((value) => value !== null);
  const uniqueWinners = new Set(decided);
  return {
    preferenceId: 'preference:quality-axes',
    candidateKinds: group.candidates.map(() => 'output'),
    preferredIndex: uniqueWinners.size === 1 ? decided[0] : null,
    axes: AXES,
    disagreement: uniqueWinners.size > 1,
  };
}

function feedback(group) {
  return group.candidates.flatMap((candidate, candidateIndex) => AXES.map((axis) => ({
    feedbackId: `feedback:candidate-${candidateIndex}:${axis}`,
    targetKind: 'action', targetId: `action:candidate-${candidateIndex}`, axis,
    ...ratingFeedback(candidate.ratings[axis]), sourceKind: 'human',
  })));
}

export function helpSteer2EpisodeFromGroup(group, projectionDigest) {
  const recordDigest = groupDigest(group);
  const candidates = group.candidates.toSorted((left, right) =>
    left.recordDigest.localeCompare(right.recordDigest));
  const normalized = { ...group, candidates };
  const actions = candidates.map((candidate, index) => ({
    actionId: `action:candidate-${index}`, ordinal: index, phase: 'construct', kind: 'construct-output',
    arguments: [], dependsOn: [], stateDeltaKinds: ['artifact-constructed'], outcome: 'succeeded',
    errorKind: 'none', witnessKind: 'none',
  }));
  return createResearchEpisode({
    format: 'eslm-research-episode-v1',
    episodeId: `episode:helpsteer2:${recordDigest.slice(7, 39)}`,
    source: {
      sourceId: HELPSTEER2_PILOT.sourceId, componentId: HELPSTEER2_PILOT.componentId,
      revision: HELPSTEER2_PILOT.revision, componentDigest: `sha256:${HELPSTEER2_PILOT.sha256}`,
      projectionId: HELPSTEER2_PILOT.projectionId, projectionDigest,
      split: 'train', visibility: 'training-visible', licenseId: 'cc-by-4.0', rightsState: 'approved',
    },
    request: {
      visibleText: group.prompt, operationKinds: ['construct'], artifactKind: 'document',
      constraintKinds: [], requiredCapabilities: ['construct'], outputObligations: [],
    },
    initialState: { stateKinds: ['request-state'], unknownKinds: ['artifact-state'] },
    observations: [
      { observationId: 'observation:request', ordinal: 0, phase: 'interpret', kind: 'request', stateDeltaKinds: [] },
      { observationId: 'observation:feedback', ordinal: 1, phase: 'verify', kind: 'feedback', stateDeltaKinds: [] },
    ],
    actions,
    outcome: {
      status: 'succeeded', resultKind: 'document', failureKind: 'none',
      witnessAvailable: false, criteriaKinds: [],
    },
    feedback: feedback(normalized), preferences: [preference(normalized)],
    provenance: { recordDigest, sourceNativeIds: [], spans: [{ field: 'prompt', start: 0, end: group.prompt.length }] },
    governance: {
      truthStatus: 'unknown', epistemicStatus: 'mixed', safetyTags: [], privacyTags: [],
      projectionLosses: ['response-text-excluded', 'source-row-index-excluded'],
    },
    work: {
      sourceBytes: candidates.reduce((sum, item) => sum + item.sourceBytes, 0),
      tokens: estimatedTokens(group.prompt), actions: actions.length, dependencies: 0, complete: true,
    },
  });
}

export async function* helpSteer2PilotEpisodes(inventory) {
  for (const [, group] of [...inventory.groups].toSorted(([left], [right]) => left.localeCompare(right))) {
    yield helpSteer2EpisodeFromGroup(group, inventory.projectionDigest);
  }
}
