# Scope

This repository develops an Executable Symbolic Language Model (ESLM): a deterministic symbolic runtime, a declarative knowledge-package format, and an offline toolchain that compiles evidence into reviewable data. Training-time coding agents may analyze prepared training evidence and propose declarative records. The deployed runtime never calls an LLM or agent and never executes knowledge-base content as source code. The general CLI is entirely local by default: it attempts direct symbolic execution, evaluates bounded explicit request force, compares any structurally licensed DS022 interpretation through parse-only Semantic IR, and finally attaches related-KB grounding when the result permits it. An operator may explicitly enable the separate DS013 Language Agent wrapper with `--external-language-agent` or interactive `/normalize on`; it may translate or conservatively simplify only after the local language routes remain `UNPARSED`. A Language Agent may be a general coding agent or a translation-focused model; the currently supported adapter invokes Codex. The wrapper is not part of deployed symbolic inference, and every accepted proposal returns through the unchanged direct parser and reasoner.

`docs/specs/` is the sole current design authority. `original_specs/` is preserved research input and must not be consulted again after a specification-consolidation task has completed. `.agents/skills/` contains imported project-maintenance skills and must not be edited during ESLM product work. `training/.agents/skills/` contains repository-owned, self-contained training and audit skills.

# Mandatory Reading Order

1. Read `README.md` and `docs/index.html`.
2. Read `docs/specs/DS000-vision-and-system-invariants.md` and `docs/specs/DS001-coding-style.md`.
3. Read every DS file affected by the change; DS files are authoritative over earlier implementation and documentation.
4. Inspect relevant source, declarative schemas, packages, and tests before editing behavior.
5. For document or corpus extraction, read `training/.agents/skills/document-to-kb-builder/SKILL.md` completely.
6. For benchmark-guided learning, read `training/.agents/skills/benchmark-guided-symbolic-learner/SKILL.md` completely.
7. For a proposed generic-core change, read `training/.agents/skills/core-change-guardian/SKILL.md` completely.
8. For KB package review, read `training/.agents/skills/kb-compiler-quality-auditor/SKILL.md` completely.
9. For specification or documentation maintenance, read the matching imported skill under `.agents/skills/`.
10. For deterministic language approximation, request planning, grounding focus, or work-budget changes, read `docs/specs/DS022-heuristic-language-approximation-and-work-policy.md` completely.
11. For strategy registration, stage coordination, confidence arbitration, per-strategy resources, selectable product profiles, or compiler-adapter architecture, read `docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md` completely.
12. For forward research on statistical relevance, complex language, verified synthesis, or grounded product evaluation, read DS023 through DS026 completely and keep research hypotheses distinct from current behavior.
13. For operator-side Language Agent normalization, read `docs/specs/DS013-language-agent-assisted-language-normalization.md` completely and keep the deployable runtime closure independent of the Language Agent subprocess module.
14. For books, manuals, technical documentation, document ingestion, or symbolic RAG work, read `docs/specs/DS014-symbolic-document-knowledge-bases-and-reasoning-retrieval.md` completely.
15. For a reasoning-method change, read `docs/specs/DS015-reasoning-method-semantics.md` completely.
16. For source acquisition or benchmark adaptation, read DS016 and DS017 completely.
17. Before compiling or routing a new large corpus, read DS018 through DS021 completely and satisfy their source gate, streaming compiler, exact routing, and cache requirements.

# Current Skill Catalog

- `gamp-specs`: maintains the canonical AGENTS, detailed HTML documentation, and contiguous DS structure.
- `review-specs`: audits specifications against instructions, theory, implementation, and tests.
- `achilles-specs`: applies only if AchillesAgentLib is explicitly adopted later.
- `antropic-skill-build`: defines portability requirements for repository-owned agent skills.
- `article-build`: applies only to a self-contained research article folder.
- `document-to-kb-builder`: turns an assigned, training-visible document packet into canonical declarative KB records with validation evidence.
- `benchmark-guided-symbolic-learner`: classifies development-visible failure clusters and proposes gated KB, method, or generic-core changes without answer memorization.
- `core-change-guardian`: challenges generic-core proposals for domain leakage, unsoundness, hidden policy, and regressions.
- `kb-compiler-quality-auditor`: checks package structure, hashes, safety constraints, provenance, and deterministic compilation.

# Repository Rules

- Persistent source, comments, diagnostics, specifications, and documentation are written in English.
- Use Node.js 22+ ESM `.mjs`; do not add Python, PyTorch, native add-ons, transpilers, or runtime packages.
- `docs/specs/` is authoritative. DS numbering is contiguous and `DS001-coding-style.md` defines code and test conventions.
- Preserve complete theory and contracts. Do not replace operational wording with summaries. Keep assumptions, algorithms, invariants, representations, failure states, measurement regimes, falsification criteria, examples, and implementation consequences explicit.
- When new authoritative instructions conflict with older material, replace the older contract. Retain older text only when it clarifies a detail the new contract leaves open and remains compatible with it.
- Never modify `original_specs/` or imported `.agents/skills/` during product implementation. After imported research has been consolidated into DS files, work only from the DS authority.
- HTML documentation explains the same contract from implementation, review, operational, and failure-analysis viewpoints. It must not be a compressed substitute for the DS files.
- Diagrams must be small, legible, and accompanied by prose that explains nodes, edges, boundaries, and exceptional paths. Prefer a left-to-right two-dimensional flow with three to five primary nodes; replace dense trees and branch fans with prose or several focused diagrams.
- Keep the documentation home-page KB and benchmark inventories synchronized with package validation, catalog metadata, adapter state, and actually published post-reset results. Never present catalog inclusion as benchmark execution.
- The deployable runtime closure under `src/runtime/engine.mjs`, `src/runtime/runtime.mjs`, deterministic DS022 language modules, and their transitive inference dependencies must not access networks, invoke an LLM or agent, start child processes, execute corpus strings, use `eval`, or dynamically import corpus-provided paths. Only the explicitly enabled DS013 operator wrapper may invoke a configured language-only Language Agent subprocess, and runtime core modules must not import it.
- Knowledge bases are declarative data under `training/KBs/<id>/canonical/` and `training/KBs/<id>/package/`. KB payloads must not be JavaScript modules. Only trusted runtime/compiler code is executable.
- Treat all training, document, corpus, and benchmark input as untrusted. Validate schemas, freeze source and packet hashes, separate train/development/test visibility, and compile only allowlisted record and package shapes.
- Resource budgets govern streaming, sharding, cache retention, and bounded execution. They must never delete or silently discard valid source examples or facts. Semantic projections must retain the complete frozen source and report valid rows outside the current language, relation, license, or quality profile as explicit coverage gaps.
- Do not start exhaustive compilation of the next large public corpus until DS018 and DS019 have frozen its source, completed a deterministic stratified probe and semantic scope mapping, profiled a bounded-memory streaming compiler, and defined compact shard access paths. Query execution must also satisfy DS020 exact routing and DS021 byte-accounted cache behavior. Existing measured WordNet and ATOMIC providers do not waive these source-specific gates.
- The generic core contains reusable language, task, planning, inference, provenance, trust, and resource-control mechanisms. Domain facts and source-specific semantics belong in KB packages or explicit adapters.
- Research extension points are statically trusted strategies governed by DS027. Runtime configuration may select only exact host-registered identities; KBs, corpora, manifests, and agent output cannot provide executors, import paths, arbiters, or resource authority. Confidence votes select or rank typed candidates and never replace reasoning semantics or witness verification.
- Never repair a benchmark with branches on benchmark names, dataset IDs, record IDs, source rows, hashes, expected answers, or entity and relation constants copied from examples. Core branches operate on semantic types, relations, task-frame operations, capability preconditions, and validated policy metadata. Every benchmark-guided core change requires renamed entities and predicates, nonce values, changed ordering, and negative or metamorphic controls. Source vocabulary, thresholds, answer domains, and conventions belong in provenance-bearing KB records or adapter metadata.
- Training may invoke Coding Agent only as an isolated subprocess through the training runner and a copied self-contained skill. Agent output is an untrusted candidate until schema, compiler, audit, regression, evaluation, and promotion gates pass locally.
- Test and hidden benchmark splits must never be exposed to a synthesis subprocess. Development-visible failures may guide changes only through clustered, generalizable evidence.
- Keep caches and downloaded immutable sources under `training/.cache/`. Do not commit transient agent workspaces, candidates, or a global executable generated model.
- Changes to behavior, interfaces, package schemas, evaluation, measured results, or claims require synchronized DS files, detailed HTML documentation, and tests.

# Runtime Defaults

- Stage A provides deterministic English controlled-language parsing, explicit task frames, capability-aware plans, direct retrieval, safe Horn deduction, provenance, structured gaps, and declarative KB packages.
- The general CLI is offline by default. It runs the direct route first. A bounded explicit request plan may preempt an accidental direct assertion parse while restoring the incoming session snapshot. Otherwise `UNPARSED` and `UNKNOWN` results enter the DS022 heuristic CNL ensemble; `SOLVED` and `PARTIAL` may also admit a structurally licensed candidate when its parse-only Semantic IR differs from the direct interpretation. Identical Semantic IR preserves the direct route, and every changed candidate interpretation remains query-local. A strict answer reached through a changed interpretation is reported as `DEFEASIBLE`; extractive request construction is `PARTIAL`. Role-focused related-KB grounding is attached only after the final local status is known.
- Language Agent normalization is disabled by default. `--external-language-agent` or interactive `/normalize on` enables it only after direct and local heuristic language recovery remain `UNPARSED`; `--no-external-language-agent` explicitly restates the local profile. One assisted episode permits at most three language proposals and may return only parser-form feedback, never answers, KB evidence, grounding, or proof state. Every accepted proposal is reparsed by the direct symbolic runtime.
- `balanced` is the default `eslm-work-policy-v1` profile. `quick`, `deep`, and `exhaustive-bounded` select other finite limits for heuristic candidates and reparses, Horn work, provider fan-out, and grounding retrieval. CLI startup flags and interactive `/work PROFILE` may change these budgets without changing logic, trust, selected KB identities, or session facts.
- All 24 deterministic language-approximation families execute through the sealed DS027 registry and stage coordinator. Exact strategy allowlists can gate language approximation, request planning, query focus, relevance features, reasoning methods, and result construction. `--strategy-preset` and `/strategies PRESET` are inventory views only; they never change execution. Retrieval execution, failure grounding, method planning, and verification remain non-selectable until their catalog entries are integrated with the common coordinator.
- The core starts without domain knowledge. `quick` is the small deterministic smoke-test KB. `oewn-2025` and `atomic-2020` are source-derived, query-directed JSON packages loaded within explicit memory policy. `babi-v1.2-language` is a small source-derived package that declares a property domain and an explicitly defeasible induction policy without embedding evaluation answers.
- Results use `eslm-runtime-result-v1`. Every text result exposes protocol, status, answer, session and episode state,
  language route, selected, consulted, and answer-contributing KB versions, unresolved subgoals, and memory policy.
  Normalized input, parsed query, task frame, selected plan, values, provenance, and reasoning are stage-dependent and
  may be absent after an early `UNPARSED`. Eligible inability results may also expose an
  `eslm-grounding-bundle-v1`: bounded related records and per-source search receipts with
  `answerSupported: false`. Ordinary inability grounding is never copied into the primary answer, values,
  provenance, or `usedKbVersions`. The separate `heuristic-request-synthesis` route may select and cite relevant
  source claims to build a `PARTIAL` extractive artifact; only those selected records enter its answer provenance and
  `usedKbVersions`, and they are presented as source material rather than deductive proof.
- Training packets use train-visible records only. A Coding Agent subprocess receives one packet and one copied skill inside an isolated workspace; it cannot mutate the host repository.
- Promotion is explicit. Candidate records do not become runtime knowledge merely because an agent generated them.

# Canonical Commands

- Interactive: `npm exec -- eslm` or `node src/cli.mjs`
- One question: `node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"`
- Batch: `node src/cli.mjs run --input questions.txt --output answers.jsonl`
- KB catalog: `node src/cli.mjs kb list`
- Register/unregister a generic package: `node src/cli.mjs kb register /path/to/manifest.json` and `node src/cli.mjs kb unregister ID`
- Compile a validated candidate: `node src/cli.mjs kb compile --input candidate/records.jsonl --output /tmp/package --id ID --version VERSION --namespace ID`
- KB build and validation: `npm run kb:build` and `npm run kb:validate`
- Small declarative KB: `node src/cli.mjs ask "Can Penguin swim?" --kb quick`
- Source-derived KBs: `node src/cli.mjs ask "Define dog" --kb oewn-2025` and `node src/cli.mjs ask "Why might apologize?" --kb atomic-2020`
- Local heuristic approximation: `node src/cli.mjs ask "Abura is an mura. All mura et bana. Is Abura eating bana?"`
- Explicit Language Agent normalization: `node src/cli.mjs ask "Este Penguin o pasăre?" --kb quick --external-language-agent`
- Deeper bounded work: `node src/cli.mjs ask "QUESTION" --kb all --work-profile deep`; interactive inspection and changes use `/work` and `/work PROFILE`
- Strategy inventory: add `--strategy-preset language|retrieval|reasoning|construction`; interactive inspection uses `/strategies` and `/strategies PRESET`. These commands only filter the inventory view.
- Exact strategy execution: add `--strategy-select 'STAGE=ID[,ID];STAGE=ID'`; interactive selection uses `/strategy STAGE=IDS` and `/strategy clear`. Language and focus selections must retain their mandatory safety identities.
- Training packet: `node src/cli.mjs train prepare --input tests/fixtures/training.jsonl --namespace example-kb --output /tmp/eslm-packet.json`
- Isolated Coding Agent dry run: `node src/cli.mjs train run --packet /tmp/eslm-packet.json --output /tmp/eslm-agent --skill document-to-kb-builder --dry-run`
- Dataset status: `node src/cli.mjs dataset status --dataset babi-15-en-10k-v1.2`
- Corpus status: `node src/cli.mjs corpus status`
- Runtime profiling: `node src/cli.mjs ask "QUESTION" --profile`
- Tests: `npm test`
- Evaluation: `npm run evaluate`
- Default internal benchmark: `npm run benchmark` runs the five-case authored fixture and then the separate
  deterministic 1,200-case generated heuristic development suite; their reports and metrics remain separate.
- Authored fixture only: `npm run benchmark:authored`
- Generated heuristic development only: `npm run benchmark:generated`; direct CLI replay uses
  `node src/cli.mjs benchmark generated --publish`, with optional `--cases` and `--seed` overrides.
- Public benchmark cache status: `node src/cli.mjs benchmark status`
- External-agent-free public portfolio assembly and live development rows: `npm run benchmark:public-probe`. The generated
  report distinguishes rows executed during assembly from stored receipts; it is not a rerun of every catalog row.
- Frozen benchmark receipt audit: `npm run benchmark:receipts:audit`; require every audited checkpoint to be current
  with `node scripts/audit-benchmark-receipts.mjs --require-current`.
- Interactive 4,096-case combined regression: run `node src/cli.mjs`, then `/smoke`; use `/examples` for a stratified representative view over all heuristic oracle levels and core groups.
- Documentation matrix/check: `npm run docs:matrix` and `npm run docs:check`
- Full verification: `npm run check`

# Key Paths

- CLI and orchestration entry points: `src/`
- Interactive presentation and operator diagnostics: `src/interface/`
- Deterministic CNL approximation, decomposition, voting, and request planning: `src/language/heuristic-*.mjs`
- Heuristic language coordination, extractive request synthesis, and work policy: `src/runtime/heuristic-*.mjs` and `src/runtime/work-policy.mjs`
- Trusted strategy descriptors, sealed registration, deterministic coordination, voting, and inventory: `src/strategy/`
- Deterministic generated heuristic benchmark and aggregate failure analysis: `src/evaluation/generated-heuristic-benchmark.mjs`
- Declarative KB schema, compiler, loader, catalog, and projection: `src/kb/`
- Capability registry, planning, and inference: `src/reasoning/`
- Isolated coding-agent training runner: `src/training/`
- Tests and immutable fixtures: `tests/`
- Immutable downloads and prepared source caches: `training/.cache/`
- Repository-owned training and audit skills: `training/.agents/skills/`
- Canonical records and compiled KB packages: `training/KBs/`
- Human-facing HTML documentation: `docs/`
- Authoritative detailed specifications: `docs/specs/`
- Reasoning method contracts: `docs/specs/DS015-reasoning-method-semantics.md`
- Heuristic language, query-focus, request-planning, and work-policy contracts: `docs/specs/DS022-heuristic-language-approximation-and-work-policy.md`
- Long-horizon research contracts: `docs/specs/DS023-statistical-symbolic-relevance-and-answer-bridge-research.md` through `docs/specs/DS026-grounded-interaction-and-product-evaluation-research.md`
- Trusted strategy extension and meta-rational coordination contract: `docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md`
- Source, adapter, corpus, routing, and cache gates: `docs/specs/DS016-source-identity-license-and-access.md` through `docs/specs/DS021-memory-budgets-and-shard-caches.md`
- Archived research source, never current authority: `original_specs/`
