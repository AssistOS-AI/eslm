---
id: DS012
title: Public Benchmark Portfolio and Native Node Adapters
status: in-progress
owner: benchmarks
summary: Defines a multi-axis public benchmark portfolio, local dataset handling, native adapter semantics, licenses, and limits of score comparability.
---

# DS012 Public Benchmark Portfolio and Native Node Adapters

## Core Content

### Selection principle

No single benchmark measures the ESLM hypothesis. The portfolio must separate grammar, world knowledge, factual coverage, entity state, relation composition, narrative coherence, and open QA. Datasets are consumed by native Node adapters or converted once into the versioned neutral JSONL protocol; official Python pipelines are not runtime dependencies.

Dataset files live locally under ignored `training/datasets/`. Acquisition records official source URL, version or commit, license/acceptance terms, original archive hash, extracted-file hashes, and adapter version. The repository does not silently download or vendor data.

Benchmark adapters are not the registry for persistent knowledge corpora. `src/datasets.mjs` owns controlled evaluation data; `src/corpora.mjs` and DS018 own source-derived KB evidence. A suite built from an ingested corpus must carry an exposure label.

### BLiMP

BLiMP contains 67 English minimal-pair datasets with 1,000 examples each across grammatical phenomena. The adapter reads official JSONL `sentence_good` and `sentence_bad`, asks ESLM for a sentence preference score, and reports overall and phenomenon-level accuracy plus unsupported coverage.

The current heuristic grammar score is suitable only for adapter smoke tests. A credible BLiMP experiment needs construction-level dependencies and controls for length/vocabulary artifacts. Published BLiMP neural results are reference-only unless the exact corrected dataset and scoring convention match.

Official sources: [BLiMP repository](https://github.com/alexwarstadt/blimp) and [TACL paper](https://aclanthology.org/2020.tacl-1.25/).

### bAbI

bAbI's 20 task families cover single and multiple supporting facts, relations, yes/no, counting, lists, negation, indefinite knowledge, coreference, conjunction, time, deduction, induction, positional and size reasoning, path finding, and motivation. Its simulated worlds and support annotations make it especially valuable for trace fidelity and depth curves.

The Node adapter parses numbered story lines, resets worlds at story boundaries, compiles statements into events/facts, executes state transitions, and answers tab-separated questions. Report per-task accuracy, exact support recovery, chain length, and out-of-distribution length. Dataset generator and release must be named because separately generated releases need not contain identical examples.

Task 15 English 10k v1.2 is implemented and has run. The frozen archive is 11,745,123 bytes with SHA-256 `84f5296ab9a1ad0dc9464e08c491d65cd08830fca3acae9ab86f75e0fb81573c`. The selected raw train and test files contain 10,000 and 1,000 episodes. Preparation emits 20 train chunks of 500, preserves support IDs, and keeps test agent-hidden. The current default model scores 1,000/1,000 semantic answers.

Task 16 English 10k v1.2 is a separate catalog entry that reuses the same archive path. Its 10,000 train and 1,000 test cases are fetched and generically prepared. All 20 synthesis-ledger entries remain pending; task-specific induction analysis, synthesis, candidate validation, promotion, and evaluation have not run. The CLI rejects Task 15-specific analysis on Task 16 rather than emitting misleading counts.

Official source: [Facebook bAbI tasks archive](https://github.com/facebookarchive/bAbI-tasks).

### CLUTRR

CLUTRR tests kinship relation reasoning with controlled composition length, linguistic variation, and noise. Its held-out relation-chain lengths directly test whether explicit rules compose beyond seen examples.

The adapter converts story mentions into identities and kinship edges, executes relation rules, and maps the queried pair to the target relation. Report by train/test composition length, clean/noisy condition, parse coverage, and conditional reasoning accuracy. Respect the repository's CC BY-NC 4.0 terms.

Official sources: [CLUTRR repository](https://github.com/facebookresearch/clutrr) and [paper](https://arxiv.org/abs/1908.06177).

### Entity Tracking

Entity Tracking evaluates final state after state-changing operations. It directly measures whether English event compilation and symbolic transition execution remain correct as operation sequences change.

The adapter parses each initial state and ordered operation, executes explicit transition functions, then compares final entities/attributes. Report event parse rate, transition accuracy conditional on parse, end-to-end accuracy, sequence-length curve, and trace fidelity.

Official source: [ACL 2023 paper and artifacts](https://aclanthology.org/2023.acl-long.213/).

### EWoK

EWoK contains 4,374 context-target items across 11 world-knowledge domains. It compares plausible and implausible contexts/targets and includes human and open-model evaluations. It tests whether generated knowledge modules capture broad commonsense rather than only explicit micro-world rules.

Access may require accepting dataset terms. The adapter reports preference accuracy, domain breakdown, construction coverage, and whether the needed knowledge appeared in ESLM training input. Without matched evidence, model rankings are practical E2/E3 references.

Official source: [EWoK paper](https://arxiv.org/abs/2405.09605) and the official BabyLM evaluation distribution when terms permit.

### Story Cloze and narrative sets

Story Cloze selects the coherent ending of a four-sentence context. The adapter must execute available event and world-state structures, score both endings, and report selection, parse coverage, state consistency, schema support, and artifact-controlled subsets.

Official source: [Story Cloze paper](https://aclanthology.org/N16-1098/). Dataset license and acquisition procedure must be respected independently of the paper.

### SimpleQA

SimpleQA provides 4,326 short, fact-seeking questions designed around stable, single answers and has published frontier-model results. It tests factual coverage and precise abstention rather than only context reasoning.

The native adapter uses deterministic normalization and declared answer aliases; it does not use the original model-based grader. Therefore locally scored ESLM results are not directly identical to official SimpleQA numbers unless predictions are run through the same grader separately. Questions whose facts were not supplied to ESLM are E2 coverage tests, not matched-data learning tests.

Official sources: [OpenAI SimpleQA description](https://openai.com/index/introducing-simpleqa/) and [simple-evals repository](https://github.com/openai/simple-evals).

### BabyLM evaluation aggregation

The official BabyLM evaluation pipeline aggregates BLiMP, EWoK, Entity Tracking, and other small-corpus evaluations. ESLM may use the same datasets and split conventions but implements Node-native adapters. It must not claim official-pipeline comparability without reproducing preprocessing and scoring.

Official source: [BabyLM evaluation pipeline 2025](https://github.com/babylm/evaluation-pipeline-2025).

### Neutral adapter protocol

The v1 neutral JSONL accepts `kind: qa` with text and semantic values/answers or `kind: preference` with good/bad strings. Real public adapters add dataset-specific parsing, metadata, support, phenomenon, and licensing fields before emitting neutral cases. Dataset hash and adapter version enter the benchmark report.

## Decisions & Questions

### Q1. Why not depend on official Python evaluators?

Response: The project contract is Node-only. We consume official data and reproduce documented metrics in native adapters, then disclose any scoring difference.

### Q2. Which benchmark is most diagnostic first?

Response: bAbI and Entity Tracking for execution and traces, BLiMP for language compilation, CLUTRR for rule composition, and SimpleQA for knowledge coverage. Story Cloze follows after event/narrative modules exist.

### Q3. Are public benchmark test labels allowed during model synthesis?

Response: No for held-out claims. Adapter development may use official examples or training splits; all exposure is recorded and group-held-out tests remain isolated.

### Q4. What does `dataset catalog` guarantee?

Response: It distinguishes registry presence from implementation and execution. Stage fields separately state adapter readiness, training progress, and evaluation progress. A broader benchmark portfolio entry is not an ingestible dataset ID until its source, hash, selected files, license status, and adapter behavior are frozen.

### Question #5: Why retain artificial suites after the corpus shift?

Response: They remain controlled diagnostics for grammar, state execution, relation depth, trace fidelity, and abstention. Their role is measurement rather than persistent world-knowledge acquisition.
