# Data Card

## Bundled data

Only small synthetic smoke stories and generated evaluation programs are included. Their purpose is executable testing, not representative language modeling.

## External corpus

TinyStories must be downloaded from its official repository. The preparation pipeline streams text, performs exact-content deduplication, and assigns content-hash splits. It records source and output SHA-256 values.

The package intentionally excludes raw TinyStories stories. The included pilot retains only hashes, aggregate statistics, model artifacts, and predictions without input text.

## Split policy

Default development split names are:

```text
train
 dev
 agent_shadow
 test
```

The coding agent may use train and dev. Shadow evaluation is aggregate-only. Test is opened after model, metrics, seeds, and code are frozen.

## Known data risks

TinyStories is synthetic and contains recurrent templates, lexical patterns, and possible near duplicates. Exact deduplication does not prevent structural leakage. Publication runs require near-duplicate, prompt-template, and event-graph overlap analysis.

The synthetic controlled suite is generated from explicit programs. It measures compositional execution but does not approximate the full distribution of natural English. Results must be labeled by data origin.
