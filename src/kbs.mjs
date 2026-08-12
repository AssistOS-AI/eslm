import { join } from 'node:path';
import { PROJECT_ROOT } from './paths.mjs';
import { openKnowledgePackage, loadPackageRecords } from './kb/package.mjs';
import { projectCanonicalRecords } from './kb/projection.mjs';
import { KnowledgeCatalog } from './kb/catalog.mjs';
import { serializedIndexes } from './runtime/core-model.mjs';
import { stableStringify } from './util.mjs';

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
      else {
        if (existing.kind !== entity.kind || existing.canonicalRecordId !== entity.canonicalRecordId) {
          throw new Error(`Conflicting runtime entity identity ${entity.id}.`);
        }
        existing.names = [...new Set([...existing.names, ...entity.names])];
      }
    }
  }
  return [...entities.values()];
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function kbSourcesOf(value) {
  const raw = value.kbSources ?? (value.kbId ? [{ kbId: value.kbId, version: value.kbVersion }] : []);
  const unique = new Map(raw.filter((item) => item?.kbId).map((item) => [
    `${item.kbId}\u0000${item.version ?? ''}`,
    { kbId: item.kbId, ...(item.version ? { version: item.version } : {}) },
  ]));
  return [...unique.values()].toSorted((left, right) =>
    compareText(left.kbId, right.kbId) || compareText(String(left.version), String(right.version)));
}

function mergeSources(left, right) {
  return kbSourcesOf({ kbSources: [...kbSourcesOf(left), ...kbSourcesOf(right)] });
}

function sortedUniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
    .toSorted(compareText);
}

function factSemanticKey(fact) {
  return stableStringify({
    subject: fact.subject,
    predicate: fact.predicate,
    term: Object.hasOwn(fact, 'object')
      ? { kind: 'object', value: fact.object }
      : { kind: 'value', value: fact.value },
    polarity: fact.polarity ?? null,
    epistemicStatus: fact.epistemicStatus ?? null,
    confidence: fact.confidence ?? null,
    validity: fact.validity ?? null,
    contextRef: fact.contextRef ?? null,
  });
}

function mergeFacts(models) {
  const bySignature = new Map();
  for (const model of models) {
    for (const fact of model.facts) {
      const key = factSemanticKey(fact);
      const existing = bySignature.get(key);
      if (!existing) {
        bySignature.set(key, {
          ...fact,
          kbSources: kbSourcesOf(fact),
          provenance: sortedUniqueStrings(fact.provenance ?? []),
        });
        continue;
      }
      existing.kbSources = mergeSources(existing, fact);
      existing.provenance = sortedUniqueStrings([...(existing.provenance ?? []), ...(fact.provenance ?? [])]);
    }
  }
  return [...bySignature.values()];
}

function ruleSemanticKey(rule) {
  return stableStringify({
    semantics: rule.semantics ?? 'strict',
    when: rule.when,
    then: rule.then,
    contextRef: rule.contextRef ?? null,
    priority: rule.priority ?? null,
    validity: rule.validity ?? null,
    abductive: rule.abductive ?? false,
  });
}

function mergeRules(models) {
  const bySignature = new Map();
  for (const model of models) {
    for (const rule of model.rules) {
      const key = ruleSemanticKey(rule);
      const existing = bySignature.get(key);
      if (!existing) {
        bySignature.set(key, {
          ...rule,
          kbSources: kbSourcesOf(rule),
          sources: sortedUniqueStrings([rule.source, ...(rule.sources ?? [])]),
        });
        continue;
      }
      existing.kbSources = mergeSources(existing, rule);
      existing.sources = sortedUniqueStrings([...(existing.sources ?? []), rule.source, ...(rule.sources ?? [])]);
    }
  }
  return [...bySignature.values()];
}

function withoutSourceIdentity(value) {
  const { sourceKbVersions: _sourceKbVersions, ...semantic } = value;
  return semantic;
}

function sameSemantics(left, right) {
  return stableStringify(withoutSourceIdentity(left)) === stableStringify(withoutSourceIdentity(right));
}

function modelIdentityKey(model) {
  return stableStringify({
    modelId: model.manifest.modelId,
    knowledgeBaseVersions: kbSourcesOf({ kbSources: model.manifest.knowledgeBaseVersions ?? [] }),
  });
}

function canonicalKnowledgeBaseOrder(knowledgeBases) {
  return [...knowledgeBases].toSorted((left, right) => {
    const identityOrder = compareText(modelIdentityKey(left), modelIdentityKey(right));
    if (identityOrder !== 0) return identityOrder;
    return compareText(stableStringify(left), stableStringify(right));
  });
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).toSorted(([left], [right]) => compareText(left, right)));
}

export function mergeModels(base, knowledgeBases) {
  if (knowledgeBases.length === 0) return base;
  const orderedKnowledgeBases = canonicalKnowledgeBaseOrder(knowledgeBases);
  const models = [base, ...orderedKnowledgeBases];
  const facts = mergeFacts(models);
  const propertyValues = Object.fromEntries(Object.entries(base.reasoning?.propertyValues ?? {})
    .map(([predicate, values]) => [predicate, sortedUniqueStrings(values)]));
  const induction = {
    ...(base.reasoning?.induction ?? {}),
    predicates: sortedUniqueStrings(base.reasoning?.induction?.predicates ?? []),
    implicitPredicates: sortedUniqueStrings(base.reasoning?.induction?.implicitPredicates ?? []),
    byPredicate: { ...(base.reasoning?.induction?.byPredicate ?? {}) },
  };
  const relationAlgebras = { ...(base.reasoning?.relationAlgebras ?? {}) };
  for (const [algebraId, algebra] of Object.entries(relationAlgebras)) {
    relationAlgebras[algebraId] = {
      ...algebra,
      sourceKbVersions: kbSourcesOf({ kbSources: algebra.sourceKbVersions ?? [] }),
    };
  }
  for (const [predicate, policy] of Object.entries(induction.byPredicate)) {
    induction.byPredicate[predicate] = {
      ...policy,
      sourceKbVersions: kbSourcesOf({ kbSources: policy.sourceKbVersions ?? [] }),
    };
  }
  for (const model of orderedKnowledgeBases) {
    for (const [algebraId, algebra] of Object.entries(model.reasoning?.relationAlgebras ?? {})) {
      const existing = relationAlgebras[algebraId];
      if (existing && !sameSemantics(existing, algebra)) {
        throw new Error(`Conflicting typed relation algebras for ${algebraId}.`);
      }
      relationAlgebras[algebraId] = existing ? {
        ...existing,
        sourceKbVersions: mergeSources(
          { kbSources: existing.sourceKbVersions }, { kbSources: algebra.sourceKbVersions },
        ),
      } : {
        ...algebra,
        sourceKbVersions: kbSourcesOf({ kbSources: algebra.sourceKbVersions ?? [] }),
      };
    }
    for (const [predicate, values] of Object.entries(model.reasoning?.propertyValues ?? {})) {
      propertyValues[predicate] = sortedUniqueStrings([...(propertyValues[predicate] ?? []), ...values]);
    }
    const policy = model.reasoning?.induction;
    if (!policy?.enabled) continue;
    induction.enabled = true;
    induction.predicates = sortedUniqueStrings([...induction.predicates, ...policy.predicates]);
    induction.implicitPredicates = sortedUniqueStrings([
      ...induction.implicitPredicates,
      ...policy.implicitPredicates,
    ]);
    for (const [predicate, override] of Object.entries(policy.byPredicate ?? {})) {
      const existing = induction.byPredicate[predicate];
      if (existing && !sameSemantics(existing, override)) {
        throw new Error(`Conflicting induction policies for predicate ${predicate}.`);
      }
      induction.byPredicate[predicate] = existing ? {
        ...existing,
        sourceKbVersions: mergeSources(
          { kbSources: existing.sourceKbVersions }, { kbSources: override.sourceKbVersions },
        ),
      } : {
        ...override,
        sourceKbVersions: kbSourcesOf({ kbSources: override.sourceKbVersions ?? [] }),
      };
    }
  }
  const knowledgeBaseVersions = kbSourcesOf({
    kbSources: orderedKnowledgeBases.flatMap((model) => model.manifest.knowledgeBaseVersions ?? []),
  });
  const knowledgeBaseIds = sortedUniqueStrings([
    ...knowledgeBaseVersions.map((item) => item.kbId),
    ...orderedKnowledgeBases.flatMap((model) => model.manifest.knowledgeBases ?? []),
  ]);
  return {
    ...base,
    manifest: {
      ...base.manifest,
      modelId: orderedKnowledgeBases.map((model) => model.manifest.modelId).join('+'),
      knowledgeBases: knowledgeBaseIds,
      knowledgeBaseVersions,
      benchmarkComparable: false,
    },
    entities: mergeEntities(models),
    facts,
    rules: mergeRules(models),
    reasoning: {
      ...base.reasoning,
      propertyValues: sortedObject(propertyValues),
      induction: { ...induction, byPredicate: sortedObject(induction.byPredicate) },
      relationAlgebras: sortedObject(relationAlgebras),
    },
    indexes: serializedIndexes(facts),
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
