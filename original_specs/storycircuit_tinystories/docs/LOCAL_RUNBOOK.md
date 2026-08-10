# Local Experimental Runbook

## 1. Hardware profiles

The profile is a resource envelope, not a different scientific task.

| Profile | Intended machine | Corpus scale | Primary purpose |
|---|---|---:|---|
| `smoke` | any recent laptop | bundled fixture | installation and invariant check |
| `pilot` | 8 GB RAM, CPU | 25,000 stories | fast iteration and agent development |
| `workstation_8gb` | 8–16 GB RAM | moderate streaming subset | parser/rule experiments |
| `workstation_24gb` | 24–64 GB RAM | larger subset | induced grammar and baseline comparison |
| `full` | 64 GB+ or distributed | complete corpus | final scaling and publication runs |

Count tables can become large. Keep raw text streaming, use compact integer IDs, shard artifacts, and convert high-order counts to disk-backed structures before a full run.

## 2. Repository bootstrap

```bash
git init                         # optional, but recommended
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev,analysis]"
python scripts/check_environment.py
python scripts/run_smoke.py
pytest -q
```

Commit or snapshot the clean baseline. Record the source-tree hash using `python scripts/audit_package.py`.

## 3. Data acquisition

TinyStories is not included. Download from its official repository:

```bash
python scripts/download_tinystories.py --variant v2-gpt4 --split both
python scripts/download_tinystories.py --variant evaluation-prompts --split prompts
```

The downloader streams files, preserves partial downloads, writes hashes, and checks the known legacy validation hash. Do not rename files without updating profile manifests.

## 4. Corpus preparation

```bash
python scripts/prepare_corpus.py --profile configs/profiles/workstation_24gb.yaml
python scripts/corpus_profile.py \
  --input data/prepared/workstation_24gb/train.jsonl \
  --output reports/corpus_workstation_24gb.json
```

Split assignment is derived from normalized-content hashes, so changing processing after split assignment can create leakage. If normalization changes, regenerate every split under a new dataset version.

For publication, add near-duplicate and template-overlap checks. Exact deduplication alone is insufficient for synthetic corpora with recurrent prompts and structures.

## 5. Training the reference system

```bash
python scripts/train_symbolic.py \
  --profile configs/profiles/workstation_24gb.yaml
```

The current reference trainer performs three passes: byte n-grams, word vocabulary/counts, and high-precision parsing statistics. It is an executable baseline, not the full design. The full workstream adds induced constructions, discourse/rule models, and a normalized semantic mixture.

## 6. Building held-out TinyStories evaluation files

```bash
python scripts/build_tinystories_eval.py \
  --prepared data/prepared/workstation_24gb/dev.jsonl \
  --output eval/local/workstation_24gb \
  --max-stories 5000 \
  --ending-items 1000
```

This creates raw likelihood items, prefix/continuation items, and deterministic pseudo-negative ending selection. Synthetic negatives must be reported separately from official human-designed evaluations.

## 7. Core and OOD evaluation

```bash
python scripts/evaluate.py \
  --model artifacts/workstation_24gb/model.json \
  --suite configs/suites/research_full.yaml \
  --output results/workstation_24gb/research_full
```

Record at least five generation seeds. For deterministic QA and state tracking, one seed is sufficient. Save item-level predictions and do not summarize away errors.

## 8. Baselines

Recommended order:

1. byte unigram and byte n-gram;
2. word n-gram with modified Kneser–Ney;
3. current StoryCircuit reference;
4. complete StoryCircuit induced model;
5. official TinyStories-1M;
6. one larger official TinyStories checkpoint;
7. matched-data GPT baseline where hardware permits.

Use the same raw stories and evaluation items where APIs permit. Report native token perplexity and a tokenizer-independent metric such as bits per byte.

## 9. Coding-agent operation

Create a branch or copied worktree per agent. Give it only train/dev data. Store failure packets under a run-specific path. The agent may call the shadow gate but must not read shadow files.

A robust division is:

```text
agent A: corpus and contamination
agent B: construction induction
agent C: parser/compiler
agent D: discourse/coreference
agent E: state and inference
agent F: probability model
agent G: planning/realization
agent H: evaluator/red team
```

The architecture guardian reviews interface changes and merge order.

## 10. Final test protocol

Before opening test:

- freeze source tree, model artifacts, suite version, metrics, prompts, and seeds;
- run all dev and shadow gates;
- register primary hypotheses and exclusions;
- produce hashes;
- copy the test runner into a clean evaluation environment;
- run once unless a documented infrastructure failure occurs.

After test, no additional tuning may be reported under the same experiment version.
