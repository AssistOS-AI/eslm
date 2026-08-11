# PrOntoQA-OOD acquisition and development baseline

## Source and evidence boundary

The official `asaparov/prontoqa` repository is pinned at commit `0a6412b6fddf46324a1cb96e066dd7b3d89b87d6` under Apache-2.0. Its own `generated_ood_data.zip` release is the source corpus. ESLM did not regenerate or approximate that release. This avoids introducing a persistent Python dependency and preserves the authors' 17 October 2024 bug-fixed artifact byte for byte.

The archive has 79 experiment files with 100 test examples each. Every record also carries either eight or four in-context proof demonstrations. A label-blind stable hash partition keeps 20 cases per file development-visible and seals the other 80. Consequently, 1,580 official cases and their 11,440 attached demonstrations may be inspected, while 6,320 fresh cases remain identified only by their membership digest. Adapter version 1 deliberately exports no fresh loader.

## Adapter semantics and oracle boundary

The strict Node adapter validates exact record keys, allowlisted fields, bounded UTF-8 strings, proof-array bounds, the `Prove:` query contract, total extracted bytes, and a combined digest over every extracted file name, size, and SHA-256. It reads one JSON stratum at a time. No case is dropped because of a solver or memory limit.

The adapter compiles the controlled source language into ground Boolean formulas. Individual class or property assertions become typed atoms. `not`, `and`, and `or` remain explicit formula operators. `Every`, `Each`, bare plural class statements, and `Everything that is ... is ...` become implications instantiated for every explicitly named entity in that case. This compilation is driven by grammatical and semantic forms, not by the benchmark row, expected proof, entity name, or answer constant.

Development-visible tasks contain context, query, compiled formulas, and generator-configuration metadata. They do not contain the reference chain of thought. The host oracle separately contains the stable ID, the fact that the source generated a proof task, and the reference proof steps. Training demonstrations may be requested explicitly because they belong to the development-visible record; their proof is intentionally visible training evidence and they are not counted as additional official test cases.

## Current-core baseline

The deterministic baseline selected two development members from each of the 79 official experiment files, so it tested 158 of the 7,900 available official cases. It invoked neither language normalization nor Coding Agent. The adapter submitted every compiled task to the existing generic bounded finite-entailment method with a limit of 20 distinct ground atoms.

The method established entailment for 103 of 158 tasks, or 65.18987341772152%. All 103 tasks that the method executed to a semantic decision were correct. The remaining 55 returned `RESOURCE_LIMIT`; they contained 23 through 44 distinct atoms and exceeded the method's declared maximum. No executed task returned a false countermodel after the adapter's plural-class normalization was corrected.

This result is development evidence, not an official PrOntoQA score. The current witness is an exhaustive finite-entailment certificate rather than an evaluated natural-language derivation. The baseline also sampled only two cases per official configuration and never opened the fresh pool.

## Accepted scalable method and complete development result

The original 20-atom failure cluster was resolved with a generic query-directed propositional method. It deterministically compiles validated formulas to Tseitin CNF, proves that the complete premise context is satisfiable, computes a transitive semantic-atom dependency cone for the query, and runs bounded DPLL on that cone with the negated query. An independent verifier recompiles the formulas and either replays the returned unsatisfiability tree or evaluates the complete countermodel. No solver branch contains a benchmark name, source identity, record ID, expected answer, or inspected source vocabulary.

The complete 1,580-member development partition passed: 1,580 correct, 1,580 independently valid witnesses, and zero Coding Agent or normalization invocations. Of these, 1,569 used a query-directed DPLL entailment certificate. Eleven source contexts were already classically inconsistent. PrOntoQA's generated proof calculus includes proof by contradiction, so the adapter declares the generic `classical-explosion` inconsistency policy for every source task. Those eleven results remain auditable because each returns an independently replayable inconsistency certificate; the condition is not hidden or silently converted to an ordinary derivation.

The previously frozen 158-case stratified sample passed 158 of 158. The wider complete development execution passed 1,580 of 1,580. Both are development-visible evidence; their exact membership, resource maxima, witness classes, and dependency boundary are recorded in `development-scalable-result.json`.

## Sealed fresh result

After the development behavior, source identity, partition, adapter, core method, runtime route, tests, and guardian proposal were frozen, the aggregate-only evaluator ran the 6,320 sealed fresh members once. It returned 6,320 correct of 6,320 tested, 100% accuracy, 6,320 independently valid symbolic witnesses, and zero Coding Agent or normalization invocations. Every one of the eight source rule-family strata passed completely.

The fresh evaluator did not return or print a fresh question, proof, label, case identifier, or per-case outcome. `pre-fresh-freeze.json` records the behavioral hashes and `fresh-aggregate.json` records only the resulting aggregates. This result establishes semantic entailment under the source calculus. It does not assert that ESLM reproduced the authors' natural-language proof wording or that the run is an official leaderboard submission.
