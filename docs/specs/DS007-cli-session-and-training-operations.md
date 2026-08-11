---
id: DS007
title: CLI, Session, and Training Operations
status: in-progress
owner: interface
summary: Defines interactive and one-shot execution, declarative KB construction and registration, Codex-based training, benchmark operations, reproducibility, and structured output.
---

# DS007 CLI, Session, and Training Operations

## Introduction

The CLI is the operational boundary through which users construct and register KBs, run symbolic tasks, maintain explicit sessions, invoke supervised training, inspect traces, and execute evaluation. Command spelling may evolve, but these semantic operations and safety boundaries remain stable.

## Core Content

### 1. CLI role

The CLI is the primary operational interface for KB construction, registration, interactive use, one-shot symbolic execution, benchmark learning and diagnostics. Command names may follow the existing project conventions, but the semantic operations below must be available.

### 2. KB construction operation

A KB construction operation accepts one or more documents, a target KB identity, an existing KB version when updating, and the approved coding-agent skills. It starts the document-to-KB process, permits supervised code proposals when necessary, runs validation and produces canonical and compiled KB packages plus a report.

The operation must support a mode that forbids changes to `src`. This mode is useful for determining how far the current CNL and reasoning system can process a source using only KB additions and validated LLM normalization.

### 3. KB registration operation

A registration operation validates a KB manifest and adds it to the local catalog. Registration does not fully load facts. The operation reports dependencies, namespace collisions, trust status, schema compatibility and estimated catalog footprint.

An unregister operation removes the catalog entry without deleting the package unless explicitly requested. Version selection is explicit.

### 4. One-shot execution

A one-shot execution accepts text containing instructions, facts, contextual information and one or more goals. The runtime identifies these discourse roles, constructs a task frame, selects KBs and methods, executes the symbolic plan and emits a structured result.

The user may supply temporary facts or assumptions. These enter a session-scoped context and do not modify persistent KBs unless a separate persistence operation is authorized.

### 5. Interactive execution

Interactive mode maintains a session context, prior entities, accepted assumptions, loaded shard cache and unresolved questions. The user can inspect interpretations, request explanations, add facts, retract session facts and ask follow-up questions.

The session must not silently treat a previous uncertain conclusion as a fact. The status and provenance of every retained item remain available.

### 6. Benchmark operations

Benchmark operations cache immutable source data, select development and holdout partitions, run direct-symbolic and normalized tracks, capture traces, cluster failures, compare checkpoints and invoke the benchmark-guided skill.

A regression operation runs all suites required by a candidate change. A shadow operation reports aggregate metrics without exposing held-out examples to the coding agent.

### 7. Input contract

The runtime accepts ordinary text, but internally distinguishes instruction, assertion, constraint, question, desired output schema and optional resource policy. When the distinction is ambiguous, it may preserve alternatives or ask for clarification in interactive mode. In one-shot evaluation it returns an ambiguous-input status.

### 8. Output contract

Every execution result contains a status, answer or partial answer, confidence semantics, parsed task frame, used KB versions, loaded shards, selected methods, proof or execution trace, unresolved subgoals, fallback route and resource usage.

Human-readable output may be concise, but a machine-readable result must be available for benchmark evaluation and agent diagnostics.

### 9. Determinism and reproducibility

The CLI records the system commit, configuration, KB versions, planner policy, random seed, LLM configuration when used and resource budgets. Deterministic modes must reproduce the same parse, plan and answer from the same inputs and packages.

### Required command families

The canonical executable is `node src/cli.mjs` or the package bin `eslm`. With no subcommand it starts an interactive session. `ask` executes one text task. `run` consumes plain text or JSONL and emits JSONL. `kb list` reports repository-managed, public-provider, and explicitly registered packages. `kb show` inspects one entry. `kb compile` validates canonical JSONL, deterministically writes inert JSON shards and a hashed manifest, and deliberately leaves the result unregistered. `kb register` validates a manifest before adding its package to the local catalog. `kb unregister` removes only that catalog entry. `kb build` rebuilds repository-managed packages from their canonical inputs or frozen source adapters, and `kb validate` opens and audits existing packages. None of these operations silently deletes source or eagerly loads every record as a side effect of catalog inspection.

`train prepare` hashes the visible source or benchmark pool, records its split and explicit target namespace, and writes a packet. The operator may name the packet path; otherwise the command uses an operating-system temporary directory and does not recreate a persistent `training/work/` tree. `train candidate` creates an untrusted candidate skeleton when a human or external workflow needs one without invoking an agent. `train run` creates an isolated workspace, copies exactly one self-contained repository-owned skill, computes `BASELINE_ANALYSIS.jsonl` with the trusted Stage A frontend and planner, and starts an explicitly configured ephemeral Codex subprocess. The baseline contains normalized input, accepted parser structures, plans, unresolved items, and unsupported spans; it is diagnostic output and does not supersede source evidence. The subprocess receives the packet, copied skill, assignment, embedded authorized data, and the baseline, but it does not receive hidden test paths or arbitrary host environment variables.

`train validate` currently validates an existing compiled KB package through the trusted host. Candidate canonical JSONL is checked first by the portable validator included in the copied skill and again by `kb compile`, whose host validator is authoritative. Candidate compilation, package validation, catalog registration, and publication are intentionally distinct gates. Promotion is not yet exposed as a command: when implemented, it must remain an explicit reviewed operation with a named source candidate and destination version; passing tests or compiling successfully must never authorize promotion by itself.

Dataset acquisition, source probing, compilation, evaluation, benchmark execution, external prediction export/import, and documentation publication remain explicit operations. No inference command downloads data or calls an agent. Network acquisition is never an implicit effect of asking a question.

### Interactive commands and session state

Interactive mode must expose help, loaded and registered KBs, current model and versions, memory and resource policy, last trace, last profile, session facts and assumptions, retraction of session facts, clarification, and session clearing. Session items retain status and provenance. An uncertain conclusion is not silently reused as a fact.

The session context is an explicit overlay and can be serialized in structured output. It does not mutate a published KB. A follow-up may refer to prior entities and goals only through bounded discourse state that remains inspectable. When several reference candidates remain and answers differ, the CLI asks for clarification or returns `AMBIGUOUS`.

### Stable machine output

Every result includes a protocol version, status, answer or partial answer, accepted Semantic IR, task frame, selected KB versions, loaded shards or blocks, selected methods, proof or execution trace, unresolved subgoals, language route, fallback validation, and resource use. Human output is a view over this result. ANSI styling and progress text must never enter JSON or JSONL.

## Decisions & Questions

### Question #1: Why may training invoke Codex while inference may not?

Response: Coding-agent use is the declared construction mechanism and its cost is amortized into immutable artifacts. Deployed inference tests deterministic symbolic behavior and therefore cannot delegate gaps to an agent.

### Question #2: Why does unregister not delete a KB?

Response: Catalog registration and package storage are separate state. Removing discovery metadata is reversible; deleting source or a published package requires an explicit separate target and authorization.

### Question #3: Why is structured output authoritative?

Response: Status, scope, methods, proof, provenance, fallback route, and resource limits cannot be recovered reliably from a concise fluent sentence.

## Conclusion

The CLI provides one reproducible interface for construction and execution while preserving strict separation between agent-driven training, declarative package management, and offline symbolic inference.
