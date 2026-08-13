import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  RESEARCH_SOURCE_MANIFEST_PROTOCOL,
  assertResearchSourceManifest,
} from '../src/research/research-source-manifest-contract.mjs';

const paths = [
  'training/research-sources/helpsteer2-990b2711/source-manifest.json',
  'training/research-sources/gsm8k-3101c7d5/source-manifest.json',
  'training/research-sources/oasst1-fdf72ae0/source-manifest.json',
];

async function manifest(path = paths[0]) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('research source manifests bind DS016 acquisition, files, rights, and extraction', async () => {
  for (const path of paths) {
    const value = await manifest(path);
    assert.equal(assertResearchSourceManifest(value), value);
    assert.equal(value.format, RESEARCH_SOURCE_MANIFEST_PROTOCOL);
    assert.equal(value.rightsReview.reviewedRevision, value.revision);
    assert.equal(value.extractionInventory.retainedRawSource, true);
  }
});

test('research source manifest is closed and rejects unbound rights assertions', async () => {
  const extra = await manifest();
  extra.hiddenApproval = true;
  assert.throws(() => assertResearchSourceManifest(extra), /contain exactly/iu);

  const drifted = await manifest();
  drifted.rightsReview.reviewedRevision = 'different-revision';
  assert.throws(() => assertResearchSourceManifest(drifted), /exact revision/iu);

  const absentEvidence = await manifest();
  absentEvidence.rightsReview.evidenceFileIds = ['missing-file'];
  assert.throws(() => assertResearchSourceManifest(absentEvidence), /absent delivered file/iu);

  const duplicateFile = await manifest();
  duplicateFile.deliveredFiles.push({
    ...structuredClone(duplicateFile.deliveredFiles[0]),
    path: 'helpsteer2-990b2711/duplicate.jsonl.gz',
  });
  assert.throws(() => assertResearchSourceManifest(duplicateFile), /file IDs must be unique/iu);

  const unrelatedSourceIdentity = await manifest();
  unrelatedSourceIdentity.identity.sha256 = `sha256:${'f'.repeat(64)}`;
  assert.throws(() => assertResearchSourceManifest(unrelatedSourceIdentity), /named delivered-file identity/iu);

  const unrelatedComponentIdentity = await manifest();
  unrelatedComponentIdentity.components[0].identity.bytes -= 1;
  assert.throws(() => assertResearchSourceManifest(unrelatedComponentIdentity), /named delivered-file identity/iu);

  const absentSupportingFile = await manifest();
  absentSupportingFile.components[0].supportingFileIds = ['missing-split-authority'];
  assert.throws(() => assertResearchSourceManifest(absentSupportingFile), /supportingFileIds cites an absent/iu);
});

test('research source manifest rejects split ambiguity and overbroad approval', async () => {
  const duplicateSplit = await manifest('training/research-sources/oasst1-fdf72ae0/source-manifest.json');
  duplicateSplit.components[0].splits.push(structuredClone(duplicateSplit.components[0].splits[0]));
  duplicateSplit.components[0].identity.rows += duplicateSplit.components[0].splits[0].rows;
  assert.throws(() => assertResearchSourceManifest(duplicateSplit), /split names must be unique/iu);

  const noAllowedUse = await manifest();
  noAllowedUse.components[0].allowedUses = ['benchmarking'];
  assert.throws(() => assertResearchSourceManifest(noAllowedUse), /omits processing-graph-discovery/iu);
});
