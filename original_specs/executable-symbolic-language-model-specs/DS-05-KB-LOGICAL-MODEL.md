# DS-05 — KB Logical Model

## 1. Design objective

The logical model must represent general knowledge, document claims, benchmark worlds and domain-specific rules without embedding executable JavaScript or Java. It must support compact storage, explicit provenance, multiple contexts, uncertainty, temporal qualification and composition across many KBs.

The model distinguishes canonical semantic records from physical indexes. Canonical records define meaning. Physical formats define performance.

## 2. Stable identities

Every named term has a namespace-qualified canonical key. A stable 128-bit term identifier may be derived from the canonical key using a collision-checked cryptographic hash. Runtime shards may map stable identifiers to dense local integers for compression.

Anonymous events, claims and source-local entities receive deterministic identifiers derived from the KB namespace, source identity and stable local anchors. Rebuilding the same KB from the same accepted inputs must reproduce identifiers.

Cross-KB equivalence is explicit. Two terms with similar labels are not automatically identical. Alignment records may declare equivalence, subsumption, close match or unresolved similarity.

## 3. Record classes

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

## 4. Assertion qualifiers

Every assertion may carry polarity, epistemic status, confidence, validity interval, context and provenance. Polarity distinguishes positive and negative claims. Epistemic status distinguishes strict assertion, default, likely, possible, unlikely, contradicted and unknown.

Confidence is not treated as truth. It records evidential or extraction strength under a declared calibration policy. The reasoner must not combine scores unless the relevant operator defines valid combination semantics.

Temporal validity distinguishes the time of the described fact from the time of the source claim. State-changing events may create intervals or supersede earlier states under generic temporal operators in `src`.

## 5. Facts and events

Unary and binary assertions receive optimized representations because they dominate many KBs. Events are represented explicitly because natural-language semantics often requires identity, roles, time, modality and causal connections.

For example, “John moved the box from the hall to the kitchen” is represented as one move event with agent, theme, source and destination role edges. The effect that the box is later in the kitchen is derived by the temporal or event semantics of the core, not inserted by the parser unless the source explicitly states it.

## 6. Declarative rules

Rules use a restricted safe representation comparable to typed Datalog or guarded Horn clauses. Variables in the head must be bound by positive body atoms unless an explicitly supported existential rule class is used. Negation must follow the core’s stratification or well-founded semantics. Rule guards may invoke only registered pure predicates whose semantics are part of the trusted core.

A rule record declares body atoms, head atoms, rule mode, priority or default strength, applicable context, provenance and optional validity interval. The rule record contains no source code.

Strict rules produce logical consequences under the selected logic. Default rules produce defeasible conclusions that may be blocked or retracted by exceptions or stronger evidence. Causal and plausibility rules are explicitly typed and cannot masquerade as strict implication.

## 7. Lexicon and semantic frames

Lexical knowledge is data. A lexeme records language, surface form, lemma, part of speech, morphology, candidate term or event frame and usage constraints.

A semantic frame declares expected roles and type restrictions. The generic parser understands how to compose frames; individual verbs and domain meanings are supplied by lexical KBs. This permits many language and domain KBs without duplicating parser code.

## 8. Contexts and hypotheses

The runtime must represent source claims, hypothetical worlds, counterfactual assumptions and session-provided facts without overwriting baseline knowledge. A context can inherit from other contexts and add assertions, retractions or qualifications.

Queries run against an explicit context stack. The trace records which context supplied every premise. Contradictions between contexts remain distinguishable from contradictions inside one context.

## 9. Canonical serialization

Canonical KB records should use a schema-valid, streamable representation. Newline-delimited JSON is acceptable for development and inspection. A CBOR sequence or equivalent typed binary stream is preferable for large canonical packages. The representation must remain declarative, deterministic and independent of runtime memory addresses.

The canonical form is not the high-performance query engine. It is the reproducible source from which compiled dictionaries, shards and indexes are built.
