import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { validateModel, serializedIndexes } from './model-loader.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { deriveClosure } from './reasoner.mjs';

export const KB_CATALOG = Object.freeze({
  quick: Object.freeze({
    id: 'quick',
    title: 'QUICK development knowledge base',
    domain: 'small inspectable examples for smoke tests, tutorials, and reasoning regression',
    source: 'training/KBs/QUICK/source/manifest.json',
    model: 'training/KBs/QUICK/model/manifest.mjs',
    documentation: 'knowledge-bases.html',
    bundle: Object.freeze(['child-basic', 'animals', 'space-geography']),
    role: 'development-fixture',
    benchmarkEligible: false,
  }),
  'child-basic': Object.freeze({
    id: 'child-basic',
    title: 'Child-level common knowledge',
    domain: 'basic categories, living things, and mortality',
    source: 'training/KBs/QUICK/source/child-basic.json',
    model: 'training/KBs/QUICK/model/child-basic/manifest.mjs',
    documentation: 'kb-child-basic.html',
    benchmarkEligible: false,
    internal: true,
  }),
  animals: Object.freeze({
    id: 'animals',
    title: 'Animals and ordinary capabilities',
    domain: 'species classes and uncontroversial capabilities',
    source: 'training/KBs/QUICK/source/animals.json',
    model: 'training/KBs/QUICK/model/animals/manifest.mjs',
    documentation: 'kb-animals.html',
    benchmarkEligible: false,
    internal: true,
  }),
  'space-geography': Object.freeze({
    id: 'space-geography',
    title: 'Solar system and broad geography',
    domain: 'astronomical membership, continents, oceans, and broad direction',
    source: 'training/KBs/QUICK/source/space-geography.json',
    model: 'training/KBs/QUICK/model/space-geography/manifest.mjs',
    documentation: 'kb-space-geography.html',
    benchmarkEligible: false,
    internal: true,
  }),
});

export function selectedKbIds(value) {
  if (!value) return [];
  const requested = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  const ids = requested.includes('all')
    ? Object.values(KB_CATALOG).filter((entry) => !entry.internal).map((entry) => entry.id)
    : requested;
  for (const id of ids) {
    if (!KB_CATALOG[id]) throw new Error(`Unknown knowledge base: ${id}`);
  }
  return [...new Set(ids)];
}

export async function loadKnowledgeBase(id) {
  const entry = KB_CATALOG[id];
  if (!entry) throw new Error(`Unknown knowledge base: ${id}`);
  const path = join(PROJECT_ROOT, entry.model);
  const imported = await import(`${pathToFileURL(path).href}?kb=${Date.now()}`);
  const model = imported.default ?? imported.model;
  validateModel(model);
  return model;
}

function mergeEntities(models) {
  const entities = new Map();
  for (const model of models) {
    for (const entity of model.entities) {
      const existing = entities.get(entity.id);
      if (!existing) {
        entities.set(entity.id, { ...entity, names: [...entity.names] });
        continue;
      }
      if (existing.kind !== entity.kind) throw new Error(`Conflicting entity kind for ${entity.id}.`);
      existing.names = [...new Set([...existing.names, ...entity.names])];
    }
  }
  return [...entities.values()];
}

function mergeBySignature(models, field, signature) {
  const seen = new Set();
  const values = [];
  for (const model of models) {
    for (const value of model[field]) {
      const key = signature(value);
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(value);
    }
  }
  return values;
}

export function mergeModels(base, knowledgeBases) {
  if (knowledgeBases.length === 0) return base;
  const models = [base, ...knowledgeBases];
  const entities = mergeEntities(models);
  const facts = mergeBySignature(models, 'facts', (fact) =>
    `${fact.subject}\u0000${fact.predicate}\u0000${fact.object ?? fact.value}`);
  const rules = mergeBySignature(models, 'rules', (rule) =>
    JSON.stringify([rule.when, rule.then, Boolean(rule.abductive)]));
  const variants = {};
  const constructions = [];
  for (const model of models) {
    for (const [canonical, values] of Object.entries(model.lexicon.variants ?? {})) {
      variants[canonical] = [...new Set([...(variants[canonical] ?? []), ...values])];
    }
    constructions.push(...(model.lexicon.constructions ?? []));
  }
  const ids = knowledgeBases.map((kb) => kb.manifest.modelId);
  const merged = {
    manifest: {
      ...base.manifest,
      modelId: `${base.manifest.modelId}+${ids.join('+')}`,
      knowledgeBases: ids,
      benchmarkComparable: false,
    },
    entities,
    facts,
    rules,
    lexicon: { variants, constructions: [...new Set(constructions)] },
    reasoning: base.reasoning,
    indexes: serializedIndexes(facts),
  };
  validateModel(merged);
  return merged;
}

export async function loadKnowledgeBases(value) {
  const ids = selectedKbIds(value);
  return Promise.all(ids.map(loadKnowledgeBase));
}

export function summarizeKnowledgeBase(model) {
  const executableFactCount = deriveClosure(model).length;
  return {
    id: model.manifest.modelId,
    title: model.manifest.title,
    version: model.manifest.version,
    entityCount: model.entities.length,
    directFactCount: model.facts.length,
    derivedFactCount: executableFactCount - model.facts.length,
    executableFactCount,
    ruleCount: model.rules.length,
    constructionCount: model.lexicon.constructions.length,
    generatedBy: model.manifest.generatedBy,
    benchmarkEligible: model.manifest.benchmarkEligible,
    examples: model.manifest.examples,
  };
}
