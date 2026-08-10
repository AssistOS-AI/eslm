# Task and Capability Taxonomy

## 1. Purpose

A language model is commonly evaluated through many named tasks, but task names often mix input format, domain, operation, and metric. StoryCircuit uses a small executable taxonomy that separates four axes:

```text
semantic operation
control structure
knowledge object
evaluation contract
```

This allows a coding agent to convert a benchmark item into an executable circuit rather than implementing each benchmark as a separate special case.

## 2. Core semantic operations

The project retains the eight-operator Task Calculus.

### OBSERVE

Acquire text, token probabilities, corpus counts, files, benchmark items, or execution traces without intentionally changing the modeled story world.

### STRUCTURE

Convert weakly structured input into typed objects: tokens, sentences, constructions, mentions, entities, events, facts, questions, prompts, constraints, or plans.

### RELATE

Create links: mention-to-entity, event-to-participant, event-to-time, support, contradiction, cause, ownership, location, sequence, or schema membership.

### REDUCE

Filter, rank, cluster, aggregate, select, prune, summarize, or choose among candidate parses, rules, continuations, or plans.

### DERIVE

Produce information not directly present: apply a state transition, infer a relation, resolve a reference, predict an event, answer a question, diagnose an inconsistency, or abduce an explanation.

### CONSTRUCT

Create or transform an artifact: StoryIR, a rule, a circuit, a narrative plan, a sentence, a continuation, a story, a report, or a model checkpoint.

### VERIFY

Compare an object with a contract: grammar acceptance, type checking, state consistency, proof checking, round-trip equivalence, benchmark oracle, or regression suite.

### EFFECT

Persist a model artifact, register a circuit, emit a story, update a result store, or publish a report. EFFECT nodes require explicit authorization and provenance.

## 3. Control algebra

The main combinators are:

```text
THEN(A, B)              data or temporal dependency
ALL(A, B, ...)          independent or fork-join execution
CHOOSE(g1:A, g2:B, ...) guarded branch or fallback
EACH(x in X, P(x))      map over a collection
UNTIL(test, budget, P)  iteration or fixpoint
BEAM(k, P)              retain weighted alternatives
COMPENSATE(P, R)        undo or repair an effect
MEMO(key, P)            cache a pure or versioned computation
```

Language parsing uses BEAM and MEMO. Rule closure uses UNTIL. Corpus mining uses EACH and REDUCE. Generation uses CHOOSE, BEAM, VERIFY, and COMPENSATE.

## 4. Knowledge-object taxonomy

The smallest stable set of story objects is:

```text
Surface: Token, Span, Sentence, Paragraph, Utterance
Reference: Mention, Entity, Group, Alias, DiscourseFocus
Semantics: Event, StateFact, Relation, Property, Quantity
Dynamics: Precondition, Effect, Fluent, Timeline, WorldState
Mental/Social: Goal, Belief, Emotion, Intention, Permission, Commitment
Narrative: Scene, Beat, Schema, Plan, Theme, Conflict, Resolution
Epistemic: Evidence, Hypothesis, Contradiction, Proof, Confidence
Generation: PromptContract, RealizationCandidate, StoryArtifact
```

All domain-specific extensions must map to these categories or justify a new primitive through an ADR.

## 5. Capability families

### 5.1 Language-form capabilities

These include tokenization, morphology, agreement, article use, tense, word order, punctuation, dialogue formatting, sentence boundaries, and construction selection. They are evaluated through likelihood and minimal-pair preference.

Executable pattern:

```text
OBSERVE pair
-> STRUCTURE construction hypotheses
-> DERIVE normalized scores
-> REDUCE choose higher probability
-> VERIFY gold preference
```

### 5.2 Lexical and semantic typing

The model must infer whether a token is likely a person, animal, object, place, property, action, or relation; learn argument frames; and avoid implausible combinations.

### 5.3 Reference and discourse

Tasks include entity introduction, alias resolution, pronoun reference, dialogue speaker tracking, recency, and maintaining multiple similarly described characters.

### 5.4 World-state tracking

The model must update location, possession, physical state, visibility, availability, and other fluents as events occur. Deletion and replacement are as important as addition.

### 5.5 Temporal reasoning

Tasks include event order, before/after, persistence, duration, repeated action, and state validity. The first implementation uses discrete narrative time with partial-order edges.

### 5.6 Causal and explanatory reasoning

The system identifies likely causes, consequences, enabling conditions, obstacles, and explanations. It must distinguish observed causation from merely learned narrative association.

### 5.7 Social and mental-state reasoning

Goals, emotions, knowledge, beliefs, requests, promises, and misunderstandings support many TinyStories plots. These are defeasible and may require multiple hypotheses.

### 5.8 Question answering

Questions are compiled into queries over StoryIR and world-state timelines. The suite covers who, what, where, when, why, how, yes/no, and unknown. Answers should include supporting spans or a proof trace.

### 5.9 Narrative continuation and ending selection

The model scores candidate next events or endings using grammar, current state, goals, schemas, and prompt relevance. Story Cloze is an external instance; TinyStories-specific cloze cases are also generated.

### 5.10 Story generation

Generation is decomposed into prompt contract extraction, cast/setting selection, planning, simulation, realization, and verification. Creativity is represented as controlled exploration over low-frequency but valid schemas, entities, and realizations rather than arbitrary noise.

### 5.11 Summarization and explanation

A summary selects high-centrality events and state changes from the narrative graph. An explanation reconstructs relevant causes and goals. These are secondary targets because TinyStories models are primarily generative, but they help validate semantic representations.

### 5.12 Instruction following

TinyStories-Instruct and explicit generation prompts specify required words, characters, themes, or plot conditions. Constraints become a PromptContract and are checked after generation.

## 6. Benchmark-to-pattern mapping

| Benchmark or test | Primary executable patterns |
|---|---|
| TinyStories validation perplexity | OBSERVE -> STRUCTURE prefix state -> DERIVE next-token distribution -> VERIFY likelihood |
| Official TinyStories prompts | STRUCTURE prompt contract -> DERIVE plan -> CONSTRUCT -> VERIFY |
| BLiMP | OBSERVE minimal pair -> DERIVE scores -> REDUCE -> VERIFY |
| EWoK | STRUCTURE contexts and target -> RELATE conceptual constraints -> DERIVE plausibility -> VERIFY |
| bAbI | STRUCTURE facts and query -> RELATE -> DERIVE closure -> VERIFY |
| CLUTRR | STRUCTURE relations -> DERIVE induced rules -> VERIFY held-out composition |
| Entity Tracking | STRUCTURE operations -> DERIVE state timeline -> ANSWER -> VERIFY |
| Story Cloze | STRUCTURE context/endings -> simulate alternatives -> REDUCE -> VERIFY |
| NarrativeQA adapter | STRUCTURE long narrative -> RELATE events/entities -> DERIVE answer -> VERIFY |

## 7. Atomicity is capability-relative

A task is atomic only when an executor exists with declared input/output types and a verifier. `resolve_coreference` may initially be a macro composed from candidate generation, feature scoring, world consistency, and selection. It may later become an atomic optimized module. The semantic contract remains stable while implementation granularity changes.

## 8. Residual operations

A parser must be allowed to emit:

```text
UNSUPPORTED_CONSTRUCTION
UNRESOLVED_REFERENCE
UNKNOWN_LEXEME
AMBIGUOUS_EVENT_FRAME
IMPLICIT_COMMONSENSE_REQUIRED
PRAGMATIC_INFERENCE_REQUIRED
```

Residuals are not discarded. They become training signals for induction and count against coverage metrics. A generic `LLM_SOLVE` node is permitted only in S2 development tooling and never counted as symbolic closure.

## 9. Taxonomy validation

The taxonomy is validated by annotating at least one thousand diverse TinyStories episodes and external benchmark cases. New semantic operators are admitted only when repeated examples cannot be represented as compositions of existing operators without opaque payloads. The target is a stable operator core and an expanding library of typed methods.
