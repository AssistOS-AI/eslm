---
id: DS020
title: Catalog Discovery and Exact Query-Directed Routing
status: in-progress
owner: retrieval
summary: Defines exact package and shard routing, proof-frontier expansion, role-focused failure retrieval, bounded work, cross-KB alignment, and exhaustive-routing equivalence.
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

An explicit lexical-relation request is routed to a provider only when that provider recognizes the operation and has the required exact lexical index. The present WordNet path strips an explicit English infinitive marker only as a part-of-speech cue, reads source-ordered senses for that part of speech, and returns one synonym or antonym backed by the selected synset or entry relation. It never chooses an answer from provider registration order. When an English lemma is polysemous and the prompt supplies no sense context, a source-backed relation can still require semantic review: provenance proves that the lexical relation exists, not that it matches the source question's intended sense.

### Exhaustive routing equivalence

For a fixed package set and semantic resource bounds, exhaustive mode opens every shard that exact directories identify as potentially relevant. Lazy mode uses normal ordering and iterative expansion. Both must return the same records, semantic statuses, values, proofs, and provenance. A missing record caused by routing is a critical correctness defect, not an acceptable retrieval loss.

Routing tests include negative queries, ambiguous names, multi-hop rule dependencies, cycles, irrelevant high-similarity packages, version overlays, and terms introduced only after one derivation step.

### Failure-time related-evidence routing

DS035 invokes the same conservative exact access paths for the mandatory query-local task context. Its
`eslm-task-knowledge-context-request-v1` is built after the English-likelihood gate from explicit and embedded
question families plus bounded visible focus terms. The context coordinator may fan out only across the already
selected immutable package scope and must preserve the same per-source lookup, candidate, completion, and truncation
receipts described below. The broader facet inventory changes which typed needs are recorded; it never authorizes a
full-package scan, fuzzy global event index, unselected source, or relevance-only exclusion from an exact answer route.
Context routing is a parallel non-authoritative retrieval obligation and cannot choose the language interpretation or
replace the exact task route.

An exact physical directory key is not by itself a semantic identity. Query-local GeoNames context distinguishes a
common nominal focus from a proper-name focus before opening its name posting. Its accent-folded directory may locate
bounded candidates, but admission additionally requires the original proper-name surface to equal the record's
canonical name under case-insensitive NFKC comparison without removing diacritics. Thus a common noun and a place
whose spelling differs by a Unicode letter may share a physical key without sharing semantic identity. Typed and
Unicode-different exclusions are counted in the provider receipt; they do not become factual absence or affect an
explicit source-owned alias route outside contextual fallback.

When DS009 permits grounding after an inability result, the runtime creates one bounded
`eslm-grounding-request-v1`. DS022 constructs its query focus by role, preferring accepted entity and predicate
identities, exact multiword content phrases, nouns and verbs, then conservative morphological variants. Articles,
determiners, quantifiers, auxiliaries, copulas, pronouns, conjunctions, prepositions, request directives, output
artifacts, and style qualifiers are excluded while content terms exist. A protected operator such as `all` becomes a
topic only when quotation or an accepted metalinguistic frame asks about the word itself. For a final `UNPARSED`, the
focus comes from the original NFKC surface rather than a rejected correction. Accepted semantic subject, predicate,
object, and factoid fields may add exact identity lookups. The selection receipt names each candidate's role, score,
phrase boundary, included variants, exclusion reason, selected terms, omissions, and completion state.

Every selected source implements a provider-neutral `retrieveGrounding(request)` operation or returns an explicit
unsupported-interface receipt. The runtime does not dispatch on KB IDs. Canonical in-memory packages use prebuilt
subject, predicate, object, and alias postings. Sharded providers use their own exact lemma, term, entity, relation, or
event indexes. Automatic fallback must not linearly scan all facts, all closure records, all source events, or all
shards. Output limits do not substitute for work limits: the request bounds terms, lookups, posting expansion,
candidates per lookup, returned entries, semantic payload bytes, provenance items, and structural depth.

Entries are ranked deterministically by explicit identity and overlap reasons, with stable tie-breaking and bounded
cross-KB diversity. Provider order cannot choose an answer or change the selected set. Derived canonical entries carry
their rule and support witness. Each source emits a receipt naming KB version, searched access path, candidates
considered, completion, provider failure, and truncation reasons. A complete empty search can support
`NO_RELATED_EVIDENCE`; any failed or truncated source makes absence inconclusive. The primary answer, status, values,
and provenance remain unchanged on this ordinary failure-grounding route.

The active immutable `eslm-work-policy-v1` supplies exact limits for selected sources, focus terms, lookups, values per
lookup, candidate entries, returned entries, and output bytes. `quick`, `balanced`, `deep`, and
`exhaustive-bounded` widen those finite limits without changing ranking semantics, trust, or safe-exclusion rules. A
larger profile may complete a previously truncated search; it cannot turn an approximate ranking signal into a proof
or make an incomplete miss semantic absence.

If DS022 recognized an explicit artifact request before retrieval, the separately named
`heuristic-request-synthesis` route may select some returned statements as cited source claims in a `PARTIAL` artifact.
Routing itself still reports `answerSupported: false` and never decides which claim is true. The construction receipt
identifies every promoted record; unselected entries remain ordinary grounding and cannot inflate top-level
provenance or `usedKbVersions`.

### Present implementation boundary

The current runtime implements exact loaded-model postings, source-ordered part-of-speech-aware WordNet lexical relation lookup, role-focused bounded grounding terms, named work-profile
limits, and grounding projections for the session overlay, Open English WordNet, ATOMIC exact events, GeoNames,
ConceptNet, and the reviewed World Relations ontology. The broader always-resident multi-package catalog, conservative
no-false-negative directory construction, general proof-frontier expansion, and exhaustive/lazy equivalence across
arbitrary future packages remain partial target work. Existing provider-specific indexes are evidence for the
access-path design; they do not establish the entire catalog-routing contract.

## Decisions & Questions

### Question #1: May approximate relevance exclude evidence?

Response: Ordering affects cost; exclusion affects truth. Approximate signals can accelerate a likely path but cannot prove that a fact or rule is absent. Exact or conservative no-false-negative metadata is required for safe exclusion.

### Question #2: Why does routing expand from proof subgoals?

Response: A typed subgoal identifies the predicate, arguments, qualifiers, and method dependency that can contribute. Query-directed expansion keeps I/O proportional to the actual derivation while preserving an exhaustive widening path and a reviewable trace.

### Question #3: Why may failure grounding use lexical overlap when answer routing cannot?

Response: Grounding claims only bounded relevance and sets `answerSupported: false`; it does not derive truth or safely
exclude evidence. The answer path still requires typed premises and a registered method. Receipts and explicit
incompleteness prevent a lexical miss from being reported as semantic absence.

## Conclusion

Catalog routing is a conservative physical plan over immutable knowledge. It may change which shard is opened first, but within declared bounds it cannot change the logical answer or hide an unresolved search frontier.
