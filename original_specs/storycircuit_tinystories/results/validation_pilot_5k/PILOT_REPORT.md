# Validation Pilot Report

Source: `/mnt/data/TinyStories-valid.txt` (`94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4`).

Stories: 5000 total, 3956 train, 1044 held out.

Held-out bits per byte: 1.912485.

Cross-story ending accuracy: 0.5160; structured accuracy: 0.5140.

Mean parser semantic coverage diagnostic: 0.7138.

## Limits

- This is a bounded reference-pipeline pilot, not the complete induced symbolic model.
- Exact likelihood is supplied by the byte n-gram component; semantic structures are diagnostic/reranking features.
- The held-out partition is drawn from an official validation file rather than the official training corpus.
- Cross-story ending negatives are synthetic and may be solvable using topical surface cues.
- The high-precision parser is partly hand-seeded and is expected to have limited natural-text coverage.
