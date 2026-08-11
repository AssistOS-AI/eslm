# DS-08 — CLI, Session and Execution Contract

## 1. CLI role

The CLI is the primary operational interface for KB construction, registration, interactive use, one-shot symbolic execution, benchmark learning and diagnostics. Command names may follow the existing project conventions, but the semantic operations below must be available.

## 2. KB construction operation

A KB construction operation accepts one or more documents, a target KB identity, an existing KB version when updating, and the approved coding-agent skills. It starts the document-to-KB process, permits supervised code proposals when necessary, runs validation and produces canonical and compiled KB packages plus a report.

The operation must support a mode that forbids changes to `src`. This mode is useful for determining how far the current CNL and reasoning system can process a source using only KB additions and validated LLM normalization.

## 3. KB registration operation

A registration operation validates a KB manifest and adds it to the local catalog. Registration does not fully load facts. The operation reports dependencies, namespace collisions, trust status, schema compatibility and estimated catalog footprint.

An unregister operation removes the catalog entry without deleting the package unless explicitly requested. Version selection is explicit.

## 4. One-shot execution

A one-shot execution accepts text containing instructions, facts, contextual information and one or more goals. The runtime identifies these discourse roles, constructs a task frame, selects KBs and methods, executes the symbolic plan and emits a structured result.

The user may supply temporary facts or assumptions. These enter a session-scoped context and do not modify persistent KBs unless a separate persistence operation is authorized.

## 5. Interactive execution

Interactive mode maintains a session context, prior entities, accepted assumptions, loaded shard cache and unresolved questions. The user can inspect interpretations, request explanations, add facts, retract session facts and ask follow-up questions.

The session must not silently treat a previous uncertain conclusion as a fact. The status and provenance of every retained item remain available.

## 6. Benchmark operations

Benchmark operations cache immutable source data, select development and holdout partitions, run direct-symbolic and normalized tracks, capture traces, cluster failures, compare checkpoints and invoke the benchmark-guided skill.

A regression operation runs all suites required by a candidate change. A shadow operation reports aggregate metrics without exposing held-out examples to the coding agent.

## 7. Input contract

The runtime accepts ordinary text, but internally distinguishes instruction, assertion, constraint, question, desired output schema and optional resource policy. When the distinction is ambiguous, it may preserve alternatives or ask for clarification in interactive mode. In one-shot evaluation it returns an ambiguous-input status.

## 8. Output contract

Every execution result contains a status, answer or partial answer, confidence semantics, parsed task frame, used KB versions, loaded shards, selected methods, proof or execution trace, unresolved subgoals, fallback route and resource usage.

Human-readable output may be concise, but a machine-readable result must be available for benchmark evaluation and agent diagnostics.

## 9. Determinism and reproducibility

The CLI records the system commit, configuration, KB versions, planner policy, random seed, LLM configuration when used and resource budgets. Deterministic modes must reproduce the same parse, plan and answer from the same inputs and packages.
