import test from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledgeBase, mergeModels } from '../src/kbs.mjs';
import { createCoreModel, serializedIndexes, validateModel } from '../src/runtime/core-model.mjs';
import { EslmEngine } from '../src/runtime/engine.mjs';

function source(kbId, version) {
  return [{ kbId, version }];
}

function knowledgeModel(kbId, version, facts, rules = []) {
  return {
    manifest: {
      format: 'eslm-runtime-projection-v1',
      modelId: `${kbId}@${version}`,
      knowledgeBases: [kbId],
      knowledgeBaseVersions: source(kbId, version),
      benchmarkComparable: false,
    },
    entities: [{
      id: 'narl', names: ['Narl'], kind: 'entity', canonicalRecordId: 'term:shared:narl',
    }],
    facts,
    rules,
    reasoning: {
      propertyValues: {},
      induction: { enabled: false, predicates: [], implicitPredicates: [], byPredicate: {} },
      relationAlgebras: {},
    },
  };
}

function fact(kbId, version, id, value, provenance, overrides = {}) {
  return {
    id,
    kbId,
    kbVersion: version,
    kbSources: source(kbId, version),
    subject: 'narl',
    predicate: 'is_a',
    value,
    polarity: 'positive',
    epistemicStatus: 'asserted',
    confidence: { value: 1, policy: 'reviewed-fixture' },
    validity: { from: null, to: null },
    contextRef: 'context:shared:baseline',
    provenance: [provenance],
    ...overrides,
  };
}

function rule(kbId, version, provenance) {
  return {
    id: `rule:${kbId}:seed-omega`,
    kbId,
    kbVersion: version,
    kbSources: source(kbId, version),
    when: [['?entity', 'is_a', 'seed']],
    then: ['?entity', 'is_a', 'omega'],
    semantics: 'strict',
    contextRef: 'context:shared:baseline',
    source: provenance,
    sources: [provenance],
  };
}

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations(values.filter((_, item) => item !== index))
    .map((suffix) => [value, ...suffix]));
}

test('package permutation leaves merged arrays, identities, query values, and provenance byte-stable', async () => {
  const alpha = knowledgeModel('alpha-kb', '1.0.0', [
    fact('alpha-kb', '1.0.0', 'fact:alpha:seed', 'seed', 'prov:zeta'),
    fact('alpha-kb', '1.0.0', 'fact:alpha:shared', 'shared', 'prov:zeta'),
    fact('alpha-kb', '1.0.0', 'fact:alpha:qualified', 'qualified', 'prov:alpha'),
  ], [rule('alpha-kb', '1.0.0', 'prov:rule-zeta')]);
  const zeta = knowledgeModel('zeta-kb', '2.0.0', [
    fact('zeta-kb', '2.0.0', 'fact:zeta:shared', 'shared', 'prov:alpha'),
    fact('zeta-kb', '2.0.0', 'fact:zeta:qualified', 'qualified', 'prov:zeta', {
      confidence: { policy: 'reviewed-fixture', value: 0.8 },
    }),
  ], [rule('zeta-kb', '2.0.0', 'prov:rule-alpha')]);
  const middle = knowledgeModel('middle-kb', '1.5.0', [
    fact('middle-kb', '1.5.0', 'fact:middle:unique', 'middle', 'prov:middle'),
    fact('middle-kb', '1.5.0', 'fact:middle:shared', 'shared', 'prov:middle'),
  ]);
  const base = await createCoreModel();
  const mergedPermutations = permutations([alpha, middle, zeta])
    .map((knowledgeBases) => mergeModels(base, knowledgeBases));
  const [forward] = mergedPermutations;

  for (const merged of mergedPermutations) assert.equal(JSON.stringify(merged), JSON.stringify(forward));
  assert.deepEqual(forward.manifest.knowledgeBaseVersions, [
    { kbId: 'alpha-kb', version: '1.0.0' },
    { kbId: 'middle-kb', version: '1.5.0' },
    { kbId: 'zeta-kb', version: '2.0.0' },
  ]);
  assert.equal(forward.facts.filter((item) => item.value === 'qualified').length, 2);
  const shared = forward.facts.find((item) => item.value === 'shared');
  assert.deepEqual(shared.provenance, ['prov:alpha', 'prov:middle', 'prov:zeta']);
  assert.deepEqual(shared.kbSources, forward.manifest.knowledgeBaseVersions);
  assert.deepEqual(forward.rules[0].sources, ['prov:rule-alpha', 'prov:rule-zeta']);
  assert.deepEqual(forward.indexes, serializedIndexes(forward.facts));
  validateModel(forward);

  const results = mergedPermutations.map((model) => new EslmEngine(model).ask('Who is Narl?'));
  const [forwardResult] = results;
  for (const result of results) assert.equal(JSON.stringify(result), JSON.stringify(forwardResult));
  assert.deepEqual(forwardResult.values, ['middle', 'omega', 'qualified', 'seed', 'shared']);
  assert.deepEqual(forwardResult.usedKbVersions, forward.manifest.knowledgeBaseVersions);
});

test('canonical package order does not disturb session observation chronology', async () => {
  const quick = await loadKnowledgeBase('quick');
  const policy = await loadKnowledgeBase('babi-v1.2-language');
  const forward = new EslmEngine(mergeModels(await createCoreModel(), [quick, policy]));
  const reversed = new EslmEngine(mergeModels(await createCoreModel(), [policy, quick]));
  const episode = [
    'Ari is a zorb.',
    'Bela is a zorb.',
    'Cora is a zorb.',
    'Ari is yellow.',
    'Cora is green.',
    'What color is Bela?',
  ].join(' ');
  const forwardResult = forward.ask(episode);
  const reversedResult = reversed.ask(episode);

  assert.equal(JSON.stringify(forwardResult), JSON.stringify(reversedResult));
  assert.deepEqual(forwardResult.values, ['green']);
  assert.equal(forwardResult.reasoning.selection, 'latest-member');
  assert.deepEqual(
    forwardResult.context.session.facts.map((item) => item.id),
    reversedResult.context.session.facts.map((item) => item.id),
  );
});
