# DS-014 — Training Orchestration and Model Artifacts

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** DS-002 through DS-013

## Goal

Provide a resumable, deterministic, inspectable pipeline for inducing an ESLM from TinyStories and for reconstructing every reported result.

## Stages

```text
00 acquire and hash corpus
01 split and filter stories
02 lexical and morphology statistics
03 parse bootstrapping
04 discourse and entity induction
05 event and state extraction
06 construction induction
07 rule and schema induction
08 probability fitting
09 circuit synthesis and validation
10 model assembly
11 evaluation
12 report generation
```

Each stage reads immutable artifacts and writes a new content-addressed directory. Stages never modify earlier outputs in place.

## Manifest

Every model artifact includes:

```text
model identifier and semantic version
research regime S0/S1/S2
source commit
configuration hash
corpus file hashes and row/story counts
split identifiers
stage artifact hashes
random seeds
software and hardware environment
numeric parameters and symbolic structure counts
known limitations
```

## Resumption

A stage is skipped only when its declared inputs, configuration, code version, and output checksums match. Partial output is moved to a quarantine directory. Long-running induction writes checkpoints in append-only form.

## Data separation

The artifact store distinguishes:

```text
train-visible
development-visible
agent-shadow-validation
frozen-test
external-benchmark
human-annotation
teacher-generated
```

Coding agents receive only the partitions allowed by DS-015. A model manifest records every partition whose information may have influenced model code or structures.

## Profiles

The repository supplies:

- `smoke`: seconds, synthetic and tiny local corpus;
- `pilot`: thousands of stories, CPU-friendly;
- `workstation_8gb`: bounded memory, streaming induction;
- `workstation_24gb`: larger caches and beams;
- `full`: complete corpus and distributed-friendly shards.

Profiles change scale, not semantics or evaluation definitions.

## Acceptance criteria

Two clean runs with the same inputs produce byte-identical deterministic artifacts or document the exact non-deterministic fields. A deleted intermediate stage can be reconstructed. Every result JSON resolves to a model manifest and data split manifest.
