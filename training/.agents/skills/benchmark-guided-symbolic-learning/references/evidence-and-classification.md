# Evidence and classification rules

## Contents

1. Evidence boundary
2. KB versus core decision
3. Failure taxonomy
4. Anti-memorization rules
5. Generalization and metamorphic checks
6. Uncertainty and trace validity

## Evidence boundary

Start from an explicit dataset contract. Record which split is train, development, public test, hidden test, fresh generator, and shadow. Development labels may be inspected only when authorized. Hidden and shadow labels are never agent-visible merely because a local path exists.

Baseline evidence must preserve the exact dataset version, adapter version, model checkpoint, KB selection, seed, case inventory digest, runtime configuration, and execution environment. Store raw failures and traces outside generated model code.

## KB versus core decision

Use this test first:

> Would the mechanism remain useful if every dataset-specific entity, word, event, relation, and label were renamed?

If no, place it in the current KB. Typical KB content includes a dog taxonomy, knife purpose, purchase/buy lexical relation, dataset meanings of containment, event frames, source-specific defaults, ontology rules, and aliases.

If yes, consider the core only after the same structural defect appears in multiple independent examples. Typical core content includes negation scope, candidate-preserving coreference, temporal state supersession, exception-capable defaults, recursive relation composition, confidence propagation, contradiction representation, quantifiers, constraint propagation, and search.

Reject a core proposal when a dataset ontology can express the behavior cleanly, evidence comes from one case, the mechanism embeds source vocabulary, or the benefit is only an aggregate score increase.

## Failure taxonomy

Classify at the earliest incorrect stage:

| Stage | Typical clusters |
| --- | --- |
| Language | tokenization, spelling, lexical normalization, construction, semantic role, coreference, negation, quantifier, ambiguity |
| Knowledge | unknown concept, missing fact, ontology gap, alias, event frame, world scope, temporal or spatial qualifier |
| Reasoning | missing rule, wrong rule, composition, temporal update, causality, default/exception, contradiction, confidence |
| Planning/retrieval | wrong KB, wrong shard, missing posting, candidate pruning, depth budget, executor selection |
| Output | answer ranking, epistemic label, realization, proof rendering, abstention |
| Runtime | import, memory, timeout, malformed source, nondeterminism, stale index |

One visible failure may have several downstream symptoms. Cluster by the first shared cause, retain secondary tags, and record representative and counterexample cases.

## Anti-memorization rules

Forbidden candidate behavior includes exact-sentence branches, input or question hashes, benchmark row IDs, answer tables, index-specific choices, and special entity behavior justified only by benchmark occurrence.

Allowed learning abstracts repeated evidence into a fact with legitimate provenance, ontology relation, lexical mapping, construction, event frame, domain rule, default, or generic algorithm. A source fact that happens to answer a benchmark question is allowed only when it belongs to the declared KB and exposure is reported.

## Generalization and metamorphic checks

For every learned pattern, vary superficial features while preserving structure: entity names, nonce nouns, locations, sentence order, active/passive voice, synonymous predicates, pronouns, distractors, and canonical versus natural phrasing. The proof relation and answer should remain equivalent when meaning is preserved.

Also create meaning-changing pairs: reverse before/after, exchange agent and patient, insert negation, change containment direction, replace a premise, or add a specific exception. The answer or proof must change where semantics changes.

If a fix passes only the original wording, classify it as overfit even when benchmark score improves.

## Uncertainty and trace validity

Maintain separate states for entailed, normally true, likely, possible, unknown, contradicted, ambiguous, and unsupported. A missing assertion is not false in an open-world KB. A typical social effect is not necessary. A contradiction is not resolved by silently dropping one source.

Audit semantic parse, retrieved facts, selected rules, intermediate values, proof graph, confidence, and final realization. Correct answers reached through invalid steps are failures. Incorrect answers with correct semantics but wrong ranking belong to ranking, not parsing or knowledge.
