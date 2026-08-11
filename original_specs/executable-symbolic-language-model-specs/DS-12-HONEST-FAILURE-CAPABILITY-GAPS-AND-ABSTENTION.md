# DS-12 — Honest Failure, Capability Gaps and Abstention

## 1. Principle

The system must prefer a precise account of inability over a plausible but unsupported answer. Honest failure is a first-class output, not an exception path.

The runtime separates interpretation failure, missing knowledge, missing method, underdetermination, contradiction and resource exhaustion. This distinction guides both users and coding-agent learning.

## 2. Status model

| Status | Meaning |
|---|---|
| SOLVED | A complete answer was derived under the declared semantics and budgets. |
| PARTIAL | Some subgoals were solved, but the complete requested result was not established. |
| UNKNOWN | The available knowledge neither entails nor contradicts the target. |
| AMBIGUOUS | Multiple admissible interpretations or hypotheses lead to different answers. |
| UNPARSED | The language front-end could not construct safe Semantic IR. |
| UNVERIFIED_NORMALIZATION | LLM normalization could not be shown to preserve protected semantics. |
| MISSING_KNOWLEDGE | The plan requires premises not present in available contexts or KBs. |
| NO_APPLICABLE_METHOD | Required inputs exist, but no registered algorithm can produce the needed result. |
| UNDERDETERMINED | Several solutions satisfy the constraints and the task does not select one. |
| INCONSISTENT_CONTEXT | The active context contains unresolved incompatible assertions or constraints. |
| RESOURCE_LIMIT | Time, memory, search depth or shard expansion budget was exhausted. |
| UNSUPPORTED_OUTPUT | The result could be derived internally but cannot be projected into the requested output contract. |

## 3. Capability-gap report

When the planner cannot solve a task, it reports the unresolved subgoal, required input and output semantic types, available methods considered, failed preconditions and missing capability descriptor.

This report must be specific enough for a coding agent to determine whether a new generic method is needed. It must not automatically request new code when the actual problem is missing knowledge or an unsafe parse.

## 4. Partial results

A partial result includes solved subgoals, unresolved subgoals, assumptions, retrieved evidence and the reason progress stopped. Partial conclusions are not silently promoted into a complete answer.

In interactive mode, the runtime may ask for missing facts or clarification. In one-shot mode, it returns the structured status.

## 5. Abstention calibration

Benchmarks should include unknown, ambiguous and insufficient-information cases. Evaluation measures whether the system abstains for the right reasons, not merely how often it abstains.

A system that returns UNKNOWN because retrieval failed is incorrect if the fact existed in a registered shard. A system that returns MISSING_KNOWLEDGE when no available premise supports the conclusion is behaving correctly.

## 6. Human-facing explanation

The default explanation should state what was understood, what evidence was found, which method was attempted and why the result is incomplete. It should avoid internal implementation noise unless diagnostic output is requested.
