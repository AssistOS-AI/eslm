---
id: DS008
title: Task Planning, Method Capabilities, Traces, and Results
status: in-progress
owner: reasoning
summary: Defines task frames, capability-aware AND/OR decomposition, method selection, execution monitoring, Task Calculus audit operators, and normative result contracts.
---

# DS008 Task Planning, Method Capabilities, Traces, and Results

## Introduction

The runtime must interpret more than a graph lookup. It identifies goals and constraints, discovers knowledge and executable methods, decomposes work into typed subproblems, monitors resource use, verifies evidence, and diagnoses the precise point at which progress stops.

## Core Content

### 1. Objective

The runtime must do more than query a graph. It must interpret a task, identify subproblems, select applicable reasoning methods and determine when no available composition can solve the request.

Task planning is generic executable behavior and belongs in `src`. Domain plans may be declarative KB data only when they reference registered methods.

### 2. Task frame

The language front-end produces a task frame containing goals, given facts, assumptions, constraints, requested output type, relevant entities, temporal or hypothetical context and resource limits.

A complex request may contain several goals and dependencies. The task frame preserves their order and logical relation rather than flattening them into one query string.

### 3. Capability registry

Every executable method registers a capability descriptor. The descriptor declares input and output semantic types, preconditions, effects, soundness, completeness, supported uncertainty semantics, proof support and estimated cost.

Examples include taxonomic closure, Datalog evaluation, temporal interval reasoning, graph path search, CSP solving, SAT solving, arithmetic evaluation, coreference resolution, abductive search and ranking under defaults.

The registry allows the planner to reason about available algorithms. It also allows the runtime to explain that a task requires a capability that is not implemented.

### 4. Decomposition

The planner decomposes a goal using semantic structure, method preconditions and declarative domain plans. Decomposition produces an AND/OR task graph. AND nodes require all subgoals. OR nodes represent alternative methods or hypotheses.

The planner should prefer small, typed and verifiable subgoals. It may retrieve knowledge before finalizing the plan because discovered predicates or constraints can change the applicable method set.

### 5. Planning and execution

Candidate plans are ranked by soundness, expected coverage, cost, available evidence and proof requirements. Deterministic exact methods are preferred when applicable. Heuristic or defeasible methods remain explicitly labeled.

Execution monitors derived facts, unresolved references, resource use and contradictions. A failed method may trigger another branch. New terms or subgoals may request additional KB shards through the loader.

The planner must not continue indefinitely. Search budgets, depth limits, time limits and memory limits are explicit inputs. Exceeding a budget produces a resource-limit result with the best partial trace rather than a fabricated answer.

### 6. Declarative domain plans

A KB may declare a plan such as “to answer a treatment-eligibility query, establish diagnosis, contraindications and age constraints, then apply the eligibility rule.” Each step references registered semantic predicates and core methods.

The plan cannot contain code. If a required operator is absent, the runtime reports the missing capability. The coding agent may later implement a generic method in `src` under the core-change protocol.

### 7. Knowledge versus method diagnosis

If no premise can be found for a required subgoal, the planner reports missing knowledge. If premises are available but no method can transform them into the required output, it reports no applicable method. If several methods produce incompatible results, it reports conflict or unresolved uncertainty.

This distinction is essential to the research program because it tells the coding agent whether to improve a KB, a language mapping, a retrieval path or a generic algorithm.

### 8. Proof and trace

Every plan step records the method, inputs, outputs, KB premises, assumptions, confidence semantics and elapsed resources. Deterministic benchmark tasks require a checkable proof or execution witness when the method supports one.

The trace must remain stable enough for failure clustering. A coding agent should be able to identify whether an answer failed during parsing, retrieval, decomposition, method selection, method execution or answer projection.

### 9. Method semantic authority

DS015 is the normative catalog for the executable semantics of every registered generic reasoning method and the
provider-coordination surfaces that do not enter the planner registry. This specification does not duplicate those
algorithms. The planner consumes their capability descriptors, checks typed preconditions and budgets, invokes the
bound executor, and preserves the method's witness and uncertainty status in the task trace.

The currently implemented planner remains narrower than the target AND/OR architecture: ordinary language execution
plans one semantic goal through a deterministic candidate order and an OBSERVE, DERIVE, VERIFY, CONSTRUCT sequence.
Multi-goal decomposition, general alternative-branch execution, declarative domain-plan interpretation, CSP, SAT, and
constraint search require their own executors and acceptance evidence; descriptor names alone do not count as support.

### 10. Task Calculus audit algebra

The semantic operation families are OBSERVE, STRUCTURE, RELATE, REDUCE, DERIVE, CONSTRUCT, VERIFY, and EFFECT. They classify runtime, training, evaluation, and maintenance work; they do not replace linguistic types, world models, or method descriptors.

OBSERVE reads authorized evidence. STRUCTURE compiles spans or records into typed objects. RELATE resolves identity, joins evidence, and constructs graphs. REDUCE filters, groups, deduplicates, ranks, aggregates, or compresses under an explicit criterion. DERIVE executes rules, constraints, calculations, transitions, or plans. CONSTRUCT creates a declarative candidate, response plan, sentence, report, or patch. VERIFY checks schemas, types, effects, invariants, oracles, source coverage, or counterexamples. EFFECT performs an authorized state change and returns a receipt.

The control vocabulary is THEN, ALL, CHOOSE, EACH, UNTIL, BEAM, MEMO, and COMPENSATE. A control may enter an executable plan only after its semantics, budgets, effect behavior, and tests exist. A declared but unimplemented control produces a capability gap. Decomposition is capability-aware: the planner never creates an abstract node and assumes an executor will later appear.

DS004 owns the general training and evaluation assignment contract. Language-question execution uses the specific task
frame below. Every runtime intermediate node must enable execution, verification, selection, caching, provenance,
effect control, or reuse; a wrapper that only renames prose is invalid.

### 11. Task frame schema

The task frame is the authoritative semantic input to planning. It is produced by the language front-end and session manager.

```json
{
  "taskId": "task:session:0042",
  "instructions": ["instr:answer-question"],
  "assertions": ["ir:assertion:1", "ir:assertion:2"],
  "constraints": ["ir:constraint:1"],
  "goals": ["ir:goal:1"],
  "outputContract": {
    "kind": "choice",
    "allowedValues": ["A", "B", "C", "D"]
  },
  "contextStack": ["context:general", "context:session:0042"],
  "languageRoute": "direct-symbolic",
  "budgets": {
    "timeMs": 10000,
    "memoryBytes": 536870912,
    "searchNodes": 100000,
    "shardBytes": 1073741824
  }
}
```

The task frame contains semantic references rather than raw benchmark-specific fields. An adapter may create the output contract but cannot bypass parsing and planning.

### 12. Method capability descriptor

Every reusable executable method in `src` publishes a descriptor.

```json
{
  "methodId": "method:core:datalog-forward",
  "capabilities": ["deduction", "horn-rules", "proof-production"],
  "inputTypes": ["typed-facts", "safe-horn-rules", "query-atom"],
  "outputTypes": ["entailed-status", "proof-graph"],
  "preconditions": ["finite-active-domain", "supported-negation-policy"],
  "soundness": "sound-under-declared-semantics",
  "completeness": "complete-for-supported-fragment",
  "uncertaintySemantics": "strict-only",
  "proofKind": "rule-derivation-graph",
  "costModel": "data-complexity-estimate-v1",
  "implementationVersion": "..."
}
```

The descriptor is metadata about trusted code. The implementation remains in `src`. A KB plan may reference `methodId` but cannot redefine it.

### 13. Declarative plan record

```json
{
  "recordType": "plan",
  "recordId": "plan:domain:eligibility",
  "goalPattern": "goal:domain:Eligibility",
  "steps": [
    {"stepId": "s1", "subgoal": "goal:domain:DiagnosisEstablished"},
    {"stepId": "s2", "subgoal": "goal:domain:NoContraindication"},
    {"stepId": "s3", "methodRef": "method:core:constraint-evaluation", "dependsOn": ["s1", "s2"]}
  ],
  "provenanceRefs": ["prov:domain:policy-17"]
}
```

The plan declares subgoals and references methods. It contains no method code.

### 14. Execution-step trace

```json
{
  "stepId": "exec:0042:17",
  "subgoalRef": "ir:goal:17",
  "methodId": "method:core:datalog-forward",
  "inputRecordRefs": ["fact:...", "rule:..."],
  "loadedShardRefs": ["facts-pso-17", "rules-head-2"],
  "outputRecordRefs": ["derived:0042:91"],
  "status": "completed",
  "resourceUse": {"timeMs": 2, "memoryBytes": 8120},
  "proofRef": "proof:0042:91"
}
```

The trace is detailed enough for benchmark diagnosis and concise enough to store at scale with references.

### 15. Runtime result

```json
{
  "taskId": "task:session:0042",
  "status": "SOLVED",
  "answer": "B",
  "answerSemanticsRef": "derived:0042:91",
  "confidence": {"kind": "logical", "value": 1.0},
  "languageRoute": "direct-symbolic",
  "usedKbVersions": [
    {"kbId": "common.core-ontology", "version": "1.1.0"},
    {"kbId": "benchmark.current", "version": "0.8.2"}
  ],
  "proofRef": "proof:0042:91",
  "traceRef": "trace:0042",
  "unresolvedSubgoals": [],
  "resourceUse": {
    "timeMs": 12,
    "peakMemoryBytes": 14500000,
    "loadedShardBytes": 67108864
  }
}
```

For PARTIAL, MISSING_KNOWLEDGE, NO_APPLICABLE_METHOD or another non-solved status, `answer` may be null and `unresolvedSubgoals` carries structured gap descriptions.

### 16. Capability-gap record

```json
{
  "gapType": "NO_APPLICABLE_METHOD",
  "subgoalRef": "ir:goal:derive-minimal-countermodel",
  "requiredInputTypes": ["first-order-theory"],
  "requiredOutputType": "countermodel",
  "consideredMethods": ["method:core:datalog-forward"],
  "failedPreconditions": ["method does not construct countermodels"],
  "availableEvidenceRefs": ["ir:theory:1"]
}
```

This record tells a coding agent that the problem is algorithmic rather than a missing fact.

### 17. Language-route values

The implemented route vocabulary is `direct-symbolic` for ordinary offline language execution, `direct-symbolic-task-adapter` for an explicit deterministic task projection such as Entity Tracking, `language-agent-normalized` for an accepted assisted rewrite that was reparsed, `language-agent-normalization-rejected` for failed host validation or reparse, and `language-agent-normalization-failed` for an unavailable or unsuccessful subprocess. A rejected candidate uses status `UNVERIFIED_NORMALIZATION`; a subprocess failure preserves the direct `UNPARSED` status and distinguishes the attempted route in the normalization diagnostic. Future symbolic recovery methods must add a named route and tests rather than reuse one of these values ambiguously.

## Decisions & Questions

### Question #1: Why are method descriptors public contracts?

Response: They let the planner choose algorithms by typed preconditions and guarantees, let users distinguish missing knowledge from missing machinery, and let evaluation check whether a claimed method actually produced its witness.

### Question #2: Why do plans use explicit AND/OR structure?

Response: Many tasks require all premises for one method while permitting alternative methods or hypotheses. AND/OR structure makes these obligations, choices, and partial results explicit.

### Question #3: What happens when an execution budget expires?

Response: Execution returns RESOURCE_LIMIT with the best valid partial trace, unresolved subgoals, and resource accounting. It never promotes a partial hypothesis into a complete answer.

## Conclusion

A task is solvable only when accepted semantics, relevant declarative evidence, registered methods, and budgets compose into a verified plan. The result contract makes that composition or its exact gap inspectable.
