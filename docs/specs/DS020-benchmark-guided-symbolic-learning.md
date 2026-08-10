---
id: DS020
title: Benchmark-Guided Symbolic Learning and Checkpoint Gates
status: implemented
owner: training
summary: Defines how benchmark failures become reusable KB or core improvements through isolated pools, trace clusters, candidate checkpoints, generalization tests, regression gates, and research notes.
---

# DS020 Benchmark-Guided Symbolic Learning and Checkpoint Gates

## Core Content

### Objective and authority

Benchmark-guided learning uses dataset failures as training observations for an executable symbolic system. Its objective is not to make a fixed answer file green. It converts repeated failures into source-backed knowledge, reusable semantic structures, or generic execution mechanisms while preserving previously accepted capabilities.

The repository-owned authority is `training/.agents/skills/benchmark-guided-symbolic-learning/`. The skill is self-contained: its procedure, evidence/classification rules, cycle contract, Node initializer, Node comparison tool, and agent metadata live inside its directory. It may be copied with no dependency on host-project modules. `synthesize-eslm-model` remains the authority for frozen-source program synthesis; benchmark-guided learning decides what failure-derived change deserves a synthesis or core candidate and whether evidence permits acceptance.

### Dataset understanding and baseline

No candidate change begins before an initial capability map and baseline exist. Sampling covers available information, expected answer types, recurring relations and concepts, linguistic constructions, ambiguity, uncertainty, required reasoning depth, and external-knowledge dependencies. Sampling is stratified across meaningful dataset metadata rather than taking only early or easy rows.

The baseline records dataset and adapter identity, accepted checkpoint, selected KBs, configuration, pool digests, seed, aggregate and per-capability accuracy, fresh accuracy, regression accuracy, metamorphic consistency, proof validity, abstention behavior, execution failures, latency, memory, KB bytes, core bytes, individual failures, semantic parses, evidence retrieval, selected rules, proofs, unresolved concepts, and runtime diagnostics. A correct answer with an invalid trace remains a baseline failure.

### Four evidence pools

Working examples may be inspected with expected answers when the dataset contract authorizes development-label access. They support diagnosis and local debugging. Regression examples encode capabilities already accepted and run after every material change. Fresh examples are random or previously unused samples used to test whether the hypothesis generalizes. Shadow examples expose aggregate performance only; individual shadow failures remain hidden unless an explicit later experiment changes their status and replaces their coverage.

The pool manifest records paths, sizes, digests, exposure state, and seeds. Finite held-out samples rotate to reduce repeated optimization. Generative benchmarks produce new random instances continuously when possible. Test or shadow data does not become train evidence merely because it is locally cached.

### Failure clusters and trace diagnosis

Failures are clustered at the earliest incorrect execution stage. Language clusters include normalization, construction, semantic role, coreference, negation, quantification, and ambiguity. Knowledge clusters include unknown concepts, aliases, ontology gaps, event frames, world scope, and temporal or spatial qualifiers. Reasoning clusters include missing or unsafe rules, composition, state change, causality, defaults and exceptions, contradiction, and confidence. Planning clusters include KB or shard selection, postings, candidate pruning, budgets, and executor selection. Output clusters include ranking, epistemic realization, proof rendering, and abstention. Runtime clusters include malformed input, stale indexes, memory, timeout, import, and nondeterminism.

The learning loop attacks root causes rather than individual sentences. A high-value hypothesis explains several independent failures and predicts which cases should and should not change. Downstream symptoms remain secondary tags so a parser failure is not misreported as missing world knowledge.

### KB versus generic core

World and dataset semantics belong in the current KB: facts, ontology, lexical mappings, aliases, relation definitions, event schemas, semantic frames, defaults, weighted associations, domain rules, and composition licensed by the ontology. Generic structure belongs in the core only when it remains useful after renaming every dataset-specific entity, word, event, relation, and label.

A core candidate requires multiple independent examples with the same structural cause, evidence that a KB representation would be artificial or duplicated, a reusable mechanism, and abstract tests. Typical justified mechanisms include scoped negation, candidate-preserving coreference, temporal state supersession, exception-aware defaults, general unification or relation composition, contradiction representation, confidence propagation, quantifiers, constraint propagation, and bounded search.

One failed question never authorizes a core change. Isolated vocabulary or facts enter a KB or remain unknown. The KB/core decision and its evidence are written before implementation.

### Anti-memorization and generalization

Candidates must not contain exact benchmark-sentence branches, question hashes, benchmark IDs, answer indexes, row-to-answer maps, or entity exceptions whose only rationale is benchmark occurrence. General facts are allowed when they belong to the declared source KB and retain provenance. Source exposure is then reported under DS011, DS012, DS013, and DS018.

Every fix receives neighboring structural tests that alter names, nouns, locations, sentence order, distractors, wording, and preferably nonce vocabulary. Metamorphic tests cover active/passive alternation, synonym substitution, entity renaming, clause reordering, pronouns, irrelevant sentences, equivalent temporal expressions, and canonical/natural forms. Meaning-changing counterparts reverse temporal order, exchange semantic roles, add negation, reverse containment, remove a premise, or add a specific exception. A candidate that solves only inspected wording is rejected as overfit.

### Epistemic discipline and trace validity

The learning process preserves `ENTAILED`, defeasible normality, `LIKELY`, `POSSIBLE`, `UNKNOWN`, `CONTRADICTED`, `AMBIGUOUS`, and `UNSUPPORTED` distinctions. Social continuation knowledge does not become necessary truth. Missing positive evidence does not become falsehood. Conflicting evidence is retained and scoped rather than silently discarded.

Evaluation audits semantic parse, retrieved facts, selected rules, intermediate values, proof graph, confidence, answer, and epistemic label. Correct output produced by an invalid proof is a latent failure. Correct semantics followed by wrong ranking is classified as ranking, not parsing.

### Candidate and acceptance cycle

Every hypothesis starts from a known-good accepted checkpoint and produces one attributable candidate. The candidate runs focused cluster tests, nearby structural tests, metamorphic tests, current regression, affected historical suites, core unit tests, fresh samples, and aggregate shadow evaluation when available. Several uncertain candidates are not stacked.

Acceptance requires target improvement, reproduction on fresh data, stable proofs and abstention, no material per-capability regression, no new execution failure, and explained KB/core/resource growth. Aggregate accuracy cannot excuse a serious regression, invalid proof, nondeterminism, hidden-label leakage, or unjustified certainty. Rejected candidates are reverted before a new hypothesis begins.

The normalized `eslm-learning-evaluation-v1` report contains checkpoint, dataset, pool, seed, case count, multidimensional metrics, and per-capability accuracy. `compare-learning-cycle.mjs` computes metric and capability deltas and hard-rejects increases in execution failures or material regressions in proof validity, regression accuracy, or metamorphic consistency. Its eligible verdict still requires human/coding-agent review of the declared target and research note.

### Research notes and completion

Every accepted nontrivial change records the observed cluster, trace-supported root cause, change, KB/core rationale, target before/after result, fresh and metamorphic results, regression result, proof audit, latency/memory/KB/core growth, counterexamples, uncertainty, and accepted checkpoint. This record prevents later agents from rediscovering or reversing an architectural decision without evidence.

A dataset is substantially integrated only when unseen performance is high, repeated random samples are stable, metamorphic consistency and proof validity are high, prior competencies remain intact, nonce/generalized structures succeed where applicable, and remaining failures form recognizable hard classes. The final capability report identifies learned KB content, added generic mechanisms, capability gains, remaining limits, avoided regressions, uncertainty boundaries, scale costs, and the checkpoint inherited by the next dataset.

### Accepted bAbI Task 16 cycle

The first completed use of this procedure beyond Task 15 is bAbI v1.2 Task 16 English 10k. The coding agent inspected authorized train examples only. Deterministic pools contained 200 working and 1,000 fresh train cases; the 1,000 official test cases remained shadow evidence and exposed aggregate scoring only during the cycle.

The baseline was 0/200 working and 0/1,000 fresh because property statements did not compile. Train analysis found that the expected exemplar follows the most recently stated member of the queried class when colors conflict. A first candidate reached 196/200 and 996/1,000 but failed proof audit because it did not retain all membership support; it was rejected. The corrected candidate implemented typed property statements, configured property induction, latest-member ranking, and complete analogical support. It passed 200/200 working, 1,000/1,000 fresh, 1,000/1,000 aggregate shadow, 52/52 prior regressions, and 3/3 metamorphic tests before promotion.

The promoted model contains reusable color-property configuration and no episode-to-answer table. Its behavior is bounded: only model-declared properties are eligible, induction is labeled `INDUCTIVE`, conflict counts and supporting memberships remain in the trace, and unconfigured adjectives do not silently become universal properties.

## Decisions & Questions

### Q1. Why is score improvement insufficient for acceptance?

Response: A score can rise through memorization, invalid traces, loss of abstention, or regressions in a smaller capability. The gate measures fresh generalization, metamorphic consistency, proof validity, execution reliability, and preserved competencies in addition to accuracy.

### Q2. Why are ontology-specific composition rules allowed in a KB?

Response: A KB is executable semantics, not merely a fact bag. A relation-composition rule belongs there when its validity depends on the source ontology. The core supplies general unification and bounded execution, while the KB declares which concrete relations may compose.

### Q3. When may a shadow failure be inspected?

Response: Only when an explicit experiment reclassifies it as working evidence, records the exposure, and replaces the removed shadow coverage. Normal learning uses shadow aggregate metrics to detect overfitting without adapting to individual cases.

### Q4. Why maintain accepted checkpoints instead of accumulating changes?

Response: Small candidate deltas make causal attribution, regression diagnosis, and reversal possible. Stacking uncertain changes prevents knowing which mechanism produced an improvement or regression.

### Q5. How does this skill relate to source synthesis?

Response: Benchmark-guided learning selects and validates a reusable hypothesis. `synthesize-eslm-model` then compiles authorized source evidence into candidate modules when the hypothesis is a KB/model change. Generic core candidates follow repository code review and regression tests rather than the corpus-synthesis write boundary.
