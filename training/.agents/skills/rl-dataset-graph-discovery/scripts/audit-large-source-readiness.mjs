#!/usr/bin/env node
import {
  digest, enumValue, exactKeys, finiteRate, identifier, integer, output, readJsonArgument, uniqueStrings,
} from './contract-helpers.mjs';

const receipt = await readJsonArgument(process.argv[2], 'Usage: audit-large-source-readiness.mjs READINESS.json');
exactKeys(receipt, [
  'format', 'sourceRevision', 'componentId', 'projectionId', 'sourceManifestDigest',
  'pilotProjectionDigest', 'discoveryPlanArtifactDigest', 'discoveryPlanContentDigest',
  'sourceAdmissionReceiptDigest', 'preflightReceiptDigest',
  'pilot', 'streaming', 'rights', 'contamination', 'scalePlan', 'decision',
], 'Large-source readiness');
if (receipt.format !== 'eslm-rl-large-source-readiness-v1') throw new TypeError('Invalid readiness format.');
for (const field of ['sourceRevision', 'componentId', 'projectionId']) {
  identifier(receipt[field], `Readiness.${field}`);
}
for (const field of [
  'sourceManifestDigest', 'pilotProjectionDigest', 'discoveryPlanArtifactDigest',
  'discoveryPlanContentDigest', 'sourceAdmissionReceiptDigest', 'preflightReceiptDigest',
]) {
  digest(receipt[field], `Readiness.${field}`);
}
exactKeys(receipt.pilot, [
  'rowsAvailable', 'rowsVisited', 'strataAvailable', 'strataVisited', 'projectionLossRate', 'complete',
], 'Readiness.pilot');
for (const field of ['rowsAvailable', 'rowsVisited', 'strataAvailable', 'strataVisited']) {
  integer(receipt.pilot[field], `Readiness.pilot.${field}`);
}
finiteRate(receipt.pilot.projectionLossRate, 'Readiness.pilot.projectionLossRate');
if (typeof receipt.pilot.complete !== 'boolean') throw new TypeError('Readiness.pilot.complete must be boolean.');
exactKeys(receipt.streaming, [
  'deterministicReplay', 'shardEquivalence', 'inputStreamResumeTested', 'peakBytes', 'maximumPeakBytes',
], 'Readiness.streaming');
for (const field of ['deterministicReplay', 'shardEquivalence', 'inputStreamResumeTested']) {
  if (typeof receipt.streaming[field] !== 'boolean') throw new TypeError(`Readiness.streaming.${field} must be boolean.`);
}
integer(receipt.streaming.peakBytes, 'Readiness.streaming.peakBytes');
integer(receipt.streaming.maximumPeakBytes, 'Readiness.streaming.maximumPeakBytes', 1);
exactKeys(receipt.rights, ['state', 'removalPlanTested'], 'Readiness.rights');
enumValue(receipt.rights.state, ['approved', 'review-required', 'denied', 'withdrawn'], 'Readiness.rights.state');
if (typeof receipt.rights.removalPlanTested !== 'boolean') throw new TypeError('Removal-plan status must be boolean.');
exactKeys(receipt.contamination, ['lineageFrozen', 'protectedIsolationVerified', 'knownOverlaps'],
  'Readiness.contamination');
for (const field of ['lineageFrozen', 'protectedIsolationVerified']) {
  if (typeof receipt.contamination[field] !== 'boolean') {
    throw new TypeError(`Readiness.contamination.${field} must be boolean.`);
  }
}
uniqueStrings(receipt.contamination.knownOverlaps, 'Readiness.contamination.knownOverlaps');
exactKeys(receipt.scalePlan, [
  'stage', 'shards', 'maximumRows', 'maximumBytes', 'maximumPeakBytes', 'checkpointEveryShards',
  'stopConditions',
], 'Readiness.scalePlan');
enumValue(receipt.scalePlan.stage, ['large-corpus'], 'Readiness.scalePlan.stage');
for (const field of ['shards', 'maximumRows', 'maximumBytes', 'maximumPeakBytes', 'checkpointEveryShards']) {
  integer(receipt.scalePlan[field], `Readiness.scalePlan.${field}`, 1);
}
uniqueStrings(receipt.scalePlan.stopConditions, 'Readiness.scalePlan.stopConditions', { minimum: 1 });
enumValue(receipt.decision, ['admit', 'block'], 'Readiness.decision');
const failures = [];
if (!receipt.pilot.complete || receipt.pilot.rowsVisited !== receipt.pilot.rowsAvailable
    || receipt.pilot.strataVisited !== receipt.pilot.strataAvailable) failures.push('pilot-incomplete');
if (!receipt.streaming.deterministicReplay || !receipt.streaming.shardEquivalence
    || !receipt.streaming.inputStreamResumeTested) failures.push('streaming-not-verified');
if (receipt.streaming.peakBytes > receipt.streaming.maximumPeakBytes) failures.push('peak-memory-exceeded');
if (receipt.rights.state !== 'approved' || !receipt.rights.removalPlanTested) failures.push('rights-gate-open');
if (!receipt.contamination.lineageFrozen || !receipt.contamination.protectedIsolationVerified) {
  failures.push('contamination-gate-open');
}
if ((failures.length === 0) !== (receipt.decision === 'admit')) {
  throw new TypeError('Readiness.decision contradicts the independently recomputed gates.');
}
output({ valid: true, eligibleForScale: failures.length === 0, failures, stage: receipt.scalePlan.stage });
