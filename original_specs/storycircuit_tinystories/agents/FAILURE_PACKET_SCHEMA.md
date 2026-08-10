# Failure Packet Schema

A failure packet is the interface between evaluation, research analysis, and circuit synthesis. Store packets as JSON conforming to the conceptual schema below.

```json
{
  "packet_version": "0.1",
  "packet_id": "fp-...",
  "created_at": "ISO-8601",
  "regime": "S0|S1|S2",
  "source_split": "train|dev|agent_shadow-sanitized",
  "capability": "reference|state|causal|grammar|generation|likelihood|...",
  "failure_code": "stable-coarse-code",
  "summary": "semantic, non-lexical description",
  "observations": [
    {
      "item_id": "dev-visible-id or redacted",
      "input": "visible only for train/dev",
      "expected": "visible only for train/dev",
      "actual": "visible only for train/dev",
      "trace_ids": ["trace-..."],
      "source_spans": [],
      "diagnostics": {}
    }
  ],
  "cluster_statistics": {
    "count": 0,
    "rate": 0.0,
    "confidence_interval": [0.0, 0.0],
    "lexical_diversity": 0.0,
    "template_diversity": 0.0
  },
  "suspected_stage": "observe|structure|relate|derive|construct|verify",
  "minimal_hypothesis": {
    "claim": "",
    "predicted_improvement": "",
    "predicted_non_improvement": "",
    "counterexample": ""
  },
  "proposed_circuit": {
    "id": "",
    "version": "",
    "inputs": [],
    "outputs": [],
    "preconditions": [],
    "postconditions": [],
    "failure_values": [],
    "dependencies": []
  },
  "test_plan": {
    "positive": [],
    "negative": [],
    "metamorphic": [],
    "regression": [],
    "shadow_gate": []
  },
  "complexity_budget": {},
  "decision": "proposed|accepted|rejected|needs-evidence"
}
```

For sanitized shadow packets, omit raw text, targets, lexical values, and exact trace content. Return only aggregate counts, confidence intervals, coarse failure codes, and whether a registered acceptance gate passed.
