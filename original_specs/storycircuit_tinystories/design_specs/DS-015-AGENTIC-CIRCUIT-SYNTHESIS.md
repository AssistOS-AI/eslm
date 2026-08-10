# DS-015 — Coding-Agent Circuit Synthesis

**Status:** Normative research protocol  
**Version:** 0.1  
**Depends on:** DS-001, DS-014, DS-016

## Goal

Use coding agents as program-induction workers without converting protected test examples into hand-coded rules or allowing uncontrolled growth of an opaque codebase.

## Unit of synthesis

An agent proposes a **circuit package** containing:

```text
circuit manifest
pure typed implementation
preconditions and postconditions
unit tests
property tests
adversarial tests
complexity declaration
training-evidence references
expected failure domain
migration note
```

Circuits implement narrow transformations such as a construction recognizer, coreference constraint, event-effect rule, state query, planner repair, or verifier. A circuit named `solve_story` or another unrestricted escape hatch is rejected.

## Counterexample-guided loop

```text
cluster train/dev failures
-> produce minimized failure packets
-> formulate competing hypotheses
-> synthesize smallest circuit
-> run local tests
-> run regression suite
-> run shadow validation controlled by harness
-> compute utility and description-length change
-> accept, revise, or reject
```

The agent sees aggregate shadow results and typed failure categories, not protected texts. It cannot edit the evaluation harness, split manifests, acceptance thresholds, or previous results.

## Acceptance objective

A candidate is accepted only when:

```text
utility_gain
- alpha * added_description_length
- beta * runtime_cost
- gamma * regression_risk
- delta * unsupported_assumptions
> threshold
```

A gain on examples lexically similar to the proposal evidence is insufficient. The harness evaluates lexical, structural, and story-level holdouts.

## Repository permissions

Agent workspaces are isolated branches or directories. Agents may write only to assigned modules and tests. Network, shell, dependency installation, and model calls are policy-controlled and logged. Generated code is treated as untrusted until sandboxed tests pass.

## Agent roles

```text
corpus analyst
linguistic induction scientist
world-model engineer
probability auditor
evaluation adversary
performance engineer
integration maintainer
```

The `agents/` directory provides scoped prompts and handoff contracts.

## Anti-overfitting rules

- no literal story sentence longer than a configured threshold in production code;
- no lookup by test identifier, file position, hash, or exact prompt;
- lexical lists require corpus statistics and class rationale;
- each special case must state why a type or construction cannot represent it;
- generated tests precede implementation where feasible;
- circuit deletion ablation is recorded.

## Acceptance criteria

All accepted circuits pass static checks, unit/property tests, protected validation, and serialization tests. The final report lists agent-generated circuit count, accepted/rejected proposals, code size, teacher usage, regressions, and measured marginal contribution.
