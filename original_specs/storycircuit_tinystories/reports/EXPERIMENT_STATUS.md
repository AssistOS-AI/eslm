# Experiment Status at Package Release 0.1

## Completed and executed

- unrestricted UTF-8 byte and open-vocabulary word count models;
- StoryIR schema, parser, immutable world state, QA, planner, realizer, and traces;
- 20 design specifications and a coding-agent induction protocol;
- 1,600-item generated diagnostic suite;
- content-hash split and corpus provenance tooling;
- exact package smoke test: 11 unit/integration tests and 11 end-to-end cases;
- official-validation 5k pilot and count scaling probe;
- controlled-suite evaluation of the pilot artifact;
- pure-PyTorch byte Transformer baseline implementation and five-step neural smoke run.

## Specified but not yet completed

- corpus-induced weighted construction grammar;
- robust incremental parsing and ambiguity packing;
- strong coreference and dialogue scope;
- executable conditional/common-sense rule induction;
- causal, temporal, belief, goal, and emotion models;
- narrative-schema mining at corpus scale;
- normalized semantic contribution to LM probability;
- full TinyStories training run;
- official TinyStories checkpoint comparison;
- manually annotated gold StoryIR set;
- protected external benchmark runs and human generation evaluation.

## Current scientific conclusion

The package demonstrates that a symbolic system can expose an LM-style API and execute certain stateful narrative mechanisms with exact traces. It also demonstrates that count-based likelihood improvements and controlled execution do not by themselves yield natural narrative competence. The central hypothesis remains open and is now formulated as a reproducible program rather than a favorable toy demonstration.
