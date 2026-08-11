# Executable Symbolic Language Model

ESLM is a deterministic language runtime and knowledge-construction toolchain. It compiles language into symbolic assertions and task frames, selects explicit capabilities, executes bounded reasoning over declarative knowledge packages, and returns answers with plans, provenance, and unresolved subgoals.

Training may invoke a Coding Agent in an isolated workspace to analyze a frozen, train-visible packet and propose declarative records or reviewed changes. The operator-side role is different: a Language Agent translates or conservatively simplifies an `UNPARSED` utterance into ESLM controlled language. It may be a general coding agent or a smaller translation-focused model; the current adapter invokes Codex through its local CLI. Deployment uses only trusted dependency-free Node.js code and inert JSON/JSONL data. The deployed runtime never calls an LLM, accesses a network, starts a child process, executes corpus strings, evaluates generated code, or dynamically imports a knowledge payload. Host validation and the unchanged symbolic runtime remain authoritative, and `--no-external-language-agent` removes the operator wrapper for confidential input and offline reproduction.

The current implementation is Stage A with bounded state, relation, compatibility, narrative-ranking, factoid-routing, finite classical entailment, proof-producing scalable Boolean entailment, finite-domain first-order countermodel construction, and skeptical default extensions: controlled English, session state, explicit task frames, capability-aware plans, indexed retrieval, safe Horn deduction, policy-driven induction, guarded abduction, temporal predecessor queries, container-state transitions, categorical A/E/I/O logic, typed relation algebra, declarative qualitative relation closure, exact spatial vectors, spatial extent inequalities, deterministic Tseitin-CNF and DPLL search, signed semantic compatibility, bounded narrative event frames and continuation selection, provider-neutral factoid questions, independently verified finite countermodels, replayable proof trees and SAT certificates, provenance, structured gaps, package manifests and hashes, query-directed public-KB loading, an isolated agent-training boundary, and optional operator-side Language Agent normalization. Broader grammar, unrestricted relation extraction from prose, modal methods, scalable unrestricted first-order proof search, calibrated language probability, encyclopedic factual coverage, and narrative generation remain outside current claims.

## Try the implemented path

```bash
npm test
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Can Penguin swim?" --kb quick
node src/cli.mjs ask "Define dog" --kb oewn-2025
node src/cli.mjs ask "Why might apologize?" --kb atomic-2020
node src/cli.mjs ask "What is the capital of Romania?" --kb geonames-2026
node src/cli.mjs ask "What is a hammer used for?" --kb conceptnet-5.7.0-en
node src/cli.mjs ask "Este Penguin o pasăre?" --kb quick
node src/cli.mjs ask "Can Penguin swim?" --kb quick --no-external-language-agent
node src/cli.mjs run --input tests/fixtures/questions.txt --output /tmp/eslm-answers.jsonl
node src/cli.mjs kb list
node src/cli.mjs benchmark status
npm run benchmark:public-probe
npm run kb:validate
```

Every question produces `eslm-runtime-result-v1`. The object separates the human answer from normalized input, parsed query, task frame, selected plan, semantic values, provenance, reasoning trace, loaded KB versions, unresolved subgoals, and memory policy.

## Declarative knowledge, not generated executable data

```text
training/KBs/<kb-id>/
  source-manifest.json
  canonical/records.jsonl
  package/manifest.json
  package/shards/*.json
```

`quick` is a small authored KB that exercises the generic canonical compiler and loader. `babi-v1.2-language` contains source provenance, a finite property domain, and an explicitly defeasible induction policy; `clutrr-kinship-algebra` contains source-reviewed relation classes, inverses, and compositions. Neither contains item answers. `oewn-2025` contains 107,519 synsets and 127,311 lemmas compiled from Open English WordNet. `atomic-2020` contains 940,427 retained tuples under 36,940 normalized events. `geonames-2026` contains the frozen country table and the selected populated-place profile. `conceptnet-5.7.0-en` contains the reviewed English relation projection from ConceptNet 5.7. `world-relations-1.0` contains authored semantic constructions and implications interpreted by trusted compatibility code. The complete acquired source archives remain in the ignored cache. Memory targets select streaming, shard size, query-directed loading, and cache retention; they never authorize discarding valid examples or facts. A semantic projection reports source coverage outside its currently interpreted languages and relations so later package versions can widen it from the same frozen source. Package counts and features describe compiled source coverage, not independent benchmark performance.

Benchmark-guided fixes are accepted only as generic mechanisms or provenance-bearing policy data. Runtime core code may dispatch on a semantic relation, typed task operation, capability precondition, or validated policy field. It may not dispatch on a benchmark name, record ID, source row, question hash, expected answer, or entity copied from an example. The regression suite renames entities, predicates, places, objects, and values and checks negative variants so a passing public sample cannot hide a lookup table.

Canonical records have allowlisted types, stable identifiers, explicit references, contexts, and provenance. The compiler rejects malformed references and unsafe rules, sorts records deterministically, writes JSON shards, and hashes the exact shard bytes into the manifest. The runtime resolves only cataloged package paths and never treats a manifest field as executable code.

## Agent-guided training

The repository owns four self-contained skills under `training/.agents/skills/`:

- `document-to-kb-builder` extracts supported canonical records from assigned documents.
- `benchmark-guided-symbolic-learner` clusters development-visible failures and proposes general changes without answer memorization.
- `core-change-guardian` challenges generic-core changes for leakage, unsoundness, hidden policy, and regressions.
- `kb-compiler-quality-auditor` independently checks candidate and package integrity.

Prepare and inspect a workspace without launching Coding Agent:

```bash
node src/cli.mjs train prepare \
  --input tests/fixtures/training.jsonl \
  --namespace example-kb \
  --output /tmp/eslm-packet.json

node src/cli.mjs train run \
  --packet /tmp/eslm-packet.json \
  --output /tmp/eslm-agent \
  --skill document-to-kb-builder \
  --dry-run
```

Removing `--dry-run` invokes `codex exec` as an ephemeral subprocess in the prepared workspace. Its output is untrusted. Promotion still requires schema and logical validation, deterministic compilation, independent audit, positive and negative tests, regressions, split-safe evaluation, and an explicit decision.

The host precomputes a hashed Stage A language/reasoning analysis for every embedded document or visible benchmark case and places it beside the packet. The copied skill includes the exact canonical-field contract and a portable validator. A validated candidate can be compiled without promotion using `node src/cli.mjs kb compile`; registration remains a separate explicit operation.

## Repository shape

```text
src/                       trusted runtime and operator entry points
  interface/               interactive presentation and operator diagnostics
  kb/                      schema, compiler, package loader, catalog, projection
  reasoning/               capability registry, planning, inference
  benchmark-adapters/      source validation and label-isolated task adaptation
  evaluation/              access gates and public development probes
  language/                symbolic frontend and optional operator normalizer
  training/                isolated Coding Agent subprocess runner
tests/                     Node tests and immutable fixtures
training/
  .agents/skills/          self-contained repository training and audit skills
  .cache/                  immutable downloaded source archives
  KBs/                     canonical records and declarative compiled packages
  benchmark-sources/       committed source descriptors and probe evidence
docs/                      detailed HTML explanations and generated results
  specs/                   sole authoritative design-specification set
original_specs/            preserved research input, not current authority
```

Prepared legacy datasets, candidates, workspaces, the former global generated model, and executable KB modules were removed in the declarative reset. Immutable source archives were retained so their packages can be regenerated without pretending that previous prepared artifacts satisfy the new contracts.

## Verification

```bash
npm test
npm run evaluate
npm run benchmark
npm run benchmark:public-probe
npm run docs:matrix
npm run docs:check
npm run check
```

Evaluation uses semantic values and structured diagnostics rather than terminal phrasing. Training and development visibility are explicit; test and hidden labels cannot enter agent packets. A benchmark improvement is accepted only when it survives contrastive controls, unrelated regressions, provenance review, and resource budgets.

The documentation site separates the validated-KB inventory from public benchmark evidence. The home page renders the latest direct public development and diagnostic receipt from `docs/results/latest-public-benchmark-probes.json`; the detailed KB inventory lives on its linked topic pages. The replaceable report identifies executed and access-gated rows, inspected splits, deterministic sampling, source audit metadata, scorer limitations, direct `UNPARSED` normalization-candidate rates, and actual Language Agent calls. Its values are evidence for the named protocol, not automatically official comparable leaderboard scores.

`node src/cli.mjs benchmark catalog` also exposes a staged research queue for LogicBench, IIBench, ProofWriter,
PrOntoQA, SLR-Bench, LogicSkills, FOLIO, ProverQA, StepGame, SpaRC/SpaRP, SATBench, ZebraLogic, Defeasible NLI,
alphaNLI/ART, ReClor, and LogiQA. These typed entries record capability goals, official sources, license or access state,
cache paths, adapter state, evaluation state, and the next concrete action. Catalog membership never implies that a source
was acquired or a benchmark was run. The live command and the generated public JSON report are the authorities for the
current state; HTML and this README deliberately do not copy temporary percentages or stale adapter inventories.

EWoK materials are used under their CC BY 4.0 license and Terms of Use for evaluation and may guide ESLM improvement. The protected rows remain in ignored local storage, are not redistributed in plaintext, and never enter benchmark-specific runtime dispatch or synthesis packets. Cite Ivanova et al., “Elements of World Knowledge (EWoK): A Cognition-Inspired Framework for Evaluating Basic World Knowledge in Language Models,” TACL 13 (2025); the documentation sources page records the complete attribution and links.

Interactive `/smoke` executes 4,096 deterministic nonce and metamorphic cases from 26 rotating templates without Language Agent assistance and prints one actual input/result record per encountered template before the truthful aggregate. `/examples 1`, `/examples 2`, and later pages show 24 different cases per page from that exact executable corpus. In addition to direct controlled-language cases, the catalog now includes typed nonce regressions for scalable Boolean entailment and categorical logic. This corpus is software regression evidence, not a substitute for public evaluation.

Read the [documentation](docs/index.html), the [implementation status](docs/status.html), the [specification architecture](docs/specification-architecture.html), and the [specification matrix](docs/specs/matrix.md). The HTML pages explain the design from implementation and review viewpoints; the complete DS files remain authoritative.
