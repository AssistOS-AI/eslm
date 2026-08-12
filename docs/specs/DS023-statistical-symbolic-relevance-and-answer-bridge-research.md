---
id: DS023
title: Statistical Symbolic Relevance and Answer-Bridge Research
status: planned
owner: retrieval-research
summary: Defines the research program for active-KB frequency evidence, role-aware term combinations, proof-frontier ranking, conflict-aware aggregation, calibration, and promotion into deterministic retrieval.
---

# DS023 Statistical Symbolic Relevance and Answer-Bridge Research

## Introduction

Symbolic retrieval needs more than an exact word lookup. A useful candidate may mention several parts of the question,
use a typed relation that could connect the known premises to the requested value, or be common enough in the active
knowledge packages to deserve inspection. At the same time, raw frequency is not truth: a frequent generic word must
not outrank an exact subject-predicate-object match or turn a related record into an answer.

This specification defines the long-horizon research contract for fast statistical estimates inside a deterministic
symbolic runtime. It starts from the bounded relevance estimator implemented under DS022 and separates current
behavior from the larger questions of corpus statistics, graph expansion, reasoning-guided retrieval, calibration,
conflict handling, and cross-KB aggregation.

## Core Content

### 1. Current executable baseline

The current runtime performs two bounded stages. First, typed focus selection ranks accepted semantic identities,
exact phrases, nouns, verb lemmas, objects, and conservative variants while excluding grammatical scaffolding. Second,
`eslm-grounding-relevance-estimate-v1` scores the already retrieved candidate frontier using term coverage,
multi-term co-occurrence, distinct query-role coverage, a typed answer-bridge match, frontier document frequency, and
available active-posting occurrence evidence.

The frequency contribution is logarithmic and capped. Semantic identities, phrase combinations, and a compatible
query frame carry more weight. Every contribution is returned in a receipt with `answerSupported: false`. The current
estimator does not scan an entire package at question time, learn weights online, or claim that a bridge candidate
completes a proof.

The research pipeline keeps five decisions separate. DS022 first extracts typed query focus. Exact indexes then form a
bounded candidate frontier. Inspectable frequency, combination, role, and answer-bridge features rank that frontier.
A registered reasoning probe may test a small top-ranked subgraph under an independent budget. Finally, the aggregator
groups corroborating, conflicting, sense-specific, and subgoal-specific evidence without changing its proof status.
No ranking score may jump directly from lexical relevance to a primary answer.

### 2. Research representation

Every future relevance experiment uses one versioned `relevance-research-record` with these fields:

- query identity, language route, accepted Semantic IR, focus terms, roles, spans, and variants;
- exact active package identities and index versions;
- candidate record identity, typed semantic fields, trust and epistemic status, and provenance;
- local term frequency, record or posting document frequency, package collection frequency, and the population over
  which each statistic was counted;
- phrase, role, co-occurrence, graph-distance, answer-bridge, conflict, and diversity features;
- the bounded retrieval steps and registered reasoning probes actually executed;
- human or frozen evaluator judgments for topical relevance, answer usefulness, contradiction, and proof support;
- score components, selected rank, omissions, exhausted budgets, and replay identity.

A number without its counting population is invalid evidence. For example, `occurrences: 120` must say whether it
counts source rows, normalized records, semantic endpoints, or posting members in one package version.

### 3. Frequency signals

The research program distinguishes several statistics instead of calling all of them “frequency”:

1. **Surface term frequency** counts a normalized token or phrase within a record.
2. **Posting document frequency** counts distinct active records reachable from one exact index key.
3. **Package collection frequency** counts normalized occurrences across one immutable package version.
4. **Active-set frequency** combines only the packages selected for this execution and retains a per-package vector.
5. **Joint document frequency** counts records containing a declared combination of focus terms or semantic roles.
6. **Relation-conditioned frequency** counts a term or value under a typed predicate or relation family.

Counts use precomputed package statistics or lengths of already opened postings. Ordinary query execution never scans a
complete large KB merely to compute a score. Cross-package normalization must account for package size, record kind,
language, duplicate lineage, and source authority; adding a large package must not mechanically drown a smaller exact
source.

### 4. Combination and role evidence

Term evidence is compositional. A record matching the entity, predicate, and object roles is more informative than
three unrelated records that each match one token. The baseline super-additive co-occurrence vote is a first
approximation. Research compares at least these alternatives:

- bounded Boolean coverage over typed roles;
- TF-IDF or BM25-style scores over immutable symbolic records;
- likelihood-ratio or pointwise mutual-information estimates with low-count smoothing;
- relation-conditioned co-occurrence matrices;
- deterministic graph spreading from accepted entity and predicate nodes;
- submodular selection that balances coverage, diversity, and redundancy;
- calibrated ensembles whose learned parameters are frozen declarative policy, never updated during deployment.

No alternative may erase the exact semantic-identity tier. Statistical evidence ranks a frontier; it cannot redefine a
predicate, merge entities, reverse a relation, or weaken a protected operator.

### 5. Answer bridges and reasoning probes

An **answer bridge** is a candidate whose typed fields align with part of the query frame and could supply a missing
premise, relation, value, or path step. It is a retrieval hypothesis, not an answer. Research distinguishes:

- direct frame bridges that match the accepted subject and predicate and expose a candidate value;
- relation bridges that connect one accepted entity to another through a declared relation;
- rule-premise bridges that satisfy one unresolved atom of a safe registered rule;
- contradiction bridges that can refute or qualify a candidate answer;
- provenance bridges that lead from a derived record to its source support.

A bounded reasoning probe may execute only a registered method on an isolated candidate subgraph with an explicit
budget. It returns `proved`, `refuted`, `still-open`, `ambiguous`, `conflicting`, or `resource-limited` together with a
witness. Only `proved` under the declared semantics can support a primary answer. All other outcomes remain retrieval
or diagnostic evidence.

### 6. Conflict-aware aggregation

Candidate aggregation preserves source identity, epistemic strength, polarity, context, validity interval, and trust.
Records from several KBs may corroborate one semantic claim, conflict, specialize one another, or merely share words.
The aggregator therefore creates explicit clusters:

- semantically equivalent support with merged lineage;
- compatible but non-equivalent context;
- direct contradiction or polarity opposition;
- competing entity or sense interpretations;
- lexical-only similarity;
- independent evidence for different subgoals.

Ranking may reward independent corroboration, but it may not collapse a conflict into consensus. A synthesis or
downstream model receives the clusters and their receipts, not an unordered pile of statements.

### 7. Calibration and falsification

Weights are evaluated on independently authored, frozen relevance judgments. Required query strata include exact and
paraphrased terms, spelling noise, polysemy, common-word distractors, wrong-KB distractors, multi-KB joins,
contradictions, incomplete indexes, and questions with no useful record. Evaluation reports:

- recall and precision at each bounded `k`;
- mean reciprocal rank and normalized discounted cumulative gain;
- answer-bridge recall and proof-producing bridge recall;
- contradiction recall and unsupported-promotion rate;
- citation and package-version validity;
- calibration of relevance confidence against judgments;
- latency, lookup count, bytes, opened blocks, and memory;
- results with frequency, co-occurrence, bridge, trust, and diversity features ablated separately.

The hypothesis fails if a simpler exact-posting baseline matches it, if improvements disappear under grouped topic or
source splits, if common terms dominate exact frames, or if answer usefulness rises by presenting unsupported evidence
as proof.

### 8. Promotion gates

A research ranker enters the deployable runtime only when it is deterministic, dependency-free, bounded by DS021,
free of benchmark and domain constants, reproducible from immutable statistics, and at least as safe as the baseline
under every negative control. Frozen weights or tables become versioned declarative policy with source and training
receipts. A learned ranker cannot load an opaque model that prevents feature-level explanation.

### 9. Research horizons

The program is staged rather than tied to calendar promises:

1. **Measurement foundation:** package statistics, exact counting populations, retrieval judgments, and baseline
   ablations.
2. **Combination models:** role-aware co-occurrence, diversity, and cross-package normalization.
3. **Reasoning-guided retrieval:** bounded answer-bridge probes, contradiction expansion, and iterative proof frontiers.
4. **Calibrated aggregation:** trust-aware clusters, confidence calibration, and downstream synthesis contracts.
5. **Release promotion:** genericity audit, frozen policies, resource profiling, and new protected evaluation pools.

## Decisions & Questions

### Question #1: Why is active-KB frequency only a capped vote?

Response: Frequency estimates availability, not relevance or truth. A cap preserves its value for tie-breaking while
preventing common grammatical or encyclopedic terms from overwhelming an exact typed match.

### Question #2: Why probe reasoning before selecting every related record?

Response: A bounded proof probe distinguishes a record that merely repeats query words from one that can close an
actual subgoal. Keeping the probe isolated and witnessed prevents retrieval ranking from silently becoming a second
unbounded reasoner.

### Question #3: Which statistical ranking family should become the long-term default?

Options:

- a hand-calibrated transparent ensemble;
- a BM25-style symbolic index;
- a graph-spreading model; or
- a frozen learned linear ranker.

The project will select one only after the common frozen benchmark and ablation suite can distinguish them.

## Conclusion

Statistical evidence can make symbolic retrieval substantially more useful without surrendering auditability. The
research contract keeps counts tied to immutable populations, combines them with typed semantic roles and proof
frontiers, and reserves answer authority for registered reasoning with a witness.
