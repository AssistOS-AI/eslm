# DS-03 — Benchmark-Derived CNL Requirements

## 1. Purpose

The benchmark suite serves two roles. It measures reasoning and it defines the minimum language constructions that the symbolic front-end must eventually support. The CNL should not attempt to implement unrestricted English in advance. It should acquire forms in a curriculum whose semantic obligations are testable.

The table below consolidates the benchmark families discussed for the project. Benchmark adapters must preserve the official task semantics while translating dataset records into the common runtime task contract.

| Benchmark family | Mandatory CNL and semantic support |
|---|---|
| bAbI | Simple declaratives, locations, movement, possession, conjunction, yes/no and WH questions, pronouns, temporal order, counting, negation and state updates. |
| LogicBench and IIBench | Atomic propositions, categorical forms, universal and existential quantification, implication, conjunction, disjunction, explicit negation and non-monotonic or default formulations where present. |
| RuleTaker and ProofWriter | Unary and binary facts, universally quantified rules, conjunctive antecedents, negated facts, open-world unknown, query propositions, proof depth and proof traces. |
| PrOntoQA | Class membership, taxonomic implication, nonce predicates, multi-hop rule composition and proof planning over synthetic worlds. |
| LogicSkills | Natural-language symbolization, categorical and relational FOL, validity, invalidity and countermodel-oriented structures. |
| FOLIO and ProverQA | Richer human or generated FOL surface forms, nested quantification, relational predicates, complex coordination, negation scope, embedded clauses and multi-clause premises. |
| CLUTRR | Named entities, kinship predicates, gender and possession cues, binary-relation chains, genitives, pronouns and systematic composition beyond observed chain lengths. |
| StepGame and spatial benchmarks | Left, right, above, below, diagonals, inside, contains, directional variants, multi-hop spatial composition, entity references and distractors. |
| SLR-Bench | Relational, arithmetic and recursive rules, variables, sequences, ordering, numbers, latent transformations and difficulty levels that scale systematically. |
| SATBench | Conditions, conjunction, disjunction, negation, exclusive alternatives, assignments, equality, inequality and constraints requiring search. |
| ZebraLogic | Ordinals, positions, adjacency, exactly-one, one-to-one assignments, comparisons, exclusions, ordering and combinatorial constraint language. |
| Defeasible NLI | Defaults, exceptions, strengthening and weakening evidence, contradiction, retraction and graded support. |
| ART or alphaNLI | Events, state transitions, temporal continuity, causality, plausible explanations and alternative hypotheses. |
| CommonsenseQA | Conceptual relations involving use, purpose, location, property, cause and effect, expressed through short natural questions and options. |
| SocialIQA | Event roles, intentions, desires, emotions, effects on actors, social expectations and purposive or causal questions. |
| PIQA | Goals, actions, tools, materials, physical properties, affordances, means and alternative procedures. |
| WinoGrande | Pronouns, agreement, semantic-role compatibility, causal clauses, comparative properties and commonsense-sensitive reference resolution. |
| ReClor and LogiQA | Complex conditionals, quantified argumentation, necessity and possibility, exceptions, ordering, discourse relations, multiple entities and long question contexts. |

## 2. CNL capability stages

The first stage supports atomic statements, class membership, properties, binary relations, simple events and direct questions. This stage should cover much of bAbI and the simplest synthetic logic tasks.

The second stage adds universal and existential quantification, categorical negatives, conjunction, disjunction, implication, equality, inequality and explicit open-world status. This stage targets LogicBench, IIBench, RuleTaker, ProofWriter, PrOntoQA and major portions of LogicSkills.

The third stage adds event roles, possession, reference, temporal order, spatial relations and state change. This stage targets bAbI state tasks, CLUTRR, StepGame and related spatial benchmarks.

The fourth stage adds cardinality, exactly-one, at-least, at-most, exclusive alternatives, adjacency, ordinal positions and assignment constraints. This stage targets SATBench, ZebraLogic and parts of SLR-Bench.

The fifth stage adds defaults, exceptions, probability-like modalities, causal tendencies, intentions, reactions, affordances and abduction. This stage targets Defeasible NLI, CommonsenseQA, SocialIQA, PIQA and alphaNLI.

The final stage grows richer surface realization: relative clauses, embedded clauses, nested quantifier scope, complex coordination and discourse-level reference. This stage is driven by FOLIO, ProverQA, WinoGrande, ReClor and LogiQA.

## 3. Benchmark routing

Routing must never be based solely on benchmark name. Every input is attempted symbolically. Benchmark metadata may configure answer schemas and official validators, but it must not select a privileged parser or solver.

Adapters may declare the expected answer domain, such as entailed, contradicted and unknown, or a fixed set of multiple-choice labels. They may not encode benchmark answers or bypass the common Semantic IR and planner.

## 4. Benchmark use during training

Controlled and generative benchmarks should drive early learning because their failures are diagnosable. Human-written benchmarks should initially function as transfer tests and later as controlled sources of language-front-end failures.

The agent must not repeatedly optimize against a finite public test split. It should use official training or development records, generated fresh instances where available, metamorphic derivatives and hidden local holdouts. Public test results are reserved for infrequent transfer evaluation.

## 5. Mandatory measurements

Each benchmark report must separate direct symbolic parsing coverage, LLM translation usage, LLM simplification usage, unparsed rate, answer accuracy, proof validity where applicable, metamorphic consistency, fresh-sample accuracy, reasoning-depth curves and regression effects on previous suites.

The most important language-learning curve is the joint evolution of direct symbolic rate and answer accuracy. Higher accuracy accompanied by lower symbolic autonomy is not accepted as unqualified progress.
