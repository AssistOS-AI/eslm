export const RESEARCH_ANALYSIS_PROTOCOL = 'eslm-processing-graph-research-analysis-v6';
export const RESEARCH_PLAN_PROTOCOL = 'eslm-rl-dataset-discovery-plan-v2';
export const RESEARCH_CYCLE_PROTOCOL = 'eslm-rl-dataset-discovery-cycle-v3';
export const RESEARCH_FEATURE_PROTOCOL = 'eslm-research-episode-features-v1';
export const RESEARCH_FEATURE_SCHEMA_DIGEST =
  'sha256:33b993b16037f4294c867da25896d4e48529b8644e649727b370c5294668fe0a';

export const PRESERVING_TRANSFORMS = Object.freeze([
  'opaque-join-identity-renaming',
  'nonce-argument-value-renaming',
  'request-surface-paraphrase',
  'independent-equivalent-action-ordering',
  'irrelevant-provenance-evidence-insertion',
  'unordered-feedback-permutation',
]);

export const MEANING_CHANGING_CONTROLS = Object.freeze([
  'structural-contract-inversion',
  'constraint-contract-change',
  'outcome-witness-change',
]);

export const EXCLUDED_SEMANTIC_FIELDS = Object.freeze([
  'action-identifiers', 'argument-values', 'episode-identifiers', 'provenance-spans',
  'request-text', 'source-component-identifiers', 'source-native-identifiers',
]);

export const DISCOVERY_TECHNIQUES = Object.freeze([
  Object.freeze({
    id: 'task-frame-induction-v1', correlationGroup: 'task-structure',
    hypothesisType: 'coordination-node',
  }),
  Object.freeze({
    id: 'typed-operation-responsibility-v1',
    correlationGroup: 'typed-operation-responsibility', hypothesisType: 'processing-node',
  }),
  Object.freeze({
    id: 'phase-change-point-v1', correlationGroup: 'trajectory-boundary',
    hypothesisType: 'edge',
  }),
  Object.freeze({
    id: 'earliest-error-v1', correlationGroup: 'failure-localization',
    hypothesisType: 'authority-gate',
  }),
  Object.freeze({
    id: 'partial-order-motif-v1', correlationGroup: 'dependency-structure',
    hypothesisType: 'packet-field',
  }),
  Object.freeze({
    id: 'bounded-subcircuit-motif-v1', correlationGroup: 'hierarchical-subcircuit-structure',
    hypothesisType: 'nested-circuit',
  }),
  Object.freeze({
    id: 'preference-axis-v1', correlationGroup: 'quality-feedback',
    hypothesisType: 'strategy',
  }),
  Object.freeze({
    id: 'metamorphic-recurrence-v1', correlationGroup: 'metamorphic-invariance',
    hypothesisType: 'cross-type-support',
  }),
  Object.freeze({
    id: 'cross-source-recurrence-v1', correlationGroup: 'cross-source-independence',
    hypothesisType: 'cross-type-support',
  }),
]);

export const DISCOVERY_HYPOTHESIS_TYPES = Object.freeze([
  'processing-node', 'coordination-node', 'authority-gate', 'strategy', 'edge',
  'packet-field', 'nested-circuit',
]);

export const ANALYSIS_AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
  executablePolicy: false,
});

export const FEATURE_VOCABULARY = Object.freeze({
  operationKinds: Object.freeze([
    'acquire-evidence', 'compare', 'construct', 'invoke-tool', 'plan', 'reason', 'repair',
    'summarize', 'verify',
  ]),
  artifactKinds: Object.freeze([
    'action-result', 'comparison', 'derivation', 'document', 'evidence-set', 'none', 'plan',
    'repaired-artifact', 'summary', 'verification-report',
  ]),
  constraintKinds: Object.freeze([
    'completeness', 'consistency', 'format', 'length', 'ordering', 'resource', 'safety',
    'source-grounding',
  ]),
  capabilityKinds: Object.freeze([
    'construct', 'parse', 'reason', 'repair', 'retrieve', 'tool-access', 'verify',
  ]),
  obligationKinds: Object.freeze([
    'cited', 'complete', 'concise', 'ordered', 'safe', 'schema-valid', 'verified',
  ]),
  stateKinds: Object.freeze([
    'action-state', 'artifact-state', 'evidence-state', 'plan-state', 'request-state',
    'verification-state',
  ]),
  phases: Object.freeze([
    'acquire', 'construct', 'execute', 'interpret', 'plan', 'reason', 'repair', 'terminate',
    'verify',
  ]),
  observationKinds: Object.freeze([
    'candidate', 'error', 'evidence', 'feedback', 'request', 'state', 'tool-result',
  ]),
  actionKinds: Object.freeze([
    'abstain', 'build-plan', 'compare-items', 'construct-output', 'decompose-task',
    'detect-error', 'parse-request', 'propose-action', 'reason-step', 'repair-step',
    'retrieve-evidence', 'select-tool', 'summarize-evidence', 'terminate',
    'validate-output', 'validate-witness',
  ]),
  argumentRoles: Object.freeze([
    'candidate', 'constraint', 'criterion', 'evidence', 'format', 'object', 'source',
    'subject', 'target', 'tool',
  ]),
  valueKinds: Object.freeze([
    'boolean', 'collection', 'entity', 'identifier', 'number', 'relation', 'schema', 'text',
  ]),
  stateDeltaKinds: Object.freeze([
    'action-selected', 'artifact-constructed', 'derivation-added', 'error-recorded',
    'evidence-added', 'output-validated', 'plan-created', 'repair-applied',
    'request-structured', 'terminated', 'witness-validated',
  ]),
  actionOutcomes: Object.freeze(['failed', 'not-observed', 'succeeded']),
  errorKinds: Object.freeze([
    'capability-unavailable', 'constraint-violation', 'invalid-state-transition', 'none',
    'output-shape-violation', 'unsupported-claim', 'witness-rejected',
  ]),
  witnessKinds: Object.freeze([
    'evidence-citation', 'none', 'schema-check', 'state-check', 'symbolic-proof',
  ]),
  episodeStatuses: Object.freeze(['abstained', 'failed', 'partial', 'succeeded']),
  feedbackAxes: Object.freeze([
    'coherence', 'completeness', 'complexity', 'correctness', 'efficiency', 'factuality',
    'helpfulness', 'presentation', 'procedural', 'quality', 'relevance', 'safety', 'style',
    'verbosity',
  ]),
});
