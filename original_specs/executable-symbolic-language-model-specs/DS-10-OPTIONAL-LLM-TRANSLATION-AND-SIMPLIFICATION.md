# DS-10 — Optional LLM Translation and Simplification

## 1. Architectural status

The LLM is optional and external to symbolic reasoning. It is invoked only when language detection identifies a non-English input or the CNL acceptance gate rejects an English construction that may be conservatively normalized.

The LLM cannot bypass the symbolic parser. Its output is untrusted text that must pass the same lexical, syntactic, semantic and operator-preservation checks as direct input.

## 2. Permitted behavior

The LLM may translate another language into English. It may split long sentences into shorter sentences, expand contractions, normalize punctuation, replace unusual syntax with a simpler equivalent, make an explicitly stated subject or object syntactically explicit, and convert active and passive forms when semantic roles are unambiguous.

It may preserve an unknown technical term or proper name unchanged. It may mark genuine ambiguity rather than resolving it.

## 3. Prohibited behavior

| Prohibited operation | Reason |
|---|---|
| Answering the question | This would hide neural reasoning behind the language front-end. |
| Deriving a logical consequence | Inference belongs to the symbolic reasoner. |
| Adding commonsense knowledge | Knowledge must come from registered KBs or explicit user context. |
| Removing distractors | Relevance selection may be part of the reasoning task. |
| Guessing an ambiguous pronoun | Coreference may be the benchmarked capability. |
| Strengthening or weakening quantifiers | This changes logical meaning. |
| Dropping negation or modality | This changes truth conditions. |
| Changing temporal order or relation direction | This changes the task semantics. |
| Converting a plausible outcome into a fact | Defeasible knowledge must remain defeasible. |

## 4. Invocation detector

The detector uses language identification, parser coverage, missing grammar forms, failed feature constraints, missing semantic actions, unresolved protected operators and ambiguity status. Complexity alone is not a trigger.

A sentence with nonce predicates may be directly parseable. A short idiomatic sentence may require normalization. Decisions are per input segment, not per benchmark name.

## 5. Protected anchors

Before accepting normalized text, the validator compares named entities, numbers, answer options, negation, quantifiers, modal operators, conditionals, temporal operators, disjunction, conjunction, comparatives and relation direction.

Loss or unexplained change of a protected anchor rejects the normalization. The validator also requires source alignment from normalized clauses to original spans when the LLM interface can provide it.

## 6. Reparse and semantic comparison

Normalized text is parsed into Semantic IR. When a partial source parse exists, the system compares preserved fragments and operator structure. The LLM output is accepted only if it increases coverage without contradicting known source semantics.

If normalization remains unparseable or changes protected meaning, the runtime returns an unverified-normalization or unparsed status. It must not recursively ask the LLM to solve the task.

## 7. Evaluation tracks

Every benchmark reports a direct-symbolic track and an optional normalized track. Direct symbolic rate is the percentage of inputs that reach Semantic IR without LLM translation or simplification.

The system must also report translation rate, simplification rate, normalization rejection rate, accuracy by route and the categories of syntax that trigger fallback. During benchmark learning, the desired direction is higher direct symbolic rate without lower accuracy or new regressions.

## 8. Deployment policy

A deployment may disable the LLM entirely. In that mode, unsupported language receives a structured failure. Another deployment may permit translation only, or translation plus simplification. The result always declares the policy and route used.
