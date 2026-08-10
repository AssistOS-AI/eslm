# Component Matrix

| Component | Learns from corpus | Executes symbols | Produces probability | May use agent code | Primary metrics |
|---|---:|---:|---:|---:|---|
| Byte/character backoff | yes | no | yes | yes | bits/byte, support |
| Lexicon/morphology | yes | yes | yes | yes | coverage, form accuracy |
| Construction grammar | yes | yes | yes | yes | parse F1, minimal pairs |
| Discourse/coreference | yes | yes | yes | yes | chain/entity accuracy |
| World-state runtime | rules/effects | yes | optional | yes | final state, invariants |
| Causal/mental model | yes | yes | yes | yes | QA, intervention |
| Narrative schemas | yes | yes | yes | yes | event prediction, OOD |
| Planner | yes | yes | yes | yes | constraints, coherence |
| Surface realizer | yes | yes | yes | yes | round trip, fluency |
| LM mixture/gate | yes | no | yes | yes | NLL, calibration |
| Evaluation harness | no | yes | no | no production edits | reproducibility |
