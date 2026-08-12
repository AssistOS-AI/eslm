# ESLM Open Issues and Strategy-Architecture Worklist

This file is the live implementation worklist for the strategy-plugin refactor requested on 2026-08-12. It is not a
design authority: normative behavior belongs in `docs/specs/`, and measured evidence belongs in generated reports.
Items are closed only after code, tests, specifications, HTML documentation, and relevant execution evidence agree.

The checked items describe the stabilized 2026-08-12 architecture checkpoint. Unchecked items are deliberate next
integration or research phases, not hidden release claims. In particular, language approximation is the first stage
whose alternatives all cross the common registry/coordinator boundary; several other stages already have exact
selection gates inside their bounded owner modules, while compiler strategies and the complete cross-stage ledger
remain explicit work rather than simulated plugins.

## P0 — architecture and semantic integrity

- [x] Define a versioned, dependency-free strategy contract with typed stage IDs, input/output contracts,
  preconditions, deterministic identity, confidence semantics, exact work budgets, and bounded receipts.
- [x] Implement a static trusted strategy registry. Runtime configuration may select registered strategy IDs, but KB
  or corpus data must never supply executable paths, dynamic imports, or code.
- [x] Implement a meta-rational coordinator that allocates finite work, runs eligible strategies in canonical order,
  records declined/inapplicable/exhausted strategies, and combines votes without converting confidence into truth.
- [x] Separate three outcomes at every extension point: interpretation proposals, relevance evidence, and answer
  support. A majority vote may rank candidates; only the declared semantic verifier may authorize an answer.
- [x] Preserve deterministic behavior under strategy-registration order, provider order, KB order, and renamed
  entities/predicates. Configuration changes must be visible in the result and execution receipt.
- [x] Make resource exhaustion explicit. No strategy may silently disappear because its local or shared budget ended.

## P0 — real extension points to refactor

- [x] Language approximation: register each spelling, morphology, segmentation, clause, and CNL-rewrite family as an
  independently identified proposal strategy with bounded work and votes.
- [ ] Complex-request analysis: migrate the already gated instruction/data separation, request-force detection,
  scope/negation,
  decomposition, intent, topic, artifact, and output-shape strategies; aggregate them into an ordered obligation DAG.
- [ ] Grounding focus: migrate the registered and exactly gated semantic-IR roles, phrase focus, morphology,
  metalinguistic focus, and exclusion
  strategies. Function words and request scaffolding must never win merely because they are frequent.
- [ ] Grounding relevance: migrate the registered and exactly gated capped active-KB frequency, document frequency,
  term/role coverage,
  multi-token co-occurrence, exact phrase, typed answer-bridge, provenance/trust, diversity, and conflict strategies.
- [x] Reasoning: expose current safe Horn, finite-model, categorical, temporal, spatial, defeasible, inductive, and
  other registered methods through the same inspectable strategy metadata without weakening their own semantics.
- [x] Output construction: register extractive summary, expansion, explanation-gap, comparison, outline, table,
  section, and aggregate-document strategies. Every requested obligation needs an output or a structured gap.
- [ ] KB standardization: define trusted compiler-side adapters for manuals, technical documentation, ontologies,
  lexical resources, event graphs, tables, and already-canonical records. All adapters must converge on the canonical
  record/package validator and preserve frozen source spans and coverage gaps.

## P1 — configuration and operator control

- [ ] Extend `eslm-work-policy-v1` beyond its implemented exact stage allowlists and language-stage preallocation with
  the complete cross-stage, multi-dimensional shared/per-strategy work plan from DS027.
- [x] Add CLI startup configuration and interactive inspection for selected strategies, without permitting arbitrary
  module paths. A configuration profile must be serializable, hashable, and included in result accounting.
- [x] Provide inventory/status output showing registered, selected, applicable, executed, declined, failed, and
  budget-truncated strategies by stage.
- [x] Keep the external Language Agent disabled by default and outside the deployable strategy registry. It remains a
  separately disclosed operator wrapper after deterministic local strategies are exhausted.

## P1 — research and evaluation

- [ ] Freeze independent suites for each stage: language recovery, scope-safe decomposition, retrieval focus,
  relevance ranking, answer-bridge recall, reasoning selection, aggregation, synthesis grounding, and abstention.
- [ ] Compare individual strategies, ablations, voting rules, budget allocations, and selected ensembles on identical
  frozen inputs. Report end-to-end outcomes separately from interpretation, retrieval, and solver metrics.
- [x] Add adversarial controls for instruction/data confusion, negation scope, opaque operators, common-word
  frequency, wrong-KB distractors, conflicts, duplicated evidence, renaming, ordering, and receipt truncation.
- [x] Treat learned weights or pattern additions as reviewed versioned artifacts produced offline. Runtime execution
  never self-modifies a strategy, threshold, catalog, or KB.
- [x] Document unresolved research programs explicitly: scope graphs, structural generalization, proof-guided
  retrieval, calibrated arbitration, conflict-aware evidence fusion, verified long-form synthesis, and new-source KB
  induction.

## P1 — documentation and architecture visibility

- [x] Add the strategy architecture to the DS authority, with precise lifecycle, type contracts, security boundary,
  voting equations, budget semantics, configuration, receipts, failure states, and falsification criteria.
- [x] Add an HTML strategy chapter with a small left-to-right dataflow diagram, stage inventory, receipt examples,
  configuration examples, and normal prose explaining every edge and exceptional path.
- [x] Connect the strategy architecture to the language, grounding, reasoning, KB, CLI, evaluation, and research
  chapters. Clearly distinguish implemented strategies from proposed research strategies.
- [x] Keep prose full-width within the content canvas, tables independently scrollable, diagrams limited to the shared
  three-role visual grammar, captions short, and explanations left-aligned.

## P2 — maintainability and future boundaries

- [x] Keep each strategy cohesive and normally below the DS001 source-size guideline. Split orchestration from
  contracts, strategy implementations, arbitration, and presentation.
- [ ] Define a compatibility policy only after the first production strategy protocols are frozen; this repository
  currently has no backward-compatibility requirement.
- [ ] Evaluate process-isolated research strategies as a future training/offline facility. They may emit untrusted
  proposals and receipts but can never join deployed inference without review and static registration.

## Release gates

- [ ] Focused strategy tests pass.
- [ ] Full `npm test`, `npm run kb:validate`, `npm run docs:matrix`, and `npm run docs:check` pass.
- [ ] Generic-core guardian checks confirm no benchmark, source-row, or domain-answer dispatch entered the registry.
- [ ] Public benchmark portfolio is regenerated only after the final source tree is stable; historical/stale receipts
  remain labeled rather than silently promoted.
- [ ] `npm run check` passes on the final tree, and real CLI probes demonstrate the motivating typo episode,
  function-word exclusion, multi-request planning, strategy selection, and visible bounded receipts.
