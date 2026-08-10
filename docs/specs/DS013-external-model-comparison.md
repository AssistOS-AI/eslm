---
id: DS013
title: External LLM Comparison Without Local Neural Training
status: implemented
owner: benchmarks
summary: Defines prediction exchange, result manifests, protocol hashes, evidence regimes, published references, and fair interpretation without training a control model.
---

# DS013 External LLM Comparison Without Local Neural Training

## Core Content

### Objective

The project compares ESLM with existing LLMs without spending the core experiment on local neural training. External systems can be evaluated by their official public numbers, by user-supplied predictions, or by a separate API/tool runner outside ESLM. The deployed ESLM CLI never contains model credentials or API code.

### Preferred comparison modes

Mode C0 uses identical benchmark cases and context, exports inputs to each system, imports raw predictions, and scores all systems with the same deterministic local oracle. This is the strongest direct comparison for exact QA, relation labels, and state tracking.

Mode C1 uses identical dataset and official task protocol but each system's native scoring path, such as likelihood preference for a neural LM and structured preference for ESLM. It is comparable at the decision-accuracy level while mechanism and calibration differ.

Mode C2 imports official or published aggregate results. It provides context but remains reference-only unless dataset hash, split, prompt, examples, grader, tools, and evidence regime match.

### Prediction exchange

An export manifest contains benchmark id/version, dataset hash, protocol, record ids, visible context, question, requested output schema, and prohibited evidence. An external runner returns model identity/version/date, exact prompt template, decoding options, tools, predictions by record id, latency/cost where available, and disclosure of pretraining or retrieval.

`benchmark export` creates a label-free JSON manifest. Preference options are deterministically shuffled by record id so field names do not expose the gold side. `benchmark score-predictions` joins JSONL predictions by record id, treats omissions as failures, computes the same semantic metrics, and writes a comparison report. Prediction files are retained for audit when licensing permits.

### Result manifests

`benchmark import-results` requires model, protocol, dataset SHA-256, metrics, and evidence regime. It marks a non-native protocol `reference-only`. A future importer verifies that native protocol and dataset hash match an ESLM report before assigning `directly-comparable`.

Published results record source URL, table/section, publication date, and known protocol differences. Never copy a leaderboard number without version and source.

### Same-data comparisons

When the research question is representation efficiency, both systems must receive the same training evidence. That may require a third party or existing published small-data model trained on the corpus. ESLM training cost includes coding-agent compute; the neural baseline includes optimization compute and architecture priors. Pretraining creates a distinct E2 regime.

For in-context micro-world tasks, matching visible context is often sufficient because the answer should follow from supplied facts and rules. Nevertheless a pretrained LLM contributes language and reasoning priors; this is disclosed rather than treated as equal total training data.

### Dimensions beyond accuracy

Compare answer accuracy, coverage, abstention, trace fidelity, deterministic replay, model size, cold/warm latency, peak memory, training/synthesis cost, inference cost, energy proxy where measurable, update locality, and effect safety. ESLM provenance has a structural advantage only if it is correct; evaluate trace oracles rather than awarding points for producing a trace.

LLM explanations are not equivalent to proof traces. They may be scored for cited support separately, but hidden chain-of-thought is neither required nor requested.

### Interpretation template

A result statement names suite/version/hash, evidence regime, adapter/grader, coverage, accuracy with uncertainty, model identity/date, and protocol differences. It then distinguishes observation from inference. Example: “ESLM achieved X on closed-context bAbI task Y with Z parse coverage; model A's published number uses a different release and is included only as reference.”

### No control-model requirement

The absence of a locally trained neural baseline does not block the experiment. Public datasets already contain human/model baselines, and raw prediction exchange supports current models. A local neural track is justified only when a specific matched-data hypothesis cannot be answered otherwise.

## Decisions & Questions

### Q1. Which external LLM should be the default?

Response: None is hard-coded. Model availability and versions change. Comparison manifests identify any current model, and public official results provide durable references.

### Q2. Can ESLM be declared better if it is faster but less accurate?

Response: Only on the named latency dimension. Multi-objective results show tradeoffs rather than collapsing them into an unsupported global winner.

### Q3. May an external LLM use tools or retrieval?

Response: Yes in a separately labeled regime. Direct comparison requires identical allowed evidence and tools or explicit disclosure of the asymmetry.
