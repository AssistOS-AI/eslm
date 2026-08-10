# DS-004 — StoryIR Schema and Evolution

**Status:** Normative  
**Version:** 0.1  
**Depends on:** DS-001, DS-003

## Goal

Define the stable typed intermediate representation shared by parsers, world models, planners, realizers, evaluators, and coding-agent circuits.

## Required object classes

```text
DocumentSpan
Entity
Mention
Event
Participant
StateFact
Relation
TemporalEdge
CausalEdge
Goal
Belief
Emotion
Utterance
Scene
NarrativeHypothesis
UnresolvedItem
ProvenanceRecord
```

The JSON schema in `schemas/story_ir.schema.json` is authoritative for serialization. Python dataclasses are generated or manually kept equivalent.

## Identity

IDs are stable within one story artifact and namespaced by story ID. Entity IDs are not based solely on surface names. Derived objects use content-addressed IDs where possible to improve reproducibility.

## Partial and ambiguous structures

A StoryIR may be partial. Required top-level arrays can be empty. Ambiguous links are represented as candidates with weights rather than duplicated unmarked objects. `unresolved` records preserve gaps.

## Provenance

Every semantic object includes:

```text
source_spans
producer_circuit
producer_version
operation
confidence
parent_ids
regime
```

Generated stories use plan and realization nodes instead of source spans.

## Versioning

Schema changes follow semantic versioning. Breaking changes require:

- an ADR;
- migration code;
- update of examples and validators;
- evaluation of model-artifact compatibility;
- explicit invalidation or migration of cached parses.

## Invariants

- source spans lie within source text;
- participant entity references exist;
- temporal edges do not reference missing events;
- functional fluents do not overlap with incompatible values unless marked ambiguous;
- no proof references an unavailable rule;
- generated text provenance links to a plan or realization node.

## Acceptance criteria

- JSON round trip is lossless.
- Validator produces typed, localized errors.
- Included sample stories validate.
- Schema migration tests cover every historical version after v1.0.
