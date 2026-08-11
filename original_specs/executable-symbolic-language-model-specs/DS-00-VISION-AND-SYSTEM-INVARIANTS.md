# DS-00 — Vision and System Invariants

## 1. System identity

The target system is an executable symbolic language model. It is not a statistical next-token model and it is not a wrapper that delegates reasoning to an LLM. It is a runtime that accepts linguistic instructions and contextual information, constructs explicit semantic representations, retrieves declarative knowledge, plans a reasoning procedure, executes that procedure and produces a result with traceable justification.

The system is designed to approach a useful subset of the functional behavior associated with a language model. It must receive heterogeneous instructions, facts and questions rather than only a fixed query language. It must attempt to understand the request, identify the required knowledge and methods, decompose the task when necessary and detect when the requested capability is absent.

The central research hypothesis is that a substantial region of language understanding, general knowledge and reasoning can be represented as reusable executable mechanisms plus declarative knowledge, and that a coding agent can enlarge this region by turning benchmark failures into carefully tested improvements. The purpose of the architecture is not to assume that this hypothesis is true in every domain. The purpose is to make the boundary measurable.

## 2. Existing architectural assumption

Reusable executable behavior already belongs in `src`. This includes the CNL parser, semantic composition, inference engines, search algorithms, planners, confidence propagation, contradiction handling, provenance processing and the runtime interfaces needed by all KBs.

Knowledge bases are independently generated and independently versioned data products. The runtime may register any number of KBs and may use several in the same task. A KB does not own a private runtime and cannot silently replace the semantics of the generic core.

This separation is the primary architectural invariant. It prevents each dataset from becoming a separate program and makes cross-benchmark regression meaningful.

## 3. Non-negotiable invariants

| Invariant | Required interpretation |
|---|---|
| Generic execution belongs in `src` | Algorithms and reusable language mechanisms are implemented once and tested globally. |
| KBs contain no arbitrary executable code | KBs are declarative and schema-validated. Rules are restricted data interpreted by trusted core operators. |
| Every accepted assertion has provenance | Facts, lexical mappings and learned rules identify their source, extraction path and version. |
| Every LLM output is untrusted | Translation or simplification must be reparsed and validated before use. |
| Direct symbolic parsing is attempted first | English input is not sent to the LLM merely because it appears complex. |
| No routing decision may create silent false negatives | Approximate relevance signals may rank shards, but safe exclusion requires exact or conservative evidence. |
| Core changes require global regression | A local benchmark gain cannot justify an untested change to reusable code. |
| Runtime uncertainty is explicit | The system distinguishes solved, unknown, ambiguous, inconsistent, unsupported and resource-limited outcomes. |
| Generated runtime artifacts are rebuildable | Indexes and binary shards can be regenerated from canonical KB records and manifests. |
| Correct answers do not excuse invalid traces | Where the task is deterministic, proof or execution validity is independently evaluated. |

## 4. System lifecycle

The lifecycle begins with source documents or benchmark examples. A coding agent uses a small set of skills to interpret these sources, exercise the existing CNL and reasoning core, classify failures and populate or improve a KB. When failures reveal a genuinely reusable missing language form or reasoning method, the agent may propose a change to `src`. Such a proposal is accepted only after focused tests, metamorphic tests, fresh samples and all relevant regression suites pass.

The resulting KB is compiled into immutable runtime shards and registered in a lightweight catalog. Registration does not imply that the facts are fully loaded into memory. At runtime the task is parsed, candidate concepts and methods are identified, relevant KBs and shards are selected, and additional shards are loaded only as the proof or search frontier expands.

The runtime must preserve the distinction between lack of knowledge and lack of method. If the relevant facts are absent, it reports missing knowledge. If the facts are present but no registered algorithm can solve the required subproblem, it reports a capability gap. If parsing is unsafe, it reports an interpretation problem or invokes the optional linguistic fallback under the constraints defined in DS-10.

## 5. Research data produced by the architecture

The system must retain the history necessary to study executable learning. Each substantial benchmark failure should be linked to the parse, selected KB records, attempted methods, result, diagnosis, patch and post-patch measurements. This creates a dataset of program repair and knowledge acquisition rather than merely a final score.

The most important longitudinal measurements are answer accuracy, direct symbolic parsing rate, proof validity, fresh-sample generalization, regression rate, KB growth, reusable core growth, dynamic loading cost and the distribution of honest failure statuses. These measurements reveal whether progress comes from better language understanding, better knowledge, stronger reasoning, broader fallback use or unsafe special casing.

## 6. Definition of success

Success is not defined as making every benchmark green. Success is defined as a stable expansion of the tasks that the system can parse, plan and solve without hidden neural reasoning, while preserving previously acquired capabilities and explicitly identifying remaining limits.

A mature result should make it possible to state which competencies became generic code, which remained declarative knowledge, which required optional linguistic normalization, which scaled to fresh structures and which still exceeded the available algorithms or knowledge.
