#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [baselineValue, candidateValue] = process.argv.slice(2);
const baseline = JSON.parse(await readFile(resolve(baselineValue), 'utf8'));
const candidate = JSON.parse(await readFile(resolve(candidateValue), 'utf8'));
if (baseline.format !== 'eslm-learning-evaluation-v1' || candidate.format !== baseline.format) throw new Error('Evaluation formats do not match.');
const metrics = ['overallAccuracy', 'freshAccuracy', 'regressionAccuracy', 'metamorphicConsistency', 'proofValidity', 'abstentionPrecision'];
const deltas = Object.fromEntries(metrics.map((name) => [name, (candidate.metrics[name] ?? 0) - (baseline.metrics[name] ?? 0)]));
const hardFailures = [];
if ((candidate.metrics.executionFailures ?? 0) > (baseline.metrics.executionFailures ?? 0)) hardFailures.push('execution failures increased');
for (const name of ['regressionAccuracy', 'metamorphicConsistency', 'proofValidity']) if (deltas[name] < -0.001) hardFailures.push(`${name} regressed`);
process.stdout.write(`${JSON.stringify({ eligible: hardFailures.length === 0, deltas, hardFailures }, null, 2)}\n`);
