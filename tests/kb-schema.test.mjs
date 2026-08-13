import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCanonicalRecords } from '../src/kb/schema.mjs';
import { validateCanonicalRecords as validatePortableCandidate } from '../training/.agents/skills/document-to-kb-builder/scripts/canonical-schema.mjs';
import { parseJsonLines } from '../src/kb/compiler.mjs';
import { PROJECT_ROOT } from '../src/paths.mjs';

test('QUICK canonical records satisfy the normative declarative schema', async () => {
  const path = `${PROJECT_ROOT}/training/KBs/quick/canonical/records.jsonl`;
  const records = parseJsonLines(await readFile(path, 'utf8'), path);
  const summary = validateCanonicalRecords(records);
  assert.equal(summary.records, 24);
  assert.equal(summary.provenanceIds.size, 1);
  assert.deepEqual(validatePortableCandidate(records), { records: 24, provenance: 1 });
});

test('bAbI declarative policy satisfies both the trusted and portable constraint schema', async () => {
  const path = `${PROJECT_ROOT}/training/KBs/babi-v1.2-language/canonical/records.jsonl`;
  const records = parseJsonLines(await readFile(path, 'utf8'), path);
  assert.equal(validateCanonicalRecords(records).records, 3);
  assert.deepEqual(validatePortableCandidate(records), { records: 3, provenance: 1 });
  const invalid = records.map((record) => record.constraintKind === 'induction-policy'
    ? { ...record, enabled: false } : record);
  assert.throws(() => validateCanonicalRecords(invalid), /explicitly enabled/u);
  assert.throws(() => validatePortableCandidate(invalid), /explicitly enabled/u);
});

test('canonical rules reject an unbound head variable', () => {
  const records = [{
    recordType: 'rule', recordId: 'rule:test:unsafe', kbNamespace: 'test', schemaVersion: '1',
    semantics: 'strict', when: [{ predicate: 'term:test:P', arguments: ['?x'] }],
    then: [{ predicate: 'term:test:Q', arguments: ['?y'] }], provenanceRefs: ['prov:test:1'],
  }];
  assert.throws(() => validateCanonicalRecords(records), /unsafe head variable/u);
  assert.throws(() => validatePortableCandidate(records), /unsafe head variable/u);
});

test('canonical graph validation rejects dangling semantic references', () => {
  const records = [
    { recordType: 'provenance', recordId: 'prov:test:1', kbNamespace: 'test', schemaVersion: '1', sourceId: 'source:test', sourceChecksum: 'sha256:test', transformation: 'fixture', provenanceRefs: [] },
    { recordType: 'lexeme', recordId: 'lex:test:missing', kbNamespace: 'test', schemaVersion: '1', language: 'en', surface: 'missing', lemma: 'missing', partOfSpeech: 'noun', denotes: 'term:test:absent', provenanceRefs: ['prov:test:1'] },
  ];
  assert.throws(() => validateCanonicalRecords(records), /missing denoted term/u);
  assert.throws(() => validatePortableCandidate(records), /missing denoted term/u);
});
