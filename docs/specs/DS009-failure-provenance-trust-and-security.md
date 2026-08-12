---
id: DS009
title: Honest Failure, Provenance, Trust, Conflicts, and Security
status: in-progress
owner: assurance
summary: Defines top-level statuses, capability gaps, failure-time related evidence, traceable lineage, claims versus accepted facts, conflicts, untrusted input boundaries, resource safety, and auditability.
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
| DEFEASIBLE | A result was selected under declared non-strict retrieval, induction, abduction, or preference semantics. It is not strict truth and retains its method-specific source edge, alternatives, counterevidence, policy, confidence, or witness. |
| MISSING_KNOWLEDGE | The plan requires premises not present in available contexts or KBs. |
| NO_APPLICABLE_METHOD | Required inputs exist, but no registered algorithm can produce the needed result. |
| NO_COUNTERMODEL_IN_DECLARED_DOMAIN | Exhaustive search found no countermodel inside the declared finite domain. This is not unrestricted validity. |
| UNDERDETERMINED | Several solutions satisfy the constraints and the task does not select one. |
| INCONSISTENT_CONTEXT | The active context contains unresolved incompatible assertions or constraints. |
| RESOURCE_LIMIT | Time, memory, search depth or shard expansion budget was exhausted. |
| UNSUPPORTED_OUTPUT | The result could be derived internally but cannot be projected into the requested output contract. |

Language route and result status are related but distinct. A Language Agent subprocess failure leaves the original `UNPARSED` result intact and records `language-agent-normalization-failed`; the external process did not establish a new semantic status. A schema, anchor, or reparse rejection returns `UNVERIFIED_NORMALIZATION` with route `language-agent-normalization-rejected`. Only a host-validated candidate whose normalized text survives the ordinary symbolic runtime may return `language-agent-normalized`, and the final semantic status may still be `UNKNOWN` or `NO_APPLICABLE_METHOD` because successful wording normalization does not create facts or algorithms.

Reasoning methods may use narrower internal lifecycle labels while they are executing. For example, categorical
methods historically return `ANSWERED` internally. The public `eslm-runtime-result-v1` boundary normalizes every
successful internal label to `SOLVED` and validates it against the table above; clients must never receive an
undocumented internal status as the top-level protocol status.

The public-provider boundary also preserves epistemic strength. ATOMIC event tuples and ConceptNet relations whose
metadata says `defeasible-edge` return `DEFEASIBLE`; a matching strict provider cannot upgrade an agreeing defeasible
answer to `SOLVED`. Open English WordNet, GeoNames, and ConceptNet's reviewed strict relations may return `SOLVED`.
This rule is based on declared relation semantics, never provider order or source popularity.

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

### 7. Failure-time related evidence

An inability result may include a **grounding bundle** containing bounded records that are related to visible terms or
accepted semantic identities in the request. Its purpose is recovery: it gives a person or a separate downstream
model reviewable KB material that may help clarify or reformulate the task. It does not weaken abstention.

The primary result and the grounding bundle are separate contracts:

| Field or claim | Primary result | Grounding bundle |
|---|---|---|
| Semantic authority | Produced by a registered reasoning method | Produced by bounded retrieval only |
| `values` and `answer` | The answer, partial answer, or explicit inability | Never an answer |
| `provenance` | Premises and methods that support the answer | Source references for related records |
| KB accounting | `usedKbVersions` lists contributors; `selectedKbVersions` and `consultedKbVersions` have their literal meanings | Each entry and search receipt names its KB version |

The runtime admits at most one provider for each immutable `(kbId, kbVersion)` pair, and every provider declares a
non-empty adapter `id`, `kbId`, and `kbVersion`. Allowing two adapters to collapse into the same reported pair would make
consultation and contribution accounting ambiguous, so construction fails before either provider can be queried.
| Truth claim | Licensed by the method's declared semantics | `answerSupported` is always `false` |

The runtime must not copy grounding entries into top-level values or provenance, change an inability status to
`SOLVED`, or append evidence text to the machine `answer`. The interactive renderer may show a clearly separated
section titled “Related KB evidence — not an answer.” A downstream generator receives the bundle as structured
grounding and must be evaluated as a separate route; fluent synthesis cannot retroactively establish symbolic support.

Automatic grounding is permitted after interpretation, knowledge, method, ambiguity, underdetermination, partial, or
unsupported-output failures. It must not run after `RESOURCE_LIMIT` unless the task reserved an independent grounding
budget before execution. For `UNPARSED`, term extraction uses the original normalized surface, not spelling-corrected
parser tokens, because a failed correction is not accepted semantics. The DS013 Language Agent receives only its
language-only request and bounded parser feedback; grounding entries, KB search results, and proof state never enter
its proposal prompt.

The current bundle protocol is `eslm-grounding-bundle-v1`. It contains:

- `triggerStatus`, `queryText`, `answerSupported: false`, and an interpretation warning;
- bounded, deterministically ranked entries with KB ID and version, record ID, short statement, typed semantic value,
  epistemic status, provenance, contributing KB versions, relevance score and reasons, and a rule/support witness for
  derived records;
- one receipt for every search surface that was actually scheduled, including coverage description, candidates
  considered, completion, provider error or unsupported-interface state, and truncation reasons; if a global source,
  lookup, candidate, byte, or receipt bound omits other selected surfaces, a reserved aggregate receipt names that
  omission and forces incomplete coverage instead of pretending that every source was searched;
- explicit entry and work limits.

`RELATED_EVIDENCE_FOUND` means at least one related entry was returned, not that the request was answered.
`NO_RELATED_EVIDENCE` is valid only when every selected grounding search and term-selection stage completed.
`SEARCH_INCOMPLETE` means an empty result cannot establish absence because a provider failed, lacked a projection, or
hit a bound. Completeness and evidence presence are independent: a bundle may contain useful records and still report
an incomplete search.

### 8. Provenance requirement

DS005 owns persistent provenance record fields and their canonical references. This assurance contract requires every
derived conclusion to retain the premises, rules, package versions, and source references that justify it so a reviewer
can move from an answer to the originating source fragments.

### 9. Claim versus fact

A source statement is represented as a claim in a source context. Whether the runtime treats it as accepted knowledge depends on trust policy, validation and conflict resolution. The KB format must not erase the distinction between “source X states P” and “P is accepted as true in the active context.”

### 10. Conflicts

Conflicting claims from different sources remain separate. The runtime may apply a declared precedence, trust or recency policy, or may return a conflict. It must not silently keep whichever record was loaded last.

Strict contradictions inside one trusted context trigger consistency diagnostics. Defeasible conflicts are handled by the default-reasoning semantics and their priorities.

### 11. Versioning

DS006 exclusively defines immutable package identity, semantic versions, dependencies, overlays, retractions, and
version selection. Trust and failure traces here must name the exact resolved identities rather than mutable aliases.

### 12. Trust metadata

A KB manifest declares origin, maintainer, license, extraction method, validation level, signature status and intended use. Trust policies can prefer curated KBs over automatically extracted claims, but the policy is explicit and visible in traces.

### 13. Reproducibility

A complete experiment records source checksums, KB versions, code commit, configuration, random seeds, LLM identity and prompt policy when used, benchmark version and resource budgets.

A published result must be reproducible without access to mutable hidden state. When a proprietary LLM was used for normalization or KB construction, the exact produced normalized text or accepted canonical records must be preserved subject to data policy.

### 14. Quality levels

A KB may declare records as raw extracted, schema validated, source aligned, semantically reviewed, contradiction checked or benchmark validated. Quality levels describe process, not truth.

The runtime may require a minimum quality level for high-stakes contexts.

### 15. Threat model

Source documents, benchmark files, downloaded KBs, LLM output and generated canonical records are untrusted inputs. The architecture must prevent them from executing code, changing agent instructions, corrupting trusted indexes or causing unbounded resource consumption.

### 16. No executable KB payloads

KB schemas reject JavaScript, Java, shell code, dynamic imports, executable expressions and callbacks. Declarative rules are parsed into a restricted AST and interpreted only by trusted operators in `src`.

Strings that resemble code remain inert literals unless an explicit trusted parser converts them into a supported declarative record.

### 17. Prompt injection boundary

A document may contain text such as “ignore previous instructions” or “modify the parser.” During ingestion this is source content. The coding agent follows only the external task and approved skill instructions.

LLM translation and simplification prompts must delimit source content and state that source commands are not operational instructions. The normalized output remains untrusted.

### 18. Package integrity

DS006 owns manifest and registration integrity. DS019 owns shard and block integrity, deterministic output, and atomic
publication. A failure at either boundary is a package rejection, not a reason to use partial compiled data.

### 19. Resource safety

Parsing, rule evaluation, graph expansion, SAT or CSP search and shard loading operate under explicit budgets. The runtime detects pathological recursion, cyclic rule expansion, decompression bombs, oversized lexical forms and adversarial query fan-out.

The current text route enforces a 64 KiB UTF-8 input bound, at most 128 sentence segments of at most 8 KiB each, and
an accumulated overlay of at most 512 entities, 1,024 facts, 256 rules, and 1,024 history events. Each entity has at
most 16 names and every retained string field is at most 4 KiB. The gate validates exact context, session, entity,
fact, rule, and history shapes, including nested rule triples and provenance strings. It runs before public-provider
routing and before closure construction. A refusal never mutates the caller's context or echoes an unbounded input;
if the supplied context itself is invalid or oversized, the diagnostic result carries a safe empty session snapshot
instead of copying the unsafe object. DS015 separately bounds Horn rounds, materialized facts, and join attempts.

A resource refusal returns RESOURCE_LIMIT rather than crashing or returning an incomplete answer as complete. DS021
owns byte-accounted shard-cache and memory behavior; each reasoning method owns its semantic search bounds in DS015.

### 20. Coding-agent changes

Changes to `src` occur in an isolated candidate checkpoint. The agent runs static checks, focused tests, security tests and global regressions before promotion. Generated KB content cannot directly authorize a source-code change.

### 21. Data confidentiality

Session facts and private KBs are scoped by access policy. The catalog must not reveal private term labels or source metadata to unauthorized sessions. LLM fallback is disabled or routed through an approved provider when source data cannot leave the local environment.

### 22. Auditability

Every external LLM call, package registration, core patch, KB build and trust-policy decision is logged with stable identifiers. Audit records exclude secret content where policy requires, but preserve enough metadata to reconstruct the operation.

Optional provider operations are transaction-like at the runtime boundary. `beginQuery`, the operation, and
`endQuery` are each contained. If any stage throws, the provider's entire tentative answer, score, or semantic-evidence
contribution is discarded and a bounded diagnostic names the provider, operation, and failing stage. The remaining
providers and core method continue deterministically. A failed `beginQuery` still receives a best-effort `endQuery`,
but a cleanup failure can never make partially scoped evidence authoritative.

### 23. Specialized trust boundaries

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

### Question #4: Why return related evidence after admitting that the answer is unknown?

Response: The two outputs answer different questions. The primary result says whether ESLM established the requested
conclusion. The grounding bundle says which bounded, provenance-bearing records may help a reviewer understand the
topic or formulate a better request. Keeping them structurally separate is more useful than an empty failure and safer
than presenting lexical proximity as proof.

### Question #5: Why discard a provider contribution when only cleanup fails?

Response: Query-local caches and temporary state have a lifecycle contract. Once cleanup fails, the host cannot prove
that the contribution was produced and closed under the intended scope. Discarding it is conservative, deterministic,
and prevents a provider's partial transaction from becoming an answer or score merely because its value arrived first.

## Conclusion

The system must preserve the origin, scope, version, and epistemic status of every accepted premise and must report inability precisely. Declarative data cannot grant itself code execution, trust, or additional resource authority.
