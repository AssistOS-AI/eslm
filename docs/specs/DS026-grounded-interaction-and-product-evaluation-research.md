---
id: DS026
title: Grounded Interaction and Product Evaluation Research
status: planned
owner: evaluation-research
summary: Defines protected evaluation for interpretation, selectable strategies, retrieval, reasoning, grounded fallback, multi-request synthesis, reproducibility, and long-horizon product progress.
---

# DS026 Grounded Interaction and Product Evaluation Research

## Introduction

A symbolic system can pass a solver fixture while remaining difficult to use on ordinary requests. Conversely, a
useful related-evidence fallback can help a person or downstream model without constituting a correct answer. Product
evaluation must measure these layers separately and preserve inability, uncertainty, source authority, and resource
limits in the denominator.

This specification extends DS010 with a research benchmark program specifically for local language recovery,
grounding, answer bridges, request planning, and cited synthesis. It does not replace source-native public benchmark
reports. It supplies the realistic end-to-end evidence needed for the behavior described in DS022 through DS025.

## Core Content

### 1. Evaluation questions

Each suite declares which question it answers:

- Did the system identify the intended request and Semantic IR?
- Did it retrieve the most useful records within a declared budget?
- Did a registered reasoner prove, refute, or leave the query open correctly?
- Did the primary status and abstention match the evidence?
- When no answer was supported, did the grounding bundle expose related and non-misleading knowledge?
- Did a multi-request plan cover every obligation in order?
- Did the final extractive or verified artifact cite every factual claim and expose gaps?
- What time, memory, bytes, lookups, and external operator invocations were consumed?

No single accuracy number answers all of them.

### 2. Independently authored query strata

The product suite contains frozen, independently authored cases in at least these strata:

1. directly answerable from one KB;
2. answerable through strict multi-step reasoning;
3. answerable only under explicitly defeasible semantics;
4. partially supported with one missing premise;
5. truly unanswerable in the selected KB set;
6. ambiguous entity, sense, scope, or request intent;
7. conflicting or context-dependent sources;
8. spelling, morphology, punctuation, and near-CNL wording;
9. paraphrased and complex sentences with protected-operator traps;
10. multilingual operator-normalization controls;
11. multi-KB questions with wrong-KB and common-word distractors;
12. source-only summarization and expansion;
13. compare, explain, report, essay, outline, and table requests;
14. ordered multi-obligation requests with positive and negative constraints;
15. work-policy exhaustion, truncation, provider failure, and corrupted receipt cases; and
16. exact strategy selections, per-strategy abstention and exhaustion, correlated votes, verifier failures, and
    compiler-acquisition alternatives.

Cases use nonce and renamed domains where possible. Factual cases freeze source records and package versions without
placing expected answers in runtime packages.

### 3. Layered metrics

The report separates:

- **interpretation:** Semantic IR exact match, operator preservation, ambiguity detection, calibration, and unsafe
  acceptance;
- **retrieval:** record and span recall/precision at `k`, reciprocal rank, role coverage, answer-bridge recall,
  contradiction recall, and package/version attribution;
- **reasoning:** proof or counterexample validity, conclusion agreement, frontier completeness, and resource status;
- **answer:** end-to-end correctness, fixed-denominator attempt coverage, selective accuracy, abstention quality,
  unsupported-claim rate, and epistemic-status correctness;
- **grounded inability:** relevance, misleading-evidence rate, completeness-receipt accuracy, citation validity, and
  whether the bundle helped a blinded downstream formulation step;
- **planning:** operation, polarity, constraint, topic, order, dependency, and obligation-completion agreement;
- **synthesis:** source coverage, citation precision, claim-ledger validity, unsupported and contradictory claim rate,
  schema compliance, and visible gaps;
- **resources:** wall time, CPU time, peak RSS, bytes opened, cache behavior, candidates, lookups, proof work, and
  external invocation count.

Strategy reporting overlays those layers without replacing them. It records catalog state, exact selected identity,
eligibility, execution, abstention, invalid output, work allocation and use, correlation group, candidate contribution,
arbiter configuration, and stage completeness. A `coordinated` executor, an `instrumented-local` gate, and a `planned`
catalog entry remain separate denominators.

Primary answers and grounding are scored independently. A relevant grounding record does not repair a wrong answer,
and a correct abstention is not penalized because an unrelated record existed.

### 4. Grounding-for-downstream formulation track

One optional track exports only the structured non-answer bundle to a separately evaluated downstream model or human.
The consumer never sees hidden labels. Its response is scored under the same source and citation constraints. Reports
distinguish:

- ESLM primary answer without grounding;
- ESLM grounding quality;
- downstream answer using that grounding;
- unsupported claims added by the downstream consumer;
- a no-retrieval and lexical-only baseline;
- an external model with the same evidence scope.

This track measures whether symbolic evidence is useful for formulation without attributing the downstream model's
language capability to the ESLM runtime.

### 5. Split design and leakage control

Random row hashes are insufficient for closely templated data. The suite groups by generator world, source document,
topic, paraphrase family, typo process, predicate vocabulary, relation path, proof graph, request pattern, and output
schema. Reports label row-IID, grouped-template, vocabulary-disjoint, structure-disjoint, source-version, and official
test evidence explicitly.

Development failures may guide only generic changes with renamed and metamorphic controls. A protected pool is used
once after code, KBs, work policy, scorer, and dependencies are frozen. Opened pools become historical checkpoints;
later progress needs a new source version or protected pool.

### 6. Reproducibility and resource execution

Every executable row records source, partition, oracle, scorer, prompt or policy, selected packages, selected methods,
work policy, process isolation, commit and tree identity, dependency digest, execution time, measured resources, result
digest, replay command, and the DS010 `eslm-benchmark-strategy-configuration-v1` snapshot. That snapshot binds exact
selection and configured arbiters to a content-addressed catalog and configuration and summarizes actual coordinated
receipts across the complete batch. An adapter-local track records its own closed state instead of pretending it used
the runtime work-policy path. Stored receipts are cryptographically audited against behavior dependencies and
classified current, historical, incomplete, invalid, unavailable, or unrecoverable.

Large suites run in isolated sequential workers under enforceable operating-system or runtime boundaries. An advisory
memory number without measured RSS is not resource evidence. Provider failures, truncation, and missing predictions
remain in fixed denominators.

### 7. Baselines and ablations

Required comparisons include exact lookup, lexical retrieval, role-aware retrieval, frequency-only ranking,
co-occurrence ranking, answer-bridge ranking, no retrieval, no heuristic recovery, direct CNL, extractive synthesis,
and every promoted verified-synthesis layer. External LLM comparisons use identical visible evidence and record model,
revision, prompt, decoding, tools, cost, and invocation policy.

Strategy experiments add exact single-strategy and leave-one-out ablations inside each eligible stage. Language
families are compared by accepted meaning and protected-operator safety; focus and relevance strategies by retrieval
quality; reasoning methods by applicable task semantics and independently checked witnesses; construction strategies
by source coverage and unsupported claims. Multi-method research compares verified strict proofs, defeasible results,
conflicts, and incomplete searches without turning agreement into extra truth. Compiler-side acquisition research
compares manual, technical-documentation, ontology, lexical, event-graph, table, and already-canonical adapters by
source-span fidelity, qualifier preservation, canonical validity, coverage gaps, review effort, and deterministic
package equivalence. Extraction agreement may prioritize review but never authorizes promotion.

An improvement is credible when it survives grouped splits, preserves negative controls, remains within its resource
contract, and improves the intended layer without moving failures into a hidden denominator.

### 8. Research horizon and release decisions

The roadmap advances through: authored diagnostic suite; frozen grouped development set; independently reviewed
relevance and interpretation judgments; protected end-to-end pool; reproducible external comparison; and continuing
new-pool evaluation. Each stage publishes failures by semantic cluster, not item identifiers, so future work can target
general mechanisms without memorizing protected examples.

Release decisions use a vector of safety, coverage, calibration, evidence quality, and resource metrics. The project
does not optimize a single composite score whose weights could hide unsupported claims or poor abstention.

## Decisions & Questions

### Question #1: Why score grounding separately from the primary answer?

Response: Grounding is deliberately weaker evidence. Separate scoring rewards useful recovery while preventing a
nearby fact from disguising an unsupported answer.

### Question #2: Why include a downstream formulation track?

Response: The intended bundle can ground a human or language model after ESLM abstains. Measuring that use directly is
more honest than claiming that the symbolic runtime itself generated the downstream prose.

### Question #3: How should product metrics be combined for release?

Options:

- publish a non-compensatory gate vector;
- select releases from a declared Pareto frontier; or
- adopt a carefully justified composite only after its tradeoffs survive adversarial review.

Until one is selected, unsupported-claim, unsafe-interpretation, and provenance failures are hard gates and cannot be
offset by higher retrieval recall.

### Question #4: Why evaluate strategy selection separately from the final answer?

Response: The same final value can hide a disabled useful technique, an invalid witness, duplicated correlated votes,
or excessive work. Stage and ablation metrics expose which mechanism contributed and whether its benefit survives
renaming, grouped splits, independent verification, and the declared resource policy.

## Conclusion

Realistic product evidence follows the complete path from wording to interpretation, retrieval, reasoning, answer,
grounded inability, and shaped artifact. Layered metrics and protected grouped splits make progress visible without
turning solver conformance, lexical similarity, or downstream language generation into inflated end-to-end claims.
