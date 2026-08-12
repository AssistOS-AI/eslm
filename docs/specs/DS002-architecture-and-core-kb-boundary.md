---
id: DS002
title: Architecture, Core Capabilities, and the KB Boundary
status: in-progress
owner: architecture
summary: Defines reusable trusted mechanisms, declarative KB content, capability descriptors, overlays, and the promotion or demotion test between core and knowledge.
---

# DS002 Architecture, Core Capabilities, and the KB Boundary

## Introduction

The architecture preserves one reusable symbolic system across every document collection and benchmark. This specification determines whether an artifact is trusted executable machinery, declarative knowledge, a domain plan, or an ephemeral context overlay.

## Core Content

### 1. Architectural boundary

The existing distinction between reusable code in `src` and data in KBs is retained and strengthened. The system must not create a new parallel architecture for each benchmark. Benchmark adaptation occurs by extending a current KB, adding a new KB, enriching the reusable lexicon or semantic frames, and only exceptionally improving generic code.

The central question for every learned artifact is not where it is easiest to put it, but what kind of thing it is. World knowledge and domain semantics belong in KBs. Generic computation and language mechanisms belong in `src`.

### 2. What belongs in `src`

`src` is the only location for trusted executable mechanisms. In the target architecture this includes the symbolic
tokenizer, morphology, feature grammar or chart parser, semantic-composition operators, reference resolution,
task-frame builder, planner, rule interpreters, graph and temporal methods, default reasoning, constraint solvers,
search, proof construction, contradiction handling, confidence semantics, deterministic language approximation,
request-intent planning, bounded result construction, role-focused grounding, shard loaders, and result formatting.
This list assigns ownership; it does not claim that every mechanism is implemented.

At the present checkpoint, `src` contains bounded deterministic language compilers and the DS022 confidence-voted
recovery ensemble rather than a general chart parser, a request-intent planner with bounded extractive `PARTIAL`
construction plus a single-goal reasoning skeleton rather than general AND/OR planning, positive Horn reasoning and
several finite typed methods rather than every listed logic, and provider-specific retrieval/caches rather than the
complete future catalog. DS003, DS008, DS015, DS020, and DS022 state those exact boundaries. Documentation must not
infer an executor from the appearance of a mechanism in this ownership list.

A new mechanism belongs in `src` when its behavior is independent of the vocabulary and topic of the benchmark. Passive-voice semantic-role inversion, quantifier scope, temporal state supersession, unification, backtracking and proof search are representative examples.

DS008 owns the planner-facing capability descriptor and DS015 owns the executable semantics, completeness boundary,
uncertainty behavior, and witnesses of each method. DS027 owns the common strategy descriptor and static coordination
contract that may wrap such a method for scheduling without redefining it. This specification determines placement in
trusted code; it does not duplicate those contracts.

### 3. What belongs in a KB

A KB contains declarative knowledge whose complete logical record contract is defined by DS005. Its package remains
inert under DS006. A domain plan may reference registered methods through the DS008 plan contract, but neither a record
nor a plan can define method implementation or acquire code authority.

A KB or source manifest may carry a schema-validated compatibility requirement or recommendation for an exact DS027
strategy identity. That inert reference never installs an executor, changes the host profile, disables a verifier, or
increases a resource limit. Deployable strategy executors remain statically registered trusted code in `src`.

### 4. Decision test

| Question | Architectural consequence |
|---|---|
| Would the artifact remain useful if all domain words and entity names changed? | It is a candidate for `src`. |
| Does the artifact state something about the world, a domain or a dataset convention? | It belongs in a KB. |
| Is the artifact an algorithm, search procedure or semantic operator? | It belongs in `src`. |
| Is the artifact a relation, lexical mapping, frame, fact, constraint or rule instance? | It belongs in a KB. |
| Can the artifact be interpreted by an existing trusted operator? | It may be declarative KB data. |
| Would executing it require evaluating arbitrary code? | It is prohibited in a KB. |

### 5. CNL placement

The generic grammar and semantic composition of the CNL belong in `src`. Language-specific lexical entries, domain terminology, predicate aliases and semantic frames may be supplied by language or domain KBs.

The distinction is important during document ingestion. If the sentence fails because the word `purchase` is unknown but the `buy` event frame already exists, a lexical mapping belongs in the relevant KB. If all passive constructions fail, the missing operation is grammatical and belongs in `src`.

A new CNL form must not be added merely because one source document uses an unusual sentence. DS022 first permits a
bounded deterministic interpretation proposal; if local recovery is exhausted, an operator may explicitly enable the
DS013 Language Agent, otherwise the form remains unsupported. Promotion into the direct grammar or the reviewed
heuristic catalog requires evidence across independent examples, renamed and meaning-changing controls, confidence
calibration where applicable, and a regression suite that demonstrates stable semantics.

### 6. Multiple KBs and overlays

The runtime may register many KBs. Some KBs are foundational, such as a common ontology, general lexicon or units system. Others are domain-specific, source-specific, project-specific or session-specific.

DS006 exclusively defines manifest dependency resolution, namespace compatibility, immutable overlays, and compaction.
DS009 defines conflict preservation and trust-policy effects. The architectural requirement here is that composition
remain explicit and cannot give one KB a private runtime.

### 7. Promotion from KB to core

A declarative rule or interpretation pattern may reveal a generic missing mechanism after repeated use. Promotion to `src` is justified only when the same abstraction appears in several independent KBs or benchmark families, cannot be represented cleanly through existing operators, and produces a simpler or more correct global semantics.

Promotion requires a generic specification, focused unit tests, metamorphic tests, all previous benchmark regressions and a migration plan for existing KB records. The former KB rule should either remain valid through the new operator or be deterministically recompiled.

### 8. Demotion and simplification

The architecture also permits demotion. If code in `src` is discovered to encode domain knowledge or benchmark-specific cases, it should be replaced by a generic mechanism plus declarative KB records. This reduces the trusted code surface and prevents dataset contamination.

The desired long-term shape is a compact, highly tested core; rich but declarative KBs; and explicit interfaces between them.

### Runtime phase boundaries

The direct answer path is language front-end → accepted Semantic IR → task frame → catalog discovery → shard and
method planning → bounded execution → proof verification → result realization. DS027 assigns these responsibilities
to typed strategy stages with one deterministic host coordinator; a strategy cannot make an opaque cross-stage call or
use downstream answer success to reinterpret an earlier stage. After direct `UNPARSED`, the default
text interface may instead run the DS022 deterministic candidate ensemble, reparse an eligible candidate with
query-local episode state, or recognize an explicit artifact request and execute bounded extractive construction. Only
after local recovery is exhausted may an explicitly enabled DS013 Language Agent propose another reparse candidate.
DS003, DS022, DS013, DS008, DS020, DS015, and DS009 own those typed boundaries. DS004 owns construction and promotion;
DS017 owns evaluation-pool isolation. The runtime does not discover training files, invoke a coding agent, download a
source, or execute a KB payload.

If the primary path cannot establish an answer, a bounded related-evidence phase may query already selected declarative
indexes under DS009, DS020, and the exact DS022 work policy. This remains trusted generic retrieval in `src`; source
facts and lexical neighborhoods remain KB data. Ordinary failure grounding cannot execute KB content, change the
primary status, or pass evidence into the DS013 language-only normalizer. A separately identified DS022 artifact
request may select related records as cited source claims in a `PARTIAL` extractive result; that route is construction,
not a proof method, and records every selected contributor without upgrading relevance to truth.

### Capability descriptors

DS008 defines the machine-readable descriptor consumed by planning. DS015 defines the semantics of every method bound to
one. Registration is permitted only when executable code and its independent witness tests exist; a descriptor alone
does not establish a capability. DS027 additionally requires an `eslm-strategy-descriptor-v1` when a method
participates in the common coordination plane. The method descriptor states semantic meaning; the strategy descriptor
states stage, typed scheduling, resource, configuration, and receipt behavior. One cannot substitute for the other.

### Generality proof for the boundary

The rename test in Section 4 decides architectural placement. DS004 owns promotion evidence, DS015 owns method-level
generality and falsification tests, and DS017 owns adapter-policy and oracle controls. A failed control keeps the
artifact in provenance-bearing source policy or an adapter hypothesis rather than trusted generic code.

## Decisions & Questions

### Question #1: What is the decisive core-versus-KB test?

Response: Rename all domain vocabulary and identities. If the artifact remains useful as an algorithm or semantic operation, it is a core candidate. If it states source, domain, lexical, ontological, or workflow knowledge, it belongs in a KB.

### Question #2: May a KB define a domain workflow?

Response: Yes, as a declarative plan whose steps and type constraints reference registered method IDs. It cannot provide the implementation of those methods.

### Question #3: How is legacy code that embeds domain facts treated?

Response: It is demoted into canonical KB records and interpreted by a generic mechanism. This reduces the trusted code surface and makes cross-source regression meaningful.

### Question #4: Does strategy modularity permit third-party executable KB extensions?

Response: No. It permits researchers to develop independently testable generic executors and compare them through a
shared typed coordinator. A deployable executor enters the system only through repository review and static host
registration. KBs and configuration can reference allowed identities as data but never supply code or import paths.

## Conclusion

A compact, globally tested core and independently versioned declarative KBs are the defining architectural separation. Every extension must preserve it or record a reviewed change to this specification.
