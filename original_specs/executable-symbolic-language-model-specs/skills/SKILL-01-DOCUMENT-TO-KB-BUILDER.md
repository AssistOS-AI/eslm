# Skill — Document-to-KB Builder

## Purpose

Use this skill when one or more documents must populate a new KB or update an existing KB. Work with the existing architecture. Reusable code remains in `src`. The KB contains declarative records only.

## Operating method

Begin by registering exact source versions and establishing the target KB namespace, dependencies and trust policy. Build a baseline report of language coverage before changing any code.

Process source segments through the direct symbolic CNL path first. Use configured translation or simplification only when the parser rejects a segment and only under the LLM contract. Preserve source spans and normalization alignments.

Convert accepted Semantic IR into candidate terms, lexemes, assertions, events, role edges, rules, constraints and contexts. Every candidate must retain polarity, modality, temporal information, confidence semantics and provenance.

Resolve entities conservatively. Reuse existing terms when identity is supported. Otherwise create source-scoped terms or explicit uncertain alignments.

Classify every extraction failure. Lexical mappings, event frames, terminology, domain facts and domain rules belong in the KB. Generic grammar, semantic operators and algorithms are only proposed for `src` when repeated evidence demonstrates a reusable gap.

Do not insert JavaScript, Java, shell fragments or arbitrary expressions into the KB. A declarative rule may reference only operators already registered by the trusted core.

Run schema, type, rule-safety, provenance, duplicate and contradiction validation. Compile the KB, run representative queries against canonical and compiled forms, and compare results.

When a repeated unsupported language form appears, continue ingestion through validated normalization unless the form satisfies the Core Change Guardian criteria. Do not block a useful KB build merely to enlarge CNL prematurely.

## Completion evidence

The final report must identify source versions, direct symbolic coverage, fallback usage, unresolved spans, record counts, new vocabulary, new rules, conflicts, quality levels, KB dependencies, compiled shard statistics and any accepted `src` changes.

The build is complete only when it can be reproduced from the registered sources and accepted system commit.
