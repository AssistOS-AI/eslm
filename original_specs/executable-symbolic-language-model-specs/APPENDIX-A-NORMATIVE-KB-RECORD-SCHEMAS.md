# Appendix A — Normative KB Record Schemas

## 1. Purpose

This appendix defines the minimum canonical fields required for interoperable KB packages. The notation is illustrative JSON data, not executable JavaScript. Implementations may serialize the same typed records as JSONL, CBOR sequences or another schema-valid stream.

Every record contains `recordType`, `recordId`, `kbNamespace`, `schemaVersion` and `provenanceRefs`. Optional fields are omitted only when their meaning is genuinely absent, not when extraction failed silently.

## 2. Term record

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

## 3. Lexeme record

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

## 4. Unary and binary assertion records

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

## 5. Event and role records

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

## 6. Semantic frame record

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

## 7. Rule record

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

## 8. Constraint record

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

## 9. Context record

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

## 10. Provenance record

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

## 11. Alignment and retraction records

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

## 12. Canonical invariants

Every referenced term must be declared locally or imported through a manifest dependency. Every rule must be safe under its declared semantics. Every persistent semantic record must have provenance. Confidence must declare a policy. Context and temporal qualifiers must not be encoded inside predicate names. Records must be deterministic, streamable and free of executable payloads.
