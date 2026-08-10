# Linguistic and knowledge induction protocol

## Evidence levels

Distinguish direct assertions, normalized paraphrases, deterministic consequences, repeated corpus regularities, and speculative hypotheses. Store direct and deterministic knowledge in executable fact/rule modules. Keep speculative hypotheses in the synthesis report until human review or stronger evidence promotes them.

## Linguistic layers

Analyze each layer independently:

1. orthography and normalization: Unicode form, punctuation, casing, declared misspellings;
2. lexicon and morphology: lemmas, surface forms, irregular inflection, semantic type;
3. syntax and constructions: word order, required function words, optional spans, typed slots;
4. semantic frames: predicates, roles, quantification, negation, modality, time;
5. discourse: referents, recency, topic, ellipsis, corrections, question-answer adjacency;
6. world state: entities, events, state transitions, persistence and invalidation;
7. reasoning: relations, rules, constraints, contradiction and uncertainty;
8. realization: answer form, agreement, articles, ordering, punctuation and abstention.

A surface co-occurrence is not automatically a rule. A frequent sentence frame is not automatically a semantic construction. Require contrastive examples or explicit source semantics where possible.

## Task and query grouping

Group operations by semantic function: OBSERVE, STRUCTURE, RELATE, REDUCE, DERIVE, CONSTRUCT, VERIFY, and EFFECT. Group language requests by executable query contract rather than topic words: requested relation, known arguments, answer slot, evidence scope, response form, uncertainty policy, language, and discourse state.

Use macro-patterns only for recurring circuits. For question answering, a typical circuit is normalize → parse construction → resolve entities → retrieve indexed candidates → derive bounded closure → verify support → realize response. For state tracking, it is parse events → order events → apply transitions → query final state → cite transition trace. For narrative completion, it is compile context → generate or score schema-consistent candidates → verify entity/world consistency → choose or abstain.

## Generalization controls

Prefer reusable typed patterns to memorized source sentences. Test training-only counterfactual probes by replacing entity names and permuting irrelevant sentence order. Do not inspect held-out labels. Record whether a rule generalizes by length, entity substitution, paraphrase, distractor resistance, temporal ordering, or composition depth.

## Compression controls

Measure source bytes, canonical symbolic bytes, generated source bytes, module count, import latency, query latency, and retained provenance. Deduplication is valid only if reconstructing all encoded assertions yields the same semantic multiset. Compression that lowers coverage, loses modal/temporal scope, or collapses conflicts is invalid.
