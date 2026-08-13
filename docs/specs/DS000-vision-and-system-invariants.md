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

### 0. How to read this specification set

The DS files are normative design contracts, not release notes. Words such as **must** and **may** describe required
behavior even when the frontmatter status is `in-progress` or `planned`. A sentence in the present tense describes
current behavior only when it is explicitly introduced as a present implementation boundary or backed by a named
test or execution receipt. This distinction matters because a production target, a working subsystem, and a measured
benchmark result are three different kinds of claim.

For a new programmer, the system can be read in this order:

1. **Input:** DS003 defines the English-only local language gate and direct controlled-language meaning; DS022 defines
   deterministic English recovery, request-intent planning, query focus, and bounded work policy; DS013 defines the
   disclosed operator-only Language Agent proposal strategy attached to the same logical interpretation
   node.
2. **Knowledge:** DS005 defines inert canonical records; DS006, DS019, DS020, and DS021 define packages, physical
   compilation, retrieval, and memory.
3. **Execution:** DS008 and DS015 define task frames, method selection, and the methods themselves. DS029 defines the
   hierarchical processing circuits, node identities, typed packets, guarded edges, and resource vocabulary. DS027 defines the
   common trusted-strategy control plane through which alternative implementations are selected, bounded, scheduled,
   audited, and eventually unified.
4. **Output and failure:** DS009 defines statuses, provenance, and the strict separation between an answer and merely
   related evidence.
5. **Evidence:** DS010 and DS017 define what benchmark and comparison claims mean.
6. **Research expansion:** DS023 through DS026 define layer-specific research programs; DS028 defines how
   rights-cleared training-visible task evidence may propose processing-graph changes without becoming runtime policy,
   knowledge, or benchmark truth.

At the present checkpoint, direct controlled-language parsing, deterministic confidence-bearing local approximation,
bounded request-intent planning and grounded symbolic `PARTIAL` construction, session overlays, indexed lookup,
positive safe-Horn deduction, several bounded finite task methods, declarative packages, selected public-source
providers, structured results, and named work profiles are executable. Grounded construction uses non-voting claim
admission, a rhetorical plan, four typed sentence strategies, seven discourse and format strategies, and exact
reproduction from its closed plan and admitted evidence. The local language boundary is English-only: a bounded
heuristic assessment can identify likely non-English input for rejection, but it never translates. The separate
Language Agent wrapper is executable only as the operator-side proposal route composed by the general CLI; its English
candidate is untrusted, and the explicit local override omits it.
Capability-aware dispatch, broader English, trust and conflict
policy, large-corpus routing, document ingestion, and general multi-step planning cover only documented subsets or
remain target contracts. The existence of a DS section does not prove its implementation.

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
| Every LLM output is untrusted | Translation or simplification is only a proposal. The target must pass the same non-voting English parser and semantic gates, and translation is not accepted on model-declared equivalence alone. |
| Local language acceptance is English-only | A bounded heuristic English-likelihood assessment may reject or flag likely non-English input. It does not identify meaning, translate text, or make a language-support claim; indeterminate input may continue to the English parser under the ordinary fail-closed contract. |
| Direct symbolic parsing is the semantic authority | Likely-English or indeterminate input is offered to the English parser; complex English is not sent externally merely because it appears difficult. |
| English approximation precedes external English simplification | Deterministic DS022 candidates are voted, safety-checked, and selected through parse-only Semantic IR after direct `UNPARSED` or `UNKNOWN`. A structurally licensed candidate may also challenge direct `SOLVED` or `PARTIAL` only when its Semantic IR differs from the direct interpretation; equal IR preserves the direct route. Likely non-English input is not repaired as if it were misspelled English. The general CLI's disclosed external strategy may instead propose translation; terminal unsupported English may receive a simplification proposal. The explicit local override disables both. |
| Explicit requests outrank accidental assertion parses | A bounded request-force plan may preempt an ordinary direct parse, but it restores the incoming session snapshot and cannot retain tentative assertions parsed from the instruction text. |
| Guessed episode premises do not persist | Facts and rules accepted only through a changed heuristic interpretation are query-local and cannot enter the returned session. |
| No routing decision may create silent false negatives | Approximate relevance signals may rank shards, but safe exclusion requires exact or conservative evidence. |
| Core changes require global regression | A local benchmark gain cannot justify an untested change to reusable code. |
| Runtime uncertainty is explicit | The system distinguishes solved, unknown, ambiguous, inconsistent, unsupported and resource-limited outcomes. |
| Generated runtime artifacts are rebuildable | Indexes and binary shards can be regenerated from canonical KB records and manifests. |
| Correct answers do not excuse invalid traces | Where the task is deterministic, proof or execution validity is independently evaluated. |
| Related evidence is not proof | Ordinary failure grounding remains outside answer values, answer provenance, and `usedKbVersions`. The separately named DS022 request-synthesis route may admit, realize, and cite selected source claims in a `PARTIAL` artifact and account for their KB versions, but it cannot invent a factual bridge, present relevance as entailment, or return `SOLVED`. |
| Strategy selection is statically trusted and inspectable | Runtime profiles may select only host-registered strategy identities. KBs, corpora, configuration, and agent output cannot provide executors. Votes rank typed candidates; they never replace proof or witness verification. |

### 4. System lifecycle

The lifecycle begins with authorized evidence, produces reviewed declarative knowledge or a genuinely generic mechanism,
and ends in a typed result whose derivation or exact inability remains inspectable. The lifecycle never permits a source,
benchmark, agent response, package, or cache state to acquire executable authority by passing into a later phase.

DS004 exclusively defines benchmark-guided learning and promotion. DS006 defines package registration and immutable
identity. DS020 defines query-directed routing. DS009 defines the distinction among interpretation, knowledge, method,
conflict, and resource failures. DS022 defines deterministic local language recovery, explicit request construction,
role-focused grounding terms, and exact work profiles. DS013 defines the operator Language Agent proposal profile. Those
specifications carry the operational algorithms, receipts, and exceptional paths; this specification requires that
their composition preserve the system identity and invariants above.

DS027 defines the target high-level stage graph for that composition. Its registry is a control plane over trusted
generic mechanisms, not a second knowledge or package system. Until every named extension point has migrated through
that registry, the present local coordinators remain honestly identified as partial implementation foundations rather
than being described as a completed processing-graph architecture.

DS028 defines a separate research path over inert, rights-cleared task and trajectory projections. It may produce
typed node, gate, strategy, edge, or protocol hypotheses, but source actions, rewards, model outputs, clusters, and
agent proposals cannot enter the runtime graph or default profile without ordinary implementation, falsification,
security, and explicit promotion gates.

DS029 defines the exact catalog against which those hypotheses are consolidated. Its nested runtime, compiler, and
research circuits, typed packets, guarded edges, resource dimensions, and implementation states are an inspectable
architecture ledger. Catalog presence does not establish execution, and a confidence-bearing coordinator cannot
replace a non-voting authority gate.

### 5. Research data produced by the architecture

The system must retain the history necessary to study executable learning. Each substantial benchmark failure should be linked to the parse, selected KB records, attempted methods, result, diagnosis, patch and post-patch measurements. This creates a dataset of program repair and knowledge acquisition rather than merely a final score.

External task datasets used to study that history remain a different evidence class. DS028 requires frozen component
rights, split isolation, inert research episodes, contamination checks, source-neutral hypotheses, cross-source
transfer, and explicit promotion. Frequency in external evidence cannot authorize a fact, proof, gate result, or
executable policy.

The most important longitudinal measurements are end-to-end answer accuracy, attempt coverage, selective accuracy,
direct raw-language coverage, task-adapter coverage, proof validity, structurally held-out generalization, regression
rate, KB growth, reusable core growth, dynamic loading cost, heuristic candidate and acceptance rates, request-plan and
request-synthesis coverage, grounding retrieval quality, unsupported-claim rate, work-profile completion curves, and
the distribution of honest failure statuses. These measurements reveal whether progress comes from direct language
understanding, local approximation, better knowledge, stronger reasoning, useful source-grounded construction,
failure grounding, optional assisted language use, or unsafe special casing.

### 6. Definition of success

Success is not defined as making every benchmark green. Success is defined as a stable expansion of the tasks that the system can parse, plan and solve without hidden neural reasoning, while preserving previously acquired capabilities and explicitly identifying remaining limits.

A mature result should make it possible to state which competencies became generic code, which remained declarative knowledge, which required optional linguistic normalization, which scaled to fresh structures and which still exceeded the available algorithms or knowledge.

### Evidence regimes and claim discipline

Every empirical report must name the evidence regime under which it was produced. Closed-evidence evaluation uses only benchmark-provided context. Corpus-matched evaluation gives compared systems the same declared source. A pretrained reference may contain undisclosed pretraining and is therefore a practical comparison rather than a controlled learning comparison. A published reference is contextual evidence unless version, split, prompt, grader, tools, and evidence access match.

The same benchmark name and final percentage do not establish comparability. Reports must identify the exact source version or digest, split, adapter, answer normalization, proof policy, optional linguistic fallback, loaded KB versions, and resource budget. Source-exposed KB checks, internal generated regression suites, and public held-out benchmarks remain distinct even when they exercise similar questions.

The phrase “language model” does not imply universal next-token prediction. ESLM models the supported language
fragment, explicit semantic structures, registered reasoning capabilities, selected declarative knowledge, and
verified realization paths. The current grounded construction circuit can create bounded English wording and document
structure from admitted evidence. Unrestricted open-ended or latent next-token generation, unrestricted English
understanding, broad factual coverage, and normalized language probability remain separate capabilities that require
their own executable contracts and evidence.

### Falsification criteria retained from the earlier implementation

The central hypothesis is weakened when generated artifacts primarily memorize test-like strings, when language or rule growth becomes approximately one special case per example, when fuzzy matching dominates semantics, when hidden evaluation leakage is required, or when a controlled comparison system trained on the same evidence consistently wins without losing replayability, verification, provenance, update locality, or efficiency.

The language-competence hypothesis is weakened if modest spelling and paraphrase changes collapse performance, if protected operators are lost during normalization, or if realization cannot preserve entity, tense, number, discourse, and epistemic status on supported structures. The reasoning hypothesis is weakened if performance falls sharply with composition depth despite available premises and methods, if irrelevant facts change answers, if lazy and exhaustive loading disagree, or if a trace cannot reconstruct the computation that produced the result.

## Decisions & Questions

### Question #1: What does the term language model mean for ESLM?

Response: The artifact does more than store facts: it compiles supported language into explicit semantics, maintains discourse and task state, selects knowledge and reasoning methods, and realizes results. The term remains qualified by a capability boundary and never implies unrestricted next-token modeling.

### Question #2: May an agent or LLM hold authority in deployed inference?

Response: No. The deployed runtime and every symbolic inference method remain offline and agent-free. DS004 owns the
separate training-agent authority and DS013 owns an operator-side proposal strategy with no semantic or answer
authority; neither can execute inference, access runtime proof state, or bypass the English parser, preservation, and
result-validation gates owned by the host.

### Question #3: Which authority wins when an older experiment conflicts with this vision?

Response: This specification and the consolidated DS set take priority. Earlier measurements may remain as historical evidence only when their protocol is still interpretable; their executable-KB architecture does not constrain the new declarative-KB implementation.

### Question #4: Why is a strategy architecture compatible with a compact trusted core?

Response: Strategies divide trusted generic mechanisms by typed responsibility and make their selection, resources,
votes, and failures visible. They do not widen executable authority: every deployable executor is still statically
registered repository code, while external facts and configuration remain inert. The architecture therefore improves
research locality and inspection without turning KBs or externally supplied components into programs.

## Conclusion

ESLM succeeds by expanding a measurable region of language understanding, knowledge use, planning, and reasoning while keeping generic algorithms trusted, knowledge declarative, execution inspectable, and inability explicit. A high score cannot substitute for these invariants.
