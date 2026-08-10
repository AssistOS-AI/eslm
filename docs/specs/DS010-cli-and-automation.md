---
id: DS010
title: CLI, Interactive Use, Batch Automation, and Working Directories
status: implemented
owner: interface
summary: Defines one `eslm` interface for chat, files, training, evaluation, benchmarks, result imports, and documentation publishing.
---

# DS010 CLI, Interactive Use, Batch Automation, and Working Directories

## Core Content

### Entry point

`package.json` exposes `eslm` from `src/cli.mjs`. Direct `node src/cli.mjs` remains the dependency-free canonical invocation. With no command, the CLI starts interactive chat. Commands return nonzero status and a concise `eslm:` diagnostic on failure.

Path lookup tries the current working directory and then the repository root derived from the CLI module. Consequently `node ../src/cli.mjs ...` works from `training/`, and installed bin use does not depend on a fixed shell directory.

### Interactive mode

The prompt is `eslm>`. Interactive mode starts with installed public source-derived KBs and does not load QUICK. QUICK is an authored fixture pack and remains explicitly selectable for tutorials and regressions. `/help` explains the purpose and effect of every command. `/kbs` reports ready and loaded modules with roles and counts. `/load all` selects every installed public KB; `/load` and `/unload` also accept names, title or role words, glob patterns, and conservative approximate spellings. Ambiguous matches are reported rather than guessed. `/model`, `/memory`, `/trace`, and `/profile` render coherent human text instead of JSON. `/examples` prints every tested positive, unknown, and unsupported group without requiring an ID. `/clear`, `/quit`, and `/exit` control the session. Corrections are shown when tolerant normalization altered input.

Interactive state is explicit and bounded. The CLI passes the context returned by the prior answer, including last entity and temporary session entities/facts. Supported English assertions can therefore be queried in the same input or later turns. The CLI does not edit the promoted model, write conversation logs, or use network services by default.

### One-shot and batch mode

`ask` returns one pretty-printed JSON object. Every response discloses `model.id`, active `model.knowledgeBases`, and `model.benchmarkComparable`, including unsupported and unknown outcomes. `run` reads a plain text file as one question per nonempty line or JSONL records with `id`, `text`, and future optional language/context fields. It emits one JSON object per line to stdout or `--output`.

Batch output preserves stable ids and includes status, answer, normalized input, query, values, provenance, and context. This is the preferred interface for automated tests, integrations, and external comparison prediction generation.

The global `--profile` option adds initialization and per-query `eslm-profile-v1` data. `--memory-mb N` and `--memory-policy auto|eager|lazy` control public-KB residency under DS021. `--color auto|always|never` controls human styling; automatic color appears only in an interactive terminal. JSON, JSONL, files, evaluation, benchmark, trace data, and profile records never contain ANSI escapes. Profiling is diagnostic metadata and must not change semantic values, status, provenance order, or context.

Readable memory output distinguishes automatic eager selection, explicitly forced eager loading, explicitly forced lazy loading, and budget-triggered adaptive selection. It must not claim that full loading is active when the user forced lazy providers.

### Training commands

`train prepare` validates and hashes a JSONL corpus and writes an authorized packet. `--split train` includes records and marks them agent-visible; other splits omit records. `train candidate` creates isolated candidate work from a train packet. `train validate` scans and semantically validates a promoted or candidate model directory.

There is no CLI command that invokes a coding agent. Agent choice, credentials, and training cost belong outside the deployed tool. There is also no automatic promotion command in v0.1. `train prepare --profile` writes an `eslm-profile-v1` sidecar beside the packet.

`dataset catalog` lists exact dataset IDs and stage fields. `dataset fetch`, `prepare`, `analyze`, and `status` operate on one named definition. Fetch and preparation are explicit network/data operators, never implicit side effects of inference. Task 16 learning uses the DS020 pool and evaluation scripts; the older dataset `analyze` subcommand remains Task 15-specific and rejects Task 16 rather than emitting a misleading Task 15-shaped analysis.

`corpus catalog` lists persistent public knowledge sources in priority order and their semantic roles. `corpus status` reports source cache, probe, prepared, and generated artifact presence. `corpus probe --corpus oewn-2025 --archive FILE` is the only implemented source probe; it analyzes a local official archive, profiles the scan, publishes the report, and emits no model. Fetch, prepare, and build actions are added source by source only after DS018 and DS019 gates are implemented; the CLI must not offer a generic command that begins an unbounded dump download.

`kb list` reports QUICK, its inspectable components, and installed public KB inventories. `kb show ID` displays one source. `kb build ID|all` regenerates QUICK or invokes the deterministic WordNet/ATOMIC Node compiler. `kb validate ID|all` checks v1 graphs or source-specific public indexes and smoke proofs. The global `--kb` option accepts one ID, comma-separated IDs, or `all` and applies to interactive, one-shot, batch, evaluation, and benchmark construction. Noninteractive commands remain base-model-only unless `--kb` is explicit, which prevents hidden source exposure in benchmark runs.

### Evaluation and benchmarks

`evaluate --suite` executes internal capability cases. `benchmark catalog` lists public adapter families and official sources. `benchmark references` lists curated paper-reported results and why each is direct, reference-only, or context-only. `benchmark run --suite` runs a normalized local suite. `benchmark export` emits label-free cases with deterministically shuffled preference options. `benchmark score-predictions` applies the local oracle to external JSONL predictions. `benchmark import-results` validates an aggregate external JSON manifest and assigns comparability status.

`--publish` writes latest JSON plus an HTML rendering under `docs/results/`. Publishing affects documentation only and never model behavior.

### Output and error stability

Human chat text may improve while structured fields remain versioned. Automation should use the JSON contract and protocol version. Errors identify missing command options, invalid JSON line number, unsupported model format, or policy violation.

No inference command downloads benchmark data. Dataset acquisition is an explicit, license-aware `dataset fetch` operator with a frozen expected archive hash. This keeps runtime offline and avoids changing benchmark versions without review.

### Security

Input paths are user-authorized CLI parameters. Output files are overwritten only when explicitly named by the user or when `--publish` selects known latest-report paths. Corpus contents do not become shell commands, import paths, or generated code during runtime.

### Tested CLI tutorial

`docs/cli.html` is the operational tutorial for interactive conversation, one-shot JSON, batch files, training preparation, validation, evaluation, benchmarks, and external prediction exchange. Its promoted-model examples are executable contracts, not illustrative fiction.

`tests/tutorial.test.mjs` must execute every documented conversation example and verify status, semantic values, answer text, correction behavior where relevant, and derived proof behavior. When training promotes different entities, facts, rules, constructions, aliases, or realization forms, the same change must update the tutorial and its test. A model promotion is incomplete while the default tutorial demonstrates stale knowledge.

## Decisions & Questions

### Q1. Why does `ask` return JSON instead of only a sentence?

Response: One-shot use is frequently automated, and provenance/status are central to ESLM. Interactive mode provides the concise sentence view.

### Q2. Should the CLI call external model APIs for comparison?

Response: No. It exports inputs and imports result manifests or predictions generated by separate tools. This preserves credential and evidence boundaries.

### Q3. Should batch input accept a single full document?

Response: A future explicit document/query schema should do so. Treating every line as independent is intentionally simple and unambiguous in v0.1.

### Q4. Why are tutorial examples tied to the promoted model?

Response: The tutorial is the shortest reproducible demonstration of what the installed repository actually does. Keeping examples under test prevents documentation from describing commands or answers that no longer exist after model synthesis.

### Q5. Why must `--kb` be explicit rather than stored as a global default?

Response: Explicit selection keeps runs replayable, reduces accidental benchmark contamination, and makes the active fact/rule scope visible in command history and report metadata. A future profile may name a selection, but it must still serialize those IDs into the run record.

### Q6. Why does `/examples` print the complete catalog?

Response: The command is a discovery interface, not an internal test selector. Requiring undocumented IDs prevented users from seeing the supported boundary. The same generated catalog drives regression tests, and QUICK-dependent entries disclose that requirement.

### Q7. Why can `/memory` report lazy loading without a memory number?

Response: The user may force `lazy` as an execution policy for diagnostics or constrained deployment. A numerical target is needed only for adaptive planning; readable output states whether the policy was automatic, explicitly eager, explicitly lazy, or budget-triggered.
