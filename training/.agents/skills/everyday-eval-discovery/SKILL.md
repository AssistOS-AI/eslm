---
name: everyday-eval-discovery
description: Convert an assigned set of everyday-language examples into traceable English ESLM development evaluations, validate their structure and scoring contract, run bounded profiles with and without the QUICK knowledge base, diagnose the earliest failing symbolic processing stage, and propose general node, circuit, KB, or presentation improvements with anti-memorization controls. Use for conversational or mixed-task eval corpora, Basic Eval maintenance, regression-case discovery, eval-result triage, and claims that ESLM has improved on everyday English requests.
---

# Everyday Eval Discovery

## Purpose

Turn an assigned conversational example collection into honest, reproducible development evidence. Preserve every admitted source example, translate or adapt it with an explicit ledger, evaluate the current system before changing it, and improve general symbolic capabilities rather than matching example identifiers or expected strings.

This skill is repository-owned training and audit infrastructure. It may propose product changes, but it grants no runtime, answer, knowledge, proof, benchmark, or promotion authority.

## Required inputs

Obtain these before changing product code:

1. The exact assigned source path and immutable source digest.
2. The current executable checkpoint and selected KB profile.
3. The authoritative DS contracts for the affected parser, planner, reasoning, response, KB, processing-graph, CLI, and evaluation surfaces.
4. The case schema and scoring rules in `references/evaluation-contract.md`.

Treat all admitted examples as development-visible as soon as they influence translation, diagnosis, QUICK contents, code, prompts, thresholds, or graph structure. Never describe them later as unseen test performance.

## Workflow

### 1. Freeze and inventory the source

- Read only the source collection explicitly placed in scope.
- Do not edit or normalize the source in place.
- Record its content digest, file count, case count, category distribution, requested scoring mode, and any malformed or duplicate examples.
- Preserve a stable source locator on every converted case.
- Account for every source case as converted, rejected with a reason, or blocked. A completed conversion has no silent omissions.

### 2. Convert cases into English

- Translate the user request and reference answer, not just labels or metadata.
- Preserve the task, supplied facts, ambiguity, constraints, tone, and required output shape.
- Prefer natural English over word-for-word Romanian phrasing.
- Do not make a task easier by adding facts, disambiguating an intentional ambiguity, or strengthening a reference answer.
- Record whether conversion was direct, template-assisted, or manually reviewed.
- Add a short conversion note when English changes the surface form materially, for example number formatting, grammar correction, or idiom choice.
- Validate the complete corpus with `scripts/validate-eval-corpus.mjs`.

### 3. Define honest pools and profiles

Use explicit pool and profile names:

- `source-development`: all converted assigned examples. They may guide implementation and are not held out.
- `structural-controls`: newly authored renamed, reordered, negative, and metamorphic cases that test the same general operation without copying source entities or answers.
- `quick-assisted`: runs with QUICK plus only the packages declared by the evaluation manifest.
- `real-kb`: runs without QUICK against declared source-derived packages.
- `core-only`: runs without domain KBs when the task can be solved entirely from user-supplied content or generic deterministic operations.

Do not call a split hidden or held out if its contents were visible to the implementation process.

### 4. Capture a baseline before repair

For every profile, record:

- executable and documentation checkpoint digests;
- selected KB identities and package digests;
- work policy, strategy selections, and resource limits;
- raw machine result and rendered answer;
- status, route, task frame, plan, selected method, evidence, unresolved subgoals, and failure code when present;
- deterministic score plus semantic-review state.

Never overwrite the baseline. A current run is a separate artifact linked to the same case manifest.

### 5. Diagnose the earliest failing stage

Classify each failure at the earliest stage that made the requested result impossible:

1. `language-boundary` — likely-English admission or external normalization boundary failed.
2. `parse` — the English request did not become the intended controlled structure.
3. `task-frame` — operation, arguments, constraints, or requested output shape are wrong.
4. `planning` — an eligible bounded method or required dependency was not selected.
5. `grounding` — needed supplied or package evidence was not found, admitted, or focused.
6. `reasoning` — the operation, calculation, comparison, inference, or witness is wrong.
7. `authority` — schema, safety, provenance, proof, or other non-voting gate was missing or unsound.
8. `realization` — machine result is adequate but the English response is misleading, awkward, repetitive, or fails the requested form.
9. `coverage-gap` — the operation is valid but necessary external knowledge is absent from every allowed package.
10. `eval-contract` — the case or reference is ambiguous, inconsistent, unscorable, or requires unsupported external state.

Use `scripts/analyze-eval-results.mjs` to verify accounting and aggregate these diagnoses. Do not assign a later presentation failure when an earlier semantic stage was already wrong.

### 6. Choose the correct repair boundary

- Add stable domain or world knowledge to a provenance-bearing KB only when the answer genuinely depends on that knowledge.
- Improve generic parsing, framing, planning, calculation, supplied-text analysis, verification, or realization only through semantic types and operations that generalize beyond the source examples.
- Add or change a DS029 node, circuit, edge, packet, or gate only when the implementation has a real distinct responsibility and typed handoff. A diagram label alone is not a discovered component.
- Keep research hypotheses inert until reviewed promotion changes DS029, implementation, and tests together.
- Do not branch on benchmark names, case IDs, source row numbers, expected answers, hashes, or copied entity/relation constants.
- Do not promote fluency confidence to fact, proof, or answer authority.

QUICK may contain useful general facts for demonstration and smoke testing. Each addition needs independent provenance, renamed query tests, and a reason it belongs in a small general package. An expected answer copied only to pass a development row is prohibited.

### 7. Require structural controls

Every accepted generic repair must include controls appropriate to the operation:

- renamed entities and predicates;
- changed numbers, order, polarity, and requested output shape;
- negative or contradiction cases;
- irrelevant distractors;
- whitespace, capitalization, and punctuation variants when parsing is involved;
- a case that should remain `UNKNOWN`, `UNPARSED`, rejected, or explicitly partial.

A QUICK fact addition needs at least one paraphrased positive query and one unrelated or unsupported query that must not inherit the answer.

### 8. Judge useful natural-language output

Apply machine correctness before fluency. A useful rendered answer:

- directly answers the requested operation when evidence and authority permit it;
- distinguishes known, derived, defeasible, incomplete, and unknown claims;
- states a genuine knowledge gap plainly instead of padding it with unrelated search matches;
- mentions relevant known evidence in connected prose when it helps;
- avoids protocol names, repeated internal revisions, raw search focus, and inventory noise unless the user requested diagnostics;
- respects requested brevity, structure, tone, and format;
- never makes the status sound stronger than the machine result.

Use semantic review for open-form answers. Record the reviewer, rubric dimensions, explanation, and unresolved disagreement; do not silently replace a deterministic failure with a subjective pass.

### 9. Iterate with bounded batches

Work by failure cluster, not by individual answer string:

1. Select a cluster with its source cases and structural controls.
2. State the general missing capability and falsifiable repair hypothesis.
3. Change the minimum authoritative contract and implementation surface.
4. Run focused unit, metamorphic, and case tests.
5. Rerun the full affected profile and compare against the frozen baseline.
6. Reject or revise changes that introduce semantic, authority, performance, or documentation regressions.
7. Record newly discovered graph responsibilities separately from implemented DS029 catalog changes.

Continue until all source cases are accounted for and remaining failures have explicit causes. “Decent” means the release thresholds declared before the final run are met; it never means hiding invalid rows or weakening correctness.

### 10. Publish evidence and claims

Publish or update:

- the immutable conversion manifest and case file;
- baseline and current result artifacts;
- aggregate and per-category metrics for every profile;
- failure-cluster ledger and remaining coverage gaps;
- accepted structural controls;
- DS, implementation, processing-graph catalog, tests, and HTML documentation affected by accepted changes;
- a clear disclosure that source-development cases influenced the system.

Catalog inclusion is not execution evidence. A run is current only when its recorded checkpoint and package digests match the current code and selected packages.

## Commands

When the host supplies a train-visible `PACKET.json` containing `benchmarkCase` records, write the converted corpus to
`candidate/cases.jsonl`, its accounting manifest to `candidate/manifest.json`, and conversion or validation notes to
`candidate/conversion-report.json`. Preserve the packet's source identities and digests. Do not write product code or
modify the source packet from the isolated workspace; the host decides whether validated candidate data is admitted
to the repository.

Validate a converted corpus:

```bash
node training/.agents/skills/everyday-eval-discovery/scripts/validate-eval-corpus.mjs \
  --cases eval/basic-everyday/cases.jsonl
```

Validate and summarize a result file:

```bash
node training/.agents/skills/everyday-eval-discovery/scripts/analyze-eval-results.mjs \
  --cases eval/basic-everyday/cases.jsonl \
  --results eval/basic-everyday/results/current.jsonl
```

Both scripts are dependency-free Node.js ESM utilities and access only paths passed explicitly on the command line.
