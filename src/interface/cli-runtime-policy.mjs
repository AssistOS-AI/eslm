import { resolveWorkPolicy } from '../runtime/work-policy.mjs';
import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import {
  STRATEGY_EXACT_SELECTION_STAGES, strategyIdentity,
} from '../strategy/strategy-contract.mjs';

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
    strategies: {
      preset: options['strategy-preset'] ?? 'all',
      selected: parseStrategySelection(options['strategy-select']),
    },
  });
}

export function parseStrategySelection(value) {
  if (value === undefined || value === null || value === '') return {};
  const descriptors = builtinStrategyDescriptors();
  const available = new Map(descriptors.map((descriptor) => [strategyIdentity(descriptor), descriptor]));
  const selected = {};
  const assignments = String(value).split(';').map((item) => item.trim()).filter(Boolean);
  if (assignments.length === 0 || assignments.length > 16) {
    throw new Error('--strategy-select requires one to sixteen STAGE=ID[,ID] assignments.');
  }
  for (const assignment of assignments) {
    const separator = assignment.indexOf('=');
    if (separator < 1) throw new Error(`Invalid strategy assignment: ${assignment}.`);
    const stage = assignment.slice(0, separator).trim();
    const identities = assignment.slice(separator + 1).split(',').map((item) => item.trim()).filter(Boolean);
    if (Object.hasOwn(selected, stage) || identities.length === 0) {
      throw new Error(`Strategy stage ${stage} must occur once with at least one exact identity.`);
    }
    if (!STRATEGY_EXACT_SELECTION_STAGES.includes(stage)) {
      throw new Error(`Strategy stage ${stage} is catalogued but not exact-selection-enabled in v1.`);
    }
    for (const identity of identities) {
      const descriptor = available.get(identity);
      if (!descriptor || descriptor.stage !== stage) {
        throw new Error(`Unknown ${stage} strategy identity: ${identity}.`);
      }
      if (descriptor.implementationState === 'planned') {
        throw new Error(`Strategy ${identity} is planned and cannot be selected for execution.`);
      }
    }
    selected[stage] = identities;
  }
  return selected;
}

export function withWorkProfile(options, profile, strategyPreset) {
  return {
    ...options,
    ...(profile === undefined ? {} : { 'work-profile': profile }),
    ...(strategyPreset === undefined ? {} : { 'strategy-preset': strategyPreset }),
  };
}

export function withStrategySelection(options, selection) {
  return { ...options, ...(selection ? { 'strategy-select': selection } : { 'strategy-select': undefined }) };
}
