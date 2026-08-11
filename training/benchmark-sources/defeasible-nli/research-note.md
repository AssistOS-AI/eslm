# Defeasible NLI source integration and development diagnosis

## Frozen compound source

The adapter uses the complete official release from the Defeasible NLI authors at Git commit `c675ffc1b0eec5fa56287f08490da8ed43c1ecc5`. The archive contains three source families—ATOMIC, SNLI, and Social Chemistry 101—and preserves each family's official train, development, and test split. All nine JSONL files were streamed in full through closed family-specific schemas and verified by exact byte count and SHA-256. The 117,307,435 bytes of dataset payload contain 245,720 source rows. No row or file was rejected because it exceeded an arbitrary size threshold.

The repository carries an MIT license and asks users to cite both the Defeasible NLI paper and all three component datasets. The source manifest records those citations and the upstream CC BY-SA 4.0 terms stated by SNLI and Social Chemistry 101. The ATOMIC component is attributed without inventing a license grant that the pinned compound release does not state separately. Original rows remain in the ignored cache; committed receipts contain identity, schemas, and aggregate counts but no redistributed benchmark text.

## Split and oracle lifecycle

The source publishes 213,226 train rows, 16,008 development rows, and 16,486 test rows. Those official boundaries are unchanged. This cycle loaded only development-visible task text. Its scorer kept `UpdateType` in a host-private oracle map and never placed labels, worker identifiers, assignment identifiers, impossible-row explanations, or component record identifiers in an engine task.

The authors include rows for which an annotator declared the requested update impossible, but omit those rows from their experiments. ESLM retains and validates all 1,040 such development rows, reports them explicitly, and excludes only those rows from the experimental denominator. The resulting development probe has 14,968 eligible cases: 3,840 ATOMIC, 1,785 SNLI, and 9,343 Social Chemistry cases. The source gate validated the test files' identities, closed schemas, and aggregate counts because complete-source validation is mandatory. Test task content and oracle values were not used as development evidence, the adapter exports no test loader, and no test prediction was executed.

## What the development evidence requires

The input asks whether an update strengthens or weakens a hypothesis in the context of an optional premise. A deterministic symbolic solution must compare hypothesis support before and after the update. That final comparison is only meaningful after the three texts have been compiled into explicit entities, events, roles, propositions, modal or normative force, temporal scope, and conflicts. It also needs relevant provenance-bearing commonsense defaults and an ordering that explains which defaults survive the update.

A stable-hash sample from every development family exposed several independent requirements. ATOMIC cases require event consequences, prerequisites, goals, affect, and causal exceptions. SNLI cases require reference resolution, physical attributes, circumstantial compatibility, and alternatives not asserted by the premise. Social Chemistry cases require normative force, justifications, exceptions, perspective, and modality. These are not interchangeable surface patterns. In particular, negation, adverse words, or causal connectives do not have a fixed output direction: their effect depends on the proposition they target and on the background default they defeat or support.

Consider two synthetic, fully renamed structures. If a nonce instrument is expected to complete a task and an update supplies provenance-bearing evidence that its safety interlock passed, the update may increase support for completion. If a nonce traveler is expected to reach a destination and an update states that the only declared route is closed, the update may decrease support. Reordering premises or replacing every entity, predicate, and value must preserve those results. Changing the second structure so that a different, unrelated route is closed must leave support unchanged. Those controls illustrate the necessary semantic contract; keyword polarity cannot distinguish them.

## Baseline and failure semantics

The complete eligible development split was sent to the unchanged direct symbolic engine. All 14,968 cases returned `NO_APPLICABLE_METHOD`; none produced a label. Therefore the receipt reports zero answered and an undefined accuracy over answered cases. It does not report 0% accuracy as though the runtime had made 14,968 evidentially grounded predictions. The run made zero Language Agent calls and zero normalization attempts. It is a coverage baseline for a missing semantic and reasoning path.

## Core Guardian decision

The existing preferred-entailment mechanism can reason over explicit finite defaults, conflicts, and priorities. The current source adapter cannot soundly transform arbitrary benchmark prose into those typed structures, and the current knowledge packages do not supply the needed physical, causal, event, and normative defaults. A new binary operation in the engine would consequently receive no justified symbolic inputs and would not improve a single case.

Core Guardian therefore deferred the proposed before/after support comparison. No generic core, capability registry, planner, language parser, or runtime dispatch changed. The proposal records the intended semantic inputs, proof witness, finite resource bounds, indeterminate outcomes, and fully renamed controls, but the executable rename test remains unpassed because there is no candidate implementation. This is an open engineering gap, not a proof that Defeasible NLI is impossible for a symbolic system.

Rejected alternatives include returning a family majority, treating lexical negation as a weakener, assigning fixed polarity to sentiment words, or dispatching on the benchmark operation and emitting one of its labels. Each alternative can appear to answer cases without representing the hypothesis-support relation and fails meaning-changing contrastive controls.

## Safe next cycle

A later cycle should first define and validate a typed semantic representation for events, propositions, norms, update scope, explicit support and attack links, default priorities, and provenance. It should compile development-visible text without label access and populate missing knowledge through reviewed declarative KB records. Only then should a finite preferred-extension comparator be challenged with nonce vocabulary, complete renaming, reordered evidence, irrelevant updates, direct contradictions, competing defaults, and ambiguous cases. The official test oracle must remain sealed until that development path and all affected regressions are frozen.
