# System Overview

## 1. Research object

StoryCircuit-TinyStories implements an **Executable Symbolic Language Model (ESLM)**. It is neither a conventional theorem prover attached to a language model nor a hand-written story template engine. It is a layered probabilistic program whose structures are induced from text and whose state transitions remain explicit and executable.

```text
                         ┌──────────────────────────────┐
text / prompt ──────────►│ open-vocabulary front end   │
                         │ bytes, words, morphology     │
                         └──────────────┬───────────────┘
                                        ▼
                         ┌──────────────────────────────┐
                         │ weighted construction parser │
                         │ incremental packed analyses  │
                         └──────────────┬───────────────┘
                                        ▼
                         ┌──────────────────────────────┐
                         │ StoryIR compiler             │
                         │ entities, events, claims     │
                         └──────────────┬───────────────┘
                                        ▼
             ┌──────────────────────────────────────────────────┐
             │ executable narrative state                      │
             │ discourse │ world │ time │ causes │ minds │ goals│
             └───────────────┬──────────────────────┬───────────┘
                             │                      │
                         understand              generate
                             │                      │
                             ▼                      ▼
                  ┌──────────────────┐   ┌──────────────────────┐
                  │ queries, proofs  │   │ hierarchical planner │
                  │ contradictions   │   │ simulate and repair  │
                  └──────────────────┘   └───────────┬──────────┘
                                                    ▼
                                         ┌──────────────────────┐
                                         │ weighted realizer    │
                                         │ parse-back verifier  │
                                         └──────────────────────┘
```

A normalized lexical backoff and probabilistic routing layer turn these components into an LM-compatible scorer.

## 2. Architectural boundaries

### Corpus layer

Acquires immutable source files, reconstructs stories, records hashes, creates leakage-resistant splits, and streams normalized records. It contains no semantic model logic.

### Linguistic layer

Maintains the open lexicon, morphology, punctuation, sentence segmentation, weighted constructions, and incremental parsing. It emits alternative typed analyses with probability mass and span alignment.

### Semantic layer

Compiles analyses into StoryIR. It resolves entities, introduces events, converts clauses to facts, and records ambiguity. It does not directly answer questions or choose story endings.

### Runtime layer

Applies event effects, persistence, causal/default rules, and mental or social updates to immutable world-state versions. It provides deterministic query and simulation APIs.

### Narrative layer

Learns schemas, predicts events, plans stories, verifies hard constraints, and repairs failed candidates.

### Language-model layer

Provides normalized scoring, next-token or continuation probabilities, generation, tokenizer bridging, and common adapter contracts.

### Research-control layer

Orchestrates stages, runs coding-agent induction, protects test splits, validates artifacts, records resources, and produces reports.

## 3. Primary data flow

```text
raw corpus
 -> canonical stories
 -> lexical/construction evidence
 -> parsed StoryIR candidates
 -> induced rules and schemas
 -> fitted probability components
 -> assembled immutable model
 -> model-agnostic evaluation
```

At inference:

```text
prefix
 -> incremental parse state
 -> StoryIR/world-state hypotheses
 -> expert next-unit distributions
 -> normalized mixture
 -> sampled or scored continuation
```

At QA:

```text
story -> parse -> simulate -> compile question -> execute query -> proof/verdict
```

## 4. Key invariants

1. Every accepted semantic item is typed and has provenance.
2. World-state versions are immutable; updates create successors.
3. A parser failure is represented, never converted silently into a successful semantic parse.
4. Every string retains probability through a byte/character escape expert.
5. Protected examples cannot influence generated circuits.
6. Gold StoryIR results are diagnostic and never merged with end-to-end results.
7. Generation hard constraints are checked against the plan and parse-back graph.
8. Model artifacts are self-describing and content-addressed.

## 5. Extension points

Stable interfaces permit alternative parsers, Datalog or SMT rule engines, neural routers, different planners, external tokenizers, and benchmark adapters. Extensions must preserve StoryIR semantics, LM protocol, artifact manifests, and evaluation item schemas or introduce an approved ADR and migration.

## 6. Expected research sequence

The reference kernel is deliberately modest. It validates contracts and experiments. Research agents should deepen components in this order:

```text
robust segmentation and corpus accounting
-> open lexicon and calibrated n-gram floor
-> high-precision constructions
-> entity/coreference memory
-> executable state transitions
-> induced rules and schemas
-> normalized semantic scoring
-> planning and realization
-> agent-synthesized circuits
```

Free generation should not be optimized before parsing and state diagnostics are reliable; otherwise fluency can mask an unused symbolic core.
