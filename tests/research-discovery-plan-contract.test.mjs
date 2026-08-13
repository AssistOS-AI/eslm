import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  RESEARCH_DISCOVERY_PLAN_PROTOCOL,
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from '../src/research/research-discovery-plan-contract.mjs';

const paths = [
  'training/research-sources/helpsteer2-gsm8k-pilot/discovery-plan.json',
  'training/research-sources/oasst1-fdf72ae0/discovery-plan.json',
  'training/research-sources/helpsteer2-gsm8k-oasst1-scale/discovery-plan.json',
];

async function plan(path = paths[0]) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('discovery plans freeze pre-analysis scope, techniques, budgets, and authority', async () => {
  for (const path of paths) {
    const value = await plan(path);
    assert.equal(assertResearchDiscoveryPlan(value), value);
    assert.equal(value.format, RESEARCH_DISCOVERY_PLAN_PROTOCOL);
    assert.match(researchDiscoveryPlanDigest(value), /^sha256:[0-9a-f]{64}$/u);
    assert.equal(value.authority.promotion, 'none');
  }
});

test('discovery plans reject protected exposure and source or technique drift', async () => {
  const protectedExposure = await plan(paths[1]);
  protectedExposure.sourceScopes[0].splits[1].rowsAdmitted = 1;
  assert.throws(() => assertResearchDiscoveryPlan(protectedExposure), /outside its reviewed training visibility/iu);

  const missingTechnique = await plan();
  missingTechnique.strategyIdentities.pop();
  assert.throws(() => assertResearchDiscoveryPlan(missingTechnique), /techniques or row budget/iu);

  const projectionDrift = await plan();
  projectionDrift.sourceScopes[0].projectionDigest = `sha256:${'f'.repeat(64)}`;
  assert.throws(() => assertResearchDiscoveryPlan(projectionDrift), /scope identities do not reconcile/iu);
});

test('discovery plans require a non-empty admitted frontier', async () => {
  const empty = await plan();
  for (const scope of empty.sourceScopes) {
    for (const split of scope.splits) split.rowsAdmitted = 0;
  }
  assert.throws(() => assertResearchDiscoveryPlan(empty), /row budget/iu);
});
