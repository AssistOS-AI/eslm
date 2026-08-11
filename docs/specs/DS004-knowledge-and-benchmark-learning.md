---
id: DS004
title: Benchmark-Guided Symbolic Learning and Promotion
status: in-progress
owner: training
summary: Defines coding-agent benchmark learning, failure clustering, KB-versus-core decisions, anti-overfitting gates, fresh evidence, candidate review, and promotion.
---

# DS004 Benchmark-Guided Symbolic Learning and Promotion

## Introduction

Benchmarks expose missing language, knowledge, retrieval, planning, and reasoning capabilities. This specification defines how a supervised coding-agent workflow converts recurring development-visible failures into generic mechanisms or provenance-bearing declarative policy without answer memorization. Document ingestion is an independent construction workflow governed by DS014; source identity is governed by DS016 and adapter/split isolation by DS017.

## Core Content

### 1. Purpose

A coding agent uses reasoning benchmarks as training signals for an executable system. It may improve the current KB, language knowledge, CNL implementation, retrieval, planning and generic reasoning, but it must prove that changes generalize and do not destroy previously acquired capabilities.

The agent’s objective is not to make a finite set of questions green. Its objective is to convert recurring failures into reusable knowledge or mechanisms.

### 2. Baseline

Before modification, the learner records a baseline whose measurements follow DS010. Source identity follows DS016,
and DS017 supplies label-free development, regression, fresh, and shadow pools with host-only oracles. This workflow may
inspect only the evidence authorized by the pool lifecycle and cannot redefine pool membership or measurement meaning.

### 3. Failure classification

Every failure is classified by root cause. The main classes are lexical knowledge, domain ontology, missing fact, CNL grammar, semantic composition, scope, coreference, retrieval, shard routing, missing declarative rule, missing generic method, incorrect method, planning, ranking, contradiction, uncertainty, resource limit and unknown.

The trace is authoritative. A wrong answer with a correct parse requires a different intervention from a wrong parse with a potentially adequate reasoner.

### 4. KB-first but not KB-only

The default correction is made in the current KB when the missing artifact is knowledge, terminology, an event frame, a domain rule or a source convention. The agent does not distort the generic core to absorb dataset vocabulary.

A change to `src` is considered when multiple independent examples reveal the same generic structural limitation and a KB workaround would duplicate or misrepresent semantics. The Core Change Guardian skill must approve the proposal.

### 5. Candidate validation

A candidate fix is first tested on the motivating cluster. It is then tested on fresh structurally related examples, nonce substitutions, semantic-preserving metamorphic transformations, semantic-changing contrastive transformations and all relevant regressions.

A parser change must demonstrate that direct symbolic rate increases on fresh data and that existing parse meanings remain stable. A retrieval or sharding change must demonstrate result equivalence with an exhaustive reference mode. A reasoning change must validate proof or witness semantics.

### 6. Acceptance rule

A candidate is accepted when the target capability improves on fresh samples, no critical regression appears, global metrics do not materially decline, proof validity remains within policy, direct symbolic autonomy does not decrease without explicit justification, and system complexity remains proportionate to the gain.

An aggregate score increase cannot hide a severe regression in a previously mastered capability. The agent must compare capability-level metrics.

### 7. Overfitting defenses

The agent must not encode benchmark IDs, question hashes, exact sentences, answer lookup tables or branches on dataset names. Static checks search for these patterns. More importantly, fresh generators and nonce transformations test whether the learned mechanism survives lexical and structural changes.

Finite public test sets are not used as an iterative development source. When an inspected holdout example influences a patch, it becomes development data and a new holdout must replace it.

### 8. Checkpoints and research record

Every accepted change produces a checkpoint and a concise record of observed failure, root cause, chosen layer, patch, expected generalization, focused results, fresh results, regressions, direct symbolic effect and system-size effect.

Rejected patches are also informative and should be retained when they reveal an architectural limit or unstable interaction.

### 9. Completion for one benchmark

A benchmark is substantially learned when unseen performance is stable across repeated samples, direct symbolic parsing is high for its intended CNL level, proof validity is adequate, shadow results confirm the gain, remaining failures form understandable hard classes and no material regression exists in prior suites.

The accepted core and KBs then become the starting checkpoint for the next benchmark.

### Coding-agent subprocess contract

DS007 owns the command, packet, workspace, baseline-analysis, receipt, and portable-validator interfaces used to invoke a
training Coding Agent. DS009 owns process isolation, untrusted output, path confinement, and failure handling. This
learning contract consumes only the authorized evidence and untrusted candidate produced by those interfaces. An
execution receipt or schema-valid candidate is necessary evidence, never promotion authority.

### Pool and checkpoint discipline

Every hypothesis begins from one accepted checkpoint and produces one attributable candidate. Several uncertain candidates must not be stacked. Accepted and rejected research notes record root cause, layer choice, change, fresh and metamorphic results, proof audit, regressions, resource growth, and remaining counterexamples.

DS017 exclusively defines pool visibility, reclassification, fresh freezing, and aggregate-only shadow access. A
checkpoint names the exact pool receipt rather than duplicating its membership or lifecycle rules.

### Public benchmark development cycle

Every public cycle consumes a DS016 source manifest and a DS017 adapter, oracle, and split receipt. DS010 exclusively
defines the public report, denominators, scores, route measurements, scorer identity, and claim regime. Missing access,
adapter evidence, and execution state retain the meanings defined by those owners.

A benchmark improvement is accepted here only when it comes from a reusable semantic mechanism or
provenance-bearing declarative policy and renamed nonce, negative, and metamorphic regressions exercise the same
structure. DS002 decides core versus data placement, DS015 tests method generality, and DS017 prevents a task adapter or
oracle from becoming a hidden solver.

Failures are classified by semantic layer rather than patched item by item. Minimal-pair ties or reversals indicate missing construction-sensitive grammar or preference semantics. Parsed kinship cases without answers indicate missing typed relation extraction or composition. Broad factual questions may separate into language-construction failures and independently sourced knowledge gaps. A test-only answer set must not enter synthesis packets or repeated example-specific repair. Current counts for these classes remain in the empirical report so that a new run can replace them without changing the contract.

Any later repair must be expressed through semantic metadata, typed relations, capability preconditions, and declarative policies. The learner must rename entities, relations, values, and surface forms and must generate negative cases in which the same words occur under a different structure. A patch that succeeds only while a benchmark constant, example ordering, row ID, answer string, or source-specific `if` branch remains intact is rejected even when its aggregate score improves.

Layer selection is recorded as part of every proposal. Generic traversal, composition, state transition, proof search,
and provider coordination belong to registered methods whose semantics are defined in DS015. Relation inventories,
lexical constructions, priorities, thresholds, and independently sourced facts remain provenance-bearing data.
Documented external syntax and answer normalization remain in DS017 adapters. This boundary applies uniformly to every
benchmark and therefore does not need a new example-specific rule when the portfolio grows.

## Decisions & Questions

### Question #1: How is a repair assigned to the KB, adapter, language, or core layer?

Response: The failure trace identifies the first unsatisfied semantic boundary. Missing facts, lexical mappings, ontology, or source policy become provenance-bearing data. Documented source syntax remains in the adapter. A recurring vocabulary-independent operation becomes a core candidate only after complete renaming, contrasts, witness tests, and Core Change Guardian review.

## Conclusion

Learning converts source meaning and recurring failures into reviewed declarative knowledge or genuinely reusable mechanisms. Candidate acceptance depends on provenance, generalization, proof validity, regression protection, and reproducible construction rather than development score alone.
