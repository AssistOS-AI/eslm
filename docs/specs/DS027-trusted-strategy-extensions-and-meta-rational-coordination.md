---
id: DS027
title: Trusted Strategy Extensions and Meta-Rational Coordination
status: in-progress
owner: architecture
summary: Defines statically trusted strategy extensions, typed stage boundaries, deterministic scheduling, bounded confidence voting, configuration profiles, receipts, and the separate compiler-side adapter pipeline.
---

# DS027 Trusted Strategy Extensions and Meta-Rational Coordination

## Introduction

ESLM has several places where one sound implementation is unlikely to remain the best implementation for every
language construction, knowledge source, retrieval problem, reasoning fragment, or output contract. Researchers need
to improve one place without editing an opaque central procedure, and product configurations need to select a reviewed
subset of alternatives without giving external data executable authority. This specification defines that extension
architecture.

A deployable ESLM strategy is one statically trusted implementation of a typed processing node. It is not a downloaded
package, a dynamically imported module, a callback stored in JSON, or code supplied by a KB. The host registers it
before processing begins, a versioned descriptor declares its boundary, and a deterministic coordinator invokes it
under an explicit finite profile. Declarative KBs, corpora, configuration values, and agent output remain inert data.

The architecture is **meta-rational** because it makes the choice among alternative strategies an explicit bounded
computation with evidence, costs, abstentions, and receipts. Meta-rational does not mean that a vote can establish
truth. Interpretation confidence may choose a parse hypothesis, relevance confidence may rank evidence, and planning
confidence may choose a plan. Only the declared reasoning semantics and its verifier may license an answer.

## Core Content

### 1. Authority, scope, and terminology

This specification is the authority for common strategy descriptors, static registration, stage scheduling,
configuration, resource allocation, voting, arbitration, receipts, extension lifecycle, and the boundary between
runtime strategies and compiler-side source adapters. Existing owner specifications remain authoritative for the
meaning inside a stage: DS003 and DS022 own language semantics, DS008 owns task planning and method selection, DS015
owns reasoning-method semantics, DS009 owns statuses and epistemic authority, DS014 owns document knowledge, and
DS019 through DS021 own physical compilation, routing, and memory.

A **processing node** is one typed operation in the directed runtime or compiler graph. It owns a stable input and
output envelope, semantic responsibility, resource boundary, failure contract, and receipt. A **strategy** is one
bounded implementation of a selectable processing node at one registered stage. A **strategy family** is a
review category such as predicate morphology, clause decomposition, active-KB frequency, safe Horn deduction, or
manual-table extraction. A **stage** is a typed boundary containing one or more nodes. A **coordination node** schedules
eligible strategies and combines candidate proposals under one versioned arbitration policy. A **candidate** is a
proposed interpretation, plan, evidence item, record, or presentation whose authority depends on its stage. A
**vote** is inspectable preference or support for one candidate under one declared confidence semantics. An
**authority gate** validates syntax, types, safety, schema, or a method witness and fails closed; it does not participate
in numeric arbitration. A **verifier** is the authority gate for a semantic claim or witness.

Only coordination nodes vote. A language proposal coordinator, request-plan coordinator, evidence-ranking
coordinator, or method-planning coordinator may compare typed candidates. A parser, safety gate, reasoning executor,
proof verifier, result validator, or package compiler is not a ballot. Reasoning executors return method results and
witnesses; after verification, an epistemic merge may combine agreeing evidence or preserve conflict, but it cannot
replace witness acceptance with confidence totals.

A strategy never calls another strategy directly. It may use small cohesive helpers that are part of its own reviewed
implementation, but every cross-strategy dependency and every cross-stage transition passes through the coordinator's
typed ledger. This rule prevents a nominally modular registry from hiding the old control flow inside callbacks.

### 2. Architectural boundary and present implementation baseline

Strategy executors are generic trusted code in `src`. Their descriptors and configuration are inert metadata validated
by trusted code. Domain facts, terminology, source relation systems, extraction evidence, and policy records remain in
KBs or source adapters under DS002. A strategy descriptor can name types and trusted operations; it cannot contain an
expression, import path, callback, prompt, source row, answer, or executable payload.

At the current checkpoint, ESLM has a working common foundation and several real gates, but not one complete
cross-stage strategy subsystem:

- `CapabilityRegistry` binds static reasoning-method descriptors to trusted callbacks, while the ordinary planner
  currently examines only a subset of descriptor fields and several active engine paths still dispatch explicitly;
- the 24 DS022 approximation families are statically registered executors and run through `StrategyRegistry` and the
  shared synchronous stage coordinator; their outputs still enter the established proposal lattice and
  candidate-voting arbiter rather than a complete cross-stage ledger;
- request analysis, grounding focus, relevance estimation, reasoning selection, and grounded result construction have
  exact strategy gates in `eslm-work-policy-v1`, but most remain `instrumented-local`: their existing bounded owner
  modules execute the work and emit local receipts rather than delegating execution to the common coordinator. Result
  construction is no longer one opaque responsibility: DS029 names a non-voting work coordinator, claim-admission
  gate, rhetorical-plan process, sentence-realization coordinator, and document-assembly coordinator;
- the ordinary English reasoning route now crosses closed `runtime.method.plan`, `runtime.reason.execute`, and
  `runtime.result.verify` owner envelopes. The verifier independently replays method-specific evidence under finite
  work and fails closed. These are real non-selectable `instrumented-local` seams, not shared-coordinator execution or
  a complete cross-stage ledger;
- `eslm-work-policy-v1` exposes exact shared limits and validates non-empty exact built-in allowlists by stage. It does
  not yet expose per-strategy resource dimensions, minima, maxima, weights, dependencies, or a unified pipeline
  execution receipt. Named presets are inventory views; exact allowlists are the execution control;
- document and public-source compilation use reviewed skills, adapters, canonical records, validators, and package
  gates, but no common compiler-strategy registry currently coordinates alternative extraction or standardization
  strategies.

These are implemented building blocks, not proof that the target architecture below is complete. Documentation and
benchmark reports must identify which stages actually use the shared registry and which still use their earlier
bounded coordinator until migration is finished.

The current `instrumented-local` request owner also performs one visible scheduling exception to the target stage
graph: after the direct attempt it checks explicit request force before running local approximation families. If a
request plan is accepted, it restores the incoming session snapshot and does not execute those language alternatives;
otherwise the normal interpretation-recovery eligibility decision follows. This ordering prevents an imperative from
committing source material as assertions. Migration into the common coordinator must preserve that observable safety
property and represent the request-force diagnostic as a typed stage transition rather than hiding it in an executor.

### 3. Canonical processing graph and dataflow

DS029 owns the exact nested-circuit, node, edge, packet, resource, and implementation-state catalog. This section owns
the shared strategy-coordination behavior inside eligible coordination nodes; it does not independently define another
topology. A catalogued `instrumented-local` or `planned` node is not evidence that the shared coordinator executes it.

The coordinator owns graph order. A strategy receives one immutable typed envelope and declared host services; it
returns one validated result envelope. It cannot mutate the input, global registry, session, KB catalog, work policy,
or another strategy's output. The coordinator appends accepted outputs, refusals, and resource use to a stage ledger
and makes only the arbitrated stage result visible to the next stage.

The runtime and compiler graphs are directed and acyclic for one request or build. Conditional edges may bypass
ineligible recovery or grounding nodes, and a bounded candidate may return to the direct parser through an explicit
reparse edge, but that edge creates a new immutable attempt rather than mutating an earlier node. Repeated search
inside a reasoning method is internal bounded algorithm state, not a control-flow cycle among processing nodes.

The runtime v1 stage catalog is ordered as follows:

| Stage ID | Typed input | Typed output and boundary |
|---|---|---|
| `runtime.language.interpret` | bounded text, prior session snapshot, English-only language policy | bounded English-likelihood assessment plus direct or proposed Semantic IR alternatives with source-span alignments; likely non-English input is rejected locally rather than repaired as English; the direct English parser remains a non-voting authority barrier, while local alternatives may be inspected after eligible statuses and selected without answer evidence; a direct success is superseded only by different accepted Semantic IR |
| `runtime.context.construct` | bounded likely-English visible request, selected immutable KB scope, and work policy | DS035 explicit and embedded basic-question analysis, prioritized self-question plan, typed focus, bounded provenance-bearing context frontier, per-source receipts, and completeness; the mandatory default strategy is `strategy:context:question-facet-expansion@1`; context has no interpretation, premise, proof, or answer authority and KB success cannot select language meaning |
| `runtime.request.plan` | bounded instruction/material map plus the direct diagnostic | task frame, ordered obligation alternatives, and output contracts; explicit request force may preempt an accidental direct assertion parse and restores the incoming session snapshot |
| `runtime.knowledge.focus` | task frame or obligation plan | typed entity, predicate, role, phrase, and metalinguistic focus candidates |
| `runtime.knowledge.retrieve` | focus, exact package scope, routing and work policy | bounded evidence frontier plus per-source search receipts |
| `runtime.evidence.assess` | task, evidence frontier, trust and provenance metadata | relevance votes, bridge hypotheses, conflict clusters, and a deterministic evidence ordering; no answer authority |
| `runtime.method.plan` | task, assessed evidence, registered method descriptors | applicable plan alternatives, precondition diagnostics, expected costs, and unresolved capabilities |
| `runtime.reason.execute` | one selected typed plan and its admitted evidence | semantic values or hypotheses, proof or method witness, resource use, and method-local gaps |
| `runtime.result.verify` | semantic values, original typed inputs, witnesses, and epistemic policy | independently accepted claims, rejected claims, conflicts, and verification gaps |
| `runtime.failure.ground` | an eligible inability result, typed focus, and an independently available grounding budget | the DS009 non-answer grounding bundle; this conditional stage never changes proof status |
| `runtime.result.construct` | verified claims or inability, request output contract, provenance, and optional grounding | a construction work order; non-voting admitted/rejected claim ledger; rhetorical section plan; evidence-aligned sentence ledger; document candidate; and independently validated `eslm-runtime-result-v1` content. Sentence strategies are source summary, lexical definition, typed fact, and defeasible relation. Assembly strategies are claim fusion, comparison bridge, explicit coverage gap, prose, sectioned document, outline, and table. Presentation confidence never adds factual authority. |

The DS013 Language Agent is logically one operator-side proposal strategy at `runtime.language.interpret`, with the
route-specific identities `strategy:language:external-translation-proposal@1` and
`strategy:language:external-simplification-proposal@1`. Translation is requested after the English-only gate rejects
likely non-English input; conservative English simplification is requested only after local English recovery remains
`UNPARSED`. Both identities name the proposal's role and receipt rather than two answer-capable executors. The external
executor remains outside the deployable deterministic registry and runtime closure because it is an operator
subprocess, but it does not form an unnamed stage between nodes. The general CLI composes this operator route by
explicit opt-in only; the default general CLI, library, and deployed profiles remain agent-free. Every candidate
returns through the same non-voting English parser and semantic gate. Neither identity receives the stage ledger nor
retrieval, reasoning, KB, proof, answer, or desired-value evidence, and neither has a vote or answer authority.
Model-declared alignments cannot verify their own open-class translation; acceptance requires an independent reviewed
source-language preservation profile, otherwise the proposal is rejected as `UNVERIFIED_NORMALIZATION` even when its
English target parses.

The compiler v1 stage catalog is separate because construction-time authority and resource regimes differ:

| Stage ID | Typed input | Typed output and boundary |
|---|---|---|
| `compiler.source.decode` | one DS016-frozen source and declared decoder profile | addressable normalized bytes plus a loss and repair receipt |
| `compiler.source.segment` | decoded bytes and structural metadata | hierarchy, spans, tables, lists, quotations, formulas, and unresolved layout |
| `compiler.knowledge.extract` | selected spans and source-local analysis | untrusted typed record candidates with exact span provenance and coverage gaps |
| `compiler.identity.resolve` | record candidates and declared alignment evidence | retained identities, explicit alternatives, and reviewed equivalence proposals |
| `compiler.record.standardize` | typed source candidates | DS005 canonical-record candidates without hidden source qualifiers |
| `compiler.record.validate` | canonical candidates and their complete source inventory | schema, reference, rule-safety, provenance, contradiction, and coverage receipts |
| `compiler.package.compile` | promoted canonical records and DS019 compiler profile | immutable package bytes, indexes, hashes, and canonical-equivalence receipts |

Runtime and compiler stages may reuse a pure generic helper, but they do not share authority. A successful extraction
vote cannot promote a record, and a compiled record cannot register an executor. Each pipeline has its own profile,
receipt, and release gate.

### 4. Implemented v1 descriptor and complete descriptor target

Every current catalog entry publishes the closed `eslm-strategy-descriptor-v1` envelope. Its exact implemented fields
are:

- `strategyId`, numeric-string `version`, and one allowlisted `stage`;
- non-empty `inputTypes` and `outputTypes`, plus bounded `preconditions` and `failureClasses`;
- `determinism`, which must be `deterministic` in the deployed registry;
- `epistemicRole`, `confidenceKind`, `witnessKind`, and `answerAuthority`;
- `costModel` and the work-policy `budgetKeys` the implementation consumes;
- `correlationGroup`, used to avoid counting several near-identical implementations as independent evidence;
- `configurationSchema`; and
- `implementationState` in `coordinated`, `instrumented-local`, or `planned`.

The following is a valid current descriptor, not pseudocode for a richer schema:

```json
{
  "format": "eslm-strategy-descriptor-v1",
  "strategyId": "strategy:language:predicate-agreement",
  "version": "1",
  "stage": "runtime.language.interpret",
  "inputTypes": ["type:bounded-surface-analysis"],
  "outputTypes": ["type:controlled-language-candidate"],
  "preconditions": ["precondition:visible-structural-cue"],
  "determinism": "deterministic",
  "epistemicRole": "interpretation-proposal",
  "confidenceKind": "confidence:language-interpretation",
  "costModel": "cost:bounded-edit-distance",
  "budgetKeys": ["budget:heuristic-proposals", "budget:heuristic-receipt-bytes"],
  "witnessKind": "witness:predicate-morphology",
  "answerAuthority": "none",
  "correlationGroup": "correlation:language:predicate-agreement",
  "configurationSchema": "strategy:language:predicate-agreement:config",
  "failureClasses": ["failure:ineligible", "failure:resource-limit", "failure:invalid-output"],
  "implementationState": "coordinated"
}
```

The executor is deliberately absent. Host construction binds a `coordinated` descriptor to an imported trusted
function. Unknown fields, duplicate exact identities, mismatched stages, non-deterministic declarations, malformed
types, or non-coordinated registrations reject. Descriptor and returned result data are copied, canonicalized, and
deep-frozen at the registry boundary.

The complete migration will publish `eslm-strategy-descriptor-v2`; it will not silently reinterpret v1. V2 adds the
strategy kind, effects, exact resource dimensions and ceilings, strategy/stage API versions, static dependencies,
conflicts, and implementation digest required by the full scheduler. Those fields are target requirements until the
v2 schema and validator exist.

A future v2 dependency grants no callback authority. It states that another exact strategy must be present and that
its validated result precedes this strategy. When a strategy consumes those prior results, its declared input types
include the stage-ledger view, and the coordinator supplies an immutable bounded subset containing only the declared
dependencies. The consumer cannot query arbitrary ledger entries or invoke the producer again.

### 5. Static registration and host services

The deployable registry is closed at runtime construction. Trusted entry points import a finite source-owned catalog
and call the registry with a descriptor and executor. Runtime input may select from those identities but cannot add an
identity, replace an executor, scan a directory, resolve an npm package, or supply a module path. There is no runtime
installation API.

Executors receive only the services declared by their stage, such as bounded token analysis, immutable task state,
exact index lookup, a method-specific allocator, or witness validation. They do not receive an ambient runtime object,
filesystem authority, network authority, process authority, secret-bearing environment access, mutable catalog, or
unbounded clock. Any future service is added to a versioned stage contract and subjected to the DS001 and DS009
closure audit.

Configuration and KB data may reference an exact registered strategy or method identity only in a field whose schema
permits that reference. Such a reference is an inert compatibility requirement or host selection request. It does not
register code, widen the selected profile, increase a budget, or bypass preconditions. Missing exact identities fail
configuration or package compatibility visibly.

### 6. Typed input, candidate identity, and output validation

Every stage envelope has a versioned schema, a canonical semantic digest, source references, policy identities, and
declared limits. Raw prose may enter only the language and compiler source stages. Later stages consume typed objects;
they must not repeatedly reinterpret one string under hidden local conventions.

A candidate has a stage-specific canonical identity. Language candidates use protected Semantic IR plus source-span
alignment, evidence candidates use complete semantic and provenance identity, plans use ordered typed nodes and
dependencies, and record candidates use canonical record identity plus source scope. Display strings, array order,
source row IDs, and strategy-local temporary IDs do not define equivalence.

The coordinator validates every returned envelope before another strategy or stage can observe it. Validation checks
schema, types, bounds, identity, provenance references, finite numbers, output bytes, allowed status, and stage-specific
safety invariants. An invalid output is quarantined, recorded as `invalid-output`, and has no vote or downstream
effect. Strategy exceptions are translated into bounded `failed` receipts; they never expose unbounded input or a
partial authoritative object.

### 7. Eligibility and deterministic canonical scheduling

For each stage, the coordinator performs these steps in order:

1. resolve and validate the exact strategy profile and work-policy snapshot;
2. select exact registered identities from the stage allowlist and reject missing or extra identities;
3. evaluate descriptor preconditions over the immutable typed stage state and record every ineligible strategy;
4. validate the selected dependency graph, conflicts, and mandatory safety or verification strategies;
5. compute all per-strategy allocations before execution;
6. schedule ready strategies by dependency depth, declared priority class, `strategyId`, and `strategyVersion`;
7. validate and append each result to the stage ledger;
8. run the versioned stage arbiter over the complete valid ledger; and
9. validate the selected stage output before advancing exactly one stage edge.

Registration order, JavaScript object insertion order, provider order, KB order, callback completion timing, and
filesystem order cannot affect this schedule. The v1 coordinator exposes two deliberately different execution APIs.
`runStrategyStage` snapshots the input and context, freezes one canonical allocation per selected identity, starts
every independent strategy with nonzero allocation before awaiting the stage barrier, and then serializes validated
results in canonical identity order. A rejection or invalid output is contained in that strategy's result while the
other started strategies continue. Zero-allocation entries return `resource-limit` without invoking their executor.
Its receipt has no timing or completion-order fields, so completion timing cannot become a semantic input.

`runStrategyStageSync` remains the sequential reference and executes the same canonical allocations one identity at
a time. The current deployed local-language path uses this synchronous API for all 24 approximation families and
therefore remains sequential until an explicit migration changes that owner. The asynchronous API is conforming only
because its semantic stage output and complete canonical receipt are byte-stable under completion-order inversion.
V1 still has no executable dependency graph; strategies that require ordered dependencies must wait for the v2
depth scheduler rather than relying on callback timing.

Stage barriers are explicit. The current local wrapper admits bounded interpretation proposals for direct `UNPARSED`,
`UNKNOWN`, `SOLVED`, and `PARTIAL`. A permissive parser can turn a repairable surface into a wrong unsupported frame or
flatten an explicit apposition or coordination while still reporting success. Candidate arbitration receives
parse-only Semantic IR and never downstream answer success. Direct `SOLVED` or `PARTIAL` is superseded only when an
accepted structural candidate has different Semantic IR; equal IR preserves the direct route, and changed IR is
query-local with qualified status. An explicit request-force plan may supersede an ordinary direct parse, but it
discards tentative direct episode state and cannot reinterpret source material as asserted knowledge. A
completed plan cannot invoke a retrieval strategy recursively; it creates a typed retrieval obligation for the next
stage. A reasoner cannot call realization, and a constructor cannot repair an invalid proof. Conditional failure
grounding runs only under DS009 eligibility and its separately reserved budget.

### 8. Shared and per-strategy resource allocation

Resource policy has three levels: the whole execution, one stage, and one strategy invocation. Dimensions are exact
count or byte measures where possible: input bytes, tokens, candidates, graph nodes, lookups, postings, decoded bytes,
facts, rule joins, solver nodes, proof bytes, output bytes, and receipts. Advisory elapsed-time or memory targets remain
identified as advisory under DS021.

The host reserves mandatory parser, safety, verification, and result-validation work first. Before execution it
derives one immutable `eslm-strategy-work-plan-v1` from the selected strategy profile, the existing named work-policy
snapshot, and every descriptor ceiling. That plan declares a shared ceiling for each stage, a minimum reservation and
maximum for each selected strategy, and an optional integer allocation weight. The coordinator distributes the finite
remainder before execution by deterministic largest-remainder allocation, breaking equal remainders by exact strategy
identity. Strategies in one correlation group still receive separate visible quotas; correlation affects voting,
not whether an implementation is tested. The derived plan cannot create work absent from its input work policy.

The sum of reservations and allocations cannot exceed the stage or execution ceiling. A descriptor ceiling cannot be
expanded by a profile. Unused quota is reported. It may move only to a later stage when the profile declares a
deterministic carry-forward rule; it cannot be granted opportunistically to a strategy that happened to execute first.
This prevents latency, callback order, or cache warmth from becoming semantic selection policy.

The implemented v1 invocation-slot plan is narrower but follows the same invariant: it creates and freezes every
per-strategy `{reserved}` budget in canonical identity order before either execution API invokes a strategy. The
asynchronous API shares no mutable remainder among running strategies. The synchronous API consumes the same frozen
plan, so neither mode can reward an executor for finishing first.

Budget exhaustion yields a result and receipt. An optional strategy may exhaust its quota while alternatives
continue, but the stage ledger becomes incomplete. Exhaustion of a mandatory gate or the shared stage budget fails the
stage closed and maps to the DS009 top-level status appropriate to that stage. No strategy silently disappears because
another strategy consumed the available work.

### 9. Implemented v1 result, vote, and execution receipt

Every selected coordinated strategy has one closed `eslm-strategy-result-v1` entry. The implemented v1 fields are
`format`, `strategyId`, `strategyVersion`, `stage`, `status`, optional `confidence`, `confidenceKind`,
`correlationGroup`, either canonical bounded `output` or bounded `reason`, `work.reserved`, `work.consumed`, and
`truthAuthorized`. Status is one of `completed`, `abstained`, `ineligible`, `resource-limit`, `failed`, or
`invalid-output`. The coordinator canonicalizes and deep-freezes the result, rejects cycles and non-JSON or oversized
output, contains executor exceptions in a bounded failed result, and rejects changed reservations. Only a completed
registered verifier may set `truthAuthorized`; an arbitration tie clears final truth authority.

The following is a valid current result:

```json
{
  "format": "eslm-strategy-result-v1",
  "strategyId": "strategy:retrieval:typed-answer-bridge",
  "strategyVersion": "1",
  "stage": "runtime.evidence.assess",
  "status": "completed",
  "confidence": 0.72,
  "confidenceKind": "confidence:retrieval-relevance",
  "correlationGroup": "correlation:retrieval:typed-answer-bridge",
  "output": {"candidateId": "candidate:17"},
  "work": {"reserved": 1, "consumed": 1},
  "truthAuthorized": false
}
```

The complete ledger will use `eslm-strategy-result-v2`; v1 is not reinterpreted. V2 adds input, configuration, and
implementation digests; typed output and witness references; typed support, oppose, and abstain votes; exact
multi-dimensional resource allocation/use; completeness; and bounded diagnostics. A strategy omitted by an exact
allowlist has no result entry and appears as excluded only in the separate inventory.

A vote contains candidate identity, direction `support`, `oppose`, or `abstain`, a finite normalized magnitude, a
reason code, feature or premise references, correlation group, and the confidence kind declared by the descriptor.
A strategy cannot label its own score `truth`, `probability-of-correct-answer`, or another stronger meaning unless a
method specification defines that exact epistemic quantity and an independent verifier accepts its witness.

The implemented stage-scoped `eslm-strategy-execution-receipt-v1` records stage, maximum, consumed and remaining work,
canonical selected identities, every v1 result, correlation-aware arbitration, and completeness. Its work unit is a
coordinator invocation slot; owner-specific token, edit-distance, lookup, byte, or proof work remains in the owning
bounded receipt. The complete pipeline receipt will be `eslm-strategy-execution-receipt-v2`, with pipeline and
stage-contract versions, registry/profile/work/work-plan/input/implementation digests, package identities, canonical
cross-stage order, eligibility and dependency decisions, typed multi-dimensional allocations and use, carry-forward,
vetoes, incomplete frontiers, arbiter identity, and final status mapping.

Receipts are bounded and may summarize repetitive detail, but truncation is explicit and preserves counts, digests,
omitted strategy identities, and the reason. A human inventory may condense the ledger; machine JSON remains the
authority. A registry inventory separately shows registered, selected, applicable, executed, declined, failed, and
budget-truncated strategies per stage.

### 10. Meta-rational arbitration at coordination nodes

Arbitration is a trusted coordination-node operation with its own versioned policy. It receives only validated strategy results
from one stage and cannot inspect expected answers, benchmark identity, source rows, or downstream success. Safety and
type gates run before numeric arbitration and act as vetoes, not weak negative votes.

The implemented generic v1 arbiter groups completed results by byte-stable canonical JSON output. For candidate `c`
and correlation groups `G(c)`, its exact support is
`support(c) = sum over g in G(c) of max(confidence(r))` for completed results `r` in group `g` whose output is `c`;
missing confidence is zero. Candidates sort by descending support and then canonical output only for stable
serialization. Equal top support sets `ambiguous: true`; an ambiguous arbitration never authorizes truth. There is no
v1 opposition, weight, threshold, margin, probability, or truth conversion. This generic arbiter is useful for the
coordinator scaffold and nonce tests. The coordinated language families defer actual composite-edit integration to
the DS022 proposal lattice and candidate voter, so their stage receipt must be read as executor accounting rather than
as the chosen final interpretation.

Concurrency is not corroboration. Starting two executors together, reserving more work, or consuming more work never
raises candidate confidence. Support comes only from the typed evidence carried by validated results, with dependent
or copied techniques collapsed by `correlationGroup`; genuinely independent correlation groups may contribute
separate support only under the declared stage confidence semantics.

The complete v2 arbiters are stage-specific. Their frozen policies may combine declared profile weights, support,
opposition, semantic-risk penalties, coverage, and abstentions, but each must publish the exact equation, threshold,
winning margin, correlation policy, and ambiguity rule before it becomes an execution authority. A tie or insufficient
margin yields ambiguity or a stage gap. Lexicographic order never resolves semantic truth.

Different stages may require different arbiters, but each follows the same invariants:

- language arbitration compares protected semantic interpretations, not answer success;
- request arbitration preserves all independently requested obligations rather than electing one popular intent;
- focus and relevance arbitration rank retrieval work and never authorize a premise;
- evidence aggregation preserves contradictions, contexts, provenance, and epistemic strength;
- method planning compares applicability and declared cost, while DS015 retains the semantics of each executor;
- reasoning executors return results and witnesses rather than confidence votes; verified results are merged only
  through an epistemically defined policy after independent witness checks;
- construction arbitration may choose format and coverage but cannot add an unsupported factual claim.

An arbiter may itself be replaceable for research only as a statically registered trusted implementation with a
frozen policy, identical typed boundary, ablation suite, and profile identity. An arbiter cannot vote for itself or
learn weights during deployed execution.

### 11. Confidence, proof, and reasoning strategies

Confidence is typed. At minimum the architecture distinguishes interpretation confidence, request-plan preference,
retrieval relevance, method applicability, defeasible support, extraction confidence, and calibration confidence.
These numbers are not interchangeable and cannot be compared or averaged without an explicitly specified conversion.

Reasoning methods are strategies at `runtime.reason.execute`, but their existing `methodId` and DS015 semantic
contracts remain authoritative. A strategy descriptor exposes scheduling and resource metadata around the method; it
does not rename, weaken, or replace the method descriptor. The planner may run several applicable methods when the
profile permits. Their outputs are combined as follows:

- one independently verified strict proof may support `SOLVED` under its declared soundness and task/output contract;
- several agreeing strict proofs merge provenance and witnesses, not confidence points;
- an agreeing defeasible result cannot be laundered into strict truth by majority or by one strict source;
- verified strict disagreement is a conflict requiring DS009 handling, not a weighted average;
- an unverified, resource-limited, or inapplicable method has no answer vote;
- absence of proof under an incomplete method or frontier is not proof of falsehood.

Method completeness is required when a result interprets an exhausted search as absence or a complete decision. It is
not required merely to accept a positive proof that an independently verified sound method actually produced.

Where a method currently lacks an independent witness verifier, its descriptor and result must say so, and the
documentation must not claim verified strategy consensus. Adding a registry wrapper does not improve a method's
soundness, completeness, or proof status.

### 12. Compiler-side knowledge-acquisition strategies

Knowledge acquisition uses the same descriptor discipline but a separate compiler registry and trust closure.
Source-family strategies may handle manuals, technical documentation, ontologies, lexical resources, event graphs,
tables, structured APIs, or already-canonical records. Their purpose is to expose source-specific interpretation while
converging on the same DS005 canonical record model and DS006/DS019 package gates.

Every compiler strategy declares media and schema preconditions, source language, hierarchy and span handling, output
record types, qualifier preservation, confidence policy, coverage accounting, resource bounds, and failure classes.
Multiple extraction strategies may propose the same canonical candidate. Their votes may prioritize review or raise
confidence in an extraction proposal, but they cannot establish that a source claim is true, erase an incompatible
claim, or promote a candidate. Every accepted record still needs exact frozen-source provenance, canonical validation,
reference closure, rule safety, contradiction review, and explicit promotion.

Standardization is not flattening. A manual procedure, ontology edge, dictionary sense, event tuple, or table cell may
share generic record primitives while retaining source-specific context, modality, role, validity, and epistemic
status. If the canonical schema cannot preserve a meaning, the strategy returns a typed coverage gap or a reviewed
schema/core proposal; it does not hide the qualifier in a predicate spelling.

An isolated Coding Agent or external model may be a training-time proposal source under DS004, DS007, and DS009. It is
not a deployable strategy executor. Its output enters `compiler.knowledge.extract` as untrusted candidate data and must
pass the same local validators and promotion gates as every deterministic extractor.

### 13. Strategy profiles and per-system configuration

An `eslm-strategy-profile-v1` selects exact strategy identities by stage and records one exact arbiter per voting stage,
semantic thresholds, correlation weights, closed strategy options, mandatory gates, and compatibility versions. The
profile is canonicalized and hashed. A product or domain deployment may choose only the strategies relevant to its
language, source types, evidence policy, and reasoning needs.

Strategy selection and work allocation are different controls. The strategy profile changes which reviewed semantics
and alternatives participate, so changing it can legitimately change a result and must be treated as a configuration
identity. `eslm-work-policy-v1` changes finite work within that selection and must preserve semantics for completed
equivalent frontiers. The resolved `eslm-strategy-work-plan-v1` makes the resulting stage and per-strategy allocations
explicit. A combined execution receipt records all three digests.

Profiles use allowlisted identifiers and closed option schemas. They cannot name files, URLs, packages, environment
variables, code strings, callbacks, commands, or unknown keys. A selected strategy that is absent, has the wrong exact
version, violates a conflict rule, lacks a dependency, or cannot satisfy a mandatory stage fails profile validation
before the question or build begins. The host does not silently replace it with a similarly named strategy.

A KB or source manifest may declare strategy compatibility or a recommendation only when its versioned schema permits
that field. The host's selected profile remains the authority. Untrusted input cannot enable a disabled strategy,
alter weights or thresholds, request more work, or disable a verifier. Interactive and CLI controls may inspect and
select prevalidated profiles; arbitrary inline executor definitions are prohibited.

### 14. Failure semantics and containment

Strategy statuses remain inside their receipt and map to the existing DS009 result statuses. They do not create an
unbounded new public status vocabulary. The owning stage defines the mapping: inability to produce Semantic IR is
`UNPARSED`; unresolved close interpretations are `AMBIGUOUS`; no reasoning method after complete applicability analysis
is `NO_APPLICABLE_METHOD`; missing premises are `MISSING_KNOWLEDGE`; exhausted mandatory work is `RESOURCE_LIMIT`; and
failed construction of an internally derived value may be `UNSUPPORTED_OUTPUT`.

An optional strategy exception, invalid output, or local resource limit is contained, recorded, and cannot contribute
a candidate. Other independent strategies may continue when the stage and shared budget remain valid. The stage
receipt becomes incomplete. A mandatory parser, safety gate, source validator, proof verifier, or package compiler
failure stops that stage. The coordinator never converts a crash into an abstention, deletes the failed strategy from
the inventory, or treats the surviving plurality as complete consensus.

If all selected strategies abstain, the stage returns the stage-specific gap with the complete abstention receipt. If
valid candidates conflict, the arbiter preserves alternatives and returns ambiguity or conflict. If the profile omits
the only capable strategy, the receipt identifies a configuration capability gap; it does not claim missing knowledge.

### 15. Extension, research, promotion, and retirement lifecycle

A strategy advances through these gates:

1. document a generic typed problem and show that the existing strategy set cannot express it cleanly;
2. develop an isolated candidate with no runtime registration authority;
3. pass the DS002 rename test and the Core Change Guardian forbidden-dispatch audit;
4. publish descriptor, implementation, validator, resource bounds, receipts, and focused positive and negative tests;
5. add nonce, reordering, irrelevant-evidence, meaning-changing, security, invalid-output, and budget tests;
6. register it statically in a non-default research profile and compare it with the current baseline and ablations;
7. validate calibration, receipt truthfulness, full regressions, and the protected evaluation layer owned by DS026;
8. promote it into a product profile through an explicit review; and
9. retire or supersede it with a migration receipt when evidence favors another strategy.

Runtime observations may identify failure clusters and produce offline proposals. Deployed execution never creates a
new strategy, changes a weight, mutates a threshold, rewrites a descriptor, or promotes itself. DS023 through DS026 are
organized as strategy research programs: relevance and answer bridges, scope-safe decomposition, verified planning and
synthesis, and grounded product evaluation can evolve independently while sharing this control plane.

### 16. Compatibility and migration

The initial refactor has no obligation to preserve undocumented internal callback shapes, registration order, or
local heuristic receipt formats. It must migrate the repository atomically: callers, tests, documentation, built-in
profiles, and published result validators change together. It cannot silently reinterpret an existing public field.

After a strategy protocol is published, a semantic change creates a new `strategyVersion`; a descriptor-schema or
stage-envelope change creates a new protocol or stage-contract version. Old and new implementations may coexist under
different exact identities while a profile migration is tested. Compatibility aliases are explicit inert mappings
with deprecation receipts, never hidden fallback. A removed strategy makes a profile invalid until that profile is
migrated.

If a KB, plan, or adapter metadata references a strategy or method identity, migration either preserves that exact
implementation or rewrites the declarative reference through a deterministic audited transform. Package identity and
canonical records are not mutated in place. A change that affects benchmark behavior invalidates or dates the relevant
execution receipts under DS010 and DS017.

### 17. Testing, evaluation, and falsification

Every registry and coordinator implementation requires tests for descriptor rejection, duplicate identities, missing
dependencies, dependency cycles, stage mismatch, unknown configuration, disabled executors, invalid output, bounded
exception diagnostics, mandatory-gate failure, and exact profile replay. Registration-order, strategy-order,
provider-order, KB-order, and completion-order permutations must produce equal semantic outputs and canonical receipts.
For the asynchronous v1 API, a closed test barrier must observe every funded independent executor as started before
any executor is released. Reversing the release and completion order must produce an identical receipt, while the
test's out-of-band completion trace proves that the two schedules actually differed. Receipts contain no timing fields.

Voting tests include duplicate correlated strategies, one adversarial overconfident strategy, unanimous abstention,
support/opposition ties, a safety veto, small-margin ambiguity, independent corroboration, and receipt truncation.
Resource tests prove fair preallocation, hard descriptor ceilings, no silent starvation, deterministic carry-forward,
and `RESOURCE_LIMIT` rather than a fabricated complete result.

Stage-specific tests retain their owner contracts. Language uses protected operators and alternate Semantic IR.
Retrieval compares exhaustive versus routed frontiers and common-word distractors. Reasoning independently verifies
proofs and countermodels. Construction checks one support edge per factual claim. Compiler strategies use frozen spans,
coverage accounting, canonical validation, eager/lazy equivalence, and source-family negative controls.

Every promoted strategy is ablated on the same frozen inputs. Reports show per-strategy applicability, execution,
confidence calibration, incremental benefit, conflicts, resources, and end-to-end effect. Architecture completion is
falsified if behavior depends on registration order, if copied strategies multiply confidence, if a popular answer
overrides a failed proof, if a KB can select code, if a strategy disappears on exhaustion, or if a researcher cannot
reconstruct the stage decision from the receipt.

The deterministic generated heuristic development benchmark is the default broad diagnostic for the coordinated
language stage. Its 1,200-case default run instantiates 43 reviewed shapes across 18 domains with nonce variation; this
gives wide repeated execution but not 1,200 independent constructions. The default receipt records 1,200 unique
surface inputs, 28 observed target families, eight oracle levels, and 593 of the 774 possible declared
technique-by-domain cells; those are diversity measures, not proof of independent structures or domain semantics. It
freezes the generator, suite, behavior, work-policy, and strategy-catalog identity and aggregates outcomes by
generating technique, domain, intended target
family, oracle level, route, status, confidence, resource outcome, and earliest failure. Those labels organize
analysis; they are not executor inputs. A promotion claim still requires an explicit baseline-versus-ablation run
under the same suite identity, because merely listing a
strategy in the batch configuration does not prove that it executed or contributed on each case.

The report's eight oracle levels span `answer-execution`, `semantic-query-execution`, `candidate-selection`,
`query-local-decomposition`, `request-execution`, `request-planning`, `safety-abstention`, and `proposal-only`
operator preservation. Semantic-query execution requires the complete expected relation-shaped query to execute even
when absent knowledge leaves the final status `UNKNOWN`; it is therefore stronger than selecting a structurally useful
candidate. Request planning requires the ordered obligations and honest missing-source gaps without requiring a
constructed artifact; both levels validate the intent, artifact kind, and format of every ordered obligation. Request
execution additionally requires the construction route and composite response shape. Candidate
selection requires the exact intended
structural candidate to win, carry its required family, receive a matching accepted parse-only reparse, and execute as
the query-local interpreted episode under the declared route and status. It does not establish a complete
relation-shaped query and can terminate `UNKNOWN` with `missingEntity`. Their aggregates keep those evidence levels
separate. A
strategy-family proposal pass with final `UNPARSED` establishes reach and safety, not successful language execution;
the top-level mixed contract rate never overrides that distinction.

Failure-guided strategy development begins from repeated clusters. A researcher identifies a typed stage boundary and
generic precondition shared by the cluster, implements or adjusts one strategy, adds renamed and meaning-changing
controls, and reruns both the fixed seed and another deterministic seed. The report retains bounded representative
failures for review while every case remains in aggregate accounting. A favorable project-owned generated result is
development evidence, not a substitute for the protected product evaluation in DS026 or public evidence in DS010.

### 18. Target acceptance boundary

The architecture is implemented, rather than merely specified, only when all of the following are true:

- one shared validated registry and coordinator own the declared runtime extension points;
- language families, request analysis, query focus, relevance signals, current reasoning methods, and result
  construction expose strategy identities and bounded results through that coordinator;
- compiler-side source strategies converge through the canonical validator without sharing deployed authority;
- built-in product profiles select exact strategies, arbiters, options, and per-strategy work allocations;
- result accounting exposes the registry/profile/work digests and complete bounded stage receipt;
- CLI or library inspection shows registered, selected, eligible, executed, abstained, failed, and truncated strategies;
- genericity, security, determinism, vote, budget, method-verification, package, regression, and documentation checks
  pass; and
- post-refactor benchmarks are rerun under frozen profiles and reported without carrying stale receipts forward.

Until those gates pass, a shared registry module or a descriptor attached to one legacy path is architectural progress,
not completion of the strategy system.

## Decisions & Questions

### Question #1: Why is the primary abstraction a processing node with strategies?

Response: A processing node names the stable architectural responsibility and protocol; a strategy names one reviewed
implementation of that responsibility. This keeps the dataflow intelligible while allowing controlled alternatives,
ablation, and research. Every strategy remains statically imported, reviewed, typed, bounded, and visible in one
canonical registry, so external data never acquires executable authority.

### Question #2: Why may strategies vote if voting cannot establish truth?

Response: Several language, retrieval, and planning techniques provide partial evidence about which hypothesis is
worth executing. Combining independent evidence can improve selection and calibration. Truth has a different contract:
a registered method must derive a claim under declared semantics and a verifier must accept its witness. Keeping the
two layers distinct permits useful meta-reasoning without replacing proof with popularity.

Voting occurs only at coordination nodes whose declared output is a candidate choice or ranking. A reasoning executor
does not cast a truth vote, and a safety or proof gate cannot be outvoted.

### Question #3: Why does the coordinator allocate resources before executing strategies?

Response: Opportunistic allocation makes early callbacks, cache warmth, or registration order decide which research
ideas receive work. Preallocation gives every selected eligible strategy a visible bounded opportunity, reserves
mandatory safety and verification, and makes ablations and profile comparisons reproducible.

### Question #4: May a domain KB choose its preferred strategies?

Response: A package may declare exact compatibility or recommendations in validated inert metadata, but the host
profile remains authoritative. This lets specialized systems choose a reviewed ensemble without allowing a document,
ontology, or downloaded package to enable code, increase resources, or disable verification.

### Question #5: Why are compiler-side source adapters part of the same design but a separate registry?

Response: Both problems benefit from typed alternatives, confidence, budgets, receipts, and ablations. Their authority
is different. Compiler strategies transform frozen untrusted evidence into untrusted record candidates before
promotion; runtime strategies operate only on registered packages and accepted task state. Separate registries prevent
an extraction tool or Coding Agent from entering deployed inference.

### Question #6: Can a researcher replace the arbiter?

Response: Yes, through a statically registered, versioned research arbiter with the same typed boundary, frozen policy,
resource contract, negative controls, and explicit profile selection. It cannot be injected at runtime, inspect gold
answers, learn during deployment, or bypass safety vetoes and witness verification.

### Question #7: Does the initial refactor preserve backward compatibility?

Response: No compatibility requirement applies to undocumented internal APIs at this checkpoint. The refactor should
remove redundant local control planes rather than retain them indefinitely. Public versioned protocols, package
identities, and published receipts still require explicit version changes or deterministic migration; “no backward
compatibility” is not permission for silent semantic reinterpretation.

### Question #8: What does the generated heuristic benchmark prove about a strategy?

Response: It shows how the selected strategy configuration behaves over a reproducible, varied, project-owned
language distribution and exposes collective failure patterns. It does not by itself isolate one strategy's causal
contribution. Causal promotion evidence requires a frozen ablation with equal cases, work policy, oracle, and behavior
identity, followed by the protected and external evaluation layers appropriate to the claimed capability.
Candidate-selection success inside that report proves only the declared structural selection contract; it does not
prove that a full relational Semantic IR or answer was produced.

### Question #9: Is the external Language Agent part of the default strategy profile?

Response: No. Its identities describe the optional proposal route and receipt at the language node, but its executor
remains outside the deployable registry and the local default profile. Only explicit operator opt-in composes that
wrapper. A gray recommendation after local `UNPARSED` is presentation metadata, not strategy selection or execution.

## Conclusion

ESLM's logical architecture is a visible directed graph of typed, bounded processing nodes rather than a set of hidden
callbacks. Researchers can improve one node through a reviewed strategy, compare alternatives where coordination is
meaningful, allocate finite work, and inspect the decision that selected a candidate. Product profiles can choose an
exact ensemble. Authority gates remain non-voting, declarative knowledge and source data remain non-executable,
confidence remains distinct from truth, and every stage transition remains reproducible from a canonical schedule and
receipt.
