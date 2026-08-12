export const HEURISTIC_CNL_PROTOCOL = 'eslm-heuristic-cnl-approximation-v1';

export const HEURISTIC_CNL_LIMITS = Object.freeze({
  maximumInputBytes: 16 * 1024,
  maximumTokens: 768,
  maximumSentences: 48,
  maximumProposals: 96,
  maximumCandidates: 24,
  maximumEditDistanceEvaluations: 8_192,
  maximumReceiptBytes: 512 * 1024,
});

export const HEURISTIC_CNL_LIMIT_CEILINGS = Object.freeze({
  maximumInputBytes: 64 * 1024,
  maximumTokens: 8_192,
  maximumSentences: 128,
  maximumProposals: 1_024,
  maximumCandidates: 256,
  maximumEditDistanceEvaluations: 131_072,
  maximumReceiptBytes: 1024 * 1024,
});

const LIMIT_KEYS = Object.freeze(Object.keys(HEURISTIC_CNL_LIMITS));

function finiteInteger(value, path, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${path} must be a positive safe integer no greater than ${maximum}.`);
  }
  return value;
}

function finiteConfidence(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${path} must be a finite number from 0 through 1.`);
  }
  return value;
}

export function resolveHeuristicCnlOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Heuristic CNL options must be an object.');
  }
  const allowed = new Set(['limits', 'minimumCandidateConfidence']);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new TypeError(`Unsupported heuristic CNL option: ${key}.`);
  }
  const suppliedLimits = options.limits ?? {};
  if (!suppliedLimits || typeof suppliedLimits !== 'object' || Array.isArray(suppliedLimits)) {
    throw new TypeError('Heuristic CNL limits must be an object.');
  }
  for (const key of Object.keys(suppliedLimits)) {
    if (!LIMIT_KEYS.includes(key)) throw new TypeError(`Unsupported heuristic CNL limit: ${key}.`);
  }
  const limits = {};
  for (const key of LIMIT_KEYS) {
    const defaultValue = HEURISTIC_CNL_LIMITS[key];
    const ceiling = HEURISTIC_CNL_LIMIT_CEILINGS[key];
    limits[key] = finiteInteger(suppliedLimits[key] ?? defaultValue, `limits.${key}`, ceiling);
  }
  const minimumCandidateConfidence = finiteConfidence(
    options.minimumCandidateConfidence ?? 0.42,
    'minimumCandidateConfidence',
  );
  return Object.freeze({
    limits: Object.freeze(limits),
    minimumCandidateConfidence,
  });
}

export function confidenceBand(confidence) {
  if (confidence >= 0.86) return 'high';
  if (confidence >= 0.68) return 'medium';
  return 'low';
}

export function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

export function resourceLimitResult(originalText, options, observed, resource) {
  return freezeDeep({
    protocol: HEURISTIC_CNL_PROTOCOL,
    status: 'RESOURCE_LIMIT',
    originalText,
    candidates: [],
    recommendedCandidate: null,
    receipt: {
      protocol: HEURISTIC_CNL_PROTOCOL,
      complete: false,
      answerProduced: false,
      kbConsulted: false,
      sessionMutated: false,
      limits: options.limits,
      observed,
      exhaustedResource: resource,
      familyReceipts: [],
      rejectionCounts: {},
      truncationReasons: [resource],
    },
  });
}
