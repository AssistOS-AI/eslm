# Project Charter

## Name

**StoryCircuit-TinyStories: Learning an Executable Symbolic Language Model from Narrative Text**

## Research question

How much of the behavior of a small language model trained on TinyStories can be reproduced by a system whose linguistic knowledge, story state, inference, planning, and generation are represented as inspectable executable structures rather than primarily as dense neural parameters?

## Scope

The target includes language-model scoring, next-token prediction, prompt continuation, complete story generation, question answering, entity and state tracking, coreference, temporal and causal reasoning, ending selection, controllable generation, systematic generalization, and operational efficiency. The system is not restricted to a fixed tiny vocabulary.

## Non-goals

The first version is not expected to solve unrestricted English, reproduce the full aesthetics of a frontier model, or prove that symbolic methods are universally superior. It must not obtain impressive scores by evaluating only sentences the parser already accepts. It must not use evaluation stories or hidden benchmark labels to synthesize rules.

## Primary hypotheses

H1. A layered symbolic probability model with a total lexical backoff can expose a valid LM-style scoring interface over unrestricted TinyStories text.

H2. Explicit entity, state, temporal, and causal structures will provide stronger systematic generalization and consistency than comparably small end-to-end models on targeted narrative tests.

H3. Construction and rule libraries can be induced incrementally from raw or weakly annotated stories through anti-unification, frequent subgraph mining, MDL selection, and counterexample-guided program synthesis.

H4. Coding agents can accelerate symbolic model growth when every generated circuit is typed, provenance-bearing, test-gated, and evaluated on protected splits.

H5. The main failure frontier will move from reasoning to language compilation and surface realization; measuring this frontier is itself a valid result.

## Experimental regimes

S0 uses no neural component and no LLM-generated annotations. S1 permits a small learned router or parser whose outputs are constrained by StoryIR. S2 permits an external teacher during data preparation or circuit proposal, but not at runtime. Every result artifact records the regime.

## Required baselines

At minimum: unigram and Kneser-Ney n-gram, the reference symbolic kernel, the complete induced symbolic model, TinyStories-1M, and one larger official TinyStories checkpoint. Where hardware permits, train a GPT-style baseline on the identical training subset.

## Primary deliverables

1. A versioned StoryIR and executable runtime.
2. A learned weighted construction grammar and lexicon.
3. A narrative world model with rules and provenance.
4. A hierarchical planner and surface realizer.
5. A causal-LM-compatible scoring and generation API.
6. A benchmark suite separating language form, world modeling, reasoning, generation, and efficiency.
7. A reproducible comparison report and ablation study.

## Research integrity constraints

All data splits are content-hashed before any rule synthesis. Test stories remain inaccessible to coding agents. Teacher-produced annotations are versioned and excluded from pure-symbolic claims. Parse failures count as failures, not as missing data. Human or LLM judges supplement but never replace executable and reference-based metrics. Parameter counts, symbolic structure counts, artifact bytes, training compute, and external teacher cost are reported separately.
