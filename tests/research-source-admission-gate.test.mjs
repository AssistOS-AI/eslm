import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS,
  loadProcessingGraphPilotAdmission,
} from '../src/research/processing-graph-pilot-runner.mjs';
import {
  assertPlanBoundResearchSourceAdmissionGate,
  assertResearchSourceAdmissionGate,
  loadResearchSourceAdmissionGate,
} from '../src/research/research-source-admission-gate.mjs';
import {
  DEFAULT_OASST1_DISCOVERY_PLAN,
  DEFAULT_OASST1_SOURCE_MANIFEST,
  OASST1_LARGE_SOURCE,
} from '../src/research/processing-graph-scale-runner.mjs';
import { currentProcessingGraphBaseline } from '../src/research/research-implementation-identity.mjs';
import { sha256, stableStringify } from '../src/util.mjs';

async function mutatedJson(context, sourcePath, mutate) {
  const root = await mkdtemp(join(tmpdir(), 'eslm-research-admission-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const value = JSON.parse(await readFile(sourcePath, 'utf8'));
  mutate(value);
  const path = join(root, 'artifact.json');
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

test('small-source admission binds both reviewed manifests before cached rows are opened', async () => {
  const gate = await loadProcessingGraphPilotAdmission();
  assert.equal(assertResearchSourceAdmissionGate(gate), gate);
  assert.equal(gate.registry.sources.length, 2);
  assert.equal(gate.registry.components.length, 2);
  assert.deepEqual(gate.registry.components.map((item) => item.projection.rows), [7_473, 10_161]);
  assert.deepEqual(gate.authority, {
    executionAdmission: 'exact-reviewed-training-projections-only',
    answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
  });
});

test('execution admission is bound to the exact precommitted plan analysis identity', async () => {
  const gate = await loadProcessingGraphPilotAdmission();
  const planBytes = await readFile(DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.plan);
  const plan = JSON.parse(planBytes.toString('utf8'));
  const planArtifactDigest = `sha256:${sha256(planBytes)}`;
  const baselineGraphDigest = currentProcessingGraphBaseline().catalogDigest;
  assert.equal(assertPlanBoundResearchSourceAdmissionGate(gate, {
    plan, planArtifactDigest, baselineGraphDigest,
  }), gate);

  const forged = structuredClone(gate);
  forged.planBinding.analysisIdentity.seed = 'caller-selected-after-observation';
  delete forged.receiptDigest;
  forged.receiptDigest = `sha256:${sha256(stableStringify(forged))}`;
  assert.equal(assertResearchSourceAdmissionGate(forged), forged);
  assert.throws(() => assertPlanBoundResearchSourceAdmissionGate(forged, {
    plan, planArtifactDigest, baselineGraphDigest,
  }), /exact discovery plan/u);
});

test('admission rejects re-signed duplicate and non-canonical real manifest bindings', async () => {
  const gate = await loadProcessingGraphPilotAdmission();
  const reseal = (candidate) => {
    delete candidate.receiptDigest;
    candidate.receiptDigest = `sha256:${sha256(stableStringify(candidate))}`;
    return candidate;
  };
  const duplicate = structuredClone(gate);
  duplicate.manifestBindings[1] = structuredClone(duplicate.manifestBindings[0]);
  assert.throws(() => assertResearchSourceAdmissionGate(reseal(duplicate)),
    /canonical, unique, and one-to-one/u);

  const reordered = structuredClone(gate);
  reordered.manifestBindings.reverse();
  assert.throws(() => assertResearchSourceAdmissionGate(reseal(reordered)),
    /canonical, unique, and one-to-one/u);
});

test('small-source admission rejects manifest governance drift', async (context) => {
  const changedManifest = await mutatedJson(
    context,
    DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests[0],
    (manifest) => {
      manifest.registryState = 'tombstoned';
      manifest.components[0].rightsState = 'denied';
      manifest.components[0].allowedUses = ['benchmarking'];
      manifest.components[0].projection.privacyReview = 'blocked';
    },
  );
  await assert.rejects(loadProcessingGraphPilotAdmission({
    manifests: [changedManifest, DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests[1]],
  }), /not an admitted|fails its rights/u);
});

test('small-source admission rejects a plan that exposes non-training rows', async (context) => {
  const changedPlan = await mutatedJson(
    context,
    DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.plan,
    (plan) => {
      plan.sourceScopes[0].splits.push({
        name: 'test', visibility: 'protected', rowsDeclared: 1, rowsAdmitted: 1,
      });
    },
  );
  await assert.rejects(loadProcessingGraphPilotAdmission({ plan: changedPlan }),
    /outside its reviewed training visibility/u);
});

test('OASST source admission preserves validation visibility without admitting validation rows', async () => {
  const gate = await loadResearchSourceAdmissionGate({
    manifestPaths: [DEFAULT_OASST1_SOURCE_MANIFEST],
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expectedSources: [OASST1_LARGE_SOURCE],
  });
  assert.deepEqual(gate.registry.components[0].visibility, [
    {
      split: 'training', visibility: 'training-visible',
      rowsDeclared: 9_846, rowsAdmitted: 2_220,
    },
    {
      split: 'validation', visibility: 'development-visible',
      rowsDeclared: 518, rowsAdmitted: 0,
    },
  ]);
  assert.equal(gate.registry.components[0].projection.rows, 2_220);
});

test('OASST admission rejects a manifest-reasserted supporting split authority', async (context) => {
  const changedManifest = await mutatedJson(
    context,
    DEFAULT_OASST1_SOURCE_MANIFEST,
    (manifest) => {
      const validation = manifest.deliveredFiles.find((file) =>
        file.fileId === 'oasst1-validation-split');
      validation.sha256 = `sha256:${'0'.repeat(64)}`;
      validation.bytes += 1;
    },
  );
  await assert.rejects(loadResearchSourceAdmissionGate({
    manifestPaths: [changedManifest],
    discoveryPlanPath: DEFAULT_OASST1_DISCOVERY_PLAN,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expectedSources: [OASST1_LARGE_SOURCE],
  }), /supporting-file identity is stale/u);
});
