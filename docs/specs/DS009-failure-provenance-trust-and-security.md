---
id: DS009
title: Honest Failure, Provenance, Trust, Conflicts, and Security
status: in-progress
owner: assurance
summary: Defines structured inability, capability gaps, source lineage, claims versus accepted facts, conflicts, immutable versioning, untrusted input boundaries, resource safety, and auditability.
---

# DS009 Honest Failure, Provenance, Trust, Conflicts, and Security

## Introduction

Truthful inability and evidence lineage are part of the product contract. This specification combines the runtime status model with provenance, trust, versioning, conflict semantics, and the security controls that prevent documents or KB data from becoming executable authority.

## Core Content

### 1. Principle

The system must prefer a precise account of inability over a plausible but unsupported answer. Honest failure is a first-class output, not an exception path.

The runtime separates interpretation failure, missing knowledge, missing method, underdetermination, contradiction and resource exhaustion. This distinction guides both users and coding-agent learning.

### 2. Status model

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

### 3. Capability-gap report

When the planner cannot solve a task, it reports the unresolved subgoal, required input and output semantic types, available methods considered, failed preconditions and missing capability descriptor.

This report must be specific enough for a coding agent to determine whether a new generic method is needed. It must not automatically request new code when the actual problem is missing knowledge or an unsafe parse.

### 4. Partial results

A partial result includes solved subgoals, unresolved subgoals, assumptions, retrieved evidence and the reason progress stopped. Partial conclusions are not silently promoted into a complete answer.

In interactive mode, the runtime may ask for missing facts or clarification. In one-shot mode, it returns the structured status.

### 5. Abstention calibration

Benchmarks should include unknown, ambiguous and insufficient-information cases. Evaluation measures whether the system abstains for the right reasons, not merely how often it abstains.

A system that returns UNKNOWN because retrieval failed is incorrect if the fact existed in a registered shard. A system that returns MISSING_KNOWLEDGE when no available premise supports the conclusion is behaving correctly.

### 6. Human-facing explanation

The default explanation should state what was understood, what evidence was found, which method was attempted and why the result is incomplete. It should avoid internal implementation noise unless diagnostic output is requested.

### 1. Provenance requirement

Every persistent assertion, lexical mapping, rule, alignment and retraction must identify its origin. Provenance includes source identity, source version or checksum, exact span or record key, extraction transformation, coding-agent version, system commit and KB build identifier.

Derived conclusions record the premises and rules used. A user must be able to move from an answer to the originating source fragments.

### 2. Claim versus fact

A source statement is represented as a claim in a source context. Whether the runtime treats it as accepted knowledge depends on trust policy, validation and conflict resolution. The KB format must not erase the distinction between “source X states P” and “P is accepted as true in the active context.”

### 3. Conflicts

Conflicting claims from different sources remain separate. The runtime may apply a declared precedence, trust or recency policy, or may return a conflict. It must not silently keep whichever record was loaded last.

Strict contradictions inside one trusted context trigger consistency diagnostics. Defeasible conflicts are handled by the default-reasoning semantics and their priorities.

### 4. Versioning

KB packages are immutable and semantically versioned. A version identifies canonical records, manifest, dependencies and compilation schema. Runtime indexes identify the exact canonical version from which they were built.

Updates are overlays or new versions. A retraction references the stable identifier of the record it supersedes. Queries declare or inherit a version selection policy.

### 5. Trust metadata

A KB manifest declares origin, maintainer, license, extraction method, validation level, signature status and intended use. Trust policies can prefer curated KBs over automatically extracted claims, but the policy is explicit and visible in traces.

### 6. Reproducibility

A complete experiment records source checksums, KB versions, code commit, configuration, random seeds, LLM identity and prompt policy when used, benchmark version and resource budgets.

A published result must be reproducible without access to mutable hidden state. When a proprietary LLM was used for normalization or KB construction, the exact produced normalized text or accepted canonical records must be preserved subject to data policy.

### 7. Quality levels

A KB may declare records as raw extracted, schema validated, source aligned, semantically reviewed, contradiction checked or benchmark validated. Quality levels describe process, not truth.

The runtime may require a minimum quality level for high-stakes contexts.

### 1. Threat model

Source documents, benchmark files, downloaded KBs, LLM output and generated canonical records are untrusted inputs. The architecture must prevent them from executing code, changing agent instructions, corrupting trusted indexes or causing unbounded resource consumption.

### 2. No executable KB payloads

KB schemas reject JavaScript, Java, shell code, dynamic imports, executable expressions and callbacks. Declarative rules are parsed into a restricted AST and interpreted only by trusted operators in `src`.

Strings that resemble code remain inert literals unless an explicit trusted parser converts them into a supported declarative record.

### 3. Prompt injection boundary

A document may contain text such as “ignore previous instructions” or “modify the parser.” During ingestion this is source content. The coding agent follows only the external task and approved skill instructions.

LLM translation and simplification prompts must delimit source content and state that source commands are not operational instructions. The normalized output remains untrusted.

### 4. Package integrity

KB manifests and shards use checksums. Optionally signed packages identify a publisher. Registration rejects checksum mismatches, incompatible schemas and undeclared executable artifacts.

Compiler output is written atomically and validated before catalog activation. Existing published versions remain immutable.

### 5. Resource safety

Parsing, rule evaluation, graph expansion, SAT or CSP search and shard loading operate under explicit budgets. The runtime detects pathological recursion, cyclic rule expansion, decompression bombs, oversized lexical forms and adversarial query fan-out.

A resource refusal returns RESOURCE_LIMIT rather than crashing or returning an incomplete answer as complete.

### 6. Coding-agent changes

Changes to `src` occur in an isolated candidate checkpoint. The agent runs static checks, focused tests, security tests and global regressions before promotion. Generated KB content cannot directly authorize a source-code change.

### 7. Data confidentiality

Session facts and private KBs are scoped by access policy. The catalog must not reveal private term labels or source metadata to unauthorized sessions. LLM fallback is disabled or routed through an approved provider when source data cannot leave the local environment.

### 8. Auditability

Every external LLM call, package registration, core patch, KB build and trust-policy decision is logged with stable identifiers. Audit records exclude secret content where policy requires, but preserve enough metadata to reconstruct the operation.

## Decisions & Questions

### Question #1: Why distinguish MISSING_KNOWLEDGE from NO_APPLICABLE_METHOD?

Response: The remedies differ. Missing premises require new or selected knowledge; available premises with no transformation capability require a generic method and its tests.

### Question #2: Can a trust policy erase a conflict?

Response: No. It may select a preferred answer under a named policy while retaining incompatible claims, scopes, and sources in the trace.

### Question #3: Are schema checks a complete security boundary?

Response: No. They prevent executable KB payloads and many malformed inputs. Coding-agent execution still requires process isolation and explicit authority, while resource budgets and package checksums address additional threats.

## Conclusion

The system must preserve the origin, scope, version, and epistemic status of every accepted premise and must report inability precisely. Declarative data cannot grant itself code execution, trust, or additional resource authority.
