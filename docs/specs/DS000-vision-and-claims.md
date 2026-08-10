---
id: DS000
title: Vision, Scope, and Claim Discipline
status: implemented
owner: repository
summary: Defines ESLM as offline executable symbolic language compiled by coding agents and limits every empirical claim to a named evidence regime.
---

# DS000 Vision, Scope, and Claim Discipline

## Core Content

### Objective

The project tests whether a finite body of linguistic and factual evidence can be condensed into modular executable code that provides useful question answering, retrieval, bounded reasoning, state tracking, and response realization without a neural model at inference time. The resulting artifact is an Executable Symbolic Language Model, abbreviated ESLM.

The experiment has two distinct phases. During synthesis, a coding agent may inspect an explicitly authorized training packet and generate Node.js modules. During deployment, the generated modules and stable runtime answer inputs offline. Deployment has no LLM, coding agent, checkpoint, embedding service, network client, or hidden corpus access.

Training is therefore program synthesis rather than gradient optimization. The generated source is the model. Its identifiers, tables, rules, indexes, constructions, templates, and provenance links are the learned representation.

### Required capabilities

An ESLM release is expected to improve along separate capability axes rather than hide all behavior behind one accuracy number:

- robust normalization of Unicode text, punctuation, casing, declared spelling variants, and bounded typographical errors;
- recognition of supported question and dialogue constructions, including approximate surface forms;
- typed entity resolution with explicit ambiguity and bounded discourse references;
- rapid retrieval through generated alias and fact indexes;
- bounded rule execution, relational composition, and world-state transition execution;
- separate deductive proof, thresholded inductive generalization, and guarded abductive hypothesis generation;
- selective loading of independently versioned knowledge modules with exact entity, fact, rule, closure, and provenance counts;
- evidence selection and provenance-preserving explanation;
- grammatical realization of short answers in supported languages;
- explicit `UNKNOWN`, `UNSUPPORTED`, `AMBIGUOUS`, and `NEEDS_CLARIFICATION` behavior;
- reproducible interactive, batch, evaluation, and benchmark interfaces.

The phrase “language model” does not imply a claim of universal next-token modeling. ESLM is a model of the supported language fragment and encoded world knowledge because it maps surface language into executable latent structures and realizes supported results back into language. Broader generative competence remains a research objective that must be measured independently.

### Non-goals for v0.1

The first serious implementation does not train a local neural compiler, reproduce an internet-scale language model, silently call an external service, accept unrestricted code from corpora, or claim equivalence between symbolic scores and normalized neural likelihoods. It does not treat a retrieval match as understanding, nor a fluent template as proof of correct reasoning.

The system may fail on an input that a general LLM answers. Such failure is informative when it identifies a missing construction, relation, rule, narrative schema, or realization operator. The training loop converts clustered failures into new generated modules or, only after repeated counterexamples, carefully reviewed core capabilities.

### Evidence regimes

Every report identifies its regime:

| Regime | ESLM evidence | External model evidence | Proper interpretation |
| --- | --- | --- | --- |
| E0 closed evidence | only the benchmark-provided context | prompt context, no claimed external parity | reasoning and language compilation under matched visible evidence |
| E1 corpus matched | identical public corpus supplied for synthesis or model training | same corpus with disclosed procedure | representation and learning efficiency comparison |
| E2 pretrained reference | declared local corpus plus generated model | model may contain undisclosed pretraining | practical reference, not a controlled learning comparison |
| E3 published reference | ESLM runs locally | published number from another protocol | contextual evidence only unless hashes and protocol match |

Public leaderboards are not automatically comparable. Same benchmark name is insufficient: split, version, prompt, few-shot examples, answer normalization, grader, tool access, and evidence regime must match.

### Success and falsification

The project succeeds scientifically even if ESLM loses on broad QA, provided it produces reproducible measurements that isolate where executable symbolic compilation helps or fails. A useful result may show better provenance, replay, latency, consistency, compositional depth, or data efficiency but worse paraphrase coverage and open-domain recall.

The central hypothesis is weakened when generated code primarily memorizes test-like strings, when rule and construction growth becomes approximately one module per example, when fuzzy matching dominates semantics, when hidden evaluation leakage is required, or when a controlled neural baseline trained on the same evidence consistently wins without losing replayability or verification.

The language-competence hypothesis is weakened if modest spelling or paraphrase changes collapse performance, if grammatical preference remains near chance on appropriate minimal pairs, or if response realization cannot maintain entity, tense, number, and discourse consistency on supported structures.

The symbolic-reasoning hypothesis is weakened if performance drops sharply with additional composition depth despite all needed rules being present, if irrelevant facts change answers, or if the trace cannot reconstruct the exact support for a conclusion.

### Integrity invariants

1. Runtime behavior is determined by versioned source, model modules, input, and options.
2. Training agents cannot inspect hidden labels or use evaluation failures as direct training examples unless a new experiment version explicitly reclassifies them.
3. Every factual answer has an evidence trace or is marked unsupported.
4. Generated code is validated as untrusted executable data before promotion.
5. No intermediate representation exists merely to rename prose; it must enable execution, verification, indexing, caching, provenance, effect control, or reuse.
6. The promoted benchmark model and optional educational knowledge modules are separate evidence regimes. A report names every loaded module and loses direct comparability with the clean benchmark condition when an extra KB is selected.
7. Counts distinguish source records, persistent direct facts, temporary episode facts, rules, and closure consequences. A training-example count must never be presented as a persistent-fact count.

### Current empirical anchor

The first completed public-data run is bAbI v1.2 Task 15 English 10k. The coding agent analyzed 10,000 train episodes. The promoted artifact retains reusable constructions and morphology but zero episode entities, facts, rules, or answers. The isolated prepared test split contains 1,000 episodes and the default artifact produces 1,000 correct semantic values. This evidence supports only the controlled one-step class-deduction capability measured by Task 15.

The second accepted public-data run is bAbI v1.2 Task 16 English 10k. Train-only analysis produced typed color properties and configured analogical induction. The accepted cycle passed 200 inspected working cases, 1,000 fresh train cases, 1,000 aggregate-only official test cases, 52 prior regressions, and three metamorphic variants. It establishes a narrow class-property induction capability, not unrestricted induction or world knowledge.

Three locally generated educational KBs are separate opt-in artifacts. Their source declarations contain 40 entities and 68 direct facts; consistent overlap yields 36 unique entities and 62 unique direct facts when all are loaded. Fourteen rules produce 116 total facts after combined bounded closure. These counts demonstrate modular loading and composition, not public-corpus learning or open-domain knowledge.

The current empirical phase has built independently loadable Open English WordNet 2025 and ATOMIC 2020 source modules with eager and budget-aware shard access. They demonstrate sense-aware lexical queries and defeasible event retrieval, but their source-exposed random and conversational tests are not public benchmark comparisons. A generated 1,000-case long-input suite passed all declared cases after one adapter-level normalization repair; DS022 states its deliberately limited interpretation. Filtered English ConceptNet and bounded GeoNames require source-specific probes, streaming compilers, semantic mappings, and regression evidence. Wikidata is optional thematic work only. QUICK's three authored components remain explicit regression fixtures and never count as learned public knowledge.

## Decisions & Questions

### Q1. Why retain “language model” rather than call the artifact a knowledge base?

Response: The artifact contains a corpus-conditioned lexicon, constructions, discourse cues, semantic compilation rules, narrative schemas, scoring components, and response realization in addition to facts. The documentation nevertheless qualifies the term and reports each competence separately.

### Q2. Is an LLM permitted during normal use?

Response: No. Coding agents are training-time compilers only. Interactive, batch, evaluation, and benchmark runtime paths are offline symbolic execution.

### Q3. What is the first competitive target?

Response: A trustworthy, more structured RAG-like system with modest language tolerance and bounded reasoning, not immediate replacement of a general-purpose LLM.

### Q4. Why keep educational KBs separate from the promoted model?

Response: Selection controls memory, retrieval scope, experimental contamination, and provenance. A public benchmark must run with the artifact synthesized from its authorized train split, while demonstrations may explicitly add reviewed domain modules. Merging them silently would make both fact counts and benchmark claims misleading.

### Question #5: Are bAbI episodes the planned source of world knowledge?

Response: No. bAbI remains a controlled executor and trace diagnostic. Persistent useful knowledge comes from DS018 sources, and DS019 blocks large ingestion until the scale and scope architecture passes review.
