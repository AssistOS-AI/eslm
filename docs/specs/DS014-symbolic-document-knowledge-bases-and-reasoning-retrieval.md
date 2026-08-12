---
id: DS014
title: Symbolic Document Knowledge Bases and Reasoning Retrieval
status: planned
owner: knowledge
summary: Defines provenance-preserving compilation of books, manuals, and technical documentation into sharded symbolic KBs that support query-directed retrieval, temporal and relational reasoning, proofs, and source citations.
---

# DS014 Symbolic Document Knowledge Bases and Reasoning Retrieval

## Introduction

ESLM must eventually turn a book, manual, standards collection, or technical documentation set into more than a bag of passages. The document compiler preserves the original edition and its addressable spans, derives typed records from those spans, and publishes an immutable knowledge package. At query time, retrieval selects potentially relevant symbolic evidence and executable methods derive an answer with a trace back to the source. This is a symbolic retrieval-and-reasoning system, not a vector search followed by an opaque text generator.

This specification describes the target contract now so benchmark work, KB storage, language analysis, and future document ingestion converge on one architecture. It does not claim that unrestricted document compilation is implemented at the current checkpoint. Existing package schemas, shard caches, indexes, proof records, and deterministic core methods are the implementation foundation; full discourse interpretation, document-scale coreference, table and diagram extraction, and calibrated source conflict resolution remain future work.

## Core Content

### 1. Source registration and immutable identity

Every source collection satisfies the complete DS016 identity, authority, license, citation, cache, and redistribution
contract before semantic extraction begins. This document-specific contract additionally requires title, authors or
publisher, edition or revision, language, media type, and the exact decoding toolchain. A new edition is a new immutable
source identity, never an in-place mutation of the old one.

The decoded document retains a hierarchy of volume, chapter, section, subsection, page, paragraph, list item, table cell, code block, and other source-appropriate spans. Each span has a stable address within the frozen edition and a digest of its normalized bytes. The compiler may repair encoding and layout, but every repair is logged and the original bytes remain the authority. Page numbers alone are insufficient because electronic formats may not have stable pages; hierarchical anchors and byte or character ranges must also be available.

DS016 owns legal authority and DS009 owns trust. Document compilation preserves their distinction: permission to use a
source does not establish its truth, and source credibility does not widen redistribution authority.

### 2. Evidence boundaries before interpretation

Segmentation creates reviewable evidence units, not answer-sized chunks. Headings, paragraphs, lists, tables, definitions, examples, warnings, procedures, and code samples are retained as typed spans with structural links. Overlapping windows may assist the compiler, but they never become the sole provenance address and never erase document structure.

The compiler records layout-derived relations such as `contained-in-section`, `continues-on-page`, `caption-for`, `row-header-for`, and `example-of`. It preserves quotation boundaries and distinguishes the document author's claim from a quoted third-party claim. OCR confidence, language detection, unresolved layout, and missing pages are explicit diagnostics.

### 3. Canonical semantic records

Document KBs use the complete DS005 canonical model. This vertical contract requires that the selected generic or
provider-specific declarative records preserve the following document meanings:

- concepts and entities with stable identifiers, type assertions, names, aliases, abbreviations, and source-local mentions;
- definitions that connect a term to a typed meaning in a declared context;
- assertions with predicate, arguments, polarity, modality, scope, confidence regime, and provenance;
- rules with typed variables, safe premises, conclusion, exception conditions, and declared reasoning regime;
- events with participants, semantic roles, time, location, preconditions, effects, and causal or motivational links;
- procedures with ordered or partially ordered steps, required state, state transition, failure conditions, and recovery actions;
- quantities, units, ranges, comparisons, tolerances, and measurement context;
- quotations and attributed claims that are queryable without being silently promoted to accepted world facts;
- retractions, supersession links, contradictions, and contextual alternatives.

The canonical package is inert data. A document sentence, formula, code block, or instruction is never executed. Only allowlisted record shapes are compiled into statically loadable indexes, and only trusted core methods interpret those shapes.

### 4. Identity, aliases, and discourse links

Mentions are not merged because their strings look alike. The compiler proposes entity and concept links with evidence from definitions, aliases, document structure, type compatibility, and local discourse. Ambiguous links remain alternatives. A stable global identifier may connect editions and sources only after a reviewed equivalence decision; otherwise a source-local identifier is preserved.

Coreference records connect pronouns, descriptions, abbreviations, and repeated mentions to candidate referents with scope and evidence. Ellipsis and implicit arguments remain explicit gaps when the compiler cannot establish them. A query planner may branch over unresolved alternatives but must not collapse them into a single asserted fact.

Concept chains use typed edges such as `is-a`, `part-of`, `instance-of`, `defined-by`, `causes`, `enables`, `requires`, `prevents`, `used-for`, and source-specific relations. Relation meaning comes from package metadata and algebra declarations, not hardcoded predicate spellings in the core.

### 5. Temporal and evolving knowledge

Document knowledge distinguishes event time, valid time, and source or transaction time. Event time describes when an event occurred. Valid time describes the interval during which a state or rule applies. Transaction time records when the package learned or published the record. These axes must not be conflated.

Events may have exact instants, closed or open intervals, qualitative relations such as before, overlaps, during, and meets, or unresolved partial order. State transitions link a prior state, event, and successor state. Repeated editions and change logs can supersede a rule from a declared revision without rewriting history. Queries such as “what was valid before the update?” therefore load temporal indexes and reason over the applicable interval rather than returning the newest matching sentence.

The initial implementation may support a documented subset of interval relations. Unsupported temporal precision returns a typed gap. It must not convert vague language into invented timestamps.

### 6. Physical package and shard layout

DS006 owns package identity, DS019 owns streaming compilation and immutable shard formats, and DS021 owns cache
residence. A document package adds required access paths for lexical terms, entity mentions, predicate arguments,
relation adjacency, rule dependencies, event participants, temporal intervals, document hierarchy, and provenance
spans. Omitting one of these views is permitted only under the DS019 exact-coverage rule and must remain visible as a
document query limitation.

Document hierarchy and temporal partitions are legitimate locality keys, but they cannot change semantic membership.
The complete accepted record set and every document-specific access path remain reconciled through the DS019
canonical-to-compiled equivalence receipt.

### 7. Query-directed retrieval plan

DS020 exclusively defines exact query-directed routing and proof-frontier expansion. A document task contributes typed
concept and entity candidates, document hierarchy constraints, temporal scope, desired citation granularity, and
provenance-span requirements to that generic task signature. The selected DS015 methods return the semantic witness;
the document result joins every leaf back to its DS005 provenance record and frozen structural span.

DS021 defines cache equivalence and resource refusal. Document retrieval cannot reinterpret a cache miss, unopened
hierarchy branch, or incomplete temporal frontier as logical absence.

### 8. Symbolic RAG positioning

The feature may be described as symbolic retrieval-augmented reasoning, or symbolic RAG, when the description includes its precise difference from ordinary passage RAG. Retrieval does not hand arbitrary chunks to a generator. It selects typed records and rules with stable provenance. The deterministic symbolic core can join evidence across sections, follow concept and relation chains, compute state changes, apply explicit defaults and exceptions, and prove or refute a query within declared method bounds.

An answer may therefore be absent verbatim from every source passage while still being justified by a reviewable derivation. For example, one section may define a component as part of a subsystem, another may state that the subsystem is disabled during a maintenance interval, and a procedure may require that subsystem. The planner can connect those records and conclude that the procedure is unavailable during the interval, while citing all contributing spans. It may not invent a causal link merely because passages are lexically similar.

“Plausible” means supported by an explicitly defeasible method with visible alternatives and provenance, not fluent generation. Strict deduction, skeptical default reasoning, guarded abduction, and narrative or compatibility ranking must remain distinguishable in the result.

### 9. Grounding when no answer is established

Symbolic RAG has a recovery mode as well as an answering mode. If parsing, retrieval, or a registered method cannot
establish the requested answer, the runtime may still return bounded, source-addressable records related to accepted
entities, concepts, predicates, or original surface terms. DS009 owns the grounding bundle and its strict
`answerSupported: false` boundary; DS020 owns how selected packages search their indexes.

For document packages, a grounding entry should include the canonical record, edition-qualified package identity,
epistemic status, exact document span, and any derivation witness. It may expose a relevant definition, warning,
procedure step, temporal rule, or conflicting claim even when no complete proof connects it to the question. This is
useful material for clarification or for a separately evaluated downstream model, but lexical or structural relevance
is never promoted to an answer premise.

The recovery path preserves four distinctions:

- no related evidence after complete search versus no evidence observed after incomplete search;
- source assertions versus derived records and their support witnesses;
- answer-contributing KB versions versus selected, consulted, and grounding-contributing versions;
- deterministic symbolic inference versus optional downstream formulation from the exported evidence bundle.

Document-scale grounding remains query directed and bounded. It never scans an entire compiled collection after every
failure, and it never runs after an exhausted primary resource budget unless a separate grounding budget was reserved.

### 10. Document build pipeline

The document pipeline consumes a DS016 source, decodes it, and establishes the structural spans defined here. DS004
owns candidate learning and promotion, DS007 owns the training command and packet interface, DS009 owns isolation and
untrusted output, DS018 owns the corpus gate, and DS019 owns compilation. The document-specific stages are structural
decoding, span accounting, quotation and hierarchy preservation, document identity proposals, and proof-to-span tests.
The DS013 operator Language Agent has no authority in this build process.

The compiler records coverage: decoded spans, semantically attempted spans, accepted records, unresolved spans, rejected candidates by reason, and provenance coverage. It never equates extraction count with factual correctness. Promotion requires nonce tests for generic mechanisms, source-grounded spot checks, contradiction checks, eager/lazy equivalence, proof-to-span validation, and held-out questions that were not exposed in the extraction packet.

### 11. Answer and citation contract

Every document-backed result identifies the package versions and source editions consulted. A strict answer includes the proof graph and the exact source spans supporting leaf records. A defeasible or abductive result identifies its reasoning regime, ranked alternatives, assumptions, counterevidence, and why the selected hypothesis outranks others. A quoted answer distinguishes exact quotation from deterministic realization of a symbolic conclusion.

DS009 is the status authority. When evidence conflicts, the runtime returns `INCONSISTENT_CONTEXT` or applies only a
declared trust and context policy while preserving the conflict. An incomplete shard frontier returns `RESOURCE_LIMIT`.
Absent required document premises return `MISSING_KNOWLEDGE` with the searched scope. `UNKNOWN` is reserved for a
completed applicable search in which available knowledge neither entails nor contradicts the target. A missing
transformation remains `NO_APPLICABLE_METHOD`.

### 12. Security and review invariants

DS009 owns the untrusted-document threat model, DS006 owns package path and dependency validation, and DS019 owns
compiled-data integrity. Embedded instructions, formulas, code blocks, and strings remain inert source content.
Generated dictionaries, indexes, shards, and routing summaries are allowlisted data segments only; they are never
modules, callbacks, import specifiers, or executable helpers.

A document KB cannot modify core methods, override another namespace, contact a network, or start a subprocess at
runtime. Source strings remain normalized index data and never become JavaScript identifiers or paths.

### 13. Present boundary and staged delivery

The present repository implements canonical KB records, compiled packages, several public-source indexes,
query-directed shard loading, bounded caches, proof-bearing core methods, provenance, and a generic failure-time
grounding bundle over canonical facts, the session overlay, and selected public providers. The fallback is an
implemented bounded record-retrieval foundation, not document comprehension: it does not yet search book-scale span
indexes or compile a general book or manual. The next document stage should use a small legally distributable
technical source with definitions, procedures, temporal changes, and cross-section questions, then demonstrate
complete source retention, stable compilation, eager/lazy equivalence, derived answers with citations, and useful
grounding for deliberately unanswerable or partially supported requests.

Benchmark completion remains the immediate research priority. This specification prevents that work from creating benchmark-only representations that cannot later serve document knowledge. It does not authorize claims of document-scale comprehension before the staged acceptance evidence exists.

## Decisions & Questions

### Question #1: Why is document structure preserved alongside record provenance?

Response: Structure carries meaning needed for interpretation and review. A heading scopes definitions, a warning may govern a following procedure, a table header supplies omitted arguments, and a later section may supersede an earlier one. Flat span identifiers cannot reliably represent those relations.

### Question #2: May a symbolic document KB answer wording that differs from the source?

Response: Yes, when the language frontend maps the question to supported concepts and the selected symbolic method derives the answer from sourced records. The result cites the contributing source spans and identifies the derivation. It must return a gap rather than invent an unsupported bridge.

### Question #3: How do temporary events connect to enduring concepts?

Response: Events reference stable participant concepts or entities through typed roles and create or terminate state intervals. Event time, state valid time, and publication time remain separate. Queries choose the relevant temporal view before executing state or rule reasoning.

### Question #4: Is a related source span a citation for the answer?

Response: Only when a registered method uses the corresponding record in the answer proof. A span returned solely by
failure-time grounding is cited as a related record inside the bundle and is explicitly not answer provenance.

## Conclusion

A document KB is a provenance-preserving symbolic program of inert concepts, claims, rules, events, procedures, temporal relations, and source addresses. Query-directed indexes make it practical to load only relevant shards; registered core methods make it possible to derive answers across those records; proof and citation contracts keep the result reviewable. This design turns retrieval into an auditable input to reasoning rather than a substitute for reasoning.
