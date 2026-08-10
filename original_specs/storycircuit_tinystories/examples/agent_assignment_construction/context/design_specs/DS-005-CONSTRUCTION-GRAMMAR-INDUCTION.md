# DS-005 — Weighted Construction-Grammar Induction

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-003, DS-004

## Goal

Learn reusable surface-to-semantic constructions from TinyStories while controlling memorization and preserving a scoring path for unparsed text.

## Construction model

```text
Construction {
  id
  surface_pattern
  slot_definitions[]
  feature_constraints
  semantic_action
  weight
  support_count
  negative_evidence
  provenance
  complexity_cost
}
```

A surface pattern is a sequence or tree of literals, lexical classes, morphological constraints, and nested constructions. Semantic actions can only invoke registered StoryIR builders.

## Induction pipeline

1. collect repeated sentence and clause shapes;
2. create lexicalized seed constructions;
3. align examples with similar shapes;
4. anti-unify differing spans into typed slots;
5. infer slot types from lexicon and partial StoryIR;
6. generate negative or contrastive examples;
7. estimate weights and complexity cost;
8. evaluate held-out parse gain and minimal-pair precision;
9. merge subsumed constructions.

## Bootstrapping modes

S0 uses token, morphology, punctuation, and corpus recurrence only. S1 may use a learned tagger or router. S2 may use teacher StoryIR on a bounded subset. Artifacts retain their regime origin.

## Escape behavior

Unrecognized spans are captured by explicit escape constructions that defer to lexical backoff and emit unresolved semantic nodes. Escape use is penalized but never produces zero likelihood.

## Overfitting controls

- minimum independent story support;
- train/development support ratio;
- negative-example precision;
- MDL penalty for literals and branches;
- held-out lexical substitution tests;
- compositional reconstruction tests;
- duplicate-story grouping.

## Output metrics

```text
sentence parse coverage
full semantic parse coverage
slot precision and recall
gold-IR graph F1
construction count
mean literals per construction
escape rate
minimal-pair accuracy
likelihood contribution
```

## Acceptance criteria

The first milestone must cover at least the dominant declarative, property, motion, possession, perception, speech, and transfer constructions in a 50k-story sample. Threshold values are set after corpus profiling and cannot be chosen retrospectively to hide failure.
