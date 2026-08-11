---
id: DS006
title: KB Physical Packages, Catalog, Routing, and Cache
status: in-progress
owner: storage
summary: Defines canonical and compiled package separation, sharding, access paths, manifests, exact and approximate routing, overlays, bounded caches, and exhaustive equivalence.
---

# DS006 KB Physical Packages, Catalog, Routing, and Cache

## Introduction

The same KB contract must support small inspectable packages and collections with millions or billions of assertions. This specification combines physical compilation, package registration, discovery, query-directed loading, cache identity, and routing correctness.

## Core Content

### 1. Scale objective

The same logical model must support a small benchmark KB with thousands of records and a large knowledge collection with millions or billions of assertions. The runtime must not require loading an entire KB into memory.

The design therefore separates canonical records from compiled immutable segments. Canonical records optimize reproducibility and inspection. Compiled segments optimize local random access, joins, graph expansion and dynamic loading.

### 2. Compiled package components

A compiled KB contains a manifest, stable-to-local term dictionaries, lexical indexes, assertion segments, event-role segments, rule segments, provenance segments, statistics and routing summaries. Each segment is immutable and checksum-protected.

Common unary and binary facts are dictionary encoded. Dense local integer identifiers permit delta encoding and compact adjacency blocks. Event and n-ary records use the same local identifier space within a segment and explicit mapping to stable global term identifiers.

### 3. Access paths

The compiler should produce sorted access paths for the query patterns the runtime must support. Binary relations normally require predicate-subject-object and predicate-object-subject access. Subject-predicate-object and object-predicate-subject views may be generated when cross-predicate neighborhood traversal is frequent.

Unary assertions require predicate-subject and subject-predicate access. Event data requires event-type, event-role-filler and filler-role-event access. Rules require indexes by head predicate, body predicate dependency and declared capability.

These indexes may be materialized as independent immutable segments referencing canonical fact identifiers. A fact need not be duplicated in every index.

### 4. Shard construction

Shards are physical units chosen for bounded loading and predictable caching. A shard should normally be large enough to amortize metadata and compression overhead but small enough to load or evict without destabilizing memory. The exact size is configurable; ranges around tens to a few hundreds of megabytes are reasonable operational targets rather than semantic requirements.

Sharding follows access paths rather than only source-document boundaries. An index can be partitioned first by predicate or relation family and then by a stable hash or ordered range of the first bound argument. Lexical indexes can be partitioned by language and prefix or FST range. Provenance may be partitioned by source.

The manifest records each shard’s predicate coverage, identifier ranges, term Bloom filters, block statistics, dependencies, checksum, compressed size and expected access path.

### 5. Block format

Within a shard, records are stored in sorted blocks. Blocks contain min/max keys, counts, checksums and optional Bloom filters. Integer columns use delta or frame-of-reference encoding. Repeated predicate and context identifiers use run-length or dictionary encoding. Compression must allow selective block reads rather than requiring full-shard decompression.

The design must tolerate a pure portable backend and optional native acceleration. A first implementation may use an embedded indexed database per shard, but the logical access paths and manifests must remain compatible with a later immutable binary segment backend.

### 6. Development and scale profiles

| Profile | Recommended implementation |
|---|---|
| Development profile | SQLite or another embedded transactional store per KB or shard, with explicit indexes and deterministic export. |
| Scale profile | Immutable dictionary-coded segment files, block indexes, conservative Bloom filters, lexical FSTs and an LRU block cache. |

The development profile permits rapid implementation and inspection. It must not change logical query semantics. The scale profile is introduced when data volume or latency requires it.

### 7. Updates and overlays

Large KBs are not rewritten for every update. New knowledge, corrections and retractions are written as immutable overlay packages. The query engine merges baseline and overlay records under explicit version and precedence rules.

Compaction can periodically merge overlays into a new baseline. Compaction is deterministic and produces a new KB version rather than mutating an existing published package.

### 8. Billion-fact considerations

At billion scale, the runtime cannot maintain a complete in-memory term-to-record map. It keeps only the global catalog, compact lexical routing structures, frequently used dictionaries and cached blocks. Exact shard directories may themselves be partitioned and demand-loaded.

Query planning must exploit bound terms and predicates before opening data segments. Multi-hop traversal expands through adjacency blocks and may load additional shards as new frontier terms are discovered. Resource budgets prevent unbounded graph expansion.

### 9. Reproducibility

Every compiled segment identifies the canonical KB version, compiler version, schema version and build options. Query equivalence tests compare canonical and compiled backends on sampled and adversarial queries. The compiled package is accepted only when it returns semantically identical records and qualifiers.

### 1. Registration versus loading

A CLI may register many KB packages without loading their facts. Registration reads and validates manifests, namespaces, dependency metadata, lexical summaries, capability tags, trust policies and shard directories.

The always-resident catalog must remain small relative to the KB collection. It provides enough information to discover candidate knowledge and exact shard locations without materializing all assertions.

### 2. Catalog contents

The catalog records KB identity, version, namespaces, languages, domains, concept roots, predicate coverage, rule-head coverage, lexical index locations, dependencies, trust level, shard summaries and statistics.

A global term directory maps stable term identifiers to candidate KBs or dictionary shards. The directory may be partitioned at very large scale. Lexical lookup maps input forms to candidate stable terms without loading full fact stores.

### 3. Runtime discovery sequence

The runtime first builds a task signature from the parsed input. The signature contains explicit entities, candidate concepts, predicates, relation families, requested output type, temporal or spatial operators and required reasoning capabilities.

The catalog ranks KBs using exact term matches, namespace imports, predicate coverage, ontology ancestry, language coverage, domain declarations, trust and estimated cost. Ranking may use approximate semantic fingerprints, but approximate signals may only order candidates.

Safe exclusion requires conservative evidence. A Bloom filter negative can exclude a shard. A Bloom filter positive cannot prove relevance. A learned embedding similarity may increase priority but cannot remove a KB from consideration when exact dependencies indicate possible relevance.

### 4. Shard selection

After candidate KBs are selected, the query planner chooses access paths and shards using bound predicates and arguments. The manifest and block summaries identify the smallest relevant segments.

Multi-hop reasoning uses iterative expansion. Initial shards provide facts and rules directly connected to the task. Derived subgoals or newly discovered entities may identify additional shards. The loader fetches these under memory and cost budgets and records every decision in the execution trace.

### 5. Cache policy

The runtime maintains an LRU or cost-aware cache of dictionaries, index blocks and fact blocks. Core language KBs, current session context and frequently used ontologies may be pinned. Large domain shards remain evictable.

Cache entries are version-qualified. Two KB versions cannot accidentally share mutable state. Query-local structures are released when the task completes unless retained by an explicit session policy.

### 6. Cross-KB reasoning

Cross-KB joins use stable term identifiers and explicit alignment records. A query may combine a general ontology, a lexical KB, a project KB and session facts. The planner records which KB supplied each premise and which alignment enabled the join.

Dependencies in a manifest identify KBs that must be available for interpretation, but loading remains lazy. A dependency on a common ontology does not require loading all of that ontology.

### 7. Failure modes

The loader distinguishes no matching KB, matching KB but no matching shard, inaccessible package, checksum failure, incompatible schema, memory-budget refusal and exhausted expansion budget. These statuses propagate to the honest-failure model rather than being flattened into an incorrect answer.

### 8. Correctness requirement

Dynamic loading is an optimization and must not change logical results within declared budgets. A deterministic evaluation mode may run the same query with all relevant KBs fully available and compare it with lazy loading. Any difference caused by an unsound routing exclusion is a critical regression.

### 1. Package manifest

A registered KB exposes a manifest without requiring fact segments to be opened. The manifest is small enough to validate and catalog eagerly.

```json
{
  "manifestType": "knowledgeBasePackage",
  "kbId": "axiologic.example.general-knowledge",
  "kbVersion": "1.2.0",
  "schemaVersion": "1",
  "namespace": "axiologic.example",
  "languages": ["en"],
  "domains": ["general-knowledge"],
  "dependencies": [
    {"kbId": "common.core-ontology", "versionRange": "^1.0.0"}
  ],
  "canonicalSource": {
    "checksum": "sha256:...",
    "recordCount": 1200000000
  },
  "compiler": {
    "version": "...",
    "configurationHash": "sha256:..."
  },
  "catalogSummaryRef": "catalog-summary.bin",
  "shardDirectoryRef": "shards.jsonl",
  "signature": null
}
```

The manifest contains no complete term list or fact list. It points to compact summaries and partitioned exact directories.

### 2. Shard descriptor

```json
{
  "shardId": "facts-pos-UsedFor-0042",
  "shardKind": "assertionIndex",
  "accessPath": "predicate-object-subject",
  "predicates": ["term:common:UsedFor"],
  "firstKeyRange": {"min": 42000000, "max": 42999999},
  "stableTermBloomRef": "facts-pos-UsedFor-0042.bloom",
  "blockIndexRef": "facts-pos-UsedFor-0042.blocks",
  "dataRef": "facts-pos-UsedFor-0042.seg",
  "recordCount": 18724111,
  "compressedBytes": 134217728,
  "checksum": "sha256:...",
  "dependencies": ["dict-terms-004", "prov-source-018"]
}
```

`firstKeyRange` refers to the first bound key after the predicate in the access path. Ordered ranges and hash partitions must declare the partitioning policy in the package catalog.

### 3. Catalog summary

The catalog summary contains predicate coverage, rule-head coverage, root concept coverage, languages, domains, lexical FST locations, stable-term directory partitions, source-quality levels and estimated query costs.

Approximate fingerprints may be included for ranking. They cannot be used as the sole basis for exclusion.

### 4. Exact term directory

A partitioned term directory maps stable term identifiers to dictionary shards, assertion-index shards, event-role shards and rule shards that may contain relevant records.

The directory may return false positives if compressed conservatively. It MUST NOT return false negatives for a registered package version. Directory construction is checked against the compiled fact inventory.

### 5. Lexical routing

Lexical routing is separate from fact routing. A language-specific FST or equivalent compact index maps normalized surface forms to candidate stable term identifiers and frame identifiers. The runtime loads detailed lexeme records only for candidate ranges.

Unknown words are permitted as local symbolic atoms. The lexical router therefore distinguishes no known sense from syntactically unusable input.

### 6. Query routing contract

A query access request contains a predicate or predicate family when known, bound arguments, requested qualifiers, context policy, expected result cardinality and current resource budget.

The router returns an ordered set of shard candidates with a reason for selection. Exact manifest matches, term-directory matches and rule dependencies are recorded separately from approximate ranking signals.

### 7. Expansion contract

During multi-hop reasoning, newly derived terms and predicates generate additional access requests. Expansion is incremental. The loader does not preemptively load all neighbors of every candidate term.

The planner may widen the search when the first candidate set produces no proof, but widening remains bounded and traceable.

### 8. Cache identity

A cache key includes KB ID, KB version, shard ID, block ID and checksum. Mutable aliases are resolved before cache lookup. This prevents a block from one version being used under another version.

### 9. Exhaustive-equivalence test

For a test query, exhaustive mode opens every shard that the exact directory identifies as potentially relevant. Lazy mode uses normal ranking and incremental expansion. Both modes must return the same semantic records within the same context and budget assumptions.

A missing record caused by routing is a critical correctness defect, not an acceptable approximate-retrieval loss.

### Portable first implementation

The repository remains dependency-free, so the first implementation uses canonical JSONL and immutable JSON data segments with compact dictionaries and sorted access-path indexes rather than SQLite or a native binary dependency. Segment envelopes are data and are parsed, not evaluated. The package schema keeps the access paths and manifests compatible with later CBOR sequences or binary blocks when measured scale requires them.

### Memory budgets and observable caches

Memory policy is an execution input. The catalog and planner estimate manifest, dictionary, index, and active-block cost before loading. A cache key includes KB ID, version, shard ID, block ID, and checksum. Cache entries are byte-accounted and version-qualified. Pinned language and session structures are distinguished from evictable domain blocks.

A soft in-process target controls retained KB data but cannot promise whole-process RSS because Node.js allocation and garbage collection are not fully controlled by application code. A hard limit belongs to an operating-system or container boundary. The runtime must report requested budget, selected packages and shards, cache hits, misses, evictions, oversized active blocks, expansion budget, and resource refusal. Lazy and exhaustive execution must return the same semantic records under the same declared budgets.

## Decisions & Questions

### Question #1: Why are approximate signals allowed in routing?

Response: They can order candidate KBs and shards efficiently. They cannot safely exclude exact dependencies or term-directory matches. Conservative negative evidence may exclude; similarity alone may not.

### Question #2: Why not load an entire KB after registration?

Response: Registration establishes identity, compatibility, trust, and routing metadata. Query-directed loading keeps runtime cost proportional to relevant predicates, terms, scopes, and proof expansion.

### Question #3: When may a new storage backend be introduced?

Response: Only when profiling shows a concrete bottleneck and canonical-versus-compiled plus exhaustive-versus-lazy equivalence tests demonstrate preserved semantics.

## Conclusion

Compiled KB packages are immutable, checksum-protected, selectively readable optimizations. Their catalog and routing metadata must remain small, conservative, deterministic, and incapable of changing logical results.
