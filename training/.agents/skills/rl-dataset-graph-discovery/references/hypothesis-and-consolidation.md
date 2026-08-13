# Hypothesis and Consolidation Contract

## Contents

- Candidate types
- Evidence and votes
- Placement
- Consolidation
- Promotion and retirement
- Discovery-log entry

## Candidate types

- **Processing node:** one stable typed responsibility with named input/output packets, work owner, state effects,
  failures, and authority.
- **Coordination node:** a processing node that preallocates work to alternative strategies and compares their typed
  proposals. It is the only node type that aggregates votes.
- **Authority gate:** a non-voting invariant check with accept, reject, gap, and resource-limit outcomes.
- **Strategy:** an alternative implementation of one selectable node contract. It declares applicability,
  determinism, epistemic role, confidence kind, correlation group, work dimensions, witness, and abstention.
- **Edge:** a typed data, control, authority, rollback, resource, or exceptional transition.
- **Packet field:** information required at one boundary, with a producer, consumers, validation, absence meaning,
  lifetime, and privacy class.
- **Nested circuit:** a named subgraph whose external contract is stable while its internal nodes remain inspectable.

## Evidence and votes

Every technique emits a typed vote with candidate digest, direction (`support`, `oppose`, or `abstain`), confidence,
coverage, recurrence, stability, independence groups, correlation group, work, completeness, and aggregate evidence
digests. Never add correlated votes as if independent. Frequency is a bounded relevance signal, not architectural
authority. Preserve conflicting feedback axes and alternative cluster explanations.

Require evidence from renamed structural variants. Cross-source support requires independent collection lineage, not
another split or repackaging of the same source. A reward, preference, or successful outcome cannot validate truth,
proof, safety, or every intermediate action.

## Placement

Name the earliest point where all required inputs exist and the latest point before an irreversible or
answer-authorizing effect. State the containing circuit, upstream and downstream packets, normal/exceptional edges,
rollback scope, resource owner, authority, and current owner that would otherwise absorb the behavior.

Keep language interpretation, task planning, knowledge routing, evidence assessment, method execution, witness
verification, result construction, and session commit separate unless evidence proves a shared typed responsibility.

## Consolidation

Run consolidation after every bounded analysis cycle and before creating a node:

1. canonicalize responsibility, authority, inputs, outputs, failures, and placement;
2. merge candidates identical on those dimensions;
3. place algorithmic alternatives under one node as strategies;
4. replace overlapping narrow candidates with the smallest source-neutral generalization that preserves falsifiable
   distinctions;
5. reject source/task labels, decorative pass-through wrappers, hidden solvers, answer-conditioned proposals, and
   mixtures of unrelated authority;
6. retain a separate gate only when its invariant cannot be overridden by confidence;
7. retain a separate field only when absence has distinct semantics and at least two consumers or one authority gate
   needs it; and
8. record why a simpler graph was inadequate.

A large number of strategies is acceptable when they implement the same stable responsibility with different
applicability/cost/quality tradeoffs. A large number of nodes is acceptable only when each owns a distinct packet,
authority, resource, state, or failure boundary. Node count itself is not a success metric.

## Promotion and retirement

Move hypotheses through `observed`, `retained`, `merge-candidate`, `rejected`, `prototype`, `promoted`, and `retired`.
Only a DS change and explicit promotion can reach `promoted`. Require deterministic implementation, closed contracts,
renamed/nonce/metamorphic/contrastive tests, ablation, cross-source transfer, proof and rollback audits, resource
bounds, and full regression. Keep non-default until review approves its exact profile.

Retire on redundancy, unsoundness, dominated cost, rights withdrawal, stale assumptions, or failure under fresh
transfer. Historical receipts keep the retired identity.

## Discovery-log entry

Record cycle ID/date; source revisions and visible components; rights/projection state; rows/bytes/shards visited and
unvisited; baseline graph; techniques and budgets; structural task families; nonce examples; support/opposition and
correlation; retained, merged, rejected, and changed hypotheses; confidence limits; implementation state; ablation and
transfer status; remaining counterexamples; and exact next review. Do not copy source rows, answers, raw rationales,
record IDs, or private text.

For bundle validation, reproduce the cycle's exact structural question and null hypothesis, name each consolidation
and readiness decision, and cite the byte-exact source-manifest, cycle-receipt, and optional readiness-receipt SHA-256
digests. Also cite every declared projection membership digest and the baseline graph digest. These references bind
the prose decision to the reviewed artifacts; they do not make external source or license claims self-validating.
