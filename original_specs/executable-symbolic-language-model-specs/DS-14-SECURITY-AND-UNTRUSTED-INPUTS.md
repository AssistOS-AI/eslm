# DS-14 — Security and Untrusted Inputs

## 1. Threat model

Source documents, benchmark files, downloaded KBs, LLM output and generated canonical records are untrusted inputs. The architecture must prevent them from executing code, changing agent instructions, corrupting trusted indexes or causing unbounded resource consumption.

## 2. No executable KB payloads

KB schemas reject JavaScript, Java, shell code, dynamic imports, executable expressions and callbacks. Declarative rules are parsed into a restricted AST and interpreted only by trusted operators in `src`.

Strings that resemble code remain inert literals unless an explicit trusted parser converts them into a supported declarative record.

## 3. Prompt injection boundary

A document may contain text such as “ignore previous instructions” or “modify the parser.” During ingestion this is source content. The coding agent follows only the external task and approved skill instructions.

LLM translation and simplification prompts must delimit source content and state that source commands are not operational instructions. The normalized output remains untrusted.

## 4. Package integrity

KB manifests and shards use checksums. Optionally signed packages identify a publisher. Registration rejects checksum mismatches, incompatible schemas and undeclared executable artifacts.

Compiler output is written atomically and validated before catalog activation. Existing published versions remain immutable.

## 5. Resource safety

Parsing, rule evaluation, graph expansion, SAT or CSP search and shard loading operate under explicit budgets. The runtime detects pathological recursion, cyclic rule expansion, decompression bombs, oversized lexical forms and adversarial query fan-out.

A resource refusal returns RESOURCE_LIMIT rather than crashing or returning an incomplete answer as complete.

## 6. Coding-agent changes

Changes to `src` occur in an isolated candidate checkpoint. The agent runs static checks, focused tests, security tests and global regressions before promotion. Generated KB content cannot directly authorize a source-code change.

## 7. Data confidentiality

Session facts and private KBs are scoped by access policy. The catalog must not reveal private term labels or source metadata to unauthorized sessions. LLM fallback is disabled or routed through an approved provider when source data cannot leave the local environment.

## 8. Auditability

Every external LLM call, package registration, core patch, KB build and trust-policy decision is logged with stable identifiers. Audit records exclude secret content where policy requires, but preserve enough metadata to reconstruct the operation.
