# Skill — Core Change Guardian

## Purpose

Use this skill whenever a coding agent proposes a modification to reusable executable code in `src` while learning a document collection or benchmark.

## Evidence requirement

Demand evidence that the failure occurs across independent examples, has one structural cause, cannot be represented cleanly as KB knowledge, and would remain relevant if domain vocabulary changed.

A single failed question is not sufficient evidence for a core change. A recurring generic language construction, missing quantifier semantics, absent state-update operator, unsafe default logic or missing search method may justify one.

## Specification requirement

Require a semantic specification before code. The proposal must state inputs, outputs, invariants, uncertainty semantics, proof behavior, interaction with existing operators and migration impact on KBs.

## Test requirement

Require focused unit tests, metamorphic tests, contrastive tests, fresh benchmark samples, all prior benchmark regressions, security checks and compiled-backend equivalence where relevant.

For language changes, require direct symbolic rate measurements and semantic-diff checks on previously accepted sentences. For reasoning changes, require proof or witness validation. For routing changes, require comparison with exhaustive loading.

## Decision

Accept the change only when it is generic, smaller or clearer than repeated KB workarounds, does not encode benchmark content, produces reproducible improvement and introduces no critical regression.

Reject or defer the change when evidence is weak, semantics are underspecified, a KB representation is sufficient, or the regression surface is not adequately tested.

## After acceptance

Record the new capability in the core registry, add permanent regressions, update compatibility metadata and ensure existing KBs remain valid or can be deterministically recompiled.
