# DS-008 — World State and Event Calculus

**Status:** Draft normative  
**Version:** 0.1  
**Depends on:** DS-004, DS-007

## Goal

Execute event meanings as changes to a time-indexed story world and support exact state queries, contradiction detection, and simulation.

## State representation

World state is a persistent map from typed fluent keys to values and validity intervals. Facts include polarity, confidence, provenance, and epistemic scope.

```text
FluentKey = (predicate, subject, optional_object)
FluentValue = scalar | entity | set | unknown
```

Functional, set-valued, monotonic, and closed-world behavior is declared in ontology metadata.

## Event schema

```text
EventSchema {
  predicate
  typed_parameters
  preconditions
  effects
  defaults
  invariants
  failure_semantics
  confidence
}
```

Hard precondition failure produces a diagnostic. Textual observation can still force an event into the story, in which case the world records inconsistency or hypothesizes a missing enabling fact rather than discarding the text.

## Execution

Events are applied in temporal order. Each application creates a new world-state version with a delta and proof trace. Inertial fluents persist unless terminated. Explicit negation and unknown are distinct.

## Query language

Queries support:

```text
value of fluent at time
whether a proposition holds
when a proposition changed
who or what satisfies a relation
why a fact holds
what event caused a change
counterfactual state after replacing or removing an event
```

## Contradictions

Contradictions are typed as observation-observation, observation-rule, rule-rule, temporal, identity, or functional-fluent conflicts. The engine never resolves them by arbitrary overwrite without policy and trace.

## Acceptance criteria

- deterministic replay under fixed StoryIR;
- exact provenance for derived facts;
- property tests for possession and location transitions;
- open-world semantics verified;
- complexity scales with changed fluents rather than full-state copying where possible.
