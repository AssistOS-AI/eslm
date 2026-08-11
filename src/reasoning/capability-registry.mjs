function assertDescriptor(descriptor) {
  for (const field of ['methodId', 'inputTypes', 'outputTypes', 'preconditions', 'soundness', 'completeness', 'proofKind']) {
    if (descriptor[field] === undefined) throw new Error(`Method descriptor requires ${field}.`);
  }
  if (!Array.isArray(descriptor.inputTypes) || !Array.isArray(descriptor.outputTypes)) {
    throw new Error(`Method ${descriptor.methodId} requires typed input and output arrays.`);
  }
}

export class CapabilityRegistry {
  constructor() {
    this.methods = new Map();
  }

  register(descriptor, execute) {
    assertDescriptor(descriptor);
    if (this.methods.has(descriptor.methodId)) throw new Error(`Duplicate methodId: ${descriptor.methodId}.`);
    if (typeof execute !== 'function') throw new Error(`Method ${descriptor.methodId} requires an executor.`);
    this.methods.set(descriptor.methodId, Object.freeze({ descriptor: Object.freeze(descriptor), execute }));
    return this;
  }

  get(methodId) {
    return this.methods.get(methodId);
  }

  descriptors() {
    return [...this.methods.values()].map((entry) => entry.descriptor);
  }

  candidates(requiredCapability) {
    return [...this.methods.values()].filter((entry) =>
      entry.descriptor.capabilities?.includes(requiredCapability));
  }
}

export const CORE_METHOD_DESCRIPTORS = Object.freeze({
  lookup: Object.freeze({
    methodId: 'method:core:indexed-lookup',
    capabilities: ['retrieval', 'direct-answer'],
    inputTypes: ['query-atom', 'typed-facts'],
    outputTypes: ['semantic-values', 'direct-proof'],
    preconditions: ['query-predicate-supported'],
    soundness: 'sound-for-exact-matching-records',
    completeness: 'complete-for-loaded-selected-shards',
    uncertaintySemantics: 'strict-and-asserted',
    proofKind: 'direct-record-reference',
    costModel: 'smallest-posting-intersection-v1',
    implementationVersion: '1',
  }),
  datalog: Object.freeze({
    methodId: 'method:core:safe-horn-deduction',
    capabilities: ['deduction', 'horn-rules', 'proof-production'],
    inputTypes: ['typed-facts', 'safe-horn-rules', 'query-atom'],
    outputTypes: ['semantic-values', 'rule-derivation-graph'],
    preconditions: ['finite-active-domain', 'positive-safe-rules'],
    soundness: 'sound-under-declared-safe-horn-semantics',
    completeness: 'complete-within-declared-round-budget',
    uncertaintySemantics: 'strict-only',
    proofKind: 'rule-derivation-graph',
    costModel: 'indexed-bounded-forward-chaining-v1',
    implementationVersion: '1',
  }),
  induction: Object.freeze({
    methodId: 'method:core:configured-induction',
    capabilities: ['induction', 'ranked-property-generalization'],
    inputTypes: ['typed-facts', 'induction-policy', 'query-atom'],
    outputTypes: ['ranked-hypothesis', 'support-report'],
    preconditions: ['predicate-allowlisted', 'support-threshold-met'],
    soundness: 'not-deductive; explicitly-inductive',
    completeness: 'policy-bounded',
    uncertaintySemantics: 'inductive',
    proofKind: 'support-and-counterexample-report',
    costModel: 'class-support-scan-v1',
    implementationVersion: '1',
  }),
  finiteConjunctiveRuleInduction: Object.freeze({
    methodId: 'method:core:finite-conjunctive-rule-induction',
    capabilities: [
      'symbolic-rule-induction', 'typed-relational-joins',
      'shortest-conjunctive-hypothesis', 'witness-production',
    ],
    inputTypes: ['typed-positive-negative-examples', 'typed-nary-facts', 'bounded-hypothesis-policy'],
    outputTypes: ['safe-conjunctive-rule', 'coverage-and-rejection-witness'],
    preconditions: [
      'finite-active-domain', 'typed-entity-value-terms', 'positive-and-negative-training-evidence',
    ],
    soundness: 'every solved rule covers all positive and rejects all negative examples under finite conjunctive-query semantics',
    completeness: 'complete for connected positive conjunctive rules within the declared variable, literal, candidate, and match bounds',
    uncertaintySemantics: 'explicit-malformation-no-separator-and-resource-limit',
    proofKind: 'positive-variable-bindings-and-exhaustive-negative-match-rejection',
    costModel: 'bounded-shortest-first-connected-subgraph-enumeration-v1',
    implementationVersion: '1',
  }),
  finiteEpisodicWorld: Object.freeze({
    methodId: 'method:core:finite-episodic-world',
    capabilities: [
      'finite-episode-orchestration', 'finite-state-history', 'finite-relation-transitions',
      'typed-event-role-query', 'declarative-relation-closure', 'finite-vector-propagation',
      'witness-production',
    ],
    inputTypes: ['finite-episodic-world-task-v1'],
    outputTypes: ['typed-semantic-values', 'operation-witness'],
    preconditions: [
      'finite-typed-operation-sequence', 'bounded-semantic-identifiers',
      'declared-relation-and-vector-policies', 'source-policy-separated-from-executor',
    ],
    soundness: 'sound for the declared finite operation, relation, event-role, and query semantics',
    completeness: 'complete for validated operations within operation and path bounds while preserving multi-value ambiguity',
    uncertaintySemantics: 'strict state and relation execution with explicit possible state ambiguity unknown and resource limit',
    proofKind: 'replayable-operation-identifier-witness',
    costModel: 'bounded-linear-state-scans-plus-bounded-breadth-first-relation-or-vector-traversal-v1',
    implementationVersion: '1',
  }),
  abduction: Object.freeze({
    methodId: 'method:core:guarded-abduction',
    capabilities: ['abduction', 'ranked-explanations'],
    inputTypes: ['observed-query-atom', 'typed-facts', 'abductive-rules'],
    outputTypes: ['ranked-hypothesis'],
    preconditions: ['observation-supported', 'rule-marked-abductive'],
    soundness: 'hypothesis-generation-only',
    completeness: 'bounded-by-declared-hypothesis-limit',
    uncertaintySemantics: 'possible',
    proofKind: 'observation-rule-premise-trace',
    costModel: 'bounded-rule-reversal-v1',
    implementationVersion: '1',
  }),
  temporalPredecessor: Object.freeze({
    methodId: 'method:core:temporal-state-predecessor',
    capabilities: ['temporal-predecessor', 'state-history'],
    inputTypes: ['ordered-state-events', 'entity-reference', 'boundary-state'],
    outputTypes: ['semantic-values', 'state-transition-witness'],
    preconditions: ['ordered-session-history', 'boundary-state-observed'],
    soundness: 'sound-for-recorded-discrete-state-transitions',
    completeness: 'complete-for-retained-session-history',
    uncertaintySemantics: 'strict-observation-order',
    proofKind: 'adjacent-state-event-pair',
    costModel: 'reverse-bounded-history-scan-v1',
    implementationVersion: '1',
  }),
  containerState: Object.freeze({
    methodId: 'method:core:container-state-transitions',
    capabilities: ['finite-relation-state', 'container-state', 'state-transition-execution'],
    inputTypes: ['finite-relation-state-program', 'relation-query'],
    outputTypes: ['semantic-values', 'state-transition-witness'],
    preconditions: ['validated-relation-state-schema', 'bounded-transition-sequence'],
    soundness: 'sound-for-declared-set-add-remove-transfer-semantics',
    completeness: 'complete-for-the-accepted-finite-relation-program-within-budgets',
    uncertaintySemantics: 'strict-state-update',
    proofKind: 'ordered-state-transition-trace',
    costModel: 'linear-bounded-transition-execution-v1',
    implementationVersion: '1',
  }),
  narrativeContinuation: Object.freeze({
    methodId: 'method:core:bounded-narrative-continuation-ranking',
    capabilities: ['narrative-state', 'continuation-selection', 'deterministic-ranking'],
    inputTypes: ['narrative-sequence', 'candidate-event-frames', 'optional-semantic-evidence'],
    outputTypes: ['ranked-candidate', 'feature-contribution-witness'],
    preconditions: ['validated-narrative-frames', 'at-least-two-candidates', 'bounded-feature-policy'],
    soundness: 'defeasible-ranking-only; does-not-prove-real-world-necessity',
    completeness: 'complete-for-declared-features-and-evidence-within-fixed-bounds',
    uncertaintySemantics: 'defeasible-with-explicit-tie-or-margin-abstention',
    proofKind: 'feature-contribution-and-provider-provenance-witness',
    costModel: 'bounded-candidate-feature-ranking-v1',
    implementationVersion: '1',
  }),
  typedRelationAlgebra: Object.freeze({
    methodId: 'method:core:typed-relation-algebra',
    capabilities: ['typed-relation-composition', 'inverse-relations', 'bounded-path-reasoning'],
    inputTypes: ['typed-relation-facts', 'entity-features', 'declarative-relation-algebra', 'relation-query'],
    outputTypes: ['semantic-values', 'relation-path-witness'],
    preconditions: ['validated-relation-algebra', 'finite-relation-graph', 'bounded-path-depth'],
    soundness: 'sound-for-declared-inverse-composition-and-refinement-semantics',
    completeness: 'complete-for-shortest-simple-paths-within-declared-and-core-budgets',
    uncertaintySemantics: 'explicit-ambiguity-inconsistency-and-open-world-unknown',
    proofKind: 'ordered-relation-path-and-composition-witness',
    costModel: 'bounded-breadth-first-relation-composition-v1',
    implementationVersion: '1',
  }),
  spatialVectorConstraints: Object.freeze({
    methodId: 'method:core:spatial-vector-constraints',
    capabilities: ['spatial-relation-composition', 'vector-constraint-propagation', 'distractor-robust-path-reasoning'],
    inputTypes: ['typed-spatial-vector-facts', 'declarative-vector-relation-system', 'spatial-relation-query'],
    outputTypes: ['semantic-values', 'ordered-displacement-path-witness'],
    preconditions: ['validated-finite-vector-system', 'finite-relation-graph', 'bounded-path-depth'],
    soundness: 'sound-for-declared-exact-vector-sums-or-conservative-opposed-step-invalidation-and-sign-classification',
    completeness: 'complete-for-deterministic-query-connected-path-propagation-under-the-declared-composition-policy-and-depth',
    uncertaintySemantics: 'explicit-disconnection-inconsistency-unsupported-output-and-resource-limit',
    proofKind: 'ordered-edge-path-with-replayable-vector-sum',
    costModel: 'bounded-query-component-coordinate-propagation-v1',
    implementationVersion: '1',
  }),
  spatialExtentInequalities: Object.freeze({
    methodId: 'method:core:spatial-extent-inequalities',
    capabilities: ['spatial-relation-composition', 'extent-inequality-closure', 'multi-relation-output'],
    inputTypes: ['typed-spatial-extent-facts', 'declarative-extent-relation-system', 'spatial-relation-query'],
    outputTypes: ['semantic-values', 'inequality-path-witnesses'],
    preconditions: ['validated-finite-extent-system', 'finite-constraint-graph', 'declared-orthogonal-policy'],
    soundness: 'sound-for-transitive-nonstrict-extent-inequalities-and-declared-relation-completeness',
    completeness: 'complete-for-directional-separation-entailed-by-the-finite-inequality-graph',
    uncertaintySemantics: 'explicit-underdetermination-inconsistency-and-resource-limit',
    proofKind: 'one-replayable-inequality-path-per-entailed-output-relation',
    costModel: 'bounded-query-directed-inequality-reachability-v1',
    implementationVersion: '1',
  }),
  qualitativeRelationClosure: Object.freeze({
    methodId: 'method:core:declarative-qualitative-relation-closure',
    capabilities: [
      'qualitative-relation-closure', 'inverse-relations', 'multi-relation-output', 'proof-tree-production',
    ],
    inputTypes: [
      'declarative-qualitative-relation-system', 'typed-qualitative-relation-facts', 'relation-query',
    ],
    outputTypes: ['semantic-values', 'relation-derivation-trees'],
    preconditions: ['validated-finite-relation-system', 'finite-relation-graph', 'bounded-derivation-policy'],
    soundness: 'sound-for-declared-reciprocal-inverses-and-binary-composition-rules',
    completeness: 'complete-for-the-bounded-least-fixed-point-of-the-declared-relation-system',
    uncertaintySemantics: 'explicit-unknown-inconsistency-malformation-and-resource-limit',
    proofKind: 'one-replayable-inverse-or-composition-tree-per-output-relation',
    costModel: 'bounded-semi-naive-binary-relation-closure-v1',
    implementationVersion: '1',
  }),
  finiteEntailment: Object.freeze({
    methodId: 'method:core:finite-entailment',
    capabilities: ['propositional-entailment', 'finite-model-search', 'countermodel-production'],
    inputTypes: ['finite-propositional-premises', 'propositional-query'],
    outputTypes: ['entailed-boolean', 'finite-model-witness'],
    preconditions: ['validated-formula-ast', 'bounded-semantic-atom-set'],
    soundness: 'sound-for-classical-propositional-semantics',
    completeness: 'complete-for-the-finite-atom-set-within-the-declared-bound',
    uncertaintySemantics: 'inconsistent-premises-and-resource-limits-remain-explicit',
    proofKind: 'exhaustive-assignment-summary-or-finite-countermodel',
    costModel: 'bounded-exhaustive-finite-model-search-v1',
    implementationVersion: '1',
  }),
  scalableBooleanEntailment: Object.freeze({
    methodId: 'method:core:scalable-boolean-entailment',
    capabilities: [
      'propositional-entailment', 'sat-search', 'countermodel-production', 'query-directed-proof-search',
    ],
    inputTypes: [
      'finite-propositional-premises', 'propositional-query', 'search-budget', 'inconsistency-policy',
    ],
    outputTypes: ['entailed-boolean', 'dpll-proof-or-countermodel'],
    preconditions: ['validated-formula-ast', 'finite-semantic-atom-set', 'explicit-resource-bounds'],
    soundness: 'sound-for-classical-propositional-semantics',
    completeness: 'complete-unless-an-explicit-resource-bound-is-reached',
    uncertaintySemantics: 'inconsistency-is-reported-unless-classical-explosion-is-explicitly-selected',
    proofKind: 'query-directed-dpll-certificate-classical-explosion-certificate-or-finite-countermodel',
    costModel: 'tseitin-cnf-unit-propagation-bounded-dpll-v1',
    implementationVersion: '1',
  }),
  finiteFirstOrderCountermodel: Object.freeze({
    methodId: 'method:core:finite-first-order-countermodel',
    capabilities: ['first-order-model-finding', 'countermodel-production', 'finite-domain-search'],
    inputTypes: ['typed-first-order-argument', 'finite-domain-size', 'search-budget'],
    outputTypes: ['finite-first-order-model', 'countermodel-verification-witness'],
    preconditions: ['validated-first-order-formula-ast', 'finite-nonempty-domain', 'explicit-resource-bounds'],
    soundness: 'sound-for-the-declared-function-free-first-order-semantics',
    completeness: 'complete-for-the-declared-finite-domain-unless-an-explicit-resource-bound-is-reached',
    uncertaintySemantics: 'validity-is-not-inferred-from-failure-outside-the-declared-domain-or-budget',
    proofKind: 'independently-evaluated-finite-first-order-countermodel',
    costModel: 'constant-assignment-enumeration-plus-grounded-tseitin-dpll-v1',
    implementationVersion: '1',
  }),
  preferredEntailment: Object.freeze({
    methodId: 'method:core:preferred-entailment',
    capabilities: ['default-reasoning', 'priority-resolution', 'skeptical-entailment'],
    inputTypes: ['finite-propositional-premises', 'prioritized-defaults', 'propositional-query'],
    outputTypes: ['entailed-boolean', 'preferred-model-witness'],
    preconditions: ['validated-formula-ast', 'explicit-default-priorities', 'bounded-semantic-atom-set'],
    soundness: 'sound-for-declared-lexicographic-minimum-violation-semantics',
    completeness: 'complete-for-the-finite-atom-set-and-declared-defaults-within-the-bound',
    uncertaintySemantics: 'skeptical-over-all-equally-preferred-models',
    proofKind: 'priority-penalty-summary-and-preferred-model-witness',
    costModel: 'bounded-exhaustive-preferred-model-search-v1',
    implementationVersion: '1',
  }),
  categoricalLogic: Object.freeze({
    methodId: 'method:core:categorical-logic',
    capabilities: ['categorical-opposition', 'categorical-transformation', 'categorical-syllogism'],
    inputTypes: ['categorical-proposition', 'categorical-operation', 'optional-second-premise'],
    outputTypes: ['categorical-truth-value', 'categorical-proposition', 'categorical-model-witness'],
    preconditions: ['validated-a-e-i-o-forms', 'bounded-atomic-term-set', 'declared-existential-import'],
    soundness: 'sound-for-the-declared-traditional-categorical-semantics',
    completeness: 'complete-for-immediate-transformations-and-two-premise-three-term-syllogisms',
    uncertaintySemantics: 'undetermined-inconsistent-and-invalid-results-remain-explicit',
    proofKind: 'transformation-trace-or-exhaustive-finite-categorical-model-witness',
    costModel: 'constant-immediate-operation-or-bounded-finite-population-enumeration-v1',
    implementationVersion: '1',
  }),
});
