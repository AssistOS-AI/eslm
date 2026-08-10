# Program Induction by Coding Agents

## 1. Central idea

A coding agent can transform corpus evidence into executable symbolic competence, but only if the process is treated as program induction rather than unrestricted software generation. The unit of learning is a **circuit**: a typed module that recognizes or manipulates StoryIR and declares measurable coverage.

Examples include:

- a construction that parses “X was afraid of Y”;
- a rule that updates possession after “X gave Y to Z”;
- a pronoun-ranking feature;
- a narrative schema for lost-object stories;
- a realization template for requests;
- a benchmark query handler.

## 2. Circuit contract

Every circuit declares:

```text
id and semantic version
input and output types
preconditions
postconditions
side effects
confidence semantics
training evidence
known counterexamples
complexity cost
test suite
provenance
```

A circuit cannot inspect protected test data. It cannot modify global state outside declared stores. It must be deterministic under a fixed seed unless explicitly probabilistic.

## 3. Failure-driven induction

The training loop produces typed failures. Examples are grouped by the earliest failing layer rather than by final wrong answer:

```text
lexical unknown
construction parse gap
slot typing conflict
reference ambiguity
missing event schema
incorrect state effect
narrative prediction gap
realization failure
```

Clustering uses surface signatures, partial parses, semantic types, and world-state context. The agent receives a small representative packet and negative examples selected to prevent an overly broad rule.

## 4. Hypothesis formation

The agent must formulate a minimal hypothesis before writing code:

```text
Observed regularity
Proposed input pattern
Proposed semantic effect
Expected coverage
Likely false positives
Tests that would falsify it
```

The hypothesis is stored beside the circuit. Large speculative changes are decomposed into smaller hypotheses.

## 5. Synthesis methods

Coding agents may use several symbolic induction strategies.

### Anti-unification

Find the least general generalization of multiple examples by replacing differing spans or graph nodes with typed variables.

### Frequent subgraph and subsequence mining

Identify recurring event chains, construction fragments, or world-state transitions.

### Inductive logic programming style search

Propose Horn or defeasible rules whose bodies use existing predicates and whose heads explain labeled outcomes.

### Grammar induction

Propose weighted productions or constructions that compress recurring text while preserving minimal-pair discrimination.

### CEGIS

Use a counterexample-guided loop in which the verifier returns a concrete failing story, parse, or state trace. The agent revises the candidate until it passes or the budget expires.

### Program repair

When a circuit causes regressions, localize the violated invariant and synthesize a guard, exception, or narrower type constraint.

## 6. Acceptance gate

A circuit is accepted only if all of the following hold:

1. schema and static checks pass;
2. unit and property tests pass;
3. it improves a declared development metric or materially reduces description length;
4. it does not exceed regression thresholds on unrelated capabilities;
5. its improvement persists on a shadow split inaccessible during synthesis;
6. its complexity-adjusted gain is positive;
7. provenance and documentation are complete.

The model registry retains rejected candidates and reasons. This is useful negative evidence for future agents.

## 7. Complexity control

Without a complexity penalty, agents can memorize the corpus through lexicalized branches. Each circuit receives a description-length cost based on source size, AST nodes, literal constants, rule clauses, and numeric parameters. Duplicate or subsumed circuits are merged.

A candidate that explains ten examples with a ten-line general rule is preferred to one that lists ten strings. A highly complex circuit can still be accepted if it solves a broad, independently validated phenomenon.

## 8. Split discipline

The corpus is partitioned before induction into:

```text
train
agent-development
shadow-validation
public-test
protected-final-test
```

Agents see train and selected agent-development examples. The orchestration runtime evaluates shadow validation automatically but returns only aggregate diagnostics unless a controlled counterexample budget is enabled. Final test remains untouched until an experimental milestone is frozen.

## 9. Teacher-assisted induction

In S2, a teacher LLM may annotate StoryIR or propose a circuit. Teacher output is untrusted. It must cite source spans, pass the same validators, and be distilled into executable artifacts. No teacher-generated annotation is placed in final evaluation unless independently verified.

Teacher cost and model identity are recorded. An S2 model cannot be described as trained only on TinyStories without qualification because the teacher imports external linguistic and world knowledge.

## 10. Multi-agent work organization

Recommended roles are:

- corpus analyst;
- construction-grammar engineer;
- semantic parser engineer;
- world-model engineer;
- narrative-schema engineer;
- realization engineer;
- evaluation engineer;
- falsification and leakage auditor;
- integration maintainer.

The orchestrator assigns non-overlapping contracts and requires ADRs for shared interfaces. Agents should not simultaneously modify StoryIR and evaluation logic.

## 11. Generated code safety

Corpus text is untrusted data and must never be executed. Generated circuits run in a restricted process with CPU, memory, file, and time limits. Network access is disabled during evaluation. A circuit cannot invoke an LLM or external service unless its regime and side effect are explicitly declared.

## 12. Research output

The induction history forms a scientific artifact: which patterns were discovered, how many examples supported them, what counterexamples changed them, and which capabilities emerged as the library grew. This history may be as informative as the final benchmark score.
