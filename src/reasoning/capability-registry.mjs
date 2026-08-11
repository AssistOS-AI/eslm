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
});
