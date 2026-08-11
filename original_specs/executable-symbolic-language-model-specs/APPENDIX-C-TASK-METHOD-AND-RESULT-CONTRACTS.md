# Appendix C — Task, Method and Result Contracts

## 1. Task frame

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

## 2. Method capability descriptor

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

## 3. Declarative plan record

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

## 4. Execution-step trace

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

## 5. Runtime result

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

## 6. Capability-gap record

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

## 7. Language-route values

The route is one of direct-symbolic, symbolic-recovery, llm-translation-then-symbolic, llm-simplification-then-symbolic, normalization-rejected or unparsed. Every benchmark and runtime report uses the same values.
