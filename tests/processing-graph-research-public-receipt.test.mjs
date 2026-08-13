import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, stableStringify } from '../src/util.mjs';
import { analyzeProcessingGraphResearch } from
  '../src/research/processing-graph-research-analyzer.mjs';
import {
  PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES,
  PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL,
  assertProcessingGraphResearchPublicReceipt,
  createProcessingGraphResearchPublicReceipt,
  serializeProcessingGraphResearchPublicReceipt,
} from '../src/research/processing-graph-research-public-receipt.mjs';
import {
  RESEARCH_DISCOVERY_PLAN_AUTHORITY,
} from '../src/research/research-discovery-plan-contract.mjs';
import {
  assertResearchDiscoveryCycleAgainstPublicReceipt,
} from '../src/research/research-discovery-cycle-contract.mjs';
import { resolveProcessingGraphResearchWorkPolicy } from
  '../src/research/processing-graph-research-work-policy.mjs';
import {
  createSyntheticProcessingGraphResearchFixture,
} from './fixtures/processing-graph-research-fixture.mjs';
import {
  createSyntheticDiscoveryCycleFixture,
} from './fixtures/research-discovery-cycle-fixture.mjs';

const PRIVATE_ANALYSIS_FIELDS = Object.freeze([
  'inputMembership', 'evidenceLedger', 'featureLedger', 'metamorphicAuditLedger',
  'proposalLedger',
]);

function planFor(registry, analysis, suffix) {
  return {
    format: 'eslm-rl-dataset-discovery-plan-v2',
    planId: `plan:public-receipt:${suffix}`,
    cycleId: `cycle:public-receipt:${suffix}`,
    state: 'approved',
    question: 'Does this frozen synthetic projection expose source-neutral processing responsibilities?',
    nullHypothesis: 'Every observed responsibility is already represented by the current processing graph.',
    sourceRevisions: registry.sources
      .map((source) => `${source.sourceId}@${source.revision}`).toSorted(),
    projectionDigests: registry.components
      .map((component) => component.projection.membershipDigest).toSorted(),
    sourceScopes: registry.components.map((component) => ({
      sourceRevision: `${component.sourceId}@${component.revision}`,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      splits: component.visibility.map(({
        split, visibility, rowsDeclared, rowsAdmitted,
      }) => ({ name: split, visibility, rowsDeclared, rowsAdmitted })),
    })),
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisIdentity: {
      analysisId: analysis.analysis.analysisId,
      version: analysis.analysis.version,
      seed: analysis.analysis.seed,
      inputMode: analysis.analysis.inputMode,
      selectionMethod: analysis.analysis.selectionMethod,
    },
    strategyIdentities: Object.keys(analysis.workPolicy.techniqueBudgets).toSorted(),
    workPolicy: structuredClone(analysis.workPolicy),
    authority: RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  };
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resign(receipt) {
  const unsigned = structuredClone(receipt);
  delete unsigned.receiptDigest;
  return { ...unsigned, receiptDigest: `sha256:${sha256(stableStringify(unsigned))}` };
}

test('public research receipt is a deterministic compact projection bound to its full analysis and cycle',
  async () => {
    const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
    const planArtifactBytes = jsonBytes(plan);
    const first = createProcessingGraphResearchPublicReceipt({
      analysis, plan, planArtifactBytes,
    });
    const second = createProcessingGraphResearchPublicReceipt({
      analysis, plan, planArtifactBytes,
    });
    assert.deepEqual(first, second);
    assert.equal(first.format, PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_PROTOCOL);
    assert.deepEqual(first.fullAnalysis, {
      protocol: analysis.format,
      receiptDigest: analysis.receiptDigest,
      replayState: 'diagnostic-export-only',
    });
    assert.deepEqual(first.hypotheses, analysis.hypotheses);
    assert.deepEqual(first.techniques, analysis.techniques);
    for (const field of PRIVATE_ANALYSIS_FIELDS) assert.equal(Object.hasOwn(first, field), false);
    const bytes = serializeProcessingGraphResearchPublicReceipt(first);
    assert.ok(bytes.byteLength < PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES);
    assertProcessingGraphResearchPublicReceipt(first, { artifactBytes: bytes });
    assertResearchDiscoveryCycleAgainstPublicReceipt(cycle, {
      plan, publicReceipt: first, planArtifactBytes,
    });
  });

test('a larger synthetic analysis publishes no replay ledger or input-member array', async () => {
  const { registry, episodes } = createSyntheticProcessingGraphResearchFixture({
    namespace: 'large-public-receipt', occurrencesPerTemplate: 16,
  });
  const workPolicy = resolveProcessingGraphResearchWorkPolicy({
    progressionStage: 'pilot',
    limits: { maxRowsScanned: episodes.length, maxEpisodes: episodes.length },
  });
  const analysis = await analyzeProcessingGraphResearch({
    registry, episodes, workPolicy,
    analysisId: 'large-public-receipt-analysis',
    version: '1.0.0',
    seed: 'large-public-receipt-seed',
  });
  const plan = planFor(registry, analysis, 'large');
  const receipt = createProcessingGraphResearchPublicReceipt({
    analysis, plan, planArtifactBytes: jsonBytes(plan),
  });
  const publicBytes = serializeProcessingGraphResearchPublicReceipt(receipt);
  const fullBytes = jsonBytes(analysis);
  assert.ok(fullBytes.byteLength > 4 * publicBytes.byteLength,
    `expected compact projection, got ${fullBytes.byteLength} versus ${publicBytes.byteLength}`);
  assert.ok(publicBytes.byteLength < PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES);
  const publicText = publicBytes.toString('utf8');
  for (const field of PRIVATE_ANALYSIS_FIELDS) {
    assert.equal(Object.hasOwn(receipt, field), false);
    assert.doesNotMatch(publicText, new RegExp(`"${field}"\\s*:`, 'u'));
  }
  assert.equal(receipt.work.episodesAnalyzed, episodes.length);
  assert.equal(receipt.fullAnalysis.receiptDigest, analysis.receiptDigest);
});

test('public receipt rejects forged summaries, full-analysis bindings, and artifacts above five MiB',
  async () => {
    const { plan, analysis, cycle } = await createSyntheticDiscoveryCycleFixture();
    const planArtifactBytes = jsonBytes(plan);
    const receipt = createProcessingGraphResearchPublicReceipt({
      analysis, plan, planArtifactBytes,
    });
    const forgedScore = structuredClone(receipt);
    forgedScore.hypotheses[0].score.confidence = 0;
    assert.throws(() => assertProcessingGraphResearchPublicReceipt(resign(forgedScore)),
      /score, evidence, status, or authority/u);
    const forgedBinding = resign({
      ...structuredClone(receipt),
      fullAnalysis: {
        ...receipt.fullAnalysis, receiptDigest: `sha256:${'0'.repeat(64)}`,
      },
    });
    assert.throws(() => assertResearchDiscoveryCycleAgainstPublicReceipt(cycle, {
      plan, publicReceipt: forgedBinding, planArtifactBytes,
    }), /exact analysis receipt/u);
    const bytes = serializeProcessingGraphResearchPublicReceipt(receipt);
    const oversized = Buffer.concat([
      bytes.subarray(0, -1),
      Buffer.alloc(PROCESSING_GRAPH_RESEARCH_PUBLIC_RECEIPT_MAX_BYTES, 0x20),
    ]);
    assert.throws(() => assertProcessingGraphResearchPublicReceipt(receipt, {
      artifactBytes: oversized,
    }), /exceeds the 5 MiB/u);
  });
