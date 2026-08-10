# DS-016 — Verification, Provenance, and Trace

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** all semantic design specifications

## Goal

Make every semantic result replayable and attributable to text spans, induced structures, rules, or explicit assumptions.

## Trace graph

Execution emits an append-only DAG. Node classes include:

```text
source_span
lexical_hypothesis
construction_match
entity_resolution
event_assertion
state_transition
rule_application
plan_decision
surface_choice
verification_result
repair
```

Edges encode `derived_from`, `supports`, `contradicts`, `replaces`, `depends_on`, and `realizes`.

## Epistemic status

Claims use a lattice rather than a single confidence number:

```text
asserted
entailed
defeasibly_inferred
hypothesized
ambiguous
contradicted
retracted
unknown
```

Confidence is optional metadata and cannot turn a contradiction into an entailment.

## Provenance

Every corpus-derived structure stores source story identifiers and spans, induction stage, counts, holdout statistics, and the generating circuit version. Teacher-generated annotations are marked distinctly. Hand-authored seed knowledge includes author and rationale.

## Verifiers

Required verifier classes:

```text
schema validation
type and effect checks
world-state invariants
probability normalization
parse-realize round trip
prompt constraint satisfaction
no-test-leakage checks
artifact hash checks
```

Verification produces a verdict and machine-readable counterexample. Failed verification does not disappear into logs; it becomes a first-class result.

## Explanation API

```python
explain(query_or_output, *, depth, include_alternatives) -> TraceSlice
```

The API can return a minimal proof, a full derivation, rejected alternatives, or a natural-language rendering. Natural-language explanations are secondary to the trace graph.

## Privacy and security

Traces can reproduce training text. Export tools therefore support redaction and aggregate provenance. Model artifacts should not store entire stories unless explicitly configured and licensed.

## Acceptance criteria

All QA answers and generated-story hard constraints have a trace path. A run can be replayed from manifest and inputs. Trace validation detects dangling references, cycles where forbidden, and source spans outside document bounds.
