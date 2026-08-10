# Circuit API

## Definition

A circuit is a typed, testable, side-effect-declared program fragment that transforms linguistic, semantic, or evaluation objects. It is smaller than an end-to-end task and larger than an arbitrary helper function.

## Manifest

```json
{
  "id": "coref.pronoun.compatibility.v1",
  "version": "1.0.0",
  "stage": "reference_resolution",
  "inputs": ["Mention", "DiscourseState"],
  "outputs": ["CandidateAntecedentSet"],
  "effects": [],
  "preconditions": [],
  "postconditions": [],
  "complexity": {"source_lines": 42, "ast_nodes": 133},
  "regime": "S0",
  "provenance": []
}
```

## Runtime contract

```python
result = circuit.run(inputs, context)
```

A result contains value, status, diagnostics, provenance edges, consumed budget, and deterministic trace hash. Exceptions are converted to typed failures at the runtime boundary.

## Purity

Semantic circuits are pure by default. Corpus readers and artifact writers declare effects separately. A circuit must not inspect global test paths, clocks, randomness, environment variables, or network resources unless its manifest explicitly allows them and the run policy grants access.

## Composition

Circuits compose through typed ports. The scheduler validates type compatibility and topologically orders data dependencies. Iteration creates new state versions and has a declared termination or budget condition.

## Registration

A registry maps stable identifiers to code and manifests. Duplicate identifiers with different hashes are rejected. Model artifacts pin exact circuit hashes.

## Testing

Every circuit supplies positive, negative, boundary, malformed-input, and serialization tests. Semantic circuits should add property tests for invariants such as idempotence, monotonicity, symmetry, or conservation when applicable.
