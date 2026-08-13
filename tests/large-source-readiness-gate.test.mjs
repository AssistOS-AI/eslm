import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertLargeSourceReadinessGate,
  loadLargeSourceReadinessGate,
} from '../src/research/large-source-readiness-gate.mjs';
import {
  DEFAULT_OASST1_DISCOVERY_PLAN,
  DEFAULT_OASST1_PREFLIGHT,
  DEFAULT_OASST1_READINESS,
  DEFAULT_OASST1_SOURCE_MANIFEST,
  DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN,
  OASST1_LARGE_SOURCE,
  runProcessingGraphScale,
} from '../src/research/processing-graph-scale-runner.mjs';
import { currentProcessingGraphBaseline } from '../src/research/research-implementation-identity.mjs';

function loadGate(readinessPath = DEFAULT_OASST1_READINESS) {
  return loadLargeSourceReadinessGate({
    readinessPath,
    sourceManifestPath: DEFAULT_OASST1_SOURCE_MANIFEST,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    preflightPath: DEFAULT_OASST1_PREFLIGHT,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expected: OASST1_LARGE_SOURCE,
  });
}

test('committed OASST1 readiness admits only its exact frozen projection', async () => {
  const gate = await loadGate();
  assert.equal(assertLargeSourceReadinessGate(gate), gate);
  assert.equal(gate.decision, 'admit');
  assert.deepEqual(gate.failures, []);
  assert.equal(gate.readiness.pilot.rowsAvailable, 2_220);
  assert.equal(gate.readiness.scalePlan.maximumRows, 9_846);
  assert.ok(gate.readiness.streaming.peakBytes
    < gate.readiness.streaming.maximumPeakBytes);
  assert.deepEqual(gate.authority, {
    executionAdmission: 'exact-frozen-projection-only',
    answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
  });
});

test('readiness blocks identity drift before the source cache is inspected', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-readiness-gate-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const receipt = JSON.parse(await readFile(DEFAULT_OASST1_READINESS, 'utf8'));
  receipt.pilotProjectionDigest = `sha256:${'0'.repeat(64)}`;
  const readinessPath = join(root, 'readiness.json');
  await writeFile(readinessPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await assert.rejects(runProcessingGraphScale({
    readinessPath,
    oasst1Path: join(root, 'source-must-not-be-opened.jsonl.gz'),
  }), /does not bind the frozen source/u);
});

test('cross-source plan is validated before any large-source data is inspected', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-scale-plan-first-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const plan = JSON.parse(await readFile(DEFAULT_CROSS_SOURCE_DISCOVERY_PLAN, 'utf8'));
  plan.authority.promotion = 'proof';
  const planPath = join(root, 'invalid-plan.json');
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await assert.rejects(runProcessingGraphScale({
    crossSourceDiscoveryPlanPath: planPath,
    oasst1Path: join(root, 'source-must-not-be-opened.jsonl.gz'),
  }), /authority is inconsistent/u);
});

test('readiness cannot self-admit after a resource or rights failure', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-readiness-resource-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const receipt = JSON.parse(await readFile(DEFAULT_OASST1_READINESS, 'utf8'));
  receipt.streaming.peakBytes = receipt.streaming.maximumPeakBytes + 1;
  const readinessPath = join(root, 'readiness.json');
  await writeFile(readinessPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await assert.rejects(loadGate(readinessPath), /decision contradicts/u);
});

test('readiness cannot admit sharded-development as large-corpus execution', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-readiness-stage-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const receipt = JSON.parse(await readFile(DEFAULT_OASST1_READINESS, 'utf8'));
  receipt.scalePlan.stage = 'sharded-development';
  const readinessPath = join(root, 'readiness.json');
  await writeFile(readinessPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await assert.rejects(loadGate(readinessPath), /stage must be large-corpus/u);
});

test('readiness cannot substitute plan artifact, content, or admission identities',
  async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'eslm-readiness-plan-binding-'));
    context.after(() => rm(root, { recursive: true, force: true }));
    const original = JSON.parse(await readFile(DEFAULT_OASST1_READINESS, 'utf8'));
    for (const field of [
      'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest',
      'sourceAdmissionReceiptDigest',
    ]) {
      const receipt = structuredClone(original);
      receipt[field] = `sha256:${'0'.repeat(64)}`;
      const readinessPath = join(root, `${field}.json`);
      await writeFile(readinessPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      await assert.rejects(loadGate(readinessPath), /does not bind the frozen source/u);
    }
  });

test('readiness cannot override denied manifest governance', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-readiness-governance-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const [receipt, manifest] = await Promise.all([
    readFile(DEFAULT_OASST1_READINESS, 'utf8').then(JSON.parse),
    readFile(DEFAULT_OASST1_SOURCE_MANIFEST, 'utf8').then(JSON.parse),
  ]);
  manifest.registryState = 'tombstoned';
  manifest.components[0].rightsState = 'denied';
  manifest.components[0].allowedUses = ['benchmarking'];
  manifest.components[0].projection.safetyReview = 'blocked';
  const manifestPath = join(root, 'source-manifest.json');
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(manifestPath, manifestBytes, 'utf8');
  const { createHash } = await import('node:crypto');
  receipt.sourceManifestDigest = `sha256:${createHash('sha256').update(manifestBytes).digest('hex')}`;
  const readinessPath = join(root, 'readiness.json');
  await writeFile(readinessPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await assert.rejects(loadLargeSourceReadinessGate({
    readinessPath,
    sourceManifestPath: manifestPath,
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    preflightPath: DEFAULT_OASST1_PREFLIGHT,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expected: OASST1_LARGE_SOURCE,
  }), /not an admitted frozen revision|does not bind the frozen source/u);
});
