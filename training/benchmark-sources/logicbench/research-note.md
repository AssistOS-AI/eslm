# LogicBench Symbolic Learning Note

## Observed failure cluster

The unchanged runtime produced one usable correct binary answer from all 12,908 development-visible questions. The other 12,907 cases did not reach a usable yes/no decision. Traces showed that concatenating a controlled logical context and question did not produce a task frame for propositional entailment, quantified rule instantiation, or prioritized defaults.

## Root cause and layer decision

The reusable gap was a bounded entailment method, while source field names and generated English conventions were adapter concerns. The candidate therefore separates two generic reasoning modules from two source-facing controlled-language adapters. The generic core has no benchmark or axiom dispatch. It accepts only formula operators, explicit defaults, priorities, and resource limits.

## Candidate behavior

Finite classical entailment enumerates all assignments over a bounded set of semantic atoms. A positive decision is supported by exhaustive assignment counts. A negative decision contains a finite countermodel. An inconsistent strict theory returns `INCONSISTENT_CONTEXT` instead of using explosion.

Preferred entailment enumerates strict models, computes violated applicable defaults at each declared priority, retains lexicographically minimum-penalty models, and answers skeptically. Agreement across all preferred models produces a decision; disagreement produces `UNDERDETERMINED`. Explicit exceptions and source reliability are represented as semantic inputs rather than source-row branches.

## Development result

The complete development source was executed: 10,644 of 12,908 questions were correct (82.4605%), and 12,250 of 12,908 reached a direct symbolic decision (94.9024%). No Coding Agent was invoked. This is an ESLM development protocol, not an official LogicBench score.

## Generalization controls

Tests replace every open atom with nonce identifiers, reverse premise order, distinguish valid implication from affirming the consequent, preserve explicit exceptions, and reverse priority insertion order. The static forbidden-dispatch test scans both generic reasoning modules for source identities and rule-family vocabulary. The focused suite passed 11 of 11 tests and the repository suite passed 132 of 132 tests before candidate freeze.

## Resource behavior

Inference is finite and explicitly bounded. `RESOURCE_LIMIT` is returned beyond the atom policy; it never causes source rows to be deleted or skipped. The official source already supplies per-stratum JSON files, which the adapter processes sequentially as source-native shards. The complete immutable archive and every validated source row remain cached.

## Remaining uncertainty

The remaining development errors are not proved impossible. They cluster in lexical proposition alignment, entity and pronoun identity, existential paraphrase semantics, and incomplete controlled parsing of open-domain defaults and exception cardinality. These gaps remain visible rather than being repaired with source axiom names, row identities, answer positions, or inspected evaluation cases.

## Decision

The candidate is eligible for one aggregate-only evaluation of the previously uninspected `LogicBench(Eval)` source. That evaluation is evidence only for the exact dependency hashes in `candidate-manifest.json`; later changes require a new untouched pool.
