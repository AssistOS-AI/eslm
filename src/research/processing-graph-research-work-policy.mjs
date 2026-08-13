import { stableStringify } from '../util.mjs';
import { PROCESSING_GRAPH_DISCOVERY_TECHNIQUES } from './processing-graph-discovery-strategies.mjs';

export const PROCESSING_GRAPH_RESEARCH_POLICY_PROTOCOL =
  'eslm-processing-graph-research-work-policy-v1';

export const PROCESSING_GRAPH_RESEARCH_PROGRESSION_STAGES = Object.freeze([
  'probe', 'pilot', 'scale',
]);

export const PROCESSING_GRAPH_RESEARCH_LIMIT_FIELDS = Object.freeze([
  'maxRowsScanned', 'maxEpisodes', 'maxInputBytes', 'maxTokens', 'maxActions',
  'maxDependencies', 'maxVotes', 'maxHypotheses', 'maxEvidenceDigestsPerVote',
]);

const DEFAULT_LIMITS = Object.freeze({
  maxRowsScanned: 100_000,
  maxEpisodes: 512,
  maxInputBytes: 67_108_864,
  maxTokens: 16_777_216,
  maxActions: 65_536,
  maxDependencies: 131_072,
  maxVotes: 2_048,
  maxHypotheses: 512,
  maxEvidenceDigestsPerVote: 14,
});
export const PROCESSING_GRAPH_MAX_EVIDENCE_DIGESTS_PER_VOTE = Math.floor(
  128 / PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.length,
);

const DEFAULT_TECHNIQUE_BUDGET = Object.freeze({ maxEvents: 8_192, maxProposals: 512 });

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function positiveCount(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

export function assertProcessingGraphResearchWorkPolicy(policy) {
  const techniqueIds = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map((item) => item.id);
  exact(policy, ['format', 'progressionStage', 'limits', 'techniqueBudgets'], 'Research work policy');
  if (policy.format !== PROCESSING_GRAPH_RESEARCH_POLICY_PROTOCOL
      || !PROCESSING_GRAPH_RESEARCH_PROGRESSION_STAGES.includes(policy.progressionStage)) {
    throw new TypeError('Research work policy protocol or progression stage is unsupported.');
  }
  exact(policy.limits, PROCESSING_GRAPH_RESEARCH_LIMIT_FIELDS, 'Research work policy limits');
  for (const field of PROCESSING_GRAPH_RESEARCH_LIMIT_FIELDS) {
    positiveCount(policy.limits[field], `Research limit ${field}`);
  }
  if (policy.limits.maxEvidenceDigestsPerVote
      > PROCESSING_GRAPH_MAX_EVIDENCE_DIGESTS_PER_VOTE) {
    throw new TypeError(
      `Research limit maxEvidenceDigestsPerVote cannot exceed `
      + `${PROCESSING_GRAPH_MAX_EVIDENCE_DIGESTS_PER_VOTE}.`,
    );
  }
  exact(policy.techniqueBudgets, techniqueIds, 'Research technique budgets');
  for (const techniqueId of techniqueIds) {
    exact(policy.techniqueBudgets[techniqueId], ['maxEvents', 'maxProposals'], `${techniqueId} budget`);
    positiveCount(policy.techniqueBudgets[techniqueId].maxEvents, `${techniqueId}.maxEvents`);
    positiveCount(policy.techniqueBudgets[techniqueId].maxProposals, `${techniqueId}.maxProposals`);
  }
  return policy;
}

export function resolveProcessingGraphResearchWorkPolicy({
  progressionStage = 'probe', limits = {}, techniqueBudgets = {},
} = {}) {
  const techniqueIds = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map((item) => item.id);
  const policy = {
    format: PROCESSING_GRAPH_RESEARCH_POLICY_PROTOCOL,
    progressionStage,
    limits: { ...DEFAULT_LIMITS, ...structuredClone(limits) },
    techniqueBudgets: Object.fromEntries(techniqueIds.map((techniqueId) => [
      techniqueId,
      { ...DEFAULT_TECHNIQUE_BUDGET, ...structuredClone(techniqueBudgets[techniqueId] ?? {}) },
    ])),
  };
  assertProcessingGraphResearchWorkPolicy(policy);
  return freezeDeep(policy);
}
