const P = (name) => `packet:${name}-v1`;
const R = (name) => `resource:${name}`;

export const RUNTIME_PROCESSING_CIRCUITS = Object.freeze([
  ['circuit:runtime:request-cycle', 'circuit:eslm:processing-graph', 'Runtime request cycle', 'One bounded runtime request expanded into an acyclic graph.'],
  ['circuit:runtime:ingress-language', 'circuit:runtime:request-cycle', 'Ingress and language', 'Bound input, assess language, and establish typed meaning.'],
  ['circuit:runtime:language-direct', 'circuit:runtime:ingress-language', 'Direct language path', 'English likelihood and direct parser authority.'],
  ['circuit:runtime:language-recovery', 'circuit:runtime:ingress-language', 'Language recovery path', 'Bounded alternatives, preservation, reparse, and selection.'],
  ['circuit:runtime:request-session', 'circuit:runtime:request-cycle', 'Request and session', 'Request force, obligations, work, rollback, and session effects.'],
  ['circuit:runtime:knowledge-evidence', 'circuit:runtime:request-cycle', 'Knowledge and evidence', 'Focus, exact routing, retrieval, relevance, and admission.'],
  ['circuit:runtime:knowledge-routing', 'circuit:runtime:knowledge-evidence', 'Knowledge routing', 'Package scope, exact routes, and bounded frontiers.'],
  ['circuit:runtime:evidence-ranking', 'circuit:runtime:knowledge-evidence', 'Evidence ranking', 'Non-authoritative relevance and authoritative evidence admission.'],
  ['circuit:runtime:reasoning-verification', 'circuit:runtime:request-cycle', 'Reasoning and verification', 'Method choice, execution, and independent witness checks.'],
  ['circuit:runtime:method-selection', 'circuit:runtime:reasoning-verification', 'Method selection', 'Capability-aware planning and bounded method execution.'],
  ['circuit:runtime:witness-authority', 'circuit:runtime:reasoning-verification', 'Witness authority', 'Independent, non-voting answer authorization.'],
  ['circuit:runtime:failure-result', 'circuit:runtime:request-cycle', 'Failure and result', 'Typed inability, optional grounding, construction, validation, and commit.'],
  ['circuit:runtime:grounded-response-construction', 'circuit:runtime:failure-result',
    'Grounded response construction',
    'Claim admission, rhetorical planning, sentence realization, and document assembly.'],
]);

export function groundedResponseNodes(node) {
  return [
    node('node:runtime:result-construction-coordinator', 'Result construction coordinator',
      'circuit:runtime:grounded-response-construction', 'coordinator', 'runtime.result.construct',
      'Freezes the output contract, eligible evidence, and per-strategy work order for response construction.', {
        inputs: [P('runtime:verification-decision'), P('runtime:grounding-bundle'), P('runtime:failure-eligibility')],
        outputs: [P('runtime:construction-work-order')], owner: 'src/runtime/heuristic-request-processing-node.mjs',
        resources: [R('output-bytes'), R('evidence-items'), R('resource-reservations')],
      }),
    node('node:runtime:claim-admission-gate', 'Claim admission gate',
      'circuit:runtime:grounded-response-construction', 'authority-gate', 'runtime.result.construct',
      'Admits only typed, provenance-bound claims and records every rejected or unsupported candidate.', {
        inputs: [P('runtime:construction-work-order')], outputs: [P('runtime:admitted-claim-ledger')],
        authority: 'claim-admission', owner: 'src/runtime/grounded-response-realization.mjs',
        resources: [R('evidence-items'), R('receipt-bytes')],
      }),
    node('node:runtime:rhetorical-plan-builder', 'Rhetorical plan builder',
      'circuit:runtime:grounded-response-construction', 'process', 'runtime.result.construct',
      'Turns output obligations and admitted claims into ordered sections without adding factual content.', {
        inputs: [P('runtime:admitted-claim-ledger')], outputs: [P('runtime:rhetorical-plan')],
        owner: 'src/runtime/grounded-response-realization.mjs',
        strategies: ['strategy:result:rhetorical-section-planner@1'],
        resources: [R('graph-nodes'), R('output-bytes')],
      }),
    node('node:runtime:sentence-realization-coordinator', 'Sentence realization coordinator',
      'circuit:runtime:grounded-response-construction', 'coordinator', 'runtime.result.construct',
      'Selects type-specific sentence strategies and preserves claim-to-evidence alignment and confidence.', {
        inputs: [P('runtime:admitted-claim-ledger'), P('runtime:rhetorical-plan')],
        outputs: [P('runtime:grounded-sentence-ledger')], owner: 'src/runtime/grounded-response-realization.mjs',
        strategies: [
          'strategy:result:defeasible-relation-sentence@1',
          'strategy:result:lexical-definition-sentence@1',
          'strategy:result:source-summary-sentence@1',
          'strategy:result:typed-fact-sentence@1',
        ],
        resources: [R('evidence-items'), R('output-bytes'), R('votes')], canVote: true,
      }),
    node('node:runtime:document-assembly-coordinator', 'Document assembly coordinator',
      'circuit:runtime:grounded-response-construction', 'coordinator', 'runtime.result.construct',
      'Chooses a discourse and output-format strategy, then assembles sentences, citations, and explicit gaps.', {
        inputs: [P('runtime:rhetorical-plan'), P('runtime:grounded-sentence-ledger')],
        outputs: [P('runtime:construction-candidate')], owner: 'src/runtime/grounded-response-realization.mjs',
        strategies: [
          'strategy:result:claim-fusion@1',
          'strategy:result:comparison-bridge@1',
          'strategy:result:coverage-gap-sentence@1',
          'strategy:result:outline-assembly@1',
          'strategy:result:prose-assembly@1',
          'strategy:result:sectioned-document-assembly@1',
          'strategy:result:table-assembly@1',
        ],
        resources: [R('output-bytes'), R('evidence-items'), R('votes')], canVote: true,
      }),
  ];
}

export function groundedResponseEdges(edge) {
  return [
    edge('edge:runtime:construct-admit', 'node:runtime:result-construction-coordinator', 'node:runtime:claim-admission-gate', 'data', P('runtime:construction-work-order'), 'construction-work-frozen'),
    edge('edge:runtime:admit-rhetorical-plan', 'node:runtime:claim-admission-gate', 'node:runtime:rhetorical-plan-builder', 'authority', P('runtime:admitted-claim-ledger'), 'claim-boundary-closed'),
    edge('edge:runtime:admit-sentence-realization', 'node:runtime:claim-admission-gate', 'node:runtime:sentence-realization-coordinator', 'authority', P('runtime:admitted-claim-ledger'), 'claims-admitted'),
    edge('edge:runtime:rhetorical-plan-sentences', 'node:runtime:rhetorical-plan-builder', 'node:runtime:sentence-realization-coordinator', 'data', P('runtime:rhetorical-plan'), 'rhetorical-plan-frozen'),
    edge('edge:runtime:rhetorical-plan-assembly', 'node:runtime:rhetorical-plan-builder', 'node:runtime:document-assembly-coordinator', 'data', P('runtime:rhetorical-plan'), 'document-shape-selected'),
    edge('edge:runtime:sentences-assembly', 'node:runtime:sentence-realization-coordinator', 'node:runtime:document-assembly-coordinator', 'data', P('runtime:grounded-sentence-ledger'), 'sentences-grounded'),
  ];
}
