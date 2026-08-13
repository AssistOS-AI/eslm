---
name: review-processing-graph-views
description: Audit every ESLM processing-graph explorer view against the current circuit, node, edge, packet, strategy, renderer, specification, and executable-owner evidence. Use when processing-graph catalogs, runtime/compiler/research owners, strategies, graph documentation, explorer layout, navigation, legends, explanations, or implementation-state claims change, and before claiming that diagrams remain synchronized with code.
---

# Review Processing Graph Views

Review the explorer as a semantic projection of current code, not as an illustration that may drift independently.

## Required workflow

1. Read the repository guidance and the authoritative graph and documentation specifications before judging a view. In ESLM, read `AGENTS.md`, `DS001`, `DS012`, `DS027`, and `DS029`; also read `DS028` when research nodes or promotion boundaries are affected.
2. Read [references/review-contract.md](references/review-contract.md) completely. Use its evidence layers, content-type questions, severity rules, and report format.
3. Run the read-only repository audit from the target repository root:

   ```sh
   node training/.agents/skills/review-processing-graph-views/scripts/audit-repository.mjs --root .
   ```

4. Treat generated-data equality and catalog tests as necessary but insufficient. Group projected nodes by `ownerModule`; inspect every owner and compare the actual transformation, packet boundary, authority, failure path, resource bound, selectable strategy behavior, and implementation state with its catalog record and explanation.
5. Review every reachable explorer focus: root, circuit, node, strategy family, and exact strategy. When a browser with the Chrome DevTools Protocol is available, start the documentation site and run:

   ```sh
   node training/.agents/skills/review-processing-graph-views/scripts/audit-browser-views.mjs \
     --url http://127.0.0.1:4173/index.html \
     --cdp http://127.0.0.1:9222
   ```

   Run once at a desktop width and once with `--width 390`. Do not claim a complete visual pass when browser execution was unavailable.
6. Manually inspect at least one screenshot for every distinct layout shape listed in the review contract. Automation catches geometry invariants but cannot judge whether a label or explanation communicates the actual operation clearly.
7. Classify every finding as `semantic-drift`, `state-overclaim`, `topology-drift`, `interaction-defect`, `visual-defect`, `explanation-defect`, or `evidence-gap`. Fix material drift in the owning catalog, generated projection, explorer, tests, DS contract, and HTML documentation together.
8. Rerun both auditors and the affected repository checks. Report exact coverage and remaining gaps; never turn a partial sample into an all-views claim.

## Non-negotiable review rules

- Use source code and validated receipts to verify current behavior. A catalog label, HTML paragraph, or passing snapshot cannot prove execution.
- Keep `planned`, `instrumented-local`, and `coordinated` distinct. Catalog inclusion is not execution evidence, and a strategy descriptor is not proof that its common coordinator ran.
- Verify gates as non-voting authority boundaries. Verify coordinators for real scheduling, budgets, correlation handling, candidate comparison, and receipts rather than inferring those behaviors from an icon.
- Verify every IN/OUT rail as either a real adjacent catalog component or a concrete terminal exterior system. Do not accept decorative or invented boundary nodes.
- Require useful, entity-specific English in every `i` panel. Reject placeholders, generic graph mechanics, and text that does not explain why the node exists, what it consumes, what it does, what it emits, and who decides.
- Require conceptual display labels without repetitive protocol revisions such as `v1` or selector versions such as `@1.0.0`. Verify that exact identities remain unchanged in the catalog and generated projection rather than deleting versioning from the machine contract.
- Require the short context above every graph to state that exact view's responsibility, transformation or decision, and result. Reject context that merely teaches legend notation, arrow style, pagination, hierarchy, or layout; those concepts belong below the graph.
- Require line colors, arrowheads, hover information, and legend explanations to match the same typed-flow, boundary-flow, implementation-envelope, and opposed-aggregate semantics. The four encodings must remain visibly distinct.
- Require every connector to be one independent monotonic cubic Bézier curve directly between its boxes. Reject shared routing corridors, alternative arc searches, intermediate waypoints, loops, backward control points, visible right-angle elbows, or curves whose arrowheads detach from their target when a card moves. Report line-on-box overlap and verify that safe lanes and vertical drag make it inspectable without distorting the connector.
- Require equal horizontal distribution of IN, internal components, and OUT at ordinary circuit depth. Crowded connected desktop rows use top/bottom for two cards, top/bottom/top for exactly three, and a repeating top/bottom/middle cycle for four or more, without changing horizontal centers; manual movement remains vertical and attached paths follow it. Require independent boundary modules and concurrent alternatives to stack vertically; require no graph-area horizontal or vertical scrolling at the tested width.
- Preserve external terminal behavior: terminal systems have information controls but no navigation affordance. Adjacent catalog components navigate to the exact target and update the breadcrumb.
- Require the breadcrumb to be the selected-component identity row inside the header and the single visible ancestor-navigation control. Every item uses its real type or role icon. Reject a separate component-type caption, duplicated current title, home/back toolbar, or second breadcrumb outside the header.
- Require navigation instructions, the compact legend, and the full symbol glossary to live in one large guide dialog opened from the header. Reject a permanently expanded guide below the graph, undersized popups, or nested short scroll regions inside the main dialog.
- Verify human actors, software boundaries, and combined operator/client interfaces as distinct exterior interaction kinds with matching icons, concrete explanations, and no hidden processing-node claim.

## Outputs

Produce one concise review containing:

- checkpoint and commands;
- exact views covered by kind and viewport;
- semantic-owner coverage;
- findings ordered by severity with evidence paths;
- changes made or explicit unresolved gaps;
- final generated-data, test, desktop-browser, and mobile-browser status.

Do not emit promotion claims. This skill audits documentation fidelity and interaction quality only.
