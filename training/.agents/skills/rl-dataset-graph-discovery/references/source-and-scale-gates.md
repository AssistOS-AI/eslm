# Source and Scale Gates

## Contents

- Source admission
- Visibility and contamination
- Projection and streaming
- Bundle identity gate
- Scale ladder
- Large-source stop and resume rules
- Status reporting

## Source admission

Freeze the official owner page, immutable revision, citation, every delivered file, exact bytes and SHA-256 digest,
media type, and component lineage. Review component rights separately: task definitions, instances, model responses,
ratings, attachments, web snapshots, environment state, tools, and labels may have different licenses. Record allowed
research uses, redistribution, attribution, access gates, withdrawal, and purge obligations.

The machine boundary is `eslm-rl-dataset-source-manifest-v2`. Its rights decision is valid only when the repository
policy review binds the same immutable revision, at least one delivered evidence file, primary-source evidence URLs,
limitations, exact allowed use, split visibility, and extraction inventory. `pilot-approved` is not independent
authority. The host and portable validators must agree on the closed v2 shape and reject duplicate split names,
missing delivered-file evidence, unsafe cache paths, or an approval that omits `processing-graph-discovery`.

Reject or quarantine unresolved rights, mutable `latest` revisions, executable archives, serialized callables,
credential-bearing material, unbounded web snapshots, and components whose lawful projection destroys the structure
being studied. Never assume a repository license covers embedded datasets.

## Visibility and contamination

Freeze each component as `training-visible`, `development-visible`, or `protected`. Discovery consumes only
training-visible data. Group leakage by upstream lineage, generator/template family, prompt or task family, document,
website, environment, and action graph—not only by row ID. Record overlap with benchmark sources and inherited
components. Redaction creates a new projection digest and an explicit loss; it never mutates the frozen source.

## Projection and streaming

Use a project-owned, schema-specific reader. Validate UTF-8, JSON/JSONL shape, archive paths, decompression ratio,
nesting, fields, row bytes, action counts, and dependencies. Do not run dataset code or replay actions.

Project requests, constraints, state kinds, observations, inert action kinds and argument roles, dependencies, state
deltas, outcomes, feedback axes, preferences, witnesses, and losses into closed episodes. Preserve complete source
membership in content-addressed shards. Sample only for probes; never silently treat a sample as the full projection.

Make sharding deterministic from canonical episode identity. Verify that streaming and merged shard aggregates equal
an exhaustive small-component run before scaling. Keep peak memory bounded independently from total source size.

## Bundle identity gate

The frozen portable chain is discovery plan-v2, research analysis-v6, evidence reference-v3, projection content
membership-v2, and discovery cycle-v3. Membership-v2 hashes each canonical joint member rather than parallel digest
arrays: episode ID, raw-record digest, episode-content digest, feature and metamorphic-audit digests, split and
visibility, source work, and projection-work receipt remain aligned under one content-membership digest. Re-signing a
receipt cannot substitute, reorder, or detach any of those claims.

Record every selected source, component, projection, and manifest split in the approved plan's `sourceScopes` and the
analysis `splitCoverage`. A protected or development-visible split remains named for reconciliation but must declare
zero admission, receipt, selection, and analysis. Cycle-v3 copies those machine-derived counts into
`splitAccounting`; it cannot assert a literal zero without the analysis row that proves it. Aggregate available,
visited, selected, and analyzed counts must equal the training-visible split rows and stay within manifest membership.
Every vote evidence digest must resolve to content-bound evidence from an exact admitted projection member.

Bind readiness to one exact manifest component with `sourceRevision`, `componentId`, and `projectionId`. The readiness
`sourceManifestDigest` and `discoveryPlanArtifactDigest` identify the exact supplied source-manifest and approved
pre-analysis plan bytes; `discoveryPlanContentDigest` independently identifies the plan's canonical semantic content.
Its shard count and maximum row scope
must equal the selected component's declared projection shards and training-visible rows; its byte budget must cover
the frozen component bytes. Its plan stage is exactly `large-corpus`, and its `preflightReceiptDigest` identifies the
host-validated content-bearing preflight bytes. That preflight binds the producer script and command, current
implementation and graph, source and split lineage, projection and shards, two deterministic full runs, and a closed
projection-input checkpoint restored in a new process after its creator exits. Restoration verifies exact embedded
prefix bytes, reads only the untouched suffix, and reproduces the fresh full receipt; it does not claim analyzer-state
continuation. The parent observes child-process exits and Linux `/proc` peak RSS. The receipt also binds the
removal drill and zero development/protected visitation. A portable readiness check
can validate the declaration and digest shape but cannot manufacture or replace the host execution receipt. The
post-analysis discovery cycle binds observed work and consolidation but is never an input to its own admission.
The discovery log records the cycle ID, exact question and null hypothesis, decisions,
baseline and projection digests, and byte-exact source, cycle, and optional readiness receipt digests.

`validate-discovery-bundle.mjs` accepts one manifest path or a comma-separated manifest list, followed by the
pre-analysis plan, machine analysis, post-analysis cycle, and discovery log. Supplied source
revisions, component identifiers, projection identifiers, and projection membership digests must each be unique. The
plan scopes must exactly cover all supplied manifest components, the analysis registry and evidence ledger must bind
those same projections, and the cycle must bind both inputs and account for every machine hypothesis. Optional
readiness resolves to exactly one of those components and uses that component's plan-scope pilot counts rather than
cross-source totals. The validator does not fetch an owner page or establish that a license,
citation, rights statement, or upstream lineage is true. A human reviewer must verify those claims from authoritative
primary sources before admission.

## Scale ladder

1. **Metadata review:** no rows; freeze rights, lineage, schemas, splits, risks, and structural question.
2. **Stratified probe:** the smallest sample that touches every declared schema, split-safe task family, length band,
   feedback shape, outcome class, and trajectory-depth band. Use it to estimate—not hide—loss and cost.
3. **Complete small component:** stream every authorized row; reconcile counts and validate shard equivalence.
4. **Sharded development run:** process several complete shards with checkpoints; test resume, deterministic merge,
   hypothesis stability, and resource accounting.
5. **Large-corpus run:** admit only after the readiness packet passes. Visit all declared shards or publish the exact
   unvisited frontier. Increase scope gradually; do not change thresholds mid-run.
6. **Protected transfer:** use a different source lineage only after hypotheses and implementation are frozen. It is
   validation, not additional discovery.

## Large-source stop and resume rules

Freeze maximum compressed/decompressed bytes, rows, tokens, fields, actions, dependencies, graph elements,
comparisons, retained hypotheses, spill bytes, cache bytes, elapsed work, and per-strategy allocations. Checkpoint only
at canonical shard boundaries. A resume token contains source revision, component and projection digests, feature and
strategy digests, completed shard identities, aggregate digest, and outstanding frontier.

Stop on rights withdrawal, identity mismatch, schema drift, unsafe content outside the declared policy, excessive
projection loss, violated memory/elapsed budget, nondeterministic replay, or a frozen saturation rule. Never convert a
stop into an absence claim. A saturation decision must include independent source/task strata, marginal new motif and
hypothesis rates, confidence intervals or deterministic bounds, and the kinds of evidence not yet covered.

## Status reporting

For every source publish an aggregate-only status with registry state, acquisition state, projection state, analysis
stage, visible components, exact/visited/projected/excluded row counts, source/projection/shard identities, current
checkpoint, completeness, failure or stop reason, and next allowed stage. Distinguish `reviewed`, `cached`, `projected`,
`pilot-analyzed`, `fully-analyzed`, `blocked`, `withdrawn`, and `superseded`; never use “supported” ambiguously.
