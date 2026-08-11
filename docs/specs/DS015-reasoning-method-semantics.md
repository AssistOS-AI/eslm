---
id: DS015
title: Reasoning Method and Provider-Coordination Semantics
status: in-progress
owner: reasoning
summary: Defines executable reasoning and provider-coordination semantics, declared completeness boundaries, witnesses, and failure behavior without coupling them to benchmark identities.
---

# DS015 Reasoning Method and Provider-Coordination Semantics

## Introduction

This specification is the single normative location for the semantics of generic reasoning methods registered by ESLM
and trusted provider-coordination surfaces that execute outside planner registration. DS008 defines task frames,
planning, method selection, traces, and results; this specification defines what each selected executor computes. A new
benchmark may exercise these semantics without changing this contract. A new method or semantic change updates this
specification, its capability descriptor when registered, focused tests, metamorphic tests, and explanatory reasoning
documentation together.

## Core Content

### Method registration contract

Every executable method has a stable `methodId`, typed inputs and outputs, explicit preconditions, a soundness statement, a completeness statement, uncertainty semantics, a witness kind, a cost model, and an implementation version. The descriptor is not executable authority and does not prove that the implementation satisfies its claim. Registration must bind the descriptor to a trusted executor, and tests must independently validate its positive, negative, boundary, and renaming behavior.

A method receives semantic structures, not a benchmark name, source path, record identifier, answer position, expected value, or dataset-specific surface token. A source adapter may compile a documented external representation into a method's typed input. A KB may supply facts, relation algebras, default priorities, lexical frames, or other validated policy data. Neither may insert a hidden alternate solver.

DS009 is the sole top-level status authority. Method sections here define when one of those statuses applies and may add
method-specific witness fields or semantic values; they cannot silently create an unclassified runtime status.

### Exact retrieval

`method:core:indexed-lookup` evaluates a ground or partially bound query atom over selected typed assertions. It intersects the smallest available predicate and argument postings, verifies every candidate record against the complete query, and returns semantic values with direct record references. It is sound for exact matching records and complete only for the shards proven relevant by the exact routing contract in DS020. A cache miss or an unexpanded routing frontier cannot be reported as logical absence.

The witness contains the query atom, matched record identifiers, package versions, shard and block identifiers, contexts, qualifiers, and provenance references. Lexical resemblance does not create a match. Synonymy, taxonomy, rules, and alignments contribute only through separately declared records and methods.

### Safe Horn deduction

`method:core:safe-horn-deduction` computes the least fixed point of positive, range-restricted Horn rules over a finite active domain. Every variable in a rule head must occur in a positive body atom. The engine indexes body atoms, joins substitutions deterministically, emits a ground conclusion only after all body atoms match, and repeats until no new fact is produced or a declared round or resource bound is reached.

For the supported fragment, the least fixed point is independent of rule and fact insertion order. Each derived atom carries a rule-derivation graph whose leaves are accepted assertions and whose internal nodes identify the rule and substitution used. Negation as failure, function symbols, unsafe existential heads, unrestricted recursion through negation, and probabilistic implication are outside this method. Exhausting an execution bound returns `RESOURCE_LIMIT`; it cannot be interpreted as non-entailment.

### Configured induction

`method:core:configured-induction` evaluates a finite property-generalization policy supplied as declarative knowledge. The policy identifies the predicate, admissible property domain, minimum support, minimum coverage, counterevidence behavior, whether an implicit question may trigger induction, and the selection rule. The executor counts observed supporting and conflicting class members and returns a ranked hypothesis only when the declared gate is satisfied.

### Finite conjunctive rule induction

`method:core:finite-conjunctive-rule-induction` learns one safe unary-head rule from finite positive and negative examples represented as typed N-ary ground facts. The core receives no source identifier, curriculum level, reference program, answer label, or vocabulary with special meaning. A task declares its target predicate, a root entity for every example, the positive or negative classification, entity-versus-value term kinds, and explicit limits for examples, facts, arity, variables, body literals, candidates, and relational-match steps.

The search starts from facts connected to the root of the smallest positive example. It enumerates connected fact subsets in increasing body length, canonicalizes variables by first structural occurrence, canonicalizes literal order, and deduplicates alpha-equivalent hypotheses. Constants may enter a rule only as typed values already present in positive evidence; entity names become variables. A candidate is accepted only when relational join evaluation finds a root-preserving binding in every positive example and an exhaustive bounded search proves that no binding exists in every negative example. Shortest body length and canonical structural order determine the result; source order, example order, fact order, identifier spelling, and benchmark metadata cannot break ties.

The solved witness records one complete variable binding and one supporting fact for every body literal in every positive example. For every negative example it records completion of the match search with no satisfying binding. Verification reruns canonical induction, replays the joins, and compares the complete rule and evidence rather than trusting the proposed rule text. `UNKNOWN` means the declared hypothesis space was completely explored without a separator. `RESOURCE_LIMIT` means one declared search bound was reached; the source case remains accepted and remains in every evaluation denominator. `UNPARSED` is reserved for malformed typed tasks.

The method is sound for returned positive conjunctive rules under finite conjunctive-query semantics. It is complete only for connected hypotheses within its declared bounds. It does not implement negation, inequality, quantifiers, aggregation, extrema, arithmetic, unrestricted Horn programs, or recursive induction. Those operators require distinct typed hypothesis languages and verification semantics rather than being inferred from source syntax.

### Finite episodic-world orchestration

`method:core:finite-episodic-world` executes a finite ordered episode expressed as typed operations and one typed query. It is an orchestration method: it gives one validated task a shared state and witness vocabulary across discrete locations, possessions, sets, event roles, graph edges, vector relations, paths, ordering, counting, class membership, and source-declared induction or motive policy. It does not replace the narrower temporal, container, vector, extent, or relation-algebra methods. Those remain preferable when a task already has one specialized representation and proof calculus.

The adapter owns external sentence patterns, source vocabulary, source-local coreference, and declarative policy construction. The core sees only semantic identifiers, ordered operation identifiers, typed arguments, relation inverses, relation-to-vector mappings, transitive-relation declarations, induction selection policy, and motive-to-goal declarations. It contains no task-family switch, benchmark name, story number, source row, support-line identifier, expected answer, or answer-position preference.

Execution folds ordered state-changing operations into finite maps and sets, while immutable relation and event operations remain provenance-bearing graph or event evidence. A query selects one generic operation: latest or preceding state, membership, relation count, set contents, event-role projection, edge closure, vector composition, path construction, order comparison, declared property induction, motive goal, or event cause. Only declared inverses, transitive relations, vectors, induction rules, and motive rules may contribute. Identifiers and relation names are otherwise uninterpreted data.

Every result contains the complete semantic value set and the operation identifiers used to derive it. `verifyEpisodicWorldResult` validates the task again, reconstructs the episode, recomputes the value set and status, checks that every witness identifier belongs to the task or declared policy, and rejects altered values or references. A single value returns `SOLVED`. Several distinct values satisfying the same visible event-role constraints return `AMBIGUOUS`; insertion order and recency may not silently select one unless the typed query declares such a selector. No determined value returns `UNKNOWN`. Malformed operations return `UNPARSED`; operation-count, identifier, or path-depth exhaustion returns `RESOURCE_LIMIT` without dropping the case.

The method is sound and complete for accepted finite operations within the declared bounds and policies. It does not claim unrestricted discourse understanding, interval logic, metric geometry, causal discovery, probabilistic inference, or open-ended planning. Its breadth comes from composing small typed operations under one finite episode, not from treating raw text or benchmark metadata as executable semantics.

The output is explicitly inductive. It does not become a strict class rule, and a later counterexample may defeat it. The method cannot infer the policy from benchmark answer frequencies, file order, or evaluation labels. Renaming the predicate, class, entities, and values while preserving the policy must preserve behavior.

### Guarded abduction

`method:core:guarded-abduction` proposes premises that would explain an observed atom through rules explicitly authorized for abductive reversal. It unifies the observation with a rule conclusion, constructs the missing premise candidates, rejects candidates that violate declared types or conflict constraints, and ranks the bounded surviving hypotheses under an explicit policy.

An abductive result is a possible explanation, not a proof that the hypothesis is true. Its witness identifies the observation, reversed rule, substitution, proposed premises, supporting evidence, conflicts, and ranking contributions. General causal discovery, arbitrary rule reversal, and answer-directed hypothesis generation are outside the contract.

### Discrete temporal predecessor

`method:core:temporal-state-predecessor` operates on an ordered history of observed discrete states for one entity. It compresses consecutive duplicate states, locates the requested observed boundary state, and returns the immediately preceding distinct state together with the adjacent event pair. Movement and possession compilers may record state changes for a carried object, but the method itself consumes the resulting typed history rather than source verbs.

The method is sound and complete for the retained ordered history. It is not an interval algebra: it does not infer durations, concurrency, missing events, absolute timestamps, or causal order. A boundary that is absent or has no predecessor returns an explicit gap rather than the closest lexical match.

### Finite relation-state transitions

`method:core:container-state-transitions` executes a validated `finite-relation-state-program-v1`. The input contains an initial finite relation and an ordered sequence of typed `add`, `remove`, and `transfer` operations. Each operation has set semantics: add inserts declared values, remove deletes declared values, and transfer moves the complete declared source set to the destination under the program's relation policy. The result is the final sorted value set for the queried subject plus the ordered transition trace.

Malformed identifiers, unknown operators, incompatible relations, impossible list shapes, and exceeded subject, value, or transition bounds fail visibly. Surface verbs and benchmark container names are adapter concerns. The executor must behave identically for fully renamed subjects, values, and relation identifiers.

### Typed relation algebra

`method:core:typed-relation-algebra` consumes a finite typed graph, endpoint features, a declarative relation algebra, and query endpoints. The algebra declares relation classes, reciprocal inverses, valid binary compositions, and optional refinements from a semantic class to an output relation. The method first adds only declared inverse edges. It then performs bounded breadth-first search over simple path states, composes relation classes under every relevant binary parenthesization, and retains an ordered path and composition-tree witness.

Only a declared composition can create a derived class. Endpoint features may refine that class when the algebra explicitly requires them. Missing refinement evidence returns `UNKNOWN`; several compatible refinements return `AMBIGUOUS`; conflicting features or incompatible shortest derivations return `INCONSISTENT_CONTEXT`. The method is complete only for shortest simple paths and compositions inside the declared graph and bounds.

### Spatial vector constraints

`method:core:spatial-vector-constraints` consumes a finite graph of typed spatial difference constraints and a declarative vector system. The vector system declares one to eight abstract dimensions and maps relation identifiers to exact safe-integer displacement vectors. Output relations additionally declare which sign vector they classify. Dimension and relation names are semantic identifiers; the method contains no built-in vocabulary for left, north, above, or a benchmark label.

For an asserted fact `subject relation object` with relation vector **v**, the constraint is **position(subject) − position(object) = v**. The method adds the algebraic inverse edge with displacement **−v**, fixes the query object at the zero vector, and performs deterministic breadth-first propagation through the query-connected component. Traversing an edge adds its exact displacement. A second path to an established entity must produce the same coordinate; otherwise the result is `INCONSISTENT_CONTEXT` with the established path and conflicting edge.

The query displacement is `position(subject) − position(object)`. Exact magnitudes are preserved while constraints are propagated. Only after the displacement is known does the method take the component-wise sign and look it up in the declared output map. No declared sign class returns `NO_APPLICABLE_METHOD`; a disconnected endpoint or a path outside the declared depth returns `UNKNOWN`; invalid task or vector schemas return `UNPARSED`; exceeded entity, fact, dimension, or path bounds return `RESOURCE_LIMIT`.

A solved witness is the ordered sequence of asserted or inverse edges from the query object to the query subject, together with the exact displacement and sign vector. `verifySpatialVectorResult` replays every edge against the original fact and vector declaration, rejects duplicate or discontinuous steps, recomputes the sum, and checks the declared output relation. The method is sound for exact integer difference constraints and complete for the query-connected component within the path-depth bound. It does not implement metric uncertainty, rotations, topology, non-linear geometry, or qualitative relations without a vector encoding.

### Spatial extent inequality closure

`method:core:spatial-extent-inequalities` accepts a finite set of typed spatial facts, a declarative relation system, query endpoints, and the explicit orthogonal policy `overlap-unmentioned-dimensions`. Each entity is represented by a start and end boundary on every declared dimension. The executor adds the intrinsic non-strict extent constraint `end(entity, dimension) ≥ start(entity, dimension)`. A positive directional fact adds `start(subject, dimension) ≥ end(object, dimension)`; a negative fact adds its converse. When a fact names no relation on another dimension, the accepted orthogonal policy adds both overlap constraints on that dimension. Relation identifiers, dimension identifiers, and polarities are declarative data and remain fully renameable.

The executor constructs a directed graph whose edge `u → v` means `u ≥ v`. A directional output is entailed only when graph reachability connects the corresponding subject boundary to the object boundary. It searches both polarities on every dimension. If both are reachable, the context is inconsistent. If neither declared direction is entailed on any dimension, the result is `UNDERDETERMINED`. Otherwise the method returns every entailed output relation in deterministic order, not merely the first relation or one benchmark-preferred label.

Every returned relation carries one replayable inequality path. Its edges identify either an entity's well-formed extent, a declared directional separation, or an overlap constraint introduced by the explicit orthogonal policy. The independent verifier reconstructs the graph from the original task, re-derives the complete output set, and checks every path edge and order. Bounds on dimensions, facts, entities, and graph edges return `RESOURCE_LIMIT`; invalid schemas return `UNPARSED`. The method is sound and complete only for directional separation entailed by this finite non-strict inequality graph. It does not implement metric geometry, arbitrary topological relations, disjunction over spatial configurations, or every calculus for extended regions.

### Declarative qualitative relation closure

`method:core:declarative-qualitative-relation-closure` consumes a finite relation graph and a separately validated relation system. The system declares relation identifiers, one reciprocal inverse for every relation, which relations are observable outputs, ordered binary composition rules of the form `left ∘ right → {result...}`, mutually exclusive output groups, and deterministic output order. Relation names carry no built-in geometry. A system may describe directions, topology, containment, temporal relations, kinship-like relations, or a nonce algebra if its declarations satisfy the same schema.

The executor initializes the graph with every asserted relation and its declared inverse. It then computes the least fixed point of the declared binary rules. If `(a, r₁, b)` and `(b, r₂, c)` are present, only a rule whose inputs are exactly `(r₁, r₂)` may add `(a, r₃, c)`, and it may add only the rule's declared results. The work queue is semi-naive: each accepted relation is processed once as the newly added left or right premise, while duplicate triples are discarded. This yields completeness for the finite least fixed point, subject to the declared relation, rule, entity, fact, derivation, and proof-depth limits.

Every derived triple stores a tree. An asserted leaf names an accepted source fact. An inverse node reverses the endpoints and uses the reciprocal relation declared by the system. A composition node names the rule, intermediate entity, two premise trees, and resulting triple. A solved query returns every output-enabled relation between its endpoints in the declared order and one tree per value. The verifier recursively replays each tree and independently recomputes the complete query closure, so it rejects both unsupported outputs and omitted outputs.

An endpoint with no accepted evidence or a fixed point with no output relation returns `UNKNOWN`. Simultaneously entailed relations in a declared exclusive group return `INCONSISTENT_CONTEXT`. Invalid schemas return `UNPARSED`; an exhausted bound returns `RESOURCE_LIMIT`. The method does not infer an inverse, transitivity, symmetry, containment lifting, or metric property from a relation's spelling. Such behavior exists only when a reviewed declarative system supplies the corresponding rule. This separation permits source-specific calculi without benchmark-specific branches in the executor.

### Finite classical entailment

`method:core:finite-entailment` accepts a validated formula AST over a bounded set of semantic atoms with `not`, `and`, `or`, and `implies`. It enumerates truth assignments in deterministic atom order, keeps the assignments satisfying every strict premise, and evaluates the query in every premise model. The query is entailed when every premise model satisfies it. It is not entailed when at least one concrete countermodel satisfies the premises and falsifies the query.

Both outcomes are solved Boolean decisions and include a finite-model witness. When no assignment satisfies the premises, the method returns `INCONSISTENT_CONTEXT` rather than using explosion. An atom or assignment bound produces `RESOURCE_LIMIT`, not a sampled result. A source adapter may soundly ground a controlled finite-domain formula before calling the method, but the method does not thereby become an unrestricted first-order theorem prover.

### Scalable Boolean entailment

`method:core:scalable-boolean-entailment` accepts the same validated finite propositional formula operators plus explicit search budgets and an explicit inconsistency policy. It decides whether the conjunction of the premises and the negation of the query is satisfiable. Formula identity is structural, conjunction and disjunction operands are canonicalized for deduplication, and semantic atom identifiers are data rather than control-flow selectors.

The method compiles subformulas to equisatisfiable conjunctive normal form by a deterministic Tseitin transformation. Every non-atomic subformula receives one auxiliary Boolean variable and clauses that enforce equivalence between that variable and the encoded operator. Premises become positive unit clauses. The solver performs unit propagation, detects empty unsatisfied clauses, selects an unassigned variable by deterministic unresolved-clause occurrence count, and recursively explores both truth values. Explicit bounds cover semantic atoms, total CNF variables, clauses, and search nodes. Crossing a bound returns a witnessed `RESOURCE_LIMIT`; it never permits dropping a source case or reducing an evaluation denominator.

The complete premise set is checked for satisfiability before query-directed reduction. This check is mandatory because an inconsistent disconnected premise component would otherwise be omitted even though it changes classical entailment. For a consistent context, the method computes the transitive incidence closure starting from query atoms: a premise enters the cone when it shares an atom with the cone, and every atom in that premise then enlarges the cone. Premises outside the fixed point are propositionally disconnected. The method searches the cone conjoined with the negated query. A satisfying assignment is combined with the complete-context model and independently checked against every original premise and the query before it becomes a countermodel.

An unsatisfiable negated-query search returns `entailed: true` with a deterministic DPLL split-and-conflict certificate and the CNF digest. A satisfiable search returns `entailed: false` with a complete semantic countermodel. An inconsistent full context normally returns `INCONSISTENT_CONTEXT` with its own replayable certificate. A task may explicitly select `classical-explosion` when its documented calculus treats inconsistency as entailing every formula; in that case the solved result retains the same inconsistency certificate and labels the inference as explosion. The default never infers this policy from a benchmark, source, or answer.

`verifyBooleanEntailmentResult` recompiles the input independently. It replays every unit-propagation conflict and both branches of every split in an unsatisfiability certificate, or evaluates every original premise and the query under a returned countermodel. Result correctness therefore does not depend on trusting the search procedure's final Boolean. The method is sound and complete for finite propositional semantics unless an explicit resource bound is reached. It is not CDCL, clause learning, unrestricted first-order resolution, equality reasoning, or proof-text equivalence.

### Finite first-order countermodel construction

`method:core:finite-first-order-countermodel` accepts a validated, function-free first-order argument and a finite nonempty domain. Formula nodes contain predicates with fixed arity, terms, negation, conjunction, disjunction, exclusive disjunction, implication, biconditional, and universal or existential quantification. Predicate and term identifiers remain uninterpreted semantic data. The method does not infer arity, domain size, equality, unique names, or closed-world policy from source vocabulary.

Free constants need not denote distinct domain members. The method therefore enumerates every constant interpretation within an explicit constant-assignment budget. Under each interpretation, it expands a universal quantifier to a conjunction over the complete declared domain and an existential quantifier to a disjunction. Each ground predicate tuple becomes one reversible Boolean atom. The resulting premises and conclusion are submitted to `method:core:scalable-boolean-entailment`; a satisfying model of the premises and negated conclusion is decoded into total extensions for every declared predicate.

The decoded structure is not trusted merely because the SAT layer returned it. `verifyFiniteFirstOrderCountermodel` recursively evaluates the original first-order AST under the returned constant assignments and predicate extensions. It accepts only when every premise is true and the conclusion is false. The verifier also requires every constant to denote a domain member, every declared predicate to have one extension of the correct arity, and every tuple member to belong to the domain.

`NO_COUNTERMODEL_IN_DECLARED_DOMAIN` means that the bounded domain and completed search yielded no counterexample; it is not an unrestricted validity result. `RESOURCE_LIMIT` means a declared constant-assignment or Boolean search bound prevented completion. The method is sound for returned countermodels and complete for the declared finite domain only when no resource bound is reached. It does not provide an unbounded first-order validity theorem, function symbols, equality, or a finite-model property for arbitrary formulas.

### Skeptical preferred entailment

`method:core:preferred-entailment` uses the same finite strict formula semantics and adds explicitly prioritized defaults. For every strict-premise model, it determines which defaults are applicable and violated, constructs a penalty vector ordered from highest to lowest declared priority, and retains all models with the lexicographically minimum vector. The query is skeptically true when every preferred model satisfies it and skeptically false when none does. Disagreement among equally preferred models returns `UNDERDETERMINED`.

The witness records priority order, minimum penalty vector, preferred-model count, inspected assignments, and supporting, defeating, or disagreement models. Insertion order and source filenames cannot break a tie. This method implements one explicit preferential semantics; it does not claim equivalence to Reiter extensions, rational closure, argumentation frameworks, probabilistic defaults, or causal abduction.

### Bounded narrative continuation ranking

`method:core:bounded-narrative-continuation-ranking` compares explicit candidate event frames against a bounded narrative state. Structural features include participant continuity, newly introduced participants, pronoun resolvability, recent and global content bridges, predicate continuity, tense agreement, polarity conflict, specificity, and lexical novelty. Providers may contribute signed evidence under declared causal, goal, event, social, state, or contradiction families.

Every feature has a visible value, weight, contribution, and provenance reference. A candidate is selected only when its score exceeds the alternatives by the declared margin; the result remains `DEFEASIBLE`. A tie or insufficient margin returns `UNKNOWN`. Candidate position, story identifier, source sentence identity, and expected ending are not admissible features.

### Provider coordination surfaces

Semantic compatibility and factoid routing coordinate providers but do not themselves create world facts. Compatibility converts supported constructions into typed frames, applies only declared inverses and implications, and aggregates signed support or conflict with provider provenance. Factoid routing sends a typed question frame and conservative paraphrases to every selected provider, merges equal normalized value sets, returns `AMBIGUOUS` on disagreement, and returns a knowledge gap when no provider supplies evidence.

Feature-grammar preference is likewise a language decision surface. It compares two feature profiles under declarative construction-sensitive constraints. A strict preference requires a positive score difference; a tie is an abstention or failed preference according to the task contract. None of these surfaces may infer an answer from provider order or a benchmark label.

### Traditional categorical logic

`method:core:categorical-logic` operates on A, E, I, and O categorical propositions whose subject and predicate are typed term literals with explicit complement depth. A is universal affirmative, E universal negative, I particular affirmative, and O particular negative. Under the declared traditional square, universal propositions carry existential import; this is a policy of this method rather than a claim about every modern first-order interpretation of universal quantification.

Opposition judgment applies the complete declared truth-dependency table. Contradictories A/O and E/I cannot share a truth value; contraries A/E cannot both be true; subcontraries I/O cannot both be false; and subalternation propagates truth from A to I and E to O. A result may therefore be `True`, `False`, or `Undetermined`. The method first verifies that premise and candidate use the same typed term pair; lexical similarity cannot establish an opposition relation.

Immediate transformations are structural. Conversion exchanges subject and predicate, with A converted per accidens to I, E and I converted simply, and O rejected as invalid. Obversion reverses quality and complements the predicate for every form. Contraposition exchanges and complements both terms for A and O while E and I are rejected. Complement depth is semantic parity: two complements cancel during realization, but the input depth remains available to the witness. Invalid operations return their declared invalid result instead of fabricating a proposition.

For a two-premise syllogism, the method verifies exactly three atomic terms with one shared middle term. It enumerates every non-empty population of Boolean memberships over those terms, retains precisely the populations satisfying both premises and their declared existential commitments, and considers both endpoint orientations, both endpoint polarities, and all four categorical forms. It returns a conclusion only when that proposition is true in every retained population. The witness records atom order, retained-model count, chosen form, and existential-import regime. Zero premise models produce `INCONSISTENT_CONTEXT`; no common categorical consequence produces `UNDERDETERMINED`.

An adapter may preserve the original existential commitment of a documented meaning-preserving premise transformation. For example, contraposing `All S are P` yields `All non-P are non-S`, but traditional existential import remains attached to S, not silently reassigned to non-P. This metadata changes model constraints, not the requested answer. The core never receives a mood label, gold form, benchmark identity, or source row.

Categorical result equivalence is a separate deterministic closure over reversible immediate transformations: obversion for every form, simple conversion for E and I, and contraposition for A and O. Conversion per accidens and subalternation are entailments rather than equivalences and therefore do not enter that closure. If a task asks merely for an entailed conclusion, a universal conclusion and its particular subaltern may both be valid. A gold scorer that selects one without declaring the requested mood is not a total function of the visible rename-invariant structure; DS017 requires such cases to be reported rather than resolved from row identity or vocabulary.

### Generality and falsification tests

Every method requires alpha-renamed entities and predicates, nonce values, reordered premises or graph edges, irrelevant evidence, meaning-preserving transformations, and meaning-changing contrasts. A result that changes under irrelevant ordering or survives a semantic reversal is evidence of a defect. A patch that requires a benchmark name, record ID, expected answer, source row hash, or copied lexical constant is rejected regardless of score.

Witness validation is independent from answer validation. A correct label with an invalid path, state transition, proof graph, model set, or feature trace fails the method contract. Each method's claimed completeness is tested only within its declared semantic and resource bounds.

## Decisions & Questions

### Question #1: Why are method semantics separate from planning?

Response: Planning decides which typed transformation is applicable and affordable. Method semantics decide what that transformation means and what witness establishes its result. Keeping those contracts separate permits planner changes without redefining logic and method additions without rewriting the task-frame contract.

### Question #2: What evidence is required for a new generic method?

Response: A distinct semantic operation is added when existing methods cannot represent it without distortion, the operation remains meaningful under complete domain renaming, its uncertainty and completeness boundary can be stated precisely, and focused plus global tests validate its witness. A benchmark score alone is insufficient.

### Question #3: How should quantified theories beyond sound finite grounding be decided?

Options:

1. Add a query-directed first-order resolution or tableau method with explicit unification, variable standardization,
   equality policy, relevance pruning, proof objects, and completeness limits.
2. Extend finite-model construction with a declared domain-growth policy, returning countermodels when found and a
   bounded no-countermodel status without claiming unrestricted validity.
3. Implement both as separately named methods so proof search and model search retain different guarantees, witnesses,
   and resource behavior.

Selection requires substitution and proof traces, independently verified countermodels, sound handling of equality and
constants, equivalence with Boolean methods after valid finite grounding, scaling curves over development-visible
quantified theories, and nonce, reordering, irrelevant-premise, and meaning-changing controls. Until selection, ESLM
claims only the grounded finite-domain and propositional methods already specified above.

## Conclusion

Registered methods are small, typed semantic machines with explicit theory, limits, and evidence. Their contracts are independent of the datasets that first expose the need for them, and their witnesses make both correct execution and honest abstention reviewable.
