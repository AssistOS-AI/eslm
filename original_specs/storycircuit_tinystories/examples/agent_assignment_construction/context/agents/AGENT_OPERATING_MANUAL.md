# Agent Operating Manual

## 1. Purpose

This manual defines how coding agents may extend StoryCircuit without turning the experiment into an untraceable collection of heuristics. An agent is treated as a **program-induction worker**. It may propose executable hypotheses, but it may not decide by itself that a hypothesis is scientifically valid.

The unit of contribution is a **circuit package**:

```text
problem statement
+ evidence and failure cluster
+ typed interface
+ executable implementation
+ provenance
+ unit, property, metamorphic, and regression tests
+ complexity delta
+ protected-split result
+ limitations
```

A patch without this package is an implementation draft, not an accepted learned component.

## 2. Read order

Before editing code, read:

1. `PROJECT_CHARTER.md`;
2. `theory/00_RESEARCH_PROGRAM.md`;
3. `theory/02_TASK_AND_CAPABILITY_TAXONOMY.md`;
4. `architecture/SYSTEM_OVERVIEW.md`;
5. `architecture/STORYIR_CONTRACT.md`;
6. `architecture/LM_PROTOCOL.md`;
7. the relevant `design_specs/DS-*.md`;
8. this manual.

When two documents conflict, the hierarchy is: project charter, architecture decision records, interface contracts, design specifications, implementation comments.

## 3. Immutable research boundaries

An agent must not:

- inspect `test` records, labels, expected generations, or hidden evaluator code;
- train, tune, select rules, or write lexical exceptions using `agent_shadow` or `test` data;
- silently change split assignment, normalization, hashing, or data filtering;
- report a structured diagnostic score as a normalized language-model probability;
- discard parse failures from denominators;
- add a rule keyed to story IDs, source indices, exact held-out strings, or benchmark labels;
- use an external LLM at inference in an S0 or S1 run;
- change StoryIR or the LM protocol without an ADR;
- hide manual annotations, teacher calls, or human decisions.

The `agent_shadow` split is accessed only through a gate that returns aggregate metrics and sanitized failure categories. The final test split is opened only for a frozen release candidate.

## 4. Standard development loop

### 4.1 Observe

Run the current suite on `train` diagnostics and `dev`. Capture item-level predictions and traces. Group failures by executable cause rather than lexical topic. Examples of valid groups are unresolved pronoun after intervening subject, ownership transfer applied out of textual order, unnormalized plural construction, or probability mass leak. “Stories about cats” is normally not an executable cause.

### 4.2 Form a minimal hypothesis

State the smallest reusable mechanism that explains the cluster. Specify:

- accepted input types;
- output type;
- preconditions;
- postconditions;
- possible side effects;
- failure values;
- expected scope;
- a plausible counterexample.

Prefer a new parameter, type, or construction to a new primitive. Prefer a reusable construction to a lexical exception. Prefer a semantic rule only when a construction cannot capture the phenomenon.

### 4.3 Implement as a circuit

A circuit must have a stable identifier, semantic version, manifest, source spans or training evidence, deterministic seed behavior where applicable, and explicit dependencies. It must return a typed failure rather than inventing a value when its preconditions are absent.

### 4.4 Verify locally

Required tests depend on the component, but the default gate is:

```text
unit tests
property tests
metamorphic tests
negative/adversarial cases
previous regression suite
new failure-cluster suite
schema validation
probability-mass checks if applicable
reproducibility check
complexity report
```

### 4.5 Evaluate on dev

Record:

- capability metrics;
- parse coverage and abstention;
- likelihood metrics where the component affects scoring;
- runtime and memory;
- number and encoded size of new records;
- improvements and regressions by subcategory;
- whether the gain survives lexical and template deduplication.

### 4.6 Request shadow evaluation

Submit a failure packet and patch manifest to the shadow gate. The agent receives only aggregate deltas, confidence intervals, and coarse failure codes. It must not receive exact shadow texts or labels.

### 4.7 Accept, revise, or reject

A circuit is accepted only when it improves the declared objective under a pre-registered gate, does not violate hard invariants, and offers a favorable benefit relative to its description length. A negative result is retained in the experiment registry.

## 5. Minimum Description Length gate

Every patch reports the following complexity terms:

```text
source_bytes
serialized_artifact_bytes
numeric_parameter_count
symbolic_record_count
new_primitive_count
new_construction_count
new_rule_count
external_teacher_tokens
training_cpu_or_gpu_seconds
```

The default selection objective is conceptual rather than fixed across all workstreams:

```text
utility = task_gain
        + generalization_gain
        + verification_gain
        - complexity_penalty
        - latency_penalty
        - regression_penalty
        - opacity_penalty
```

Do not optimize the scalar blindly. Report its components so another researcher can change the scientific trade-off.

## 6. Component-specific evidence

### Parser or grammar

Provide construction examples, non-examples, slot typing, ambiguity behavior, coverage delta, exact-span provenance, and tests under paraphrase and lexical substitution.

### Reference resolver

Provide antecedent candidates, scoring features or rules, abstention behavior, entity-consistency metrics, and adversarial cases with gender, number, recency, quotation scope, and distractors.

### World model or inference rule

Provide preconditions, state transition, frame assumptions, persistence behavior, conflict policy, proof trace, and counterexamples.

### Probability expert

Provide the exact sample space, normalization proof or numerical mass test, unit of probability, tokenization, smoothing, and behavior on arbitrary UTF-8 input. An unnormalized reranker must be labeled as such.

### Planner or realizer

Provide the plan contract, constraints, deterministic replay, parse-back verification, diversity statistics, repetition measurements, and failure recovery.

## 7. Reproducibility

All commands must run from repository root. Every experiment creates a run manifest containing:

- git or source-tree hash;
- model and data hashes;
- configuration snapshot;
- random seeds;
- platform and dependency versions;
- start/end time;
- resource measurements;
- regime S0/S1/S2;
- teacher provenance where applicable.

Never overwrite an existing run directory. Use immutable run IDs.

## 8. Definition of done

A work item is done only when:

1. its contract and acceptance tests are explicit;
2. the implementation is runnable from a clean environment;
3. existing tests pass;
4. the new behavior has positive and negative tests;
5. item-level outputs and aggregate metrics are saved;
6. complexity and resource deltas are reported;
7. limitations and unsupported cases are documented;
8. protected-split policy is respected;
9. an independent agent or human can reproduce the result from the handoff.
