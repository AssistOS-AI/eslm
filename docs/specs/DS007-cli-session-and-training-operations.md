---
id: DS007
title: CLI, Session, and Training Operations
status: in-progress
owner: interface
summary: Defines interactive and one-shot execution, declarative KB construction and registration, Coding Agent-based training, benchmark operations, reproducibility, and structured output.
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

The target one-shot contract accepts text containing instructions, facts, contextual information, and one or more
goals. The current Stage A text path is narrower: it accepts zero or more supported session statements followed by at
most one final question, and it constructs exactly one executable goal. An episode containing any unsupported
statement is rejected transactionally; tentative facts and history do not leak into later requests. Multi-goal AND/OR
planning remains a target owned by DS008 rather than a current CLI claim.

The user may supply temporary facts or assumptions. These enter a session-scoped context and do not modify persistent KBs unless a separate persistence operation is authorized.

### 5. Interactive execution

Interactive mode currently maintains bounded accepted entities, facts, rules, history, and one salient entity, while
the configured runtime separately maintains its loaded shard cache. Users can add supported session facts, ask
follow-up questions, inspect the last trace or profile, and clear the complete session. Fine-grained fact retraction,
an unresolved-question queue, and an interactive clarification dialogue are target operations, not implemented
commands. Current ambiguity is returned as `AMBIGUOUS` for the user to reformulate.

The session must not silently treat a previous uncertain conclusion as a fact. The status and provenance of every retained item remain available.

### 6. Benchmark operations

Benchmark operations cache immutable source data, select development and holdout partitions, run direct-symbolic and normalized tracks, capture traces, cluster failures, compare checkpoints and invoke the benchmark-guided skill.

A regression operation runs all suites required by a candidate change. A shadow operation reports aggregate metrics without exposing held-out examples to the coding agent.

The public-benchmark surface separates operations that must not be conflated. `benchmark status` reports source,
adapter, and frozen-receipt availability; it does not execute cases and does not return a score. `benchmark probe
--benchmark all|ID[,ID]` executes only the selected adapters that have a live probe and may assemble selected frozen
rows from immutable receipts. Every row labels whether it was executed in this invocation or assembled from earlier
evidence, and report assembly time is never presented as row execution time. Selecting one ID never appends unrelated
research rows. `--publish` writes the resulting portfolio receipt to
`docs/results/latest-public-benchmark-probes.json`. `benchmark run --suite FILE` executes a frozen repository or
operator-supplied JSONL suite through the generic scorer. Public catalog probes reject
`--external-language-agent`; an assisted comparison uses a separately frozen suite so its model, cache, prompt policy,
and route accounting cannot alter the published direct baseline.

A static receipt audit verifies frozen result and dependency digests. It classifies an audited receipt as current,
historical-stale, historical-unrecoverable, invalid, or unavailable rather than inferring currentness from a cache
directory. A stored execution whose receipt family has no complete currentness audit is explicitly
`historical-unverified`, never implicitly current. The ordinary
repository check may report historical receipts without re-running costly public sources; a publication gate that
claims current behavior uses the strict audit mode and fails on stale behavioral dependencies.

The benchmark status inventory is data-driven: `benchmark status` reads the typed research and access catalogs and
returns actionable official URLs without exposing credentials. The current probe executor is less general. Its command
module has an explicit allowlist of portfolio IDs, and its public-probe module maps the legacy live rows through explicit
branches while research rows use typed factories. Those branches are host-side benchmark adapters, not reasoning-core
dispatch, but adding a live probe currently requires changing that executor as well as its catalog, source receipt,
tests, and detailed benchmark page. A future typed executor registry should remove this maintenance duplication; until
then, catalog inclusion must not be described as automatic probe registration. The CLI command syntax can remain stable
through that refactor.

### 7. Input contract

The runtime accepts ordinary text, but internally distinguishes instruction, assertion, constraint, question, desired output schema and optional resource policy. When the distinction is ambiguous, it may preserve alternatives or ask for clarification in interactive mode. In one-shot evaluation it returns an ambiguous-input status.

### 8. Output contract

The durable target result contains a status, answer or partial answer, confidence semantics, accepted Semantic IR,
task frame, selected, consulted, and actually used KB versions, loaded shards, selected methods, proof or execution
trace, unresolved subgoals, language route, optional failure-time grounding bundle, and measured resource use.

The current `eslm-runtime-result-v1` is an implemented, stage-dependent subset. Every text result exposes the protocol,
status, answer, session and episode state, language route, the three KB-version sets, unresolved subgoals, and
model/memory metadata. Normalized `input`, accepted `query`, `taskFrame`, `plan`, semantic `values`, answer
`provenance`, and a `reasoning` summary appear only when execution reached the stage that can truthfully construct
them; an early `UNPARSED` result can omit all of those fields. The result may additionally expose grounding, a
typed-task witness, normalization receipts, or profiler measurements. It does not yet promise a confidence object, a
standalone accepted-Semantic-IR field, loaded-shard identifiers, complete per-step receipts, or measured resources on
an ordinary non-profiled call. Clients must branch on status and feature-detect optional fields rather than infer them
from the target example in DS008.

Every direct `EslmEngine` text and typed-task result carries a validated `eslm-memory-plan-v1` snapshot under
`model.memory`, including early input, context, method, and resource failures. That direct snapshot reports the already
resident core as eager, with no soft target, no reserve, and no public providers. The CLI's `EslmRuntime` wrapper
reports its configured provider memory plan instead, even when no public provider is selected. An empty provider list
therefore means “no provider cache is in this execution route”; it does not mean that the core model occupies zero
memory. Consumers must read the requested policy and reserve from the same snapshot rather than infer them from the
provider count.

`usedKbVersions` lists only KBs whose records or policy contributed to the primary result. Merely loading, selecting,
consulting, or returning a KB in the grounding bundle does not make it used.

Human-readable output may be concise, but a machine-readable result must be available for benchmark evaluation and agent diagnostics.

When the runtime cannot answer but returns related KB records, one-shot JSON keeps the primary `answer` unchanged and
serializes `grounding` separately. Interactive output prints the primary status and answer first, then a visibly
separated “Related KB evidence — not an answer” section. `/trace` distinguishes answer premises from grounding search
receipts and exposes incomplete coverage. This presentation is not permission to synthesize a new answer inside the
symbolic runtime.

### 9. Determinism and reproducibility

The durable reproducibility envelope records the system commit or content-addressed worktree, configuration, KB
versions, planner policy, random seed, external-model configuration when used, resource budgets, and measured
resources. Deterministic modes must reproduce the same parse, plan, and answer from the same inputs and packages.

That full envelope is not yet attached to every ordinary `ask` result. Current public live benchmark rows record a
content-addressed source-tree digest, runtime identity, replay command, requested memory policy, sampled peak RSS, and
wall time. The current ordinary runtime result records selected KB versions and model/memory policy; `--profile` adds
the implemented profiler fields. It does not promise a Git identity, seed, complete CLI configuration, or measured
resources without profiling. Frozen benchmark and external-process receipts carry their own execution identities under
DS010 and DS013. Documentation must not project those receipt-only fields onto every inference call.

### Required command families

The canonical executable is `node src/cli.mjs` or the package bin `eslm`. With no subcommand it starts an interactive session. `ask` executes one text task. `run` consumes plain text or JSONL and emits JSONL. `kb list` reports repository-managed, public-provider, and explicitly registered packages. `kb show` inspects one entry. `kb compile` validates canonical JSONL, deterministically writes inert JSON shards and a hashed manifest, and deliberately leaves the result unregistered. `kb register` validates a manifest before adding its package to the local catalog. `kb unregister` removes only that catalog entry. `kb build` rebuilds repository-managed packages from their canonical inputs or frozen source adapters, and `kb validate` opens and audits existing packages. None of these operations silently deletes source or eagerly loads every record as a side effect of catalog inspection.

`train prepare` hashes the visible source or benchmark pool, records its split and explicit target namespace, and writes a packet. The operator may name the packet path; otherwise the command uses an operating-system temporary directory and does not recreate a persistent `training/work/` tree. `train candidate` creates an untrusted candidate skeleton when a human or external workflow needs one without invoking an agent. `train run` creates an isolated workspace, copies exactly one self-contained repository-owned skill, computes `BASELINE_ANALYSIS.jsonl` with the trusted Stage A frontend and planner, and starts an explicitly configured ephemeral Coding Agent subprocess. The baseline contains normalized input, accepted parser structures, plans, unresolved items, and unsupported spans; it is diagnostic output and does not supersede source evidence. The subprocess receives the packet, copied skill, assignment, embedded authorized data, and the baseline, but it does not receive hidden test paths or arbitrary host environment variables.

`train validate` currently validates an existing compiled KB package through the trusted host. Candidate canonical JSONL is checked first by the portable validator included in the copied skill and again by `kb compile`, whose host validator is authoritative. Candidate compilation, package validation, catalog registration, and publication are intentionally distinct gates. Promotion is not yet exposed as a command: when implemented, it must remain an explicit reviewed operation with a named source candidate and destination version; passing tests or compiling successfully must never authorize promotion by itself.

Dataset acquisition, source probing, compilation, evaluation, benchmark execution, external prediction export/import, and documentation publication remain explicit operations. No direct or deployed-runtime inference path downloads data or calls an agent. The DS013 operator-side normalization wrapper is the only agent-call exception exposed beside inference commands. The general CLI enables that wrapper by default, labels it in result metadata, and invokes it only after `UNPARSED`; it remains outside the deployed runtime. `--no-external-language-agent` removes the wrapper from the command. Network acquisition is never an implicit effect of asking a question, and no dataset credential is inferred from the normalization profile.

### Interactive commands and session state

The current interactive command set exposes help, installed and loaded KBs, model and selected versions, memory policy,
normalization policy, last trace, last available profile, whole-session clearing, bounded examples, and the smoke
regression. `/model` reports the retained fact count; structured results expose the full overlay and provenance.
Fine-grained fact inspection and retraction plus interactive clarification remain acceptance criteria for a later
command revision. Session assertions retain provenance, and an uncertain conclusion is never inserted as a fact.

Readline Tab completion covers slash-command names, the declared values of `/normalize` and `/memory`, and cataloged or registered KB identifiers for `/load` and `/unload`, including the active comma-separated identifier fragment. Completion proposes syntax and identifiers only. It never executes a command, loads a KB, changes the normalization profile, or mutates session state. Ordinary language input is returned unchanged so pressing Tab while composing a question cannot rewrite its meaning.

The session context is an explicit overlay and can be serialized in structured output. It does not mutate a published
KB. A follow-up may refer to prior entities only through bounded discourse state that remains inspectable. When several
reference candidates remain and answers differ, the current CLI returns `AMBIGUOUS`; a future explicit clarification
dialogue may resolve it without changing that one-shot status contract.

### Stable machine output

The current required and optional `eslm-runtime-result-v1` fields are the implemented subset enumerated in section 8;
the richer shape in DS008 is a target contract. Human output is a view over the machine result. ANSI styling and
progress text must never enter JSON or JSONL. Adding target fields must be backward-readable and must not silently
change the meaning of an existing status, answer, provenance item, or KB-version set.

### Generated examples and regression smoke

Interactive `/examples [PAGE] [SEED]` selects a reproducible page over the exact generated regression catalog executed by `/smoke`. A page contains 24 cases, so `/examples 1` and `/examples 2` expose different bounded portions without pretending that the terminal rendered all 4,096 default cases. Each row names its template and metamorphic relation. The default seed is stable; an explicit seed permits a different deterministic nonce instantiation. `/smoke [COUNT] [SEED]` executes the requested number of cases, defaults to 4,096, accepts from 1 through 100,000, and reports pass, fail, skip, elapsed time, and source-family capability tags. The command constructs a fresh offline regression runtime containing the generic core and QUICK fixture package regardless of the session's selected KBs. Consequently a prior `/load`, `/unload`, memory-policy change, or enabled normalization wrapper cannot add evidence, turn expected unknowns into answers, skip QUICK cases, or change the smoke result.

DS010 owns the generated corpus membership, metamorphic semantics, capability groups, expected-value validation, and
scientific claim boundary. The CLI owns only selection, invocation, and truthful presentation: every typed template
must call the same public execution boundary used by adapters, and source-family tags never turn generated cases into
public benchmark evidence.

Smoke output is review evidence, not a progress animation. It prints one representative execution for every template encountered: the input text, expected status and semantic values, actual status, actual human answer or preference scores, and actual semantic values. Every additional generated case still contributes to the pass/fail aggregate. A passing summary is invalid if displayed answers were fabricated or if the command compared expectations without invoking the runtime.

### Optional operator normalization

The CLI exposes the DS013 operator profile through the canonical flags `--external-language-agent`,
`--no-external-language-agent`, `--language-agent-model`, `--language-agent-timeout-ms`, and
`--no-normalization-cache`, plus interactive `/normalize`, `/normalize on`, and `/normalize off`. The assisted profile
is the general CLI default; canonical verification, public probe publication, sensitive input, and deployed-style
reproduction select the offline flag explicitly. Product-specific normalization flags, including the former
`--no-codex-normalize`, are rejected rather than retained as aliases; scripts must use the role-based interface.

Startup, status, structured results, and human output disclose the active adapter, model, cache policy, route, proposal
and invocation counts, original input, transformed English when accepted, host validation, and final symbolic result.
DS013 exclusively defines the trigger, proposal feedback, authority, validation, cache, and failure routes. Loading a KB
or changing session state never changes the Language Agent policy.

## Decisions & Questions

### Question #1: Why are benchmark status and probe separate operations?

Response: Cache presence and access authorization are operational facts, while a score requires a selected case pool, adapter, runtime configuration, oracle, and completed execution. Keeping the commands separate prevents a downloaded archive or catalog entry from being reported as measured capability.

### Question #2: Why is `/examples` a paged view of the larger smoke corpus?

Response: The 4,096-case default is useful as a regression denominator but unreadable as terminal documentation. `/examples` exposes stable 24-case pages over that same catalog; `/smoke` executes the requested deterministic catalog and provides the regression evidence. Page numbering makes omissions visible and lets a reviewer move through the corpus without redefining the smoke denominator.

### Question #3: Why does `/smoke` print representative executions and totals?

Response: An aggregate alone cannot show whether the runtime was really invoked or whether status and semantic values were interpreted honestly. One actual input/output record per template keeps a default run readable while exposing the computation behind the total. Failures are always printed even when their template was already represented.

### Question #4: Why is related KB evidence not appended to the answer string?

Response: Machine consumers and scorers must be able to distinguish what the reasoner established from what retrieval
merely found relevant. A structural field preserves that boundary, while the interactive renderer can still provide a
useful, clearly labeled human view.

## Conclusion

The CLI provides one reproducible interface for construction and execution while preserving strict separation between agent-driven training, declarative package management, and offline symbolic inference.
