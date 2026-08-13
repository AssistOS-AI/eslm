# Everyday evaluation contract

## Case record

Each UTF-8 JSONL line is an object with these required fields:

```json
{
  "format": "eslm-basic-everyday-eval-case",
  "id": "everyday-0001",
  "source": {
    "collection": "llm_everyday_benchmark_ro_v1",
    "locator": "dataset.jsonl:1",
    "sourceId": "...",
    "sourceDigest": "sha256:..."
  },
  "pool": "source-development",
  "category": "factual",
  "difficulty": "short",
  "scoring": "exact",
  "prompt": "Which planet is known as the Red Planet?",
  "reference": {
    "answer": "Mars",
    "requiredConcepts": ["Mars"],
    "forbiddenClaims": []
  },
  "conversion": {
    "method": "manual-reviewed",
    "reviewed": true,
    "note": ""
  },
  "profiles": ["quick-assisted", "real-kb"]
}
```

Optional case fields are `tags`, `constraints`, `acceptableAnswers`, and `reviewNotes`. Use only data, never executable expressions or source-code paths.

`id` is evaluation identity only. Product code must never receive it or branch on it. `sourceDigest` is the digest of the exact original source record, not the full corpus.

Allowed pools are `source-development` and `structural-controls`. Allowed profiles are `quick-assisted`, `real-kb`, and `core-only`. The `format` value is a stable shape name, not an internal revision sequence.

## Result record

Each JSONL line has:

```json
{
  "format": "eslm-basic-everyday-eval-result",
  "caseId": "everyday-0001",
  "profile": "quick-assisted",
  "machine": {
    "status": "ANSWERED",
    "answer": "Mars",
    "route": "direct-symbolic",
    "method": "direct-retrieval"
  },
  "renderedAnswer": "Mars is known as the Red Planet.",
  "score": {
    "state": "pass",
    "deterministic": true,
    "dimensions": {
      "correctness": 1,
      "completeness": 1,
      "grounding": 1,
      "instructionFit": 1,
      "naturalness": 1
    },
    "explanation": "The supported fact is stated directly."
  },
  "diagnosis": {
    "earliestStage": null,
    "code": null,
    "summary": ""
  },
  "checkpoint": {
    "executableDigest": "sha256:...",
    "caseManifestDigest": "sha256:...",
    "kbDigests": ["sha256:..."]
  }
}
```

Allowed score states are `pass`, `fail`, and `review`. Allowed earliest stages are those listed in `SKILL.md`. A failed result must name an earliest stage and a concrete diagnosis code. A passing result must not name a failure stage.

## Scoring

### Exact cases

Normalize only representation details declared by the case: outer whitespace, Unicode normalization, and optionally case or harmless terminal punctuation. Do not normalize away different numbers, polarity, entities, units, list members, ordering requirements, or requested schemas.

### Semantic cases

Score five dimensions from 0 to 1:

- `correctness`: every asserted answer claim is compatible with admitted evidence and the task.
- `completeness`: required concepts and requested parts are present.
- `grounding`: factual claims have supplied-text, calculation, or admitted-KB support; gaps are disclosed.
- `instructionFit`: output shape, tone, length, and exclusions are followed.
- `naturalness`: the English is connected, concise, and understandable without reading protocol diagnostics.

A semantic pass requires correctness and grounding of 1, no forbidden claim, and the threshold declared in the evaluation manifest for the remaining dimensions. If a reviewer cannot establish these facts, use `review`, not `pass`.

### Unknown and partial results

An honest unknown may pass only when the case expects abstention or the profile deliberately lacks required knowledge. It should identify the missing subject or requested fact, avoid unrelated evidence dumps, and say what relevant evidence is available only if that evidence helps the user.

## Manifest and accounting

The corpus manifest records the source collection digest, converter identity, conversion date, counts by category/pool/profile/scoring mode, rejected cases with reasons, and the digest of the final case JSONL. Counts must sum to the source inventory.

The run manifest records the case digest, executable digest, exact KB package digests, work limits, external Language Agent state, result digest, and thresholds. Evaluation must remain reproducible without network access or mutable remote services.
