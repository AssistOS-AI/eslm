---
id: DS011
title: Evaluation Methodology, Metrics, and Leakage Control
status: implemented
owner: evaluation
summary: Separates unit tests, development evaluation, scientific benchmarks, capability metrics, evidence regimes, and contamination controls.
---

# DS011 Evaluation Methodology, Metrics, and Leakage Control

## Core Content

### Four evidence layers

Unit tests verify implementation contracts with tiny fixtures. Local evaluation measures a fixed cross-section of current capabilities and abstention. Public benchmarks measure externally defined tasks through versioned adapters. External comparisons contextualize ESLM against neural systems under explicitly matched or unmatched protocols.

These layers cannot substitute for one another. Passing a fixture is not a benchmark result. A public number copied from a paper is not a controlled comparison. A good aggregate cannot compensate for a broken safety or leakage invariant.

### Evaluation unit

Language competence is evaluated both per prompt and per episode. An episode contains a persistent objective or discourse state plus corrections and follow-ups. Entity tracking and narrative state require episode-level scoring because isolated questions omit the transitions that establish the answer.

Every case declares input, expected semantic value or preference, oracle class, evidence scope, capability tags, and support policy. Fluent string equality is used only when the benchmark defines it. Internal QA primarily compares canonical semantic values.

### Metrics

| Metric | Definition |
| --- | --- |
| Answer accuracy | exact or alias-normalized correctness under the suite's answer contract |
| Contract fidelity | correctness of intent, predicate/frame, arguments, answer slot, constraints, and uncertainty policy |
| Construction coverage | proportion of inputs compiled into a supported query without counting incorrect guesses |
| Retrieval recall | proportion of gold support facts/spans present among candidates |
| Reasoning accuracy | correctness conditional on required premises and constructions being available |
| Trace fidelity | support ids, rule steps, and world transitions match the oracle proof |
| Realization fidelity | semantic answer preserved with required grammar and epistemic qualification |
| Abstention precision/recall | correctness of unsupported, unknown, ambiguous, and clarification outcomes |
| Robustness delta | performance change under meaning-preserving typo, paraphrase, distractor, or order perturbation |
| Composition curve | accuracy by rule depth, event length, or number of relations |
| Efficiency | model bytes, source/model ratio, cold import, construction time, median/p95 latency, memory |
| Replayability | identical semantic result and trace under frozen model/protocol |

Task Calculus research additionally measures graph fidelity, executable coverage, symbolic closure, verification closure, effect safety, and transfer to unseen domains or executor libraries. These metrics apply when a gold circuit exists; they are not fabricated for ordinary QA cases.

### Splits

Random example splits are inadequate when templates, aliases, stories, or rule compositions repeat. Use group splits by source document/story, construction family, entity vocabulary, domain, macro-pattern, and composition depth. At least one shadow split remains unavailable to the synthesis agent.

For program synthesis experiments, the complete agent-visible packet hash is recorded. If a failure case is later added to training, it starts a new experiment version and cannot remain part of the same held-out claim.

### Robustness matrix

Each supported query family should be tested across canonical form, declared paraphrase, misspelling, punctuation/case variation, unseen entity substitution, distractor facts, inverse relation, negation, ambiguity, unknown evidence, and discourse follow-up. Scores are reported as a matrix or tagged breakdown rather than only an average.

Counterfactual tests determine whether the system executes semantics. Entity names and irrelevant details change while the relation graph is preserved; expected answers follow the graph. Memorized surface-answer mappings will fail these transformations.

### Statistical reporting

Report counts and confidence intervals for scientific suites, not only percentages. For paired model predictions, use paired bootstrap or an exact paired test where appropriate. Run-to-run synthesis variance requires multiple independently generated candidates. Runtime is deterministic, so repeated inference without a changed model does not estimate training variance.

Small smoke reports state that their estimates are not statistically meaningful. The committed fixture primarily verifies report machinery.

### Failure accounting

Each failure is assigned to the earliest causal layer supported by trace evidence: normalization, parsing, entity resolution, evidence coverage, retrieval, reasoning, state transition, verification, realization, or oracle/data defect. “Wrong answer” alone is insufficient for training decisions.

Unknown and unsupported are scored according to suite policy. A system must not improve apparent accuracy by abstaining on every difficult item; selective accuracy is plotted against coverage.

### Current public result and module-conditioned runs

The completed Task 15 public evaluation uses the prepared bAbI v1.2 English 10k test file. It contains 1,000 cases. The default promoted artifact produces 1,000 correct semantic values. The corresponding synthesis used 10,000 train cases and promoted zero story-specific facts or answers. Integrity hashes remain in machine-readable manifests and reports instead of explanatory prose.

The completed Task 16 learning cycle used 10,000 official train episodes, with 200 working and 1,000 fresh train cases, and kept the 1,000 official test cases aggregate-only during adaptation. Its accepted checkpoint produced 1,000/1,000 on that shadow aggregate after proof, metamorphic, and regression gates. This result estimates only the dataset's controlled class-property induction convention. It does not establish broad English, unrestricted induction, abduction, world knowledge, negation, or narrative competence.

The internal conversational suite under DS022 is reported separately. Its 1,000/1,000 accepted run verifies generated variations of ten declared question families, including source-exposed WordNet and ATOMIC queries. It is regression and stress evidence, not an additional public benchmark result.

Evaluation and benchmark reports include active model ID, selected KB IDs, and a comparability boolean. A report produced with any educational KB selected is a module-conditioned regression experiment and is not directly comparable with the clean public result. Tests verify that the default does not answer KB-only knowledge and that an explicitly selected KB does.

### Corpus exposure matrix

Every evaluation of source-derived knowledge must map the suite to each loaded corpus profile. A case is `source-exposed` when its answer or source record was loaded, `source-overlapping` when the evaluation derives from or substantially duplicates the corpus, and `source-independent` only when no such relationship is known.

Intrinsic adapter checks and source-held-out edges measure ingestion and execution fidelity, not independent knowledge generalization. A ConceptNet-derived benchmark after ConceptNet ingestion can test query compilation and relation execution but must not be reported as unseen commonsense acquisition.

## Decisions & Questions

### Q1. Why not train a local LLM baseline?

Response: The main comparison uses public benchmarks and externally produced predictions/results. A matched local neural training project would add cost and confound the core code-synthesis experiment; it may be a later independent track.

### Q2. What is the role of the committed evaluation fixture?

Response: It proves that direct facts, English typo tolerance, English paraphrase compilation, rule derivation, and abstention are wired correctly. It is not evidence of broad competence.

### Q3. Can development accuracy be published?

Response: Yes, labeled development and accompanied by iteration count. Hidden-test claims require a frozen candidate and separate evaluator.

### Q4. Is a published 100% result from another bAbI paper a tie with ESLM?

Response: It is a useful reference but not automatically a direct tie. The exact release, test hash, preprocessing, training condition, model selection, normalization, and predictions must match or be replayable through the local oracle. Otherwise the shared percentage is labeled reference-only.

### Question #5: Can a held-out subset of an ingested graph be called independent?

Response: No. It is a valid compiler-fidelity or relation-completion test, but source schema, vocabulary, and neighboring structure are exposed. Independent claims require separately sourced evidence.

### Question #6: How is the 1,000-case conversational score classified?

Response: It is an internal generated regression and stress result. Its WordNet and ATOMIC cases are source-exposed, and its core cases are generated from declared constructions. It verifies executable coverage and robustness for named families but is not added to the public benchmark ledger.
