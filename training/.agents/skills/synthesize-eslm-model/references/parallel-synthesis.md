# Parallel coding-agent synthesis

## Coordinator and workers

Parallelism is optional. A single coding agent may process the ledger sequentially. When parallelism is requested, one coordinator owns partitioning and reduction while workers own disjoint immutable assignments. Workers never share a candidate directory, ledger file, result file, or mutable aggregate.

Run:

```text
node scripts/prepare-parallel-assignments.mjs LEDGER OUTPUT_DIRECTORY WORKER_COUNT
```

The command partitions every non-complete chunk deterministically by round robin and writes one immutable assignment per worker plus `plan.json`. The coordinator may fork one coding agent per assignment or invoke Codex separately. Every worker receives only its assignment, this skill, and the referenced train chunks. It must not receive the prepared manifest because that manifest names the hidden split.

## Worker contract

A worker verifies each assigned chunk SHA-256, analyzes only those chunks, and writes exactly one `WORKER_ID.json` result in a worker-owned results directory. It must not edit the ledger, another worker result, a shared candidate, the stable runtime, or the promoted model.

The result shape is:

```json
{
  "format": "eslm-parallel-worker-result-v1",
  "workerId": "worker-001",
  "assignmentDigest": "...",
  "chunks": [
    {
      "path": "training/input/.../chunk-0001.jsonl",
      "sha256": "...",
      "observations": [],
      "signatures": [],
      "emittedSymbols": [],
      "unresolved": []
    }
  ]
}
```

Observations retain source record IDs. Signatures use stable semantic keys and include support counts, examples, qualifications, and counterexamples. `emittedSymbols` are proposals only; a worker cannot reserve a global ID by writing it first.

## Deterministic reduction

Run:

```text
node scripts/reduce-parallel-results.mjs PLAN RESULTS_DIRECTORY OUTPUT_JSON
```

The reducer rejects a missing or duplicate worker, an assignment digest mismatch, a missing, extra, duplicated, or hash-mismatched chunk, and strings that appear to reference a hidden test file. It sorts all aggregate entries by chunk path and stable JSON value before writing one reduction input.

Only the coordinator may use the reduced evidence to decide global stable IDs, merge signatures across chunks, inspect counterexamples, generate candidate modules, and run validation. No first-writer-wins behavior is permitted. The reducer does not promote a candidate or run evaluation.

## Failure and resume

A failed worker leaves its result absent or invalid. The coordinator reruns only that immutable assignment. Existing valid results are read-only. Changing a chunk inventory, worker count, or assignment creates a new plan digest and therefore invalidates results from the previous plan. Time-based leases are intentionally avoided because static disjoint assignments make ownership reproducible without clocks or shared locks.
