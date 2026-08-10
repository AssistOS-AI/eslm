# Experimental Matrix

## 1. Model systems

| ID | System | Purpose |
|---|---|---|
| B0 | byte unigram | total-support lower bound |
| B1 | byte/word n-gram | strong count baseline and lexical control |
| R0 | reference StoryCircuit | executable interface and diagnostic baseline |
| S0 | induced pure-symbolic StoryCircuit | primary symbolic system |
| S1 | StoryCircuit with small learned compiler/router | compilation ablation |
| S2 | teacher-assisted symbolic induction | upper-resource induction regime |
| N1 | TinyStories-1M | official small neural comparator |
| N2 | larger official TinyStories checkpoint | scaling comparator |
| NM | matched-data GPT-style baseline | controlled architecture/data comparator |

## 2. Primary capability blocks

| Block | Metrics | Required splits |
|---|---|---|
| raw language modeling | BPB, NLL/token, continuation accuracy | dev, shadow, test |
| grammar | minimal-pair accuracy by construction | dev, external, test |
| compiler | span/entity/event/argument/graph fidelity | annotated dev/test |
| state tracking | exact QA, state graph accuracy | IID, lexical OOD, structural OOD |
| reasoning | accuracy by depth/distractors/rule composition | parameterized OOD |
| narrative understanding | ending selection, event order, causal links | local and external |
| generation | constraints, parse-back, consistency, diversity, likelihood | multi-seed |
| interpretability | trace coverage, proof validity, counterexample quality | all structured tasks |
| efficiency | artifact bytes, records, training/inference resources | all models |

## 3. Scaling axes

Run learning curves at approximately:

```text
1k, 5k, 25k, 100k, 500k, full stories
```

Run symbolic complexity curves for:

```text
construction count
rule count
lexicon size
n-gram order
parser beam/chart budget
schema depth
planner beam
cache budget
```

Do not compare only the best symbolic run to a fixed neural run. Plot performance against data, artifact bytes, training compute, and inference compute.

## 4. Systematic generalization axes

- inference depth: 1–12;
- distractor facts/events: 0–20;
- persistent entities: 2–20;
- ownership/location transfer length: 1–10;
- coreference gap: 0–12 mentions;
- nested quotation/belief depth: 0–4;
- narrative schema composition: familiar primitives in unseen order;
- vocabulary: frequent, rare, and unseen compositional nouns/names;
- sentence paraphrase: held-out constructions and lexical substitutions.

Training ranges and test-only ranges must be registered before model development.

## 5. Mandatory ablations

For StoryCircuit:

```text
lexical model only
+ construction grammar
+ discourse/coreference
+ world state
+ inference rules
+ narrative schemas
+ semantic probability expert
+ planner/realizer
without provenance checks
without parse-back verification
without MDL pruning
```

For S1/S2:

```text
router/compiler removed
teacher labels removed
teacher-generated circuits removed
same teacher budget used for direct prompting baseline
```

## 6. Statistical protocol

Use item-level paired comparisons where models see identical cases. Report bootstrap confidence intervals and McNemar or paired permutation tests for accuracy-like metrics. Use multiple seeds for training and generation; a single deterministic symbolic induction run still requires sensitivity analyses for order, pruning thresholds, and corpus sample.

Predeclare one primary metric per capability. Avoid a single composite leaderboard score in the main conclusion; the research question is about the shape of capabilities and trade-offs.

## 7. Stop and failure conditions

Stop a workstream and record a negative result when:

- gains disappear after near-duplicate/template controls;
- complexity grows approximately one rule per example;
- normalized probability cannot be established;
- parser coverage rises only by accepting semantically wrong analyses;
- protected-shadow performance repeatedly diverges from dev;
- symbolic inference is correct only on generated templates, not natural stories;
- generation constraints are satisfied by degenerate repetition;
- cost exceeds the comparator without compensating capability.
