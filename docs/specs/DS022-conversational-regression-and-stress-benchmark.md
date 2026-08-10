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

The conversational benchmark is an internal generated regression instrument for that boundary. It is not a public dataset, not an unrestricted English evaluation, and not a comparison with an LLM. Its value is operational: `/examples` samples executable representatives, `/smoke` runs a fresh sample inside the interactive CLI, the fixed regression seed makes failures replayable, and the latest long run is published as a compact report rather than an unverified capability list.

### Two complementary suites

`conversationSmokeCases({ seed })` generates 204 cases across thirteen groups: classification and membership, entity description, spatial relations, possession and inverse phrasing, abilities, configured induction, rule deduction, proper-name tolerance, conversation and epistemic boundaries, QUICK fixtures, WordNet, ATOMIC, and honest unsupported requests. Its regression seed currently yields 204 unique inputs and 174 operand-masked structural shapes; the largest repeated shape occurs four times. Tests reject a catalog with fewer than 160 shapes, more than four copies of one shape, duplicate text, or insufficient change under a fresh seed.

`smokeExamples({ seed })` selects at most four representatives per group rather than dumping renamed copies of every generated case. The seed changes names, properties, surface constructions, and the selected representatives. The CLI prints that seed, so either `/examples SEED` or `/smoke SEED` reproduces the same sample. QUICK-dependent examples disclose the requirement and `/smoke` skips them unless QUICK is active.

`longConversationStressCases(1000)` generates a separate fixed-size suite. Four hundred twenty cases combine session assertions, distractors, and classification, location, possession, ability, induction, or deduction questions. Three hundred cases exercise WordNet definitions, synonyms, and taxonomy. Ninety-six cases exercise distinct ATOMIC relation questions and conversational wrappers. The remaining 204 cases verify honest abstention for unavailable effects, tools, creative generation, certainty, or private/live information. The accepted generator produces 1,000 unique inputs, 536 operand-masked structures, and at most ten instances of any one structure.

The long suite intentionally stresses supported constructions rather than claiming arbitrary long-document understanding. Its source is executable and reviewable in `src/conversation-smoke.mjs`; changing a generator changes the tested contract and requires a new report.

### Oracles and execution

Each generated case declares its question family, text, required KB, expected epistemic status, and optional canonical values. Status distinguishes `ANSWERED`, `INDUCTIVE`, `UNKNOWN`, and `UNSUPPORTED`; an unknown answer cannot pass an unsupported oracle, and fluent wording cannot compensate for wrong semantic values.

The runner constructs separate runtimes for the base model, QUICK, WordNet, and ATOMIC. Public KBs use 64 MiB lazy caches during this stress run so the suite exercises the shard path defined by DS021. Cases execute sequentially to prevent concurrent providers from multiplying the working set. The report records initialization time, query time, before/after process memory, configuration, per-family totals, one readable example per family, and every failure. It deliberately omits answer hashes and irrelevant artifact identifiers from the human report.

### Benchmark-guided iteration that produced the accepted run

The diversified short baseline passed only 53 of 204 cases. Failure clustering separated transferable core omissions from source-adapter omissions. The core could not compile recurring paraphrases for classification, location, possession, ability, property statements, fear rules, or their corresponding questions. WordNet lacked several definition, synonym, sense-count, and taxonomy surfaces. ATOMIC lacked equivalent ways to ask for intention, prerequisites, effects, reactions, desires, and obstacles.

The accepted candidate added the domain-independent constructions to session compilation and question parsing. It kept WordNet lexical phrasing inside the WordNet provider and ATOMIC event phrasing and light event morphology inside the ATOMIC provider. The short suite then passed 204/204. A first diversified long run passed 986/1,000. Ten failures were one missing WordNet synonym paraphrase; four failures exposed unnatural nested politeness produced by the generator. The valid synonym paraphrase was added to the provider, the invalid generated wording was repaired, and the final 1,000-case run passed completely.

This history matters because it demonstrates the DS020 boundary. Surface conventions local to WordNet remained in its provider. The core did not acquire a special benchmark answer, lemma exception, question ID, or global grammar rewrite.

### Proper names and conversational uncertainty

Capitalized surface tokens are preserved during generic spelling correction so names such as `Jhon` do not become vocabulary fragments. Entity lookup can use bounded Damerau distance only when one active entity is the unique closest candidate. Thus `Sorctare is a man. Is Socrate going to die?` resolves the intended session entity while an ambiguous near-name abstains.

`Who is ENTITY?` is a supported construction. If the entity was introduced in the session, ESLM returns its known classes. If the syntax is understood but the entity is absent, the result is `UNKNOWN` with an explanatory sentence rather than the technically incorrect `UNSUPPORTED`. System identity, user identity, and capability questions have explicit bounded intents; ESLM describes itself, refuses to guess who the user is, and points to `/examples` and `/kbs` for the tested boundary.

### Acceptance and reproducibility

`npm run benchmark:conversation` regenerates `docs/results/latest-conversation-benchmark.json` and its concise HTML companion. A nonempty failure list makes the command fail. The report includes unique-input count, structural-shape count, and maximum shape repetition. `tests/conversation-stress.test.mjs` is an aggregate 1,000-case regression gate, while the short suite retains case-level diagnostics. The repository check runs both.

An accepted score does not establish coverage outside the generated families. New constructions, KB relations, inference modes, ambiguity types, or contextual worlds require new generators and independent data where available. Public benchmark claims remain governed by DS011 through DS013 and are listed separately in the benchmark documentation.

## Decisions & Questions

### Question #1: Why generate cases instead of storing 1,000 handwritten lines?

Response: Generation makes entity substitution, distractor variation, KB selection, and oracle structure reviewable as a small program. It also prevents the test catalog from becoming an opaque answer table. The generator itself is versioned and must be inspected for weak or invalid oracles.

### Question #2: Does 1,000/1,000 mean ESLM handles every English question?

Response: No. It means the current model passed 1,000 declared cases across eleven generated groups. The report names those groups and explicitly labels the suite internal.

### Question #3: Why are unsupported requests included?

Response: Safe abstention is a capability. A system that maps every sentence into a known pattern can appear broad while inventing answers. Composite negative cases check that tolerance does not erase the boundary.

### Question #4: Why is QUICK represented in the short suite but not the long suite?

Response: QUICK protects authored test deductions and the examples users commonly try, but it is not public learned knowledge. The long suite concentrates on context-general core behavior and the two source-derived public KBs.

### Question #5: Why not optimize the long run immediately?

Response: Duration and memory are recorded, the suite runs deterministically, and one thousand cases remain practical in the repository check. Further indexing or concurrency changes require profiles showing a meaningful bottleneck and must preserve lazy/eager semantic equivalence.

### Question #6: Why use both random-looking samples and fixed regression cases?

Response: A fixed seed gives the repository a stable acceptance gate. Fresh seeds alter operands, surface combinations, and displayed representatives so accidental dependence on one catalog becomes visible. Every interactive sample prints its seed, combining variation with exact replay.

### Question #7: Which public benchmarks does this suite add?

Response: None. The locally run public benchmarks remain bAbI v1.2 Tasks 15 and 16. WordNet and ATOMIC portions are source-exposed integration checks, while the conversational cases are generated from declared runtime capabilities.
