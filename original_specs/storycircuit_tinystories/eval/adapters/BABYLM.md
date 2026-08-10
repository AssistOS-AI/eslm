# BabyLM adapter

Current official pipeline: `https://github.com/babylm-org/babylm-eval`

The BabyLM 2026 repository separates strict and multilingual evaluation and includes zero-shot tasks such as BLiMP, BLiMP Supplement, EWoK, Entity Tracking, COMPS and GlobalPIQA in the strict track. StoryCircuit should not fork or copy this pipeline. Instead, expose the logits and tokenizer hooks expected by the official runner or export predictions in its documented format.

## Integration options

1. **Native wrapper:** implement the runner backend around `score_text` and `score_continuations`.
2. **Probability service:** expose an HTTP or local-process adapter that returns sentence or word log probabilities.
3. **Export mode:** precompute requested surprisals for static tasks and pass them to a thin backend.

Fine-tuning tasks are not directly meaningful for a fixed symbolic system unless a supervised adaptation protocol is defined. Report zero-shot results first. Any task omitted because the interface is unsupported remains `unsupported`; do not silently map it to zero outside official leaderboard submissions.
