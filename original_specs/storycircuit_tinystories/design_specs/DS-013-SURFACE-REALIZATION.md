# DS-013 — Weighted Surface Realization

**Status:** Research draft  
**Version:** 0.1  
**Depends on:** DS-003, DS-005, DS-007, DS-012

## Goal

Convert StoryIR and narrative plans into grammatical, varied, and probabilistically scored English while preserving semantic commitments.

## Realization pipeline

```text
content selection
-> discourse ordering
-> referring-expression generation
-> construction selection
-> morphology and agreement
-> punctuation and dialogue formatting
-> parse-back verification
```

The realizer consumes explicit semantic inputs and may not invent unconstrained world-changing events. Optional elaborations must be declared as events or descriptive facts before realization.

## Weighted constructions

Every construction declares:

```text
semantic input signature
syntactic frame
lexical and morphological slots
agreement constraints
discourse conditions
style features
observed count and smoothed probability
provenance examples
```

Selection uses normalized local distributions conditioned on semantic type, discourse state, genre phase, and recent surface choices. Repetition penalties operate over construction identities and n-grams.

## Referring expressions

Reference generation selects names, definite descriptions, indefinite introductions, and pronouns according to accessibility and ambiguity. Pronouns are forbidden when two compatible antecedents have similar salience unless deliberate ambiguity is requested.

## Aggregation and segmentation

The realizer may combine adjacent compatible propositions using conjunction, subordination, or shared arguments. It may split dense semantic content into several sentences. These operations preserve a mapping from output spans to StoryIR nodes.

## Dialogue

Dialogue turns include speaker, addressee, communicative act, content, and effects on mental or social state. Surface quotation conventions are learned separately from event semantics. The parser and realizer share dialogue tests.

## Fallback hierarchy

When no specific construction applies:

1. use a more general typed construction;
2. use a compositional clause template;
3. spell lexical items with the open-vocabulary component;
4. emit a diagnostic rather than deleting semantics.

The fallback path is recorded in traces and contributes to evaluation.

## Generate–parse–verify

A candidate realization is parsed by an independent or differently configured parser. Semantic differences are classified as missing, added, altered, or unresolved. Candidates failing hard semantic fidelity are repaired or rejected.

## Metrics

```text
semantic precision and recall after round trip
grammatical minimal-pair preferences
construction entropy
lexical diversity
repetition
prompt lexical coverage
surface novelty
human or judge fluency
latency and beam size
```

## Acceptance criteria

The smoke model must realize all supported IR records and round-trip at least 90% of their atomic facts. The research model must report exact construction coverage and must not hide fallback-generated sentences inside aggregate fluency metrics.
