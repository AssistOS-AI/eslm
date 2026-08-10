---
id: DS022
title: Conversational Regression and Long-Input Stress Benchmark
status: implemented
owner: evaluation
summary: Defines generated conversational gates for session learning, tolerant entity references, symbolic inference, public-KB adapters, uncertainty, unsupported requests, runtime profiling, and reproducible HTML reporting.
---

# DS022 Conversational Regression and Long-Input Stress Benchmark

## Core Content

### Why this benchmark exists

The public bAbI evaluations isolate narrow reasoning capabilities, while source-exposed WordNet and ATOMIC tests validate their compilers and providers. Neither answers a practical question a user asks after opening `eslm`: do ordinary variations of supported questions still work when names, distractors, polite wording, punctuation, context length, and loaded KBs change?

The conversational benchmark is an internal generated regression instrument for that boundary. It is not a public dataset, not an unrestricted English evaluation, and not a comparison with an LLM. Its value is operational: every example displayed by `/examples` is executable, many nearby variants are exercised automatically, and the latest long run is published as a compact report rather than an unverified capability list.

### Two complementary suites

`conversationSmokeCases()` generates the short suite used by `tests/conversation-smoke.test.mjs` and `/examples`. It currently contains 134 unique cases across session classification, entity description, location, ownership, configured induction, proper-name tolerance, conversation-level identity questions, QUICK deductions, WordNet retrieval, ATOMIC retrieval, and honest limits. QUICK-dependent examples are labeled `works with quick`; they never imply that fixture knowledge is loaded by default.

`longConversationStressCases(1000)` generates a separate fixed-size suite. Five hundred cases contain several facts and distractors before a membership, description, location, ownership, or induced-property question. One hundred WordNet definition cases, fifty synonym cases, forty taxonomy cases, and fifty ATOMIC cases vary polite wrappers and equivalent surface forms. Two hundred sixty unsupported composite requests verify that the engine abstains instead of inventing private, live, creative, or certain knowledge.

The long suite intentionally stresses supported constructions rather than claiming arbitrary long-document understanding. Its source is executable and reviewable in `src/conversation-smoke.mjs`; changing a generator changes the tested contract and requires a new report.

### Oracles and execution

Each generated case declares its question family, text, required KB, expected epistemic status, and optional canonical values. Status distinguishes `ANSWERED`, `INDUCTIVE`, `UNKNOWN`, and `UNSUPPORTED`; an unknown answer cannot pass an unsupported oracle, and fluent wording cannot compensate for wrong semantic values.

The runner constructs separate runtimes for the base model, QUICK, WordNet, and ATOMIC. Public KBs use 64 MiB lazy caches during this stress run so the suite exercises the shard path defined by DS021. Cases execute sequentially to prevent concurrent providers from multiplying the working set. The report records initialization time, query time, before/after process memory, configuration, per-family totals, one readable example per family, and every failure. It deliberately omits answer hashes and irrelevant artifact identifiers from the human report.

### Benchmark-guided iteration that produced the accepted run

The first complete 1,000-case baseline passed 937 cases. All 500 contextual core cases, 40 WordNet taxonomy cases, 50 ATOMIC cases, and 260 abstention cases passed. The 63 failures formed one adapter-level language cluster: WordNet did not normalize several polite definition and synonym forms. No evidence indicated a generic reasoning failure.

The candidate changed only source-specific conversational adapters: removable polite suffixes may contain a comma, `tell/explain what X means` compiles to the existing WordNet definition intent, `could/please tell me` exposes the existing ATOMIC question intent, and terminal full stops normalize without changing the queried lemma or event. A separate oracle audit found that `garden` has compiled senses but no distinct synonym value, so a positive synonym expectation was invalid; the generator now uses a lemma with source-recorded synonyms. A later wording audit replaced mechanical ATOMIC wrappers such as “Could you why…” with natural “Could you tell me why…” forms. The accepted rerun passed all 1,000 cases. The short suite and existing tests remained green.

This history matters because it demonstrates the DS020 boundary. Surface conventions local to WordNet remained in its provider. The core did not acquire a special benchmark answer, lemma exception, question ID, or global grammar rewrite.

### Proper names and conversational uncertainty

Capitalized surface tokens are preserved during generic spelling correction so names such as `Jhon` do not become vocabulary fragments. Entity lookup can use bounded Damerau distance only when one active entity is the unique closest candidate. Thus `Sorctare is a man. Is Socrate going to die?` resolves the intended session entity while an ambiguous near-name abstains.

`Who is ENTITY?` is a supported construction. If the entity was introduced in the session, ESLM returns its known classes. If the syntax is understood but the entity is absent, the result is `UNKNOWN` with an explanatory sentence rather than the technically incorrect `UNSUPPORTED`. System identity, user identity, and capability questions have explicit bounded intents; ESLM describes itself, refuses to guess who the user is, and points to `/examples` and `/kbs` for the tested boundary.

### Acceptance and reproducibility

`npm run benchmark:conversation` regenerates `docs/results/latest-conversation-benchmark.json` and its concise HTML companion. A nonempty failure list makes the command fail. `tests/conversation-stress.test.mjs` is an aggregate 1,000-case regression gate, while the short suite retains case-level diagnostics. The repository check runs both.

An accepted score does not establish coverage outside the generated families. New constructions, KB relations, inference modes, ambiguity types, or contextual worlds require new generators and independent data where available. Public benchmark claims remain governed by DS011 through DS013 and are listed separately in the benchmark documentation.

## Decisions & Questions

### Q1. Why generate cases instead of storing 1,000 handwritten lines?

Response: Generation makes entity substitution, distractor variation, KB selection, and oracle structure reviewable as a small program. It also prevents the test catalog from becoming an opaque answer table. The generator itself is versioned and must be inspected for weak or invalid oracles.

### Q2. Does 1,000/1,000 mean ESLM handles every English question?

Response: No. It means the current model passed 1,000 declared variations of ten supported families. The report names those families and explicitly labels the suite internal.

### Q3. Why are unsupported requests included?

Response: Safe abstention is a capability. A system that maps every sentence into a known pattern can appear broad while inventing answers. Composite negative cases check that tolerance does not erase the boundary.

### Q4. Why is QUICK represented in the short suite but not the long suite?

Response: QUICK protects authored test deductions and the examples users commonly try, but it is not public learned knowledge. The long suite concentrates on context-general core behavior and the two source-derived public KBs.

### Q5. Why not optimize the 33-second run immediately?

Response: The current duration and memory are recorded, the suite runs deterministically, and one thousand cases are practical in the repository check. Further indexing or concurrency changes require profiles showing a meaningful bottleneck and must preserve lazy/eager semantic equivalence.
