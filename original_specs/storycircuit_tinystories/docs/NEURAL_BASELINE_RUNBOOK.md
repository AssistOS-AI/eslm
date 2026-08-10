# Neural Baseline Runbook

## Official checkpoints

When Hugging Face Transformers is available:

```bash
pip install -e ".[neural]"
python scripts/evaluate_hf_baseline.py \
  --model roneneldan/TinyStories-1M \
  --suite eval/local/pilot/suite.yaml \
  --output-dir results/baselines/tinystories-1m \
  --device cuda
```

Repeat with at least one larger official checkpoint. Record exact model revision and tokenizer files.

## Matched pure-PyTorch baseline

Prepare the same training split:

```bash
python scripts/prepare_byte_corpus.py \
  --input data/prepared/pilot/train.jsonl \
  --output data/prepared/pilot/train.bytes.u16
```

Train the approximate one-million-parameter profile:

```bash
python scripts/train_byte_transformer.py \
  --tokens data/prepared/pilot/train.bytes.u16 \
  --config configs/neural/byte_1m.yaml \
  --output artifacts/neural/byte_1m.pt \
  --device cuda
```

Evaluate on the natural and shared LM families:

```bash
python scripts/evaluate_torch_baseline.py \
  --checkpoint artifacts/neural/byte_1m.pt \
  --suite eval/local/pilot/suite.yaml \
  --output-dir results/baselines/byte_1m \
  --device cuda
```

## Matching rules

- identical content-hashed train/dev/test stories;
- identical number of visible bytes or stories;
- BPB as cross-tokenizer likelihood metric;
- identical ending candidates and generation prompts;
- separately report context length;
- separately report parameter count, checkpoint bytes, optimizer states, and training FLOPs/time;
- no neural access to protected labels not available to the symbolic system;
- no semantic teacher data in a nominally matched raw-data baseline.

The byte Transformer is not an official TinyStories architecture. It is a controlled baseline. Official checkpoints answer a different question: how the symbolic system compares with published small neural models.
