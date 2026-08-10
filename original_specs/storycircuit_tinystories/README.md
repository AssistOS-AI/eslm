# StoryCircuit-TinyStories

**An executable symbolic language-model research kit for TinyStories.**

The project asks how far a learned symbolic system can reproduce the capabilities of small causal language models trained on TinyStories without reducing the task to a 100-token controlled language. The proposed model, ESLM, exposes a causal-LM-compatible interface while internally using an open lexicon, weighted constructions, discourse memory, an executable story world model, induced narrative rules, planning, and verified surface realization.

The repository contains a runnable reference kernel, schemas, twenty design specifications, an evaluation harness, machine profiles, and operating instructions for coding agents. It intentionally does not redistribute TinyStories data.


## Executed evidence bundled with this release

The release includes a content-hash pilot over 5,000 stories from the verified official legacy validation file: 3,956 stories for local training and 1,044 held out. The order-4 byte model reached about **1.912 bits per byte**, while cross-story ending selection remained at **51.6%**, with the unnormalized semantic reranker at 51.4%. A count scaling grid improved BPB to about 1.882 without improving ending selection beyond chance. The controlled suite and a five-step PyTorch Transformer smoke run are also included. These runs validate the research pipeline and expose its current limits; they are not full TinyStories training results.

## Core interfaces

```python
model.score_text(text)
model.next_token_distribution(prefix, candidate_tokens=None)
model.generate(prompt, max_new_tokens, seed, temperature)
model.parse(text)
model.answer(context, question)
model.explain(trace_id)
```

The same evaluation protocol is implemented by Hugging Face causal-LM adapters, allowing comparisons with the official TinyStories 1M/3M/8M/33M checkpoints.

## Quick smoke test

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python scripts/run_smoke.py
pytest -q
```

## Full workflow

```bash
python scripts/download_tinystories.py --variant v2-gpt4
python scripts/prepare_corpus.py --profile configs/profiles/pilot.yaml
python scripts/train_symbolic.py --profile configs/profiles/pilot.yaml
python scripts/evaluate.py --model artifacts/pilot/model.json --suite configs/suites/core.yaml
```

Read `PROJECT_CHARTER.md`, `theory/00_RESEARCH_PROGRAM.md`, and `agents/AGENT_OPERATING_MANUAL.md` before modifying the implementation.
