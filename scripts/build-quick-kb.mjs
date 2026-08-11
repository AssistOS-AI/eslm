#!/usr/bin/env node
import { resolve } from 'node:path';
import { compileKnowledgeBase } from '../src/kb/compiler.mjs';

const root = resolve(import.meta.dirname, '..');
const result = await compileKnowledgeBase({
  canonicalPath: resolve(root, 'training/KBs/quick/canonical/records.jsonl'),
  outputDirectory: resolve(root, 'training/KBs/quick/package'),
  packageMetadata: {
    kbId: 'quick',
    kbVersion: '1.0.0',
    namespace: 'quick',
    languages: ['en'],
    domains: ['development-fixture'],
    dependencies: [],
    capabilities: ['classification', 'capability', 'safe-horn-deduction'],
    trustLevel: 'repository-reviewed-fixture',
    benchmarkEligible: false,
    license: 'MIT repository fixture',
  },
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
