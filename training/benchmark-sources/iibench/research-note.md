# IIBench official-source integration note

## Source identity and acquisition

The benchmark is the immediate-inference suite accompanying Jiang et al., “Immediate Inference: The Missing Foundation in Large Language Model Logical Reasoning,” ACL 2026. The ACL Anthology paper identifies the authors' repository at <https://github.com/michaellu5475/IIBench>. Revision `5db6067770fa7d7fdc93b0b17747c7f1cf1d35c8` of that repository is the only data source used by this adapter. No similarly named image, database, or unrelated “II-Bench” source was substituted.

The complete author archive remains in the ignored immutable cache. It contains five JSONL data files and 5,284 rows. The adapter streams and validates all 5,284 rows; it does not impose a row, byte, or sample budget and does not silently drop a valid record. The archive, paper, each data file, and the combined source inventory are pinned by SHA-256 in the adjacent manifests.

The pinned repository has no `LICENSE` file and GitHub reports no detected license. The paper says that factual inputs originate in Wikidata under CC0 and that WordNet material is used under the Princeton WordNet license. Those statements describe upstream inputs and do not grant a license for the assembled repository. Local authorized research evaluation can proceed under the user's research authorization, but redistribution or use outside that setting needs explicit author permission or a later author-supplied license revision. The direct operator action is recorded in `source-manifest.json`.

## Visibility boundary

The author release labels every row as test data and supplies no train or development split. Before any categorical capability work, the adapter therefore freezes a reproducible 80/20 development/fresh partition. Membership depends only on source filename, source ID, and visible task strata. It never depends on a truth label, generated candidate, or gold conclusion. The development pool exposes typed premises and task metadata but never returns oracle fields. The fresh 1,088-row pool remains host-only and has not been evaluated.

For truth judgment, the candidate statement is part of the question and is therefore visible; only `gold_label` is oracle. For conversion, obversion, and contraposition, the source `candidate` is the required answer and remains host-only. For syllogisms, `candidate_gold` and its answer-description fields remain host-only. This distinction prevents a field named `candidate` from being treated uniformly when its semantic role differs by task.

## Baseline and scoring boundary

The baseline executes all 4,196 development rows through the current engine's typed-task interface with Coding Agent calls disabled. Strict schema validation supplies categorical forms and canonical terms, so the baseline does not pretend that a language-parser failure is a categorical-reasoning result. The engine returns `NO_APPLICABLE_METHOD` for every row because it has no registered categorical operation. Consequently the diagnostic result is 0/4,196 and identifies a capability absence rather than individual answer errors.

This result is not an official IIBench score. The official benchmark accepts operation-specific negation normalization and, for syllogisms, specified logical-equivalence transformations. The current core emitted no outputs, so invoking or approximating that surface scorer would not change the result and could create a misleading claim of comparability. A future categorical implementation must first add a generic typed representation and sound operations, then implement and test the benchmark's published equivalence contract outside the inference core before any official-comparable claim is made.

## Generic capability gaps

The missing capability clusters are a typed representation for A/E/I/O categorical propositions with explicit term-complement depth; truth judgment over the square of opposition under an explicit existential-import policy; conversion, obversion, and contraposition as generic algebraic transformations; multi-premise syllogistic composition across figures; and a controlled realizer/equivalence checker. These are semantic capability families. They are not benchmark names, item identifiers, answer strings, entity constants, or source-category branches, and this integration makes no shared-core change.
