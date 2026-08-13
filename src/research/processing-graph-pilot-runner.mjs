import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeProcessingGraphResearch } from './processing-graph-research-analyzer.mjs';
import {
  publishProcessingGraphResearchSnapshot,
} from './processing-graph-research-publication.mjs';
import {
  assertProcessingGraphResearchPublicReceipt,
  assertProcessingGraphResearchPublicReceiptForPlan,
  createProcessingGraphResearchPublicReceiptFromValidatedAnalysis,
  serializeProcessingGraphResearchPublicReceipt,
} from './processing-graph-research-public-receipt.mjs';
import { currentProcessingGraphBaseline } from './research-implementation-identity.mjs';
import {
  assertPlanBoundResearchSourceAdmissionGate,
  loadResearchSourceAdmissionGate,
} from './research-source-admission-gate.mjs';
import {
  assertResearchDiscoveryCycle,
  assertResearchDiscoveryCycleAgainstPublicReceipt,
} from './research-discovery-cycle-contract.mjs';
import {
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';
import { stableStringify } from '../util.mjs';
import {
  HELPSTEER2_PILOT, helpSteer2PilotEpisodes, inventoryHelpSteer2Pilot,
} from './sources/helpsteer2-pilot.mjs';
import {
  GSM8K_SOCRATIC_PILOT, gsm8kSocraticPilotEpisodes, inventoryGsm8kSocraticPilot,
} from './sources/gsm8k-socratic-pilot.mjs';

export const PROCESSING_GRAPH_PILOT_STATUS_PROTOCOL = 'eslm-processing-graph-pilot-status-v1';
export const DEFAULT_PROCESSING_GRAPH_PILOT_PATHS = Object.freeze({
  helpSteer2: 'training/.cache/processing-graph-research/helpsteer2-990b2711/train.jsonl.gz',
  gsm8kSocratic: 'training/.cache/processing-graph-research/gsm8k-3101c7d5/train_socratic.jsonl',
});
export const DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS = Object.freeze({
  manifests: Object.freeze([
    'training/research-sources/helpsteer2-990b2711/source-manifest.json',
    'training/research-sources/gsm8k-3101c7d5/source-manifest.json',
  ]),
  plan: 'training/research-sources/helpsteer2-gsm8k-pilot/discovery-plan.json',
});
export const DEFAULT_PROCESSING_GRAPH_PILOT_REPORT = 'docs/results/latest-processing-graph-pilot.json';
export const DEFAULT_PROCESSING_GRAPH_PILOT_PLAN_REPORT =
  'docs/results/latest-processing-graph-pilot-plan.json';
export const DEFAULT_PROCESSING_GRAPH_PILOT_CYCLE_REPORT =
  'docs/results/latest-processing-graph-pilot-cycle.json';
export const DEFAULT_PROCESSING_GRAPH_PILOT_PUBLICATION =
  'docs/results/latest-processing-graph-pilot-publication.json';
export const DEFAULT_PROCESSING_GRAPH_PILOT_DISCOVERY_CYCLE =
  'training/research-sources/helpsteer2-gsm8k-pilot/discovery-cycle.json';

const PILOT_EXPECTED_SOURCES = Object.freeze([
  HELPSTEER2_PILOT,
  GSM8K_SOCRATIC_PILOT,
]);

export function loadProcessingGraphPilotAdmission({ manifests, plan } = {}) {
  return loadResearchSourceAdmissionGate({
    manifestPaths: manifests ?? DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.manifests,
    discoveryPlanPath: plan ?? DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.plan,
    baselineGraphDigest: currentProcessingGraphBaseline().catalogDigest,
    expectedSources: PILOT_EXPECTED_SOURCES,
  });
}

async function* combinedEpisodes(helpSteerInventory, gsmInventory, paths) {
  yield* helpSteer2PilotEpisodes(helpSteerInventory);
  yield* gsm8kSocraticPilotEpisodes(paths.gsm8kSocratic, gsmInventory);
}

function sourceStatus(source, inventory, analysis) {
  return {
    sourceId: source.sourceId,
    revision: source.revision,
    registryState: 'pilot-approved',
    acquisitionState: 'cached',
    projectionState: 'complete-ephemeral',
    analysisState: 'pilot-analyzed',
    rawRows: inventory.rawRows,
    projectedEpisodes: inventory.projectedRows,
    sourceBytes: inventory.bytes,
    projectionDigest: inventory.projectionDigest,
    shardState: 'not-persisted',
    visibility: 'training-only',
    complete: analysis.completeness.complete,
  };
}

function pilotStatus(registry, inventories, analysis) {
  const sources = [
    sourceStatus(HELPSTEER2_PILOT, inventories.helpSteer2, analysis),
    sourceStatus(GSM8K_SOCRATIC_PILOT, inventories.gsm8kSocratic, analysis),
  ];
  return {
    format: PROCESSING_GRAPH_PILOT_STATUS_PROTOCOL,
    registryDigest: registry.digest,
    analysisReceiptDigest: analysis.receiptDigest,
    stage: 'complete-small-pilot',
    sources,
    aggregate: {
      sourceCount: sources.length,
      rawRows: sources.reduce((sum, item) => sum + item.rawRows, 0),
      projectedEpisodes: sources.reduce((sum, item) => sum + item.projectedEpisodes, 0),
      sourceBytes: sources.reduce((sum, item) => sum + item.sourceBytes, 0),
      hypotheses: analysis.hypotheses.length,
      complete: analysis.completeness.complete,
    },
    nextGate: analysis.handoff.eligible
      ? 'manual-consolidation-before-large-source-readiness'
      : 'resolve-analysis-handoff-blockers',
    authority: 'research-status-only',
  };
}

export async function runProcessingGraphPilot({
  paths: pathOverrides = {},
  admissionPaths = {},
} = {}) {
  const sourceAdmissionGate = await loadProcessingGraphPilotAdmission(admissionPaths);
  const paths = {
    helpSteer2: resolve(pathOverrides.helpSteer2 ?? DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.helpSteer2),
    gsm8kSocratic: resolve(pathOverrides.gsm8kSocratic ?? DEFAULT_PROCESSING_GRAPH_PILOT_PATHS.gsm8kSocratic),
  };
  const [helpSteer2, gsm8kSocratic] = await Promise.all([
    inventoryHelpSteer2Pilot(paths.helpSteer2),
    inventoryGsm8kSocraticPilot(paths.gsm8kSocratic),
  ]);
  const registry = sourceAdmissionGate.registry;
  const workPolicy = sourceAdmissionGate.workPolicy;
  const identity = sourceAdmissionGate.planBinding.analysisIdentity;
  const analysis = await analyzeProcessingGraphResearch({
    registry,
    episodes: combinedEpisodes(helpSteer2, gsm8kSocratic, paths),
    analysisId: identity.analysisId,
    version: identity.version,
    seed: identity.seed,
    workPolicy,
  });
  return {
    sourceAdmissionGate,
    registry,
    inventories: { helpSteer2, gsm8kSocratic },
    analysis,
    status: pilotStatus(registry, { helpSteer2, gsm8kSocratic }, analysis),
  };
}

export async function publishProcessingGraphPilot(result, {
  analysisPath = DEFAULT_PROCESSING_GRAPH_PILOT_REPORT,
  planPath = DEFAULT_PROCESSING_GRAPH_PILOT_PLAN_REPORT,
  cyclePath = DEFAULT_PROCESSING_GRAPH_PILOT_CYCLE_REPORT,
  publicationPath = DEFAULT_PROCESSING_GRAPH_PILOT_PUBLICATION,
  discoveryPlanPath = DEFAULT_PROCESSING_GRAPH_PILOT_ADMISSION_PATHS.plan,
  discoveryCyclePath = DEFAULT_PROCESSING_GRAPH_PILOT_DISCOVERY_CYCLE,
  operations,
} = {}) {
  const [planBytes, cycleBytes] = await Promise.all([
    readFile(resolve(discoveryPlanPath)), readFile(resolve(discoveryCyclePath)),
  ]);
  const plan = assertResearchDiscoveryPlan(JSON.parse(planBytes.toString('utf8')));
  const analysis = result.analysis;
  const cycle = assertResearchDiscoveryCycle(JSON.parse(cycleBytes.toString('utf8')), {
    plan, analysis,
  });
  const planArtifactDigest = `sha256:${createHash('sha256').update(planBytes).digest('hex')}`;
  const admission = assertPlanBoundResearchSourceAdmissionGate(result.sourceAdmissionGate, {
    plan, planArtifactDigest, baselineGraphDigest: analysis.baselineGraph.catalogDigest,
  });
  if (admission.planBinding.planArtifactDigest !== planArtifactDigest
      || admission.planBinding.planContentDigest !== researchDiscoveryPlanDigest(plan)
      || admission.registry.digest !== analysis.registry.digest
      || stableStringify(admission.workPolicy) !== stableStringify(analysis.workPolicy)
      || result.status?.analysisReceiptDigest !== analysis.receiptDigest) {
    throw new TypeError('Pilot publication inputs do not form one admitted plan-analysis-cycle chain.');
  }
  const publicReceipt = createProcessingGraphResearchPublicReceiptFromValidatedAnalysis({
    analysis, plan, planArtifactBytes: planBytes,
  });
  const artifacts = [
    { role: 'pilot-public-receipt', path: resolve(analysisPath),
      bytes: serializeProcessingGraphResearchPublicReceipt(publicReceipt) },
    { role: 'pilot-cycle', path: resolve(cyclePath), bytes: cycleBytes },
    { role: 'pilot-plan', path: resolve(planPath), bytes: planBytes },
  ];
  return publishProcessingGraphResearchSnapshot({
    snapshotId: 'processing-graph-pilot', artifacts,
    manifestPath: resolve(publicationPath), operations,
    validate: (staged) => {
      const byRole = new Map(staged.map((item) => [item.role, item.bytes]));
      const stagedPlan = assertResearchDiscoveryPlan(
        JSON.parse(byRole.get('pilot-plan').toString('utf8')),
      );
      const publicBytes = byRole.get('pilot-public-receipt');
      const stagedReceipt = assertProcessingGraphResearchPublicReceipt(
        JSON.parse(publicBytes.toString('utf8')), { artifactBytes: publicBytes },
      );
      assertProcessingGraphResearchPublicReceiptForPlan(stagedReceipt, {
        plan: stagedPlan, planArtifactBytes: byRole.get('pilot-plan'),
      });
      assertResearchDiscoveryCycleAgainstPublicReceipt(
        JSON.parse(byRole.get('pilot-cycle').toString('utf8')),
        {
          plan: stagedPlan, publicReceipt: stagedReceipt,
          planArtifactBytes: byRole.get('pilot-plan'),
        },
      );
    },
  });
}
