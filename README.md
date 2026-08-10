# Executable Symbolic Language Model

ESLM is an experiment in compiling finite evidence into an executable, inspectable language model. A coding agent may analyze training data and generate modular Node.js code during training. At inference time, ESLM uses only that frozen code and a dependency-free symbolic runtime: no LLM, embedding API, network access, or neural checkpoint.

The current v0.1 is deliberately an honest vertical slice. It normalizes noisy English input, detects common question and assertion forms, resolves aliases, learns temporary session facts, retrieves indexed model-plus-session evidence, performs bounded deduction, thresholded induction, and guarded abduction, tracks provenance, and realizes short answers. It does not claim open-domain language competence. Unsupported, ambiguous, and under-evidenced requests are explicit outcomes rather than invitations to hallucinate.

The first completed public run uses bAbI v1.2 Task 15 English 10k: 10,000 agent-visible train episodes, 20 synthesis chunks, and 1,000 held-out test episodes. The current model scores 1,000/1,000 on that narrow deduction task without storing training-story answers. This is a reasoning diagnostic, not the project's future knowledge source.

Two real source-derived KBs are now compiled. Open English WordNet 2025 contributes 107,519 synsets, 127,311 unique lemmas, definitions, synonyms, and bounded hypernym paths. ATOMIC 2020 contributes 940,427 unique non-empty train-derived tuples under 36,940 events for defeasible intentions, prerequisites, effects, reactions, wants, obstacles, causes, order, uses, and locations. Their seeded 700-case source-exposed integration run passes every case, but it is not an independent public benchmark. QUICK combines three small authored modules for tutorials and regressions; it is not learned world knowledge.

Filtered English ConceptNet and a bounded GeoNames pack remain next only after query-directed lazy shard loading replaces eager full-KB import. Wikidata is deferred to optional dated thematic packs and will never be treated as a near-term full-dump KB.

## Try it

```bash
npm test
node src/cli.mjs
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Jhon is a man. Is Jhon going to die?" --kb quick
node src/cli.mjs ask "Is a dog an animal?" --kb oewn-2025
node src/cli.mjs ask "Why might apologize?" --kb atomic-2020
node src/cli.mjs kb list
node src/cli.mjs kb validate all
node src/cli.mjs corpus status
node src/cli.mjs ask "What is Gertrude afraid of?" --profile
node src/cli.mjs run --input tests/fixtures/questions.txt
npm run evaluate
npm run benchmark
```

The CLI finds the repository and default model from either the project root or `training/`. Plain-text batch input emits JSON Lines; JSONL input can supply `id`, `text`, and optional `language` fields.

## Repository shape

```text
src/                 stable grammar, parsing, retrieval, reasoning, realization, CLI
tests/               Node test suites and small immutable fixtures
training/
  .agents/skills/    source-synthesis and benchmark-guided learning instructions
  .cache/            ignored downloaded archives shared across builds
  KBs/               QUICK, WordNet, and ATOMIC sources, reports, and generated modules
  datasets/          ignored raw and prepared public benchmark material
  model/             promoted narrow bAbI-derived core
  candidates/        ignored unpromoted agent output
  work/              ignored packets, ledgers, and learning cycles
docs/                 detailed HTML documentation, DS specifications, latest reports
original_specs/       archived source material; not current project authority
```

Training is program synthesis, not parameter optimization. Evaluation datasets and knowledge corpora have separate registries. A coding agent designs source semantics, inference policies, module boundaries, and index strategies; deterministic Node.js adapters perform exhaustive validation and compilation. `train validate` checks safety and semantic invariants before a candidate can be evaluated. Knowledge profiles remain independently selectable with `--kb`, and selection is always recorded in evaluation metadata.

The first real builds prove that deterministic Node compilation is fast enough at this scale, but they also expose the next bottleneck: loading WordNet and ATOMIC together uses roughly 0.6 GB additional RSS because their generated shards are assembled eagerly. Query-directed loading, compact relation-and-scope shards, contextual sense resolution, and explicit time, space, domain, fictional-world, perspective, and hypothetical-branch semantics are required before ConceptNet, GeoNames, or a larger source is authorized. See [the scalability review](docs/scalability.html).

## Comparison policy

The benchmark portfolio targets BLiMP, bAbI, CLUTRR, Entity Tracking, EWoK, Story Cloze, and SimpleQA through native Node.js adapters. Only bAbI v1.2 Task 15 has been synthesized and scored locally: 1,000/1,000 on its isolated test split. bAbI Tasks 2, 3, and 16 each have 10,000 prepared train cases and 1,000 isolated test cases, but their worker ledgers remain pending and they have no candidate or score. All other named suites are planned diagnostics, not implemented results. Dataset files are cached locally and not vendored. External predictions or published results with different prompts, splits, graders, or evidence regimes remain reference-only.

Use `benchmark export` to create a label-free input manifest for an external LLM runner, then `benchmark score-predictions` to score its JSONL predictions with the local oracle. ESLM never needs that runner's SDK or credentials.

Read [the documentation](docs/index.html), inspect the [knowledge-base catalog](docs/knowledge-bases.html), see the exact [public benchmark ledger](docs/benchmarks.html), and use the tested [CLI tutorial](docs/cli.html). Read [DS000](docs/specs/DS000-vision-and-claims.md) before extending claims or architecture.
