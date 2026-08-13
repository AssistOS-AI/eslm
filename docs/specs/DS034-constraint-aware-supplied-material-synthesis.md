---
id: DS034
title: Constraint-Aware Supplied-Material Synthesis
status: planned
owner: result-construction
summary: Defines bounded multi-sentence summaries, plans, critiques, transformations, thematic syntheses, and comparisons grounded only in supplied material and explicit constraints.
---

# DS034 Constraint-Aware Supplied-Material Synthesis

## Introduction

Basic Eval contains requests that supply the relevant facts but require more than a single extracted field or sentence rewrite: organize project notes under named headings, allocate a finite schedule, critique an argument in proportion to its evidence, group feedback, or compare options under a stated priority. DS032 intentionally stops before this boundary. This specification records a proposed generic `constraint-aware-synthesizer` responsibility for bounded multi-sentence artifacts grounded in request-supplied material. It is not yet a DS029 catalog node or an executable runtime path.

The node is not a general language model. It does not create domain advice from no evidence, browse for missing facts, translate non-English material, or infer hidden prices, deadlines, causes, frequencies, preferences, or guarantees. It admits only closed synthesis operations whose inputs, constraints, construction rule, and preservation witness can be validated.

## Core Content

### 1. Position and packet contract

The proposed design would extend DS030 only after a source-neutral semantic frame has passed anti-overfitting review. Such a frame would name one synthesis operation, preserve the supplied material, and close the output constraints. The proposed `constraint-aware-synthesizer` would consume `packet:runtime:bounded-operation-frame` and emit `packet:runtime:constraint-aware-synthesis-result`; the `typed-operation-result-assembler` would accept that packet only after DS029 catalog promotion. The current runtime emits neither this frame family nor this result packet.

If implemented, the node is a non-voting `process`, query-local, offline, and initially `instrumented-local`. Its result contains operation, status, answer, semantic values, method, and a witness; a gap is optional. It has construction authority over wording and structure only. It has no parser, KB, proof, session, or final-answer authority.

### 2. Preservation ledger

Every frame separates four regions:

- `suppliedMaterial` contains the exact notes, message, argument, comments, options, or declared plan constraints;
- `requiredElements` names headings, decisions, stages, metrics, activities, or recommendation count that must appear;
- `limits` contains explicit minimum or maximum words, item counts, time, money, participants, and reserved intervals; and
- `prohibitions` records constraints such as no invented facts, prices, deadlines, frequencies, destinations, guarantees, or reasons.

The proposed executor creates a preservation ledger that maps every output section or recommendation to supplied spans, explicit numerical constraints, or an allowlisted domain-neutral construction rule. The ledger records retained numbers and named options, omitted supplied elements, added connective or planning language, output words, and each checked prohibition. A required supplied value that disappears, an invented specific value, a violated count, or an unsupported conclusion rejects the candidate.

### 3. Initial closed operations

| Operation | Deterministic construction boundary |
| --- | --- |
| Sectioned status summary | Classify explicit note sentences into requested status, risk, decision, and next-step roles using closed linguistic cues; preserve all named quantities, dates, budget state, and conditions; add no project fact. |
| Finite beginner study plan | Reserve the explicit review interval, divide remaining daily time between one main objective and one practical activity, repeat only for the declared number of days, and replace the final-day main activity with the requested self-assessment. Topic labels remain supplied data. |
| Professional message rewrite | Preserve each proposition, actor, object, number, deadline, and causal qualification from the raw message; add only greeting, courtesy, ordering, and closing language; obey the bounded tone and length contract without adding a new reason or deadline. |
| Evidence-proportional argument critique | Quote or identify the supplied premise-to-conclusion leap, state that the premise is insufficient under a closed evidence pattern, request representative observation, comparison, test, or causal evidence as applicable, and weaken the conclusion to match support. |
| Staged constraint plan | Partition a supplied finite duration around an explicitly reserved final interval; include only generic activities licensed by the requested event type; preserve participant and budget ceilings and disclose when prices were not supplied. |
| Thematic feedback synthesis | Cluster only the enumerated comments by recurring subject terms, preserve positive and problem polarity, call a problem recurring only when at least two distinct comments support the same theme, and avoid population-frequency claims. |
| Criterion-led option comparison | Preserve each option's declared costs, benefits, drawbacks, and unknowns; rank by the user's explicit priority; recommend exactly the requested number of options; refuse arithmetic over costs that were not supplied. |

These are research contracts for candidate semantic operations, not implemented surface templates or example identities. No operation is promoted from a regex matching one evaluation prompt. Admission requires independently authored structurally equivalent requests, renamed domains, changed constraints, negative controls, and a representation that does not mention the evaluation category. A new synthesis responsibility with different evidence, state, authority, or failure semantics receives another DS rather than silently expanding this candidate node.

### 4. Domain-neutral construction rules

An eventual implementation may use closed rules that do not assert world facts: headings organize admitted sentences; a finite interval can be partitioned arithmetically; a final reserved interval cannot contain an excluded activity; a stated priority outranks a lower-priority criterion; two comments about the same explicitly named feature can establish recurrence within that supplied sample; and a universal or causal conclusion requires more support than one observation or temporal order alone.

Rules that assert which food to serve, which medicine to take, which city to visit, what an item costs, what a person intended, or what an unmentioned stakeholder needs are domain content and are prohibited. Such requests need admitted KB evidence, a separate strategy, or an honest inability.

### 5. Bounds and termination

The proposed input remains under the DS030 64 KiB request limit. The node would admit at most 32 supplied units, eight requested sections, 16 stages, 16 option attributes, four themes, and 1,000 output words, with the stricter user limit prevailing. Algorithms use deterministic scans, closed cue tables, finite arithmetic, and stable source order. There is no recursive generation, beam search, external model, corpus execution, or unbounded planning.

If the minimum requested length cannot be reached without repetition or unsupported content, the node returns a shorter preservation-safe candidate only when the contract treats the minimum as a preference; otherwise it returns an explicit output-constraint gap. Maximum limits are categorical. Conflicting constraints, missing supplied material, ambiguous option priority, insufficient evidence for a recurring theme, or an impossible time allocation cause abstention or a typed gap.

### 6. Evaluation and falsification

All output is semantic-review evidence unless a complete exact oracle exists. Machine preconditions check status, prohibited claims, required supplied concepts, count and word bounds, numerical retention, and preservation-ledger validity. Human review judges correctness, completeness, grounding, instruction fit, and naturalness separately.

Tests rename projects, topics, people, options, products, and features; vary every quantity, date, option order, priority, and reserved interval; permute source sentences; introduce absent and conflicting fields; use nonce themes; and include meaning-changing negative controls. A patch that relies on `Project Atlas`, a particular weekday, fixed workshop prices, one application comment list, case order, or expected answer is rejected. Generic rules must also work on independently authored structurally equivalent inputs.

### 7. Boundary with existing construction

DS022 and DS029's grounded response-construction circuit owns claim admission, rhetorical planning, sentence realization, document assembly, and schema validation for KB- or supplied-claim artifacts. DS034 does not currently add an opaque parallel generator. Its promotion target is the existing construction circuit: framing and the preservation ledger become an admitted construction work order, while generic section and comparison operations become reviewed construction strategies. A distinct node and packet may be promoted only if implementation evidence demonstrates a separate typed responsibility that the existing construction nodes cannot honestly own.

## Decisions & Questions

### Question #1: Why is this a new node rather than more DS032 rewrite cases?

Response: DS032 transforms or classifies one bounded span. The candidate described here coordinates several supplied units, numerical and structural constraints, section obligations, and an evidence-preservation ledger into a multi-sentence artifact. That may justify a distinct input, resource, and failure boundary, but promotion still requires a generic implementation and structural controls.

### Question #2: Can the node give ordinary practical advice?

Response: Only when the request supplies the constraints and the plan follows domain-neutral scheduling rules. Advice that requires facts about health, products, locations, people, or best practices needs provenance-bearing knowledge or remains unsupported.

### Question #3: Does a semantic-review result count as a pass?

Response: No. It means machine safety and preservation preconditions passed. A reviewer still judges whether the artifact is useful and natural and may reject it.

## Conclusion

Constraint-aware supplied-material synthesis is a planned route toward useful short documents without pretending to possess unstated knowledge. It remains outside the executable catalog until closed operations, explicit preservation ledgers, finite construction rules, structural controls, and semantic review demonstrate a source-neutral implementation.
