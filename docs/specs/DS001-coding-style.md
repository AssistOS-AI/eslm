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

Trusted reusable mechanisms belong in cohesive subdirectories under `src/`: language compilation, semantic contracts, KB schemas and loading, reasoning methods and planning, runtime orchestration, benchmark adapters, evaluation, training control, operator-only language services, and CLI adapters. `src/runtime/engine.mjs` and `src/runtime/runtime.mjs` define the deployable inference closure. `src/runtime/language-agent-assisted-runtime.mjs` defines the product-neutral operator wrapper and `src/language/codex-normalizer.mjs` defines its currently supported Codex adapter; neither may become a transitive dependency of the deployable closure. Tests mirror those boundaries. Canonical KB records, manifests, compiler outputs, source registrations, and reports live within independently versioned directories under `training/KBs/`. Dataset caches and prepared benchmark pools remain separate from KB knowledge.

Do not create root-level `data`, `benchmarks`, `results`, `artifacts`, or `configs` directories. Generated and temporary training artifacts belong under ignored paths selected by the training contract. Published documentation evidence belongs under `docs/results/`.

### JavaScript conventions

Use named functions for reusable algorithms and small pure functions for transformations. Prefer immutable values and explicit returned state over ambient mutation. Use descriptive identifiers, semicolons, single-quoted strings, two-space indentation, trailing commas in multiline literals, and Unicode-aware regular expressions. Validate every external boundary and include the failing path, record, field, or contract element in diagnostics.

Do not suppress errors. Catch only to add context, implement a specified fallback, or translate a boundary error into a structured result. Avoid files above 500 lines; split by cohesive behavior. Files above 800 lines require an explicit rationale in the affected specification. Keep source lines within 120 characters when clarity permits. Large declarative records may exceed this only when line splitting harms deterministic review.

### Runtime and data safety

The deployed runtime closure and declarative KB content must not use `eval`, `Function`, `node:vm`, child processes, networking, secret-bearing environment access, corpus-selected dynamic imports, or import-time I/O. Corpus strings remain inert data. A restricted declarative rule is parsed into a validated AST and interpreted by a registered trusted method; it never contains source code.

DS009 owns process isolation, untrusted-input handling, and security controls. DS013 owns the complete operator
normalization subprocess protocol. DS004 and DS007 own training authority and its command surface. This coding contract
requires runtime core modules to remain outside both subprocess dependency closures.

DS002 owns the executable-versus-declarative placement test, DS015 owns generic-method generality, and DS017 owns
adapter and oracle isolation. Source review must enforce those contracts: runtime control flow may consume declared
semantic types and validated policy metadata, but not external record identity or expected output.

### Tests and fixtures

Use `node:test` with strict assertions. Name tests after observable contracts. Organize unit tests by the source boundary they protect and add integration tests for CLI, canonical-to-compiled equivalence, lazy-versus-exhaustive loading, planner traces, honest failure, skill portability, agent invocation construction, normalization invocation and host rejection, dataset isolation, benchmark oracle isolation, renamed and nonce generalization, deterministic multi-thousand regression smoke, and documentation synchronization.

Fixtures must be small, legible, deterministic, and licensed for repository inclusion. Public datasets remain local ignored inputs. A fixture demonstrates software behavior and is never reported as a scientific benchmark. Tests may write only to operating-system temporary directories or an explicit ignored work directory; they must not mutate published KB versions or promoted reports.

### Documentation synchronization and diagrams

The contiguous DS set under `docs/specs/` is authoritative. Behavior, interface, evaluation, claim, skill, or architecture changes must update the affected DS files, tests, HTML pages, README, and AGENTS guidance in the same change.

DS012 owns the complete technical-writing, navigation, generated-status, diagram, and synchronization contract. Code and
documentation reviews must invoke that owner whenever a behavior or claim changes rather than creating a second local
documentation policy here.

### Required checks

`npm test` runs unit and integration tests. `npm run evaluate` and `npm run benchmark` run the fixed five-case authored
integration fixtures; they do not execute the public adapter portfolio. `npm run benchmark:public-probe` performs the
separately labeled public execution-and-receipt workflow and never downloads sources silently. `npm run docs:check`
checks documentation structure, links, explanatory captions, left-to-right Mermaid direction, and the maximum
five-edge diagram budget. `npm run check` composes the required offline verification without silently rerunning every
costly public probe. `npm run source:size` reports source-file size and long-line risks while excluding declarative data
whose canonical representation is intentionally one record per line.

## Decisions & Questions

### Question #1: Why does the repository use direct `.mjs` rather than TypeScript?

Response: Direct ESM removes compilation and dependency ambiguity, makes trusted mechanisms and generated tools immediately inspectable, and preserves the dependency-free offline runtime.

## Conclusion

The repository must remain directly executable with Node.js, organized by architectural responsibility, hostile to executable knowledge payloads, and synchronized across implementation, tests, specifications, agent skills, and human documentation.
