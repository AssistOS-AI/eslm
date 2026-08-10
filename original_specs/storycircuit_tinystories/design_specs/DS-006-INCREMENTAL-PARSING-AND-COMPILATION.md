# DS-006 — Incremental Parsing and Text-to-StoryIR Compilation

**Status:** Draft  
**Version:** 0.1  
**Depends on:** DS-004, DS-005

## Goal

Maintain weighted parse and semantic-state hypotheses for arbitrary prefixes and compile complete clauses into StoryIR.

## Parser architecture

The recommended parser combines a construction trie, chart parsing, and beam search. Parser states are immutable or versioned. Shared subparses are memoized by input span, construction state, and relevant feature environment.

## Incremental behavior

For each external or internal token:

1. advance lexical and morphology automata;
2. extend active construction hypotheses;
3. open new hypotheses where permitted;
4. close completed constituents;
5. execute pure semantic actions into provisional StoryIR fragments;
6. prune by normalized score and beam budget;
7. preserve an escape hypothesis.

Sentence boundaries trigger reference resolution and world-state commit, but unresolved hypotheses may remain if punctuation is ambiguous.

## Candidate representation

```text
ParseCandidate {
  score
  chart_root
  provisional_ir
  discourse_delta
  unresolved[]
  consumed_span
  trace
}
```

## Compiler correctness

The compiler is not deemed correct because output validates structurally. Evaluation requires span alignment, object type, participant roles, polarity, tense, and graph equivalence against gold StoryIR.

## Learned compiler option

S1 may add a compact sequence tagger or constrained decoder. It emits construction IDs and slot spans, not arbitrary prose or unvalidated JSON. The symbolic parser checks and repairs or rejects its output.

## Resource limits

Beam width, chart cells, parse timeout, and maximum unresolved spans are profile-controlled. Exhaustion returns a typed partial parse rather than crashing or silently choosing a low-quality path.

## Acceptance criteria

- every prefix has at least one scoring state;
- complete parse outputs pass StoryIR validation;
- parse traces identify construction and span provenance;
- runtime is benchmarked by story length;
- gold-IR and end-to-end metrics are separate.
