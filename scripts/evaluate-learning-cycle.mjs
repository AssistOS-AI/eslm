#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EslmEngine } from '../src/engine.mjs';
import { readJsonLines } from '../src/io.mjs';
import { loadModel } from '../src/model-loader.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function directoryBytes(path) {
  let total = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    total += entry.isDirectory() ? await directoryBytes(child) : (await stat(child)).size;
  }
  return total;
}

const suite = resolve(option('--suite'));
const output = resolve(option('--output'));
const modelPath = resolve(option('--model', 'training/model/manifest.mjs'));
const dataset = option('--dataset');
const pool = option('--pool');
const checkpoint = option('--checkpoint');
const seed = Number.parseInt(option('--seed', '20260810'), 10);
if (!suite || !output || !dataset || !pool || !checkpoint) throw new Error('--suite, --output, --dataset, --pool, and --checkpoint are required.');
const cases = await readJsonLines(suite);
const startMemory = process.memoryUsage();
const started = performance.now();
const engine = new EslmEngine(await loadModel(modelPath));
let correct = 0;
let validProofs = 0;
let executionFailures = 0;
for (const item of cases) {
  try {
    const result = engine.ask(`${item.context} ${item.text}`);
    const expected = JSON.stringify([...(item.values ?? [item.answer])].sort());
    const pass = expected === JSON.stringify([...(result.values ?? [])].sort());
    if (pass) {
      correct += 1;
      if ((result.provenance ?? []).length > 0 && ['induction', 'deduction', 'retrieval'].includes(result.reasoning?.method)) validProofs += 1;
    }
  } catch { executionFailures += 1; }
}
const memory = process.memoryUsage();
const accuracy = cases.length ? correct / cases.length : 0;
const report = {
  format: 'eslm-learning-evaluation-v1', checkpoint, dataset, pool, seed, cases: cases.length,
  metrics: {
    overallAccuracy: accuracy,
    freshAccuracy: pool === 'fresh' || pool === 'shadow' ? accuracy : undefined,
    regressionAccuracy: pool === 'regression' ? accuracy : undefined,
    metamorphicConsistency: undefined,
    proofValidity: correct ? validProofs / correct : 1,
    abstentionPrecision: undefined,
    executionFailures,
    latencyMilliseconds: (performance.now() - started) / Math.max(1, cases.length),
    rssBytes: memory.rss - startMemory.rss,
    kbBytes: 0,
    coreBytes: await directoryBytes(resolve('src')),
  },
  capabilities: { 'class-property-induction': { cases: cases.length, accuracy } },
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
