const PROFILE_NAMES = Object.freeze([
  'quick',
  'balanced',
  'deep',
  'exhaustive-bounded',
]);

const STRATEGY_SELECTION_PRESETS = Object.freeze({
  all: Object.freeze({}),
  language: Object.freeze({
    includeStages: Object.freeze(['runtime.language.interpret', 'runtime.request.plan']),
  }),
  retrieval: Object.freeze({
    includeStages: Object.freeze([
      'runtime.context.construct', 'runtime.knowledge.focus', 'runtime.knowledge.retrieve',
      'runtime.evidence.assess',
      'runtime.failure.ground',
    ]),
  }),
  reasoning: Object.freeze({
    includeStages: Object.freeze([
      'runtime.method.plan', 'runtime.reason.execute', 'runtime.result.verify',
    ]),
  }),
  construction: Object.freeze({
    includeStages: Object.freeze(['runtime.result.construct']),
  }),
});

const MANDATORY_STRATEGY_IDENTITIES = Object.freeze({
  'runtime.language.interpret': 'strategy:language:direct-controlled-parser@1',
  'runtime.context.construct': 'strategy:context:question-facet-expansion@1',
  'runtime.knowledge.focus': 'strategy:focus:function-word-exclusion@1',
});

const BUILTIN_STRATEGIES_BY_IDENTITY = new Map(builtinStrategyDescriptors().map((descriptor) => [
  strategyIdentity(descriptor), descriptor,
]));

const LIMIT_RULES = Object.freeze({
  maximumHeuristicCandidates: { minimum: 1, maximum: 256, integer: true },
  maximumHeuristicReparses: { minimum: 1, maximum: 128, integer: true },
  maximumHeuristicSegments: { minimum: 1, maximum: 128, integer: true },
  maximumHeuristicTokens: { minimum: 1, maximum: 8_192, integer: true },
  maximumHeuristicReceiptBytes: { minimum: 4_096, maximum: 1_048_576, integer: true },
  minimumHeuristicConfidence: { minimum: 0, maximum: 1, integer: false },
  maximumHornRounds: { minimum: 1, maximum: 256, integer: true },
  maximumHornFacts: { minimum: 1, maximum: 2_000_000, integer: true },
  maximumHornJoinAttempts: { minimum: 1, maximum: 20_000_000, integer: true },
  maximumProviderSources: { minimum: 1, maximum: 64, integer: true },
  maximumProviderParaphrases: { minimum: 1, maximum: 16, integer: true },
  maximumGroundingEntries: { minimum: 1, maximum: 32, integer: true },
  maximumGroundingTerms: { minimum: 1, maximum: 32, integer: true },
  maximumGroundingLookups: { minimum: 1, maximum: 512, integer: true },
  maximumGroundingValuesPerLookup: { minimum: 1, maximum: 32, integer: true },
  maximumGroundingSources: { minimum: 2, maximum: 64, integer: true },
  maximumGroundingCandidateEntries: { minimum: 1, maximum: 512, integer: true },
  maximumGroundingOutputBytes: { minimum: 4_096, maximum: 1_048_576, integer: true },
});

const PROFILE_LIMITS = Object.freeze({
  quick: Object.freeze({
    maximumHeuristicCandidates: 8,
    maximumHeuristicReparses: 4,
    maximumHeuristicSegments: 16,
    maximumHeuristicTokens: 256,
    maximumHeuristicReceiptBytes: 131_072,
    minimumHeuristicConfidence: 0.68,
    maximumHornRounds: 4,
    maximumHornFacts: 25_000,
    maximumHornJoinAttempts: 50_000,
    maximumProviderSources: 8,
    maximumProviderParaphrases: 2,
    maximumGroundingEntries: 4,
    maximumGroundingTerms: 6,
    maximumGroundingLookups: 24,
    maximumGroundingValuesPerLookup: 2,
    maximumGroundingSources: 8,
    maximumGroundingCandidateEntries: 64,
    maximumGroundingOutputBytes: 16_384,
  }),
  balanced: Object.freeze({
    maximumHeuristicCandidates: 24,
    maximumHeuristicReparses: 12,
    maximumHeuristicSegments: 48,
    maximumHeuristicTokens: 768,
    maximumHeuristicReceiptBytes: 524_288,
    minimumHeuristicConfidence: 0.68,
    maximumHornRounds: 8,
    maximumHornFacts: 100_000,
    maximumHornJoinAttempts: 250_000,
    maximumProviderSources: 32,
    maximumProviderParaphrases: 4,
    maximumGroundingEntries: 8,
    maximumGroundingTerms: 12,
    maximumGroundingLookups: 96,
    maximumGroundingValuesPerLookup: 4,
    maximumGroundingSources: 16,
    maximumGroundingCandidateEntries: 256,
    maximumGroundingOutputBytes: 65_536,
  }),
  deep: Object.freeze({
    maximumHeuristicCandidates: 64,
    maximumHeuristicReparses: 32,
    maximumHeuristicSegments: 96,
    maximumHeuristicTokens: 2_048,
    maximumHeuristicReceiptBytes: 786_432,
    minimumHeuristicConfidence: 0.68,
    maximumHornRounds: 16,
    maximumHornFacts: 250_000,
    maximumHornJoinAttempts: 1_000_000,
    maximumProviderSources: 48,
    maximumProviderParaphrases: 8,
    maximumGroundingEntries: 16,
    maximumGroundingTerms: 24,
    maximumGroundingLookups: 256,
    maximumGroundingValuesPerLookup: 8,
    maximumGroundingSources: 32,
    maximumGroundingCandidateEntries: 512,
    maximumGroundingOutputBytes: 131_072,
  }),
  'exhaustive-bounded': Object.freeze({
    maximumHeuristicCandidates: 128,
    maximumHeuristicReparses: 64,
    maximumHeuristicSegments: 128,
    maximumHeuristicTokens: 4_096,
    maximumHeuristicReceiptBytes: 1_048_576,
    minimumHeuristicConfidence: 0.68,
    maximumHornRounds: 32,
    maximumHornFacts: 500_000,
    maximumHornJoinAttempts: 4_000_000,
    maximumProviderSources: 64,
    maximumProviderParaphrases: 16,
    maximumGroundingEntries: 32,
    maximumGroundingTerms: 32,
    maximumGroundingLookups: 512,
    maximumGroundingValuesPerLookup: 32,
    maximumGroundingSources: 64,
    maximumGroundingCandidateEntries: 512,
    maximumGroundingOutputBytes: 262_144,
  }),
});

function assertProfileName(value) {
  if (!PROFILE_NAMES.includes(value)) {
    throw new Error(`Work profile must be one of: ${PROFILE_NAMES.join(', ')}.`);
  }
  return value;
}

function validateLimit(name, value) {
  const rule = LIMIT_RULES[name];
  if (!rule) throw new Error(`Unknown work-policy limit: ${name}.`);
  if (!Number.isFinite(value) || (rule.integer && !Number.isSafeInteger(value))
    || value < rule.minimum || value > rule.maximum) {
    const kind = rule.integer ? 'an integer' : 'a number';
    throw new Error(`${name} must be ${kind} from ${rule.minimum} to ${rule.maximum}.`);
  }
  return value;
}

function canonicalOverrides(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new Error('Work-policy overrides must be an object.');
  }
  const result = {};
  for (const name of Object.keys(overrides).toSorted()) {
    if (overrides[name] === undefined) continue;
    result[name] = validateLimit(name, Number(overrides[name]));
  }
  return result;
}

function canonicalStrategySelection(selection = {}) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new Error('Work-policy strategy selection must be an object.');
  }
  const preset = String(selection.preset ?? 'all').toLocaleLowerCase('en-US');
  if (!Object.hasOwn(STRATEGY_SELECTION_PRESETS, preset)) {
    throw new Error(`Strategy preset must be one of: ${Object.keys(STRATEGY_SELECTION_PRESETS).join(', ')}.`);
  }
  const selected = selection.selected ?? {};
  if (!selected || typeof selected !== 'object' || Array.isArray(selected)
    || Object.keys(selected).length > 16) {
    throw new Error('Selected strategies must be a bounded stage-to-identities object.');
  }
  const canonical = {};
  for (const stage of Object.keys(selected).toSorted()) {
    if (!STRATEGY_STAGES.includes(stage) || !Array.isArray(selected[stage])
      || selected[stage].length === 0 || selected[stage].length > 256) {
      throw new Error(`Strategy selection for ${stage} must be a non-empty bounded identity array.`);
    }
    if (!STRATEGY_EXACT_SELECTION_STAGES.includes(stage)) {
      throw new Error(`Strategy stage ${stage} is catalogued but not exact-selection-enabled in v1.`);
    }
    const values = [...new Set(selected[stage])].toSorted();
    if (values.some((value) => typeof value !== 'string'
      || !/^strategy:[a-z0-9][a-z0-9:-]*@\d+$/u.test(value))) {
      throw new Error(`Strategy selection for ${stage} contains an invalid identity.`);
    }
    for (const identity of values) {
      const descriptor = BUILTIN_STRATEGIES_BY_IDENTITY.get(identity);
      if (!descriptor || descriptor.stage !== stage) {
        throw new Error(`Strategy selection for ${stage} contains an unknown or wrong-stage identity: ${identity}.`);
      }
      if (descriptor.implementationState === 'planned') {
        throw new Error(`Strategy selection for ${stage} cannot execute planned identity ${identity}.`);
      }
    }
    const mandatory = MANDATORY_STRATEGY_IDENTITIES[stage];
    if (mandatory && !values.includes(mandatory)) {
      throw new Error(`Strategy selection for ${stage} must retain mandatory ${mandatory}.`);
    }
    canonical[stage] = Object.freeze(values);
  }
  return Object.freeze({
    preset,
    selected: Object.freeze(canonical),
  });
}

export function strategyStageSelected(policy, stage) {
  assertWorkPolicy(policy);
  if (!STRATEGY_STAGES.includes(stage)) throw new Error(`Unknown strategy stage: ${stage}.`);
  // The named preset is an inventory/ablation view in v1. Exact stage allowlists are the execution control.
  return true;
}

export function strategySelected(policy, descriptor) {
  const selection = assertWorkPolicy(policy).effective.strategies;
  if (!strategyStageSelected(policy, descriptor.stage)) return false;
  const exact = selection.selected[descriptor.stage];
  return !exact || exact.includes(strategyIdentity(descriptor));
}

export function strategyIdentitySelected(policy, stage, identity) {
  const selection = assertWorkPolicy(policy).effective.strategies;
  if (!strategyStageSelected(policy, stage)) return false;
  const exact = selection.selected[stage];
  return !exact || exact.includes(identity);
}

export function reasoningMethodSelected(policy, methodDescriptor) {
  const identity = `${methodDescriptor.methodId.replace(/^method:/u, 'strategy:')}@${
    methodDescriptor.implementationVersion}`;
  return strategyIdentitySelected(policy, 'runtime.reason.execute', identity);
}

export function selectedStrategyIdentities(policy, stage) {
  if (!strategyStageSelected(policy, stage)) return Object.freeze([]);
  return assertWorkPolicy(policy).effective.strategies.selected[stage];
}

function validateCrossLimits(limits) {
  if (limits.maximumHeuristicReparses > limits.maximumHeuristicCandidates) {
    throw new Error('maximumHeuristicReparses cannot exceed maximumHeuristicCandidates.');
  }
  if (limits.maximumGroundingCandidateEntries < limits.maximumGroundingEntries) {
    throw new Error('maximumGroundingCandidateEntries cannot be smaller than maximumGroundingEntries.');
  }
}

export function resolveWorkPolicy(input = {}) {
  if (typeof input === 'string') input = { profile: input };
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Work policy must be a profile name or an object.');
  }
  if (input.format === 'eslm-work-policy-v1') {
    assertWorkPolicy(input);
    return resolveWorkPolicy({
      profile: input.requested.profile,
      overrides: input.requested.overrides,
      strategies: input.requested.strategies,
    });
  }
  const profile = assertProfileName(String(input.profile ?? 'balanced').toLocaleLowerCase('en-US'));
  const overrides = canonicalOverrides(input.overrides);
  const strategies = canonicalStrategySelection(input.strategies);
  const limits = { ...PROFILE_LIMITS[profile], ...overrides };
  validateCrossLimits(limits);
  return Object.freeze({
    format: 'eslm-work-policy-v1',
    requested: Object.freeze({
      profile,
      overrides: Object.freeze(overrides),
      strategies,
    }),
    effective: Object.freeze({
      profile,
      limits: Object.freeze(limits),
      strategies,
    }),
    bounded: true,
    hardTimeLimit: false,
  });
}

export function assertWorkPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)
    || policy.format !== 'eslm-work-policy-v1') {
    throw new Error('Work policy format must be eslm-work-policy-v1.');
  }
  const profile = assertProfileName(policy.requested?.profile);
  if (policy.effective?.profile !== profile) {
    throw new Error('Requested and effective work-profile names must agree.');
  }
  const overrides = canonicalOverrides(policy.requested?.overrides);
  const requestedStrategies = canonicalStrategySelection(policy.requested?.strategies);
  const effectiveStrategies = canonicalStrategySelection(policy.effective?.strategies);
  if (JSON.stringify(requestedStrategies) !== JSON.stringify(effectiveStrategies)) {
    throw new Error('Requested and effective strategy selections must agree.');
  }
  const limits = policy.effective?.limits;
  if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
    throw new Error('Effective work-policy limits must be an object.');
  }
  const expectedNames = Object.keys(LIMIT_RULES).toSorted();
  if (JSON.stringify(Object.keys(limits).toSorted()) !== JSON.stringify(expectedNames)) {
    throw new Error('Effective work policy must expose every exact bounded limit and no unknown limits.');
  }
  const canonicalLimits = Object.fromEntries(expectedNames.map((name) => [
    name, validateLimit(name, limits[name]),
  ]));
  const expectedLimits = { ...PROFILE_LIMITS[profile], ...overrides };
  if (JSON.stringify(canonicalLimits) !== JSON.stringify(Object.fromEntries(
    expectedNames.map((name) => [name, expectedLimits[name]]),
  ))) {
    throw new Error('Effective work-policy limits do not match the requested profile and overrides.');
  }
  validateCrossLimits(canonicalLimits);
  if (policy.bounded !== true || policy.hardTimeLimit !== false) {
    throw new Error('Work policy must declare bounded work without claiming a hard time limit.');
  }
  return policy;
}

export function hornLimitsFromWorkPolicy(policy) {
  const limits = assertWorkPolicy(policy).effective.limits;
  return Object.freeze({
    maxRounds: limits.maximumHornRounds,
    maximumFacts: limits.maximumHornFacts,
    maximumJoinAttempts: limits.maximumHornJoinAttempts,
  });
}

export function groundingLimitsFromWorkPolicy(policy) {
  const limits = assertWorkPolicy(policy).effective.limits;
  return Object.freeze({
    maximumEntries: limits.maximumGroundingEntries,
    maximumTerms: limits.maximumGroundingTerms,
    maximumLookups: limits.maximumGroundingLookups,
    maximumValuesPerLookup: limits.maximumGroundingValuesPerLookup,
    maximumSources: limits.maximumGroundingSources,
    maximumCandidateEntries: limits.maximumGroundingCandidateEntries,
    maximumOutputBytes: limits.maximumGroundingOutputBytes,
  });
}

export {
  STRATEGY_SELECTION_PRESETS as WORK_STRATEGY_PRESETS,
  PROFILE_LIMITS as WORK_PROFILE_LIMITS,
  PROFILE_NAMES as WORK_PROFILE_NAMES,
};
import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import {
  STRATEGY_EXACT_SELECTION_STAGES, STRATEGY_STAGES, strategyIdentity,
} from '../strategy/strategy-contract.mjs';
