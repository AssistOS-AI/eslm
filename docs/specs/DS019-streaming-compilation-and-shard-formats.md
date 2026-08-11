---
id: DS019
title: Streaming Compilation and Immutable Shard Formats
status: in-progress
owner: storage
summary: Defines bounded-memory canonical compilation, deterministic dictionaries, access-path indexes, shard and block envelopes, completeness accounting, and canonical-to-compiled equivalence.
---

# DS019 Streaming Compilation and Immutable Shard Formats

## Introduction

This specification owns the physical transformation from canonical DS005 records into selectively readable immutable data. DS006 owns package identity and registration, DS020 owns query routing, and DS021 owns cache and memory policy. Separating these responsibilities prevents a storage-format change from rewriting query semantics or evaluation contracts.

## Core Content

### Streaming compiler pipeline

The compiler reads canonical records sequentially, validates each record, resolves namespace dependencies, assigns deterministic stable-to-local identifiers, and emits bounded partition files for every required access path. It does not construct an in-memory object graph proportional to the source. When a partition exceeds memory, it spills sorted runs to an ignored build cache and merges them deterministically.

The pipeline reports source records, schema-invalid records, records outside the declared semantic projection, accepted canonical records, deduplicated records, emitted index entries, and shard totals. These counts must reconcile. A process crash leaves no partially registered package; final publication uses atomic directory or manifest replacement after validation.

### Dictionaries and identifiers

Canonical namespace-qualified identifiers remain the logical identity. Each compiled segment may map them to dense unsigned local integers. Dictionary ordering is deterministic from canonical identifiers, not discovery order. Cross-shard references either use stable identifiers or identify the exact dictionary shard and local-ID domain.

Repeated predicates, contexts, sources, roles, and strings use dictionary encoding. Numeric columns may use delta or frame-of-reference encoding when the decoder validates overflow and range. Encoding changes representation only; it does not merge terms or discard qualifiers.

### Access paths

Unary assertions require predicate-subject and subject-predicate views. Binary assertions normally require predicate-subject-object and predicate-object-subject views. Event records require event-type, event-role-filler, and filler-role-event views. Rules require indexes by head predicate, body dependency, and declared method family. Document packages additionally require lexical, mention, hierarchy, temporal, procedure-step, and provenance-span views.

An index entry refers to the canonical record identity and the qualifiers needed to verify it. Multiple access paths do not create several logical facts. The compiler may omit a physical view only when the manifest declares that query shape unsupported or proves another exact path covers it.

### Shards and blocks

A shard is an immutable load and validation unit chosen by access locality: predicate family, stable key range, hash bucket, language and lexical prefix, document hierarchy, temporal partition, or another reviewed key. Target byte size controls I/O and eviction granularity, never source acceptance.

Inside a shard, records are sorted into blocks. A block envelope records access-path identity, minimum and maximum key, record count, uncompressed and stored bytes, checksum, encoding version, and optional conservative Bloom filter. Compression must permit selective block reads; a decoder is bounded and cannot allocate from untrusted sizes without validation.

### Shard descriptor

A descriptor contains `shardId`, `shardKind`, `accessPath`, predicate or relation coverage, partition policy, key range or hash bucket, block index reference, data reference, record count, byte counts, checksum, dependencies, and optional exact or conservative term summaries. Paths are package-relative and validated against traversal. The descriptor contains data references, not import specifiers.

### Determinism and integrity

The same canonical input, schema, compiler version, and build configuration produce byte-identical dictionaries, blocks, shards, descriptors, and manifest hashes. Sorting is Unicode- and byte-order-defined. Deduplication uses explicit semantic keys and preserves all contributing provenance rather than retaining whichever duplicate appeared first.

Each shard and block is verified before use. A missing shard, checksum mismatch, incompatible encoding, incomplete dictionary, duplicate shard identity, or out-of-range reference invalidates the package. Compiled data is disposable and rebuilt from canonical records after corruption.

### Canonical-to-compiled equivalence

Acceptance executes sampled and adversarial queries against the canonical reference reader and compiled access paths. Results must agree on record identities, arguments, polarity, epistemic status, context, time, confidence policy, and provenance. Rule and event indexes additionally verify dependency and role completeness.

The test set includes absent keys, extreme key ranges, ambiguous aliases, duplicates with different provenance, overlays, cyclic relations, large postings, and boundary blocks. A mismatch is a compiler defect; it cannot be waived as approximate retrieval.

### Portable implementation

The repository implementation uses Node.js 22 ESM, JSONL canonical streams, and immutable JSON data segments without runtime packages. The logical envelope permits later CBOR sequences or binary blocks only after profiling demonstrates need and the same deterministic equivalence contract passes. Introducing a native or database dependency requires an explicit DS001 change.

## Decisions & Questions

### Question #1: Why do canonical records and compiled shards have separate roles?

Response: Canonical records define meaning and remain reviewable. Shards optimize access and can be rebuilt. Conflating them would let a physical partition, compression choice, or cache policy silently change semantics.

### Question #2: How is an oversized shard handled?

Response: The compiler refines the partition or block boundaries and rebuilds the physical package. It does not remove records. An older oversized package may use non-retained block loading when safe, but the manifest and profile must expose that cost.

## Conclusion

Streaming compilation converts complete canonical meaning into deterministic, inert, content-addressed access paths. Shards and blocks are replaceable physical optimizations whose correctness is established by exact accounting and equivalence tests.
