# Executable Symbolic Language Model
## Self-Contained Architecture and Design Specification Package

This package specifies an end-to-end symbolic language model adapted to an existing architecture in which reusable executable mechanisms live in `src`, while knowledge is stored in any number of independently buildable and loadable knowledge bases.

The system is intended to receive instructions, facts, contextual information and questions in natural language; convert them into explicit semantic structures; select and load only the relevant knowledge; decompose the task into symbolic subproblems; execute suitable reasoning methods; and return either a justified answer or an explicit account of why the task cannot be solved safely.

The design deliberately avoids executable JavaScript or Java inside knowledge bases. A knowledge base is a declarative, versioned data product. It may contain facts, events, lexical entries, ontological declarations, constraints, defaults and rules expressed in a restricted declarative rule language, but it cannot introduce arbitrary runtime behavior. New reusable algorithms belong in `src` and must pass global regression tests before acceptance.

The language front-end follows a direct-symbolic-first policy. The existing CNL parser attempts every English input before any LLM is invoked. An optional configured LLM may translate another language or conservatively simplify an unsupported surface construction, but its output must return through the same symbolic parser. The percentage of inputs solved without an LLM is a primary training and evaluation metric.

The package is organized as Design Specifications and a small set of operational skills for coding agents. The specifications describe stable system contracts. The skills describe how a coding agent must work while building a KB, learning a reasoning benchmark, guarding changes to `src`, and compiling or auditing scalable KB packages.

| Document | Purpose |
|---|---|
| `REZUMAT-ARHITECTURA-RO.md` | Rezumă în limba română viziunea completă și deciziile arhitecturale. |
| `DS-00-VISION-AND-SYSTEM-INVARIANTS.md` | Defines the system, its research hypothesis and non-negotiable invariants. |
| `DS-01-ADAPTATION-TO-EXISTING-ARCHITECTURE.md` | Defines the boundary between reusable code in `src` and declarative knowledge in KBs. |
| `DS-02-SYMBOLIC-LANGUAGE-FRONTEND-AND-CNL.md` | Specifies direct symbolic parsing, semantic composition and controlled-language evolution. |
| `DS-03-BENCHMARK-DERIVED-CNL-REQUIREMENTS.md` | Derives mandatory CNL and semantic forms from the reasoning benchmarks. |
| `DS-04-DOCUMENT-TO-KB-LEARNING-PIPELINE.md` | Specifies how a coding agent converts documents into a validated KB. |
| `DS-05-KB-LOGICAL-MODEL.md` | Defines terms, assertions, events, rules, contexts, uncertainty and provenance. |
| `DS-06-KB-PHYSICAL-FORMAT-SHARDING-AND-INDEXES.md` | Defines scalable storage for millions to billions of facts. |
| `DS-07-KB-CATALOG-DISCOVERY-AND-DYNAMIC-LOADING.md` | Specifies how relevant KBs and shards are discovered and loaded under memory budgets. |
| `DS-08-CLI-SESSION-AND-EXECUTION-CONTRACT.md` | Specifies interactive and one-shot CLI behavior and session semantics. |
| `DS-09-SYMBOLIC-TASK-DECOMPOSITION-AND-PLANNING.md` | Defines task frames, subproblem decomposition, method selection and execution monitoring. |
| `DS-10-OPTIONAL-LLM-TRANSLATION-AND-SIMPLIFICATION.md` | Defines the exact permissions, prohibitions and validation of the optional LLM. |
| `DS-11-BENCHMARK-GUIDED-LEARNING-AND-REGRESSION.md` | Defines the coding-agent learning loop and rigorous anti-overfitting protocol. |
| `DS-12-HONEST-FAILURE-CAPABILITY-GAPS-AND-ABSTENTION.md` | Defines structured inability, ambiguity, missing knowledge and resource-limit outcomes. |
| `DS-13-PROVENANCE-CONFLICTS-VERSIONING-AND-TRUST.md` | Defines lineage, conflicts, KB overlays, reproducibility and trust policies. |
| `DS-14-SECURITY-AND-UNTRUSTED-INPUTS.md` | Defines safety boundaries for documents, generated KBs, agents and LLM output. |
| `DS-15-EVALUATION-AND-COMPARISON-WITH-EXISTING-SMALL-LLMS.md` | Defines final capability comparison without training a neural model. |
| `DS-16-IMPLEMENTATION-SEQUENCE-AND-ACCEPTANCE.md` | Defines an incremental implementation order and acceptance gates. |
| `APPENDIX-A-NORMATIVE-KB-RECORD-SCHEMAS.md` | Defines concrete declarative schemas for terms, facts, events, frames, rules and provenance. |
| `APPENDIX-B-SHARD-MANIFEST-AND-ROUTING-SCHEMA.md` | Defines concrete package, shard, catalog and lazy-routing contracts. |
| `APPENDIX-C-TASK-METHOD-AND-RESULT-CONTRACTS.md` | Defines concrete task frames, method descriptors, traces, results and capability gaps. |
| `skills/SKILL-01-DOCUMENT-TO-KB-BUILDER.md` | Operational protocol for populating a KB from one or more documents. |
| `skills/SKILL-02-BENCHMARK-GUIDED-SYMBOLIC-LEARNER.md` | Operational protocol for improving language, KB and reasoning from benchmark failures. |
| `skills/SKILL-03-CORE-CHANGE-GUARDIAN.md` | Operational protocol governing changes to reusable code in `src`. |
| `skills/SKILL-04-KB-COMPILER-AND-QUALITY-AUDITOR.md` | Operational protocol for compiling, sharding, validating and publishing KB packages. |

## User-story traceability

| User story | Primary specification |
|---|---|
| Start a coding agent with a small skill set and populate a KB from one or more documents | DS-04 and Skill 01 define ingestion; DS-05 and Appendix A define the records produced. |
| Register many KBs and dynamically load only relevant shards under memory limits | DS-06, DS-07 and Appendix B define storage, discovery, routing and cache correctness. |
| Execute interactively or from one text input, with optional translation or simplification only when direct CNL fails | DS-02, DS-08 and DS-10 define the route and validation. |
| Accept instructions, facts and context, solve when possible and state honestly when the task exceeds knowledge or methods | DS-08 and DS-12 define the execution and result contract. |
| Decompose tasks symbolically into subproblems and plan suitable reasoning methods | DS-09 and Appendix C define task frames, capabilities, plans and gap reports. |

The specifications are normative where they use the terms MUST, MUST NOT, SHOULD and MAY. Illustrative CLI names and serialization examples may be adapted to existing naming conventions, but the semantic boundaries and acceptance conditions are intended to remain stable.
