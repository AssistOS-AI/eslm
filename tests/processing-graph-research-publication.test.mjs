import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp, readFile, rename, rm, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertProcessingGraphPublicationSnapshot,
  publishProcessingGraphResearchSnapshot,
} from '../src/research/processing-graph-research-publication.mjs';
import { publishProcessingGraphPilot } from
  '../src/research/processing-graph-pilot-runner.mjs';
import {
  PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL,
  assertProcessingGraphResearchPublicReceipt,
} from '../src/research/processing-graph-research-public-receipt.mjs';
import { researchDiscoveryPlanDigest } from
  '../src/research/research-discovery-plan-contract.mjs';
import { RESEARCH_SOURCE_ADMISSION_GATE_PROTOCOL } from
  '../src/research/research-source-admission-gate.mjs';
import { sha256, stableStringify } from '../src/util.mjs';
import { createSyntheticDiscoveryCycleFixture } from
  './fixtures/research-discovery-cycle-fixture.mjs';

function targets(root) {
  return {
    manifestPath: join(root, 'publication.json'),
    artifacts: ['analysis', 'cycle', 'plan'].map((role) => ({
      role, path: join(root, `${role}.json`),
      bytes: Buffer.from(`${JSON.stringify({ role, generation: 'new' })}\n`),
    })),
  };
}

async function seedPriorSnapshot(root) {
  const { artifacts, manifestPath } = targets(root);
  const prior = new Map();
  for (const { path, role } of artifacts) {
    const bytes = Buffer.from(`${role}-prior\n`);
    prior.set(path, bytes);
    await writeFile(path, bytes);
  }
  const manifestBytes = Buffer.from('manifest-prior\n');
  prior.set(manifestPath, manifestBytes);
  await writeFile(manifestPath, manifestBytes);
  return prior;
}

async function assertPriorSnapshot(prior) {
  for (const [path, bytes] of prior) {
    assert.deepEqual(await readFile(path), bytes);
  }
}

function admissionGate(registry, plan, planBytes) {
  const sourceRegistry = {
    format: registry.format,
    sources: structuredClone(registry.sources),
    components: structuredClone(registry.components),
    digest: registry.digest,
  };
  const gate = {
    format: RESEARCH_SOURCE_ADMISSION_GATE_PROTOCOL,
    registry: sourceRegistry,
    manifestBindings: sourceRegistry.components.map((component, index) => ({
      sourceRevision: `${component.sourceId}@${component.revision}`,
      componentId: component.componentId,
      manifestDigest: `sha256:${String(index + 1).repeat(64)}`,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      projectedRows: component.projection.rows,
      shardCount: component.projection.shardCount,
    })),
    planBinding: {
      planId: plan.planId,
      cycleId: plan.cycleId,
      planArtifactDigest: `sha256:${sha256(planBytes)}`,
      planContentDigest: researchDiscoveryPlanDigest(plan),
      baselineGraphDigest: plan.baselineGraphDigest,
      analysisIdentity: structuredClone(plan.analysisIdentity),
    },
    workPolicy: structuredClone(plan.workPolicy),
    decision: 'admit',
    authority: {
      executionAdmission: 'exact-reviewed-training-projections-only',
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
    },
  };
  gate.receiptDigest = `sha256:${sha256(stableStringify(gate))}`;
  return gate;
}

function pilotPublicationPaths(root) {
  return {
    analysisPath: join(root, 'pilot.json'),
    planPath: join(root, 'pilot-plan.json'),
    cyclePath: join(root, 'pilot-cycle.json'),
    publicationPath: join(root, 'pilot-publication.json'),
    discoveryPlanPath: join(root, 'source-plan.json'),
    discoveryCyclePath: join(root, 'source-cycle.json'),
  };
}

test('atomic research publication commits one exact byte-bound snapshot', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'eslm-publication-success-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const options = targets(root);
  const result = await publishProcessingGraphResearchSnapshot({
    snapshotId: 'test-publication', ...options,
  });
  const manifest = JSON.parse(await readFile(options.manifestPath, 'utf8'));
  assertProcessingGraphPublicationSnapshot(manifest, {
    snapshotId: 'test-publication', artifacts: options.artifacts,
  });
  assert.equal(result.receiptDigest, manifest.receiptDigest);
});

test('pilot publication validates the full chain before staging only its compact public receipt',
  async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'eslm-publication-compact-pilot-'));
    context.after(() => rm(root, { recursive: true, force: true }));
    const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
    const paths = pilotPublicationPaths(root);
    const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
    const cycleBytes = Buffer.from(`${JSON.stringify(cycle, null, 2)}\n`);
    await Promise.all([
      writeFile(paths.discoveryPlanPath, planBytes),
      writeFile(paths.discoveryCyclePath, cycleBytes),
    ]);
    const result = {
      analysis,
      sourceAdmissionGate: admissionGate(analysis.registry, plan, planBytes),
      status: { analysisReceiptDigest: analysis.receiptDigest },
    };
    await publishProcessingGraphPilot(result, paths);
    const publicBytes = await readFile(paths.analysisPath);
    const receipt = assertProcessingGraphResearchPublicReceipt(
      JSON.parse(publicBytes.toString('utf8')), { artifactBytes: publicBytes },
    );
    assert.equal(receipt.format, PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL);
    assert.equal(receipt.fullAnalysis.receiptDigest, analysis.receiptDigest);
    for (const field of [
      'inputMembership', 'evidenceLedger', 'featureLedger', 'metamorphicAuditLedger',
      'proposalLedger',
    ]) assert.equal(Object.hasOwn(receipt, field), false);
    const snapshot = JSON.parse(await readFile(paths.publicationPath, 'utf8'));
    assert.deepEqual(snapshot.artifacts.map(({ role }) => role), [
      'pilot-cycle', 'pilot-plan', 'pilot-public-receipt',
    ]);

    const forged = structuredClone(result);
    forged.analysis.analysis.seed = 'forged-before-publication';
    let writes = 0;
    await assert.rejects(publishProcessingGraphPilot(forged, {
      ...paths,
      analysisPath: join(root, 'forged-pilot.json'),
      planPath: join(root, 'forged-plan.json'),
      cyclePath: join(root, 'forged-cycle.json'),
      publicationPath: join(root, 'forged-publication.json'),
      operations: {
        writeFile: async (...arguments_) => {
          writes += 1;
          return writeFile(...arguments_);
        },
      },
    }));
    assert.equal(writes, 0);
  });

for (const failureKind of ['write', 'rename']) {
  test(`a third ${failureKind} failure leaves the prior research snapshot untouched`,
    async (context) => {
      const root = await mkdtemp(join(tmpdir(), `eslm-publication-${failureKind}-`));
      context.after(() => rm(root, { recursive: true, force: true }));
      const prior = await seedPriorSnapshot(root);
      const options = targets(root);
      let calls = 0;
      let injected = false;
      const operation = async (...args) => {
        calls += 1;
        if (!injected && calls === 3) {
          injected = true;
          const error = new Error(`injected third ${failureKind} failure`);
          error.code = 'EIO';
          throw error;
        }
        return failureKind === 'write' ? writeFile(...args) : rename(...args);
      };
      await assert.rejects(publishProcessingGraphResearchSnapshot({
        snapshotId: 'test-publication', ...options,
        operations: { [failureKind === 'write' ? 'writeFile' : 'rename']: operation },
      }), new RegExp(`injected third ${failureKind} failure`, 'u'));
      await assertPriorSnapshot(prior);
    });
}

test('a third staged install rename rolls back every partially installed artifact',
  async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'eslm-publication-install-rename-'));
    context.after(() => rm(root, { recursive: true, force: true }));
    const prior = await seedPriorSnapshot(root);
    const options = targets(root);
    let calls = 0;
    let injected = false;
    const operation = async (...args) => {
      calls += 1;
      if (!injected && calls === prior.size + 3) {
        injected = true;
        const error = new Error('injected third staged install rename failure');
        error.code = 'EIO';
        throw error;
      }
      return rename(...args);
    };
    await assert.rejects(publishProcessingGraphResearchSnapshot({
      snapshotId: 'test-publication', ...options,
      operations: { rename: operation },
    }), /injected third staged install rename failure/u);
    await assertPriorSnapshot(prior);
  });
