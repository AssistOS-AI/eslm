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

- [x] Republish the expanded default deterministic 1,200-case heuristic-language development suite under its own
  `internal-generated-development` report. Keep its structural oracle, seed, generator/suite digests, work and strategy
  identity, fixed denominator, aggregate dimensions, bounded representative failures, and
  `benchmarkComparable: false` claim boundary machine-reviewable.
- [x] Review the expanded suite's largest earliest-failure clusters and record collective conclusions by structural
  domain, technique, target family, complexity, route, status, confidence, and resource outcome. Derive changes only
  from generic hypotheses supported by renamed and meaning-changing controls plus repeated pre-fix seed clusters;
  retain the completed post-fix seed audit and its limits as a separate checkpoint below.
- [x] Split generated-suite reporting by oracle level: answer execution, candidate selection, query-local decomposition,
  request execution, safe abstention, and proposal/operator preservation. Never count a proposal-only pass whose final
  status is `UNPARSED` as executable interpretation coverage. Candidate selection must bind the exact winner to its
  required family, accepted matching parse-only reparse, query-local interpreted episode, route, and status; never
  promote that evidence to complete relational Semantic IR coverage.
- [ ] Add a distinct executed relational-Semantic-IR oracle for cases that expose and validate a complete typed query.
  Keep it separate from candidate selection, answer execution, and proposal preservation.
- [ ] Report actual target-family applicability, execution, selection, and contribution separately from the current
  target-family contract totals; a generated target label is not proof that its strategy ran or caused the result.
- [ ] Add template-disjoint, vocabulary-disjoint, and independently authored language suites. Report the number of
  distinct structural shapes, base predicates, morphology classes, and technique-by-domain cells beside the row
  denominator so repeated instantiations cannot be mistaken for structural novelty.
- [ ] Decouple domain themes from base predicates through a deterministic domain-by-morphology-class design. The
  current generator binds each of its 18 domain records to one predicate, so a domain concentration can be a lexical
  morphology concentration rather than evidence of domain semantics.
- [x] Exercise deletion, insertion, substitution, and transposition spelling processes plus explicit silent-`e`,
  doubled-consonant, sibilant, final-`y`, `ie`-ending, and terminal-`z` morphology strata in the default generator.
- [x] Resolve the recurring spelling-plus-progressive cluster through one generic evidence hierarchy: role-aligned
  class-rule/query context, exact finite/lemma round trip, bounded edit distance, and a strict source-character-coverage
  tie-break that leaves equal remaining candidates unresolved.
- [x] Protect that hierarchy with renamed entity/class/object controls spanning `water`, `fix`, `pass`, `buzz`, `map`,
  and `move`, plus finite/progressive controls for `tie`, `vie`, and `cries` and a valid-different-predicate contrast.
- [ ] Add multi-edit spelling, irregular paradigms, and deliberately ambiguous nonce forms. Preserve genuine ambiguity
  as competing candidates or `AMBIGUOUS`; do not make a suite green by removing a difficult mutation family.
- [x] Include the failure diagnostic code in generated cluster identity.
- [ ] Compare fixed-seed, independent-seed, template-disjoint, and vocabulary-disjoint cluster persistence before
  promoting a generic heuristic.
- [x] Complete the post-fix independent-seed replay. Five independent 1,200-case seeds pass 6,000/6,000 declared
  contracts with no failure cluster, compared with the pre-fix 5,898/6,000 baseline. Preserve the oracle-level and
  status limits documented below rather than presenting this as general language coverage.
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

### Expanded generated-development checkpoint — published 2026-08-12

The generator now defines 43 reviewed shapes across 18 domains and 28 target families. Its default receipt records all
1,200 surfaces as unique and observes 593 of the 774 possible declared technique-by-domain cells. These are combination
and surface-diversity measures, not 1,200 independent constructions or an independent domain-by-predicate design. It
explicitly labels six oracle levels—answer execution, candidate selection, query-local decomposition, request
execution, proposal-only preservation, and safety abstention—and aggregates them separately. It also restores
deletion, insertion, substitution, and
transposition spelling processes and adds six named morphology strata. The published report validates with definition
digest `sha256:909549edb887ba4729ada5c45ed0b15a94775463afc9a243292ee198fdf971b3`, suite digest
`sha256:c1f969787f328b8bd6dc74a7bf4235cfa33e5a3d82dfd1edca2a4f5dc2c7d319`, and behavior digest
`427bc627d69459406b1c8d05dd558b24cc2e552bb84bc38554a032f4c81d722b`. The prior 31-shape artifact is superseded;
its pass count, digest, route totals, and cluster state are not results for this expanded definition.

Pre-expansion failure-guided work remains useful history. It found recurring, domain-independent problems: permissive
direct parses could hide intended progressive or multi-family repairs; suffix-like nonce classes could be
singularized; and progressive derivation could create competing bases. The generic runtime changes compare parse-only
Semantic IR, keep changed interpretations query-local, and use visible context for covered cases. Earlier experiments
also showed that replacing a difficult insertion mutation with an easier deletion could hide a genuine ambiguity.
The expanded generator now retains both processes. Its published fixed-seed result and independent-seed audit establish
their behavior only under the declared generated contracts.
Targeted renamed ambiguity probes remain research input for calibrated alternatives, `AMBIGUOUS`, or a reviewed
lexical resource—never a reason for verb-specific core branches.

A non-publishing fixed-seed run of the expanded definition produced 1,170/1,200 mixed contract passes and 30 failures.
This is diagnostic evidence, not the published checkpoint. Twenty-eight failures are at `answer-execution` and two at
the then-labeled `semantic-ir` level, whose actual contract is now named `candidate-selection`; the other four oracle
levels pass their current contracts. The repeated clusters are not random:

- 14 cases fail first at candidate generation in `multi-family-consensus`;
- 13 fail first on the resulting status in the same target family;
- two `embedded-polar-question` cases fail on route; and
- one contextual predicate spelling case fails on route.

Representative multi-family errors select `watere`, `mapp`, `fixe`, `pas`, or `buz` instead of the structural oracle's
`water`, `map`, `fix`, `pass`, or `buzz`. These failures span insertion, substitution, transposition, progressive
reduction, and several domains. They make the next research decision concrete: preserve and compare competing lemma
analyses, use reviewed lexical evidence when available, calibrate confidence against ambiguity, and verify a complete
relational query before treating an affirmative answer as supported. Do not restore a green suite by deleting these
mutation/domain combinations or by adding predicate-specific branches. The embedded-question cluster should be
audited separately for the interaction between `ties`, the declared `tie` lemma, and sentence-form recognition.

Five independent non-publishing 1,200-case seeds reproduce the diagnosis: 5,898/6,000 mixed contracts pass and 102
fail. Only `answer-execution` and the then-labeled `semantic-ir` contract, now named `candidate-selection`, contain
failures; query-local decomposition, request execution,
proposal-only preservation, and safety abstention pass their current contracts. The two multi-family candidate/status
clusters recur in all five seeds and contain 84/102 failures. Contextual spelling failures recur around `pass`, while
embedded or polite question-envelope failures recur around `tie/ties`. All failed rows retain distinct nonce names,
but the failures concentrate in seven of the 15 base predicate lemmas exercised by these families; `buzz` and `pass`
account for 59/102. Because the current generator binds a domain to its predicate, apparent acoustics, communication,
or rigging concentration is primarily lexical morphology evidence, not a domain-semantic conclusion. This persistence
justifies two generic investigations—competing lemma analysis across spelling plus progressive evidence, and
inflection-aware envelope reduction—rather than treating the 30 fixed-seed rows as unrelated examples.

The implemented repair follows that evidence rather than the benchmark vocabulary. For an aligned entity membership,
class rule, question, and object, it prefers an exact finite/lemma round trip; otherwise it uses bounded Damerau
distance, with strictly greater source-character coverage as the only permitted final tie-break. Equal remaining
coverage produces no contextual winner. Renamed controls cover the recurring spelling processes and the independent
`tie`/`vie`/`cries` morphology distinctions.

The published post-fix default seed passes all 1,200 declared contracts and has no remaining failure cluster. Its
interpretation remains narrow: the distribution still has 43 reviewed shapes, 18 domain records coupled to their
predicates, 28 target-family labels, and six different oracle levels. The report has 224 passing `UNPARSED` outcomes;
generator/runtime inspection attributes 112 to proposal-only operator preservation and 112 to safety abstention. The
proposal-only rows are not executable interpretations. The green fixed distribution therefore demonstrates that the
specific repeated baseline clusters are closed under these project-owned contracts; it does not establish general
English morphology, independent structural generalization, KB grounding, or public benchmark performance.

Five post-fix independent 1,200-case seeds pass 6,000/6,000 declared contracts on runtime behavior identity
`427bc627d69459406b1c8d05dd558b24cc2e552bb84bc38554a032f4c81d722b`, with no mismatch or earliest-failure cluster.
This closes the seed replay checkpoint for the fixed 43-shape distribution, but it also exposes why the oracle labels
must remain narrow. Across those runs, 280 candidate-selection rows select and execute the expected candidate with a
matching accepted parse-only receipt and required family, yet end `UNKNOWN` with `missingEntity` and do not expose a
complete relation-shaped query. They are exact candidate-selection evidence, not relational Semantic IR execution.
Another 559 proposal-only rows remain `UNPARSED`, 555 safety-abstention controls
remain `UNPARSED`, and 137 understood and planned request rows end `MISSING_KNOWLEDGE`; each passes its own declared
contract. Template-disjoint, vocabulary-disjoint, independently authored, grounded-KB, and public evaluation gates
remain open, so 6,000/6,000 must not be generalized beyond this project-owned structural distribution.

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
