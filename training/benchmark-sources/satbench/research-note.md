# SATBench official source and symbolic formula track

## Frozen source and rights boundary

The official authors' repository is pinned at commit `3c93c5b6ee89c563fff279bdf286845d8b7cbe36`. Its README directs users to the `LLM4Code/SATBench` Hugging Face dataset, which is independently pinned at revision `186740e5fb7c0fede11d13f3fbcf7d7d92d70dc9`. The complete 32,618,716-byte `SATBench-problems.jsonl` file remains in ignored immutable cache with SHA-256 `d32ee8ca8ccee4ee3dcb322e174d4cbe5ffebbd1b76dcdb702d397afd34294b5`.

The dataset card declares Apache-2.0. The pinned code README also displays an Apache-2.0 badge, but the code archive does not contain a standalone license text; the manifest preserves that distinction rather than presenting the badge as stronger evidence. Committed receipts contain no source puzzle rows.

The source contains 2,100 records: 1,050 SAT and 1,050 UNSAT. Each of the 15 clause-count configurations from 4 through 50 contains 140 records. Every record has a validated signed-integer CNF annotation, readable formula, natural-language scenario, variable mapping, conditions, question, equivalence-validation evidence, and either a SAT or UNSAT source explanation. Nine source records contain more natural-language condition strings than `num_clauses`; these records remain retained and valid because their machine clauses are complete and no physical or convenience filter may remove them.

## Evidence and partition boundary

The partition algorithm hashes only label-free source task fields. Inside each `num_clauses` stratum it assigns 28 members to development and 112 to sealed fresh evaluation. This yields 420 development and 1,680 fresh cases while preserving every source row. The satisfiability label, source explanation, recovered formula checks, and consistency traces cannot influence membership.

The adapter validates and streams the complete JSONL using Node's line reader. The file is never loaded as one string and has no maximum-file-size acceptance check. Two answer-blind passes are used to establish and verify membership; a development or fresh execution then retains only its authorized pool or aggregate counters. This is adequate for the 2,100-record source and does not require a derived shard format. Solver resource bounds affect case status, never source retention or denominator.

## Structural formula track

SATBench's official model prompt presents the scenario, natural-language conditions, and question. The source also publishes the underlying `clauses` annotation that generated those conditions. This integration deliberately defines a separate `source-annotated-formula-symbolic` track: each signed literal becomes a generic Boolean atom or its negation, each clause becomes disjunction, and the clause set becomes strict premises for `method:core:scalable-boolean-entailment`.

The existing core is reused without modification. The adapter asks whether the complete clause context is consistent by coupling it to a tautological query. A consistent context yields a complete model, which the host checks directly against every source clause before returning SAT. An inconsistent context yields a DPLL certificate, which the independent generic verifier replays before the adapter returns UNSAT. A resource limit or malformed task never maps to either label.

This typed projection is not a hidden source-specific solver. It remains meaningful after variable renaming, clause and literal reordering, and replacement with nonce structures. Removing a necessary conflicting clause changes UNSAT to SAT. The generic core contains no SATBench name, source identity, label, record ID, answer constant, or source vocabulary. Core Change Guardian therefore approved reuse of the accepted method and found no reason to change a capability descriptor, runtime route, KB package, or reasoning implementation.

## Development result and remaining capability boundary

All 420 development cases passed with independently valid witnesses: 214 satisfying assignments and 206 DPLL inconsistency certificates. Every easy, medium, hard, SAT, and UNSAT stratum passed completely. No Language Agent, language-normalization cache, external solver, or source explanation participated in execution.

The result proves search-based reasoning over the official machine CNF annotations. It does not prove that ESLM parses the generated puzzle prose into equivalent clauses. A future natural-language SATBench track requires a separate adapter-visible language analysis, direct parse coverage, protected-operator tests, and its own development and fresh lifecycle. Its result must never be merged with the structural percentage.

## Sealed fresh aggregate

After the source, label-blind partition, adapter, tests, and unchanged Boolean dependencies were frozen by digest, the fresh evaluator ran once over all 1,680 sealed members. It returned 1,680 correct decisions, 100% accuracy, 1,680 independently valid witnesses, and zero Language Agent invocations. Easy SAT, easy UNSAT, medium SAT, medium UNSAT, hard SAT, and hard UNSAT all passed completely.

The evaluator returned no fresh text, formula, label, explanation, identifier, assignment, certificate, or per-case result. `pre-fresh-freeze.json` binds the exact executable checkpoint and `fresh-aggregate.json` contains only the permitted aggregates. The same structural-track claim boundary continues to apply after the fresh result.
