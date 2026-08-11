# Scope

This repository develops an Executable Symbolic Language Model (ESLM): a deterministic symbolic runtime, a declarative knowledge-package format, and an offline toolchain that compiles evidence into reviewable data. Training-time coding agents may analyze prepared training evidence and propose declarative records. The deployed runtime never calls an LLM or coding agent and never executes knowledge-base content as source code.

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
- Runtime source under `src/` must not access networks, invoke an LLM or coding agent, execute corpus strings, use `eval`, or dynamically import corpus-provided paths.
- Knowledge bases are declarative data under `training/KBs/<id>/canonical/` and `training/KBs/<id>/package/`. KB payloads must not be JavaScript modules. Only trusted runtime/compiler code is executable.
- Treat all training, document, corpus, and benchmark input as untrusted. Validate schemas, freeze source and packet hashes, separate train/development/test visibility, and compile only allowlisted record and package shapes.
- The generic core contains reusable language, task, planning, inference, provenance, trust, and resource-control mechanisms. Domain facts and source-specific semantics belong in KB packages or explicit adapters.
- Training may invoke Codex only as an isolated subprocess through the training runner and a copied self-contained skill. Agent output is an untrusted candidate until schema, compiler, audit, regression, evaluation, and promotion gates pass locally.
- Test and hidden benchmark splits must never be exposed to a synthesis subprocess. Development-visible failures may guide changes only through clustered, generalizable evidence.
- Keep caches and downloaded immutable sources under `training/.cache/`. Do not commit transient agent workspaces, candidates, or a global executable generated model.
- Changes to behavior, interfaces, package schemas, evaluation, measured results, or claims require synchronized DS files, detailed HTML documentation, and tests.

# Runtime Defaults

- The default runtime is Stage A: deterministic English controlled-language parsing, explicit task frames, capability-aware plans, direct retrieval, safe Horn deduction, provenance, structured gaps, and declarative KB packages.
- The core starts without domain knowledge. `quick` is the small deterministic smoke-test KB. `oewn-2025` and `atomic-2020` are source-derived, query-directed JSON packages loaded within explicit memory policy.
- Results use `eslm-runtime-result-v1` and expose status, answer, normalized input, parsed query, task frame, selected plan, values, provenance, reasoning trace, used KB versions, unresolved subgoals, and memory policy.
- Training packets use train-visible records only. A Codex subprocess receives one packet and one copied skill inside an isolated workspace; it cannot mutate the host repository.
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
- Training packet: `node src/cli.mjs train prepare --input tests/fixtures/training.jsonl --namespace example-kb --output /tmp/eslm-packet.json`
- Isolated Codex dry run: `node src/cli.mjs train run --packet /tmp/eslm-packet.json --output /tmp/eslm-agent --skill document-to-kb-builder --dry-run`
- Dataset status: `node src/cli.mjs dataset status --dataset babi-15-en-10k-v1.2`
- Corpus status: `node src/cli.mjs corpus status`
- Runtime profiling: `node src/cli.mjs ask "QUESTION" --profile`
- Tests: `npm test`
- Evaluation: `npm run evaluate`
- Benchmark: `npm run benchmark`
- Documentation matrix/check: `npm run docs:matrix` and `npm run docs:check`
- Full verification: `npm run check`

# Key Paths

- CLI and orchestration entry points: `src/`
- Interactive presentation and operator diagnostics: `src/interface/`
- Declarative KB schema, compiler, loader, catalog, and projection: `src/kb/`
- Capability registry, planning, and inference: `src/reasoning/`
- Isolated coding-agent training runner: `src/training/`
- Tests and immutable fixtures: `tests/`
- Immutable downloads and prepared source caches: `training/.cache/`
- Repository-owned training and audit skills: `training/.agents/skills/`
- Canonical records and compiled KB packages: `training/KBs/`
- Human-facing HTML documentation: `docs/`
- Authoritative detailed specifications: `docs/specs/`
- Archived research source, never current authority: `original_specs/`
