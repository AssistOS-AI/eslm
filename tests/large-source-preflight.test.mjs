import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertLargeSourcePreflightReceipt } from '../src/research/large-source-preflight.mjs';
import {
  assertLargeSourcePreflightImplementationIdentity,
  largeSourcePreflightImplementationIdentity,
} from '../src/research/large-source-preflight-implementation-identity.mjs';
import {
  assertLargeSourceInputCheckpoint,
  createOasst1LargeSourceInputCheckpoint,
  restoreOasst1LargeSourceInputCheckpoint,
} from '../src/research/large-source-input-checkpoint.mjs';
import { loadLargeSourceReadinessGate } from '../src/research/large-source-readiness-gate.mjs';
import {
  DEFAULT_OASST1_DISCOVERY_PLAN,
  DEFAULT_OASST1_PREFLIGHT,
  DEFAULT_OASST1_PATH,
  DEFAULT_OASST1_PROJECTION_ROOT,
  DEFAULT_OASST1_READINESS,
  DEFAULT_OASST1_SOURCE_MANIFEST,
  DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
  OASST1_LARGE_SOURCE,
} from '../src/research/processing-graph-scale-runner.mjs';
import { currentProcessingGraphBaseline } from '../src/research/research-implementation-identity.mjs';
import { sha256, stableStringify } from '../src/util.mjs';

function resign(receipt) {
  delete receipt.receiptDigest;
  receipt.receiptDigest = `sha256:${sha256(stableStringify(receipt))}`;
  return receipt;
}

function resignPreflightImplementation(identity) {
  identity.aggregateDigest = `sha256:${sha256(stableStringify({
    format: identity.format,
    entryPath: identity.entryPath,
    fileCount: identity.fileCount,
    files: identity.files,
  }))}`;
  return identity;
}

async function committedPreflight() {
  return readFile(DEFAULT_OASST1_PREFLIGHT, 'utf8').then(JSON.parse);
}

async function writeCheckpoint(path, checkpoint, { resignReceipt = true } = {}) {
  if (resignReceipt) resign(checkpoint);
  const bytes = `${JSON.stringify(checkpoint)}\n`;
  await writeFile(path, bytes, 'utf8');
  return { path, digest: `sha256:${sha256(bytes)}` };
}

test('preflight implementation identity covers the complete static execution closure', async () => {
  const identity = await largeSourcePreflightImplementationIdentity();
  assert.equal(assertLargeSourcePreflightImplementationIdentity(identity), identity);
  assert.ok(identity.fileCount > 10);
  for (const path of [
    'scripts/run-oasst1-large-source-preflight.mjs',
    'src/research/large-source-input-checkpoint.mjs',
    'src/research/large-source-preflight-contract.mjs',
    'src/research/large-source-readiness-gate.mjs',
  ]) assert.ok(identity.files.some((file) => file.path === path), path);
});

test('preflight contract binds analysis and checkpoint identities before readiness', async () => {
  const receipt = await committedPreflight();
  const mutations = [
    ['registry', (value) => {
      value.analysisReplay.registryDigest = `sha256:${'0'.repeat(64)}`;
    }, /does not reproduce/u],
    ['checkpoint-analysis', (value) => {
      value.analysisReplay.inputStreamCheckpoint.analysisImplementationDigest =
        `sha256:${'0'.repeat(64)}`;
    }, /does not reproduce/u],
    ['checkpoint-preflight', (value) => {
      value.analysisReplay.inputStreamCheckpoint.preflightImplementationDigest =
        `sha256:${'0'.repeat(64)}`;
    }, /does not reproduce/u],
  ];
  for (const [_name, mutate, pattern] of mutations) {
    const changed = structuredClone(receipt);
    mutate(changed);
    resign(changed);
    assert.throws(() => assertLargeSourcePreflightReceipt(changed), pattern);
  }
});

function restoreCheckpoint(path, digest) {
  return restoreOasst1LargeSourceInputCheckpoint({
    checkpointPath: path,
    expectedCheckpointFileDigest: digest,
    projectionRoot: DEFAULT_OASST1_PROJECTION_ROOT,
    validationMembershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
  });
}

test('committed large-source preflight is a closed content-bound receipt', async () => {
  const receipt = await committedPreflight();
  assert.equal(assertLargeSourcePreflightReceipt(receipt), receipt);
  assert.equal(receipt.complete, true);
  assert.deepEqual(receipt.streaming.processes.map((row) => row.role),
    ['full-a', 'full-b', 'checkpoint-create', 'checkpoint-restore']);
  assert.ok(receipt.streaming.processes.every((row) => row.exitCode === 0
    && row.peakRssBytes > 0));
  assert.equal(receipt.streaming.measurementProtocol, 'linux-proc-status-vmhwm-v1');
  assert.equal(receipt.streaming.workerHeapLimitBytes, 384 * 1_024 * 1_024);
  assert.equal(receipt.analysisReplay.firstReceiptDigest,
    receipt.analysisReplay.secondReceiptDigest);
  assert.equal(receipt.analysisReplay.firstReceiptDigest,
    receipt.analysisReplay.restoredReceiptDigest);
  assert.equal(receipt.analysisReplay.inputStreamCheckpoint.creatorProcessExitCode, 0);
  assert.equal(receipt.analysisReplay.inputStreamCheckpoint.restorerProcessExitCode, 0);
  assert.equal(receipt.contamination.developmentRowsVisited, 0);
  assert.equal(receipt.contamination.protectedRowsVisited, 0);
  assert.equal(receipt.removal.targetsCreated, receipt.removal.targetsPurged);
});

test('preflight rejects replay, process, and contamination claims that do not reconcile', async () => {
  const receipt = await committedPreflight();
  const replayDrift = resign(structuredClone(receipt));
  replayDrift.analysisReplay.secondReceiptDigest = `sha256:${'0'.repeat(64)}`;
  resign(replayDrift);
  assert.throws(() => assertLargeSourcePreflightReceipt(replayDrift),
    /deterministic or input-stream restore replay/u);

  const failedProcess = structuredClone(receipt);
  failedProcess.streaming.processes[1].exitCode = 1;
  resign(failedProcess);
  assert.throws(() => assertLargeSourcePreflightReceipt(failedProcess),
    /process execution did not complete canonically/u);

  const contaminated = structuredClone(receipt);
  contaminated.contamination.developmentRowsVisited = 1;
  resign(contaminated);
  assert.throws(() => assertLargeSourcePreflightReceipt(contaminated),
    /contamination isolation failed/u);
});

test('projection input checkpoint survives process-boundary restoration and rejects drift', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-input-checkpoint-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const checkpointPath = join(root, 'checkpoint.json');
  const checkpoint = await createOasst1LargeSourceInputCheckpoint({
    sourcePath: DEFAULT_OASST1_PATH,
    projectionRoot: DEFAULT_OASST1_PROJECTION_ROOT,
    validationMembershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    checkpointShard: 4,
    outputPath: checkpointPath,
  });
  assert.equal(assertLargeSourceInputCheckpoint(checkpoint), checkpoint);
  const checkpointBytes = await readFile(checkpointPath);
  const restored = await restoreCheckpoint(
    checkpointPath, `sha256:${sha256(checkpointBytes)}`,
  );
  let episodes = 0;
  for await (const _episode of restored.episodes) episodes += 1;
  assert.equal(episodes, OASST1_LARGE_SOURCE.projectedRows);

  for (const [name, mutate, pattern] of [
    ['prefix-omission', (value) => {
      const lines = value.prefixShards[0].jsonl.trimEnd().split('\n');
      value.prefixShards[0].jsonl = `${lines.slice(1).join('\n')}\n`;
    }, /JSONL bytes do not match/u],
    ['prefix-duplication', (value) => {
      const lines = value.prefixShards[0].jsonl.trimEnd().split('\n');
      value.prefixShards[0].jsonl = `${[lines[0], ...lines].join('\n')}\n`;
    }, /JSONL bytes do not match/u],
    ['prefix-reorder', (value) => {
      const lines = value.prefixShards[0].jsonl.trimEnd().split('\n');
      [lines[0], lines[1]] = [lines[1], lines[0]];
      value.prefixShards[0].jsonl = `${lines.join('\n')}\n`;
    }, /JSONL bytes do not match/u],
    ['suffix-overlap', (value) => {
      value.boundary.checkpointShard -= 1;
    }, /boundary does not partition/u],
    ['implementation-drift', (value) => {
      value.implementationDigest = `sha256:${'0'.repeat(64)}`;
    }, /stale against live governance/u],
    ['preflight-implementation-drift', (value) => {
      value.preflightImplementationDigest = `sha256:${'0'.repeat(64)}`;
    }, /stale against live governance/u],
    ['plan-artifact-drift', (value) => {
      value.source.discoveryPlanArtifactDigest = `sha256:${'0'.repeat(64)}`;
    }, /stale against live governance/u],
    ['plan-content-drift', (value) => {
      value.source.discoveryPlanContentDigest = `sha256:${'0'.repeat(64)}`;
    }, /stale against live governance/u],
    ['graph-drift', (value) => {
      value.baselineGraph.catalogDigest = `sha256:${'0'.repeat(64)}`;
    }, /stale against live governance/u],
    ['projection-drift', (value) => {
      value.projection.manifestDigest = `sha256:${'0'.repeat(64)}`;
    }, /projection manifest is stale/u],
    ['shard-content-membership-drift', (value) => {
      value.projection.shards[0].contentMembershipDigest = `sha256:${'0'.repeat(64)}`;
    }, /does not bind its projection-manifest shard/u],
  ]) {
    const mutationPath = join(root, `${name}.json`);
    const changed = structuredClone(checkpoint);
    mutate(changed);
    const artifact = await writeCheckpoint(mutationPath, changed);
    await assert.rejects(restoreCheckpoint(artifact.path, artifact.digest), pattern);
  }

  const tamperedBytes = `${checkpointBytes.toString('utf8').trimEnd()} \n`;
  const tamperedPath = join(root, 'byte-tamper.json');
  await writeFile(tamperedPath, tamperedBytes, 'utf8');
  await assert.rejects(restoreCheckpoint(
    tamperedPath, `sha256:${sha256(checkpointBytes)}`,
  ), /checkpoint file digest is invalid/u);
});

test('readiness rejects a self-resigned preflight from a different script', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-preflight-script-drift-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const [preflight, readiness] = await Promise.all([
    committedPreflight(),
    readFile(DEFAULT_OASST1_READINESS, 'utf8').then(JSON.parse),
  ]);
  const entry = preflight.preflightImplementationIdentity.files.find((file) =>
    file.path === preflight.preflightImplementationIdentity.entryPath);
  assert.ok(entry);
  entry.sha256 = `sha256:${'0'.repeat(64)}`;
  resignPreflightImplementation(preflight.preflightImplementationIdentity);
  preflight.command.scriptDigest = entry.sha256;
  preflight.analysisReplay.inputStreamCheckpoint.preflightImplementationDigest =
    preflight.preflightImplementationIdentity.aggregateDigest;
  resign(preflight);
  const preflightBytes = `${JSON.stringify(preflight, null, 2)}\n`;
  const preflightPath = join(root, 'preflight.json');
  await writeFile(preflightPath, preflightBytes, 'utf8');
  readiness.preflightReceiptDigest = `sha256:${sha256(preflightBytes)}`;
  const readinessPath = join(root, 'readiness.json');
  await writeFile(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');

  await assert.rejects(loadLargeSourceReadinessGate({
    readinessPath,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    preflightPath,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expected: OASST1_LARGE_SOURCE,
  }), /does not bind the frozen source, plan, or projection/u);
});

test('readiness rejects a self-resigned preflight from a different transitive implementation',
  async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'eslm-preflight-closure-drift-'));
    context.after(() => rm(root, { recursive: true, force: true }));
    const [preflight, readiness] = await Promise.all([
      committedPreflight(),
      readFile(DEFAULT_OASST1_READINESS, 'utf8').then(JSON.parse),
    ]);
    const target = preflight.preflightImplementationIdentity.files.find((file) =>
      file.path === 'src/research/large-source-input-checkpoint.mjs');
    assert.ok(target);
    target.sha256 = `sha256:${'0'.repeat(64)}`;
    resignPreflightImplementation(preflight.preflightImplementationIdentity);
    preflight.analysisReplay.inputStreamCheckpoint.preflightImplementationDigest =
      preflight.preflightImplementationIdentity.aggregateDigest;
    resign(preflight);
    const preflightBytes = `${JSON.stringify(preflight, null, 2)}\n`;
    const preflightPath = join(root, 'preflight.json');
    await writeFile(preflightPath, preflightBytes, 'utf8');
    readiness.preflightReceiptDigest = `sha256:${sha256(preflightBytes)}`;
    const readinessPath = join(root, 'readiness.json');
    await writeFile(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');

    await assert.rejects(loadLargeSourceReadinessGate({
      readinessPath,
      sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
      discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
      preflightPath,
      baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
      expected: OASST1_LARGE_SOURCE,
    }), /does not bind the frozen source, plan, or projection/u);
  });
