# Canonical record contract used by the host compiler

Read this file before creating `candidate/records.jsonl`. The portable validator and the host compiler enforce the same schema version `1`. Similar-looking field names are not aliases. For example, a term uses `canonicalKey`, not `canonicalName`; a lexeme uses `surface` and `denotes`, not `surfaceForm` and `senseRefs`; an assertion uses `predicate` and `arguments`, not `subjectRef`, `relation`, and `objectRef`.

Every record is one JSON object on one line. Every object requires `recordType`, `recordId`, `kbNamespace`, `schemaVersion` equal to `"1"`, and `provenanceRefs`. Non-provenance records require at least one provenance reference. IDs are deterministic and namespace-qualified; timestamps must not participate in identity.

## Provenance

A `provenance` record requires non-empty `sourceId`, `sourceChecksum`, and `transformation`. Its `provenanceRefs` may be empty. Preserve source record identity, URI, media type, language, license, byte span, source text, packet digest, and extraction method as additional inert fields.

```json
{"recordType":"provenance","recordId":"prov:example:document-1:0-18","kbNamespace":"example","schemaVersion":"1","sourceId":"source:example:1","sourceChecksum":"sha256:...","transformation":"direct-symbolic-extraction-v1","span":{"start":0,"end":18,"unit":"utf8-byte"},"provenanceRefs":[]}
```

## Context, term, and lexeme

A `context` record currently has no additional compiler-required field, but it should declare a stable `contextKind`, inheritance, scope, world, perspective, time, and space when evidence supplies them. A `term` requires `termKind` in `entity`, `concept`, `predicate`, `role`, `eventType`, `unit`, `scalarType`, `literalType`, or `lexicalSense`, plus `canonicalKey`. A `lexeme` requires `language`, `surface`, `lemma`, `partOfSpeech`, and `denotes`, where `denotes` is the target term ID.

```json
{"recordType":"term","recordId":"term:example:astra","kbNamespace":"example","schemaVersion":"1","termKind":"entity","canonicalKey":"example/Astra","provenanceRefs":["prov:example:document-1:0-18"]}
{"recordType":"lexeme","recordId":"lex:example:astra:en","kbNamespace":"example","schemaVersion":"1","language":"en","surface":"Astra","lemma":"astra","partOfSpeech":"properNoun","denotes":"term:example:astra","provenanceRefs":["prov:example:document-1:0-18"]}
```

## Assertion

An `assertion` requires a predicate term ID in `predicate`, at least one ordered value in `arguments`, `polarity` equal to `positive` or `negative`, and `epistemicStatus` in `asserted`, `strict`, `default`, `likely`, `possible`, `unlikely`, `contradicted`, or `unknown`. Use `contextRef`, confidence, modality, validity, and source span when applicable. Term IDs may appear in arguments; literal values remain inert JSON values or stable string encodings allowed by the assignment. The runtime projection derives its operator name from the predicate term's `canonicalKey`, converting CamelCase, spaces, and hyphens to lowercase underscores. Reuse a registered common predicate when its semantics match. A source-local predicate may be created when it has a precise source-local meaning; its canonical key must still name the intended operation rather than its surface wording.

```json
{"recordType":"assertion","recordId":"fact:example:astra-planet","kbNamespace":"example","schemaVersion":"1","predicate":"term:common:IsA","arguments":["term:example:astra","planet"],"polarity":"positive","epistemicStatus":"asserted","contextRef":"context:example:document-1","provenanceRefs":["prov:example:document-1:0-18"]}
```

## Events, roles, frames, and rules

An `event` requires `eventType` and `contextRef`. A `roleEdge` requires `eventRef`, `role`, and `filler`. A `semanticFrame` requires `evokes` and an array `roles`. A `rule` requires `semantics` in `strict`, `default`, `causal`, `temporal`, or `constraint`, a non-empty `when` atom array, and a non-empty `then` atom array. Atoms use `predicate`, `arguments`, and polarity. Every conclusion variable beginning with `?` must occur in a positive premise argument.

## Alignment, retraction, plan, and constraint

An `alignment` requires `left`, `relation`, and `right`. A `retraction` requires `targetRecord` and `contextRef`. A `plan` requires `goalPattern` and non-empty `steps`.

A `constraint` requires `constraintKind`. The implemented `property-value-domain` kind requires `predicate` and a non-empty `values` array of strings. It declares the finite source-local answer vocabulary for a named property; it does not assert that any entity has any listed value. The implemented `induction-policy` kind requires `predicate`, `enabled` explicitly equal to `true`, Boolean `implicitQuestionTrigger`, positive integer `minSupport`, numeric `minCoverage` greater than zero and no greater than one, and optional `selection` equal to `all`, `latest-support`, or `latest-member`. It configures the trusted induction method for that predicate. It is defeasible policy data, not a strict fact and not permission to copy benchmark answers.

```json
{"recordType":"constraint","recordId":"constraint:example:color-domain","kbNamespace":"example","schemaVersion":"1","constraintKind":"property-value-domain","predicate":"color","values":["blue","green"],"provenanceRefs":["prov:example:source"]}
{"recordType":"constraint","recordId":"constraint:example:color-induction","kbNamespace":"example","schemaVersion":"1","constraintKind":"induction-policy","predicate":"color","enabled":true,"implicitQuestionTrigger":true,"minSupport":2,"minCoverage":0.5,"selection":"all","provenanceRefs":["prov:example:source"]}
```

No constraint may encode an expression, callback, code fragment, item identifier, question hash, or answer lookup table. Unsupported kinds fail both the portable validator and the trusted host validator.

Run `node skill/scripts/validate-candidate.mjs candidate` from the isolated workspace. A successful portable validation is necessary but does not promote the candidate; the host repeats canonical validation and deterministic compilation.
