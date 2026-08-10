# Scope

This repository develops an Executable Symbolic Language Model (ESLM). Training-time coding agents compile trusted, prepared evidence into reviewable Node.js modules. The deployed runtime is deterministic, dependency-free, offline, and contains no LLM or coding-agent call.

`original_specs/` is preserved research source material. `.agents/skills/` contains imported project-maintenance skills and must not be edited during ESLM product work. `training/.agents/skills/` contains the repository-owned corpus-synthesis and benchmark-guided learning skills.

# Mandatory Reading Order

1. Read `README.md` and `docs/index.html`.
2. Read `docs/specs/DS000-vision-and-claims.md` and `docs/specs/DS001-coding-style.md`.
3. Read every DS file affected by the change; DS files are authoritative.
4. Inspect relevant source and tests before editing behavior.
5. For model synthesis, read `training/.agents/skills/synthesize-eslm-model/SKILL.md` completely.
6. For benchmark-guided adaptation, read `training/.agents/skills/benchmark-guided-symbolic-learning/SKILL.md` completely.
7. For specification maintenance, read the matching imported skill under `.agents/skills/`.

# Current Skill Catalog

- `gamp-specs`: creates and maintains the canonical AGENTS, HTML documentation, and contiguous DS structure.
- `review-specs`: audits specifications against instructions, theory, implementation, and tests.
- `achilles-specs`: applies only if AchillesAgentLib is explicitly adopted later.
- `antropic-skill-build`: defines portability requirements for repository-owned agent skills.
- `article-build`: applies only to a self-contained research article folder.
- `synthesize-eslm-model`: prepares and generates auditable Node.js model modules from a frozen training packet.
- `benchmark-guided-symbolic-learning`: turns benchmark failure clusters into gated KB or generic-core improvements without answer memorization or capability regressions.

# Repository Rules

- Persistent source, comments, diagnostics, specifications, and documentation are written in English.
- Use Node.js 22+ ESM `.mjs`; do not add Python, PyTorch, native add-ons, transpilers, or runtime packages.
- `docs/specs/` is authoritative. DS numbering is contiguous and `DS001-coding-style.md` defines code and test conventions.
- Do not summarize away theory or contracts. Preserve assumptions, algorithms, invariants, failure states, measurement regimes, and falsification criteria.
- Never modify `original_specs/` or imported `.agents/skills/` for product implementation.
- Runtime source under `src/` must not access networks, invoke an LLM, invoke a coding agent, execute corpus strings, use `eval`, or dynamically import corpus-provided paths.
- Treat all training and benchmark input as untrusted. Validate schemas, freeze hashes, and generate only allowlisted module shapes.
- Do not start the next larger public corpus until DS018 and DS019 requirements are met: frozen source, stratified probe, scope mapping, profiling budget, streaming adapter, compact shards, and query-directed execution. WordNet and ATOMIC establish the measured baseline but still load eagerly.
- Generated modules under `training/model/` and `training/KBs/*/model/` are executable data: deterministic, side-effect free, statically importable, and reviewable.
- Training may use a coding agent, but promotion requires local validation and evaluation. Test and benchmark splits must not be exposed in synthesis packets.
- Changes to behavior, interfaces, evaluation, or claims require synchronized DS, HTML documentation, and tests.

# Canonical Commands

- Interactive: `npm exec -- eslm` or `node src/cli.mjs`
- One question: `node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"`
- Batch: `node src/cli.mjs run --input questions.txt --output answers.jsonl`
- Public-data status: `node src/cli.mjs dataset status --dataset babi-15-en-10k-v1.2`
- Real-corpus status: `node src/cli.mjs corpus status`
- WordNet source probe: `node src/cli.mjs corpus probe --corpus oewn-2025 --archive ARCHIVE.zip`
- Runtime profiling: `node src/cli.mjs ask "QUESTION" --profile`
- Core scale profile: `npm run profile:scale`
- Knowledge modules: `node src/cli.mjs kb list` and `node src/cli.mjs ask "Can Penguin swim?" --kb animals`
- Source-derived KB examples: `node src/cli.mjs ask "Define dog" --kb oewn-2025` and `node src/cli.mjs ask "Why might apologize?" --kb atomic-2020`
- KB regeneration: `node src/cli.mjs kb build all && node src/cli.mjs kb validate all`
- Randomized source-KB check: `npm run test:kbs:random`
- Model validation: `node src/cli.mjs train validate`
- Tests: `npm test`
- Evaluation: `npm run evaluate`
- Benchmark: `npm run benchmark`
- Full verification: `npm run check`

# Key Paths

- Runtime and language core: `src/`
- Tests and immutable fixtures: `tests/`
- Training cache, repository-owned agent skills, KB builds, datasets, work, and generated model: `training/`
- Human and generated documentation: `docs/`
- Detailed specifications: `docs/specs/`
- Archived source material, not current authority: `original_specs/storycircuit_tinystories/`
