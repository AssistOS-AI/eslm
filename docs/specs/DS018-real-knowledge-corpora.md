---
id: DS018
title: Real Knowledge Corpora and Source-Derived Modules
status: in-progress
owner: training
summary: Defines the registry, staged ingestion, semantic mapping, modular compilation, provenance, inference safety, and evaluation boundaries for real public knowledge corpora.
---

# DS018 Real Knowledge Corpora and Source-Derived Modules

## Introduction

ESLM uses evaluation datasets and knowledge corpora for different purposes. Evaluation datasets provide controlled inputs and oracles. Knowledge corpora provide persistent lexical, factual, commonsense, causal, spatial, temporal, or event evidence from which executable modules are built. A benchmark can reveal a reasoning failure, but it must not be presented as the source of broad world knowledge.

This specification establishes Open English WordNet 2025 as the first corpus target, ATOMIC 2020 as the second, filtered English ConceptNet as the third, and a bounded GeoNames countries-and-capitals pack as the fourth. Wikidata is removed from the near-term queue: it may be introduced later only as a dated thematic pack justified by a concrete domain experiment. DBpedia and English Wikipedia remain deferred.

## Core Content

### Registry and stage truth

`src/corpora.mjs` is the machine-readable registry for persistent knowledge sources. It is separate from `src/datasets.mjs`, which catalogs controlled evaluation data. A corpus entry must state its ID, priority, semantic role, official source, release or snapshot policy, verified scale when known, license, source relation inventory, planned profiles, ingestion status, and build status.

`corpus catalog` and `corpus status` must distinguish planning from local artifacts. Catalog presence does not mean that a source was downloaded. Status separately reports a cached source manifest, prepared manifest, and generated model. A source must not be described as fetched, prepared, trained, generated, validated, or evaluated until the corresponding artifact exists.

A mutable `latest` URL may be used only to discover availability and current scale. Before download, the adapter must resolve it to a dated snapshot, release tag, immutable revision, or archived artifact. `source-manifest.json` must record retrieval time, byte count, integrity digest, license and attribution material, adapter version, and extraction inventory.

### Responsibilities at corpus scale

A coding agent must inspect source documentation, relation definitions, a frozen representative probe, distributions, conflicts, malformed records, source overlaps, and counterexamples. It proposes and reviews the mapping into ESLM types, permissible inference, profile boundaries, sharding, indexes, and abstention behavior.

A deterministic Node.js adapter must stream and validate the complete artifact, apply only the reviewed mapping, produce exact inventories, and emit reproducible modules. The coding agent must not manually translate millions of rows into JavaScript and must not be described as having inspected rows processed only by deterministic code.

Generated model artifacts remain ESM `.mjs`. Large profiles must prefer dictionary-interned arrays and relation shards over one object literal per assertion. The manifest remains the import boundary. Corpus text stays data and cannot select module paths or become executable source. Python, native extensions, embeddings, external database servers, and runtime network clients are prohibited.

Parallel agents may analyze immutable disjoint probe or source partitions and write private result files. A deterministic reducer reconciles counts, proposed symbols, conflicts, and unsupported material. Global IDs, semantic policy, candidate generation, validation, and promotion remain serialized. Output identity and order must not depend on worker scheduling.

### Normalized representation

Adapters must preserve source identity while producing typed senses, lemmas, definitions, entities, aliases, relations, scalar values with units, events, event roles, claims, negative assertions, conflicts, and provenance. Source-specific fields remain in metadata when no sound common representation exists; they must not be forced into a generic triple that changes meaning.

Every direct claim retains a source record ID sufficient to recover the original assertion. Every derived claim retains rule ID, ordered supports, method, depth, scope, and epistemic status. Deduplicating matching claims combines provenance but does not count multiple copies from the same upstream resource as independent confirmation.

Cross-source identity is an evidence-bearing relation, not a string merge. A WordNet sense, ConceptNet term, and Wikidata entity may be linked while their IDs remain distinct. Ambiguous names preserve multiple candidates until question context resolves them.

### Open English WordNet 2025

The first adapter must use the official 2025 JSON release and preserve both Open English WordNet and underlying Princeton WordNet attribution. It must report exact archive, file, synset, sense, lemma, definition, example, part-of-speech, and relation counts after parsing.

The first complete probe scanned the 9,986,555-byte archive's 73 JSON members and recorded 107,519 synsets, 185,129 unique sense IDs, 128,009 lexical-entry keys, 127,311 normalized synset members, 107,524 definitions, and 49,596 examples. It found 25,805 normalized members linked to multiple synsets. The scan is source analysis, not a generated model or completed K1 build.

The probe also found adjective-satellite `s` records, homograph-suffixed lexical-entry keys such as `n-1`, lexical relations nested inside sense entries, and external Wikidata identifiers represented as string arrays. The adapter must interpret fields semantically rather than infer edge type from JSON shape. No internal synset target was unresolved after external identifiers were classified separately, and combined hypernym edges left zero cyclic nodes after topological reduction.

The model must preserve synset and sense identity. Identically spelled lemmas must not merge different senses. Definitions and examples remain cited text used for explanation or disambiguation, not executable rules.

The initial profiles are `core-senses` and `full-lexicon`. The core profile must use a reproducible salience rule. Both profiles expose lemma, spelling, part-of-speech, synset, and relation indexes.

Hypernym and instance-hypernym paths may support bounded deductive taxonomy after sense resolution. Synonymy may support answers within a synset. Meronymy and holonymy do not receive blanket transitivity. Antonymy supplies lexical contrast, not universal logical negation. Verb entailment and causation preserve direction. Derivational links aid language analysis without asserting entity identity.

### ATOMIC 2020 event knowledge

ATOMIC 2020 is the second source target, but compilation may begin only after event templates, participant binding, modality, and hypothesis statuses are executable. Its approximately 1.33 million tuples are event-centered continuations and are not unconditional facts about named entities.

`xIntent`, `xNeed`, `xEffect`, `xReact`, `xWant`, `oEffect`, `oReact`, `oWant`, `HinderedBy`, `Causes`, `isBefore`, `isAfter`, and `HasSubEvent` must preserve actor role and direction. Typical intentions, reactions, and effects produce labeled hypotheses or defeasible expectations. Abductive reversal retains alternatives and never asserts that a proposed cause occurred.

Initial independently loadable profiles are `social-core` for actor intentions, needs, effects, reactions, and wants, and `event-causality` for causes, hindrances, temporal order, and subevents. The first probe must inventory placeholder forms, empty or generic continuations, relation balance, duplicated templates, phrase lengths, and participant-role anomalies. Candidate KBs require participant-binding tests, relation-direction tests, unknown-event tests, and calibration reports.

The CC BY dataset artifact must be frozen separately from the Apache-licensed reference codebase. ESLM consumes the data through a native Node adapter and does not add its Python modeling stack.

### ConceptNet 5.7 English

The third adapter must use the official 5.7.0 assertion archive and apply a documented English endpoint, source, relation, and weight policy. It retains assertion identity, relation, endpoints, weight, surface text, source activities or contributors, and per-assertion license metadata.

Initial profiles are `english-core`, `english-physical`, and `english-everyday-actions`. Profile membership must be reproducible. Any threshold proposed by an agent requires retained and rejected samples and is frozen before evaluation.

Relations retain distinct semantics. `IsA` may join a typed bounded taxonomy. `PartOf`, `HasA`, `UsedFor`, `AtLocation`, `MadeOf`, and `ReceivesAction` are not transitive by default. Class-level `CapableOf` and `HasProperty` produce defeasible defaults when applied to instances; specific negative evidence and exceptions outrank them. `Causes` and `MotivatedByGoal` support bounded hypotheses, not categorical facts.

ConceptNet includes material from sources such as WordNet and DBpedia. Upstream metadata must be retained so separately loaded profiles do not inflate support. Attribution and share-alike requirements enter source and generated manifests.

### GeoNames bounded geography

GeoNames is the fourth source target because it can supply useful real places without the semantic and storage scope of Wikidata. The first `countries-and-capitals` profile contains country and capital identities, alternate names, feature types, coordinates, and reviewed administrative containment. A `global-places` profile is optional and requires separate scale approval.

The adapter preserves GeoNames IDs, source fields, feature class and code, latitude and longitude, country and administrative codes, population where accepted, modification date, and alternate-name language. Administrative containment, physical part-whole, coordinate proximity, and name equivalence remain different relations. Coordinate and containment inference requires typed spatial executors and must retain precision and disputed-source status.

### Future Wikidata thematic packs

The project must not ingest the complete Wikidata graph. The current truthy dump is extremely large and omits qualifiers and references, while useful claims often require time, rank, units, or source scope. Wikidata is not K2, K3, or K4 and does not block the prioritized WordNet, ATOMIC, ConceptNet, or GeoNames KBs.

A later domain experiment may authorize a dated pack such as `science-core`, `geography-crosscheck`, or `history-core`. Each manifest records the concrete research need, seed IDs and rationale, exact entity revisions or dated snapshot, property allowlist, traversal direction and depth, language, rank and qualifier policy, rejected datatypes, and final inventory. There is no generic full-dump build target.

`P31`, `P279`, and reviewed containment properties may support typed composition. Coordinates, quantities, units, times, intervals, ranks, qualifiers, and references require dedicated values. Changing properties such as office, residence, membership, population, or employment must not become timeless triples. The official entity interface may be used for a small fixed seed set at fixed revisions; all training responses are cached and runtime network access remains prohibited.

### Other deferred sources

DBpedia is deferred because its initial contribution overlaps Wikidata and ConceptNet and its artifacts require separate availability and license review. English Wikipedia is deferred until claim extraction, revision and span provenance, temporal scope, contradiction handling, and citation-support evaluation exist.

Wikipedia text must not be converted into unqualified triples through a generic prompt. A first text profile uses a bounded revisioned article set and retains page, revision, and source spans for every extracted claim.

### Inference and exposure safety

Deduction is permitted only for typed rules licensed by relation semantics. Defeasible inheritance must search for exceptions. Induction requires support, source diversity, counterexamples, a validation partition, and a frozen threshold. Abduction produces ranked alternatives. Temporal inference requires explicit time and interval policy. Conflict selection requires a declared source, rank, or time policy while preserving incompatible evidence.

No relation becomes transitive from linguistic intuition alone. A source weight is not a calibrated probability. Missing negative evidence does not imply a positive fact, and missing positive evidence does not imply falsehood. Provenance establishes origin, not truth.

A benchmark derived from an ingested source must declare exposure. ConceptNet-derived tests after ConceptNet ingestion and WordNet-derived tests after WordNet ingestion may measure language compilation and execution over known knowledge, but they are not independent factual generalization. Reports classify cases as `source-exposed`, `source-overlapping`, or `source-independent`.

### Profiles, scale, and milestones

Every generated profile is independently loadable, lists dependencies, and reports source version, direct claims, indexed values, import time, memory, and comparability. Query execution should load and activate only relevant profiles and predicates.

K1 completes when the WordNet adapter, frozen source manifest, two profiles, validators, inventories, query integration, ambiguity tests, held-out relation tests, and performance report exist. K2 produces the two ATOMIC profiles and requires participant binding, relation direction, hypothesis calibration, and categorical-leakage tests. K3 applies the source-build standard to three ConceptNet profiles and adds default/exception and source-overlap audits. K4 produces the bounded GeoNames countries-and-capitals profile with spatial-type and resource tests. K5 is optional: a Wikidata domain pack exists only after a concrete experiment demonstrates value not supplied by the prior KBs.

The current `child-basic`, `animals`, and `space-geography` modules are regression fixtures. They may remain during K1, but they must not appear as public-corpus training evidence or broad knowledge coverage.

## Decisions & Questions

### Question #1: Why start with Open English WordNet?

Response: It is moderate in size, sense-aware, and supplies the lexical taxonomy required to interpret larger commonsense graphs safely. It exercises the full pipeline before ConceptNet's scale and defeasible semantics.

### Question #2: Why not import complete Wikidata immediately?

Response: Its size forces premature storage optimization, and the truthy representation omits qualifiers and references required for defensible answers. WordNet, ATOMIC, ConceptNet, and GeoNames provide more focused experiments first. A future thematic pack may test the hard Wikidata semantics while remaining bounded and auditable.

### Question #3: Does deterministic compilation replace agent training?

Response: No. The agent generates and revises semantic compilers, schemas, relation policies, rules, profiles, indexes, and validators. Deterministic Node execution applies that design exhaustively and reproducibly.

### Question #4: Can ConceptNet capabilities be inherited as facts?

Response: Not generally. Class capabilities and properties are defeasible defaults. Specific evidence and exceptions outrank them, and realization preserves epistemic status.

### Question #5: When may Wikipedia enter training?

Response: Only after revision and span provenance, executable claim scope, conflict representation, and citation-support evaluation exist.

## Conclusion

Real ESLM knowledge training begins with sense-aware lexical structure, then adds scoped event hypotheses, relation-specific commonsense, and bounded geography. Wikidata remains an optional future thematic source rather than an ingestion milestone. The coding agent owns semantic design; deterministic Node adapters own exhaustive transformation. Every source remains selectable, versioned, licensed, provenance-preserving, and evaluated under an explicit exposure regime.
