---
id: DS011
title: Implementation Sequence, Corpus Gates, and Acceptance
status: in-progress
owner: roadmap
summary: Defines the vertical implementation order, corpus-specific architecture gates, acceptance criteria, profiling obligations, and system-level release conditions.
---

# DS011 Implementation Sequence, Corpus Gates, and Acceptance

## Introduction

The complete architecture is implemented through vertical capabilities that each run from language to result and establish a regression baseline. Later stages may be specified in detail before implementation, but they must not be presented as current behavior until their acceptance evidence exists.

## Core Content

### 1. Implementation strategy

The system should be built as a sequence of vertical capabilities rather than as a complete speculative platform. Each stage must produce an executable path from text to result and a regression baseline.

### 2. Stage A: contracts and narrow CNL

The first stage fixes the Semantic IR, result statuses, KB logical schema and `src` versus KB boundary. It implements atomic CNL, universal and existential categorical forms, simple implications, negation and direct questions.

A small benchmark set such as LogicBench, IIBench, RuleTaker or ProofWriter establishes parsing, reasoning and proof traces. The KB may initially use an in-memory or embedded-database backend.

Acceptance requires deterministic rebuild, no executable KB code, direct symbolic parsing metrics and valid proofs on the supported fragment.

### 3. Stage B: document-to-KB construction

The second stage implements source registration, span-preserving segmentation, semantic extraction, entity handling, provenance, canonical serialization and the Document-to-KB Builder skill.

Acceptance requires rebuilding a KB from documents, traceable source spans, schema and contradiction validation, and a query suite that survives recompilation.

### 4. Stage C: compiled shards and dynamic loading

The third stage implements manifests, dictionary coding, access-path indexes, shard summaries, registration, routing and bounded caches. The same query suite runs against exhaustive and lazy modes.

Acceptance requires semantic equivalence, no false-negative routing, deterministic checksums and memory-bounded execution on a KB larger than available memory.

### 5. Stage D: event, temporal and relational reasoning

The fourth stage adds event frames, roles, temporal order, state updates, spatial composition and reference candidates. bAbI, CLUTRR and StepGame-like tasks become primary regressions.

Acceptance requires metamorphic language tests, unseen chain-length tests and stable direct symbolic coverage.

### 6. Stage E: task planning and constraints

The fifth stage implements the capability registry, task-frame decomposition, AND/OR planning, CSP or SAT integration and explicit capability-gap reporting. ZebraLogic, SATBench and SLR-Bench-like tasks exercise search and planning.

Acceptance requires correct distinction between missing knowledge, no applicable method and resource exhaustion.

### 7. Stage F: defaults, uncertainty and commonsense

The sixth stage introduces declarative defaults, exceptions, graded claims, abduction and commonsense KBs. Defeasible NLI, CommonsenseQA, SocialIQA, PIQA and alphaNLI provide evaluation.

Acceptance requires no conversion of defeasible knowledge into strict facts, calibrated abstention and traceable hypotheses.

### 8. Stage G: richer CNL and optional LLM fallback

The final language stage expands relative clauses, embedded clauses, complex coordination and discourse reference. The optional LLM path is added only with anchor preservation and reparse validation.

FOLIO, ProverQA, WinoGrande, ReClor and LogiQA measure the language frontier. Acceptance requires explicit route metrics and no hidden LLM answering.

### 9. System-level acceptance

A release candidate must rebuild all KBs, pass core unit tests, pass benchmark regressions, preserve direct symbolic performance, validate compiled-query equivalence, report honest failure statuses and reproduce its evaluation from fixed versions and seeds.

The package is ready for comparison with existing small LLMs only after fresh shadow performance stabilizes and the final symbolic system is frozen.

### Corpus architecture gate

Every new public knowledge source begins with an immutable source manifest, deterministic stratified probe, source-to-record semantic mapping, scope and inference policy, resource budget, streaming Node.js adapter, shard and access-path design, and canonical-to-compiled equivalence plan. Sources above 50 MB compressed or expected to exceed 100,000 records cannot enter exhaustive compilation until this gate is reviewed.

The probe samples by stable hash within meaningful strata rather than reading only a source prefix. It accounts for record kind, relation, language, upstream source, license, weight or rank, datatype, qualifier, time, space, text length, parse outcome, malformed cases, conflicts, ambiguity, cycles, and oversized values. Every observed stratum is mapped, preserved as evidence, quarantined, or rejected by an explicit profile policy.

Profiling covers source read, decompression, parsing, schema validation, normalization, deduplication, dictionaries, semantic mapping, anomaly handling, sharding, indexes, provenance, emission, validation, registration, cold loading, representative query, negative query, deep proof, ambiguity, and overlay execution. A gate fails when memory tracks the complete decoded source without a declared external partition, throughput collapses without explanation, one query loads unrelated domains, a session fact triggers whole-KB closure, alias ambiguity is discarded, or profiling cannot identify the cost.

### Source order and benchmark tracks

Lexical knowledge begins with Open English WordNet using sense-preserving terms and taxonomy rules. Event and social commonsense follows through ATOMIC with participant roles and explicitly defeasible relations. Filtered English ConceptNet follows only with relation-specific semantics, source-overlap accounting, defaults, and exceptions. A bounded GeoNames countries-and-capitals profile follows with typed place identity, coordinates, and administrative containment. Wikidata is limited to future dated thematic packs; a complete dump is not a target.

Controlled benchmarks proceed in parallel as diagnostics. Logic and proof tasks establish the narrow CNL and strict reasoning core. bAbI, CLUTRR, and StepGame test event and relational execution. SATBench, ZebraLogic, and SLR-Bench test planning and constraints. Defeasible and commonsense suites test uncertainty. FOLIO, ProverQA, WinoGrande, ReClor, and LogiQA push the language boundary only after the required semantic operators exist.

### Reset baseline

The repository reset begins again at Stage A under the declarative-KB architecture. Cached source archives may be reused only after their checksums are verified against new source manifests. Old prepared datasets, candidates, work ledgers, executable model modules, and executable KB modules are not accepted checkpoints. Historical result files may be retained only when clearly marked as pre-reset evidence and excluded from current implementation claims.

## Decisions & Questions

### Question #1: Why reset rather than migrate executable KB modules?

Response: The former representation violates the new non-executable KB invariant. Recompiling from verified source archives through the new canonical schema provides a reviewable semantic baseline and avoids preserving accidental module-specific behavior.

### Question #2: What is the first accepted release after reset?

Response: A Stage A vertical slice with canonical KB records, manifest registration, direct symbolic parsing for the stated fragment, at least direct lookup and safe Horn reasoning, structured results, honest failure, deterministic compilation, and tests for all boundaries.

### Question #3: When can the project claim a later stage?

Response: Only when its executable path, success and failure tests, profiling, documentation, and relevant benchmark or source evidence all satisfy the stage acceptance contract.

## Conclusion

The roadmap permits ambitious language, knowledge, planning, and uncertainty goals while forcing every release to remain executable, measurable, and honest about incomplete stages.
