---
id: DS017
title: Theory and Implementation Status
status: implemented
owner: research
summary: Maps every current ESLM theory component to its implementation, tests, present limitations, and next evidence requirement.
---

# DS017 Theory and Implementation Status

## Introduction

This specification prevents planned theory from being mistaken for implemented behavior. It maps the current theory in DS002 to source modules and evidence. It does not describe repository history.

## Core Content

### Implemented theory components

| Theory component | Current implementation | Current evidence | Boundary |
| --- | --- | --- | --- |
| Unicode surface normalization | `src/language.mjs` | normalization unit tests | English token and punctuation handling; no general morphology |
| Controlled spelling correction | declared variants and bounded edit distance | typo evaluation and correction trace tests | controlled vocabulary only; ambiguity margin is not yet modeled |
| English construction compilation | `src/parser.mjs` | direct, paraphrase, relation, and unsupported cases | small hand-authored construction set |
| Query Normal Form | parser query objects consumed by `EslmEngine` | semantic-value assertions | no separate persisted query schema yet |
| Entity identity and aliases | generated `entities.mjs` and alias resolution | direct lookup and pronoun tests | aliases must currently be globally unique |
| Canonical facts and provenance | generated `facts.mjs` | fact validation and answer traces | no temporal, modal, negative, or conflict fields yet |
| Posting-list retrieval | generated indexes plus runtime closure indexes | stale-index validation and QA tests | rule activation still uses complete bounded closure |
| Positive conjunctive rules | `src/reasoner.mjs` | derived location and explanation tests | no explicit negation, aggregation, or query-directed rule plan |
| Epistemic outcomes | `ANSWERED`, `UNKNOWN`, `UNSUPPORTED`, and parser ambiguity path | unsupported and missing-proof tests | clarification and conflict flows need end-to-end cases |
| Proof provenance | direct source arrays and derived support IDs | explanation and provenance assertions | no minimal-proof selection or source entailment audit |
| English factual realization | `src/realizer.mjs` | answer-string assertions | short deterministic templates only |
| Bounded discourse | explicit `lastEntity` context | pronoun follow-up test | one referent; no salience graph or correction episode |
| Session adaptation | English classification, location, and ownership assertions in `src/session.mjs` | same-input and cross-turn tutorial tests | temporary overlay only; no retraction, conflict, or persistent promotion |
| Training packet isolation | `src/training.mjs` | hidden-packet test | no immutable experiment archive or contamination scanner |
| Generated-module validation | static scan and model invariants | model validation tests and synthesis-skill validator | static scanning is not a security sandbox |
| Task Calculus base execution | operations, THEN, ALL, and CHOOSE in `src/task-calculus.mjs` | typed circuit test | remaining declared controls have no executor |
| Evaluation and reports | Node test, evaluation, benchmark, and HTML publishing modules | generated latest reports | committed suites are smoke-sized |
| External prediction exchange | label-free export and local prediction scoring | workflow test | no external runner or credential handling by design |
| Real-corpus registry and source modules | `src/corpora.mjs`, `src/public-kbs.mjs`, WordNet/ATOMIC Node compilers, generated shards, `kb build`, `kb validate`, and source-KB random test | catalog/status, smoke validation, semantic queries, and 700 seeded source-exposed cases | WordNet contextual sense choice, ATOMIC general participant binding, calibrated ranking, held-out evaluation, and lazy shard import remain incomplete |
| Opt-in execution profiling | `src/profiling.mjs`, engine stage instrumentation, and training preparation sidecars | profiling tests and `ask --profile` | current stages expose time, CPU, memory deltas, and basic counts; peak streaming metrics await corpus adapters |
| Indexed rule premise selection | posting lists and bound-term candidate selection in `src/reasoner.mjs` | reasoning tests and synthetic scale probe | full startup closure and session-wide rebuild remain blockers |

### Specified but not implemented theory components

| Theory component | Required implementation | Required evidence before claim |
| --- | --- | --- |
| Productive English morphology | typed lexical features and feature unification | inflection, agreement, unseen-lemma, and minimal-pair suites |
| Broad construction induction | generated typed constructions with counterexamples | held-out paraphrase and construction-family transfer |
| Rich discourse | mention graph, salience, ellipsis, correction epochs | multi-entity episodes and ambiguity or clarification oracles |
| Event and world-state calculus | typed events, preconditions, effects, immutable state versions | Entity Tracking and bAbI transition traces |
| Temporal, causal, and belief state | distinct time, cause, world truth, and agent belief relations | scoped temporal and false-belief evaluations |
| Conflict execution | explicit incompatible claims and query policy | source-conflict and recency or authority tests |
| Narrative schemas | event schemas, constraints, alternatives, and state verification | Story Cloze plus controlled counterfactual narratives |
| Open generation | content planning, reference planning, morphology, verification | semantic preservation, consistency, and diversity measures |
| Normalized language probability | total surface distribution and normalized structured mixture | normalization tests and valid likelihood metrics |
| Scalable rule execution | rule-head indexes, semi-naive or query-directed evaluation, shards | equivalence tests and scale latency or memory reports |
| Strong generated-code isolation | restricted process or container with read-only inputs and no network | adversarial candidate suite and effect receipts |
| Public dataset adapters | native parsers for selected official formats | dataset hashes, adapter tests, and reproduced sample metrics |
| Open English WordNet ingestion | streaming JSON adapter, sense records, two generated profiles | frozen source and probe manifests, inventories, ambiguity, relation, and scale tests |
| ATOMIC event profiles | event templates, participant roles, perspectives, and hypotheses | two independently loadable profiles, binding accuracy, alternatives, calibration, and non-categorical realization |
| ConceptNet ingestion | streaming CSV adapter, English/source filtering, overlap and relation semantics | three independently loadable profiles, retained/rejected counts, exception tests, conflicts, independent evaluation |
| GeoNames bounded geography | typed places, alternate names, coordinates, feature types, and administrative containment | countries-and-capitals profile, spatial tests, exact inventory, selective-load resource evidence |
| Future Wikidata thematic packs | bounded dated snapshots, typed values, ranks, qualifiers, revisions | only an experiment-authorized domain pack with temporal and cross-source evidence; no complete-dump target |

### Status update rule

A component may move into the implemented table only when its source behavior, failure states, tests, and documentation agree. A partial demonstration must remain explicitly bounded. A future module name or benchmark plan is not implementation evidence.

When implementation changes theory rather than merely completing it, DS002 must be updated first. DS017 must then name the concrete source and evaluation that realizes the revised theory.

## Decisions & Questions

### Question #1: Why keep one status matrix instead of scattering implementation notes across theory sections?

Response: DS002 remains a coherent theory contract. This matrix provides one auditable boundary between implemented, partial, and planned capabilities without interrupting the conceptual explanation.

### Question #2: What counts as evidence that a component is implemented?

Response: The repository must contain executable behavior, tests for success and failure cases, and synchronized documentation. A data schema or roadmap paragraph alone is insufficient.

### Question #3: Can a smoke fixture establish scientific competence?

Response: No. A smoke fixture establishes wiring and regression behavior. Scientific competence requires a sufficiently sized isolated dataset, a versioned adapter, appropriate metrics, and comparison regimes.

### Question #4: Do the current hand-authored KBs count as world-knowledge training?

Response: No. They are regression fixtures for loader, merge, closure, exception, and proof behavior. K1 becomes implemented only after the source-derived WordNet artifacts and evidence required by DS018 and DS019 exist.

## Conclusion

The current system implements a useful factual English QA slice with symbolic proofs and code-model synthesis infrastructure. The remaining theory is explicit and testable, but it must not be presented as current runtime capability until the corresponding implementation and evidence exist.
