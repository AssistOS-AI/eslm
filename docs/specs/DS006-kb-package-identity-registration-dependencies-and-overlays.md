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

The package contains inert data only. JavaScript, shell fragments, corpus-selected imports, callbacks, and arbitrary
expressions are prohibited. A declarative rule or policy may be projected for execution only when its semantics names
an interpreter already registered in trusted `src`; otherwise it remains validated inert canonical data or is rejected
by the active execution profile. It cannot provide method code. Schema acceptance alone never proves that an
interpreter exists; DS005 lists the current projection boundary.

### Manifest contract

A manifest is small enough to validate without opening fact shards. At minimum it records:

```json
{
  "manifestType": "knowledgeBasePackage",
  "format": "eslm-kb-package-v1",
  "schemaVersion": "1",
  "kbId": "example-technical-manual",
  "kbVersion": "1.2.0",
  "namespace": "example.manual",
  "languages": ["en"],
  "domains": ["technical-documentation"],
  "dependencies": [
    {"kbId": "common.core-ontology", "versionRange": "^1.0.0"}
  ],
  "canonicalSource": {
    "checksum": "sha256:...",
    "recordCount": 120000
  },
  "compiler": {
    "version": "compiler-version",
    "configurationDigest": "sha256:..."
  },
  "counts": {
    "provenance": 1000,
    "term": 19000,
    "lexeme": 40000,
    "assertion": 60000
  },
  "capabilities": ["document-fact-retrieval"],
  "trustLevel": "schema-and-equivalence-validated",
  "benchmarkEligible": false,
  "license": "declared-source-license",
  "trust": {
    "origin": "source-manifest-id",
    "validationLevel": "schema-and-equivalence-validated"
  },
  "shardDirectoryRef": "shards.json"
}
```

Generic package version 1 uses an allowlisted manifest shape. Unknown fields require a schema change instead of being
silently accepted. A later schema may add signatures, catalog summaries, quality bands, build receipts, or compatibility
fields, but it cannot omit the immutable identities needed to prove that a shard, source, and compiler belong together.
Package-relative references are normalized and confined to the package root.

### Registration

Registration validates manifest shape, identity uniqueness, schema compatibility, namespace ownership, dependency
resolution, exact file inventory, checksums, trust metadata, shard schemas, record counts, namespaces, and the complete
cross-record reference graph. A checksum failure, missing dependency or record reference, incompatible schema,
namespace collision, path traversal, undeclared file, symbolic link, structural-budget exhaustion, or executable
payload rejects registration.

The current generic v1 gate opens one complete JSON shard at a time, validates it, records only bounded identity and
unique-reference indexes, and releases that shard before continuing. Its receipt states the maximum shard and package
bytes, records, retained reference entries and UTF-8 bytes, per-record UTF-8 string bytes, JSON depth, nodes, array
entries, and object keys; it also records observed structural maxima and reconciled reference counts. This is sequential validation without
permanent fact residency, not a claim that JSON parsing is streaming inside one shard. DS019 still requires finer
blocks or a streaming decoder for packages that exceed the declared shard bound.

Unregistration removes the catalog entry and active alias. It does not delete canonical records, compiled files, frozen sources, or another version. Deletion is a separate explicit operation with an exact target and its own authority.

### Dependencies and imports

A dependency states which external namespace or semantic definitions are required to interpret the package. Version ranges are resolved to exact immutable versions in the registration receipt. A dependency does not imply that every dependency shard is loaded eagerly.

Every referenced term is declared locally or imported through a resolved dependency. Cross-KB equivalence, subsumption, and close-match relations remain explicit alignment records; matching labels do not create an import or identity.

The current generic v1 reference audit proves local provenance, term, predicate, context, event, rule, and retraction
references. Although registration resolves manifest dependencies to exact immutable identities, it does not yet load a
dependency term directory for cross-package reference validation. A generic v1 package that directly references a term
declared only by another package is therefore rejected until that import audit exists; a resolved dependency alone is
not treated as proof that an arbitrary identifier exists.

### Package roles

The catalog may contain authored smoke packages, public lexical or world-knowledge packages, document packages, session-independent domain packages, and source-local benchmark policy packages. Catalog membership means the package passed its registration contract. It does not mean the package is a benchmark, contains complete world knowledge, is trusted for every context, or supports an official evaluation score.

Policy packages may declare a relation algebra, property domain, induction threshold, source vocabulary, or feature policy when a trusted generic method interprets that data. They may not store test answers, benchmark rows, or executable source-specific solvers.

### Immutable overlays

Updates normally produce an overlay package. An overlay declares its baseline dependency and contains additions, retractions, supersession records, qualifications, or corrected alignments. Query context and precedence rules determine visibility; load order does not.

Compaction deterministically merges one baseline and an ordered overlay set into a new immutable baseline. It preserves provenance and retraction history in the new canonical source or a linked audit package. Compaction never mutates the older version and must pass canonical-to-compiled equivalence again.

### Package validation and reproducibility

Validation checks manifest and shard digests, the exact root and segment inventory, deterministic ordering, record and
dictionary references, dependency identities, namespace constraints, and the equivalence receipts required by DS019.
The generic v1 package root contains exactly the manifest, shard directory, and real `segments/` directory; the segment
directory contains exactly the declared regular JSON files. Rebuilding from the same canonical input, compiler version,
and configuration must reproduce the package bytes and hashes.

A compiled package is a replaceable optimization. If it disagrees with canonical records, the package is rejected and rebuilt; the compiler output never overrides canonical meaning.

### Separation from source and cache state

The source archive governed by DS016, the compiled package governed here, the in-process block cache governed by DS021, and the Language Agent cache governed by DS013 are different artifacts. Source bytes may exist before compilation. A package may be registered while none of its fact blocks are resident. A runtime cache hit does not change package identity or benchmark evidence.

Result accounting preserves the same separation. `selectedKbVersions` names the immutable package set available to the
task. `consultedKbVersions` names sources whose indexes or policies were queried. `usedKbVersions` names only packages
whose records or declarative policy contributed to the primary result's witness. A DS009 grounding entry names its own
source version but does not make that package an answer contributor. When semantically duplicate records from several
packages are merged for execution, the projected fact retains every contributing identity and provenance reference;
deduplication must not erase source lineage.

### Deterministic package composition

Package selection is a set operation at the composition boundary. Before merging, the current generic runtime orders
immutable package projections by their manifest identity. It then preserves each package's canonical record order.
Consequently, permuting the same selected package set cannot change the merged model identifier, entity, fact, or rule
arrays, policy maps, indexes, query value order, or provenance order. Stable output ordering is part of the observable
contract, not a cosmetic presentation step.

Deduplication uses the complete executable semantic identity. For facts this includes subject, predicate, the
object-versus-scalar distinction, polarity, epistemic status, confidence, validity, and context. For executable rules it
includes premises, conclusion, semantics, context, priority, validity, and abductive authorization. Records that differ
on one of those fields remain separate even when their ground triple or Horn shape is otherwise equal. Records with an
equal semantic identity merge sorted package identities and provenance references while retaining one deterministic
representative record identity. Policy conflicts are compared by canonical field order and fail visibly; insertion
order cannot choose a policy.

This canonicalization applies to immutable package composition, not to session observation semantics. Session facts,
rules, and history are appended after the immutable model in accepted episode order. A method such as configured
induction may use that order only when its declared policy explicitly selects `latest-support` or `latest-member`.

## Decisions & Questions

### Question #1: Why does registration inspect every shard without retaining the complete KB?

Response: Registration must establish that the compiled package is internally valid before catalog membership grants it
runtime visibility. The current generic gate therefore reads shards sequentially for integrity, schema, structure, and
reference checks, while retaining only bounded identity and unique-reference indexes. It does not keep all fact arrays
resident. DS020 query routing and DS021 cache policy still decide which validated immutable blocks an actual task uses.

### Question #2: Why do policy packages and public knowledge share a typed catalog?

Response: Both are declarative packages interpreted by generic methods, but their manifests preserve different origin, trust, licensing, and intended use. Registration never collapses them into one source or implies that policy data is independently sourced world knowledge.

### Question #3: Why are selected, consulted, and used KB versions separate?

Response: Availability, search, and contribution are different facts. Collapsing them would falsely claim that every
loaded package supported an answer and would make failure-time grounding look like proof. Separate fields preserve
reproducible package scope without overstating provenance.

### Question #4: Why are qualifiers part of the merge key if Stage A does not interpret all of them?

Response: Deduplicating two records is a claim that their executable semantic inputs are interchangeable. Context,
validity, confidence, and epistemic status can change that claim as later interpreters become available, and erasing
them now would destroy information needed for those interpreters and for honest review. Retaining the distinctions is
safe today; silently treating them as identical would make future context or trust behavior depend on an irreversible
load-time loss.

### Question #5: Why is package-root inventory closed instead of merely path-confined?

Response: Path confinement prevents a declared reference from escaping its package, but it does not detect an
undeclared executable, stale shard, or symbolic link beside valid files. A closed root and segment inventory makes the
audited bytes equal the usable package bytes. New physical artifacts require a versioned manifest and validator rather
than acquiring authority by co-location.

## Conclusion

The package contract makes knowledge immutable, attributable, dependency-safe, and independently registrable. Physical compilation, query routing, and cache residence can evolve behind this identity without changing canonical semantics.
