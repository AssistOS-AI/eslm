# DS-019 — Reproducibility and Experiment Tracking

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** DS-014, DS-017

## Goal

Make experimental claims auditable without depending on a proprietary tracking service.

## Run directory

Each run writes:

```text
run_manifest.json
resolved_config.json
environment.json
stdout.log
metrics.json
predictions.jsonl
errors.jsonl
resource_samples.jsonl
artifacts/
```

The run identifier is derived from timestamp plus a short content hash; the content hash is the stable identity.

## Environment capture

Capture operating system, Python, package versions, CPU, memory, GPU if present, git commit and dirty state, relevant environment variables after secret redaction, thread settings, and random seeds.

## Resource measurement

At minimum record wall time, process CPU time, peak resident memory, input/output bytes, and artifact bytes. GPU runs additionally record device, peak allocated memory, and available energy measurements. Coding-agent and teacher-model use is recorded as calls, tokens, model version, and monetary cost when known.

## Comparison

`compare_runs.py` performs schema checks, verifies compatible suite/data hashes, computes paired deltas and bootstrap intervals, and flags incomparable metrics. It never averages metrics with different denominators or tokenizers.

## Publication bundle

A publication bundle contains resolved manifests, source commit, design-spec versions, aggregate and item-level results where licensing permits, selected traces, and a generated limitations report. Raw training data is referenced by hash and acquisition script.

## Acceptance criteria

The smoke run produces a complete run directory. Re-running comparison on the same pair is deterministic. A manifest validator rejects missing hashes, unknown regimes, or results detached from a model artifact.
