---
id: DS012
title: Documentation, Operations, Skills, and Implementation Status
status: in-progress
owner: repository
summary: Defines authoritative documentation maintenance, small explanatory diagrams, repository-owned training skills, canonical commands, generated evidence, and the current implementation-status boundary.
---

# DS012 Documentation, Operations, Skills, and Implementation Status

## Introduction

This specification prevents the architecture, implementation, operational skills, and current evidence from drifting apart. It also defines how technical documentation explains the complete system without reducing normative contracts to short summaries.

## Core Content

### Documentation hierarchy

The DS files under `docs/specs/` are the authoritative contract. `matrix.md` indexes every contiguous DS through `specsLoader.html`. HTML pages explain the implemented system in operational detail and link to the relevant DS files. `README.md` provides an executable orientation. `AGENTS.md` governs future work and names the current skill catalog. Generated reports under `docs/results/` are dated evidence snapshots rather than architectural authority.

HTML documentation must preserve the terminology, intent, conditions, and explanatory style of the DS contracts. It must not replace a detailed contract with an abstract summary. Difficult mechanisms should be explained from multiple useful viewpoints: what data enters, which component owns each step, what exact representation crosses the boundary, what can fail, how the failure is diagnosed, what is cached or persisted, and what a reviewer should verify.

Use one primary navigation system. Each page includes a stable path to the specification matrix. Mermaid diagrams are appropriate for architecture, flow, sequence, state, or ownership only when they improve comprehension. The default diagram is a single left-to-right two-dimensional flow with three to five primary nodes. One small secondary input edge is acceptable when it explains a real join. Deep trees, parallel subgraphs, repeated branch fans, long node text, and diagram-only explanations must be replaced by simpler flows plus prose. Static assets belong under `docs/assets/`. All HTML pages include the shared Mermaid loader.

The documentation home page maintains two explicit inventories. The KB inventory lists only packages that exist locally and pass the current validation path, with source, version, scale, supported use, and limitations. The benchmark inventory lists reviewed families with separate source/access, adapter, acquisition, and execution states. A benchmark may appear as reviewed for inclusion before it is executed, but the page must label that state directly and must identify the exact post-reset reports that have actually run.

### Repository-owned training skills

The repository provides four self-contained operational skills under `training/.agents/skills/`: Document-to-KB Builder, Benchmark-Guided Symbolic Learner, Core Change Guardian, and KB Compiler and Quality Auditor. Each skill carries its own references, scripts, agent descriptor, schemas or templates needed for portable use. A skill must not import host-project source modules.

Document-to-KB Builder registers sources, drives the direct symbolic parser, preserves spans, creates canonical candidates, and reports unresolved language. Benchmark-Guided Symbolic Learner manages pools, checkpoints, trace clusters, generalization gates, and research notes. Core Change Guardian decides whether repeated evidence authorizes a reusable mechanism in `src`. KB Compiler and Quality Auditor validates canonical records, compiles manifests and indexes, tests canonical-versus-compiled and lazy-versus-exhaustive equivalence, and publishes immutable packages.

Skills may invoke repository CLI commands as external tools only when the assignment explicitly targets this repository. Their portable internal validators and assignment preparation remain usable without host-project imports. Updating a skill requires its own tests, the AGENTS catalog, HTML training documentation, and this specification to change together.

### Current post-reset implementation boundary

The structural reset has removed the old prepared benchmark trees, candidate and work ledgers, global generated model, executable KB modules, and historical result claims. Cached immutable archives remain reusable inputs. Open English WordNet 2025 and ATOMIC 2020 are rebuilt as provider-specific declarative JSON packages, and QUICK is replaced by the lowercase `quick` canonical-record fixture compiled through the generic schema and compiler.

The accepted Stage A path now consists of deterministic normalization and a narrow controlled-English parser, explicit queries and task frames, a capability registry and plan record, indexed retrieval, safe Horn deduction, provenance-bearing structured results, the declarative package catalog and loader, query-directed public-KB caches, and success plus structured-failure tests. Runtime code is organized into `src/language/`, `src/kb/`, `src/reasoning/`, `src/runtime/`, and `src/training/` boundaries. Training can prepare a hashed train-visible packet with an explicit target namespace, precompute a hashed `BASELINE_ANALYSIS.jsonl` through the trusted Stage A language and reasoning components, create an isolated workspace, copy one of four self-contained skills, and invoke Codex as an ephemeral subprocess whose output remains an untrusted candidate. The Document-to-KB skill contains the exact canonical record contract and a host-independent validator; the host repeats semantic graph validation before compiling inert JSON shards.

This accepted boundary is not the complete research system. Semantic IR coverage beyond the implemented query and assertion forms, full context projection, event and temporal methods, constraint solving, mature induction and abduction, defaults and exceptions, richer discourse, optional validated language normalization, probabilistic scoring, and narrative construction remain partial or planned. Prepared public benchmark adapters must be rebuilt under the current visibility and packet contracts before new public scores are claimed. Later capability tables must distinguish implemented, partial, and planned behavior and name source modules and evidence. A schema, CLI placeholder, benchmark catalog entry, capability descriptor, or future module name does not count as implementation.

### Operational verification

Canonical commands include interactive and one-shot CLI execution, batch JSONL, KB list/show/compile/register/unregister/build/validate operations, source and dataset status, training prepare/candidate/run/validate, local evaluation, the benchmark catalog and native fixture harness, documentation checks, and the composed full check. No public benchmark family is currently claimed as an executed post-reset adapter. Compilation does not register or publish a package. A promotion command is intentionally absent until its review and version-transition contract is implemented. Commands that need network access remain explicit and are not part of inference.

The documentation verifier checks navigation, assets, DS loader targets, matrix entries, and Mermaid availability. The specification matrix is generated from frontmatter rather than edited manually. The full project check validates source behavior, canonical schemas, package compilation and routing, skill portability, tests, evaluation, and documentation without silently acquiring external data.

## Decisions & Questions

### Question #1: Why keep detailed HTML when DS files already exist?

Response: Reviewers need an operational explanation that connects contracts to actual modules, commands, traces, and failure states. The HTML expands perspective and navigation; it does not shorten or weaken the DS text.

### Question #2: Why are skill details kept inside skill folders?

Response: The skills must remain portable and self-contained. Host documentation explains their role and interfaces, while scripts, schemas, templates, and step-by-step agent instructions travel with each skill.

### Question #3: When may a current-status claim move from planned to implemented?

Response: Only after executable behavior, success and failure tests, synchronized DS and HTML documentation, and proportionate evaluation evidence all agree.

### Question #4: Why prefer a short left-to-right diagram over a complete component graph?

Response: The diagram should expose one important relationship at a glance. Detailed ownership, exceptional paths, invariants, and reviewer checks remain in the surrounding prose, where they can be explained precisely without forcing readers to decode a dense graph.

### Question #5: Why separate KB availability from benchmark execution on the home page?

Response: A source can be compiled into a useful KB without being an evaluation set, while a benchmark can be selected for future coverage without having an adapter or result. Separate inventories preserve these different evidence regimes and prevent an available data package or catalog entry from becoming an accidental performance claim.

## Conclusion

Documentation and operations are part of the executable research contract. The repository must remain navigable, testable, honest about status, and detailed enough for a programmer to review every major boundary without consulting superseded source material.
