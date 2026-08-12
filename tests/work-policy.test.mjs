import test from 'node:test';
import assert from 'node:assert/strict';
import { EslmEngine } from '../src/runtime/engine.mjs';
import { createCoreModel } from '../src/runtime/core-model.mjs';
import { assertRuntimeResultContract } from '../src/runtime/result-contract.mjs';
import {
  assertWorkPolicy, resolveWorkPolicy, WORK_PROFILE_NAMES,
} from '../src/runtime/work-policy.mjs';

test('work profiles expose complete exact limits and remain explicitly bounded', () => {
  const policies = WORK_PROFILE_NAMES.map((profile) => resolveWorkPolicy(profile));
  for (const policy of policies) {
    assert.equal(assertWorkPolicy(policy), policy);
    assert.equal(policy.requested.profile, policy.effective.profile);
    assert.equal(policy.bounded, true);
    assert.equal(policy.hardTimeLimit, false);
    assert.ok(policy.effective.limits.maximumHeuristicReceiptBytes >= 4_096);
    assert.ok(policy.effective.limits.maximumGroundingOutputBytes >= 4_096);
    assert.ok(policy.effective.limits.maximumHeuristicReparses
      <= policy.effective.limits.maximumHeuristicCandidates);
  }
  assert.deepEqual(policies.map((policy) => policy.effective.limits.minimumHeuristicConfidence),
    [0.68, 0.68, 0.68, 0.68]);
  for (let index = 1; index < policies.length; index += 1) {
    assert.ok(policies[index].effective.limits.maximumHornJoinAttempts
      > policies[index - 1].effective.limits.maximumHornJoinAttempts);
    assert.ok(policies[index].effective.limits.maximumGroundingLookups
      > policies[index - 1].effective.limits.maximumGroundingLookups);
    assert.ok(policies[index].effective.limits.maximumHeuristicReceiptBytes
      > policies[index - 1].effective.limits.maximumHeuristicReceiptBytes);
  }
});

test('work-policy overrides are exact, validated, and internally coherent', () => {
  const policy = resolveWorkPolicy({
    profile: 'quick',
    overrides: {
      maximumHeuristicCandidates: 11,
      maximumHeuristicReparses: 7,
      maximumGroundingEntries: 5,
      maximumGroundingCandidateEntries: 17,
      maximumHornRounds: 6,
    },
  });
  assert.deepEqual(policy.requested.overrides, {
    maximumGroundingCandidateEntries: 17,
    maximumGroundingEntries: 5,
    maximumHeuristicCandidates: 11,
    maximumHeuristicReparses: 7,
    maximumHornRounds: 6,
  });
  assert.equal(policy.effective.limits.maximumHornRounds, 6);
  assert.throws(() => resolveWorkPolicy({
    profile: 'quick', overrides: { maximumHeuristicReparses: 9 },
  }), /cannot exceed maximumHeuristicCandidates/u);
  assert.throws(() => resolveWorkPolicy({
    profile: 'unbounded',
  }), /Work profile must be one of/u);
});

test('engine construction applies the selected Horn work bound and records it in results', async () => {
  const model = await createCoreModel();
  model.entities = [{ id: 'nera', names: ['Nera'] }];
  model.facts = [{
    id: 'fact:step:0', subject: 'nera', predicate: 'step_0', value: 'yes',
    provenance: ['fixture:step:0'],
  }];
  model.rules = Array.from({ length: 7 }, (_, index) => ({
    id: `rule:step:${index + 1}`,
    when: [['?subject', `step_${index}`, 'yes']],
    then: ['?subject', `step_${index + 1}`, 'yes'],
    source: `fixture:rule:${index + 1}`,
  }));
  const quick = new EslmEngine(structuredClone(model), {
    workPolicy: resolveWorkPolicy('quick'),
  });
  const deep = new EslmEngine(structuredClone(model), {
    workPolicy: resolveWorkPolicy('deep'),
  });
  assert.equal(quick.closure.complete, false);
  assert.equal(quick.closure.rounds, 4);
  assert.equal(deep.closure.complete, true);
  assert.equal(deep.closure.rounds, 7);

  const result = new EslmEngine(await createCoreModel(), {
    workPolicy: resolveWorkPolicy({
      profile: 'quick', overrides: { maximumHornRounds: 6 },
    }),
  }).ask('Are you ready?');
  assert.equal(result.workPolicy.requested.profile, 'quick');
  assert.equal(result.workPolicy.effective.limits.maximumHornRounds, 6);
  const altered = structuredClone(result);
  altered.workPolicy.effective.limits.maximumHornRounds = 7;
  assert.throws(() => assertRuntimeResultContract(altered), /do not match/u);
});
