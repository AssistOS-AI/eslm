# bAbI adapter

Paper: `https://arxiv.org/abs/1502.05698`  
Generator repository: `https://github.com/facebookarchive/bAbI-tasks`

The twenty proxy tasks cover fact chaining, spatial and temporal relations, induction, deduction, counting, path finding and related reading-comprehension skills.

## Recommended subset sequence

```text
single supporting fact
single relation
two and three supporting facts
positional reasoning
yes/no questions
basic induction
time reasoning
path finding
```

Keep original task IDs, supporting-fact annotations and official train/test sizes. Evaluate answer exact match from raw text; then use supporting facts to diagnose retrieval versus inference. Do not claim TinyStories language coverage from bAbI performance because bAbI is a controlled reasoning domain.
