#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ledgerPath = resolve(process.argv[2] ?? '');
const outputDirectory = resolve(process.argv[3] ?? '');
const workerCount = Number.parseInt(process.argv[4] ?? '', 10);
if (!process.argv[2] || !process.argv[3] || !Number.isInteger(workerCount) || workerCount < 1) {
  throw new Error('Usage: prepare-parallel-assignments.mjs LEDGER OUTPUT_DIRECTORY WORKER_COUNT');
}

const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = (value) => createHash('sha256').update(stable(value)).digest('hex');
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
if (ledger.format !== 'eslm-chunk-ledger-v1') throw new Error('Unsupported chunk ledger.');
const chunks = ledger.chunks.filter((chunk) => chunk.status !== 'complete');
if (chunks.length === 0) throw new Error('The ledger has no incomplete chunks to assign.');

const assignments = Array.from({ length: Math.min(workerCount, chunks.length) }, (_, index) => ({
  format: 'eslm-parallel-worker-assignment-v1',
  workerId: `worker-${String(index + 1).padStart(3, '0')}`,
  dataset: ledger.dataset,
  trainDigest: ledger.trainDigest,
  leakagePolicy: 'train-only; do not request or inspect the prepared manifest or test split',
  chunks: [],
}));
chunks.forEach((chunk, index) => assignments[index % assignments.length].chunks.push({
  path: chunk.path, records: chunk.records, sha256: chunk.sha256,
}));
for (const assignment of assignments) assignment.assignmentDigest = digest(assignment);
const plan = {
  format: 'eslm-parallel-synthesis-plan-v1',
  dataset: ledger.dataset,
  trainDigest: ledger.trainDigest,
  sourceLedgerDigest: digest(ledger),
  workerCount: assignments.length,
  chunkCount: chunks.length,
  assignments: assignments.map((assignment) => ({
    workerId: assignment.workerId,
    assignmentDigest: assignment.assignmentDigest,
    file: `assignments/${assignment.workerId}.json`,
    chunks: assignment.chunks.map((chunk) => ({ path: chunk.path, sha256: chunk.sha256 })),
  })),
};
plan.planDigest = digest(plan);
await mkdir(join(outputDirectory, 'assignments'), { recursive: true });
await Promise.all(assignments.map((assignment) => writeFile(
  join(outputDirectory, 'assignments', `${assignment.workerId}.json`),
  `${JSON.stringify(assignment, null, 2)}\n`, 'utf8',
)));
await writeFile(join(outputDirectory, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ outputDirectory, workers: assignments.length, chunks: chunks.length, planDigest: plan.planDigest })}\n`);
