---
id: DS021
title: Memory Budgets and Versioned Shard Caches
status: in-progress
owner: runtime
summary: Defines memory policy and its separation from work policy, byte-accounted versioned caches, oversize-block behavior, resource refusal, and distinct source/runtime/agent caches.
---

# DS021 Memory Budgets and Versioned Shard Caches

## Introduction

Memory limits determine how compiled knowledge is loaded and retained. They do not determine which source records exist or which valid examples may be learned. This specification separates logical completeness from physical residence and makes every cache effect observable.

## Core Content

### Memory policy

A runtime memory policy declares a soft target for retained KB data, pinned structures, maximum active block size, proof-frontier or search limits, and cache strategy. The application can byte-account dictionaries, indexes, decoded blocks, provider state, and query-local structures. It cannot promise exact whole-process resident memory because the Node.js runtime and garbage collector retain their own allocations. A hard process limit belongs to an operating-system or container boundary.

Changing a soft target may change I/O, eviction frequency, and latency. It must not change semantic results when the same package set, query frontier, and execution bounds can complete. If the plan cannot complete, it returns `RESOURCE_LIMIT` with the exact exhausted resource and remaining frontier.

Memory policy and DS022 work policy are orthogonal. `eslm-memory-plan-v1` controls provider residence and advisory byte
targets. `eslm-work-policy-v1` selects exact finite counts for heuristic candidates and reparses, Horn closure,
provider search, and grounding retrieval. Every result exposes both applicable snapshots. Changing either policy may
change latency, I/O, or whether a finite frontier completes; neither may change logic, trust, tie-breaking, or the
semantic result once the same frontier completes.

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

The target structured result and profiler expose the requested memory and work policies, selected packages, shard and
block loads, bytes, hits, misses, evictions, oversize bypasses, pinned data, expansion count, search limits, and any
refusal. Interactive `/memory` explains residence settings and recent use; `/work` displays the exact active
heuristic, Horn, provider, and grounding bounds. Human output may condense these fields, but machine JSON remains
authoritative.

Every direct `EslmEngine` text and typed-task result exposes an `eslm-memory-plan-v1` snapshot. Its core-only snapshot
has `requestedPolicy: eager`, `effectivePolicy: eager`, `softTarget: false`, `reserveMiB: 0`, and `providers: []`.
Those fields mean that the already constructed core model is resident and has no provider retention target; the empty
provider array is not a zero-byte claim. The CLI runtime replaces that route-local view with its configured provider
plan, including the requested and effective policy, reserve, soft-target status, and bounded provider summaries. This
replacement also occurs when the CLI selected no public provider: the current automatic plan then has an empty
provider list and the CLI's fixed 96 MiB planning reserve, while a library caller using `EslmEngine` directly sees the
zero-reserve core snapshot.

The result-contract validator checks the snapshot format, policies, numeric target and reserve, provider identities,
and provider modes whenever memory metadata is present. `--profile` adds the profiler fields currently implemented by
the engine and providers. Neither snapshot promises the complete per-query block ledger, loaded-shard list,
pin/eviction history, or expansion frontier described above. Those omissions are part of the partial boundary below,
not permission to infer zero bytes or no loads.

### Failure-grounding budget

Failure-time grounding is optional work with its own bounded request. A primary `RESOURCE_LIMIT` result does not
automatically launch more retrieval: doing so would hide the exhausted resource and could amplify an adversarial
query. A product that requires grounding after primary exhaustion reserves a separate time, byte, lookup, posting, and
entry budget before execution and reports both budgets independently.

The four DS022 profiles provide exact grounding term, source, lookup, value, candidate, returned-entry, and output-byte
limits for eligible non-resource failures. They do not by themselves constitute a reservation after a primary
`RESOURCE_LIMIT`; that exceptional route still requires an independently declared remaining budget.

For other inability statuses, grounding still obeys provider-local shard caches and exact lookup limits. A source that
cannot complete returns a search receipt with truncation or provider failure; the bundle reports
`SEARCH_INCOMPLETE` when no record was returned and never translates a cache miss into complete absence. Grounding
latency and bytes belong in profiling, not in deterministic semantic values, sorting keys, or answer text.

### Present implementation boundary

The present public-provider cache is byte-estimated and LRU-like, and `--memory-mb` is an advisory application target
with a fixed reserve. The runtime also exposes implemented `quick`, `balanced`, `deep`, and `exhaustive-bounded` work
snapshots, with `balanced` as the default, for exact heuristic, Horn, provider, and grounding counts. Neither policy is
a hard whole-process RSS limit. Published probes must record measured peak RSS and elapsed time when making resource
claims, and costly benchmark families should execute in isolated processes under a real OS or container limit when a
hard cap is required. The broader per-query block accounting and reserved grounding budget described above remain only
partially implemented.

## Decisions & Questions

### Question #1: May a cache miss justify `UNKNOWN`?

Response: No. A miss triggers loading or a visible resource refusal. `UNKNOWN` is valid only after the relevant exact search scope has been exhausted under the declared logic; it cannot conceal an unvisited shard.

### Question #2: May a memory target reduce a benchmark denominator?

Response: No. Every case in the declared scope remains evaluated. Cases that exceed an execution budget count under the benchmark's scorer and are reported as `RESOURCE_LIMIT`; they are not removed from data or denominator.

### Question #3: Why does grounding not run automatically after RESOURCE_LIMIT?

Response: The primary execution has already consumed its declared authority. Starting unreserved retrieval would make
the limit misleading and could worsen overload. Grounding is allowed only when a separate predeclared budget remains.

### Question #4: Why does the direct-core snapshot list no providers?

Response: `providers` describes independently planned public-provider stores and their caches. The core model is
already materialized before a direct task begins, so it is represented by the eager effective policy rather than by a
fictional provider entry. The profiler, not this policy snapshot, is responsible for measured process memory.

### Question #5: Why are `/memory` and `/work` separate controls?

Response: Residence policy answers how validated KB bytes are retained; work policy answers how many bounded
interpretation, inference, provider, and grounding operations may be attempted. Conflating them would make an advisory
cache target appear to authorize more reasoning or make a larger reasoning profile look like a hard RSS guarantee.

## Conclusion

Memory policy controls residency, not knowledge. Versioned, byte-accounted caches make large KB execution practical while preserving exact source inventory, routing correctness, observable resource limits, and deterministic semantic results.
