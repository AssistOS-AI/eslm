---
id: DS002
title: Current Executable Symbolic Language Model Theory
status: in-progress
owner: research
summary: Defines the current theory of bounded language compilation, generated symbolic knowledge, proof-producing execution, program-synthesis training, and falsifiable evaluation.
---

# DS002 Current Executable Symbolic Language Model Theory

## Introduction

An Executable Symbolic Language Model must compile supported English utterances into explicit semantic objects, execute those objects against a generated code model, verify the resulting evidence, and realize a grounded response. The coding agent participates only in training. Runtime behavior must be determined by the stable Node.js core, the promoted model modules, the input, and explicit options.

This specification defines the current theory. It is the authority for what ESLM means as a model, how its language and knowledge components compose, what counts as reasoning, and how the central hypothesis can be falsified.

## Core Content

### The model has a stable core, a promoted artifact, and selectable knowledge modules

The stable core must contain algorithms expected to transfer between corpora. These include Unicode normalization, controlled spelling correction, construction matching, query compilation, entity resolution, posting-list retrieval, rule unification, proof construction, uncertainty states, and English realization.

The promoted generated code model must contain structures synthesized from the named experiment training source. These include any justified entities, aliases, facts, rules, accepted lexical variants, construction metadata, realization material, and indexes. An episodic corpus may instead justify an episode compiler with no persistent story facts.

Selectable knowledge modules use the same executable model contract but remain independent artifacts with their own IDs, versions, source digests, evidence regimes, counts, and benchmark eligibility. The active model is constructed by merging the promoted artifact with only the KB IDs named by the caller. Shared entities require compatible identity and kind. Facts and rules are deduplicated by semantic signature, language declarations are combined, indexes are rebuilt, and the merged model is validated before execution.

The core without generated material has procedures but insufficient language specialization and world knowledge. Generated modules without the core have symbols but no execution semantics. Observable competence is the deterministic composition of core, promoted artifact, named optional KBs, and current session evidence. Reports must disclose this complete configuration.

### Surface language and semantic meaning are distinct

The input string must remain available after normalization. Every correction must be recorded. A supported construction must bind spans to typed semantic slots rather than select an answer by text similarity.

The canonical query representation must express intent, predicate or semantic frame, known arguments, requested answer slot, evidence scope, answer type, constraints, language, discourse state, and uncertainty policy. Two surface forms that request the same relation with the same bound arguments should compile to equivalent query objects.

Approximate language handling must be bounded. Declared variants take priority over edit-distance correction. Known entity aliases must not be merged by an unsafe correction. Required relation direction, negation, quantification, modality, and temporal scope must not be discarded as lexical noise. Multiple plausible analyses must remain explicit.

The current language contract is English-only. Unsupported languages must not be partially interpreted through coincidental tokens and presented as supported competence.

### Knowledge is typed and provenance-bearing

Entity identity must be represented by stable IDs rather than repeated surface names. Facts must contain a subject, canonical predicate, exactly one entity object or scalar value, and non-empty provenance. Source qualification, time, modality, uncertainty, and conflict must use explicit fields when introduced; they must not be hidden in ad hoc predicate strings.

Indexes are derived acceleration structures. Subject, predicate, object or value, alias, event, rule, and source indexes must be reconstructible from canonical modules. An index cannot become an independent source of truth. Promotion must fail when an index is stale.

Compression is semantic factoring, not source minification. Stable IDs, interned dictionaries, shared rules, reusable constructions, posting lists, and transition tables may reduce repetition. A compression claim is valid only when all encoded claims, qualifications, exceptions, and provenance remain reconstructible.

### Reasoning is proof-producing execution

A runtime conclusion must be a direct fact or a consequence of explicit executable rules. Rule variables must unify consistently across premises. A derived fact must record the rule and supporting facts. Duplicate signatures and explicit budgets must bound evaluation.

Absence of proof must not be treated as proof of negation. The runtime must distinguish at least:

- `ANSWERED`, when a semantic value has adequate support;
- `UNKNOWN`, when the query is supported but evidence is insufficient;
- `UNSUPPORTED`, when no safe construction or executor represents the request;
- `AMBIGUOUS`, when several supported analyses remain;
- `NEEDS_CLARIFICATION`, when a user choice can resolve the analysis.
- `LEARNED`, when supported English statements add one or more facts to the temporary session overlay without a question.
- `INDUCTIVE`, when an explicitly inductive query permits an allowlisted pattern that meets configured support and observed-coverage thresholds;
- `ABDUCTIVE`, when a supported observation and one or more explicitly abductive rules yield ranked possible premises.

Future conflict and hypothesis states must preserve incompatible sources rather than select a winner silently.

### Response generation follows verification

Content selection must precede wording. The realizer receives verified semantic values and language features, chooses entity display names and an English response construction, orders collections deterministically, and emits an epistemically accurate sentence.

The realizer must not insert unsupported factual material to improve fluency. The structured response is authoritative for automation and must include status, semantic values, query, corrections, provenance, and explicit conversation context where available.

Open narrative generation requires additional content planning, world-state execution, referring-expression planning, morphology, and verification. Short factual realization must not be presented as evidence that those capabilities already exist.

### Training is evidence-bounded program synthesis

Training must begin with an authorized, hashed packet. Only the train split may expose records to the coding agent. The synthesis agent must classify direct assertions, deterministic consequences, supported induction, conflicts, ambiguity, and unsupported material separately.

The agent must generate modular Node.js ESM and a synthesis report. It must not edit the stable runtime during an ordinary synthesis assignment, inspect hidden labels, execute corpus strings, or add one hard-coded answer branch per example. Candidate validation and evaluation must be separate from generation. Promotion is a reviewed effect.

The generated source is the learned representation. Synthesis cost, generated bytes, semantic coverage, provenance coverage, import cost, query latency, and held-out generalization all belong to model evaluation.

Large public sources must be cached by frozen digest, preserve official train/test splits, expose only train chunks to the synthesis agent, and maintain a resumable per-chunk ledger. An episodic benchmark must promote reusable constructions, morphology, schemas, and operators rather than train-story answers. A locally generated educational KB must declare that evidence regime and must not be reported as public benchmark training.

### Task Calculus describes executable operations

OBSERVE, STRUCTURE, RELATE, REDUCE, DERIVE, CONSTRUCT, VERIFY, and EFFECT are semantic operation families. They classify runtime, training, and evaluation work without replacing linguistic or knowledge types.

THEN, ALL, CHOOSE, EACH, UNTIL, BEAM, MEMO, and COMPENSATE describe control composition. A control operator may appear in executable plans only after its semantics and executor are implemented and tested.

A user question uses Query Normal Form rather than the full general task contract. The central runtime circuit is STRUCTURE the language, RELATE entities to knowledge, DERIVE consequences, VERIFY support, and CONSTRUCT the response. A missing executor produces an explicit residual state; runtime must not delegate it to an undeclared model.

### Language scoring and probability claims remain separate

A preference score may rank two strings without being a normalized language probability. The current grammar score is diagnostic and must not be reported as likelihood, perplexity, or bits per symbol.

A future probabilistic ESLM must define a total distribution over the evaluated symbol stream and prove or test normalization. Structured reranking, rule compatibility, and narrative consistency are useful evaluation signals but do not become probabilities merely because they produce numeric scores.

### The theory is falsifiable

Evaluation must vary surface form and executable structure independently. Required tests include spelling perturbations, paraphrases, unseen entity substitutions, irrelevant facts, inverse relations, missing evidence, ambiguity, rule depth, event length, temporal order, and domain transfer where the corresponding capability exists.

The theory is weakened when generated source grows approximately one branch per example, when small meaning-preserving changes destroy coverage, when hidden labels are required, when proof traces do not match the actual computation, or when a controlled external system is consistently superior without losing verification, replay, update locality, or efficiency.

The theory is also weakened when intermediate representations merely rename prose. Every intermediate object must enable execution, verification, indexing, caching, provenance, effect control, or reuse.

### Current implementation boundary

Version 0.1 implements English normalization, selected spelling correction, capitalized-name preservation, unique bounded proper-name matching, a small question and assertion grammar, entity and alias resolution, one-step discourse reference, temporary session entities, facts, typed properties, and universal rules, indexed model-plus-session evidence, positive rule closure to eight configured rounds, proof depth and provenance, configured class-property induction, guarded abductive reversal, deterministic English factual realization, interactive and batch interfaces, frozen public-data caching and chunk preparation, benchmark-guided learning gates, model and KB validation, selective eager or lazy KB loading, public and conversational evaluation, published-reference registration, and external prediction exchange.

The completed public-data runs are bAbI v1.2 Tasks 15 and 16 English 10k. Task 15 has 10,000 train cases and 1,000 correct held-out test cases. Task 16 has 10,000 train cases, 1,000/1,000 fresh train cases, and 1,000/1,000 aggregate-only official test cases after proof, metamorphic, and regression gates. The promoted combined model has zero persistent episode facts. The three optional generated educational KBs yield 36 unique entities, 62 unique direct facts, 14 rules, and 116 closure facts when loaded together.

Event calculus, explicit negation, defeasible exceptions, temporal and belief state, broad morphology, induced construction grammars, conflict execution, narrative schemas, open generation, broad world knowledge, and normalized probabilistic scoring remain research contracts rather than implemented capabilities. DS017 tracks this boundary by theory component.

## Decisions & Questions

### Question #1: Why call the artifact a language model?

Response: The artifact contains corpus-conditioned lexical and construction material and participates in compilation from language to meaning and realization from meaning to language. The term does not imply unrestricted next-token modeling; capability reports must state the supported fragment.

### Question #2: Why is the current language contract English-only?

Response: A single explicit language keeps morphology, constructions, benchmarks, and realization internally coherent. Additional languages require their own corpora, construction coverage, morphology, ambiguity tests, and realization validation rather than a few translated templates.

### Question #3: What makes a symbolic model update legitimate?

Response: A legitimate update is derived from authorized evidence, preserves provenance, improves a reusable representation or executor, passes safety and semantic validation, and is evaluated on isolated cases. Copying a hidden answer or adding a case-specific branch is not learning under this contract.

### Question #4: Does loading several KBs merely concatenate their facts?

Response: No. Merge validation reconciles shared identities, deduplicates identical claims, rebuilds positions, and allows rules to compose across shared predicates. Therefore both direct-fact count and post-closure fact count are reported. Cross-module consequences are acceptable only when their proof names the contributing modules and tests confirm the intended semantics.

## Conclusion

ESLM is defined by bounded language compilation, generated symbolic knowledge, proof-producing execution, verified English realization, and evidence-isolated program synthesis. Its claims are limited to implemented and measured capability layers, and its central generalization hypothesis remains directly falsifiable.
