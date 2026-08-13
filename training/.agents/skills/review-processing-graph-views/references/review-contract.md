# Processing-graph view review contract

## Evidence layers

Judge synchronization across all of these layers:

1. **Normative contract** — DS029 owns circuits, nodes, packets, edges, authority, resources, and implementation-state vocabulary. DS027 owns strategy registration and coordination. DS012 owns documentation behavior and presentation.
2. **Declared catalog** — processing-graph, packet-contract, and strategy catalogs declare the inspectable model. Their validation receipts prove schema and catalog invariants, not execution.
3. **Executable owners** — each node's `ownerModule`, registered strategy executor, validators, and tests establish what current code actually performs.
4. **Documentation projection** — the generated explorer projection, view model, explanations, renderer, CSS, homepage legend, and detailed architecture page expose the declared model.
5. **Observed interaction** — browser traversal establishes reachability, geometry, navigation, information panels, line visibility, responsive fit, and terminal behavior.

A complete review crosses all five. A generated-file match alone addresses only layers 2 and 4.

## Semantic questions by content type

### Circuit or group

- Do its children share one real boundary or responsibility?
- Are sibling edges actual typed transfers, or are independent modules falsely shown as one sequence?
- Do inputs and outputs represent real exterior neighbors or terminal systems?
- Does the role describe current code without claiming execution or authority the group does not have?

### Source

- What concrete input is admitted, decoded, or frozen?
- Which owner originates the first packet, and under which bounds?
- Is the absence of an incoming typed edge genuine?

### Process

- What deterministic transformation does the owner perform?
- Are input and output packet fields compatible with the implementation?
- Are failure, resource, and exceptional paths visible rather than hidden in prose?

### Coordinator

- Which alternatives are eligible, funded, scheduled, compared, or selected?
- Is concurrency real, optional, or only descriptive?
- Are correlation groups, confidence meanings, receipts, and per-strategy budgets enforced?
- Does the owner make the decision represented at fan-in, or is another gate authoritative?

### Authority gate

- What exact decision may it permit, reject, return as a gap, or roll back?
- Does code enforce that decision at the claimed location?
- Is it non-voting, and can any strategy or downstream step bypass it?

### Sink or terminal exterior endpoint

- What durable or user-visible effect occurs?
- Is the output already validated before release?
- Is it truly terminal in this catalog? If so, it must not navigate or show a continuation arrow.

### Strategy family and strategy

- Is membership exact and versioned?
- Do types, preconditions, cost, budgets, witness, failures, correlation, authority, and implementation state match registration and execution?
- Do vertical alternatives read as concurrent choices rather than nested processing order?
- Does the output explanation name the owning node's real decision?

## Visual and interaction shapes

Inspect at least one screenshot for every shape and run browser invariants across every reachable focus:

1. root with independent planes;
2. independent boundary modules inside a non-root circuit;
3. ordinary left-to-right circuit with one internal component;
4. ordinary circuit with two or more internal components and typed sibling flow;
5. source leaf without an incoming packet rail;
6. sink leaf without an outgoing packet rail;
7. node with one implementation option;
8. node or family with concurrent alternatives and pagination;
9. exact strategy leaf;
10. adjacent navigable boundary and terminal exterior boundary;
11. desktop and narrow mobile viewport;
12. vertically dragged component with paths still attached.
13. crowded connected row with automatic top/bottom/middle lanes and distinct opposed aggregate paths.

For ordinary horizontal rows, compare both center intervals and visible edge-to-edge gaps across `IN → internal components → OUT`. For independent modules, compare left and right gaps around the centered component. A layout passes only when arrows remain visible and the graph viewport itself does not require horizontal or vertical scrolling.

When a horizontal row is crowded, shrink every IN, internal, and OUT box by the same track-relative inset. Preserve equal visible gaps and a minimum visible arrow segment; do not shrink only selected internal nodes or let boundary rails consume a different spacing regime.

At desktop width, inspect the automatic vertical distribution on every crowded connected row. Two cards must occupy
the highest and lowest safe lanes. Exactly three must use top, bottom, and top. With four or more cards, the third uses
the midpoint and the top/bottom/middle sequence repeats. Each limit accounts for the stage edge, card height, and context label. The lanes must not alter
horizontal centers, edge direction, or semantic order. Verify that manual drag uses only `translateY`, replaces the
automatic lane for that card, and keeps every connected path attached.

Sample every rendered path along its complete SVG length and report line-on-box overlap so the safe-lane layout can be
reviewed. Inspect the path itself as one independent monotonic cubic Bézier connection between its boxes. Both control
points must remain inside the source-to-target span, and the arrow must stay attached after vertical drag. Shared
routing corridors, alternative arc searches, intermediate waypoints, loops, backward handles, a visible rectangular
elbow, or a right-angle connector are visual defects.

At every focus, verify that the complete ancestor breadcrumb is the identity row inside the selected-component header
and that every breadcrumb item carries the icon for its real semantic level or processing role. Reject a separate
component-type caption, duplicated current-component title, separate home/back buttons, an outside breadcrumb, or any
duplicated control that performs the same ancestor move.

Open the header guide control. Navigation instructions, the compact legend, and the complete symbol glossary must be
inside one dialog and absent from the permanently expanded page. At desktop width the dialog must occupy most of the
viewport; component content must not create a second nested scrolling box inside it. Internal scrolling is acceptable
only when the dialog content is taller than that large available surface.

Two opposed aggregate arrows require a reciprocal-path audit. Verify that no exact node pair forms `A → B` and `B → A`, identify the distinct packets and conditions compressed into each aggregate direction, and explain in the legend that interleaved acyclic work inside two groups can cross their shared boundary both ways without creating an execution cycle. Treat an unexplained or exact reciprocal pair as topology drift.

Compare computed path, marker, and legend colors. Typed flow, circuit boundary, implementation envelope, and opposed
aggregate paths must use four visibly distinct encodings; the opposed-path color must appear on the actual paths, not
only in explanatory text or a legend sample.

Every rendered component boundary must expose both sides. When a catalog source has no predecessor, its IN is the concrete external actor or software system that supplies the admitted representation. When a sink has no catalog successor, its OUT is the concrete recipient of the validated result, package, or inert proposal. Human actors, software boundaries, and combined operator/client interfaces use distinct legend icons and concrete information text; none is navigable inside the catalog.

## Explanation rubric

Every information panel must answer in concrete English:

- why this exact entity exists;
- what exact packets or evidence enter;
- what its current owner actually does;
- what decision or transformation it may and may not perform;
- what leaves, where it goes, and whether that destination is navigable;
- what implementation state and authority limit the claim.

Reject text that merely says the item is visual, a leaf, a boundary, inspectable, or not hidden. Those facts may qualify an explanation but cannot replace operational content.

The short context inside the graph follows the same semantic standard at lower detail. It names why the selected
view exists, what transformation or decision its owner performs, and what useful result leaves. Phrases that only say
“selected circuit,” “typed arrows,” “parallel alternatives,” “one exact strategy,” or explain how to read the drawing
belong in the legend and fail the per-view context review.

## Severity

- **Critical** — documentation grants answer, proof, execution, promotion, or authority that code does not have; protected boundaries are misrepresented.
- **High** — wrong topology, packet direction, executable owner, implementation state, strategy membership, or navigable destination.
- **Medium** — missing exceptional path, misleading coordination semantics, unusable navigation, hidden arrows, overlap, overflow, or generic information text.
- **Low** — terminology, truncation, spacing, or legend inconsistency that does not change the understood contract.

## Review report

Use this order:

1. **Checkpoint** — repository identity, dirty state, projection digest, commands.
2. **Coverage** — counts for circuits, nodes, families, strategies, owners, desktop views, and mobile views.
3. **Findings** — severity, class, exact entity/view, source evidence, projected claim, consequence.
4. **Repairs** — owning files and synchronized tests/docs/spec changes.
5. **Residual gaps** — unavailable browser, unexecuted owner, planned semantics, or other unverified evidence.
6. **Verdict** — `current`, `current-with-gaps`, or `drifted`; never use `current` when any evidence layer was skipped.
