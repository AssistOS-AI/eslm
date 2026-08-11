---
id: DS000
title: Vision and System Invariants
status: in-progress
owner: research
summary: Defines ESLM identity, the generic-core and declarative-KB boundary, measurable success, evidence discipline, and non-negotiable runtime invariants.
---

# DS000 Vision and System Invariants

## Introduction

This specification defines the system that the repository is intended to build. It supersedes narrower earlier formulations when they conflict with this contract. The executable path, knowledge representation, learning process, failure behavior, and research claims must all preserve the boundaries stated here.

## Core Content

### 1. System identity

The target system is an executable symbolic language model. It is not a statistical next-token model and it is not a wrapper that delegates reasoning to an LLM. It is a runtime that accepts linguistic instructions and contextual information, constructs explicit semantic representations, retrieves declarative knowledge, plans a reasoning procedure, executes that procedure and produces a result with traceable justification.

The system is designed to approach a useful subset of the functional behavior associated with a language model. It must receive heterogeneous instructions, facts and questions rather than only a fixed query language. It must attempt to understand the request, identify the required knowledge and methods, decompose the task when necessary and detect when the requested capability is absent.

The central research hypothesis is that a substantial region of language understanding, general knowledge and reasoning can be represented as reusable executable mechanisms plus declarative knowledge, and that a coding agent can enlarge this region by turning benchmark failures into carefully tested improvements. The purpose of the architecture is not to assume that this hypothesis is true in every domain. The purpose is to make the boundary measurable.

### 2. Existing architectural assumption

Reusable executable behavior already belongs in `src`. This includes the CNL parser, semantic composition, inference engines, search algorithms, planners, confidence propagation, contradiction handling, provenance processing and the runtime interfaces needed by all KBs.

Knowledge bases are independently generated and independently versioned data products. The runtime may register any number of KBs and may use several in the same task. A KB does not own a private runtime and cannot silently replace the semantics of the generic core.

This separation is the primary architectural invariant. It prevents each dataset from becoming a separate program and makes cross-benchmark regression meaningful.

### 3. Non-negotiable invariants

| Invariant | Required interpretation |
|---|---|
| Generic execution belongs in `src` | Algorithms and reusable language mechanisms are implemented once and tested globally. |
| KBs contain no arbitrary executable code | KBs are declarative and schema-validated. Rules are restricted data interpreted by trusted core operators. |
| Every accepted assertion has provenance | Facts, lexical mappings and learned rules identify their source, extraction path and version. |
| Every LLM output is untrusted | Translation or simplification must be reparsed and validated before use. |
| Direct symbolic parsing is attempted first | English input is not sent to the LLM merely because it appears complex. |
| No routing decision may create silent false negatives | Approximate relevance signals may rank shards, but safe exclusion requires exact or conservative evidence. |
| Core changes require global regression | A local benchmark gain cannot justify an untested change to reusable code. |
| Runtime uncertainty is explicit | The system distinguishes solved, unknown, ambiguous, inconsistent, unsupported and resource-limited outcomes. |
| Generated runtime artifacts are rebuildable | Indexes and binary shards can be regenerated from canonical KB records and manifests. |
| Correct answers do not excuse invalid traces | Where the task is deterministic, proof or execution validity is independently evaluated. |

### 4. System lifecycle

The lifecycle begins with authorized evidence, produces reviewed declarative knowledge or a genuinely generic mechanism,
and ends in a typed result whose derivation or exact inability remains inspectable. The lifecycle never permits a source,
benchmark, agent response, package, or cache state to acquire executable authority by passing into a later phase.

DS004 exclusively defines benchmark-guided learning and promotion. DS006 defines package registration and immutable
identity. DS020 defines query-directed routing. DS009 defines the distinction among interpretation, knowledge, method,
conflict, and resource failures. DS013 defines the optional operator normalization profile. Those specifications carry
the operational algorithms, receipts, and exceptional paths; this specification requires that their composition
preserve the system identity and invariants above.

### 5. Research data produced by the architecture

The system must retain the history necessary to study executable learning. Each substantial benchmark failure should be linked to the parse, selected KB records, attempted methods, result, diagnosis, patch and post-patch measurements. This creates a dataset of program repair and knowledge acquisition rather than merely a final score.

The most important longitudinal measurements are answer accuracy, direct symbolic parsing rate, proof validity, fresh-sample generalization, regression rate, KB growth, reusable core growth, dynamic loading cost and the distribution of honest failure statuses. These measurements reveal whether progress comes from better language understanding, better knowledge, stronger reasoning, broader fallback use or unsafe special casing.

### 6. Definition of success

Success is not defined as making every benchmark green. Success is defined as a stable expansion of the tasks that the system can parse, plan and solve without hidden neural reasoning, while preserving previously acquired capabilities and explicitly identifying remaining limits.

A mature result should make it possible to state which competencies became generic code, which remained declarative knowledge, which required optional linguistic normalization, which scaled to fresh structures and which still exceeded the available algorithms or knowledge.

### Evidence regimes and claim discipline

Every empirical report must name the evidence regime under which it was produced. Closed-evidence evaluation uses only benchmark-provided context. Corpus-matched evaluation gives compared systems the same declared source. A pretrained reference may contain undisclosed pretraining and is therefore a practical comparison rather than a controlled learning comparison. A published reference is contextual evidence unless version, split, prompt, grader, tools, and evidence access match.

The same benchmark name and final percentage do not establish comparability. Reports must identify the exact source version or digest, split, adapter, answer normalization, proof policy, optional linguistic fallback, loaded KB versions, and resource budget. Source-exposed KB checks, internal generated regression suites, and public held-out benchmarks remain distinct even when they exercise similar questions.

The phrase “language model” does not imply universal next-token prediction. ESLM models the supported language fragment, explicit semantic structures, registered reasoning capabilities, selected declarative knowledge, and verified realization paths. Open-ended language generation, unrestricted English understanding, broad factual coverage, and normalized language probability remain separate capabilities that require their own executable contracts and evidence.

### Falsification criteria retained from the earlier implementation

The central hypothesis is weakened when generated artifacts primarily memorize test-like strings, when language or rule growth becomes approximately one special case per example, when fuzzy matching dominates semantics, when hidden evaluation leakage is required, or when a controlled comparison system trained on the same evidence consistently wins without losing replayability, verification, provenance, update locality, or efficiency.

The language-competence hypothesis is weakened if modest spelling and paraphrase changes collapse performance, if protected operators are lost during normalization, or if realization cannot preserve entity, tense, number, discourse, and epistemic status on supported structures. The reasoning hypothesis is weakened if performance falls sharply with composition depth despite available premises and methods, if irrelevant facts change answers, if lazy and exhaustive loading disagree, or if a trace cannot reconstruct the computation that produced the result.

## Decisions & Questions

### Question #1: What does the term language model mean for ESLM?

Response: The artifact does more than store facts: it compiles supported language into explicit semantics, maintains discourse and task state, selects knowledge and reasoning methods, and realizes results. The term remains qualified by a capability boundary and never implies unrestricted next-token modeling.

### Question #2: May an agent or LLM hold authority in deployed inference?

Response: No. The deployed runtime and every symbolic inference method remain offline and agent-free. DS004 owns the
separate training-agent authority and DS013 owns the separate operator normalization authority; neither can execute
inference, access runtime proof state, or bypass host parsing and validation.

### Question #3: Which authority wins when an older experiment conflicts with this vision?

Response: This specification and the consolidated DS set take priority. Earlier measurements may remain as historical evidence only when their protocol is still interpretable; their executable-KB architecture does not constrain the new declarative-KB implementation.

## Conclusion

ESLM succeeds by expanding a measurable region of language understanding, knowledge use, planning, and reasoning while keeping generic algorithms trusted, knowledge declarative, execution inspectable, and inability explicit. A high score cannot substitute for these invariants.
