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
output contract. DS022 implements bounded request recognition and grounded symbolic construction. This specification
defines the research path from that source-bound baseline to general dependency-aware obligation planning,
abstractive claim derivation, and richer claim-verified document synthesis.

## Core Content

### 1. Current baseline

The current planner recognizes reviewed operations and artifacts, isolates source material, records requested and
excluded constraints, extracts bounded topics, creates a discourse-ordered subrequest graph, and retrieves
topic-focused evidence. Its construction circuit freezes one work order, admits or rejects provenance-bound claims
through a non-voting gate, creates a rhetorical plan, realizes four claim types through separate sentence strategies,
and chooses among seven discourse and format strategies for fusion, comparison, gaps, prose, sections, outlines, and
tables. The final contract reproduces every claim, citation, section, paragraph, strategy trace, and output byte from
the closed plan and admitted evidence. Pattern families vote with confidence; claim admission does not. Runtime
patterns are versioned and immutable, and new patterns enter through code review and tests.

The resulting artifact remains `PARTIAL` because bounded evidence search, request work, and output budgets do not
establish complete topic or obligation coverage. The baseline can create coherent English wording and document
structure, but it cannot invent facts, restore a rejected claim, silently strengthen defeasible evidence, or present
relevance as proof. It deliberately does not claim general instruction following, arbitrary AND/OR obligation
planning, abstractive claim derivation, audience-aware essay writing, or unsupported causal narrative.

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

The current source-bound generator already records stable claim IDs, operation IDs, source kind, evidence identity,
realization strategy, admission outcome, confidence, reason, sentence, citation, paragraph membership, and rhetorical
section. Its validator maps every realized KB claim to an exact selected evidence identity and reproduces the complete
artifact deterministically. Research beyond this boundary extends the ledger for newly derived or abstractive claims
rather than postponing all verification to a future generator. Every such generated sentence requires:

- stable claim ID and exact output span;
- semantic proposition or declared rhetorical/non-factual role;
- source records and package versions;
- derivation or transformation witness;
- epistemic strength, context, polarity, and conflicts;
- lexical realization steps;
- verification status and unresolved assumptions.

A claim-level verifier reparses newly derived factual sentences and checks them against their cited source or proof.
A sentence with no valid support is removed, weakened into an explicit hypothesis, or placed in a gap section.
Stylistic transitions are allowed only when they do not assert a new causal, temporal, comparative, or universal
relation. This extends the current exact-reproduction gate; it does not weaken the existing rule that source-bound
realization may use only admitted supplied sentences or KB records.

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

Research starts from the implemented bounded single- and multi-obligation path. Remaining stages are general
dependency-aware AND/OR plans with dynamic capability preconditions; proof-derived and abstractive claim records;
reparse verification for those new claim classes; verified cross-claim composition and discourse planning; audience-
and purpose-aware realization that cannot alter facts; and new protected end-to-end document tasks. Each stage retains
exact source reproduction and the current grounded symbolic constructor as separate ablations and safety fallbacks.

## Decisions & Questions

### Question #1: Why does the planner need request force?

Response: Artifact nouns occur in ordinary assertions. Requiring linguistic evidence of a request prevents the system
from generating a document merely because the user mentioned one.

### Question #2: Why does current grounded generation remain `PARTIAL`?

Response: Exact reproduction proves that the artifact follows its closed plan and admitted evidence; it does not prove
that bounded retrieval found every relevant source, that every requested obligation fit the work budget, or that the
available records support a complete treatment. `PARTIAL` names those coverage limits. Unsupported bridges remain
gaps even when the admitted material was organized into fluent sentences and sections.

### Question #3: Can an external LLM realize a richer verified plan?

Options:

- permit an operator-side LLM to propose prose only when every factual claim returns through the claim ledger and host
  verifier; or
- keep realization deterministic inside the reviewed runtime.

The current deterministic grounded constructor already realizes its bounded source-bound plans. Neither external
option changes the offline core or extends it to derived claims until its authority, privacy, and verification
contract is specified and tested.

## Conclusion

Reliable long-form behavior comes from explicit obligations, evidence allocation, and claim verification rather than
one opaque generation step. The current source-bound circuit already performs grounded symbolic generation with exact
reproduction. The research program extends that disciplined foundation toward general obligation planning,
abstractive claim derivation, and richer discourse while keeping every factual sentence inspectable.
