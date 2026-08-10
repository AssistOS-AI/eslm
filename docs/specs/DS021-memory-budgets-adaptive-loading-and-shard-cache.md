---
id: DS021
title: Memory Budgets, Adaptive Loading, and Shard Cache Policy
status: implemented
owner: runtime
summary: Defines measured eager loading, budget-triggered lazy shard access, bounded caches, CLI controls, and observable memory behavior for generated public knowledge bases.
---

# DS021 Memory Budgets, Adaptive Loading, and Shard Cache Policy

## Introduction

ESLM knowledge bases are compact on disk but expand substantially when parsed into JavaScript objects. The generated Open English WordNet model occupies about 24 MB on disk yet its recorded isolated eager import adds about 349 MB RSS. ATOMIC occupies about 33 MB on disk and adds about 284 MB RSS. Loading both eagerly is acceptable on a machine where roughly one gigabyte is available, and it gives the simplest and fastest query path. It is not acceptable to impose that working set when the caller explicitly gives a smaller memory target.

This specification therefore does not declare lazy loading universally superior. It defines a measured adaptive policy: use eager loading when no memory target exists or when selected modules fit comfortably; otherwise keep only query-relevant shards in bounded least-recently-used caches. Query answers and proofs must be equivalent across policies.

## Core Content

### User contract

`--memory-policy auto|eager|lazy` selects the strategy. `auto` is the default. Without `--memory-mb`, `auto` uses eager loading. With `--memory-mb N`, it reserves a runtime allowance and chooses eager providers only while their measured resident estimates fit; remaining public providers use bounded shard caches. `eager` forces complete imports and treats the memory target as informational. `lazy` forces shard access even when abundant memory exists, which is useful for constrained deployments and equivalence tests.

`--memory-mb` is a soft whole-process RSS target, not an operating-system limit. Node.js, native libraries, buffers, the base model, active query shards, and garbage-collection timing prevent an in-process component from promising an exact ceiling. ESLM records the requested budget, selected policy, provider strategies, cache targets, current resident estimates, cache hits, misses, evictions, and oversized-shard events. Hard containment belongs to process or container controls.

Interactive `/memory` prints the plan and live cache statistics. `/memory N`, `/memory auto`, `/memory eager`, and `/memory lazy` rebuild the public providers under the new policy without discarding explicit conversation context. `/model` includes the same compact memory plan. Structured responses disclose the effective policy in `model.memory`.

### Planning policy

The planner receives selected public KB IDs, the optional memory target, and the requested policy. It reserves 96 MiB for Node, the base model, session context, temporary results, and unmeasured overhead. Remaining capacity is compared with measured eager RSS estimates stored in the public KB catalog, not generated source bytes.

In `auto`, providers are considered in declared priority order. A provider becomes eager only if its complete estimate fits after the reserve and a 16 MiB minimum lazy-cache allowance for every remaining provider. Otherwise it becomes lazy. Residual capacity is divided among lazy providers. The target controls retained shard objects rather than temporary memory required to parse an active shard.

The plan is deterministic for the same selected modules, target, estimates, and policy. With current measurements, no target or 1024 MiB normally loads WordNet and ATOMIC eagerly; 512 MiB normally keeps WordNet eager and ATOMIC lazy; 256 MiB keeps both lazy. These examples may change when measured estimates are updated.

### Safe query-directed shard access

Generated manifests remain the canonical eager modules. Lazy providers read only allowlisted generated data envelopes beneath known model directories. WordNet lemmas select `0` or `a` through `z`; synset identifiers select declared numeric buckets. An ATOMIC exact event selects one of sixteen hexadecimal buckets using the compiler's stable hash. Dataset strings never become paths.

Each shard has the restricted form `export default Object.freeze(JSON_VALUE);`. The reader verifies that exact envelope and parses only the JSON payload. It does not evaluate source text. This is necessary because Node's ESM registry retains dynamically imported modules, whereas parsed shard values can become unreachable after cache eviction.

### Cache lifecycle and semantics

Each lazy provider owns a byte-accounted least-recently-used cache. Access promotes an entry. Insertion trims least-recently-used entries until the target is met. A single required shard may exceed its target: it is used for the active query, the event is recorded, and it is evicted afterward when possible. A resource error is explicit and never converted into a factual `UNKNOWN`.

WordNet definition, synonym, sense-count, and hypernym queries load lemma buckets plus only synset buckets reached by bounded proof search. ATOMIC exact lookup loads one hash bucket. Tolerant lexical fallback may scan all sixteen buckets sequentially while retaining a bounded set. This preserves matching semantics while trading latency for memory; profiling exposes the cost. A future event-token index requires measurement rather than speculative optimization.

Lazy public-provider queries are asynchronous. Batch, evaluation, benchmark, validation, and tests await them and process cases sequentially so concurrency cannot silently multiply the working set. The small graph core remains synchronous. Eager and lazy modes must match on status, values, reasoning method, and semantic provenance.

### CLI presentation

`--color auto|always|never` controls ANSI styling. `auto` colors only an interactive terminal. Machine JSON, JSONL, files, reports, traces, and profile data never contain terminal escapes. Interactive command output is prose: `/model` explains active knowledge and loading strategy; `/memory` explains budget and cache state; `/kbs` marks loaded, available, and fixture-only modules; `/trace` and `/profile` present readable summaries.

Interactive mode loads installed public KBs by default and excludes QUICK. QUICK is an authored fixture pack for tests and tutorials, not real source-derived knowledge; it remains explicitly loadable. `/load all` means all installed public KBs. `/load` and `/unload` accept canonical names, title/role words, glob patterns, and conservative approximate matches so users need not memorize IDs. Ambiguous matches are reported instead of guessed.

### Profiling and optimization gate

The layer records planned eager bytes, cache targets, loaded shard count, estimated retained bytes, peak bytes, hits, misses, evictions, loads, and oversized loads. Further structures such as binary indexes, memory mapping, workers, or predictive prefetch require profiles demonstrating a current bottleneck and equivalence benchmarks demonstrating benefit.

## Decisions & Questions

### Question #1: Why is eager loading still the default policy?

Response: Complete objects avoid file reads and cache misses, and the measured combined working set is acceptable on many development machines. ESLM should not pay lazy latency unless the user requests a lower target.

### Question #2: Why is the target soft?

Response: JavaScript cannot control native allocations, garbage collection, module retention, or other process state. Calling it a hard cap would be false. The plan controls retained public-KB data and exposes measurements.

### Question #3: Why parse generated modules instead of dynamically importing shards?

Response: Dynamic ESM imports remain cached for the process lifetime, so an application LRU cannot release them. Restricted generated JSON envelopes can actually be evicted without executing corpus-derived code.

### Question #4: Does lazy loading reduce reasoning capability?

Response: No. It changes residency and latency, not rules, proof depth, or semantics. Equivalence tests enforce this boundary.

## Conclusion

ESLM treats memory as a user-controlled execution concern rather than a reason to fragment every run. Full loading remains the fast default policy. An explicit target activates deterministic provider planning and bounded observable caches where necessary, while the same generated knowledge and response contract remain available.
