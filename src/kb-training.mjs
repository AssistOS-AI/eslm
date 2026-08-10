import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  KB_CATALOG, loadKnowledgeBase, mergeModels, summarizeKnowledgeBase,
} from './kbs.mjs';
import { serializedIndexes } from './model-loader.mjs';
import { PROJECT_ROOT } from './paths.mjs';
import { hashFile } from './util.mjs';

function moduleSource(value) {
  return `export default Object.freeze(${JSON.stringify(value, null, 2)});\n`;
}

function assertSource(source, id) {
  if (source.format !== 'eslm-kb-source-v1' || source.id !== id) {
    throw new Error(`Knowledge source ${id} has an invalid format or id.`);
  }
  for (const field of ['entities', 'facts', 'rules', 'constructions', 'examples']) {
    if (!Array.isArray(source[field])) throw new Error(`Knowledge source ${id} requires ${field}.`);
  }
  const entities = new Set(source.entities.map((entity) => entity.id));
  for (const fact of source.facts) {
    if (!entities.has(fact.subject)) throw new Error(`${id}: unknown fact subject ${fact.subject}.`);
    if (fact.object && !entities.has(fact.object)) throw new Error(`${id}: unknown fact object ${fact.object}.`);
    if (Boolean(fact.object) === Boolean(fact.value)) throw new Error(`${id}: fact ${fact.id} needs one object or value.`);
  }
}

export async function buildKnowledgeBase(id) {
  const entry = KB_CATALOG[id];
  if (!entry) throw new Error(`Unknown knowledge base: ${id}`);
  if (entry.bundle) {
    const members = [];
    for (const member of entry.bundle) {
      await buildKnowledgeBase(member);
      members.push(await loadKnowledgeBase(member));
    }
    const emptyBase = {
      manifest: { format: 'eslm-code-model-v1', modelId: 'quick-base', benchmarkComparable: false },
      entities: [], facts: [], rules: [],
      lexicon: { variants: {}, constructions: [] },
      reasoning: {
        deduction: { maxRounds: 8 },
        induction: { enabled: false, predicates: [], minSupport: 3, minCoverage: 0.7 },
        abduction: { maxHypotheses: 4 }, classes: { singular: {} },
      },
      indexes: serializedIndexes([]),
    };
    const merged = mergeModels(emptyBase, members);
    merged.manifest = {
      ...merged.manifest,
      modelId: 'quick',
      title: entry.title,
      version: '1.0.0',
      generatedAt: '2026-08-10T00:00:00.000Z',
      generatedBy: 'coding-agent',
      evidenceRegime: 'authored-development-fixtures',
      scope: entry.domain,
      examples: members.flatMap((model) => model.manifest.examples ?? []),
      knowledgeBases: ['quick'],
      benchmarkEligible: false,
      benchmarkComparable: false,
    };
    const outputDirectory = dirname(join(PROJECT_ROOT, entry.model));
    await mkdir(outputDirectory, { recursive: true });
    const files = {
      'entities.mjs': moduleSource(merged.entities),
      'facts.mjs': moduleSource(merged.facts),
      'rules.mjs': moduleSource(merged.rules),
      'language.mjs': moduleSource(merged.lexicon),
      'reasoning.mjs': moduleSource(merged.reasoning),
      'indexes.mjs': moduleSource(merged.indexes),
      'manifest.mjs': [
        "import entities from './entities.mjs';",
        "import facts from './facts.mjs';",
        "import indexes from './indexes.mjs';",
        "import language from './language.mjs';",
        "import reasoning from './reasoning.mjs';",
        "import rules from './rules.mjs';",
        '',
        `export const model = Object.freeze({ manifest: Object.freeze(${JSON.stringify(merged.manifest, null, 2)}), entities, facts, rules, lexicon: language, reasoning, indexes });`,
        'export default model;',
        '',
      ].join('\n'),
    };
    await Promise.all(Object.entries(files).map(([name, content]) =>
      writeFile(join(outputDirectory, name), content, 'utf8')));
    return summarizeKnowledgeBase(await loadKnowledgeBase(id));
  }
  const sourcePath = join(PROJECT_ROOT, entry.source);
  const outputDirectory = dirname(join(PROJECT_ROOT, entry.model));
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  assertSource(source, id);
  const facts = source.facts.map((fact) => ({
    ...fact,
    provenance: fact.provenance ?? [`generated-kb:${fact.id}`],
  }));
  const rules = source.rules.map((rule) => ({
    ...rule,
    source: rule.source ?? `generated-kb:${rule.id}`,
  }));
  const manifest = {
    format: 'eslm-code-model-v1',
    modelId: id,
    title: source.title,
    version: source.version,
    generatedAt: source.generatedAt,
    generatedBy: 'coding-agent',
    sourceDigest: await hashFile(sourcePath),
    evidenceRegime: 'generated-educational-kb',
    benchmarkEligible: false,
    scope: source.scope,
    examples: source.examples,
  };
  const language = { variants: source.variants ?? {}, constructions: source.constructions };
  const reasoning = {
    deduction: { maxRounds: source.maxRounds ?? 8 },
    induction: { enabled: false, predicates: [], minSupport: 3, minCoverage: 0.7 },
    abduction: { maxHypotheses: 4 },
    classes: { singular: source.singular ?? {} },
  };
  await mkdir(outputDirectory, { recursive: true });
  const files = {
    'entities.mjs': moduleSource(source.entities),
    'facts.mjs': moduleSource(facts),
    'rules.mjs': moduleSource(rules),
    'language.mjs': moduleSource(language),
    'reasoning.mjs': moduleSource(reasoning),
    'indexes.mjs': moduleSource(serializedIndexes(facts)),
    'manifest.mjs': [
      "import entities from './entities.mjs';",
      "import facts from './facts.mjs';",
      "import indexes from './indexes.mjs';",
      "import language from './language.mjs';",
      "import reasoning from './reasoning.mjs';",
      "import rules from './rules.mjs';",
      '',
      `export const model = Object.freeze({ manifest: Object.freeze(${JSON.stringify(manifest, null, 2)}), entities, facts, rules, lexicon: language, reasoning, indexes });`,
      'export default model;',
      '',
    ].join('\n'),
  };
  await Promise.all(Object.entries(files).map(([name, content]) =>
    writeFile(join(outputDirectory, name), content, 'utf8')));
  return summarizeKnowledgeBase(await loadKnowledgeBase(id));
}

export async function buildKnowledgeBases(ids = Object.keys(KB_CATALOG)) {
  const results = [];
  for (const id of ids) results.push(await buildKnowledgeBase(id));
  return results;
}
