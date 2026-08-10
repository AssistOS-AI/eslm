# DS-001 — Research Contract and Experimental Boundaries

**Status:** Normative  
**Version:** 0.1  
**Owners:** research lead, evaluation lead  
**Depends on:** `PROJECT_CHARTER.md`

## Purpose

This specification prevents the implementation from drifting toward an easier but scientifically different task. All components and experiments must preserve the full TinyStories text domain and the shared language-model interface.

## Normative requirements

1. No global vocabulary cap is imposed. Pruning may be used only with a total unknown/backoff path and must be reported.
2. The primary model accepts arbitrary UTF-8 TinyStories-like text, including text it cannot semantically parse.
3. Unsupported semantic parses remain visible and count against coverage.
4. The model exposes `score_text`, `next_token_distribution`, and `generate` in addition to symbolic methods.
5. The same evaluator must run on symbolic and causal-LM adapters.
6. Training, development, shadow, and final test splits are content-hashed before coding-agent induction.
7. External teacher use places a run in regime S2 and is recorded as external knowledge and compute.
8. Test labels, final-test text, and judge outputs cannot be used to generate or repair circuits.
9. Hand-written and coding-agent-generated code are both counted as symbolic structure.
10. Every published aggregate includes parse/coverage rates and unsupported counts.

## Scientific claims

Permitted claim forms include:

```text
ESLM is competitive on capability X under data budget Y.
ESLM generalizes better on composition split Z.
Explicit world state reduces contradiction class C.
A learned compiler improves end-to-end performance while retaining executable traces.
```

Prohibited claim forms include “understands TinyStories” without an operational definition, “has fewer parameters” without structural-size accounting, or “outperforms LMs” based only on filtered examples.

## Comparison matrix

Every milestone report includes at least:

| System | Data | Runtime regime | Scoring | Generation | Symbolic diagnostics |
|---|---|---|---|---|---|
| n-gram | identical subset | non-neural | yes | yes | limited |
| reference ESLM | identical subset | S0 | yes | yes | yes |
| induced ESLM | identical subset | S0/S1/S2 | yes | yes | yes |
| official TinyStories checkpoint | official | neural | yes | yes | no |
| same-data GPT baseline | identical subset | neural | yes | yes | no |

## Acceptance criteria

- Project configuration explicitly records regime, data hashes, tokenizer, model version, and evaluation suite.
- CI rejects a model adapter lacking normalized next-token probabilities.
- Evaluation reports include full-input denominators.
- A leakage audit can reconstruct which data each circuit observed.

## Falsification trigger

If requirements are relaxed to achieve a score, the run is marked exploratory and excluded from primary comparisons.
