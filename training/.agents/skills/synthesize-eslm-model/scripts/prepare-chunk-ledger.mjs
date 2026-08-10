#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const manifestPath = resolve(process.argv[2] ?? '');
const outputPath = resolve(process.argv[3] ?? '');
if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: prepare-chunk-ledger.mjs PREPARED_MANIFEST OUTPUT_LEDGER');
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.format !== 'eslm-prepared-dataset-v1') throw new Error('Unsupported prepared manifest.');
if (manifest.leakagePolicy?.train !== 'agent-visible') throw new Error('Train split is not agent-visible.');
if (manifest.leakagePolicy?.test !== 'agent-hidden') throw new Error('Test split is not agent-hidden.');
if (!Array.isArray(manifest.splits?.train?.chunks)) throw new Error('Train chunk inventory is missing.');

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function readReferenced(path) {
  let directory = dirname(manifestPath);
  for (let depth = 0; depth < 10; depth += 1) {
    try { return await readFile(join(directory, path)); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`Cannot resolve chunk path ${path} from manifest ancestors.`);
}
const chunks = [];
for (const [index, chunk] of manifest.splits.train.chunks.entries()) {
  const actual = digest(await readReferenced(chunk.path));
  if (actual !== chunk.sha256) throw new Error(`Chunk ${index + 1} digest mismatch.`);
  chunks.push({ ...chunk, status: 'pending', observations: [], emittedSymbols: [], unresolved: [] });
}
const ledger = {
  format: 'eslm-chunk-ledger-v1',
  dataset: manifest.id,
  trainDigest: manifest.splits.train.sha256,
  sourceRecords: manifest.splits.train.cases,
  chunks,
  totals: { pending: chunks.length, inProgress: 0, complete: 0, failed: 0 },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ output: outputPath, chunks: chunks.length, sourceRecords: ledger.sourceRecords })}\n`);
