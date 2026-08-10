---
id: DS019
title: Scalability, Profiling, and Contextual Worlds
status: in-progress
owner: architecture
summary: Establishes the pre-ingestion architecture gate for streaming compilation, query-directed execution, profiling, and scoped temporal, spatial, conceptual, fictional, and hypothetical knowledge.
---

# DS019 Scalability, Profiling, and Contextual Worlds

## Introduction

The v0.1 graph runtime proves a small executable path but is not the final architecture for million-edge corpora. The first complete WordNet and ATOMIC experimental builds now demonstrate deterministic source compilation and source-specific queries, while measuring the remaining scale problem: generated files are sharded statically, but their manifests eagerly import and merge every shard. Larger-source work is prohibited until query-directed import and bounded working sets replace that behavior.

## Core Content

### Current bottlenecks

The existing model loader imports every entity, fact, rule, and index into one process and requires globally unique aliases. This is incompatible with WordNet polysemy and increases JavaScript parse and heap cost with model size. `validateModel` recomputes and serializes full indexes, which creates large transient strings.

The v0.1 reasoner computes full bounded closure before any question is known. Generic multi-premise rules can still create combinatorial joins even after indexed candidate selection. Session assertions rebuild closure over the combined base and overlay. This is unacceptable for persistent graphs because a one-line hypothetical must not rederive the world.

Training preparation uses in-memory JSONL collections and canonical strings. The bAbI adapter uses synchronous full-archive decompression, retains TAR entries, parses complete split text, and writes complete JSONL arrays. These paths are acceptable for the recorded small experiment only and must not be reused for ConceptNet, Wikidata, GeoNames, ATOMIC, or Wikipedia.

The first algorithmic correction replaces posting-list array copying with amortized append and replaces all-fact premise scans with indexed candidate selection. This improves the current core but does not satisfy the architecture gate by itself.

### Mandatory profiling

Profiling is opt-in during ordinary interaction and mandatory for corpus probes, full preparation, model builds, validation, promotion candidates, scale benchmarks, and release queries. `eslm-profile-v1` records wall time, user and system CPU, RSS, heap and external-memory deltas, status, stage metrics, and stage order.

Training stages must include download or source read, decompression, parsing, schema validation, normalization, deduplication, dictionary construction, relation mapping, anomaly handling, sharding, index construction, source/provenance construction, module emission, static validation, semantic validation, import, and probe queries. Each stage reports input and output bytes, records, accepted and rejected counts, throughput, shard counts, peak memory when available, and spill or cache behavior.

Query stages must include model/profile initialization, normalization, construction parsing, entity or sense candidates, scope resolution, query planning, shard selection, posting reads, rule activation, join expansion, hypothesis generation, proof minimization, and realization. Reports include loaded profile and shard IDs, posting sizes, candidates examined, rules activated and fired, derived claims, cache hits, proof depth, answer count, and abstention cause.

Profiling data is operational metadata and must not alter model semantics or cache keys. Normal runtime omits it. `--profile` includes initialization and per-query measurements; interactive `/profile` exposes the last measurement. Training preparation with `--profile` writes a sidecar report.

### Corpus probe gate

Every new source begins with a probe before adapter completion or full training. The probe freezes a small artifact or reads a bounded stream window and constructs deterministic stratified samples. Strata include relation, record type, language, source, license, weight or rank, datatype, qualifier presence, temporal shape, spatial shape, text length, and parse outcome where applicable.

Sampling must not consist only of the first records in source order. It uses stable hash-based bottom-k or another deterministic method per stratum so a rerun over the same artifact yields the same sample. Rare strata and rejected records receive explicit quotas. For a small source such as WordNet, the probe may scan the full artifact while retaining bounded examples.

The probe report contains complete streamed counts where feasible, sampled records, field-shape inventory, unknown relations and datatypes, malformed and oversized values, identifier collisions, language surprises, ambiguous aliases, negative assertions, conflicts, cyclic relations, source/license mixtures, qualifier and time patterns, and estimated output/index size. It proposes no hard rule without counterexamples.

The coding agent receives the probe, source documentation, and approved samples. It must answer how every observed stratum maps, abstains, or is quarantined. Full ingestion cannot start until the probe report, semantic mapping table, resource estimate, and failure policy are reviewed.

The Open English WordNet probe and complete compiler run are complete. The 38-module build produced 23,771,871 bytes in about 1.34 seconds with about 281 MB RSS growth during the recorded run. An isolated cold import took about 0.80 seconds and added about 349 MB RSS.

The probe found 25,805 ambiguous normalized synset members, homograph-suffixed lexical-entry part-of-speech keys, adjective satellites, lexical relations nested at sense level, and external Wikidata IDs that share the JSON shape of internal edge lists. The provider now preserves lemma-to-many-synset postings and supports definitions, synonyms, sense counts, and bounded hypernym proofs. Contextual sense selection and lazy shard loading remain open.

The ATOMIC compiler streamed 1,076,880 train rows, retained 940,427 unique non-`none` tuples, and emitted 17 modules totaling about 32.96 MB. The recorded build took about 4.5 seconds and about 493 MB RSS growth. Isolated cold import took about 0.76 seconds and added about 284 MB RSS. The combined seeded 700-case WordNet/ATOMIC test passes every case and uses roughly 0.6 GB additional RSS; the report retains the run-specific value. This confirms that eager full-profile import is the next bottleneck.

### Scalable generated model

Large models require integer dictionaries for source IDs, entities or senses, predicates, scalar types, sources, worlds, domains, and common strings. Facts are grouped into immutable relation and scope shards. Postings use sorted integer IDs, not duplicate object references. Provenance is stored through compact claim-to-source and derivation tables.

The manifest contains a static allowlist of shard imports and metadata sufficient for planning without loading each shard. Corpus values never generate import paths. A profile may depend on shared dictionaries and another profile only through declared versioned dependencies.

The query compiler produces required predicates, candidate entity or sense IDs, world and temporal scope, result type, and reasoning budget. The planner loads only relevant shards, intersects sorted postings, and activates rules whose heads can contribute to the query. Full global closure is prohibited for large profiles. Deduction uses memoized top-down evaluation or semi-naive bottom-up evaluation over a bounded relevant subgraph. Session and hypothetical facts remain a small overlay and invalidate only affected memo entries.

Validation must stream shards, compare rolling inventories and per-shard index counts, and perform sampled and targeted semantic checks. It must not duplicate the entire graph or stringify complete indexes in memory. Promotion includes cold import, warm query, worst-case negative query, deep proof, ambiguity, and overlay benchmarks against fixed budgets.

### Temporal scope

Claims distinguish source-record time, ingestion time, and valid time. Valid time is an instant, closed or open interval, recurring condition, relative event order, or explicitly unknown. A timeless lexical relation is not represented as an event-time fact. A statement whose value changes keeps multiple scoped claims rather than overwriting history.

Queries may request current, historical, at-time, before, after, during, or order-relative answers. “Current” is resolved against an explicit evaluation time and source snapshot, not the machine clock hidden inside inference. Temporal conflicts are evaluated only when their validity intervals overlap under the same world and perspective.

### Spatial scope

Spatial knowledge separates named-place containment, coordinates with reference system, qualitative topology, relative direction, distance, and event location. Administrative containment and physical part-whole are different predicates. Direction and containment rules state which coordinate system and transitivity properties they use.

Spatial queries select relevant geographic profiles and may combine containment with coordinates only through typed executors. Approximate or disputed boundaries retain source and precision. Fictional locations never merge with real locations because their names match.

### Conceptual domains

Every source and profile declares one or more domain IDs from a versioned hierarchy, such as lexical semantics, biology, medicine, physics, chemistry, astronomy, geography, history, social behavior, or literature. Claims may inherit domain tags from source sections or typed entities, while cross-domain claims list all required domains.

Domain tags are planning and conflict-scope signals, not truth weights. They help select shards, disambiguate terminology, apply domain-specific units and rules, and report coverage. A word sense in finance and a homonymous sense in geography remain distinct even if their surface lemma matches.

### Worlds, perspectives, and hypothetical branches

Every contextual claim belongs to a world scope. `world:actual` represents the source's asserted real-world scope. A fictional work or coherent fictional universe receives its own world ID and canon or edition metadata. A user-supplied story, benchmark episode, simulation, or thought experiment receives an ephemeral world ID. Worlds do not inherit facts from one another unless a declared bridge imports background knowledge.

Perspectives distinguish world truth from an agent's belief, report, intention, obligation, or imagination. A character may believe a false proposition without changing the fictional world's asserted state. Source quotations and claims about claims retain the speaker or document perspective.

A hypothetical question creates an immutable branch from a named base world and adds assumptions to an overlay. Reasoning results are scoped to the branch and discarded unless explicitly exported. Counterfactual assumptions may contradict the base without rewriting it. Branch answers state whether they are deductive under assumptions, defeasible, abductive, or unknown.

### Architecture gate and budgets

The experimental K1 build has a probe, deterministic source reader, profiling report, sense-aware lemma postings, generated shards, validation, and random tests. It does not yet have query-directed shard import. This is sufficient to test semantics and establish measured costs, but not to authorize a larger eager corpus or call the architecture scale-complete.

The experimental ATOMIC provider preserves PersonX/PersonY text, relation direction, and defeasible answer status, but general participant binding and calibrated ranking remain open. Before ConceptNet, query-directed loading must be implemented, decompression and CSV parsing must be streaming, memory must remain within a declared fixed working-set budget, and relation shards must be emitted incrementally. GeoNames additionally requires typed coordinates and administrative containment. A future thematic Wikidata pack requires external partitioning, typed values, qualifiers, and revisioned scope; the full dump is not a build target.

A gate fails when throughput collapses superlinearly without an explained relation-density cause, peak memory scales with complete source size, one query loads unrelated domains, a session fact triggers whole-model closure, alias ambiguity is rejected at build time, profiling cannot attribute a hotspot, or a probe finds an unrepresented source stratum.

## Decisions & Questions

### Question #1: Why is full closure prohibited for large profiles?

Response: It computes consequences unrelated to the user's question, multiplies memory, delays startup, and makes a small contextual overlay expensive. Query-directed or semi-naive bounded execution preserves symbolic proofs while paying for relevant predicates and entities.

### Question #2: Why model fictional worlds in the same system?

Response: Their facts use the same language, event, time, space, and causal types but require strict scope isolation. A separate ad hoc story engine would duplicate semantics and make contextual reasoning harder to compare, while unscoped merging would corrupt real-world answers.

### Question #3: Are domain labels another taxonomy imposed on every fact?

Response: They are planning and interpretation metadata with explicit provenance. They do not replace predicates or source identity, and unknown or cross-domain records remain representable.

### Question #4: Must profiling always be enabled?

Response: No for ordinary low-latency use. It is mandatory for training, validation, scale experiments, and release evidence, and opt-in for interactive or batch diagnosis.

### Question #5: What authorizes full corpus training after a probe?

Response: A reviewed probe report must account for all observed strata, unknowns, anomalies, scope requirements, inference policies, estimated resources, and rejection behavior. Passing a schema parser alone is insufficient.

## Conclusion

Large-corpus ESLM requires streaming compilation, compact scoped shards, query-directed reasoning, and evidence-backed profiling. WordNet and ATOMIC now provide real measured source builds and queries, not plans. Their eager combined memory cost keeps the scale gate open and blocks larger ConceptNet or GeoNames ingestion until lazy selection exists. Time, space, domain, world, perspective, and hypothetical branches remain required semantics for later scoped corpora.
