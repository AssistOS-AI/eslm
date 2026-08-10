# Package Index

## Start here

- `README_RO.md` — Romanian overview, commands, and current evidence.
- `PROJECT_CHARTER.md` — research question, scope, hypotheses, and integrity constraints.
- `reports/EXPERIMENT_STATUS.md` — what is implemented, executed, and still open.
- `docs/LOCAL_RUNBOOK.md` — local pilot/full workflow.
- `agents/MASTER_CODING_AGENT_PROMPT.md` — complete handoff prompt.

## Theory

The `theory/` directory develops the executable symbolic language-model hypothesis, task/capability taxonomy, StoryIR, agentic program induction, probabilistic scoring, falsification, and roadmap.

## Specifications

The `design_specs/` directory contains DS-001 through DS-020. Treat them as independently assignable workstreams. Interface-level contracts are under `architecture/`, with machine-readable schemas under `schemas/`.

## Executable implementation

- `src/storycircuit/` — reference symbolic kernel and evaluators;
- `baselines/` — self-contained PyTorch byte Transformer;
- `scripts/` — data, training, evaluation, audit, pilot, and scaling commands;
- `configs/` — symbolic, evaluation, and neural profiles;
- `tests/` — unit and integration tests.

## Evaluation

- `eval/generated/` — 1,600 deterministic controlled items;
- `eval/adapters/` — external benchmark integration contracts;
- `eval/generators/` — parameterized OOD suite construction;
- `BENCHMARK_CARD.md` — limitations and reporting rules.

## Executed results

- `results/smoke/` — symbolic package smoke;
- `results/neural_smoke/` — PyTorch pipeline smoke;
- `results/validation_pilot_5k/` — verified official-validation pilot, excluding raw cases;
- `results/count_scaling_probe_5k/` — data/order scaling grid;
- `reports/VALIDATION_PILOT_FINDINGS.md` — interpretation;
- `reports/CONTROLLED_SUITE_FINDINGS.md` — controlled capability profile.

## Integrity

- `MANIFEST.sha256` — generated before packaging;
- `DATA_CARD.md`, `MODEL_CARD.md`, `BENCHMARK_CARD.md` — disclosure documents;
- `THIRD_PARTY_NOTICES.md` — external data and software notice.
