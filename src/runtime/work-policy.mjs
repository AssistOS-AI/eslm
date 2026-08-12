const PROFILE_NAMES = Object.freeze([
  'quick',
  'balanced',
  'deep',
  'exhaustive-bounded',
]);

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
    });
  }
  const profile = assertProfileName(String(input.profile ?? 'balanced').toLocaleLowerCase('en-US'));
  const overrides = canonicalOverrides(input.overrides);
  const limits = { ...PROFILE_LIMITS[profile], ...overrides };
  validateCrossLimits(limits);
  return Object.freeze({
    format: 'eslm-work-policy-v1',
    requested: Object.freeze({
      profile,
      overrides: Object.freeze(overrides),
    }),
    effective: Object.freeze({
      profile,
      limits: Object.freeze(limits),
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
  PROFILE_LIMITS as WORK_PROFILE_LIMITS,
  PROFILE_NAMES as WORK_PROFILE_NAMES,
};
