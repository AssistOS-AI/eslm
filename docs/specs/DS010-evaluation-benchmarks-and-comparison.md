---
id: DS010
title: Evaluation, Benchmark Adapters, and Small-LLM Comparison
status: in-progress
owner: evaluation
summary: Defines capability-specific metrics, frozen comparison protocols, public benchmark adapters, language-route accounting, proof evaluation, external prediction exchange, and claim discipline.
---

# DS010 Evaluation, Benchmark Adapters, and Small-LLM Comparison

## Introduction

Evaluation must reveal which layer works and which layer fails. This specification defines final comparison with existing small language models, benchmark-derived measurements, split isolation, source exposure, and the evidence required before any capability claim.

## Core Content

### 1. Evaluation objective

The symbolic system is developed without training a neural baseline. After a stable freeze, one or more existing small pretrained language models are selected for capability comparison.

The comparison is not a claim of equal training data. It compares final functional behavior, resource cost, systematic generalization, updateability, provenance and honest uncertainty.

### 2. Freeze before comparison

The symbolic commit, KB versions, benchmark adapters, CNL version, LLM fallback policy and secret evaluation seeds are frozen before final neural comparisons. Results from the final comparison may not be used to patch the frozen system.

### 3. Model-selection criteria

The selected model must be publicly identifiable, locally runnable where practical, licensed for evaluation, small enough to represent the intended comparison class and used without task-specific fine-tuning. Retrieval and tool use are disabled unless the comparison explicitly defines an additional tool-augmented track.

### 4. Shared inputs and outputs

Both systems receive the same benchmark texts, answer options and task context. Output formats are constrained to objective labels or structured answers whenever possible. Evaluation must not rely on an LLM judge when deterministic validators exist.

The symbolic system is reported in direct-symbolic and normalized modes. The normalized mode uses the configured translation or simplification LLM only under the language and trust boundaries in DS003 and DS009 and declares its use. The comparison model does not receive hidden extra context.

### 5. Metrics

| Metric family | Required measurements |
|---|---|
| Correctness | Overall and capability-level accuracy, exact match and proof validity where applicable. |
| Language autonomy | Direct symbolic rate, fallback rate, normalization rejection and accuracy by route. |
| Generalization | Nonce vocabulary, fresh generated worlds, unseen chain lengths, compositional OOD and contrastive sensitivity. |
| Reliability | Unknown detection, ambiguity handling, contradiction handling, calibration and unsupported-task reporting. |
| Explainability | Provenance coverage, proof availability and trace validity. |
| Efficiency | Model or package size, peak memory, latency, loaded KB bytes and energy proxy where available. |
| Updateability | Cost and locality of adding, correcting or retracting knowledge. |

### 6. Capability matrix

The final report identifies both-correct, symbolic-only-correct, LLM-only-correct and both-wrong subsets. These subsets are analyzed by language form, knowledge dependency, reasoning method, depth and ambiguity.

The purpose is to locate the frontier. A symbolic advantage on strict deduction and systematic composition does not imply an advantage on social plausibility or unrestricted language. An LLM advantage on a natural-language task does not reveal whether the difference comes from parsing, world knowledge or reasoning unless the traces and direct-symbolic measurements are separated.

### 7. Knowledge-editing comparison

A controlled update test adds, retracts or qualifies facts and exceptions. The symbolic runtime recompiles or overlays only affected records. The neural model is evaluated under its available prompting or editing mechanism, reported transparently.

The result measures time, changed storage, affected answers, unaffected-answer stability and provenance.

### 8. Reporting discipline

Claims must be capability-specific. The report states the neural model, quantization, prompt, context window, hardware and run policy. It states the symbolic code size, KB size, loaded-shard size, normalization usage and coding-agent development cost.

The comparison should make clear which results belong to pure symbolic language processing and which used optional translation or simplification.

### Evidence layers and causal measurements

Unit tests verify implementation contracts with small fixtures. Local evaluation measures a fixed cross-section of implemented behavior. Public benchmarks execute externally defined tasks through versioned native Node.js adapters. External comparisons use identical prediction manifests where possible or remain clearly reference-only. These layers cannot substitute for one another.

Every case records input, answer or preference contract, semantic oracle, evidence scope, capability tags, required proof or witness, and language-route policy. Metrics separate semantic parse fidelity, direct-symbolic coverage, fallback usage, retrieval recall, reasoning accuracy conditional on premises, trace validity, realization fidelity, abstention precision and recall, robustness under meaning-preserving changes, sensitivity to meaning-changing changes, composition depth, latency, memory, loaded bytes, package size, update locality, and deterministic replay.

Random example splits are insufficient when templates, stories, vocabularies, or compositions repeat. Grouped splits must isolate source documents or worlds, construction families, entity vocabulary, domain, relation composition, and depth. At least one shadow pool remains unavailable to the learning agent. An inspected holdout becomes development evidence in a new experiment version.

### Benchmark portfolio and CNL traceability

bAbI supplies state, possession, coreference, temporal order, counting, negation, deduction, induction, path, and motivation diagnostics. LogicBench, IIBench, RuleTaker, ProofWriter, PrOntoQA, LogicSkills, FOLIO, and ProverQA exercise increasingly rich logical forms and proof obligations. CLUTRR and StepGame exercise relational composition. SATBench, ZebraLogic, and SLR-Bench exercise constraints, search, arithmetic, recursion, and ordering. Defeasible NLI, CommonsenseQA, SocialIQA, PIQA, and ART or alphaNLI exercise defaults, exceptions, event roles, intentions, affordances, and abduction. BLiMP exercises grammatical contrasts. WinoGrande, ReClor, and LogiQA exercise reference and longer argument structure.

Each adapter preserves official task semantics while emitting the common task and result contracts. Metadata may configure answer domains and validators; it cannot choose a privileged parser, solver, or answer path by benchmark name. Dataset acquisition records source, version, license, digest, extracted-file digests, and adapter version. No benchmark data is silently downloaded or vendored.

The current executable catalog is narrower than the research portfolio. It records BLiMP, bAbI, CLUTRR, Entity Tracking, EWOK, Story Cloze, and SimpleQA after checking task relevance, a primary source, and the applicable license or access gate. bAbI Tasks 2, 3, 15, and 16 have a native reset-era adapter and adapter fixtures, but their public 10k files remain unprepared and unexecuted after the declarative reset. The other six catalog entries remain planned integrations. Gated, non-commercial, or dataset-specific terms remain operative even after a family is accepted into the catalog.

The only post-reset benchmark execution currently published is the five-case `eslm-native-v1` fixture. Its three QA cases and two preference cases verify the shared scorer and runtime on `quick@1.0.0`. The report is non-comparable and must be described as software regression evidence. A catalog entry, external paper, public reference result, cached archive, adapter fixture, and executed public benchmark are six different evidence states and must never be represented by one undifferentiated “available” label.

### Prediction exchange and freeze

Before final comparison, freeze the symbolic commit, KB versions, adapters, CNL version, language fallback policy, prompts or normalization policy, seeds, and resource budgets. A label-free export manifest enables another system to produce predictions. The local deterministic oracle joins predictions by stable record ID and counts omissions as failures.

Final comparison results may not feed patches into the frozen system. Reports identify model name and version, quantization, prompt, context, decoding, tool or retrieval access, hardware, cost, and evidence regime. A published aggregate from a different protocol is contextual evidence rather than a direct tie.

## Decisions & Questions

### Question #1: Why avoid an LLM judge when possible?

Response: Exact labels, semantic values, constraints, and proof witnesses have deterministic validators. Adding a model judge would introduce an unnecessary and difficult-to-reproduce authority.

### Question #2: Can an ingested-source holdout establish independent world knowledge?

Response: No. It can establish compiler fidelity, execution, relation completion, or language transfer under source exposure. Independent factual claims require separately sourced evidence.

### Question #3: What is the preferred direct external comparison?

Response: Give both systems the same visible cases and output schema, preserve raw predictions, and score both with the same deterministic oracle. Protocol differences remain disclosed rather than normalized away.

### Question #4: Why list reviewed benchmark families before their adapters are complete?

Response: The list records the intended capability coverage and the acquisition or license work that remains. Giving each family an explicit evidence state prevents planning visibility from being mistaken for an executed score and makes the next adapter work reviewable.

## Conclusion

Evaluation maps the capability frontier rather than compressing it into one score. Claims remain valid only for frozen inputs, methods, KBs, language routes, proofs, and evidence regimes.
