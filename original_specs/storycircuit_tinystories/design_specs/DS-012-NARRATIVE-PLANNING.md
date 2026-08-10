# DS-012 — Hierarchical Narrative Planning

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-008, DS-009, DS-010

## Goal

Generate event structures that are prompt-relevant, temporally executable, causally intelligible, and resolvable into a short story. Planning is semantic: it decides what happens before deciding the exact words.

## Plan representation

A narrative plan is a partially ordered graph:

```text
roles -> initial state -> motivating incident -> attempts -> complication
      -> resolution -> optional lesson / closing state
```

Nodes are typed events or state assertions. Edges encode temporal precedence, causal support, goal support, contrast, elaboration, and discourse salience. A plan includes hard prompt constraints and soft stylistic objectives.

```json
{
  "roles": {"hero": "e1", "object": "e2"},
  "initial_state": [],
  "goals": [],
  "events": [],
  "constraints": [],
  "open_threads": [],
  "score_terms": {}
}
```

## Planning methods

The initial system provides three planners:

1. **schema instantiation** selects an induced narrative schema and binds its roles;
2. **forward state-space search** chooses executable events until resolution conditions hold;
3. **repair planning** inserts, deletes, or reorders events when verification finds an inconsistency.

A generated event must satisfy typed preconditions in the current world state. Its effects are applied to a new immutable state version. Defeasible events may be used only when their uncertainty is retained.

## Prompt compilation

Prompts are compiled into:

```text
required entities
required lexical items
required semantic properties
initial world facts
narrative intent
forbidden events or outcomes
length and style constraints
```

Ambiguity is represented as alternatives rather than resolved silently. For example, “a light bat” may generate separate object hypotheses until later context disambiguates it.

## Objective

Candidate plans are ranked by a transparent weighted objective:

```text
constraint satisfaction
schema likelihood
event-transition likelihood
causal connectivity
goal progress
entity economy
novelty
estimated realizability
estimated parse-back fidelity
```

The objective penalizes unexplained events, unresolved goals, accidental entity duplication, impossible state transitions, and excessive copying of training event graphs. Hard constraints are not traded against fluency.

## Diversity

Diversity is generated at semantic and surface levels. Semantic sampling may vary schemas, role bindings, complications, resolutions, and optional branches. Surface sampling varies constructions and lexical choices. Reports distinguish semantic diversity from mere paraphrase diversity.

## Verification loop

```text
plan -> simulate -> check invariants -> realize -> parse back -> compare
                 ^                                  |
                 +------------ repair --------------+
```

The loop has an explicit attempt budget. Failure produces a diagnostic plan and violated invariants rather than an unverified story.

## Required invariants

- introduced entities exist before use unless deliberately revealed;
- possession and location updates do not create impossible duplicates;
- dead, broken, lost, or absent entities obey declared persistence rules;
- goals are achieved, abandoned, or left explicitly unresolved;
- causes precede effects except in deliberate flashback constructions;
- dialogue speakers are available and distinct when required;
- prompt constraints remain traceable to plan nodes.

## Acceptance criteria

On controlled generation tests, at least 95% of emitted plans satisfy hard constraints before realization. On full generation, the report includes plan success, realization success, round-trip semantic fidelity, average repairs, and failure categories. The planner must outperform an event-bigram baseline on held-out schema compositions or be removed from the claimed contribution.
