# DS-16 — Implementation Sequence and Acceptance

## 1. Implementation strategy

The system should be built as a sequence of vertical capabilities rather than as a complete speculative platform. Each stage must produce an executable path from text to result and a regression baseline.

## 2. Stage A: contracts and narrow CNL

The first stage fixes the Semantic IR, result statuses, KB logical schema and `src` versus KB boundary. It implements atomic CNL, universal and existential categorical forms, simple implications, negation and direct questions.

A small benchmark set such as LogicBench, IIBench, RuleTaker or ProofWriter establishes parsing, reasoning and proof traces. The KB may initially use an in-memory or embedded-database backend.

Acceptance requires deterministic rebuild, no executable KB code, direct symbolic parsing metrics and valid proofs on the supported fragment.

## 3. Stage B: document-to-KB construction

The second stage implements source registration, span-preserving segmentation, semantic extraction, entity handling, provenance, canonical serialization and the Document-to-KB Builder skill.

Acceptance requires rebuilding a KB from documents, traceable source spans, schema and contradiction validation, and a query suite that survives recompilation.

## 4. Stage C: compiled shards and dynamic loading

The third stage implements manifests, dictionary coding, access-path indexes, shard summaries, registration, routing and bounded caches. The same query suite runs against exhaustive and lazy modes.

Acceptance requires semantic equivalence, no false-negative routing, deterministic checksums and memory-bounded execution on a KB larger than available memory.

## 5. Stage D: event, temporal and relational reasoning

The fourth stage adds event frames, roles, temporal order, state updates, spatial composition and reference candidates. bAbI, CLUTRR and StepGame-like tasks become primary regressions.

Acceptance requires metamorphic language tests, unseen chain-length tests and stable direct symbolic coverage.

## 6. Stage E: task planning and constraints

The fifth stage implements the capability registry, task-frame decomposition, AND/OR planning, CSP or SAT integration and explicit capability-gap reporting. ZebraLogic, SATBench and SLR-Bench-like tasks exercise search and planning.

Acceptance requires correct distinction between missing knowledge, no applicable method and resource exhaustion.

## 7. Stage F: defaults, uncertainty and commonsense

The sixth stage introduces declarative defaults, exceptions, graded claims, abduction and commonsense KBs. Defeasible NLI, CommonsenseQA, SocialIQA, PIQA and alphaNLI provide evaluation.

Acceptance requires no conversion of defeasible knowledge into strict facts, calibrated abstention and traceable hypotheses.

## 8. Stage G: richer CNL and optional LLM fallback

The final language stage expands relative clauses, embedded clauses, complex coordination and discourse reference. The optional LLM path is added only with anchor preservation and reparse validation.

FOLIO, ProverQA, WinoGrande, ReClor and LogiQA measure the language frontier. Acceptance requires explicit route metrics and no hidden LLM answering.

## 9. System-level acceptance

A release candidate must rebuild all KBs, pass core unit tests, pass benchmark regressions, preserve direct symbolic performance, validate compiled-query equivalence, report honest failure statuses and reproduce its evaluation from fixed versions and seeds.

The package is ready for comparison with existing small LLMs only after fresh shadow performance stabilizes and the final symbolic system is frozen.
