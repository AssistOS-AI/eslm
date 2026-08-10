# Benchmark matrix

| Evaluation source | Shared LM protocol | Symbolic diagnostic | Initial status |
|---|---:|---:|---|
| TinyStories validation | yes: score text | parse/state coverage | scripted download |
| Official TinyStories prompts | generation | plan/round trip | scripted download |
| Internal minimal pairs | continuation score | construction trace | generator included |
| Internal state tracking | optional continuation form | direct query/proof | generator included |
| Internal systematic OOD | yes where possible | full traces | generator included |
| BLiMP | sentence preference | parse diagnostics | adapter specification |
| EWoK | continuation preference | world concept trace | adapter specification |
| Entity Tracking | word/sentence logits | explicit state | adapter specification |
| bAbI | QA/continuation | proof depth | adapter specification |
| CLUTRR | relation label/continuation | relation graph | adapter specification |
| Story Cloze/XStoryCloze | ending score | event graph coherence | adapter specification |
| BabyLM 2026 | logits/fine-tuning as supported | secondary | external pipeline |
