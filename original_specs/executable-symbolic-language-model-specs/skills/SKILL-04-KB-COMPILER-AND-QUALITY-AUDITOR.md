# Skill — KB Compiler and Quality Auditor

## Purpose

Use this skill to validate canonical KB records, compile scalable runtime artifacts, create shard metadata and certify a KB package for registration.

## Canonical validation

Verify deterministic identifiers, namespaces, dependencies, schema conformance, term declarations, rule safety, qualifier semantics, provenance completeness, temporal validity and context references.

Reject arbitrary executable code, undeclared operators, invalid variable bindings, missing source lineage and nondeterministic identifiers.

## Quality analysis

Measure duplicate assertions, conflicting claims, unresolved alignments, unsupported predicates, missing lexical forms, confidence distribution, provenance coverage and orphan terms. Distinguish source disagreement from an internal contradiction.

## Compilation

Build dense local dictionaries, lexical indexes, assertion access paths, event-role indexes, rule indexes, provenance segments and routing summaries. Partition segments into bounded shards and blocks. Add checksums, statistics and conservative Bloom filters.

Generate a manifest that allows registration without loading all facts. Include predicate coverage, term ranges, access paths, dependencies, sizes, checksums and compiler version.

## Equivalence testing

Run the same representative and adversarial queries against canonical and compiled forms. Run lazy loading and exhaustive loading and compare semantic results. Any false-negative routing or qualifier loss is a critical failure.

## Publication

Publish canonical records, compiled artifacts, manifest, quality report and build provenance atomically. Do not mutate an existing published version. Updates become overlays or new versions.
