# TinyStories adapter

## Sources

- Paper: `https://arxiv.org/abs/2305.07759`
- Dataset: `https://huggingface.co/datasets/roneneldan/TinyStories`
- Checkpoints: `https://huggingface.co/roneneldan`

## Data

Use the official V2 GPT-4 train and validation files for the main run. Preserve source hashes and do not parse the Hugging Face row view as story boundaries; the raw text files use `<|endoftext|>` delimiters. The acquisition script handles the official raw files.

## Evaluation

1. Score a frozen validation sample and, when tractable, the complete validation file.
2. Generate from every official evaluation prompt with at least three seeds.
3. Compare against official TinyStories checkpoints through the HF causal adapter.
4. Report the tokenizer-independent bits-per-byte metric and checkpoint-native perplexity separately.
5. Perform prompt-constraint, entity/state, repetition, novelty, and parse-back analysis on all generations.

## Generation judging

The original work used multidimensional GPT-4 judging. This project records automated invariants first. Optional model judges must be versioned and reported as subjective evaluation, not as symbolic correctness.
