---
id: DS033
title: Grounded Conversational Knowledge Inspection
status: in-progress
owner: knowledge-runtime
summary: Defines natural entity summaries, bounded class listings, provenance, name correction, and fluent abstention over loaded declarative KB facts.
---

# DS033 Grounded Conversational Knowledge Inspection

## Introduction

A symbolic runtime should be able to answer “What do you know about Socrates?” without dumping unrelated lexical search hits, and it should be equally clear when it has no admitted fact. Basic Eval and direct operator feedback exposed a stable gap between exact declarative facts and conversational inspection. This specification defines the generic `grounded-knowledge-inspector` node that resolves a requested subject or class, selects only loaded model facts, and realizes a short natural answer with exact provenance.

The node is not a general web search, retrieval-confidence voter, biography generator, or substitute for proof. It cannot turn related KB evidence into an answer and cannot conceal a coverage gap behind fluent wording.

## Core Content

### 1. Node and packet boundary

The inspector consumes an admitted `packet:runtime:bounded-operation-frame` plus the already loaded declarative model and emits `packet:runtime:knowledge-inspection-result`. Required fields are operation, status, answer, values, witness, and method; knowledge-backed success additionally carries fact provenance and contributing KB identities. The producing node validates its packet before the `typed-operation-result-assembler` constructs a runtime candidate.

The node is a non-voting `process`, query-local, offline, and `instrumented-local`. It cannot load an unselected KB, call a provider outside the runtime's selected scope, use related-grounding output as answer evidence, mutate session facts, or authorize the final result.

### 2. Entity resolution

Names are NFKC-normalized, case-folded for comparison, and stripped to Unicode letters and numbers separated by spaces. An exact normalized match is preferred. A correction is admitted only when exactly one loaded name is at edit distance one, or the best such match is strictly closer than the next candidate. Otherwise resolution abstains. The answer explicitly discloses an admitted correction such as interpreting `Socrate` as `Socrates`.

This narrow correction handles a likely one-character operator error without turning fuzzy similarity into entity authority. Aliases come from declarative entities. Core code must not contain a benchmark-derived name map, famous-person list, or answer text.

### 3. Fact selection and realization

An entity summary selects facts whose subject is the resolved entity. It orders them deterministically by predicate and object, respects the frame's maximum sentence count, and realizes only allowlisted declarative predicates. Current natural forms cover class membership, capabilities, `known_for`, and `lived_in`; an unknown predicate uses a literal readable relation form without changing its value. Every realized sentence maps to its fact identifier and source provenance.

An entity-class listing currently supports people through explicit `is_a` facts whose value is an allowlisted person class such as person, human, philosopher, scientist, artist, or writer. It lists deterministic primary names from loaded entities and binds contributing facts. Listing is bounded; truncation must be disclosed in the witness and answer rather than silently presented as complete.

### 4. Natural inability

If no unique entity matches, the result is `UNKNOWN` and says directly that the loaded KBs contain no admitted facts about the requested surface. If the entity exists but has no subject facts, it says that the name is recognized but no fact can be stated. If a requested class contains no known entity, it says so plainly. These answers do not append dictionary senses for words in the question, ConceptNet neighbors, or other related records as though they supported the requested claim.

Structured diagnostics, consulted KB identities, and optional related grounding may remain available to machine clients or explicit trace views. The default conversational answer is the natural inability sentence, not an internal route/status/version dump. KB and external-source versions remain real provenance metadata but are not repeated through every visible sentence.

DS035 does not weaken this entity-inspection boundary. Its default task context may retrieve lexical or relational
records for the same surface before inspection, but those records cannot become an exact entity summary merely because
they are relevant. If inspection fails and DS035 admits a contextual fallback, the result is separately
`PARTIAL`, begins with the precise inability, cites every realized source claim, keeps semantic values empty, and says
that the context does not establish the missing entity claim. A DS033 `SOLVED` summary still contains only facts
selected by this inspector and its witness.

### 5. Bounds, provenance, and coverage

Resolution, fact selection, listing, and output are governed by explicit entity, fact, comparison, sentence, and byte limits. A bound never proves absence. When the inspected model frontier is incomplete, the witness records the omission and the answer avoids “all” or complete-coverage language. A `SOLVED` summary may state the admitted facts it found; it may not imply that no further facts exist.

Only facts actually realized into answer sentences contribute to `usedKbVersions` and answer provenance. `consultedKbVersions` records the selected loaded scope separately. A source-derived version is retained in machine provenance because it identifies real knowledge content; the human answer uses stable source names unless an operator asks for trace detail.

### 6. QUICK and real-KB evaluation

QUICK may contain a small independently authored set of general facts for smoke testing and interactive demonstration. It must pass package schema, provenance, hash, compiler, and runtime validation and must not copy a benchmark answer table. A QUICK-assisted result is reported separately from core-only and real-KB results.

Real-KB evaluation selects source-derived packages under their normal routing and memory policies. A catalog entry is not an executed result. Reports record exact selected, consulted, and contributing package identities, package digests, executable digest, query result, and any incomplete frontier. The eventual no-QUICK evaluation remains mandatory evidence for genuine source coverage.

### 7. Tests and falsification

Tests include exact aliases, one-edit corrections, ambiguous one-edit candidates, unknown nonce names, entities with no facts, changed predicates, renamed people, multiple classes, empty classes, output truncation, and provenance replay. A nonce query must not receive facts about a nearby famous entity. Removing a fact must remove its sentence and contributing provenance. Reordering canonical records must not change the answer.

## Decisions & Questions

### Question #1: Why is related evidence hidden from the normal inability answer?

Response: Related records can help debugging or reformulation but do not support the requested claim. Showing them as the main response makes the system appear confused and obscures the honest `UNKNOWN` boundary.

### Question #2: Is one-edit correction always safe?

Response: No. It is admitted only for a unique closest loaded name and is explicitly disclosed. Ambiguity causes abstention.

### Question #3: Why retain KB versions in machine output?

Response: KB packages and external sources have real independent content identity and provenance. The policy against artificial internal revision noise does not remove evidence identity; it removes repetitive display and speculative parallel internal protocols.

## Conclusion

Grounded conversational inspection connects declarative facts to useful natural answers while keeping resolution, provenance, coverage, and abstention explicit. It replaces irrelevant evidence dumps with concise supported statements and preserves `UNKNOWN` whenever the loaded knowledge cannot answer.
