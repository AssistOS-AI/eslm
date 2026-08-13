---
id: DS003
title: Symbolic Language Front-End and Controlled Natural Language
status: in-progress
owner: language
summary: Specifies the English-only local language gate, direct symbolic parsing, Semantic IR, controlled-language growth, ambiguity, diagnostics, and boundaries with deterministic recovery and operator-side external language proposals.
---

# DS003 Symbolic Language Front-End and Controlled Natural Language

## Introduction

The local language front-end accepts a growing, explicitly tested fragment of English while refusing interpretations
that lose protected meaning. It does not translate and it does not claim cross-language understanding. This
specification owns the bounded English-likelihood ingress diagnostic, direct parsing, semantic composition, ambiguity,
and parser diagnostics. DS022 owns deterministic English approximation, request-intent planning, confidence voting,
query focus, and work profiles. DS013 exclusively owns the operator-side external Language Agent proposal
strategy, proposal protocol, preservation validation, cache, and assisted CLI profile.

## Core Content

### 1. Direct-symbolic-first policy

Every input first passes a bounded, deterministic English-likelihood assessment. The assessment returns
`likely-english`, `likely-non-english`, or `indeterminate` with finite work accounting and inspectable signals. It is a
diagnostic gate rather than a translator, language identifier, or semantic classifier. `likely-non-english` fails the
local language path closed; `likely-english` and `indeterminate` may proceed to the symbolic English front-end, where
the front-end must determine whether it can construct
a semantically complete and safe representation, not merely whether it can produce a syntactic tree. The default
operator path then evaluates explicit request force independently of the direct result; an accepted plan restores the
incoming session snapshot so an imperative cannot commit its source material as assertions. When no plan applies,
DS022 may generate, vote on, and reparse bounded controlled-English candidates for direct `UNPARSED` or `UNKNOWN`. It
may also compare a structurally licensed candidate with direct `SOLVED` or `PARTIAL`, but only a different accepted
Semantic IR can supersede that direct interpretation. Equal IR preserves the direct route, and a normal knowledge gap
remains unchanged without an accepted structural alternative. KB or answer evidence may not influence candidate
selection.

Language Agent is not part of the deployable runtime. Logically it is one untrusted proposal strategy at the
language-interpretation node, not a second reasoner. The general CLI composes it by default and exposes an explicit
local override. When the gate reports likely non-English, the assisted profile may propose a translation before
English-only repair is attempted.
When English or indeterminate input exhausts direct and deterministic local recovery, it may propose a conservative
English simplification. It receives no KB evidence, proof state, answer, or result authority, and every candidate must
return through the unchanged non-voting English parser and semantic gate.

The accepted language is an extensible Controlled Natural Language. It begins with the linguistic forms required by reasoning benchmarks and grows through rigorously tested generic additions. The CNL is an interface contract between text and executable semantics, not a benchmark-specific collection of templates.

### 2. Recommended parsing technique

The target architecture for language forms beyond the implemented bounded frontend remains an explicit design choice in
Question #1. No choice may weaken the shared acceptance contract: the frontend must preserve alternatives where the
grammar permits them, compose complete Semantic IR, expose exact coverage failures, enforce agreement, valency, role,
and scope constraints, and reject partial interpretations that lose protected meaning.

An Earley-style chart parser combined with feature or unification grammar and compositional semantic actions is the
leading general architecture because a chart can reuse partial analyses and support recursive constructions. A
source-declared deterministic grammar adapter can remain appropriate for a documented controlled sublanguage when it
produces the same generic Semantic IR and does not claim unrestricted English coverage.

Each lexical entry contributes a syntactic category and a semantic frame. Grammar productions combine these frames into Semantic IR. A placement verb may expose agent, theme and destination roles. A temporal connective contributes an ordering relation. A universal determiner contributes a scoped quantifier.

The parser must separate interpretation from inference. From “Every dog is an animal. Rex is a dog.” it constructs a universal implication and a class assertion. It does not construct `animal(Rex)`. That conclusion belongs to the reasoner.

### 3. Front-end phases

The first phase assesses English likelihood, identifies sentence boundaries, protected English operators, morphology,
and lexical candidates. The assessment may reject likely non-English text but cannot translate it or infer its
meaning. Unknown nouns, names, and nonce predicates remain valid symbolic atoms when their grammatical roles are clear,
so unfamiliar vocabulary alone is never sufficient evidence of another language.

The second phase builds syntactic alternatives with features. The third phase composes semantic structures for every constituent. The fourth phase resolves references when the evidence is structural and preserves candidate alternatives when it is not. The fifth phase runs a CNL acceptance gate.

The acceptance gate verifies complete syntactic coverage, complete semantic coverage, preservation of logical operators, safe scope, reference status and compatibility with the Semantic IR schema. A parse may be accepted with unresolved lexical meaning if the symbol remains usable. It may not be accepted when negation, quantification, modality or relation direction has been dropped.

Entity-subject and class positions accept only one bounded nominal surface. The parser may remove one explicitly
licensed leading article (`a`, `an`, or `the`) before comparison. Every remaining alias token must then match the
complete declared multiword alias; a known alias at the suffix of a longer phrase is not a reference resolution.
Nominal surfaces containing coordination, negation, quantifiers, temporal or causal connectives, conditionals, or
finite-clause cues are not encoded as opaque entity or class identifiers. They remain unsupported until a grammar
production represents their operator and scope. This gate applies symmetrically to assertions and questions.

### Present implementation boundary

The current direct frontend is a bounded deterministic collection of token, sentence, pattern, morphology, discourse,
and task-frame compilers. It handles the documented controlled forms and several explicit task projections. This
implemented kernel provides exact semantics for its accepted constructions while the chart/feature architecture and
the full Section 4 Semantic IR inventory remain staged acceptance targets. DS022 extends the operator path around this
kernel with bounded local recovery and grounded symbolic request construction. Common explicit summary, explanation,
comparison, outline, essay, report, article, document, table, list, and paragraph requests can therefore produce a
cited, coherently shaped `PARTIAL` artifact. A non-voting gate admits provenance-bound claims; a rhetorical plan orders
them; four typed sentence strategies and seven discourse or format strategies realize the document; and the result
contract reproduces it exactly from the plan and admitted evidence. Nested scope, general claim derivation,
unrestricted prose generation, audience adaptation, and unsupported causal explanation remain outside this slice.

The implemented ingress function `assessEnglishLikelihood(text, options?)` returns the closed
`eslm-english-likelihood-v1` receipt with classification `likely-english`, `likely-non-english`, or `indeterminate`,
bounded confidence and threshold, inspectable signals, token count, completeness, work, and diagnostic. It inspects at
most 64 KiB of UTF-8 and 1,024 tokens; its prefix bound follows encoded bytes rather than slicing code units. The
confidence is the leading directional evidence share multiplied by a bounded evidence-mass factor. Only reviewed
English function words, operators, and sentence frames contribute positive direction. ASCII letters, nonce words,
technical identifiers, and formulas establish compatibility only; they cannot authorize English regardless of input
length. Generic suffix morphology adds mass only after a directional English cue exists. The mass factor reaches one
only after 0.5 weighted evidence units, so a short or repeated Latin token cannot appear almost classified merely
because it has no competing signal. The same score is compared with the threshold: either classified outcome
meets it, while `indeterminate` remains strictly below it. Incomplete inspection has zero routing confidence. The
receipt validator recomputes classification and confidence from the declared signals. The value is
interpretation-routing evidence, not semantic or answer confidence. The
`EnglishLanguageGateRuntime` attaches that receipt to continuing English or indeterminate results. A likely-non-English
classification returns `UNPARSED` on route `english-language-gate-rejected`, preserves the incoming session, consults
no KB, and exposes only the gap `translate-input-to-english / likely-non-english`.

The implemented direct CNL also accepts the generic range-restricted pair `Every CLASS VERBs OBJECT` and `Does ENTITY
VERB OBJECT?`. Nouns and predicates may be nonce symbols: this is reusable language structure, not a dictionary of the
motivating example.

The distinction is deliberate and observable. A direct accepted CNL question, a recognized factoid routed to public
providers, and a source/host structured task use different route metadata. Solver success on the latter two does not
increase raw-language coverage. A future chart parser must preserve current accepted semantics and statuses rather
than relabeling every existing adapter as generic language.

Session compilation is transactional. Any episode whose final status is `UNPARSED` discards its tentative entities,
facts, rules, and history events, including the case where earlier assertions parsed but the final question or request
was unsupported. A later request cannot observe a fact learned by a rejected partial interpretation. Input bytes,
segment count and size, and accumulated session entities, facts, rules,
and history are bounded before inference. Crossing one of those gates returns `RESOURCE_LIMIT` with the exhausted field
and leaves the caller's prior context unchanged.

### 4. Semantic IR obligations

The front-end must be able to represent entities, classes, properties, binary relations, n-ary events, semantic roles, quantifiers, negation, conjunction, disjunction, implication, equality, inequality, temporal order, spatial relations, modality, defaults, confidence, reference alternatives and question goals.

The IR must preserve scope. “Not every student passed” cannot be collapsed into “Every student did not pass.” It must preserve event identity so that temporal and causal relations can connect events rather than only surface clauses.

The IR must preserve uncertainty. “John may have left” is not the same as “John left.” A source claim marked likely or normally must remain distinct from a strict assertion.

### 5. Ambiguity

The parser must be allowed to produce several semantic candidates. The reasoner may evaluate all candidates. If every candidate entails the same answer, the answer may be returned with an ambiguity note. If candidates lead to different answers and no deterministic disambiguation exists, the runtime must return an ambiguous status rather than guessing.

Coreference is treated similarly. The reference resolver maintains candidates using type, number, grammatical role, recency, discourse prominence and semantic compatibility. World knowledge may prune candidates, but the resolution and its evidence must remain visible in the trace.

### 6. CNL evolution

CNL evolution is driven by benchmark and ingestion failures. The coding agent must classify a failure as morphology, lexical frame, grammar, semantic composition, scope, reference or unsupported discourse. Generic constructions are added to `src`; lexical and domain-specific interpretations are added to KBs.

A new grammar form is accepted only after focused examples, metamorphic equivalents, contrastive examples and all relevant regressions pass. The direct symbolic rate must be recomputed. A grammar extension that increases coverage but silently changes existing semantics is a regression.

### 7. Alternative techniques

| Technique | Recommended role |
|---|---|
| CFG with semantic actions | Suitable for an initial narrow implementation, but likely to require feature extensions. |
| DCG-style grammar | Strong conceptual model for declarative grammar and semantic composition, even outside Prolog. |
| CCG | Potential later extension for richer compositional English; not the recommended starting point. |
| PEG | Useful for deterministic sublanguages and record formats, but not ideal for preserving natural-language ambiguity. |
| Dependency parsing | Optional hybrid experiment; a learned parser changes the claim about symbolic language understanding. |
| Finite-state or regex patterns | Appropriate for morphology, lexical preprocessing and fast paths, not as the principal semantic architecture. |

### 8. Required diagnostics

For every failed or partially accepted input, the front-end must expose the longest covered spans, unmatched tokens, candidate lexical categories, failed feature constraints, missing semantic actions, unresolved operators and reference status. These diagnostics are the training signal for the coding agent.

The front-end must report whether an input was rejected by the English-only gate, directly parsed, handled by an
explicit symbolic task adapter, accepted through deterministic local approximation, left ambiguous among local
interpretations, understood as an artifact request without supported source material, handled by grounded symbolic
request synthesis, accepted after a Language Agent simplification or independently verified translation proposal, rejected by
host proposal validation, failed in the external process, or left unparsed. Route names include
`english-language-gate-rejected`, `direct-symbolic`, `direct-symbolic-task-adapter`,
`heuristic-cnl-approximated`, `heuristic-cnl-ambiguous`, `heuristic-request-planned`,
`heuristic-request-synthesis`, `language-agent-normalized`, `language-agent-normalization-rejected`, and
`language-agent-normalization-failed`. The language-gate receipt exposes the bounded assessment and never a purported
translation. Approximation receipts record candidate confidence, votes, transformations, and reparse outcomes.
Request-planning receipts record intent votes, topics, output contract, and subrequests. External proposal receipts
separately record requested and declared translation or simplification. The route is part of every runtime and
benchmark result.

### 9. Capability curriculum and benchmark evidence

The controlled language grows by semantic construction rather than benchmark template. Its capability sequence begins with atomic class, property, relation, event, and direct-question forms; adds universal and existential quantification, explicit negation, conjunction, disjunction, implication, equality, inequality, and open-world questions; adds event roles, possession, reference candidates, temporal order, spatial relations, and state change; then adds cardinality, exclusivity, ordinals, assignments, defaults, exceptions, causality, modality, and richer discourse.

Benchmarks expose constructions that are absent or semantically unsafe, but DS017 adapters and DS010 reports own benchmark identity, split use, and measurement. A parser repair is accepted only when the construction is stated independently of the source, survives nonce and full-renaming tests, preserves meaning-changing contrasts, and does not alter existing accepted Semantic IR. The direct-language measurement remains separate from logical-form or structured-adapter execution.

### 10. Boundary with external normalization

The direct frontend preserves original text and records Unicode normalization, punctuation handling, declared lexical variants, and conservative spelling repair. Declared variants take priority over edit distance; short tokens are not guessed aggressively; tied repairs remain ambiguous. Unknown names, nouns, and nonce predicates remain usable symbolic atoms when their syntactic and semantic roles are clear.

Direct semantic entity lookup is exact over the complete bounded nominal surface after at most one licensed leading
article is removed. Any spelling proposal belongs to an earlier visible normalization or DS022 approximation step;
entity lookup itself cannot recover a known alias by suffix, discard an unlicensed modifier, or absorb a protected
operator. Declared multiword aliases remain valid because exactness concerns the whole normalized phrase rather than
the number of words.

After the direct attempt, DS022 first evaluates bounded explicit request force. An accepted plan is query-local and
discards tentative direct episode changes. Otherwise direct `UNPARSED` or `UNKNOWN` may enter the local heuristic CNL
ensemble. Direct `SOLVED` and `PARTIAL` can also be inspected when a visible structural proposal compiles to Semantic
IR different from the original direct IR; an identical interpretation keeps the direct result. Candidate selection
uses parse-only Semantic IR rather than downstream answer success. A changed local interpretation is
non-authoritative: a strict proof through that interpretation is exposed as `DEFEASIBLE`, and statements extracted
only from the candidate remain query-local rather than entering the returned session. This incoming-session snapshot
rule applies to every eligible direct status, not only to direct `SOLVED` or `PARTIAL`. An `UNKNOWN` with no accepted
structural alternative remains the direct knowledge gap.

Likely non-English input is rejected before English-only approximation. In the general CLI's disclosed assisted
profile, that rejection may route to the DS013 translation-proposal strategy instead of being treated as misspelled English.
For likely-English or indeterminate input, the direct and DS022 local paths retain priority; only terminal
`UNPARSED` may request an external English simplification. DS013 defines proposal authority, protected anchors, retry
feedback, subprocess isolation, cache, route accounting, assisted disclosure, and local override. The parser and local layer contribute
only bounded language-form diagnostics. They never request an answer or expose reasoning state, selected KB records,
failure grounding, or desired values. A translated target that parses is still not accepted when open-class
source-to-target equivalence lacks an independent reviewed language profile; model-declared alignments cannot validate
the model's own translation.

### Implemented factoid and narrative projections

The factoid frontend recognizes a bounded set of ordinary English question constructions before falling back to an
open-relation frame. Supported frames record the WH type, construction class, relation surface, direction when known,
subject surface when recoverable, and a deterministic list of conservative paraphrases that existing providers may
already understand. Examples include country and place questions, passive “used for” questions, and event-continuation
questions. A syntactically recognized factoid with no provider evidence is not reported as `UNPARSED`; it returns an
explicit knowledge gap containing the factoid frame and the providers considered.

This projection does not guess a predicate from an answer and does not make arbitrary English equivalent to a supported
provider query. Provider results are normalized and compared as semantic value sets. Agreement merges provenance;
disagreement returns ambiguity; no response returns an explicit `UNKNOWN` knowledge gap. The original question, generated provider
candidate, provider identity, and route remain observable.

After an `UNPARSED` or recognized-but-unanswered question, DS009 may attach a related-evidence grounding bundle. DS022
selects topical phrases, nouns, and predicates from the original request and excludes grammatical scaffolding such as
articles, quantifiers, auxiliaries, copulas, conjunctions, and style words while content terms exist. The bundle does
not make the input parsed, does not become Semantic IR, and is not included in Language Agent feedback. For ordinary
inability it cannot change the primary status, answer provenance, or answer-contributing KB versions.

An explicit DS022 document-style request is a separate operation rather than failure-answer substitution. Its grounded
symbolic synthesis method selects bounded user-supplied sentences and candidate KB records, then subjects every
candidate to non-voting claim admission. A rhetorical plan and the registered sentence and assembly strategies can
create new English wording, citations, sections, prose, outlines, or tables only from admitted material. The result
contract must reproduce every claim, citation, paragraph, section, strategy trace, and final byte sequence from the
closed plan and admitted evidence. It returns `PARTIAL` because bounded evidence and output work do not establish
complete coverage, not because the runtime merely copies a bag of sentences. Only records supporting realized claims
become answer provenance and `usedKbVersions`; rejected or unselected related records retain the non-answer boundary,
and neither relevance nor presentation confidence is described as a deductive proof.

Story continuation records use a separate explicit task adapter because a four-sentence context plus candidate endings
is already a machine-declared selection task. Each sentence is compiled into a bounded narrative event frame with
content terms, predicate candidates, named participants, pronoun groups, polarity, modality, and tense. Candidate
identifiers are derived from visible content and are not answer positions. The adapter may attach bounded semantic
evidence from loaded providers, then submits the label-free task to the generic continuation selector. This path does
not claim that the ordinary question parser understands arbitrary stories, and the host-only correct ending remains
outside the task.

### 11. Work-policy boundary

Language analysis and reparse work consume the immutable `eslm-work-policy-v1` snapshot defined by DS022. The
`quick`, `balanced`, `deep`, and `exhaustive-bounded` profiles change finite candidate, reparse, reasoning, provider,
and grounding budgets; they do not change grammar semantics, protected-operator identity, confidence tie-breaking, or
epistemic status. `balanced` is the default. CLI `--work-profile` and interactive `/work PROFILE` select the profile,
while `/work` displays its exact effective limits.

## Decisions & Questions

### Question #1: Which parser architecture should own broader controlled-language theory compilation?

Options:

1. Adopt an Earley-style chart parser with feature or unification grammar as the general frontend. This best preserves
   ambiguity and recursive structure, but requires complete semantic-action and diagnostic infrastructure.
2. Use source-declared deterministic grammar adapters for bounded controlled theories while retaining the current
   generic Semantic IR. This limits implementation cost but cannot by itself establish broader direct-English competence.
3. Use a staged combination: source-declared adapters for frozen sublanguages and an Earley/feature frontend for forms
   demonstrated across independent sources. This preserves an incremental path but requires explicit route and coverage
   separation so adapter success is never reported as generic-language success.

Selection requires operator- and scope-preservation alignments, ambiguity fixtures, nonce and paraphrase controls,
direct-versus-adapter coverage measurements, and evidence that accepted semantics do not change under the migration.
Until one option is selected, broader grammar work remains route-explicit and no source adapter is promoted into the
general parser merely because it improves a benchmark.

### Question #2: What happens when a recognized factoid has no provider evidence?

Response: The frontend has established the communicative operation and preserved its relation surface, direction, and
arguments. Failure after every loaded provider declines the frame is evidence about available knowledge or provider
coverage, not evidence that the question was linguistically uninterpretable. Keeping those statuses separate prevents
Language Agent normalization from being misused as factual retrieval. DS009 may additionally return bounded related
KB records, but they remain outside the answer and do not change `UNKNOWN` into `SOLVED`.

### Question #3: Why is Language Agent a strategy at the same logical node but a separate trust regime?

Response: All three routes propose an interpretation, so they belong to the language-interpretation node. Their
authority is not equal. Direct parsing is a non-voting acceptance gate, deterministic local strategies produce
inspectable candidates, and the external strategy produces an untrusted candidate outside the deployed closure. DS003
stays stable when a local voting policy or an adapter model, process protocol, cache, or proposal policy changes;
DS022 can evolve inspectable local recovery and DS013 can evolve the operator service without redefining
accepted Semantic IR.

### Question #4: Why is a successful heuristic interpretation not merged into the direct route?

Response: Direct acceptance establishes that the original text belongs to the supported CNL. Heuristic acceptance
establishes that a disclosed changed text belongs to that CNL and that its interpretation was the best bounded local
hypothesis. Keeping `heuristic-cnl-approximated`, confidence, competing candidates, and query-local session effects
visible prevents better spelling recovery from being reported as stronger raw-language certainty than the evidence
supports.

### Question #5: Why does entity resolution require a complete alias match?

Response: A suffix match makes discarded prefixes semantically invisible. A qualifier, negation, quantifier, or
clause fragment can then resolve to a shorter known name and inherit facts that were never stated about the complete
subject. Removing only one licensed article and comparing the complete remaining surface preserves ordinary
multiword aliases while forcing every other token to receive explicit grammar and semantic treatment.

### Question #6: Why does English-routing confidence include evidence mass as well as direction?

Response: A directional share alone becomes one whenever the gate sees any positive signal and no negative signal.
Treating ASCII length or a broadly shared suffix as that signal would let repeated nonce text or another ASCII-written
language authorize English. The gate therefore separates compatibility from direction and requires a reviewed English
function, operator, or clause-frame cue before positive classification. Multiplying the leading directional share by
a bounded evidence-mass factor then keeps short, neutral, or conflicting surfaces visibly uncertain while allowing
several independent English cues to cross the declared threshold. The validator recomputes the score from the receipt
signals, and incomplete inspection remains confidence zero rather than a partial-language claim. This score controls
only routing; the parser still decides whether any meaning is accepted.

## Conclusion

The accepted CNL is an extensible English semantic interface rather than a list of benchmark templates. A bounded
English-likelihood gate protects that boundary without pretending to translate. Direct parsing remains the exact
semantic authority; deterministic approximation, request planning, and externally assisted proposals are
separately attributed routes. Every accepted interpretation returns through trusted symbolic execution, while
related evidence remains distinct from proof.
