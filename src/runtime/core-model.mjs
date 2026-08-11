import { assert } from '../util.mjs';

export function serializedIndexes(facts) {
  const indexes = { bySubject: {}, byPredicate: {}, byObject: {}, aliases: {} };
  const add = (name, key, position) => {
    if (!indexes[name][key]) indexes[name][key] = [];
    indexes[name][key].push(position);
  };
  facts.forEach((fact, position) => {
    add('bySubject', fact.subject, position);
    add('byPredicate', fact.predicate, position);
    add('byObject', fact.object ?? fact.value, position);
  });
  return indexes;
}

function validateFact(fact, entityIds) {
  assert(typeof fact.id === 'string', 'Every fact requires a string id.');
  assert(entityIds.has(fact.subject), `Unknown fact subject: ${fact.subject}`);
  assert(typeof fact.predicate === 'string', `Fact ${fact.id} requires a predicate.`);
  assert(Boolean(fact.object) !== Boolean(fact.value), `Fact ${fact.id} must have exactly one object or value.`);
  if (fact.object) assert(entityIds.has(fact.object), `Unknown fact object: ${fact.object}`);
  assert(Array.isArray(fact.provenance) && fact.provenance.length > 0, `Fact ${fact.id} requires provenance.`);
}

export function validateModel(model) {
  assert(model?.manifest?.format === 'eslm-runtime-projection-v1', 'Unsupported runtime projection format.');
  assert(Array.isArray(model.entities), 'Model entities must be an array.');
  assert(Array.isArray(model.facts), 'Model facts must be an array.');
  assert(Array.isArray(model.rules), 'Model rules must be an array.');
  assert(model.lexicon && typeof model.lexicon === 'object', 'Model lexicon is required.');
  if (model.reasoning) {
    const induction = model.reasoning.induction;
    assert(Number.isInteger(model.reasoning.deduction?.maxRounds)
      && model.reasoning.deduction.maxRounds > 0, 'Deduction maxRounds must be a positive integer.');
    assert(Array.isArray(induction?.predicates), 'Induction requires an allowlisted predicate array.');
    assert(Number.isInteger(induction.minSupport) && induction.minSupport >= 1, 'Induction minSupport must be at least 1.');
    assert(induction.minCoverage > 0 && induction.minCoverage <= 1, 'Induction minCoverage must be in (0, 1].');
    assert((induction.implicitPredicates ?? []).every((predicate) => induction.predicates.includes(predicate)), 'Implicit induction predicates must be allowlisted.');
    for (const [predicate, override] of Object.entries(induction.byPredicate ?? {})) {
      assert(induction.predicates.includes(predicate), `Induction override predicate is not allowlisted: ${predicate}`);
      assert(Number.isInteger(override.minSupport) && override.minSupport >= 1, `Invalid induction minSupport for ${predicate}.`);
      assert(override.minCoverage > 0 && override.minCoverage <= 1, `Invalid induction minCoverage for ${predicate}.`);
      assert(['all', 'latest-support', 'latest-member'].includes(override.selection ?? 'all'), `Invalid induction selection for ${predicate}.`);
    }
    for (const [predicate, values] of Object.entries(model.reasoning.propertyValues ?? {})) {
      assert(Array.isArray(values) && values.length > 0, `Property predicate ${predicate} requires values.`);
      assert(values.every((value) => typeof value === 'string'), `Property values for ${predicate} must be strings.`);
    }
    assert(Number.isInteger(model.reasoning.abduction?.maxHypotheses)
      && model.reasoning.abduction.maxHypotheses > 0, 'Abduction maxHypotheses must be a positive integer.');
  }
  const entityIds = new Set();
  const aliases = new Set();
  for (const entity of model.entities) {
    assert(/^[a-z][a-z0-9-]*$/u.test(entity.id), `Invalid entity id: ${entity.id}`);
    assert(!entityIds.has(entity.id), `Duplicate entity id: ${entity.id}`);
    assert(Array.isArray(entity.names) && entity.names.length > 0, `Entity ${entity.id} requires names.`);
    entityIds.add(entity.id);
    for (const name of entity.names) {
      const alias = name.toLocaleLowerCase('en-US');
      assert(!aliases.has(alias), `Ambiguous generated alias: ${alias}`);
      aliases.add(alias);
    }
  }
  model.facts.forEach((fact) => validateFact(fact, entityIds));
  assert(model.indexes && typeof model.indexes === 'object', 'Model indexes are required.');
  const expectedIndexes = serializedIndexes(model.facts);
  for (const indexName of ['bySubject', 'byPredicate', 'byObject']) {
    assert(JSON.stringify(model.indexes[indexName]) === JSON.stringify(expectedIndexes[indexName]), `Generated index ${indexName} is stale.`);
  }
  for (const rule of model.rules) {
    assert(Array.isArray(rule.when) && rule.when.length > 0, `Rule ${rule.id} requires premises.`);
    assert(Array.isArray(rule.then) && rule.then.length === 3, `Rule ${rule.id} requires one triple conclusion.`);
  }
  return { entityCount: entityIds.size, factCount: model.facts.length, ruleCount: model.rules.length };
}

export async function createCoreModel(candidate) {
  if (candidate) throw new Error('The runtime does not load executable model paths; select cataloged declarative KB packages with --kb.');
  const facts = [];
  const model = {
    manifest: {
      format: 'eslm-runtime-projection-v1',
      modelId: 'eslm-core-stage-a',
      knowledgeBases: [],
      benchmarkComparable: true,
    },
    entities: [], facts, rules: [],
    lexicon: { variants: {}, constructions: [] },
    reasoning: {
      deduction: { maxRounds: 8 },
      induction: { enabled: false, predicates: [], implicitPredicates: [], minSupport: 3, minCoverage: 0.7 },
      abduction: { maxHypotheses: 4 },
      classes: { singular: { mice: 'mouse', wolves: 'wolf', cats: 'cat', sheep: 'sheep' } },
    },
    indexes: serializedIndexes(facts),
  };
  validateModel(model);
  return model;
}
