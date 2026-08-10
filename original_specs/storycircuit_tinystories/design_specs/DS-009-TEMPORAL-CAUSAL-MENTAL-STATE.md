# DS-009 — Temporal, Causal, Social, and Mental-State Reasoning

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-008

## Goal

Extend physical state with partial temporal order, causal explanations, goals, beliefs, emotions, and dialogue commitments.

## Temporal representation

Events have narrative indices and optional explicit time expressions. Edges include BEFORE, AFTER, OVERLAPS, DURING, and SAME_TIME. Closure is computed incrementally and cycles are diagnostics.

Habitual and hypothetical events are stored in separate modal scopes and do not directly mutate the actual world.

## Causal representation

Causal links record relation type and evidence class:

```text
rule_entailment
explicit_connective
goal_motivation
statistical_schema
teacher_annotation
human_annotation
```

Only rule entailment and explicit validated relations support strong causal answers by default. Statistical associations support plausibility, not certainty.

## Goals and intentions

A goal is a proposition desired by an entity. Events can activate, achieve, fail, or abandon a goal. Narrative prediction conditions strongly on active goals.

## Beliefs

Beliefs are scoped world fragments. Perception and speech may update them. The actual world and each character's belief world can diverge. Initial support is limited to elementary false-belief patterns.

## Emotions

Emotions are temporal states with stimuli and causes. Default rules such as achieved-goal -> happy are defeasible and learned with confidence.

## Dialogue commitments

Requests, commands, promises, apologies, thanks, warnings, and refusals create social relations and expectations. They influence narrative planning and answer generation.

## Acceptance criteria

- modal events never leak into actual state without an explicit transition;
- causal answers identify evidence type;
- temporal closure detects cycles;
- belief queries specify holder and time;
- soft emotional defaults can be overridden by text.
