---
id: DS012
title: Documentation, Generated Status, and Repository Operations
status: in-progress
owner: repository
summary: Defines specification ownership, non-redundant HTML information architecture, generated empirical status, readable layout, semantically code-synchronized diagrams, canonical checks, and change-locality requirements.
---

# DS012 Documentation, Generated Status, and Repository Operations

## Introduction

Documentation is part of the executable research contract, but different artifacts have different stability. DS files define durable normative boundaries. HTML pages teach the implemented mechanisms in technical depth. Typed catalogs and generated reports hold mutable package, benchmark, and execution state. This separation prevents every new adapter or measurement from rewriting unrelated specifications.

## Core Content

### Documentation hierarchy

`docs/specs/` is the sole design authority. `matrix.md` is generated from contiguous DS frontmatter and links every DS through `specsLoader.html`. HTML pages explain the same system from data-flow, algorithm, trust-boundary, operator, failure-diagnosis, and reviewer perspectives. `README.md` provides executable orientation. `AGENTS.md` governs repository work and mandatory reading. Generated artifacts under `docs/results/` are replaceable evidence, never architecture authority.

No layer may summarize away assumptions, algorithms, representations, invariants, failure states, measurement regimes, or falsification criteria. Repetition is justified only when a different viewpoint helps a reviewer; copied normative clauses instead reference their owning DS.

Published human-facing HTML uses a shallow topical layout. `docs/index.html` is the home page;
`docs/evaluation.html`, `docs/status.html`, and `docs/specsLoader.html` are stable operational entry points;
`docs/development/` contains the three generated-evidence status views; and `docs/results/` contains generated
artifacts. Substantive chapters live one level below the root in `architecture/`, `language/`, `knowledge/`,
`reasoning/`, `research/`, `operations/`, `reference/`, and `benchmarks/`. A topical page declares
`<base href="../">`, so shared navigation, assets, the specification loader, result artifacts, and canonical links
all resolve from the documentation root. Repository-authored links target the topical canonical URL. The root may
retain only a small, explicitly marked compatibility redirect for a previously established section landing URL;
redirect stubs are not navigation targets, chapters, or alternate documentation authorities.

### Orthogonal DS ownership

The stable responsibility map is:

| DS range | Exclusive primary responsibility |
|---|---|
| DS000–DS002 | vision, repository contract, and executable-versus-declarative architecture |
| DS003–DS004 | direct language and benchmark-guided learning |
| DS005–DS006 | canonical KB meaning and immutable package identity |
| DS007–DS008 | operator interfaces, sessions, task planning, traces, and results |
| DS009–DS010 | trust and failure semantics, then measurement and comparison |
| DS011–DS012 | roadmap acceptance, documentation, generated status, and repository operations |
| DS013–DS014 | external Language Agent proposals and document-derived symbolic KBs |
| DS015 | registered reasoning method semantics |
| DS016–DS017 | source authority and benchmark adapter/oracle lifecycle |
| DS018–DS021 | corpus gate, streaming compilation, exact routing, and cache/memory behavior |
| DS022 | deterministic language approximation, request-intent planning and construction, grounding focus, and named work policy |
| DS023–DS026 | statistical symbolic relevance, complex-language decomposition research, multi-obligation verified synthesis, and grounded product evaluation |
| DS027 | trusted strategy descriptors, static registration, stage coordination, exact selection, arbitration, resources, receipts, and compiler extension boundaries |
| DS028 | rights-aware dataset-guided discovery of processing-node, gate, strategy, edge, and packet hypotheses |
| DS029 | exact hierarchical processing circuits, node catalog, typed packet families, guarded topology, and resource vocabulary |
| DS030 | bounded English request-operation framing and typed operation obligations |
| DS031 | verified deterministic quantity, time, sequence, grouping, mean, and strict-order operations |
| DS032 | bounded classification, extraction, correction, and transformation over supplied text |
| DS033 | grounded conversational inspection, listing, provenance, and natural abstention over loaded KB facts |
| DS034 | constraint-aware multi-sentence synthesis grounded in supplied material and explicit output limits |

A change updates only the DS files whose primary responsibility changes. A new benchmark normally changes the typed catalog, source receipt, adapter, tests, benchmark HTML page, and generated report, not the generic language, storage, CLI, roadmap, or documentation DS. A new reasoning method changes DS015 and the planner contract only if planner behavior also changes.

### Decisions and questions

`Decisions & Questions` contains only decisions whose rationale constrains future implementation or unresolved options that require selection. It does not restate the preceding section as rhetorical questions. A resolved entry uses `Response:`. A genuinely unresolved entry uses `Options:` and the affected behavior remains unimplemented until one option is selected. Current research blockers and operator choices that are not normative contracts belong on the separate decisions/issues HTML page or in source-specific receipts.

The research-decisions HTML page may index a normative unresolved DS question and explain its evidence from another
reader viewpoint, but it cannot be the sole location of a contract-shaping choice. Operational source selection,
benchmark-owner clarification, and replacement-pool acquisition may remain HTML or receipt issues when they do not
change a generic contract.

### HTML technical writing

HTML pages are substantial technical chapters. Every behavioral claim is verified against source, tests, schemas, or generated evidence. An algorithm explanation names its input representation, state, transition or inference rule, termination condition, complexity or bound, witness, failure statuses, and known incompleteness. Storage pages show real manifest, record, shard, index, routing, and cache shapes. Benchmark pages explain what the task tests, exactly which cases ran, which scorer was used, and why a result failed.

Architecture documentation separates four views of the same system: logical request and dataflow, named data and
protocols, execution and resources, and implementation and normative reference. A chapter states which view it owns
and delegates lower or higher detail to the appropriate page. Stable prose names processing nodes, strategies,
authority gates, typed envelopes, and receipts before it names modules. A processing node is the architectural
responsibility; a strategy is one reviewed implementation of a selectable node; only coordination nodes vote over
typed candidates. Parser, schema, safety, proof, result, and package authority gates are never described as ballots.

Repository paths and source filenames do not substitute for architectural explanations. When they are useful, they
appear in a dedicated implementation/reference section, an operator command block, a physical package-layout
section, or another page whose explicit purpose is reference. Main narrative explains the conceptual owner and
protocol. Product architecture avoids terminology that implies external code discovery; documentation instead uses
processing node, strategy, trusted adapter, or authority gate according to the actual role.

Academic background links to primary papers, books, standards, and clearly identified secondary references such as Wikipedia. References establish theoretical context; they do not substitute for describing ESLM's actual algorithm or imply equivalence to a broader formalism.

Capability prose is accurate and confident. It begins with the implemented mechanism and its evidence, then states the
next acceptance gate and the condition that would satisfy it. It must not hide a limitation, but it also must not frame
the project through vague self-negation such as “not a general assistant” when an exact supported boundary and forward
gate can say more. Target language is clearly labeled and never presented as current execution.

Strategy documentation uses the catalog's three implementation states exactly. `coordinated` means the real executor
runs through the sealed common registry and stage coordinator. `instrumented-local` means an exact descriptor and
observable owner execution exist while the semantic owner still performs the work; only the subset whose owner checks
the exact allowlist is policy-selectable. `planned` is a reviewed extension point with no selectable executor. Named
strategy presets are always described as inventory views; only exact stage-to-identity allowlists are described as
execution controls. Catalog visibility, selection, and execution are never used as synonyms. Inventory
`executionEnabled` means policy admission, not observed invocation; a non-policy-gated local owner may still execute
through the ordinary path, and only its receipts establish that fact.

### Navigation and page layout

The site uses one shared header navigation and breadcrumbs. The home page is a short “start here” view: project
identity and actual boundary, one visually dominant progressive processing-graph explorer, a compact evidence warning
and link to the current report, and a two-dimensional sitemap. The explorer must begin with the three authority-separated
system planes and reveal exactly one semantic depth at a time. The root renders runtime request processing, knowledge
build, and inert graph-discovery research as three vertical rows. Every circuit view applies the same rule when visible
siblings have no direct typed edge: independent components stack vertically as separate modules regardless of their
count. Each module spans the graph width from its real exterior
`IN` rail through one plane card to its real exterior `OUT` rail. The page states why the rows are independent: runtime
answers callers, knowledge build publishes immutable declarative packages, and research emits inert proposals for
manual review. No line or row order may imply that one plane executes or feeds the next.

Selecting a circuit, processing node, strategy family, or exact strategy moves the camera into that component. One
breadcrumb integrated into the selected-component header restores every ancestor; the explorer does not duplicate it
with separate home or back buttons. That breadcrumb is the component identity row: every ancestor and the current
component carry their real semantic-level or processing-role icon, and no second type label such as `System plane`
or repeated title occupies a separate header section. The header uses separate
color-coded words, not unexplained initials, for immediate circuits, scoped processing nodes, and scoped strategies.
It also reports the scoped source, process, coordinator, authority-gate, and sink populations using the same icons and
colors as the cards and legend. Overview cards contain only the real identity, semantic-level or processing-role icon,
compact `C / N / S` structure, role counts, implementation-state mark, entry affordance, and an `i` control. Their
widths grow and shrink within explicit minimum and maximum bounds. A connected desktop row places the `IN` rail,
every internal component, and the `OUT` rail in one equal-track grid; both center-to-center intervals and visible
box-edge gaps are equal, including the gaps adjacent to the outer rails. As the visible track count grows, every box
uses the same larger horizontal inset so arrow segments retain a visible minimum; the renderer never shortens only
selected nodes or applies a different spacing regime to boundary rails. Narrow screens use a legible single central column rather
than compressing several cards into unreadable slivers.

On a crowded connected desktop row, internal cards use three repeating safe vertical lanes. The first eligible card
occupies the highest available position below the context label, the second occupies the lowest available position
above the stage edge, and the third stays midway between those limits; later cards repeat top, bottom, and middle.
Exactly three internal cards are the compact exception: the third returns to the highest lane, producing top, bottom,
top. Two internal cards use top and bottom. Only rows with four or more cards introduce the middle lane.
This distribution maximizes initial line separation without changing horizontal track centers, edge direction,
topology, or processing order. The drag handle overrides the automatic lane on that card and remains strictly vertical.
Every connection is one independent monotonic cubic Bézier curve directly between its source and target box. Its two
control points stay inside the source-to-target span and preserve a natural tangent into the arrowhead. The renderer
does not group connectors into shared corridors, search alternative arcs, introduce intermediate route points, or
expose rectangular elbows. Safe vertical lanes and vertical drag remain the mechanisms for reducing incidental
line-on-box overlap without distorting a connector into a loop.

The short context inside each view explains the selected component rather than the drawing notation. It names the
component's concrete responsibility, the transformation or decision performed at that boundary, and the useful typed
result. Generic phrases about a selected circuit, solid arrows, parallel layout, pages, or an exact strategy belong in
the legend and cannot replace view-specific semantic context.

Solid green arrowheaded lines are aggregated typed catalog flows. Solid blue arrowheaded lines cross a selected
circuit boundary, dashed orange lines describe a real strategy implementation envelope, and solid purple lanes show
opposed aggregate paths. The four colors must remain visibly distinct in both the drawn graph and its legend.
Opposed aggregate flows use nearby separate lanes so neither direction is hidden. Their dedicated legend entry explains
that opposed aggregate arrows can summarize different
exact acyclic node paths crossing the same two circuit groups in opposite directions; they do not assert an exact
reciprocal node-edge pair or execution cycle. Hover information names each direction's real edges, packets, kinds, and
conditions. Catalog containment is navigated through cards and breadcrumbs and is explained in the graph-guide dialog;
it is not drawn as an execution edge or pseudo-node. Every `IN` and `OUT` rail names its real exterior
neighbor and packet types, carries the icon of the component it actually connects to, and has an `i` explanation of
why the boundary exists and what happens there. A rail that represents an exact node in another catalog circuit has
a navigation arrow and opens that node with its real breadcrumb. A human actor uses the human icon; an application,
storage system, source-acquisition process, or dataset adapter uses the software-container icon; the CLI/library
boundary uses the combined operator/client icon. These terminal exterior endpoints have no navigation arrow, do
nothing when their bodies are selected, and their `i` explanations state the concrete exterior action and that no
catalog target exists. Every component view has both `IN` and `OUT`. When a source has no catalog predecessor or a
sink has no catalog successor, the corresponding rail represents that concrete actor or software interaction rather
than a decorative placeholder or invented processing node.

Complete packet, resource, authority, owner, implementation-state, connection, reuse, precondition, witness, and
failure details open through the `i` controls in one information overlay inside the visualization. The overlay is the
only explorer region that may need internal vertical scrolling. A leaf remains the real component between its declared
ports and does not append a second detail block below the graph. Strategy families show at most six exact strategy
cards per page. The graph viewport itself has no horizontal or vertical scrolling, optical zoom, or fixed oversized
canvas. A separate `?` control in the header opens one graph-guide dialog containing navigation instructions, the
compact legend, and prose defining every symbol; these blocks are not repeated below the diagram. Component `i`
controls continue to open exact semantic contracts. Both dialog kinds occupy most of the available viewport, avoid a
nested short scroll region, and scroll internally only when their content exceeds that large surface. The guide reuses
the exact graph icons, colors, arrow styles, and implementation-state marks. Cards expose a keyboard-accessible vertical drag handle; while a card moves, every
connected SVG path is recalculated. Parallel alternatives snap into a new non-overlapping vertical order on release,
while ordinary horizontally distributed components retain a bounded vertical offset. The explorer does not substitute
a static architecture inventory table for the graph
and links to the logical-processing chapter, where the engineering planes and exceptional paths are explained.

Human-facing packet, witness, precondition, and strategy labels use the same unversioned role names as the current
internal contracts. The explorer must not manufacture or hide a second display identity. Independently versioned KBs,
external sources, and historical receipts may show their real release or protocol identity in the information panel
when it affects provenance or replay, but revision metadata is not repeated in every card, rail, or hover label.

Across all HTML pages, current internal protocols are explained by responsibility and content-addressed checkpoint,
not by `v1` suffixes. A page may quote an old suffix only while explicitly describing historical evidence or a
migration. Package, dataset, source, and external-model versions remain visible because they identify independently
evolving inputs rather than an internal drawing convention.

`evaluation.html` is the stable development-evidence entry point and links the knowledge-base, benchmark, and RL
dataset status views. `development/benchmarks.html` is the only page that renders the complete public benchmark
dashboard. `status.html` shows capability and roadmap state, links to the evidence report, and does not embed a
second dashboard. Other material receives a dedicated topical page linked from the sitemap and menu.

The shared desktop layout may use a main canvas up to approximately 96 rem. Ordinary prose and headings use the
available content width rather than an arbitrary inner-column or character-count limit. Prose remains left-aligned;
it wraps only when the viewport, a word boundary, or an explicit break opportunity requires it, not at decorative
midpoint boundaries. Every explanatory HTML table has exactly two structural columns: a stable identity or question
and its answer or details. When a source contract has several attributes, the second cell groups them under explicit
labels instead of adding horizontal columns. Tables have no artificial minimum width and do not require horizontal
page or container scrolling. Ordinary words break only at normal opportunities; long code identifiers and URLs may
wrap to protect the viewport. On narrow screens, each two-cell row becomes a self-contained vertical card while the
grouped detail labels remain visible. Code blocks retain their own bounded overflow behavior. The desktop
benchmark table uses approximately 30% for benchmark identity, execution mark, concise score, tested/possible scope,
and route coverage, and 70% for human-readable outcomes, protocol, diagnosis, and action. Technical identifiers wrap;
source hashes remain in raw or secondary audit views.

### Diagrams

Use a diagram only when spatial structure clarifies data flow, sequence, hierarchy, ownership, or branching. Mermaid
diagrams are normally left-to-right, use three to five primary nodes, short labels, readable bold fonts, and visibly
larger labels for acceptance-critical nodes. The shared visual grammar uses three principal box roles—source or input,
trusted process, and result or acceptance outcome—plus at most one exceptional/gap style when a diagram needs it. A
short centered caption names the relationship shown; explanatory detail follows in ordinary left-aligned paragraphs,
not in a long centered caption. That prose explains every node, edge, trust boundary, exceptional path, and limit.
Dense static graphs are split into several focused diagrams or replaced with prose and tables. The home-page explorer
is the deliberate exception to a static three-to-five-node diagram: it projects the complete catalog through a bounded
camera that renders only one immediate level. The page must not repeat that explorer as a sequence of separately
maintained Mermaid diagrams. Completeness means that every catalogued circuit, node, strategy, and visible edge is
reachable through navigation and tested against the source catalogs; it does not mean that all details are rendered
simultaneously. The explanation delegates the exact packet catalog and full normative inventory to the
logical-processing architecture.

### Generated status and empirical values

The evaluation benchmark table reads `docs/results/latest-public-benchmark-probes.json` in the browser. Current dates,
denominators, percentages, failure counts, adapter state, access state, and next actions exist only there or in typed
source receipts. Hand-authored HTML explains stable task semantics, metric meanings, limitations, and protocols but
does not copy temporary numbers. Per-benchmark pages may render a generated row selected from the same JSON; they do
not hand-maintain counts. Dashboard diagnoses and coverage text come from report rows, never hardcoded
benchmark-specific JavaScript branches.

A row described as current must expose the DS010 strategy-configuration snapshot: content-addressed catalog and
configuration identity, requested/effective work policy or explicit adapter-local state, exact allowlists, configured
arbiter identities, and aggregate stage-receipt summaries. Hand-authored HTML may explain those fields but must not
invent execution receipts for an `instrumented-local` or `planned` entry. Stored rows lacking the snapshot remain
visibly historical or reporting-incomplete.

The authored integration fixture and the generated heuristic development benchmark publish separate JSON and HTML
artifacts. `latest-benchmark` remains the readable five-case fixture. `latest-generated-heuristic-benchmark` records
the deterministic DS010 structural suite, its replay identity, aggregate failure clusters, and bounded representative
failures. Documentation may state the stable default denominator and generator contract, but mutable pass counts,
rates, oracle-level distributions, route distributions, confidence distributions, and cluster sizes come from the
generated report. No page may add the two suites into one accuracy or present the generated internal regime as public,
fresh, or official evidence. The generated top-level pass rate must be called a mixed development-contract rate
because the report deliberately contains eight oracle levels. Their separate aggregates distinguish answer execution,
semantic-query execution, candidate selection, query-local decomposition, request execution, request planning,
proposal-only preservation, and safety abstention.
Candidate selection must not be described as complete relational Semantic IR coverage. It binds the winning candidate
to its required family, accepted parse-only reparse, query-local interpreted episode, route, and status, but its rows
can still terminate `UNKNOWN` with `missingEntity` without a complete relation-shaped query.
Proposal-only or operator-preservation success with final `UNPARSED` must never be described as executable
interpretation coverage.

All published internal result families use the DS010 content-addressed behavior identity. Authored evaluation and
benchmark JSON use their closed v3 report formats and the shared v2 internal-regression protocol. The fixed generated
report retains the identity in its execution envelope; the multi-seed JSON retains it in both its shared identity and
every validated run. `docs:check` requires all four JSON receipts, validates their versioned schemas, and compares the
complete identity—including content digest, source scope, file count, and execution runtime—with the current `src`
plus `package.json` checkpoint. Agreement between stored receipts is not enough: each must match the current
checkpoint independently.

Generated HTML is a deterministic view, not a second editable claim source. Documentation validation renders the
authored and fixed generated pages again from their validated JSON and requires byte-for-byte equality with the
published HTML. The multi-seed audit remains JSON-only and is linked from the technical evaluation pages. Missing,
malformed, stale, or mismatched artifacts fail the release gate; `docs:check` never repairs them or executes a costly
benchmark implicitly.

The generated receipt also owns its exact diversity fields. The current checkpoint has 1,200 unique surfaces, 28
observed target families, eight oracle levels, and 593 observed cells out of the 774 possible declared
technique-by-domain pairs. Documentation may quote those values only with the same checkpoint and must still explain
that unique surfaces are not independent constructions and that domain is coupled to predicate.

Roadmap coverage uses `docs/results/current-status.json` with named capability bands, evidence, and boundaries. It remains separate from benchmark accuracy. A check beside a benchmark means the declared probe executed; it does not mean the complete official benchmark is solved.

Processing-graph research documentation preserves four protocol layers in order: approved
`eslm-rl-dataset-discovery-plan-v1`, machine `eslm-processing-graph-research-analysis-v5`, explicit
`eslm-processing-graph-consolidation-review-v1`, and sealed `eslm-rl-dataset-discovery-cycle-v3`. A page must not
call the plan an execution, the analysis a human decision, the review an authority grant, or the cycle a promotion.
The plan may admit only reviewed training projections to analysis; the cycle has research-consolidation scope only.
Every layer explicitly denies answer, runtime, proof, and promotion authority.
Cycle-v3 pages and receipts reproduce each analysis split rather than publishing only an aggregate: declared rows stay
visible, while availability, visitation, selection, and analysis remain zero for every development-visible or
protected split.

Research pages distinguish source lifecycle and evidence currentness. `reviewed` means rights and metadata were
examined; `acquired` means the authorized immutable source payload was obtained and reconciled; `cached` means those
exact bytes are locally present under the declared retention policy; `projected` means a validated training-visible
structural projection exists; `analyzed` means one named receipt visited a declared frontier; and `consolidated` means
a cycle accounts for machine hypotheses. `current` additionally means the source, projection, plan, scientific implementation, baseline
graph, analysis, review, and cycle identities satisfy live governance. `historical` preserves what an older frozen run
measured, while `superseded`, `blocked`, and `withdrawn` explain why that run cannot support a current claim. None of
these states means implemented, coordinated, selected, executed by the runtime, or promoted.

Stable HTML may state frozen source/projection membership and a validated catalog identity. Mutable analysis work,
events, votes, hypothesis totals, omissions, peak memory, receipt digests, and source-local or combined completion
come from the validated research artifacts and status projection. Until a current artifact chain is published, HTML
describes the required gate and links the generated status rather than copying a historical result as current.

### Repository-owned skills

Repository-owned training and audit skills under `training/.agents/skills/` remain self-contained. Their exact catalog is maintained in `AGENTS.md`, training documentation, and tests rather than repeated here. A skill carries its own references, scripts, schemas, and templates, imports no host source internally, receives only authorized evidence, and produces untrusted candidates or audit receipts.

The repository-owned `review-processing-graph-views` skill is mandatory for explorer changes. Its static auditor checks
regenerability, catalog and explanation coverage, owner-path existence, legend semantics, and focused tests without
importing target source into the skill. Its browser auditor enters every reachable circuit, node, family, and exact
strategy at desktop and narrow widths and checks two-sided boundaries, vertical disconnected modules, equal horizontal
center intervals and visible gaps, information controls, terminal behavior, arrow attachment, overlap, and graph-area
overflow. Those checks remain insufficient for semantic approval until the reviewer compares every projected owner
with current executable transformations, authority, failures, resource bounds, and implementation state.

Imported maintenance skills under `.agents/skills/` remain read-only during product work. Host documentation describes their role only where it affects repository operations; it does not create product DS files for imported skills.

### Canonical verification

The repository exposes focused tests, full `npm test`, authored evaluation, separate authored and generated heuristic
benchmark commands, their composed default benchmark, public-probe publication, KB build and validation, random
source-KB checks, scale profiling, spec-matrix generation, documentation validation, source-size checks, and composed
`npm run check`. Commands that acquire network data remain explicit and are never hidden inside inference or
verification.

Documentation verification recursively checks required root entries and topical pages, shared navigation, local links
resolved through each page's declared HTML base, assets, compatibility-redirect targets, diagram constraints when a
diagram is actually used, DS structure, contiguous numbering, and specs-loader targets. A page is not required to add
a decorative diagram. Behavioral tests check generated report schemas, report-owned diagnoses, receipt currentness,
that every registered reasoning method is documented, and that the generated heuristic report keeps its fixed
denominator, non-comparable evidence label, identity envelope, aggregate dimensions, and bounded failure sample. They
also check the authored report protocols, the shared behavior-identity validator, the required multi-seed receipt, and
deterministic JSON-to-HTML correspondence.

### Synchronization rule

A behavior, interface, schema, method, evaluation, or claim change updates source, tests, its owning DS, affected HTML explanation, and generated evidence in the same change set. Mechanical catalog growth does not trigger unrelated DS rewrites. Before completion, the reviewer rereads affected DS files in order, verifies question numbering and ownership, regenerates the matrix, checks links, and runs the proportionate full verification.

## Decisions & Questions

### Question #1: Why is generated status separate from normative prose?

Response: Measurements and adapter states change after executions, while contracts define how those executions remain interpretable. A generated source prevents stale copied percentages and lets the home page update without rewriting architectural documents.

### Question #2: When are multiple explanations useful rather than redundant?

Response: It is useful when it answers a different reviewer question, such as algorithm semantics versus operational diagnosis, and explicitly references the normative owner. Repeating the same contract in several DS files is redundant and creates contradictory update obligations.

### Question #3: Why is the full benchmark dashboard rendered on only one page?

Response: A single generated view prevents three pages from competing as the empirical authority and reduces visual
noise. Home and status still link to the same raw report, while the evaluation entry point delegates complete row-level
rendering to `development/benchmarks.html`, where its fields and limitations are explained in the appropriate context.

### Question #4: Why must strategy implementation states remain visible in prose?

Response: A descriptor inventory, a local execution gate, and shared-coordinator execution are materially different
evidence. Keeping `planned`, `instrumented-local`, and `coordinated` explicit lets a beginner understand the migration
and prevents architectural aspiration from being reported as runtime behavior.

### Question #5: Why does the generated heuristic benchmark have its own result artifact?

Response: Its 1,200-case structural distribution, cluster diagnostics, seed, and strategy configuration answer a
different question from the five authored integration cases. A separate artifact lets both remain part of the default
workflow without blending denominators, claim scopes, or mutable measurements. The artifact also keeps candidate
selection, executed answers, decomposition, requests, proposals, and abstentions separate so documentation cannot
silently elevate a lower-authority contract into complete interpretation coverage.

### Question #6: Why do HTML tables use only two structural columns?

Response: A stable identity-to-details relation remains readable across desktop and mobile without hiding fields or
requiring horizontal scanning. Explicit labels inside the details cell preserve the distinctions formerly expressed
by additional columns, while the responsive card form can present the same complete content on a narrow viewport.

### Question #7: Why separate architectural planes and move code paths into implementation maps?

Response: A source filename identifies current ownership but does not explain the operation, data contract, authority,
or failure semantics. Mixing those levels forces readers to reverse-engineer the design from paths and makes ordinary
refactoring look like an architecture change. Separate planes give engineers stable abstractions first while retaining
exact implementation evidence in the reference view. CLI commands and physical package layouts remain explicit where
their paths are themselves part of the operator contract.

### Question #8: Why does the documentation check validate execution artifacts instead of trusting their filenames?

Response: A `latest-*` filename is an operator convention, not evidence. Closed report schemas, independently
recomputed arithmetic, content-addressed behavior identity, and deterministic rendering establish that the artifact
actually represents the current implementation and that its browser view has not diverged. The check fails with a
regeneration instruction instead of silently rewriting evidence during documentation validation.

### Question #9: Why must graph-research pages name plan, analysis, review, and cycle separately?

Response: Each artifact answers a different review question at a different time. The plan proves what was authorized
before results were visible; analysis v5 proves what deterministic machine work occurred; the human review records how
machine hypotheses were interpreted against DS028 and DS029; and cycle v3 proves that the reviewed mapping is closed
and complete. Collapsing them would let observed success retroactively justify admission, let machine output impersonate
a maintainer decision, or make research consolidation look like runtime promotion.

### Question #10: Why are human-facing chapters grouped into shallow topical folders?

Response: The root contains only stable operational entry points plus a bounded compatibility surface, so a reader can
distinguish navigation hubs from technical chapters at a glance. One-level folders make ownership explicit without a
deep URL hierarchy, while the common root-relative base preserves shared assets and navigation. Canonical repository
links move immediately; the eight marked root redirects preserve only established external landing URLs and cannot
become a second editable copy of any chapter.

### Question #11: Why does a crowded graph use top, bottom, and middle lanes?

Response: Using the safe vertical extremes first creates the largest initial separation between adjacent paths. With
exactly three cards, returning the third to the top usually produces a cleaner final handoff than consuming a third
lane. From four cards onward, the middle lane uses the remaining unobstructed corridor before the sequence repeats. The lanes affect presentation
only. Exact horizontal order, edge direction, packet meaning, and execution semantics continue to come from the
catalog, while vertical-only drag lets a reviewer resolve a case-specific crossing without rewriting that topology.

### Question #12: Why are breadcrumbs and semantic context part of the component header?

Response: The selected component, its ancestor path, and its immediate purpose are one orientation surface. Separate
home and back buttons repeat the same navigation while consuming graph space. Likewise, a context title that explains
arrows repeats the legend instead of helping a reader understand the language-processing responsibility. Keeping one
header breadcrumb and one operational context makes every depth both smaller and more intelligible. Detailed reading
instructions and the symbol glossary live behind the adjacent guide control, so they remain available without
permanently extending the page below the diagram.

## Conclusion

The documentation system keeps stable contracts, technical explanations, and mutable evidence distinct but synchronized. Orthogonal ownership makes future changes local, while generated status keeps current results honest and reviewable.
