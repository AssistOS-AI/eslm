# DS-011 — Normalized Language-Model Scoring

**Status:** Normative draft  
**Version:** 0.1  
**Depends on:** DS-003, DS-005, DS-006, DS-007, DS-008  
**Primary acceptance gate:** every finite byte string receives finite probability under a documented normalization scheme.

## Purpose

The symbolic system must be comparable with a causal language model rather than only with a parser or question-answering engine. It therefore exposes conditional probabilities over an external tokenization and supports sentence scoring, next-token ranking, continuation selection, perplexity, and bits-per-byte.

A collection of weighted rules is not automatically a language model. Scores produced by independent grammar, discourse, and world components cannot be multiplied or added arbitrarily and then called probabilities. The implementation must define a normalized conditional distribution at every generation step.

## External token protocol

Evaluation selects an **external tokenizer**. The default TinyStories protocol uses the tokenizer of the compared checkpoint. A tokenizer-independent protocol reports UTF-8 byte likelihood. The symbolic model may maintain its own internal words, morphemes, constructions, and semantic units, but it must bridge them to external tokens without silently dropping characters.

Required methods:

```python
score_text(text: str, *, external_tokenizer: Tokenizer | None) -> ScoreResult
next_token_distribution(prefix: str, candidates: list[str] | None) -> Distribution
score_continuations(prefix: str, continuations: list[str]) -> list[float]
```

`ScoreResult` contains total log probability, unit count, byte count, per-unit surprisal, parser coverage, escape probability, component contributions, and runtime diagnostics.

## Probability architecture

The reference architecture uses a normalized mixture of experts:

```text
P(x_i | x_<i) = sum_k gate_k(state_i) * P_k(x_i | state_i)
```

where every expert distribution is normalized and the non-negative gates sum to one. Initial experts are:

```text
byte_backoff
character_backoff
word_ngram
construction_completion
surface_realizer
entity_reference
narrative_plan
```

The byte expert has full support and a strictly positive floor. Higher-level experts redistribute probability but can never make a valid byte sequence impossible. A future log-linear model is allowed only if its partition function is computed exactly over the declared candidate set or approximated with a separately validated method.

## Incremental state

Scoring proceeds left-to-right. The parser maintains a beam of incremental analyses. Each beam item includes:

```text
surface_state
StoryIR_delta
world_state_version
discourse_memory
narrative_state
log_mass
provenance
```

The probability of the observed unit is the total probability mass assigned to compatible transitions, including an escape transition. Beam pruning must account for discarded mass. If exact accounting is unavailable, the run is marked `approximate_probability=true`, and the pruning policy is included in the result manifest.

## Unknown forms and open vocabulary

No fixed vocabulary limit is permitted. Unknown words are represented through:

1. byte or character spelling probability;
2. a lexical-class hypothesis inferred from orthography and context;
3. optional incremental creation of a lexeme record;
4. later consolidation if the form recurs.

A novel proper name should not force the entire sentence through a generic escape path. The construction grammar may accept an open `PROPER_NAME` slot while the lexical surface is scored by the spelling model.

## Same-token comparison

Perplexities are comparable only when computed over the same units. The evaluation harness therefore supports:

- external-token NLL with one tokenizer shared across all systems;
- UTF-8 bits per byte;
- continuation ranking, which avoids tokenizer-scale ambiguity;
- native-token perplexity as a diagnostic only.

For a symbolic model unable to enumerate an entire neural tokenizer vocabulary efficiently, `score_continuations` remains mandatory, while full-vocabulary next-token output may use candidate filtering plus an explicitly reported residual bucket.

## Training

Mixture weights and smoothing constants are fitted only on training and development data. At minimum the system implements deleted interpolation or held-out maximum likelihood. A coding agent may introduce a learned gate, but this changes the regime from S0 to S1 and must be separately reported.

## Numerical requirements

- all internal probability calculations use log space;
- normalization tests tolerate at most `1e-8` error for enumerated distributions;
- no `NaN`, positive infinity, or zero-probability valid byte string;
- deterministic results under a fixed model and configuration;
- log base is natural unless a metric explicitly requires bits.

## Required tests

```text
probability mass sums to one on finite candidate sets
all smoke strings receive finite score
prefix score equals sum of incremental log probabilities
higher-order experts can be disabled without breaking support
candidate continuation ordering is invariant to batching
serialized and reloaded models return identical scores
```

## Acceptance criteria

The implementation passes the normalization tests, produces finite validation bits-per-byte, reports exact versus approximate probability status, and can score both a TinyStories validation shard and all minimal-pair cases through the same public protocol.
