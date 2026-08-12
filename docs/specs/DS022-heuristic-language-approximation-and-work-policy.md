---
id: DS022
title: Heuristic Language Approximation, Query Focus, and Work Policy
status: accepted
owner: language-runtime
summary: Defines deterministic local recovery from unsupported wording, confidence-bearing candidate voting, topic selection for related-KB retrieval, bounded work profiles, and the final opt-in Language Agent escalation.
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

1. Execute the original input through the direct symbolic and provider routes.
2. If and only if the final language status is `UNPARSED`, generate bounded local heuristic candidates.
3. Reparse eligible candidates through the same symbolic runtime without granting them persistent session effects.
4. If no local candidate is accepted and the operator explicitly enabled a Language Agent, run the DS013 episode.
5. After the final answer or inability status is known, attach DS009 related-KB grounding when that status permits it.

Grounding is deliberately last. KB records cannot influence how an unparsed sentence is rewritten, and a Language
Agent never receives grounding, provider answers, proof state, or desired semantic values. A parsed `UNKNOWN`,
`AMBIGUOUS`, `RESOURCE_LIMIT`, or method gap is not a language-recovery trigger.

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

A contextual spelling proposal is not self-validating. When the source token could map to several predicate forms at
the same cost and structural score, the layer retains alternatives or declines recovery. Approximate matching can
rank interpretations; it cannot silently certify synonymy, world identity, or a missing premise.

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

### 10. Topic focus for related-KB grounding

Failure grounding uses role-weighted query focus rather than a flat bag of words. It prefers, in order, accepted entity
or predicate identities, exact multiword content phrases, content nouns and verbs, their conservative morphological
variants, and then lower-information modifiers when budget remains.

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
material for it. The planner runs only for an explicit request pattern and may recognize `summarize`, `expand`,
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

The current synthesis route is deliberately extractive. It may select sentences from user-supplied source material
and statements from a DS009 grounding bundle, deduplicate them, group them by topic, identify relation labels that are
explicitly shared across comparison topics, and render cited paragraphs, sections, bullets, outlines, or tables. It
executes every accepted operation plan in discourse order rather than shaping the whole request from only the first
intent. Each operation receives only its declared topics and output contract, emits an ordered
`operationArtifacts` receipt with its selected source excerpts, KB records, comparison witness, and coverage gaps,
and, once at least one obligation has material for synthesis, retains a visible gap section for every other obligation
that found no match. A request with no supplied or selected material still yields no fabricated draft. A final
aggregate section identifies the ordered operation artifacts without inventing a factual bridge between them.

The route returns `PARTIAL`, retains the order-preserving union of every operation's selected KB records as answer
provenance and `usedKbVersions`, and always states that the artifact is a bounded extractive draft. It also states
incomplete search, omitted records, missing causal support, and other gaps. It does not paraphrase a new claim, invent
a causal bridge, or present related evidence as deductive proof. More generative composition requires a separately
specified claim verifier.

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

A larger profile may convert `RESOURCE_LIMIT` or incomplete grounding into a completed search. Given the same semantic
inputs and enough budget to complete, profiles must agree on status, values, proof, and provenance. A profile may not
change trust, logic, tie-breaking, epistemic status, benchmark denominator, or the meaning of `UNKNOWN`.

DS027 adds exact strategy selection and target multi-dimensional per-strategy allocations. `--strategy-select` and
interactive `/strategy` choose non-empty allowlists of known executable identities; named strategy presets are only
inventory views. Selection may change which reviewed interpretations or evidence signals are considered and is
therefore part of execution identity. Work profiles continue to mean finite effort: once the selected strategy set
and semantic frontier are equal and complete, a larger work profile cannot select a different truth or interpretation
merely because it has a different name.

### 13. Language Agent escalation and disclosure

Language Agent normalization is disabled by default. Operators enable it explicitly with
`--external-language-agent` or interactive `/normalize on`. The local heuristic route remains active in either mode
and always runs first after direct `UNPARSED`.

Immediately before a real external invocation, interactive output displays a restrained progress message such as
`Thinking: interpreting with the configured Language Agent…`. One-shot structured commands may place that progress on
standard error so JSON or JSONL standard output remains valid. The final machine result records adapter, model,
proposal count, cache state, and actual external invocation count. A cache hit is still an assisted route but is not
described as a live invocation.

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
rollback, no KB access during approximation, no Language Agent call by default, notification before a real external
call, grounding exclusion of function words, explicit metalinguistic inclusion, work-profile expansion, and equal
answers across profiles that complete. The core guardian's forbidden-dispatch audit must find no benchmark, record,
hash, expected answer, or motivating-example constant in executable conditions.

### 16. Present implementation boundary

The current release implements the pure approximation ensemble in `src/language/heuristic-cnl-*.mjs`, the versioned
request pattern, force, structure, and planning modules in `src/language/heuristic-request-*.mjs`, runtime
coordination in `src/runtime/heuristic-language-runtime.mjs`, extractive document construction in
`heuristic-request-synthesis.mjs`, and exact profiles in `work-policy.mjs`. `EslmRuntime.ask(...,
{ grounding: false })` defers grounding and `attachGrounding(result)` attaches it once the final language route is
known. The CLI composes the heuristic wrapper in every ordinary profile and adds the DS013 wrapper only after explicit
opt-in.

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

### Question #1: Why does local approximation run before the Language Agent?

Response: Spelling, morphology, auxiliary reconstruction, and controlled clause reduction are bounded deterministic
operations whose evidence can be inspected. Running them first improves offline coverage, reduces disclosure and cost,
and turns recurrent patterns into testable language capability instead of permanent service dependence.

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
operation-specific select/shape nodes, operation-by-operation extractive artifacts, and a final aggregate node make
that composition executable and reviewable without silently dropping later obligations.

### Question #9: Why migrate heuristic families into separate strategies?

Response: Their evidence, safety preconditions, calibration, cost, and failure modes can then be tested and ablated
independently, while one coordinator keeps composition deterministic and visible. Static registration retains the
offline trust boundary, and correlation-aware voting prevents artificial confidence from several implementations of
the same underlying cue.

## Conclusion

ESLM recovers from near-CNL wording through a deterministic, confidence-bearing ensemble before it considers an
external Language Agent. The same policy gives KB grounding a linguistically meaningful topic focus and gives
operators explicit control over bounded work. Every approximation remains inspectable, non-persistent, and
epistemically distinct from the proof that may follow it.
