---
id: DS020
title: Catalog Discovery and Exact Query-Directed Routing
status: in-progress
owner: retrieval
summary: Defines lightweight package discovery, exact term and predicate directories, conservative approximate ranking, cross-KB alignment, iterative proof-frontier expansion, and exhaustive routing equivalence.
---

# DS020 Catalog Discovery and Exact Query-Directed Routing

## Introduction

ESLM may register more knowledge than one process can load. The catalog therefore discovers packages and exact access paths from a typed task without materializing their facts. This specification owns selection and expansion correctness; shard representation belongs to DS019 and cache residence belongs to DS021.

## Core Content

### Registration versus loading

DS006 exclusively defines registration validation and immutable catalog identity. Routing consumes its validated package
summary and shard directory without opening all assertion or rule blocks. The always-resident discovery view must
remain small relative to the registered knowledge collection.

### Catalog summary

Each package summary declares languages, domains, namespaces, root concepts, predicate coverage, rule-head and rule-body coverage, lexical routing indexes, exact term-directory partitions, relation families, temporal coverage, dependencies, trust class, source quality, and estimated query costs. Summaries are version-qualified and immutable with the package.

### Task signature

The language frontend and planner construct a task signature containing surface terms, candidate stable concepts and entities, predicates or relation families, bound arguments, requested qualifiers, contexts, temporal and spatial constraints, expected output type, and required capabilities. Unknown vocabulary may remain a local symbolic atom; failure to find a global lexeme does not make syntactically valid input unparseable.

### Exact directories and safe exclusion

A partitioned exact term directory maps stable identifiers to dictionary, assertion, event, rule, alignment, and provenance shards that may contain relevant records. Predicate and rule-dependency directories map requested operations to access paths. These directories may conservatively return false positives but must not return false negatives for the registered package version.

A verified key range, exact directory miss, or conservative Bloom-filter negative may exclude a shard. A Bloom positive proves only possible presence. Similarity, embeddings, fingerprints, domain labels, and historical popularity may rank candidates but cannot exclude an exact dependency or establish factual absence.

### Candidate package and shard ordering

The router orders packages using exact namespace and term matches, predicate and rule coverage, ontology ancestry, language and domain declarations, trust policy, bound-argument selectivity, and estimated I/O. It returns every candidate with the reason for inclusion and separates exact evidence from approximate ranking signals.

Within a package, the planner selects the smallest compatible access path and key range. It verifies records after loading because compact summaries may overapproximate. Provider order and shard order cannot decide truth or break semantic ties.

### Iterative proof-frontier expansion

Initial retrieval loads facts and rules directly connected to the goal. A reasoning method may derive a new term, predicate, relation endpoint, temporal boundary, or rule premise. Each unresolved proof subgoal produces another typed access request. The loader expands only the needed frontier under declared search budgets and records why each shard was requested.

The planner may widen from exact lexical candidates to reviewed alignments or conservative semantic candidates when the first frontier produces no proof. Widening is explicit, bounded, and cannot erase the earlier search scope. A resource limit returns the unresolved frontier; it is distinct from an exhaustive `UNKNOWN`.

### Cross-KB joins

Cross-KB reasoning uses stable identifiers, explicit imports, and alignment records. Similar labels do not create identity. Every joined premise records the supplying package and the alignment or shared namespace that made the join valid. A dependency makes a package available for interpretation but does not force eager loading of every dependency shard.

Conflicting provider value sets remain separate and produce ambiguity unless a declared context or trust policy resolves them. Load order is never a conflict policy.

### Exhaustive routing equivalence

For a fixed package set and semantic resource bounds, exhaustive mode opens every shard that exact directories identify as potentially relevant. Lazy mode uses normal ordering and iterative expansion. Both must return the same records, semantic statuses, values, proofs, and provenance. A missing record caused by routing is a critical correctness defect, not an acceptable retrieval loss.

Routing tests include negative queries, ambiguous names, multi-hop rule dependencies, cycles, irrelevant high-similarity packages, version overlays, and terms introduced only after one derivation step.

## Decisions & Questions

### Question #1: May approximate relevance exclude evidence?

Response: Ordering affects cost; exclusion affects truth. Approximate signals can accelerate a likely path but cannot prove that a fact or rule is absent. Exact or conservative no-false-negative metadata is required for safe exclusion.

### Question #2: Why does routing expand from proof subgoals?

Response: A typed subgoal identifies the predicate, arguments, qualifiers, and method dependency that can contribute. Query-directed expansion keeps I/O proportional to the actual derivation while preserving an exhaustive widening path and a reviewable trace.

## Conclusion

Catalog routing is a conservative physical plan over immutable knowledge. It may change which shard is opened first, but within declared bounds it cannot change the logical answer or hide an unresolved search frontier.
