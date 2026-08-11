# Skill — Benchmark-Guided Symbolic Learner

## Purpose

Use this skill to improve the existing symbolic system on a reasoning benchmark while preserving all previously learned capabilities.

## Baseline discipline

Cache the original benchmark immutably with version, license and checksum. Establish development, fresh, regression and shadow pools. Record answer accuracy, direct symbolic rate, normalized accuracy, proof validity, parse coverage, runtime failures and capability-level scores.

## Failure-driven work

Inspect development failures together with parse, Semantic IR, retrieved KB records, loaded shards, selected methods, proof trace and result status. Cluster failures by root cause rather than by answer label.

Decide whether each cluster requires KB knowledge, lexical data, a CNL grammar or semantic-composition change, retrieval improvement, declarative rule, generic reasoning method, planner improvement or resource-policy change.

Prefer the current KB when the missing artifact is knowledge or dataset semantics. Propose a `src` change only for a reusable structural capability. Invoke the Core Change Guardian before accepting such a change.

## Validation discipline

For every candidate fix, run focused tests, fresh structurally related samples, nonce substitutions, semantic-preserving metamorphic tests, semantic-changing contrastive tests and all relevant regressions.

A parser change must increase direct symbolic coverage on fresh data and preserve existing semantic interpretations. A retrieval change must match exhaustive mode. A reasoning change must validate proofs or witnesses.

Reject answer lookup tables, benchmark-name branches, question hashes and exact-sentence cases. Any inspected holdout that influences a patch becomes development data.

## Acceptance discipline

Accept a candidate only when the target cluster improves on fresh data, no critical regression appears, proof semantics remain valid, direct symbolic autonomy is not reduced without explicit justification, and complexity is proportionate to gain.

Record the failure, diagnosis, chosen layer, patch, focused result, fresh result, regression result, direct-symbolic effect and system-size effect.

## Completion

A benchmark is learned when performance stabilizes across unseen samples, direct symbolic coverage is appropriate for the intended CNL stage, remaining failures form identifiable hard classes, shadow evaluation confirms the result and previous suites remain stable.
