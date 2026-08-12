import test from 'node:test';
import assert from 'node:assert/strict';
import {
  languageAgentNormalizationEnabled, parseStrategySelection,
  withLanguageAgentNormalization, workPolicyFromCliOptions,
} from '../src/interface/cli-runtime-policy.mjs';

test('CLI assistance is opt-in and retains an explicit offline override', () => {
  assert.equal(languageAgentNormalizationEnabled({}), false);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': true }), true);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': false }), false);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': 'false' }), false);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': 'true' }), true);
  assert.equal(languageAgentNormalizationEnabled({ 'no-external-language-agent': true }), false);
});

test('CLI work-profile options resolve exact bounded overrides', () => {
  const policy = workPolicyFromCliOptions({
    'work-profile': 'deep',
    'grounding-max-lookups': '211',
    'horn-max-rounds': '13',
    'heuristic-min-confidence': '0.61',
    'heuristic-max-receipt-bytes': '700000',
  });
  assert.equal(policy.requested.profile, 'deep');
  assert.deepEqual(policy.requested.overrides, {
    maximumGroundingLookups: 211,
    maximumHeuristicReceiptBytes: 700000,
    maximumHornRounds: 13,
    minimumHeuristicConfidence: 0.61,
  });
  assert.equal(policy.effective.limits.maximumGroundingLookups, 211);
  assert.equal(policy.effective.limits.maximumHornRounds, 13);
  assert.equal(policy.effective.limits.minimumHeuristicConfidence, 0.61);
  assert.equal(policy.effective.limits.maximumHeuristicReceiptBytes, 700000);
  assert.equal(policy.bounded, true);
  assert.equal(policy.hardTimeLimit, false);
});

test('CLI strategy selection accepts only exact trusted executable identities', () => {
  const selected = parseStrategySelection(
    'runtime.evidence.assess=strategy:retrieval:active-kb-frequency@1,'
      + 'strategy:retrieval:typed-answer-bridge@1',
  );
  assert.deepEqual(selected, {
    'runtime.evidence.assess': [
      'strategy:retrieval:active-kb-frequency@1',
      'strategy:retrieval:typed-answer-bridge@1',
    ],
  });
  assert.throws(() => parseStrategySelection(
    'compiler.knowledge.extract=strategy:knowledge:manual-document@1',
  ), /not exact-selection-enabled|planned and cannot be selected/u);
  assert.throws(() => parseStrategySelection(
    'runtime.method.plan=strategy:method:capability-planner@1',
  ), /not exact-selection-enabled/u);
  assert.throws(() => parseStrategySelection(
    'runtime.reason.execute=strategy:core:finite-entailment@1',
  ), /planned and cannot be selected/u);
  assert.throws(() => parseStrategySelection(
    'runtime.evidence.assess=../research-plugin.mjs',
  ), /Unknown .* strategy identity/u);
});

test('interactive normalization toggles replace the preceding policy', () => {
  const disabled = withLanguageAgentNormalization({}, false);
  assert.equal(languageAgentNormalizationEnabled(disabled), false);
  const enabled = withLanguageAgentNormalization(disabled, true);
  assert.equal(languageAgentNormalizationEnabled(enabled), true);
  assert.equal(enabled['no-external-language-agent'], false);
});
