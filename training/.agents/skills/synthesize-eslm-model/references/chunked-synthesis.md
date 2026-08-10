# Chunked synthesis and resume protocol

## Boundary

Accept only a prepared manifest whose format is `eslm-prepared-dataset-v1`, whose train split contains immutable chunk paths and SHA-256 digests, and whose leakage policy marks train as `agent-visible` and test as `agent-hidden`. The test path may exist in the manifest for the supervising evaluator, but the synthesis agent must not open it, sample it, count labels, or use its errors to revise the candidate.

## Ledger

Create a ledger with `scripts/prepare-chunk-ledger.mjs`. The script verifies every train chunk digest before work starts. Preserve one entry per chunk with `pending`, `in-progress`, `complete`, or `failed` status, plus observations, emitted symbol ids, unresolved source ids, and processing duration. On resume, verify all digests again and continue from the first non-complete entry. Never infer completion from an output file's existence alone.

## Per-chunk analysis

Process one chunk at a time. Extract corpus-conditioned lexemes, morphology, constructions, semantic frames, rule candidates, exceptions, and provenance. Update aggregate support counters by stable semantic signature. Keep representative source ids and counterexamples; do not retain every repeated sentence merely because it was observed again.

Do not finalize an induced rule from one chunk. A chunk boundary is an operational unit, not an evidence boundary. Promote a reusable pattern only after aggregating its support, conflicts, and coverage across all completed chunks. Explicit source rules may be encoded immediately but still require duplicate and contradiction checks.

## Episodic data

Treat a story or world in a benchmark as an isolated episode. Generate parsers, rule schemas, transition operators, morphology tables, and query plans from the train split. Do not place episode-specific answers or entity states in the promoted persistent model. At runtime, compile the supplied episode into a temporary world and discard it after the case unless the caller explicitly carries its context.

## Sharding

Shard generated data by semantic locality: predicate family, construction family, ontology region, event type, or source partition. Keep stable dictionaries and a top-level manifest so only relevant shards need loading. Each shard records its source chunk digests, symbol counts, and validation hash. Rebuilding one shard must not renumber unrelated symbols.

## Completion report

Report the dataset id, train split digest, total chunks, completed chunks, source records, generated modules and bytes, promoted constructions and rules, rejected inductions, unresolved cases, and validation commands. Report evaluation as `not run by synthesis agent`; only the supervising workflow may attach hidden-test results after candidate handoff.
