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

The following table is the target logical vocabulary. It states what the canonical model must be able to preserve; it
does not claim that the current version-1 validator and runtime execute every listed meaning. The current implementation
boundary is stated explicitly in Section 9 before the record examples.

| Record class | Meaning |
|---|---|
| Term | Declares an entity, concept, predicate, role, unit, value type or lexical sense. |
| Lexeme | Maps a language-specific surface form and morphological features to one or more terms or frames. |
| Unary assertion | Assigns a type or property to one argument. |
| Binary assertion | Relates two arguments through a predicate. |
| Event | Declares an event instance and its event type. |
| Role edge | Connects an event to an agent, patient, theme, recipient, source, destination, instrument or other role. |
| N-ary relation instance | In the target model, uses a declared fixed-arity assertion or a dedicated typed record when one binary edge would lose meaning. Version 1 has no dedicated N-ary record kind. |
| Rule | Declares a restricted, typed and safe inference rule. |
| Constraint | Declares disjointness, uniqueness, cardinality, type, ordering or integrity constraints. |
| Context | Defines a named world, source viewpoint, hypothetical branch, session or temporal frame. |
| Provenance | Links records to documents, spans, extraction methods, transformations and agent versions. |
| Alignment | Connects terms across KBs or namespaces with an explicit relation and confidence. |

### 4. Assertion qualifiers

Every assertion may carry polarity, epistemic status, confidence, validity interval, context and provenance. Polarity distinguishes positive and negative claims. Epistemic status distinguishes strict assertion, default, likely, possible, unlikely, contradicted and unknown.

Confidence is not treated as truth. It records evidential or extraction strength under a declared calibration policy. The reasoner must not combine scores unless the relevant operator defines valid combination semantics.

Temporal validity distinguishes the time of the described fact from the time of the source claim. In the target
architecture, registered temporal operators may derive intervals or supersede earlier states from state-changing events.
The current generic package projection preserves these fields as canonical data but does not interpret event records or
validity intervals as runtime state transitions.

### 5. Facts and events

Unary and binary assertions receive optimized representations because they dominate many KBs. Events are represented explicitly because natural-language semantics often requires identity, roles, time, modality and causal connections.

For example, “John moved the box from the hall to the kitchen” is represented in the target canonical model as one move
event with agent, theme, source and destination role edges. A future event executor must derive the later location under
declared transition semantics rather than asking the parser to insert an unstated fact. The current typed episodic task
route has explicit state-transition semantics, but it does not consume DS005 event and role records from a package; the
generic package projection therefore makes no such derived-location claim yet.

### 6. Declarative rules

Rules use a restricted safe representation comparable to typed Datalog or guarded Horn clauses. Variables in the head
must be bound by positive body atoms unless an explicitly supported existential rule class is introduced later. The
target model reserves explicitly typed negation and guards, but neither becomes executable merely because a record
contains the corresponding field. The supported package input profile is currently positive, binary, single-head,
range-restricted `strict` Horn rules. The projector selects records tagged `strict`, but the version-1 validator does
not yet prove atom polarity or arity. The active projector therefore rechecks the narrower executable profile and
rejects a `strict` record instead of dropping polarity, exceptions, extra arguments, or conclusions. Package compilation
is not evidence that a rule outside the supported profile has executable semantics. Any later negation regime must declare
and test its stratification or well-founded semantics, and any guard must name a registered pure predicate whose meaning
belongs to the trusted core.

A rule record declares body atoms, head atoms, rule mode, priority or default strength, applicable context, provenance and optional validity interval. The rule record contains no source code.

Strict rules produce logical consequences under the selected logic. Default rules are intended to produce defeasible
conclusions that may be blocked by exceptions or stronger evidence. Causal, temporal, constraint, and plausibility rules
must remain explicitly typed and cannot masquerade as strict implication. In version 1, only strict rules cross the
generic package projection into the Horn executor; the other accepted semantics remain inert canonical data until a
named executor and acceptance evidence exist.

### 7. Lexicon and semantic frames

Lexical knowledge is data. A lexeme records language, surface form, lemma, part of speech, morphology, candidate term or event frame and usage constraints.

A semantic frame declares expected roles and type restrictions. The target generic parser composes validated frames
while lexical KBs supply individual verbs and domain meanings, permitting many language and domain KBs without
duplicating parser code. The current package projection does not load `semanticFrame` records into the ordinary parser;
schema acceptance currently guarantees preservation and validation, not frame-based language understanding.

### 8. Contexts and hypotheses

The target runtime must represent source claims, hypothetical worlds, counterfactual assumptions and session-provided
facts without overwriting baseline knowledge. A context can inherit from other contexts and add assertions, retractions
or qualifications.

Queries in that target architecture run against an explicit context stack, and the trace records which context supplied
every premise. The current task frame carries a context stack and projected facts retain `contextRef` metadata, but the
generic package projection does not yet apply context inheritance, retraction visibility, or branching-world conflict
semantics. Those missing operations must remain visible as capability gaps rather than be inferred from record order.

### 9. Canonical serialization

Canonical KB records use a schema-valid, streamable representation whose decoded records preserve the logical fields
defined here. The representation must remain declarative, deterministic, and independent of runtime memory addresses.
DS019 exclusively owns the portable on-disk format, streaming pipeline, and any later profiled encoding change.

The canonical form is not the high-performance query engine. It is the reproducible source from which compiled dictionaries, shards and indexes are built.

The following schemas define the minimum canonical fields required for interoperable KB packages. The notation is illustrative JSON data, not executable JavaScript. Implementations may serialize the same typed records as JSONL, CBOR sequences or another schema-valid stream.

Every record contains `recordType`, `recordId`, `kbNamespace`, `schemaVersion` and `provenanceRefs`. Optional fields are omitted only when their meaning is genuinely absent, not when extraction failed silently.

#### Current implementation boundary

Five different operations must not be confused:

1. **Shape validation** checks that one record has an allowlisted type and the required fields for that type.
2. **Graph validation** checks identities and the cross-record references currently covered by the validator.
3. **Compilation** writes every accepted record to deterministic package shards; it does not execute the record.
4. **Projection** converts an explicitly supported subset into the in-memory structures used by the runtime.
5. **Execution** applies a named trusted method to a projected structure and returns a witness or an explicit gap.

The current version-1 support boundary is:

| Canonical data | Validator and compiler | Generic runtime projection and execution now | Target contract retained here |
|---|---|---|---|
| Terms and lexemes | Their base shapes are accepted; selected identity references are checked. | Entity and concept terms become runtime entities. Lexeme surfaces become names for denoted entities, and predicate terms provide normalized predicate names. Morphology, frame references, and general sense selection are not projected. | Typed lexical senses and semantic-frame composition remain required. |
| Assertions | Positive and negative polarity plus every allowlisted epistemic status are accepted. The validator requires one or more arguments but does not enforce a predicate declaration's arity. | Only positive binary assertions whose epistemic status is `asserted` or `strict` enter the strict runtime fact model. Negative, unary, N-ary, default, likely, possible, unlikely, contradicted, and unknown assertions remain inert canonical data. For projected facts, polarity, epistemic status, confidence, validity, and `contextRef` remain metadata and participate in composition identity; their context, temporal, and confidence semantics are not yet interpreted. | Qualified unary, binary, and N-ary assertions must eventually retain their declared arity and logical meaning under a named interpreter. |
| Rules | `strict`, `default`, `causal`, `temporal`, and `constraint` tags are accepted as data. The validator requires non-empty body and conclusion arrays and checks only that each head variable occurs somewhere in the body; it does not yet validate atom polarity or arity. | The active projector accepts only positive, binary, single-head, range-restricted strict Horn records with no `unless` atoms. A `strict` record outside that executable shape is rejected visibly; non-strict tags remain inert. No polarity, argument, exception, or conclusion is silently dropped. | Stronger schema checks and each additional semantics tag require a separately named interpreter, uncertainty contract, witness, and tests. |
| Constraints | Version 1 accepts exactly `property-value-domain`, `induction-policy`, and `typed-relation-algebra`. | Property domains and induction policies configure bounded induction. Typed relation algebras configure the typed task executor. | Further integrity, ordering, uniqueness, or cardinality kinds require a schema revision and trusted executor before use. |
| Events, role edges, and semantic frames | Their base shapes are accepted. Graph validation checks event types and role-edge event, role, and filler references; it does not yet check a semantic frame's `evokes` or role references. | They are preserved in packages but are not projected into the ordinary runtime model. | Event identity, roles, time, modality, effects, and generic frame composition remain target semantics. |
| Contexts, alignments, retractions, and plans | Their base shapes are accepted; the validator checks only the references it explicitly implements. | They are stored but are not interpreted by generic package projection. A task frame's context stack and adapter-owned typed tasks are separate runtime structures. | Context inheritance, alignment reasoning, visibility-changing retractions, and declarative plan interpretation remain required target capabilities. |
| Provenance | Every record must contain `provenanceRefs`; non-provenance records require at least one reference. Provenance records may use an empty list to terminate the reference chain. | Projected assertions retain their reference list. Projected executable rules retain the complete sorted reference list and one stable representative `source` for older internal proof fields. Exact duplicate facts and rules merge their complete package and provenance lineage. Provenance records themselves are not a general query language. | Every derived result must remain traceable to accepted records and frozen sources, without losing multi-source rule provenance. |

Schema-valid therefore does not mean runtime-executable. A package may safely preserve a target record before the
runtime has its interpreter, but the loader and reasoner must not silently approximate that record's meaning. Advancing
any row in this table requires synchronized projection or executor code, focused tests, and an update to this section.

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

A surface form may denote several senses. In version 1, each lexeme record has one `denotes` string, so ambiguity is
preserved through several lexeme records. Explicit candidate lists with priors belong to the target schema and require a
versioned shape before use. The parser, not the KB compiler, selects a contextually admissible sense.

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

The version-1 validator accepts one or more entries in `arguments`, but it does not yet validate a declared predicate
arity. The current generic projector has only a subject/object-or-value runtime shape and consumes the first two
arguments. Until an arity schema and projection tests exist, packages must not mistake validator acceptance of a longer
array for executable N-ary semantics. Natural-language events SHOULD use event and role records when identity, time,
modality or later references matter, while remembering that those records are currently preservation-only data.

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

Semantic frames are declarative lexical and ontological data. The target generic semantic-composition mechanism that
instantiates them belongs in `src`; the current package projection preserves these records without instantiating them.

### 15. Rule record

```json
{
  "recordType": "rule",
  "recordId": "rule:example:container-movement",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "semantics": "strict",
  "variables": ["?container", "?item", "?destination"],
  "when": [
    {"predicate": "term:common:Inside", "arguments": ["?item", "?container"], "polarity": "positive"},
    {"predicate": "term:common:MovesTo", "arguments": ["?container", "?destination"], "polarity": "positive"}
  ],
  "then": [
    {"predicate": "term:common:LocatedAt", "arguments": ["?item", "?destination"], "polarity": "positive"}
  ],
  "contextRef": "context:example:domain",
  "provenanceRefs": ["prov:source:rule-span-12"]
}
```

This example deliberately stays inside the supported package profile: a positive, binary, single-head, range-restricted
strict rule. The version-1 validator also accepts the tags `default`, `causal`, `temporal`, and `constraint` so their
intended meaning can be preserved as inert canonical data. It does not follow that interpreters for those tags exist.
The validator checks the semantics tag, non-empty body and conclusion arrays, and that each head variable appears in a
body argument. It does not yet prove that the occurrence is positive or that atoms have the required arity. The active
projector therefore rechecks the executable boundary: it rejects a strict record containing an `unless` atom, a
non-positive or non-binary atom, or more than one conclusion. It never ignores those fields and maps only a record that
has exactly one valid conclusion. No field may contain source code.

### 16. Constraint record

```json
{
  "recordType": "constraint",
  "recordId": "constraint:example:owner-kind-domain",
  "kbNamespace": "axiologic.example",
  "schemaVersion": "1",
  "constraintKind": "property-value-domain",
  "predicate": "owner_kind",
  "values": ["organization", "person"],
  "provenanceRefs": ["prov:source:policy-4"]
}
```

Version 1 accepts exactly three constraint kinds: `property-value-domain`, `induction-policy`, and
`typed-relation-algebra`. Unknown kinds fail validation rather than being evaluated dynamically. Cardinality,
uniqueness, ordering, type, and other integrity constraints remain part of the target logical model, but no
`maxCardinality` record is valid until a later schema version defines its fields and binds it to a trusted executor.

`property-value-domain` contains a `predicate` string and a non-empty `values` array of non-empty strings. Projection
deduplicates and sorts those values deterministically. The record declares admissible source-local property vocabulary;
it neither asserts a value for an entity nor authorizes selection of an evaluation answer.

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

Contexts are the target representation for source viewpoints, session facts, counterfactual worlds and version overlays
without overwriting baseline records. Version 1 stores and reference-checks their current shape but does not interpret
context inheritance during generic package projection.

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
  "provenanceRefs": [],
  "normalizationRef": null,
  "agentVersion": "agent:...",
  "systemCommit": "git:...",
  "createdAt": "..."
}
```

The exact timestamp format follows the project convention. Reproducible identifiers must not depend only on the
timestamp. A provenance record still carries the mandatory `provenanceRefs` field, but the list may be empty to
terminate a provenance chain. Every non-provenance record requires at least one provenance reference in version 1.

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

Retractions never erase provenance. In the target runtime they alter record visibility under explicit context and
version policies. The current generic package projection does not apply retraction visibility, so a schema-valid
retraction must not be reported as an executed correction.

### 20. Canonical invariants

Every referenced term must be declared locally or imported through a manifest dependency. Every executable rule must be
safe under its declared and implemented semantics. Every record carries `provenanceRefs`, and every non-provenance
record has at least one reference. Confidence must declare a policy before any operator interprets it. Context and
temporal qualifiers must not be encoded inside predicate names. Records must be deterministic, streamable and free of
executable payloads. Requirements not yet enforced by the version-1 validator remain target invariants and cannot be
claimed as current validation guarantees.

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

### Question #5: Why may the schema accept a record that the runtime does not execute?

Response: Canonical data must sometimes preserve reviewed meaning before a generic interpreter is ready. Shape and
graph validation make that data safe to store; they do not manufacture semantics. Projection and execution are separate
gates because silently approximating a default, retraction, context, event, or plan as an ordinary positive fact would
be less honest than retaining it as inert data and reporting the missing capability. The implementation-support table
in Core Content is therefore part of the contract and must advance with code and tests.

## Conclusion

Canonical KB records must be deterministic, streamable, provenance-complete, scope-aware, schema-valid, and free of executable payloads. Every runtime optimization remains traceable to this logical layer.
