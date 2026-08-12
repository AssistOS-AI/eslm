---
id: DS013
title: Language-Agent-Assisted Language Normalization
status: in-progress
owner: language
summary: Defines the explicitly enabled Language Agent profile for conservative translation and simplification after local recovery is exhausted, including process isolation, validation, cache, accounting, and separation from the deployed runtime.
---

# DS013 Language-Agent-Assisted Language Normalization

## Introduction

ESLM expands language coverage through trusted direct parsing and deterministic local approximation. An operator may also choose to test a sentence whose wording remains outside that local frontier. This specification defines the narrowly scoped, explicitly enabled Language-Agent-assisted normalization profile. A Language Agent may translate or simplify the surface form of one input only after the direct symbolic route and the DS022 local heuristic route remain `UNPARSED`. It may be a general coding agent, as the current Codex adapter is, or a smaller agent specialized for translation into ESLM controlled natural language. It may not answer the question, select an answer option, retrieve facts, perform the requested reasoning, or add knowledge. Its output returns through the unchanged direct symbolic parser and reasoner.

“Language Agent” is the product-neutral contract. The implementation currently supported by this repository is Codex through its local CLI. Product and model details belong to the adapter configuration and execution receipt; they do not change the generic trigger, authority, validation, or evidence contract.

This profile changes the execution regime and must be named honestly. The deployed ESLM runtime remains deterministic, dependency-free, offline, and free of language-agent calls. The assisted CLI is an operator tool wrapped around that runtime. A result produced by the wrapper is not evidence for the pure deployed-runtime track, even when the final reasoning and proof are symbolic.

## Core Content

### 1. Local default and explicitly enabled assisted profile

The deployable runtime and direct library profile are `direct-symbolic`. They normalize Unicode and declared lexical
variants, parse supported language, construct the task frame, select capabilities, load declarative KB data, reason,
and realize a result without a network or agent process. The general CLI composes that runtime with the deterministic
DS022 heuristic language and request-planning wrapper. This complete local profile is the CLI default: original text
runs first; bounded explicit request force may preempt an accidental assertion parse; otherwise direct `UNPARSED` and
`UNKNOWN` enter parse-only-selected local approximation. A structurally licensed candidate may also challenge direct
`SOLVED` or `PARTIAL` when its Semantic IR differs from the direct interpretation; equal IR preserves the direct route.
Eligible inability results may then receive role-focused grounding. A normal knowledge gap remains unchanged without
an accepted structural alternative. None of these local stages calls a model or starts a child process.

The optional operator profile is `language-agent-assisted-normalization`. It adds the external wrapper only after explicit opt-in. The complete direct and deterministic local attempts still run first. Only a terminal `UNPARSED` language result may trigger one bounded normalization episode; a locally synthesized `PARTIAL` document request, an accepted heuristic interpretation, and every parsed semantic inability bypass the Language Agent. An episode permits at most three external proposals in total. A proposal that fails host surface validation may be retried with those validation-error categories. A proposal that passes surface validation but remains `UNPARSED` after the direct symbolic reparse may be retried with the narrow fact that the previous controlled-language form was unsupported. The Language Agent never receives an answer, KB result, failure-time grounding bundle, proof state, desired semantic value, or benchmark label as feedback. A successfully reparsed sentence records `languageRoute: language-agent-normalized`; the original local failure, all proposals and receipts, requested and declared operation, normalized text, validation evidence, adapter and model identity, prompt-policy version, input digest, cache state, and invocation count remain attached.

`--external-language-agent` and interactive `/normalize on` enable the wrapper. `--no-external-language-agent` and `/normalize off` explicitly select the entirely local profile, which is already the default. Product-specific option names are not accepted: the interface names the role and remains unchanged when a different adapter replaces Codex. Loading a KB, selecting a larger DS022 work profile, or encountering difficult text never changes this setting. The public catalog probe, canonical local evaluation, canonical benchmark suite, unit tests, and 4,096-case smoke regression explicitly keep the wrapper disabled so service availability, authentication, and cache state cannot alter published or required local evidence.

Explicit opt-in does not make external disclosure invisible. Interactive startup and `/normalize` state whether assistance is enabled and, when enabled, the active model, cache policy, and the fact that otherwise-unparsed source text can leave the offline boundary. Confidential, restricted, or otherwise non-disclosable input stays on the default local profile. Missing authentication, model unavailability, or process failure preserves the local result and records the failed assisted route.

### 2. Currently supported Language Agent implementation

The current adapter invokes Codex. Its initial configured model is the exact local slug `gpt-5.3-codex-spark`, displayed as GPT-5.3-Codex-Spark. Simple normalization uses `low` reasoning. Model selection is explicit in the subprocess arguments and in every receipt. The project does not infer this slug from the public API alias `gpt-5.3-codex`: they are different identifiers and no substitution is permitted. Model availability is an operational precondition checked by each invocation, not a portable property asserted by this specification.

The implementation must never silently replace this model with `gpt-5.3-codex`, another model, or an API model. If the requested model is unavailable, authentication fails, the subprocess exits unsuccessfully, or the installed Codex CLI lacks a required isolation option, the result reports a normalization failure. An operator may deliberately provide a different model through an explicit option, and that choice creates a distinct evaluation configuration and cache namespace.

Language Agent performs one of two operations:

- `translation` converts a non-English sentence into conservative English while preserving names, numbers, operators, relation direction, and question intent.
- `simplification` rewrites an unsupported English construction into one or more shorter controlled-English statements and one controlled-English question without changing the information supplied.

Language Agent does not receive benchmark labels, reference answers, answer keys, hidden splits, KB search results, reasoning traces that disclose the expected answer, or instructions to solve the task. For a benchmark case it receives only the visible input text, the language-only contract, and the output schema.

### 3. Local-first trigger and minimization

The trigger is the terminal language outcome after original-text execution and DS022 local recovery, not a benchmark name, sentence length, domain, or anticipated difficulty. `SOLVED`, `PARTIAL`, `DEFEASIBLE`, `UNKNOWN`, `AMBIGUOUS`, `MISSING_KNOWLEDGE`, `NO_APPLICABLE_METHOD`, `UNDERDETERMINED`, `INCONSISTENT_CONTEXT`, `RESOURCE_LIMIT`, and `UNSUPPORTED_OUTPUT` do not trigger normalization because those states do not establish a remaining surface-language failure. A `heuristic-cnl-ambiguous` result requests user confirmation rather than external tie-breaking.

One original input permits at most one normalization episode and three external proposals. The host requests `translation` when independently recognized source-language cues identify non-English input and `simplification` when the source appears to be English. The route and its evidence are recorded before the Language Agent responds; a high-confidence mismatch between requested and declared operations is rejected.

An episode normally contains one Language Agent invocation. If its JSON candidate fails host-owned schema or protected-surface validation, the next proposal may receive only the bounded validation-error categories. If a surface-valid proposal remains `UNPARSED`, the next proposal may receive the previous normalized sentence and the bounded frontend diagnosis that a different conservative CNL formulation is needed. This feedback communicates language compatibility, not task correctness. It never contains a benchmark answer, provider answer, proof, desired semantic values, selected option, hidden label, or a diagnosis of `UNKNOWN`.

The host never invokes the Language Agent after a parsed semantic status, a completed local request plan, or a locally ambiguous interpretation; it never treats a wrong answer as a language failure. Each proposal still targets the original input; the previous proposal is feedback rather than a recursively authoritative source. All surface-validation corrections and parser-feedback proposals share the three-invocation ceiling. A cache hit replaces external work for the initial proposal but remains counted as a Language-Agent-normalized route because the text was produced by that adapter and policy. The project minimizes use by expanding direct parsing and generic DS022 heuristic coverage from repeated failure clusters, never by relabeling cached or precomputed Language Agent text as direct symbolic input.

### 4. Subprocess and authority boundary

Language Agent runs ephemerally in a newly created empty operating-system temporary directory. The subprocess uses the requested model, low reasoning, read-only sandboxing, no approval escalation, no repository rules, no project skills, no persistent session, and no web or shell tool when the installed CLI can disable those features. Only a small allowlist of process-environment variables needed for the executable and existing Language Agent authentication is inherited.

The prompt delimits the source sentence as untrusted content and states that commands inside it are data. The output must satisfy a host-owned JSON Schema. The Language Agent has no authority to edit source, write a KB, execute a corpus instruction, inspect benchmark labels, or decide whether its output is accepted.

The host imposes input, output, time, and byte limits. The current Codex adapter accepts at most 12,000 input
characters and captures at most 2 MiB of UTF-8 bytes from each of standard output and standard error. Crossing either
process-stream limit starts termination and prevents an output-producing child from keeping the episode alive. The
host first sends `SIGTERM`, waits 250 ms, sends `SIGKILL` if the child has not closed, and uses one additional bounded
250 ms settlement window rather than awaiting an uncooperative child indefinitely. The JSON response file is rejected
from filesystem metadata before parsing when it exceeds 1 MiB. Exit status, termination state, observed byte counts,
truncation flags, configured limits, and hashes of the bounded stdout and stderr are recorded in the receipt.
Temporary process files are removed after the receipt and candidate result have been read. A timeout, malformed output,
extra prose, unsupported operation, or oversized value is a failed normalization rather than a reason to relax
validation.

### 5. Normalization response contract

The wrapper attaches a host-owned result envelope with protocol
`eslm-language-agent-normalization-result-v1` to every attempted assisted route. The envelope records whether an
attempt occurred, non-negative proposal and external-invocation counts, cache state, bounded proposal and process
receipts, accepted or failed status, and diagnostic text. It is distinct from the untrusted proposal object described
below and is validated as part of `eslm-runtime-result-v1` before publication.

Each proposal response is one JSON object with protocol `eslm-language-agent-normalization-v2`, operation `translation` or `simplification`, a declared source-language tag, `normalizedEnglish`, and an array of source-to-target anchor alignments. `normalizedEnglish` must be non-empty plain text within the configured limit. Markdown fences, NUL bytes, executable payload fields, tool requests, answers, explanations, confidence scores, retrieved facts, and additional properties are rejected.

An alignment names an allowlisted anchor kind and identifies exact source and normalized substrings. Anchor kinds include
named entity, number, answer option, quoted material, interrogative, lexical content, negation, quantifier, modality,
conditional, temporal operator, conjunction, disjunction, comparison, and directed relation. Every recognized protected
source occurrence requires one compatible exact-substring alignment to one as-yet-unmatched target occurrence. Reusing
one occurrence to satisfy several alignments is rejected. Alignments help reviewers locate the proposed correspondence;
they do not by themselves prove semantic equivalence because they are also model output.

### 6. Host validation and reparse

The host independently extracts surface anchors it can recognize. It checks exact numbers and answer-option markers,
quoted material, likely entity names outside sentence-initial function words, question-versus-statement force, and
configured multilingual operator families. It requires a one-to-one exact alignment for every protected source
occurrence and requires the complete source and target protected-identity multisets to match. Compatibility is typed,
not count-only: `all` and `every` share the universal identity, while `all` and `some` do not; `left` cannot align to
`right`, and `above` cannot align to `below`. The same rule protects conditional roles, temporal direction,
interrogative kind, comparison type, modality, negation, conjunction, and disjunction. Operator extraction identifies
semantic constructions rather than counting every word that can have an operator reading. A Romanian `mai` followed by
an ordinary verb is not a comparative merely because `mai` also occurs in `mai mare decât`; the validator protects the
comparative construction, not the isolated spelling.

For English simplification, protected anchors are only the first gate. After removing those anchors, the validator
requires equality of the normalized open-class-content multiset and of the reviewed English function-word multiset.
This permits reordering into supported controlled English but rejects predicate replacement, deletion, or invention.
For translation, the only currently accepted non-English `sourceLanguage` profile is Romanian (`ro` or `ron`).
Non-function content must either remain literally present or be covered occurrence by occurrence through the small
reviewed Romanian-to-English lexical-equivalence map. An arbitrary fluent paraphrase or an alignment asserted by the
Language Agent is not accepted merely because it sounds plausible.

This check is intentionally conservative. When the host cannot establish preservation, it returns `UNVERIFIED_NORMALIZATION`; it does not infer that fluent English is faithful. Translation coverage therefore depends on the independently recognized source-language operator lexicon. Adding a language or operator family requires contrastive preservation tests, including negated, quantified, modal, conditional, temporal, comparative, and direction-reversing examples.

After anchor validation, the complete normalized text is submitted directly to the ordinary symbolic runtime. The host does not recursively pass Language Agent output through the DS022 approximation ensemble. If the direct reparse remains `UNPARSED`, a remaining proposal may receive only the bounded parser-form feedback described above. Exhausting the proposal limit, producing an ambiguous interpretation, or failing another acceptance invariant rejects the normalized route. If it parses, all retrieval, reasoning, proof, provenance, KB, budget, and realization behavior is performed by ESLM. Language Agent output is never evaluated as code or accepted as a conclusion.

### 7. Cache and reproducibility

The operator cache lives under the ignored training cache, outside deployed runtime packages. Its key covers the original UTF-8 input digest, requested operation, model slug, reasoning effort, prompt-policy version, response-schema version, anchor-validator version, and normalization policy. Changing any of these inputs creates a different key. A cache file larger than 4 MiB is rejected from metadata before it is read or parsed; a newly serialized entry over that limit is not written.

Each entry records the key fields, original-input digest, model output, host validation, normalized-text digest, process receipt, and creation time. The host validates a cached entry before use and reparses its normalized text for the current runtime and KB selection. Corrupt, incompatible, or schema-invalid entries are ignored or quarantined by an explicit maintenance operation; they are never trusted because their filename matches.

Caching minimizes repeated external work but does not change evidence attribution. Reports count cache hits in the assisted route and separately report external invocations, hits, misses, accepted normalizations, rejected normalizations, and failures. Sensitive input must not use this external profile or persistent cache unless its disclosure and retention policy permits both.

### 8. CLI behavior

`ask`, `run`, and ordinary interactive execution use the deterministic local profile unless `--external-language-agent` is present or interactive `/normalize on` has been selected. `--language-agent-model` selects a deliberate adapter model override only for that assisted profile. `--no-normalization-cache` disables both cache reads and writes for that invocation. Timeout and maximum-input options remain bounded and validated. Canonical evaluation and public benchmark probes keep assistance off explicitly; an assisted evaluation is a separately named experiment.

The public `benchmark probe` command constructs external-agent-free engines internally and rejects an affirmative `--external-language-agent` request so the published development baseline remains deterministic and reproducible. Canonical package scripts also pass `--no-external-language-agent` visibly. An operator who needs an assisted benchmark track freezes an explicit JSONL suite and runs `benchmark run --suite FILE --external-language-agent`; the resulting report records normalization candidates, proposals, external invocations, cache hits, accepted rewrites, route-specific accuracy, and overall accuracy. This separation prevents a mutable external service or cache from changing the canonical local probe.

Interactive mode provides `/normalize`, `/normalize on`, and `/normalize off`. The status view states whether assistance is enabled and, when it is enabled, which model is configured, whether caching is enabled, and that otherwise-unparsed input may be sent to an external Language Agent process. Toggling the setting rebuilds only the operator wrapper; it does not mutate the core model, selected KBs, DS022 work profile, or session facts. `/work` displays the exact local policy and `/work quick|balanced|deep|exhaustive-bounded` changes bounded local heuristic, reasoning, provider, and grounding work. It never enables Language Agent or changes the three-proposal assisted ceiling.

Immediately before a real external subprocess invocation, human output must show restrained activity text such as `Thinking: interpreting with the configured Language Agent…`. The message is emitted for an actual invocation, not merely because assistance is enabled and not for a cache hit. One-shot or batch commands place activity on standard error when needed so JSON and JSONL standard output remain valid.

Every assisted result remains valid structured JSON. Human interactive output displays an accepted route as four distinct facts: Language Agent translation or simplification, original input, transformed English, and the final symbolic status and answer. It must not compress these facts into a bracket that can be mistaken for a direct answer, hide the original route, or omit the structured receipts. A rejected route displays the original, any proposed English, and the host rejection reason. An agent failure does not terminate an interactive session; it returns the local failure plus an assisted-normalization diagnostic.

### 9. Benchmark accounting

Every public benchmark report publishes at least two distinct tracks when assistance is tested:

- the deterministic local track, whose denominator is every scored case and whose agent-use rate is zero; it reports `direct-symbolic`, `heuristic-cnl-approximated`, `heuristic-cnl-ambiguous`, `heuristic-request-planned`, `heuristic-request-synthesis`, and other local semantic routes separately;
- the language-agent-assisted-normalization track, which begins from the same cases and records direct and heuristic local outcomes, remaining normalization attempts, cache hits, external calls, accepted and rejected rewrites, and accuracy by route.

The requested “percentage needing special analysis” is `normalizationAttempts / totalCases`, where an attempt occurs only after local recovery remains `UNPARSED`. It is not the percentage of wrong answers, unknown answers, complex sentences, or heuristic proposals. `directSymbolicRate` is the count of cases accepted on the original direct route divided by `totalCases`; local heuristic and request-synthesis rates are reported separately rather than being inferred from the complement of normalization attempts. Reports also publish `externalInvocationRate`, `cacheHitRateAmongAttempts`, `acceptedNormalizationRateAmongAttempts`, direct-route accuracy, local-heuristic-route accuracy, normalized-route accuracy, and overall assisted accuracy.

A preference benchmark whose current adapter calls only a deterministic grammar scorer cannot invoke Language Agent unless the adapter has a separately reviewed language-normalization contract. An inaccessible or gated benchmark has no denominator and therefore displays `not-run`, not zero percent. A small probe is labeled with its exact sample count and selection method; it is not promoted to a full benchmark score.

### 10. Learning from assisted cases

Accepted normalized text may be used as diagnostic evidence for a generic language-front-end proposal only when the visible development pool permits it. The proposal must cluster several independently selected cases, identify the reusable construction, pass the core rename test, preserve protected operators, add nonce and contrastive tests, and improve fresh direct-symbolic coverage. It must not copy normalized benchmark sentences into a dispatch table.

The benchmark answer and correctness label remain outside the normalization packet. Test or hidden normalized text cannot become a training artifact. Once a construction is implemented directly, rerunning the benchmark should reduce the assisted-attempt rate; historical reports remain unchanged so the change is auditable.

### 11. Acceptance tests

The implementation requires tests for the CLI-disabled-by-default policy, explicit opt-in, the explicit local override, deployable-runtime independence, direct-and-heuristic exhaustion before invocation, canonical-command local selection, restrained notification immediately before a real invocation, no notification for cache hits, exact model argument, low reasoning setting, empty-workspace subprocess, bounded environment, schema rejection, cache-key separation, cache corruption, timeout and TERM-to-KILL settlement, byte-bounded multibyte process output, oversized response and cache files, malformed JSON, one-to-one exact alignments, added and removed protected anchors, typed operator identity and relation direction, English content-multiset preservation, the reviewed Romanian lexical map, contextual comparison detection, number and entity preservation, operation routing, the three-proposal ceiling, recursion prevention, successful direct reparse, failed reparse, exclusion of DS009 grounding evidence from normalization input, structured route accounting, interactive transformation display, interactive toggling, batch JSONL, and benchmark metrics.

At least one translation and one English simplification fixture must use a stub executable rather than a live Language Agent call so the normal test suite remains offline. A manually executed live probe may establish that a particular local Language Agent installation exposes GPT-5.3-Codex-Spark, but that machine-local observation is recorded as an operational receipt rather than a portable project guarantee.

### Current implementation evidence and remaining limits

The currently supported Codex adapter is split by authority and responsibility. `src/language/codex-normalizer.mjs` is
the stable orchestration facade and owns prompts, proposal execution, receipts, and cache use.
`codex-normalization-contract.mjs` owns protocol identifiers, bounds, anchor kinds, and the response schema;
`codex-normalization-anchors.mjs` owns route classification and host anchor extraction;
`codex-normalization-validation.mjs` owns one-to-one semantic and lexical preservation; and
`codex-normalizer-io.mjs` owns the exact invocation, bounded process lifecycle, bounded JSON reads, and atomic cache
writes. This separation keeps every normalizer module below DS001's 500-line review threshold and does not introduce
the operator subprocess into the deployable runtime closure. `src/runtime/language-agent-assisted-runtime.mjs`
wraps `src/runtime/heuristic-language-runtime.mjs` only after explicit opt-in and implements the product-neutral
local-first trigger, three-proposal episode budget, direct reparse, bounded parser-form feedback, accepted route,
rejection route, and failure route. `src/cli.mjs` supplies one-shot, batch, and interactive controls while canonical
evaluation and public probing explicitly disable assistance. Offline stub tests verify exact arguments,
operation selection, typed anchor identity, English and reviewed Romanian content preservation, cache reuse and bounds,
process output bounds, TERM-to-KILL settlement, response bounds, the proposal ceiling, trigger isolation, reparse
feedback, invocation notification, and original-to-transformed presentation.

Machine-local live probes and their receipts are operational evidence. They belong in replaceable status or execution artifacts, not in this specification, and they never establish portable model availability. Local public benchmark reports distinguish actual Language Agent calls from counterfactual normalization-candidate counts derived from `UNPARSED`; the two measurements must not be presented as the same rate.

The current validator has protected operator vocabulary for English and Romanian, conservative language-independent
checks for numbers, answer markers, quotations, likely named tokens, and question force, exact English content
multisets for simplification, and only a small reviewed Romanian lexical-equivalence map for translation. It does not
establish semantic preservation for unrestricted Romanian or any other language. A Romanian content word outside that
map must remain literal or the proposal is rejected; expanding the map requires review and contrastive tests.
Long-distance scope, implicit negation, lexicalized modality, idioms beyond the explicitly reviewed check-in forms,
coreference, presupposition, and relation direction outside the allowlist can remain undetected. Such coverage requires
explicit contrastive tests before its accepted-route evidence can support a claim.

## Decisions & Questions

### Question #1: Does assisted `ask` alter the offline runtime boundary?

Response: No. The core, deployed profile, and default CLI path remain offline and deterministic. The CLI constructs the external operator wrapper only after explicit `--external-language-agent` or `/normalize on` selection; every assisted attempt is labeled, and disabling it leaves the complete direct-plus-local heuristic path available. Documentation and benchmark tables must never report an assisted result as a local-only runtime result; canonical published commands explicitly keep assistance disabled.

### Question #2: Why may Language Agent trigger only after local recovery remains `UNPARSED`?

Response: An unknown answer, missing premise, unavailable method, ambiguity, resource limit, or locally recognized document request is not a translation problem. Deterministic spelling, morphology, auxiliary, and clause repairs should also be attempted without disclosure or service dependence. Sending any of those cases to Language Agent would invite it to perform reasoning or supply knowledge and would hide the layer that actually succeeded or failed.

### Question #3: Is model-provided alignment sufficient preservation evidence?

Response: The alignment and normalized sentence share the same untrusted author. The host therefore extracts protected surface evidence independently, validates recognized correspondences, and reparses the result. Cases beyond the validator's language coverage are rejected rather than accepted on fluency.

### Question #4: Do cache hits remain assisted language cases?

Response: The cached sentence still originated from Language Agent. Caching changes latency and external-call cost, not the language autonomy of the symbolic system. Separate cache and invocation metrics expose both facts.

### Question #5: Why does the default adapter model use an exact slug?

Response: Model substitution changes behavior, cost, availability, and reproducibility. The requested GPT-5.3-Codex-Spark model is represented by the exact local Codex slug `gpt-5.3-codex-spark`; an unavailable slug produces a visible failure, while an operator override creates a separately identified configuration.

### Question #6: Do three bounded language proposals authorize answer seeking?

Response: Host validation can identify a correctable proposal defect, and the symbolic parser can report only that a surface-valid CNL form remains unsupported, without revealing an answer. A three-proposal ceiling gives the service a bounded opportunity to obey both contracts. Restricted feedback, continued use of the original source as authority, absence of KB and reasoner state, and prohibition on retries after any parsed semantic status prevent iterative solving or answer search.

### Question #7: Why reject a fluent translation whose content is outside the reviewed lexical map?

Response: Fluency is evidence about target-language form, not source-to-target preservation. The model supplies both the
translation and its alignments, so accepting a novel lexical equivalence on its assertion would make validation
self-attestation. The present Romanian profile accepts literal content and a deliberately small reviewed equivalence
map, while typed protected anchors preserve operators and direction independently. This sacrifices translation
coverage in exchange for an auditable inability result. Coverage may expand only by reviewing new equivalences and
adding positive, negative, and direction-changing tests.

## Conclusion

Language Agent assistance is a measured, explicitly enabled language adapter around ESLM, not a hidden second reasoner. Direct parsing and deterministic local recovery receive the complete first opportunity, every external rewrite remains untrusted, protected meaning is checked conservatively, the normalized text must return through the direct symbolic runtime, and all cache and model use stays visible in the result and benchmark evidence.
