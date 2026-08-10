# Controlled Suite Findings

The 5k validation pilot model was evaluated on the 1,600-item generated suite. This suite is diagnostic and partly aligned with the implemented reference constructions; it must not be interpreted as a natural-language benchmark.

| Family | Result |
|---|---:|
| generated likelihood | 3.2761 BPB |
| minimal-pair lexical accuracy | 0.580 |
| minimal-pair structured accuracy | 0.650 |
| narrative selection | 0.775 |
| explicit-rule reasoning | 0.200 |
| state tracking | 0.990 |
| long possession-chain OOD | 1.000 |
| constrained generation checks | 1.000 |
| trace availability | 1.000 |

The strongest results occur where the runtime implements the exact operation: ordered possession transfer and transparent trace production. Explicit conditional rules are not implemented, producing only 0.20 because unknown cases happen to match the target on a subset. The result is a useful workstream map, not a claim of generalized reasoning.

Generation receives 1.0 on the current executable checks after fixing missing event-role construction. This means the planner can insert requested words/events and the realizer can pass parse-back for those templates. It says little about fluency, creativity, diversity, or natural prompt generalization. External likelihood and human evaluation remain mandatory.

The gap between 1.0 controlled possession chains and approximately chance natural ending selection illustrates the central methodology:

```text
algorithmic execution can be solved
while natural-language compilation and narrative modeling remain unsolved
```
