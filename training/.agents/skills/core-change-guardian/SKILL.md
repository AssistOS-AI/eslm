---
name: core-change-guardian
description: Review a proposed change to reusable ESLM code and require generic semantics, cross-example evidence, abstract tests, security checks, and KB migration safety before acceptance.
---

# Core Change Guardian

## Trigger and decision boundary

Use this skill whenever document ingestion or benchmark learning proposes a change to trusted reusable code in `src`. Begin with the rename test: would the mechanism remain useful if every domain entity, noun, verb, relation, label, and benchmark name changed? If not, reject the core proposal and represent it as KB knowledge or leave it unsupported.

Require multiple independent examples with one structural cause. A single question, source sentence, or score delta is insufficient. Require evidence that the existing declarative schemas and registered operators cannot express the behavior without duplication or semantic distortion.

## Semantic proposal

The proposal must state input and output semantic types, preconditions, effects, invariants, scope, uncertainty semantics, proof or witness behavior, resource bounds, failure statuses, interaction with every relevant operator, capability descriptor, and migration impact on existing KB packages. It must distinguish parser, semantic composition, planner, method, routing, cache, and realization responsibilities.

Reject a proposal that embeds domain vocabulary, benchmark IDs, dataset IDs, split names, source row numbers, record IDs, question hashes, answer strings, expected labels, example-specific entity or relation constants, ambient authority, silent fallback, closed-world assumptions, hidden time or world scope, or an unbounded search. Inspect every new conditional and dispatch table. Core branching may use only declared semantic types, relation metadata, task operations, capability preconditions, and validated policy fields. Source vocabulary, thresholds, answer domains, and conventions belong in provenance-bearing KB records or adapter metadata.

The rename test is not satisfied by changing only person names. The proposal must replace entity identifiers, predicate and relation names, property values, surface vocabulary, source ordering, and irrelevant distractors while preserving the typed structure. It must also include a meaning-changing control using similar words under a different relation structure. Record a forbidden-dispatch audit confirming that no benchmark, row, hash, answer, or example constant remains in the proposed core path.

## Verification

Require focused unit tests, nonce and fully renamed entity/predicate/value examples, reordered examples, meaning-preserving metamorphic tests, meaning-changing contrasts, fresh benchmark samples, all affected regressions, a forbidden-dispatch static audit, security checks, deterministic replay, and canonical-versus-compiled or exhaustive-versus-lazy equivalence when relevant.

Language changes must increase direct-symbolic coverage on fresh examples while preserving protected operators and prior Semantic IR. Reasoning changes must validate proof or witness semantics. Routing changes must compare against exhaustive loading. Effectful training changes must return receipts and remain unreachable from deployed inference.

## Decision and handoff

Accept only when the change is genuinely generic, simpler and more accurate than repeated KB workarounds,
proportionate to its regression surface, reproducible, and free of critical regression. Record the method descriptor,
tests, content-addressed executable checkpoint, and deterministic KB migration or continued package compatibility.
Do not introduce an internal protocol revision counter for a coordinated current-system change. Defer when semantics or
evidence remain incomplete.
