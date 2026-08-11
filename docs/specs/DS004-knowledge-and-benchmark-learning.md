---
id: DS004
title: Document-to-KB and Benchmark-Guided Learning
status: in-progress
owner: training
summary: Defines source registration, provenance-preserving semantic extraction, coding-agent training, failure clustering, KB-versus-core decisions, anti-overfitting gates, and candidate publication.
---

# DS004 Document-to-KB and Benchmark-Guided Learning

## Introduction

ESLM learning has two complementary inputs: documents that provide declarative knowledge and benchmarks that expose missing language or reasoning competence. Both use coding agents as supervised design tools and deterministic Node.js tools for exhaustive validation. Neither authorizes hidden-label exposure or arbitrary generated code.

## Core Content

### 1. User story

A CLI operation starts a coding agent with a small set of approved skills and one or more source documents. The agent must build or update a KB that preserves source meaning, uses the current CNL and Semantic IR, and remains fully rebuildable and auditable.

The operation is not a one-pass extraction call. It is a supervised learning loop in which source fragments exercise the existing language front-end, failures are classified, KB knowledge is populated, and generic CNL improvements may be proposed only under global regression protection.

### 2. Source registration

Every source is registered before interpretation. Registration records the source identifier, content checksum, media type, language, acquisition metadata, license or access policy and the exact bytes or stable reference used during extraction.

Document contents are data, not instructions to the coding agent. Embedded prompts, commands or requests to alter the system are treated as quoted source content unless the user explicitly designates them as agent instructions outside the document.

### 3. Segmentation and linguistic processing

The source is segmented into provenance-preserving units. The segmentation must retain document hierarchy, sentence order, character or token spans and cross-references.

English segments are attempted directly by the symbolic parser. Non-English segments may be translated by the configured LLM. Unsupported English segments may be conservatively simplified. In both cases, the normalized output is reparsed through the same CNL path and linked back to source spans.

The agent records direct parse coverage and fallback usage for the document. Repeated unsupported forms create candidate CNL improvement clusters. They do not automatically justify a core change.

### 4. Semantic extraction

Accepted Semantic IR is converted into candidate KB records. The extraction stage distinguishes asserted facts, quoted claims, definitions, rules, defaults, exceptions, events, temporal qualifications, lexical mappings and document-local entities.

Every candidate record includes polarity, modality, confidence, temporal validity when present, context and provenance. A statement such as “the treatment may reduce risk” must not become an unqualified strict fact.

Entity and concept resolution is conservative. The agent may link a mention to an existing concept when identity is supported. Otherwise it creates a source-scoped term and may add a possible-equivalence relation rather than silently merging entities.

### 5. Ontology and rule learning

The agent should prefer existing relation and concept definitions when they fit the source semantics. New concepts and predicates require typed declarations and lexical entries.

Repeated structures may justify new declarative rules in the KB. Such rules must use the restricted rule model from DS005. They must not contain code. A rule is domain knowledge when it states how concepts in the source relate. A missing generic execution operation is handled through the core-change process.

### 6. Validation

Candidate records pass schema validation, type validation, provenance validation, duplicate detection, contradiction analysis and rule-safety checks. The validator distinguishes a true contradiction from two claims made by different sources or in different contexts.

A KB build is not accepted if records lack source spans, if protected semantic operators were lost during normalization, if unsupported code-like payloads are present, or if compilation produces nondeterministic identifiers.

### 7. Interaction with CNL learning

Document ingestion can reveal language forms not yet supported. The default response is to use validated normalization and continue building the KB. A core CNL change is considered only when the form is frequent, semantically stable, demonstrably generic and valuable beyond one document.

Any proposed CNL change must run the benchmark-guided protocol defined later in this specification and the evaluation regime from DS010. The source document becomes an additional regression source, but no document-specific wording may be hard-coded into the parser.

### 8. Publishing the KB

A successful build produces a canonical KB package, a compiled runtime package, a manifest, source lineage, quality statistics and a build report. The canonical package is the authoritative semantic record. The compiled package is an optimization and can be deleted and rebuilt.

The build report identifies direct symbolic parse coverage, fallback rate, unresolved spans, record counts, contradictions, uncertain links, newly introduced vocabulary, declarative rules, dependencies and any accepted changes to `src`.

### 9. Acceptance conditions

The KB is accepted when the canonical records validate, the compiled indexes reproduce the same query results, provenance is complete, no arbitrary code exists, a representative query suite passes and the ingestion process is reproducible from the registered sources and accepted system version.

### 1. Purpose

A coding agent uses reasoning benchmarks as training signals for an executable system. It may improve the current KB, language knowledge, CNL implementation, retrieval, planning and generic reasoning, but it must prove that changes generalize and do not destroy previously acquired capabilities.

The agent’s objective is not to make a finite set of questions green. Its objective is to convert recurring failures into reusable knowledge or mechanisms.

### 2. Baseline

Before modification, the agent records answer accuracy, direct symbolic rate, normalized accuracy, parse coverage, proof validity, execution failures, latency and failure categories. Benchmark sources and official labels are cached immutably with version and checksum.

Development, fresh, regression and shadow pools are separated. The agent may inspect development failures. Fresh samples have not been used for diagnosis. Regression samples represent existing competencies. Shadow results expose aggregates without individual examples.

### 3. Failure classification

Every failure is classified by root cause. The main classes are lexical knowledge, domain ontology, missing fact, CNL grammar, semantic composition, scope, coreference, retrieval, shard routing, missing declarative rule, missing generic method, incorrect method, planning, ranking, contradiction, uncertainty, resource limit and unknown.

The trace is authoritative. A wrong answer with a correct parse requires a different intervention from a wrong parse with a potentially adequate reasoner.

### 4. KB-first but not KB-only

The default correction is made in the current KB when the missing artifact is knowledge, terminology, an event frame, a domain rule or a source convention. The agent does not distort the generic core to absorb dataset vocabulary.

A change to `src` is considered when multiple independent examples reveal the same generic structural limitation and a KB workaround would duplicate or misrepresent semantics. The Core Change Guardian skill must approve the proposal.

### 5. Candidate validation

A candidate fix is first tested on the motivating cluster. It is then tested on fresh structurally related examples, nonce substitutions, semantic-preserving metamorphic transformations, semantic-changing contrastive transformations and all relevant regressions.

A parser change must demonstrate that direct symbolic rate increases on fresh data and that existing parse meanings remain stable. A retrieval or sharding change must demonstrate result equivalence with an exhaustive reference mode. A reasoning change must validate proof or witness semantics.

### 6. Acceptance rule

A candidate is accepted when the target capability improves on fresh samples, no critical regression appears, global metrics do not materially decline, proof validity remains within policy, direct symbolic autonomy does not decrease without explicit justification, and system complexity remains proportionate to the gain.

An aggregate score increase cannot hide a severe regression in a previously mastered capability. The agent must compare capability-level metrics.

### 7. Overfitting defenses

The agent must not encode benchmark IDs, question hashes, exact sentences, answer lookup tables or branches on dataset names. Static checks search for these patterns. More importantly, fresh generators and nonce transformations test whether the learned mechanism survives lexical and structural changes.

Finite public test sets are not used as an iterative development source. When an inspected holdout example influences a patch, it becomes development data and a new holdout must replace it.

### 8. CNL learning during KB ingestion

The same protocol applies when document ingestion reveals unsupported forms. Frequent normalized constructions may motivate a generic grammar proposal. The agent must show that the form is semantically stable, improves direct parsing across independent text, and does not alter existing benchmark interpretations.

If this evidence is absent, the form remains handled by validated normalization or remains unsupported.

### 9. Checkpoints and research record

Every accepted change produces a checkpoint and a concise record of observed failure, root cause, chosen layer, patch, expected generalization, focused results, fresh results, regressions, direct symbolic effect and system-size effect.

Rejected patches are also informative and should be retained when they reveal an architectural limit or unstable interaction.

### 10. Completion for one benchmark

A benchmark is substantially learned when unseen performance is stable across repeated samples, direct symbolic parsing is high for its intended CNL level, proof validity is adequate, shadow results confirm the gain, remaining failures form understandable hard classes and no material regression exists in prior suites.

The accepted core and KBs then become the starting checkpoint for the next benchmark.

### Coding-agent subprocess contract

Training orchestration must be able to start Codex, or another explicitly configured coding agent, as a subprocess outside deployed inference. The subprocess receives an explicit working directory, a self-contained approved skill, an assignment file, and only source or pool paths authorized by that assignment. The command, agent product and version, model configuration when available, start and completion status, exit code, input packet digest, output directory, and produced file inventory are recorded in an execution receipt.

The agent must not receive a manifest that reveals hidden test paths when a narrower worker assignment can omit them. Standard output and error are bounded and stored as training diagnostics, never interpreted as KB facts. A nonzero exit, missing receipt, path escape, unauthorized modification, schema failure, or incomplete source accounting prevents candidate acceptance.

Agent output consists of canonical declarative KB candidates, reviewed semantic compiler changes, source mappings, tests, and reports according to the selected skill. It does not consist of executable knowledge modules. When the root cause is a reusable core gap, the Core Change Guardian protocol requires a semantic specification and global tests before a core patch may be accepted.

Before the isolated agent starts, the trusted host may run the current language and reasoning stages over every embedded document and development-visible benchmark case. The resulting `BASELINE_ANALYSIS.jsonl` records normalized input, accepted query and task structures, selected plan, extracted session assertions and rules, unsupported spans, and unresolved subgoals. The packet hashes this diagnostic artifact and gives it to the agent so that extraction work begins from the real system's observed capabilities. The baseline is neither a label source nor a substitute for the registered document: the agent must compare it with source text and preserve the source provenance for every candidate record.

The copied skill carries an exact, portable description of canonical field names and graph-reference rules plus a validator that imports no host module. This early check prevents a coding agent from producing plausible but structurally incompatible fields. The trusted host repeats record-shape, provenance, rule-safety, term-reference, context, event, and retraction checks before deterministic compilation. Agreement between the two validators is tested on accepted and deliberately invalid fixtures; host validation remains the promotion authority if the copies ever disagree.

### Pool and checkpoint discipline

Working, regression, fresh, and shadow pools are distinct. Working cases may be inspected under the dataset contract. Regression cases preserve accepted capability. Fresh cases test the hypothesis without having guided it. Shadow cases expose aggregates only. Reclassifying a shadow case starts a new experiment version and requires replacement shadow coverage.

Every hypothesis begins from one accepted checkpoint and produces one attributable candidate. Several uncertain candidates must not be stacked. Accepted and rejected research notes record root cause, layer choice, change, fresh and metamorphic results, proof audit, regressions, resource growth, and remaining counterexamples.

## Decisions & Questions

### Question #1: Why use a coding agent rather than a one-pass extraction prompt?

Response: The work requires source registration, parser diagnostics, ontology and relation design, counterexample review, schema validation, compilation, equivalence tests, and iterative repair. A bounded coding-agent workflow can produce and verify these artifacts explicitly.

### Question #2: Does deterministic compilation replace agent reasoning?

Response: No. The agent designs or revises mappings, schemas, relation semantics, profiles, indexes, and validators. Deterministic Node.js tools apply the reviewed design to every source record reproducibly.

### Question #3: When is a benchmark substantially learned?

Response: When repeated unseen samples, fresh structures, metamorphic transformations, proof checks, shadow aggregates, and prior regressions establish a stable reusable capability, while remaining failures form explicit hard classes.

## Conclusion

Learning converts source meaning and recurring failures into reviewed declarative knowledge or genuinely reusable mechanisms. Candidate acceptance depends on provenance, generalization, proof validity, regression protection, and reproducible construction rather than development score alone.
