import { resolveWorkPolicy } from '../runtime/work-policy.mjs';

function enabledFlag(value) {
  return value === true || ['1', 'true', 'yes'].includes(String(value).toLocaleLowerCase('en-US'));
}

export function languageAgentNormalizationEnabled(options = {}) {
  if (enabledFlag(options['no-external-language-agent'])) return false;
  if (Object.hasOwn(options, 'external-language-agent')) {
    return enabledFlag(options['external-language-agent']);
  }
  return false;
}

export function withLanguageAgentNormalization(options, enabled) {
  return {
    ...options,
    'external-language-agent': Boolean(enabled),
    'no-external-language-agent': !enabled,
  };
}

const WORK_OVERRIDE_OPTIONS = Object.freeze({
  'heuristic-max-candidates': 'maximumHeuristicCandidates',
  'heuristic-max-reparses': 'maximumHeuristicReparses',
  'heuristic-max-segments': 'maximumHeuristicSegments',
  'heuristic-max-tokens': 'maximumHeuristicTokens',
  'heuristic-max-receipt-bytes': 'maximumHeuristicReceiptBytes',
  'heuristic-min-confidence': 'minimumHeuristicConfidence',
  'horn-max-rounds': 'maximumHornRounds',
  'horn-max-facts': 'maximumHornFacts',
  'horn-max-joins': 'maximumHornJoinAttempts',
  'provider-max-sources': 'maximumProviderSources',
  'provider-max-paraphrases': 'maximumProviderParaphrases',
  'grounding-max-entries': 'maximumGroundingEntries',
  'grounding-max-terms': 'maximumGroundingTerms',
  'grounding-max-lookups': 'maximumGroundingLookups',
  'grounding-max-values': 'maximumGroundingValuesPerLookup',
  'grounding-max-sources': 'maximumGroundingSources',
  'grounding-max-candidates': 'maximumGroundingCandidateEntries',
  'grounding-max-bytes': 'maximumGroundingOutputBytes',
});

export function workPolicyFromCliOptions(options = {}) {
  const overrides = {};
  for (const [option, limit] of Object.entries(WORK_OVERRIDE_OPTIONS)) {
    if (options[option] !== undefined) overrides[limit] = options[option];
  }
  return resolveWorkPolicy({
    profile: options['work-profile'] ?? options.work ?? 'balanced',
    overrides,
  });
}

export function withWorkProfile(options, profile) {
  return { ...options, 'work-profile': profile };
}
