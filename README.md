# Executable Symbolic Language Model

ESLM is a deterministic language runtime and knowledge-construction toolchain. It compiles language into symbolic assertions and task frames, selects explicit capabilities, executes bounded reasoning over declarative knowledge packages, and returns answers with plans, provenance, and unresolved subgoals.

Training may invoke Codex in an isolated workspace to analyze a frozen, train-visible packet and propose declarative records or reviewed changes. Deployment uses only trusted dependency-free Node.js code and inert JSON/JSONL data. Runtime code never calls an LLM, accesses a network, executes corpus strings, evaluates generated code, or dynamically imports a knowledge payload.

The current implementation is Stage A: controlled English, session state, task frames, capability-aware plans, indexed retrieval, safe Horn deduction, provenance, structured gaps, package manifests and hashes, query-directed public-KB loading, and an isolated agent-training boundary. Broader construction learning, temporal and modal methods, mature induction and abduction, probabilistic ranking, and narrative generation remain specified future work rather than current claims.

## Try the implemented path

```bash
npm test
node src/cli.mjs ask "Mice are afraid of wolves. Gertrude is a mouse. What is Gertrude afraid of?"
node src/cli.mjs ask "Can Penguin swim?" --kb quick
node src/cli.mjs ask "Define dog" --kb oewn-2025
node src/cli.mjs ask "Why might apologize?" --kb atomic-2020
node src/cli.mjs run --input tests/fixtures/questions.txt --output /tmp/eslm-answers.jsonl
node src/cli.mjs kb list
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

`quick` is a small authored KB that exercises the generic canonical compiler and loader. `oewn-2025` contains 107,519 synsets and 127,311 lemmas compiled from the preserved Open English WordNet archive into JSON indexes. `atomic-2020` contains 940,427 retained tuples under 36,940 normalized events compiled from the preserved ATOMIC archive. The public sources can load eagerly or through budget-aware query-directed shard caches. These counts describe compiled source coverage, not independent benchmark performance.

Canonical records have allowlisted types, stable identifiers, explicit references, contexts, and provenance. The compiler rejects malformed references and unsafe rules, sorts records deterministically, writes JSON shards, and hashes the exact shard bytes into the manifest. The runtime resolves only cataloged package paths and never treats a manifest field as executable code.

## Agent-guided training

The repository owns four self-contained skills under `training/.agents/skills/`:

- `document-to-kb-builder` extracts supported canonical records from assigned documents.
- `benchmark-guided-symbolic-learner` clusters development-visible failures and proposes general changes without answer memorization.
- `core-change-guardian` challenges generic-core changes for leakage, unsoundness, hidden policy, and regressions.
- `kb-compiler-quality-auditor` independently checks candidate and package integrity.

Prepare and inspect a workspace without launching Codex:

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
  training/                isolated Codex subprocess runner
tests/                     Node tests and immutable fixtures
training/
  .agents/skills/          self-contained repository training and audit skills
  .cache/                  immutable downloaded source archives
  KBs/                     canonical records and declarative compiled packages
  datasets/                rebuilt benchmark data; empty after the reset
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
npm run docs:matrix
npm run docs:check
npm run check
```

Evaluation uses semantic values and structured diagnostics rather than terminal phrasing. Training and development visibility are explicit; test and hidden labels cannot enter agent packets. A benchmark improvement is accepted only when it survives contrastive controls, unrelated regressions, provenance review, and resource budgets.

The documentation home page separates the three locally validated KB packages from the seven benchmark families reviewed for future inclusion. Only the five-case native fixture currently has a post-reset benchmark report; its result is regression evidence and is not presented as a public benchmark score.

Read the [documentation](docs/index.html), the [implementation status](docs/status.html), and the [specification matrix](docs/specs/matrix.md). The HTML pages explain the design from implementation and review viewpoints; the complete DS files remain authoritative.
