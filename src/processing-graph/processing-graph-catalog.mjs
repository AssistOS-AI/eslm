import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import { strategyIdentity } from '../strategy/strategy-contract.mjs';
import {
  RUNTIME_PROCESSING_CIRCUITS, groundedResponseEdges, groundedResponseNodes,
} from './runtime-processing-graph.mjs';
export const PROCESSING_GRAPH_CATALOG_PROTOCOL = 'eslm-processing-graph-catalog-v1';
const strategyRows = builtinStrategyDescriptors();
const strategyIds = (predicate) => strategyRows.filter(predicate).map(strategyIdentity).toSorted();
const STRATEGY_FAMILIES = Object.freeze([
  ['family:strategy:language-approximation', strategyIds((item) =>
    item.stage === 'runtime.language.interpret' && item.implementationState === 'coordinated')],
  ['family:strategy:knowledge-focus', strategyIds((item) => item.stage === 'runtime.knowledge.focus')],
  ['family:strategy:evidence-relevance', strategyIds((item) => item.stage === 'runtime.evidence.assess')],
  ['family:strategy:reasoning-methods', strategyIds((item) => item.stage === 'runtime.reason.execute')],
  ['family:strategy:result-construction', strategyIds((item) => item.stage === 'runtime.result.construct')],
  ['family:strategy:compiler-extraction', strategyIds((item) => item.stage === 'compiler.knowledge.extract')],
].map(([familyId, members]) => Object.freeze({ familyId, members: Object.freeze(members) })));
const CIRCUITS = Object.freeze([
  ['circuit:eslm:processing-graph', null, 'ESLM processing graph', 'All inspectable runtime, compiler, and research planes.'],
  ...RUNTIME_PROCESSING_CIRCUITS,
  ['circuit:compiler:knowledge-build', 'circuit:eslm:processing-graph', 'Knowledge build', 'Frozen source to immutable declarative package.'],
  ['circuit:compiler:source-understanding', 'circuit:compiler:knowledge-build', 'Source understanding', 'Rights, decoding, segmentation, and untrusted extraction.'],
  ['circuit:compiler:record-formation', 'circuit:compiler:knowledge-build', 'Record formation', 'Identity, standardization, validation, and promotion.'],
  ['circuit:compiler:package-release', 'circuit:compiler:knowledge-build', 'Package release', 'Compilation, equivalence, and immutable package output.'],
  ['circuit:research:graph-discovery', 'circuit:eslm:processing-graph', 'Graph discovery research', 'Inert evidence to non-executable graph hypotheses.'],
  ['circuit:research:evidence-projection', 'circuit:research:graph-discovery', 'Research projection', 'Rights-visible episodes and source-neutral structural features.'],
  ['circuit:research:hypothesis-discovery', 'circuit:research:graph-discovery', 'Hypothesis discovery', 'Correlated techniques propose graph changes under finite work.'],
  ['circuit:research:promotion-boundary', 'circuit:research:graph-discovery', 'Research promotion boundary', 'Neutrality, transfer, and manual promotion handoff.'],
].map(([circuitId, parentCircuitId, label, role]) =>
  Object.freeze({ circuitId, parentCircuitId, label, role })));
const P = (name) => `packet:${name}-v1`;
const R = (name) => `resource:${name}`;
function node(nodeId, label, circuitId, kind, stageRef, role, {
  inputs = [], outputs = [], authority = 'none', state = 'instrumented-local', owner,
  strategies = [], families = [], resources = [], canVote = false, answerAuthority = 'none',
} = {}) {
  return {
    nodeId, label, circuitId, kind, stageRef, role,
    inputPacketTypes: inputs,
    outputPacketTypes: outputs,
    authority,
    implementationState: state,
    ownerModule: owner,
    strategyRefs: strategies,
    strategyFamilyRefs: families,
    resourceDimensions: resources,
    canVote,
    answerAuthority,
  };
}

const RUNTIME_NODES = [
  node('node:runtime:request-ingress', 'Request ingress', 'circuit:runtime:ingress-language', 'source',
    'runtime.language.interpret', 'Bounds one request and assigns no semantic authority.', {
      outputs: [P('runtime:bounded-request')], owner: 'src/runtime/runtime.mjs', resources: [R('input-bytes')],
    }),
  node('node:runtime:session-snapshot', 'Session snapshot', 'circuit:runtime:request-session', 'process', null,
    'Freezes the incoming session so recovery and requests can roll back tentative effects.', {
      inputs: [P('runtime:bounded-request')], outputs: [P('runtime:request-session-snapshot')],
      authority: 'session-state', owner: 'src/language/session.mjs', resources: [R('session-items')],
    }),
  node('node:runtime:work-policy-gate', 'Work policy gate', 'circuit:runtime:request-session', 'authority-gate', null,
    'Validates finite work and reserves mandatory parser, safety, verification, and result work.', {
      inputs: [P('runtime:request-session-snapshot')], outputs: [P('runtime:resource-reservation-ledger')],
      authority: 'work-policy', owner: 'src/runtime/work-policy.mjs', resources: [R('resource-reservations')],
    }),
  node('node:runtime:english-likelihood-gate', 'English likelihood gate', 'circuit:runtime:language-direct',
    'authority-gate', 'runtime.language.interpret', 'Rejects likely non-English input locally without translating.', {
      inputs: [P('runtime:resource-reservation-ledger')],
      outputs: [P('runtime:language-assessment'), P('runtime:language-rejection')],
      authority: 'interpretation-selection', owner: 'src/runtime/english-language-gate-runtime.mjs',
      resources: [R('input-bytes'), R('tokens')],
    }),
  node('node:runtime:direct-parser-gate', 'Direct parser gate', 'circuit:runtime:language-direct', 'authority-gate',
    'runtime.language.interpret', 'Parses English through the unchanged controlled-language semantic authority.', {
      inputs: [P('runtime:language-assessment')], outputs: [P('runtime:direct-diagnostic')],
      authority: 'interpretation-selection', owner: 'src/language/parser.mjs',
      strategies: ['strategy:language:direct-controlled-parser@1'], resources: [R('tokens')],
    }),
  node('node:runtime:request-force-gate', 'Request force gate', 'circuit:runtime:request-session', 'authority-gate',
    'runtime.request.plan', 'Separates explicit requests from accidental assertion parses.', {
      inputs: [P('runtime:direct-diagnostic')], outputs: [P('runtime:request-force-decision')],
      authority: 'plan-selection', owner: 'src/language/heuristic-request-force.mjs', resources: [R('tokens')],
    }),
  node('node:runtime:language-proposal-coordinator', 'Language proposal coordinator',
    'circuit:runtime:language-recovery', 'coordinator', 'runtime.language.interpret',
    'Runs the 24 sealed local proposal families and records correlated interpretation support.', {
      inputs: [P('runtime:request-force-decision')],
      outputs: [P('runtime:language-proposal-batch'), P('runtime:language-vote-ledger')],
      state: 'coordinated', owner: 'src/language/heuristic-cnl-strategy-stage.mjs',
      families: ['family:strategy:language-approximation'], resources: [R('candidates'), R('votes'), R('receipt-bytes')],
      canVote: true,
    }),
  node('node:runtime:semantic-preservation-gate', 'Semantic preservation gate',
    'circuit:runtime:language-recovery', 'authority-gate', 'runtime.language.interpret',
    'Fails closed when a proposal loses protected operators, roles, spans, or open-class content.', {
      inputs: [P('runtime:language-proposal-batch')], outputs: [P('runtime:semantic-preservation-decision')],
      authority: 'interpretation-selection', owner: 'src/language/heuristic-cnl-protection.mjs',
      resources: [R('candidates'), R('tokens')],
    }),
  node('node:runtime:parse-only-reparse-gate', 'Parse-only reparse gate', 'circuit:runtime:language-recovery',
    'authority-gate', 'runtime.language.interpret', 'Reparses accepted candidates without KB, proof, or answer evidence.', {
      inputs: [P('runtime:semantic-preservation-decision')], outputs: [P('runtime:reparse-result')],
      authority: 'interpretation-selection', owner: 'src/runtime/heuristic-language-inspection-gate.mjs',
      resources: [R('reparses'), R('tokens')],
    }),
  node('node:runtime:interpretation-arbiter', 'Interpretation arbiter', 'circuit:runtime:language-recovery',
    'coordinator', 'runtime.language.interpret', 'Selects or preserves ambiguity from direct and accepted Semantic IR.', {
      inputs: [P('runtime:direct-diagnostic'), P('runtime:language-vote-ledger'), P('runtime:reparse-result')],
      outputs: [P('runtime:interpretation-decision')], authority: 'interpretation-selection',
      owner: 'src/runtime/heuristic-language-arbitration.mjs', resources: [R('candidates'), R('votes')], canVote: true,
    }),
  node('node:runtime:request-plan-coordinator', 'Request plan coordinator', 'circuit:runtime:request-session',
    'coordinator', 'runtime.request.plan', 'Builds ordered output obligations without granting factual authority.', {
      inputs: [P('runtime:request-force-decision')], outputs: [P('runtime:request-plan')],
      authority: 'plan-selection', owner: 'src/runtime/heuristic-request-processing-node.mjs',
      strategies: ['strategy:request:reviewed-pattern-ensemble@1'], resources: [R('tokens'), R('graph-nodes')],
      canVote: true,
    }),
  node('node:runtime:session-effect-gate', 'Session effect gate', 'circuit:runtime:request-session', 'authority-gate',
    'runtime.request.plan', 'Chooses direct commit eligibility or query-local rollback before downstream work.', {
      inputs: [P('runtime:interpretation-decision'), P('runtime:request-plan')], outputs: [P('runtime:task-frame')],
      authority: 'session-state', owner: 'src/runtime/heuristic-query-local-execution.mjs',
      resources: [R('session-items')],
    }),
  node('node:runtime:knowledge-focus-coordinator', 'Knowledge focus coordinator',
    'circuit:runtime:knowledge-routing', 'coordinator', 'runtime.knowledge.focus',
    'Ranks entity, predicate, phrase, role, and metalinguistic focus without answer authority.', {
      inputs: [P('runtime:task-frame')], outputs: [P('runtime:query-focus')],
      owner: 'src/reasoning/grounding-query-focus.mjs', families: ['family:strategy:knowledge-focus'],
      resources: [R('tokens'), R('candidates')], canVote: true,
    }),
  node('node:runtime:package-scope-gate', 'Package scope gate', 'circuit:runtime:knowledge-routing', 'authority-gate',
    'runtime.knowledge.retrieve', 'Resolves exact host-selected package identities; data cannot register code.', {
      inputs: [P('runtime:query-focus')], outputs: [P('runtime:package-scope')], authority: 'routing-scope',
      owner: 'src/kb/catalog.mjs', resources: [R('shards')],
    }),
  node('node:runtime:exact-route-planner', 'Exact route planner', 'circuit:runtime:knowledge-routing', 'process',
    'runtime.knowledge.retrieve', 'Builds conservative exact shard routes without relevance-only exclusion.', {
      inputs: [P('runtime:package-scope')], outputs: [P('runtime:routing-plan')],
      owner: 'src/kb/projection.mjs', resources: [R('lookups'), R('shards')],
    }),
  node('node:runtime:evidence-frontier-retriever', 'Evidence frontier retriever',
    'circuit:runtime:knowledge-routing', 'process', 'runtime.knowledge.retrieve',
    'Retrieves a bounded provenance-bearing frontier and per-source search receipts.', {
      inputs: [P('runtime:routing-plan')], outputs: [P('runtime:evidence-frontier')],
      owner: 'src/reasoning/grounding-retrieval.mjs',
      strategies: ['strategy:retrieval:bounded-provider-frontier@1'],
      resources: [R('lookups'), R('postings'), R('evidence-items')],
    }),
  node('node:runtime:frontier-completeness-gate', 'Frontier completeness gate',
    'circuit:runtime:knowledge-routing', 'authority-gate', 'runtime.knowledge.retrieve',
    'Prevents cache misses or truncated routes from becoming logical absence.', {
      inputs: [P('runtime:evidence-frontier')], outputs: [P('runtime:frontier-completeness')],
      authority: 'routing-scope', owner: 'src/reasoning/grounding-search-receipt.mjs',
      resources: [R('evidence-items'), R('receipt-bytes')],
    }),
  node('node:runtime:evidence-assessment-coordinator', 'Evidence assessment coordinator',
    'circuit:runtime:evidence-ranking', 'coordinator', 'runtime.evidence.assess',
    'Combines correlated relevance features and preserves conflicts without authorizing answers.', {
      inputs: [P('runtime:frontier-completeness')], outputs: [P('runtime:assessed-evidence')],
      owner: 'src/reasoning/grounding-relevance-estimator.mjs', families: ['family:strategy:evidence-relevance'],
      resources: [R('evidence-items'), R('votes'), R('comparisons')], canVote: true,
    }),
  node('node:runtime:evidence-admission-gate', 'Evidence admission gate', 'circuit:runtime:evidence-ranking',
    'authority-gate', 'runtime.evidence.assess', 'Admits typed, provenance-bearing premises without converting relevance to truth.', {
      inputs: [P('runtime:assessed-evidence')], outputs: [P('runtime:evidence-admission')],
      authority: 'evidence-admission', owner: 'src/runtime/core-grounding.mjs',
      resources: [R('evidence-items'), R('receipt-bytes')],
    }),
  node('node:runtime:method-plan-coordinator', 'Method plan coordinator', 'circuit:runtime:method-selection',
    'coordinator', 'runtime.method.plan', 'Matches task capabilities to reviewed method descriptors and finite costs.', {
      inputs: [P('runtime:evidence-admission')], outputs: [P('runtime:method-plan')], authority: 'plan-selection',
      owner: 'src/runtime/ordinary-reasoning-processing-nodes.mjs',
      strategies: ['strategy:method:capability-planner@1'], resources: [R('graph-nodes')], canVote: true,
    }),
  node('node:runtime:method-executor', 'Method executor', 'circuit:runtime:method-selection', 'process',
    'runtime.reason.execute', 'Executes one declared DS015 semantic method and returns values, gaps, and a witness.', {
      inputs: [P('runtime:method-plan')], outputs: [P('runtime:method-result')],
      owner: 'src/runtime/typed-task-execution.mjs', families: ['family:strategy:reasoning-methods'],
      resources: [R('facts'), R('rule-joins'), R('solver-nodes'), R('proof-bytes')],
    }),
  node('node:runtime:witness-verification-gate', 'Witness verification gate',
    'circuit:runtime:witness-authority', 'authority-gate', 'runtime.result.verify',
    'Independently replays the declared witness before any strict answer is authorized.', {
      inputs: [P('runtime:method-result')], outputs: [P('runtime:verification-decision')],
      authority: 'witness-verification', owner: 'src/runtime/ordinary-reasoning-witness-verifier.mjs',
      strategies: ['strategy:verification:declared-witness-contract@1'], resources: [R('proof-bytes'), R('facts')],
      answerAuthority: 'verified-only',
    }),
  node('node:runtime:failure-eligibility-gate', 'Failure eligibility gate', 'circuit:runtime:failure-result',
    'authority-gate', 'runtime.failure.ground', 'Decides whether an inability may spend a separately reserved grounding budget.', {
      inputs: [P('runtime:inability')], outputs: [P('runtime:failure-eligibility')],
      authority: 'failure-eligibility', owner: 'src/runtime/result-grounding-contract.mjs',
      resources: [R('resource-reservations')],
    }),
  node('node:runtime:failure-grounder', 'Failure grounder', 'circuit:runtime:failure-result', 'process',
    'runtime.failure.ground', 'Attaches bounded related evidence with answerSupported false and no proof effect.', {
      inputs: [P('runtime:failure-eligibility')], outputs: [P('runtime:grounding-bundle')],
      owner: 'src/runtime/grounding-aggregation.mjs',
      strategies: ['strategy:grounding:bounded-related-evidence@1'],
      resources: [R('lookups'), R('evidence-items'), R('output-bytes')],
    }),
  ...groundedResponseNodes(node),
  node('node:runtime:result-schema-gate', 'Result schema gate', 'circuit:runtime:failure-result', 'authority-gate',
    'runtime.result.construct', 'Validates the closed runtime-result schema, provenance, and support boundary.', {
      inputs: [P('runtime:construction-candidate')],
      outputs: [P('runtime:result-validation'), P('runtime:result-validation-failure')],
      authority: 'result-validation', owner: 'src/runtime/result-contract.mjs', resources: [R('output-bytes')],
    }),
  node('node:runtime:session-commit-gate', 'Session commit gate', 'circuit:runtime:failure-result', 'authority-gate',
    'runtime.result.construct', 'Commits only directly accepted session effects and preserves query-local rollback.', {
      inputs: [P('runtime:result-validation')], outputs: [P('runtime:session-commit-decision')],
      authority: 'session-state', owner: 'src/language/session.mjs', resources: [R('session-items')],
    }),
  node('node:runtime:result-sink', 'Runtime result sink', 'circuit:runtime:failure-result', 'sink',
    'runtime.result.construct', 'Emits the validated runtime result or a bounded internal validation failure.', {
      inputs: [P('runtime:session-commit-decision'), P('runtime:result-validation-failure')],
      outputs: [P('runtime:runtime-result')], owner: 'src/runtime/runtime.mjs', resources: [R('output-bytes')],
    }),
];

const COMPILER_NODES = [
  node('node:compiler:frozen-source-ingress', 'Frozen source ingress', 'circuit:compiler:source-understanding',
    'source', 'compiler.source.decode', 'Accepts only a frozen source identity and declared decoder profile.', {
      outputs: [P('compiler:frozen-source')], owner: 'src/kb/compiler.mjs', resources: [R('source-bytes')],
    }),
  node('node:compiler:source-rights-gate', 'Source rights gate', 'circuit:compiler:source-understanding',
    'authority-gate', 'compiler.source.decode', 'Rejects source components without frozen identity and authorized use.', {
      inputs: [P('compiler:frozen-source')], outputs: [P('compiler:source-authorization')],
      authority: 'source-rights', state: 'planned', owner: 'docs/specs/DS016-source-identity-license-and-access.md',
      resources: [R('source-bytes')],
    }),
  node('node:compiler:source-decoder', 'Source decoder', 'circuit:compiler:source-understanding', 'process',
    'compiler.source.decode', 'Decodes addressable bytes and records loss or repair without executing source content.', {
      inputs: [P('compiler:source-authorization')], outputs: [P('compiler:decoded-source')], state: 'planned',
      owner: 'docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md',
      resources: [R('source-bytes'), R('decoded-bytes')],
    }),
  node('node:compiler:source-segmenter', 'Source segmenter', 'circuit:compiler:source-understanding', 'process',
    'compiler.source.segment', 'Produces hierarchy, spans, tables, lists, formulas, and unresolved layout.', {
      inputs: [P('compiler:decoded-source')], outputs: [P('compiler:source-segments')], state: 'planned',
      owner: 'docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md',
      resources: [R('segments'), R('spans')],
    }),
  node('node:compiler:knowledge-extraction-coordinator', 'Knowledge extraction coordinator',
    'circuit:compiler:source-understanding', 'coordinator', 'compiler.knowledge.extract',
    'Coordinates source-family proposals while retaining untrusted candidate status.', {
      inputs: [P('compiler:source-segments')], outputs: [P('compiler:record-candidate-batch')], state: 'planned',
      owner: 'docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md',
      families: ['family:strategy:compiler-extraction'], resources: [R('records'), R('spans'), R('votes')], canVote: true,
    }),
  node('node:compiler:identity-resolution-coordinator', 'Identity resolution coordinator',
    'circuit:compiler:record-formation', 'coordinator', 'compiler.identity.resolve',
    'Preserves retained identities, alternatives, and explicit equivalence proposals.', {
      inputs: [P('compiler:record-candidate-batch')], outputs: [P('compiler:identity-resolution')], state: 'planned',
      owner: 'docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md',
      resources: [R('records'), R('comparisons')], canVote: true,
    }),
  node('node:compiler:record-standardizer', 'Record standardizer', 'circuit:compiler:record-formation', 'process',
    'compiler.record.standardize', 'Maps typed source candidates into DS005 canonical candidate shapes.', {
      inputs: [P('compiler:identity-resolution')], outputs: [P('compiler:canonical-record-batch')],
      owner: 'src/kb/projection.mjs', resources: [R('records')],
    }),
  node('node:compiler:canonical-record-gate', 'Canonical record gate', 'circuit:compiler:record-formation',
    'authority-gate', 'compiler.record.validate', 'Validates schema, references, provenance, rule safety, and coverage.', {
      inputs: [P('compiler:canonical-record-batch')], outputs: [P('compiler:record-validation')],
      authority: 'record-validation', owner: 'src/kb/schema.mjs', resources: [R('records'), R('graph-edges')],
    }),
  node('node:compiler:promotion-gate', 'Promotion gate', 'circuit:compiler:record-formation', 'authority-gate', null,
    'Requires an explicit reviewed decision; extraction confidence cannot promote records.', {
      inputs: [P('compiler:record-validation')], outputs: [P('compiler:promotion-decision')],
      authority: 'promotion', state: 'planned',
      owner: 'docs/specs/DS004-knowledge-and-benchmark-learning.md', resources: [R('records')],
    }),
  node('node:compiler:package-compiler', 'Package compiler', 'circuit:compiler:package-release', 'process',
    'compiler.package.compile', 'Compiles promoted inert records into deterministic indexes and immutable bytes.', {
      inputs: [P('compiler:promotion-decision')], outputs: [P('compiler:package-candidate')],
      owner: 'src/kb/compiler.mjs', resources: [R('records'), R('shards'), R('output-bytes')],
    }),
  node('node:compiler:package-equivalence-gate', 'Package equivalence gate', 'circuit:compiler:package-release',
    'authority-gate', 'compiler.package.compile', 'Checks hashes, reference closure, and canonical-to-compiled equivalence.', {
      inputs: [P('compiler:package-candidate')], outputs: [P('compiler:package-validation')],
      authority: 'package-validation', owner: 'src/kb/package.mjs', resources: [R('records'), R('shards')],
    }),
  node('node:compiler:package-sink', 'Immutable package sink', 'circuit:compiler:package-release', 'sink',
    'compiler.package.compile', 'Publishes only a validated immutable declarative package or an explicit build gap.', {
      inputs: [P('compiler:package-validation'), P('compiler:build-gap')],
      outputs: [P('compiler:immutable-package')], owner: 'src/kb/package.mjs', resources: [R('output-bytes')],
    }),
];

const RESEARCH_NODES = [
  node('node:research:episode-source', 'Research episode source', 'circuit:research:evidence-projection', 'source', null,
    'Streams inert source-registry entries and bounded research episodes; actions never execute.', {
      outputs: [P('research:source-status'), P('research:episode-batch')],
      owner: 'src/research/research-source-registry.mjs', resources: [R('source-bytes'), R('source-rows')],
    }),
  node('node:research:rights-visibility-gate', 'Rights and visibility gate',
    'circuit:research:evidence-projection', 'authority-gate', null,
    'Admits only rights-cleared training-visible components and preserves protected split isolation.', {
      inputs: [P('research:source-status'), P('research:episode-batch')],
      outputs: [P('research:authorized-episode-batch')], authority: 'research-visibility',
      owner: 'src/research/research-source-registry.mjs', resources: [R('source-rows')],
    }),
  node('node:research:episode-projector', 'Episode projector', 'circuit:research:evidence-projection', 'process', null,
    'Normalizes requests, states, observations, inert actions, feedback, losses, and provenance.', {
      inputs: [P('research:authorized-episode-batch')], outputs: [P('research:projected-episode-batch')],
      owner: 'src/research/research-episode-contract.mjs', resources: [R('source-rows'), R('graph-edges')],
    }),
  node('node:research:structural-feature-projector', 'Structural feature projector',
    'circuit:research:evidence-projection', 'process', null,
    'Removes lexical/source identities from discovery features while retaining audit digests.', {
      inputs: [P('research:projected-episode-batch')], outputs: [P('research:structural-feature-batch')],
      owner: 'src/research/research-episode-features.mjs', resources: [R('graph-nodes'), R('graph-edges')],
    }),
  node('node:research:hypothesis-coordinator', 'Hypothesis coordinator',
    'circuit:research:hypothesis-discovery', 'coordinator', null,
    'Runs correlation-grouped discovery techniques from probe through bounded scale and emits hypotheses only.', {
      inputs: [P('research:structural-feature-batch')],
      outputs: [P('research:hypothesis-batch'), P('research:scale-progress-receipt')],
      owner: 'src/research/processing-graph-research-analyzer.mjs',
      resources: [R('source-rows'), R('comparisons'), R('hypotheses'), R('votes')], canVote: true,
    }),
  node('node:research:source-neutrality-gate', 'Source-neutrality gate',
    'circuit:research:promotion-boundary', 'authority-gate', null,
    'Rejects hypotheses that depend on identifiers, answers, source order, or one vocabulary.', {
      inputs: [P('research:hypothesis-batch')], outputs: [P('research:neutrality-decision')],
      authority: 'hypothesis-review', owner: 'src/research/processing-graph-research-analysis-contract.mjs',
      resources: [R('hypotheses'), R('comparisons')],
    }),
  node('node:research:cross-source-transfer-gate', 'Cross-source transfer gate',
    'circuit:research:promotion-boundary', 'authority-gate', null,
    'Requires a distinct protected source lineage before a hypothesis may reach promotion review.', {
      inputs: [P('research:neutrality-decision')], outputs: [P('research:transfer-decision')],
      authority: 'hypothesis-review', state: 'planned',
      owner: 'docs/specs/DS028-dataset-guided-processing-graph-discovery-research.md',
      resources: [R('hypotheses'), R('source-rows')],
    }),
  node('node:research:promotion-proposal-sink', 'Promotion proposal sink',
    'circuit:research:promotion-boundary', 'sink', null,
    'Emits a non-executable manual-review handoff plus complete scale and omission receipts.', {
      inputs: [P('research:transfer-decision'), P('research:scale-progress-receipt'), P('research:research-gap')],
      outputs: [P('research:promotion-proposal')], authority: 'none',
      owner: 'src/research/processing-graph-research-analyzer.mjs', resources: [R('receipt-bytes')],
    }),
];

function edge(edgeId, from, to, kind, packetType, condition) {
  return { edgeId, from, to, kind, packetType, condition };
}

const RUNTIME_EDGES = [
  edge('edge:runtime:ingress-snapshot', 'node:runtime:request-ingress', 'node:runtime:session-snapshot', 'data', P('runtime:bounded-request'), 'request-bounded'),
  edge('edge:runtime:snapshot-work', 'node:runtime:session-snapshot', 'node:runtime:work-policy-gate', 'data', P('runtime:request-session-snapshot'), 'session-frozen'),
  edge('edge:runtime:snapshot-session-rollback', 'node:runtime:session-snapshot', 'node:runtime:session-effect-gate', 'rollback', P('runtime:request-session-snapshot'), 'explicit-request-plan-selected'),
  edge('edge:runtime:work-language', 'node:runtime:work-policy-gate', 'node:runtime:english-likelihood-gate', 'resource', P('runtime:resource-reservation-ledger'), 'work-valid'),
  edge('edge:runtime:language-direct', 'node:runtime:english-likelihood-gate', 'node:runtime:direct-parser-gate', 'authority', P('runtime:language-assessment'), 'likely-english-or-indeterminate'),
  edge('edge:runtime:language-rejected', 'node:runtime:english-likelihood-gate', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'likely-non-english'),
  edge('edge:runtime:parser-request-force', 'node:runtime:direct-parser-gate', 'node:runtime:request-force-gate', 'data', P('runtime:direct-diagnostic'), 'direct-attempt-complete'),
  edge('edge:runtime:request-force-plan', 'node:runtime:request-force-gate', 'node:runtime:request-plan-coordinator', 'control', P('runtime:request-force-decision'), 'explicit-request'),
  edge('edge:runtime:request-force-recovery', 'node:runtime:request-force-gate', 'node:runtime:language-proposal-coordinator', 'control', P('runtime:request-force-decision'), 'language-recovery-eligible'),
  edge('edge:runtime:request-force-direct', 'node:runtime:request-force-gate', 'node:runtime:interpretation-arbiter', 'data', P('runtime:direct-diagnostic'), 'direct-interpretation-retained'),
  edge('edge:runtime:proposal-preservation', 'node:runtime:language-proposal-coordinator', 'node:runtime:semantic-preservation-gate', 'data', P('runtime:language-proposal-batch'), 'proposals-emitted'),
  edge('edge:runtime:proposal-votes', 'node:runtime:language-proposal-coordinator', 'node:runtime:interpretation-arbiter', 'data', P('runtime:language-vote-ledger'), 'votes-recorded'),
  edge('edge:runtime:preservation-reparse', 'node:runtime:semantic-preservation-gate', 'node:runtime:parse-only-reparse-gate', 'authority', P('runtime:semantic-preservation-decision'), 'candidate-preserved'),
  edge('edge:runtime:preservation-failed', 'node:runtime:semantic-preservation-gate', 'node:runtime:interpretation-arbiter', 'exception', P('runtime:semantic-preservation-decision'), 'candidate-rejected'),
  edge('edge:runtime:reparse-arbiter', 'node:runtime:parse-only-reparse-gate', 'node:runtime:interpretation-arbiter', 'authority', P('runtime:reparse-result'), 'reparse-complete'),
  edge('edge:runtime:arbiter-session', 'node:runtime:interpretation-arbiter', 'node:runtime:session-effect-gate', 'data', P('runtime:interpretation-decision'), 'interpretation-selected-or-ambiguous'),
  edge('edge:runtime:request-plan-session', 'node:runtime:request-plan-coordinator', 'node:runtime:session-effect-gate', 'data', P('runtime:request-plan'), 'request-plan-selected'),
  edge('edge:runtime:session-focus', 'node:runtime:session-effect-gate', 'node:runtime:knowledge-focus-coordinator', 'data', P('runtime:task-frame'), 'task-frame-available'),
  edge('edge:runtime:focus-scope', 'node:runtime:knowledge-focus-coordinator', 'node:runtime:package-scope-gate', 'data', P('runtime:query-focus'), 'focus-complete'),
  edge('edge:runtime:scope-route', 'node:runtime:package-scope-gate', 'node:runtime:exact-route-planner', 'authority', P('runtime:package-scope'), 'package-scope-valid'),
  edge('edge:runtime:scope-gap', 'node:runtime:package-scope-gate', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'package-scope-invalid-or-empty'),
  edge('edge:runtime:route-retrieve', 'node:runtime:exact-route-planner', 'node:runtime:evidence-frontier-retriever', 'data', P('runtime:routing-plan'), 'route-available'),
  edge('edge:runtime:retrieve-completeness', 'node:runtime:evidence-frontier-retriever', 'node:runtime:frontier-completeness-gate', 'data', P('runtime:evidence-frontier'), 'frontier-returned'),
  edge('edge:runtime:completeness-assess', 'node:runtime:frontier-completeness-gate', 'node:runtime:evidence-assessment-coordinator', 'authority', P('runtime:frontier-completeness'), 'frontier-receipt-valid'),
  edge('edge:runtime:completeness-gap', 'node:runtime:frontier-completeness-gate', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'mandatory-retrieval-work-failed'),
  edge('edge:runtime:assess-admit', 'node:runtime:evidence-assessment-coordinator', 'node:runtime:evidence-admission-gate', 'data', P('runtime:assessed-evidence'), 'ranking-complete'),
  edge('edge:runtime:admit-plan', 'node:runtime:evidence-admission-gate', 'node:runtime:method-plan-coordinator', 'authority', P('runtime:evidence-admission'), 'evidence-admitted'),
  edge('edge:runtime:admission-gap', 'node:runtime:evidence-admission-gate', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'evidence-invalid-or-missing'),
  edge('edge:runtime:plan-execute', 'node:runtime:method-plan-coordinator', 'node:runtime:method-executor', 'control', P('runtime:method-plan'), 'applicable-method-selected'),
  edge('edge:runtime:plan-gap', 'node:runtime:method-plan-coordinator', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'no-applicable-method'),
  edge('edge:runtime:execute-verify', 'node:runtime:method-executor', 'node:runtime:witness-verification-gate', 'data', P('runtime:method-result'), 'method-result-returned'),
  edge('edge:runtime:execute-gap', 'node:runtime:method-executor', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'method-gap-or-resource-limit'),
  edge('edge:runtime:verified-construct', 'node:runtime:witness-verification-gate', 'node:runtime:result-construction-coordinator', 'authority', P('runtime:verification-decision'), 'witness-accepted'),
  edge('edge:runtime:verification-gap', 'node:runtime:witness-verification-gate', 'node:runtime:failure-eligibility-gate', 'exception', P('runtime:inability'), 'witness-rejected-or-incomplete'),
  edge('edge:runtime:failure-ground', 'node:runtime:failure-eligibility-gate', 'node:runtime:failure-grounder', 'authority', P('runtime:failure-eligibility'), 'grounding-eligible'),
  edge('edge:runtime:failure-construct', 'node:runtime:failure-eligibility-gate', 'node:runtime:result-construction-coordinator', 'control', P('runtime:failure-eligibility'), 'grounding-ineligible'),
  edge('edge:runtime:grounding-construct', 'node:runtime:failure-grounder', 'node:runtime:result-construction-coordinator', 'data', P('runtime:grounding-bundle'), 'grounding-complete-or-truncated'),
  ...groundedResponseEdges(edge),
  edge('edge:runtime:construct-schema', 'node:runtime:document-assembly-coordinator', 'node:runtime:result-schema-gate', 'data', P('runtime:construction-candidate'), 'candidate-constructed'),
  edge('edge:runtime:schema-commit', 'node:runtime:result-schema-gate', 'node:runtime:session-commit-gate', 'authority', P('runtime:result-validation'), 'result-valid'),
  edge('edge:runtime:schema-sink-failure', 'node:runtime:result-schema-gate', 'node:runtime:result-sink', 'exception', P('runtime:result-validation-failure'), 'result-invalid'),
  edge('edge:runtime:commit-sink', 'node:runtime:session-commit-gate', 'node:runtime:result-sink', 'authority', P('runtime:session-commit-decision'), 'commit-or-query-local-rollback-complete'),
];

const COMPILER_SEQUENCE = [
  ['frozen-source-ingress', 'source-rights-gate', 'compiler:frozen-source'],
  ['source-rights-gate', 'source-decoder', 'compiler:source-authorization'],
  ['source-decoder', 'source-segmenter', 'compiler:decoded-source'],
  ['source-segmenter', 'knowledge-extraction-coordinator', 'compiler:source-segments'],
  ['knowledge-extraction-coordinator', 'identity-resolution-coordinator', 'compiler:record-candidate-batch'],
  ['identity-resolution-coordinator', 'record-standardizer', 'compiler:identity-resolution'],
  ['record-standardizer', 'canonical-record-gate', 'compiler:canonical-record-batch'],
  ['canonical-record-gate', 'promotion-gate', 'compiler:record-validation'],
  ['promotion-gate', 'package-compiler', 'compiler:promotion-decision'],
  ['package-compiler', 'package-equivalence-gate', 'compiler:package-candidate'],
  ['package-equivalence-gate', 'package-sink', 'compiler:package-validation'],
].map(([from, to, packet], index) => edge(`edge:compiler:step-${String(index + 1).padStart(2, '0')}`,
  `node:compiler:${from}`, `node:compiler:${to}`, from.includes('gate') ? 'authority' : 'data',
  P(packet), 'predecessor-complete'));

const COMPILER_EXCEPTIONS = ['source-rights-gate', 'source-decoder', 'source-segmenter',
  'knowledge-extraction-coordinator', 'identity-resolution-coordinator', 'record-standardizer',
  'canonical-record-gate', 'promotion-gate', 'package-compiler', 'package-equivalence-gate']
  .map((from, index) => edge(`edge:compiler:gap-${String(index + 1).padStart(2, '0')}`,
    `node:compiler:${from}`, 'node:compiler:package-sink', 'exception', P('compiler:build-gap'),
    'stage-failed-or-incomplete'));

const RESEARCH_EDGES = [
  edge('edge:research:source-rights-status', 'node:research:episode-source', 'node:research:rights-visibility-gate', 'data', P('research:source-status'), 'source-status-frozen'),
  edge('edge:research:source-rights-episodes', 'node:research:episode-source', 'node:research:rights-visibility-gate', 'data', P('research:episode-batch'), 'episodes-streamed'),
  edge('edge:research:rights-project', 'node:research:rights-visibility-gate', 'node:research:episode-projector', 'authority', P('research:authorized-episode-batch'), 'training-visible-and-rights-cleared'),
  edge('edge:research:rights-gap', 'node:research:rights-visibility-gate', 'node:research:promotion-proposal-sink', 'exception', P('research:research-gap'), 'rights-or-visibility-rejected'),
  edge('edge:research:episode-features', 'node:research:episode-projector', 'node:research:structural-feature-projector', 'data', P('research:projected-episode-batch'), 'episode-projection-valid'),
  edge('edge:research:features-hypotheses', 'node:research:structural-feature-projector', 'node:research:hypothesis-coordinator', 'data', P('research:structural-feature-batch'), 'source-identifiers-excluded'),
  edge('edge:research:hypotheses-neutrality', 'node:research:hypothesis-coordinator', 'node:research:source-neutrality-gate', 'data', P('research:hypothesis-batch'), 'hypotheses-retained'),
  edge('edge:research:scale-receipt', 'node:research:hypothesis-coordinator', 'node:research:promotion-proposal-sink', 'resource', P('research:scale-progress-receipt'), 'probe-pilot-or-scale-accounted'),
  edge('edge:research:neutrality-transfer', 'node:research:source-neutrality-gate', 'node:research:cross-source-transfer-gate', 'authority', P('research:neutrality-decision'), 'source-neutrality-accepted'),
  edge('edge:research:neutrality-gap', 'node:research:source-neutrality-gate', 'node:research:promotion-proposal-sink', 'exception', P('research:research-gap'), 'source-neutrality-rejected'),
  edge('edge:research:transfer-promotion', 'node:research:cross-source-transfer-gate', 'node:research:promotion-proposal-sink', 'authority', P('research:transfer-decision'), 'protected-transfer-recorded'),
];

const edgeRows = [...RUNTIME_EDGES, ...COMPILER_SEQUENCE, ...COMPILER_EXCEPTIONS, ...RESEARCH_EDGES];
const nodeRows = [...RUNTIME_NODES, ...COMPILER_NODES, ...RESEARCH_NODES].map((item) => {
  const incoming = edgeRows.filter((edgeRow) => edgeRow.to === item.nodeId);
  const outgoing = edgeRows.filter((edgeRow) => edgeRow.from === item.nodeId);
  return Object.freeze({
    ...item,
    inputPacketTypes: Object.freeze([...new Set([
      ...item.inputPacketTypes, ...incoming.map((edgeRow) => edgeRow.packetType),
    ])].toSorted()),
    outputPacketTypes: Object.freeze([...new Set([
      ...item.outputPacketTypes,
      ...(item.kind === 'coordinator' ? [P('shared:coordinator-receipt')] : []),
      ...(item.canVote ? [P('shared:correlation-ledger')] : []),
      ...outgoing.map((edgeRow) => edgeRow.packetType),
    ])].toSorted()),
    strategyRefs: Object.freeze([...item.strategyRefs].toSorted()),
    strategyFamilyRefs: Object.freeze([...item.strategyFamilyRefs].toSorted()),
    resourceDimensions: Object.freeze([...item.resourceDimensions].toSorted()),
    normalEdges: Object.freeze(outgoing.filter((edgeRow) => edgeRow.kind !== 'exception')
      .map((edgeRow) => edgeRow.edgeId).toSorted()),
    exceptionalEdges: Object.freeze(outgoing.filter((edgeRow) => edgeRow.kind === 'exception')
      .map((edgeRow) => edgeRow.edgeId).toSorted()),
  });
});

export const PROCESSING_GRAPH_CATALOG = Object.freeze({
  format: PROCESSING_GRAPH_CATALOG_PROTOCOL,
  rootCircuitId: 'circuit:eslm:processing-graph',
  conventions: Object.freeze({
    oneRequestIsAcyclic: true,
    strategyRefsAreExactVersionedIdentities: true,
    authorityGatesVote: false,
    relevanceAndLanguageHaveAnswerAuthority: false,
    resourcesArePreallocatedAndReceipted: true,
    researchEvidenceIsInert: true,
  }),
  circuits: CIRCUITS,
  strategyFamilies: STRATEGY_FAMILIES,
  nodes: Object.freeze(nodeRows.toSorted((left, right) => left.nodeId.localeCompare(right.nodeId))),
  edges: Object.freeze(edgeRows.map(Object.freeze).toSorted((left, right) => left.edgeId.localeCompare(right.edgeId))),
  packetTypes: Object.freeze([...new Set(nodeRows.flatMap((item) =>
    [...item.inputPacketTypes, ...item.outputPacketTypes]))].toSorted()),
  resourceDimensions: Object.freeze([...new Set(nodeRows.flatMap((item) => item.resourceDimensions))].toSorted()),
});

export function processingGraphNode(nodeId) {
  return PROCESSING_GRAPH_CATALOG.nodes.find((item) => item.nodeId === nodeId);
}
export function processingGraphCircuit(circuitId) {
  return PROCESSING_GRAPH_CATALOG.circuits.find((item) => item.circuitId === circuitId);
}
