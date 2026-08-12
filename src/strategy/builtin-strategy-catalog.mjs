import { CORE_METHOD_DESCRIPTORS } from '../reasoning/capability-registry.mjs';
import { HEURISTIC_REQUEST_PATTERN_CATALOG } from '../language/heuristic-request-patterns.mjs';
import { createStrategyDescriptor } from './strategy-contract.mjs';

function descriptor(value) {
  return createStrategyDescriptor(value);
}

const LANGUAGE_APPROXIMATION_STRATEGIES = Object.freeze([
  ['grammatical-spelling', 'cost:bounded-edit-distance', 'witness:surface-edits'],
  ['determiner-agreement', 'cost:linear-token-scan', 'witness:surface-edits'],
  ['quantifier-canonicalization', 'cost:linear-clause-scan', 'witness:protected-operator-alignment'],
  ['progressive-question-reduction', 'cost:bounded-edit-distance', 'witness:surface-edits'],
  ['contextual-predicate-spelling', 'cost:bounded-edit-distance', 'witness:contextual-verb-edit'],
  ['predicate-agreement', 'cost:bounded-edit-distance', 'witness:predicate-morphology'],
  ['copula-and-auxiliary-insertion', 'cost:linear-clause-scan', 'witness:surface-edits'],
  ['sentence-segmentation', 'cost:linear-surface-scan', 'witness:source-span-alignment'],
  ['independent-clause-coordination', 'cost:bounded-clause-pattern', 'witness:source-span-alignment'],
  ['local-parallel-ellipsis', 'cost:bounded-clause-pattern', 'witness:reconstructed-parallel-frame'],
  ['request-envelope-stripping', 'cost:bounded-clause-pattern', 'witness:protected-content-alignment'],
  ['embedded-polar-question', 'cost:bounded-clause-pattern', 'witness:question-force-alignment'],
  ['nominalized-request-simplification', 'cost:bounded-clause-pattern', 'witness:question-force-alignment'],
  ['relative-clause-extraction', 'cost:bounded-clause-pattern', 'witness:antecedent-span-alignment'],
  ['apposition-expansion', 'cost:bounded-clause-pattern', 'witness:apposition-span-alignment'],
  ['temporal-clause-normalization', 'cost:bounded-clause-pattern', 'witness:temporal-direction-alignment'],
  ['causal-clause-normalization', 'cost:bounded-clause-pattern', 'witness:causal-relation-alignment'],
  ['conditional-punctuation-normalization', 'cost:bounded-clause-pattern', 'witness:condition-consequence-alignment'],
  ['explicit-passive-to-active', 'cost:bounded-clause-pattern', 'witness:semantic-role-alignment'],
  ['nonsemantic-parenthetical-removal', 'cost:linear-surface-scan', 'witness:removed-discourse-span'],
  ['discourse-filler-removal', 'cost:linear-prefix-scan', 'witness:removed-discourse-span'],
  ['wh-nominalization-reduction', 'cost:bounded-clause-pattern', 'witness:question-relation-alignment'],
  ['unique-local-reference-substitution', 'cost:bounded-adjacent-context', 'witness:antecedent-alignment'],
  ['question-last-reordering', 'cost:bounded-segment-order', 'witness:sentence-identity-alignment'],
].map(([name, costModel, witnessKind]) => descriptor({
  strategyId: `strategy:language:${name}`,
  stage: 'runtime.language.interpret',
  inputTypes: ['type:bounded-surface-analysis'],
  outputTypes: ['type:controlled-language-candidate'],
  preconditions: ['precondition:visible-structural-cue'],
  epistemicRole: 'interpretation-proposal',
  confidenceKind: 'confidence:language-interpretation',
  costModel,
  budgetKeys: ['budget:heuristic-proposals', 'budget:heuristic-receipt-bytes'],
  witnessKind,
  correlationGroup: `correlation:language:${name}`,
  implementationState: 'coordinated',
})));

const REQUEST_STRATEGIES = Object.freeze([
  descriptor({
    strategyId: 'strategy:request:reviewed-pattern-ensemble',
    stage: 'runtime.request.plan',
    inputTypes: ['type:instruction-spans'],
    outputTypes: ['type:ordered-obligation-plan'],
    preconditions: ['precondition:explicit-request-force'],
    epistemicRole: 'request-constraint',
    confidenceKind: 'confidence:request-plan',
    costModel: 'cost:bounded-pattern-catalog',
    budgetKeys: ['budget:heuristic-tokens', 'budget:heuristic-segments'],
    witnessKind: 'witness:pattern-votes-and-source-spans',
    correlationGroup: 'correlation:request:reviewed-patterns',
    implementationState: 'instrumented-local',
  }),
]);

const KNOWLEDGE_ACQUISITION_STRATEGIES = Object.freeze([
  ['canonical-records', 'witness:canonical-record-validation'],
  ['manual-document', 'witness:document-source-span-ledger'],
  ['technical-documentation', 'witness:documentation-structure-ledger'],
  ['ontology', 'witness:ontology-axiom-alignment'],
  ['lexical-resource', 'witness:lexical-entry-provenance'],
  ['event-graph', 'witness:event-edge-provenance'],
  ['tabular-data', 'witness:table-cell-provenance'],
].map(([name, witnessKind]) => descriptor({
  strategyId: `strategy:knowledge:${name}`,
  stage: 'compiler.knowledge.extract',
  inputTypes: ['type:frozen-source-packet'],
  outputTypes: ['type:canonical-record-candidate'],
  preconditions: ['precondition:source-identity-and-rights-gated'],
  epistemicRole: 'knowledge-normalization',
  confidenceKind: 'confidence:extraction-candidate',
  costModel: 'cost:bounded-offline-source-adaptation',
  budgetKeys: ['budget:source-records', 'budget:source-bytes'],
  witnessKind,
  correlationGroup: `correlation:knowledge:${name}`,
  implementationState: 'planned',
})));

const QUERY_FOCUS_STRATEGIES = Object.freeze([
  ['semantic-ir-roles', 'witness:semantic-role-fields'],
  ['surface-content-token', 'witness:content-token-span'],
  ['exact-content-phrase', 'witness:source-phrase-span'],
  ['bounded-morphology', 'witness:lemma-derivation'],
  ['metalinguistic-topic', 'witness:metalinguistic-frame'],
  ['function-word-exclusion', 'witness:excluded-token-role'],
].map(([name, witnessKind]) => descriptor({
  strategyId: `strategy:focus:${name}`,
  stage: 'runtime.knowledge.focus',
  inputTypes: ['type:visible-request-and-semantic-ir'],
  outputTypes: ['type:ranked-focus-term'],
  preconditions: ['precondition:bounded-visible-input'],
  epistemicRole: 'retrieval-focus',
  confidenceKind: 'confidence:retrieval-focus',
  costModel: 'cost:linear-bounded-focus-scan',
  budgetKeys: ['budget:grounding-terms'],
  witnessKind,
  correlationGroup: `correlation:focus:${name}`,
  implementationState: 'instrumented-local',
})));

const RETRIEVAL_RANKING_STRATEGIES = Object.freeze([
  ['focus-term-coverage', 'witness:matched-focus-terms'],
  ['focus-role-coverage', 'witness:matched-semantic-roles'],
  ['focus-term-cooccurrence', 'witness:cooccurring-focus-terms'],
  ['exact-focus-phrase', 'witness:exact-token-phrase'],
  ['active-kb-frequency', 'witness:bounded-active-posting-count'],
  ['typed-answer-bridge', 'witness:query-entry-field-bridge'],
].map(([name, witnessKind]) => descriptor({
  strategyId: `strategy:retrieval:${name}`,
  stage: 'runtime.evidence.assess',
  inputTypes: ['type:grounding-candidate', 'type:grounding-request'],
  outputTypes: ['type:relevance-vote'],
  preconditions: ['precondition:provenance-bearing-candidate'],
  epistemicRole: 'relevance-estimate',
  confidenceKind: 'confidence:retrieval-relevance',
  costModel: 'cost:bounded-candidate-estimate',
  budgetKeys: ['budget:grounding-candidates'],
  witnessKind,
  correlationGroup: `correlation:retrieval:${name}`,
  implementationState: 'instrumented-local',
})));

const RESULT_CONSTRUCTION_STRATEGIES = Object.freeze([
  'extractive-summary', 'extractive-expansion', 'comparison', 'outline', 'table', 'sectioned-document',
].map((name) => descriptor({
  strategyId: `strategy:result:${name}`,
    stage: 'runtime.result.construct',
  inputTypes: ['type:ordered-obligation-plan', 'type:provenance-bearing-evidence'],
  outputTypes: ['type:bounded-grounded-artifact'],
  preconditions: ['precondition:planned-output-obligation'],
    epistemicRole: 'presentation-construction',
    confidenceKind: 'confidence:construction-coverage',
  costModel: 'cost:bounded-extractive-construction',
  budgetKeys: ['budget:grounding-output-bytes'],
    witnessKind: 'witness:claim-source-ledger',
    correlationGroup: `correlation:result:${name}`,
    implementationState: 'instrumented-local',
})));

// These executors exist for benchmark adapters, but those adapters have not yet
// migrated behind the runtime strategy-policy gate. Calling them
// "instrumented-local" would falsely present them as execution-selectable.
const ADAPTER_LOCAL_UNGATED_METHODS = new Set([
  CORE_METHOD_DESCRIPTORS.finiteEntailment.methodId,
  CORE_METHOD_DESCRIPTORS.preferredEntailment.methodId,
]);

const REASONING_STRATEGIES = Object.freeze(Object.values(CORE_METHOD_DESCRIPTORS).map((method) => descriptor({
  strategyId: method.methodId.replace(/^method:/u, 'strategy:'),
  version: method.implementationVersion,
  stage: 'runtime.reason.execute',
  inputTypes: method.inputTypes.map((type) => `type:${type}`),
  outputTypes: method.outputTypes.map((type) => `type:${type}`),
  preconditions: method.preconditions.map((precondition) => `precondition:${precondition}`),
  epistemicRole: 'answer-candidate',
  confidenceKind: 'confidence:method-applicability',
  costModel: `cost:${method.costModel}`,
  budgetKeys: ['budget:reasoning-work'],
  witnessKind: `witness:${method.proofKind}`,
  correlationGroup: `correlation:${method.methodId.replaceAll(':', '-')}`,
  implementationState: ADAPTER_LOCAL_UNGATED_METHODS.has(method.methodId)
    ? 'planned' : 'instrumented-local',
})));

const BOUNDARY_STRATEGIES = Object.freeze([
  descriptor({
    strategyId: 'strategy:language:direct-controlled-parser',
    stage: 'runtime.language.interpret',
    inputTypes: ['type:bounded-language-surface'],
    outputTypes: ['type:semantic-ir'],
    preconditions: ['precondition:valid-session-context'],
    epistemicRole: 'interpretation-proposal',
    confidenceKind: 'confidence:direct-parse-acceptance',
    costModel: 'cost:bounded-parser-execution',
    budgetKeys: ['budget:heuristic-tokens'],
    witnessKind: 'witness:normalized-input-and-semantic-ir',
    correlationGroup: 'correlation:language:direct-parser',
    implementationState: 'instrumented-local',
  }),
  descriptor({
    strategyId: 'strategy:retrieval:bounded-provider-frontier',
    stage: 'runtime.knowledge.retrieve',
    inputTypes: ['type:typed-query-focus', 'type:selected-kb-scope'],
    outputTypes: ['type:bounded-evidence-frontier'],
    preconditions: ['precondition:registered-provider-or-core-index'],
    epistemicRole: 'retrieval-focus',
    confidenceKind: 'confidence:frontier-coverage',
    costModel: 'cost:bounded-index-and-provider-lookups',
    budgetKeys: ['budget:grounding-lookups', 'budget:grounding-candidates'],
    witnessKind: 'witness:per-source-search-receipts',
    correlationGroup: 'correlation:retrieval:frontier',
    implementationState: 'instrumented-local',
  }),
  descriptor({
    strategyId: 'strategy:method:capability-planner',
    stage: 'runtime.method.plan',
    inputTypes: ['type:task-frame', 'type:method-descriptor-inventory'],
    outputTypes: ['type:capability-aware-plan'],
    preconditions: ['precondition:typed-task-goal'],
    epistemicRole: 'method-candidate',
    confidenceKind: 'confidence:method-applicability',
    costModel: 'cost:bounded-capability-filter',
    budgetKeys: ['budget:reasoning-work'],
    witnessKind: 'witness:considered-methods-and-preconditions',
    correlationGroup: 'correlation:method:capability-planner',
    implementationState: 'instrumented-local',
  }),
  descriptor({
    strategyId: 'strategy:verification:declared-witness-contract',
    stage: 'runtime.result.verify',
    inputTypes: ['type:method-result', 'type:declared-witness'],
    outputTypes: ['type:verification-decision'],
    preconditions: ['precondition:method-specific-verifier-available'],
    epistemicRole: 'answer-verifier',
    confidenceKind: 'confidence:verification-decision',
    costModel: 'cost:method-specific-bounded-verification',
    budgetKeys: ['budget:reasoning-work'],
    witnessKind: 'witness:verification-receipt',
    answerAuthority: 'verified-only',
    correlationGroup: 'correlation:verification:declared-witness',
    implementationState: 'planned',
  }),
  descriptor({
    strategyId: 'strategy:grounding:bounded-related-evidence',
    stage: 'runtime.failure.ground',
    inputTypes: ['type:eligible-inability', 'type:typed-query-focus'],
    outputTypes: ['type:non-answer-grounding-bundle'],
    preconditions: ['precondition:grounding-status-eligible'],
    epistemicRole: 'relevance-estimate',
    confidenceKind: 'confidence:related-evidence',
    costModel: 'cost:bounded-grounding-aggregation',
    budgetKeys: ['budget:grounding-lookups', 'budget:grounding-output-bytes'],
    witnessKind: 'witness:grounding-search-receipts',
    correlationGroup: 'correlation:grounding:related-evidence',
    implementationState: 'instrumented-local',
  }),
]);

export const BUILTIN_STRATEGY_CATALOG = Object.freeze({
  format: 'eslm-builtin-strategy-catalog-v1',
  requestPatternCatalogVersion: HEURISTIC_REQUEST_PATTERN_CATALOG.version,
  strategies: Object.freeze([
    ...LANGUAGE_APPROXIMATION_STRATEGIES,
    ...REQUEST_STRATEGIES,
    ...KNOWLEDGE_ACQUISITION_STRATEGIES,
    ...QUERY_FOCUS_STRATEGIES,
    ...RETRIEVAL_RANKING_STRATEGIES,
    ...REASONING_STRATEGIES,
    ...RESULT_CONSTRUCTION_STRATEGIES,
    ...BOUNDARY_STRATEGIES,
  ]),
});

export function builtinStrategyDescriptors(stage) {
  return Object.freeze(BUILTIN_STRATEGY_CATALOG.strategies
    .filter((strategy) => stage === undefined || strategy.stage === stage)
    .toSorted((left, right) => left.stage.localeCompare(right.stage)
      || left.strategyId.localeCompare(right.strategyId)));
}
