# Evaluation package

The evaluation layer is model-agnostic. Cases are JSONL records validated by `schemas/eval_case.schema.json`. A model is evaluated through scoring, continuation ranking, and generation; symbolic extensions are used only for diagnostics and explicit QA/state tasks.

`eval/samples/` contains small local fixtures. `eval/generated/` is produced by `scripts/generate_eval_suite.py` and is not hand-edited after the frozen seed manifest is created. `eval/adapters/` documents external benchmark conversion without redistributing third-party data.

The important distinction is between:

```text
LM metrics                exact normalized probabilities or continuation rankings
end-to-end capability     raw story/prompt to answer or output
component diagnostics     gold/predicted StoryIR, state simulation, proof coverage
```

A component diagnostic cannot be presented as end-to-end success.
