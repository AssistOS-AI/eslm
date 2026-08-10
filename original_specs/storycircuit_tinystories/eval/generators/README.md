# Controlled evaluation generators

The generator creates deterministic, parameterized cases rather than a fixed collection of manually favorable examples. Its outputs are intended for capability curves and failure localization, not as substitutes for external benchmarks.

```bash
python scripts/generate_eval_suite.py \
  --output-dir eval/generated \
  --seed 20260810 \
  --count 200
```

Each family receives a distinct derived seed. The manifest freezes seed, generator version, file names, and item counts. Test files should be regenerated only after versioning the suite; modifying them during circuit development invalidates protected evaluation.

## Controlled dimensions

- chain depth;
- number of entities;
- number of distractors;
- state reversals;
- lexical novelty;
- grammatical phenomenon;
- narrative coherence relation;
- required and forbidden generation constraints;
- proof and trace requirements.

The default output contains 1,600 items across eight families. Larger runs should vary one parameter at a time for interpretable scaling curves.
