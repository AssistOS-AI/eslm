---
id: DS001
title: Coding Style and Repository Contract
status: implemented
owner: repository
summary: Establishes Node.js ESM conventions, source and test organization, declarative-data safety, documentation synchronization, and review limits.
---

# DS001 Coding Style and Repository Contract

## Introduction

This specification is the coding-style authority for the repository. It applies to runtime code, training orchestration, compiler tools, tests, generated declarative data, diagnostics, specifications, and HTML documentation.

## Core Content

### Language and dependency policy

All project runtime, training orchestration, evaluation, benchmark adaptation, KB compilation, and documentation tooling must use Node.js 22 or newer and ECMAScript modules stored as `.mjs`. The project must not add Python, PyTorch, native add-ons, transpilers, bundlers, or runtime packages. Node built-ins are preferred. A future dependency requires a specification change covering operational need, deterministic behavior, security, license, and offline installation.

Persistent source, comments, diagnostics, specifications, agent skills, and documentation must be written in English.
The deployed and local operator language boundary is English-only. Product fixtures use English except when they test
likely-non-English rejection or the separately attributed external translation-proposal boundary. Source metadata may
record a source document's declared language, but that metadata does not extend the runtime language contract.

### Repository layout

The principal product directories are `src/`, `tests/`, `training/`, `docs/`, and preserved `original_specs/`. Imported project-maintenance skills under `.agents/skills/` are read-only during ESLM product work. Repository-owned operational skills live under `training/.agents/skills/` and must be self-contained.

Trusted reusable mechanisms belong in cohesive subdirectories under `src/`: language compilation, semantic contracts, KB schemas and loading, reasoning methods and planning, runtime orchestration, benchmark adapters, evaluation, training control, operator-only language services, and CLI adapters. `src/runtime/engine.mjs` and `src/runtime/runtime.mjs` define the deployable inference closure. `src/runtime/language-agent-assisted-runtime.mjs` defines the product-neutral operator wrapper and `src/language/codex-normalizer.mjs` defines its currently supported Codex adapter; neither may become a transitive dependency of the deployable closure. Tests mirror those boundaries. Canonical KB records, manifests, compiler outputs, source registrations, and reports live within independently versioned directories under `training/KBs/`. Dataset caches and prepared benchmark pools remain separate from KB knowledge.

DS027 strategy contracts, registry, scheduling, arbitration, and receipts must be split into cohesive modules rather
than collected in one central switch or hidden behind ambient runtime callbacks. One strategy implementation owns one
typed concern and does not call another strategy directly. Cross-strategy and cross-stage coordination belongs in the
shared coordinator. Descriptor constants, profile schemas, execution, arbitration, and presentation should remain
separate modules so each can be tested without constructing the complete runtime.

Do not create root-level `data`, `benchmarks`, `results`, `artifacts`, or `configs` directories. Generated and temporary training artifacts belong under ignored paths selected by the training contract. Published documentation evidence belongs under `docs/results/`.

### JavaScript conventions

Use named functions for reusable algorithms and small pure functions for transformations. Prefer immutable values and explicit returned state over ambient mutation. Use descriptive identifiers, semicolons, single-quoted strings, two-space indentation, trailing commas in multiline literals, and Unicode-aware regular expressions. Validate every external boundary and include the failing path, record, field, or contract element in diagnostics.

Do not suppress errors. Catch only to add context, implement a specified fallback, or translate a boundary error into a structured result. Avoid files above 500 lines; split by cohesive behavior. Files above 800 lines require an explicit rationale in the affected specification. Keep source lines within 120 characters when clarity permits. Large declarative records may exceed this only when line splitting harms deterministic review.

Internal format, receipt, packet, policy, node, and strategy names follow the single-current-revision rule in DS000.
New code must not add numeric protocol suffixes such as `-v1`, schema labels whose only value is `1`, or selector
suffixes such as `@1`. Validators remain closed and content-addressed even though their role-bearing format names are
unversioned. A coordinated shape change updates all current producers and consumers in one change. Exact versions are
retained only for independently evolving KB packages, external sources and datasets, external model revisions,
dependency constraints, and immutable historical evidence. Tests must distinguish these boundary versions from
artificial internal revision counters.

### Runtime and data safety

The deployed runtime closure and declarative KB content must not use `eval`, `Function`, `node:vm`, child processes, networking, secret-bearing environment access, corpus-selected dynamic imports, or import-time I/O. Corpus strings remain inert data. A restricted declarative rule is parsed into a validated AST and interpreted by a registered trusted method; it never contains source code.

DS009 owns process isolation, untrusted-input handling, and security controls. DS013 owns the complete operator
normalization subprocess protocol. DS004 and DS007 own training authority and its command surface. This coding contract
requires runtime core modules to remain outside both subprocess dependency closures.

DS002 owns the executable-versus-declarative placement test, DS015 owns generic-method generality, DS027 owns static
trusted strategy registration and extension boundaries, DS017 owns adapter and oracle isolation, and DS028 owns inert
dataset-guided processing-graph research. Source review must enforce those contracts: runtime control flow may consume
declared semantic types and validated policy metadata, but not external record identity, expected output, trajectory
action, source reward, discovered cluster, or dataset-proposed executor.

### Tests and fixtures

Use `node:test` with strict assertions. Name tests after observable contracts. Organize unit tests by the source boundary they protect and add integration tests for CLI, canonical-to-compiled equivalence, lazy-versus-exhaustive loading, planner traces, honest failure, skill portability, bounded English-likelihood assessment and likely-non-English rejection, agent invocation construction, translation and simplification proposal rejection, dataset isolation, benchmark oracle isolation, renamed and nonce generalization, deterministic multi-thousand regression smoke, and documentation synchronization.

Strategy tests additionally cover descriptor and profile validation, registration-order independence, typed boundary
rejection, canonical schedules, correlated-vote deduplication, ambiguity, mandatory safety vetoes, deterministic
resource allocation, explicit exhaustion, bounded exception diagnostics, receipt validation, and per-strategy
ablations. A mock strategy must use nonce semantic identifiers; it must not encode a motivating example in its ID or
conditions.

Large generated development suites must be produced by deterministic source-owned generators rather than checked in
as thousands of hand-maintained fixture rows. The generator must derive each oracle from typed template variables
before runtime execution, preserve a stable seed and replay identity, use nonce content vocabulary, and emit structural
tags suitable for aggregate failure analysis. A generated suite may guide implementation, but it remains distinct
from a public or fresh benchmark and must not introduce a branch on a generated case identifier or expected value.

Fixtures must be small, legible, deterministic, and licensed for repository inclusion. Public datasets remain local ignored inputs. A fixture demonstrates software behavior and is never reported as a scientific benchmark. Tests may write only to operating-system temporary directories or an explicit ignored work directory; they must not mutate published KB versions or promoted reports.

### Documentation synchronization and diagrams

The contiguous DS set under `docs/specs/` is authoritative. Behavior, interface, evaluation, claim, skill, or architecture changes must update the affected DS files, tests, HTML pages, README, and AGENTS guidance in the same change.

DS012 owns the complete technical-writing, navigation, generated-status, diagram, and synchronization contract. Code and
documentation reviews must invoke that owner whenever a behavior or claim changes rather than creating a second local
documentation policy here.

### Required checks

`npm test` runs unit and integration tests. `npm run evaluate` and `npm run benchmark:authored` run their fixed
five-case authored integration fixtures. `npm run benchmark:generated` runs the deterministic default 1,200-case
heuristic-language development suite. `npm run benchmark` sequences the authored and generated benchmark commands but
keeps their reports, evidence regimes, and metrics separate; none of these commands executes the public adapter
portfolio. `npm run benchmark:public-probe` performs the separately labeled public execution-and-receipt workflow and
never downloads sources silently. `npm run docs:check` checks documentation structure, links, explanatory captions,
left-to-right Mermaid direction, and the maximum five-edge diagram budget. `npm run check` composes the required
offline verification without silently rerunning every costly public probe. `npm run source:size` reports source-file
size and long-line risks while excluding declarative data whose canonical representation is intentionally one record
per line.

## Decisions & Questions

### Question #1: Why does the repository use direct `.mjs` rather than TypeScript?

Response: Direct ESM removes compilation and dependency ambiguity, makes trusted mechanisms and generated tools immediately inspectable, and preserves the dependency-free offline runtime.

## Conclusion

The repository must remain directly executable with Node.js, organized by architectural responsibility, hostile to executable knowledge payloads, and synchronized across implementation, tests, specifications, agent skills, and human documentation.
