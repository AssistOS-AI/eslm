import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import {
  createResearchEpisode,
} from '../research-episode-contract.mjs';
import { researchEpisodeContentMember } from '../research-episode-membership.mjs';
import {
  boundedLine, componentEntry, estimatedTokens, exactSourceKeys,
  projectionContentMembershipDigest, projectionMembershipDigest, sourceEntry, sourceRecordDigest,
  sourceText,
} from './source-projection-helpers.mjs';

export const GSM8K_SOCRATIC_PILOT = Object.freeze({
  sourceId: 'gsm8k', componentId: 'train-socratic',
  revision: '3101c7d5072418e28b9008a6636bde82a006892c',
  projectionId: 'gsm8k-socratic-task-structure-v1',
  sha256: '153d86551187cfd64ef7afb59bfd0ef75cea3ae9388e7ad31e43920b6dd77872',
  bytes: 5_401_739, rawRows: 7_473, projectedRows: 7_473,
  projectionDigest: 'sha256:27246fd7dafc5435483507e187db97179f496c6f92114a0392b9b3974de21476',
  contentMembershipDigest: 'sha256:d4b9e14c42063b8ff1831fb1de4f69e4ae2ea270110732cace339f74ae57ec62',
  shardCount: 1,
});

async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function socraticStepCount(answer) {
  const lines = answer.split(/\r?\n/u).filter((line) => line.includes(' ** '));
  if (lines.length < 1 || lines.length > 64) throw new TypeError('GSM8K Socratic row has an invalid step structure.');
  return lines.length;
}

export async function inventoryGsm8kSocraticPilot(path) {
  const [identity, file] = await Promise.all([fileSha256(path), stat(path)]);
  if (identity !== GSM8K_SOCRATIC_PILOT.sha256 || file.size !== GSM8K_SOCRATIC_PILOT.bytes) {
    throw new Error('GSM8K Socratic pilot identity differs from the pinned component.');
  }
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  const members = [];
  const contentMembers = [];
  let rawRows = 0;
  for await (const line of lines) {
    boundedLine(line, 65_536, `GSM8K Socratic row ${rawRows}`);
    const row = JSON.parse(line);
    exactSourceKeys(row, ['answer', 'question'], `GSM8K Socratic row ${rawRows}`);
    sourceText(row.question, `GSM8K Socratic row ${rawRows}.question`, 8_192);
    sourceText(row.answer, `GSM8K Socratic row ${rawRows}.answer`, 32_768);
    socraticStepCount(row.answer);
    members.push(sourceRecordDigest(line));
    contentMembers.push(researchEpisodeContentMember(
      gsm8kSocraticEpisodeFromLine(line, `sha256:${'0'.repeat(64)}`),
    ));
    rawRows += 1;
  }
  if (rawRows !== GSM8K_SOCRATIC_PILOT.rawRows) throw new Error('GSM8K Socratic row count is not pinned.');
  const inventory = {
    identity, bytes: file.size, rawRows, projectedRows: rawRows,
    projectionDigest: projectionMembershipDigest(GSM8K_SOCRATIC_PILOT.projectionId, members, rawRows),
    contentMembershipDigest: projectionContentMembershipDigest(
      GSM8K_SOCRATIC_PILOT.projectionId, contentMembers, rawRows,
    ),
  };
  if (inventory.projectedRows !== GSM8K_SOCRATIC_PILOT.projectedRows
      || inventory.projectionDigest !== GSM8K_SOCRATIC_PILOT.projectionDigest
      || inventory.contentMembershipDigest !== GSM8K_SOCRATIC_PILOT.contentMembershipDigest) {
    throw new Error(`GSM8K Socratic projected membership differs: ${inventory.contentMembershipDigest}.`);
  }
  return inventory;
}

export function gsm8kSocraticRegistryEntries(inventory) {
  return {
    source: sourceEntry({
      sourceId: GSM8K_SOCRATIC_PILOT.sourceId, revision: GSM8K_SOCRATIC_PILOT.revision,
      owner: 'OpenAI', officialUrl: 'https://github.com/openai/grade-school-math',
      citation: 'Cobbe et al. Training Verifiers to Solve Math Word Problems.',
      independenceGroup: 'openai-gsm8k-collection', sha256: inventory.identity,
      bytes: inventory.bytes, mediaType: 'application/jsonl',
    }),
    component: componentEntry({
      sourceId: GSM8K_SOCRATIC_PILOT.sourceId, componentId: GSM8K_SOCRATIC_PILOT.componentId,
      revision: GSM8K_SOCRATIC_PILOT.revision, kind: 'socratic-reasoning-trajectories',
      sha256: inventory.identity, rawRows: inventory.rawRows, licenseId: 'mit',
      redistribution: 'metadata-only', projectionId: GSM8K_SOCRATIC_PILOT.projectionId,
      projectionDigest: inventory.projectionDigest, projectedRows: inventory.projectedRows,
      contentMembershipDigest: inventory.contentMembershipDigest,
      shardCount: GSM8K_SOCRATIC_PILOT.shardCount, shardFormat: 'jsonl',
      allowedFields: ['answer-structure', 'question'],
      excludedFields: ['numeric-answer', 'solution-text', 'source-row-index'],
    }),
  };
}

function actionsForSteps(stepCount) {
  const actions = [{
    actionId: 'action:decompose', ordinal: 0, phase: 'plan', kind: 'decompose-task',
    arguments: [], dependsOn: [], stateDeltaKinds: ['plan-created'], outcome: 'succeeded',
    errorKind: 'none', witnessKind: 'none',
  }];
  for (let index = 0; index < stepCount; index += 1) {
    actions.push({
      actionId: `action:reason-${index}`, ordinal: actions.length, phase: 'reason', kind: 'reason-step',
      arguments: [], dependsOn: [actions.at(-1).actionId], stateDeltaKinds: ['derivation-added'],
      outcome: 'succeeded', errorKind: 'none', witnessKind: 'none',
    });
  }
  actions.push({
    actionId: 'action:construct', ordinal: actions.length, phase: 'construct', kind: 'construct-output',
    arguments: [], dependsOn: [actions.at(-1).actionId], stateDeltaKinds: ['artifact-constructed'],
    outcome: 'succeeded', errorKind: 'none', witnessKind: 'none',
  });
  actions.push({
    actionId: 'action:terminate', ordinal: actions.length, phase: 'terminate', kind: 'terminate',
    arguments: [], dependsOn: [actions.at(-1).actionId], stateDeltaKinds: ['terminated'],
    outcome: 'succeeded', errorKind: 'none', witnessKind: 'none',
  });
  return actions;
}

export function gsm8kSocraticEpisodeFromLine(line, projectionDigest) {
  const sourceBytes = boundedLine(line, 65_536, 'GSM8K Socratic row');
  const row = JSON.parse(line);
  exactSourceKeys(row, ['answer', 'question'], 'GSM8K Socratic row');
  sourceText(row.question, 'GSM8K Socratic row.question', 8_192);
  sourceText(row.answer, 'GSM8K Socratic row.answer', 32_768);
  const recordDigest = sourceRecordDigest(line);
  const actions = actionsForSteps(socraticStepCount(row.answer));
  return createResearchEpisode({
    format: 'eslm-research-episode-v1',
    episodeId: `episode:gsm8k:${recordDigest.slice(7, 39)}`,
    source: {
      sourceId: GSM8K_SOCRATIC_PILOT.sourceId, componentId: GSM8K_SOCRATIC_PILOT.componentId,
      revision: GSM8K_SOCRATIC_PILOT.revision, componentDigest: `sha256:${GSM8K_SOCRATIC_PILOT.sha256}`,
      projectionId: GSM8K_SOCRATIC_PILOT.projectionId, projectionDigest,
      split: 'train-socratic', visibility: 'training-visible',
      licenseId: 'mit', rightsState: 'approved',
    },
    request: {
      visibleText: row.question, operationKinds: ['plan', 'reason', 'construct'], artifactKind: 'derivation',
      constraintKinds: ['completeness', 'ordering'], requiredCapabilities: ['construct', 'reason'],
      outputObligations: ['complete', 'ordered'],
    },
    initialState: { stateKinds: ['request-state'], unknownKinds: ['artifact-state', 'plan-state'] },
    observations: [{
      observationId: 'observation:request', ordinal: 0, phase: 'interpret', kind: 'request', stateDeltaKinds: [],
    }],
    actions,
    outcome: {
      status: 'succeeded', resultKind: 'derivation', failureKind: 'none',
      witnessAvailable: false, criteriaKinds: ['complete', 'ordered'],
    },
    feedback: [], preferences: [],
    provenance: {
      recordDigest,
      sourceNativeIds: [],
      spans: [{ field: 'question', start: 0, end: row.question.length }],
    },
    governance: {
      truthStatus: 'claimed', epistemicStatus: 'model-output', safetyTags: [], privacyTags: [],
      projectionLosses: ['numeric-answer-excluded', 'solution-text-excluded', 'source-row-index-excluded'],
    },
    work: {
      sourceBytes, tokens: estimatedTokens(row.question), actions: actions.length,
      dependencies: actions.length - 1, complete: true,
    },
  });
}

export async function* gsm8kSocraticPilotEpisodes(path, inventory) {
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) yield gsm8kSocraticEpisodeFromLine(line, inventory.projectionDigest);
}
