# Research and Implementation Phases

## P0 — Integrity and reference kernel

Exit criteria: clean installation, deterministic smoke run, schema validation, protected split creation, item-level evaluation outputs, artifact hashes, and a causal-LM-compatible reference API. The score may be weak; the pipeline may not be ambiguous.

## P1 — Corpus characterization and lexical floor

Induce open vocabulary statistics, morphology candidates, construction fragments, sentence types, entity/name distributions, event surface forms, and byte/word likelihood baselines. Implement Kneser–Ney or another strong count baseline. Establish BPB and continuation rankings on unfiltered validation text.

Exit criteria: reproducible corpus report, exact likelihood baseline, no vocabulary cap, full-support behavior, and lexical OOD analysis.

## P2 — Construction grammar and incremental compiler

Replace hand-seeded parsing coverage with induced weighted constructions. Implement ambiguity packs, typed slots, anti-unification, MDL pruning, incremental chart parsing, opaque fallback, and calibrated abstention.

Exit criteria: measured text-to-StoryIR fidelity on a manually annotated set, coverage curves, construction ablations, and failure taxonomy.

## P3 — Discourse, coreference, and world state

Implement persistent entities, mention linking, quotation scope, location/ownership/property transitions, event ordering, persistence, conflicts, and proof traces.

Exit criteria: entity tracking and state QA on in-domain and systematic OOD suites, with exact error localization.

## P4 — Temporal, causal, social, and mental reasoning

Induce and execute rules for before/after, because/therefore, goals, attempts, beliefs, emotions, help/harm, and commonsense consequences. Separate explicit text, licensed inference, and uncertain hypotheses.

Exit criteria: depth and distractor curves, bAbI/EWoK-style adapters, rule provenance, and abstention calibration.

## P5 — Narrative schemas and generation

Mine event motifs, induce hierarchical schemas, plan stories under constraints, realize plans through weighted constructions, and verify by parse-back and simulation.

Exit criteria: continuation and ending selection, controllable generation, contradiction/repetition metrics, diversity, and human evaluation protocol.

## P6 — Normalized semantic language model

Integrate lexical, construction, discourse, and world experts into a mathematically valid probability model. Implement exact or bounded normalization tests and compare to reranking-only variants.

Exit criteria: finite probability for arbitrary UTF-8, mass conservation on finite projections, BPB/perplexity, and no conflation of probability with diagnostic score.

## P7 — Neural compiler/router and teacher-assisted induction

Train small constrained models for construction selection, slot filling, or proposal ranking. Run S1 and S2 separately from S0.

Exit criteria: compiler fidelity, symbolic execution retained, teacher cost reported, and ablations showing exactly what the learned component contributes.

## P8 — Full comparison and publication

Freeze interfaces, run baselines, open final test once, perform ablations and scaling laws, audit leakage, and write the report.

Exit criteria: reproducible release, complete negative results, model cards, data cards, and an archive with checksums.
