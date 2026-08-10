---
name: synthesize-eslm-model
description: Probe and compile frozen ESLM training packets, public knowledge corpora, or chunked dataset manifests into deterministic modular Node.js `.mjs` knowledge, language, reasoning, and index modules. Use when designing a corpus adapter, approving a large-source architecture gate, creating a candidate model, resuming synthesis, aggregating parallel evidence, profiling generation, or revising modules without exposing hidden evaluation data.
---

# Synthesize ESLM Model

Create executable symbolic knowledge without adding a neural runtime. Treat model synthesis as evidence-preserving program generation: inspect the allowed training packet, induce reusable symbolic structures, emit reviewable ESM modules, and prove that the candidate stays inside its contract.

## Enforce the boundary

Read only the packet named by the assignment and files embedded or explicitly referenced by that packet. Refuse packets whose `split` is not `train`, whose `leakagePolicy` is not `agent-visible`, or whose source digest cannot be reproduced. Never inspect evaluation expectations, benchmark labels, shadow data, or an incumbent model's answers to hidden cases.

For a chunked dataset assignment, read `references/chunked-synthesis.md` before opening any chunk. Run `node scripts/prepare-chunk-ledger.mjs PREPARED_MANIFEST OUTPUT_LEDGER` to verify the immutable chunk inventory. The manifest may identify an agent-hidden test split by count and digest, but never open its path. Resume from the ledger and process only entries whose status is not complete.

When the supervising workflow requests parallel coding agents, also read `references/parallel-synthesis.md`. Use immutable disjoint worker assignments and worker-owned result files. Workers must not edit a shared ledger or candidate. Only the coordinator may reduce results, assign global symbols, generate the candidate, validate it, and hand it off.

For an assignment that creates or revises a selectable domain knowledge base, read `references/knowledge-module-synthesis.md`. Keep every domain in its own source and generated directory, declare dependencies and experimental eligibility, and never merge educational knowledge into a benchmark-trained default model merely because both use the same predicates.

For a knowledge graph, lexical database, event graph, document corpus, source over 50 MB compressed, or prepared source expected to exceed 100,000 records, read `references/large-corpus-synthesis.md` before opening source records. Require a stratified probe, semantic and scope mapping, resource budget, profiling path, streaming adapter, and query-directed shard design. Refuse full synthesis until that gate is approved.

Modify only the assigned candidate directory unless the user explicitly requests promotion. Do not modify `src/`, `tests/`, `docs/`, `original_specs/`, imported `.agents/skills/`, or a promoted `training/model/` while synthesizing a candidate.

Generate Node.js ESM `.mjs` only. Do not generate Python, checkpoints, embeddings, opaque binary indexes, native extensions, network clients, model API calls, `eval`, `Function`, dynamic imports, shell calls, environment-variable reads, or corpus-derived executable source. Corpus strings remain data literals after safe escaping.

## Follow the synthesis circuit

Use the Task Calculus families as an audit vocabulary, not as decorative labels.

1. **OBSERVE** the packet schema, content digest, distributions, recurring names, propositions, events, discourse forms, and conflicts. Record observations in `synthesis-report.json`.
2. **STRUCTURE** spans into entities, aliases, predicates, facts, rules, constructions, narrative schemas, and provenance references. Keep unknown or disputed analyses explicit.
3. **RELATE** aliases to entities, facts to sources, rules to supporting examples, events to participants, and constructions to semantic slots.
4. **REDUCE** duplicates through stable identifiers, string interning, canonical predicates, posting lists, tries, transition tables, and reusable templates. Do not discard exceptions merely to improve compression.
5. **DERIVE** only rules supported by repeated evidence or an explicit source rule. Separate induction confidence from truth status. Never promote a statistical association into a hard rule silently.
6. **CONSTRUCT** the required module graph described in `references/module-contract.md`.
7. **VERIFY** syntax, imports, referential integrity, index consistency, provenance coverage, determinism, and representative training-only probes. Run `node scripts/validate-candidate.mjs CANDIDATE_DIRECTORY` from this skill directory.
8. Do not perform **EFFECT** promotion. Return the candidate path, validation result, coverage report, unresolved cases, and expected operational tradeoffs to the supervising workflow.

Every intermediate structure must enable execution, verification, indexing, caching, provenance, reuse, or safer abstention. Remove structures that merely rename prose.

## Preserve linguistic competence in two layers

Keep general parsing and realization algorithms in the stable runtime. Generate only corpus-conditioned language material: lexemes, spelling variants, morphology exceptions, aliases, construction patterns, semantic slot bindings, discourse cues, response templates, and narrative schemas.

Generate English language material only. Treat non-English records as unsupported input for the current model contract unless a future repository specification explicitly introduces another language with its own grammar and evaluation.

Prefer a small construction inventory with explicit slot types over one template per sentence. Represent tolerable input variants separately from canonical output. Never allow fuzzy correction to merge two known entity names. Attach confidence and counterexamples to approximate constructions.

Use the detailed induction rules in `references/induction-protocol.md`. Preserve lexical, syntactic, semantic, discourse, world-state, and response-realization distinctions; they fail differently and require different evaluations.

## Generate modular executable data

Emit at least:

```text
manifest.mjs    frozen format, id, hashes, evidence regime, module inventory
entities.mjs    stable entity ids, names, kinds, attributes
facts.mjs       canonical triples/values with source provenance
rules.mjs       bounded symbolic inference rules
language.mjs    lexicon variants and construction metadata
indexes.mjs     subject, predicate, object/value, alias, and construction indexes
```

Add focused modules such as `events.mjs`, `narrative.mjs`, `discourse.mjs`, or sharded fact modules only when the corpus justifies them. Keep the manifest as the sole runtime entry point. Use frozen plain values and static relative imports. Use stable ids so a small evidence change produces a local diff.

Domain modularity is semantic, not a file-size trick. Prefer one independently loadable KB per coherent evidence scope. Shared entity IDs and predicate meanings must agree across modules; conflicts require explicit qualification or separate symbols. Report direct facts, rules, standalone closure size, dependencies, and whether cross-module closure creates additional consequences.

For episodic benchmarks, do not compile story-specific training answers into persistent facts. Generate reusable constructions, morphology, rule schemas, state transitions, query contracts, and indexes; compile each evaluation story into a temporary world at runtime. Record this distinction in the synthesis report so a small generated model is not misreported as having memorized thousands of facts.

Optimize for executable compression rather than source-code golf. Dictionary-intern repeated strings, group facts by predicate when it improves locality, precompute posting lists, and represent schemas as transition tables. Preserve traceability from every encoded claim to one or more source records. Report both source bytes and generated bytes; never call the result compression if provenance or exceptions were dropped.

## Handle gaps honestly

Classify unresolved material as one of:

- `UNKNOWN`: the question is representable but evidence is absent;
- `UNSUPPORTED`: no construction, predicate, or executor represents it;
- `AMBIGUOUS`: multiple supported analyses remain;
- `NEEDS_CLARIFICATION`: a user choice is required;
- `CONFLICT`: sources assert incompatible values;
- `LOW_CONFIDENCE_INDUCTION`: a possible rule lacks enough support.

Put unresolved counts and representative source ids in `synthesis-report.json`. Do not create a generic `DO`, `ANSWER`, or catch-all template that hides residual semantics.

## Validate and hand off

Run the self-contained validator. Then run project validation only if the supervising assignment authorizes access to the repository runtime:

```bash
node scripts/validate-candidate.mjs /absolute/path/to/candidate
node src/cli.mjs train validate --model /absolute/path/to/candidate
```

Do not run hidden evaluation or benchmarks. Hand off:

1. exact packet digest and candidate path;
2. generated module inventory and byte counts;
3. entity, fact, rule, construction, and provenance coverage;
4. validation commands and results;
5. ambiguity, conflict, unsupported, and low-confidence lists;
6. assumptions that require human review.
