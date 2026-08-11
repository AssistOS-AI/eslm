# SLR-Bench official-source integration note

## Source identity and rights

This track uses the official `AIML-TUDA/SLR-Bench` dataset and its `v1-All` configuration at immutable Hugging Face revision `cecc0aa2602943ead28a4ea74c7a8f3c91264cbf`. The official dataset card declares CC BY 4.0 and identifies Lukas Helff as the contact. The five source-native Parquet shards are retained in the ignored cache and match their official LFS SHA-256 objects byte for byte.

The generator is the paper authors' `ml-research/ScalableLogicalReasoning` repository at revision `3b46979ccdf9bb1c624809cfc140fe7c5af0f778`, licensed MIT. The official Hugging Face symbolic-judge Space is independently frozen at revision `79ef0851bd9c52f7a50aebf0f39db924d13840b9`; its main source carries an Apache 2.0 header. No mirror or similarly named benchmark was used.

The selected `v1-All` configuration is the official union configuration and contains all 19,253 benchmark rows across all twenty levels. The tier-specific configurations are alternate official views, not the selected identity. Complete `v1-All` train, validation, and test files are retained; no row or level was excluded because of size.

## Safe structural validation

The official evaluator extracts a candidate Prolog rule, combines it with a validation program, starts SWI-Prolog, and measures whether all positive examples are covered while all negative examples are rejected. ESLM does not execute that code or any dataset string. The Node adapter tokenizes the validation-program subset and parses every statement into an inert ground-fact AST. Variables, directives, rules, queries, operators, and unrecognized tokens in this source field fail closed. Across the complete release, 13,999,345 ground facts parsed successfully and zero corpus programs were executed.

This structural validator is not presented as the official semantic scorer. Replacing SWI-Prolog safely requires a generic, reviewed rule language and evaluator that covers the benchmark's relational, recursive, arithmetic, and aggregation semantics. Implementing that solver inside the source adapter would violate the adapter/core boundary. Until the generic capability exists, the correct status is `NO_APPLICABLE_METHOD`, not an approximate exact-string score against the latent rule.

## Oracle and lifecycle boundary

The official split lifecycle is retained. Train has 18,053 rows and is available only through a label-free streaming interface. Validation contains ten cases at each of the twenty levels and is the complete 200-row development pool. Test contains fifty cases at each level and is a 1,000-row fresh pool that has not been executed and cannot be requested through the visible-pool API.

Visible tasks contain the prompt, split-local source identity, curriculum level and tier, problem-size metadata, and the rule-output contract. The latent ground-truth rule, validation program, validation shortcuts, and symbolic support stay in the host oracle. Numeric IDs repeat across official splits, so task identity always includes the split; the numeric ID is never a semantic input to the core.

## Streaming and physical plan

The five immutable Parquet shards total 260,070,558 bytes. The dependency-free JSONL projection totals 1,261,211,442 bytes. It is divided into 74 train shards, one validation shard, and four test shards. Train sharding is by curriculum level and stable groups of at most 250 source rows; test sharding preserves source order in groups of 250. The largest prepared shard is 47,870,290 bytes. Concatenating the shards in lexical order reproduces the frozen split payload hashes, so sharding changes physical access only.

Complete validation took 29.00 seconds and peaked at 133,640 KiB RSS while reading 1.26 GB of prepared data. The process holds one row and one parsed validation program at a time, plus bounded identifier and aggregate maps. These figures establish that source scale triggers streaming and deterministic subdivision rather than rejection.

## Development-visible rule families

The selected `v1-All` rows do not contain a self-recursive target rule: the target predicate occurs only in the rule head in all 18,053 train and 200 validation references. This matters because the generator documentation advertises a recursion template, but implementing or claiming recursive-target coverage from that description alone would not be evidence from the selected benchmark rows.

The visible source does support a smaller reusable step. Train contains 13,575 plain positive conjunction references and 4,478 references that use one or more extended constructions. Validation contains 155 plain conjunction references and 45 extended references. The extended counts overlap across universal quantification, collection, negation, inequality, disjunction, counting, extrema, and arithmetic; they are diagnostic metadata joined after prediction, not inputs to core control flow.

## Finite conjunctive candidate

The adapter reads only the ground examples already present in the prompt. It identifies positive and negative roots, assigns entity-versus-value term kinds, and emits `finite-conjunctive-rule-induction-task-v1`. The core uses no train, car, direction, benchmark, split, row, or answer vocabulary. It enumerates root-connected subgraphs of one positive example in increasing body length, canonically renames variables and orders literals, prunes a partial conjunction only when it already fails a positive example, and accepts the first rule that covers every positive while rejecting every negative. Join order is chosen dynamically from variables already bound, candidate posting size, and canonical literal order.

The witness for a positive example contains the root-preserving variable binding and one accepted fact for every rule literal. A negative receipt records exhaustive bounded failure to match. Verification reruns canonical induction and compares the complete rule, coverage, rejections, and cost trace. Fully renamed predicates, entities, values, and target identifiers pass; reversing example and fact order passes; a disconnected lookalike fails; isomorphic positive and negative graphs return `UNKNOWN`; and altered support evidence fails verification.

On all 200 official validation prompts, the candidate returns 126 rules. Every one of those 126 rules passes independent witness replay and covers every positive while rejecting every negative in the corresponding host-only validation program. Levels 1 through 5 are each 10/10. Across the full pool the safe development validation rate is 126/200, with 10 `UNKNOWN` and 64 `RESOURCE_LIMIT`. The 64 resource outcomes remain in the denominator; no row is rejected because of size.

This is not an official SWI-Prolog score. Candidate rules and corpus strings are never executed. The host parses the validation program into inert facts and evaluates the supported conjunctive rule directly. Twelve tasks whose reference uses an extended construction nevertheless admit a shorter conjunctive separator over every delivered validation example; these count as semantically valid candidate rules under that ground-example contract, not as recovery of the reference construction.

The method was called directly as a trusted candidate. Registry and engine binding remain a separate integration decision. The 1,000 official test cases remain fresh and were not opened. Language Agent calls and corpus-program executions are both zero.
