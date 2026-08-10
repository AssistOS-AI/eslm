# Executable Symbolic Language Model

## 1. Definition

An Executable Symbolic Language Model, abbreviated ESLM, is a model over text whose predictive state contains named, typed, inspectable structures and whose transition functions can be executed independently of the surface text. It must still satisfy the operational expectations of a language model: assign conditional probabilities, score sequences, generate continuations, and support deterministic seeding.

An ESLM is not a bag of hand-written rules. It is learned from data, although learning may produce code, tables, automata, grammars, logical clauses, or planners rather than only dense tensors.

## 2. External causal-LM contract

For a tokenizer vocabulary `V` and a prefix `h`, the model returns a normalized distribution:

```text
for every h: sum_{t in V} P(t | h) = 1
for every t in V: P(t | h) >= epsilon or is covered by an explicit zero policy
```

The implementation must support:

```text
score_text(text) -> total_log_probability, token_log_probabilities
next_token_distribution(prefix, candidate_tokens=None) -> probabilities
generate(prompt, max_new_tokens, temperature, top_k, top_p, seed) -> text
```

The symbolic extensions are:

```text
parse(text) -> StoryIR candidates and traces
answer(context, question) -> answer, proof, confidence
simulate(story_ir) -> world-state timeline
explain(trace_id) -> component contributions and provenance
```

The external interface is intentionally model-agnostic. A Hugging Face causal LM, an n-gram model, and ESLM can be evaluated by the same harness.

## 3. State decomposition

The state associated with a prefix is:

```text
ESLMState = {
  lexical_state,
  parser_chart,
  discourse_state,
  world_state,
  narrative_state,
  realization_state,
  provenance,
  uncertainty
}
```

The state is persistent and versioned. Each token update produces a new state or a compact delta. Sentence boundaries trigger semantic commits: a partial construction becomes an event or state fact, the world simulator applies its effects, and narrative expectations are updated.

Multiple parse hypotheses may coexist in a beam. Each hypothesis has a probability and a distinct world state. Hypotheses can merge when their externally relevant states are equivalent.

## 4. Lexical coverage layer

A symbolic story model is necessarily incomplete. The lexical layer ensures total coverage. The recommended implementation is a hierarchy:

```text
byte or character n-gram
-> morpheme model
-> word model
-> lexical class model
```

The byte component prevents infinite perplexity. The word and morpheme components learn frequent TinyStories forms. Lexical classes are explicit: person names, animals, objects, locations, properties, motion verbs, transfer verbs, perception verbs, speech verbs, and so forth.

The lexicon stores more than frequency:

```text
lemma
surface forms
part-of-speech hypotheses
semantic types
argument frames
selectional preferences
construction memberships
source counts and spans
```

Uncertainty is represented as multiple weighted hypotheses, not resolved prematurely.

## 5. Weighted construction grammar

Instead of requiring a complete hand-written English grammar, ESLM learns constructions from the corpus. A construction is a token or phrase pattern with typed slots and a semantic action:

```text
[ENTITY] was [PROPERTY]
  => assert_state(subject=ENTITY, property=PROPERTY)

[ENTITY] went to [LOCATION]
  => emit_event(go, agent=ENTITY, destination=LOCATION)

[ENTITY] gave [OBJECT] to [ENTITY]
  => emit_event(give, agent=ENTITY_1, theme=OBJECT, recipient=ENTITY_2)
```

Constructions can be nested and can carry features such as tense, number, polarity, modality, and dialogue context. Each construction has a weight derived from corpus support and predictive utility.

Learning begins with lexicalized sentence fragments. Anti-unification replaces variable spans with typed slots when multiple instances share a structural pattern. Over-general constructions are penalized when they accept ungrammatical or semantically incoherent held-out examples.

## 6. Discourse and reference layer

The discourse layer maintains candidate entities, mention salience, number, gender where inferable, animacy, location, and dialogue role. A pronoun is resolved by an explicit scoring function over candidates:

```text
score(entity) =
    recency
  + grammatical_role_compatibility
  + semantic_type_compatibility
  + number_and_gender_agreement
  + discourse_focus
  + world_model_plausibility
```

The scorer may be count-based or learned, but its features and candidate set remain visible. Uncertain references produce branches. The evaluator measures both final QA accuracy and mention-chain accuracy.

## 7. World model

The world model is a time-indexed set of fluents and relations. Events have preconditions and effects. Examples:

```text
go(agent, destination):
  pre: exists(agent), exists(destination)
  effect: location(agent) := destination

give(agent, theme, recipient):
  pre: possesses(agent, theme)
  effect: not possesses(agent, theme)
          possesses(recipient, theme)

break(agent, object):
  effect: state(object, broken)
```

The first version uses finite, typed, defeasible rules. It adopts an open-world stance for unknown facts but can support closed-world predicates where the ontology declares them complete. Conflicts produce explicit contradiction objects.

The world state is not limited to physical facts. It includes goals, beliefs, emotions, permissions, promises, and dialogue commitments. These may be less deterministic and therefore carry confidence or alternative interpretations.

## 8. Narrative model

A narrative model predicts events and discourse moves, not merely words. It can be represented by weighted schemas:

```text
need_or_desire
-> attempt
-> obstacle
-> response
-> resolution
-> emotional_update
```

Schemas are learned by clustering and anti-unifying event graphs. The model also retains local event-transition statistics, allowing it to operate before sophisticated schemas are available.

The narrative planner uses schemas as hierarchical methods. Given a prompt, it constructs a partial contract specifying characters, setting, desired words, theme, or required ending. It then searches for an event sequence whose simulated states satisfy the contract and whose learned probability is high.

## 9. Surface realization

Surface realization maps StoryIR fragments to text using weighted constructions. It must preserve identity, tense, number, polarity, and dialogue attribution. A realization candidate is accepted only if round-trip parsing yields an equivalent semantic fragment within a declared tolerance.

This **generate–parse–verify** loop is a central symbolic advantage. It does not guarantee literary quality, but it sharply reduces contradictions and broken references.

## 10. Local normalization

To support next-token probabilities, each component proposes scores for candidate tokenizer tokens. The simplest exact method enumerates the tokenizer vocabulary, applies each token to a copy of the state, and normalizes. This is expensive but usable for a ten-thousand-token vocabulary with caching and pruning.

Optimized methods use tries and incremental automata:

- the lexical model returns a dense base distribution;
- grammar and realization automata add sparse bonuses or masks;
- discourse and world models score completed words or constructions;
- narrative scores apply mainly at phrase or sentence boundaries;
- the final vector is normalized with log-sum-exp.

The reference kernel implements only a simplified mixture. DS-011 defines the complete normalized protocol required for publishable perplexity.

## 11. Learning

Learning updates named artifacts:

```text
lexicon.json
morphology.fst
constructions.jsonl
reference_model.json
world_rules.jsonl
narrative_schemas.jsonl
realization_templates.jsonl
mixture_calibration.json
```

Each artifact records training split hashes, counts, provenance, version, and acceptance tests. Numeric parameters attached to symbolic structures are counted separately from structural records.

## 12. Error localization

For every scored or generated sequence, ESLM can attribute error to layers:

```text
LEXICAL_UNKNOWN
NO_CONSTRUCTION_PARSE
REFERENCE_AMBIGUOUS
WORLD_PRECONDITION_FAILURE
TEMPORAL_CONFLICT
CAUSAL_UNSUPPORTED
PLAN_DEAD_END
REALIZATION_ROUNDTRIP_FAILURE
```

This typed error taxonomy is essential for agentic improvement. Coding agents should receive clusters of errors, not a generic aggregate loss.

## 13. Limits

The model may become a large program library with many lexicalized exceptions. It may struggle with metaphor, implicit social knowledge, pragmatic implicature, and long-distance syntactic ambiguity. Exact normalized scoring can be computationally expensive. These are not implementation accidents; they are hypotheses to test. Description length, branch factor, and unsupported rates are therefore first-class metrics.
