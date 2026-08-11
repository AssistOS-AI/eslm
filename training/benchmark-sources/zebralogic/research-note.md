# ZebraLogic official source and public-clue CSP track

## Frozen source, code, and rights boundary

The official public `allenai/ZebraLogicBench` dataset is pinned at revision
`2f94a445d7079f20146f5443e2606049de8543e0`. Both complete configurations are retained in the ignored
immutable cache: 1,000 grid puzzles and 3,259 multiple-choice questions. The source-native Parquet files remain
the primary artifacts. A Node acquisition script also streamed deterministic JSONL projections while checking that
the Hugging Face dataset API reported the pinned revision before and after acquisition. The adapter reads the grid
projection one row at a time and does not impose a maximum total file size.

The official evaluation repository, ZeroEval, is pinned at commit
`8c1485edf12c6efb5f69135a562927c5ad484059`. Its complete archive and Apache-2.0 license are retained. The paper
describes CSP generation and its clue families, but neither the paper, dataset card, nor pinned evaluation repository
links a released generator implementation. The source manifest records that absence instead of treating evaluation
code as generator code.

The pinned dataset cards do not declare a dataset license. This research cache therefore does not establish a right
to redistribute the dataset or use it beyond the repository's research setting. Upstream clarification is still
needed for broader reuse.

## Public redaction and official oracle access

Every public grid solution cell is the literal placeholder `___`; every public multiple-choice row omits its answer.
The official evaluation code loads its reference assignments from `allenai/ZebraLogicBench-private`, pinned here at
revision `9f39ef490ae924437376657205025f26c0bd1af3`. That repository uses Hugging Face's automatic gated-access flow.
This environment has no authorized Hugging Face token and receives HTTP 401 for its Parquet files. To enable an
official-label evaluation, accept the terms at
<https://huggingface.co/datasets/allenai/ZebraLogicBench-private>, provide an authorized local token or immutable
local copy, and freeze its artifact digest before scoring.

The current track does not substitute computed assignments for those inaccessible private labels. It asks a distinct,
fully checkable question: can the public clues be parsed directly, solved symbolically, checked against every clue,
and shown to have exactly one solution? A completion percentage for this track is not an official leaderboard score
or a cell-by-cell comparison with the private reference table.

## Partition and oracle isolation

The public grid source has 25 size strata, covering every number-of-houses by number-of-attributes combination from
2*2 through 6*6, with exactly 40 puzzles per stratum. Before development text inspection, a stable hash ranked
members using only the official ID, size, and puzzle digest. Eight members per stratum became development-visible,
for 200 total. The remaining 32 per stratum, 800 total, became sealed fresh members. Public placeholder solution cells,
computed assignments, and private answers cannot affect membership.

Development tasks expose parsed domains and typed clues but no solution or oracle object. Fresh evaluation streams
one selected row at a time and returns only aggregate counts, size strata, statuses, and resource maxima. It catches a
fresh parser failure as the aggregate status `PARSE_ERROR` without returning its clue, identifier, or diagnostic.

## Direct parser and finite-domain semantics

The adapter reads each domain from the puzzle's backtick-delimited attribute declarations. Source-owned lexical
metadata handles conservative surface alternations such as abbreviated month and nationality values, hyphenation,
plural morphology, and generated reference phrases. Context cues distinguish otherwise identical values in two
domains, for example a pet fish from an animal fish. Every numbered clue must compile to exactly one allowlisted
constraint: same position, fixed position, excluded position, strict left or right order, immediate-left order,
adjacency, or an exact number of intervening houses. Unknown or ambiguous text is rejected; it is never ignored and
never sent to a Language Agent.

For each domain, every value receives exactly one house and every house receives exactly one value. Clues add ordinary
finite-domain restrictions. The adapter translates those restrictions into Boolean clauses over semantic
`attribute/value/position` variables and calls the unchanged generic scalable Boolean entailment method. The core sees
neither ZebraLogic identity nor source vocabulary.

## Witness and uniqueness requirements

A satisfying Boolean model is not sufficient. The adapter decodes a complete table and separately checks that each
domain is a permutation of all house positions and that every typed clue relation holds. It then adds one blocking
clause negating the entire returned assignment and runs search again. Only an independently replayed DPLL
unsatisfiability certificate for this blocked problem proves uniqueness. Removing a necessary ordering clue from a
nonce fixture produces a valid but non-unique result, demonstrating that the uniqueness gate is operational.

The Core Change Guardian accepted reuse of the existing Boolean method. Renamed entities and values, clue reordering,
and a meaning-changing contrast pass without adding a benchmark branch, answer constant, row identifier, or vocabulary
item to generic reasoning code. No runtime, engine, capability registry, or KB change was needed.

## Development evidence and claim boundary

All 200 development-visible puzzles parsed and completed successfully. Each has one complete assignment accepted by
the independent direct checker and one accepted uniqueness certificate. Every one of the 25 size strata passed 8/8.
The evaluation made zero Language Agent calls. Resource controls remained execution bounds only and did not reduce the
200-case development denominator or the complete 1,000-row retained public grid source.

The gated private oracle remains the only blocker for an official-label score. The public-clue track can establish
constraint satisfaction and uniqueness from the published text, but it cannot assert that a computed table matches
the authors' hidden table until that table is acquired under its terms and frozen separately.

## Sealed fresh aggregate

After the adapter, tests, source identity, partition, development result, and unchanged Boolean dependencies were
frozen by digest, the fresh evaluator ran once across all 800 sealed members. It returned 791 puzzles with an
independently valid complete assignment and uniqueness certificate, for 98.875% completion, plus nine aggregate
`PARSE_ERROR` outcomes. It made zero Language Agent calls. Nineteen size strata completed 32/32; the other six retained
their complete 32-case denominators and reported 29 through 31 successes.

The evaluator did not return a failed record's text, identifier, clue, parsed constraint, assignment, certificate, or
per-case status. Under the frozen lifecycle, the nine fresh parser failures cannot be inspected or used to revise this
checkpoint. They are evidence of an uncharacterized direct-parser coverage gap, not solver resource exhaustion,
incorrect private labels, or permission to infer the hidden source content.
