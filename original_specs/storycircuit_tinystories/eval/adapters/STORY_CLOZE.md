# Story Cloze adapter

Paper: `https://arxiv.org/abs/1604.01696`  
Corpus portal: `https://www.cs.rochester.edu/nlp/`

Story Cloze presents a four-sentence context and two endings. Score each ending conditionally on the context. Because prior work identified stylistic artifacts, report both the official result and controlled variants where ending style, length and lexical overlap are balanced.

StoryCircuit diagnostics compare:

```text
state consistency
goal resolution
causal connection
unresolved entities
event-schema compatibility
surface-only preference
```

Never use validation labels to tune the narrative coherence weights reported on the same split.
