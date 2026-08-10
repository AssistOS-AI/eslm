# StoryIR Annotation Guide

## 1. Objective

The annotation set measures whether natural-language stories are compiled faithfully before symbolic execution. It is not intended to encode every pragmatic implication. Annotators distinguish what the text states, what a licensed rule infers, and what remains uncertain.

## 2. Recommended sample

Begin with 500 stories stratified by length, dialogue density, pronoun density, vocabulary rarity, event count, and reference-parser coverage. Reserve at least 100 stories as an annotation-only test set not shown to implementation agents. Expand to 2,000–3,000 stories once the ontology stabilizes.

Use two independent annotators on at least 20% and adjudicate disagreements. Report agreement separately for spans, entity links, event labels, arguments, temporal edges, and state outcomes.

## 3. Annotation layers

### Document and sentence spans

Preserve exact UTF-8 character offsets and raw text. Do not normalize away punctuation before recording spans.

### Mentions and entities

Annotate every referring expression relevant to story state, including names, noun phrases, pronouns, demonstratives, and dialogue references. Link mentions to persistent entity IDs only when supported. Multiple candidate antecedents are permitted.

### Entity types and attributes

Use a shallow type hierarchy: person, animal, object, location, substance, group, abstract. Record lexical subtype such as `dog`, `box`, or `park` as an attribute. Do not create a new core type for every noun.

### Events

Annotate explicit event predicates and typed roles: agent, patient/theme, source, destination, recipient, instrument, content, experiencer, cause, goal. Events keep tense/aspect, polarity, modality, quotation scope, and source span.

### Propositions and state

Annotate explicit properties, locations, possession, relations, existence, desires, beliefs, and emotions. State whether a proposition is asserted, negated, hypothetical, desired, believed, quoted, or inferred.

### Temporal relations

Use before, after, overlap, begins, ends, and unknown. Text order is evidence but not an automatic temporal relation in quoted or hypothetical contexts.

### Causal and motivational relations

Distinguish explicit causal markers from inferred enabling or motivational relations. Record support span and confidence. “Because” normally licenses an explicit edge; mere succession does not.

### Discourse and narrative structure

Optionally mark problem, attempt, obstacle, help, resolution, lesson, and ending. These are narrative-schema annotations and must not replace event annotations.

## 4. Inference boundary

Maintain three layers:

```text
EXPLICIT      directly licensed by a source span
DERIVED       produced by a named executable rule
HYPOTHESIS    plausible but not accepted as fact
```

Example:

```text
"Mia gave the ball to Tom."
EXPLICIT: give(Mia, ball, Tom)
DERIVED by transfer rule: owns(Tom, ball)
DERIVED by transfer rule: not owns(Mia, ball)
HYPOTHESIS: Tom is happy
```

## 5. Ambiguity and abstention

Do not force a single interpretation to improve downstream QA. Record alternatives with confidence and the unresolved reason. Common ambiguity codes include antecedent ambiguity, PP attachment, quotation speaker ambiguity, omitted argument, temporal underspecification, and lexical sense ambiguity.

## 6. Annotation quality checks

Validate:

- all spans are in bounds and reproduce raw substrings;
- entity links refer to existing entities;
- event arguments are typed and refer to entities/events/literals;
- every derived proposition names a rule and premises;
- no event is ordered before itself;
- negative and positive state conflicts are explicit;
- source, belief, desire, and quotation scopes are preserved;
- adjudication changes are logged.

## 7. Evaluation metrics

Report strict and relaxed span F1, mention detection, entity-link pairwise F1, event type F1, argument role F1, proposition accuracy, temporal/causal edge F1, graph exact match, semantic coverage, ambiguity calibration, and execution outcome accuracy from gold versus predicted IR.

The critical decomposition is:

```text
text -> predicted IR          compiler fidelity
predicted IR -> answer        total symbolic pipeline
text -> gold IR -> answer     executor ceiling
```

A low end-to-end result with a high executor ceiling points to compilation; a low ceiling points to ontology or runtime defects.
