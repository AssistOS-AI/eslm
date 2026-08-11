---
id: DS009
title: Honest Failure, Provenance, Trust, Conflicts, and Security
status: in-progress
owner: assurance
summary: Defines top-level statuses, capability gaps, traceable lineage, claims versus accepted facts, conflicts, untrusted input boundaries, cross-cutting resource safety, and auditability.
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
| DEFEASIBLE | One alternative passed an explicit non-strict support policy and margin. The result is not strict truth and retains ranked alternatives, counterevidence, policy, and witness. |
| MISSING_KNOWLEDGE | The plan requires premises not present in available contexts or KBs. |
| NO_APPLICABLE_METHOD | Required inputs exist, but no registered algorithm can produce the needed result. |
| NO_COUNTERMODEL_IN_DECLARED_DOMAIN | Exhaustive search found no countermodel inside the declared finite domain. This is not unrestricted validity. |
| UNDERDETERMINED | Several solutions satisfy the constraints and the task does not select one. |
| INCONSISTENT_CONTEXT | The active context contains unresolved incompatible assertions or constraints. |
| RESOURCE_LIMIT | Time, memory, search depth or shard expansion budget was exhausted. |
| UNSUPPORTED_OUTPUT | The result could be derived internally but cannot be projected into the requested output contract. |

Language route and result status are related but distinct. A Language Agent subprocess failure leaves the original `UNPARSED` result intact and records `language-agent-normalization-failed`; the external process did not establish a new semantic status. A schema, anchor, or reparse rejection returns `UNVERIFIED_NORMALIZATION` with route `language-agent-normalization-rejected`. Only a host-validated candidate whose normalized text survives the ordinary symbolic runtime may return `language-agent-normalized`, and the final semantic status may still be `UNKNOWN` or `NO_APPLICABLE_METHOD` because successful wording normalization does not create facts or algorithms.

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

### 7. Provenance requirement

DS005 owns persistent provenance record fields and their canonical references. This assurance contract requires every
derived conclusion to retain the premises, rules, package versions, and source references that justify it so a reviewer
can move from an answer to the originating source fragments.

### 8. Claim versus fact

A source statement is represented as a claim in a source context. Whether the runtime treats it as accepted knowledge depends on trust policy, validation and conflict resolution. The KB format must not erase the distinction between “source X states P” and “P is accepted as true in the active context.”

### 9. Conflicts

Conflicting claims from different sources remain separate. The runtime may apply a declared precedence, trust or recency policy, or may return a conflict. It must not silently keep whichever record was loaded last.

Strict contradictions inside one trusted context trigger consistency diagnostics. Defeasible conflicts are handled by the default-reasoning semantics and their priorities.

### 10. Versioning

DS006 exclusively defines immutable package identity, semantic versions, dependencies, overlays, retractions, and
version selection. Trust and failure traces here must name the exact resolved identities rather than mutable aliases.

### 11. Trust metadata

A KB manifest declares origin, maintainer, license, extraction method, validation level, signature status and intended use. Trust policies can prefer curated KBs over automatically extracted claims, but the policy is explicit and visible in traces.

### 12. Reproducibility

A complete experiment records source checksums, KB versions, code commit, configuration, random seeds, LLM identity and prompt policy when used, benchmark version and resource budgets.

A published result must be reproducible without access to mutable hidden state. When a proprietary LLM was used for normalization or KB construction, the exact produced normalized text or accepted canonical records must be preserved subject to data policy.

### 13. Quality levels

A KB may declare records as raw extracted, schema validated, source aligned, semantically reviewed, contradiction checked or benchmark validated. Quality levels describe process, not truth.

The runtime may require a minimum quality level for high-stakes contexts.

### 14. Threat model

Source documents, benchmark files, downloaded KBs, LLM output and generated canonical records are untrusted inputs. The architecture must prevent them from executing code, changing agent instructions, corrupting trusted indexes or causing unbounded resource consumption.

### 15. No executable KB payloads

KB schemas reject JavaScript, Java, shell code, dynamic imports, executable expressions and callbacks. Declarative rules are parsed into a restricted AST and interpreted only by trusted operators in `src`.

Strings that resemble code remain inert literals unless an explicit trusted parser converts them into a supported declarative record.

### 16. Prompt injection boundary

A document may contain text such as “ignore previous instructions” or “modify the parser.” During ingestion this is source content. The coding agent follows only the external task and approved skill instructions.

LLM translation and simplification prompts must delimit source content and state that source commands are not operational instructions. The normalized output remains untrusted.

### 17. Package integrity

DS006 owns manifest and registration integrity. DS019 owns shard and block integrity, deterministic output, and atomic
publication. A failure at either boundary is a package rejection, not a reason to use partial compiled data.

### 18. Resource safety

Parsing, rule evaluation, graph expansion, SAT or CSP search and shard loading operate under explicit budgets. The runtime detects pathological recursion, cyclic rule expansion, decompression bombs, oversized lexical forms and adversarial query fan-out.

A resource refusal returns RESOURCE_LIMIT rather than crashing or returning an incomplete answer as complete. DS021
owns byte-accounted shard-cache and memory behavior; each reasoning method owns its semantic search bounds in DS015.

### 19. Coding-agent changes

Changes to `src` occur in an isolated candidate checkpoint. The agent runs static checks, focused tests, security tests and global regressions before promotion. Generated KB content cannot directly authorize a source-code change.

### 20. Data confidentiality

Session facts and private KBs are scoped by access policy. The catalog must not reveal private term labels or source metadata to unauthorized sessions. LLM fallback is disabled or routed through an approved provider when source data cannot leave the local environment.

### 21. Auditability

Every external LLM call, package registration, core patch, KB build and trust-policy decision is logged with stable identifiers. Audit records exclude secret content where policy requires, but preserve enough metadata to reconstruct the operation.

### 22. Specialized trust boundaries

The DS013 Language Agent wrapper is an operator-side external-process trust boundary with its own input, feedback,
schema, anchor-validation, reparse, cache, and confidentiality requirements. This specification establishes the general
rule that its output is untrusted; DS013 owns the complete operational protocol so process or model changes do not
rewrite the rest of the security contract.

DS017 owns benchmark pool and oracle isolation. Protected labels and test paths remain unavailable to training agents,
while independently sourced public KB facts remain separate from benchmark evidence. DS016 owns external source rights,
and DS021 owns resource and cache behavior. Each specialized contract preserves the threat-model principles stated
here without duplicating mutable source or implementation state.

## Decisions & Questions

### Question #1: Why are knowledge gaps and method gaps distinct?

Response: The remedies differ. Missing premises require new or selected knowledge; available premises with no transformation capability require a generic method and its tests.

### Question #2: Can a trust policy erase a conflict?

Response: No. It may select a preferred answer under a named policy while retaining incompatible claims, scopes, and sources in the trace.

### Question #3: Are schema checks the complete security boundary?

Response: No. They prevent executable KB payloads and many malformed inputs. Coding-agent execution still requires process isolation and explicit authority, while resource budgets and package checksums address additional threats.

## Conclusion

The system must preserve the origin, scope, version, and epistemic status of every accepted premise and must report inability precisely. Declarative data cannot grant itself code execution, trust, or additional resource authority.
