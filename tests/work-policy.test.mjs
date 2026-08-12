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
    assert.equal(policy.effective.strategies.preset, 'all');
    assert.deepEqual(policy.effective.strategies.selected, {});
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

test('work policy carries a canonical strategy preset and exact static allowlists', () => {
  const policy = resolveWorkPolicy({
    profile: 'balanced',
    strategies: {
      preset: 'retrieval',
      selected: {
        'runtime.evidence.assess': [
          'strategy:retrieval:typed-answer-bridge@1',
          'strategy:retrieval:active-kb-frequency@1',
        ],
      },
    },
  });
  assert.equal(policy.effective.strategies.preset, 'retrieval');
  assert.deepEqual(policy.effective.strategies.selected['runtime.evidence.assess'], [
    'strategy:retrieval:active-kb-frequency@1',
    'strategy:retrieval:typed-answer-bridge@1',
  ]);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: { 'runtime.reason.execute': ['../custom.mjs'] } },
  }), /invalid identity/u);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: { 'runtime.evidence.assess': ['strategy:attacker:made-up@1'] } },
  }), /unknown or wrong-stage identity/u);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: {
      'runtime.reason.execute': ['strategy:language:determiner-agreement@1'],
    } },
  }), /unknown or wrong-stage identity/u);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: {
      'runtime.result.verify': ['strategy:verification:declared-witness-contract@1'],
    } },
  }), /not exact-selection-enabled|cannot execute planned identity/u);
  for (const [stage, identity] of [
    ['runtime.knowledge.retrieve', 'strategy:retrieval:bounded-provider-frontier@1'],
    ['runtime.method.plan', 'strategy:method:capability-planner@1'],
    ['runtime.failure.ground', 'strategy:grounding:bounded-related-evidence@1'],
  ]) assert.throws(() => resolveWorkPolicy({
    strategies: { selected: { [stage]: [identity] } },
  }), /not exact-selection-enabled/u);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: { 'runtime.failure.ground': [] } },
  }), /non-empty bounded identity array/u);
  assert.throws(() => resolveWorkPolicy({
    strategies: { selected: {
      'runtime.reason.execute': ['strategy:core:finite-entailment@1'],
    } },
  }), /cannot execute planned identity/u);
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
