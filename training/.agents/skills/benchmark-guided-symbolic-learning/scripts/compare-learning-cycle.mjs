#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [baselinePath, candidatePath, outputPath] = process.argv.slice(2).map((value) => value && resolve(value));
if (!baselinePath || !candidatePath || !outputPath) throw new Error('Usage: compare-learning-cycle.mjs BASELINE.json CANDIDATE.json OUTPUT.json');
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const candidate = JSON.parse(await readFile(candidatePath, 'utf8'));
for (const report of [baseline, candidate]) {
  if (report.format !== 'eslm-learning-evaluation-v1') throw new Error('Both reports must use eslm-learning-evaluation-v1.');
  if (!report.metrics || !report.capabilities) throw new Error('Each report requires metrics and capabilities.');
}
if (baseline.dataset !== candidate.dataset || baseline.pool !== candidate.pool) throw new Error('Dataset and pool must match.');
const metricNames = [...new Set([...Object.keys(baseline.metrics), ...Object.keys(candidate.metrics)])];
const metrics = Object.fromEntries(metricNames.map((name) => [name, {
  baseline: baseline.metrics[name], candidate: candidate.metrics[name],
  delta: typeof baseline.metrics[name] === 'number' && typeof candidate.metrics[name] === 'number'
    ? candidate.metrics[name] - baseline.metrics[name] : undefined,
}]));
const capabilityNames = [...new Set([...Object.keys(baseline.capabilities), ...Object.keys(candidate.capabilities)])];
const capabilities = Object.fromEntries(capabilityNames.map((name) => [name, {
  baseline: baseline.capabilities[name], candidate: candidate.capabilities[name],
  accuracyDelta: (candidate.capabilities[name]?.accuracy ?? 0) - (baseline.capabilities[name]?.accuracy ?? 0),
}]));
const hardFailures = [];
if ((metrics.executionFailures?.delta ?? 0) > 0) hardFailures.push('execution failures increased');
if ((metrics.proofValidity?.delta ?? 0) < -0.005) hardFailures.push('proof validity regressed');
if ((metrics.regressionAccuracy?.delta ?? 0) < -0.005) hardFailures.push('regression accuracy materially regressed');
if ((metrics.metamorphicConsistency?.delta ?? 0) < -0.01) hardFailures.push('metamorphic consistency regressed');
const comparison = {
  format: 'eslm-learning-comparison-v1', dataset: baseline.dataset, pool: baseline.pool,
  baseline: baseline.checkpoint, candidate: candidate.checkpoint, metrics, capabilities,
  decision: hardFailures.length === 0 ? 'eligible-for-human-acceptance-review' : 'reject-or-revise', hardFailures,
};
await writeFile(outputPath, `${JSON.stringify(comparison, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);
