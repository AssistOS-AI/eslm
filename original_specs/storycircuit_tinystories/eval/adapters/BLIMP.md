# BLiMP adapter

Paper: `https://aclanthology.org/2020.tacl-1.25/`

BLiMP contains 67 datasets of 1,000 minimal pairs that isolate English syntax, morphology and semantics. For each pair, compute the exact log probability of both complete sentences and count a success when the acceptable sentence receives higher probability.

## StoryCircuit diagnostics

Record in addition:

```text
whether both sentences parsed
construction IDs used
grammatical constraint violated
escape probability
whether semantic experts changed the byte/lexical baseline ranking
```

Do not train constructions on BLiMP test pairs. Start with TinyStories-relevant categories, but report coverage and the complete-suite result separately; selecting only favorable categories cannot support a general grammar claim.
