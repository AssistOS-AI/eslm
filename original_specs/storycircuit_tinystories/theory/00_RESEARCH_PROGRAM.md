# Research Program: From TinyStories to Executable Narrative Intelligence

## 1. Motivation

TinyStories is a useful scientific object because it compresses many capabilities associated with language modeling into a relatively narrow narrative domain. The corpus contains millions of short stories written with vocabulary intended to remain accessible to young children. Models below ten million parameters can learn to generate multi-paragraph stories with fluent grammar, local reasoning, continuity, and diversity. The domain is therefore difficult enough to expose failures in language, memory, and narrative modeling, but constrained enough that explicit symbolic structure may still be discoverable.

The central mistake of the earlier micro-pilot was not its implementation but its target. A vocabulary of one hundred tokens and a handful of logical templates can test whether a neural router plus a theorem prover generalizes to longer inference chains. It cannot test whether a symbolic system can act as a language model. A serious experiment must preserve the open-ended surface variation of TinyStories and must compare the systems through interfaces and tasks normally used for language models.

This program therefore treats a symbolic model as a learned **executable generative theory of stories**. The system must assign scores to text, predict continuations, generate text, maintain a world state, answer questions, and explain its decisions. It may use weighted rules and stochastic choices; “symbolic” does not mean deterministic or non-probabilistic. It means that the central latent variables and transition mechanisms have explicit types and executable semantics.

## 2. Target capability envelope

The target is not merely story question answering. TinyStories models are evaluated and informally judged across several interacting dimensions:

1. linguistic well-formedness;
2. continuation relevance;
3. local and global coherence;
4. character, object, and location consistency;
5. temporal and causal plausibility;
6. appropriate dialogue and emotion;
7. elementary reasoning;
8. diversity and creativity;
9. instruction or prompt adherence;
10. ability to assign higher probability to plausible than implausible text.

An executable symbolic language model must address each dimension through an explicit subsystem or must identify it as an unsupported residual. The project is successful only if it measures unsupported regions rather than silently filtering them out.

## 3. The generative hypothesis

Let a story text be `x`, and let `z` denote an explicit latent program consisting of entities, events, state transitions, discourse links, a narrative plan, and realization choices. A conventional latent-variable view writes:

```text
P(x) = sum_z P(z) P(x | z)
```

StoryCircuit makes `z` executable. It is not merely a vector. A candidate `z` can be type-checked, simulated, queried, contradicted, revised, and rendered. The decomposition is approximately:

```text
P(x, z) =
    P(cast, setting, theme)
  * P(plan | cast, setting, theme)
  * product_t P(event_t | state_t, plan)
  * product_t P(state_{t+1} | state_t, event_t)
  * P(discourse | events, entities)
  * P(surface text | discourse, grammar, lexicon)
```

Exact marginalization over all programs is generally intractable. The implementation therefore uses beam search, chart parsing, local normalization, cached partial worlds, and optional variational or sampling approximations. The key requirement is not exactness but semantic transparency: each approximation must preserve a trace of which structures contributed to the score.

## 4. A layered model rather than one monolith

A practical symbolic LM needs a total probability distribution. A story grammar alone assigns zero probability to unrecognized sentences and therefore cannot be compared by perplexity. The system uses a normalized mixture of components:

```text
P(next | history) =
    gate_lex(history)  * P_lex(next | history)
  + gate_syn(history)  * P_syn(next | parser_state)
  + gate_disc(history) * P_disc(next | discourse_state)
  + gate_world(history)* P_world(next | world_state)
  + gate_plan(history) * P_plan(next | narrative_plan)
```

Every component returns a normalized distribution over the external tokenizer vocabulary. The lexical component has full support through character or byte backoff. Higher layers may be sparse and precise. The gates can be fixed, count-based, calibrated on development data, or selected by a small model in the S1 regime. This construction yields finite likelihood for arbitrary input while allowing explicit structure to improve probability when the text is understood.

The model should also report component contributions. A low score may then be traced to lexical novelty, grammar mismatch, an impossible state transition, a broken coreference chain, or narrative-plan conflict.

## 5. Why this remains a symbolic model

The following information is represented explicitly:

- lexical entries, morphology, and semantic types;
- grammatical constructions and their slots;
- entities and mention chains;
- events, participants, polarity, modality, and tense;
- fluent state facts with temporal validity intervals;
- preconditions and effects of event schemas;
- goals, beliefs, emotions, and dialogue acts;
- temporal and causal edges;
- narrative schemas and plan operators;
- probability tables or learned weights attached to named structures;
- proof, parse, planning, and realization traces.

A system can contain millions of numeric weights and still be symbolic if those weights parameterize explicit productions, rules, or choices. Conversely, a tiny neural network can remain opaque if its hidden states carry the entire semantics. The relevant measurement is therefore not only parameter count but **where semantic commitments live**.

## 6. Three experimental regimes

### S0: Pure symbolic induction

S0 uses raw text, corpus statistics, dictionaries induced from text, grammar induction, anti-unification, sequence mining, rule learning, and executable verification. No pretrained language model and no LLM annotation may influence training. Conventional deterministic NLP tools are allowed only when their learned models are excluded; a strict run can disable them entirely.

S0 is scientifically important because it tests how much structure can be extracted from the corpus itself. Its likely weakness is semantic parsing coverage and surface flexibility.

### S1: Symbolic runtime with a learned compiler

S1 permits a compact classifier, tagger, embedding model, or sequence-to-StoryIR compiler. The learned component may recognize constructions, resolve uncertain references, or rank parses. It cannot replace state transition, inference, planning, verification, or scoring with an unrestricted text generator. Outputs must conform to StoryIR and may be rejected by type and consistency checks.

S1 tests the earlier Task Calculus hypothesis at realistic scale: neural recognition is used where language is ambiguous, while execution remains explicit.

### S2: Teacher-assisted program induction

S2 permits an external LLM to annotate a bounded training subset, propose StoryIR, suggest patterns, or synthesize candidate circuits. The teacher is not used at inference. Every teacher call is logged, costed, and separated from model runtime. Candidate programs must survive executable tests and held-out validation; teacher authority does not substitute for evidence.

S2 is likely to reach the broadest TinyStories coverage. It tests whether LLMs can serve as offline scientific instruments that compile their diffuse knowledge into a smaller executable model.

## 7. The role of coding agents

Coding agents are not simply implementation assistants. They form part of the learning algorithm. A corpus-analysis loop identifies clusters of failures or unexplained constructions. An agent receives only training and development examples, the current StoryIR contract, and the circuit API. It proposes code implementing one narrow hypothesis. Automated tests determine whether the proposal improves coverage and score without violating invariants or overfitting.

The loop resembles counterexample-guided inductive synthesis:

```text
current model
  -> run on protected development corpus
  -> collect typed failures
  -> cluster by structural signature
  -> formulate minimal hypothesis
  -> synthesize candidate circuit
  -> unit and property tests
  -> shadow evaluation
  -> MDL and regression gate
  -> accept, revise, or reject
```

This process transforms agent output into empirical hypotheses. A circuit is accepted because it explains new data compactly and predicts held-out cases, not because its source code looks plausible.

## 8. Relationship to Task Calculus

The earlier task algebra used eight general operators: OBSERVE, STRUCTURE, RELATE, REDUCE, DERIVE, CONSTRUCT, VERIFY, and EFFECT. StoryCircuit instantiates this algebra recursively.

Parsing a story is:

```text
OBSERVE text
-> STRUCTURE tokens, sentences, mentions, events
-> RELATE mentions to entities and events to time
-> DERIVE implicit states and causes
-> VERIFY consistency
```

Generating a story is:

```text
OBSERVE prompt and constraints
-> STRUCTURE a generation contract
-> DERIVE a narrative plan
-> CONSTRUCT event sequence
-> VERIFY world-state invariants
-> CONSTRUCT surface realization
-> VERIFY grammar, prompt adherence, and consistency
-> EFFECT emit text and trace
```

The same runtime principles can later generalize from stories to scientific documents or coding tasks, but TinyStories provides a bounded laboratory for validating them.

## 9. Learning objectives

The project does not optimize a single scalar. It uses a vector of objectives:

```text
language likelihood
parse coverage
IR fidelity
world-state accuracy
reasoning accuracy
generation constraint satisfaction
story coherence
model description length
runtime cost
trace completeness
```

For rule or circuit selection, a practical objective is:

```text
J(model) =
    NLL_dev
  + lambda_size * description_length(model)
  + lambda_fail * unsupported_rate
  + lambda_bug * invariant_violations
  + lambda_cost * runtime_cost
```

A candidate circuit is rejected if it improves average likelihood by memorizing isolated phrases but worsens compositional tests or increases model complexity disproportionately.

## 10. What a positive result would mean

A positive result need not be “symbolic beats Transformer.” Stronger and more defensible outcomes include:

- comparable performance on selected TinyStories tasks with substantially smaller learned state;
- superior state consistency and systematic generalization;
- exact explanations and counterexamples for failures;
- lower retraining cost when adding a new narrative rule;
- transfer of induced event schemas to bAbI, CLUTRR, Story Cloze, or entity tracking;
- evidence that a small learned compiler plus explicit runtime dominates either component alone;
- a precise map showing which capabilities resist symbolic induction.

## 11. What a negative result would mean

The project is falsified in its strong form if, after substantial engineering and fair evaluation, the symbolic system cannot obtain useful parse coverage, cannot define a competitive normalized scoring interface, or requires so many lexicalized exceptions that its description length and maintenance cost exceed a small neural model without compensating benefits.

A negative result remains scientifically valuable if failure is localized. For example, the world model may be excellent once gold StoryIR is provided, while text-to-IR remains poor. This would show that execution is not the bottleneck. Conversely, a high-fidelity parser followed by weak generation would isolate surface realization and narrative planning.

## 12. Minimum publishable experiment

The minimum serious experiment has four tracks:

1. **Gold-IR upper bound.** Human or teacher-verified StoryIR for a small evaluation set tests world modeling and generation independent of parsing.
2. **Pure symbolic end-to-end.** S0 trained on the same TinyStories subset as the baseline.
3. **Learned compiler plus symbolic runtime.** S1 with explicit compiler metrics.
4. **Causal LM baseline.** Official TinyStories-1M and, where possible, a model trained on the identical subset.

The evaluation must include likelihood, targeted grammar, entity tracking, temporal and causal state, QA, story cloze, prompt completion, constrained generation, diversity, efficiency, and systematic OOD splits.

## 13. Research claim discipline

Every result must distinguish:

- exact execution from approximate parsing;
- training data from teacher-generated external knowledge;
- numeric parameters from symbolic structure;
- model-internal evaluation from LLM judging;
- in-distribution performance from compositional transfer;
- abstention from correctness;
- filtered coverage from full-corpus performance.

The purpose of StoryCircuit is not to manufacture a symbolic success story. It is to build an instrument that can reveal, with unusually fine resolution, where explicit executable structure helps and where it fails.
