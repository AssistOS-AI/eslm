---
id: DS009
title: World State, Narrative Schemas, and Generation
status: planned
owner: research
summary: Carries forward entity-event-world semantics, state transitions, narrative coherence, candidate generation, and normalized scoring requirements.
---

# DS009 World State, Narrative Schemas, and Generation

## Core Content

### Why facts are insufficient

A static triple store can answer direct relations but cannot faithfully model stories in which locations, possession, goals, beliefs, or visibility change. Narrative competence requires events applied to a versioned world state, discourse state, and expectations about plausible event sequences.

Correct state transitions are necessary but not sufficient for narrative competence. The compiler must recognize varied English constructions, preserve entity identity, bind event roles, maintain discourse state, and verify that a candidate continuation is compatible with the executed world.

### Story representation

A future StoryIR contains stable entities; typed events; participant roles; temporal or causal ordering; preconditions and effects; world-state versions; discourse mentions and salience; goals and plans; uncertainty; source spans; and realization metadata.

Every story or fictional canon has an explicit world ID. Edition, canon, narrator, and character-belief perspectives may create nested scopes. Real and fictional entities with the same surface name remain distinct. A user story or benchmark episode creates an ephemeral world, while a counterfactual creates an immutable branch with explicit assumptions.

Events are not flattened into timeless predicates. A movement event invalidates or supersedes a prior location in a new epoch. A transfer changes possession with explicit giver, recipient, and object. Observation and belief events distinguish physical state from an agent's knowledge.

### State execution

Each event transition checks preconditions, produces a new immutable or SSA-like version, records changed fluents, and retains the prior version. Invalid events produce diagnostics rather than silently repair the story. Competing event parses create bounded alternative states managed by BEAM until evidence resolves them or ambiguity is returned.

Persistence is explicit through frame rules or fluent semantics. Absence of a new location does not erase the previous one. Contradictory simultaneous states require temporal resolution, source scoping, or a conflict state.

Hypothetical branches may contradict their base without mutating it. Results state whether they follow deductively under assumptions, arise as defeasible expectations, remain abductive alternatives, or are unknown. Background knowledge crosses into a fictional or hypothetical world only through a declared bridge policy.

### Narrative schemas

Generated schema modules factor recurring event circuits such as acquisition, travel, search, rescue, deception, loss-and-recovery, or goal-attempt-outcome. A schema declares roles, permissible transitions, optional branches, constraints, expected effects, and realization cues.

Schemas are probabilistic or ranked hypotheses, not hard universal laws, unless the domain defines them. Counterexamples remain linked. One schema per story is overfitting; one generic “story” schema is operationally empty.

### Generation

Generation should proceed through content selection, plan construction, entity/reference planning, clause realization, and verification. A candidate is checked for world-state consistency, entity continuity, schema coherence, repetition, contradiction, and supported vocabulary before output.

For open generation, a total surface distribution is required if the system claims normalized language modeling. Evaluation distinguishes three current scoring contracts:

- S0 scores or generates through a total surface model;
- S1 uses structured features to rerank but makes no normalized structured-probability claim;
- S2 defines a normalized mixture over latent programs and realizations.

Current template realization is CONSTRUCT over a verified answer and belongs neither to open story generation nor S2.

### Evaluation

State tests vary chain length, decoys, paraphrases, coreference, temporal reordering, invalid transitions, and unseen entity names. Narrative tests separate ending selection, event plausibility, global consistency, causal support, schema transfer, and surface fluency.

Story Cloze and TinyStories-derived tests are useful but insufficient alone. A model can exploit stylistic artifacts. Controlled counterfactuals and trace-based oracles determine whether the chosen ending is compatible with the executed world.

### Implementation milestones

First implement event records and deterministic location/possession transitions. Next add temporal querying and explicit state epochs. Then add discourse-linked event parsing and controlled ending verification. Only after these pass should candidate narrative generation and normalized scoring be attempted.

## Decisions & Questions

### Q1. Is narrative generation required for the first usable ESLM?

Response: No. Grounded QA with language tolerance and bounded reasoning is the first usable target. Narrative state and generation are essential research extensions preserved from the original theory.

### Q2. Can schemas be hard-coded in stable core?

Response: Generic transition mechanics belong in core. Corpus-specific schema inventories and rankings belong in generated modules.

### Q3. When may ESLM report perplexity?

Response: Only when the scoring path defines a normalized total distribution over the evaluated symbol stream. Diagnostic grammar and reranking scores do not qualify.

### Question #4: Can literature facts be loaded beside real-world facts?

Response: Yes only under separate world and canon scopes. Retrieval may search both when the question is ambiguous, but reasoning and conflict detection cannot merge them without an explicit bridge.
