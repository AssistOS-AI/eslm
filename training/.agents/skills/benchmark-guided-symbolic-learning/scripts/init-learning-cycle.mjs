#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

function option(name, required = false) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

async function fileIdentity(candidate) {
  if (!candidate) return undefined;
  const path = resolve(candidate);
  const bytes = await readFile(path);
  return { path, file: basename(path), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

const output = resolve(option('--output', true));
const dataset = option('--dataset', true);
const checkpoint = option('--checkpoint', true);
const hypothesis = option('--hypothesis', true);
const classification = option('--classification', true);
if (!['kb', 'core', 'undecided'].includes(classification)) throw new Error('--classification must be kb, core, or undecided.');
const pools = {};
for (const name of ['working', 'regression', 'fresh', 'shadow']) pools[name] = await fileIdentity(option(`--${name}`));
const cycle = {
  format: 'eslm-learning-cycle-v1', dataset, checkpoint, hypothesis, classification,
  targetCluster: option('--cluster') ?? 'unclassified', seed: Number.parseInt(option('--seed') ?? '20260810', 10),
  pools, state: 'candidate-not-evaluated',
};
await mkdir(output, { recursive: false });
await writeFile(resolve(output, 'cycle.json'), `${JSON.stringify(cycle, null, 2)}\n`, 'utf8');
await writeFile(resolve(output, 'pools.json'), `${JSON.stringify({ format: 'eslm-learning-pools-v1', dataset, pools }, null, 2)}\n`, 'utf8');
await writeFile(resolve(output, 'research-note.md'), `# Learning cycle: ${dataset}\n\nObserved failure cluster:\n\nRoot cause and trace evidence:\n\nChange:\n\nWhy KB or why core:\n\nTarget result before/after:\n\nFresh result:\n\nMetamorphic result:\n\nRegression result:\n\nProof audit:\n\nLatency, memory, KB, and core growth:\n\nRemaining counterexamples and uncertainty:\n\nAccepted checkpoint or rejection reason:\n`, 'utf8');
process.stdout.write(`${JSON.stringify(cycle, null, 2)}\n`);
