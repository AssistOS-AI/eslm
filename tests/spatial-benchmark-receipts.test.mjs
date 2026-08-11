import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SPARP_SOURCE } from '../src/benchmark-adapters/sparp.mjs';
import { STEPGAME_SOURCE } from '../src/benchmark-adapters/stepgame.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function receipt(...parts) {
  return JSON.parse(await readFile(join(ROOT, 'training', 'benchmark-sources', ...parts), 'utf8'));
}

test('StepGame receipt pins the adapter source and reports a complete development denominator', async () => {
  const source = await receipt('stepgame', 'source-manifest.json');
  const result = await receipt('stepgame', 'development-result.json');
  assert.equal(source.officialDataset.revision, STEPGAME_SOURCE.datasetRevision);
  assert.equal(source.officialRepository.revision, STEPGAME_SOURCE.repositoryCommit);
  assert.equal(source.officialDataset.files.reduce((total, file) => total + file.rows, 0), 155_000);
  assert.equal(source.officialDataset.files.reduce((total, file) => total + file.bytes, 0), 75_665_180);
  assert.equal(source.completeRetention.rows, 155_000);
  assert.equal(source.completeRetention.sizeBasedRejections, 0);
  assert.equal(result.tested, result.availableDevelopment);
  assert.equal(result.correct, result.witnessVerified);
  assert.equal(result.solvedCorrect, 4_710);
  assert.equal(result.freshNotTested, 100_000);
  assert.equal(result.executionRoute, 'EslmEngine.executeTask');
  assert.equal(result.languageAgentInvocations, 0);
});

test('SpaRP receipt retains unique blobs, official aliases, and per-regime denominators', async () => {
  const source = await receipt('sparp', 'source-manifest.json');
  const result = await receipt('sparp', 'development-result.json');
  assert.equal(source.officialDataset.revision, SPARP_SOURCE.datasetRevision);
  assert.equal(source.officialRepository.revision, SPARP_SOURCE.repositoryCommit);
  assert.equal(source.contentAddressedArtifacts.length, 24);
  assert.equal(new Set(source.contentAddressedArtifacts.map((item) => item.sha256)).size, 24);
  assert.equal(source.contentAddressedArtifacts.reduce((total, item) => total + item.bytes, 0),
    source.completeRetention.uniqueBytes);
  assert.equal(source.contentAddressedArtifacts.reduce((total, item) => total + item.paths.length, 0),
    source.completeRetention.logicalDatasetPaths);
  assert.equal(source.completeRetention.logicalDatasetPaths, 36);
  assert.equal(source.completeRetention.uniqueRows, 416_678);
  assert.equal(source.completeRetention.sizeBasedRejections, 0);
  assert.equal(result.full.ps2.tested, result.full.ps2.availableDevelopment);
  assert.equal(result.full.ps1.exact, result.full.ps1.tested);
  assert.equal(result.full.ps1.witnessVerified, result.full.ps1.tested);
  assert.equal(result.full.ps3.exact, result.full.ps3.tested);
  assert.equal(result.full.ps4.exact, result.full.ps4.tested);
  assert.equal(result.executionRoute, 'mixed-see-configuration-records');
  assert.equal(result.full.ps1.executionRoute, 'EslmEngine.executeTask');
  assert.equal(result.languageAgentInvocations, 0);
});

test('overlap and Core Guardian receipts prevent independent-sample and hardcoding claims', async () => {
  const overlap = await receipt('sparp', 'overlap-audit.json');
  const proposal = await receipt('sparp', 'core-change-proposal.json');
  for (const split of ['train', 'validation', 'test']) {
    for (const config of ['ps2', 'ps3', 'ps4']) {
      const entry = overlap[split].stepgameVisibleOverlap[config];
      assert.equal(entry.intersection, entry.uniqueVisible);
    }
  }
  assert.equal(overlap.hashing.labelsIncluded, false);
  assert.equal(proposal.renameTestPassed, true);
  assert.equal(proposal.forbiddenDispatchAuditPassed, true);
  assert.deepEqual(proposal.tests, ['unit', 'metamorphic', 'contrastive', 'regression']);
  assert.deepEqual(proposal.renamedDimensions, ['entity', 'predicate', 'value', 'ordering']);
});

test('PS1 cycle binds complete development evidence to the proposed generic descriptor', async () => {
  const cycle = await receipt('sparp', 'ps1-cycle.json');
  const pool = await receipt('sparp', 'ps1-pool-manifest.json');
  const candidate = await receipt('sparp', 'ps1-candidate-result.json');
  const proposal = await receipt('sparp', 'core-change-proposal-ps1.json');
  assert.equal(cycle.freshOrTestEvidence, false);
  assert.equal(pool.development.rows, candidate.availableDevelopment);
  assert.equal(pool.test.solverExecutions, 0);
  assert.equal(candidate.exact, candidate.tested);
  assert.equal(candidate.witnessVerified, candidate.tested);
  assert.equal(proposal.renameTestPassed, true);
  assert.equal(proposal.forbiddenDispatchAuditPassed, true);
  assert.equal(proposal.proposedDescriptor.methodId,
    'method:core:declarative-qualitative-relation-closure');
});
