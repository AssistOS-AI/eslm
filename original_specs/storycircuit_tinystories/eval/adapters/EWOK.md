# EWoK adapter

Paper: `https://arxiv.org/abs/2405.09605`

Elements of World Knowledge evaluates whether a model links a target with a plausible rather than implausible context. EWoK-CORE-1.0 contains 4,374 items across 11 domains, including social and spatial concepts.

Use continuation or full-sequence conditional log probability exactly as specified by the released task. StoryCircuit additionally compiles both alternatives into StoryIR and reports:

```text
concept coverage
required world rule
state or relation difference
proof, counterexample, or explicit unknown
```

The diagnostic result cannot override the shared probability preference.
