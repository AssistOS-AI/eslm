# Generated model module contract

## Entry point

`manifest.mjs` statically imports all modules and exports the model as both `model` and the default export. The top-level object contains `manifest`, `entities`, `facts`, `rules`, `lexicon`, and `indexes`. It may add versioned optional sections.

The manifest format is `eslm-code-model-v1`. Include a stable `modelId`, ISO `generatedAt`, source content digest, evidence regime, and module inventory. A candidate must not claim test or benchmark evidence as training evidence.

## Entities

Each entity has a lowercase stable id matching `^[a-z][a-z0-9-]*$`, one or more names, and a kind. Names must be unique after the runtime's documented normalization unless ambiguity is represented explicitly in a future format. Prefer source-stable semantic ids to sequential ids for small models; use interned sequential ids only for large shards whose manifest freezes the dictionary.

## Facts

Each fact contains a stable id, subject entity id, canonical predicate, exactly one `object` entity id or scalar `value`, and a non-empty provenance array. Optional temporal, modal, epistemic, or scope fields must be explicit; never encode them in the predicate string merely to avoid schema work.

## Rules

Rules use bounded Datalog-like triples. Variables begin with `?`. `when` is a non-empty array of triple patterns and `then` is one triple. Include source or induction evidence, confidence when induced, and counterexamples when present. Avoid unbounded recursion, negation-as-failure, side effects, and rules that manufacture unnamed entities.

## Language

Separate canonical forms from accepted variants. Constructions declare their surface trigger, typed slots, semantic query or assertion form, language, confidence, and counterexamples when the v1 runtime supports those fields. Keep realization templates grammatical and deterministic. Do not store full source answers as templates.

## Indexes

Indexes are derived acceleration structures and must be exactly reconstructible from canonical modules. Required indexes cover facts by subject, predicate, and object/value plus normalized aliases. Large models should use sorted integer posting lists, predicate shards, prefix tries or minimal automata for aliases, and interned dictionaries. The validator must compare index membership with source facts.

## Safety

All modules use static relative imports, frozen data, and pure helper functions. No module performs I/O at import time. Forbidden capabilities include network, processes, environment access, timers, nondeterministic randomness, dynamic code compilation, and corpus-selected module paths.
