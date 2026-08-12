---
id: DS008
title: Task Planning, Method Capabilities, Traces, and Results
status: in-progress
owner: reasoning
summary: Defines the current bounded single-goal dispatch, the target capability-aware AND/OR planner, Task Calculus audit operators, traces, and normative result contracts.
---

# DS008 Task Planning, Method Capabilities, Traces, and Results

## Introduction

The target runtime interprets more than a graph lookup: it identifies goals and constraints, discovers knowledge and
executable methods, decomposes work into typed subproblems, monitors resource use, verifies evidence, and diagnoses the
precise point at which progress stops. The current implementation is a smaller, bounded vertical slice. It constructs a
single-goal plan skeleton for ordinary language requests and uses an explicit operation-to-executor dispatch table for
typed tasks. This specification preserves the complete target while labeling that current boundary directly.

## Core Content

### 1. Objective

The target runtime must do more than query a graph. It must interpret a task, identify subproblems, select applicable
reasoning methods and determine when no available composition can solve the request.

Task planning is generic executable behavior and belongs in `src`. Domain plans may be declarative KB data only when they reference registered methods.

### 2. Task frame

The target language front-end produces a task frame containing goals, given facts, assumptions, constraints, requested
output type, relevant entities, temporal or hypothetical context and resource limits.

A complex request may contain several goals and dependencies. The task frame preserves their order and logical relation rather than flattening them into one query string.

Currently, `taskFrameFromQuery` creates exactly one goal from one parsed query. It records assertions, constraints, an
output contract, a context stack, a language route, and default or supplied budgets. Multi-goal order and dependency
semantics remain target behavior rather than a current parser or planner claim.

### 3. Capability registry

Every reusable generic method that participates in capability selection must publish a descriptor. The target
descriptor declares input and output semantic types, preconditions, effects, soundness, completeness, supported
uncertainty semantics, proof support and estimated cost.

Examples include taxonomic closure, Datalog evaluation, temporal interval reasoning, graph path search, CSP solving, SAT solving, arithmetic evaluation, coreference resolution, abductive search and ranking under defaults.

The current `CapabilityRegistry` validates required descriptor fields, stores a descriptor with a callback, and filters
candidates by an advertised capability string. It does not yet prove that a callback is a complete binding, evaluate
the descriptor's preconditions, compare cost models, or enforce budgets. The target registry and planner must add those
checks before descriptor metadata can be treated as an applicability proof.

### 4. Decomposition

The target planner decomposes a goal using semantic structure, method preconditions and declarative domain plans.
Decomposition produces an AND/OR task graph. AND nodes require all subgoals. OR nodes represent alternative methods or
hypotheses.

The planner should prefer small, typed and verifiable subgoals. It may retrieve knowledge before finalizing the plan because discovered predicates or constraints can change the applicable method set.

The current planner does not construct this graph. It selects one advertised capability for one goal and emits one
linear audit sequence. References to AND/OR nodes elsewhere in this specification therefore describe the target
architecture, not the behavior of `createPlan` today.

### 5. Planning and execution

In the target planner, candidate plans are ranked by soundness, expected coverage, cost, available evidence and proof
requirements. Deterministic exact methods are preferred when applicable. Heuristic or defeasible methods remain
explicitly labeled.

Execution monitors derived facts, unresolved references, resource use and contradictions. A failed method may trigger another branch. New terms or subgoals may request additional KB shards through the loader.

The planner must not continue indefinitely. Search budgets, depth limits, time limits and memory limits are explicit inputs. Exceeding a budget produces a resource-limit result with the best partial trace rather than a fabricated answer.

### 6. Declarative domain plans

A target KB may declare a plan such as “to answer a treatment-eligibility query, establish diagnosis,
contraindications and age constraints, then apply the eligibility rule.” Each step references registered semantic
predicates and core methods.

The plan cannot contain code. If a required operator is absent, the runtime reports the missing capability. The coding agent may later implement a generic method in `src` under the core-change protocol.

Version 1 validates and stores `plan` records but does not project or interpret them. A package containing such a record
therefore has preserved plan data, not an executable domain workflow.

### 7. Knowledge versus method diagnosis

The target planner distinguishes three cases. If no premise can be found for a required subgoal, it reports missing
knowledge. If premises are available but no method can transform them into the required output, it reports no applicable
method. If several applicable methods produce incompatible results, it reports conflict or unresolved uncertainty.

The current ordinary planner reports `NO_APPLICABLE_METHOD` only when no registered descriptor advertises the mapped
capability. Missing evidence is discovered later by the selected engine branch and normally returns `UNKNOWN`; the
planner does not yet construct a premise-level missing-knowledge diagnosis. Typed-task executors return their own
validated status and diagnostic through the allowlisted dispatch path. Documentation and benchmark reports must retain
this distinction instead of attributing every later failure to planner analysis.

This distinction is essential to the research program because it tells the coding agent whether to improve a KB, a language mapping, a retrieval path or a generic algorithm.

### 8. Proof and trace

In the target contract, every executed plan step records the method, inputs, outputs, KB premises, assumptions,
confidence semantics and elapsed resources. Deterministic benchmark tasks require a checkable proof or execution
witness when the method supports one.

The trace must remain stable enough for failure clustering. A coding agent should be able to identify whether an answer failed during parsing, retrieval, decomposition, method selection, method execution or answer projection.

### 9. Method semantic authority

DS015 is the normative catalog for executable method semantics and provider-coordination surfaces. This specification
does not duplicate those algorithms. The target planner consumes capability descriptors, checks typed preconditions and
budgets, invokes a bound executor, and preserves its witness and uncertainty status in the task trace.

The current implementation has two distinct bounded dispatch paths:

1. **Ordinary-language path.** `taskFrameFromQuery` creates one goal. `createPlan` maps the query's reasoning tag to
   `deduction`, `induction`, `abduction`, or `temporal-predecessor`, filters registry entries by that capability, chooses
   the lexicographically first method identifier, returns plan status `planned`, and emits
   `OBSERVE → DERIVE → VERIFY → CONSTRUCT`. It does not inspect
   descriptor preconditions or cost models, enforce the task budgets, or invoke `selected.execute`. `EslmEngine.ask`
   executes retrieval, Horn closure, configured induction, abduction, or temporal predecessor through explicit branches
   after plan construction. Several registry callbacks on this path are consequently placeholders rather than the
   active execution route.
2. **Typed-task path.** `EslmEngine.executeTask` uses an allowlisted operation-to-descriptor-and-executor table. Each
   selected trusted executor validates and runs its own typed task, and the result records the method identifier. This
   path does not call `createPlan` and does not construct a general AND/OR graph.

SAT is implemented on the typed-task path: `decide-boolean-entailment` invokes
`method:core:scalable-boolean-entailment`, whose semantics and independent certificate verification are defined in
DS015. It is an implemented bounded Boolean executor, not evidence that the general planner performs SAT planning. The
ZebraLogic adapter also contains a reviewed source-local finite-domain CSP solver and uniqueness check, but it is not a
registered reusable core capability or a general planner route. Multi-goal decomposition, alternative-branch
execution, declarative domain-plan interpretation, general CSP planning, and planner-driven constraint search remain
target capabilities. A descriptor name, adapter-local solver, or fixed plan label alone does not count as that support.

### 10. Task Calculus audit algebra

The semantic operation families are OBSERVE, STRUCTURE, RELATE, REDUCE, DERIVE, CONSTRUCT, VERIFY, and EFFECT. They classify runtime, training, evaluation, and maintenance work; they do not replace linguistic types, world models, or method descriptors.

OBSERVE reads authorized evidence. STRUCTURE compiles spans or records into typed objects. RELATE resolves identity, joins evidence, and constructs graphs. REDUCE filters, groups, deduplicates, ranks, aggregates, or compresses under an explicit criterion. DERIVE executes rules, constraints, calculations, transitions, or plans. CONSTRUCT creates a declarative candidate, response plan, sentence, report, or patch. VERIFY checks schemas, types, effects, invariants, oracles, source coverage, or counterexamples. EFFECT performs an authorized state change and returns a receipt.

The target control vocabulary is THEN, ALL, CHOOSE, EACH, UNTIL, BEAM, MEMO, and COMPENSATE. A control may enter an
executable plan only after its semantics, budgets, effect behavior, and tests exist. A declared but unimplemented
control produces a capability gap. Target decomposition is capability-aware: it never creates an abstract node and
assumes an executor will later appear.

Currently, ordinary-language plan skeletons emit only OBSERVE, DERIVE, VERIFY, and CONSTRUCT in one fixed order. Those
labels make the intended phases auditable; they do not prove that the plan object invoked the executor or verifier. The
engine performs the actual branch described in Section 9. None of THEN, ALL, CHOOSE, EACH, UNTIL, BEAM, MEMO, or
COMPENSATE is currently an executable planner control.

DS004 owns the general training and evaluation assignment contract. Language-question execution uses the specific task
frame below. Every runtime intermediate node must enable execution, verification, selection, caching, provenance,
effect control, or reuse; a wrapper that only renames prose is invalid.

### 11. Task frame schema

The task frame is the authoritative semantic input to planning. It is produced by the language front-end and session
manager. The following is the target multi-goal-capable shape. The current ordinary-language helper fills the same
families of fields but places one parsed query object in `goals` and does not yet interpret dependencies among goals.

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

The task frame contains semantic references rather than raw benchmark-specific fields. A typed adapter may construct
the task and output contract directly. The current typed-task path does not call the general planner, but it still must
pass task validation and the allowlisted operation-to-executor dispatch; an adapter cannot call arbitrary code or expose
its oracle as task input.

### 12. Method capability descriptor

Every reusable executable method exposed through capability selection or typed-task dispatch publishes a descriptor.
Provider-coordination surfaces that intentionally remain outside those routes still require an equally explicit
semantic contract in DS015, but they are not falsely presented as registered planner methods.

```json
{
  "methodId": "method:core:safe-horn-deduction",
  "capabilities": ["deduction", "horn-rules", "proof-production"],
  "inputTypes": ["typed-facts", "safe-horn-rules", "query-atom"],
  "outputTypes": ["semantic-values", "rule-derivation-graph"],
  "preconditions": ["finite-active-domain", "positive-safe-rules"],
  "soundness": "sound-under-declared-safe-horn-semantics",
  "completeness": "complete-within-declared-round-budget",
  "uncertaintySemantics": "strict-only",
  "proofKind": "rule-derivation-graph",
  "costModel": "indexed-bounded-forward-chaining-v1",
  "implementationVersion": "1"
}
```

This example mirrors the current descriptor. The descriptor is metadata about trusted code, not proof that the generic
planner checked every field or called its bound callback. The implementation remains in `src`. A KB plan may reference
`methodId` but cannot redefine it.

### 13. Declarative plan record

```json
{
  "recordType": "plan",
  "recordId": "plan:domain:eligibility",
  "kbNamespace": "domain.eligibility",
  "schemaVersion": "1",
  "goalPattern": "goal:domain:Eligibility",
  "steps": [
    {"stepId": "s1", "subgoal": "goal:domain:DiagnosisEstablished"},
    {"stepId": "s2", "subgoal": "goal:domain:NoContraindication"},
    {"stepId": "s3", "methodRef": "method:core:safe-horn-deduction", "dependsOn": ["s1", "s2"]}
  ],
  "provenanceRefs": ["prov:domain:policy-17"]
}
```

The plan declares subgoals and references methods. It contains no method code. Version 1 validates and stores this
shape, but the generic package projection does not execute it; the example is a target declarative plan rather than a
current workflow.

### 14. Execution-step trace

```json
{
  "stepId": "exec:0042:17",
  "subgoalRef": "ir:goal:17",
  "methodId": "method:core:safe-horn-deduction",
  "inputRecordRefs": ["fact:...", "rule:..."],
  "loadedShardRefs": ["facts-pso-17", "rules-head-2"],
  "outputRecordRefs": ["derived:0042:91"],
  "status": "completed",
  "resourceUse": {"timeMs": 2, "memoryBytes": 8120},
  "proofRef": "proof:0042:91"
}
```

This is the target execution-step trace. The current ordinary-language plan exposes a four-step skeleton, while method
results, witnesses, provenance, and optional profiler measurements are returned through their existing result fields;
they are not yet joined into this complete per-step record. The target trace is detailed enough for benchmark diagnosis
and concise enough to store at scale with references.

### 15. Runtime result

```json
{
  "taskId": "task:session:0042",
  "status": "SOLVED",
  "answer": "B",
  "answerSemanticsRef": "derived:0042:91",
  "confidence": {"kind": "logical", "value": 1.0},
  "languageRoute": "direct-symbolic",
  "selectedKbVersions": [
    {"kbId": "common.core-ontology", "version": "1.1.0"},
    {"kbId": "benchmark.current", "version": "0.8.2"}
  ],
  "consultedKbVersions": [
    {"kbId": "common.core-ontology", "version": "1.1.0"}
  ],
  "usedKbVersions": [
    {"kbId": "common.core-ontology", "version": "1.1.0"}
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

This example states the durable target result contract. Current results use `eslm-runtime-result-v1` and expose the
implemented subset of these fields directly. For PARTIAL, MISSING_KNOWLEDGE, NO_APPLICABLE_METHOD or another
non-solved status, `answer` may be null and `unresolvedSubgoals` carries structured gap descriptions.
`selectedKbVersions` is the configured search scope, `consultedKbVersions` is the subset actually queried, and
`usedKbVersions` contains only KBs whose evidence contributed to the primary result. Failure-time grounding keeps its
contributor versions inside the separate bundle and never inflates `usedKbVersions`.

### 16. Capability-gap record

```json
{
  "gapType": "NO_APPLICABLE_METHOD",
  "subgoalRef": "ir:goal:derive-minimal-countermodel",
  "requiredInputTypes": ["first-order-theory"],
  "requiredOutputType": "countermodel",
  "consideredMethods": ["method:core:safe-horn-deduction"],
  "failedPreconditions": ["method does not construct countermodels"],
  "availableEvidenceRefs": ["ir:theory:1"]
}
```

This is the target complete gap shape. It tells a coding agent that the problem is algorithmic rather than a missing
fact. The current `capabilityGap` helper emits the same field families but may place the parsed goal object directly in
`subgoalRef`, and it can establish only that no descriptor advertises the mapped capability. It does not yet prove the
more detailed precondition analysis illustrated above.

### 17. Language-route values

The implemented route vocabulary is `direct-symbolic` for ordinary offline language execution, `direct-symbolic-task-adapter` for an explicit deterministic task projection such as Entity Tracking, `language-agent-normalized` for an accepted assisted rewrite that was reparsed, `language-agent-normalization-rejected` for failed host validation or reparse, and `language-agent-normalization-failed` for an unavailable or unsuccessful subprocess. A rejected candidate uses status `UNVERIFIED_NORMALIZATION`; a subprocess failure preserves the direct `UNPARSED` status and distinguishes the attempted route in the normalization diagnostic. Future symbolic recovery methods must add a named route and tests rather than reuse one of these values ambiguously.

## Decisions & Questions

### Question #1: Why are method descriptors public contracts?

Response: They make a method's promised inputs, guarantees, limits, and witness reviewable independently from its code.
The target planner uses those fields for applicability and cost decisions. The current planner uses only advertised
capabilities and deterministic method identifiers, so documentation and results must not imply that all descriptor
preconditions were machine-checked merely because a method was selected.

### Question #2: Why does the target planner use explicit AND/OR structure?

Response: Many tasks require all premises for one method while permitting alternative methods or hypotheses. AND/OR
structure makes these obligations, choices, and partial results explicit. The current linear four-step skeleton is a
deliberate implementation slice, not a substitute for that graph semantics.

### Question #3: What happens when an execution budget expires?

Response: A method or target planner that exhausts an enforced budget returns RESOURCE_LIMIT with its best valid partial
trace, unresolved subgoals, and resource accounting. It never promotes a partial hypothesis into a complete answer.
Current typed executors enforce their declared semantic bounds, while the ordinary `createPlan` helper records task
budgets but does not itself enforce them.

### Question #4: Why are current method selection and execution described as separate paths?

Response: That is the behavior the code actually exposes. The ordinary planner returns a selected descriptor and an
audit skeleton, after which `EslmEngine.ask` executes an explicit reasoning branch. Typed tasks use a different
allowlisted operation table. Treating either path as a completed general planner would hide missing precondition checks,
placeholder registry callbacks, absent AND/OR decomposition, and adapter-local solvers. The paths may be unified later
only when one tested planner owns selection, invocation, budgets, witnesses, and gaps without weakening existing method
contracts.

## Conclusion

In the target architecture, a task is solvable only when accepted semantics, relevant declarative evidence, registered
methods, and budgets compose into a verified plan. Today, bounded single-goal selection and typed operation dispatch
provide smaller reviewable slices of that architecture. The result contract must identify the path actually used and
make either its verified composition or its exact gap inspectable.
