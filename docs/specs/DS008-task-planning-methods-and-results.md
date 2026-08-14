---
id: DS008
title: Task Planning, Method Capabilities, Traces, and Results
status: in-progress
owner: reasoning
summary: Defines current single-goal, typed-task, and grounded generative request-plan paths; the target capability-aware AND/OR planner; Task Calculus audit operators; traces; and normative results.
---

# DS008 Task Planning, Method Capabilities, Traces, and Results

## Introduction

The target runtime interprets more than a graph lookup: it identifies goals and constraints, discovers knowledge and
executable methods, decomposes work into typed subproblems, monitors resource use, verifies evidence, and diagnoses the
precise point at which progress stops. The current implementation is a smaller, bounded vertical slice. It constructs a
single-goal plan skeleton for ordinary language requests and uses an explicit operation-to-executor dispatch table for
typed tasks. A separate DS022 heuristic request planner can decompose recognized artifact requests into
dependency-ordered retrieval, correlation, selection, and shaping subrequests and executes a bounded grounded symbolic
construction circuit. It can generate coherent English wording and document structure only from admitted supplied or
KB claims; it is not a general latent-language generator. This specification preserves the complete target while labeling those distinct current boundaries
directly.

## Core Content

### 1. Objective

The target runtime must do more than query a graph. It must interpret a task, identify subproblems, select applicable
reasoning methods and determine when no available composition can solve the request.

Task planning is generic executable behavior and belongs in the trusted implementation layer. Domain plans may be declarative KB data only when they reference registered methods.

In the logical processing architecture, planning is a named processing node between accepted task meaning and method
execution. Its output is a typed plan or a capability gap, not an opaque callback chain. Alternative planning
strategies may propose candidates to a coordination node, but a safety precondition, method precondition, or proof
obligation is an authority gate and cannot be weakened by a confidence vote.

### 2. Task frame

The target language front-end produces a task frame containing goals, given facts, assumptions, constraints, requested
output type, relevant entities, temporal or hypothetical context and resource limits.

A complex request may contain several goals and dependencies. The task frame preserves their order and logical relation rather than flattening them into one query string.

Currently, `taskFrameFromQuery` creates exactly one goal from one parsed query. It records assertions, constraints, an
output contract, a context stack, a language route, and default or supplied budgets. Multi-goal order and dependency
semantics remain target behavior for the general semantic planner. The separate DS022 request planner does preserve a
bounded dependency list for recognized summarize, expand, explain, compare, outline, retrieve, and compose patterns;
that list is an artifact-construction receipt, not evidence that `taskFrameFromQuery` or `createPlan` implements general
multi-goal planning.

### 3. Capability registry

Every reusable generic method that participates in capability selection must publish a descriptor. The target
descriptor declares input and output semantic types, preconditions, effects, soundness, completeness, supported
uncertainty semantics, proof support and estimated cost.

DS027 defines the common strategy descriptor and coordinator around this planner-facing capability. A reasoning method
keeps its stable `methodId` and complete semantic descriptor; when exposed through the strategy control plane, a
separate exact `strategyId` declares its stage, scheduling, configuration, resources, and receipt. The strategy layer
cannot weaken a method precondition or turn method applicability confidence into answer confidence.

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
linear audit sequence. The DS022 request planner constructs a fixed dependency order among its bounded subrequests but
does not create alternatives, dynamically expand proof obligations, or interpret arbitrary dependencies. References
to AND/OR nodes elsewhere in this specification therefore describe the target architecture, not the behavior of
`createPlan` or the request planner today.

### 5. Planning and execution

In the target planner, candidate plans are ranked by soundness, expected coverage, cost, available evidence and proof
requirements. Deterministic exact methods are preferred when applicable. Heuristic or defeasible methods remain
explicitly labeled.

When several methods or plan decompositions are eligible, DS027 owns the canonical schedule, finite preallocation,
typed proposal ledger, and meta-rational arbitration at the method-planning coordination node. Voting may rank an
applicable plan or preserve alternatives; reasoning execution then returns method results and witnesses rather than
answer votes. A proof-verification gate independently accepts or rejects each witness. Neither planning nor method
agreement can establish a premise, override a safety precondition, select a gold answer, or turn agreement among
non-strict methods into a strict proof.

Execution monitors derived facts, unresolved references, resource use and contradictions. A failed method may trigger another branch. New terms or subgoals may request additional KB shards through the loader.

The planner must not continue indefinitely. Search budgets, depth limits, time limits and memory limits are explicit inputs. Exceeding a budget produces a resource-limit result with the best partial trace rather than a fabricated answer.

The current `eslm-work-policy-v1` supplies exact named bounds for DS022 approximation and request analysis, DS035
query-local context construction, Horn closure, provider search, and failure grounding. Its `quick`, `balanced`,
`deep`, and `exhaustive-bounded` profiles are physical work choices, not new inference regimes. A larger profile may
finish an otherwise bounded frontier, but completed executions with the same semantics must agree on values, proof,
and provenance. Task planning may use the DS035 question-family and focus ledger to identify work, but no context rank
becomes a premise until evidence admission and no KB result may revise language interpretation. The broader task-frame
time, memory, and search model shown below remains a target wherever the selected executor does not enforce it.

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

DS027 owns the target coordination plane for this composition. It requires all selected method strategies to be
visible as ineligible, executed, abstained, failed, invalid, or resource-limited and requires an independent
verification stage before result construction. The three paths below remain distinct implementation boundaries;
typed envelopes around the ordinary path make its dataflow auditable, but do not establish unified strategy
coordination or a general AND/OR planner.

The current implementation has three distinct bounded coordination paths:

1. **Ordinary-language path.** `taskFrameFromQuery` creates one goal. The `runtime.method.plan` owner maps the query's
   reasoning tag to `deduction`, `induction`, `abduction`, or `temporal-predecessor`, filters registry entries by that
   capability, chooses the lexicographically first method identifier, and emits a closed planning envelope plus
   `OBSERVE → DERIVE → VERIFY → CONSTRUCT`. The `runtime.reason.execute` owner accepts that envelope and a bounded
   host-owned model, closure, index, and history snapshot, then dispatches only the reviewed capability-to-method
   binding for retrieval/Horn deduction, configured induction, guarded abduction, or temporal predecessor. It returns
   a bounded result and witness candidate with `truthAuthorized: false`. The `runtime.result.verify` authority gate
   then replays method-specific support against the supplied closure, rules, policy, or history without invoking the
   executor again. It may authorize only a non-empty strict `ANSWERED` result; induction and abduction retain their
   non-strict status, malformed witnesses reject, and exhausted verification work returns `RESOURCE_LIMIT` before
   construction. These three nodes are real `instrumented-local`, non-selectable seams. Planning still does not inspect
   all descriptor preconditions or costs, construct alternatives, invoke the registry callback, or delegate through
   the shared DS027 coordinator.

   The same ordinary envelopes now admit the existing `method:core:finite-episodic-world` descriptor for the narrow
   possession-location carrier task defined in DS015. Its executor may return internal `DEFAULTED`; verification
   independently checks the exact episodic operation witness and the two host-owned supports, and public construction
   maps it to `DEFEASIBLE` with `truthAuthorized: false`. This extends an existing method family rather than adding a
   new planner or processing node.
2. **Typed-task path.** `EslmEngine.executeTask` uses an allowlisted operation-to-descriptor-and-executor table. Each
   selected trusted executor validates and runs its own typed task, and the result records the method identifier. This
   path does not call `createPlan` and does not construct a general AND/OR graph.
3. **Heuristic artifact-request path.** The DS022 planner evaluates explicit request force independently of the
   ordinary direct result, so an imperative containing sentence-like material can preempt an accidental assertion
   parse without retaining its tentative session effects. It votes over intent and shape candidates and emits bounded
   subrequests for supplied-material extraction, per-topic related-record retrieval, correlation, content selection,
   and output shaping. Its current executor copies selected source sentences and cited KB statements into a `PARTIAL`
   artifact. It does not call `createPlan`, derive new factual bridges, treat retrieval as proof, or establish general
   task decomposition.

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

Currently, ordinary-language plan skeletons emit only OBSERVE, DERIVE, VERIFY, and CONSTRUCT in one fixed order. The
plan object does not invoke its registry callback; the engine passes closed envelopes through the separate ordinary
planning, execution, and method-specific verification owners described in Section 9. DS022 request subrequests use explicit dependency IDs, but
those IDs are a fixed bounded construction schedule and do not implement the Task Calculus control vocabulary. None of
THEN, ALL, CHOOSE, EACH, UNTIL, BEAM, MEMO, or COMPENSATE is currently an executable general-planner control.

DS004 owns the general training and evaluation assignment contract. Language-question execution uses the specific task
frame below. Every runtime intermediate node must enable execution, verification, selection, caching, provenance,
effect control, or reuse; a wrapper that only renames prose is invalid.

### 11. Task frame schema

The task frame is the authoritative semantic input to planning. It is produced by the language front-end and session
manager. The following is the target multi-goal-capable shape. The current ordinary-language helper fills the same
families of fields but places one parsed query object in `goals` and does not yet interpret dependencies among goals.
The DS022 artifact route returns a task-frame-shaped view whose goals are its explicit request subrecords and whose
output contract carries artifact, format, length, citation, and unsupported-content policy; clients distinguish it by
language route and must not treat that view as a general semantic AND/OR graph.

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

This is the target execution-step trace. The current ordinary-language plan exposes a four-step skeleton and its
planning, execution, and verification nodes use closed versioned envelopes. Method results, verification work,
witnesses, provenance, and optional profiler measurements are still returned through their current node/result fields;
they are not yet joined into this complete per-step cross-stage ledger. The target trace is detailed enough for
benchmark diagnosis and concise enough to store at scale with references.

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
`usedKbVersions` contains only KBs whose evidence contributed to the primary result. Ordinary failure-time grounding
keeps its contributor versions inside the separate bundle and never inflates `usedKbVersions`. On the explicitly
planned `heuristic-request-synthesis` route, records admitted by the claim gate and realized into cited sentences are
primary source-claim contributions, so those records and their versions appear in top-level provenance and
`usedKbVersions`. Related but rejected records do not. The sentences remain non-entailing evidence and cannot support
`SOLVED` merely because the presentation is fluent.

DS035 adds optional `knowledgeContext` using `eslm-task-knowledge-context-v1`. Its selected and consulted identities
record early bounded context work, while its entries remain non-answer evidence. A strict result does not copy those
entries into top-level provenance or `usedKbVersions`. On the separate `knowledge-context-fallback` route, only entries
actually realized as cited source claims enter both fields; the result is `PARTIAL`, values are empty, and its
realization ledger says that no precise answer was established.

The implemented possession-location default is a current exception to the earlier statement that the ordinary result
does not expose answer confidence. Its `reasoning.confidence` is the fixed v1 heuristic grade `0.62`, accompanied by
the exact carrier assumption and a `DEFEASIBLE` public status. It is not an empirical probability, calibration claim,
or proof weight. Exact object location remains `SOLVED` retrieval and therefore does not use that grade.

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

The implemented route vocabulary is:

- `english-language-gate-rejected` for a bounded likely-non-English local refusal that performs no translation;
- `direct-symbolic` for ordinary offline English execution and `direct-symbolic-task-adapter` for an explicit
  deterministic task projection such as Entity Tracking;
- `heuristic-cnl-approximated` for a locally changed candidate accepted through reparse,
  `heuristic-cnl-ambiguous` when similarly supported accepted candidates differ semantically,
  `heuristic-request-planned` when an artifact intent was understood but no source material was available, and
  `heuristic-request-synthesis` for bounded cited `PARTIAL` construction;
- `language-agent-normalized` for an accepted assisted rewrite that was reparsed,
  `language-agent-normalization-rejected` for failed host validation or reparse, and
  `language-agent-normalization-failed` for an unavailable or unsuccessful subprocess.

A changed local interpretation that would otherwise be strict is exposed as `DEFEASIBLE`, and its episode-derived
premises are query-local. A rejected Language Agent candidate uses status `UNVERIFIED_NORMALIZATION`; a subprocess
failure preserves the direct `UNPARSED` status and distinguishes the attempted route in the normalization diagnostic.
The general CLI and deployed/library runtime omit the Language Agent strategy by default. The general CLI composes it
only after explicit `--external-language-agent` or `/normalize on` opt-in. Likely non-English input may then reach translation proposals directly from the gate; English
simplification remains reachable only after exhaustion of DS022 local recovery. Future
recovery methods must add a named route and tests rather than reuse one of these values ambiguously.

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

Response: That is the behavior the code actually exposes. The ordinary route now passes a selected descriptor and
audit skeleton through distinct bounded execution and witness-verification node contracts, but it still uses one
reviewed capability dispatch rather than the shared strategy coordinator. Typed tasks use a different allowlisted
operation table. The heuristic artifact route uses a third fixed construction schedule. Treating these paths as a
completed general planner would hide incomplete precondition and cost analysis, placeholder registry callbacks,
absent AND/OR decomposition, and adapter-local solvers. They may be unified later only when one tested planner owns
selection, invocation, budgets, witnesses, and gaps without weakening existing method contracts.

### Question #5: What does a reasoning-method vote mean?

Response: It can express applicability, expected cost, declared coverage, or a method-specific defeasible preference.
It cannot express truth by popularity. A strict result requires the method's declared derivation and independent
witness validation; verified disagreement remains a conflict, and an incomplete or resource-limited method has no
negative answer vote.

The term is retained only for method-planning preference. Once a reasoning executor runs, its output is a typed method
result plus witness. The result is merged under epistemic rules only after independent verification; it is not a
confidence ballot over answer truth.

### Question #6: Why expose a confidence grade for the possession-location answer?

Response: The two stated facts support a useful carrier hypothesis but do not entail the object's location. A modest
fixed grade lets the human and machine views rank that answer below strict retrieval while the status, assumption,
support IDs, and independently checked episodic witness disclose why it was offered. Version 1 deliberately calls the
number heuristic rather than calibrated; changing it requires evidence, controls, and a versioned policy rather than a
presentation-only tweak.

## Conclusion

In the target architecture, a task is solvable only when accepted semantics, relevant declarative evidence, registered
methods, and budgets compose into a verified plan. Today, the ordinary route has bounded single-goal planning,
method execution, and fail-closed witness-verification nodes; typed operations provide additional separately bounded
reasoning slices; and DS022 provides a bounded grounded symbolic construction slice with distinct claim-admission,
rhetorical-plan, sentence-realization, document-assembly, and result-validation boundaries. The shared multi-method coordinator and
complete cross-stage ledger remain target work. The result contract must identify the path actually used and make its
verified composition, cited source claims, or exact gap inspectable.
