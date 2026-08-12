---
id: DS010
title: Evaluation, Measurement, and External Comparison
status: in-progress
owner: evaluation
summary: Defines evidence layers, fixed-denominator and route metrics, strategy-configuration identity, receipt currentness, structural splits, grounded construction, and external comparison.
---

# DS010 Evaluation, Measurement, and External Comparison

## Introduction

Evaluation must reveal which layer works and which layer fails. This specification owns measurements, scorers, generated reports, and external comparisons. DS016 governs source authority and licensing; DS017 governs benchmark adapters, oracles, and split lifecycles. Current denominators and results belong only in replaceable execution receipts.

## Core Content

### Evidence layers

Unit tests verify implementation contracts with small repository fixtures. Metamorphic smoke tests preserve accepted generic behavior over generated nonce inputs. Local evaluation measures a fixed internal cross-section. Development probes execute externally defined tasks that may guide repair. Fresh and shadow regimes test a frozen candidate without exposing individual outcomes. Official test or evaluator runs follow the source owner's protocol. External comparisons measure another system under a frozen shared manifest.

These layers do not substitute for one another. A fixture is not a public benchmark, an adapter is not a score, a development sample is not an untouched test result, a local exact scorer is not an official semantic grader, and a fresh aggregate ceases to describe a later behavior change.

### Case and scorer contract

Every evaluated case has a stable join identifier, label-free visible input, declared answer or preference domain, evidence scope, capability tags, route policy, resource policy, and required proof or witness kind. The host-only oracle is joined after predictions exist. Missing predictions count according to the scorer and are never silently removed from the denominator.

The scorer compares semantic values, assignments, paths, transitions, proofs, or strict preferences rather than terminal prose whenever the task permits. Exact string normalization is documented and deterministic. A semantic model grader is used only in a separately frozen protocol that records its exact model, prompt, inputs, outputs, and route; deterministic validators remain preferred.

For forced-choice and other fixed-denominator tasks, three numbers are mandatory:

- **end-to-end accuracy** is `correct / all eligible cases`; abstentions, missing predictions, resource limits, and
  missing methods remain in the denominator;
- **attempt coverage** is `attempted / all eligible cases`, where an attempt is a prediction inside the declared answer
  domain;
- **selective accuracy** is `correct / attempted` and is `null` when no case was attempted.

Therefore zero attempts over a non-empty forced-choice pool means end-to-end accuracy `0`, attempt coverage `0`, and
selective accuracy `null`; suppressing accuracy would conceal total system failure. A task whose oracle is genuinely
unavailable has no valid correctness denominator and must instead report an explicitly named completion, consistency,
or unscored execution metric.

Whether a benchmark is forced-choice is typed report metadata, not an optional row hint. The report registry declares
it for every portfolio ID; row factories serialize the declaration and validation rejects a missing or changed value.
This prevents a malformed report from bypassing the mandatory attempted count or removing abstentions from the fixed
denominator by deleting `forcedChoice`.

External prediction imports reject duplicate IDs, unknown extra IDs, malformed choices, and incomplete protocol
metadata. Missing known IDs remain scorer-visible omissions. A numeric choice is accepted only in its exact declared
domain; coercion from arbitrary strings is forbidden. The receipt hashes the suite and the prediction file and records
model revision, prompt or adapter, decoding, evidence access, tools, and other comparison metadata required by the
protocol.

An aggregate copied from a paper or third-party report is not equivalent to locally scored predictions. Aggregate
imports use a closed manifest with model and revision, protocol and input route, scorer, tools, dataset identity and
split, optional dataset digest, typed metrics with checked arithmetic, primary citation, evidence regime, and explicit
limitations. The import receipt hashes that manifest and always labels it `reference-only-unverified-aggregate`.
Naming a protocol `eslm-native` or supplying a familiar metric can never auto-promote an imported aggregate to a
comparable result.

### Required measurements

Correctness measurements include correct count, tested denominator, available source scope, accuracy, capability and stratum breakdowns, exact match where appropriate, and official-versus-local scorer identity. Proof measurements independently validate proof graphs, countermodels, assignments, relation paths, transition traces, feature witnesses, and source provenance.

Language measurements include direct accepted semantics, direct `UNPARSED`, DS022 heuristic proposals and voting
families, candidates above threshold, reparses, accepted changed interpretations, semantic ties, request plans,
request-synthesis results, and accuracy by route. They separately count Language Agent eligibility after local
exhaustion, explicit opt-in, proposals, actual external calls, cache hits, accepted translations or simplifications,
host rejections, and process failures. A direct-`UNPARSED` rate is not agent use, and an eligible assisted request is
not an actual invocation. A cached normalization remains assisted even when no live process ran.

Every benchmark row identifies two separate classifications. Its **measured track** is `raw-language`,
`structured-task`, or `solver-conformance`. Its **input route** is `raw-language`, `source-template`,
`structured-task`, or `source-annotation`. `directSymbolicRate` is meaningful only when the input route is
`raw-language`. A graph, finite program, formula, CNF, source calculus, or host-projected task may exercise a real
generic solver, but it is not direct natural-language coverage. Reports may show both the adapter or solver result and
an independent raw-language diagnostic; they must not replace the latter with the former.

Reliability measurements separate correct abstention from accidental failure: `UNKNOWN`, `AMBIGUOUS`, `UNDERDETERMINED`, `INCONSISTENT_CONTEXT`, `NO_APPLICABLE_METHOD`, `RESOURCE_LIMIT`, and `UNPARSED` retain their meanings. A heuristic proof exposed as `DEFEASIBLE` is scored under that public status, and an extractive artifact is scored as `PARTIAL`, never as a strict answer. Efficiency measurements include elapsed time, peak application memory where measurable, loaded bytes, shard and cache activity, search nodes, package size, exact work-policy profile and overrides, heuristic work counts, and deterministic replay. Updateability measurements cover changed records, changed compiled bytes, affected answers, unaffected-answer stability, and provenance.

Strategy measurements distinguish catalog presence, selection, eligibility, execution, abstention, invalid output,
resource exhaustion, and contribution. Reports group those states by canonical stage and exact strategy identity and
include per-strategy ablations when a result supports an architectural promotion claim. A catalog entry or configured
arbiter is not counted as executed merely because the row selected its stage.

### Generalization and robustness

Random row splits are insufficient when templates, worlds, stories, vocabulary, relations, or proof structures repeat. Evaluation groups by relevant causal structure: source document, generated world, construction family, entity vocabulary, domain, relation composition, rule depth, spatial hop count, or another task-specific unit.

Every split receipt carries a `splitQuality` label such as row-IID, grouped-world, grouped-template,
vocabulary-disjoint, structure-disjoint, source-version, or official-test. “Fresh” describes the one-shot lifecycle of a
frozen pool; it does not by itself mean structural novelty. A holdout sampled inside the same paradigm or generator is
reported as in-distribution row-IID or grouped holdout as applicable. Correlated decisions produced from one source
item are assigned to the same group and confidence unit.

Every accepted generic capability has meaning-preserving transformations, meaning-changing contrasts, full entity and predicate renaming, irrelevant-fact injection, order changes that should be invariant, and depth or size curves. Accuracy must be interpreted beside direct-language coverage and proof validity. A gain that depends on more external normalization or invalid witnesses is not an unqualified symbolic improvement.

### Public empirical report

`docs/results/latest-public-benchmark-probes.json` is the replaceable receipt for the latest published benchmark
portfolio. DS files and hand-authored HTML do not copy its temporary dates, percentages, denominators, failure counts,
access states, or current adapter inventory. The evaluation page is the one full browser-rendered portfolio view. The
home and status pages link to it and explain the evidence boundary without duplicating the table.

Every catalog row records stable benchmark identity, source and access state, adapter state, evaluation state, evidence regime, effective split visibility, human-readable sample and protocol descriptions, internal protocol identifiers, tested count or `null`, possible count or `null`, correct count or `null`, accuracy or `null`, status counts, normalization candidates or `null`, actual Language Agent invocations or `null`, selected methods and KBs, scorer limitations, diagnosis, and official next-action URL when applicable.

An executable row additionally records its input track, metric semantics, split quality, row execution time,
source/partition/oracle/scorer identities or digests, behavior-dependency digest, selected method and KB versions,
language policy, requested resource policy, measured elapsed time and peak memory where available, and a replay
command. The report records assembly time separately. A row built from a committed receipt retains that receipt's
execution time and checkpoint; it must not inherit the new assembly time as if it were re-executed.

Every row presented as a current execution must also contain one bounded
`eslm-benchmark-strategy-configuration-v1` snapshot. The snapshot binds the row to the canonical built-in strategy
catalog format and content digest, its content-addressed configuration digest, requested and effective work-policy
profiles, the inventory preset, and exact stage-to-identity allowlists. If an adapter uses a separate local strategy
state instead of the ordinary runtime work policy, the snapshot identifies that mode and contains the adapter ID,
version, bounded closed state, and state digest. It must not synthesize a runtime selection for an adapter-local path.

The snapshot also lists configured arbiter identities and policy digests. That list records configuration, not proof
that an arbiter executed. Actual coordinated activity is summarized by stage. Each entry has the closed shape
`{ stage, format: "eslm-benchmark-strategy-stage-receipt-summary-v1", executions, completeExecutions,
incompleteExecutions, uniqueReceipts, digest }`; its digest binds the canonical underlying stage receipts for every
case in the row. `uniqueReceipts` is a bounded canonical list of receipt digest, occurrence count, and completeness;
its occurrence counts sum to `executions`. An empty stage-summary list is honest when no coordinated stage ran. A
batch row may never attach one case's runtime receipt and imply that it represents the entire denominator.

Before a row is called current, a static audit recomputes the frozen result and behavior-dependency digests. An audited
row is classified as current, historical-stale, historical-unrecoverable, invalid, or unavailable. A stored execution
outside the audit definitions is `historical-unverified`: it may retain its historical metric and timestamp, but it
cannot imply behavior currentness. Cache presence, a
hardcoded catalog state, or a passing assertion over stored metrics cannot establish currentness. Historical evidence
is retained and clearly labeled rather than rewritten. A strict publication or release check rejects stale rows that
claim the current checkpoint; routine source checks may remain non-strict to avoid silently running costly probes.

The current report implementation separates report assembly from row execution, records track and input route, applies
fixed-denominator metrics, and audits the frozen receipt families for which dependency maps exist. Some older receipts
still lack measured peak memory, full scorer identity, a replay command, or the bounded strategy-configuration
snapshot. Such rows remain historical or incomplete evidence until a clean isolated rerun produces the full execution
contract; the report generator must not synthesize missing metadata. Dependency currentness and reporting completeness
are separate audit facts. Matching source hashes do not make an older receipt `current` when it lacks the execution
timestamp, content-addressed behavior identity, resource policy and measurements, replay command,
scorer/oracle/partition identities, selected methods and KB versions, language policy, or strategy configuration and
stage-summary digests. The audit labels that receipt's reporting completeness `incomplete` and prevents a
current-checkpoint claim until a new execution records those fields.

An executed row displays the tested count beside the possible source scope. A non-executed row has no denominator and no zero percentage. Preference rows report correct preferences, reversed preferences, and ties separately; a strict preference requires the designated candidate to score higher, and a tie fails when the task contract says so. Internal stable identifiers and source hashes remain in raw or secondary audit views rather than breaking the primary two-column table.

The report may contain development, diagnostic, or fresh rows, but each row names its regime. A fresh aggregate is never merged into a recurring development percentage. Current portfolio membership is generated from the typed research catalog and therefore can grow without revising this specification.

### Generated regression and examples

The repository owns a deterministic 4,096-case default metamorphic corpus built from 26 rotating templates in twelve structural groups. Cases use nonce entities, concepts, predicates, objects, places, and values rather than copied public benchmark rows. Meaning-preserving variants and meaning-changing controls exercise direct retrieval, class inference, Horn rules, open-world behavior, state replacement, temporal predecessor, possession, paraphrase, preference semantics, scalable Boolean entailment, and categorical logic.

The test suite and `/smoke` execute the same catalog without Language Agent assistance. `/examples [PAGE] [SEED]` displays 24 cases per page from that catalog. `/smoke [COUNT] [SEED]` executes the selected deterministic prefix or sampling contract and prints one actual input, expected result, and actual result per encountered template plus every failure and aggregate totals. Comparing expectations without invoking the runtime or fabricating displayed answers invalidates the smoke result.

Smoke proves regression preservation for authored templates. It does not establish external task selection, source validity, held-out generalization, or benchmark accuracy.

The default `evaluate` and `benchmark` repository suites are small authored integration fixtures. Their generated HTML
must show the case count, authored/internal regime, and `benchmarkComparable: false` beside any accuracy. A perfect
fixture score is useful executable sanity evidence, but it is never a headline public benchmark result.

### Grounded-failure and request-construction benchmark

Failure-time grounding and the adjacent DS022 request-construction route have an independent, frozen product benchmark.
Cases cover answerable, partially answerable, unanswerable, ambiguous, conflicting, malformed, typo/paraphrase,
multilingual, multi-KB, wrong-KB-distractor, summary, expansion, explanation, comparison, and document-shaping requests.
The pool is authored independently of the retrieval implementation and contains host-only expected answer support,
acceptable related-record sets, and construction obligations.

Scoring separates five layers:

1. **Primary result:** end-to-end answer correctness, status correctness, abstention calibration, proof validity, and
   unsupported-claim rate.
2. **Retrieval:** record or span recall@k, precision@k, ranking quality, contradiction/distractor rate, and search
   completeness calibration.
3. **Attribution for ordinary inability:** KB/version identity, citation validity, provenance reachability, derived
   witness validity, and the invariant that ordinary failure grounding never appears in answer provenance.
4. **Deterministic request construction:** explicit intent precision and recall, subrequest and dependency validity,
   output-contract adherence, selected-record relevance, citation coverage, unsupported-claim rate, and the invariant
   that the route remains `PARTIAL`. Only selected source claims may enter its provenance and `usedKbVersions`; the
   scorer checks that every rendered KB statement has such an attribution and that no uncited factual bridge appears.
5. **Optional downstream formulation:** a separately declared model receives only the structured bundle and visible
   question; its answer quality, citation use, unsupported claims, model configuration, latency, and cost are scored as
   an assisted generation track, never as deterministic ESLM inference.

Metamorphic controls rename entities and predicates, vary provider order, inject irrelevant high-overlap records,
remove the supporting KB, alter the requested relation, truncate search, force provider failure, and vary articles,
quantifiers, auxiliaries, request scaffolding, output formats, and named work profiles. They verify that grammatical
words such as `all` are not ordinary search topics, that metalinguistic requests can make them topical, that larger
completed profiles do not change semantics, and that approximated episode premises do not persist. A correct system
must preserve a truthful primary inability while returning useful related evidence when available and must distinguish
complete absence from incomplete search.

### Freeze before external comparison

Before a final comparison, freeze the symbolic commit, accepted KB versions, adapters, CNL and heuristic-catalog
versions, built-in strategy-catalog digest, exact strategy allowlists, configured arbiter identities and policies,
named work profile and overrides, coordinated stage-receipt digests, Language Agent opt-in policy, prompts and model
when an assisted track is included, seeds, scorers, memory policy, and prediction schema. A label-free export manifest
lets another system produce predictions. The local deterministic oracle joins by stable identifier, validates shape,
and counts omissions.

Results from final comparison do not feed patches into that frozen candidate. A later patch starts a new comparison version. Reports retain raw predictions and name model identity, quantization, prompt, context window, decoding, tools or retrieval, hardware, cost, and evidence regime.

### Comparison dimensions

The comparison matrix identifies both-correct, ESLM-only-correct, external-system-only-correct, and both-wrong subsets by language form, knowledge dependency, reasoning method, depth, ambiguity, and route. It also compares provenance coverage, trace validity, update locality, loaded knowledge, memory, latency, and honest failure.

The purpose is to locate the capability frontier. Symbolic strength on strict deduction does not imply unrestricted language or social plausibility. External-model strength on human prose does not reveal whether the difference is parsing, knowledge, or reasoning unless the symbolic route and intermediate evidence are separated.

## Decisions & Questions

### Question #1: When is comparison with an official or external score valid?

Response: Only when source version, split, visible evidence, prompt or adapter, answer normalization, grader, proof policy, tools, language route, and resource regime match. Otherwise the value is a named local diagnostic or contextual reference, not a direct leaderboard comparison.

### Question #2: Why does deterministic validation take precedence over a model judge?

Response: Semantic labels, values, constraints, paths, proofs, and assignments have reproducible validators. Adding a model judge would introduce a mutable authority and could hide whether the symbolic result actually satisfies the task.

### Question #3: What makes an impossibility or exception report valid?

Response: The report must identify the accepted input representation, prove that materially different oracle outcomes are indistinguishable under that representation or that the required oracle is unavailable, and show that no invariant method can separate them without new evidence or a changed task. Low accuracy, missing code, or a resource limit is an engineering gap, not an impossibility.

### Question #4: Can a formula or structured-adapter score be a real benchmark result?

Response: Yes, for the explicitly named solver, annotation, or adapter track. It is evidence that the projected task
and generic method execute correctly. It is not evidence that raw benchmark language was parsed end to end, so both
the input track and any independent language coverage must remain visible.

### Question #5: Why does a benchmark row summarize stage receipts instead of embedding one receipt?

Response: One benchmark row aggregates many case executions. One case receipt cannot describe that denominator.
Per-stage counts and a digest over the distinct canonical receipts preserve batch identity and completeness without
making the row unbounded; the underlying receipts remain the audit evidence. Configured arbiter identities are kept
separate because configuration alone is not execution.

## Conclusion

Evaluation maps the capability frontier through exact evidence regimes, route accounting, witnesses, and frozen comparisons. Dynamic results can change without rewriting the stable contracts that make those results interpretable.
