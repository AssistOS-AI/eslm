---
id: DS003
title: Symbolic Language Front-End, CNL Curriculum, and Optional Normalization
status: in-progress
owner: language
summary: Specifies direct symbolic parsing, Semantic IR, benchmark-derived language stages, ambiguity, diagnostics, and tightly constrained optional LLM translation or simplification.
---

# DS003 Symbolic Language Front-End, CNL Curriculum, and Optional Normalization

## Introduction

The language front-end must accept heterogeneous ordinary text while refusing interpretations that lose protected meaning. This specification combines the parser design, benchmark-derived CNL curriculum, and optional language-only LLM fallback into one contract.

## Core Content

### 1. Direct-symbolic-first policy

Every English input is first offered to the symbolic language front-end. The LLM is not part of the normal path. The front-end must determine whether it can construct a semantically complete and safe representation, not merely whether it can produce a syntactic tree.

The accepted language is an extensible Controlled Natural Language. It begins with the linguistic forms required by reasoning benchmarks and grows through rigorously tested generic additions. The CNL is an interface contract between text and executable semantics, not a benchmark-specific collection of templates.

### 2. Recommended parsing technique

The primary parser should be an Earley-style chart parser combined with feature or unification grammar and compositional semantic actions. Chart parsing is recommended because it can preserve alternatives, reuse partial analyses, support recursive constructions and report exact coverage failures. Feature constraints provide agreement, valency, role compatibility and scope information that would become fragile in a plain CFG.

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

The front-end must report whether an input was directly parsed, symbolically normalized, LLM-translated, LLM-simplified, rejected after normalization or left unparsed. This route is part of every benchmark result.

### 1. Purpose

The benchmark suite serves two roles. It measures reasoning and it defines the minimum language constructions that the symbolic front-end must eventually support. The CNL should not attempt to implement unrestricted English in advance. It should acquire forms in a curriculum whose semantic obligations are testable.

The table below consolidates the benchmark families discussed for the project. Benchmark adapters must preserve the official task semantics while translating dataset records into the common runtime task contract.

| Benchmark family | Mandatory CNL and semantic support |
|---|---|
| bAbI | Simple declaratives, locations, movement, possession, conjunction, yes/no and WH questions, pronouns, temporal order, counting, negation and state updates. |
| LogicBench and IIBench | Atomic propositions, categorical forms, universal and existential quantification, implication, conjunction, disjunction, explicit negation and non-monotonic or default formulations where present. |
| RuleTaker and ProofWriter | Unary and binary facts, universally quantified rules, conjunctive antecedents, negated facts, open-world unknown, query propositions, proof depth and proof traces. |
| PrOntoQA | Class membership, taxonomic implication, nonce predicates, multi-hop rule composition and proof planning over synthetic worlds. |
| LogicSkills | Natural-language symbolization, categorical and relational FOL, validity, invalidity and countermodel-oriented structures. |
| FOLIO and ProverQA | Richer human or generated FOL surface forms, nested quantification, relational predicates, complex coordination, negation scope, embedded clauses and multi-clause premises. |
| CLUTRR | Named entities, kinship predicates, gender and possession cues, binary-relation chains, genitives, pronouns and systematic composition beyond observed chain lengths. |
| StepGame and spatial benchmarks | Left, right, above, below, diagonals, inside, contains, directional variants, multi-hop spatial composition, entity references and distractors. |
| SLR-Bench | Relational, arithmetic and recursive rules, variables, sequences, ordering, numbers, latent transformations and difficulty levels that scale systematically. |
| SATBench | Conditions, conjunction, disjunction, negation, exclusive alternatives, assignments, equality, inequality and constraints requiring search. |
| ZebraLogic | Ordinals, positions, adjacency, exactly-one, one-to-one assignments, comparisons, exclusions, ordering and combinatorial constraint language. |
| Defeasible NLI | Defaults, exceptions, strengthening and weakening evidence, contradiction, retraction and graded support. |
| ART or alphaNLI | Events, state transitions, temporal continuity, causality, plausible explanations and alternative hypotheses. |
| CommonsenseQA | Conceptual relations involving use, purpose, location, property, cause and effect, expressed through short natural questions and options. |
| SocialIQA | Event roles, intentions, desires, emotions, effects on actors, social expectations and purposive or causal questions. |
| PIQA | Goals, actions, tools, materials, physical properties, affordances, means and alternative procedures. |
| WinoGrande | Pronouns, agreement, semantic-role compatibility, causal clauses, comparative properties and commonsense-sensitive reference resolution. |
| ReClor and LogiQA | Complex conditionals, quantified argumentation, necessity and possibility, exceptions, ordering, discourse relations, multiple entities and long question contexts. |

### 2. CNL capability stages

The first stage supports atomic statements, class membership, properties, binary relations, simple events and direct questions. This stage should cover much of bAbI and the simplest synthetic logic tasks.

The second stage adds universal and existential quantification, categorical negatives, conjunction, disjunction, implication, equality, inequality and explicit open-world status. This stage targets LogicBench, IIBench, RuleTaker, ProofWriter, PrOntoQA and major portions of LogicSkills.

The third stage adds event roles, possession, reference, temporal order, spatial relations and state change. This stage targets bAbI state tasks, CLUTRR, StepGame and related spatial benchmarks.

The fourth stage adds cardinality, exactly-one, at-least, at-most, exclusive alternatives, adjacency, ordinal positions and assignment constraints. This stage targets SATBench, ZebraLogic and parts of SLR-Bench.

The fifth stage adds defaults, exceptions, probability-like modalities, causal tendencies, intentions, reactions, affordances and abduction. This stage targets Defeasible NLI, CommonsenseQA, SocialIQA, PIQA and alphaNLI.

The final stage grows richer surface realization: relative clauses, embedded clauses, nested quantifier scope, complex coordination and discourse-level reference. This stage is driven by FOLIO, ProverQA, WinoGrande, ReClor and LogiQA.

### 3. Benchmark routing

Routing must never be based solely on benchmark name. Every input is attempted symbolically. Benchmark metadata may configure answer schemas and official validators, but it must not select a privileged parser or solver.

Adapters may declare the expected answer domain, such as entailed, contradicted and unknown, or a fixed set of multiple-choice labels. They may not encode benchmark answers or bypass the common Semantic IR and planner.

### 4. Benchmark use during training

Controlled and generative benchmarks should drive early learning because their failures are diagnosable. Human-written benchmarks should initially function as transfer tests and later as controlled sources of language-front-end failures.

The agent must not repeatedly optimize against a finite public test split. It should use official training or development records, generated fresh instances where available, metamorphic derivatives and hidden local holdouts. Public test results are reserved for infrequent transfer evaluation.

### 5. Mandatory measurements

Each benchmark report must separate direct symbolic parsing coverage, LLM translation usage, LLM simplification usage, unparsed rate, answer accuracy, proof validity where applicable, metamorphic consistency, fresh-sample accuracy, reasoning-depth curves and regression effects on previous suites.

The most important language-learning curve is the joint evolution of direct symbolic rate and answer accuracy. Higher accuracy accompanied by lower symbolic autonomy is not accepted as unqualified progress.

### 1. Architectural status

The LLM is optional and external to symbolic reasoning. It is invoked only when language detection identifies a non-English input or the CNL acceptance gate rejects an English construction that may be conservatively normalized.

The LLM cannot bypass the symbolic parser. Its output is untrusted text that must pass the same lexical, syntactic, semantic and operator-preservation checks as direct input.

### 2. Permitted behavior

The LLM may translate another language into English. It may split long sentences into shorter sentences, expand contractions, normalize punctuation, replace unusual syntax with a simpler equivalent, make an explicitly stated subject or object syntactically explicit, and convert active and passive forms when semantic roles are unambiguous.

It may preserve an unknown technical term or proper name unchanged. It may mark genuine ambiguity rather than resolving it.

### 3. Prohibited behavior

| Prohibited operation | Reason |
|---|---|
| Answering the question | This would hide neural reasoning behind the language front-end. |
| Deriving a logical consequence | Inference belongs to the symbolic reasoner. |
| Adding commonsense knowledge | Knowledge must come from registered KBs or explicit user context. |
| Removing distractors | Relevance selection may be part of the reasoning task. |
| Guessing an ambiguous pronoun | Coreference may be the benchmarked capability. |
| Strengthening or weakening quantifiers | This changes logical meaning. |
| Dropping negation or modality | This changes truth conditions. |
| Changing temporal order or relation direction | This changes the task semantics. |
| Converting a plausible outcome into a fact | Defeasible knowledge must remain defeasible. |

### 4. Invocation detector

The detector uses language identification, parser coverage, missing grammar forms, failed feature constraints, missing semantic actions, unresolved protected operators and ambiguity status. Complexity alone is not a trigger.

A sentence with nonce predicates may be directly parseable. A short idiomatic sentence may require normalization. Decisions are per input segment, not per benchmark name.

### 5. Protected anchors

Before accepting normalized text, the validator compares named entities, numbers, answer options, negation, quantifiers, modal operators, conditionals, temporal operators, disjunction, conjunction, comparatives and relation direction.

Loss or unexplained change of a protected anchor rejects the normalization. The validator also requires source alignment from normalized clauses to original spans when the LLM interface can provide it.

### 6. Reparse and semantic comparison

Normalized text is parsed into Semantic IR. When a partial source parse exists, the system compares preserved fragments and operator structure. The LLM output is accepted only if it increases coverage without contradicting known source semantics.

If normalization remains unparseable or changes protected meaning, the runtime returns an unverified-normalization or unparsed status. It must not recursively ask the LLM to solve the task.

### 7. Evaluation tracks

Every benchmark reports a direct-symbolic track and an optional normalized track. Direct symbolic rate is the percentage of inputs that reach Semantic IR without LLM translation or simplification.

The system must also report translation rate, simplification rate, normalization rejection rate, accuracy by route and the categories of syntax that trigger fallback. During benchmark learning, the desired direction is higher direct symbolic rate without lower accuracy or new regressions.

### 8. Deployment policy

A deployment may disable the LLM entirely. In that mode, unsupported language receives a structured failure. Another deployment may permit translation only, or translation plus simplification. The result always declares the policy and route used.

### Normalization details retained from the earlier implementation

The direct path preserves original text and records Unicode normalization, punctuation handling, declared lexical variants, and conservative spelling repair. Declared variants take priority over edit distance. Short tokens must not be guessed aggressively. A repair must not merge two known entity aliases, and tied candidates remain ambiguous.

Unknown names, nouns, and nonce predicates may remain symbolic atoms when grammar makes their role clear. This supports structure tests without turning vocabulary coverage into a parser prerequisite. Relation direction, argument roles, negation, quantification, modality, conditional structure, time, and answer options are protected anchors throughout normalization.

## Decisions & Questions

### Question #1: Why choose an Earley-style chart parser with features?

Response: It preserves alternatives, reuses partial analyses, supports recursive grammar, exposes exact coverage failures, and allows agreement, valency, role, and scope constraints that a flat pattern list cannot express safely.

### Question #2: When may an LLM participate?

Response: Only after the direct symbolic acceptance gate rejects a segment or language detection identifies a configured non-English input. The LLM may translate or conservatively simplify language, never answer, infer, retrieve knowledge, remove distractors, or resolve ambiguity by guessing.

### Question #3: How is language progress measured?

Response: Reports pair direct-symbolic coverage with semantic accuracy, proof validity, fallback usage, rejection, and regression by construction family. Accuracy gained by silently increasing LLM dependence is not unqualified progress.

## Conclusion

The accepted CNL is an extensible semantic interface rather than a list of benchmark templates. Every accepted path preserves logical operators and ambiguity, and every fallback returns through the same symbolic parser.
