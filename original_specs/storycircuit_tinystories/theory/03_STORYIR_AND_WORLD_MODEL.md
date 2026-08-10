# StoryIR and the Executable Narrative World Model

## 1. Design goals

StoryIR is the boundary between uncertain language analysis and executable reasoning. It must be expressive enough for TinyStories but small enough to learn and validate. It must support partial information, ambiguity, provenance, temporal change, and round-trip generation.

StoryIR is not intended to encode every nuance of English semantics. It captures distinctions that produce measurable consequences for prediction, QA, consistency, or generation.

## 2. Top-level structure

```text
StoryIR {
  story_id
  source_text
  document_spans
  entities[]
  mentions[]
  events[]
  state_facts[]
  relations[]
  temporal_edges[]
  causal_edges[]
  goals[]
  beliefs[]
  emotions[]
  utterances[]
  scenes[]
  narrative_hypotheses[]
  unresolved[]
  provenance
}
```

Every semantic object carries an identifier, source span or generated provenance, confidence, status, and the circuit that produced it.

## 3. Entities and mentions

An entity is persistent across mentions and time. It may be a person, animal, object, place, group, substance, abstract object, or unknown. Types form a lightweight ontology with multiple inheritance when useful.

A mention stores its exact span, normalized head, grammatical features, and candidate entity links. The canonical entity name is not assumed to be the first mention; stories may begin with “a little girl” and name her later.

Groups and possessive relations are explicit. “Ben's dog” introduces both Ben, a dog, and a possession relation unless context indicates a conventional name.

## 4. Events

An event has:

```text
predicate
participants by semantic role
polarity
modality
aspect
tense
narrative time
location
source span
```

Roles use a compact inventory: agent, patient, theme, recipient, experiencer, stimulus, instrument, source, destination, location, content, and beneficiary. Domain-specific roles may be represented as typed attributes.

Events are normalized conservatively. “ran”, “walked”, and “went” may share a motion supertype while retaining distinct predicates. This permits both general rules and lexical prediction.

## 5. State facts and fluents

A state fact is valid over an interval:

```text
Fact(subject, predicate, value, polarity, valid_from, valid_to)
```

Examples include location, possession, physical condition, emotion, hunger, visibility, openness, and relationship. State changes close prior incompatible intervals rather than merely appending facts.

The ontology declares functional predicates such as `location(person)` and multi-valued predicates such as `likes(person, object)`. This prevents impossible simultaneous values unless ambiguity is explicitly represented.

## 6. Preconditions and effects

Event schemas define defeasible state transitions. A schema contains:

```text
name
argument types
preconditions
hard effects
soft effects
invariants
exceptions
support count
confidence
```

Hard effects are those required by the event meaning, such as a successful give transferring possession. Soft effects are typical consequences, such as helping often making the recipient grateful. Soft effects are not asserted as facts without confidence and can be overridden.

When text explicitly contradicts a default, the observation wins and the exception becomes evidence for rule refinement.

## 7. Temporal model

TinyStories generally follow narrative order, but flashbacks, habitual statements, dialogue, and temporal connectives require a partial order. The model maintains discrete event indices plus edges:

```text
BEFORE
AFTER
OVERLAPS
DURING
SAME_TIME
CAUSES_BEFORE
```

A temporal closure engine checks cycles and derives implied order. State queries can ask for the value at an event, sentence, or story end.

## 8. Causality

Causal edges are typed:

```text
ENABLES
CAUSES
PREVENTS
MOTIVATES
EXPLAINS
RESULTS_IN
```

The model distinguishes textual cues, deterministic world-rule causation, and statistical narrative association. Each edge records its evidence class. A common sequence does not automatically become a causal law.

## 9. Mental and social state

Goals, beliefs, emotions, intentions, permissions, and commitments are first-class but uncertain.

A belief is scoped to a holder and can differ from the actual world. This supports elementary false-belief and misunderstanding stories. An emotion has an experiencer, type, intensity class, stimulus or cause, and validity interval. A goal has a desired proposition and status: active, achieved, failed, abandoned, or unknown.

Dialogue acts include assertion, question, request, command, promise, apology, thanks, warning, and refusal. Utterance content may introduce beliefs or commitments without changing the objective world.

## 10. Scenes and narrative beats

Scenes group events by approximate location, time, and cast. Narrative beats label functional roles such as setup, desire, obstacle, attempt, consequence, resolution, and moral. These labels may be hypotheses rather than gold facts.

A schema is an anti-unified graph over beats and events. It supports prediction and generation but is not required for low-level state tracking.

## 11. Uncertainty

StoryIR uses three forms of uncertainty:

1. weighted alternatives, for example two possible pronoun antecedents;
2. unknown values, where evidence is absent;
3. defeasible facts, where a default may be overridden.

The runtime must never convert lack of evidence into explicit negation unless the predicate is declared closed-world.

## 12. Provenance

Every object is linked to one or more source spans, a generated-plan node, or an inference rule. Derived facts contain proof edges. A final answer can therefore identify the exact sentences and state transitions supporting it.

## 13. Equivalence and round trip

Two StoryIR fragments are semantically equivalent when their normalized entities, events, and relevant state changes are isomorphic after renaming internal IDs. Round-trip realization tests:

```text
IR -> text -> parsed IR'
```

The result need not preserve every stylistic detail, but it must preserve contracted semantic invariants. This provides an executable quality gate for generated text.

## 14. Extensibility rule

New fields are added only when they improve an explicit task or eliminate systematic ambiguity. StoryIR must not become a universal ontology assembled from speculative distinctions. Each extension includes examples, inference consequences, serialization changes, migration code, and benchmark coverage.
