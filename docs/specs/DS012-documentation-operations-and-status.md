---
id: DS012
title: Documentation, Generated Status, and Repository Operations
status: in-progress
owner: repository
summary: Defines specification ownership, non-redundant HTML information architecture, generated empirical status, readable layout, diagram use, canonical checks, and change-locality requirements.
---

# DS012 Documentation, Generated Status, and Repository Operations

## Introduction

Documentation is part of the executable research contract, but different artifacts have different stability. DS files define durable normative boundaries. HTML pages teach the implemented mechanisms in technical depth. Typed catalogs and generated reports hold mutable package, benchmark, and execution state. This separation prevents every new adapter or measurement from rewriting unrelated specifications.

## Core Content

### Documentation hierarchy

`docs/specs/` is the sole design authority. `matrix.md` is generated from contiguous DS frontmatter and links every DS through `specsLoader.html`. HTML pages explain the same system from data-flow, algorithm, trust-boundary, operator, failure-diagnosis, and reviewer perspectives. `README.md` provides executable orientation. `AGENTS.md` governs repository work and mandatory reading. Generated artifacts under `docs/results/` are replaceable evidence, never architecture authority.

No layer may summarize away assumptions, algorithms, representations, invariants, failure states, measurement regimes, or falsification criteria. Repetition is justified only when a different viewpoint helps a reviewer; copied normative clauses instead reference their owning DS.

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
| DS013–DS014 | external Language Agent normalization and document-derived symbolic KBs |
| DS015 | registered reasoning method semantics |
| DS016–DS017 | source authority and benchmark adapter/oracle lifecycle |
| DS018–DS021 | corpus gate, streaming compilation, exact routing, and cache/memory behavior |

A change updates only the DS files whose primary responsibility changes. A new benchmark normally changes the typed catalog, source receipt, adapter, tests, benchmark HTML page, and generated report, not the generic language, storage, CLI, roadmap, or documentation DS. A new reasoning method changes DS015 and the planner contract only if planner behavior also changes.

### Decisions and questions

`Decisions & Questions` contains only decisions whose rationale constrains future implementation or unresolved options that require selection. It does not restate the preceding section as rhetorical questions. A resolved entry uses `Response:`. A genuinely unresolved entry uses `Options:` and the affected behavior remains unimplemented until one option is selected. Current research blockers and operator choices that are not normative contracts belong on the separate decisions/issues HTML page or in source-specific receipts.

The research-decisions HTML page may index a normative unresolved DS question and explain its evidence from another
reader viewpoint, but it cannot be the sole location of a contract-shaping choice. Operational source selection,
benchmark-owner clarification, and replacement-pool acquisition may remain HTML or receipt issues when they do not
change a generic contract.

### HTML technical writing

HTML pages are substantial technical chapters. Every behavioral claim is verified against source, tests, schemas, or generated evidence. An algorithm explanation names its input representation, state, transition or inference rule, termination condition, complexity or bound, witness, failure statuses, and known incompleteness. Storage pages show real manifest, record, shard, index, routing, and cache shapes. Benchmark pages explain what the task tests, exactly which cases ran, which scorer was used, and why a result failed.

Academic background links to primary papers, books, standards, and clearly identified secondary references such as Wikipedia. References establish theoretical context; they do not substitute for describing ESLM's actual algorithm or imply equivalence to a broader formalism.

### Navigation and page layout

The site uses one shared header navigation and breadcrumbs. The home page is a short “start here” view: project
identity and actual boundary, a compact evidence warning and link to the current report, and a two-dimensional sitemap.
`evaluation.html` is the only page that renders the complete public benchmark dashboard. `status.html` shows capability
and roadmap state, links to the evidence report, and does not embed a second dashboard. Other material receives a
dedicated page linked from the sitemap and menu.

Long prose is bounded to a readable measure and left-aligned. Wide tables and code blocks scroll inside their own
containers instead of widening paragraphs; benchmark rows stack into labeled blocks on narrow screens. The desktop
benchmark table uses approximately 30% for benchmark identity, execution mark, concise score, tested/possible scope,
and route coverage, and 70% for human-readable outcomes, protocol, diagnosis, and action. Technical identifiers wrap;
source hashes remain in raw or secondary audit views.

### Diagrams

Use a diagram only when spatial structure clarifies data flow, sequence, hierarchy, ownership, or branching. Mermaid diagrams are normally left-to-right, use three to five primary nodes, short labels, readable bold fonts, and visibly larger labels for acceptance-critical nodes. The surrounding prose explains every node, edge, trust boundary, exceptional path, and limit. Dense graphs are split into several focused diagrams or replaced with prose and tables.

### Generated status and empirical values

The evaluation benchmark table reads `docs/results/latest-public-benchmark-probes.json` in the browser. Current dates,
denominators, percentages, failure counts, adapter state, access state, and next actions exist only there or in typed
source receipts. Hand-authored HTML explains stable task semantics, metric meanings, limitations, and protocols but
does not copy temporary numbers. Per-benchmark pages may render a generated row selected from the same JSON; they do
not hand-maintain counts. Dashboard diagnoses and coverage text come from report rows, never hardcoded
benchmark-specific JavaScript branches.

Roadmap coverage uses `docs/results/current-status.json` with named capability bands, evidence, and boundaries. It remains separate from benchmark accuracy. A check beside a benchmark means the declared probe executed; it does not mean the complete official benchmark is solved.

### Repository-owned skills

Repository-owned training and audit skills under `training/.agents/skills/` remain self-contained. Their exact catalog is maintained in `AGENTS.md`, training documentation, and tests rather than repeated here. A skill carries its own references, scripts, schemas, and templates, imports no host source internally, receives only authorized evidence, and produces untrusted candidates or audit receipts.

Imported maintenance skills under `.agents/skills/` remain read-only during product work. Host documentation describes their role only where it affects repository operations; it does not create product DS files for imported skills.

### Canonical verification

The repository exposes focused tests, full `npm test`, evaluation, benchmark, public-probe publication, KB build and validation, random source-KB checks, scale profiling, spec-matrix generation, documentation validation, source-size checks, and composed `npm run check`. Commands that acquire network data remain explicit and are never hidden inside inference or verification.

Documentation verification checks required pages, shared navigation, local links, assets, diagram constraints when a
diagram is actually used, DS structure, contiguous numbering, and specs-loader targets. A page is not required to add
a decorative diagram. Behavioral tests check generated report schemas, report-owned diagnoses, receipt currentness,
and that every registered reasoning method is documented.

### Synchronization rule

A behavior, interface, schema, method, evaluation, or claim change updates source, tests, its owning DS, affected HTML explanation, and generated evidence in the same change set. Mechanical catalog growth does not trigger unrelated DS rewrites. Before completion, the reviewer rereads affected DS files in order, verifies question numbering and ownership, regenerates the matrix, checks links, and runs the proportionate full verification.

## Decisions & Questions

### Question #1: Why is generated status separate from normative prose?

Response: Measurements and adapter states change after executions, while contracts define how those executions remain interpretable. A generated source prevents stale copied percentages and lets the home page update without rewriting architectural documents.

### Question #2: When are multiple explanations useful rather than redundant?

Response: It is useful when it answers a different reviewer question, such as algorithm semantics versus operational diagnosis, and explicitly references the normative owner. Repeating the same contract in several DS files is redundant and creates contradictory update obligations.

### Question #3: Why is the full benchmark dashboard rendered on only one page?

Response: A single generated view prevents three pages from competing as the empirical authority and reduces visual
noise. Home and status still link to the same raw report, while evaluation explains its fields and limitations in the
appropriate context.

## Conclusion

The documentation system keeps stable contracts, technical explanations, and mutable evidence distinct but synchronized. Orthogonal ownership makes future changes local, while generated status keeps current results honest and reviewable.
