# DS-002 — Corpus Ingestion, Splitting, and Provenance

**Status:** Normative  
**Version:** 0.1  
**Depends on:** DS-001

## Goal

Create deterministic, resumable corpus artifacts from the official TinyStories resources without redistributing source data.

## Inputs

Supported variants:

```text
original_train
original_valid
v2_gpt4_train
v2_gpt4_valid
all_data_with_metadata
```

The downloader uses official Hugging Face URLs or `datasets` streaming. It records URL, repository revision where available, byte size, SHA-256, download time, and license metadata.

## Canonical story record

```json
{
  "story_id": "sha256:...",
  "source_variant": "v2_gpt4",
  "source_index": 123,
  "text": "...",
  "metadata": {},
  "text_sha256": "...",
  "split": "train",
  "normalization_version": "0.1"
}
```

Story IDs derive from normalized text plus source variant. Duplicate and near-duplicate groups are computed before splitting.

## Normalization

Normalization may standardize line endings and Unicode form but cannot silently repair grammar or spelling. Raw and normalized hashes are both stored. Sentence segmentation is a derived artifact, not part of the source record.

## Split policy

1. Group exact duplicates and high-similarity near duplicates.
2. Assign groups, not individual stories, to splits.
3. Freeze split manifest before circuit induction.
4. Reserve protected final test data inaccessible to agent workspaces.
5. Create compositional and lexical OOD splits through metadata and StoryIR features only after avoiding label leakage.

Default proportions for a research subset:

```text
train 80%
agent_development 8%
shadow_validation 4%
public_test 4%
protected_final 4%
```

Official validation data is retained as an additional external test and is never merged into training.

## Sharding

JSONL or Parquet shards contain 10k–100k stories. Every shard has a manifest with row count, min/max lengths, byte size, and checksum. Pipeline stages are keyed by input manifest hash and can resume independently.

## Data quality report

The preparation stage reports:

- story and token counts;
- length distributions;
- Unicode and encoding anomalies;
- duplicate groups;
- common prefixes and endings;
- dialogue frequency;
- vocabulary growth curves;
- likely truncations;
- metadata coverage.

## Security

Corpus text is data only. It is never evaluated as Python, shell, templates with executable expressions, or agent instructions. Agent prompts delimit corpus examples as untrusted quoted content.

## Acceptance criteria

- Re-running ingestion with the same source revision produces identical manifests.
- No duplicate group crosses protected split boundaries.
- Every downstream artifact includes the split-manifest hash.
- Source data remains outside the distributable project archive.
