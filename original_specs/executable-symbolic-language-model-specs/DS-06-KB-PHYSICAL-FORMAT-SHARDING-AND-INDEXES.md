# DS-06 — KB Physical Format, Sharding and Indexes

## 1. Scale objective

The same logical model must support a small benchmark KB with thousands of records and a large knowledge collection with millions or billions of assertions. The runtime must not require loading an entire KB into memory.

The design therefore separates canonical records from compiled immutable segments. Canonical records optimize reproducibility and inspection. Compiled segments optimize local random access, joins, graph expansion and dynamic loading.

## 2. Compiled package components

A compiled KB contains a manifest, stable-to-local term dictionaries, lexical indexes, assertion segments, event-role segments, rule segments, provenance segments, statistics and routing summaries. Each segment is immutable and checksum-protected.

Common unary and binary facts are dictionary encoded. Dense local integer identifiers permit delta encoding and compact adjacency blocks. Event and n-ary records use the same local identifier space within a segment and explicit mapping to stable global term identifiers.

## 3. Access paths

The compiler should produce sorted access paths for the query patterns the runtime must support. Binary relations normally require predicate-subject-object and predicate-object-subject access. Subject-predicate-object and object-predicate-subject views may be generated when cross-predicate neighborhood traversal is frequent.

Unary assertions require predicate-subject and subject-predicate access. Event data requires event-type, event-role-filler and filler-role-event access. Rules require indexes by head predicate, body predicate dependency and declared capability.

These indexes may be materialized as independent immutable segments referencing canonical fact identifiers. A fact need not be duplicated in every index.

## 4. Shard construction

Shards are physical units chosen for bounded loading and predictable caching. A shard should normally be large enough to amortize metadata and compression overhead but small enough to load or evict without destabilizing memory. The exact size is configurable; ranges around tens to a few hundreds of megabytes are reasonable operational targets rather than semantic requirements.

Sharding follows access paths rather than only source-document boundaries. An index can be partitioned first by predicate or relation family and then by a stable hash or ordered range of the first bound argument. Lexical indexes can be partitioned by language and prefix or FST range. Provenance may be partitioned by source.

The manifest records each shard’s predicate coverage, identifier ranges, term Bloom filters, block statistics, dependencies, checksum, compressed size and expected access path.

## 5. Block format

Within a shard, records are stored in sorted blocks. Blocks contain min/max keys, counts, checksums and optional Bloom filters. Integer columns use delta or frame-of-reference encoding. Repeated predicate and context identifiers use run-length or dictionary encoding. Compression must allow selective block reads rather than requiring full-shard decompression.

The design must tolerate a pure portable backend and optional native acceleration. A first implementation may use an embedded indexed database per shard, but the logical access paths and manifests must remain compatible with a later immutable binary segment backend.

## 6. Development and scale profiles

| Profile | Recommended implementation |
|---|---|
| Development profile | SQLite or another embedded transactional store per KB or shard, with explicit indexes and deterministic export. |
| Scale profile | Immutable dictionary-coded segment files, block indexes, conservative Bloom filters, lexical FSTs and an LRU block cache. |

The development profile permits rapid implementation and inspection. It must not change logical query semantics. The scale profile is introduced when data volume or latency requires it.

## 7. Updates and overlays

Large KBs are not rewritten for every update. New knowledge, corrections and retractions are written as immutable overlay packages. The query engine merges baseline and overlay records under explicit version and precedence rules.

Compaction can periodically merge overlays into a new baseline. Compaction is deterministic and produces a new KB version rather than mutating an existing published package.

## 8. Billion-fact considerations

At billion scale, the runtime cannot maintain a complete in-memory term-to-record map. It keeps only the global catalog, compact lexical routing structures, frequently used dictionaries and cached blocks. Exact shard directories may themselves be partitioned and demand-loaded.

Query planning must exploit bound terms and predicates before opening data segments. Multi-hop traversal expands through adjacency blocks and may load additional shards as new frontier terms are discovered. Resource budgets prevent unbounded graph expansion.

## 9. Reproducibility

Every compiled segment identifies the canonical KB version, compiler version, schema version and build options. Query equivalence tests compare canonical and compiled backends on sampled and adversarial queries. The compiled package is accepted only when it returns semantically identical records and qualifiers.
