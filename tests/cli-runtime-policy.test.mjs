import test from 'node:test';
import assert from 'node:assert/strict';
import {
  languageAgentNormalizationEnabled, withLanguageAgentNormalization,
} from '../src/interface/cli-runtime-policy.mjs';

test('CLI assistance is enabled by default and has an explicit offline override', () => {
  assert.equal(languageAgentNormalizationEnabled({}), true);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': true }), true);
  assert.equal(languageAgentNormalizationEnabled({ 'external-language-agent': false }), false);
  assert.equal(languageAgentNormalizationEnabled({ 'no-external-language-agent': true }), false);
});

test('interactive normalization toggles replace the preceding policy', () => {
  const disabled = withLanguageAgentNormalization({}, false);
  assert.equal(languageAgentNormalizationEnabled(disabled), false);
  const enabled = withLanguageAgentNormalization(disabled, true);
  assert.equal(languageAgentNormalizationEnabled(enabled), true);
  assert.equal(enabled['no-external-language-agent'], false);
});
