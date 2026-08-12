---
id: DS025
title: Multi-Obligation Request Planning and Verified Synthesis Research
status: planned
owner: planning-research
summary: Defines the research program for instruction-data separation, ordered subrequest graphs, evidence allocation, claim-verified document construction, and reviewed incremental pattern learning.
---

# DS025 Multi-Obligation Request Planning and Verified Synthesis Research

## Introduction

A request to summarize a passage, compare two topics, explain a mechanism, and produce a table is not one factoid
question. It contains instructions, supplied data, negative constraints, ordered obligations, evidence needs, and an
output contract. DS022 implements bounded request recognition and extractive construction. This specification defines
the research path from that baseline to reliable multi-obligation planning and claim-verified document synthesis.

## Core Content

### 1. Current baseline

The current planner recognizes reviewed operations and artifacts, isolates source material, records requested and
excluded constraints, extracts bounded topics, creates a subrequest graph, retrieves topic-focused evidence, and
returns a cited extractive `PARTIAL` draft. Pattern families vote with confidence. Runtime patterns are versioned and
immutable; new patterns enter through code review and tests.

The baseline deliberately does not claim general instruction following, abstractive summarization, audience-aware
essay writing, or verified causal narrative. Its permanent extractive-draft gap makes this boundary visible even when
all bounded retrieval steps completed.

### 2. Instruction and data boundary

Planning begins with a span map that classifies instruction, supplied material, quoted examples, requested output
schema, and literal strings. Pattern matching runs only on instruction spans. Commands, prompt injections, or output
words inside source material are inert data unless the outer instruction explicitly asks to interpret them.

Quoted and marker-delimited material retains both prefix and suffix instructions. Every slice records original and
retained bytes, characters, sentences, and spans. Truncation before a clause boundary yields an incomplete plan or a
resource status; it never silently changes the requested format or claims complete summarization.

### 3. Request force, polarity, and constraints

An artifact noun alone is not a request. A plan requires explicit imperative force, a reviewed polite modal or desire
construction, a question that requests information, or another declared command form. Assertions such as “I read a
report” remain assertions.

Negation and exclusion have scope. `Do not write or draft a report` excludes both coordinated actions and the report;
`Do not write; draft a report` resets at the clause boundary; `without a table` excludes the format without cancelling
an independent positive request. Conflicting positive and negative constraints produce `AMBIGUOUS` or
`UNSUPPORTED_OUTPUT`, never a guessed positive plan.

### 4. Ordered obligation graph

Each instruction segment produces one or more typed obligations in discourse order:

- operation and source span;
- topic or source-material input;
- positive and negative constraints;
- required evidence kind and trust level;
- dependencies on earlier retrieval, reasoning, comparison, or summarization steps;
- intermediate output contract;
- aggregation target and final output position;
- completion, gap, and resource state.

The planner creates operation-specific selection and construction nodes, then one explicit aggregation node. It does
not sort obligations by confidence and call the highest one the whole request. Independent obligations can complete or
fail separately; the final result reports their ordered coverage.

### 5. Evidence allocation and reasoning

Every topic obligation supplies typed focus directly to retrieval. Lookups are allocated fairly across required
topics before optional expansion. A comparison receives evidence for both sides; an explanation requests causal or
mechanistic relations; a summary prioritizes supplied-source coverage; an outline requests representative section
evidence. Wrong-topic and source-only distractors are preserved in retrieval diagnostics but not cited as support.

Registered reasoning methods may operate on the selected evidence when their capability preconditions hold. Proof,
counterexample, conflict, and unresolved frontier remain distinct. Planning cannot relabel lexical overlap as causal
support or use a downstream language model to fill a missing premise without attribution.

### 6. Claim ledger and verified synthesis

Beyond extractive output, every generated sentence requires a claim ledger:

- stable claim ID and exact output span;
- semantic proposition or declared rhetorical/non-factual role;
- source records and package versions;
- derivation or transformation witness;
- epistemic strength, context, polarity, and conflicts;
- lexical realization steps;
- verification status and unresolved assumptions.

A claim-level verifier reparses generated factual sentences and checks them against their cited source or proof. A
sentence with no valid support is removed, weakened into an explicit hypothesis, or placed in a gap section. Stylistic
transitions are allowed only when they do not assert a new causal, temporal, comparative, or universal relation.

### 7. Summarization, expansion, comparison, and document forms

Research evaluates operation-specific policies:

- **summarization:** coverage and redundancy over supplied claims, with no source instruction execution;
- **expansion:** source-preserving elaboration whose added claims each have evidence;
- **explanation:** causal or mechanistic paths with explicit missing-link gaps;
- **comparison:** aligned axes, balanced evidence, conflicts, and unavailable fields;
- **essay or report:** ordered sections, thesis status, evidence ledger, and scoped conclusion;
- **table or schema:** typed column contract, one provenance edge per populated cell, and explicit missing values;
- **multi-request aggregation:** stable discourse order, cross-reference only between supported claims, and per-obligation
  completion.

Audience, tone, and length constraints shape realization but cannot change factual content or remove required gaps.

### 8. Incremental pattern learning

The deployed runtime never self-modifies. New examples create offline failure clusters. A proposed pattern records the
construction, generic transformation, confidence evidence, protected meaning, resource cost, and negative controls.
Promotion requires renamed and nonce examples, adversarial scope cases, a frozen development gain, no protected-set
regression, and core guardian review.

Research may compare hand-authored patterns, program synthesis over typed transformations, decision lists, or frozen
interpretable classifiers. Any promoted artifact must be versioned, bounded, explainable per decision, and independent
of benchmark IDs or expected answers.

### 9. Evaluation and stages

Evaluation separates plan accuracy, evidence quality, reasoning completion, and final artifact quality. Metrics include
operation and constraint F1, span accuracy, ordered-DAG agreement, topic coverage, evidence recall and precision,
citation validity, unsupported-claim and contradiction rate, source coverage, obligation completion, output-schema
validity, calibration, latency, and bytes.

Research stages are: robust single obligation; ordered independent obligations; dependency-aware multi-operation
plans; claim-ledger generation; verified cross-claim composition; and new protected end-to-end document tasks. Each
stage retains the extractive baseline as an ablation and safety fallback.

## Decisions & Questions

### Question #1: Why does the planner need request force?

Response: Artifact nouns occur in ordinary assertions. Requiring linguistic evidence of a request prevents the system
from generating a document merely because the user mentioned one.

### Question #2: Why retain a permanent extractive-draft gap today?

Response: `PARTIAL` must name what is incomplete. The gap prevents a collection of relevant quotations from being
misrepresented as a fully composed essay and gives claim verification a concrete future acceptance gate.

### Question #3: Can an external LLM realize a verified plan?

Options:

- permit an operator-side LLM to propose prose only when every factual claim returns through the claim ledger and host
  verifier; or
- keep realization deterministic inside the reviewed runtime.

Neither option changes the offline core until its authority, privacy, and verification contract is specified and
tested.

## Conclusion

Reliable long-form behavior comes from explicit obligations, evidence allocation, and claim verification rather than
one opaque generation step. The research program preserves useful extractive output now while defining a disciplined
path toward richer documents whose factual sentences remain inspectable.
