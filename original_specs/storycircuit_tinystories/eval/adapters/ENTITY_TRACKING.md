# Entity Tracking adapter

Paper/repository: `https://github.com/sebschu/entity-tracking-lms`

The ACL 2023 Entity Tracking task tests state-changing operations over entities and evaluates whether the model prefers a continuation describing the correct final state. The data archive is intentionally password-protected to reduce future training leakage; do not redistribute its unpacked contents.

## Mapping

```text
initial description -> initial WorldState
action sentence      -> typed state transition
query continuation   -> final-state proposition
```

Report shared continuation accuracy, exact state accuracy, transition parsing accuracy, and performance by number of entities and operations. The gold-state execution result is a diagnostic upper bound; headline performance must start from raw text.
