---
id: DS029
title: Hierarchical Processing Circuits and Packet Contracts
status: in-progress
owner: architecture
summary: Defines the exact hierarchical processing-node catalog, typed packet boundaries, exceptional edges, resources, and authority rules that make ESLM execution and research inspectable.
---

# DS029 Hierarchical Processing Circuits and Packet Contracts

## Introduction

ESLM is best understood as a hierarchical, typed processing graph. A request does not pass through an opaque solver,
and the architecture is not a collection of interchangeable callbacks. Stable processing nodes own distinct
responsibilities; reviewed strategies offer alternative implementations only where selection is meaningful; immutable
packets carry named state; resource ledgers bound work; and non-voting authority gates accept, reject, or qualify an
effect. Nested circuits let a reader zoom from the complete request cycle into language recovery, evidence acquisition,
reasoning, verification, construction, compilation, or research without changing the underlying model.

This specification is the authority for the v1 processing-circuit vocabulary and topology invariants. DS027 owns the
strategy descriptor, registry, coordinator, work-plan, vote, and execution-receipt contracts. DS028 owns dataset-guided
hypothesis discovery and promotion evidence. This specification connects those contracts through exact node, circuit,
edge, packet, resource, and authority boundaries. It does not claim that every catalogued node already executes through
the shared coordinator.

## Core Content

### 1. The architectural model

The closest precise model is a **hierarchical typed dataflow DAG with guarded exceptional and rollback transitions**.
“Circuit” is useful intuition because outputs feed named downstream responsibilities, but it must not imply electrical
continuity, uncontrolled feedback, or concurrent mutation. For one request or compiler transaction, normal data and
authority edges form a finite directed acyclic execution. Exceptional and rollback edges return typed gaps or restore a
host-owned snapshot; they do not create an unbounded loop. Repeated requests create new graph instances.

The graph explorer has five complementary semantic camera positions:

1. **System view** exposes only runtime request processing, knowledge build, and inert graph-discovery research. The
   three planes are vertical rows with their own real `IN → plane → OUT` contracts. Runtime answers a caller, build
   publishes immutable declarative packages, and research emits non-executable proposals for manual review; no
   cross-plane execution edge is invented.
2. **Circuit view** exposes only the selected circuit's immediate child circuits and direct processing nodes. Typed
   catalog edges are aggregated between the components visible at that depth. When siblings have no direct edge, each
   is shown as a separate vertical `IN → component → OUT` module with its own real exterior boundary contract,
   regardless of how many such siblings exist. The view says why the modules are separate.
3. **Processing-node view** exposes one stable responsibility and its attached strategy families or direct exact
   strategies. If no strategy is registered, the solid input/output line is the node's own packet contract rather than
   a fictitious implementation envelope.
4. **Strategy-family view** exposes one real catalog family and at most six exact reviewed alternatives per page.
   Family membership does not imply that every member executes or has answer authority.
5. **Exact-strategy view** exposes one reviewed implementation contract, its confidence and correlation meanings,
   budget, preconditions, failures, witness, answer authority, implementation state, and every processing node that
   reuses it.

The selected-component header spells out color-coded immediate-circuit, scoped-node, and scoped-strategy counts and
uses the same five role icons as the graph. Individual cards retain compact `C / N / S` structure and role counts.
Every card and every real boundary rail has a separate `i` control whose plain-English explanation names the component,
the concrete action, the reason for the boundary, the exact typed packet, the upstream or downstream responsibility,
and the authority limit. Complete contracts appear only in that in-graph overlay, not in a repeated block below a leaf.
An exterior endpoint is typed visually as a human actor, software container or application, or combined CLI
operator/library client. It is terminal and non-navigable, and its information panel explains the concrete external
operation. Only a rail backed by exactly one adjacent catalog node shows a navigation arrow and opens
that node's real breadcrumb. A family or strategy owner-envelope rail may similarly navigate to its exact owner node.
The breadcrumb is integrated into this selected-component header and is the only visible ancestor-navigation control.
It is also the component identity row: each path item carries its semantic-level or processing-role icon, with no
separate type caption or duplicated current-component title. Separate home and back buttons are not rendered. The
short context over the graph states the exact component's
responsibility, transformation or decision, and useful result rather than restating arrow or layout notation.
Packet, witness, precondition, and strategy labels in this human-facing surface remove trailing protocol revisions
such as `v1` and selector versions such as `@1.0.0`. Exact versioned identities remain unchanged in the descriptive
catalog and generated validation projection; the explorer presents the stable concept without repeating revision
metadata throughout cards, rails, hover labels, or information prose.

Cards grow and shrink between explicit minimum and maximum widths. Connected desktop layouts place the `IN` rail,
every internal component, and the `OUT` rail on one equal-track grid. Center intervals and visible edge-to-edge gaps
must be equal across the complete row rather than changing beside the boundary rails. Crowded rows increase one
shared horizontal inset for every box, including IN and OUT, until a visible minimum arrow segment is restored; box
width reduction is uniform rather than node-specific. Narrow layouts use one legible
central column. Boundary rails remain at the appropriate outer edges. Every view has both sides: when a source has no
catalog predecessor, its input rail names the concrete actor or software system supplying the admitted representation;
when a sink has no catalog successor, its output rail names the concrete recipient. Such rails are terminal exterior
interactions, not fabricated processing nodes.
On a crowded connected desktop row, the renderer uses three repeating safe vertical lanes. The first eligible card is
placed at the highest safe position below the context label, the second at the lowest safe position above the stage
edge, and the third midway between those limits; subsequent cards repeat top, bottom, and middle. Exactly three cards
instead use top, bottom, and top, while two cards use top and bottom. The middle lane begins only when at least four
cards are visible. This visual
distribution reduces line-on-box overlap without changing horizontal tracks, graph topology, or execution order. A
manual drag replaces the automatic lane for that card and changes only its vertical position.
Each edge uses one independent monotonic cubic Bézier curve directly between its source and target. Both control
points remain inside the source-to-target span, so the line cannot reverse into a loop and the arrowhead receives a
stable incoming tangent. The renderer does not merge lines into shared corridors, search alternative arcs, or add
intermediate route points, rectangular elbows, or right-angle turns. Safe vertical lanes and vertical drag reduce
incidental line-on-box overlap. Source, target, direction, packet aggregation, and edge semantics remain unchanged.
Typed catalog flow is solid green, circuit-boundary flow is solid blue, an implementation envelope is dashed orange,
and opposed aggregate paths are solid purple. Drawn paths, arrowhead markers, and the guide-dialog legend use the same four
visibly distinct encodings. Opposed aggregate arrows occupy separate nearby lanes. The graph viewport does not use horizontal or vertical scrolling or
optical scaling; only a long information overlay may scroll internally. Breadcrumbs retain the complete ancestor path,
so a reader can move into as many nested levels as the catalog defines and return without losing orientation.
Containment is a catalog/navigation relation explained in the guide dialog, not an executable pseudo-node or arrow.
Every component has a bounded vertical drag handle, and connected paths follow it. In a parallel-alternative view the
component snaps into a new non-overlapping vertical order on release, preserving the meaning of fan-out and fan-in.
Completeness means that every exact circuit, node, strategy attachment, and edge remains reachable and
source-synchronized; it does not mean that the browser renders the full inventory simultaneously. The dedicated static
catalog remains the exhaustive audit view. A page that says “processing node” without making its input, output,
authority, work, and failure boundary reachable is incomplete engineering documentation.

Opposed arrows between two visible aggregate circuit cards do not by themselves assert a graph cycle. The explorer
may aggregate distinct exact node paths whose circuit memberships cross the same group boundary in opposite directions,
as request/session work gates enable language recovery before language diagnostics and interpretation return to later
request planning. The catalog must still contain no exact reciprocal node pair, and its normal data and authority paths
must remain acyclic. Such a projection uses nearby directed lanes, line hover details for every exact edge, and a legend
entry that says explicitly that the aggregate opposition is not an exact cycle. Its purple color distinguishes that
aggregate visual condition from an ordinary green catalog packet path; color never creates a new edge kind.

### 2. Five node kinds

Every catalog entry has exactly one kind:

- `source` introduces a bounded, validated host input and never votes;
- `process` performs one deterministic transformation or method execution and never arbitrates alternatives;
- `coordinator` is the only kind that may compare strategy candidates or votes;
- `authority-gate` checks an invariant and cannot be outvoted; and
- `sink` emits one immutable artifact after all required authority decisions.

One node owns one stable responsibility. Alternative algorithms under that responsibility are strategies, not new
nodes. A distinct node is justified only when it has a different typed input/output boundary, authority, state effect,
failure vocabulary, or resource owner. Decorative wrappers, source-family names, benchmark-specific solvers, and nodes
that mix interpretation, retrieval, proof, and presentation are rejected.

The exact v1 voting inventory contains eleven coordinators. Runtime voting is limited to
`language-proposal-coordinator`, `interpretation-arbiter`, `request-plan-coordinator`,
`knowledge-focus-coordinator`, `evidence-assessment-coordinator`, `method-plan-coordinator`, and
the separate `sentence-realization-coordinator` and `document-assembly-coordinator`.
`result-construction-coordinator` schedules the construction boundary but does not vote. Compiler voting is limited to `knowledge-extraction-coordinator` and
`identity-resolution-coordinator`. Research voting is limited to `hypothesis-coordinator`. Compiler and research votes
rank untrusted build or research candidates only; they grant no runtime, answer, proof, package, or promotion authority.
No source, deterministic process, authority gate, method executor, or sink votes. A vote ranks a candidate according to
a declared confidence kind. A gate produces an authority decision, never a low-confidence vote. Only the
witness-verification gate may emit `verified-only` answer authority, and even that decision authorizes only the verified
claims named by its witness receipt.

### 3. Closed v1 node descriptor

One catalogued node is a closed record containing:

- `nodeId`, human label, owning `circuitId`, and node kind;
- exact DS027 `stageRef`, or `null` only for a reviewed host seam or research boundary without a DS027 stage;
- one responsibility statement and a conceptual implementation owner;
- sorted input and output packet types;
- authority kind and implementation state;
- exact strategy identities and strategy-family identities associated with the node;
- independently metered resource dimensions;
- `canVote` and answer-authority declarations; and
- exact normal and exceptional edge identities.

Implementation state is one of `coordinated`, `instrumented-local`, or `planned`. `coordinated` means the shared
registry and coordinator execute the node's selected strategies and emit the common receipt. `instrumented-local`
means a real bounded implementation exists behind the named seam but has not completed shared-coordinator migration.
`planned` means the responsibility is specified or catalogued without a current executable product path. Catalog
presence never implies execution, selection support, benchmark coverage, or promotion.

For a node with resolved strategy identities, the node state equals the most advanced integration state actually present
among those descriptors: `coordinated` is more advanced than `instrumented-local`, which is more advanced than
`planned`. This node-level state records the strongest real path available at the seam; it does not upgrade a less
advanced member. A mixed method-execution family can therefore be `instrumented-local` while individual adapter-only
method descriptors remain `planned`. Nodes without a strategy identity derive state from their named owner seam rather
than from the strategy inventory.

### 4. Circuit hierarchy

The root is `circuit:eslm:processing-graph`. It contains three planes that cannot exchange authority implicitly.

| Circuit family | Exact nested circuits and purpose |
| --- | --- |
| Runtime request cycle | `circuit:runtime:request-cycle` contains ingress/language, request/session, knowledge/evidence, reasoning/verification, and failure/result circuits. Language expands into `language-direct` and `language-recovery`; knowledge expands into `knowledge-routing` and `evidence-ranking`; reasoning expands into `method-selection` and `witness-authority`; failure/result expands into `grounded-response-construction`. |
| Compiler knowledge build | `circuit:compiler:knowledge-build` contains `source-understanding`, `record-formation`, and `package-release`. Untrusted evidence becomes immutable knowledge only after rights, schema, provenance, safety, promotion, and equivalence gates. |
| Research graph discovery | `circuit:research:graph-discovery` contains `evidence-projection`, `hypothesis-discovery`, and `promotion-boundary`. Dataset rows remain inert evidence; the sink emits proposals with no runtime, answer, proof, or promotion authority. |

An embedded circuit is not a hidden executor. It is a named subgraph whose boundary declares accepted packets,
returned packets, resources, authority decisions, and exceptional exits. Parent circuits schedule and account for their
children but cannot rewrite a child gate's decision.

### 5. Exact runtime node inventory

The runtime v1 catalog contains 32 nodes. The responsibility name below is stable; exact packet, edge, strategy, and
resource lists live in the closed catalog and are validated against this grouping.

| Circuit | Nodes and responsibilities |
| --- | --- |
| Direct language ingress | `request-ingress` bounds input; `english-likelihood-gate` routes English confidence without claiming a source language; `direct-parser-gate` accepts only a supported parsed interpretation. |
| Language recovery | `language-proposal-coordinator` executes selected proposal strategies; `semantic-preservation-gate` prevents unlicensed meaning change; `parse-only-reparse-gate` inspects without retrieval or execution; `interpretation-arbiter` selects or reports ambiguity. |
| Request and session | `session-snapshot` captures rollback state and makes the named snapshot packet available to both work validation and the later session-effect boundary; `work-policy-gate` validates finite work; `request-force-gate` distinguishes a request from incidental artifact nouns; `request-plan-coordinator` builds ordered obligations; `session-effect-gate` consumes the request plan plus the snapshot and prevents speculative interpretation from mutating the session. |
| Knowledge routing | `knowledge-focus-coordinator` derives typed semantic focus; `package-scope-gate` admits exact packages and versions; `exact-route-planner` schedules bounded providers or shards; `evidence-frontier-retriever` returns evidence plus search receipts; `frontier-completeness-gate` controls absence claims. |
| Evidence assessment | `evidence-assessment-coordinator` ranks relevance and answer-bridge potential; `evidence-admission-gate` rejects malformed, untrusted, or out-of-scope evidence. Relevance is not truth authority. |
| Method selection and proof | `method-plan-coordinator` selects a capability-compatible method; `method-executor` returns a result plus witness; `witness-verification-gate` independently replays or validates the bounded witness. |
| Failure and result | `failure-eligibility-gate` controls related-evidence fallback; `failure-grounder` emits a non-answer grounding bundle; `result-schema-gate` validates the closed public result; `session-commit-gate` commits or rolls back; `result-sink` emits the immutable result. |
| Grounded response construction | `result-construction-coordinator` freezes the output contract, eligible evidence, and selected construction work; `claim-admission-gate` admits typed provenance-bound claims and records rejections; `rhetorical-plan-builder` assigns claims to sections; `sentence-realization-coordinator` selects source-summary, lexical-definition, typed-fact, or defeasible-relation sentence strategies; `document-assembly-coordinator` chooses fusion, comparison, gap, prose, section, outline, or table assembly and emits one construction candidate. |

The construction subcircuit is generative in form and symbolic in authority. It creates new English sentences and
document structure, but every factual sentence remains linked to an admitted supplied sentence or KB record. The
claim gate may withhold a lexically related record; no downstream strategy may restore it, invent a bridge fact, or
raise presentation confidence into proof confidence. Its five nodes make the difference between factual admission,
rhetorical organization, sentence wording, and final formatting visible instead of hiding all four inside one
“result construction” box.

The current checkpoint has one fully shared coordinated runtime node: the language proposal coordinator. The other
runtime nodes are real instrumented-local seams. That is a migration ledger, not a judgment that only language matters.
Exact selection is exposed only where the owning implementation actually honors it.

### 6. Exact compiler and research inventories

| Plane | Nodes and responsibilities |
| --- | --- |
| Compiler, 12 nodes | `frozen-source-ingress`, `source-rights-gate`, `source-decoder`, and `source-segmenter` establish reviewed evidence; `knowledge-extraction-coordinator`, `identity-resolution-coordinator`, `record-standardizer`, `canonical-record-gate`, and `promotion-gate` form admissible records; `package-compiler`, `package-equivalence-gate`, and `package-sink` produce one immutable declarative package. |
| Research, 8 nodes | `episode-source`, `rights-visibility-gate`, `episode-projector`, and `structural-feature-projector` create inert, source-neutral evidence; `hypothesis-coordinator` compares discovery techniques; `source-neutrality-gate` and `cross-source-transfer-gate` reject overfit proposals; `promotion-proposal-sink` emits a non-authoritative handoff. |

Seven v1 nodes remain planned: compiler source rights, decoding, segmentation, knowledge extraction, identity
resolution, the compiler promotion gate, and research cross-source transfer. The training runner can isolate an agent
and return an untrusted candidate, but no executable owner currently issues the catalogued
`packet:compiler:promotion-decision-v1`; compilation and registration are separate operator actions rather than that
missing gate. Planned nodes cannot be selected as executable strategies. Research analysis or a schema-valid compiler
candidate may produce evidence for a planned boundary but cannot change its implementation state.

### 7. Typed packet conventions

Packets are immutable semantic envelopes named `packet:<plane>:<purpose>-v1`. A packet name states what information is
available, not how a JavaScript object happens to be laid out. The separate
`eslm-processing-graph-packet-contract-catalog-v1` freezes one exact contract for every live packet identity. Each
contract contains the packet identity, canonical producer and consumer node lists, required and optional high-level
semantic field names, an explicit meaning for absence, bound resource references, one validation owner, privacy and
provenance policies, lifetime, and authority effect. The graph validator recomputes producer and consumer lists from
node input/output declarations and requires exact 62-for-62 coverage; a packet cannot be added to the graph by changing
only one catalog.

The API exposes `processingGraphPacketContract()` for lookup,
`assertProcessingGraphPacketContractCatalog()` for catalog-to-graph closure, and
`assertProcessingGraphPacketEnvelope()` for high-level envelope-field closure. Both catalog records and envelopes
reject unknown fields, and every required high-level field must be present. This envelope check does not pretend to
validate nested values: the named semantic owner still validates field values, content digests, enumerations, record
schemas, and resource arithmetic before the packet crosses an authority boundary.

Packet metadata uses closed v1 vocabularies. Privacy is `internal`, `request-private`,
`research-restricted`, or `source-controlled`. Provenance is `host-derived`, `required`, or `conditional`. Lifetime is
`request`, `session-snapshot`, `transaction`, `build`, `research-run`, `audit-receipt`, or `published-artifact`.
Authority effect is `none`, `work-allocation`, `records-selection`, `records-gate-decision`, `records-gap`,
`rollback-only`, `verified-claims-only`, `publishes-artifact`, or `non-authoritative-proposal`. An effect describes only
authority already established by the producer. It cannot turn a data packet, coordinator selection, compiler
candidate, or research proposal into an authority decision.

The 62 v1 packets form four families:

| Packet family | Named contents |
| --- | --- |
| Runtime | Bounded request, language assessment, proposal batch, vote and correlation ledgers, reparse and interpretation decisions, session snapshot, task frame, request plan, query focus, package scope, routing plan, evidence frontier, completeness and admission decisions, assessed evidence, method plan/result, verification decision, inability, grounding bundle, construction work order, admitted-claim ledger, rhetorical plan, grounded-sentence ledger, construction candidate, result validation, session commit, and public runtime result. |
| Compiler | Frozen and decoded source, source authorization, segments, record candidates, identity resolution, canonical records, validation decisions, promotion decision, package candidate, package validation, immutable package, and build gap. |
| Research | Source status, episode and authorized-episode batches, projected episodes, structural features, hypotheses, neutrality and transfer decisions, scale progress, promotion proposal, and research gap. |
| Shared coordination | `packet:shared:coordinator-receipt-v1` records schedule and outcomes; `packet:shared:correlation-ledger-v1` prevents copied or dependent strategies from multiplying confidence. |

A packet never contains an executable callback, dynamic import path, corpus program, hidden expected answer, mutable
session reference, or unrestricted service object. Large evidence remains content-addressed and shard-referenced; a
packet carries the bounded frontier or exact receipt, not an unbounded source corpus.

### 8. Edges, exceptional paths, and rollback

Every edge is a closed record with `edgeId`, `from`, `to`, kind, packet type, and a visible condition. Edge kinds are
`data`, `control`, `exception`, `rollback`, `authority`, and `resource`. Data carries immutable content. Control enables
a transition without adding semantic premises. Authority carries a gate decision and therefore originates only at an
`authority-gate`; source-to-gate evidence remains data. Resource carries reservations and consumption. Exception carries
a typed inability or failure. Rollback carries a previously named host snapshot from its snapshot producer to the node
that may restore it. In the request circuit the request-plan edge remains data, while the separate conditioned rollback
edge makes `packet:runtime:request-session-snapshot-v1` available to `session-effect-gate`.

The v1 catalog contains 79 edges. All nodes are reachable from their plane's source through normal or explicit
exceptional paths. No exceptional path may skip result validation, no failure-grounding path may change the primary
answer, and no rollback edge may erase the receipt that explains why rollback occurred. Provider results become
admissible only after their lifecycle cleanup succeeds; a cleanup failure discards pending evidence and returns an
incomplete search receipt.

### 9. Resource model

The 27 v1 dimensions independently meter candidates, comparisons, decoded and source bytes, evidence items, facts,
graph nodes and edges, hypotheses, input and output bytes, lookups, postings, proof and receipt bytes, records,
reparses, reservations, rule joins, segments, session items, shards, solver nodes, source rows, spans, tokens, and votes.
One scalar “cost” cannot replace this ledger because strategies consume different resources and a proof reservation
must not be spent on language proposals.

A coordinator reserves work before strategy execution. Results report reserved, consumed, remaining, and exhausted
dimensions even when a strategy abstains. Allocation and execution order are deterministic. Parallelism is logical:
strategies receive independent work and cannot observe each other's mutable state. An implementation may execute them
sequentially for reproducibility or in parallel behind an equivalent deterministic merge. Completion order cannot
change arbitration.

### 10. Strategy coordination inside a node

The coordinator interior follows one canonical dataflow:

1. validate node input and the exact profile;
2. determine strategy eligibility from typed preconditions;
3. preallocate per-strategy and mandatory-gate resources;
4. invoke selected trusted executors with immutable input and narrow host services;
5. validate each result and quarantine failure or malformed output;
6. group comparable votes by correlation identity;
7. arbitrate in stable identity order and emit a complete receipt; and
8. send the selected candidate to a separate authority gate when the effect requires validation.

Confidence, relevance, preference, and applicability are different quantities and cannot be summed across kinds.
Correlated implementations contribute at most the policy-defined group support. A strategy may abstain or return a
bounded partial candidate under resource exhaustion. A popular candidate remains rejected when semantic preservation,
evidence admission, proof verification, safety, package validation, or result validation fails.

### 11. Catalog protocol and validation

The machine graph catalog uses `eslm-processing-graph-catalog-v1`; the independent packet-contract catalog uses
`eslm-processing-graph-packet-contract-catalog-v1`. Inspectable projections use
`eslm-processing-graph-inventory-v1` and `eslm-processing-graph-validation-receipt-v1`. Canonical graph identity
excludes insertion order and the relocatable `ownerModule` implementation locator. The graph catalog digest retains semantic labels,
roles, states, packet identities, resources, strategies, and edges but excludes that relocatable implementation
pointer; the topology digest also excludes display metadata. The packet-contract digest separately identifies all
semantic field, endpoint, absence, bound, validation, privacy, provenance, lifetime, and authority-effect contracts.
The separate research implementation identity hashes the actual trusted implementation ledger. The validator recomputes all
three catalog digests and rejects:

- unknown or duplicate node, circuit, packet, edge, strategy, stage, or resource identities;
- hierarchy cycles, dataflow cycles, unreachable nodes, dangling edges, and undeclared packets;
- a voting process or gate, a coordinator with undeclared vote authority, or answer authority outside witness review;
- a strategy assigned to the wrong stage or silently missing from the catalog;
- a normal edge listed as exceptional, an authority edge not emitted by an authority gate, a rollback edge without a
  declared host-snapshot packet, or an edge whose packet is not produced and consumed by its endpoints;
- a missing, extra, duplicate, open, endpoint-inconsistent, resource-unknown, or vocabulary-invalid packet contract,
  or an envelope with an unknown or absent required high-level semantic field; and
- implementation-state claims that contradict the registered strategy inventory.

At the current checkpoint the validated inventory is 52 nodes, 22 circuits, 79 edges, 62 packets with 62 exact packet
contracts, 27 resource dimensions, all 79 built-in strategy identities, and all 17 DS027 stages. The state ledger is
one `coordinated`, 44 `instrumented-local`, and seven `planned`. These counts are a release consistency check, not a
permanent architectural limit. A semantic graph or packet-contract change updates this specification and its protocol
or versioned identities before results are republished.

### 12. Dataset-guided evolution without graph inflation

DS028 closed cycle receipts use seven hypothesis types: `processing-node`, `coordination-node`, `authority-gate`,
`strategy`, `edge`, `packet-field`, and `nested-circuit`. These are research proposal shapes, not additional catalog
node kinds. Every hypothesis is compared against this catalog before design work begins. If an existing node already
owns the responsibility, a new algorithm becomes a strategy. If an existing packet lacks required state, the proposal
is a packet-field change. If only ordering or dependency is missing, it is an edge. A nested circuit is justified only
by a stable inspectable subgraph contract. A new gate requires a non-voting invariant. Only a responsibility that
cannot be owned coherently by the current graph becomes a processing-node or coordination-node candidate.

The research chain is exact and one-way:
`eslm-rl-dataset-discovery-plan-v2` freezes admission, seed, analysis identity, and bounded selection before observation;
`eslm-processing-graph-research-analysis-v6` records machine evidence and replay ledgers against this catalog;
`eslm-processing-graph-consolidation-review-v1` supplies the explicit DS028/DS029 human mapping; and
`eslm-rl-dataset-discovery-cycle-v3` seals that mapping, reproduces the analysis-derived per-split frontier, and
accounts for every machine hypothesis. The plan may
admit reviewed training projections to analysis. The analysis may report hypotheses. The review and cycle may decide
only research consolidation. None may edit this catalog, register a strategy, authorize a packet or edge, select a
runtime executor, validate a proof, or promote a result.

The human discovery ledger records source evidence, simpler explanations, merge and rejection decisions, incomplete
frontiers, and next falsification. Frequency and preference can support recurrence; they cannot waive independent
source transfer, ablation, protected evaluation, or manual promotion. Hundreds of source motifs may therefore
consolidate into a small number of powerful nodes and several explicit strategies rather than hundreds of opaque
branches.

The research `promotion-proposal-sink` terminates with a non-authoritative proposal. `retained`, `merge-candidate`, and
`prototype` are research lifecycle states only. Even `promoted` is valid only after repository maintainers approve the
normative DS and implementation change and issue the matching explicit promotion receipt; the receipt records that
authority decision but cannot manufacture it. Analyzer votes, handoff eligibility, a complete frontier, and the human
ledger cannot register a node, strategy, edge, packet field, nested circuit, executor, or default profile.

### 13. Documentation and evaluation consequences

The documentation home page presents the catalog through a bounded progressive explorer that shows one semantic depth
at a time. It must not follow the explorer with a second sequence of static zoom diagrams that restates the same graph.
The dedicated architecture page exposes the same current catalog as an exhaustive audit view and distinguishes current
execution from planned research. Source status and research pages report acquired, projected, analyzed, incomplete,
and promoted states separately. Every interactive card, header count, boundary rail, edge, information overlay, and
leaf contract is a projection of the same catalog rather than an independent architecture claim. The home page also
provides a prose glossary for containment, typed flow, circuit boundaries, implementation envelopes, all circuit and
node icons, and all implementation-state marks; the glossary uses the same visual encoding as the graph.

Tests and evaluations attach failures to the earliest node contract, edge, packet, resource, or gate that failed.
Strategy-family coverage is not node success; a proposal-only case is not interpretation execution; a planned node is
not exercised; and an incomplete research frontier cannot support absence claims. Promotion evidence names the exact
catalog, profile, work policy, coordinator receipts, authority decisions, benchmark behavior identity, and ablation.

### 14. Implementation and migration boundary

The v1 catalog is an inspectable foundation, not completion of the target coordination architecture. Existing local
modules may own multiple adjacent nodes while seams are extracted. A refactor is substantive only when it creates a
closed input/output contract, makes authority and rollback visible, validates the boundary independently, and removes
hidden recomputation or mutable cross-node state. A descriptor wrapped around an unchanged branch is instrumentation,
not node migration.

Migration priority follows audit value: method plan to execution to witness verification; evidence focus to routing to
retrieval to admission; request interpretation to obligation planning; failure eligibility to grounding; and verified
claim construction to result validation and session commit. Public result semantics remain unchanged unless the
owning specification explicitly changes them.

## Decisions & Questions

### Question #1: Is ESLM a linear pipeline or an arbitrary graph?

Response: It is a hierarchical typed DAG for one bounded transaction, with explicit exceptional and rollback edges.
The main path is often approximately linear, while coordinators contain logically parallel strategy branches. This is
more precise than either a single pipeline or an unrestricted cyclic graph.

### Question #2: Why distinguish a processing node from a strategy?

Response: The node owns a stable responsibility and communication contract; a strategy is one reviewed implementation.
That separation lets researchers compare algorithms without changing topology and prevents every heuristic from
becoming a new architectural box.

### Question #3: May every node run several voting strategies?

Response: No. Only the eleven declared coordinators in the exact v1 inventory compare candidates: eight runtime
coordinators, two compiler coordinators, and one research coordinator. Compiler and research votes remain scoped to
untrusted candidate ranking and cannot authorize a package, runtime behavior, answer, proof, or promotion. Sources,
deterministic transformations, method executors, authority gates, and sinks do not vote. A reasoning method returns a
witness; a verifier authorizes the claim.

### Question #4: Does a catalogued node prove that the implementation uses that boundary?

Response: No. `coordinated`, `instrumented-local`, and `planned` are distinct machine states. Only a coordinated receipt
proves shared execution; a local seam still needs migration and a planned node has no product executor.

### Question #5: Why are packets named at a semantic level rather than documented only as object schemas?

Response: A semantic packet name tells an engineer what knowledge, authority, provenance, and work cross a boundary.
The separate versioned packet-contract catalog now closes every live identity over endpoints, high-level fields,
absence, bounds, validation owner, privacy, provenance, lifetime, and authority effect. Nested value schemas may evolve
only under their semantic owners and compatible packet version; the catalog and envelope validators reject unknown or
missing required high-level fields rather than relying on prose.

### Question #6: Can confidence from enough strategies replace an authority gate?

Response: No. Confidence schedules and ranks work. Schema validity, semantic preservation, rights, safety, evidence
admission, witness verification, package equivalence, and result validation are categorical authority decisions.

### Question #7: When should dataset evidence add a new node?

Response: Only after source-neutral recurrence and independent transfer show a stable responsibility that existing
nodes cannot own without mixing authority, state, failure, or resource contracts. Most recurring motifs should refine
a packet, edge, or strategy instead.

### Question #8: Why keep compiler and research circuits in the same catalog as runtime circuits?

Response: They share the processing-node, packet, resource, and authority vocabulary, which makes the whole system
auditable at one conceptual level. Their authority remains strictly separate: compiler candidates are not packages,
and research hypotheses are not runtime policy.

### Question #9: Why does the home page reveal one graph depth at a time?

Response: Rendering the complete hierarchy, every node contract, and every strategy simultaneously preserves data but
destroys orientation. A progressive camera keeps the first view small, preserves exact hierarchy and typed flows, and
makes context available through each component's information control. The three root planes are stacked because they
share a vocabulary but not an execution pipeline, and each root row names its own real exterior contract. Dynamic card
widths, edge rails, a one-column narrow layout, bounded strategy-family pages, catalog-derived counts, breadcrumbs, and
exhaustive reachability retain completeness without crowding the home page or turning it into a static audit table.

### Question #10: Why is the automatic vertical order top, bottom, then middle?

Response: The two safe extremes maximize separation for the first adjacent paths. An exact three-card row returns to
the top because that compact arc usually leaves the final handoff clearer; at four or more cards, the middle position
uses the remaining corridor before the three-lane sequence repeats. This is a deterministic projection rule, not processing
order or a catalog edge. Horizontal tracks retain semantic order, while a bounded vertical-only drag can override one
card when a particular aggregate view still has a crossing.

## Conclusion

The hierarchical processing-circuit catalog makes ESLM concrete at several levels of zoom. Fifty-two named nodes,
62 exact packet contracts, explicit resources, guarded edges, and honest implementation states describe what happens,
what data moves, which alternatives may compete, and where authority resides. DS027 supplies controlled strategy
coordination; DS028 supplies a disciplined discovery program; this specification supplies the stable graph that both
must respect. The result is an inspectable engineering architecture that can grow through evidence without becoming
an opaque web of heuristics or letting confidence replace proof.
