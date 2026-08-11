---
id: DS017
title: Benchmark Adapters, Oracles, and Split Lifecycle
status: in-progress
owner: evaluation
summary: Defines source-native validation, label-free task projection, host-only oracles, development and fresh split lifecycles, adapter generality, and evidence-state transitions.
---

# DS017 Benchmark Adapters, Oracles, and Split Lifecycle

## Introduction

A benchmark adapter preserves an external task's semantics while converting inert source records into ESLM's typed task and result contracts. It is not a place to implement a solver or store answers. This specification owns the adapter, oracle, and split boundaries so DS010 can remain focused on measurement and reporting.

## Core Content

### Source-native validation

An adapter validates the complete declared source inventory before sampling or execution. Validation covers file identity, archive and extracted-file digests, required and unexpected fields, types, identifiers, duplicate records, answer domains, split names, source anomalies, and the count of every accepted or invalid record. Large files are consumed sequentially or as native shards; file size is not an acceptance criterion.

Source parsing produces inert records. It never evaluates strings, imports source-selected paths, or treats a benchmark instruction as repository authority. An anomaly is retained and counted whenever it can be represented safely; unsupported schema remains an explicit source-coverage state.

### Label-free task pool and host-only oracle

The adapter exposes cases without expected answers, labels, reference proofs, preferred options, or answer-bearing identifiers. The oracle is held by a separate host object and is joined only after predictions exist. Synthesis packets and runtime task frames receive only the label-free case.

Stable case identifiers permit prediction joins and duplicate detection, but the generic parser, planner, and reasoning core never receive them as semantic inputs. Candidate order may be preserved when the official task requires it, but no order-based tie break may substitute for semantics.

### Typed projection

The adapter maps documented source structure into a versioned typed task. It may declare an answer domain, source-visible relation mapping, formula grammar, finite-domain grounding rule, task-local policy, or official normalization rule when these are part of the benchmark contract and carry provenance. It may not infer an expected answer, branch on the benchmark family inside generic execution, or implement missing logic under an innocuous conversion name.

A structured source task may legitimately use `direct-symbolic-task-adapter` rather than pretend its JSON fields were ordinary prose. A separate direct-language diagnostic is required when the benchmark also claims natural-language understanding. Logical-form success and language-front-end success are never merged.

### Development, regression, fresh, and shadow pools

Development-visible records may be inspected, clustered, and used to calibrate source-local adapter policy. Regression pools preserve accepted capabilities. Fresh membership is selected without oracle access, using stable fields and a frozen algorithm, seed, membership digest, strata, and pool sizes. Shadow evaluation exposes only aggregate outcomes.

Before a fresh oracle is opened, the source, partition, parser, adapter, selected KB packages, reasoning modules, policy data, and relevant tests are frozen by digest. A fresh run retains aggregate results and bounded strata, not protected rows or per-item diagnoses. Any later behavior change invalidates that aggregate for the new checkpoint. Reusing the same fresh cases as iterative diagnostics reclassifies them as development evidence.

An official test file without local labels is evaluator-only. It cannot borrow a validation oracle. An unreleased test split cannot be simulated from development records and presented as fresh.

### Generality gates

Every benchmark-guided behavior is tested after renaming entities, predicates, values, and surface forms; reordering irrelevant records; applying meaning-preserving transformations; and applying meaning-changing contrasts. Static checks reject branches on benchmark names, dataset IDs, source filenames, row IDs, hashes, expected answers, and answer positions inside the generic core.

Source-local policy is acceptable only when it configures a previously specified semantic operation, remains visible with provenance, and survives renamed or nonce structures. A policy cannot introduce a hidden solver whose only valid inputs are benchmark records.

### Evidence states

The catalog distinguishes at least `not-implemented`, `implemented-development`, and `implemented-fresh` adapter states, together with `not-run`, `development-probe-executed`, and `fresh-evaluation-executed` evaluation states. Stronger states require source, adapter, oracle, and execution receipts. A cache directory, schema inventory, catalog entry, paper, or fixture cannot promote an evidence state by itself.

An executed development probe names the visible pool, total available scope, sample policy, method and KB dependencies, scorer, route policy, proof or witness policy, and failure counts. A fresh execution additionally names the pre-evaluation freeze and one-shot aggregate receipt.

### Proof and witness preservation

Adapters preserve the official task's evidentiary obligations. A proof benchmark validates the proof or support graph. A constraint benchmark validates assignments and uniqueness. A relation benchmark validates paths or compositions. A state benchmark validates transition traces. A preference benchmark validates strict ordering and counts ties as required by its protocol. Converting every task into a label comparison that discards these artifacts is prohibited.

### Benchmark-specific documentation

Stable source-specific semantics belong beside the adapter, its tests, committed source receipts, and a detailed benchmark HTML page. Current denominators and results belong only in the replaceable public report. Adding a benchmark normally changes the typed catalog, adapter, tests, source receipt, and its HTML page; it does not require edits to the generic language, CLI, roadmap, storage, or documentation contracts unless one of those interfaces actually changes.

## Decisions & Questions

### Question #1: Where is the boundary between projection adapters and benchmark-specific solvers?

Response: It is legitimate when it validates documented source syntax, emits a generic typed task whose semantics remain meaningful after renaming, keeps the oracle outside the task, and delegates the actual transformation or search to a registered method. If the adapter uses hidden labels or implements an undeclared alternative reasoner, it is a solver and is rejected.

### Question #2: When does fresh evidence expire?

Response: The aggregate describes the exact frozen executable dependency set. Once those semantics change, the same pool can no longer demonstrate unseen generalization for the new behavior without becoming an iterative oracle.

## Conclusion

Benchmark adapters protect task meaning and evidence isolation. They allow heterogeneous sources to exercise one generic symbolic system without turning external records, labels, or file structure into runtime control flow.
