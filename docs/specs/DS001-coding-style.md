---
id: DS001
title: Coding Style and Repository Contract
status: implemented
owner: repository
summary: Establishes dependency-free Node.js ESM, compact root structure, generated-code safety, test conventions, and synchronized documentation rules.
---

# DS001 Coding Style and Repository Contract

## Core Content

### Language and dependency policy

All project runtime, training orchestration, evaluation, benchmark adaptation, and documentation tooling uses Node.js 22 or newer and ECMAScript modules stored as `.mjs`. No Python source, Python project metadata, PyTorch, Transformers, transpiler, bundler, native add-on, or runtime npm dependency is permitted.

Node built-ins are preferred. A future dependency requires a DS change explaining its operational necessity, deterministic behavior, security surface, license, and offline installation policy. The default implementation must remain runnable after `git clone` with an installed Node runtime.

### Root structure

The visible product directories are limited to `src/`, `tests/`, `training/`, `docs/`, and the preserved `original_specs/`. Hidden `.agents/` and `.claude` support agent tooling. Root files hold only project entry metadata, instructions, license, and generic checks.

Stable algorithms belong in `src/`. Tests and fixed small fixtures belong in `tests/`. Training source, candidate work, repository-owned synthesis skills, and the promoted code model belong under `training/`. Human documentation, specifications, and latest generated reports belong under `docs/`.

Do not create root-level `data`, `benchmarks`, `results`, `artifacts`, or `configs` directories. Place command implementation in `src/`, build/profile utilities in root `scripts/`, knowledge sources and generated source models under `training/KBs/`, public benchmark material under ignored `training/datasets/`, downloaded archives under ignored `training/.cache/`, promoted generated core code in `training/model/`, and reports in `docs/results/`.

### Module boundaries

Each stable module owns one cohesive concern. `language.mjs` normalizes and scores surface language; `parser.mjs` compiles supported constructions; `reasoner.mjs` executes explicit facts and rules; `realizer.mjs` produces language; `engine.mjs` composes the inference path; `cli.mjs` adapts terminal and files; training, evaluation, benchmark, and documentation modules remain outside the inference engine.

Generated modules are not a dumping ground for stable algorithms. The core owns algorithms that should transfer between corpora. Generated modules own evidence-conditioned symbols, indexes, rules, exceptions, constructions, schemas, and templates. Moving a behavior across this boundary requires tests demonstrating why it is corpus-specific or general.

### JavaScript conventions

- Use named functions for reusable algorithms and small pure functions for transformations.
- Prefer immutable values, `Object.freeze` for generated tables, and explicit returned state over hidden mutation.
- Use descriptive identifiers and semantic ids. Avoid abbreviations except established terms such as ESLM, IR, TNF, MDL, and QA.
- Use semicolons, single-quoted strings, two-space indentation, trailing commas in multiline literals, and Unicode-aware regular expressions.
- Validate inputs at boundaries and throw errors containing the path, record, or contract element that failed.
- Keep diagnostics stable and in English so automation can consume them.
- Do not catch errors merely to suppress them. Catch only to add context, implement a documented fallback, or render a boundary response.
- Avoid files above 500 lines. Split by behavior, not arbitrary line count. Files above 800 lines require a DS rationale.
- Avoid source lines above 120 characters when clarity permits; generated tables may be wider when splitting would harm reviewability.

### Forbidden runtime behavior

Runtime and generated model code must not use `eval`, `Function`, `node:vm`, child processes, networking, environment-secret access, corpus-selected dynamic imports, or import-time I/O. Model source strings are data and never executed. The CLI may read explicitly selected input and write explicitly selected output. The graph inference core receives objects and performs no I/O. Under DS021, a public-KB provider may read a compiler-generated, allowlisted shard data envelope after a query selects its fixed bucket; it verifies the envelope and parses JSON without evaluating the module source.

Generated model validation uses static forbidden-capability scanning plus semantic imports in a controlled local process. This scanner is a defense layer, not a proof. Promotion also requires review of the generated diff and model contract.

### Tests and fixtures

Use `node:test` and strict assertions. Name tests after observable contracts. Unit tests cover normalization, parsing, indexing, rules, realization, model validation, Task Calculus execution, and error states. CLI tests run the real entry point and verify operation from both repository root and `training/`.

Fixtures must be small, legible, and licensed for repository inclusion. A fixture used to demonstrate code paths is not reported as a scientific benchmark. Public benchmark data is downloaded locally to ignored `training/datasets/` and is never committed without explicit license review.

Tests may create temporary files only in operating-system temporary directories or ignored `training/work/`. They must not mutate the promoted model or published reports. Evaluation and benchmark commands intentionally publish latest reports when `--publish` is selected.

### Documentation synchronization

DS files are authoritative and use contiguous identifiers. Every DS has frontmatter, a substantive `Core Content` section, and consecutively numbered `Decisions & Questions`. Decisions record architectural rationale; they are not a substitute for the actual contract.

Behavioral changes update relevant tests, DS files, and HTML pages in the same change. `docs/results/latest-evaluation.*` and `latest-benchmark.*` are generated evidence and may change after a verified run. The specification matrix is generated from frontmatter and must never be hand-maintained after the generator exists.

All persistent project text is English even when users converse in another language. Test inputs and model language data may contain any supported language.

### Required checks

`npm test` runs unit and integration tests. `npm run evaluate` executes fixed local evaluation. `npm run benchmark` executes the committed smoke benchmark. `npm run docs:check` checks required pages. `npm run check` composes all four with generated-model validation. `fileSizesCheck.sh` is advisory and reports size and long-line risks.

## Decisions & Questions

### Q1. Why `.mjs` instead of TypeScript?

Response: Direct ESM removes compilation and dependency ambiguity, makes generated code immediately inspectable, and supports the no-toolchain experiment.

### Q2. May generated modules contain functions?

Response: Pure bounded helpers are allowed when tables alone are inefficient, but frozen plain values are preferred. Functions may not perform I/O, access ambient authority, or compile source strings.

### Q3. Why keep latest reports in documentation?

Response: A runnable research repository should display current evidence beside architectural claims. Reports include timestamps, protocol ids, and dataset hashes to prevent timeless claims.
