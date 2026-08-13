---
id: DS031
title: Verified Deterministic Quantity and Order Operations
status: in-progress
owner: reasoning
summary: Defines exact finite arithmetic, quantity, time, sequence, grouping, mean, and strict-order execution with replayable witnesses.
---

# DS031 Verified Deterministic Quantity and Order Operations

## Introduction

Basic Eval exposed a stable processing responsibility between task framing and result validation: execute a closed mathematical or order operation over values already present in a typed frame. Treating these cases as KB retrieval gives the wrong authority model, while treating each wording as its own heuristic branch duplicates logic. This specification defines the generic `deterministic-value-executor` node and its exact method semantics; neither the node nor its methods depend on the evaluation source.

DS030 owns the English-to-task boundary. This specification begins with a validated semantic frame and ends with a typed deterministic result or explicit gap. It does not own parsing, world knowledge, rhetorical generation, or final result authority.

## Core Content

### 1. Node contract

The executor consumes `packet:runtime:bounded-operation-frame` only for an admitted operation in its capability set and emits `packet:runtime:deterministic-value-result`. The result contains operation, status, answer surface, semantic values, method identity, and a replayable witness; it may contain a typed gap. The producing node validates the packet before the downstream `typed-operation-result-assembler` constructs a runtime candidate.

The node is deterministic, non-voting, query-local, and `instrumented-local`. It has no KB service, network service, session mutation, confidence vote, or answer authority. A successful witness supports the candidate; the normal result schema and runtime authority boundaries still apply.

### 2. Exact operations

| Operation | Deterministic rule | Mandatory rejection |
| --- | --- | --- |
| Scalar arithmetic | addition, subtraction, multiplication, or division over two finite operands | unknown operator; division by zero returns an explicit underdetermined gap |
| Percentage of | `base × percentage / 100` | non-finite operand |
| Percentage increase | `base × (1 + percentage / 100)` with normalized declared currency when present | non-finite operand |
| Integer parity | integer remainder modulo two | non-integer input |
| Arithmetic-sequence next | require every adjacent difference to equal the first, then add that difference to the final term | fewer than two differences or inconsistent differences |
| Proportional scale | `second × scaledFirst / first` | zero first term or non-finite value |
| Unit conversion | `value × declaredFactor` for an allowlisted pair | undeclared pair or non-finite factor |
| Clock duration | convert start and duration to integral minutes and reduce modulo one day | invalid hour/minute or fractional resulting minute |
| Equal-group total | `groups × perGroup` | invalid finite operands |
| Remaining quantity | `total − consumed` | negative remainder under the current non-negative inventory contract |
| Arithmetic mean | `sum(values) / count(values)`, rounded to the frame's finite declared precision | empty list or non-finite member |
| Strict-order extreme | replay the supplied transitive strict-order chain and return its declared minimum or maximum endpoint | unsupported relation, malformed chain, or missing extreme |

The implementation may factor common finite-number and presentation helpers, but must not replace these rules with free-form code from a request or KB. JavaScript evaluation, dynamic operators, corpus-provided functions, and approximate model calls are prohibited.

### 3. Witness and presentation

Every success records the operands, exact rule or equation, intermediate value needed for replay, and final semantic result. Sequence witnesses retain the admitted values and common difference. Clock witnesses retain total minutes. Strict-order witnesses retain relation, chain, requested extreme, and selected endpoint. A method test must be able to recompute the result from the witness without reparsing the original English.

The answer surface is deliberately small: a normalized finite number, time, choice, entity, or declared quantity. Currency aliases are normalized to `RON`, `EUR`, or `USD`; unit pluralization is deterministic. Presentation never adds an explanation that was not requested and never turns floating-point non-finiteness into text success.

### 4. Status and failure semantics

Valid execution returns `SOLVED`. A mathematically defined input that the contract explicitly rejects returns no method result so ordinary planning may continue or fail honestly. Division by zero returns `UNDERDETERMINED` with `division-by-zero`, no answer premise, and a witness showing the rejected operands. The executor must not guess a sequence rule when constant difference fails, infer a unit factor from surface similarity, or invent a relation missing from the frame.

Resource use is bounded by solver nodes and proof bytes. Current methods are constant-space except sequence and order replay, whose input arrays are bounded by DS030. Numeric formatting must be deterministic across repeated executions at the same executable checkpoint.

### 5. Evaluation and generic-core gate

Every operation requires positive cases with changed numbers and signs, renamed order entities, metamorphic relations, boundary values, and negative controls. Examples include commutative operand permutations where valid, percentage scaling, sequence translation, order-chain renaming, midnight clock wrap, and malformed near-matches. A benchmark-derived example may reveal the missing semantic operation, but implementation and tests operate on the operation type rather than the example's entities or expected result.

Adding another scalar or relation method under this node requires a general rule, explicit preconditions, a replayable witness, and generic metamorphic tests. A new node is justified only when the work introduces a distinct authority, state, resource, or failure boundary; that new responsibility receives a separate DS before catalog promotion.

## Decisions & Questions

### Question #1: Why does the executor not use confidence arbitration?

Response: These operations have exact declared semantics. Several votes cannot improve a finite equation or make an invalid witness true. Alternative algorithms would need equivalent witnesses and deterministic selection, not epistemic voting.

### Question #2: Is arithmetic a fact in QUICK?

Response: No. Arithmetic and order rules belong to reusable reasoning code. QUICK may contain domain facts for smoke tests, but it must not memorize answers to value-operation eval cases.

### Question #3: Can a failed sequence be guessed from a more complex pattern?

Response: Not under this contract. The current operation is constant-difference continuation. Other sequence models require separately named semantics, ambiguity handling, and falsification tests.

## Conclusion

The deterministic executor gives ordinary quantity and order requests a small, exact, replayable path. It expands useful behavior without transferring facts into core code or letting fluent presentation substitute for a verified operation.
