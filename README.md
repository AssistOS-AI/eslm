# Executable Symbolic Language Model

ESLM is a deterministic symbolic runtime with declarative knowledge packages. For supported input it builds an explicit
task, runs a bounded method, and returns semantic values plus a reviewable witness. When it cannot establish an answer,
it abstains explicitly. If a selected knowledge base contains possibly useful material, the result may also include a
separate related-evidence bundle. Related evidence is never presented as proof.

There are three deliberately separate boundaries:

- **Deployment:** trusted dependency-free Node.js plus inert JSON/JSONL. No network, LLM, child process, `eval`, or
  executable KB payload.
- **Operator CLI:** direct symbolic execution first; only `UNPARSED` text may be sent to an optional Language Agent for
  conservative translation or simplification. `--no-external-language-agent` is the fully offline profile.
- **Training:** an isolated Coding Agent may analyze an authorized, train-visible packet and propose untrusted records
  or changes. Validation and explicit promotion remain host operations.

What works now: a documented controlled-English subset; session facts; exact retrieval and safe positive Horn
deduction; several bounded finite state, relation, categorical, Boolean, spatial, countermodel, induction, abduction,
and continuation methods; versioned declarative packages; query-directed public providers; structured failures; and
failure-time grounding with provenance and search receipts.

What does **not** work generally: unrestricted English, general AND/OR planning, arbitrary document ingestion,
encyclopedic coverage, unrestricted first-order proof, complete trust/conflict policy, open-ended generation, or hard
whole-process memory enforcement. Typed adapters, source annotations, and formula tracks can exercise real solvers but
are not raw-language scores. The authoritative boundary is in [`docs/specs/`](docs/specs/).

## Try the implemented path

```bash
npm test
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Can Penguin swim?" --kb quick
node src/cli.mjs ask "Define dog" --kb oewn-2025
node src/cli.mjs ask "Why might apologize?" --kb atomic-2020
node src/cli.mjs ask "What is the capital of Romania?" --kb geonames-2026
node src/cli.mjs ask "What is a hammer used for?" --kb conceptnet-5.7.0-en
node src/cli.mjs ask "Write a report about dogs" --kb oewn-2025,conceptnet-5.7.0-en --no-external-language-agent
node src/cli.mjs ask "Este Penguin o pasăre?" --kb quick
node src/cli.mjs ask "Can Penguin swim?" --kb quick --no-external-language-agent
node src/cli.mjs run --input tests/fixtures/questions.txt --output /tmp/eslm-answers.jsonl
node src/cli.mjs kb list
node src/cli.mjs benchmark status
npm run benchmark:public-probe
npm run kb:validate
```

Every question produces `eslm-runtime-result-v1`. Read `status` and `answer` first. `values`, normalized input, parsed
query, task frame, plan, provenance, and reasoning are stage-dependent and can be absent after an early `UNPARSED`.
When present, `provenance` and `usedKbVersions` support only the primary result. `selectedKbVersions` and
`consultedKbVersions` describe scope.
`grounding`, when present, contains related records with `answerSupported: false`, per-KB search receipts, and explicit
completion or truncation. The machine answer is never silently rewritten with fallback text.

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

`npm run evaluate` and `npm run benchmark` are five-case authored integration fixtures. A perfect score there is a
sanity check, not public evidence. `benchmark probe` may execute selected adapters and may assemble frozen receipt rows;
each row must say which happened. Report assembly time is not execution time. The static receipt audit marks frozen
results current, historical-stale, historical-unrecoverable, invalid, or unavailable against behavioral dependencies
and receipt integrity. Use `npm run benchmark:receipts:audit -- --require-current` before claiming the current
checkpoint; the normal `npm run check` does not silently rerun every costly public benchmark.

Forced-choice reports retain every eligible case in end-to-end accuracy, including abstentions and missing methods,
and separately expose attempt coverage and selective accuracy. They also distinguish raw language, source templates,
structured tasks, source annotations, and solver conformance. See the single full dashboard and methodology in
[`docs/evaluation.html`](docs/evaluation.html); the raw replaceable artifact is
[`docs/results/latest-public-benchmark-probes.json`](docs/results/latest-public-benchmark-probes.json).

EWoK materials are used under their CC BY 4.0 license and Terms of Use for evaluation and may guide ESLM improvement. The protected rows remain in ignored local storage, are not redistributed in plaintext, and never enter benchmark-specific runtime dispatch or synthesis packets. Cite Ivanova et al., “Elements of World Knowledge (EWoK): A Cognition-Inspired Framework for Evaluating Basic World Knowledge in Language Models,” TACL 13 (2025); the documentation sources page records the complete attribution and links.

Interactive `/smoke` executes the deterministic nonce/metamorphic regression catalog without Language Agent
assistance. `/examples` pages show bounded samples from that same executable corpus. This is software regression
evidence, not public benchmark evidence.

Read the [documentation](docs/index.html), the [implementation status](docs/status.html), the [specification architecture](docs/specification-architecture.html), and the [specification matrix](docs/specs/matrix.md). The HTML pages explain the design from implementation and review viewpoints; the complete DS files remain authoritative.
