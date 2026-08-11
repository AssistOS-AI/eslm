import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';
import { openKnowledgePackage, loadPackageRecords } from './kb/package.mjs';
import { projectCanonicalRecords } from './kb/projection.mjs';
import { KnowledgeCatalog } from './kb/catalog.mjs';

export const KB_CATALOG_PATH = join(PROJECT_ROOT, 'training/KBs/catalog.json');

export const KB_CATALOG = Object.freeze({
  quick: Object.freeze({
    id: 'quick',
    title: 'QUICK reviewed development fixture',
    domain: 'small inspectable classification, capability, and deduction examples',
    source: 'training/KBs/quick/canonical/records.jsonl',
    model: 'training/KBs/quick/package/manifest.json',
    documentation: 'knowledge-bases.html',
    role: 'development-fixture',
    benchmarkEligible: false,
  }),
});

export async function registeredKnowledgeBases() {
  return (await new KnowledgeCatalog(KB_CATALOG_PATH).load()).list();
}

export async function registerKnowledgeBase(manifestPath) {
  const handle = await openKnowledgePackage(manifestPath);
  if (KB_CATALOG[handle.manifest.kbId]) {
    throw new Error(`Knowledge base ${handle.manifest.kbId} is a repository-managed catalog entry.`);
  }
  return (await new KnowledgeCatalog(KB_CATALOG_PATH).load()).register(manifestPath);
}

export async function unregisterKnowledgeBase(kbId) {
  return (await new KnowledgeCatalog(KB_CATALOG_PATH).load()).unregister(kbId);
}

export async function selectedKbIds(value) {
  if (!value) return [];
  const requested = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  const registered = await registeredKnowledgeBases();
  const known = new Set([...Object.keys(KB_CATALOG), ...registered.map((entry) => entry.kbId)]);
  const ids = requested.includes('all') ? [...known] : requested;
  for (const id of ids) if (!known.has(id)) throw new Error(`Unknown knowledge base: ${id}`);
  return [...new Set(ids)];
}

export async function loadKnowledgeBase(id) {
  const entry = KB_CATALOG[id];
  const manifestPath = entry?.model
    ? join(PROJECT_ROOT, entry.model)
    : (await new KnowledgeCatalog(KB_CATALOG_PATH).load()).resolve(id);
  const handle = await openKnowledgePackage(manifestPath);
  const loaded = await loadPackageRecords(handle);
  return projectCanonicalRecords(loaded.records, [handle.manifest]);
}

function mergeEntities(models) {
  const entities = new Map();
  for (const model of models) {
    for (const entity of model.entities) {
      const existing = entities.get(entity.id);
      if (!existing) entities.set(entity.id, { ...entity, names: [...entity.names] });
      else existing.names = [...new Set([...existing.names, ...entity.names])];
    }
  }
  return [...entities.values()];
}

function mergeUnique(models, field, signature) {
  const values = [];
  const seen = new Set();
  for (const model of models) {
    for (const value of model[field]) {
      const key = signature(value);
      if (!seen.has(key)) { seen.add(key); values.push(value); }
    }
  }
  return values;
}

export function mergeModels(base, knowledgeBases) {
  if (knowledgeBases.length === 0) return base;
  const models = [base, ...knowledgeBases];
  const facts = mergeUnique(models, 'facts', (fact) =>
    JSON.stringify([fact.subject, fact.predicate, fact.object ?? fact.value, fact.contextRef]));
  return {
    ...base,
    manifest: {
      ...base.manifest,
      modelId: knowledgeBases.map((model) => model.manifest.modelId).join('+'),
      knowledgeBases: knowledgeBases.flatMap((model) => model.manifest.knowledgeBases ?? []),
      benchmarkComparable: false,
    },
    entities: mergeEntities(models),
    facts,
    rules: mergeUnique(models, 'rules', (rule) => JSON.stringify([rule.when, rule.then])),
  };
}

export async function loadKnowledgeBases(value) {
  const ids = await selectedKbIds(value);
  return Promise.all(ids.map(loadKnowledgeBase));
}

export function summarizeKnowledgeBase(model) {
  return {
    id: model.manifest.knowledgeBases?.[0] ?? model.manifest.modelId,
    title: KB_CATALOG[model.manifest.knowledgeBases?.[0]]?.title,
    version: model.manifest.modelId.split('@').at(-1),
    entityCount: model.entities.length,
    directFactCount: model.facts.length,
    ruleCount: model.rules.length,
    benchmarkEligible: false,
  };
}
