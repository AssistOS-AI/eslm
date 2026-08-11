# DS-11 — Benchmark-Guided Learning and Regression

## 1. Purpose

A coding agent uses reasoning benchmarks as training signals for an executable system. It may improve the current KB, language knowledge, CNL implementation, retrieval, planning and generic reasoning, but it must prove that changes generalize and do not destroy previously acquired capabilities.

The agent’s objective is not to make a finite set of questions green. Its objective is to convert recurring failures into reusable knowledge or mechanisms.

## 2. Baseline

Before modification, the agent records answer accuracy, direct symbolic rate, normalized accuracy, parse coverage, proof validity, execution failures, latency and failure categories. Benchmark sources and official labels are cached immutably with version and checksum.

Development, fresh, regression and shadow pools are separated. The agent may inspect development failures. Fresh samples have not been used for diagnosis. Regression samples represent existing competencies. Shadow results expose aggregates without individual examples.

## 3. Failure classification

Every failure is classified by root cause. The main classes are lexical knowledge, domain ontology, missing fact, CNL grammar, semantic composition, scope, coreference, retrieval, shard routing, missing declarative rule, missing generic method, incorrect method, planning, ranking, contradiction, uncertainty, resource limit and unknown.

The trace is authoritative. A wrong answer with a correct parse requires a different intervention from a wrong parse with a potentially adequate reasoner.

## 4. KB-first but not KB-only

The default correction is made in the current KB when the missing artifact is knowledge, terminology, an event frame, a domain rule or a source convention. The agent does not distort the generic core to absorb dataset vocabulary.

A change to `src` is considered when multiple independent examples reveal the same generic structural limitation and a KB workaround would duplicate or misrepresent semantics. The Core Change Guardian skill must approve the proposal.

## 5. Candidate validation

A candidate fix is first tested on the motivating cluster. It is then tested on fresh structurally related examples, nonce substitutions, semantic-preserving metamorphic transformations, semantic-changing contrastive transformations and all relevant regressions.

A parser change must demonstrate that direct symbolic rate increases on fresh data and that existing parse meanings remain stable. A retrieval or sharding change must demonstrate result equivalence with an exhaustive reference mode. A reasoning change must validate proof or witness semantics.

## 6. Acceptance rule

A candidate is accepted when the target capability improves on fresh samples, no critical regression appears, global metrics do not materially decline, proof validity remains within policy, direct symbolic autonomy does not decrease without explicit justification, and system complexity remains proportionate to the gain.

An aggregate score increase cannot hide a severe regression in a previously mastered capability. The agent must compare capability-level metrics.

## 7. Overfitting defenses

The agent must not encode benchmark IDs, question hashes, exact sentences, answer lookup tables or branches on dataset names. Static checks search for these patterns. More importantly, fresh generators and nonce transformations test whether the learned mechanism survives lexical and structural changes.

Finite public test sets are not used as an iterative development source. When an inspected holdout example influences a patch, it becomes development data and a new holdout must replace it.

## 8. CNL learning during KB ingestion

The same protocol applies when document ingestion reveals unsupported forms. Frequent normalized constructions may motivate a generic grammar proposal. The agent must show that the form is semantically stable, improves direct parsing across independent text, and does not alter existing benchmark interpretations.

If this evidence is absent, the form remains handled by validated normalization or remains unsupported.

## 9. Checkpoints and research record

Every accepted change produces a checkpoint and a concise record of observed failure, root cause, chosen layer, patch, expected generalization, focused results, fresh results, regressions, direct symbolic effect and system-size effect.

Rejected patches are also informative and should be retained when they reveal an architectural limit or unstable interaction.

## 10. Completion for one benchmark

A benchmark is substantially learned when unseen performance is stable across repeated samples, direct symbolic parsing is high for its intended CNL level, proof validity is adequate, shadow results confirm the gain, remaining failures form understandable hard classes and no material regression exists in prior suites.

The accepted core and KBs then become the starting checkpoint for the next benchmark.
