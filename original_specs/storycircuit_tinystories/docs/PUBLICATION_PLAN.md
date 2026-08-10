# Publication and Research Output Plan

## Paper 1 — Task and capability calculus

Contribution: a compact decomposition of LM behavior into observation, compilation, state execution, inference, construction, verification, and effects, specialized into a narrative capability taxonomy. Evidence: annotation study, failure taxonomy, and mapping across TinyStories, BabyLM-style evaluations, entity tracking, bAbI, EWoK, CLUTRR, and story completion.

## Paper 2 — Executable symbolic language modeling

Contribution: a model exposing causal-LM scoring and generation while representing latent narrative structure as executable programs. Central requirement: mathematically valid normalization and comparison by BPB, not only QA accuracy.

## Paper 3 — Agentic program induction

Contribution: coding agents as generators of typed, test-gated circuits under a protected evaluation firewall and MDL selection. Compare manual construction, count induction, agent proposals, and teacher-assisted proposals.

## Paper 4 — Systematic narrative reasoning

Contribution: explicit state and event execution versus small neural LMs under depth, distractors, coreference gaps, and schema recombination. Separate gold-IR executor ceilings from natural-language compilation.

## Release artifacts

A credible release should include:

- code and immutable model artifacts;
- data preparation manifests but not redistributed restricted data;
- StoryIR schemas and annotation guidelines;
- a versioned controlled suite and external adapters;
- item-level predictions for public tests;
- full run manifests and resource logs;
- negative-result registry;
- model, data, and benchmark cards;
- agent prompts and accepted/rejected circuit manifests.

## Claim discipline

The first publication should not claim a complete symbolic replacement for TinyStories models. A stronger and more durable claim is possible if the project demonstrates a measurable decomposition of capability, systematic advantages in specific regimes, and a reproducible account of where symbolic compilation fails.
