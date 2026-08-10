# StoryIR Contract

StoryIR is a typed, span-aligned intermediate representation for narrative language. It is intentionally less expressive than arbitrary first-order logic and richer than a flat subject-predicate-object graph.

## Top-level record

```text
StoryIR
  document
  entities[]
  mentions[]
  propositions[]
  events[]
  temporal_relations[]
  causal_relations[]
  discourse_relations[]
  ambiguities[]
  diagnostics[]
```

## Identity

Identifiers are local, stable within the document, and opaque. Entity identity is distinct from surface name. Mentions may refer to an entity, a set, an event, a proposition, or an unresolved candidate set.

## Time

Events have local intervals or points. Absolute calendar time is optional. Textual order, narrative order, and inferred temporal order are represented separately.

## Truth and modality

A proposition carries polarity, source, epistemic status, modality, holder when relevant, and temporal scope. Negation is never represented by predicate-name rewriting.

## Mutation

StoryIR is immutable after publication. Repair produces a new version and a mapping from old to new identifiers. Runtime world state is also versioned.

## Extensibility

Unknown fields are rejected in strict mode and retained under a namespaced `extensions` object in exploratory mode. Core enumerations can change only through schema versioning and migration.
