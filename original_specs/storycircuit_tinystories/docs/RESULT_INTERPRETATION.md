# Interpreting Results

## 1. Do not ask only “which model wins?”

StoryCircuit is intended to reveal where explicit executable structure helps and where it becomes brittle or expensive. The scientifically useful output is a capability frontier, not one headline accuracy.

## 2. Likelihood

Bits per byte is the most portable likelihood metric across tokenizers. Native-token perplexity should still be reported for each model, but it is not directly comparable when tokenization differs. The current reference model obtains exact probability from a byte n-gram and uses semantic structure only diagnostically; therefore a likelihood gain cannot yet be attributed to symbolic semantics.

A semantic reranker improving ending selection but not defining normalized probability is evidence for useful features, not evidence for a better language model distribution.

## 3. Compiler versus executor

Always compare:

```text
predicted IR -> outcome
 gold IR     -> outcome
```

If the gold-IR ceiling is high and predicted-IR performance is low, invest in constructions, reference, or scope. If the ceiling is low, adding a larger parser or LLM will not repair the world model.

## 4. Coverage

Coverage is not success. A parser can inflate coverage with vague opaque nodes or wrong analyses. Report coverage together with precision/fidelity, abstention quality, and downstream correctness. Unsupported inputs count in end-to-end denominators.

## 5. Systematic generalization

Flat performance across greater reasoning depth can be a real symbolic advantage only when the compiler still succeeds and test programs are not visible during induction. Report compilation accuracy at each depth and separate runtime ceiling from text interface errors.

## 6. Generation

A generated story can satisfy structural constraints yet be awkward, repetitive, or semantically thin. Report at least:

- requested entities/events/words;
- contradiction and state consistency;
- parse-back completeness;
- repetition and diversity;
- ending plausibility;
- independent LM likelihood;
- blinded human judgments under a fixed rubric.

Human or LLM judges must not be the sole evidence. Report judge identity, prompt, order randomization, reliability, and cost.

## 7. Complexity

A symbolic model has no single natural “parameter count.” Report several quantities:

```text
numeric count records/weights
symbolic constructions
rules and schemas
lexicon entries
serialized artifact bytes
source-code bytes added after the fixed engine
runtime caches separately
```

The fixed interpreter should be reported separately from learned artifacts, just as neural framework code is separated from model weights. Nevertheless, hand-written domain knowledge is a research cost and must be disclosed.

## 8. Coding-agent contributions

Agent-written code is not automatically learned knowledge. Classify each contribution as:

- general engine code;
- manually prompted domain mechanism;
- data-induced circuit;
- teacher-assisted circuit;
- benchmark-specific adapter.

Report human/agent effort, teacher tokens, and protected-split gating. A system built through thousands of hand-directed exceptions may be useful engineering but does not support a claim of autonomous symbolic induction.

## 9. Valid conclusion forms

Strong but defensible conclusions resemble:

> The symbolic model generalized without degradation from depth 4 to 10 after gold parsing, but its natural-text compiler lost 18 points, locating the main bottleneck in language compilation.

> The normalized lexical/grammar mixture improved BPB modestly, while world-state features helped ending selection only as a reranker; semantic normalization remains unresolved.

> At equal artifact size, the neural baseline generated more fluent stories, while StoryCircuit produced fewer state contradictions and complete causal traces on the controlled suite.

Avoid claims such as “the system understands stories” unless operationally qualified by the evaluated capabilities.
