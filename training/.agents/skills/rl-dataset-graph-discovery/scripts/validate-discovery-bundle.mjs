#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { exactKeys, output, plainObject } from './contract-helpers.mjs';
import {
  bindPlanToManifests, expectedRegistry, assertPlanIdentity,
} from './bundle-bindings.mjs';
import { assertPortableResearchAnalysis } from './analysis-replay-validator.mjs';
import { assertSplitCoverage } from './split-coverage.mjs';
import { sourceAdmissionReceiptDigest } from './source-admission-receipt.mjs';
const execute = promisify(execFile);
const [manifestList, planPath, analysisPath, cyclePath, logPath, readinessPath] = process.argv.slice(2);
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
if (!manifestList || !planPath || !analysisPath || !cyclePath || !logPath) {
  throw new Error(
    'Usage: validate-discovery-bundle.mjs MANIFEST[,MANIFEST...] PLAN.json ANALYSIS.json CYCLE.json DISCOVERY_LOG.md [READINESS.json]',
  );
}
const manifestPaths = manifestList.split(',');
if (manifestPaths.length > 128 || manifestPaths.some((path) => path.length === 0)) {
  throw new TypeError('Manifest list must contain 1 to 128 non-empty comma-separated paths.');
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).toSorted().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function sha256(value) { return `sha256:${createHash('sha256').update(value).digest('hex')}`; }
async function readJsonArtifact(path, label) {
  const bytes = await readFile(resolve(path));
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new TypeError(`${label} must contain valid JSON: ${error.message}`);
  }
  plainObject(value, label);
  return { value, digest: sha256(bytes) };
}
async function runValidator(scriptName, argumentsList, label) {
  const script = fileURLToPath(new URL(`./${scriptName}`, import.meta.url));
  try {
    await execute(process.execPath, [script, ...argumentsList], { maxBuffer: 16 * 1_024 * 1_024 });
  } catch (error) {
    const detail = error.stderr?.trim() || error.stdout?.trim() || error.message;
    throw new TypeError(`${label} failed individual validation: ${detail}`);
  }
}
function discoveryCycleSection(markdown, cycleId) {
  const headings = [...markdown.matchAll(/^## Cycle \d{3} .+$/gmu)];
  const index = headings.findIndex((heading) => heading[0].includes(cycleId));
  if (index === -1) throw new TypeError(`Discovery log is missing the cycle ID: ${cycleId}.`);
  const start = headings[index].index;
  const nextCycle = headings[index + 1]?.index ?? markdown.length;
  const nextReview = markdown.indexOf('\n## Next review', start);
  const end = nextReview !== -1 && nextReview < nextCycle ? nextReview : nextCycle;
  return markdown.slice(start, end);
}
function requireLogText(section, value, label) {
  if (!section.includes(value)) throw new TypeError(`Discovery log is missing the ${label}: ${value}.`);
}
function assertReadiness(readinessArtifact, bindings, planArtifact, registry) {
  if (!readinessArtifact) return null;
  const readiness = readinessArtifact.value;
  exactKeys(readiness, [
    'format', 'sourceRevision', 'componentId', 'projectionId', 'sourceManifestDigest',
    'pilotProjectionDigest', 'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest',
    'preflightReceiptDigest', 'sourceAdmissionReceiptDigest', 'pilot', 'streaming',
    'rights', 'contamination', 'scalePlan', 'decision',
  ], 'Large-source readiness');
  if (readiness.format !== 'eslm-rl-large-source-readiness-v1') {
    throw new TypeError('Large-source readiness protocol is unsupported.');
  }
  for (const field of [
    'sourceManifestDigest', 'pilotProjectionDigest', 'discoveryPlanArtifactDigest',
    'discoveryPlanContentDigest', 'preflightReceiptDigest', 'sourceAdmissionReceiptDigest',
  ]) {
    if (!SHA256.test(readiness[field])) {
      throw new TypeError(`Large-source readiness.${field} must be a SHA-256 digest.`);
    }
  }
  exactKeys(readiness.pilot, [
    'rowsAvailable', 'rowsVisited', 'strataAvailable', 'strataVisited',
    'projectionLossRate', 'complete',
  ], 'Large-source readiness.pilot');
  exactKeys(readiness.streaming, [
    'deterministicReplay', 'shardEquivalence', 'inputStreamResumeTested',
    'peakBytes', 'maximumPeakBytes',
  ], 'Large-source readiness.streaming');
  exactKeys(readiness.rights, ['state', 'removalPlanTested'], 'Large-source readiness.rights');
  exactKeys(readiness.contamination, [
    'lineageFrozen', 'protectedIsolationVerified', 'knownOverlaps',
  ], 'Large-source readiness.contamination');
  exactKeys(readiness.scalePlan, [
    'stage', 'shards', 'maximumRows', 'maximumBytes', 'maximumPeakBytes',
    'checkpointEveryShards', 'stopConditions',
  ], 'Large-source readiness.scalePlan');
  const counts = [
    readiness.pilot.rowsAvailable, readiness.pilot.rowsVisited,
    readiness.pilot.strataAvailable, readiness.pilot.strataVisited,
    readiness.streaming.peakBytes, readiness.streaming.maximumPeakBytes,
    readiness.scalePlan.shards, readiness.scalePlan.maximumRows,
    readiness.scalePlan.maximumBytes, readiness.scalePlan.maximumPeakBytes,
    readiness.scalePlan.checkpointEveryShards,
  ];
  if (counts.some((value) => !Number.isSafeInteger(value) || value < 0)
      || !Number.isFinite(readiness.pilot.projectionLossRate)
      || readiness.pilot.projectionLossRate < 0 || readiness.pilot.projectionLossRate > 1
      || !Array.isArray(readiness.contamination.knownOverlaps)
      || new Set(readiness.contamination.knownOverlaps).size
        !== readiness.contamination.knownOverlaps.length
      || !Array.isArray(readiness.scalePlan.stopConditions)
      || readiness.scalePlan.stopConditions.length < 1
      || new Set(readiness.scalePlan.stopConditions).size
        !== readiness.scalePlan.stopConditions.length) {
    throw new TypeError('Large-source readiness contains invalid bounded counters, rates, or lists.');
  }
  const failures = [];
  if (!readiness.pilot.complete || readiness.pilot.rowsVisited !== readiness.pilot.rowsAvailable
      || readiness.pilot.strataVisited !== readiness.pilot.strataAvailable) {
    failures.push('pilot-incomplete');
  }
  if (!readiness.streaming.deterministicReplay || !readiness.streaming.shardEquivalence
      || !readiness.streaming.inputStreamResumeTested) failures.push('streaming-not-verified');
  if (readiness.streaming.peakBytes > readiness.streaming.maximumPeakBytes) {
    failures.push('peak-memory-exceeded');
  }
  if (readiness.rights.state !== 'approved' || !readiness.rights.removalPlanTested) {
    failures.push('rights-gate-open');
  }
  if (!readiness.contamination.lineageFrozen
      || !readiness.contamination.protectedIsolationVerified) {
    failures.push('contamination-gate-open');
  }
  if (readiness.scalePlan.stage !== 'large-corpus'
      || readiness.scalePlan.maximumPeakBytes !== readiness.streaming.maximumPeakBytes
      || !['admit', 'block'].includes(readiness.decision)
      || (failures.length === 0) !== (readiness.decision === 'admit')) {
    throw new TypeError('Large-source readiness decision contradicts its individual gates.');
  }
  const key = `${readiness.sourceRevision}\u0000${readiness.componentId}`;
  const scoped = bindings.scopes.get(key);
  if (!scoped) throw new TypeError('Readiness must resolve to exactly one supplied plan component.');
  const { component } = scoped.binding;
  const admitted = scoped.scope.splits.reduce((sum, split) => sum + split.rowsAdmitted, 0);
  const trainingRows = component.splits.filter((split) => split.visibility === 'training-visible')
    .reduce((sum, split) => sum + split.rows, 0);
  if (readiness.projectionId !== component.projection.projectionId
      || readiness.pilotProjectionDigest !== component.projection.membershipDigest
      || readiness.sourceManifestDigest !== scoped.binding.manifestArtifact.digest
      || readiness.discoveryPlanArtifactDigest !== planArtifact.digest
      || readiness.discoveryPlanContentDigest !== sha256(stable(planArtifact.value))
      || readiness.sourceAdmissionReceiptDigest
        !== sourceAdmissionReceiptDigest({ registry, bindings, planArtifact })
      || planArtifact.value.workPolicy.progressionStage !== 'scale'
      || readiness.pilot.rowsAvailable !== admitted || readiness.pilot.rowsVisited !== admitted
      || readiness.scalePlan.shards !== component.projection.shardCount
      || readiness.scalePlan.maximumRows !== trainingRows
      || readiness.scalePlan.maximumBytes < component.identity.bytes
      || readiness.scalePlan.maximumPeakBytes !== readiness.streaming.maximumPeakBytes) {
    throw new TypeError('Readiness does not bind the exact manifest, plan, projection, or scale scope.');
  }
  return readinessArtifact.digest;
}
const manifestArtifacts = await Promise.all(manifestPaths.map((path, index) =>
  readJsonArtifact(path, `Source manifest[${index}]`)));
const [planArtifact, analysisArtifact, cycleArtifact, readinessArtifact, log] = await Promise.all([
  readJsonArtifact(planPath, 'Discovery plan'),
  readJsonArtifact(analysisPath, 'Research analysis'),
  readJsonArtifact(cyclePath, 'Discovery cycle'),
  readinessPath ? readJsonArtifact(readinessPath, 'Large-source readiness') : null,
  readFile(resolve(logPath), 'utf8'),
]);
await Promise.all([
  ...manifestPaths.map((path, index) => runValidator(
    'validate-source-manifest.mjs', [path], `Source manifest[${index}]`,
  )),
  runValidator('validate-discovery-plan.mjs', [planPath], 'Discovery plan'),
  runValidator('validate-discovery-cycle.mjs', [planPath, analysisPath, cyclePath], 'Discovery cycle'),
  runValidator('validate-discovery-log.mjs', [logPath], 'Discovery log'),
]);
const plan = planArtifact.value;
const analysis = analysisArtifact.value;
const cycle = cycleArtifact.value;
const bindings = bindPlanToManifests(manifestArtifacts, plan);
const registry = expectedRegistry(bindings);
assertPlanIdentity(plan, analysis);
assertPortableResearchAnalysis(analysis, { expectedRegistry: registry });
const splitTotals = assertSplitCoverage(analysis, registry);
if (cycle.cycleId !== plan.cycleId
    || cycle.analysisBinding.receiptDigest !== analysis.receiptDigest
    || cycle.analysisBinding.registryDigest !== registry.digest
    || cycle.analysisBinding.baselineGraphDigest !== plan.baselineGraphDigest) {
  throw new TypeError('Post-analysis cycle does not bind the exact plan, analysis, registry, and baseline.');
}
const readinessDigest = assertReadiness(readinessArtifact, bindings, planArtifact, registry);
const logCycle = discoveryCycleSection(log, cycle.cycleId);
for (const [value, label] of [
  [plan.question, 'structural question'],
  [plan.nullHypothesis, 'null hypothesis'],
  [planArtifact.digest, 'discovery-plan byte digest'],
  [analysisArtifact.digest, 'analysis byte digest'],
  [analysis.receiptDigest, 'analysis receipt digest'],
  [cycleArtifact.digest, 'cycle byte digest'],
  [cycle.receiptDigest, 'cycle receipt digest'],
  [registry.digest, 'registry digest'],
  [plan.baselineGraphDigest, 'baseline-graph digest'],
]) requireLogText(logCycle, value, label);
for (const artifact of manifestArtifacts) {
  requireLogText(logCycle, artifact.digest, 'source-manifest byte digest');
}
for (const projectionDigest of bindings.projectionDigests) {
  requireLogText(logCycle, projectionDigest, 'projection digest');
}
for (const decision of cycle.consolidation) {
  requireLogText(logCycle, decision.decision, 'consolidation decision');
}
if (readinessArtifact) {
  requireLogText(logCycle, readinessArtifact.value.decision, 'readiness decision');
  requireLogText(logCycle, readinessDigest, 'readiness-receipt byte digest');
}
const sourceRevisions = [...bindings.manifests.keys()].toSorted();
output({
  valid: true,
  ...(sourceRevisions.length === 1 ? { sourceRevision: sourceRevisions[0] } : { sourceRevisions }),
  manifests: manifestArtifacts.length,
  components: bindings.components.size,
  projections: bindings.projectionDigests.size,
  trainingRowsAvailable: splitTotals.available,
  trainingRowsVisited: splitTotals.received,
  protectedRowsVisited: splitTotals.protectedReceived,
  readinessProvided: Boolean(readinessArtifact),
  externalLicenseTruth: 'human-primary-source-verification-required',
});
