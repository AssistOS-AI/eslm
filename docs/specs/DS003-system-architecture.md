---
id: DS003
title: System Architecture and Authority Boundaries
status: implemented
owner: runtime
summary: Separates stable linguistic algorithms, training-time program synthesis, generated executable data, runtime inference, and evaluation authority.
---

# DS003 System Architecture and Authority Boundaries

## Core Content

### Components

The stable runtime under `src/` owns input normalization, construction parsing, query contracts, entity resolution algorithms, indexed retrieval, bounded inference, trace production, realization, CLI adaptation, and report computation. These algorithms must remain useful when the promoted corpus changes.

`training/input/` owns authorized source evidence, reviewed generated-KB sources, and locally obtained public datasets. `training/work/` owns prepared packets, chunk ledgers, and transient products. `training/candidates/` may hold isolated generated candidates. `training/model/` contains the promoted executable model imported by default; `training/KBs/QUICK/model/` contains independently selectable generated domain graphs.

Persistent public knowledge lives under `training/KBs/SOURCE_ID/`, separately from evaluation data under `training/datasets/DATASET_ID/`. The source registry is `src/corpora.mjs`. Corpus acquisition and compilation may be added only after the immutable release, license, probe, scope mapping, and profiling budget required by DS018 and DS019 exist.

`training/.agents/skills/synthesize-eslm-model/` owns the self-contained instructions and validator used by a coding agent. The skill may generate a candidate but cannot promote it or inspect hidden evaluation.

`tests/` owns deterministic code contracts and small demonstration fixtures. `docs/results/` owns latest evaluation and benchmark evidence. These outputs are not inputs to synthesis.

### Authority flow

```text
authorized corpus → frozen train packet → coding agent → candidate modules
       ↓                                      ↓
 hidden split ─────────────────────────→ separate evaluator
                                              ↓
                                  review and explicit promotion
                                              ↓
 user input → stable runtime + promoted model → answer and trace
```

The runtime has only read access conceptually to the promoted modules and selected user input. It cannot discover training files, download evidence, or ask a model to fill a gap. Training orchestration may read and write packets and candidates but does not answer user queries. Evaluation may load a candidate and hidden suite but does not expose labels to synthesis.

### Generated-code trust model

Generated `.mjs` is executable and therefore treated as untrusted until validated. The format restricts modules to frozen data, static local imports, and pure bounded helpers. Static scanning blocks obvious ambient capabilities. Semantic validation checks schema, references, aliases, facts, rules, provenance, and index membership. Review checks that generated code represents evidence rather than embedding a benchmark oracle.

No validator can make arbitrary JavaScript safe by inspection alone. Production hardening may add an operating-system sandbox or a declarative binary format, but v0.1 minimizes exposure by limiting source shape and keeping candidates outside the promoted path until review.

### Query path

The inference engine performs normalization, tolerant lexical repair, language detection, construction match, entity resolution, query-contract creation, fact/rule closure, answer selection, provenance projection, and realization. Each stage returns inspectable data. Failure becomes an explicit state at the earliest stage that can justify it.

The current reasoner computes bounded closure at engine construction. Posting creation now uses amortized append and rule premises use indexed candidate selection, but full closure and session-wide rebuilding remain scale blockers. Large profiles must use query-directed shard loading, head-indexed rule activation, memoized or semi-naive evaluation over a relevant subgraph, and overlay-local invalidation while preserving answer and trace semantics.

Opt-in query profiling records initialization, session compilation, normalization, parsing, closure, index construction, retrieval, realization, CPU, memory deltas, and work counts. Profiling is mandatory for scale and release evidence and omitted from normal responses unless requested.

### Training path

`train prepare` validates JSONL records, canonicalizes them for a content digest, counts record classes, declares a split, and emits an agent-visible packet only for `train`. A hidden packet records metadata without records. Candidate scaffolding copies the authorized packet into an isolated directory and points the agent at the synthesis skill.

Program synthesis is intentionally not fully automated by the runtime. A deterministic compiler can handle structured records, while a coding agent analyzes less structured text, induces schemas, writes modules, and reports residuals. That agent work is the experimental analogue of training.

### Scale path

The v0.1 arrays optimize inspectability but are not approved for million-edge ingestion. Scale requires dictionary interning, relation-and-scope shards, sorted integer postings, tries or automata for aliases and constructions, event transition tables, static manifest-declared lazy imports, streaming validation, and memoized rule subgoals. Corpus text never chooses a module path. DS019 defines the mandatory gate and failure conditions.

### Versioning

Model format, runtime protocol, benchmark protocol, dataset hashes, and evidence regimes are versioned independently. A runtime rejects unsupported model formats. A comparison importer labels nonmatching protocols as reference-only. Format migrations require a DS, migration tests, and preservation of prior report interpretation.

### Dataset and KB selection paths

`src/datasets.mjs` owns the frozen public evaluation-dataset catalog, archive verification, safe TAR extraction, official split preservation, JSONL adaptation, chunk manifests, train-only analysis, and local status. bAbI Task 15 is implemented and complete. Tasks 2, 3, and 16 reuse the archive and have prepared splits but no promoted model or held-out result.

`src/corpora.mjs` owns the real knowledge-source registry and local source/probe/prepared/model state. The priority queue is Open English WordNet, ATOMIC, filtered ConceptNet, and bounded GeoNames. Wikidata is future and thematic only; DBpedia and Wikipedia are deferred. The complete WordNet probe exists, but no real source is currently retained in the corpus cache and no source-derived KB has been prepared or generated.

`src/kbs.mjs` owns the KB catalog, selection parsing, independent loading, merge semantics, and inventory reporting. `src/kb-training.mjs` compiles reviewed JSON sources into fixed ESM module graphs. The base model is always loaded first. Only requested KBs are imported. Merge rejects incompatible entity kinds, deduplicates identical fact/rule signatures, rebuilds canonical postings, validates the active graph, and records selected IDs in the merged manifest.

Evaluation and benchmark reports copy the active model ID, KB list, and comparability flag from the engine. A KB-augmented run is a valid named experiment but cannot replace or silently overwrite the clean default interpretation.

## Decisions & Questions

### Q1. Why store the promoted model inside `training/`?

Response: It makes the lifecycle explicit: the artifact is the output of program synthesis, adjacent to its input and agent instructions, while stable inference algorithms remain in `src/`.

### Q2. Why not execute generated code in `node:vm`?

Response: `node:vm` is not a security boundary. The current format minimizes generated behavior and relies on isolation before promotion; stronger isolation belongs at the process or container boundary.

### Q3. May evaluation results automatically trigger regeneration?

Response: Visible development failures may produce training work packets after an explicit experiment transition. Hidden benchmark labels cannot feed the synthesis agent automatically.

### Q4. Why are optional KBs model-format artifacts rather than ad hoc runtime objects?

Response: Reusing the manifest, provenance, rule, and index invariants makes every domain independently loadable, reviewable, rebuildable, and testable. Ad hoc objects would bypass generated-code validation and make active fact counts irreproducible.
