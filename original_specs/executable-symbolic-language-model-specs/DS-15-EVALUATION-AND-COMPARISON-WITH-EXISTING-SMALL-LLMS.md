# DS-15 — Evaluation and Comparison with Existing Small LLMs

## 1. Evaluation objective

The symbolic system is developed without training a neural baseline. After a stable freeze, one or more existing small pretrained language models are selected for capability comparison.

The comparison is not a claim of equal training data. It compares final functional behavior, resource cost, systematic generalization, updateability, provenance and honest uncertainty.

## 2. Freeze before comparison

The symbolic commit, KB versions, benchmark adapters, CNL version, LLM fallback policy and secret evaluation seeds are frozen before final neural comparisons. Results from the final comparison may not be used to patch the frozen system.

## 3. Model-selection criteria

The selected model must be publicly identifiable, locally runnable where practical, licensed for evaluation, small enough to represent the intended comparison class and used without task-specific fine-tuning. Retrieval and tool use are disabled unless the comparison explicitly defines an additional tool-augmented track.

## 4. Shared inputs and outputs

Both systems receive the same benchmark texts, answer options and task context. Output formats are constrained to objective labels or structured answers whenever possible. Evaluation must not rely on an LLM judge when deterministic validators exist.

The symbolic system is reported in direct-symbolic and normalized modes. The normalized mode uses the configured translation or simplification LLM only under DS-10 and declares its use. The comparison model does not receive hidden extra context.

## 5. Metrics

| Metric family | Required measurements |
|---|---|
| Correctness | Overall and capability-level accuracy, exact match and proof validity where applicable. |
| Language autonomy | Direct symbolic rate, fallback rate, normalization rejection and accuracy by route. |
| Generalization | Nonce vocabulary, fresh generated worlds, unseen chain lengths, compositional OOD and contrastive sensitivity. |
| Reliability | Unknown detection, ambiguity handling, contradiction handling, calibration and unsupported-task reporting. |
| Explainability | Provenance coverage, proof availability and trace validity. |
| Efficiency | Model or package size, peak memory, latency, loaded KB bytes and energy proxy where available. |
| Updateability | Cost and locality of adding, correcting or retracting knowledge. |

## 6. Capability matrix

The final report identifies both-correct, symbolic-only-correct, LLM-only-correct and both-wrong subsets. These subsets are analyzed by language form, knowledge dependency, reasoning method, depth and ambiguity.

The purpose is to locate the frontier. A symbolic advantage on strict deduction and systematic composition does not imply an advantage on social plausibility or unrestricted language. An LLM advantage on a natural-language task does not reveal whether the difference comes from parsing, world knowledge or reasoning unless the traces and direct-symbolic measurements are separated.

## 7. Knowledge-editing comparison

A controlled update test adds, retracts or qualifies facts and exceptions. The symbolic runtime recompiles or overlays only affected records. The neural model is evaluated under its available prompting or editing mechanism, reported transparently.

The result measures time, changed storage, affected answers, unaffected-answer stability and provenance.

## 8. Reporting discipline

Claims must be capability-specific. The report states the neural model, quantization, prompt, context window, hardware and run policy. It states the symbolic code size, KB size, loaded-shard size, normalization usage and coding-agent development cost.

The comparison should make clear which results belong to pure symbolic language processing and which used optional translation or simplification.
