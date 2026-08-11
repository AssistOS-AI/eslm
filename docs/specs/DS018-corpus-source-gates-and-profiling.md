---
id: DS018
title: Corpus Source Gates, Scope Mapping, and Profiling
status: in-progress
owner: corpus-engineering
summary: Defines the mandatory frozen-source, stratified-probe, semantic-scope, anomaly, budget, and profiling evidence required before a large public corpus enters compilation.
---

# DS018 Corpus Source Gates, Scope Mapping, and Profiling

## Introduction

Large knowledge sources can conceal schema variants, licensing mixtures, pathological records, and physical plans that appear correct on a prefix but fail at scale. This specification defines the evidence gate that precedes exhaustive compilation. It never authorizes rejecting valid data because the source is large.

## Core Content

### Gate applicability

Every new public knowledge source requires this gate. A source larger than 50 MB compressed, expected to exceed 100,000 records, or containing several semantic families must complete the gate before exhaustive compilation. Smaller sources still require a manifest and schema validation, but their profiling may use proportionate evidence.

### Frozen source

The gate consumes the complete DS016 source manifest rather than restating its identity, authority, licensing, and cache
fields. The probe runs against those frozen local bytes and records only gate-specific sampling, semantic mapping,
profiling, and approval evidence.

### Deterministic stratified probe

Sampling uses a stable hash inside meaningful strata rather than the first records in a file. Candidate strata include record kind, relation, language, upstream contributor, license, weight or rank, datatype, qualifiers, temporal fields, spatial fields, text-length bands, parser outcome, malformed shape, ambiguity, cycle participation, and oversized values. The sampling seed, selection algorithm, source counts, stratum counts, and selected membership digest are recorded.

Every observed stratum receives one of four outcomes: mapped into a declared canonical record, preserved for a later semantic profile, quarantined as malformed with evidence, or excluded by an explicit license or quality policy. An unsupported but schema-valid stratum is not called rejected data.

### Source-to-record semantic mapping

For every mapped family, the design names source fields, canonical fields, identity rules, argument order, polarity, modality, confidence interpretation, time semantics, provenance, deduplication key, and inference policy. A source relation is not compiled until its semantics are reviewed. Treating every edge as a strict transitive fact is prohibited when source relations have different meanings.

The mapping also states which information is intentionally not projected and how the complete source inventory records that gap. A later compiler may widen the projection from the same bytes without pretending the earlier package contained those records.

### Architecture and resource plan

Before compilation, the gate specifies streaming boundaries, external partition keys, dictionaries, canonical output, shard access paths, expected fan-out, cache behavior, query shapes, and eager-versus-lazy equivalence tests. Budgets cover peak memory, retained cache bytes, temporary disk, output size, throughput, cold query latency, deep expansion, and anomaly processing.

A failed physical budget requires a different streaming, partitioning, spilling, index, or shard plan. It never authorizes truncating the source or skipping valid rows. A runtime query may return `RESOURCE_LIMIT`; the source inventory and compiler remain complete for the declared semantic projection.

### End-to-end profile

Profiling measures source read, decompression, parsing, validation, normalization, semantic mapping, deduplication, dictionary construction, anomaly handling, partition spill, sorting, shard emission, index construction, manifest hashing, package validation, registration, cold load, representative positive query, negative query, deep proof, ambiguity, overlay, and cache eviction. Each phase reports elapsed time, input and output counts, bytes, and peak application memory where measurable.

The gate fails when memory tracks the complete decoded source without a declared external partition, throughput collapses without diagnosis, a representative query loads unrelated semantic domains, a session assertion triggers whole-KB closure, alias ambiguity is discarded, source accounting does not balance, or canonical and compiled queries differ.

### Gate receipt

The committed receipt contains source identity, probe algorithm, strata and mapping outcomes, compiler profile, physical plan, measured budgets, anomalies, accepted semantic projection, coverage gaps, and approval state. It contains no protected source rows unless redistribution is authorized. Approval means exhaustive compilation may begin; it does not mean the resulting KB is correct, benchmark-eligible, or complete beyond the declared projection.

## Decisions & Questions

### Question #1: Why do large corpora require source gates before full compilation?

Response: Prefix experiments miss rare schemas and physical failure modes. A deterministic stratified probe and end-to-end profile make semantic omissions, anomalies, and scale costs explicit before an expensive build becomes architectural precedent.

### Question #2: May source size reject an otherwise valid corpus?

Response: No. It can reject a proposed physical plan. The next plan must stream, partition, spill, shard, or narrow an explicitly semantic projection while retaining the complete frozen source and accounting for every valid row.

## Conclusion

The corpus gate turns a large external archive into a measured engineering input. It freezes identity, maps meaning, exposes anomalies, and proves that the proposed compiler and query plan can scale without confusing physical limits with semantic exclusion.
