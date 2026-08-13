import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeBase } from '../src/kb-training.mjs';
import { createCliRuntime } from '../src/interface/cli-runtime-composition.mjs';
import { executeEverydayKnowledgeInspection } from '../src/reasoning/everyday-knowledge-inspection.mjs';

test('QUICK knowledge summaries state concrete admitted facts in connected English', async () => {
  await buildKnowledgeBase('quick');
  const runtime = await createCliRuntime({ kb: 'quick', 'no-external-language-agent': true });
  const result = await runtime.ask('What do you know about Socrate?', {}, { grounding: false });
  assert.equal(result.status, 'SOLVED');
  assert.match(result.answer, /interpreted “Socrate” as Socrates/iu);
  assert.match(result.answer, /philosopher/iu);
  assert.match(result.answer, /classical Athens/iu);
  assert.ok(result.provenance.length >= 3);
  assert.deepEqual(result.usedKbVersions, [{ kbId: 'quick', version: '1.1.0' }]);
});

test('knowledge summaries enforce their sentence bound and attribute only realized facts', () => {
  const facts = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((value, index) => ({
    id: `fact:nonce:${index}`, subject: 'entity:nonce:one', predicate: 'known_for', value,
    kbId: 'nonce-kb', kbVersion: '7', provenance: ['nonce-source'],
  }));
  const result = executeEverydayKnowledgeInspection({
    operation: 'knowledge-summary', inputs: { subjectSurface: 'Nera' },
    output: { maximumSentences: 3 },
  }, { entities: [{ id: 'entity:nonce:one', names: ['Nera'] }], facts });
  assert.equal(result.status, 'SOLVED');
  assert.equal(result.provenance.length, 3);
  assert.equal(result.witness.omittedFacts, 2);
  assert.match(result.answer, /bounded summary of 3 admitted facts/u);
  assert.doesNotMatch(result.answer, /epsilon/u);
});

test('knowledge entity enumeration is grounded and unknown names do not inherit another answer', async () => {
  const runtime = await createCliRuntime({ kb: 'quick', 'no-external-language-agent': true });
  const listed = await runtime.ask('What people do you know?', {}, { grounding: false });
  assert.equal(listed.status, 'SOLVED');
  assert.match(listed.answer, /Socrates/u);
  assert.doesNotMatch(listed.answer, /Penguin/u);
  const unknown = await runtime.ask('What do you know about Qorin Vale?', {}, { grounding: false });
  assert.equal(unknown.status, 'UNKNOWN');
  assert.match(unknown.answer, /do not have any admitted facts about Qorin Vale/iu);
  assert.doesNotMatch(unknown.answer, /Socrates|philosopher/iu);
});
