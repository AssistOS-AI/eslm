# Selectable knowledge-module synthesis

## Purpose and boundary

A knowledge module is an independently selectable executable graph, not an unnamed extension of the promoted benchmark model. Accept only the domain source named by the assignment. Record whether the source is public evidence, a reviewed generated educational source, or another evidence regime. A generated educational KB is never benchmark training evidence and must declare `benchmarkEligible: false`.

Keep source records under a domain-specific path and generated code under a matching domain directory. The module must have its own manifest, entity table, facts, rules, language declarations, reasoning policy, and indexes. It must import without the base model and pass the standard candidate invariants independently.

## Selective loading

Design the module so a caller can load one domain without importing unrelated facts. Give every module a stable ID and version. Declare dependencies only when the module cannot execute coherently alone; do not create a dependency merely to obtain optional extra deductions.

When IDs overlap across modules, verify that entity kind and intended identity agree. Deduplicate a fact only when subject, predicate, and object/value have identical semantics. A lexical match is insufficient. Predicate units, temporal scope, modality, polarity, and qualifications must also agree or remain separate.

## Rule composition

Measure closure twice: with the module alone and in each supported dependency bundle. Shared predicates permit useful cross-module deductions, but they may also create unintended consequences. Record new rule activations, maximum depth, provenance across module boundaries, and counterexamples. Never hide cross-module effects inside aggregate fact counts.

Avoid unsafe universal rules when the source contains familiar exceptions and the runtime lacks explicit negation or defeasible priorities. Prefer direct positive capability facts over “all birds fly” until exception semantics exist. Return `UNKNOWN` rather than manufacturing a negative fact.

## Required report

For each module report:

1. source path, digest, evidence regime, version, and authoring method;
2. entity, direct-fact, rule, construction, and standalone closure counts;
3. shared identifiers and deduplicated facts in supported bundles;
4. additional consequences produced only by cross-module composition;
5. tested positive, unknown, and unsupported examples;
6. benchmark eligibility and the reason for that classification;
7. generation and validation commands.
