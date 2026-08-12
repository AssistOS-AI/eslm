# Executable Symbolic Language Model

ESLM is a deterministic symbolic runtime with declarative knowledge packages. For supported input it builds an explicit
task, runs a bounded method, and returns semantic values plus a reviewable witness. When it cannot establish an answer,
it abstains explicitly. If a selected knowledge base contains possibly useful material, the result may also include a
separate related-evidence bundle. Related evidence is never presented as proof.

There are three deliberately separate boundaries:

- **Deployment:** trusted dependency-free Node.js plus inert JSON/JSONL. No network, LLM, child process, `eval`, or
  executable KB payload.
- **Operator CLI:** direct symbolic execution first, with deterministic request-force planning able to preempt an
  accidental assertion parse. Local CNL approximation inspects `UNPARSED` and `UNKNOWN`; it may also challenge a
  direct `SOLVED` or `PARTIAL` interpretation when a structurally licensed candidate compiles to different Semantic
  IR. A Language Agent is available only through explicit `--external-language-agent` or
  `/normalize on` opt-in after the local result remains `UNPARSED`. Related-KB grounding is attached only after the
  final route is known.
- **Training:** an isolated Coding Agent may analyze an authorized, train-visible packet and propose untrusted records
  or changes. Validation and explicit promotion remain host operations.

What works now: a documented controlled-English subset; session facts; exact retrieval and safe positive Horn
deduction; several bounded finite state, relation, categorical, Boolean, spatial, countermodel, induction, abduction,
and continuation methods; versioned declarative packages; query-directed public providers; structured failures; and
failure-time grounding with provenance and search receipts. The default CLI also provides confidence-bearing local
spelling, morphology, auxiliary, clause-decomposition, and request-intent heuristics; work profiles bound their search.
Recognized summary, explanation, comparison, outline, essay, report, article, document, table, list, and paragraph
requests can produce a cited extractive `PARTIAL` artifact from supplied text and selected KB source claims.

These working subsystems now share the first production slice of the trusted-strategy architecture. All 24 local
language-approximation families execute through one sealed typed registry and deterministic stage coordinator. Exact
strategy allowlists also gate request planning, query focus, relevance features, reasoning methods, and result
construction inside their current owner modules. The catalog labels every entry `coordinated`, `instrumented-local`,
or `planned`, so registration, local instrumentation, and future design cannot be confused. DS027 defines the
remaining cross-stage scheduler, independent verification, compiler-side knowledge-standardization registry, and
pipeline-receipt gates. KBs and configuration select only reviewed identities and never supply executable plugin code.

**Current specialization and next acceptance gates:** ESLM's strongest path is explicit language, bounded planning,
reviewable knowledge, and finite symbolic methods. The staged expansion program covers broader English composition,
general AND/OR planning, document ingestion, encyclopedic coverage, richer first-order methods, mature trust and
conflict policy, verified abstractive generation, and enforceable whole-process resource controls. Typed adapters,
source annotations, and formula tracks exercise real solvers under their own evidence labels rather than being counted
as raw-language coverage. The authoritative acceptance boundary is in [`docs/specs/`](docs/specs/).

## Try the implemented path

```bash
npm test
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Can Penguin swim?" --kb quick
node src/cli.mjs ask "Define dog" --kb oewn-2025
node src/cli.mjs ask "Why might apologize?" --kb atomic-2020
node src/cli.mjs ask "What is the capital of Romania?" --kb geonames-2026
node src/cli.mjs ask "What is a hammer used for?" --kb conceptnet-5.7.0-en
node src/cli.mjs ask "Abura is an mura. All mura et bana. Is Abura eating bana?"
node src/cli.mjs ask "Write a short report about Penguin" --kb quick
node src/cli.mjs ask "Este Penguin o pasăre?" --kb quick --external-language-agent
node src/cli.mjs ask "Can Penguin swim?" --kb quick --no-external-language-agent
node src/cli.mjs ask "QUESTION" --kb all --work-profile deep
node src/cli.mjs ask "QUESTION" --strategy-preset language
node src/cli.mjs ask "QUESTION" --strategy-select \
  'runtime.evidence.assess=strategy:retrieval:focus-term-cooccurrence@1,strategy:retrieval:typed-answer-bridge@1'
node src/cli.mjs run --input tests/fixtures/questions.txt --output /tmp/eslm-answers.jsonl
node src/cli.mjs kb list
node src/cli.mjs benchmark status
npm run benchmark
npm run benchmark:generated
npm run benchmark:public-probe
npm run kb:validate
```

Every question produces `eslm-runtime-result-v1`. Read `status` and `answer` first. `values`, normalized input, parsed
query, task frame, plan, provenance, and reasoning are stage-dependent and can be absent after an early `UNPARSED`.
When present, `provenance` and `usedKbVersions` support only the primary result. `selectedKbVersions` and
`consultedKbVersions` describe scope.
`grounding`, when present, contains related records with `answerSupported: false`, per-KB search receipts, and explicit
completion or truncation. Ordinary inability grounding never rewrites the machine answer or enters its provenance.
The explicit `heuristic-request-synthesis` route is the narrow exception: it returns a cited extractive `PARTIAL`
artifact, promotes only the records selected as source material into `provenance` and `usedKbVersions`, and does not
claim that relevance is deductive proof. If the artifact intent is understood but neither supplied material nor a
related KB record is available, `heuristic-request-planned` returns an explicit `MISSING_KNOWLEDGE` result.

Local heuristic interpretation is visible as `heuristic-cnl-approximated` or `heuristic-cnl-ambiguous`; receipts show
candidate text, confidence, supporting votes, transformations, and reparses. A changed interpretation cannot produce
a strict top-level `SOLVED`, and its tentative episode facts and rules are never committed to the next turn. The
candidate selector uses parse-only Semantic IR and cannot prefer a rewrite because it later finds an answer. An
accepted alternative that changes a direct `SOLVED` or `PARTIAL` interpretation is query-local and receives the same
conservative status treatment as every changed interpretation; identical Semantic IR leaves the direct route intact.
Explicit artifact requests are also query-local: if direct parsing tentatively treats their source material as
assertions, the request plan restores the incoming session snapshot before retrieval and construction. An ordinary
well-formed missing-knowledge `UNKNOWN` remains unchanged when no structurally licensed candidate is accepted. The
default work profile is `balanced`; use `quick`, `deep`, or `exhaustive-bounded` with `--work-profile`, or inspect and
change the profile interactively with `/work` and `/work PROFILE`.

`--strategy-preset all|language|retrieval|reasoning|construction` and interactive `/strategies PRESET` change only
which catalog rows are displayed. They are inventory and ablation views, not execution profiles. Use
`--strategy-select 'STAGE=ID[,ID];STAGE=ID'` or interactive `/strategy STAGE=IDS` for exact execution allowlists;
`/strategy clear` restores the default built-in set. The current selectable stages are language interpretation,
request planning, knowledge focus, evidence assessment, reasoning execution, and result construction. Retrieval,
failure grounding, method planning, and verification remain visible in the catalog but cannot be selected until their
executors genuinely cross the shared coordinator boundary.

When assistance is explicitly enabled, interactive mode prints `Thinking: interpreting with the configured Language
Agent…` immediately before a real external invocation. A cache hit remains attributed to the assisted route but does
not claim that a new external call occurred.

## Declarative knowledge, not generated executable data

```text
training/KBs/<kb-id>/
  source-manifest.json
  canonical/records.jsonl
  package/manifest.json
  package/shards/*.json
```

`quick` is the small authored tutorial fixture. `babi-v1.2-language` and `clutrr-kinship-algebra` are declarative
language/method policy packages, not answer stores. Public providers include Open English WordNet, ATOMIC, GeoNames,
ConceptNet, and the reviewed World Relations ontology. Run `node src/cli.mjs kb list` for the current inventory and see
[`docs/knowledge-bases.html`](docs/knowledge-bases.html) for semantics and limits. Package counts describe compiled
source coverage, never benchmark performance. Memory targets are advisory retention policies; they cannot delete valid
facts or promise a hard RSS cap.

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
  evaluation/              generated internal suites, access gates, and public development probes
  language/                symbolic frontend, deterministic heuristic planners, optional operator normalizer
  runtime/                 orchestration, heuristic request synthesis, and bounded work policy
  strategy/                sealed descriptors, registry, coordinator, inventory, and confidence votes
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

## Verification and evidence honesty

```bash
npm test
npm run evaluate
npm run benchmark
npm run benchmark:receipts:audit
npm run benchmark:receipts:audit -- --require-current
npm run docs:matrix
npm run docs:check
npm run check
```

`npm run evaluate` remains a five-case authored integration fixture. `npm run benchmark` now runs two explicitly
separate internal suites: the unchanged five-case authored fixture and a deterministic 1,200-case heuristic-language
development suite. Run them independently with `npm run benchmark:authored` and `npm run benchmark:generated`.
The generated suite instantiates 43 reviewed template and technique shapes repeatedly across 18 domain themes and 28
target families, with nonce vocabulary, repair-required inputs, direct controls, and meaning-changing contrasts. The
default receipt contains 1,200 unique surface inputs and observes 593 of the 774 possible declared
technique-by-domain cells. Those rows provide renaming and combination breadth; they are not 1,200 independent
language structures, and domain remains coupled to predicate in the current generator. Each typed
oracle is derived from the generating variables and labeled as answer execution, candidate selection, query-local
decomposition, request execution, proposal-only preservation, or safety abstention. Candidate-selection rows require
the intended structural candidate to win, carry its required family, receive a matching accepted parse-only reparse,
and execute as the query-local interpreted episode under the declared route and status. They do not claim that the
runtime produced a complete relation-shaped query. The report clusters the earliest
failure and aggregates behavior by oracle level, technique, target family, domain, complexity, status, route,
confidence, and resource use so strategy work is guided by repeated failure patterns instead of one memorable example.

Both internal reports carry `benchmarkComparable: false`. The authored result is published as
[`latest-benchmark.json`](docs/results/latest-benchmark.json), while the generated development result is published
separately as
[`latest-generated-heuristic-benchmark.json`](docs/results/latest-generated-heuristic-benchmark.json). Neither is a
public or fresh score, and their accuracies are never merged. `benchmark probe` may execute selected public adapters
and may assemble frozen receipt rows; each row must say which happened. Report assembly time is not execution time.
The static receipt audit marks frozen results current, historical-stale, historical-unrecoverable, invalid, or
unavailable against behavioral dependencies and receipt integrity. Use
`npm run benchmark:receipts:audit -- --require-current` before claiming the current checkpoint; the normal
`npm run check` does not silently rerun every costly public benchmark.

Forced-choice reports retain every eligible case in end-to-end accuracy, including abstentions and missing methods,
and separately expose attempt coverage and selective accuracy. They also distinguish raw language, source templates,
structured tasks, source annotations, and solver conformance. See the single full dashboard and methodology in
[`docs/evaluation.html`](docs/evaluation.html); the raw replaceable artifact is
[`docs/results/latest-public-benchmark-probes.json`](docs/results/latest-public-benchmark-probes.json).

EWoK materials are used under their CC BY 4.0 license and Terms of Use for evaluation and may guide ESLM improvement. The protected rows remain in ignored local storage, are not redistributed in plaintext, and never enter benchmark-specific runtime dispatch or synthesis packets. Cite Ivanova et al., “Elements of World Knowledge (EWoK): A Cognition-Inspired Framework for Evaluating Basic World Knowledge in Language Models,” TACL 13 (2025); the documentation sources page records the complete attribution and links.

Interactive `/smoke` executes a deterministic 4,096-case nonce/metamorphic catalog without Language Agent assistance
or ordinary inability grounding: 1,200 fresh instantiations of all 43 heuristic-development shapes plus 2,896 cases
from 26 established core templates. It reports the six heuristic oracle levels, observed routes, and statuses beside
the ordinary pass/fail total. `/examples` shows stratified 24-case pages from that exact default corpus, so direct and
repaired language, decomposition, requests, safety, state and relation work, preferences, and typed tasks are visible
without scrolling a sequential block. This is software regression evidence, not public benchmark evidence.

Read the [documentation](docs/index.html), the [implementation status](docs/status.html), the [research horizons](docs/research-horizons.html), the [trusted strategy contract](docs/specs/DS027-trusted-strategy-extensions-and-meta-rational-coordination.md), the [specification architecture](docs/specification-architecture.html), and the [specification matrix](docs/specs/matrix.md). The HTML pages explain the design from implementation and review viewpoints; the complete DS files remain authoritative. DS023 through DS026 turn the difficult next layers into explicit relevance, language, planning/synthesis, and grounded-evaluation research programs without presenting their hypotheses as current runtime capability.
