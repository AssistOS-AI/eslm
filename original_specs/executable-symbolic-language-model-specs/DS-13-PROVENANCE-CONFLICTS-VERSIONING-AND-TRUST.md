# DS-13 — Provenance, Conflicts, Versioning and Trust

## 1. Provenance requirement

Every persistent assertion, lexical mapping, rule, alignment and retraction must identify its origin. Provenance includes source identity, source version or checksum, exact span or record key, extraction transformation, coding-agent version, system commit and KB build identifier.

Derived conclusions record the premises and rules used. A user must be able to move from an answer to the originating source fragments.

## 2. Claim versus fact

A source statement is represented as a claim in a source context. Whether the runtime treats it as accepted knowledge depends on trust policy, validation and conflict resolution. The KB format must not erase the distinction between “source X states P” and “P is accepted as true in the active context.”

## 3. Conflicts

Conflicting claims from different sources remain separate. The runtime may apply a declared precedence, trust or recency policy, or may return a conflict. It must not silently keep whichever record was loaded last.

Strict contradictions inside one trusted context trigger consistency diagnostics. Defeasible conflicts are handled by the default-reasoning semantics and their priorities.

## 4. Versioning

KB packages are immutable and semantically versioned. A version identifies canonical records, manifest, dependencies and compilation schema. Runtime indexes identify the exact canonical version from which they were built.

Updates are overlays or new versions. A retraction references the stable identifier of the record it supersedes. Queries declare or inherit a version selection policy.

## 5. Trust metadata

A KB manifest declares origin, maintainer, license, extraction method, validation level, signature status and intended use. Trust policies can prefer curated KBs over automatically extracted claims, but the policy is explicit and visible in traces.

## 6. Reproducibility

A complete experiment records source checksums, KB versions, code commit, configuration, random seeds, LLM identity and prompt policy when used, benchmark version and resource budgets.

A published result must be reproducible without access to mutable hidden state. When a proprietary LLM was used for normalization or KB construction, the exact produced normalized text or accepted canonical records must be preserved subject to data policy.

## 7. Quality levels

A KB may declare records as raw extracted, schema validated, source aligned, semantically reviewed, contradiction checked or benchmark validated. Quality levels describe process, not truth.

The runtime may require a minimum quality level for high-stakes contexts.
