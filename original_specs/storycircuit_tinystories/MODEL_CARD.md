# Model Card: StoryCircuit Reference Kernel v0.1

## Model description

The reference kernel is an S0 executable symbolic language-model scaffold. It combines a full-support byte n-gram, an open-vocabulary word n-gram, a partially hand-seeded high-precision StoryIR parser, immutable world-state execution, transparent QA, a small narrative planner, a template realizer, and parse-back verification.

It is not the completed induced model described in the design specifications. In particular, semantic structure does not yet define a normalized contribution to text probability.

## Intended use

- validate interfaces, schemas, traces, and experimental pipelines;
- establish count and parser baselines;
- provide a target runtime for induced constructions and rules;
- localize failures among compilation, execution, and realization;
- compare controlled state tracking with natural-story likelihood.

## Out-of-scope uses

- general English language modeling;
- safety-critical inference;
- claims of human-like story understanding;
- production generation without independent review;
- likelihood claims attributed to semantic reasoning in v0.1.

## Training data

The bundled smoke artifact uses a tiny synthetic fixture. The included validation pilot was trained on a deterministic 3,956-story subset of the official legacy TinyStories validation text and evaluated on 1,044 content-hash-held-out stories. Raw stories are not packaged.

## Interfaces

```text
score_text
score_continuations
next_token_distribution
generate
parse
simulate
answer
```

## Limitations

The construction parser is incomplete, coreference is shallow, explicit conditional-rule execution is not implemented in the reference runtime, narrative schemas are small, realization is templatic, and the semantic reranker is not normalized. Count-table JSON serialization is intentionally transparent but inefficient.

## Complexity accounting

The 5k validation pilot contains 515,018 numeric count records and 21,659 symbolic records in a 51.2 MB canonical JSON artifact. This is not a float-parameter equivalence. Report engine source separately from learned artifacts.

## Ethical and methodological risks

The controlled suite partly mirrors mechanisms explicitly implemented by the reference parser and can therefore overestimate generality. Synthetic negative endings can expose topical mismatch rather than narrative understanding. Coding-agent rule synthesis can leak benchmark structure unless protected splits and manifests are enforced.
