import { join } from 'node:path';
import { KB_CATALOG } from './kbs.mjs';
import { compileKnowledgeBase } from './kb/compiler.mjs';
import { PROJECT_ROOT } from './paths.mjs';

export async function buildKnowledgeBase(id) {
  const entry = KB_CATALOG[id];
  if (!entry) throw new Error(`Unknown knowledge base: ${id}`);
  return compileKnowledgeBase({
    canonicalPath: join(PROJECT_ROOT, entry.source),
    outputDirectory: join(PROJECT_ROOT, 'training/KBs', id, 'package'),
    packageMetadata: {
      kbId: id,
      kbVersion: '1.0.0',
      namespace: id,
      languages: ['en'],
      domains: [entry.domain],
      dependencies: [],
      capabilities: entry.capabilities ?? ['classification', 'capability', 'safe-horn-deduction'],
      trustLevel: entry.trustLevel ?? 'repository-reviewed-fixture',
      benchmarkEligible: false,
      license: entry.license ?? 'MIT repository fixture',
    },
  });
}

export async function buildKnowledgeBases(ids = Object.keys(KB_CATALOG)) {
  const results = [];
  for (const id of ids) results.push(await buildKnowledgeBase(id));
  return results;
}
