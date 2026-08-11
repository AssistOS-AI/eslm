# Appendix B — Shard Manifest and Routing Schema

## 1. Package manifest

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

## 2. Shard descriptor

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

## 3. Catalog summary

The catalog summary contains predicate coverage, rule-head coverage, root concept coverage, languages, domains, lexical FST locations, stable-term directory partitions, source-quality levels and estimated query costs.

Approximate fingerprints may be included for ranking. They cannot be used as the sole basis for exclusion.

## 4. Exact term directory

A partitioned term directory maps stable term identifiers to dictionary shards, assertion-index shards, event-role shards and rule shards that may contain relevant records.

The directory may return false positives if compressed conservatively. It MUST NOT return false negatives for a registered package version. Directory construction is checked against the compiled fact inventory.

## 5. Lexical routing

Lexical routing is separate from fact routing. A language-specific FST or equivalent compact index maps normalized surface forms to candidate stable term identifiers and frame identifiers. The runtime loads detailed lexeme records only for candidate ranges.

Unknown words are permitted as local symbolic atoms. The lexical router therefore distinguishes no known sense from syntactically unusable input.

## 6. Query routing contract

A query access request contains a predicate or predicate family when known, bound arguments, requested qualifiers, context policy, expected result cardinality and current resource budget.

The router returns an ordered set of shard candidates with a reason for selection. Exact manifest matches, term-directory matches and rule dependencies are recorded separately from approximate ranking signals.

## 7. Expansion contract

During multi-hop reasoning, newly derived terms and predicates generate additional access requests. Expansion is incremental. The loader does not preemptively load all neighbors of every candidate term.

The planner may widen the search when the first candidate set produces no proof, but widening remains bounded and traceable.

## 8. Cache identity

A cache key includes KB ID, KB version, shard ID, block ID and checksum. Mutable aliases are resolved before cache lookup. This prevents a block from one version being used under another version.

## 9. Exhaustive-equivalence test

For a test query, exhaustive mode opens every shard that the exact directory identifies as potentially relevant. Lazy mode uses normal ranking and incremental expansion. Both modes must return the same semantic records within the same context and budget assumptions.

A missing record caused by routing is a critical correctness defect, not an acceptable approximate-retrieval loss.
