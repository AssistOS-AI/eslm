# Language-Model Protocol

## Purpose

This protocol defines the minimum interface shared by ESLM and causal neural baselines.

## Python interface

```python
class LanguageModelAdapter(Protocol):
    def metadata(self) -> dict: ...
    def score_text(self, text: str) -> ScoreResult: ...
    def score_continuations(
        self, prefix: str, continuations: Sequence[str]
    ) -> list[ContinuationScore]: ...
    def generate(self, prompt: str, config: GenerationConfig) -> GenerationResult: ...
```

Optional:

```python
parse(text) -> StoryIR
answer(story, question) -> AnswerResult
simulate(story_ir) -> WorldTrace
explain(result_id) -> TraceSlice
```

## Score semantics

`score_text` returns the log probability of the exact UTF-8 string including spaces and punctuation under the adapter's declared protocol. If a neural tokenizer omits a beginning-of-sequence convention, that convention is fixed per suite. Scores include neither prompt-independent constants nor hidden length normalization.

```json
{
  "log_probability": -12.4,
  "units": 7,
  "bytes": 23,
  "nll_per_unit": 1.77,
  "bits_per_byte": 0.78,
  "exact": true,
  "coverage": 0.94,
  "diagnostics": {}
}
```

## Continuation semantics

Each candidate is scored as:

```text
log P(prefix + continuation) - log P(prefix)
```

The adapter must handle tokenizer boundary effects by scoring the joined text, not by independently tokenizing the continuation without context. Candidate ranking uses raw conditional log probability unless the suite specifies a length-normalized secondary metric.

## Generation semantics

`GenerationConfig` specifies seed, maximum new bytes/tokens/sentences, temperature, top-k/top-p where meaningful, stop strings, semantic constraints, and trace level. Unsupported decoding fields are reported, not ignored silently.

## Batching and determinism

Scoring is deterministic. Generation with the same model, seed, prompt, and configuration must be reproducible or marked `nondeterministic_backend=true`.

## Error values

Adapters return typed failures:

```text
unsupported
invalid_input
resource_limit
model_error
approximate_score
```

They do not substitute empty generations or arbitrary low scores.

## Tokenizer-independent comparison

Bits-per-byte is the primary tokenizer-independent likelihood metric. Continuation preference and minimal-pair accuracy are also directly comparable. Native perplexity is reported only with tokenizer identity.
