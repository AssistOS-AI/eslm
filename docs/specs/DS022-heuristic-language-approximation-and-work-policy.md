---
id: DS022
title: Heuristic Language Approximation, Query Focus, and Work Policy
status: accepted
owner: language-runtime
summary: Defines the English-only deterministic recovery layer, confidence-bearing candidate voting, topic selection for related-KB retrieval, bounded work profiles, and its boundary with the operator Language Agent proposal strategy.
---

# DS022 Heuristic Language Approximation, Query Focus, and Work Policy

## Introduction

ESLM should make a useful local attempt when wording falls just outside its controlled-language frontier. A misspelled
verb, omitted auxiliary, inflected predicate, long request envelope, or several short statements in one input should
not immediately require an external model. This specification defines a deterministic approximation layer that turns
such input into ranked controlled-English candidates, reparses those candidates through the ordinary symbolic runtime,
and preserves the uncertainty introduced by the approximation.

This contract also owns two closely related decisions. First, failure-time KB retrieval must choose topical content
rather than determiners, auxiliaries, quantifiers, and request scaffolding. Second, operators must be able to choose a
bounded work profile that controls approximation attempts, reasoning work, provider search, and grounding retrieval.
The profile changes cost and the chance of completing a search; it never changes logical semantics or authorizes an
unsupported claim.

## Core Content

### 1. Authority and route order

The local approximation layer is trusted executable code in `src/language/` plus a bounded runtime coordinator. It is
generic language machinery rather than KB knowledge. Its conditionals may inspect token shape, sentence position,
grammatical role, protected-operator identity, edit distance, and declared work policy. They must not inspect a
benchmark name, dataset row, expected answer, source hash, domain entity, or KB result.

DS027 defines the common registry and complete cross-stage coordinator contract around this behavior. The 24 current
language-approximation families are already statically registered coordinated executors with typed validators,
one preallocated coordinator invocation slot apiece, exact identities, confidence kinds, correlation groups, and
bounded stage results. The independent edit-distance dimension is divided only among the three families whose cost
model declares bounded edit distance; the other 21 families receive no artificial share of that quota. Every family
result exposes invocation work separately from reserved and consumed edit-distance evaluations.
Request, focus, relevance, reasoning, and construction techniques have exact execution gates but still run inside
their established owner modules and are therefore cataloged as `instrumented-local`. This migration cannot change
route order or allow a language strategy to consult answer evidence.

For ordinary text, recovery follows this order:

1. Assess English likelihood through a bounded deterministic gate. `likely-non-english` does not enter the English
   repair ensemble. `likely-english` and `indeterminate` continue; unfamiliar names and nonce predicates alone do not
   establish likely non-English text.
2. For continuing input, invoke the mandatory DS035 task-context strategy over the bounded visible request. It records
   explicit and embedded basic-question families, prioritized self-questions, focus, selected and consulted KBs,
   provenance-bearing context entries, omissions, and search completeness. The resulting context has no
   interpretation, premise, proof, or answer authority and is hidden from all language-candidate selection.
3. Execute the original text through the direct symbolic route with ordinary inability grounding deferred.
4. Independently run the bounded request-force planner. An explicit supported artifact request preempts an accidental
   direct assertion parse, discards tentative direct episode changes, and continues query-locally through its planned
   retrieval and construction route.
5. When no request plan applies and the direct status is `UNPARSED`, `UNKNOWN`, `SOLVED`, or `PARTIAL`, generate bounded
   local heuristic candidates. Candidate generation still requires visible structural evidence.
6. Inspect the direct input and eligible candidates through parse-only Semantic IR. For direct `SOLVED` or `PARTIAL`,
   proceed only when at least one accepted candidate has a different semantic signature; equal IR preserves the direct
   result. A normal missing-knowledge `UNKNOWN` with no accepted structural alternative also remains unchanged.
7. Execute at most one selected candidate from the caller's incoming session snapshot through the same symbolic
   runtime without granting it persistent session effects. Any changed interpretation is explicitly attributed and
   query-local for every eligible direct status.
8. At the operator CLI boundary, DS013 may request one external language proposal. A likely-non-English rejection may
   request translation without attempting English repair. A final unsupported English or indeterminate input may
   request simplification. The general CLI enables this wrapper only after explicit `--external-language-agent` or
   `/normalize on` opt-in; its default is fully local. An unrepaired `UNKNOWN` does not authorize an external proposal.
9. After the final answer or inability status is known, attach the validated DS035 context extension. When status
   permits, derive DS009 ordinary non-answer grounding from its bounded retrieval receipts; an eligible precise gap
   may instead cross DS035 claim admission as an explicitly cited `PARTIAL` contextual fallback.

Grounding exposure and contextual realization are deliberately last even though DS035 builds the reusable bounded
context frontier early. Planned retrieval for an explicit artifact request is a typed request obligation rather than
failure grounding; it may supply cited source material under section 11. No kind of KB evidence can influence how a
sentence is rewritten. Candidate selection sees parser/session compilation only, not context entries, answer success,
provider results, proof state, or desired values. `AMBIGUOUS`, `RESOURCE_LIMIT`, and method gaps are
not language-recovery triggers. `UNKNOWN` is eligible because a permissive direct parse can construct a wrong
unsupported frame. `SOLVED` and `PARTIAL` are inspectable because a permissive parse can also flatten an apposition,
coordination, or another explicit structural cue while still returning a positive status. Semantic-IR comparison and
query-local status qualification prevent that safeguard from silently relabeling ordinary direct success.

### 2. Approximation is interpretation, not answer generation

The approximation input is the original bounded UTF-8 text plus host-owned surface analysis. The layer may rearrange
or repair language, but it may not consult a KB, invoke a reasoner, select an answer value, add a premise, or mutate a
session. Its output is one or more proposed controlled-English strings with evidence explaining every change.

The original input remains authoritative. A candidate is an interpretation hypothesis until the ordinary parser
accepts it. Parser acceptance establishes that the candidate has executable meaning; it does not prove that the
candidate is what the user intended. The result therefore exposes the original and interpreted text, confidence,
votes, transformations, competing candidates, and reparse outcome.

### 3. Bounded structural analysis

The analyzer first applies Unicode normalization and bounded sentence segmentation. It classifies visible tokens into
roles using deterministic local evidence:

- punctuation and sentence boundaries;
- names or entity-shaped tokens;
- nouns or symbolic class and object positions;
- finite, base, participial, or third-person predicate positions;
- articles, determiners, quantifiers, auxiliaries, copulas, conjunctions, negation, modality, and interrogatives;
- request directives and output-style modifiers;
- unknown tokens that remain possible names, nouns, or predicates.

Role inference is contextual rather than a claim of complete English part-of-speech tagging. For example, the token
between a quantified class and an object is a predicate candidate, while `all` at the beginning of the same clause is
a quantifier. Unknown nouns and nonce predicates remain valid symbols. The analyzer must not replace a content word
merely because it resembles a more frequent English word.

### 4. Independent heuristic families

Candidate generation uses several independently scored families. The implemented inventory may grow, but every family
must declare its precondition, transformation, confidence contribution, protected meaning, and maximum output count.
The baseline families are:

1. **Segmentation and punctuation repair.** Restore a missing terminal marker, split a bounded multi-clause input, and
   retain statement-versus-question force.
2. **Article and agreement repair.** Normalize an article before a symbolic class and repair local copula or auxiliary
   agreement without changing entities or predicates.
3. **Auxiliary reconstruction.** Convert a recognizable yes/no question such as `Is A eating B?` into the controlled
   form `Does A eat B?` while retaining polarity, participants, and predicate identity.
4. **Predicate morphology.** Relate base, third-person, and progressive forms through bounded English morphology;
   irregular changes require a closed reviewed table.
5. **Contextual spelling repair.** Rank bounded edits or transpositions for a token only against candidates licensed
   by its structural slot. A probable verb is compared with locally supported predicate forms, not with arbitrary
   nouns or every KB term.
6. **Quantified-rule reconstruction.** Convert a safe surface of the form `All/Every CLASS PREDICATE OBJECT` into the
   canonical universal statement while preserving quantifier strength and argument order.
7. **Request-envelope reduction.** Remove polite directives, requested length, and output-format scaffolding around a
   retained question or topic. It cannot remove a premise or operator from the semantic content.
8. **Controlled clause ordering.** Reorder already identified statements and the final question into an executable
   episode without merging or inventing clauses.

Contextual predicate morphology follows a bounded evidence hierarchy. It does not guess a lemma from the progressive
surface alone when the same episode supplies an aligned class rule:

1. A candidate rule is eligible only when the entity in the question is explicitly a member of the rule's class and
   the rule and question have the same normalized object. This class-rule/query role alignment prevents a nearby verb
   in another clause from becoming spelling evidence.
2. The analyzer enumerates bounded lemma candidates from the question's progressive surface. For an eligible rule, an
   exact finite-form round trip has first authority: deriving a lemma from the observed finite form must yield one of
   those candidates, and regenerating the third-person form from that lemma must reproduce the observed finite token
   exactly. Thus `ties → tie → ties`, `vies → vie → vies`, and `cries → cry → cries` remain distinguishable without a
   domain-specific branch.
3. If no exact round trip applies, the observed rule predicate is compared with the generated finite forms of the
   candidate lemmas under the bounded Damerau edit budget. A unique nearest finite form supplies one contextual lemma.
   The current progressive alignment admits distance at most one.
4. If the finite-form comparison remains unresolved, the rule surface may be compared directly with the candidate
   lemma surfaces. Edit distance remains primary. At equal distance, one candidate may win only when it accounts for a
   strictly larger multiset of characters observed in the source token. If the character coverage is also equal, the
   tie remains unresolved and grants no contextual preference; stable lexical order must not manufacture a winner.

An unresolved contextual comparison does not become answer-guided search. The independently defined primary
progressive analysis remains a visible fallback with its ordinary uncertainty, and later voting and semantic reparse
retain their existing safety authority. No KB frequency, benchmark label, expected answer, or downstream proof result
participates in this hierarchy.

The layer may combine compatible transformations. It must reject combinations that change negation, universal versus
existential force, modality, temporal direction, relation direction, number, quotation, named entities, or answer
options.

In the DS027 target, each family registers independently rather than being discovered through a central source-file
switch. Families in the same correlation group cannot manufacture additional confidence by repeating equivalent
evidence. A family cannot call another family or reparse its own result; composition, protection, reparse eligibility,
and arbitration remain host coordinator responsibilities.

### 5. Complex-sentence decomposition lattice

Complex inputs are represented as a bounded **decomposition lattice**, not reduced by one destructive split. A lattice
node is a sequence of retained clauses plus the alignment from each clause to the original spans. A heuristic adds a
candidate edge with its preconditions, changes, preserved operators, unresolved risks, and score. The following
techniques participate when their structural preconditions are visible:

| Technique | Candidate transformation | Required safety evidence |
|---|---|---|
| Clause-boundary recovery | Restore punctuation and separate independently finite clauses | Every token belongs to one retained span; question force is unchanged |
| Coordination expansion | `A verbs X and verbs Y` → two clauses with the same explicit subject | Shared subject and conjunction scope are unique; negation and modality are copied to both only when structurally licensed |
| Parallel ellipsis repair | `A verbs X and B Y` → reconstruct the repeated predicate in the second clause | Both conjuncts have the same argument pattern; competing predicates remain alternatives |
| Relative-clause extraction | `A, who/which is B, verbs C` → class/property clause plus main clause | Antecedent is unique and extraction does not turn a restrictive class condition into a global assertion |
| Apposition expansion | `A, a B, ...` → `A is a B` plus the remaining clause | Appositive attachment and entity identity are unique |
| Explicit passive inversion | `B is VERBed by A` → `A VERBs B` | Both agent and patient are overt; polarity, tense class, and modality are retained |
| Conditional normalization | `If A, then B` → a controlled implication or universal rule | Antecedent/consequent boundary and variable sharing are explicit; the target CNL can represent the implication |
| Temporal normalization | Reorder `after`, `before`, `when`, or `while` clauses into a supported temporal form | Direction, simultaneity, and event identity survive; otherwise the candidate is rejected |
| Causal-clause extraction | Normalize `because` or `therefore` into assertions plus an explicit causal relation | The causal link is represented, never discarded merely to obtain two parseable facts |
| Embedded-question extraction | `Could you tell me whether Q?` → the yes/no question `Q?` | The matrix clause is a request envelope rather than a factual premise |
| WH and nominalization reduction | `What is the location of A?` → `Where is A?` | The declared relation frame is equivalent and all arguments remain aligned |
| Parenthetical handling | Remove discourse-only asides or expand semantic appositives | Every removed span is classified as non-semantic; content-bearing parentheses are retained |
| Reference substitution | Replace a pronoun with an overt antecedent in a candidate | Type, number, local scope, and uniqueness agree; several antecedents produce several candidates |
| Statement/question ordering | Place retained premises before one final question | Original dependency and temporal order permit it; no statement crosses a scoped operator |

The table is a proposal inventory, not permission to flatten every occurrence. For example, splitting `Alice did not
buy tea and coffee` could change negation scope; extracting `dogs that chase cats are loud` as `dogs chase cats` would
turn a restriction into a global claim; and replacing `because` with a period would discard causality. Such edges fail
the safety gate or remain below the execution threshold. This makes unsafe decompositions visible as declined
techniques instead of silently losing their meaning.

The lattice is explored in deterministic beam order under the active work profile. Compatible edges may compose, but
the path records their cumulative edit cost and semantic-risk penalties. Equivalent terminal clause sequences are
merged while preserving every independent supporting path. Incompatible terminal candidates remain separate through
voting and reparse.

### 6. Voting, confidence, and candidate selection

Each heuristic emits a proposal contribution rather than directly choosing the final string. Equivalent normalized
proposals are deduplicated and their independent contributions vote for one candidate. A vote records the family,
matched span, transformation, local score, and whether it is corroborating or speculative. Candidate ranking is
deterministic and uses only these recorded contributions, semantic-safety checks, edit cost, and stable textual
tie-breaking.

Confidence is a calibrated interpretation score in `[0, 1]`, not a probability that the eventual answer is true. It
increases when independent families agree, when all content and protected operators align, and when the candidate
requires fewer or smaller edits. It decreases for an inferred open-class predicate, an unreviewed morphological
choice, competing candidates with a small margin, removed material, or several interacting repairs. The receipt names
the confidence band and the score components so the threshold is reviewable.

Only candidates above the declared semantic confidence threshold are reparsed. That threshold is constant across
named work profiles; an explicit override is a visible interpretation-policy change, not merely additional work.
Several close candidates that produce different accepted semantics remain ambiguous and must not be resolved by
candidate order. Candidate generation, deduplication, voting, and reparse count all have explicit limits.

### 7. Semantic preservation gate

Before reparse, the host verifies that a candidate preserves every recognized protected occurrence. The gate covers
numbers, named entities, quoted text, question force, negation, quantifiers, modality, conditionals, temporal
operators, conjunction, disjunction, comparisons, and directed relations. It also accounts for open-class content:
every removed or changed noun, verb, adjective, or adverb requires a named heuristic transformation and evidence.

A contextual spelling proposal is not self-validating. Exact finite-form round trips outrank approximate edits only
inside a role-aligned class-rule/query frame. When the source token could map to several predicate forms at the same
edit cost, source-character coverage may break the tie only if one candidate covers strictly more observed character
occurrences. Equal remaining coverage retains alternatives, falls back without a contextual preference, or declines
recovery; lexical sorting cannot decide meaning. Approximate matching can rank interpretations; it cannot silently
certify synonymy, world identity, or a missing premise.

Reparse cannot make protected material safe by hiding it inside an opaque nominal identifier. The shared direct
frontend gate accepts a bounded entity or class surface only when the complete phrase is structurally nominal, removes
at most one licensed leading article, and contains no unresolved coordination, negation, quantifier, temporal,
causal, conditional, or finite-clause cue. Entity aliases then match the complete remaining surface exactly. A local
candidate that needs one of those operators must represent it in supported Semantic IR or remain rejected.

### 8. Reparse, epistemic status, and session atomicity

An eligible candidate is executed through the same public runtime boundary as direct input. The candidate receives the
caller's prior context, not tentative changes from the failed direct attempt. If the candidate parses and answers, the
machine result uses language route `heuristic-cnl-approximated` and includes the approximation receipt.

A changed local interpretation is non-authoritative. A strict result reached through it is exposed as `DEFEASIBLE`
unless a future specification defines and tests a narrower mechanically verified equivalence class. An underlying
`UNKNOWN`, ambiguity, conflict, method gap, or resource limit retains that status. The answer's KB provenance remains
real support for the interpreted query, while the approximation receipt separately explains why that query was
selected.

Facts and rules extracted only from an approximated episode are query-local. They may support the answer in that same
episode, but they are not committed to the returned session. The receipt says that candidate effects were discarded.
A later turn can use them only after the user supplies a directly accepted statement or an explicit future
confirmation operation.

### 9. Example

For this input:

```text
Abura is an mura. All mura et bana. Is Abura eating bana?
```

the analyzer identifies `Abura`, `mura`, and `bana` as content-bearing symbols; `all` as a universal quantifier; `et`
as the probable finite-predicate slot; and `eating` as a progressive predicate in a yes/no question. Independent edit,
morphology, auxiliary, and quantified-rule heuristics may vote for:

```text
Abura is a mura. Every mura eats bana. Does Abura eat bana?
```

The receipt must disclose that `et → eats` was inferred rather than declared. If that candidate wins the configured
confidence gate and reparses, safe Horn deduction can answer the interpreted question. The public status remains
defeasible because the lexical repair may not reflect the user's intended invented verb. No statement from the
candidate persists into the next turn.

### 10. Topic focus for task context and related-KB grounding

DS035 task context and failure grounding use role-weighted query focus rather than a flat bag of words. The early
context path begins from visible request topics and question-family subjects; after a supported parse or request plan,
typed roles and obligations can refine downstream focus without changing the already selected interpretation. Both
prefer, in order, accepted entity or predicate identities when available, exact multiword content phrases, content
nouns and verbs, their conservative morphological variants, and then lower-information modifiers when budget remains.
Question-family focus also distinguishes a bounded proper-name-shaped subject from a common nominal, possessed
nominal, or determiner-led phrase. Every typed focus candidate retains both its normalized lookup term and its original
NFKC surface. A source adapter may use the normalized term to find a bounded posting, but a name-bearing source must
apply its own typed identity and canonical-surface gate before returning that record as task context. Accent folding,
case folding, or punctuation removal used by a physical index cannot alone establish entity identity.

After bounded posting lookup has produced a candidate frontier, a separate symbolic relevance estimator combines five
inspectable signals: capped occurrence evidence from the active KB posting, exact phrase and term coverage,
co-occurrence of several focus terms in one record, coverage of distinct query roles, and a typed answer-bridge match
against the accepted subject, predicate, object, or target. Multi-term and multi-role matches receive a super-additive
vote because they are less likely to be incidental than isolated token overlap. Active-KB frequency receives only a
logarithmic capped vote: a ubiquitous word can break a close tie but cannot outrank an exact semantic frame merely by
being common. The estimate never scans beyond the already bounded candidate frontier.

Every ranked entry exposes `eslm-grounding-relevance-estimate-v1`: matched terms and roles, frontier document
frequencies, bounded active-posting occurrence evidence when the provider can supply it, answer-bridge score, and the
additive score. These are retrieval witnesses, not proof steps. A provider or loaded model may omit active occurrence
evidence when its index cannot report it within the selected work policy; absence is recorded as zero evidence rather
than guessed from corpus size.

Articles, determiners, quantifiers, auxiliaries, copulas, pronouns, conjunctions, prepositions, request directives,
output nouns, and style qualifiers are not primary topics while content terms exist. Thus `all` in `All mura et bana`
is a protected operator, not a KB search topic. It may become topical only in an explicit metalinguistic request such
as `What does “all” mean?`, where quotation or the accepted definition frame identifies the word itself as the object
of inquiry.

The term-selection receipt records role, phrase boundaries, inclusion score, exclusion reason, variants, selected
terms, omitted candidates, typed request-plan obligations, and whether selection completed. Request planning supplies
its topic surfaces directly to grounding, so orchestration words cannot consume a topic budget after a plan has
already identified the obligations. Retrieval still sets `answerSupported: false`; better focus improves usefulness
but does not turn relevance or a possible answer bridge into proof.

### 11. Request-intent planning and bounded answer construction

Language approximation and request planning are separate stages. Approximation proposes what an unsupported sentence
means in controlled English. Request planning proposes what kind of artifact the user wants and how to obtain the
material for it. The bounded planner evaluates explicit request force independently of the ordinary direct result so
that an imperative containing several sentence-like spans cannot be mistaken for session assertions. When it accepts
a plan, the caller's prior context—not tentative items learned by the direct attempt—is the request base. The planner
runs only for an explicit request pattern and may recognize `summarize`, `expand`,
`explain`, `compare`, `outline`, `retrieve`, or `compose`, together with artifacts such as a summary, explanation,
essay, report, article, document, table, list, or paragraph. It also extracts requested length and format.

Independent intent, artifact, question-form, relation-marker, length, and format patterns vote for candidates. The
selected `eslm-heuristic-request-plan-v1` exposes every vote, confidence, competing intent, instruction segment,
topic, source-material span, output contract, and dependency-ordered subrequest. A larger instruction can therefore
become several bounded obligations: isolate supplied material, retrieve related records per topic, correlate explicit
relations, select content appropriate to the requested operation, and shape the result. A close unresolved intent tie
is `AMBIGUOUS`; candidate order never resolves it.

Pattern matching runs only over instruction spans after supplied material has been isolated. Negated operations,
artifacts, lengths, and formats are exclusion constraints rather than positive votes. A lexical pattern becomes a
request vote only when its instruction segment has explicit request force: an imperative or negative imperative, a
polite modal request, a first-person desire/request frame, an explicit question form, or a bounded nominal request
ending in `please`. A declarative mention such as `I read a report` or `The essay compares ...` remains inert text.
Negation scope extends through coordinated operations and complements, but ends at punctuation or a contrastive
boundary such as `but` or `instead`; the later positive instruction is analyzed independently.

Quoted source material is removed from pattern matching while both the instruction prefix and suffix remain active,
so `Summarize "..." as a table` preserves the table constraint without interpreting command-looking source text.
Topics are extracted per instruction segment and matched to retrieved records on token and phrase boundaries instead
of raw substrings. Source markers such as `this text`, `following passage`, and `content` are not topics; a source-only
summary may therefore keep an empty topic list and use supplied material plus independently retrieved source claims.
Instruction, material, sentence, topic-count, topic-character, operation-count, and output truncation remain explicit
in receipts and artifact coverage gaps. Topic receipts distinguish observed candidates, unique candidates, returned
topics, count omissions, character truncations, and normalization collisions.

Multi-instruction requests preserve discourse order. Each accepted instruction segment produces one or more explicit
operation plans only when coordination is visible; an uncoordinated close intent tie remains `AMBIGUOUS`. Every
operation plan owns its topics, output contract, confidence, select node, and shape node. Later operation nodes depend
on the preceding shaped result, and a final aggregate node combines multiple shaped artifacts. The operation and
subrequest lists are finite; omissions caused by their budgets make the planning receipt incomplete.

The current synthesis route performs **grounded symbolic generation**. It does not copy a bag of retrieved statements
into an answer. The nested DS029 construction circuit first freezes one work order, then a non-voting claim-admission
gate accepts or rejects each candidate. A rhetorical planner assigns admitted claims to ordered sections. Four
sentence strategies realize supplied source sentences, lexical definitions, typed facts, or explicitly causal
defeasible relations. Seven discourse and format strategies fuse compatible claims, state comparisons and coverage
gaps, and assemble prose, sectioned documents, outlines, or tables. The final result contract deterministically
reproduces the realization and rejects any sentence, citation, section, or strategy trace that cannot be rebuilt from
the closed plan and admitted evidence.

Every accepted operation still owns its topics and output contract and executes in discourse order. Its
`operationArtifacts` entry records selected source excerpts, KB records, comparison witness, and coverage gaps. Once
at least one obligation has admissible material, missing obligations remain visible as limits. A request with no
supplied or admitted material yields no fabricated document.

The route returns `PARTIAL` because wording and organization do not prove complete topic coverage. It retains the
order-preserving union of KB records that actually support realized sentences as answer provenance and
`usedKbVersions`. Related but rejected records remain visible only in the internal construction ledger. The circuit may
create new English wording and a useful document shape; it may not invent a factual bridge, silently strengthen a
defeasible relation, or present relevance as deductive proof. Construction confidence measures coverage of admitted
claims, not truth or proof confidence.

The pattern catalog is versioned declarative policy. New patterns are promoted through reviewed code/data changes,
renamed and contrastive tests, confidence calibration, and release review. Runtime observations may produce a
diagnostic proposal for future work, but deployed execution never rewrites its own pattern catalog or memorizes an
answer. This is the incremental learning mechanism: independently testable generic patterns grow the planner without
creating hidden per-request behavior.

### 12. Work profiles and exact budgets

The CLI and runtime expose one immutable `eslm-work-policy-v1` snapshot per execution. The named profiles are `quick`,
`balanced`, `deep`, and `exhaustive-bounded`. Each profile expands a fixed table of exact limits covering at least:

- approximation input, candidate, vote, and reparse work;
- Horn rounds, materialized facts, and join attempts;
- provider or routing search work supported by the selected adapters;
- grounding terms, sources, lookups, values per lookup, candidate entries, returned entries, and semantic bytes.

`balanced` is the default. `quick` favors interactive latency, `deep` allows a wider proof and retrieval frontier, and
`exhaustive-bounded` selects the largest supported finite policy. Its name does not claim that every registered corpus
or an unbounded logical universe was exhausted. The structured snapshot contains requested profile, effective profile,
exact limits, and explicit overrides.

Startup flags select a profile and bounded numeric overrides. Interactive `/work` displays the snapshot and `/work
PROFILE` rebuilds the runtime without changing selected KB identities or session facts. Invalid, fractional, negative,
or above-maximum values are rejected. Time limits are scheduling policies unless an executor has an enforceable timer;
the result must not describe them as hard elapsed-time guarantees.

Every ordinary question begins with one restrained operational activity line naming the effective profile and a small
set of decisive caps, including interpretation, reparse, loaded-source, and context-lookup breadth. Interactive output
places it in the muted presentation channel; `ask` and `run` place it on standard error so JSON and JSONL remain clean.
Every completed interactive result then includes the muted `Thinking · symbolic processing` panel, including short
human descriptions of route, outcome, method, cited support, context construction, and effective resource limits.
This panel is an auditable stage-and-budget summary, not hidden chain-of-thought, model deliberation, or new result
authority. Detailed machine receipts remain in the structured result and `/trace`.

A larger profile may convert `RESOURCE_LIMIT` or incomplete grounding into a completed search. Given the same semantic
inputs and enough budget to complete, profiles must agree on status, values, proof, and provenance. A profile may not
change trust, logic, tie-breaking, epistemic status, benchmark denominator, or the meaning of `UNKNOWN`.

DS027 adds exact strategy selection and target multi-dimensional per-strategy allocations. `--strategy-select` and
interactive `/strategy` choose non-empty allowlists of known executable identities; named strategy presets are only
inventory views. Selection may change which reviewed interpretations or evidence signals are considered and is
therefore part of execution identity. Work profiles continue to mean finite effort: once the selected strategy set
and semantic frontier are equal and complete, a larger work profile cannot select a different truth or interpretation
merely because it has a different name.

### 13. Language Agent proposal boundary and disclosure

The deployable runtime, direct library, and general operator CLI remain agent-free by default. The CLI composes the
DS013 wrapper only after explicit `--external-language-agent` or interactive `/normalize on` opt-in and discloses that
policy at startup; `--no-external-language-agent` or `/normalize off` explicitly retains the fully local default. The
English-likelihood gate remains local in either mode and never translates. When it reports likely non-English, the
assisted wrapper may request a translation proposal before the English-only repair ensemble. For likely-English or
indeterminate input, the local heuristic route always runs before an external simplification proposal after direct
`UNPARSED`. The local route may also inspect direct `UNKNOWN` for a structurally licensed alternative, but an
`UNKNOWN` that remains after that attempt never triggers the Language Agent.

A local terminal `UNPARSED` may cause the gray Thinking summary to recommend explicit assisted opt-in. This is not a
language proposal, vote, strategy execution, or external invocation and it creates no candidate or normalization
receipt. Parsed `UNKNOWN`, ambiguity, resource exhaustion, and every completed local answer do not receive that
recommendation.

The Language Agent is one proposal strategy attached logically to `runtime.language.interpret`; its external executor
remains outside the deployable registry and has no vote, KB access, proof access, answer context, or answer authority.
Its target must pass the same non-voting English parser and semantic gate. Translation additionally requires an
independent reviewed source-language preservation profile for open-class equivalence. Language-neutral anchors,
English-target likelihood, reparsing, and model-declared alignments are necessary checks but do not by themselves
verify a novel cross-language equivalence; without that independent profile the route returns
`UNVERIFIED_NORMALIZATION`.

Immediately before a real external invocation, interactive output displays a restrained attempt-aware progress message
with operation, proposal slot, adapter, and enforceable per-call timeout. One-shot structured commands place that
progress on standard error so JSON or JSONL standard output remains valid. The final machine result records adapter,
model, proposal count, cache state, and actual external invocation count. A cache hit is still an assisted route but
is not described as a live invocation.

### 14. Resource, security, and determinism requirements

Approximation runs in the deployed dependency-free runtime closure. Candidate selection uses parser/session
compilation only: it canonicalizes the question, query-local assertions, and rules without consulting providers or
executing reasoning. After semantic selection, exactly one candidate enters ordinary execution. Approximation uses no
network, child process, model, corpus scan, mutable global dictionary, or executable KB content. It validates input size before token analysis and bounds
segments, tokens, heuristic emissions, combined candidates, alignment records, reparses, receipt bytes, and diagnostic
text. Crossing a bound leaves the original `UNPARSED` result intact and records the exhausted approximation resource.

The same input, work policy, runtime version, prior context, and package set produces the same candidates, votes,
ranking, selected interpretation, and result. Candidate text or confidence never becomes a cache key for answer truth
or a branch on source identity.

### 15. Acceptance and falsification tests

The implementation requires fully renamed nouns, predicates, objects, and entities; reordered independent statements;
punctuation and article variants; unique and tied spelling candidates; base, third-person, and progressive predicates;
quantified rules; missing auxiliaries; request-envelope reduction; irrelevant high-overlap words; and multi-sentence
inputs. Every positive case has a meaning-changing control for negation, quantifier strength, relation direction,
argument order, modality, or predicate identity.

Tests verify deterministic replay, vote accounting, confidence monotonicity, candidate and receipt limits, session
rollback, no Language Agent access from the deployable runtime, likely-non-English rejection without local repair,
the CLI's local default, explicit assisted opt-in and local restatement, notification before a real external call, grounding
exclusion of function words, explicit metalinguistic inclusion, work-profile expansion, and equal
answers across profiles that complete. The core guardian's forbidden-dispatch audit must find no benchmark, record,
hash, expected answer, or motivating-example constant in executable conditions.

Grounding controls additionally include renamed collisions between a common noun and a proper name that share an
accent-folded lookup key. A common nominal and an ASCII-only surface must not admit a Unicode-different canonical
place, while the exact Unicode proper name must remain retrievable under the same work policy.

Morphology tests cover exact finite/lemma round trips for sibilants, consonant-`y`, short `-ie`, nonce predicates, and
the contrasting `tie`, `vie`, and `cries` surfaces. Fully renamed entity, class, and object frames exercise the same
class-rule/query alignment over `water`, `fix`, `pass`, `buzz`, `map`, and `move`, including deletion, insertion,
substitution, and transposition spelling inputs. Controls also prove that a well-formed different predicate is not
overwritten merely because another question predicate is edit-near. These tests protect a generic structural rule,
not a vocabulary allowlist.

Route tests additionally prove that any `UNPARSED` episode, including one with valid tentative assertions followed by
an unsupported final question, rolls back every tentative entity, fact, rule, and history event; the bounded
English-likelihood assessment cannot translate or reject an unknown nonce vocabulary merely for being unfamiliar;
explicit request force preempts an accidental direct assertion parse without
committing its learned items; a repaired `UNKNOWN` is chosen from parse-only Semantic IR rather than downstream answer
success; a normal missing-knowledge `UNKNOWN` remains unchanged; equal candidate and direct IR preserve direct
`SOLVED` or `PARTIAL`; a structurally licensed different IR is query-local and explicitly qualified; likely
non-English input can reach only the external translation-proposal route or local rejection; and only a final English
`UNPARSED`, never another parsed status, can reach external simplification.

The default heuristic development benchmark complements focused tests with 1,200 deterministic runtime episodes. Its
43 reviewed template shapes are repeatedly instantiated with nonce vocabulary across 18 declared domains and 28
target families; the row count is renaming and combination breadth, not a count of independent constructions. It
includes direct controls, deletion, insertion, substitution, and transposition spelling processes, explicit morphology
strata, repairs expected to succeed, and unsafe or meaning-changing forms expected to remain distinct or be rejected.
The runner executes the ordinary `HeuristicLanguageRuntime` with grounding and external assistance disabled, so
proposal generation, protected meaning, voting, reparse, route, status, confidence, and resource behavior remain in
scope together.

The default receipt measures 1,200 unique surface inputs and 593 observed cells out of the 774 possible declared
43-technique by 18-domain pairs. That makes duplicate surfaces and empty grid regions visible. It does not turn nonce
renaming into structural novelty, and it does not remove the current domain-to-predicate coupling.

The typed oracle level determines what one pass means. `answer-execution`, `semantic-query-execution`,
`candidate-selection`, `query-local-decomposition`, `request-execution`, `request-planning`, `proposal-only`, and
`safety-abstention` are aggregated separately. Semantic-query execution requires the complete expected relation-shaped
query even when missing knowledge leaves the result `UNKNOWN`. Request planning requires the ordered obligation and
an honest missing-source gap; both request oracle levels validate every ordered obligation's intent, artifact kind,
and requested format. Request execution additionally requires the construction path and composite response shape.
The candidate-selection level requires the exact intended structural candidate to win, carry its required family,
receive a matching accepted parse-only reparse, and execute as the query-local interpreted episode under the declared
route and status. It does not require a complete relation-shaped query and can pass with `UNKNOWN` and `missingEntity`;
it must not be reported as complete relational interpretation coverage.
The current `interpretable-complex-clause` templates use the proposal-only level: they require the expected family and
protected-operator preservation but can pass with final `UNPARSED`. The fixed generator definition contains 112 such
proposal-only rows. They establish proposal and safety coverage, not executable interpretation coverage. The
top-level rate therefore summarizes mixed development contracts and must be read with oracle-level, route, and status
aggregates; the generated report, not this stable contract, owns their mutable runtime statuses.

Development conclusions are drawn from aggregate clusters, not the first unusual sentence in a failure list. Separate
aggregates cover domain, technique, target family, complexity, status, route, confidence, and resource outcome.
Earliest-failure clusters combine stage and target family while retaining their domain and technique distributions;
only a bounded representative sample is printed. A proposed heuristic must explain a repeated generic structural
cluster and pass renamed, independently seeded, and meaning-changing controls before promotion. The deployed runtime
never learns from the report or changes its own strategy catalog.

### 16. Present implementation boundary

The current release implements the pure approximation ensemble in `src/language/heuristic-cnl-*.mjs`, the versioned
request pattern, force, structure, and planning modules in `src/language/heuristic-request-*.mjs`, runtime
coordination in `src/runtime/heuristic-language-runtime.mjs`, grounded symbolic document construction in
`heuristic-request-synthesis.mjs` and `grounded-response-realization.mjs`, exact reproduction in
`result-realization-contract.mjs`, and exact profiles in `work-policy.mjs`. `EslmRuntime.ask(...,
{ grounding: false })` defers grounding and `attachGrounding(result)` attaches it once the final language route is
known. The general CLI omits the DS013 wrapper by default and composes it only for explicit assisted opt-in. Canonical
local evaluation and benchmark commands construct the same agent-free profile explicitly.

The CLI emits bounded symbolic activity through `src/interface/processing-activity.mjs`, emits attempt-aware external
activity through `language-agent-activity.mjs`, and renders the completed operational panel and expanded context trace
through `interactive-result-presenter.mjs`, re-exported by `interactive-presenter.mjs`. Per-request exceptions are
contained inside the interactive loop so a rejected
intermediate result cannot close the session or commit its context.

The implemented English gate wraps the heuristic runtime rather than entering its 24-family vote. Its closed
`eslm-english-likelihood-v1` receipt inspects at most 64 KiB of encoded UTF-8 and 1,024 tokens and records one of three
classifications. On `likely-non-english`, it returns `UNPARSED` with route `english-language-gate-rejected`, an
unchanged session snapshot, no plan, approximation, grounding, values, provenance, or consulted KB, and one explicit
translation gap. English and indeterminate input continues into the existing local processing nodes with the receipt
attached.

The wrapper evaluates request planning before it accepts an ordinary direct result as final. A planned request uses a
snapshot of the caller's incoming session and marks its episode `heuristic-request-query-local`. When no request plan
applies, `UNPARSED`, `UNKNOWN`, `SOLVED`, and `PARTIAL` are eligible for local candidate generation; candidate
acceptance uses `inspectLanguage` only. The `alternativeInterpretationRequired` gate always permits recovery work for
`UNPARSED` and `UNKNOWN`, but lets an accepted candidate supersede direct `SOLVED` or `PARTIAL` only when its canonical
Semantic IR signature differs from the direct signature. If no candidate reaches accepted Semantic IR, `UNPARSED`
receives an approximation receipt and every other direct status is returned unchanged. A changed direct success uses
an incoming-session snapshot and transaction `heuristic-interpretation-query-local`. This preserves ordinary direct
results while recovering cases where permissive parsing selected or flattened the wrong frame.

`src/evaluation/generated-heuristic-benchmark.mjs` owns the deterministic development generator and runner. Its
default report has evidence regime `internal-generated-development`, declares `benchmarkComparable: false`, freezes
the stable seed and 1,200-case denominator, and records batch strategy and work identity beside aggregate diagnostics.
It is part of the default internal benchmark workflow. Interactive regression smoke separately instantiates all 43
generator shapes and applies the same typed assessor inside its combined 4,096-case catalog, but it does not reuse the
published suite identity or report metric. The authored fixture and public benchmark portfolio remain separate
evidence regimes as well.

`heuristic-cnl-morphology.mjs` owns lemma candidates, finite-form generation and inversion, bounded Damerau comparison,
and the strict source-character-coverage tie-break. `heuristic-cnl-families.mjs` owns the role alignment among entity
membership, universal class rule, question predicate, and normalized object. The progressive family uses the exact
round trip first, then bounded edit evidence; an unresolved tie contributes no contextual winner. Contextual spelling
and predicate agreement consume the resulting typed target without gaining answer authority.

The approximation defaults are 16 KiB of input, 768 tokens, 48 sentences, 96 proposals, 24 candidates, 8,192
edit-distance evaluations, and a 512 KiB receipt. Absolute validated ceilings are 64 KiB, 8,192 tokens, 128
sentences, 1,024 proposals, 256 candidates, 131,072 distance evaluations, and a 1 MiB receipt. Named work profiles
request 8/24/64/128 candidates and 4/12/32/64 reparses for `quick` through `exhaustive-bounded`; all four use the same
`0.68` semantic threshold by default, and every result contains the expanded exact limits.

The current safe transitive CNL slice accepts `Every CLASS VERBs OBJECT` and `Does ENTITY VERB OBJECT?` for generic
nonce predicates, with the rule range-restricted through class membership. Request synthesis selects and cites only
source sentences or grounding records, reports `PARTIAL`, and does not create uncited factual prose. General abstractive
summarization, stylistic essay generation, derived causal narrative, audience adaptation, and self-modifying pattern
learning remain future acceptance gates rather than claims of this release.

Grounding term selection currently uses typed question roles, exact phrases, shared noun/verb morphology, and an
auditable candidate list. Loaded canonical indexes contribute bounded posting size as active-frequency evidence; any
provider that knows a source-global occurrence count may add the same bounded field. The relevance estimator executes
only over at most 512 already retrieved candidates and records every statistical and answer-bridge contribution.

These modules provide real independent heuristic families, votes, confidence, work bounds, and receipts. Language
families now execute through the sealed DS027 registry and stage coordinator; immutable inputs, trusted type
validators, canonical ordering, exact allowlists, bounded exception containment, per-family invocation slots,
consumer-only edit-distance preallocation, and the v1 stage execution receipt are enforced. The final language
interpretation still comes from the specialized DS022
proposal lattice, protected-meaning gate, and semantic reparse rather than the generic confidence arbiter.

The complete DS027 cross-stage scheduler, typed dependency graph, multi-dimensional per-strategy work plan, common
stage arbiters, independent verifier stage, compiler registry, and pipeline receipt remain open. The instrumented-local
request, focus, relevance, reasoning, and construction gates must retain their DS022 safety and epistemic contracts as
they migrate; cataloging or gating a local owner is not the same as shared-coordinator execution.

## Decisions & Questions

### Question #1: Why does local approximation run before external English simplification?

Response: Spelling, morphology, auxiliary reconstruction, and controlled clause reduction are bounded deterministic
operations whose evidence can be inspected. Running them first improves offline coverage, reduces disclosure and cost,
and turns recurrent patterns into testable language capability instead of permanent service dependence. This order
does not apply to input already rejected as likely non-English: pretending to repair it as English would be the unsafe
operation, so the local route rejects it and the assisted CLI may request a separately attributed translation proposal.

### Question #2: Why is a solved interpreted query normally `DEFEASIBLE`?

Response: The reasoner may prove the answer to the candidate exactly while the mapping from original text to candidate
remains uncertain. Keeping the top-level epistemic status non-strict prevents a strong proof from hiding a guessed verb
or clause boundary. The receipt lets a user confirm or correct that interpretation.

### Question #3: Why are quantifiers and auxiliaries excluded from ordinary grounding topics?

Response: They shape meaning but rarely identify the subject matter. Querying `all`, `is`, or `does` when `mura`,
`eat`, and `bana` are available spends budget on grammatical scaffolding and produces unrelated lexical records.
Metalinguistic frames provide the explicit exception when a function word is itself the requested concept.

### Question #4: Why is `exhaustive-bounded` not called exhaustive?

Response: The suffix is essential. It means the largest finite profile implemented by the current runtime, not an
unbounded proof, a scan of every registered KB, or a guarantee that an optional provider completed. Receipts remain the
authority for actual coverage.

### Question #5: Why are approximated session statements query-local?

Response: Persisting a guessed statement would silently change later answers long after the original uncertainty was
visible. Query-local execution provides immediate utility while preserving transactional session semantics. Explicit
confirmation can become a separate operation without weakening this default.

### Question #6: Why is nominal-surface validation shared with the direct parser?

Response: Candidate confidence cannot compensate for missing scope. Using the same bounded nominal gate for direct
assertions, direct questions, and heuristic reparses prevents an ensemble from obtaining parser acceptance by moving
an unresolved operator into an entity or class string. It also keeps positive multiword aliases independent of the
motivating vocabulary because exact full-surface matching is structural rather than lexical special casing.

### Question #7: Why does an intent word need request force?

Response: The same words describe existing artifacts and actions in ordinary assertions. Treating every occurrence of
`report`, `essay`, `summary`, `write`, or `compare` as a command would fabricate tasks from source prose. The bounded
request-force gate separates a visible instruction from a mention before intent votes acquire planning authority.

### Question #8: Why preserve ordered operation plans instead of one unordered intent set?

Response: `Summarize A; compare A with B; then outline the evidence` describes three obligations whose outputs and
dependencies differ. An unordered set loses which topic and output contract belongs to which operation. Ordered plans,
operation-specific selection, a non-voting claim gate, rhetorical and sentence ledgers, and a final document assembly
node make that composition executable and reviewable without silently dropping later obligations.

### Question #9: Why migrate heuristic families into separate strategies?

Response: Their evidence, safety preconditions, calibration, cost, and failure modes can then be tested and ablated
independently, while one coordinator keeps composition deterministic and visible. Static registration retains the
offline trust boundary, and correlation-aware voting prevents artificial confidence from several implementations of
the same underlying cue.

### Question #10: Why evaluate many generated near-CNL episodes instead of expanding one motivating example?

Response: One example can reveal a defect but cannot distinguish a generic language weakness from an accidental
lexical interaction. A deterministic structural distribution supplies repeated and contrastive evidence across
domains, techniques, nonce vocabularies, and target families. Aggregate clusters then justify reusable heuristics and
calibration changes, while independent seeds and meaning-changing controls expose memorization or over-repair. Each
pass retains the authority of its oracle level: choosing the expected candidate is useful evidence, but it does not
establish a complete relational Semantic IR when the runtime stops at `UNKNOWN` with `missingEntity`.

### Question #11: Why can source-character coverage break an edit-distance tie?

Response: Equal edit distance can hide an asymmetric explanation of the token. A candidate retaining strictly more
occurrences from the observed character multiset is supported by more of the visible surface and may receive a narrow
deterministic preference after role alignment and finite-form checks. This is weaker than lexical knowledge and cannot
break an equal-coverage tie. Keeping that last tie unresolved prevents alphabetical order or registration order from
silently becoming a morphological decision.

### Question #12: Why is the gray processing panel not a chain-of-thought display?

Response: It exposes reviewable operational facts already present in contracts: selected route, public outcome,
method identity, evidence counts, context receipts, and finite work limits. It does not reveal free-form private
deliberation or add evidence. The same facts are reproducible from the structured result, while `/trace` provides the
more detailed machine-oriented view.

### Question #13: Why can the local runtime recommend Language Agent without running it?

Response: The runtime has enough typed information to distinguish a language-construction failure from a knowledge
gap. Showing an optional operator action after `UNPARSED` makes that distinction useful without crossing the external
boundary. Invocation still requires a separate explicit configuration change, so recommendation cannot become hidden
service use or an answer-seeking fallback.

## Conclusion

ESLM recovers from near-CNL English wording through a deterministic, confidence-bearing ensemble before it considers
external simplification. A separate bounded ingress gate rejects likely non-English input without pretending to
translate; the operator Language Agent can only propose English across the disclosed external boundary. The same
policy gives KB grounding a linguistically meaningful topic focus and gives
operators explicit control over bounded work. Every approximation remains inspectable, non-persistent, and
epistemically distinct from the proof that may follow it.
