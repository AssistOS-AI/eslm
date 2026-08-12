import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROJECT_ROOT } from '../src/paths.mjs';
import { validateCanonicalRecord, validateCanonicalRecords } from '../src/kb/schema.mjs';
import { projectCanonicalRecords } from '../src/kb/projection.mjs';
import { CapabilityRegistry, CORE_METHOD_DESCRIPTORS } from '../src/reasoning/capability-registry.mjs';
import { createPlan, taskFrameFromQuery } from '../src/reasoning/planner.mjs';

async function readSpec(file) {
  return readFile(`${PROJECT_ROOT}/docs/specs/${file}`, 'utf8');
}

function jsonExamples(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)\n```/gu)].map((match) => JSON.parse(match[1]));
}

function markdownSection(markdown, heading, nextHeading) {
  const start = markdown.indexOf(`### ${heading}`);
  const end = markdown.indexOf(`### ${nextHeading}`, start + 1);
  assert.notEqual(start, -1, `Missing section: ${heading}`);
  assert.notEqual(end, -1, `Missing following section: ${nextHeading}`);
  return markdown.slice(start, end);
}

test('DS005 canonical JSON examples pass the current record-shape validator', async () => {
  const specification = await readSpec('DS005-knowledge-base-logical-model.md');
  const records = jsonExamples(specification);
  assert.equal(records.length, 13);
  for (const record of records) {
    assert.doesNotThrow(() => validateCanonicalRecord(record), record.recordId);
  }

  const constraint = records.find((record) => record.recordId === 'constraint:example:owner-kind-domain');
  assert.deepEqual(constraint?.values, ['organization', 'person']);
  assert.equal(constraint?.constraintKind, 'property-value-domain');
  assert.doesNotMatch(specification, /"constraintKind": "maxCardinality"/u);

  const provenance = records.find((record) => record.recordType === 'provenance');
  assert.deepEqual(provenance?.provenanceRefs, []);
  assert.match(specification, /Schema-valid therefore does not mean runtime-executable\./u);
});

test('DS005 support boundary matches the current assertion and rule projection', async () => {
  const provenanceRefs = ['prov:test:1'];
  const records = [
    {
      recordType: 'provenance', recordId: 'prov:test:1', kbNamespace: 'test', schemaVersion: '1',
      sourceId: 'source:test', sourceChecksum: 'sha256:test', transformation: 'fixture', provenanceRefs: [],
    },
    {
      recordType: 'term', recordId: 'term:test:a', kbNamespace: 'test', schemaVersion: '1',
      termKind: 'entity', canonicalKey: 'test/A', provenanceRefs,
    },
    {
      recordType: 'term', recordId: 'term:test:b', kbNamespace: 'test', schemaVersion: '1',
      termKind: 'entity', canonicalKey: 'test/B', provenanceRefs,
    },
    {
      recordType: 'term', recordId: 'term:test:p', kbNamespace: 'test', schemaVersion: '1',
      termKind: 'predicate', canonicalKey: 'test/P', provenanceRefs,
    },
    {
      recordType: 'term', recordId: 'term:test:q', kbNamespace: 'test', schemaVersion: '1',
      termKind: 'predicate', canonicalKey: 'test/Q', provenanceRefs,
    },
    {
      recordType: 'assertion', recordId: 'fact:test:positive', kbNamespace: 'test', schemaVersion: '1',
      predicate: 'term:test:p', arguments: ['term:test:a', 'term:test:b'], polarity: 'positive',
      epistemicStatus: 'asserted', provenanceRefs,
    },
    {
      recordType: 'assertion', recordId: 'fact:test:negative', kbNamespace: 'test', schemaVersion: '1',
      predicate: 'term:test:p', arguments: ['term:test:a', 'term:test:b'], polarity: 'negative',
      epistemicStatus: 'asserted', provenanceRefs,
    },
    {
      recordType: 'rule', recordId: 'rule:test:strict', kbNamespace: 'test', schemaVersion: '1',
      semantics: 'strict',
      when: [{ predicate: 'term:test:p', arguments: ['?x', 'term:test:b'], polarity: 'positive' }],
      then: [{ predicate: 'term:test:q', arguments: ['?x', 'term:test:b'], polarity: 'positive' }],
      provenanceRefs,
    },
    {
      recordType: 'rule', recordId: 'rule:test:default', kbNamespace: 'test', schemaVersion: '1',
      semantics: 'default',
      when: [{ predicate: 'term:test:p', arguments: ['?x', 'term:test:b'], polarity: 'positive' }],
      then: [{ predicate: 'term:test:q', arguments: ['?x', 'term:test:b'], polarity: 'positive' }],
      provenanceRefs,
    },
  ];
  validateCanonicalRecords(records);
  const projected = projectCanonicalRecords(records);
  assert.deepEqual(projected.facts.map((fact) => fact.id), ['fact:test:positive']);
  assert.deepEqual(projected.rules.map((rule) => rule.id), ['rule:test:strict']);

  const specification = await readSpec('DS005-knowledge-base-logical-model.md');
  assert.match(specification,
    /Only positive binary assertions whose epistemic status is `asserted` or `strict` enter the strict runtime fact model/u);
  assert.match(specification,
    /only strict rules cross the\ngeneric package projection into the Horn executor/u);
  assert.match(specification,
    /No polarity, argument, exception, or conclusion is silently dropped/u);
});

test('DS008 labels the bounded planner and typed SAT dispatch without claiming general AND/OR execution', async () => {
  let callbackInvocations = 0;
  const registry = new CapabilityRegistry();
  for (const methodId of ['method:test:zeta', 'method:test:alpha']) {
    registry.register({ ...CORE_METHOD_DESCRIPTORS.datalog, methodId }, () => {
      callbackInvocations += 1;
    });
  }
  const taskFrame = taskFrameFromQuery({ reasoning: 'deduction', target: 'values' });
  const plan = createPlan(taskFrame, registry);
  assert.equal(plan.status, 'planned');
  assert.equal(plan.methodId, 'method:test:alpha');
  assert.deepEqual(plan.steps.map((step) => step.operator), ['OBSERVE', 'DERIVE', 'VERIFY', 'CONSTRUCT']);
  assert.equal(callbackInvocations, 0);

  const specification = await readSpec('DS008-task-planning-methods-and-results.md');
  const examples = jsonExamples(specification);
  const descriptor = examples.find((example) =>
    example.methodId === CORE_METHOD_DESCRIPTORS.datalog.methodId);
  assert.deepEqual(descriptor, CORE_METHOD_DESCRIPTORS.datalog);
  const planRecord = examples.find((example) => example.recordType === 'plan');
  assert.doesNotThrow(() => validateCanonicalRecord(planRecord));
  assert.match(specification, /The current implementation has three distinct bounded coordination paths:/u);
  assert.match(specification, /SAT is implemented on the typed-task path/u);
  assert.match(specification, /The current planner does not construct this graph\./u);
  assert.match(specification, /This is the target complete gap shape\./u);
});

test('DS015 keeps the inductive guarantee with configured induction, not episodic orchestration', async () => {
  const specification = await readSpec('DS015-reasoning-method-semantics.md');
  const induction = markdownSection(specification, 'Configured induction', 'Finite conjunctive rule induction');
  const episodic = markdownSection(specification, 'Finite episodic-world orchestration', 'Guarded abduction');
  assert.match(induction, /The output is explicitly inductive\./u);
  assert.match(induction, /reports the count of class members that have an\nobserved different value/u);
  assert.doesNotMatch(episodic, /The output is explicitly inductive\./u);
  assert.equal((specification.match(/The output is explicitly inductive\./gu) ?? []).length, 1);
});
