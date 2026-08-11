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

Reject a proposal that embeds domain vocabulary, benchmark IDs, exact cases, ambient authority, silent fallback, closed-world assumptions, hidden time or world scope, or an unbounded search. Reject a new intermediate representation that merely renames prose without enabling execution, verification, selection, caching, provenance, effect control, or reuse.

## Verification

Require focused unit tests, nonce and renamed examples, meaning-preserving metamorphic tests, meaning-changing contrasts, fresh benchmark samples, all affected regressions, security checks, deterministic replay, and canonical-versus-compiled or exhaustive-versus-lazy equivalence when relevant.

Language changes must increase direct-symbolic coverage on fresh examples while preserving protected operators and prior Semantic IR. Reasoning changes must validate proof or witness semantics. Routing changes must compare against exhaustive loading. Effectful training changes must return receipts and remain unreachable from deployed inference.

## Decision and handoff

Accept only when the change is genuinely generic, simpler and more accurate than repeated KB workarounds, proportionate to its regression surface, reproducible, and free of critical regression. Record the method descriptor, tests, compatibility version, and deterministic KB migration or continued compatibility. Defer when semantics or evidence remain incomplete.
