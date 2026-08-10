#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const planPath = resolve(process.argv[2] ?? '');
const resultsDirectory = resolve(process.argv[3] ?? '');
const outputPath = resolve(process.argv[4] ?? '');
if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
  throw new Error('Usage: reduce-parallel-results.mjs PLAN RESULTS_DIRECTORY OUTPUT_JSON');
}
const plan = JSON.parse(await readFile(planPath, 'utf8'));
if (plan.format !== 'eslm-parallel-synthesis-plan-v1') throw new Error('Unsupported parallel plan.');
const expectedChunks = new Map();
for (const assignment of plan.assignments) {
  for (const chunk of assignment.chunks) {
    if (expectedChunks.has(chunk.path)) throw new Error(`Plan duplicates chunk ${chunk.path}.`);
    expectedChunks.set(chunk.path, { ...chunk, workerId: assignment.workerId });
  }
}
const seen = new Set();
const reducedChunks = [];
for (const assignment of plan.assignments) {
  const path = join(resultsDirectory, `${assignment.workerId}.json`);
  const text = await readFile(path, 'utf8');
  if (/(?:^|[/\\])test(?:[._/\\-]|$)|agent-hidden/iu.test(text)) {
    throw new Error(`${assignment.workerId} result appears to reference hidden test material.`);
  }
  const result = JSON.parse(text);
  if (result.format !== 'eslm-parallel-worker-result-v1') throw new Error(`${assignment.workerId} has an invalid result format.`);
  if (result.workerId !== assignment.workerId || result.assignmentDigest !== assignment.assignmentDigest) {
    throw new Error(`${assignment.workerId} result does not match its assignment.`);
  }
  if (!Array.isArray(result.chunks)) throw new Error(`${assignment.workerId} result requires chunks.`);
  for (const chunk of result.chunks) {
    const expected = expectedChunks.get(chunk.path);
    if (!expected || expected.workerId !== assignment.workerId || expected.sha256 !== chunk.sha256) {
      throw new Error(`${assignment.workerId} returned an unassigned or mismatched chunk ${chunk.path}.`);
    }
    if (seen.has(chunk.path)) throw new Error(`Duplicate worker result for ${chunk.path}.`);
    seen.add(chunk.path);
    reducedChunks.push({
      path: chunk.path,
      sha256: chunk.sha256,
      workerId: assignment.workerId,
      observations: chunk.observations ?? [],
      signatures: chunk.signatures ?? [],
      emittedSymbols: chunk.emittedSymbols ?? [],
      unresolved: chunk.unresolved ?? [],
    });
  }
}
if (seen.size !== expectedChunks.size) {
  const missing = [...expectedChunks.keys()].filter((path) => !seen.has(path));
  throw new Error(`Parallel results are incomplete; missing ${missing.join(', ')}.`);
}
const sortValues = (values) => [...values].sort((left, right) =>
  JSON.stringify(left).localeCompare(JSON.stringify(right)));
reducedChunks.sort((left, right) => left.path.localeCompare(right.path));
for (const chunk of reducedChunks) {
  chunk.observations = sortValues(chunk.observations);
  chunk.signatures = sortValues(chunk.signatures);
  chunk.emittedSymbols = sortValues(chunk.emittedSymbols);
  chunk.unresolved = sortValues(chunk.unresolved);
}
const reduced = {
  format: 'eslm-parallel-reduction-v1',
  dataset: plan.dataset,
  trainDigest: plan.trainDigest,
  planDigest: plan.planDigest,
  workers: plan.workerCount,
  chunks: reducedChunks,
  coordinatorPolicy: 'global symbols and candidate modules are generated only after this reduction',
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(reduced, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ output: outputPath, workers: plan.workerCount, chunks: reducedChunks.length })}\n`);
