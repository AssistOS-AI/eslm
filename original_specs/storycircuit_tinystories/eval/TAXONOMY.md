# TinyStories capability and task taxonomy

The taxonomy separates **observable tasks** from **internal operations**.

## Observable capabilities

| Family | Observable task |
|---|---|
| Distributional language | score text, rank continuations, predict local form |
| Linguistic competence | grammar, morphology, punctuation, dialogue form |
| Reference | introduce and re-identify entities, resolve pronouns and descriptions |
| State tracking | location, possession, attributes, existence and reversals |
| Event understanding | agents, patients, transfers, movement, speech and changes |
| Temporal reasoning | order, duration, persistence, before/after and flashback |
| Causal reasoning | causes, enables, prevents, goals, explanations and intervention |
| Social/mental modeling | wants, knows, believes, helps, promises and emotions |
| Narrative understanding | central event, coherence, ending, contradiction and summary |
| Narrative generation | prompt relevance, plan, consistency, resolution, style and diversity |
| Systematic transfer | unseen names, words, depths, distractors, constructions and schemas |
| Reliability | abstention, proof, replay, calibrated uncertainty and resource bounds |

## Internal executable operator families

```text
OBSERVE     acquire spans, counts, candidates and evidence
STRUCTURE   tokenize, parse, type, extract, normalize and compile
RELATE      corefer, align, order, connect causes and build graphs
REDUCE      filter, rank, cluster, aggregate and select
DERIVE      infer effects, answer, predict, plan and repair
CONSTRUCT   realize text, create circuits, produce reports and artifacts
VERIFY      type-check, simulate, test invariants and compare round trips
EFFECT      persist artifacts and authorized external changes
```

These operators are not labels for whole tasks. For example, story generation is `STRUCTURE(prompt) -> DERIVE(plan) -> VERIFY(plan) -> CONSTRUCT(text) -> VERIFY(round_trip)`.

## Task parameters

Every generated test varies explicit dimensions:

```text
lexical novelty
construction novelty
number of entities
number of events
reasoning depth
number of distractors
ambiguity
negation
state reversals
schema novelty
required semantic constraints
surface length
```

This permits curves rather than one opaque benchmark number.
