# SpaRC and SpaRP official-source integration note

## What is frozen

SpaRC is the authors' characterization framework; SpaRP is the released dataset carrying those property-controlled tasks and reasoning paths. This track freezes the official `UKPLab/sparp` dataset at immutable Hugging Face revision `2706ed464416758c67a09716ed0262c880ee6bdd`, version 1.1.0, under CC BY-SA 4.0. It also freezes the authors' code repository at commit `b4568a8030976941cb0037fb6399d48f893d8fa4`, under Apache 2.0. The accompanying ACL 2024 paper is identified by DOI `10.18653/v1/2024.acl-long.261`.

The release has 36 logical JSON paths. Twelve full-data files are published twice under byte-identical top-level and `sparp/` aliases. Local retention therefore stores 24 unique LFS blobs by their verified SHA-256, totaling 1,099,442,161 bytes, while preserving the mapping to all 36 official paths. The unique content has 416,678 rows: 402,678 full rows and 14,000 small-view rows. Each top-level JSON array is streamed a record at a time. No valid row is excluded because of source size.

## Property regimes and executable semantics

PS2 declares point objects, complete directional relations, and quantified unit displacement. Its typed execution uses exact integer vector addition. PS3 keeps point objects and relation completeness but removes magnitude. Its declared qualitative policy invalidates only a dimension that encounters opposed steps; unaffected dimensions continue to compose. PS4 declares extended objects, complete directional relations, and no magnitudes. It cannot soundly reuse point-vector cancellation. Its typed method creates start and end boundary variables, encodes separation, object well-formedness, and overlap on unmentioned dimensions as inequalities, and returns a direction only when transitive reachability proves the required endpoint separation.

PS1 combines extended objects, incomplete relations, and unquantified evidence from SpaRTUN. Its records include directional relations, disconnectedness, external connection, partial overlap, proper-part containment and inverses, near/far, and front/behind. Dropping those relations and running only a directional projection would fabricate completeness. The adapter now preserves every declared PS1 relation and emits a task for generic declarative qualitative closure.

The PS1 relation system is adapter-owned data rather than core vocabulary. It declares reciprocal inverses, symmetric relations by self-inverse metadata, mutually exclusive relation groups, directional transitivity, nested proper-part composition, and selective lifting through containment. The lifting policy is deliberately not universal: directional relations, `far`, and disconnectedness lift from containers to contained objects, while `near`, external connection, and partial overlap do not. The core knows only relation identifiers and licensed binary composition rules.

## Oracle and source defects

Targets, target scores, textual reasoning, and symbolic reasoning remain host-only. The task is built solely from the source symbolic context, symbolic question, declared property regime, and public answer domain. The core never receives the target or source identity. Language Agent invocation count is zero.

Some PS3 `symbolic_reasoning` strings contain the non-JSON token `NaN`: 8,713 train rows, 810 validation rows, and 23,375 test rows in the full view, plus 729, 142, and 538 in the small view. The adapter retains and counts this defect. It never uses that answer-bearing field to construct or verify a task.

On the complete full PS1 validation split, declarative qualitative closure solves all 2,397 tasks, matches all 2,397 multi-label targets, and independently replays a proof tree for every returned relation. The 500-row small PS1 validation view is also exact with 500 verified witnesses. Full PS1 covers one through four hops and answers containing one through four simultaneous relations. The official test split remains unexecuted.

On the complete full PS2 validation split, the exact vector method solves and independently verifies all 4,976 tasks. Its answer matches 4,907 targets. The remaining 69 targets conflict with a replayable vector sum over the release's own relation-complete quantified symbolic facts. They are reported as oracle incompatibilities rather than copied into special cases. On full PS3, all 4,499 validation tasks are exact. On full PS4, all 3,775 are exact. The three corresponding 500-row small validation views are also exact.

## Provenance overlap

SpaRP PS2, PS3, and PS4 are not independent evidence from StepGame. Label-free content hashes show that every unique full validation context in these three views occurs in the selected official StepGame validation source. The property regimes are also mostly nested symbolic subsets of one another. The same relationship holds in train and test. `overlap-audit.json` records the exact intersections. Reports must keep the property regimes separate and must not add their case counts to claim a larger independent benchmark sample.

## Core Guardian result

The implemented methods operate on declared types, dimensions, vectors, polarities, task policies, and graph structure. Their tests rename entities, predicates, dimensions, and output values; reverse query direction; reorder evidence; inject disconnected distractors; contrast mixed-direction chains; exercise cancellation and inconsistency; and verify resource bounds. Static tests reject benchmark names and inspected direction vocabulary in both core modules. This is a generic core addition, not a SpaRP dispatch branch.
