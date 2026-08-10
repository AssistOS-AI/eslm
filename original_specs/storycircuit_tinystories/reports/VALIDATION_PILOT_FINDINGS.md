# Validation Pilot Findings

## Scope

The reference kernel was run on the official legacy TinyStories validation file whose local copy matched SHA-256:

```text
94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4
```

The first 5,000 stories were partitioned by content hash into 3,956 training stories and 1,044 held-out stories. This is a pipeline pilot, not a substitute for training on the official training corpus.

## Main results

| Measurement | Result |
|---|---:|
| byte model | add-alpha order 4 |
| word model | add-alpha order 4 |
| canonical artifact | 51,240,147 bytes |
| numeric count records | 515,018 |
| symbolic records | 21,659 |
| training wall time in this environment | 5.58 s |
| held-out BPB | 1.9125 |
| held-out semantic coverage diagnostic | 0.7138 |
| mean opaque-event rate | 0.2655 |
| cross-story ending accuracy | 0.5160 |
| structured reranker ending accuracy | 0.5140 |

The ending confidence interval was approximately 0.472–0.558. Thus neither lexical likelihood nor the reference semantic reranker demonstrated narrative ending selection beyond chance on this natural pilot.

## Scaling probe

A grid over 500, 2,000, and 3,956 training stories and n-gram orders 1, 2, and 4 reduced held-out BPB from approximately 4.394 to 1.882 on a fixed 300-story held-out subset. Ending accuracy remained between 0.507 and 0.533.

This is a useful negative result: better local predictive compression did not produce detectable narrative ending understanding. It motivates explicit narrative structure, but does not prove that the proposed symbolic solution will succeed.

## Interpretation

The current byte n-gram is a valid total probability floor. The parser and world model can execute certain constructions, but the structured score is an unnormalized diagnostic. Therefore:

```text
BPB result             -> evidence about count-based local language modeling
state/QA results       -> evidence about implemented executable templates
structured reranking   -> evidence about discriminative features only
```

The pilot locates the next research bottleneck in induced natural-language constructions, coreference, rule execution, and normalized semantic scoring.

## Reproduction

```bash
python scripts/download_tinystories.py --variant legacy --split valid
python scripts/run_validation_pilot.py \
  --input data/raw/TinyStories-valid.txt \
  --stories 5000 \
  --train-fraction 0.8 \
  --ending-items 500 \
  --output-dir results/validation_pilot_5k
```

The packaged result excludes the raw stories and local evaluation cases containing story text. The script reconstructs them from the verified external file.
