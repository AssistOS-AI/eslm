# bAbI all-20 finite-episode cycle

## Evidence and diagnosis

The cycle enumerated every question in the twenty official `en-10k` training files. It did not open an official test
file. The previous public probe exercised only four families and therefore could not establish coverage of state,
possession, relation, time, counting, coreference, path, size, or motivation tasks outside that sample.

Failure clustering identified a shared finite-episode representation rather than twenty separate solvers. Surface
sentences compile into ordered typed state assignments, relation additions/removals/transfers, binary edges, event-role
records, class membership, class rules, and property observations. Questions compile into typed operations over that
same representation. Source vocabulary, direction aliases, the induction selection rule, and motive-to-goal mappings
remain visible adapter policy. The generic executor receives no task number, dataset identifier, row identifier,
supporting-line annotation, expected answer, or copied entity constant.

## Candidate and result

The candidate executes latest and predecessor state queries, carrier propagation, finite relation sets and counts,
event-role selection, direct and transitive edge queries, exact finite vector propagation with declared axis projection,
path construction, class-rule application, declared induction selection, motive goals, and event-cause lookup. Every
solved or ambiguous outcome has a replayed witness. Fully renamed entities, predicates, relation identifiers, property
values, reordered edges, nonce values, semantic reversals, and tampered witnesses are covered by focused tests.

The complete development run tested 200,000 of 200,000 questions. Nineteen families solved 10,000 of 10,000. Task 5
solved 9,872 of 10,000 and returned `AMBIGUOUS` for 128 questions. All 200,000 witnesses, including the ambiguous event
sets, passed independent replay. No Language Agent call occurred.

## Remaining exception

Each of the 128 Task-5 exceptions contains at least two visible transfers with the same queried agent and recipient but
different transferred objects. The question provides no temporal or ordinal selector. Both objects satisfy the visible
query, while the source's single gold value is selected by a supporting-line annotation that is held outside the task.
The structural audit also finds the same abstract event-mode pattern selecting opposite relative values in different
episodes, which falsifies first, latest, and verb-priority tie breakers. Supplying the annotation to the reasoner would
turn oracle metadata into an answer selector. The candidate therefore preserves semantic soundness and reports all
valid values as ambiguity.

## Promotion boundary

The track-local candidate does not edit the shared capability registry, runtime engine, DS015, HTML documentation, or
public report. Shared promotion must decide whether the finite-episode executor is registered as one orchestration
method or decomposed into smaller descriptors that reuse the existing temporal, container, vector, and relation
executors. Either integration must retain the typed operation schema, declarative policy boundary, independent witness
verification, explicit bounds, and Task-5 ambiguity behavior.
