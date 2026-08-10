---
id: DS006
title: Task Calculus and Query Contracts
status: in-progress
owner: semantics
summary: Adapts Task Calculus into an operational audit algebra while separating training workflows from runtime language-query semantics.
---

# DS006 Task Calculus and Query Contracts

## Core Content

### Critical adaptation

Task Calculus is useful, but it must not be confused with the language model itself. The eight operator families describe what a training pipeline, evaluator, or runtime circuit does. They do not replace lexical grammar, semantic frames, world models, or narrative representations.

The original proposal positioned a small neural compiler between language and TaskIR. This project removes that runtime component. Stable symbolic parsing compiles supported language. Coding agents extend the generated construction and knowledge modules during training. Unformalized runtime input becomes an explicit residual outcome.

### Task Normal Form

General training and evaluation work uses:

```text
Task = ⟨Goal, Assets, Deliverable, Constraints, Plan,
        Oracles, Effects, Budget, AbstentionPolicy⟩
```

The contract is extracted or written before the plan. Goal states desired postcondition. Assets name authorized evidence and tools. Deliverable defines concrete output. Constraints include language, format, safety, split isolation, and resource limits. Oracles define success. Effects enumerate allowed writes or external changes. Budget bounds iteration. Abstention policy defines legitimate inability.

Runtime question answering uses a narrower Query Normal Form:

```text
Query = ⟨Intent, Predicate/Frame, KnownArguments, RequestedSlot,
         EvidenceScope, AnswerType, Constraints, Language,
         DiscourseState, UncertaintyPolicy⟩
```

This distinction avoids forcing a simple factual question into an agentic workflow contract while retaining typed semantics.

### Semantic operators

| Operator | Operational meaning in ESLM |
| --- | --- |
| OBSERVE | Read authorized corpus, packet, input, model, or evidence without intended external mutation; produce evidence with provenance. |
| STRUCTURE | Normalize and compile spans into records, tokens, entities, frames, facts, events, contracts, or claims. |
| RELATE | Resolve identity, join facts, construct graphs, align mentions, order events, or bind source support. |
| REDUCE | Filter, group, deduplicate, rank, aggregate, compress, or select according to an explicit criterion. |
| DERIVE | Execute rules, constraints, calculations, state transitions, plans, or schema consequences. |
| CONSTRUCT | Generate a model module, response plan, sentence, report, patch, or other artifact. |
| VERIFY | Check a candidate against schema, type, effect, invariant, oracle, test, source coverage, or counterexample. |
| EFFECT | Perform an authorized state change such as writing a candidate, publishing a report, or promoting a reviewed model. |

These are families, not universal executors. Atomicity is capability-relative: an operation is executable only when a registered executor accepts its input types, satisfies preconditions, declares effects, returns the required output, and has an adequate verification mechanism.

`QUERY` is not added as a ninth primitive because question answering is a macro over STRUCTURE, RELATE, DERIVE, VERIFY, and CONSTRUCT. `RETRIEVE` remains an executor or macro under OBSERVE/RELATE/REDUCE rather than a semantic primitive.

### Control algebra

The control vocabulary is `THEN`, `ALL`, `CHOOSE`, `EACH`, `UNTIL`, `BEAM`, `MEMO`, and `COMPENSATE`.

`THEN` carries dependencies. `ALL` performs independent fork-join. `CHOOSE` selects a guarded branch or fallback. `EACH` maps a plan over a collection. `UNTIL` repeats with an explicit condition and budget. `BEAM` retains a bounded set of alternative analyses. `MEMO` caches a pure keyed result with provenance. `COMPENSATE` associates a permitted effect with a recovery action.

The v0.1 executor implements operations, THEN, ALL, and CHOOSE. Other controls are declared to stabilize theory but cannot appear in an executable plan until their semantics and tests exist. A declared-but-unimplemented control fails visibly.

### Types and node records

Useful types include `Text`, `Span`, `Evidence<T>`, `Entity`, `Event`, `Requirement`, `Claim`, `Relation<A,B>`, `Query`, `Candidate<T>`, `Artifact<T>`, `Verdict`, `Counterexample`, and `EffectReceipt`.

Every executed node records at least operator, executor identity, input/output type, status, duration, and provenance reference. Critical nodes additionally record verification and diagnostics. Values should be versioned rather than overwritten when iterative training or dialogue revision is modeled.

### Macro-patterns

Question answering typically expands to normalize/STRUCTURE → entity RELATE → indexed evidence OBSERVE/REDUCE → rule DERIVE → support VERIFY → response CONSTRUCT. State tracking expands to event STRUCTURE → temporal RELATE → transition DERIVE/UNTIL → query VERIFY → response CONSTRUCT. Model synthesis expands through all eight families and ends before promotion EFFECT.

Macros are discovered by recurring typed circuits, not merely common vocabulary. “Summarize a story” and “summarize test results” can share REDUCE/CONSTRUCT control but differ in types and verifiers. Domain and executor names remain separate from operator semantics.

The broader library retains candidate patterns rather than promoting them to primitives:

| Macro | Typical circuit |
| --- | --- |
| DEBUG | OBSERVE → STRUCTURE → RELATE → DERIVE → CONSTRUCT → VERIFY → bounded UNTIL |
| RESEARCH | OBSERVE → STRUCTURE → RELATE → REDUCE → DERIVE → VERIFY → CONSTRUCT |
| SUMMARIZE | OBSERVE → STRUCTURE → REDUCE → CONSTRUCT → VERIFY |
| AUDIT | OBSERVE → STRUCTURE → VERIFY → REDUCE → CONSTRUCT |
| MIGRATE | OBSERVE → STRUCTURE → RELATE → CONSTRUCT → VERIFY → authorized EFFECT |

The unit of task annotation is a work episode rather than every utterance. “Continue,” “that is not what I asked,” and “now it works” update contract or plan state. They do not automatically create new executable tasks. This distinction is preserved for future interactive task compilation even though the v0.1 CLI handles language queries rather than arbitrary instrumental work.

Decomposition is capability-aware. Contract extraction precedes retrieval of candidate macros and executors; decomposition is conditioned on actual typed capabilities; type, effect, and coverage checking may force revision. The system never creates an abstract node first and assumes an executor will later appear.

### Operational-value rule

An intermediate node is justified only when it enables deterministic execution, verification, executor selection, caching, provenance, effect control, or reuse. A JSON wrapper that only serializes an LLM paraphrase would violate this rule. A query contract is justified because it supports typed retrieval, rule selection, answer-slot checking, abstention, and evaluator inspection.

### Residual semantics

Runtime has no `RESIDUAL_LLM`. Missing ontology or executor capacity is classified as `UNKNOWN`, `UNSUPPORTED`, `AMBIGUOUS`, or `NEEDS_CLARIFICATION`. Training reports aggregate residuals and may ask a coding agent to generate new modules. New semantic operator families require repeated irreducible counterexamples and human specification review.

## Decisions & Questions

### Q1. Why retain the eight families without proving minimality?

Response: They are a falsifiable starting basis and a consistent audit vocabulary. Corpus studies may split or merge them, but ad hoc operators are prohibited during ordinary synthesis.

### Q2. Does Task Calculus plan arbitrary user actions in v0.1?

Response: No. The user-facing runtime answers supported language queries. The broader calculus first structures training, evaluation, and future bounded task execution.

### Q3. How is capability-aware decomposition implemented without an LLM?

Response: Parsers and macro registries select only typed executors that exist. Unsupported nodes remain residual. The coding agent modifies the library between releases, not during inference.
