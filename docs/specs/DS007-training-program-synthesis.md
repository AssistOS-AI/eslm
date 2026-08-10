---
id: DS007
title: Training as Coding-Agent Program Synthesis
status: implemented
owner: training
summary: Specifies frozen evidence packets, agent isolation, modular code induction, candidate validation, evaluation separation, and reviewed promotion.
---

# DS007 Training as Coding-Agent Program Synthesis

## Core Content

### Meaning of training

ESLM training is the generation and refinement of executable symbolic modules from authorized evidence. There is no optimizer, tensor, loss backpropagation, checkpoint, or locally trained control model. A coding agent plays the role of compiler designer and knowledge engineer under a strict skill and output contract.

This choice tests a specific proposition: a capable code-generation process can condense data into modular programs whose runtime competence is useful, inspectable, and efficient. Agent compute belongs to training cost and must be disclosed even though inference cost is small.

### Input schema and raw text

The initial JSONL schema accepts `entity`, `fact`, `rule`, `lexeme`, `construction`, and `document` records. Structured records permit deterministic bootstrapping. `document` records preserve source text, document identity, spans, license, and metadata for agent analysis.

Raw text is never executed. Preparation validates record shape, hashes the exact file and a canonical semantic serialization, counts types, names the split, and emits a packet. Future preparation adds deterministic segmentation, duplicate detection, license inventory, source boundaries, and contamination fingerprints.

### Split discipline

Training evidence is agent-visible. Development evidence may be visible only according to a declared experiment protocol, typically through aggregate failures or curated counterexamples after an iteration boundary. Shadow and test packets record only metadata and do not include records.

The synthesis skill refuses non-train packets. A candidate directory contains a copy of the allowed packet and the generated modules. The hidden evaluator is a distinct invocation that loads the candidate after generation has stopped.

Public benchmark examples used as training invalidate zero-shot claims for that dataset and must change the evidence regime. Benchmark adapters and schemas may be known; labels and held-out cases may not.

### Synthesis responsibilities

The coding agent analyzes linguistic layers, identities, claims, relations, events, recurring constructions, narrative patterns, rules, exceptions, and conflicts. It produces stable ids and source provenance. It creates indexes and factors repeated structure rather than embedding one answer branch per example.

The agent distinguishes direct assertions, normalized paraphrases, deterministic consequences, supported induction, and low-confidence hypotheses. Only the first three are promoted automatically. Induced rules require support and counterexample reporting. Hypotheses remain in `synthesis-report.json` pending review.

The agent must use `training/.agents/skills/synthesize-eslm-model` for frozen-source compilation. That skill is self-contained, Node-only, and contains generated-module and linguistic induction contracts. It cannot modify stable core code while synthesizing a candidate. Benchmark-driven adaptation additionally uses `training/.agents/skills/benchmark-guided-symbolic-learning`, which establishes baselines, clusters failures, distinguishes KB knowledge from generic core mechanisms, and accepts candidates only after fresh, metamorphic, proof, and regression gates.

### Candidate lifecycle

1. `eslm train prepare --input ...` creates a hashed packet in `training/work/`.
2. `eslm train candidate --packet ... --output training/candidates/NAME` creates isolated work and instructions.
3. A coding agent reads the synthesis skill and authorized packet, then writes candidate `.mjs` and `synthesis-report.json`.
4. The skill's independent validator checks forbidden capabilities, manifest shape, references, and provenance.
5. `eslm train validate --model CANDIDATE` applies runtime format validation.
6. Visible training counterfactuals and declared development evaluation run against the candidate.
7. A reviewer examines diff, residual report, compression, performance, and leakage evidence.
8. Explicit promotion replaces `training/model/`; hidden evaluation and reports then run.

V0.1 intentionally has no automatic promotion command. Replacing an executable model is a material effect and must remain a reviewed file operation until provenance signing and rollback are specified.

### Failure-driven refinement

Failures are clustered by normalization, lexicon, construction, entity identity, retrieval/index, rule, event/state, narrative schema, verification, realization, or missing knowledge. The next synthesis iteration changes the smallest coherent module family.

A failure on missing evidence does not justify a linguistic rule. A failure on paraphrase does not justify adding the expected answer as a fact. A reasoning-depth failure with all premises present targets executor/index behavior. This causal classification is required for meaningful research.

### Cost and reproducibility

A synthesis report records agent product/version when known, prompts or assignment, tool policy, elapsed time, token/API cost if available, packet digest, candidate digest, manual interventions, and generated byte counts. A model is reproducible in the weaker auditable sense when the exact packet and agent transcript explain the source diff; stochastic agents need not regenerate byte-identical code.

Deterministic preparation, validation, inference, and evaluation remain replayable. Future experiments should compare multiple agent runs to measure synthesis variance.

### Public dataset cache, chunks, and completed Task 15 run

Public acquisition is catalog-driven. A definition freezes family, task, language, scale, version, source URL, archive SHA-256, license status, selected files, and stage fields. `dataset fetch` reuses a matching cache, rejects a hash mismatch, safely scans the TAR archive, extracts only selected files, and records byte counts and hashes. `dataset prepare` preserves the official split and emits a manifest with agent-visible train chunks and an agent-hidden test file.

The Task 15 run used 10,000 train cases represented by 20 chunks of 500. One primary coding agent analyzed the complete prepared train split. The v1 synthesis ledger verified every chunk hash but was not maintained as a completion journal; its 20 entries remain pending and are not worker-completion evidence. Train-only analysis observed 40,000 membership statements, 40,000 universal-rule observations over 12 signatures, four recurring names, four answer classes, support depth two source statements, and zero unsupported context statements. The agent promoted constructions and morphology, not story facts or answers. Candidate and promoted validation passed before 1,000 hidden test cases were scored.

Parallel synthesis uses deterministic, immutable, disjoint assignments. A worker receives only its named assignment and train chunks, writes one private declarative result, and cannot mutate the shared ledger or candidate. A single reducer rejects missing, duplicate, extra, digest-mismatched, or hidden-test-referencing results; sorts evidence canonically; and produces the only aggregate from which global symbols and candidate modules may be generated. Candidate generation, validation, promotion, and hidden evaluation remain serialized.

The parallel protocol was added after the promoted Task 15 run. A four-worker demonstration plan partitions its 20 chunks and has a frozen plan digest, but it has zero worker results and no reduction. It proves orchestration preparation, not a parallel training run. Future run records must name execution mode, forked worker count, assignment-plan digest, valid result receipts, reducer digest, coding-agent identities, and unavailable cost/transcript fields explicitly.

Task 16 has been fetched and deterministically prepared into 10,000 train and 1,000 test cases. Its 20-chunk ledger exists, but every entry remains pending. No coding-agent synthesis result, candidate, promotion, or evaluation exists. A stage label may change only after the corresponding artifact exists.

### Selectable educational KB synthesis

An educational KB source is reviewed JSON under `training/KBs/QUICK/source/` with a declared scope, entities, facts, rules, constructions, variants, and executable examples. It is generated by the coding agent but is not a public benchmark corpus. `kb build` emits seven static ESM modules per domain. `kb validate` applies generated-code scanning and model invariants independently.

The synthesis skill's knowledge-module protocol requires independent source digests, semantic module boundaries, direct and closure counts, cross-module composition analysis, positive and unknown tests, and an explicit benchmark-eligibility decision. Unsafe universals must not be introduced merely to reduce source size; the animal KB therefore uses explicit bird flight capabilities rather than a rule that would misclassify penguins and ostriches.

These hand-authored KBs are regression fixtures, not the primary research corpus. They verify loading, index reconstruction, merge behavior, closure, exceptions, and report conditioning. Real persistent knowledge follows DS018 and the pre-ingestion gate in DS019.

### Large public-corpus synthesis

At corpus scale, the coding agent designs semantic mappings, profile boundaries, inference policies, shards, indexes, and validators. A deterministic Node adapter performs exhaustive streaming transformation. The agent receives source documentation, a stratified frozen probe, distributions, conflicts, overlaps, malformed cases, and counterexamples; it must not manually transcribe millions of rows or claim to have inspected rows processed only by deterministic code.

Every corpus build produces a source manifest, probe report, prepared manifest, profiling sidecar, synthesis report, generated profile manifests, and validation report. Mutable sources resolve to a release, dated snapshot, or fixed entity revisions. Full ingestion is prohibited until the probe accounts for every observed stratum and profiling estimates the resource envelope.

Open English WordNet 2025 and ATOMIC 2020 are the first completed source transformations. The WordNet compiler processed all 107,519 synsets into sense-aware lemma and synset shards. The ATOMIC compiler streamed all 1,076,880 train rows and retained 940,427 unique non-`none` tuples under 36,940 events; dev and test were not compiled. These are experimental source-derived modules rather than public benchmark generalization claims. Filtered English ConceptNet and bounded GeoNames remain next, but are blocked on the DS019 lazy/query-directed import step. Wikidata remains optional and thematic only.

## Decisions & Questions

### Q1. Why allow a coding agent but prohibit an LLM compiler at runtime?

Response: The experiment explicitly amortizes expensive semantic compilation into a fixed executable artifact. Runtime independence, inspection, and replay are the qualities being tested.

### Q2. Can the agent generate stable core algorithms?

Response: Only in a separate product-development task with DS and tests. Model synthesis itself is restricted to the candidate model directory.

### Q3. How are narrative corpora introduced?

Response: A narrative corpus is introduced only after event, world-state, discourse, and narrative-schema contracts have executable representations and isolated evaluation. It is one evidence source among several rather than the organizing structure of the runtime.

### Q4. Does deterministic KB compilation replace coding-agent synthesis?

Response: No. The coding agent authors and reviews semantic source structure, scope, rules, exceptions, and examples. The deterministic compiler converts that reviewed source into a repeatable module graph and indexes. Public raw-text synthesis still requires chunked agent analysis because its reusable semantics are not given as a reviewed KB schema.

### Question #5: Which component processes every record in a large graph?

Response: A reviewed deterministic Node adapter processes every record. Coding agents generate and revise the semantic compiler and may analyze disjoint probes, but exhaustive row processing must be replayable and independent of agent context limits.
