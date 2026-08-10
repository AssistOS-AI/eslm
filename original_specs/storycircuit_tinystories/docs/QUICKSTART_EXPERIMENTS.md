# Quick Start Experiments

## 1. Verify the package

From repository root:

```bash
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -e ".[dev]"
python scripts/check_environment.py
python scripts/run_smoke.py
pytest -q
```

The smoke run uses only `data/smoke/stories.txt`. Its scores verify wiring, schemas, deterministic execution, and artifact creation. They are not evidence about TinyStories performance.

## 2. Run a validation-file pilot

The legacy validation file is small enough for a rapid end-to-end check:

```bash
python scripts/download_tinystories.py --variant legacy --split valid
python scripts/run_validation_pilot.py \
  --input data/raw/TinyStories-valid.txt \
  --stories 5000 \
  --train-fraction 0.8 \
  --output-dir results/validation_pilot
```

This creates a content-hashed local split, trains the reference byte/word/statistical model, evaluates held-out likelihood and parser coverage, runs the controlled suite, and writes an honest limitations section.

## 3. Run the pilot profile on training data

```bash
python scripts/download_tinystories.py --variant v2-gpt4 --split train
python scripts/prepare_corpus.py --profile configs/profiles/pilot.yaml
python scripts/train_symbolic.py --profile configs/profiles/pilot.yaml
python scripts/build_tinystories_eval.py \
  --prepared data/prepared/pilot/dev.jsonl \
  --output eval/local/pilot \
  --max-stories 1000
python scripts/evaluate.py \
  --model artifacts/pilot/model.json \
  --suite configs/suites/core.yaml \
  --output-dir results/pilot/core
```

## 4. Compare with a causal LM

Install optional neural dependencies:

```bash
pip install -e ".[neural]"
```

Then:

```bash
python scripts/evaluate_hf_baseline.py \
  --model roneneldan/TinyStories-1M \
  --suite configs/suites/core.yaml \
  --output results/baselines/tinystories-1m
python scripts/compare_runs.py \
  results/pilot/core/metrics.json \
  results/baselines/tinystories-1m/metrics.json
```

The Hugging Face adapter scores only tasks supported by a causal LM. QA and structured tasks need a declared prompting/decoding protocol; unsupported tasks remain unsupported rather than being silently omitted.

## 5. Generate the controlled evaluation suite

```bash
python scripts/generate_eval_suite.py \
  --output eval/generated \
  --items-per-family 200 \
  --seed 1729
python scripts/audit_package.py
```

Generated cases are deterministic. Change the seed only as a new versioned suite, never while tuning against the same test.

## 6. Recommended first coding-agent assignment

Do not begin with unrestricted story generation. Begin with **P2 construction induction**, because the reference kernel already shows the expected downstream interfaces while its parser coverage remains the main bottleneck.

Give the agent:

```text
agents/MASTER_CODING_AGENT_PROMPT.md
agents/prompts/03_CONSTRUCTION_INDUCTION.md
design_specs/DS-005-CONSTRUCTION-GRAMMAR-INDUCTION.md
design_specs/DS-006-INCREMENTAL-PARSING-AND-COMPILATION.md
docs/ANNOTATION_GUIDE.md
```

Require a 500-story annotated development set, construction manifests, text-to-IR metrics, and an ablation against the hand-seeded parser before accepting generated rules.
