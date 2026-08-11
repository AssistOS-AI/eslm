---
id: DS005
title: Knowledge Base Logical Model and Canonical Record Schemas
status: in-progress
owner: knowledge
summary: Defines stable identities, typed declarative records, assertions, events, rules, contexts, provenance, alignments, retractions, and canonical serialization.
---

# DS005 Knowledge Base Logical Model and Canonical Record Schemas

## Introduction

A knowledge base is a declarative, versioned data product. This specification defines its logical meaning and incorporates the normative record schemas required for interoperability. Physical indexes and compiled segments may optimize access but cannot change these canonical semantics.

## Core Content

### 1. Design objective

The logical model must represent general knowledge, document claims, benchmark worlds and domain-specific rules without embedding executable JavaScript or Java. It must support compact storage, explicit provenance, multiple contexts, uncertainty, temporal qualification and composition across many KBs.

The model distinguishes canonical semantic records from physical indexes. Canonical records define meaning. Physical formats define performance.

### 2. Stable identities

Every named term has a namespace-qualified canonical key. A stable 128-bit term identifier may be derived from the canonical key using a collision-checked cryptographic hash. Runtime shards may map stable identifiers to dense local integers for compression.

Anonymous events, claims and source-local entities receive deterministic identifiers derived from the KB namespace, source identity and stable local anchors. Rebuilding the same KB from the same accepted inputs must reproduce identifiers.

Cross-KB equivalence is explicit. Two terms with similar labels are not automatically identical. Alignment records may declare equivalence, subsumption, close match or unresolved similarity.

### 3. Record classes

| Record class | Meaning |
|---|---|
| Term | Declares an entity, concept, predicate, role, unit, value type or lexical sense. |
| Lexeme | Maps a language-specific surface form and morphological features to one or more terms or frames. |
| Unary assertion | Assigns a type or property to one argument. |
| Binary assertion | Relates two arguments through a predicate. |
| Event | Declares an event instance and its event type. |
| Role edge | Connects an event to an agent, patient, theme, recipient, source, destination, instrument or other role. |
| N-ary relation instance | Represents relations that cannot be safely reduced to a single binary edge. |
| Rule | Declares a restricted, typed and safe inference rule. |
| Constraint | Declares disjointness, uniqueness, cardinality, type, ordering or integrity constraints. |
| Context | Defines a named world, source viewpoint, hypothetical branch, session or temporal frame. |
| Provenance | Links records to documents, spans, extraction methods, transformations and agent versions. |
| Alignment | Connects terms across KBs or namespaces with an explicit relation and confidence. |

### 4. Assertion qualifiers

Every assertion may carry polarity, epistemic status, confidence, validity interval, context and provenance. Polarity distinguishes positive and negative claims. Epistemic status distinguishes strict assertion, default, likely, possible, unlikely, contradicted and unknown.

Confidence is not treated as truth. It records evidential or extraction strength under a declared calibration policy. The reasoner must not combine scores unless the relevant operator defines valid combination semantics.

Temporal validity distinguishes the time of the described fact from the time of the source claim. State-changing events may create intervals or supersede earlier states under generic temporal operators in `src`.

### 5. Facts and events

Unary and binary assertions receive optimized representations because they dominate many KBs. Events are represented explicitly because natural-language semantics often requires identity, roles, time, modality and causal connections.

For example, “John moved the box from the hall to the kitchen” is represented as one move event with agent, theme, source and destination role edges. The effect that the box is later in the kitchen is derived by the temporal or event semantics of the core, not inserted by the parser unless the source explicitly states it.

### 6. Declarative rules

Rules use a restricted safe representation comparable to typed Datalog or guarded Horn clauses. Variables in the head must be bound by positive body atoms unless an explicitly supported existential rule class is used. Negation must follow the core’s stratification or well-founded semantics. Rule guards may invoke only registered pure predicates whose semantics are part of the trusted core.

A rule record declares body atoms, head atoms, rule mode, priority or default strength, applicable context, provenance and optional validity interval. The rule record contains no source code.

Strict rules produce logical consequences under the selected logic. Default rules produce defeasible conclusions that may be blocked or retracted by exceptions or stronger evidence. Causal and plausibility rules are explicitly typed and cannot masquerade as strict implication.

### 7. Lexicon and semantic frames

Lexical knowledge is data. A lexeme records language, surface form, lemma, part of speech, morphology, candidate term or event frame and usage constraints.

A semantic frame declares expected roles and type restrictions. The generic parser understands how to compose frames; individual verbs and domain meanings are supplied by lexical KBs. This permits many language and domain KBs without duplicating parser code.

### 8. Contexts and hypotheses

The runtime must represent source claims, hypothetical worlds, counterfactual assumptions and session-provided facts without overwriting baseline knowledge. A context can inherit from other contexts and add assertions, retractions or qualifications.

Queries run against an explicit context stack. The trace records which context supplied every premise. Contradictions between contexts remain distinguishable from contradictions inside one context.

### 9. Canonical serialization

Canonical KB records use a schema-valid, streamable representation whose decoded records preserve the logical fields
defined here. The representation must remain declarative, deterministic, and independent of runtime memory addresses.
DS019 exclusively owns the portable on-disk format, streaming pipeline, and any later profiled encoding change.

The canonical form is not the high-performance query engine. It is the reproducible source from which compiled dictionaries, shards and indexes are built.

The following schemas define the minimum canonical fields required for interoperable KB packages. The notation is illustrative JSON data, not executable JavaScript. Implementations may serialize the same typed records as JSONL, CBOR sequences or another schema-valid stream.

Every record contains `recordType`, `recordId`, `kbNamespace`, `schemaVersion` and `provenanceRefs`. Optional fields are omitted only when their meaning is genuinely absent, not when extraction failed silently.

### 10. Term record

```json
{
  "recordType": "term",
  "recordId": "term:axiologic.example:container",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "termKind": "concept",
  "canonicalKey": "axiologic.example/Container",
  "valueType": null,
  "parentTerms": ["term:common:Object"],
  "provenanceRefs": ["prov:source:definition-17"]
}
```

`termKind` is one of entity, concept, predicate, role, eventType, unit, scalarType, literalType or lexicalSense. A term record defines identity and type. Labels and language forms are stored as lexemes rather than overloaded into identity.

### 11. Lexeme record

```json
{
  "recordType": "lexeme",
  "recordId": "lex:en:purchase-verb-1",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "language": "en",
  "surface": "purchase",
  "lemma": "purchase",
  "partOfSpeech": "verb",
  "morphology": {"form": "base"},
  "denotes": "term:common:PurchaseEvent",
  "frameRef": "frame:common:purchase",
  "usageConstraints": [],
  "provenanceRefs": ["prov:lexicon:42"]
}
```

A lexeme may denote several senses. Ambiguous mappings are represented as several lexeme-sense records or explicit candidate lists with priors. The parser, not the KB compiler, selects a contextually admissible sense.

### 12. Unary and binary assertion records

```json
{
  "recordType": "assertion",
  "recordId": "fact:example:000001",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "predicate": "term:common:IsA",
  "arguments": [
    "term:example:knife",
    "term:common:Tool"
  ],
  "polarity": "positive",
  "epistemicStatus": "asserted",
  "confidence": {"value": 1.0, "policy": "source-assertion"},
  "contextRef": "context:example:source-world",
  "validity": {"from": null, "to": null},
  "provenanceRefs": ["prov:source:span-101"]
}
```

The `arguments` field supports unary and binary assertions and MAY support directly indexed n-ary predicates when the predicate schema declares a fixed arity. Natural-language events SHOULD use event and role records when identity, time, modality or later references matter.

`epistemicStatus` is one of asserted, strict, default, likely, possible, unlikely, contradicted or unknown. The allowed status set may be extended only through a schema version and core semantics.

### 13. Event and role records

```json
{
  "recordType": "event",
  "recordId": "event:example:move-0007",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "eventType": "term:common:MoveEvent",
  "polarity": "positive",
  "modality": "actual",
  "contextRef": "context:example:source-world",
  "timeRef": "time:example:t17",
  "provenanceRefs": ["prov:source:span-220"]
}
```

```json
{
  "recordType": "roleEdge",
  "recordId": "role:example:move-0007-theme",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "eventRef": "event:example:move-0007",
  "role": "term:common:ThemeRole",
  "filler": "term:example:box",
  "provenanceRefs": ["prov:source:span-220"]
}
```

Role edges are independently indexable by event, role and filler. The event record does not contain an opaque argument object that would prevent selective queries.

### 14. Semantic frame record

```json
{
  "recordType": "semanticFrame",
  "recordId": "frame:common:placement",
  "kbNamespace": "common",
  "schemaVersion": "1",
  "evokes": "term:common:PlacementEvent",
  "roles": [
    {"role": "term:common:AgentRole", "required": true, "type": "term:common:Agent"},
    {"role": "term:common:ThemeRole", "required": true, "type": "term:common:PhysicalObject"},
    {"role": "term:common:DestinationRole", "required": true, "type": "term:common:Location"}
  ],
  "provenanceRefs": ["prov:ontology:placement-frame"]
}
```

Semantic frames are declarative lexical and ontological data. The generic semantic-composition mechanism that instantiates frames belongs in `src`.

### 15. Rule record

```json
{
  "recordType": "rule",
  "recordId": "rule:example:container-movement",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "semantics": "default",
  "variables": ["?container", "?item", "?destination"],
  "when": [
    {"predicate": "term:common:Inside", "arguments": ["?item", "?container"], "polarity": "positive"},
    {"predicate": "term:common:MovesTo", "arguments": ["?container", "?destination"], "polarity": "positive"}
  ],
  "unless": [
    {"predicate": "term:common:RemovedDuringMove", "arguments": ["?item", "?container"], "polarity": "positive"}
  ],
  "then": [
    {"predicate": "term:common:LocatedAt", "arguments": ["?item", "?destination"], "polarity": "positive"}
  ],
  "priority": 10,
  "contextRef": "context:example:domain",
  "provenanceRefs": ["prov:source:rule-span-12"]
}
```

The rule schema is data. `semantics` selects an interpreter already implemented in `src`, such as strict, default, causal, temporal or constraint. No field may contain executable source text. Variables and operators are validated against the core rule schema.

### 16. Constraint record

```json
{
  "recordType": "constraint",
  "recordId": "constraint:example:one-owner",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "constraintKind": "maxCardinality",
  "predicate": "term:example:OwnedBy",
  "subjectType": "term:example:RegisteredAsset",
  "value": 1,
  "contextRef": "context:example:domain",
  "provenanceRefs": ["prov:source:policy-4"]
}
```

Constraint kinds are interpreted by trusted core operators. Unsupported kinds fail validation rather than being evaluated dynamically.

The current compiler implements two additional constraint kinds used to configure an existing generic method without turning policy into code. `property-value-domain` contains a `predicate` string and a non-empty, deterministically sorted `values` array of non-empty strings. It declares the admissible source-local property vocabulary. It does not assert a value for an entity and it does not authorize selection of an evaluation answer.

`induction-policy` contains a `predicate`, `enabled: true`, Boolean `implicitQuestionTrigger`, positive integer `minSupport`, `minCoverage` in `(0, 1]`, and optional `selection` in `all`, `latest-support`, or `latest-member`. The optional selection defaults to `all`. Projection places the policy under the runtime reasoning configuration keyed by predicate. Package merging unions property domains, unions enabled predicate lists, and rejects incompatible policies for the same predicate. Inductive conclusions retain their non-strict status and remain distinguishable from source assertions.

```json
{
  "recordType": "constraint",
  "recordId": "constraint:example:color-induction",
  "kbNamespace": "example",
  "schemaVersion": "1",
  "constraintKind": "induction-policy",
  "predicate": "color",
  "enabled": true,
  "implicitQuestionTrigger": true,
  "minSupport": 2,
  "minCoverage": 0.5,
  "selection": "all",
  "provenanceRefs": ["prov:source:policy-4"]
}
```

Both the repository validator and the portable validator copied into the document-to-KB skill enforce these fields. A candidate that uses an unknown kind, disables a policy while retaining its record, supplies an empty domain, uses an out-of-range threshold, or names an unsupported selection fails before compilation.

The compiler also implements `typed-relation-algebra`. This constraint declares an `algebraId`, a non-empty relation
inventory, reciprocal inverse classes, and a bounded composition table. Every relation has a stable identifier and a
semantic class; optional target features refine a semantic class into a surface answer only when the queried endpoint
has compatible evidence. Every inverse and composition operand must name a declared semantic class, inverse mappings
must be reciprocal, composition entries must be unique, and result classes must be declared. The record configures the
trusted relation-algebra executor; it contains no traversal code, benchmark row, person identity, or expected answer.

A provider-specific canonical profile may preserve a richer construction inventory when the generic record vocabulary
has no lossless representation. Such a profile must remain bounded, schema-validated declarative data and must declare
its relation direction, polarity, inverse mappings, implications, state changes, comparisons, affordances, and numeric
semantics explicitly. Its source-specific identity, field inventory, and current package state belong beside the
provider and in package receipts, not in this logical schema. The profile is not executable content and does not waive
later migration when generic records gain equivalent meaning.

### 17. Context record

```json
{
  "recordType": "context",
  "recordId": "context:example:scenario-7",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "contextKind": "hypothetical",
  "inherits": ["context:example:baseline"],
  "precedence": 20,
  "provenanceRefs": ["prov:session:scenario-7"]
}
```

Contexts permit source viewpoints, session facts, counterfactual worlds and version overlays without overwriting baseline records.

### 18. Provenance record

```json
{
  "recordType": "provenance",
  "recordId": "prov:source:span-220",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "sourceId": "source:document:manual-v3",
  "sourceChecksum": "sha256:...",
  "span": {"start": 4120, "end": 4198, "unit": "utf8-byte"},
  "transformation": "direct-symbolic-parse",
  "normalizationRef": null,
  "agentVersion": "agent:...",
  "systemCommit": "git:...",
  "createdAt": "..."
}
```

The exact timestamp format follows the project convention. Reproducible identifiers must not depend only on the timestamp.

### 19. Alignment and retraction records

```json
{
  "recordType": "alignment",
  "recordId": "align:example:term-a-term-b",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "left": "term:kbA:Concept17",
  "relation": "closeMatch",
  "right": "term:kbB:Concept92",
  "confidence": {"value": 0.82, "policy": "agent-alignment"},
  "provenanceRefs": ["prov:alignment:run-9"]
}
```

```json
{
  "recordType": "retraction",
  "recordId": "retract:example:fact-91",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "targetRecord": "fact:example:000091",
  "scope": "supersede",
  "contextRef": "context:example:overlay-v2",
  "provenanceRefs": ["prov:source:correction-2"]
}
```

Retractions do not erase provenance. They alter record visibility under explicit context and version policies.

### 20. Canonical invariants

Every referenced term must be declared locally or imported through a manifest dependency. Every rule must be safe under its declared semantics. Every persistent semantic record must have provenance. Confidence must declare a policy. Context and temporal qualifiers must not be encoded inside predicate names. Records must be deterministic, streamable and free of executable payloads.

## Decisions & Questions

### Question #1: Why is term identity separate from labels?

Response: Labels are language-specific, ambiguous, and mutable. Namespace-qualified term identity remains stable while lexeme records express language, morphology, frame, and sense alternatives.

### Question #2: Why are events represented separately from facts?

Response: Event identity permits roles, time, modality, causal links, later reference, and state-transition semantics. Flattening events into opaque triples loses those obligations.

### Question #3: May a provider-specific canonical ontology remain outside the generic record vocabulary?

Response: Relation constructions, argument-order rules, implication templates, and bounded compatibility policies do
not all have lossless generic record forms in the current compiler. A documented, schema-validated declarative profile
preserves their meaning without inventing executable KB code or misrepresenting them as ordinary facts. The profile
remains subject to hashes, budgets, provenance, package validation, and trusted interpretation.

### Question #4: Which generic records should represent richer goals, preconditions, effects, and causal conflicts?

Options:

1. Extend event and role records with typed precondition, effect, goal, and conflict edges. This keeps event identity
   central but requires explicit scope, priority, and temporal qualification for each edge.
2. Introduce separate state-transition, goal, causal-support, and contradiction record classes linked to events. This
   makes reasoning inputs more explicit but enlarges the canonical vocabulary and reference graph.
3. Retain provider-specific declarative profiles until independent sources demonstrate a stable lossless common model.
   This avoids premature abstraction but prevents generic packages from exchanging the richer records directly.

Selection requires cross-source mappings, renamed event and participant controls, signed contradiction examples,
temporal and context qualification, provider-order invariance, and replayable witnesses that distinguish strict,
default, abductive, and ranked conclusions. Until selection, provider-specific profiles remain declarative and no
surface frame overlap is promoted as causal or goal evidence.

## Conclusion

Canonical KB records must be deterministic, streamable, provenance-complete, scope-aware, schema-valid, and free of executable payloads. Every runtime optimization remains traceable to this logical layer.
