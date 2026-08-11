# DS-01 — Adaptation to the Existing Architecture

## 1. Architectural boundary

The existing distinction between reusable code in `src` and data in KBs is retained and strengthened. The system must not create a new parallel architecture for each benchmark. Benchmark adaptation occurs by extending a current KB, adding a new KB, enriching the reusable lexicon or semantic frames, and only exceptionally improving generic code.

The central question for every learned artifact is not where it is easiest to put it, but what kind of thing it is. World knowledge and domain semantics belong in KBs. Generic computation and language mechanisms belong in `src`.

## 2. What belongs in `src`

`src` contains trusted executable mechanisms. The symbolic tokenizer, morphology, feature grammar, chart parser, semantic-composition operators, reference-resolution machinery, task-frame builder, planner, rule interpreter, graph query engine, temporal engine, default-reasoning engine, constraint solver, search strategies, proof construction, contradiction handling, confidence semantics, shard loader and result formatter are all reusable mechanisms.

A new mechanism belongs in `src` when its behavior is independent of the vocabulary and topic of the benchmark. Passive-voice semantic-role inversion, quantifier scope, temporal state supersession, unification, backtracking and proof search are representative examples.

A method implemented in `src` must publish a machine-readable capability descriptor. The descriptor identifies accepted input types, produced output types, preconditions, cost estimates, soundness or completeness properties and the proof artifacts the method can emit. The planner uses these descriptors rather than hard-coded benchmark names.

## 3. What belongs in a KB

A KB contains declarative knowledge. This includes entities, concepts, types, relations, lexical forms, synonyms, event frames, domain ontologies, assertions, defaults, exceptions, causal tendencies, constraints, domain-specific composition rules and mappings from surface language to existing semantic predicates.

A KB may contain a declarative rule such as a safe Horn clause or a typed default, because the executable semantics of that rule are implemented once by the core. A KB may not contain JavaScript, Java, native code, shell commands, dynamically evaluated expressions or arbitrary callbacks.

A domain-specific workflow may also be represented declaratively as a plan whose steps reference registered methods from `src`. The plan is data. The methods are code. A KB cannot define the implementation of a new method merely by embedding source code.

## 4. Decision test

| Question | Architectural consequence |
|---|---|
| Would the artifact remain useful if all domain words and entity names changed? | It is a candidate for `src`. |
| Does the artifact state something about the world, a domain or a dataset convention? | It belongs in a KB. |
| Is the artifact an algorithm, search procedure or semantic operator? | It belongs in `src`. |
| Is the artifact a relation, lexical mapping, frame, fact, constraint or rule instance? | It belongs in a KB. |
| Can the artifact be interpreted by an existing trusted operator? | It may be declarative KB data. |
| Would executing it require evaluating arbitrary code? | It is prohibited in a KB. |

## 5. CNL placement

The generic grammar and semantic composition of the CNL belong in `src`. Language-specific lexical entries, domain terminology, predicate aliases and semantic frames may be supplied by language or domain KBs.

The distinction is important during document ingestion. If the sentence fails because the word `purchase` is unknown but the `buy` event frame already exists, a lexical mapping belongs in the relevant KB. If all passive constructions fail, the missing operation is grammatical and belongs in `src`.

A new CNL form must not be added merely because one source document uses an unusual sentence. It should first be handled by the optional simplifier or treated as unsupported. Promotion into the generic grammar requires evidence across independent examples and a regression suite that demonstrates stable semantics.

## 6. Multiple KBs and overlays

The runtime may register many KBs. Some KBs are foundational, such as a common ontology, general lexicon or units system. Others are domain-specific, source-specific, project-specific or session-specific.

KB composition is explicit. A KB manifest declares namespaces, dependencies, imported concepts, compatibility requirements and trust metadata. Conflicting assertions are not silently collapsed. They remain attributed to contexts and sources and are resolved by a declared policy or returned as a conflict.

Updates should normally be represented as immutable overlays. An overlay can add, retract, supersede or qualify records from an earlier version without rewriting the complete KB. Periodic compaction may produce a new immutable baseline.

## 7. Promotion from KB to core

A declarative rule or interpretation pattern may reveal a generic missing mechanism after repeated use. Promotion to `src` is justified only when the same abstraction appears in several independent KBs or benchmark families, cannot be represented cleanly through existing operators, and produces a simpler or more correct global semantics.

Promotion requires a generic specification, focused unit tests, metamorphic tests, all previous benchmark regressions and a migration plan for existing KB records. The former KB rule should either remain valid through the new operator or be deterministically recompiled.

## 8. Demotion and simplification

The architecture also permits demotion. If code in `src` is discovered to encode domain knowledge or benchmark-specific cases, it should be replaced by a generic mechanism plus declarative KB records. This reduces the trusted code surface and prevents dataset contamination.

The desired long-term shape is a compact, highly tested core; rich but declarative KBs; and explicit interfaces between them.
