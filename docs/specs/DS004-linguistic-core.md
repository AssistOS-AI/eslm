---
id: DS004
title: Linguistic Core and Tolerant Compilation
status: in-progress
owner: language
summary: Specifies layered language competence from normalization through constructions, semantics, discourse, grammar preference, and deterministic realization.
---

# DS004 Linguistic Core and Tolerant Compilation

## Core Content

### Layered competence

Language handling is divided into orthography, lexicon and morphology, syntax and constructions, semantic frames, discourse, world-state binding, and realization. A release reports failures by layer. This prevents exact entity lookup from being presented as sentence understanding and prevents grammatical output from masking an unsupported inference.

The stable core supplies algorithms that transfer between corpora. The generated model supplies corpus-conditioned vocabulary, aliases, spelling variants, morphology exceptions, construction instances, semantic bindings, response templates, and narrative schemas.

### Normalization

Input is normalized with Unicode NFKC, locale-stable lowercasing, punctuation tokenization, and explicit apostrophe handling. Original text is retained. Every correction records original token, replacement, and method so tolerant parsing remains auditable.

Declared variants have priority. Bounded edit distance is then allowed only against a controlled vocabulary containing question words, relation language, and model aliases. Short tokens are not guessed aggressively. Thresholds grow conservatively with token length. Correction must never silently merge two known entity aliases; ambiguous corrections yield candidate analyses.

Capitalized surface tokens are not rewritten by the general vocabulary corrector. This prevents a name such as `Jhon` from being shortened to a common fragment merely because that fragment occurs in the model vocabulary. After session facts have introduced entities, question resolution may compare a missing proper name with active entity aliases using bounded Damerau distance. The repair is accepted only for one closest candidate; tied candidates remain ambiguous. The original and normalized forms remain in the trace.

Spell tolerance is not unrestricted fuzzy retrieval. It repairs likely surface errors before semantic compilation. Benchmarks vary edit position, distance, entity proximity, and adversarial near-names to measure both recovery and false correction.

### Lexicon and morphology

Lexical entries distinguish surface form, canonical lemma, part or semantic kind, language, inflection features, and accepted-error status. Entity aliases are not ordinary synonyms: they bind to identity and therefore require uniqueness or explicit ambiguity.

English is the only supported language. The parser, lexicon, spelling tolerance, construction inventory, grammar evaluation, and realization rules must be evaluated as one coherent English-language contract. Input in another language must not be presented as partially supported merely because isolated tokens happen to match. Future English morphology adds number, person, tense, aspect, and agreement as explicit feature unification rather than a proliferating template list.

### Constructions and approximate syntax

The parser recognizes typed constructions such as `where is ENTITY`, `who owns ENTITY`, `what color is ENTITY`, `what is ENTITY afraid of`, `what is north of ENTITY`, `is ENTITY in ENTITY`, `is ENTITY a CLASS`, `can ENTITY VERB`, `is ENTITY going to die`, `is ENTITY likely to VERB`, and `what could explain why ENTITY is PROPERTY`. A construction compiles into a query contract containing intent, predicate, known arguments, requested slot, evidence scope, answer type, language, and uncertainty policy.

Implemented conversational constructions also include `who is ENTITY`, bounded system identity questions, user identity questions, and requests for the system's supported capabilities. `Who is ENTITY?` queries known class membership. When the construction matches but the entity is absent, the result is `UNKNOWN`; it is not mislabeled as an unsupported syntax. ESLM answers what it is, does not guess who the user is, and describes only capabilities backed by executable paths.

Construction matching may be approximate in surface order but strict in semantic slots. Required function words, negation, quantifiers, temporal modifiers, and relation direction cannot be discarded as noise. If two parses remain plausible, the system returns `AMBIGUOUS` or requests clarification rather than selecting solely by string similarity.

Generated construction inventories should factor recurring frames. One pattern per training sentence is overfitting. Counterfactual entity substitution, paraphrase, irrelevant-adverb insertion, and word-order negatives test whether a pattern encodes grammar rather than memorized strings.

### Semantic compilation

The semantic frame distinguishes subject, object/value, predicate, polarity, modality, time, scope, requested answer position, and permitted reasoning mode. `Who owns X?` and `What does X own?` address the same predicate with opposite open slots. Relation direction is part of semantics: `north_of(a,b)` is not interchangeable with `north_of(b,a)`. A factual capability query and a likelihood query are different contracts even when both mention the same entity and verb.

Negation and absence are separate. Failure to find `located_in(mira,garden)` is `UNKNOWN`, not proof of its negation. Closed-world predicates may be declared only by model metadata and require benchmark-specific justification.

### Discourse

Conversation state contains bounded, explicit referents rather than hidden chat memory. V0.1 keeps the last resolved entity for simple pronouns. A complete discourse model must track salience, grammatical features, topic, competing candidates, corrections, ellipsis, and episode revisions.

User corrections replace or refine a query contract; they are not automatically promoted knowledge. The v0.1 chat interface accepts classification (`X is a Y`), location (`X is in Y` or `X is at Y`), ownership (`X owns Y`), capability (`X can VERB`), and bAbI-style universal fear rules (`CLASS are afraid of CLASS`) into an explicit temporary overlay. The overlay creates session-scoped entities, facts, and rules with `session:*` provenance, is returned in conversation context, and disappears when the session ends. It never mutates `training/model/` or a selected KB.

### Grammar preference

The current `grammarScore` is a diagnostic preference function based on nonempty structure, interrogative cues, auxiliaries, repetition penalties, known vocabulary, and correction cost. It supports smoke minimal-pair adapters but is not normalized probability and is inadequate as a full BLiMP model.

A serious grammar track must implement construction coverage for each tested phenomenon and report per-phenomenon results. It must distinguish a correct preference caused by the relevant dependency from one caused by vocabulary or length artifacts. Where ESLM cannot assign comparable sentence scores, the adapter marks the case unsupported rather than forcing a number.

### Realization

Realization consumes a verified semantic answer and language features. It selects an answer schema, resolves entity display names, orders lists deterministically, inflects supported forms, and emits punctuation. Provenance remains outside the fluent answer but is available in structured output and `/trace`.

Realizers must never insert unsupported factual content to sound natural. Unknown evidence produces an epistemically accurate sentence. Derived explanations name the rule and support ids. Future generation separates content planning, referring-expression choice, clause planning, morphology, and surface punctuation.

Unknown and unsupported responses are written for interactive users as well as evaluators. `UNKNOWN` says that the question was understood but evidence is missing. `UNSUPPORTED` says that the construction cannot yet be executed and points to `/examples`. Structured status, diagnostics, normalization, and provenance remain available even when the visible answer is friendlier.

## Decisions & Questions

### Q1. Should the core “guess the most probable question”?

Response: It should rank bounded supported analyses using correction, construction, entity, and semantic evidence. It must abstain when the margin is insufficient; tolerance cannot become arbitrary intent invention.

### Q2. Why is the language contract English-only?

Response: A language requires coherent corpus evidence, constructions, morphology, ambiguity controls, benchmarks, and realization. A few translated templates would create a misleading capability claim and make failures harder to attribute.

### Q3. When does a construction move from generated model to core?

Response: Only when it recurs across independent corpora and its algorithmic behavior is demonstrably domain-independent. The move requires cross-corpus tests.

### Q4. Does the generated construction list implement parsing by itself?

Response: No. In v0.1 the stable parser implements the executable construction algorithms, while generated lists disclose corpus-conditioned coverage and morphology. This duplication is an acknowledged intermediate architecture. A future typed construction interpreter must make generated slot bindings executable before the core can stop carrying those patterns.

### Q5. Why is an unknown entity different from an unsupported question?

Response: `Who is Jhon?` matches an executable entity-description contract even when no active entity is named Jhon, so the correct outcome is `UNKNOWN`. A poem request has no executable contract and is `UNSUPPORTED`. Keeping the distinction makes coverage and abstention metrics meaningful.
