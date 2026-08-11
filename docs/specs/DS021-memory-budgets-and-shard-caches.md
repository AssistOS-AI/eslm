---
id: DS021
title: Memory Budgets and Versioned Shard Caches
status: in-progress
owner: runtime
summary: Defines memory policy as a physical execution input, byte-accounted versioned caches, oversize-block behavior, observable resource refusal, and separation of source, runtime, and Language Agent caches.
---

# DS021 Memory Budgets and Versioned Shard Caches

## Introduction

Memory limits determine how compiled knowledge is loaded and retained. They do not determine which source records exist or which valid examples may be learned. This specification separates logical completeness from physical residence and makes every cache effect observable.

## Core Content

### Memory policy

A runtime memory policy declares a soft target for retained KB data, pinned structures, maximum active block size, proof-frontier or search limits, and cache strategy. The application can byte-account dictionaries, indexes, decoded blocks, provider state, and query-local structures. It cannot promise exact whole-process resident memory because the Node.js runtime and garbage collector retain their own allocations. A hard process limit belongs to an operating-system or container boundary.

Changing a soft target may change I/O, eviction frequency, and latency. It must not change semantic results when the same package set, query frontier, and execution bounds can complete. If the plan cannot complete, it returns `RESOURCE_LIMIT` with the exact exhausted resource and remaining frontier.

### Cache identity

A runtime cache key includes KB ID, KB version, shard ID, block ID, content checksum, decoder version, and relevant projection options. Mutable aliases resolve to immutable versions before lookup. No block from one version may be reused under another version merely because its path or local identifier matches.

Entries record decoded bytes, retained-byte estimate, last access, pin state, loading cost, and validation state. Cache content is a dispensable copy; manifest and shard checksums remain authoritative.

### Admission, retention, and eviction

The default policy is byte-accounted least-recently-used or cost-aware retention. Core language dictionaries, active session overlays, and explicitly pinned ontologies may be non-evictable within their declared budget. Large domain blocks remain evictable. Query-local joins and proof structures are released after the task unless a visible session policy retains them.

Before admission, the loader estimates the block and dependency cost. It evicts eligible entries until the target can admit the block. Hits, misses, admissions, bypasses, evictions, pinned bytes, retained bytes, active bytes, and load time are recorded in the execution profile.

### Oversized active blocks

A block larger than the retention target may be decoded and used once without cache admission when its bounded decoder and the host environment can do so safely. Otherwise the query returns `RESOURCE_LIMIT` and the package profile records the need for a finer future shard. The block and its source records remain valid. The compiler is not permitted to delete facts to make the cache green.

### Query equivalence

Cold-cache, warm-cache, low-retention, and exhaustive-reference executions over the same semantic and search bounds must agree on status, values, proof, and provenance. Cache state may appear in resource diagnostics but cannot select an answer, provider, or interpretation.

A cache-related false negative is a critical defect. Eviction during a multi-hop proof may cause a block to be reloaded; it may not cause the corresponding premise to disappear from the logical context.

### Separate cache domains

Three domains remain operationally distinct. Immutable source archives and extracted datasets live under ignored training source caches and are addressed by frozen source digests. Runtime KB caches hold validated decoded package blocks in process and are controlled by the memory policy. Language Agent normalization caches hold untrusted adapter proposals under DS013 and are keyed by input, model, prompt, protocol, and validator identity.

A hit in one domain says nothing about another. Source cache presence does not mean a KB is compiled. A runtime block hit does not mean a benchmark was evaluated. A Language Agent cache hit remains externally assisted language evidence and is revalidated before reparse.

### Source and training completeness

DS016 owns frozen-source retention, DS018 owns semantic-scope accounting, DS019 owns complete compilation of the
declared projection, and DS017 owns evaluated pool membership. Runtime memory policy cannot alter any of them. It may
change residence and scheduling only; every case in the declared scope remains in the scorer even when execution
returns `RESOURCE_LIMIT`.

### Operator observability

Structured results and profiling expose the requested policy, selected packages, shard and block loads, bytes, hits, misses, evictions, oversize bypasses, pinned data, expansion count, search limits, and any refusal. Interactive `/memory` explains current settings and recent use. Human output may condense these fields, but machine JSON remains authoritative.

## Decisions & Questions

### Question #1: May a cache miss justify `UNKNOWN`?

Response: No. A miss triggers loading or a visible resource refusal. `UNKNOWN` is valid only after the relevant exact search scope has been exhausted under the declared logic; it cannot conceal an unvisited shard.

### Question #2: May a memory target reduce a benchmark denominator?

Response: No. Every case in the declared scope remains evaluated. Cases that exceed an execution budget count under the benchmark's scorer and are reported as `RESOURCE_LIMIT`; they are not removed from data or denominator.

## Conclusion

Memory policy controls residency, not knowledge. Versioned, byte-accounted caches make large KB execution practical while preserving exact source inventory, routing correctness, observable resource limits, and deterministic semantic results.
