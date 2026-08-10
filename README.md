# Executable Symbolic Language Model

ESLM is an experiment in compiling finite evidence into an executable, inspectable language model. A coding agent may analyze training data and generate modular Node.js code during training. At inference time, ESLM uses only that frozen code and a dependency-free symbolic runtime: no LLM, embedding API, network access, or neural checkpoint.

The current v0.1 is deliberately an honest vertical slice. It normalizes noisy English input, detects common question and assertion forms, resolves aliases, learns temporary session facts, retrieves indexed model-plus-session evidence, performs bounded deduction, thresholded induction, and guarded abduction, tracks provenance, and realizes short answers. It does not claim open-domain language competence. Unsupported, ambiguous, and under-evidenced requests are explicit outcomes rather than invitations to hallucinate.

The first completed public run uses bAbI v1.2 Task 15 English 10k: 10,000 agent-visible train episodes, 20 synthesis chunks, and 1,000 held-out test episodes. The current model scores 1,000/1,000 on that narrow deduction task without storing training-story answers. This is a reasoning diagnostic, not the project's future knowledge source.

The near-term knowledge queue is Open English WordNet 2025, ATOMIC 2020, filtered English ConceptNet, and a bounded GeoNames countries-and-capitals pack. The first complete WordNet probe has inventoried 107,519 synsets and 185,129 senses without generating a KB; its polysemy and field-shape findings now drive the sense-aware model v2 design. Wikidata is deferred to optional dated thematic packs and will never be treated as a near-term full-dump KB. Three existing hand-authored KBs remain regression fixtures only and are excluded from knowledge-training claims.

## Try it

```bash
npm test
node src/cli.mjs
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Jhon is a man. Is Jhon going to die?" --kb child-basic
node src/cli.mjs kb list
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
  .agents/           self-contained coding-agent synthesis instructions
  input/             generated KB sources and locally downloaded public benchmark data
  model/             promoted experiment model and optional generated KB modules
docs/                 detailed HTML documentation, DS specifications, latest reports
original_specs/       archived source material; not current project authority
```

Training is program synthesis, not parameter optimization. Evaluation datasets and knowledge corpora have separate registries. A coding agent designs source semantics, inference policies, module boundaries, and index strategies; deterministic Node.js adapters perform exhaustive validation and compilation. `train validate` checks safety and semantic invariants before a candidate can be evaluated. Knowledge profiles remain independently selectable with `--kb`, and selection is always recorded in evaluation metadata.

Large-corpus training is currently gated. The v0.1 full-array and startup-closure model is not approved for WordNet or larger sources. The complete WordNet probe and profiling report now exist; streaming preparation, compact relation-and-scope shards, sense-aware resolution, query-directed reasoning, and explicit time, space, domain, fictional-world, perspective, and hypothetical-branch semantics remain required before the first real build. See [the scalability review](docs/scalability.html).

## Comparison policy

The benchmark portfolio targets BLiMP, bAbI, CLUTRR, Entity Tracking, EWoK, Story Cloze, and SimpleQA through native Node.js adapters. V0.1 implements and has run the Task 15 adapter. Task 16 has been fetched and prepared into 10,000 train and 1,000 test cases, but all synthesis chunks remain pending and it has no candidate or score. Dataset files are cached locally and not vendored. External model predictions or published result manifests can be imported only with protocol and dataset hashes; results with different prompts, splits, graders, or evidence regimes are labeled reference-only rather than presented as head-to-head scores.

Use `benchmark export` to create a label-free input manifest for an external LLM runner, then `benchmark score-predictions` to score its JSONL predictions with the local oracle. ESLM never needs that runner's SDK or credentials.

Read [the documentation](docs/index.html), inspect the [knowledge-base catalog](docs/knowledge-bases.html), and use the tested [CLI tutorial](docs/cli.html). Read [DS000](docs/specs/DS000-vision-and-claims.md) before extending claims or architecture.
