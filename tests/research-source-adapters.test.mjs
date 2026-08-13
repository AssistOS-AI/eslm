import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createResearchSourceRegistry } from '../src/research/processing-graph-research.mjs';
import { analyzeProcessingGraphScaleStages } from '../src/research/processing-graph-scale-runner.mjs';
import {
  researchEpisodeAuditDigest,
} from '../src/research/research-episode-contract.mjs';
import { researchEpisodeContentMember } from '../src/research/research-episode-membership.mjs';
import {
  gsm8kSocraticEpisodeFromLine,
} from '../src/research/sources/gsm8k-socratic-pilot.mjs';
import {
  groupHelpSteer2Lines,
  helpSteer2EpisodeFromGroup,
} from '../src/research/sources/helpsteer2-pilot.mjs';
import {
  OASST1_LARGE_SOURCE,
  inventoryOasst1LargeSource,
  oasst1EpisodeFromTreeLine,
  oasst1ProjectionEpisodes,
  oasst1ProjectionManifestDigest,
  projectOasst1LargeSource,
  validateOasst1ProjectionManifest,
} from '../src/research/sources/oasst1-large-source.mjs';
import {
  OASST1_VALIDATION_SOURCE,
  assertOasst1ValidationMembership,
  loadOasst1ValidationMembership,
} from '../src/research/sources/oasst1-validation-membership.mjs';
import {
  projectionContentMembershipDigest,
  projectionMembershipDigest,
} from '../src/research/sources/source-projection-helpers.mjs';
import { sha256 } from '../src/util.mjs';
import {
  inspectResearchSourceCache, purgeResearchSourceCache,
} from '../src/research/research-cache-removal.mjs';
import {
  createSyntheticProcessingGraphResearchFixture,
} from './fixtures/processing-graph-research-fixture.mjs';

function digest(value) {
  return `sha256:${sha256(value)}`;
}

function reviewedMessage(overrides = {}) {
  return {
    message_id: 'native-message-secret',
    user_id: 'native-user-secret',
    role: 'prompter',
    text: 'source-text-secret',
    lang: 'en',
    deleted: false,
    synthetic: false,
    review_result: true,
    labels: { pii: { value: 0 } },
    replies: [],
    ...overrides,
  };
}

function reviewedTree(suffix = 'a') {
  const followUp = reviewedMessage({
    message_id: `native-follow-up-${suffix}`,
    user_id: `native-user-follow-up-${suffix}`,
    text: `follow-up-text-secret-${suffix}`,
  });
  const firstReply = reviewedMessage({
    message_id: `native-assistant-first-${suffix}`,
    user_id: `native-assistant-user-first-${suffix}`,
    role: 'assistant',
    text: `assistant-first-text-secret-${suffix}`,
    rank: 0,
    labels: {
      pii: { value: 0 }, helpfulness: { value: 0.9 }, quality: { value: 0.8 },
      toxicity: { value: 0.1 },
    },
    replies: [followUp],
  });
  const secondReply = reviewedMessage({
    message_id: `native-assistant-second-${suffix}`,
    user_id: `native-assistant-user-second-${suffix}`,
    role: 'assistant',
    text: `assistant-second-text-secret-${suffix}`,
    rank: 1,
    labels: {
      pii: { value: 0 }, helpfulness: { value: 0.4 }, quality: { value: 0.6 },
      toxicity: { value: 0.3 },
    },
  });
  return {
    message_tree_id: `native-tree-secret-${suffix}`,
    tree_state: 'ready_for_export',
    prompt: reviewedMessage({
      message_id: `native-root-${suffix}`,
      user_id: `native-root-user-${suffix}`,
      text: `root-text-secret-${suffix}`,
      replies: [firstReply, secondReply],
    }),
  };
}

function line(value) {
  return JSON.stringify(value);
}

async function collect(iterable) {
  const values = [];
  for await (const value of iterable) values.push(value);
  return values;
}

test('OASST English tree projection retains roles, dependencies, and feedback without raw content', () => {
  const projectionDigest = digest('oasst-synthetic-membership');
  const episode = oasst1EpisodeFromTreeLine(line(reviewedTree()), projectionDigest);
  assert.ok(episode);
  assert.deepEqual(episode.actions.map((action) => action.kind), [
    'parse-request', 'construct-output', 'parse-request', 'construct-output',
  ]);
  assert.deepEqual(episode.actions.map((action) => action.dependsOn), [
    [], ['action:message-0'], ['action:message-1'], ['action:message-0'],
  ]);
  assert.deepEqual(episode.feedback.map((item) => item.axis).toSorted(), [
    'helpfulness', 'helpfulness', 'quality', 'quality', 'safety', 'safety',
  ]);
  assert.deepEqual(episode.preferences, [{
    preferenceId: 'preference:reply-group-0',
    candidateKinds: ['output', 'output'],
    preferredIndex: 0,
    axes: ['helpfulness', 'quality'],
    disagreement: false,
  }]);
  assert.deepEqual(episode.provenance.sourceNativeIds, []);
  const serialized = JSON.stringify(episode);
  assert.doesNotMatch(serialized, /native-(?:tree|message|user|root|assistant|follow-up)/u);
  assert.doesNotMatch(serialized, /(?:root|assistant|follow-up)-text-secret/u);
});

test('OASST excludes whole non-English, PII, deleted, and synthetic trees', () => {
  const projectionDigest = digest('oasst-exclusion-membership');
  const mutations = [
    (message) => { message.lang = 'und'; },
    (message) => { message.labels.pii.value = 1; },
    (message) => { message.deleted = true; },
    (message) => { message.synthetic = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const tree = reviewedTree(`excluded-${index}`);
    mutate(tree.prompt.replies[0]);
    assert.equal(oasst1EpisodeFromTreeLine(line(tree), projectionDigest), null);
  }
});

test('OASST excludes official validation membership before structural eligibility', () => {
  const tree = reviewedTree('validation-split');
  const validationTreeIds = new Set([tree.message_tree_id]);
  assert.equal(oasst1EpisodeFromTreeLine(
    line(tree), digest('oasst-training-only-membership'), { validationTreeIds },
  ), null);
  assert.deepEqual({
    messages: OASST1_VALIDATION_SOURCE.messageCount,
    trees: OASST1_VALIDATION_SOURCE.treeCount,
    digest: OASST1_VALIDATION_SOURCE.membershipDigest,
  }, {
    messages: 4_401,
    trees: 518,
    digest: 'sha256:d63e95578b04b0f7149e0739d98faaac362dc52989c9a285a0fe7610cceaa568',
  });
});

test('pinned OASST inventory reconciles official train and validation tree membership', async (context) => {
  const cacheRoot = join(
    process.cwd(), 'training/.cache/processing-graph-research/oasst1-fdf72ae0',
  );
  const membershipPath = join(cacheRoot, 'validation-tree-membership.json');
  const sourcePath = join(cacheRoot, '2023-04-12_oasst_ready.trees.jsonl.gz');
  try {
    await Promise.all([access(membershipPath), access(sourcePath)]);
  } catch {
    context.skip('Pinned OASST source or validation membership cache is unavailable.');
    return;
  }
  const membership = await loadOasst1ValidationMembership(membershipPath);
  const tamperedMembership = structuredClone(membership);
  tamperedMembership.treeIds[0] = tamperedMembership.treeIds[1];
  assert.throws(() => assertOasst1ValidationMembership(tamperedMembership),
    /tree identities are not canonical/u);
  const inventory = await inventoryOasst1LargeSource(sourcePath, membership);
  assert.deepEqual({
    rawTrees: inventory.rawTrees,
    trainingTrees: inventory.trainingTrees,
    developmentTrees: inventory.developmentTrees,
    projectedTrees: inventory.projectedTrees,
    excludedTrainingTrees: inventory.excludedTrainingTrees,
    projectionDigest: inventory.projectionDigest,
  }, {
    rawTrees: 10_364,
    trainingTrees: 9_846,
    developmentTrees: 518,
    projectedTrees: 2_220,
    excludedTrainingTrees: 7_626,
    projectionDigest: OASST1_LARGE_SOURCE.projectionDigest,
  });
  assert.equal(inventory.trainingTrees + inventory.developmentTrees, inventory.rawTrees);
  assert.equal(inventory.projectedTrees + inventory.excludedTrainingTrees,
    inventory.trainingTrees);
  const projectionRoot = await mkdtemp(join(tmpdir(), 'eslm-oasst-pinned-projection-'));
  context.after(() => rm(projectionRoot, { recursive: true, force: true }));
  const projection = await projectOasst1LargeSource(
    sourcePath, inventory, projectionRoot, membership,
  );
  assert.equal(oasst1ProjectionManifestDigest(projection.manifest),
    OASST1_LARGE_SOURCE.projectionManifestDigest);
  assert.deepEqual(projection.manifest.shards.map((shard) => shard.rows), [
    138, 157, 129, 145, 128, 137, 122, 154,
    154, 128, 128, 150, 158, 120, 115, 157,
  ]);
});

test('GSM8K Socratic projection keeps only the structural chain, not solution or answer text', () => {
  const sourceLine = line({
    question: 'A renamed collection changes twice. How many remain?',
    answer: [
      'Which transition is first? ** HIDDEN_SOLUTION_ALPHA applies the first transformation.',
      'Which transition follows? ** HIDDEN_SOLUTION_BETA applies the second transformation.',
      '#### 731991',
    ].join('\n'),
  });
  const episode = gsm8kSocraticEpisodeFromLine(sourceLine, digest('gsm-synthetic-membership'));
  assert.deepEqual(episode.actions.map((action) => action.kind), [
    'decompose-task', 'reason-step', 'reason-step', 'construct-output', 'terminate',
  ]);
  assert.equal(episode.work.dependencies, 4);
  assert.equal(episode.source.split, 'train-socratic');
  assert.ok(episode.governance.projectionLosses.includes('solution-text-excluded'));
  assert.ok(episode.governance.projectionLosses.includes('numeric-answer-excluded'));
  assert.doesNotMatch(JSON.stringify(episode), /HIDDEN_SOLUTION_ALPHA|HIDDEN_SOLUTION_BETA|731991/u);
});

test('HelpSteer grouping drops response bodies while retaining axes and disagreement', () => {
  const prompt = 'Prepare a renamed, bounded artifact.';
  const rows = [
    line({
      prompt, response: 'HIDDEN_RESPONSE_CANDIDATE_ALPHA',
      coherence: 4, complexity: 1, correctness: 4, helpfulness: 1, verbosity: 4,
    }),
    line({
      prompt, response: 'HIDDEN_RESPONSE_CANDIDATE_BETA',
      coherence: 1, complexity: 4, correctness: 1, helpfulness: 4, verbosity: 1,
    }),
  ];
  const grouped = groupHelpSteer2Lines(rows);
  assert.equal(grouped.rawRows, 2);
  assert.equal(grouped.groups.size, 1);
  const group = [...grouped.groups.values()][0];
  assert.equal(group.candidates.length, 2);
  assert.doesNotMatch(JSON.stringify(group), /HIDDEN_RESPONSE_CANDIDATE/u);
  const episode = helpSteer2EpisodeFromGroup(group, digest('helpsteer-synthetic-membership'));
  assert.equal(episode.source.split, 'train');
  assert.deepEqual([...new Set(episode.feedback.map((item) => item.axis))].toSorted(), [
    'coherence', 'complexity', 'correctness', 'helpfulness', 'verbosity',
  ]);
  assert.equal(episode.feedback.length, 10);
  assert.equal(episode.preferences[0].preferredIndex, null);
  assert.equal(episode.preferences[0].disagreement, true);
  assert.doesNotMatch(JSON.stringify(episode), /HIDDEN_RESPONSE_CANDIDATE/u);
});

async function writeSyntheticProjection(path, episodes, projectionDigest) {
  const rowsByShard = Array.from({ length: OASST1_LARGE_SOURCE.shardCount }, () => []);
  for (const episode of episodes) {
    const index = Number.parseInt(episode.provenance.recordDigest.slice(7, 15), 16)
      % OASST1_LARGE_SOURCE.shardCount;
    rowsByShard[index].push(episode);
  }
  const shards = [];
  for (const [index, rows] of rowsByShard.entries()) {
    const content = rows.map((episode) => JSON.stringify(episode)).join('\n') + (rows.length > 0 ? '\n' : '');
    const file = `shard-${String(index).padStart(2, '0')}.jsonl`;
    await writeFile(join(path, file), content, 'utf8');
    shards.push({
      index,
      file,
      rows: rows.length,
      sha256: digest(content),
      episodeMembershipDigest: projectionMembershipDigest(
        `${OASST1_LARGE_SOURCE.projectionId}:shard-${index}`,
        rows.map((episode) => researchEpisodeAuditDigest(episode)),
        rows.length,
      ),
      contentMembershipDigest: projectionContentMembershipDigest(
        `${OASST1_LARGE_SOURCE.projectionId}:shard-${index}`,
        rows.map((episode) => researchEpisodeContentMember(episode)),
        rows.length,
      ),
    });
  }
  const contentMembershipDigest = projectionContentMembershipDigest(
    OASST1_LARGE_SOURCE.projectionId,
    episodes.map((episode) => researchEpisodeContentMember(episode)),
    episodes.length,
  );
  const manifest = {
    format: 'eslm-oasst1-projection-shards-v1',
    sourceRevision: `${OASST1_LARGE_SOURCE.sourceId}@${OASST1_LARGE_SOURCE.revision}`,
    sourceDigest: `sha256:${OASST1_LARGE_SOURCE.sha256}`,
    projectionId: OASST1_LARGE_SOURCE.projectionId,
    projectionDigest,
    contentMembershipDigest,
    episodes: episodes.length,
    messagesRepresented: episodes.reduce((sum, episode) => sum + episode.actions.length, 0),
    shards,
    complete: true,
  };
  await writeFile(join(path, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

test('OASST shard validation and partial-plus-resume concatenation are deterministic', async (context) => {
  const path = await mkdtemp(join(tmpdir(), 'eslm-oasst-projection-'));
  context.after(() => rm(path, { recursive: true, force: true }));
  const sourceLines = Array.from({ length: 12 }, (_, index) => line(reviewedTree(`shard-${index}`)));
  const projectionDigest = projectionMembershipDigest(
    OASST1_LARGE_SOURCE.projectionId,
    sourceLines.map((sourceLine) => digest(sourceLine)),
    sourceLines.length,
  );
  const episodes = sourceLines.map((sourceLine) =>
    oasst1EpisodeFromTreeLine(sourceLine, projectionDigest));
  const manifest = await writeSyntheticProjection(path, episodes, projectionDigest);
  const inventory = {
    projectionDigest,
    contentMembershipDigest: manifest.contentMembershipDigest,
    rawTrees: sourceLines.length,
    projectedTrees: episodes.length,
    projectedMessages: episodes.reduce((sum, episode) => sum + episode.actions.length, 0),
  };
  const [firstValidation, secondValidation] = await Promise.all([
    validateOasst1ProjectionManifest(path, inventory),
    validateOasst1ProjectionManifest(path, inventory),
  ]);
  assert.deepEqual(firstValidation, secondValidation);
  assert.equal(oasst1ProjectionManifestDigest(firstValidation),
    oasst1ProjectionManifestDigest(secondValidation));

  const populated = manifest.shards.filter((shard) => shard.rows > 0).map((shard) => shard.index);
  assert.ok(populated.length >= 2);
  const split = populated[1];
  const projection = { path, manifest };
  const partial = await collect(oasst1ProjectionEpisodes({
    path, manifest: { ...manifest, shards: manifest.shards.slice(0, split) },
  }));
  const resumed = await collect(oasst1ProjectionEpisodes(projection, { startShard: split }));
  const complete = await collect(oasst1ProjectionEpisodes(projection));
  assert.deepEqual([...partial, ...resumed], complete);
  await assert.rejects(collect(oasst1ProjectionEpisodes(projection, { startShard: -1 })),
    /valid shard boundary/u);

  const mismatched = structuredClone(manifest);
  mismatched.shards[populated[0]].episodeMembershipDigest = digest('wrong-membership');
  await writeFile(join(path, 'manifest.json'), `${JSON.stringify(mismatched, null, 2)}\n`, 'utf8');
  await assert.rejects(validateOasst1ProjectionManifest(path, inventory),
    /does not match its receipt/u);
  await writeFile(join(path, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await assert.rejects(validateOasst1ProjectionManifest(path, {
    ...inventory, rawTrees: inventory.rawTrees + 1,
  }), /membership does not reconcile/u);
});

function registryForSource(registry, sourceId) {
  return createResearchSourceRegistry({
    sources: registry.sources.filter((source) => source.sourceId === sourceId),
    components: registry.components.filter((component) => component.sourceId === sourceId),
  });
}

test('scale stages preserve partial, full, and bounded cross-source completeness', async () => {
  const fixture = createSyntheticProcessingGraphResearchFixture({ namespace: 'staged-renamed' });
  const largeSourceId = fixture.registry.sources[0].sourceId;
  const largeRegistry = registryForSource(fixture.registry, largeSourceId);
  const largeEpisodes = fixture.episodes.filter((episode) => episode.source.sourceId === largeSourceId);
  assert.ok(largeEpisodes.length > 1);
  const input = {
    largeSourceRegistry: largeRegistry,
    diagnosticEpisodes: largeEpisodes.slice(0, -1),
    fullLargeSourceEpisodes: largeEpisodes,
    crossSourceRegistry: fixture.registry,
    crossSourceEpisodes: fixture.episodes,
    crossSourceEpisodeLimit: 5,
    largeSourceAnalysisIdentity: {
      analysisId: 'synthetic-large-source', version: '1.0.0', seed: 'synthetic-large-seed',
    },
    crossSourceAnalysisIdentity: {
      analysisId: 'synthetic-cross-source', version: '1.0.0', seed: 'synthetic-cross-seed',
    },
  };
  const first = await analyzeProcessingGraphScaleStages(input);
  const second = await analyzeProcessingGraphScaleStages({
    ...input,
    diagnosticEpisodes: [...input.diagnosticEpisodes].reverse(),
    fullLargeSourceEpisodes: [...largeEpisodes].reverse(),
    crossSourceEpisodes: [...fixture.episodes].reverse(),
  });
  assert.deepEqual(first, second);
  assert.equal(first.diagnostic.completeness.complete, false);
  assert.ok(first.diagnostic.omissions.some((item) =>
    item.reason === 'projection-membership-incomplete'));
  assert.equal(first.fullLargeSource.completeness.complete, true);
  assert.equal(first.fullLargeSource.work.episodesAnalyzed, largeEpisodes.length);
  assert.equal(first.crossSource.completeness.complete, false);
  assert.equal(first.crossSource.work.episodesAvailable, fixture.episodes.length);
  assert.equal(first.crossSource.work.episodesAnalyzed, 5);
  assert.ok(first.crossSource.omissions.some((item) => item.reason === 'max-episodes'));
});

test('research source removal is explicit, inventory-bound, and rehearsed outside the real cache', async (context) => {
  const temporary = await mkdtemp(join(tmpdir(), 'eslm-research-removal-'));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  const cacheRoot = join(temporary, 'processing-graph-research');
  const sourceCacheKey = 'renamed-source-v1';
  await mkdir(join(cacheRoot, sourceCacheKey, 'projected'), { recursive: true });
  await writeFile(join(cacheRoot, sourceCacheKey, 'raw.bin'), 'frozen-source-bytes', 'utf8');
  await writeFile(join(cacheRoot, sourceCacheKey, 'projected', 'shard.jsonl'), '{}\n', 'utf8');
  const before = await inspectResearchSourceCache({ cacheRoot, sourceCacheKey });
  assert.equal(before.files, 2);
  assert.equal(before.removed, false);
  const receipt = await purgeResearchSourceCache({ cacheRoot, sourceCacheKey });
  assert.equal(receipt.removed, true);
  assert.equal(receipt.inventoryDigest, before.inventoryDigest);
  await assert.rejects(access(join(cacheRoot, sourceCacheKey)), /ENOENT/u);
  await assert.rejects(inspectResearchSourceCache({ cacheRoot: temporary, sourceCacheKey }),
    /explicit processing-graph-research root/u);
});
