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

Persistent source, comments, diagnostics, specifications, agent skills, and documentation must be written in English. Test inputs and knowledge records may use any explicitly supported language.

### Repository layout

The principal product directories are `src/`, `tests/`, `training/`, `docs/`, and preserved `original_specs/`. Imported project-maintenance skills under `.agents/skills/` are read-only during ESLM product work. Repository-owned operational skills live under `training/.agents/skills/` and must be self-contained.

Trusted reusable mechanisms belong in cohesive subdirectories under `src/`: language compilation, semantic contracts, KB schemas and loading, reasoning methods and planning, runtime orchestration, training control, evaluation, and CLI adapters. Tests mirror those boundaries. Canonical KB records, manifests, compiler outputs, source registrations, and reports live within independently versioned directories under `training/KBs/`. Dataset caches and prepared benchmark pools remain separate from KB knowledge.

Do not create root-level `data`, `benchmarks`, `results`, `artifacts`, or `configs` directories. Generated and temporary training artifacts belong under ignored paths selected by the training contract. Published documentation evidence belongs under `docs/results/`.

### JavaScript conventions

Use named functions for reusable algorithms and small pure functions for transformations. Prefer immutable values and explicit returned state over ambient mutation. Use descriptive identifiers, semicolons, single-quoted strings, two-space indentation, trailing commas in multiline literals, and Unicode-aware regular expressions. Validate every external boundary and include the failing path, record, field, or contract element in diagnostics.

Do not suppress errors. Catch only to add context, implement a specified fallback, or translate a boundary error into a structured result. Avoid files above 500 lines; split by cohesive behavior. Files above 800 lines require an explicit rationale in the affected specification. Keep source lines within 120 characters when clarity permits. Large declarative records may exceed this only when line splitting harms deterministic review.

### Runtime and data safety

Runtime and declarative KB content must not use `eval`, `Function`, `node:vm`, child processes, networking, secret-bearing environment access, corpus-selected dynamic imports, or import-time I/O. Corpus strings remain inert data. A restricted declarative rule is parsed into a validated AST and interpreted by a registered trusted method; it never contains source code.

Training orchestration may start an explicitly configured coding-agent subprocess because agent use is part of training. That authority is isolated from deployed inference, receives only an approved packet and skill directory, uses an explicit working directory, and produces a candidate plus an execution receipt. Runtime modules must not import training-agent code.

### Tests and fixtures

Use `node:test` with strict assertions. Name tests after observable contracts. Organize unit tests by the source boundary they protect and add integration tests for CLI, canonical-to-compiled equivalence, lazy-versus-exhaustive loading, planner traces, honest failure, skill portability, agent invocation construction, dataset isolation, and documentation synchronization.

Fixtures must be small, legible, deterministic, and licensed for repository inclusion. Public datasets remain local ignored inputs. A fixture demonstrates software behavior and is never reported as a scientific benchmark. Tests may write only to operating-system temporary directories or an explicit ignored work directory; they must not mutate published KB versions or promoted reports.

### Documentation synchronization and diagrams

The contiguous DS set under `docs/specs/` is authoritative. Behavior, interface, evaluation, claim, skill, or architecture changes must update the affected DS files, tests, HTML pages, README, and AGENTS guidance in the same change.

HTML documentation must explain the complete operational contract in continuous technical prose. It must not summarize away assumptions, algorithms, invariants, failure states, measurement regimes, acceptance gates, or falsification criteria. It should explain difficult behavior from several useful viewpoints: data flow, control flow, trust boundary, operator responsibility, failure diagnosis, and review procedure. Diagrams are used only when they materially clarify a relationship. They must be small, readable on mobile, use short labels, and be followed by prose that explains inputs, processing, outputs, and limits.

### Required checks

`npm test` runs unit and integration tests. `npm run evaluate` runs fixed local evaluation. `npm run benchmark` runs implemented benchmark adapters without silently downloading data. `npm run docs:check` checks documentation structure, links, explanatory captions, left-to-right Mermaid direction, and the maximum five-edge diagram budget. `npm run check` composes all required verification. `npm run source:size` reports source-file size and long-line risks while excluding declarative data whose canonical representation is intentionally one record per line.

## Decisions & Questions

### Question #1: Why use direct .mjs rather than TypeScript?

Response: Direct ESM removes compilation and dependency ambiguity, makes trusted mechanisms and generated tools immediately inspectable, and preserves the dependency-free offline runtime.

### Question #2: May KB packages contain functions?

Response: No. KB packages are declarative data products. Specialized reusable behavior belongs in src and is selected through registered method identifiers. Compilers may emit optimized data segments, but not executable corpus-derived helpers.

### Question #3: Why require explanatory HTML in addition to DS contracts?

Response: The DS set states normative obligations. HTML explains how those obligations appear in the implemented system and gives reviewers multiple operational views without weakening or paraphrasing away the contract.

## Conclusion

The repository must remain directly executable with Node.js, organized by architectural responsibility, hostile to executable knowledge payloads, and synchronized across implementation, tests, specifications, agent skills, and human documentation.
