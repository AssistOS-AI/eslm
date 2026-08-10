---
id: DS014
title: Provenance, Safety, Conflict, and Abstention
status: in-progress
owner: assurance
summary: Defines source traces, epistemic status, generated-code defenses, effect boundaries, ambiguity, conflicts, and calibrated refusal behavior.
---

# DS014 Provenance, Safety, Conflict, and Abstention

## Core Content

### Provenance model

Direct facts cite one or more source record ids. Derived facts cite their rule and support fact ids; their flattened source list is convenient but does not replace the proof graph. Normalization cites correction operations, entity resolution cites alias or discourse source, and realization cites the verified semantic value.

Source ids are stable within a frozen packet and resolvable to document/span metadata when raw documents are used. Hashes detect changed sources. Provenance describes origin and transformation; it does not prove truth or source quality.

For source-derived corpora, provenance also records source release or entity revision, upstream dataset, license, extraction adapter, profile and shard, and scope transformation. A proof across modules retains each source lineage and must not count an upstream duplicate as independent support.

### Epistemic states

The knowledge layer distinguishes asserted, derived, contradicted, uncertain, hypothetical, and unsupported content. V1 implements asserted and derived facts plus absence-based `UNKNOWN`; later formats add explicit conflicts and confidence.

`UNKNOWN` means a supported query lacks sufficient evidence. `UNSUPPORTED` means no safe semantic compilation or executor exists. `AMBIGUOUS` means multiple supported analyses remain. `NEEDS_CLARIFICATION` means a specific user choice could resolve the ambiguity. `CONFLICT` means accepted evidence supports incompatible values under the same scope.

These states are not interchangeable. In particular, unknown is not false, and unsupported is not a factual answer.

### Generated-code threats

Corpus text may attempt source injection, path traversal, enormous literals, denial of service, or benchmark leakage. The coding agent may accidentally generate ambient capability imports, unbounded recursion, hidden answer tables, or inconsistent indexes.

Defenses include packet validation and size budgets; strict output directory; safe literal generation; static import allowlist; forbidden capability scan; schema and referential validation; rule-depth and module-size limits; candidate isolation; diff review; counterfactual tests; and explicit promotion.

Static scanning is bypassable in theory and is not described as a sandbox. Stronger deployments run candidate validation and import in a restricted process/container with read-only inputs and no network.

### Runtime threats

Runtime input can be adversarial text but has no direct effect authority. It cannot choose imports, execute expressions, mutate the model, or trigger network. Extremely long inputs require future size limits. Regexes must avoid catastrophic backtracking and inference has round/beam budgets.

The interactive CLI treats supported user assertions as session-scoped claims, never as promoted facts. The overlay is isolated from generated model modules, returned explicitly in context, labeled with `session:*` fact and source identifiers, and discarded with the session. Query answers expose whether their evidence came from the promoted model, the session, or a derivation using either source.

Future contextual overlays carry world, branch, valid time, spatial frame, conceptual domain, perspective, modality, and polarity. A fictional, believed, simulated, or hypothetical claim cannot satisfy an actual-world premise unless a declared bridge permits it. Contradiction inside a branch does not mutate or invalidate the base world.

### Effect safety

Task Calculus EFFECT nodes declare target, authorization, reversibility, receipt, and verifier. Current inference has no external effect. Training writes explicitly selected packet/candidate paths. Report publishing writes fixed documentation paths only under `--publish`. Promotion remains manual and reviewed.

### Abstention evaluation

Suites include representable unknowns, unsupported constructions, ambiguous aliases, conflicting sources, near-miss spellings, and answerable controls. Measure precision, recall, coverage, selective accuracy, and risk/coverage curves.

A system that always abstains is safe but useless; a system that always guesses appears broad but violates evidence discipline. Threshold selection uses development data and is frozen before hidden evaluation.

### User-facing communication

Responses state evidence limits plainly. They do not anthropomorphize uncertainty as memory failure. Structured output gives the exact status and diagnostic. Explanations mention rules and supports rather than manufacturing narrative justification.

## Decisions & Questions

### Q1. Should low-confidence answers be returned with a disclaimer?

Response: Only when the query contract permits ranked hypotheses. Factual mode defaults to abstention below threshold and returns candidates in structured diagnostics.

### Q2. Is source provenance enough for citation correctness?

Response: No. Evaluators must check that the cited span actually entails or supports the encoded claim and that derivation steps preserve scope.

### Q3. Can an agent promote its own model after all tests pass?

Response: No in v0.1. Passing visible tests cannot detect hidden leakage or all malicious behavior; explicit review remains required.

### Question #4: Is provenance sufficient to merge identical claims across worlds or times?

Response: No. Scope is part of claim identity. Provenance explains origin, while world, valid time, perspective, modality, and domain determine whether two claims are compatible, conflicting, or unrelated.
