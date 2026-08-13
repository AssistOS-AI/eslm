---
id: DS011
title: Implementation Sequence and System Acceptance
status: in-progress
owner: roadmap
summary: Defines stable vertical capability stages, their acceptance evidence, ordering dependencies, release conditions, and the separation between roadmap state and mutable benchmark results.
---

# DS011 Implementation Sequence and System Acceptance

## Introduction

ESLM is implemented as vertical capabilities that run from language or typed input to an evidence-bearing result. This specification defines the stable ordering and acceptance gates. It does not contain the current benchmark inventory, percentages, cache states, or a narrative snapshot of implemented modules; those mutable facts belong to generated status and evaluation reports.

## Core Content

### 1. Vertical implementation rule

A stage is accepted only when its representation, executable path, success and failure behavior, resource bounds, tests, documentation, and proportionate evaluation evidence agree. Declaring a type, method descriptor, command placeholder, adapter state, or roadmap card does not establish implementation.

Later stages may be specified and prototyped before earlier stages are complete. Such slices remain individually named and do not promote the enclosing stage until all stage criteria pass.

### 2. Stage A: contracts and controlled language

Stage A fixes Semantic IR, task and result schemas, status meanings, the generic-core versus declarative-KB boundary, direct controlled-language parsing, exact retrieval, safe Horn deduction, provenance, and deterministic package compilation.

Acceptance requires a complete executable path from supported text to semantic values and proof, explicit `UNPARSED`
and `UNKNOWN`, deterministic rebuild, no executable KB content, direct-language measurements, nonce generalization,
and tests for package, parser, planner, and result boundaries. Ordinary failure-time grounding must preserve the
primary status, keep related records outside answer provenance, report complete versus incomplete search, remain
bounded, and survive provider-order, distractor, and provider-failure controls. The later DS022 request-construction
slice has its own `PARTIAL` attribution contract and does not weaken this Stage A inability invariant.

### 3. Stage B: document-to-KB construction

Stage B implements DS014 source registration, structural spans, semantic extraction, conservative identity, events, rules, provenance, canonical serialization, document-oriented indexes, citations, and the repository-owned document-to-KB workflow.

Acceptance requires rebuilding a KB from a frozen distributable document, complete span accounting, validated record and reference graphs, contradictions and unresolved spans reported, canonical-to-compiled equivalence, eager/lazy query equivalence, and held-out cross-section questions whose answers cite every contributing source span.

### 4. Stage C: scalable physical knowledge

Stage C implements DS018 corpus gates, DS019 streaming compilation, DS020 exact query-directed routing, and DS021 versioned caches. The logical source inventory remains complete while dictionaries, access paths, blocks, and shards bound physical work.

Acceptance requires an end-to-end profile on a KB larger than the configured retention budget, bounded compiler memory, reconciled source counts, deterministic shard hashes, cold and warm query profiles, no false-negative routing, and semantic equivalence among canonical, exhaustive compiled, and lazy compiled execution.

### 5. Stage D: event, temporal, spatial, and relational state

Stage D adds reusable event frames and roles, reference candidates, state transitions, temporal relations, spatial relations, and typed relation composition. Methods consume semantic structures and declarative algebras rather than benchmark vocabulary.

Acceptance requires witnessed state and path execution, meaning-preserving and meaning-changing language tests, unseen entity and relation vocabularies, greater composition depths, ambiguity and inconsistency controls, and explicit limits for interval, concurrency, and discourse phenomena not yet supported.

### 6. Stage E: planning, constraints, and scalable proof search

Stage E implements multi-goal task decomposition, AND/OR alternatives, query-directed proof planning, reusable CSP and SAT methods, recursive and arithmetic constraints, countermodels, proof DAGs, and capability-gap diagnosis.

Acceptance requires exact distinction among missing knowledge, no applicable method, underdetermination, inconsistency, and resource exhaustion; valid assignments or proofs; scaling curves; irrelevant-evidence invariance; and source cases that previously exceeded finite enumeration completing through a general scalable method rather than a larger hardcoded constant.

The current DS022 request planner is a useful precursor, not Stage E acceptance. It decomposes only reviewed artifact
patterns into a fixed dependency order and constructs cited extractive `PARTIAL` results. It does not establish
semantic AND/OR alternatives, dynamic capability preconditions, arbitrary multi-goal execution, or proof-planner
completeness.

### 7. Stage F: defaults, exceptions, abduction, and commonsense

Stage F adds explicit default and exception semantics, conflict priority, skeptical and credulous queries where declared, causal and goal relations, guarded abduction, calibrated abstention, and independently sourced commonsense packages.

Acceptance requires strict and defeasible conclusions to remain distinguishable, counterevidence and alternatives to remain visible, provider order invariance, source provenance for every contribution, fresh transfer across domains, and no conversion of plausible continuation or explanation into strict truth.

### 8. Stage G: broader English and external-proposal minimization

Stage G expands English relative and embedded clauses, coordination, quantifier scope, modality, reference, and
discourse. A bounded English-likelihood gate refuses likely non-English input without pretending to translate it.
DS022 supplies the deterministic English recovery layer after direct `UNPARSED` or
`UNKNOWN`; it may also challenge direct `SOLVED` or `PARTIAL` when an accepted structural candidate has different
parse-only Semantic IR. Its mechanisms include confidence-voted spelling and morphology repairs, bounded
decomposition proposals, query-local reparse, role-focused grounding terms, and explicit request planning that can
preempt an accidental assertion parse without retaining its episode state. DS013 remains a separate operator proposal
strategy: the general CLI composes it by default and the explicit local override omits it. It may translate input
rejected as likely non-English or simplify English after the local
result remains `UNPARSED`, and it never performs reasoning. Its candidate remains untrusted and must pass the ordinary
English parser and independent preservation gates.

Acceptance requires construction-level direct and local-recovery coverage, semantic-preservation and
meaning-changing contrasts, confidence calibration, ambiguity behavior, query-local session atomicity, route-specific
accuracy, realistic misspelling and complex-sentence suites, work-profile convergence for completed cases, declining
Language Agent eligibility as generic parsing and heuristics grow, and zero hidden external calls in the deployed
runtime and canonical direct evaluations. The present DS022 implementation is a bounded Stage G slice; it does not by
itself accept unrestricted coordination, reference, discourse, or cross-language semantics.

### 9. Corpus and benchmark ordering

Knowledge sources enter through DS016 and complete DS018 before large compilation. Their physical build and runtime use must meet DS019–DS021. WordNet- and ATOMIC-scale existing providers do not waive these requirements for the next larger source.

Benchmark work is ordered by prerequisite capabilities rather than dates: isolated logical and categorical primitives; multi-hop proofs and planning; formalization and first-order language; relation and spatial composition; SAT and CSP search; defaults and abduction; then expert-authored long arguments. The typed research catalog records the current queue and state. Advancing a catalog row requires DS017 adapter evidence and DS010 execution evidence, not a change to this roadmap specification.

### 10. Release acceptance

A release candidate rebuilds every repository-managed KB, validates registered packages, passes unit, integration, metamorphic, security, documentation, evaluation, and benchmark-regression checks, preserves direct symbolic behavior, and reproduces generated reports from frozen inputs. Every empirical claim names its protocol and current artifact.

Benchmark receipt audit is part of the release evidence. Rows that claim current behavior must bind to the candidate's
behavioral dependencies; historical-stale rows may remain visible only with that label. Forced-choice denominators,
attempt coverage, selective accuracy, input track, split quality, actual resource measurements, and execution-versus-
assembly identity must be reviewable. A small authored fixture or an annotation/solver track cannot serve as an
unqualified end-to-end product score.

A release may contain explicit capability gaps and benchmark exceptions. It may not claim completion merely because a visible development sample is perfect, because unsupported cases were dropped, because a Language Agent answered them, or because a benchmark-specific branch reproduces labels.

Release evidence exercises the default `balanced` work profile, at least one smaller and one larger profile, the
general CLI's disclosed assisted default, the explicit local override, and a controlled stub invocation path. For results that complete under
multiple profiles, semantic values, proof, provenance, trust, and status agree. Request-synthesis fixtures separately
check `PARTIAL` status, citations for every selected KB statement, explicit coverage gaps, and absence of invented
bridges.

## Decisions & Questions

### Question #1: When is an implementation stage accepted?

Response: Only when every acceptance obligation for that stage has executable evidence. Bounded slices from later stages remain useful and documented, but do not imply completion of the entire stage.

### Question #2: Why do the benchmark queue and architecture stages remain separate?

Response: Source acquisition and adapter validation can proceed before a general solver exists, and one benchmark can exercise several stages. Keeping the queue in the typed catalog prevents cached data or an adapter from being mistaken for an accepted architectural capability.

## Conclusion

The implementation sequence preserves a usable vertical system at every checkpoint while keeping ambitious future capabilities measurable. Stage claims depend on complete acceptance evidence rather than current prose or benchmark optimism.
