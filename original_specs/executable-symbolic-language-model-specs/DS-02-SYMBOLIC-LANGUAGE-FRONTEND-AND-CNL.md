# DS-02 — Symbolic Language Front-End and CNL

## 1. Direct-symbolic-first policy

Every English input is first offered to the symbolic language front-end. The LLM is not part of the normal path. The front-end must determine whether it can construct a semantically complete and safe representation, not merely whether it can produce a syntactic tree.

The accepted language is an extensible Controlled Natural Language. It begins with the linguistic forms required by reasoning benchmarks and grows through rigorously tested generic additions. The CNL is an interface contract between text and executable semantics, not a benchmark-specific collection of templates.

## 2. Recommended parsing technique

The primary parser should be an Earley-style chart parser combined with feature or unification grammar and compositional semantic actions. Chart parsing is recommended because it can preserve alternatives, reuse partial analyses, support recursive constructions and report exact coverage failures. Feature constraints provide agreement, valency, role compatibility and scope information that would become fragile in a plain CFG.

Each lexical entry contributes a syntactic category and a semantic frame. Grammar productions combine these frames into Semantic IR. A placement verb may expose agent, theme and destination roles. A temporal connective contributes an ordering relation. A universal determiner contributes a scoped quantifier.

The parser must separate interpretation from inference. From “Every dog is an animal. Rex is a dog.” it constructs a universal implication and a class assertion. It does not construct `animal(Rex)`. That conclusion belongs to the reasoner.

## 3. Front-end phases

The first phase identifies language, sentence boundaries, protected operators, morphology and lexical candidates. Unknown nouns, names and nonce predicates remain valid symbolic atoms when their grammatical roles are clear.

The second phase builds syntactic alternatives with features. The third phase composes semantic structures for every constituent. The fourth phase resolves references when the evidence is structural and preserves candidate alternatives when it is not. The fifth phase runs a CNL acceptance gate.

The acceptance gate verifies complete syntactic coverage, complete semantic coverage, preservation of logical operators, safe scope, reference status and compatibility with the Semantic IR schema. A parse may be accepted with unresolved lexical meaning if the symbol remains usable. It may not be accepted when negation, quantification, modality or relation direction has been dropped.

## 4. Semantic IR obligations

The front-end must be able to represent entities, classes, properties, binary relations, n-ary events, semantic roles, quantifiers, negation, conjunction, disjunction, implication, equality, inequality, temporal order, spatial relations, modality, defaults, confidence, reference alternatives and question goals.

The IR must preserve scope. “Not every student passed” cannot be collapsed into “Every student did not pass.” It must preserve event identity so that temporal and causal relations can connect events rather than only surface clauses.

The IR must preserve uncertainty. “John may have left” is not the same as “John left.” A source claim marked likely or normally must remain distinct from a strict assertion.

## 5. Ambiguity

The parser must be allowed to produce several semantic candidates. The reasoner may evaluate all candidates. If every candidate entails the same answer, the answer may be returned with an ambiguity note. If candidates lead to different answers and no deterministic disambiguation exists, the runtime must return an ambiguous status rather than guessing.

Coreference is treated similarly. The reference resolver maintains candidates using type, number, grammatical role, recency, discourse prominence and semantic compatibility. World knowledge may prune candidates, but the resolution and its evidence must remain visible in the trace.

## 6. CNL evolution

CNL evolution is driven by benchmark and ingestion failures. The coding agent must classify a failure as morphology, lexical frame, grammar, semantic composition, scope, reference or unsupported discourse. Generic constructions are added to `src`; lexical and domain-specific interpretations are added to KBs.

A new grammar form is accepted only after focused examples, metamorphic equivalents, contrastive examples and all relevant regressions pass. The direct symbolic rate must be recomputed. A grammar extension that increases coverage but silently changes existing semantics is a regression.

## 7. Alternative techniques

| Technique | Recommended role |
|---|---|
| CFG with semantic actions | Suitable for an initial narrow implementation, but likely to require feature extensions. |
| DCG-style grammar | Strong conceptual model for declarative grammar and semantic composition, even outside Prolog. |
| CCG | Potential later extension for richer compositional English; not the recommended starting point. |
| PEG | Useful for deterministic sublanguages and record formats, but not ideal for preserving natural-language ambiguity. |
| Dependency parsing | Optional hybrid experiment; a learned parser changes the claim about symbolic language understanding. |
| Finite-state or regex patterns | Appropriate for morphology, lexical preprocessing and fast paths, not as the principal semantic architecture. |

## 8. Required diagnostics

For every failed or partially accepted input, the front-end must expose the longest covered spans, unmatched tokens, candidate lexical categories, failed feature constraints, missing semantic actions, unresolved operators and reference status. These diagnostics are the training signal for the coding agent.

The front-end must report whether an input was directly parsed, symbolically normalized, LLM-translated, LLM-simplified, rejected after normalization or left unparsed. This route is part of every benchmark result.
