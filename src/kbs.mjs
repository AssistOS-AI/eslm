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
  'babi-v1.2-language': Object.freeze({
    id: 'babi-v1.2-language',
    title: 'bAbI v1.2 language and induction policy',
    domain: 'bAbI-visible color vocabulary and explicitly defeasible class-property induction policy',
    source: 'training/KBs/babi-v1.2-language/canonical/records.jsonl',
    model: 'training/KBs/babi-v1.2-language/package/manifest.json',
    documentation: 'knowledge-bases.html',
    role: 'benchmark-language-policy',
    benchmarkEligible: false,
    license: 'CC BY 3.0 Unported',
    capabilities: ['property-language', 'configured-induction'],
    trustLevel: 'source-declared-benchmark-policy',
  }),
  'clutrr-kinship-algebra': Object.freeze({
    id: 'clutrr-kinship-algebra',
    title: 'CLUTRR reviewed kinship relation algebra',
    domain: 'source-declared kinship relation classes, endpoint refinements, inverses, and compositions',
    source: 'training/KBs/clutrr-kinship-algebra/canonical/records.jsonl',
    model: 'training/KBs/clutrr-kinship-algebra/package/manifest.json',
    documentation: 'knowledge-bases.html',
    role: 'benchmark-relation-policy',
    benchmarkEligible: false,
    license: 'CC BY-NC 4.0',
    capabilities: ['typed-relation-algebra', 'kinship-composition'],
    trustLevel: 'source-declared-benchmark-policy',
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
  const propertyValues = { ...(base.reasoning?.propertyValues ?? {}) };
  const induction = {
    ...(base.reasoning?.induction ?? {}),
    predicates: [...(base.reasoning?.induction?.predicates ?? [])],
    implicitPredicates: [...(base.reasoning?.induction?.implicitPredicates ?? [])],
    byPredicate: { ...(base.reasoning?.induction?.byPredicate ?? {}) },
  };
  const relationAlgebras = { ...(base.reasoning?.relationAlgebras ?? {}) };
  for (const model of knowledgeBases) {
    for (const [algebraId, algebra] of Object.entries(model.reasoning?.relationAlgebras ?? {})) {
      const existing = relationAlgebras[algebraId];
      if (existing && JSON.stringify(existing) !== JSON.stringify(algebra)) {
        throw new Error(`Conflicting typed relation algebras for ${algebraId}.`);
      }
      relationAlgebras[algebraId] = algebra;
    }
    for (const [predicate, values] of Object.entries(model.reasoning?.propertyValues ?? {})) {
      propertyValues[predicate] = [...new Set([...(propertyValues[predicate] ?? []), ...values])].sort();
    }
    const policy = model.reasoning?.induction;
    if (!policy?.enabled) continue;
    induction.enabled = true;
    induction.predicates = [...new Set([...induction.predicates, ...policy.predicates])].sort();
    induction.implicitPredicates = [...new Set([...induction.implicitPredicates, ...policy.implicitPredicates])].sort();
    for (const [predicate, override] of Object.entries(policy.byPredicate ?? {})) {
      const existing = induction.byPredicate[predicate];
      if (existing && JSON.stringify(existing) !== JSON.stringify(override)) {
        throw new Error(`Conflicting induction policies for predicate ${predicate}.`);
      }
      induction.byPredicate[predicate] = override;
    }
  }
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
    reasoning: { ...base.reasoning, propertyValues, induction, relationAlgebras },
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
