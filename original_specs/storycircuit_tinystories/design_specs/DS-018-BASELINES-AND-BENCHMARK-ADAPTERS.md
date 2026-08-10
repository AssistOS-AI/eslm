# DS-018 — Baselines and Benchmark Adapters

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-011, DS-017

## Baseline hierarchy

The study distinguishes:

```text
frequency and n-gram baselines
finite-state / PCFG baselines
retrieval baseline
reference ESLM ablations
small neural models trained on matched data
published TinyStories checkpoints
teacher-assisted upper bounds
```

A published pretrained model is not a matched-data baseline. Both are useful and labeled separately.

## TinyStories checkpoints

Adapters target official `TinyStories-1M`, `3M`, `8M`, and `33M` checkpoints where resources permit. Model parameter counts, tokenizer, context length, revision, and artifact hash are read from the actual checkpoint rather than inferred from the name.

## Benchmark adapters

The package defines adapters or conversion guidance for:

- official TinyStories validation text and evaluation prompts;
- BLiMP-style minimal pairs;
- EWoK-style world knowledge contrasts;
- Entity Tracking;
- bAbI task subsets;
- CLUTRR relational generalization;
- Story Cloze / XStoryCloze;
- optional NarrativeQA and Abduction and Reasoning Corpus stretch tasks;
- BabyLM evaluation where the adapter can provide required logits.

Licenses and download procedures remain external. The repository does not redistribute restricted datasets.

## Fairness constraints

- same prompt text and stopping rules for generation;
- same external units for likelihood comparison;
- no hidden symbolic parser access to gold annotations during end-to-end tests;
- no neural baseline penalized for lacking symbolic traces;
- no symbolic model credited for an answer produced only from gold IR unless explicitly diagnostic;
- matched train data and compute results separated from pretrained results.

## Reference non-neural baselines

Required simple baselines prevent attributing ordinary count-model gains to the full theory:

```text
byte unigram
word unigram
word trigram with backoff
retrieval nearest-prefix continuation
entity recency heuristic
majority and lexical-overlap continuation selection
```

## Acceptance criteria

Every headline metric has at least one trivial baseline and one competitive small-LM baseline or a documented reason it cannot. Adapter tests use tiny local fixtures and never require an unannounced network download.
