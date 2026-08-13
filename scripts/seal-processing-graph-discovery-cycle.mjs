#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  buildResearchDiscoveryCycle,
  publishResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-builder.mjs';

const [planPath, analysisPath, reviewPath, outputPath, ...rest] = process.argv.slice(2);
if (!planPath || !analysisPath || !reviewPath || !outputPath || rest.length > 0) {
  throw new Error(
    'Usage: seal-processing-graph-discovery-cycle.mjs PLAN.json ANALYSIS.json REVIEW.json OUTPUT.json',
  );
}
const [plan, analysis, review] = await Promise.all([planPath, analysisPath, reviewPath]
  .map((path) => readFile(path, 'utf8').then(JSON.parse)));
const cycle = buildResearchDiscoveryCycle({ plan, analysis, review });
const published = await publishResearchDiscoveryCycle(cycle, outputPath, { plan, analysis });
process.stdout.write(`${JSON.stringify({
  format: cycle.format,
  cycleId: cycle.cycleId,
  state: cycle.state,
  reviewedHypotheses: cycle.hypotheses.length,
  unreviewedMachineHypotheses: cycle.unreviewedAnalysisHypothesisIds.length,
  receiptDigest: cycle.receiptDigest,
  published,
}, null, 2)}\n`);
