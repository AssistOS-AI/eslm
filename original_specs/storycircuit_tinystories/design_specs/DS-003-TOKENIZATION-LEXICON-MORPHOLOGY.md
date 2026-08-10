# DS-003 — External Tokenization, Open Lexicon, and Morphology

**Status:** Draft normative  
**Version:** 0.1  
**Depends on:** DS-002

## Goal

Support unrestricted TinyStories vocabulary and make symbolic scoring comparable with causal LMs.

## Two token spaces

The system distinguishes:

1. **external tokens**, used by the shared LM protocol and selected from a baseline tokenizer;
2. **internal units**, including bytes, characters, morphemes, words, punctuation, and constructions.

The official checkpoint tokenizer is loaded for direct comparison. Bits per byte remains the tokenizer-independent metric.

## Lexical entry

```text
Lexeme {
  lemma
  surfaces[]
  frequency by split
  morphology
  syntactic_categories[]
  semantic_types[]
  argument_frames[]
  selectional_preferences[]
  construction_links[]
  provenance[]
  confidence
}
```

The lexicon is open and incremental. Low-frequency words are represented through morphology and byte/character backoff rather than mapped to one opaque token.

## Morphology

The initial analyzer uses transparent finite-state or rule-based hypotheses for English inflection:

```text
plural nouns
third-person singular verbs
past tense
progressive
comparative and superlative
possessive
contractions
```

Irregular forms are learned as lexical mappings. Morphological hypotheses are weighted and can remain ambiguous.

## Semantic typing

Types are induced from distributional construction slots and event frames. The base ontology includes agent, person, animal, object, food, toy, place, property, emotion, action, relation, quantity, and utterance content. Types can be multiple and hierarchical.

## Full-support backoff

At least one component must assign nonzero probability to every byte sequence. Unknown words receive probability through character composition. The model reports how much probability mass came from escape/backoff paths.

## External-token projection

For `next_token_distribution`, candidate external tokens are decoded as string continuations and evaluated incrementally by internal automata. A trie caches shared prefixes. Exact vocabulary enumeration is the reference implementation; optimized pruning is allowed only if missing mass is bounded or included in an explicit remainder bucket.

## Tests

- round-trip external tokenizer encode/decode;
- Unicode and punctuation cases;
- morphology property tests;
- unseen-name and nonce-word handling;
- probability normalization;
- finite score for arbitrary input.

## Acceptance criteria

- No configuration asserts a fixed 100-token vocabulary.
- Validation unknown-byte rate is zero.
- Unknown-word rate and backoff contribution are reported.
- Internal segmentation changes do not alter external gold text.
