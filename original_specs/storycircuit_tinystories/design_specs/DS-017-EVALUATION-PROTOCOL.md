# DS-017 — Evaluation Protocol

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** DS-001, DS-011 through DS-016

## Goal

Evaluate ESLM through an interface usable by symbolic and neural models, with separate measures for language modeling, understanding, reasoning, generation, complexity, and reliability.

## Adapter contract

Every model adapter implements:

```python
metadata()
score_text(text)
score_continuations(prefix, candidates)
generate(prompt, generation_config)
```

Optional extensions:

```python
parse(text)
answer(story, question)
simulate(ir)
explain(result_id)
```

Core aggregate results use only shared methods. Optional methods diagnose causes.

## Suite groups

1. **likelihood:** validation NLL, shared-token perplexity, bits-per-byte;
2. **minimal pairs:** grammar and semantic preference;
3. **state tracking:** location, possession, attributes, identity, deletion;
4. **reasoning:** temporal, causal, relational, abductive, rule depth;
5. **narrative selection:** endings, ordering, contradiction detection;
6. **QA:** extractive and generated questions with answerability labels;
7. **generation:** official prompts, controlled prompts, free prompts;
8. **systematic OOD:** lexical, depth, distractor, schema and construction splits;
9. **efficiency:** time, memory, artifact size, energy where available;
10. **interpretability:** proof coverage and replay success.

## Generation policy

Use at least three seeds and fixed decoding configurations. Do not select examples manually after seeing output. Publish prompt IDs and all generations. Automated invariant checks are reported separately from human/LLM judgments.

## Statistical policy

- bootstrap confidence intervals for accuracy and preference metrics;
- story-level, not question-level, resampling when multiple items share a story;
- paired tests for model comparisons on the same items;
- correction or clear labeling for exploratory multiple comparisons;
- exact sample counts and abstentions.

## Leakage policy

Synthetic evaluation generators use vocabularies and templates partitioned before induction. External benchmark adapters preserve official splits. Coding agents cannot inspect frozen targets. A leakage scanner checks literal and normalized overlap.

## Required reporting

Every result file includes adapter, model manifest, suite version, data hashes, configuration, item-level predictions, aggregate metrics, errors, abstentions, timing, and environment. Missing capabilities receive `unsupported`, never an inferred zero unless a leaderboard protocol explicitly requires it.

## Acceptance criteria

The smoke suite runs against the reference symbolic adapter. At least one Hugging Face causal model can run through the same continuation and generation protocol when optional dependencies are installed. Invalid or incomplete results fail schema validation.
