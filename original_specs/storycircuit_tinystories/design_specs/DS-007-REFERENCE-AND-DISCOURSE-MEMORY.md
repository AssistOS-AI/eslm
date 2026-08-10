# DS-007 — Reference Resolution and Discourse Memory

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-004, DS-006

## Goal

Maintain persistent identities for characters, objects, places, groups, and dialogue participants across a story.

## Discourse state

```text
DiscourseState {
  entities
  active_mentions
  focus_stack
  speaker
  addressee
  scene
  candidate_aliases
  unresolved_references
}
```

## Candidate generation

Candidates are restricted by number, animacy, semantic type, syntactic role, scene availability, and dialogue context. A new-entity hypothesis is retained where indefinite or exophoric reference is plausible.

## Candidate scoring

Transparent features include recency, subject preference, parallelism, semantic compatibility, name and alias match, possession structure, dialogue role, and world-state plausibility. Weights may be counts, calibrated linear weights, or a compact S1 model.

## Ambiguity

The resolver can retain multiple weighted worlds. It should not force a single antecedent when evidence is insufficient. Downstream queries may return a weighted answer or `ambiguous`.

## Dialogue

Quoted utterances update speaker and addressee state. First- and second-person pronouns resolve relative to dialogue context. Reported speech opens a nested context when necessary.

## Evaluation

- mention-to-entity F1 on gold-IR set;
- exact final entity count;
- pronoun minimal pairs;
- unseen names;
- distractor characters;
- dialogue speaker tracking;
- impact on state QA and generation consistency.

## Acceptance criteria

A reference link always includes candidate scores and supporting features. No downstream module may rewrite entity identity without an explicit reconciliation event and trace.
