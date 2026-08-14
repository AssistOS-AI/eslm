---
id: DS035
title: Query-Local Epistemic Context Construction
status: in-progress
owner: knowledge-runtime
summary: Defines the mandatory bounded task-context node, a broad functional question taxonomy, default self-question expansion, provenance-preserving KB collection, and explicitly partial contextual fallback without answer or proof inflation.
---

# DS035 Query-Local Epistemic Context Construction

## Introduction

Ordinary questions rarely arrive in one controlled wording. “What is a cat?”, “What is a knife for?”, “How can it be
used?”, “Where is it prohibited?”, and “Why does it exist?” ask for different semantic facets while sharing a small
set of topic terms. The same questions can also occur inside a larger request whose final output is a comparison,
explanation, plan, report, or decision. A symbolic system that waits for one exact surface pattern before consulting
knowledge will appear disconnected even when its selected packages contain useful definitions, relations, locations,
constraints, or event knowledge.

This specification defines the generic `task-context-coordinator` responsibility. For every bounded likely-English or
indeterminate-English request on the normal product path, it identifies explicit and embedded question families,
extracts query-local focus, creates a finite prioritized self-question plan, and retrieves a bounded provenance-bearing
context from the already selected KB scope. The context is available to later planning and result construction. It has
no interpretation, premise, proof, truth, session, package-selection, or final-answer authority.

The requirement is a maximal functional taxonomy, not a claim that a finite list contains every English sentence.
Unknown wording remains visible as an open question with its source span and focus terms. New surface adapters and
future context strategies may improve coverage without changing the epistemic boundary or teaching the core domain
answers.

## Core Content

### 1. Stable node, strategy, and packet identities

The processing node is `node:runtime:task-context-coordinator` in the runtime knowledge-and-evidence circuit. It is a
non-voting coordinator at stage `runtime.context.construct`, is query-local and offline, and initially has
`instrumented-local` implementation state. Its packet is `packet:runtime:task-knowledge-context`; the public optional
result extension is `eslm-task-knowledge-context-v1`.

The initial mandatory default strategy is `strategy:context:question-facet-expansion@1`. It deterministically creates
the broad self-question plan and uses the existing bounded focus, exact provider frontier, relevance, provenance, and
search-receipt mechanisms. The strategy is selected by default and remains mandatory in an exact context-stage
allowlist. Future strategies may propose alternative focus expansion, graph-neighborhood selection, contradiction
search, or task-specific facet ordering, but none may remove the default safety invariants, consult an unselected KB,
or acquire answer authority.

The node consumes the bounded visible request after the English-likelihood gate. It may use an accepted task frame or
request plan when one exists, but it also operates from visible English surface terms when direct interpretation is
missing. Retrieved knowledge never feeds the language proposal selector: KB success, answer values, proof outcome, and
grounding rank cannot decide what the user meant.

### 2. Functional question taxonomy

The taxonomy below is the maximum common question-facet inventory for the initial implementation. A family names an
information need independently of one English wording or one provider predicate. The relation examples are routing
hints; package metadata remains the authority for actual relation meaning.

| Family | Typical natural questions | Requested information |
| --- | --- | --- |
| Definition | What is a cat? What does quorum mean? | A source-backed definition of a term or concept. |
| Identity | Who or what is X? What is X known as? | Entity or concept identity and aliases. |
| Lexical sense | Which meaning of bank applies? How many senses exist? | Sense inventory and sense-qualified meaning. |
| Synonym | What is another word for X? | Declared lexical equivalence candidates. |
| Antonym | What is the opposite of X? | Declared lexical opposition candidates. |
| Taxonomy | What kind of thing is X? What category contains X? | Class, superclass, instance, and type relations. |
| Example or instance | What is an example of X? Which X are known? | Provenance-bearing members or examples. |
| Property or state | What properties does X have? What is X like? | Typed attributes, qualities, and current state. |
| Composition or material | What is X made of? | Declared material and composition relations. |
| Part and whole | What parts does X have? What is X part of? | Mereological relations in both directions. |
| Purpose or function | What is X for? Why is X used? | Declared purpose and functional roles. |
| Capability | What can X do? What is X capable of? | Supported capability or action relations. |
| Affordance | What can be done to X? What receives X? | Actions that a concept can receive or enable. |
| Method or usage | How do I use X? How does X work? | Procedures, steps, mechanisms, or an explicit gap. |
| Location or availability | Where is X found, located, available, or used? | Spatial, container, jurisdiction, and availability relations. |
| Permission or prohibition | Where or when is X allowed, required, restricted, or forbidden? | Normative scope with source, authority, place, time, and exceptions. |
| Requirement or prerequisite | What does X require? What must happen first? | Preconditions, dependencies, inputs, and required capabilities. |
| Cause or origin | What causes X? Where did X come from? | Explicit causal, generative, or origin relations. |
| Reason or explanation | Why does X exist or happen? | Source-backed explanatory relations without invented bridges. |
| Intent or motivation | What goal might motivate X? | Explicit or defeasible intention and goal relations. |
| Effect or consequence | What can X cause? What happens after X? | Strict or defeasible effects and successor events. |
| Continuation or next action | What follows X? What might happen next? | Declared temporal or narrative continuations. |
| Risk or hazard | What can go wrong? What risks are recorded? | Explicit hazards, failure conditions, and adverse effects. |
| Benefit or value | What does X help with? What benefits are recorded? | Explicit positive effects or utility claims. |
| Limitation or exception | When does X not apply? What are its limits? | Negative scope, exceptions, bounds, and coverage gaps. |
| Agent, owner, or responsibility | Who performs, owns, controls, or is affected by X? | Typed participant and responsibility roles. |
| Time, history, or duration | When did X occur? How long is X valid? | Event time, valid time, duration, order, and supersession. |
| Quantity or measurement | How many, how much, how large, or how often? | Values, units, ranges, counts, and measurement context. |
| Comparison | How are X and Y similar or different? Which is greater? | Aligned declared relations, values, conflicts, and missing axes. |
| Alternative or substitute | What can replace X? What other options exist? | Explicit alternatives, equivalents, and substitution constraints. |
| Evidence or provenance | What supports X? Which source states it? | Proof leaves, source claims, package versions, and citations. |
| Confidence or conflict | Is X certain? Do sources disagree? | Epistemic strength, ambiguity, contradiction, and search completeness. |
| Relation or connection | How are X and Y connected? | Typed paths or an explicit missing-link frontier. |
| Change or lifecycle | What changed, started, stopped, or superseded X? | State transitions, revisions, and lifecycle stages. |
| Stakeholder or audience | Who needs, uses, receives, or is affected by X? | Explicit participant roles, never inferred hidden preferences. |

The taxonomy is source-neutral. Words such as `cat`, `knife`, `medicine`, `city`, and `law` occur only in explanatory
examples and never in runtime dispatch. Core branching uses the family, typed roles, task operation, relation metadata,
and work policy. A KB may lack records for a family; recognition then creates a typed gap rather than an invented fact.

### 3. Explicit, embedded, and self-generated questions

The question analyzer emits `eslm-basic-question-analysis-v1`. It preserves the original bounded surface and records:

- recognized explicit questions with family, source span, topic, relation focus, and canonical provider-independent
  paraphrases;
- coordinated nominal subjects as one bounded `topicSurfaces` list when the surface grammar licenses the split; each
  member becomes its own topic-family need while the unsplit surface remains available for audit;
- progressive and do-support location forms treat `living` or `live` as the relation cue rather than part of the
  subject, so `Where is X living?` and `Where does X live?` focus on `X`;
- question clauses embedded inside polite envelopes, statements, or larger task instructions;
- open questions whose interrogative force is visible but whose family is not yet supported;
- selected topic terms and phrases plus omitted candidates and the reason for omission; and
- a finite self-question plan derived from the recognized task and the maximum taxonomy.

Self-question planning uses this deterministic priority order:

1. explicit requested families and their named subjects or objects;
2. definition, identity, taxonomy, and property context for the highest-ranked unknown topics;
3. relation families implied by the task, such as purpose for a usage request, causes for an explanation, or aligned
   attributes for a comparison;
4. requirements, limitations, risks, conflicts, and provenance that could qualify an otherwise plausible result; and
5. optional examples, alternatives, history, stakeholders, and wider neighborhood only when work remains.

The plan does not execute every English rendering of every family. It creates one typed information need per selected
topic-family pair, deduplicates equivalent needs, and records the unexecuted remainder. This distinction makes the
inventory broad while execution stays finite.

### 4. Context construction algorithm

For one request, the default strategy performs the following finite steps:

1. validate the input, session snapshot, English-likelihood decision, selected KB identities, and work-policy snapshot;
2. segment explicit and embedded question surfaces without executing supplied text as instructions;
3. recognize supported families and retain unsupported interrogatives as open questions;
4. select exact phrases, semantic roles, content terms, and bounded morphological variants through the DS022 focus
   strategies;
5. create and prioritize the self-question plan;
6. allocate lookups fairly across the selected canonical index and public providers before starting retrieval;
7. retrieve exact postings and bounded relation neighborhoods from selected packages only;
8. rank topical usefulness without changing source epistemic status or premise authority; a provider may declare the
   generic question families supported by a semantic record, allowing an explicit requested family to prioritize a
   matching relation neighborhood without making that record true or sufficient;
   when a question family supplies typed semantic focus, a source-specific event provider may consume only the focus
   typed as an event; ordinary content remains eligible only for an open question with no typed family focus, and an
   entity or relation cue does not become an event merely because that corpus has an exact one-token key;
9. preserve conflicts, distinct senses, provider identity, package version, and every search or truncation receipt; and
10. emit one immutable query-local context packet for downstream task planning and result construction.

The node never scans an entire large package, constructs ATOMIC's global fuzzy event index merely for context, opens a
network, invokes an agent, mutates a KB, or carries context into another request. Cache behavior remains DS021
equivalent to uncached retrieval.

### 5. Context packet and public extension

`packet:runtime:task-knowledge-context` and `eslm-task-knowledge-context-v1` contain:

- protocol, strategy identity, strategy-selection mode, and implementation state;
- question analysis, selected focus, prioritized self-questions, and completeness;
- exact selected and consulted KB versions;
- bounded provenance-bearing entries with their unchanged epistemic status;
- per-source search receipts, omitted work, resource use, and overall completeness;
- `answerSupported: false`, `premiseAuthority: none`, and `interpretationAuthority: none`; and
- an optional realization ledger stating whether any entry was cited in a contextual fallback.

Context availability is not package consultation for a strict answer. A package enters `consultedKbVersions` when its
context projection ran. It enters `usedKbVersions` only if one of its source claims is actually realized in an explicit
`PARTIAL` contextual artifact or used by an independently verified answer method.

### 6. Interaction with exact reasoning

An exact task frame, provider answer, reasoning method, and witness retain priority. When the ordinary route returns a
strict `SOLVED` answer, the context extension may accompany the machine result but cannot add claims to the visible
answer, values, proof, or provenance. The reasoner may consume a context entry as a premise only after the existing
evidence-admission gate validates its type, trust, scope, polarity, and provenance. Context rank alone never admits a
premise.

For a multi-obligation task, the request planner may use the question-family and focus plan to create retrieval
obligations. It may not use retrieved answer values to rewrite the user's instruction. Each subtask retains its own
completion and evidence boundary. DS025 remains the authority for general dependency-aware obligation planning and
verified synthesis beyond the currently implemented bounded path.

### 7. Explicit contextual fallback

When the precise route ends in `UNKNOWN`, `UNPARSED`, `MISSING_KNOWLEDGE`, `NO_APPLICABLE_METHOD`,
`UNDERDETERMINED`, or `UNSUPPORTED_OUTPUT`, the result constructor may create a separate
`knowledge-context-fallback` artifact if at least one directly topic-matched, provenance-bearing source claim can be
realized safely. The public status is `PARTIAL`, semantic `values` remain empty, and the answer must begin by saying
that the full request or precise answer was not established. It may then state a bounded set of relevant source claims
with citations and must end with the remaining gap or the fact that relevance does not prove the requested
conclusion.

Every realized contextual sentence is entered in top-level provenance as a source claim, not a deduction. Its package
enters `usedKbVersions` because the sentence is visibly present. Unselected context remains only in the context packet.
The realization ledger freezes the pre-context status in `originalStatus`. Any earlier language-normalization receipt
also refers to that pre-context status: attaching contextual source claims may change the public status to `PARTIAL`,
but it does not retroactively claim that normalization was attempted or that a symbolic reparse returned `PARTIAL`.
Result validation therefore compares a skipped normalization trigger or accepted reparse to `originalStatus` on this
route and to the public status on routes without contextual fallback.
When DS030 request planning has already produced a `PLANNED` frame, contextual fallback does not preempt that frame:
the context and ordinary grounding remain input to result construction, and only the owning construction path decides
whether to synthesize a grounded artifact or return its typed knowledge gap.
The route cannot run after likely-non-English rejection, `RESOURCE_LIMIT`, unresolved semantic ambiguity, or an
inconsistent active context. It cannot turn a dictionary definition into legal permission, a common use into a safe
procedure, a location association into jurisdiction, or a defeasible event tuple into a certain outcome.

A match to only a strict constituent of an unknown compound entity remains internal context and cannot be realized as
a source claim about that compound entity. An admitted record about `Penguin`, for example, does not authorize a
contextual answer about the unknown entity surface `fake Penguin`; only a separately admitted full-surface identity
could cross that boundary.
Likewise, a parser rejection carrying `invalidNominal` is a safety boundary: related records may remain in the internal
context packet, but none may be realized into a contextual answer for that rejected surface.

This route is distinct from ordinary failure grounding. Ordinary `eslm-grounding-bundle-v1` remains non-answer
evidence. The contextual route crosses the existing claim-admission and result-schema boundaries and therefore exposes
the exact source claims that it realizes. Fluency, relevance, and facet coverage remain non-proof.

### 8. Bounds, failure, and work profiles

The request stays within the DS030 64 KiB bound. The initial node admits at most 16 question surfaces, eight topics, 64
self-questions, 32 focus terms, 32 returned entries, 64 source receipts, and the existing maximum grounding output
bytes. The selected work profile supplies the stricter effective term, entry, lookup, value, source, candidate, and
byte limits. `quick`, `balanced`, `deep`, and `exhaustive-bounded` change only finite breadth; they do not change
question-family meaning, source trust, answer authority, or fallback admission.

No focus term, provider, question, or entry disappears silently. Omitted work records `question-surface-budget`,
`topic-budget`, `self-question-budget`, `term-selection-budget`, `lookup-budget`, `source-budget`,
`candidate-entry-budget`, or `output-byte-budget`. Provider errors and incomplete cache or shard work make the context
incomplete. An empty complete search is distinct from an incomplete search that observed no record.

### 9. Genericity, security, and falsification

The implementation must pass the generic-core rename test. Tests replace topics, relation labels, entities, values,
provider order, and irrelevant distractors while preserving the typed question family. Required controls include:

- article-bearing and articleless definitions, plural surfaces, polite envelopes, and embedded questions;
- purpose, capability, location, property, material, part, cause, prerequisite, restriction, comparison, provenance,
  and open-question families;
- meaning-changing neighbors such as arithmetic, finite progressive clauses, property-of questions, negation, and
  protected coordination;
- exact provider-order invariance and bounded eager/lazy equivalence;
- complete absence, incomplete search, conflict, ambiguity, provider failure, and resource exhaustion;
- strict answers that remain unchanged even when context contains distracting records;
- contextual fallback whose realized claims exactly match provenance and `usedKbVersions`; and
- a forbidden-dispatch audit over benchmark names, case IDs, source rows, hashes, expected answers, and example terms.

A change fails if it improves visible helpfulness by converting relevance into proof, if common terms dominate exact
topic phrases, if a context record changes language interpretation, if a strict answer gains unsupported prose, if an
unselected KB is consulted, or if the same source facts produce different context under provider registration order.

### 10. Implementation boundary

The initial implementation extends the generic factoid frontend with provider-independent families and canonical
paraphrases, recognizes bounded coordinated subjects plus progressive and do-support subjects for natural location
requests, constructs context before
ordinary local symbolic execution, reuses exact grounding projections and
their finite budgets, exposes the context result extension, and realizes a small source-bound contextual fallback.
It does not implement unrestricted English, legal or medical advice, arbitrary procedural synthesis, general
cross-document explanation, hidden-world disambiguation, or the complete DS025 obligation graph.

New phrasings of an existing family extend the analyzer and structural tests. A genuinely different responsibility
with a new state, authority, effect, or packet boundary requires another contiguous DS. A different way to prioritize
or retrieve the same context is a strategy under this node, not a decorative new node.

## Decisions & Questions

### Question #1: Why is this a separate node rather than ordinary failure grounding?

Response: Failure grounding runs after an inability and only exports related non-answer evidence. Task context is
constructed for every eligible request before ordinary local execution, represents explicit and internal information
needs, can inform bounded downstream planning, and has its own completeness and realization ledger. It still reuses
the same retrieval owners and never bypasses evidence admission or witness verification.

### Question #2: Does the maximum taxonomy claim to enumerate every natural question?

Response: No. It enumerates the broad reusable information functions needed by the current symbolic product. Surface
language is open-ended. Unsupported interrogatives remain open questions with source spans and focus, allowing useful
retrieval and future strategy work without falsely claiming complete English understanding.

### Question #3: Why may related context appear in a `PARTIAL` answer now?

Response: The new route is an explicit provenance-bound construction artifact, not a silent promotion of ordinary
grounding. It states the exact inability, realizes only admitted source claims, cites them, keeps values empty, and
labels the missing bridge. This is useful without claiming that relevance answered the original question.

### Question #4: May KB evidence select the meaning of an ambiguous sentence?

Response: No. Language interpretation remains answer-blind. Context can be retained for each already identified
alternative or used after clarification, but KB success cannot create or delete a semantic interpretation.

### Question #5: Why is the default context strategy mandatory?

Response: Every task needs a minimum reproducible focus, provenance, conflict, and coverage baseline. Optional future
strategies can improve prioritization or recall, but an exact allowlist cannot remove the safety baseline and leave a
fluent constructor with unreceipted evidence.

### Question #6: Why can a skipped normalization status differ from the final public status?

Response: The normalization receipt describes the earlier language-interpretation decision. A locally parsed request
can end as `UNKNOWN`, require no external proposal, and then receive a source-claim-only contextual artifact whose
public status is `PARTIAL`. `realization.originalStatus` joins those two phases without rewriting history or claiming
that context proved an answer.

### Question #7: Why must the context analyzer remove the location verb from the subject?

Response: Treating `living` as part of `his cat living` creates a nonexistent topic and wastes the bounded retrieval
frontier. The finite surface rule recognizes only the explicit location frames and preserves the complete possessive
nominal as the subject. It improves focus without resolving ownership, asserting a location, or acquiring language or
answer authority.

### Question #8: Why may an exact event-corpus key still be ineligible context?

Response: Exact spelling proves only key identity inside that source, not that an entity question denotes an event.
The question analyzer therefore supplies typed focus roles, and the source adapter declines entity and relation-cue
focus for its event neighborhood unless the family identifies an event subject. This prevents a high lexical score from turning a coincidental one-word event into a plausible
location claim while preserving event retrieval for causal, motive, effect, continuation, and lifecycle questions.

## Conclusion

Query-local epistemic context gives ESLM a consistent way to connect ordinary wording with the knowledge it already
has. A broad question taxonomy and mandatory bounded self-question strategy make definitions, uses, locations,
requirements, causes, effects, restrictions, risks, evidence, and related facets available to every eligible task.
Strict answers still require exact methods and witnesses; incomplete tasks can expose useful cited source claims only
through an explicitly partial route. The system therefore becomes more connected and natural without confusing
context, relevance, source claims, and proof.
