# Benchmark Card: StoryCircuit Evaluation Suite v0.1

## Purpose

The suite evaluates a model through a language-model-compatible interface while adding structured narrative diagnostics. It is designed to prevent a symbolic system from being evaluated only on the forms it accepts.

## Included generated families

- raw likelihood;
- grammatical and semantic minimal pairs;
- state tracking;
- explicit-rule reasoning;
- narrative ending selection;
- constrained generation;
- systematic OOD transfer chains;
- trace availability.

The default generated release contains 200 items per family, 1,600 items in total.

## External adapters

Documents specify integration with TinyStories validation/prompts, BabyLM-style evaluation, BLiMP, EWoK, Entity Tracking, bAbI, CLUTRR, and Story Cloze. External data are not bundled.

## Primary risks

Controlled templates may align with hand-written parser constructions. The OOD possession suite tests algorithmic depth but not broad language variation. Generation checks emphasize executable constraints and can be passed by rigid templates. Cross-story ending negatives can be solved by surface compatibility.

## Reporting requirements

Keep item-level predictions, errors, split visibility, generator version, seed, model regime, artifact hashes, confidence intervals, and unsupported counts. Report natural and generated suites separately. Do not combine normalized probability and structured reranking scores.
