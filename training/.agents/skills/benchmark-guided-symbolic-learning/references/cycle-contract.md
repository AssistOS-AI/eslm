# Learning cycle contract

## Contents

1. Directory and checkpoint record
2. Normalized evaluation report
3. Acceptance gate
4. Research note
5. Completion evidence

## Directory and checkpoint record

Create one immutable directory per learning hypothesis:

```text
cycle-ID/
  cycle.json
  baseline.json
  candidate.json
  comparison.json
  pools.json
  failures.jsonl
  research-note.md
```

`cycle.json` identifies dataset and adapter versions, accepted checkpoint, candidate branch or directory, hypothesis, target failure cluster, KB/core classification, authorized pools, and seeds. Do not overwrite an accepted cycle. Start the next cycle from its accepted checkpoint.

## Normalized evaluation report

Adapt benchmark output to `eslm-learning-evaluation-v1`:

```json
{
  "format": "eslm-learning-evaluation-v1",
  "checkpoint": "candidate-id",
  "dataset": "dataset-id",
  "pool": "fresh",
  "seed": 42,
  "cases": 1000,
  "metrics": {
    "overallAccuracy": 0.91,
    "freshAccuracy": 0.89,
    "regressionAccuracy": 1,
    "metamorphicConsistency": 0.97,
    "proofValidity": 0.99,
    "abstentionPrecision": 0.94,
    "executionFailures": 0,
    "latencyMilliseconds": 12.4,
    "rssBytes": 123456789,
    "kbBytes": 12345,
    "coreBytes": 67890
  },
  "capabilities": {
    "temporal-update": { "cases": 100, "accuracy": 0.88 },
    "coreference": { "cases": 120, "accuracy": 0.93 }
  }
}
```

Produce separate reports per pool or a deterministic aggregate containing the same metrics. Preserve case-level output and traces separately.

## Acceptance gate

Define tolerances before running the candidate. A normal gate requires:

```text
target cluster improvement > 0
fresh accuracy does not regress beyond tolerance
regression accuracy does not materially regress
metamorphic consistency does not regress
proof validity remains above threshold
execution failures do not increase
abstention does not become unjustifiably aggressive or permissive
KB/core growth is explained
```

Do not accept a candidate only because overall accuracy rises. Treat a severe per-capability regression, invalid proof, hidden answer leakage, nondeterminism, or unsupported certainty as a hard rejection.

## Research note

Record:

```text
Observed failure cluster:
Root cause and trace evidence:
Change:
Why KB or why core:
Target result before/after:
Fresh result:
Metamorphic result:
Regression result:
Proof audit:
Latency/memory/KB/core growth:
Remaining counterexamples and uncertainty:
Accepted checkpoint or rejection reason:
```

For a KB change, cite source observations and the generalized structure learned. For a core change, cite independent examples and the abstract tests added.

## Completion evidence

A dataset is substantially integrated only when unseen performance is high, repeated random samples are stable, metamorphic checks are consistent, proofs are valid, prior capabilities remain intact, nonce/generalized tests succeed where appropriate, and remaining failures form recognizable difficult clusters.

The final capability report lists learned KB knowledge, added generic mechanisms, capability deltas, remaining limits, avoided regressions, epistemic boundaries, scale costs, and the accepted checkpoint that becomes the next dataset's baseline.
