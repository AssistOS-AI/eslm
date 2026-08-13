---
id: DS030
title: Everyday Request Framing and Task Contracts
status: in-progress
owner: language-runtime
summary: Defines bounded English framing for explicit everyday operations without translation, answer authority, or benchmark-specific dispatch.
---

# DS030 Everyday Request Framing and Task Contracts

## Introduction

Many useful English requests are structurally simpler than unrestricted language but do not fit the original controlled-language assertion grammar. A percentage question, a request to extract an explicit field, and a request to describe a known entity require different executors, yet each first needs the same architectural decision: represent the requested operation, its supplied inputs, and its output obligation without answering it. This specification defines that responsibility as the `everyday-task-framer` processing node.

The node was discovered through development-visible everyday-request evaluation. The examples revealed a recurring source-neutral boundary rather than a need for one branch per prompt. This specification therefore admits semantic operation families and rejects dispatch on benchmark name, case identity, expected answer, source row, or copied entity constants. DS031 owns deterministic quantity and order execution, DS032 owns operations over request-supplied text, and DS033 owns grounded inspection of loaded declarative knowledge.

## Core Content

### 1. Position and authority

The framer runs only after the local English-likelihood boundary and direct controlled-language attempt have not already produced a `SOLVED` or `DEFEASIBLE` result. It consumes the direct diagnostic plus the original bounded request text and may emit `packet:runtime:everyday-task-frame`. If no admitted family matches, it emits no frame and the unchanged request-planning and recovery path remains eligible.

The node is a deterministic `process`, not a parser authority gate, coordinator, reasoning method, or answer constructor. It cannot translate likely non-English input, repair an English-likelihood rejection, consult a KB, calculate a value, classify supplied content, select an answer, change session state, or turn recognition confidence into truth. Its current implementation is query-local and `instrumented-local`.

### 2. Closed frame

The current frame format is `eslm-everyday-task-frame` with exactly these semantic regions:

- `operation` is one allowlisted semantic operation identity;
- `inputs` contains only finite parsed values, bounded supplied spans, explicit choices, or requested entity surfaces needed by that operation; and
- `output` states the requested result kind, direct presentation mode, and any explicit finite constraint such as maximum words or sentences.

The corresponding graph packet additionally binds the source-text digest and may expose preserved constraints or supplied-text spans. Unknown fields, non-finite numbers, oversized input, ambiguous capture, or a missing required operand cause the candidate framer to abstain. An abstention is not an `UNPARSED` result by itself and does not erase the direct diagnostic.

### 3. Admitted operation families

The initial exact families are:

| Family | Current operations | Required representation |
| --- | --- | --- |
| Scalar and quantity | scalar arithmetic, percentage of, percentage increase, unit conversion, clock duration, equal-group total, remaining quantity, arithmetic mean | finite operands, declared operator or factor, explicit unit when present, and result kind |
| Discrete relation | integer parity, arithmetic-sequence continuation, proportional scale, strict-order extreme | finite sequence or relation chain, requested decision or extreme, and any explicit choices |
| Supplied-text analysis | sentiment classification, intent classification, exact person/city extraction, structured field extraction | the exact supplied text, closed candidate labels or fields, missing-value policy, and result kind |
| Supplied-text transformation | capitalization and punctuation repair, polite imperative rewrite, bounded title generation | exact source span, preservation obligation, requested tone or word limit, and result kind |
| Knowledge inspection | entity summary and entity-class listing | requested surface or class plus a grounded prose/list contract |

Surface patterns are adapters into these semantic operations. They do not define the operation by themselves. New phrasings for an existing operation extend framing tests and adapters under this DS. A genuinely different stable responsibility requires its own DS before a new processing node is added.

### 4. Bounds and language boundary

Input is NFC-normalized and bounded to 64 KiB before framing. Curly quotation marks may be normalized as punctuation, but open-class words are not translated or silently replaced. Only English requests that have crossed the existing language boundary are eligible. Quoted Romanian or other likely-non-English payload remains supplied opaque text unless a DS032 operation can act on its form without claiming semantic understanding; translation remains solely within the separately disclosed DS013 proposal boundary.

Each framer has a closed capture count and produces at most one frame. Framers run in a fixed order. A surface that could create competing semantic frames must abstain until an explicit ambiguity rule or authority decision exists. Literal conversion factors are admitted only for declared unit pairs; they are generic operation metadata, not inferred world knowledge.

### 5. Evaluation and anti-overfitting

Development-visible failures are clustered by earliest missing representation. A framing change is acceptable only when tests include renamed entities, changed numbers, changed order, nonce values, paraphrase variants, malformed inputs, and negative near-matches. Tests must prove that the operation survives those substitutions and that unrelated text does not trigger it. No code may reference an eval case identifier, category identifier, source digest, expected answer, or a list of entities copied from the benchmark.

Evaluation reports distinguish `language-boundary`, `parse`, `task-frame`, `planning`, `grounding`, `reasoning`, `realization`, and semantic-review failures. A frame improves only the `task-frame` boundary; it is not counted as correct execution. Semantic open-form cases require review even when a frame and result are produced.

### 6. Failure and migration rules

Malformed explicit arithmetic, invalid clocks, ambiguous extraction spans, unsupported labels, excessive text, and incomplete constraints decline safely. Executors independently validate every captured value; framing does not waive method preconditions. A later generalized parser may subsume a surface adapter only after equivalent task frames, negative controls, and route behavior are demonstrated. Removing the adapter must not change result authority or expose likely-non-English content to a component that claims English interpretation.

## Decisions & Questions

### Question #1: Why is this not part of the direct controlled-language parser?

Response: The direct parser remains the strict semantic authority for its declarative grammar. Everyday framing represents explicit operator requests that use supplied values or text and then routes them to separately bounded methods. Keeping the seam visible prevents a growing collection of request templates from weakening assertion semantics.

### Question #2: May several frames compete?

Response: Not in the current implementation. The fixed ordered framer emits the first unique admitted semantic frame. A future multi-candidate framer would be a coordination change and would require a separate reviewed strategy and authority contract.

### Question #3: Does a recognized frame imply a correct answer?

Response: No. It records an operation obligation. The selected executor must validate preconditions, produce a witness or explicit gap, and pass the result contract.

## Conclusion

The everyday-task framer turns a bounded subset of ordinary English requests into explicit typed work without pretending to solve them. Its closed operation vocabulary, strict bounds, English-only position, and anti-overfit controls let ESLM gain practical coverage while preserving the distinction between interpretation, execution, evidence, and authority.
