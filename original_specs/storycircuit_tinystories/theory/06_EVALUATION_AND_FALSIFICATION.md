# Evaluation and Falsification

## 1. Principle

Evaluation must make it possible for the symbolic hypothesis to fail. The suite therefore includes tasks favorable to neural models, tasks favorable to explicit state, and tasks where neither approach has an obvious advantage. No reported aggregate may omit parser failures or unsupported inputs.

## 2. Model-agnostic protocol

Every model adapter implements scoring, generation, and capability-specific optional methods. Core metrics use only the shared interface. Symbolic-only diagnostics are secondary and cannot replace end-to-end scores.

## 3. Evaluation families

### A. Language modeling

- validation token NLL and perplexity with the same external tokenizer;
- bits per byte and bits per character;
- prefix-continuation likelihood;
- calibration and probability mass on unknown or escape paths;
- latency and memory for scoring.

### B. Grammar and linguistic form

- TinyStories-derived minimal pairs;
- selected BLiMP categories compatible with model vocabulary;
- agreement, articles, tense, negation, pronouns, argument structure, punctuation, and dialogue formatting;
- round-trip parse/realize fidelity.

### C. Lexical and conceptual knowledge

- semantic typing and selectional preference;
- EWoK adapter for spatial, physical, social, and quantitative concepts;
- controlled synonym and paraphrase transfer;
- unseen-name and unseen-object generalization.

### D. Reference and state tracking

- mention-chain accuracy;
- final-state queries;
- location and possession updates;
- deletion, replacement, and reversal;
- distractor entities and ambiguous pronouns;
- external Entity Tracking benchmark adapter.

### E. Temporal, causal, and relational reasoning

- event ordering;
- persistence and invalidation;
- cause/effect and why questions;
- counterfactual intervention on induced rules;
- bAbI task adapters;
- CLUTRR relation-length and noise splits;
- abductive middle-event selection.

### F. Narrative understanding

- TinyStories QA generated and independently verified;
- ending selection and Story Cloze;
- sentence order recovery;
- contradiction injection detection;
- scene and central-event extraction;
- story summarization as an optional diagnostic.

### G. Generation

- continuation of official TinyStories evaluation prompts;
- full-story generation from short prompts;
- required-word and required-event constraints;
- character and object consistency;
- grammaticality;
- relevance, coherence, plausibility, style, and diversity;
- novelty at text and StoryIR graph levels.

### H. Systematic generalization

- longer inference and event chains than training;
- more distractors;
- held-out lexical substitutions;
- held-out event-schema compositions;
- held-out surface constructions for known semantics;
- cross-dataset transfer.

### I. Efficiency and interpretability

- artifact bytes;
- number of numeric parameters;
- number and description length of symbolic records;
- training wall time, CPU/GPU hours, peak RAM/VRAM;
- inference throughput and latency;
- teacher calls and cost;
- trace completeness and replayability.

## 4. Official and external benchmarks

TinyStories itself provides validation text, official generation prompts, and official checkpoints. BabyLM evaluation adds grammar, world knowledge, entity tracking, and downstream tasks. BLiMP provides controlled grammatical minimal pairs. EWoK targets basic world-model concepts. bAbI and CLUTRR provide explicit compositional reasoning and noise tests. Story Cloze targets commonsense ending selection. NarrativeQA is included only as a stretch adapter because its long documents and open answers are outside the initial TinyStories envelope.

## 5. Gold-IR diagnostic set

At least five hundred TinyStories should receive high-quality StoryIR annotations, with one hundred double-annotated. This set separates:

```text
text -> IR accuracy
IR -> world and reasoning accuracy
IR -> text realization accuracy
text -> answer end-to-end accuracy
```

Without this separation, an end-to-end failure cannot distinguish a language-analysis error from a symbolic execution error.

## 6. Generation evaluation

Automated checks are primary where executable:

- required entities and words;
- state and identity consistency;
- prompt conditions;
- grammar diagnostics;
- repetition and truncation;
- train-set overlap;
- round-trip semantic preservation.

Human and LLM judges may score relevance, coherence, creativity, and style. Judge prompts, model version, randomness, and inter-rater agreement must be recorded. An LLM judge is not used to claim symbolic correctness.

## 7. Fair comparison

A fair study reports two types of baseline:

1. official pretrained TinyStories models, representing published capability at known sizes;
2. a baseline trained on the exact same data subset and data budget, where hardware permits.

S2 teacher assistance is an external data source and must be disclosed. Symbolic hand-engineering time and agent compute are not free; they are reported qualitatively and, where possible, quantitatively.

## 8. Parameter accounting

The report includes:

```text
N_numeric       learned scalar parameters
N_structures    productions, rules, schemas, lexical records
AST_nodes       executable program complexity
artifact_bytes  serialized model size
DL_bits         compressed description length
```

A float32-equivalent parameter count `artifact_bytes / 4` may be shown for intuition, but it is not treated as the primary complexity measure.

## 9. Required ablations

- lexical backoff only;
- grammar without semantics;
- grammar plus discourse;
- grammar, discourse, and world state;
- full narrative planner;
- no coding-agent-induced circuits;
- no MDL penalty;
- no verification/repair;
- gold IR versus predicted IR;
- S0 versus S1 versus S2.

## 10. Failure criteria

The strong ESLM hypothesis is rejected if one or more of the following persist after the planned research budget:

1. full-corpus parse coverage remains too low for semantic components to affect end-to-end metrics;
2. normalized token scoring is impractically slow or substantially worse than a simple n-gram without compensating capability gains;
3. rule and construction growth is primarily memorization, shown by poor held-out composition and excessive description length;
4. generation remains template-bound and fails prompt relevance or linguistic diversity;
5. coding-agent-generated circuits overfit development data despite shadow validation;
6. explicit world state does not improve consistency or systematic generalization over comparably small baselines;
7. the S2 system's apparent gains disappear after accounting for teacher knowledge and cost.

## 11. Partial success criteria

A narrower claim is supported if the system achieves strong results in a clearly delimited capability such as entity tracking, state consistency, or verifiable QA while remaining weak in free generation. The paper must name the system accordingly and avoid presenting it as a general LM replacement.

## 12. Statistical protocol

Use at least three seeds for stochastic training or generation. Report confidence intervals or bootstrap intervals. Freeze test sets before final runs. Correct for multiple comparisons when many circuit variants are tried. Publish per-category scores and failure counts, not only macro averages.
