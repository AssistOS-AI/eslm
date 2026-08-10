# External evaluation cases intentionally omitted

The pilot evaluator generated 1,544 cases containing raw story text from the official TinyStories validation file. Their SHA-256 is retained in `run_manifest.json`, but the JSONL file is not packaged in order to avoid redistributing the corpus.

Recreate the exact deterministic cases by obtaining the verified file and running:

```bash
python scripts/run_validation_pilot.py \
  --input data/raw/TinyStories-valid.txt \
  --stories 5000 \
  --train-fraction 0.8 \
  --ending-items 500 \
  --output-dir results/validation_pilot_5k \
  --seed 1729 \
  --byte-order 4 \
  --word-order 4 \
  --min-word-count 2
```

Expected source SHA-256:

```text
94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4
```
