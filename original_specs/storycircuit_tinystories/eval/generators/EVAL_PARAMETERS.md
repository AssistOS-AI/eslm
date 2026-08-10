# Evaluation parameter protocol

## In-distribution bands

```text
reasoning depth       1–3
entities              2–5
distractors           0–3
state reversals       0–2
story events          2–8
```

## Systematic OOD bands

```text
reasoning depth       5–12
entities              6–10
distractors           6–12
state reversals       4–10
held-out schemas      role or event combinations absent from induction
held-out surfaces     new constructions expressing familiar StoryIR
```

## Reporting

Report accuracy by each dimension and the area under the capability curve. A single macro average can hide the expected distinction between a symbolic executor that remains stable with depth and a compiler whose language coverage degrades.
