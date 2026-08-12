---
id: DS024
title: Scope-Safe Complex Language Decomposition Research
status: planned
owner: language-research
summary: Defines the research program for complex clause graphs, protected scope, reference resolution, semantic-equivalence checks, confidence calibration, and safe promotion of broader language heuristics.
---

# DS024 Scope-Safe Complex Language Decomposition Research

## Introduction

Long and imperfect sentences are often understandable because several partial analyses agree. They are also where a
small rewrite can silently change negation, quantifier force, coordination, temporal order, causality, or reference.
DS022 implements a bounded proposal ensemble for near-CNL wording. This specification names the deeper language
problems that require sustained research instead of hiding them behind a generic “better parser” task.

## Core Content

### 1. Current baseline and research boundary

The implemented baseline segments text, proposes bounded repairs and decompositions, protects recognized operators,
votes with explicit confidence, compiles candidate Semantic IR without querying KBs, and executes one selected
candidate through the ordinary runtime. It handles a reviewed set of agreement, spelling, question, quantified-rule,
request-envelope, and clause patterns. It declines unsafe structures and preserves close semantic alternatives as
ambiguity.

The research target is broader English and multilingual operator-side normalization with a typed clause graph,
explicit scope and reference alternatives, and mechanically testable equivalence obligations. Statistical language
models may be studied offline as proposal generators, but the deployable inference closure remains deterministic and
every promoted transformation remains inspectable.

### 2. Clause and scope graph

The central representation is a finite graph with:

- token and character spans anchored to the original text;
- clauses, predicates, arguments, modifiers, and discourse relations;
- quantifier, negation, modality, comparison, temporal, causal, conditional, and coordination operators;
- scope edges and dominance constraints;
- entity mentions and bounded candidate antecedents;
- statement, question, command, quotation, and source-material force;
- proposed CNL clauses with complete source alignments;
- unresolved alternatives, confidence evidence, and declined transformations.

An opaque identifier may never contain an unrepresented protected operator. If a nominal surface contains `and`, `or`,
`not`, a quantifier, a temporal connector, or a finite-clause cue, it is decomposed with explicit scope or rejected.
Declared multiword entity aliases remain atomic only because the active model explicitly licenses their complete
surface.

### 3. Decomposition research tracks

The project studies each construction as a separate transformation family with positive, negative, and ambiguity
controls:

1. coordination of subjects, predicates, objects, clauses, and mixed categories;
2. ellipsis, gapping, shared auxiliaries, and repeated predicates;
3. restrictive and non-restrictive relative clauses;
4. apposition, parentheticals, quotations, and reported speech;
5. conditionals, exceptions, unless-clauses, and counterfactual markers;
6. temporal order, aspect, event identity, and nested time modifiers;
7. causal and explanatory relations without erasing direction;
8. passive, raising, control, and argument alternations;
9. pronouns, descriptions, discourse focus, and cross-sentence coreference;
10. questions embedded in requests, multiple questions, and mixed statement-command episodes;
11. spelling, word boundaries, inflection, and invented predicate forms;
12. multilingual translation alignments for protected operators and reviewed lexical content.

A family is not “supported” merely because one surface can be rewritten. Its contract defines licensed structures,
meaning-changing neighbors, interaction with every protected operator, and what remains ambiguous.

### 4. Proposal ensemble and voting

Independent techniques emit typed graph edits, not bare replacement strings. A vote records preconditions, affected
spans, operator preservation, argument mapping, estimated semantic risk, and whether another independent analysis
corroborates it. The ensemble may combine compatible edits under a bounded beam. It never uses answer values, KB
success, benchmark identity, or reasoner outcome to decide what the sentence meant.

Confidence is calibrated per construction and interaction class. A globally high average is insufficient if negated
coordination remains unsafe. The selector uses one semantic acceptance threshold across work profiles; profiles change
the explored frontier, not the meaning of acceptance. A larger profile may expose an ambiguity that a smaller search
could not enumerate, in which case the smaller receipt must say its candidate frontier was incomplete.

### 5. Semantic preservation and equivalence

Research compares three levels of preservation checks:

- **anchor conservation:** operator identities, directions, numbers, names, quotations, and force remain aligned;
- **typed graph equivalence:** source and candidate clause graphs have the same protected structure and argument roles;
- **finite model contrast:** bounded generated worlds search for a model in which source and candidate differ.

The finite-model level is a falsifier, not a proof of full natural-language equivalence. A discovered countermodel
rejects the transformation. Absence under a finite bound raises evidence but does not erase declared uncertainty.
Open-class synonymy requires a reviewed mapping, source-backed ontology relation, or explicit user confirmation.

### 6. Reference and ambiguity

Reference resolution produces a bounded candidate set with type, number, recency, grammatical role, and discourse
evidence. A unique high-scoring candidate may be proposed; close candidates remain explicit alternatives. World
knowledge can later rank already identified alternatives only through a separate declared policy and may never delete
the syntactic ambiguity receipt.

Ambiguity is a successful interpretation outcome, not a parser failure. Once the system has identified two supported
Semantic IRs, it returns `AMBIGUOUS` with a focused clarification request and does not escalate to a Language Agent in
the hope that fluency will hide the choice.

### 7. Corpora and evaluation

Training and evaluation material is grouped by construction template, lexical inventory, discourse world, and source
document. Required splits include vocabulary-disjoint, template-disjoint, construction-interaction, typo process,
long-context, and adversarial protected-operator sets. Metrics report:

- exact Semantic IR and clause-graph agreement;
- protected-anchor precision and recall;
- accepted interpretation coverage;
- unsafe acceptance and meaning-change rate;
- ambiguity detection and clarification quality;
- calibration by construction and confidence band;
- candidate count, edit work, parse work, bytes, and latency;
- downstream answer accuracy only as a separate end-to-end measure.

Meaning-changing acceptance is the principal safety metric. A system that parses more inputs by collapsing operators
has regressed even if a downstream answer score rises on an imbalanced fixture.

### 8. Promotion and long-horizon stages

Each construction advances through: authored minimal pairs; renamed and nonce controls; corpus probe; typed graph
implementation; interaction testing; frozen development evaluation; generic-core guardian review; and a new protected
split. Multi-construction support follows only after pairwise interactions are tested. The project expects this work to
continue through successive research releases rather than declaring unrestricted language understanding from a single
parser expansion.

## Decisions & Questions

### Question #1: Why use a lattice instead of the highest-scoring rewrite?

Response: Complex language often has several locally reasonable analyses. A lattice preserves alternatives and makes
the confidence margin, operator interactions, and declined paths visible before one interpretation is executed.

### Question #2: May KB evidence disambiguate a sentence?

Options:

- use typed world knowledge to rank only alternatives that the language analysis already enumerated; or
- require user confirmation whenever the supported syntactic analysis remains non-unique.

Until a calibrated trust-aware policy is selected, interpretation remains independent of KB answer success.

### Question #3: Why are opaque multiword symbols rejected when they contain operators?

Response: Encoding `tea and water` as one symbol makes a proof appear valid while discarding conjunction. Every
protected operator must exist as structure or cause a conservative failure.

## Conclusion

Complex-language coverage grows safely when every transformation has an explicit scope model, a competing-analysis
story, and a falsification suite. This program turns difficult constructions into named research tracks rather than
allowing an approximate rewrite to acquire hidden authority.
