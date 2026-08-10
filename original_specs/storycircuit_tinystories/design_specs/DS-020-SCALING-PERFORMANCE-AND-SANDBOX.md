# DS-020 — Scaling, Performance, and Sandbox Boundaries

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** DS-014 through DS-019

## Goal

Scale induction to millions of stories while keeping memory bounded and treating coding-agent output and parsed corpus content as untrusted inputs.

## Streaming architecture

Corpus stages operate on shards and append-only summaries. No stage requires all raw stories in memory. Large indexes use sorted runs, SQLite, or an optional analytical backend behind a stable interface. Exact counts can be merged associatively.

## Parallelism

Workers process independent story shards and emit deterministic partial artifacts. A single reducer merges counts in a defined order. Rule and schema proposals may run in parallel, but acceptance and model assembly are serialized through content-addressed manifests.

## Caches

Parser, scoring, and world-state caches are keyed by model hash, input hash, configuration, and code version. Cache entries are immutable. Any heuristic cache key is prohibited for reported runs.

## Performance targets

Profiles specify budgets rather than promises. The implementation reports:

```text
stories per second by stage
bytes per second
parse beam expansion
rules evaluated per event
next-token candidate count
score and generation latency
peak memory
artifact growth per million stories
```

A feature may be disabled automatically only when the resolved configuration and result explicitly state the degradation.

## Sandboxing

Generated circuits run with:

- no network by default;
- restricted filesystem roots;
- process and time limits;
- dependency allowlist;
- deterministic locale and timezone;
- captured stdout/stderr;
- static import and dangerous-call checks;
- test fixtures free of secrets.

The reference repository documents these policies but cannot guarantee operating-system isolation. Full agentic runs should use containers or a dedicated sandbox.

## Denial-of-service defenses

Parsers and planners enforce limits on sentence length, nesting, beam width, entity count, rule firings, plan depth, and repair attempts. Limit hits produce typed diagnostics and do not silently truncate semantic output.

## Acceptance criteria

The workstation profile completes via streaming on its declared memory budget, all untrusted circuit tests have timeouts, and performance regressions above configured thresholds fail continuous integration or require an approved ADR.
