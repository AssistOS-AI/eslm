---
id: DS032
title: Bounded Supplied-Text Operations
status: in-progress
owner: reasoning
summary: Defines classification, extraction, orthographic repair, polite rewriting, bounded titles, and single-sentence condensation over text supplied in one English request.
---

# DS032 Bounded Supplied-Text Operations

## Introduction

Some requests provide all material needed for the answer: classify the tone of a quoted sentence, extract explicit fields from a contract excerpt, repair punctuation, or rewrite an imperative politely. These are not world-knowledge questions and should not retrieve vaguely related KB records. Evaluation evidence revealed a generic `supplied-text-operator` responsibility that acts only on an admitted bounded span and produces an auditable transformation or classification.

DS030 owns recognition and span capture. This specification owns execution over that span. It does not translate the span, infer unstated facts, provide legal interpretation, or authorize a final answer.

## Core Content

### 1. Node and packet boundary

The non-voting `supplied-text-operator` consumes a validated `packet:runtime:bounded-operation-frame` and emits `packet:runtime:supplied-text-result`. Required result fields are operation, status, answer, semantic values, witness, and method. The producer validates the packet. The `typed-operation-result-assembler` may then form a runtime candidate that remains subject to the shared result contract.

The node is `instrumented-local`, deterministic, query-local, and bounded by tokens, comparisons, proof bytes, and output bytes. It receives no KB, network, file, subprocess, or session-mutation capability. Supplied text is inert data and is never executed.

### 2. Classification

Sentiment classification admits only the closed labels `positive`, `negative`, and `neutral`. It records which bounded affect cues occurred and chooses the uniquely greater cue class; equal or absent evidence yields neutral under the current low-authority surface-tone contract. This is a lexical tone estimate, not a claim about the writer's actual mental state.

Intent classification receives the candidate labels explicitly from the frame. Each normalized label contributes itself and an allowlisted generic cue family. Matching is Unicode word-boundary aware so substrings such as `app` inside `appears` do not count. A unique positive maximum is required; a zero or tied maximum abstains. The witness records each candidate score and exact matching cues.

### 3. Extraction

Exact supplied-text extraction copies matched spans into a declared entity or record shape. The current person record requires an explicit full name, integer age, and residence construction; the city-only operation returns the captured city without adding geographic facts. Structured field extraction uses a closed requested field list, returns the explicit missing-value marker for absent fields, and separates observations from extracted values.

The extractor must not complete a company name, currency, duration, payment term, age, city, or renewal clause from plausibility. It must distinguish “not stated” from a negative assertion. A generated table is presentation of captured values, not a legal conclusion.

### 4. Constrained transformations

Orthographic repair may normalize initial capitalization, the pronoun `I`, known day and month capitalization, bounded honorific punctuation, commas for recognized constructions, and terminal punctuation. Its witness retains source and result. It must preserve open-class source content and abstain rather than perform unrestricted grammatical rewriting.

Polite imperative rewriting adds a bounded politeness construction while retaining the content obligation. It does not soften threats, create commitments, or add facts. Bounded title generation removes a small allowlisted set of function words or auxiliary constructions, enforces the explicit maximum word count, and title-cases deterministically. It may not invent keywords absent from the supplied sentence.

Single-sentence condensation admits only closed clause relations whose propositions can be replayed from the supplied sentence: event completion, unchanged state, schedule transition, cause, contrast, counted subset, approval plus requested follow-up, and rescheduling. It may change voice, clause order, or aspect to remove redundancy, but its witness retains the source and output word counts and the source-proposition ledger. An unrecognized construction abstains instead of returning the input unchanged and calling that a summary. This is another strategy of the existing supplied-text responsibility, not a separate processing node.

### 5. Verification, failure, and semantic review

Classification witnesses support cue replay. Extraction witnesses support exact-span replay. Orthographic repair records source-token preservation. Rewriting records the retained source and output. Title generation records maximum and actual output words. A missing unique label, unmatched record shape, violated preservation obligation, or impossible word limit produces abstention rather than an empty successful answer.

Exact-label and exact-span eval cases can be machine scored. Open-form rewriting quality remains explicit semantic review unless the contract supplies a complete deterministic oracle. A machine-produced fluent string is not by itself evidence of correctness, completeness, tone suitability, or instruction fit.

### 6. Generalization controls

Changes require paraphrase, renamed-content, nonce-token, changed-option-order, punctuation-noise, tie, absent-field, and adversarial-substring tests. Cue vocabularies are generic semantic adapter data, not lists copied from benchmark answers. Broad professional communication, multi-paragraph synthesis, argument critique, creative writing, and unconstrained advice are outside this node; if evaluation justifies a separate constraint-aware synthesis responsibility, it receives its own DS and authority contract.

## Decisions & Questions

### Question #1: Why not send all supplied text to the KB retriever?

Response: The requested answer is a bounded operation over material already supplied. Retrieval can introduce unrelated records and obscure whether the answer came from the request or external knowledge.

### Question #2: Does neutral sentiment mean objectively neutral?

Response: No. It means the bounded positive and negative cue evidence did not produce a unique non-neutral result under this exact method.

### Question #3: May the operator translate quoted text?

Response: No. Translation is a separate untrusted DS013 language proposal. This node can preserve opaque spans but cannot claim semantic classification or rewriting of content outside its admitted English boundary.

## Conclusion

The supplied-text operator gives ESLM useful local classification, extraction, and constrained transformation without smuggling world knowledge or free-form generation into the core. Exact spans, closed labels, preservation rules, witnesses, and honest review states keep the behavior inspectable.
