# DS-010 — Event Rules and Narrative-Schema Induction

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-008, DS-009

## Goal

Learn reusable event effects, preconditions, relational rules, and higher-level narrative schemas from parsed stories.

## Rule families

```text
state transition rules
relational inference rules
defeasible commonsense defaults
event prediction rules
causal hypotheses
schema-role constraints
```

Rules are typed and weighted. Deterministic rules require near-perfect evidence or lexical semantics; defaults retain confidence and exception statistics.

## Induction pipeline

1. collect aligned pre-event and post-event states;
2. propose changed fluents as candidate effects;
3. anti-unify event arguments and context;
4. search typed bodies for explanatory conditions;
5. evaluate on held-out transitions;
6. distinguish correlation from deterministic effect;
7. compress redundant rules;
8. register accepted rules with provenance.

## Narrative schemas

Stories are converted to event graphs and approximate beats. Frequent subgraphs are clustered and anti-unified into schemas. A schema defines roles, event slots, ordering constraints, optional branches, and expected resolution conditions.

## MDL objective

A candidate must reduce combined encoding length:

```text
DL(model) + DL(training_data | model)
```

Literal exceptions and rare branches increase model cost. Shadow validation prevents compression of duplicate or near-duplicate stories from masquerading as generalization.

## Agent participation

Coding agents may propose candidate rule code or graph patterns after inspecting failure packets. They cannot directly set acceptance weights or see protected examples.

## Acceptance criteria

- every accepted rule has support, counterexamples, and holdout metrics;
- deterministic and defeasible semantics are distinct;
- schema use improves prediction or generation beyond local transition counts;
- held-out composition is evaluated explicitly.
