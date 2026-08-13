---
id: DS007
title: CLI, Session, and Training Operations
status: in-progress
owner: interface
summary: Defines local-first execution, exact work and strategy controls, declarative KB operations, supervised training, benchmark commands, reproducibility, and structured output.
---

# DS007 CLI, Session, and Training Operations

## Introduction

The CLI is the operational boundary through which users construct and register KBs, run symbolic tasks, maintain explicit sessions, invoke supervised training, inspect traces, and execute evaluation. Command spelling may evolve, but these semantic operations and safety boundaries remain stable.

## Core Content

### 1. CLI role

The CLI is the primary operational interface for KB construction, registration, interactive use, one-shot symbolic execution, benchmark learning and diagnostics. Command names may follow the existing project conventions, but the semantic operations below must be available.

### 2. KB construction operation

A KB construction operation accepts one or more documents, a target KB identity, an existing KB version when updating, and the approved coding-agent skills. It starts the document-to-KB process, permits supervised code proposals when necessary, runs validation and produces canonical and compiled KB packages plus a report.

The operation must support a mode that forbids changes to `src`. This mode is useful for determining how far the
current English CNL and reasoning system can process a source using only KB additions, the unchanged deterministic
DS022 recovery layer, and, when explicitly authorized, validated DS013 Language Agent proposals.

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

Ordinary CLI execution evaluates the bounded DS022 request-force planner beside the direct result. Common explicit
summary, expansion, explanation, comparison, outline, retrieval, essay, report, and document requests may produce a
dependency-ordered request plan even when the direct parser accidentally accepted their sentence-like material as
assertions. That route restores the incoming session snapshot, is query-local, and cannot commit tentative direct
items. The implemented construction route performs bounded grounded symbolic generation and returns `PARTIAL` with
citations and gaps; it is not the general multi-goal planner promised by DS008. It may create coherent English
sentences and document organization only after a non-voting claim gate admits the underlying supplied or KB claims.

Before these routes, a bounded English-likelihood diagnostic rejects likely non-English input without translating it;
unknown names and nonce terms alone do not justify rejection. Likely-English and indeterminate input continue to the
English parser. When no request plan applies, direct `UNPARSED` and `UNKNOWN` results enter bounded local English
approximation. A direct
`SOLVED` or `PARTIAL` interpretation may also be challenged when a structurally licensed candidate has different
parse-only Semantic IR; an identical candidate IR preserves the direct result. Selection never depends on whether a
rewording later finds an answer. A changed accepted interpretation is labeled `heuristic-cnl-approximated`, exposes
its votes and confidence, returns a strict proof only as top-level `DEFEASIBLE`, and discards every fact or rule learned
only from that interpreted episode. A well-formed knowledge gap with no structurally licensed alternative remains the
original `UNKNOWN`. In the general CLI's disclosed assisted profile, likely non-English input is eligible for a DS013 translation proposal rather
than English repair, while final unsupported English is eligible for a DS013 simplification proposal. Both return to
the same non-voting English parser and semantic gate.

### 5. Interactive execution

Interactive mode currently maintains bounded accepted entities, facts, rules, history, and one salient entity, while
the configured runtime separately maintains its loaded shard cache. Users can add supported session facts, ask
follow-up questions, inspect the last trace or profile, and clear the complete session. Fine-grained fact retraction,
an unresolved-question queue, and an interactive clarification dialogue are target operations, not implemented
commands. Current ambiguity is returned as `AMBIGUOUS` for the user to reformulate.

The session must not silently treat a previous uncertain conclusion as a fact. The status and provenance of every retained item remain available.

### 6. Benchmark operations

Benchmark operations cache immutable source data, select development and holdout partitions, run local English and
separately attributed assisted-proposal tracks, capture traces, cluster failures, compare checkpoints, and invoke the
benchmark-guided skill.

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

`benchmark generated` is a distinct local development operation for the deterministic DS022 heuristic-language
suite. With no overrides it executes 1,200 generated cases under the stable generator seed. `--cases N` selects a
validated finite denominator, `--seed VALUE` selects a reproducible nonce instantiation, and `--publish` writes the
JSON and HTML reports under the separate `latest-generated-heuristic-benchmark` name. The operation executes the real
local heuristic runtime with grounding and the Language Agent disabled. It never reads a public benchmark adapter or
merges its rate with `benchmark run`. Its typed oracles cover executed semantics, request plans, safe abstention, and
proposal/operator preservation. Separate oracle-level aggregates distinguish answer execution, semantic-query
execution, candidate selection, query-local decomposition, request execution, request planning, proposal-only
preservation, and safety abstention. Semantic-query rows require a complete expected query shape; candidate-selection
rows require the intended structural candidate to win, carry its required family, receive a matching accepted
parse-only reparse, and execute as the query-local interpreted episode under the declared route and status. They do
not require a complete relation-shaped query and may terminate `UNKNOWN` with `missingEntity`. The top-level pass
rate is still a mixed development-contract measure; oracle level, route, and status show whether a passing proposal
contract also reached executable interpretation. Request-planning rows preserve the correctly shaped obligation and
its missing-source gap, whereas request-execution rows require the construction path.

The package command `benchmark:authored` runs the unchanged five-case authored fixture, while
`benchmark:generated` publishes the generated development suite. The default `npm run benchmark` sequences those two
commands and preserves both artifacts. A report from either internal route declares `benchmarkComparable: false` and
its own evidence regime. The generated report additionally freezes the requested denominator, seed, generator and
suite digests, replay and behavior identity, work and strategy configuration, bounded representative failures, and
aggregate diagnostics. Changing its seed or case count creates a different suite identity rather than an implicit
continuation of the default result.

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

### Processing-graph research operations

The operator workflow has four non-interchangeable contracts. An approved
`eslm-rl-dataset-discovery-plan-v1` is validated before analysis and is the only artifact with
training-projection analysis-admission authority. An `eslm-processing-graph-research-analysis-v5` then records exact
machine work, lineage, hypotheses, omissions, and completeness. A repository-maintainer supplies a separate
`eslm-processing-graph-consolidation-review-v1` that maps real machine-hypothesis identities to reviewed candidates.
Only after that review may the host seal an `eslm-rl-dataset-discovery-cycle-v3`, which binds the plan and analysis,
copies the analysis-derived per-split declared, available, visited, selected, and analyzed counts, accounts for every
machine hypothesis exactly once, and records consolidation with
`decisionScope: research-consolidation-only`. Plan, analysis, review, and cycle all have `none` answer, runtime, proof,
and promotion authority. Running analysis is not consolidation, and sealing a cycle is not promotion.

`research graph status` is a read-only governance projection, not a research execution command. It validates exactly
five published historical artifacts: the two-source pilot analysis, the published large-source readiness gate, the
source-local large-source analysis, the bounded combined analysis, and the source-status receipt. It also loads the
three current source manifests, verifies each present cache against its exact byte length and SHA-256 identity, and
recomputes the current pilot admission, large-source admission, combined registry, and large-source readiness gates.
The bounded three-source analysis is also compared with its own approved pre-analysis plan and combined admission
receipt; concatenating two source registries is not a substitute for that plan-bound gate.
Cache verification may hash the frozen source bytes, but status does not parse source rows, rebuild a projection, run
discovery strategies, replace a receipt, or alter the runtime or processing-graph catalog.
`research graph status --publish` is rejected rather than treated as a no-op or publication request.

The machine result is `eslm-processing-graph-research-status-v3`. It keeps `publishedEvidence` with evidence class
`historical-execution-receipts` separate from `liveGovernance` with evidence class
`current-source-manifests-admission-and-readiness`. Every source reports registry, acquisition, projection, and
analysis states; visible components and split visibility; exact source, training-visible, non-training, projected,
dedicated-analysis, combined-analysis, excluded-training, excluded-non-training, and total excluded row or episode
counts; source, manifest, component, projection,
shard, approved discovery-plan artifact and canonical-content digests, admission, preflight, and readiness identities;
checkpoint and diagnostic frontier; historical and current completeness;
stop reason; and next allowed stage. The vocabulary includes `reviewed`, `cached`, `projected`, `pilot-analyzed`,
`fully-analyzed`, `blocked`, `withdrawn`, and `superseded`. An incomplete bounded checkpoint is a valid status with a
stop reason, not malformed evidence. A current tombstone, rights withdrawal, cache mismatch, admission failure,
registry drift, projection drift, or readiness drift therefore remains visible even when an older execution receipt
said complete. Malformed historical receipts, malformed manifests, and unsupported protocols remain command errors.

`research graph pilot` and `research graph scale` execute bounded deterministic research but do not publish unless
`--publish` is present. Pilot publication replaces only the named pilot receipt. Scale publication replaces only the
named source-local, combined, source-status, and readiness receipts produced by that run. The scale runner admits the
large source only at the exact `large-corpus` stage and only through a content-bound
`eslm-rl-large-source-preflight-v1` receipt. That preflight binds the current implementation, baseline graph, producer
script bytes and command, a recursively enumerated content identity for every repository-local module in the
preflight's static import closure, both byte-exact and canonical-content identities of the approved pre-analysis discovery
plan, source and split identities, projection and every shard, two independent full replays, and
one projection-input checkpoint restored after its creator process has terminated. The checkpoint freezes exact
prefix shard bytes and membership; the restorer validates those bytes, reads only the untouched suffix shards, and
must reproduce both fresh full-analysis receipts. This tests projection input restart, not continuation of internal
analyzer state. The parent records all four process exit codes and samples each child peak resident memory from Linux
`/proc/PID/status`; tested removal obligations and zero development/protected visitation remain bound as well.
Hand-authored readiness booleans or memory values cannot substitute for this
receipt. Running or publishing research never grants answer, proof, runtime, catalog, or promotion authority.

The sealing operation accepts one already approved plan, one validated analysis-v5 receipt, and one explicit human
review artifact, and writes one cycle-v3 receipt. It refuses a changed plan, registry, baseline graph, split accounting, work policy,
analysis identity, invented machine hypothesis, duplicate mapping, missing decision, or review outside DS028 and
DS029. Sealing does not rerun analysis and does not publish or alter the processing graph. Bundle validation is a
later consistency gate over the source manifests, plan, analysis, cycle, discovery log, and optional readiness
receipt; it does not establish the truth of external rights claims or create promotion authority.

### 7. Input contract

The runtime accepts ordinary text, but internally distinguishes instruction, assertion, constraint, question, desired output schema and optional resource policy. When the distinction is ambiguous, it may preserve alternatives or ask for clarification in interactive mode. In one-shot evaluation it returns an ambiguous-input status.

### 8. Output contract

The durable target result contains a status, answer or partial answer, confidence semantics, accepted Semantic IR,
task frame, selected, consulted, and actually used KB versions, loaded shards, selected methods, proof or execution
trace, unresolved subgoals, language route, optional failure-time grounding bundle, and measured resource use.

The current `eslm-runtime-result-v1` is an implemented, stage-dependent subset. Every text result exposes the protocol,
status, answer, session and episode state, language route, the three KB-version sets, unresolved subgoals, and
model/memory metadata plus the immutable DS022 `workPolicy` snapshot, including its strategy inventory view and exact
stage allowlists. Normalized `input`, accepted `query`, `taskFrame`, `plan`, semantic `values`, answer
`provenance`, and a `reasoning` summary appear only when execution reached the stage that can truthfully construct
them; an early `UNPARSED` result can omit all of those fields. A language-gate rejection exposes its bounded
`eslm-english-likelihood-v1` assessment under `languageAssessment`, route
`english-language-gate-rejected`, and one `translate-input-to-english / likely-non-english` gap rather than a guessed
translation. It preserves the incoming session and has empty consulted-KB, used-KB, value, and provenance sets. The result may additionally expose grounding, a
typed-task witness, heuristic approximation and request-plan receipts, grounded realization details, Language Agent
normalization receipts, or profiler measurements. It does not yet promise a general answer-confidence object, a
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
consulting, or returning a KB in ordinary failure grounding does not make it used. The explicit
`heuristic-request-synthesis` route is the narrow exception: records admitted and realized into cited sentences in its
`PARTIAL` artifact are source-claim contributions, so their package identities appear in `usedKbVersions` and their
records in top-level provenance. Related, rejected, or merely retrieved grounding entries never become contributors.

Human-readable output may be concise, but a machine-readable result must be available for benchmark evaluation and agent diagnostics.

For a planned synthesis result, interactive output has two explicit visual regions. A dimmed
`Thinking · symbolic processing` region reports the request plan, output contract, evidence admission, exact
construction-strategy path, construction confidence, and authority boundary. A normal `Answer` region then contains
only the coherent user-facing document. This thinking region is an inspectable deterministic execution summary, not
private chain-of-thought and not additional evidence.

When the runtime cannot answer but returns ordinary related KB records, one-shot JSON keeps the primary `answer`
unchanged and serializes `grounding` separately. Interactive output prints the primary status and answer first, then a
visibly separated “Related KB evidence — not an answer” section. `/trace` distinguishes answer premises from grounding
search receipts and exposes incomplete coverage. Only a request recognized before retrieval under DS022 may enter the
separately named grounded synthesis route; its `PARTIAL` answer visibly cites realized source claims and states the
remaining gaps. A generic inability result cannot acquire that route after retrieval merely because records exist.

### 9. Determinism and reproducibility

The durable reproducibility envelope records the system commit or content-addressed worktree, configuration, KB
versions, planner policy, random seed, external-model configuration when used, resource budgets, and measured
resources. Deterministic modes must reproduce the same parse, plan, and answer from the same inputs and packages.

That full envelope is not yet attached to every ordinary `ask` result. Current public live benchmark rows record a
content-addressed source-tree digest, runtime identity, replay command, requested memory policy, sampled peak RSS, and
wall time. A row claimed as current additionally carries the DS010 bounded strategy-configuration snapshot and
per-stage aggregate execution-receipt summaries. The current ordinary runtime result records selected KB versions and
model/memory policy; `--profile` adds
the implemented profiler fields. It does not promise a Git identity, seed, complete CLI configuration, or measured
resources without profiling. Frozen benchmark and external-process receipts carry their own execution identities under
DS010 and DS013. Documentation must not project those receipt-only fields onto every inference call.

### Required command families

The canonical executable is `node src/cli.mjs` or the package bin `eslm`. With no subcommand it starts an interactive session. `ask` executes one text task. `run` consumes plain text or JSONL and emits JSONL. `kb list` reports repository-managed, public-provider, and explicitly registered packages. `kb show` inspects one entry. `kb compile` validates canonical JSONL, deterministically writes inert JSON shards and a hashed manifest, and deliberately leaves the result unregistered. `kb register` validates a manifest before adding its package to the local catalog. `kb unregister` removes only that catalog entry. `kb build` rebuilds repository-managed packages from their canonical inputs or frozen source adapters, and `kb validate` opens and audits existing packages. None of these operations silently deletes source or eagerly loads every record as a side effect of catalog inspection.

`train prepare` hashes the visible source or benchmark pool, records its split and explicit target namespace, and writes a packet. The operator may name the packet path; otherwise the command uses an operating-system temporary directory and does not recreate a persistent `training/work/` tree. `train candidate` creates an untrusted candidate skeleton when a human or external workflow needs one without invoking an agent. `train run` creates an isolated workspace, copies exactly one self-contained repository-owned skill, computes `BASELINE_ANALYSIS.jsonl` with the trusted Stage A frontend and planner, and starts an explicitly configured ephemeral Coding Agent subprocess. The baseline contains normalized input, accepted parser structures, plans, unresolved items, and unsupported spans; it is diagnostic output and does not supersede source evidence. The subprocess receives the packet, copied skill, assignment, embedded authorized data, and the baseline, but it does not receive hidden test paths or arbitrary host environment variables.

`train validate` currently validates an existing compiled KB package through the trusted host. Candidate canonical JSONL is checked first by the portable validator included in the copied skill and again by `kb compile`, whose host validator is authoritative. Candidate compilation, package validation, catalog registration, and publication are intentionally distinct gates. Promotion is not yet exposed as a command: when implemented, it must remain an explicit reviewed operation with a named source candidate and destination version; passing tests or compiling successfully must never authorize promotion by itself.

Dataset acquisition, source probing, compilation, evaluation, benchmark execution, external prediction export/import,
and documentation publication remain explicit operations. No direct or deployed-runtime inference path downloads data
or calls an agent. The DS013 operator-side proposal wrapper is the only agent-call exception exposed beside inference
commands. The general CLI composes it by default and discloses the external boundary; `--external-language-agent` or
interactive `/normalize on` explicitly restates that policy. Likely non-English input may request translation before
English-only repair; English or indeterminate input still runs through direct execution and DS022 local recovery before
it may request simplification. `--no-external-language-agent` or `/normalize off` selects the entirely local profile.
Network acquisition is never an implicit effect
of asking a question, and no dataset credential is inferred from the normalization profile.

### Interactive commands and session state

The current interactive command set exposes help, installed and loaded KBs, model and selected versions, memory policy,
DS022 work policy, strategy inventory and exact execution selection, normalization policy, last trace, last available
execution profile, whole-session clearing, bounded examples, and the smoke regression. `/work` displays every
effective heuristic, Horn, provider, and grounding bound;
`/work PROFILE` rebuilds the runtime with `quick`, `balanced`, `deep`, or `exhaustive-bounded` while retaining selected
KB identities and accepted session state. `/model` reports the retained fact count; structured results expose the full
overlay and provenance.
Fine-grained fact inspection and retraction plus interactive clarification remain acceptance criteria for a later
command revision. Session assertions retain provenance, and an uncertain conclusion is never inserted as a fact.

Readline Tab completion covers slash-command names, the declared values of `/normalize`, `/memory`, `/work`, and
`/strategies`, exact built-in identities after `/strategy STAGE=`, and
cataloged or registered KB identifiers for `/load` and `/unload`, including the active comma-separated identifier
fragment. Completion proposes syntax and identifiers only. It never executes a command, loads a KB, changes a work or
normalization profile, selects a strategy, or mutates session state. Ordinary language input is returned unchanged so
pressing Tab while composing a question cannot rewrite its meaning.

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

Interactive `/examples [PAGE] [SEED]` selects a reproducible, stratified page over the exact default generated
regression catalog executed by `/smoke`. A page contains 24 cases and round-robins the eight heuristic oracle levels and
the established core capability groups before taking a second example from a stratum. Thus the first page visibly
contains direct, repair, decomposition, request, safety, preference, state, relation, and typed-task work instead of
an accidental run of adjacent templates. Page order is presentation only; no case is omitted or duplicated.

The default catalog contains exactly 4,096 cases: 1,200 fresh instantiations from all 43 DS022 heuristic-development
technique shapes and 2,896 instantiations from the 26 established core templates. The heuristic portion retains its
eight honest oracle levels: answer execution, semantic-query execution, candidate selection, query-local
decomposition, request execution, request planning, proposal-only preservation, and safety abstention. The core
portion retains class and relation queries, state and
temporal execution, open-world controls, preference scoring, scalable Boolean entailment, and categorical logic.

The shared default seed is stable for both commands; an explicit seed deterministically changes nonce surfaces without
changing the contract distribution. `/smoke [COUNT] [SEED]` executes the requested bounded mixture, defaults to 4,096,
and accepts 1 through 100,000. It reports pass, fail, skip, elapsed time, source-family capability tags, and aggregate
counts by contract level, observed language route, and observed status. The command constructs a fresh offline
regression runtime containing the generic core, QUICK fixture package, balanced work policy, and default exact strategy
set, regardless of the interactive session's selected KBs or policies. Consequently a prior `/load`, `/unload`,
`/memory`, `/work`, `/strategy`, or `/normalize` command cannot add evidence, remove a strategy, change an oracle,
turn expected unknowns into answers, skip QUICK cases, or change the smoke result.

DS010 owns the generated corpus membership, metamorphic semantics, capability groups, expected-value validation, and
scientific claim boundary. The CLI owns only selection, invocation, and truthful presentation: every typed template
must call the same public execution boundary used by adapters, and source-family tags never turn generated cases into
public benchmark evidence.

Smoke output is review evidence, not a progress animation. It prints one representative execution for every template
encountered: the input text, typed oracle or expected status and semantic values, actual status, actual human answer or
preference scores, and actual semantic values. Heuristic cases execute through `HeuristicLanguageRuntime` with
grounding disabled and are scored by the same typed oracle assessor as the generated development runner. Established
direct, preference, and typed-task cases use their ordinary public engine boundaries. Every additional generated case
still contributes to the pass/fail aggregate. A passing summary is invalid if displayed answers were fabricated or if
the command compared expectations without invoking the runtime.

### Optional operator language proposals

The CLI exposes the DS013 operator profile through the canonical flags `--external-language-agent`,
`--no-external-language-agent`, `--language-agent-model`, `--language-agent-timeout-ms`, and
`--no-normalization-cache`, plus interactive `/normalize`, `/normalize on`, and `/normalize off`. The assisted profile
is enabled by default for general CLI interaction and disclosed at startup. An operator uses the explicit local
override for sensitive input and deployed-style reproduction; canonical verification and public probe publication
construct the local profile. Product-specific normalization
flags, including the former `--no-codex-normalize`, are rejected rather than retained as aliases; scripts must use the
role-based interface.

Startup, status, structured results, and human output disclose the active adapter, model, cache policy, route, proposal
and invocation counts, original input, proposed English, host validation, and final symbolic result. The UI must say
that it is interpreting with the configured Language Agent immediately before a real invocation; it must never imply
that the agent is answering. DS013 exclusively defines the trigger, proposal feedback, absence of answer authority,
validation, cache, and failure routes. Loading a KB or changing session state never changes the Language Agent policy.

### Work profiles and bounded overrides

`--work-profile quick|balanced|deep|exhaustive-bounded` selects one immutable `eslm-work-policy-v1`; `balanced` is the
default. The CLI also accepts the validated numeric override families `--heuristic-*`, `--horn-*`, `--provider-*`, and
`--grounding-*` documented in help. Each override names one exact bound and is rejected when unknown, fractional where
an integer is required, negative, inconsistent, or above its absolute ceiling. Human startup and `/work` output show
the effective profile, while every machine result carries the complete requested/effective snapshot. A larger profile
may complete work that a smaller one could not, but it cannot alter logic, trust, tie-breaking, session authority, or
benchmark denominators. `exhaustive-bounded` means the largest finite policy supplied by this release, not an unbounded
scan.

### Strategy inventory and exact execution selection

`--strategy-preset all|language|retrieval|reasoning|construction` selects only an inventory view. Interactive
`/strategies` prints the selected view, catalog totals, `coordinated`, `instrumented-local`, and `planned` counts,
stage summaries, and the selection digest; `/strategies PRESET` changes that view. A preset does not enable, disable,
or reorder an executor and therefore cannot create a capability gap.

The inventory's `executionEnabled` field means that a policy-selectable identity is admitted by the current exact
allowlist. It does not assert that the last request invoked that strategy. A `catalogued-not-policy-gated` local owner
may still execute in the ordinary pipeline; it cannot yet be controlled by this interface. Runtime and stage receipts
remain the authority for actual execution.

`--strategy-select 'STAGE=ID[,ID];STAGE=ID'` is the execution control. The shell form must be quoted because a
semicolon separates stage assignments. Interactive `/strategy STAGE=IDS` applies the same closed syntax and
`/strategy clear` removes every exact override. The CLI validates exact built-in identity and version, stage
membership, non-empty bounded arrays, duplicate stage assignments, implementation state, and mandatory safety
identities before committing the rebuilt runtime. An invalid interactive change leaves the previous engine and
selection in place.

The current exact gates are `runtime.language.interpret`, `runtime.request.plan`, `runtime.knowledge.focus`,
`runtime.evidence.assess`, `runtime.reason.execute`, and `runtime.result.construct`. Language selection must retain
`strategy:language:direct-controlled-parser@1`; focus selection must retain
`strategy:focus:function-word-exclusion@1`. Retrieval-frontier execution, failure grounding, method planning, and
verification remain catalog-visible but non-selectable until those owners execute through the common coordinator.
The 24 local language families are the first fully coordinated built-ins. Request, focus, relevance, reasoning, and
construction allowlists are real gates around their existing owner modules and remain labeled `instrumented-local`.
No flag may select a `planned` strategy or inject an executor, path, command, or callback.

## Decisions & Questions

### Question #1: Why are benchmark status and probe separate operations?

Response: Cache presence and access authorization are operational facts, while a score requires a selected case pool, adapter, runtime configuration, oracle, and completed execution. Keeping the commands separate prevents a downloaded archive or catalog entry from being reported as measured capability.

### Question #2: Why is `/examples` a paged view of the larger smoke corpus?

Response: The 4,096-case default is useful as a regression denominator but unreadable as terminal documentation.
`/examples` exposes stable 24-case pages over that same catalog; stratification keeps every page broad enough for human
review without changing membership or execution order. `/smoke` executes the requested deterministic catalog and
provides the regression evidence. Page numbering makes omissions visible and lets a reviewer move through the corpus
without redefining the smoke denominator.

### Question #3: Why does `/smoke` print representative executions and totals?

Response: An aggregate alone cannot show whether the runtime was really invoked or whether status, route, and semantic
values were interpreted honestly. One actual input/output record per template keeps a default run readable while
exposing the computation behind the total. Contract-level, route, and status aggregates disclose what kind of pass was
obtained, and failures are always printed even when their template was already represented.

### Question #4: Why is related KB evidence not appended to the answer string?

Response: Machine consumers and scorers must be able to distinguish what the reasoner established from what retrieval
merely found relevant. A structural field preserves that boundary, while the interactive renderer can still provide a
useful, clearly labeled human view.

### Question #5: Why is a named strategy preset not an execution profile?

Response: A short named view is useful for inspecting one architectural area, but treating that view as an implicit
allowlist would silently disable unrelated mandatory work. Exact stage-to-identity selection is explicit, validated,
serialized in the work policy, and suitable for replay. The separate preset therefore changes presentation only.

### Question #6: Why does the default benchmark keep authored and generated reports separate?

Response: The authored fixture protects five deliberately readable integration contracts. The generated suite samples
many deterministic structural variants and is designed for aggregate failure discovery. Combining their numerators
would make neither result intelligible, while sequencing both commands gives the ordinary development workflow both
the small review surface and the broad diagnostic surface. Its candidate-selection level is also intentionally
narrower than complete Semantic IR execution, so the CLI must present oracle level, route, and status beside the mixed
pass rate.

### Question #7: Why does research status combine historical receipts with live governance?

Response: Historical receipts answer what a particular frozen execution measured. Current manifests, cache identity,
rights, source admission, registry composition, projection identity, and readiness answer whether that execution is
still admissible now. Reporting only the historical copy would let a tombstoned source, changed split, replaced
projection, or stale preflight continue to look current. Re-running analysis inside a status command would hide the
same distinction and create an expensive mutation boundary. The v2 result therefore preserves both evidence classes
and marks drift as `blocked`, `withdrawn`, or `superseded` without pretending that the old execution never occurred.

## Conclusion

The CLI provides one reproducible interface for construction and execution while preserving strict separation between agent-driven training, declarative package management, and offline symbolic inference.
