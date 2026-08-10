# Experimental Roadmap

## Phase 0: Reference kernel and measurement infrastructure

Goal: establish the LM protocol, StoryIR schema, simple parser, state engine, lexical backoff, generation skeleton, and model-agnostic evaluator.

Exit conditions:

```text
all unit tests pass
smoke corpus trains and evaluates end to end
model artifacts are deterministic and hashable
HF baseline adapter produces the same scoring schema
```

## Phase 1: Corpus profiling and open lexicon

Run on 50,000 to 100,000 TinyStories. Build token, word, morpheme, name, entity-type, verb-frame, and sentence-shape statistics. No fixed vocabulary cap is imposed; pruning is controlled by frequency and description length.

Deliverables include corpus report, lexical ontology v0.1, unknown-rate curves, and sentence-pattern coverage.

## Phase 2: Weighted construction grammar

Induce constructions through anti-unification and parse with a weighted chart. Start with high-frequency declarative, motion, possession, property, speech, perception, and transfer patterns. Add escape productions and ensure a total scoring path.

Compare against n-gram on perplexity and TinyStories-derived minimal pairs. The objective is not immediate superiority but measurable grammar contribution and parse coverage.

## Phase 3: Discourse and world state

Add mention chains, pronoun scoring, locations, possession, properties, and event transitions. Create synthetic and manually verified state-tracking tests. Measure gold-IR and predicted-IR performance separately.

Targeted success criterion: strong robustness to longer event chains and distractor entities.

## Phase 4: Temporal, causal, social, and mental state

Learn event schemas and defeasible effects. Add goals, emotions, dialogue acts, beliefs, and causal edges. Integrate bAbI, CLUTRR, EWoK, and entity-tracking adapters.

This phase should reveal which concepts can be learned from TinyStories alone and which require teacher assistance or external ontologies.

## Phase 5: Narrative schemas and generation

Mine event-graph schemas, implement hierarchical planning, and learn realization constructions. Evaluate official prompts, Story Cloze, constrained generation, round-trip fidelity, and human/LLM story ratings.

Do not optimize exclusively for judge scores. State consistency and prompt-contract checks remain hard gates.

## Phase 6: Coding-agent induction

Activate the full failure-driven program-synthesis loop. Agents propose circuits for recurring gaps. Compare model growth, dev improvement, shadow-validation improvement, and description length against manual development.

## Phase 7: Neural compiler

Train a compact text-to-StoryIR compiler or construction router. Keep the symbolic runtime unchanged. Measure IR exact match, graph F1, slot accuracy, uncertainty calibration, and downstream benefit.

## Phase 8: Teacher-assisted distillation

Annotate a bounded subset with a strong LLM, verify a sample manually, and induce executable circuits or train the compiler. Compare S2 with S0 and S1 while accounting for imported knowledge and cost.

## Phase 9: Full comparison and paper

Freeze all designs and run:

```text
n-gram
reference symbolic kernel
full S0
full S1
full S2
official TinyStories-1M
official TinyStories-8M or 33M
same-data GPT baseline where feasible
```

Publish aggregate and per-capability results, ablations, error taxonomy, model-growth curves, and representative traces.

## Hardware profiles

### Smoke

CPU only, under 2 GB RAM, hundreds of stories, minutes.

### Pilot

CPU with 16 GB RAM, optional consumer GPU, 50k–100k stories, hours.

### Workstation

32–64 GB RAM, 12–24 GB GPU for neural baselines, 500k stories, one to several days.

### Full

64 GB or more RAM, fast SSD, optional multi-GPU for baseline training, full 2.1M-story corpus. Symbolic induction should remain sharded and resumable.

The exact commands are defined in `configs/profiles` and `QUICKSTART_EXPERIMENTS.md`.
