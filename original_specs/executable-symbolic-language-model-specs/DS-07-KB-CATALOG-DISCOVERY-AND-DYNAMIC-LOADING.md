# DS-07 — KB Catalog, Discovery and Dynamic Loading

## 1. Registration versus loading

A CLI may register many KB packages without loading their facts. Registration reads and validates manifests, namespaces, dependency metadata, lexical summaries, capability tags, trust policies and shard directories.

The always-resident catalog must remain small relative to the KB collection. It provides enough information to discover candidate knowledge and exact shard locations without materializing all assertions.

## 2. Catalog contents

The catalog records KB identity, version, namespaces, languages, domains, concept roots, predicate coverage, rule-head coverage, lexical index locations, dependencies, trust level, shard summaries and statistics.

A global term directory maps stable term identifiers to candidate KBs or dictionary shards. The directory may be partitioned at very large scale. Lexical lookup maps input forms to candidate stable terms without loading full fact stores.

## 3. Runtime discovery sequence

The runtime first builds a task signature from the parsed input. The signature contains explicit entities, candidate concepts, predicates, relation families, requested output type, temporal or spatial operators and required reasoning capabilities.

The catalog ranks KBs using exact term matches, namespace imports, predicate coverage, ontology ancestry, language coverage, domain declarations, trust and estimated cost. Ranking may use approximate semantic fingerprints, but approximate signals may only order candidates.

Safe exclusion requires conservative evidence. A Bloom filter negative can exclude a shard. A Bloom filter positive cannot prove relevance. A learned embedding similarity may increase priority but cannot remove a KB from consideration when exact dependencies indicate possible relevance.

## 4. Shard selection

After candidate KBs are selected, the query planner chooses access paths and shards using bound predicates and arguments. The manifest and block summaries identify the smallest relevant segments.

Multi-hop reasoning uses iterative expansion. Initial shards provide facts and rules directly connected to the task. Derived subgoals or newly discovered entities may identify additional shards. The loader fetches these under memory and cost budgets and records every decision in the execution trace.

## 5. Cache policy

The runtime maintains an LRU or cost-aware cache of dictionaries, index blocks and fact blocks. Core language KBs, current session context and frequently used ontologies may be pinned. Large domain shards remain evictable.

Cache entries are version-qualified. Two KB versions cannot accidentally share mutable state. Query-local structures are released when the task completes unless retained by an explicit session policy.

## 6. Cross-KB reasoning

Cross-KB joins use stable term identifiers and explicit alignment records. A query may combine a general ontology, a lexical KB, a project KB and session facts. The planner records which KB supplied each premise and which alignment enabled the join.

Dependencies in a manifest identify KBs that must be available for interpretation, but loading remains lazy. A dependency on a common ontology does not require loading all of that ontology.

## 7. Failure modes

The loader distinguishes no matching KB, matching KB but no matching shard, inaccessible package, checksum failure, incompatible schema, memory-budget refusal and exhausted expansion budget. These statuses propagate to the honest-failure model rather than being flattened into an incorrect answer.

## 8. Correctness requirement

Dynamic loading is an optimization and must not change logical results within declared budgets. A deterministic evaluation mode may run the same query with all relevant KBs fully available and compare it with lazy loading. Any difference caused by an unsound routing exclusion is a critical regression.
