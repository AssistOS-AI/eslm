---
name: benchmark-guided-symbolic-learning
description: Adapt an existing executable symbolic language or reasoning system to a new dataset through baseline evaluation, trace-based failure clustering, explicit KB-versus-core decisions, candidate checkpoints, fresh and metamorphic tests, regression gates, and research notes. Use when learning a benchmark, improving an ESLM KB or generic core from repeated failures, resuming a dataset-learning cycle, or deciding whether a score improvement is reusable competence rather than memorization.
---

# Benchmark-Guided Symbolic Learning

Use benchmark failures as experimental observations. Improve reusable symbolic competence, not a lookup table of benchmark answers. Prefer richer dataset KBs and keep the generic core small and stable.

## Establish the experiment boundary

Read `references/evidence-and-classification.md` before inspecting examples or proposing a change. Read `references/cycle-contract.md` before creating a baseline, candidate, checkpoint, evaluation pool, or acceptance report.

Identify the dataset's authorized pools. Inspect working examples and their expected answers only when the dataset contract permits it. Do not inspect shadow examples individually. Do not read hidden test labels, incumbent answers to hidden cases, benchmark IDs as answer keys, or data outside the assignment.

Preserve the previous accepted implementation as the checkpoint. Record its source revision or immutable artifact identity. Do not stack another uncertain candidate on an unaccepted one.

## Run the learning circuit

### 1. Observe the dataset before editing

Sample broadly across relations, labels, lengths, linguistic forms, reasoning depths, ambiguity, negative cases, domains, and known metadata strata. Produce a capability map covering at least:

```text
available information
required inference
answer contract
recurring relations and concepts
linguistic constructions
ambiguity and uncertainty
reasoning depth
external knowledge dependency
```

Run a representative baseline. Preserve aggregate and per-capability metrics, failures, semantic parses, retrieved evidence, rule traces, proofs, unresolved concepts, runtime errors, latency, memory, KB size, and core size. Do not implement fixes until both map and baseline exist.

### 2. Cluster failures by root cause

Group failures before editing. Use stable categories such as lexical normalization, unknown concept, ontology gap, world knowledge, semantic role, coreference, negation, temporal state, causal reasoning, missing or wrong rule, composition, planning, ranking, contradiction, uncertainty, or execution error.

Inspect traces, not only final answers. Treat a correct answer with an invalid proof as a latent failure. Separate parsing, retrieval, inference, ranking, and realization causes. Prioritize clusters that explain many independent failures or block other capabilities.

### 3. Decide KB or core explicitly

Place world or dataset semantics in the current KB: facts, ontology, aliases, lexical mappings, relation definitions, event schemas, semantic frames, defaults, weighted relations, domain rules, and ontology-specific composition.

Modify the core only for a structural mechanism that remains useful after replacing every entity, noun, verb, and relation in the dataset. Require multiple independent examples with one structural cause, evidence that a KB workaround would duplicate or distort semantics, a reusable abstraction, and abstract regression tests.

Record the decision before implementation. Isolated or obscure failures may remain `UNKNOWN` or `UNSUPPORTED` until evidence justifies a general change.

### 4. Implement the smallest reusable candidate

Never encode exact benchmark sentences, question hashes, row IDs, answer indices, or entity-name exceptions whose only purpose is one case. Consolidate repeated observations into concepts, relation families, event frames, lexical classes, schemas, or general rules.

Preserve epistemic status: distinguish entailed, normally true, likely, possible, unknown, and contradicted. Do not promote a social tendency or statistical pattern into a theorem.

For every core change, add tests for the abstract mechanism using changed names and preferably nonce vocabulary. For every KB change, retain provenance to the authorized source observations and explain why it is knowledge rather than execution machinery.

### 5. Challenge the candidate

Run, in order:

1. focused tests for the target failure cluster;
2. nearby structural variants with changed entities, nouns, locations, order, distractors, and wording;
3. metamorphic tests for meaning-preserving and meaning-changing transformations;
4. the current regression pool;
5. all previously supported suites affected by the change;
6. generic core unit tests;
7. fresh unseen samples;
8. the shadow pool only as aggregate metrics when available.

Use active/passive alternation, synonym substitution, entity renaming, clause reordering, pronouns, irrelevant sentences, equivalent temporal expressions, and canonical/natural paraphrases where licensed. Increase depth, ambiguity, distractors, mixed reasoning types, and cross-sentence references once easy cases stabilize.

### 6. Accept or reject against the checkpoint

Accept only when the target capability improves, fresh examples reproduce the improvement, proof validity and abstention remain sound, and no material existing capability regresses. Overall score cannot excuse a serious regression or invalid proof.

Reject or revise a candidate that solves only inspected wording, increases execution failures, turns unknowns into unjustified claims, damages unrelated capabilities, or grows the core without reusable evidence. Revert to the accepted checkpoint before starting a different hypothesis.

### 7. Record the learning result

For each accepted nontrivial change, write a research note containing observed cluster, root cause, change, KB/core rationale, target delta, fresh result, metamorphic result, regressions, proof audit, resource and code growth, remaining uncertainty, and checkpoint identity.

At the end of a substantial dataset integration, report learned knowledge, generic mechanisms, capability gains, remaining difficult clusters, regressions avoided, uncertainty boundaries, and the new accepted checkpoint.

## Maintain four evaluation pools

- **Working:** examples inspected directly for diagnosis.
- **Regression:** stable examples representing acquired capabilities.
- **Fresh:** random or unused examples that test generalization.
- **Shadow:** aggregate-only detection of overfitting; do not inspect individual failures unless the experiment explicitly changes their status.

Rotate finite held-out subsets. Prefer continuously generated random instances when the benchmark supports them. Never move a shadow case into working data without recording the exposure and replacing it with fresh shadow coverage.

## Automate mechanics, reserve reasoning for abstractions

Use `scripts/init-learning-cycle.mjs` to create a versioned cycle record and pool manifest. Use `scripts/compare-learning-cycle.mjs` after evaluators emit normalized baseline and candidate reports. If a benchmark uses another report schema, create a deterministic Node adapter; do not compare metrics manually.

Do not claim completion from development accuracy alone. Require strong unseen performance, stable repeated samples, high metamorphic consistency, valid traces, preserved prior competence, and remaining failures that form identifiable hard classes rather than random breakage.
