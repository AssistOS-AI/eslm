# DS-09 — Symbolic Task Decomposition and Planning

## 1. Objective

The runtime must do more than query a graph. It must interpret a task, identify subproblems, select applicable reasoning methods and determine when no available composition can solve the request.

Task planning is generic executable behavior and belongs in `src`. Domain plans may be declarative KB data only when they reference registered methods.

## 2. Task frame

The language front-end produces a task frame containing goals, given facts, assumptions, constraints, requested output type, relevant entities, temporal or hypothetical context and resource limits.

A complex request may contain several goals and dependencies. The task frame preserves their order and logical relation rather than flattening them into one query string.

## 3. Capability registry

Every executable method registers a capability descriptor. The descriptor declares input and output semantic types, preconditions, effects, soundness, completeness, supported uncertainty semantics, proof support and estimated cost.

Examples include taxonomic closure, Datalog evaluation, temporal interval reasoning, graph path search, CSP solving, SAT solving, arithmetic evaluation, coreference resolution, abductive search and ranking under defaults.

The registry allows the planner to reason about available algorithms. It also allows the runtime to explain that a task requires a capability that is not implemented.

## 4. Decomposition

The planner decomposes a goal using semantic structure, method preconditions and declarative domain plans. Decomposition produces an AND/OR task graph. AND nodes require all subgoals. OR nodes represent alternative methods or hypotheses.

The planner should prefer small, typed and verifiable subgoals. It may retrieve knowledge before finalizing the plan because discovered predicates or constraints can change the applicable method set.

## 5. Planning and execution

Candidate plans are ranked by soundness, expected coverage, cost, available evidence and proof requirements. Deterministic exact methods are preferred when applicable. Heuristic or defeasible methods remain explicitly labeled.

Execution monitors derived facts, unresolved references, resource use and contradictions. A failed method may trigger another branch. New terms or subgoals may request additional KB shards through the loader.

The planner must not continue indefinitely. Search budgets, depth limits, time limits and memory limits are explicit inputs. Exceeding a budget produces a resource-limit result with the best partial trace rather than a fabricated answer.

## 6. Declarative domain plans

A KB may declare a plan such as “to answer a treatment-eligibility query, establish diagnosis, contraindications and age constraints, then apply the eligibility rule.” Each step references registered semantic predicates and core methods.

The plan cannot contain code. If a required operator is absent, the runtime reports the missing capability. The coding agent may later implement a generic method in `src` under the core-change protocol.

## 7. Knowledge versus method diagnosis

If no premise can be found for a required subgoal, the planner reports missing knowledge. If premises are available but no method can transform them into the required output, it reports no applicable method. If several methods produce incompatible results, it reports conflict or unresolved uncertainty.

This distinction is essential to the research program because it tells the coding agent whether to improve a KB, a language mapping, a retrieval path or a generic algorithm.

## 8. Proof and trace

Every plan step records the method, inputs, outputs, KB premises, assumptions, confidence semantics and elapsed resources. Deterministic benchmark tasks require a checkable proof or execution witness when the method supports one.

The trace must remain stable enough for failure clustering. A coding agent should be able to identify whether an answer failed during parsing, retrieval, decomposition, method selection, method execution or answer projection.
