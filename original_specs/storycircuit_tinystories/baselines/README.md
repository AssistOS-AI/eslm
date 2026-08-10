# Matched Neural Baselines

The repository supports two neural comparison paths.

1. `scripts/evaluate_hf_baseline.py` loads official Hugging Face causal-LM checkpoints, including TinyStories checkpoints, when `transformers` is installed.
2. The self-contained byte Transformer in this directory uses only PyTorch and is trained on exactly the same content-hashed corpus split as StoryCircuit.

The byte model is not an architectural replica of the official GPT-Neo TinyStories models. Its value is experimental control: unrestricted UTF-8 coverage, identical raw data, tokenizer-independent BPB, declared parameter count, and no dependency on a remote model registry at evaluation time.

## Workflow

```bash
python scripts/prepare_byte_corpus.py \
  --input data/prepared/pilot/train.jsonl \
  --output data/prepared/pilot/train.bytes.u16

python scripts/train_byte_transformer.py \
  --tokens data/prepared/pilot/train.bytes.u16 \
  --config configs/neural/byte_1m.yaml \
  --output artifacts/neural/byte_1m.pt \
  --device cuda

python scripts/evaluate_torch_baseline.py \
  --checkpoint artifacts/neural/byte_1m.pt \
  --suite eval/local/pilot/suite.yaml \
  --output-dir results/neural/byte_1m \
  --device cuda
```

For a pipeline smoke test, override `--steps 5`. Such a run proves only that gradients, checkpointing, and evaluation work.

Report checkpoint bytes, actual parameter count, tokens and optimizer steps, context length, hardware, wall time, and energy if available. Match data volume before interpreting model-family differences.

The current profiles instantiate to 860,928; 2,869,504; and 8,033,280 trainable parameters respectively. Names are approximate size classes; always report the measured count from the checkpoint.
