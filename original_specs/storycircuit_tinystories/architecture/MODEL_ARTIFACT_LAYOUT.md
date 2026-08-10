# Model Artifact Layout

```text
model/
  manifest.json
  lexicon.json
  morphology.json
  ngram.json
  constructions.jsonl
  reference_model.json
  event_rules.jsonl
  schemas.jsonl
  probability.json
  circuits/
    registry.json
    ...
  indexes/
  diagnostics/
```

Small artifacts may be a single JSON file. Large artifacts may shard JSONL records or use SQLite, provided the manifest describes format, schema, and checksums.

A complete model can be loaded without the training corpus. Provenance may refer to source IDs whose text is unavailable. The loader validates all declared hashes before inference unless `--unsafe-skip-integrity` is explicitly used; such runs are not publishable.
