---
id: DS016
title: Documentation, Reports, and Repository Operations
status: implemented
owner: repository
summary: Defines authoritative DS maintenance, detailed HTML navigation, generated latest reports, local serving, validation, and change synchronization.
---

# DS016 Documentation, Reports, and Repository Operations

## Core Content

### Documentation hierarchy

DS files under `docs/specs/` are the detailed source of truth. `matrix.md` indexes every contiguous DS. HTML pages explain concepts, current theory, architecture, generated model structure, reasoning traces, CLI use, training, evaluation, and benchmarks and link to relevant DS contracts. Generated report HTML displays the latest evaluation and benchmark executions with timestamps and protocol ids.

`README.md` is an executable orientation, not the complete architecture. `AGENTS.md` defines working rules and the skill catalog. Repository-owned `synthesize-eslm-model` and `benchmark-guided-symbolic-learning` documentation remains inside each portable skill folder and is referenced from training documentation rather than duplicated as an imported-skill page.

### HTML requirements

Every principal page contains several compact diagrams where they materially clarify local flows, accessible navigation, responsive layout, current capability boundaries, and direct links to DS files through `specsLoader.html`. Each diagram must have adjacent prose explaining its purpose, inputs, processing steps, output, and connection to source modules. Pages load as static files through a local HTTP server because the DS loader uses `fetch`.

Page titles and introductory headings must fit normal reading layouts without artificial narrow widths or oversized display typography. Explanatory pages use continuous chapters rather than decorative card grids. The DS loader presents breadcrumb and metadata in compact lines and must not duplicate the specification title in a large metadata panel.

`docs/index.html` is the current capability disclosure. It first explains the experiment, then separates controlled benchmark evidence, QUICK fixtures, and source-derived WordNet/ATOMIC knowledge. It reports generated counts, load state, randomized verification, scale costs, and unsupported boundaries. Every model promotion, corpus build, profiling contract, runtime capability, or skill change updates this page in the same change set. Examples shared with the CLI tutorial remain executable through tests.

`knowledge-sources.html` explains real-corpus order, semantics, licenses, source roles, and milestones. `scalability.html` explains current bottlenecks, the architecture gate, profiling, probing, sharding, and contextual scope. Benchmark details remain on `datasets.html` and must not be mistaken for the KB source inventory.

The standard loader is copied from `gamp-specs` to preserve consistent Markdown/frontmatter behavior. The site may use the Mermaid CDN for diagrams; inference remains offline. A documentation build without network still shows the Mermaid source block rather than affecting runtime.

### Reports

Evaluation and benchmark commands with `--publish` write `latest-*.json` then render `latest-*.html`. Reports include creation time, report/protocol format, suite or dataset identity, aggregate metric, and per-case verdicts. Scientific reports must additionally include dataset hash, adapter version, evidence regime, coverage, uncertainty, and environment.

Latest reports are mutable evidence snapshots and must not be cited as immutable experiment ids. A future archive command will preserve versioned runs by digest.

### Specification workflow

When a behavior or instruction changes, identify affected DS files, update Core Content first, then add or revise numbered decision entries only for rationale or genuine unresolved choices. Review implementation, tests, HTML, README/AGENTS, and matrix for drift.

DS frontmatter includes id, title, status, owner, and summary. IDs are contiguous from DS000. The generated matrix uses these fields. An implemented status means the stated current contract is implemented; planned subsections may still be clearly labeled inside an in-progress DS.

### Operational commands

Use `npm test`, `npm run evaluate`, `npm run benchmark`, `npm run docs:check`, and `npm run check`. Serve documentation with any local static HTTP server selected by the user; the project does not add a server dependency. `fileSizesCheck.sh` reports oversized files and long lines.

The full check validates source behavior, current model, report generation, and required documentation files. It does not download public datasets or contact external models.

Operational diagnostics include `corpus catalog`, `corpus status`, `kb list`, `kb validate`, `ask --profile`, interactive `/kbs`, `/model`, `/trace`, `/profile`, and `train prepare --profile`. `npm run test:kbs:random` publishes the seeded WordNet/ATOMIC source-query report. Profiling reports contain variable durations and memory deltas, while semantic results and model artifacts remain deterministic.

### Change review checklist

Review repository shape and prohibited languages; Node and package metadata; model safety; split isolation; relevant unit and integration tests; current evaluation; public benchmark protocol; DS/HTML synchronization; skill catalog; file size; Git diff for unrelated changes; and claim wording.

Current negative findings remain documented in the experiment report that produced them. User-facing architecture and theory pages must describe the current system rather than narrate superseded implementations. Distinguish fixed implementation defects from untested current hypotheses.

## Decisions & Questions

### Q1. Why maintain both Markdown specifications and HTML pages?

Response: Markdown is precise and reviewable in version control; HTML provides navigable diagrams and current reports. The loader prevents duplicating DS content manually.

### Q2. May reports be regenerated during `npm run check`?

Response: Yes. The command explicitly includes evaluation and benchmark publication. Their timestamps will change, which honestly records the latest run.

### Q3. Does documentation network access violate offline ESLM?

Response: No. Runtime inference and model loading remain offline. Mermaid rendering is a documentation concern; core content remains readable when the CDN is unavailable.
