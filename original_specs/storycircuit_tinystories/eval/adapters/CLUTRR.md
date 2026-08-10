# CLUTRR adapter

Paper: `https://arxiv.org/abs/1908.06177`  
Repository: `https://github.com/facebookresearch/clutrr`

CLUTRR evaluates relational reasoning and systematic generalization using held-out combinations of kinship rules and controlled noise. StoryCircuit maps people to entities, explicit kinship statements to relation edges, and the query to a typed relation closure.

## Required curves

```text
train relation length -> test relation length
noise facts
irrelevant story clauses
lexical paraphrases
raw text versus gold relation graph
```

Gold-graph execution isolates the relational engine. Raw-text accuracy remains the headline result.
