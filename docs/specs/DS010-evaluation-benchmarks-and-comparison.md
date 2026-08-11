---
id: DS010
title: Evaluation, Measurement, and External Comparison
status: in-progress
owner: evaluation
summary: Defines evidence layers, scoring and route metrics, proof validation, public report schemas, generated regression evidence, freeze rules, and comparison with external systems.
---

# DS010 Evaluation, Measurement, and External Comparison

## Introduction

Evaluation must reveal which layer works and which layer fails. This specification owns measurements, scorers, generated reports, and external comparisons. DS016 governs source authority and licensing; DS017 governs benchmark adapters, oracles, and split lifecycles. Current denominators and results belong only in replaceable execution receipts.

## Core Content

### Evidence layers

Unit tests verify implementation contracts with small repository fixtures. Metamorphic smoke tests preserve accepted generic behavior over generated nonce inputs. Local evaluation measures a fixed internal cross-section. Development probes execute externally defined tasks that may guide repair. Fresh and shadow regimes test a frozen candidate without exposing individual outcomes. Official test or evaluator runs follow the source owner's protocol. External comparisons measure another system under a frozen shared manifest.

These layers do not substitute for one another. A fixture is not a public benchmark, an adapter is not a score, a development sample is not an untouched test result, a local exact scorer is not an official semantic grader, and a fresh aggregate ceases to describe a later behavior change.

### Case and scorer contract

Every evaluated case has a stable join identifier, label-free visible input, declared answer or preference domain, evidence scope, capability tags, route policy, resource policy, and required proof or witness kind. The host-only oracle is joined after predictions exist. Missing predictions count according to the scorer and are never silently removed from the denominator.

The scorer compares semantic values, assignments, paths, transitions, proofs, or strict preferences rather than terminal prose whenever the task permits. Exact string normalization is documented and deterministic. A semantic model grader is used only in a separately frozen protocol that records its exact model, prompt, inputs, outputs, and route; deterministic validators remain preferred.

### Required measurements

Correctness measurements include correct count, tested denominator, available source scope, accuracy, capability and stratum breakdowns, exact match where appropriate, and official-versus-local scorer identity. Proof measurements independently validate proof graphs, countermodels, assignments, relation paths, transition traces, feature witnesses, and source provenance.

Language measurements include direct accepted semantics, direct `UNPARSED`, Language Agent candidates, actual external calls, cache hits, accepted translations, accepted simplifications, host rejections, process failures, and accuracy by route. A normalization-candidate rate is the direct `UNPARSED` fraction; it is not agent use and not wrong-answer rate. A cached normalization remains assisted even when no live process ran.

Reliability measurements separate correct abstention from accidental failure: `UNKNOWN`, `AMBIGUOUS`, `UNDERDETERMINED`, `INCONSISTENT_CONTEXT`, `NO_APPLICABLE_METHOD`, `RESOURCE_LIMIT`, and `UNPARSED` retain their meanings. Efficiency measurements include elapsed time, peak application memory where measurable, loaded bytes, shard and cache activity, search nodes, package size, and deterministic replay. Updateability measurements cover changed records, changed compiled bytes, affected answers, unaffected-answer stability, and provenance.

### Generalization and robustness

Random row splits are insufficient when templates, worlds, stories, vocabulary, relations, or proof structures repeat. Evaluation groups by relevant causal structure: source document, generated world, construction family, entity vocabulary, domain, relation composition, rule depth, spatial hop count, or another task-specific unit.

Every accepted generic capability has meaning-preserving transformations, meaning-changing contrasts, full entity and predicate renaming, irrelevant-fact injection, order changes that should be invariant, and depth or size curves. Accuracy must be interpreted beside direct-language coverage and proof validity. A gain that depends on more external normalization or invalid witnesses is not an unqualified symbolic improvement.

### Public empirical report

`docs/results/latest-public-benchmark-probes.json` is the replaceable receipt for the latest published benchmark portfolio. DS files and hand-authored HTML do not copy its temporary dates, percentages, denominators, failure counts, access states, or current adapter inventory. The home page loads the JSON in the browser and renders the current state.

Every catalog row records stable benchmark identity, source and access state, adapter state, evaluation state, evidence regime, effective split visibility, human-readable sample and protocol descriptions, internal protocol identifiers, tested count or `null`, possible count or `null`, correct count or `null`, accuracy or `null`, status counts, normalization candidates or `null`, actual Language Agent invocations or `null`, selected methods and KBs, scorer limitations, diagnosis, and official next-action URL when applicable.

An executed row displays the tested count beside the possible source scope. A non-executed row has no denominator and no zero percentage. Preference rows report correct preferences, reversed preferences, and ties separately; a strict preference requires the designated candidate to score higher, and a tie fails when the task contract says so. Internal stable identifiers and source hashes remain in raw or secondary audit views rather than breaking the primary two-column table.

The report may contain development, diagnostic, or fresh rows, but each row names its regime. A fresh aggregate is never merged into a recurring development percentage. Current portfolio membership is generated from the typed research catalog and therefore can grow without revising this specification.

### Generated regression and examples

The repository owns a deterministic 4,096-case default metamorphic corpus built from 26 rotating templates in twelve structural groups. Cases use nonce entities, concepts, predicates, objects, places, and values rather than copied public benchmark rows. Meaning-preserving variants and meaning-changing controls exercise direct retrieval, class inference, Horn rules, open-world behavior, state replacement, temporal predecessor, possession, paraphrase, preference semantics, scalable Boolean entailment, and categorical logic.

The test suite and `/smoke` execute the same catalog without Language Agent assistance. `/examples [PAGE] [SEED]` displays 24 cases per page from that catalog. `/smoke [COUNT] [SEED]` executes the selected deterministic prefix or sampling contract and prints one actual input, expected result, and actual result per encountered template plus every failure and aggregate totals. Comparing expectations without invoking the runtime or fabricating displayed answers invalidates the smoke result.

Smoke proves regression preservation for authored templates. It does not establish external task selection, source validity, held-out generalization, or benchmark accuracy.

### Freeze before external comparison

Before a final comparison, freeze the symbolic commit, accepted KB versions, adapters, CNL version, Language Agent policy, prompts and model when an assisted track is included, seeds, scorers, resource budgets, and prediction schema. A label-free export manifest lets another system produce predictions. The local deterministic oracle joins by stable identifier, validates shape, and counts omissions.

Results from final comparison do not feed patches into that frozen candidate. A later patch starts a new comparison version. Reports retain raw predictions and name model identity, quantization, prompt, context window, decoding, tools or retrieval, hardware, cost, and evidence regime.

### Comparison dimensions

The comparison matrix identifies both-correct, ESLM-only-correct, external-system-only-correct, and both-wrong subsets by language form, knowledge dependency, reasoning method, depth, ambiguity, and route. It also compares provenance coverage, trace validity, update locality, loaded knowledge, memory, latency, and honest failure.

The purpose is to locate the capability frontier. Symbolic strength on strict deduction does not imply unrestricted language or social plausibility. External-model strength on human prose does not reveal whether the difference is parsing, knowledge, or reasoning unless the symbolic route and intermediate evidence are separated.

## Decisions & Questions

### Question #1: When is comparison with an official or external score valid?

Response: Only when source version, split, visible evidence, prompt or adapter, answer normalization, grader, proof policy, tools, language route, and resource regime match. Otherwise the value is a named local diagnostic or contextual reference, not a direct leaderboard comparison.

### Question #2: Why does deterministic validation take precedence over a model judge?

Response: Semantic labels, values, constraints, paths, proofs, and assignments have reproducible validators. Adding a model judge would introduce a mutable authority and could hide whether the symbolic result actually satisfies the task.

### Question #3: What makes an impossibility or exception report valid?

Response: The report must identify the accepted input representation, prove that materially different oracle outcomes are indistinguishable under that representation or that the required oracle is unavailable, and show that no invariant method can separate them without new evidence or a changed task. Low accuracy, missing code, or a resource limit is an engineering gap, not an impossibility.

## Conclusion

Evaluation maps the capability frontier through exact evidence regimes, route accounting, witnesses, and frozen comparisons. Dynamic results can change without rewriting the stable contracts that make those results interpretable.
