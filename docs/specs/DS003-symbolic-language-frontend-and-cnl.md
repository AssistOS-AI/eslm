---
id: DS003
title: Symbolic Language Front-End and Controlled Natural Language
status: in-progress
owner: language
summary: Specifies direct symbolic parsing, Semantic IR, controlled-language growth, ambiguity, diagnostics, and the exact boundary with external language normalization.
---

# DS003 Symbolic Language Front-End and Controlled Natural Language

## Introduction

The language front-end accepts a growing, explicitly tested fragment of ordinary language while refusing interpretations that lose protected meaning. This specification owns direct parsing, semantic composition, ambiguity, and parser diagnostics. DS013 exclusively owns the external Language Agent trigger, proposal protocol, validation, cache, and CLI profile.

## Core Content

### 1. Direct-symbolic-first policy

Every input is first offered to the symbolic language front-end. Language Agent is never the first path and is not part of the deployable runtime. The default operator CLI keeps the wrapper ready, but no external call occurs unless the complete direct attempt returns `UNPARSED`. The front-end must determine whether it can construct a semantically complete and safe representation, not merely whether it can produce a syntactic tree.

The accepted language is an extensible Controlled Natural Language. It begins with the linguistic forms required by reasoning benchmarks and grows through rigorously tested generic additions. The CNL is an interface contract between text and executable semantics, not a benchmark-specific collection of templates.

### 2. Recommended parsing technique

The target architecture for language forms beyond the implemented bounded frontend remains an explicit design choice in
Question #1. No choice may weaken the shared acceptance contract: the frontend must preserve alternatives where the
grammar permits them, compose complete Semantic IR, expose exact coverage failures, enforce agreement, valency, role,
and scope constraints, and reject partial interpretations that lose protected meaning.

An Earley-style chart parser combined with feature or unification grammar and compositional semantic actions is the
leading general architecture because a chart can reuse partial analyses and support recursive constructions. A
source-declared deterministic grammar adapter can remain appropriate for a documented controlled sublanguage when it
produces the same generic Semantic IR and does not claim unrestricted English coverage.

Each lexical entry contributes a syntactic category and a semantic frame. Grammar productions combine these frames into Semantic IR. A placement verb may expose agent, theme and destination roles. A temporal connective contributes an ordering relation. A universal determiner contributes a scoped quantifier.

The parser must separate interpretation from inference. From “Every dog is an animal. Rex is a dog.” it constructs a universal implication and a class assertion. It does not construct `animal(Rex)`. That conclusion belongs to the reasoner.

### 3. Front-end phases

The first phase identifies language, sentence boundaries, protected operators, morphology and lexical candidates. Unknown nouns, names and nonce predicates remain valid symbolic atoms when their grammatical roles are clear.

The second phase builds syntactic alternatives with features. The third phase composes semantic structures for every constituent. The fourth phase resolves references when the evidence is structural and preserves candidate alternatives when it is not. The fifth phase runs a CNL acceptance gate.

The acceptance gate verifies complete syntactic coverage, complete semantic coverage, preservation of logical operators, safe scope, reference status and compatibility with the Semantic IR schema. A parse may be accepted with unresolved lexical meaning if the symbol remains usable. It may not be accepted when negation, quantification, modality or relation direction has been dropped.

### 4. Semantic IR obligations

The front-end must be able to represent entities, classes, properties, binary relations, n-ary events, semantic roles, quantifiers, negation, conjunction, disjunction, implication, equality, inequality, temporal order, spatial relations, modality, defaults, confidence, reference alternatives and question goals.

The IR must preserve scope. “Not every student passed” cannot be collapsed into “Every student did not pass.” It must preserve event identity so that temporal and causal relations can connect events rather than only surface clauses.

The IR must preserve uncertainty. “John may have left” is not the same as “John left.” A source claim marked likely or normally must remain distinct from a strict assertion.

### 5. Ambiguity

The parser must be allowed to produce several semantic candidates. The reasoner may evaluate all candidates. If every candidate entails the same answer, the answer may be returned with an ambiguity note. If candidates lead to different answers and no deterministic disambiguation exists, the runtime must return an ambiguous status rather than guessing.

Coreference is treated similarly. The reference resolver maintains candidates using type, number, grammatical role, recency, discourse prominence and semantic compatibility. World knowledge may prune candidates, but the resolution and its evidence must remain visible in the trace.

### 6. CNL evolution

CNL evolution is driven by benchmark and ingestion failures. The coding agent must classify a failure as morphology, lexical frame, grammar, semantic composition, scope, reference or unsupported discourse. Generic constructions are added to `src`; lexical and domain-specific interpretations are added to KBs.

A new grammar form is accepted only after focused examples, metamorphic equivalents, contrastive examples and all relevant regressions pass. The direct symbolic rate must be recomputed. A grammar extension that increases coverage but silently changes existing semantics is a regression.

### 7. Alternative techniques

| Technique | Recommended role |
|---|---|
| CFG with semantic actions | Suitable for an initial narrow implementation, but likely to require feature extensions. |
| DCG-style grammar | Strong conceptual model for declarative grammar and semantic composition, even outside Prolog. |
| CCG | Potential later extension for richer compositional English; not the recommended starting point. |
| PEG | Useful for deterministic sublanguages and record formats, but not ideal for preserving natural-language ambiguity. |
| Dependency parsing | Optional hybrid experiment; a learned parser changes the claim about symbolic language understanding. |
| Finite-state or regex patterns | Appropriate for morphology, lexical preprocessing and fast paths, not as the principal semantic architecture. |

### 8. Required diagnostics

For every failed or partially accepted input, the front-end must expose the longest covered spans, unmatched tokens, candidate lexical categories, failed feature constraints, missing semantic actions, unresolved operators and reference status. These diagnostics are the training signal for the coding agent.

The front-end must report whether an input was directly parsed, handled by an explicit symbolic task adapter, accepted after Language Agent translation or simplification, rejected by host normalization validation, failed in the external normalization process, or left unparsed. The implemented route names are `direct-symbolic`, `direct-symbolic-task-adapter`, `language-agent-normalized`, `language-agent-normalization-rejected`, and `language-agent-normalization-failed`. The normalization receipt separately records whether the accepted candidate declared translation or simplification. This route is part of every benchmark result.

### 9. Capability curriculum and benchmark evidence

The controlled language grows by semantic construction rather than benchmark template. Its capability sequence begins with atomic class, property, relation, event, and direct-question forms; adds universal and existential quantification, explicit negation, conjunction, disjunction, implication, equality, inequality, and open-world questions; adds event roles, possession, reference candidates, temporal order, spatial relations, and state change; then adds cardinality, exclusivity, ordinals, assignments, defaults, exceptions, causality, modality, and richer discourse.

Benchmarks expose constructions that are absent or semantically unsafe, but DS017 adapters and DS010 reports own benchmark identity, split use, and measurement. A parser repair is accepted only when the construction is stated independently of the source, survives nonce and full-renaming tests, preserves meaning-changing contrasts, and does not alter existing accepted Semantic IR. The direct-language measurement remains separate from logical-form or structured-adapter execution.

### 10. Boundary with external normalization

The direct frontend preserves original text and records Unicode normalization, punctuation handling, declared lexical variants, and conservative spelling repair. Declared variants take priority over edit distance; short tokens are not guessed aggressively; tied repairs remain ambiguous. Unknown names, nouns, and nonce predicates remain usable symbolic atoms when their syntactic and semantic roles are clear.

When direct execution ends in `UNPARSED`, the operator CLI may invoke the DS013 Language Agent wrapper. DS013 exclusively defines translation and simplification authority, protected anchors, retry feedback, subprocess isolation, cache, route accounting, and offline override. The parser contributes only its direct result and bounded unsupported-form diagnostics. It never requests an answer or exposes reasoning state.

### Implemented factoid and narrative projections

The factoid frontend recognizes a bounded set of ordinary English question constructions before falling back to an
open-relation frame. Supported frames record the WH type, construction class, relation surface, direction when known,
subject surface when recoverable, and a deterministic list of conservative paraphrases that existing providers may
already understand. Examples include country and place questions, passive “used for” questions, and event-continuation
questions. A syntactically recognized factoid with no provider evidence is not reported as `UNPARSED`; it returns an
explicit knowledge gap containing the factoid frame and the providers considered.

This projection does not guess a predicate from an answer and does not make arbitrary English equivalent to a supported
provider query. Provider results are normalized and compared as semantic value sets. Agreement merges provenance;
disagreement returns ambiguity; no response returns missing knowledge. The original question, generated provider
candidate, provider identity, and route remain observable.

Story continuation records use a separate explicit task adapter because a four-sentence context plus candidate endings
is already a machine-declared selection task. Each sentence is compiled into a bounded narrative event frame with
content terms, predicate candidates, named participants, pronoun groups, polarity, modality, and tense. Candidate
identifiers are derived from visible content and are not answer positions. The adapter may attach bounded semantic
evidence from loaded providers, then submits the label-free task to the generic continuation selector. This path does
not claim that the ordinary question parser understands arbitrary stories, and the host-only correct ending remains
outside the task.

## Decisions & Questions

### Question #1: Which parser architecture should own broader controlled-language theory compilation?

Options:

1. Adopt an Earley-style chart parser with feature or unification grammar as the general frontend. This best preserves
   ambiguity and recursive structure, but requires complete semantic-action and diagnostic infrastructure.
2. Use source-declared deterministic grammar adapters for bounded controlled theories while retaining the current
   generic Semantic IR. This limits implementation cost but cannot by itself establish broader direct-English competence.
3. Use a staged combination: source-declared adapters for frozen sublanguages and an Earley/feature frontend for forms
   demonstrated across independent sources. This preserves an incremental path but requires explicit route and coverage
   separation so adapter success is never reported as generic-language success.

Selection requires operator- and scope-preservation alignments, ambiguity fixtures, nonce and paraphrase controls,
direct-versus-adapter coverage measurements, and evidence that accepted semantics do not change under the migration.
Until one option is selected, broader grammar work remains route-explicit and no source adapter is promoted into the
general parser merely because it improves a benchmark.

### Question #2: What happens when a recognized factoid has no provider evidence?

Response: The frontend has established the communicative operation and preserved its relation surface, direction, and
arguments. Failure after every loaded provider declines the frame is evidence about available knowledge or provider
coverage, not evidence that the question was linguistically uninterpretable. Keeping those statuses separate prevents
Language Agent normalization from being misused as factual retrieval.

### Question #3: Why does Language Agent normalization have a separate authority?

Response: Direct parsing and external normalization have different trust, reproducibility, and deployment boundaries. DS003 stays stable when an adapter model, process protocol, cache, or proposal policy changes; DS013 can evolve that operator service without redefining accepted Semantic IR.

## Conclusion

The accepted CNL is an extensible semantic interface rather than a list of benchmark templates. Every accepted path preserves logical operators and ambiguity, and every fallback returns through the same symbolic parser.
