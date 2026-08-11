#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const canonical = join(root, 'training/KBs/world-relations-1.0/canonical/ontology.json');
const output = join(root, 'training/KBs/world-relations-1.0/package');
const bytes = await readFile(canonical);
const ontology = JSON.parse(bytes);
if (ontology.schema !== 'semantic-compatibility-ontology-v1') throw new Error('Invalid world relation ontology schema.');
for (const name of ['relations', 'binaryConstructions', 'prefixComparatives', 'unaryConstructions', 'implications']) {
  if (!ontology[name] || (name !== 'relations' && !Array.isArray(ontology[name]))) throw new Error(`World relation ontology is missing ${name}.`);
}
const sha = (value) => createHash('sha256').update(value).digest('hex');
const constructionCount = Object.values(ontology).filter(Array.isArray)
  .reduce((sum, values) => sum + values.length, 0);
await mkdir(join(output, 'ontology'), { recursive: true });
await writeFile(join(output, 'ontology', 'all.json'), `${JSON.stringify(ontology)}\n`, 'utf8');
const shardBytes = await readFile(join(output, 'ontology', 'all.json'));
const shards = [{ shardId: 'ontology-all', shardKind: 'semanticRelationOntology', accessPath: 'semantic-frame',
  dataRef: 'ontology/all.json', recordCount: constructionCount,
  compressedBytes: shardBytes.length, checksum: `sha256:${sha(shardBytes)}`, dependencies: [] }];
const manifest = {
  manifestType: 'knowledgeBasePackage', format: 'eslm-kb-package-v1', schemaVersion: '1',
  kbId: 'world-relations-1.0', kbVersion: '1.0.0', namespace: 'world-relations', id: 'world-relations-1.0',
  title: 'Authored general semantic relation ontology', version: '1.0.0', kind: 'semantic-relation-ontology',
  generatedBy: 'deterministic-node-compiler', license: 'MIT', trainOnly: false, benchmarkEligible: false,
  counts: { relations: Object.keys(ontology.relations).length, constructions: shards[0].recordCount },
  capabilities: ['argument-sensitive-compatibility', 'inverse-relations', 'polarity', 'property-implication'],
  limitations: ['reviewed English constructions only', 'plausibility evidence is graded rather than deductively certain'],
  provider: 'world-relations-v1', shardDirectoryRef: 'shards.json',
  canonicalSource: { path: '../canonical/ontology.json', checksum: `sha256:${sha(bytes)}`, recordCount: shards[0].recordCount },
};
await writeFile(join(output, 'shards.json'), `${JSON.stringify(shards, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(join(dirname(output), 'source-manifest.json'), `${JSON.stringify({
  format: 'eslm-source-manifest-v1', id: manifest.kbId, source: 'repository-authored-reviewed-semantic-ontology',
  canonicalSha256: sha(bytes), license: 'MIT', benchmarkRowsIncluded: false,
}, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ format: 'eslm-kb-build-report-v2', dataset: manifest.kbId,
  status: 'compiled-authored-ontology', manifest }, null, 2)}\n`);
