---
id: DS006
title: KB Package Identity, Registration, Dependencies, and Overlays
status: in-progress
owner: storage
summary: Defines immutable package identity, manifests, registration, dependency and namespace validation, overlays, compaction, and the boundary to physical shards, routing, and caches.
---

# DS006 KB Package Identity, Registration, Dependencies, and Overlays

## Introduction

A compiled knowledge base is an immutable, versioned data product whose logical meaning comes from DS005 canonical records. This specification owns package identity, manifests, registration, dependencies, and overlays. DS019 owns streaming compilation and shard formats, DS020 owns catalog discovery and query routing, and DS021 owns runtime memory and cache policy.

## Core Content

### Package identity

A package is identified by `kbId`, semantic `kbVersion`, `schemaVersion`, canonical namespace, canonical-record digest, compiler identity, compiler-configuration digest, and complete shard inventory. Two packages with the same user-facing alias but different immutable identities remain distinct. Registration resolves aliases before loading and never mutates a published version.

The package contains inert data only. JavaScript, shell fragments, corpus-selected imports, callbacks, and arbitrary expressions are prohibited. A declarative rule or policy names an interpreter already registered in trusted `src`; it cannot provide method code.

### Manifest contract

A manifest is small enough to validate without opening fact shards. At minimum it records:

```json
{
  "manifestType": "knowledgeBasePackage",
  "kbId": "example.technical-manual",
  "kbVersion": "1.2.0",
  "schemaVersion": "1",
  "namespace": "example.manual",
  "languages": ["en"],
  "domains": ["technical-documentation"],
  "dependencies": [
    {"kbId": "common.core-ontology", "versionRange": "^1.0.0"}
  ],
  "canonicalSource": {
    "digest": "sha256:...",
    "recordCount": 120000
  },
  "compiler": {
    "version": "compiler-version",
    "configurationDigest": "sha256:..."
  },
  "catalogSummaryRef": "catalog-summary.json",
  "shardDirectoryRef": "shards.jsonl",
  "trust": {
    "origin": "source-manifest-id",
    "validationLevel": "schema-and-equivalence-validated"
  }
}
```

The real schema may add signatures, source licenses, capabilities, quality bands, build receipts, and compatibility fields. It cannot omit the immutable identities needed to prove that a shard, index, source, and compiler belong together. Package-relative references are normalized and confined to the package root.

### Registration

Registration validates manifest shape, identity uniqueness, schema compatibility, namespace ownership, dependency resolution, declared file inventory, checksums, trust metadata, and catalog summary. It adds discovery metadata to the local catalog without loading complete fact or rule segments. A checksum failure, missing dependency, incompatible schema, namespace collision, path traversal, undeclared file, or executable payload rejects registration.

Unregistration removes the catalog entry and active alias. It does not delete canonical records, compiled files, frozen sources, or another version. Deletion is a separate explicit operation with an exact target and its own authority.

### Dependencies and imports

A dependency states which external namespace or semantic definitions are required to interpret the package. Version ranges are resolved to exact immutable versions in the registration receipt. A dependency does not imply that every dependency shard is loaded eagerly.

Every referenced term is declared locally or imported through a resolved dependency. Cross-KB equivalence, subsumption, and close-match relations remain explicit alignment records; matching labels do not create an import or identity.

### Package roles

The catalog may contain authored smoke packages, public lexical or world-knowledge packages, document packages, session-independent domain packages, and source-local benchmark policy packages. Catalog membership means the package passed its registration contract. It does not mean the package is a benchmark, contains complete world knowledge, is trusted for every context, or supports an official evaluation score.

Policy packages may declare a relation algebra, property domain, induction threshold, source vocabulary, or feature policy when a trusted generic method interprets that data. They may not store test answers, benchmark rows, or executable source-specific solvers.

### Immutable overlays

Updates normally produce an overlay package. An overlay declares its baseline dependency and contains additions, retractions, supersession records, qualifications, or corrected alignments. Query context and precedence rules determine visibility; load order does not.

Compaction deterministically merges one baseline and an ordered overlay set into a new immutable baseline. It preserves provenance and retraction history in the new canonical source or a linked audit package. Compaction never mutates the older version and must pass canonical-to-compiled equivalence again.

### Package validation and reproducibility

Validation checks manifest and shard digests, exact file inventory, deterministic ordering, record and dictionary references, dependency identities, namespace constraints, and the equivalence receipts required by DS019. Rebuilding from the same canonical input, compiler version, and configuration must reproduce the package bytes and hashes.

A compiled package is a replaceable optimization. If it disagrees with canonical records, the package is rejected and rebuilt; the compiler output never overrides canonical meaning.

### Separation from source and cache state

The source archive governed by DS016, the compiled package governed here, the in-process block cache governed by DS021, and the Language Agent cache governed by DS013 are different artifacts. Source bytes may exist before compilation. A package may be registered while none of its fact blocks are resident. A runtime cache hit does not change package identity or benchmark evidence.

## Decisions & Questions

### Question #1: Why does registration not load the complete KB?

Response: Registration establishes identity, compatibility, dependencies, trust, and exact discovery metadata. DS020 query routing and DS021 cache policy decide which immutable blocks an actual task needs.

### Question #2: Why do policy packages and public knowledge share a typed catalog?

Response: Both are declarative packages interpreted by generic methods, but their manifests preserve different origin, trust, licensing, and intended use. Registration never collapses them into one source or implies that policy data is independently sourced world knowledge.

## Conclusion

The package contract makes knowledge immutable, attributable, dependency-safe, and independently registrable. Physical compilation, query routing, and cache residence can evolve behind this identity without changing canonical semantics.
