---
id: DS008
title: Runtime Query, Retrieval, Reasoning, and Answer Pipeline
status: implemented
owner: runtime
summary: Defines deterministic inference stages, trace semantics, index use, bounded closure, uncertainty outcomes, and performance requirements.
---

# DS008 Runtime Query, Retrieval, Reasoning, and Answer Pipeline

## Core Content

### Input and output contract

The engine accepts text plus explicit conversation context. An input may contain supported English assertions followed by a question. It returns status, fluent answer, normalized input and corrections when a question exists, compiled query when available, semantic values, learned session facts, provenance, episode segmentation, updated context, and a `model` object naming the active model ID, selected KB IDs, and benchmark comparability. This model disclosure is present for answered, learned, unknown, unsupported, ambiguous, inductive, and abductive outcomes. The JSON structure is the automation contract; terminal prose is a view.

Statuses distinguish `ANSWERED`, `LEARNED`, `INDUCTIVE`, `ABDUCTIVE`, `UNKNOWN`, `UNSUPPORTED`, `AMBIGUOUS`, and future `NEEDS_CLARIFICATION`. A fluent sentence never replaces status. Automation must not infer failure by scraping answer text.

### Inference stages

1. Normalize Unicode and tokenize without losing original input.
2. Apply declared variants and conservative edit-distance correction.
3. Detect supported language cues.
4. Match a construction and bind typed spans.
5. Resolve entity aliases and bounded discourse references.
6. Compile Query Normal Form.
7. Select fact postings and potentially relevant rules.
8. Execute bounded derivation.
9. Select values for the requested answer slot.
10. Verify support and project provenance.
11. Realize a deterministic response.

Each stage may stop with a justified residual outcome. Later stages cannot convert missing evidence into a positive answer.

### Retrieval

The engine builds posting lists over the direct and derived closure and intersects the smallest candidate sets by known subject, predicate, and object/value. Posting construction uses amortized append, rule premises use bound-term indexes, and answer retrieval uses posting membership sets. Generated direct-fact indexes are separately validated. Larger models must load relevant relation/scope shards and activate only rules capable of contributing to the requested predicate instead of constructing global closure.

Aliases use exact normalized lookup first and bounded approximate candidates second. Semantic retrieval uses canonical predicates and entity ids, not embedding similarity. Lexical passage retrieval may be added for document evidence, but relevant spans must compile into claims or be quoted as evidence; a retrieved passage alone is not a derived answer.

### Reasoning

V1 rules contain positive conjunctive triple premises and a triple conclusion. Unification binds variables consistently. Closure is bounded by a maximum round count and duplicate fact signatures. Derived facts retain rule id, support fact ids, and combined source provenance.

The reasoner distinguishes values from entity objects while presenting a uniform query interface. It does not treat lack of proof as negation. Cyclic rules terminate through signature deduplication and the round budget.

Future reasoning adds query-directed semi-naive evaluation, temporal events, explicit negation, constraints, aggregation, and explanation minimization. Each extension requires semantics for conflict and unknown values.

Deduction uses direct and session facts plus positive rules, produces ordinary supported facts, and records maximum proof depth. The configured default permits eight rounds. The public Task 15 run measures one derived step. The optional `child-basic` KB verifies a three-step chain from a session classification to eventual mortality.

Induction runs only for queries explicitly compiled with `reasoning: induction`. It considers only allowlisted predicates, groups observations by class and predicate/value, requires configured minimum support and observed coverage, and emits candidate facts tagged `reasoning: induction`, confidence, support count, population count, and source evidence. A factual `Can X VERB?` query never consumes these candidates; `Is X likely to VERB?` may return `INDUCTIVE`.

Abduction requires the queried observation to match a supported fact. It reverses only rules marked `abductive`, instantiates possible premises, distinguishes supported from missing premises, ranks candidates deterministically, and returns at most the configured maximum. Its English response states that candidates are hypotheses rather than proven causes. It cannot perform causal discovery or infer an observation from the question wording.

### Verification and provenance

An answer is supported only by matching direct or derived facts. Provenance returned to the caller identifies fact id, source records, rule, and support facts. Explanation questions can realize this trace, but the structured trace is canonical.

For multiple supports, v0.1 returns all matching evidence. Future reducers may choose a minimal or highest-authority proof while retaining alternatives. Any reducer policy must be named in the query contract and report.

### Conversation behavior

The interactive shell stores explicit returned context. V0.1 supports one last-entity reference for basic pronouns. `/trace` displays the previous structured provenance; `/profile` displays the latest measurement when profiling is enabled; `/help` describes supported scope; `/quit` ends without side effects.

No conversation statement mutates the promoted knowledge model. Supported classification, location, ownership, capability, and universal fear assertions compile into a session overlay stored in explicit returned context. A question in the same input or a later interactive turn runs against the promoted model, selected KBs, and that overlay. Session facts and rules carry `session:*` IDs and provenance and disappear when the context is discarded. A newer session location replaces an older session location for the same entity. General hypothetical worlds, correction epochs, retractions, and rollback remain future executors.

The large-model overlay must become an immutable scoped branch. Adding one assertion must not rebuild global closure or indexes. Hypothetical and fictional contexts select a base world, add branch-local assumptions, activate affected rules only, and return scope in the proof.

### Performance

Report cold model import, engine construction, median and p95 query latency, and memory where scale makes them material. Do not hide full-closure cost inside startup when comparing end-to-end latency. Warm and cold results are separate.

`--profile` adds `eslm-profile-v1` initialization and query stages with wall time, CPU, memory deltas, and basic work counts. Interactive `/profile` returns the latest measurement. DS019 defines the shard, posting, rule, cache, and proof counters required before large-profile release.

Generated indexes should make candidate selection sublinear in total fact count for queries with bound predicate or entity. Rule execution should be query-directed at scale. A performance optimization must preserve value and provenance equivalence.

### Determinism

Given identical Node major version, model digest, input, context, and options, output values, status, and provenance order are deterministic. Durations and generated report timestamps are intentionally variable. Result ordering uses stable entity or evidence order, never object hash accidents.

## Decisions & Questions

### Q1. Why compute closure at engine construction in v0.1?

Response: It is a transparent reference for the current promoted compiler and small optional KBs. Fact lookup already uses posting intersections, but rule activation must become query-directed before scale claims. The all-KB configuration has 116 closure facts and is a correctness test, not a large-scale performance result.

### Q2. Can the runtime answer from raw documents without compiling facts?

Response: It may retrieve and quote relevant spans in a future grounded mode, but derived factual answers require structured claims or an explicit extractive answer contract.

### Q3. What happens when spelling correction changes meaning?

Response: Competing near aliases produce ambiguity. The correction trace remains visible, and low-margin analyses should request clarification rather than execute.

### Q4. Why does the Jhon mortality question change with `--kb child-basic`?

Response: Both configurations compile the statement and question identically. The default bAbI artifact has no mortality rules and returns `UNKNOWN`. The selected KB adds the three rules needed for a depth-three proof and returns `ANSWERED`. This is knowledge selection, not a parser fallback or hidden LLM judgment.

### Question #5: Is optimized v1 closure sufficient for ConceptNet?

Response: No. Indexed candidates improve local joins, but startup closure and session-wide rebuilding remain unacceptable. Query-directed shard loading and scoped overlay evaluation are mandatory first.
