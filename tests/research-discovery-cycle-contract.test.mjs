import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeProcessingGraphResearch } from '../src/research/processing-graph-research-analyzer.mjs';
import {
  RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from '../src/research/research-discovery-plan-contract.mjs';
import {
  RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
  assertResearchDiscoveryCycle,
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-contract.mjs';
import {
  RESEARCH_CONSOLIDATION_REVIEW_PROTOCOL,
  buildResearchDiscoveryCycle,
} from '../src/research/research-discovery-cycle-builder.mjs';
import { resolveProcessingGraphResearchWorkPolicy } from '../src/research/processing-graph-research-work-policy.mjs';
import { createSyntheticProcessingGraphResearchFixture } from './fixtures/processing-graph-research-fixture.mjs';

function planFor(registry, policy, baselineGraphDigest, analysisIdentity) {
  const plan = {
    format: 'eslm-rl-dataset-discovery-plan-v2',
    planId: 'plan:synthetic:cycle-contract',
    cycleId: 'cycle:synthetic:cycle-contract',
    state: 'approved',
    question: 'Do independently generated structural episodes support one source-neutral packet responsibility?',
    nullHypothesis: 'Every observed structural motif is already represented by the current processing graph.',
    sourceRevisions: registry.sources.map((source) => `${source.sourceId}@${source.revision}`).toSorted(),
    projectionDigests: registry.components.map((component) =>
      component.projection.membershipDigest).toSorted(),
    sourceScopes: registry.components.map((component) => ({
      sourceRevision: `${component.sourceId}@${component.revision}`,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      splits: component.visibility.map(({ split, visibility, rowsDeclared, rowsAdmitted }) => ({
        name: split,
        visibility,
        rowsDeclared,
        rowsAdmitted,
      })),
    })),
    baselineGraphDigest,
    analysisIdentity,
    strategyIdentities: Object.keys(policy.techniqueBudgets).toSorted(),
    workPolicy: policy,
    authority: RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  };
  assertResearchDiscoveryPlan(plan);
  return plan;
}

function cycleFor(plan, analysis) {
  const grouped = Map.groupBy(analysis.hypotheses, (hypothesis) => hypothesis.candidate.type);
  const hypotheses = [...grouped].map(([type, machines]) => ({
    hypothesisId: `hypothesis:reviewed-${type}`,
    type,
    state: 'retained',
    responsibility: `Preserve the generalized ${type} responsibility pending transfer review.`,
    containingCircuit: 'circuit:research:hypothesis-discovery',
    inputPacketTypes: ['packet:research:structural-feature-batch-v1'],
    outputPacketTypes: ['packet:research:hypothesis-batch-v1'],
    authority: type === 'coordination-node' ? 'coordination'
      : type === 'authority-gate' ? 'gate' : type === 'strategy' ? 'proposal' : 'none',
    failureKinds: ['unsupported-structure'],
    resourceDimensions: ['resource:records'],
    analysisHypothesisIds: machines.map(({ hypothesisId }) => hypothesisId).toSorted(),
  })).toSorted((left, right) => left.hypothesisId.localeCompare(right.hypothesisId));
  return sealResearchDiscoveryCycle({
    format: RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
    cycleId: plan.cycleId,
    state: analysis.completeness.complete ? 'complete' : 'incomplete',
    planBinding: { planId: plan.planId, planDigest: researchDiscoveryPlanDigest(plan) },
    analysisBinding: {
      protocol: analysis.format,
      receiptDigest: analysis.receiptDigest,
      implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
      registryDigest: analysis.registry.digest,
      baselineGraphDigest: analysis.baselineGraph.catalogDigest,
      analysisId: analysis.analysis.analysisId,
      version: analysis.analysis.version,
      seed: analysis.analysis.seed,
    },
    splitAccounting: researchDiscoveryCycleSplitAccounting(analysis),
    review: {
      reviewId: 'review:synthetic:cycle-contract',
      reviewAuthority: 'repository-maintainer-review',
      reviewedSpecifications: ['DS028', 'DS029'],
      decisionScope: 'research-consolidation-only',
    },
    hypotheses,
    unreviewedAnalysisHypothesisIds: [],
    consolidation: hypotheses.map(({ hypothesisId }) => ({
      candidateId: hypothesisId,
      decision: 'retain',
      resultId: hypothesisId,
      reason: 'The source-neutral structure remains a research candidate pending transfer and ablation.',
    })),
    analysisOmissionReasons: [...new Set(analysis.omissions.map(({ reason }) => reason))].toSorted(),
    authority: {
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
      decisionScope: 'research-consolidation-only',
    },
  });
}

test('post-analysis cycle binds exact analysis and accounts for every machine hypothesis', async () => {
  const { registry, episodes } = createSyntheticProcessingGraphResearchFixture();
  const policy = resolveProcessingGraphResearchWorkPolicy({
    progressionStage: 'pilot',
    limits: { maxRowsScanned: episodes.length, maxEpisodes: episodes.length },
  });
  const analysisIdentity = {
    analysisId: 'processing-graph-discovery', version: '1.0.0',
    seed: 'deterministic-research-seed', inputMode: 'iterable-or-async-iterable',
    selectionMethod: 'bounded-min-hash-v1',
  };
  const analysis = await analyzeProcessingGraphResearch({ registry, episodes, workPolicy: policy });
  const plan = planFor(registry, policy, analysis.baselineGraph.catalogDigest, analysisIdentity);
  const sealed = cycleFor(plan, analysis);
  assert.equal(assertResearchDiscoveryCycle(sealed, { plan, analysis }), sealed);
  const rebuilt = buildResearchDiscoveryCycle({
    plan,
    analysis,
    review: {
      format: RESEARCH_CONSOLIDATION_REVIEW_PROTOCOL,
      cycleId: sealed.cycleId,
      review: sealed.review,
      hypotheses: sealed.hypotheses,
      consolidation: sealed.consolidation,
    },
  });
  assert.deepEqual(rebuilt, sealed);

  const missing = structuredClone(sealed);
  missing.hypotheses.find((item) => item.analysisHypothesisIds.length > 1)
    .analysisHypothesisIds.pop();
  const missingSealed = sealResearchDiscoveryCycle(missing);
  assert.throws(() => assertResearchDiscoveryCycle(missingSealed, { plan, analysis }),
    /account for every machine-analysis hypothesis/iu);

  const invented = structuredClone(sealed);
  invented.hypotheses[0].analysisHypothesisIds = [`hypothesis:${'f'.repeat(64)}`];
  const inventedSealed = sealResearchDiscoveryCycle(invented);
  assert.throws(() => assertResearchDiscoveryCycle(inventedSealed, { plan, analysis }),
    /absent machine-analysis hypothesis/iu);

  const empty = structuredClone(sealed);
  empty.consolidation = [];
  const emptySealed = sealResearchDiscoveryCycle(empty);
  assert.throws(() => assertResearchDiscoveryCycle(emptySealed, { plan, analysis }),
    /consolidation must decide every reviewed hypothesis/iu);

  const wrongPolicy = structuredClone(plan);
  wrongPolicy.workPolicy.limits.maxVotes += 1;
  assert.throws(() => assertResearchDiscoveryCycle(sealed, { plan: wrongPolicy, analysis }),
    /disagree on identity, graph, or work policy/iu);

  const wrongProjection = structuredClone(plan);
  wrongProjection.sourceScopes[0].splits[0].rowsAdmitted -= 1;
  assert.throws(() => assertResearchDiscoveryCycle(sealed, {
    plan: wrongProjection,
    analysis,
  }), /scope does not reproduce (?:the analyzed registry|its registry component)/iu);

  const contradictoryDecision = structuredClone(sealed);
  contradictoryDecision.consolidation[0].decision = 'reject';
  contradictoryDecision.consolidation[0].resultId = null;
  const contradictorySealed = sealResearchDiscoveryCycle(contradictoryDecision);
  assert.throws(() => assertResearchDiscoveryCycle(contradictorySealed, { plan, analysis }),
    /contradicts the reviewed hypothesis state/iu);

  const concealedTrainingVisit = structuredClone(sealed);
  concealedTrainingVisit.splitAccounting.find((row) => row.visibility === 'training-visible')
    .rowsVisited -= 1;
  const concealedTrainingVisitSealed = sealResearchDiscoveryCycle(concealedTrainingVisit);
  assert.throws(() => assertResearchDiscoveryCycle(concealedTrainingVisitSealed, { plan, analysis }),
    /valid admitted split frontier|does not reproduce its analysis/iu);

  const nonTrainingSplit = sealed.splitAccounting.find((row) =>
    row.visibility !== 'training-visible');
  if (nonTrainingSplit) {
    const hiddenProtectedVisit = structuredClone(sealed);
    const mutated = hiddenProtectedVisit.splitAccounting.find((row) =>
      row.visibility !== 'training-visible');
    mutated.rowsAvailable = 1;
    mutated.rowsVisited = 1;
    const hiddenProtectedVisitSealed = sealResearchDiscoveryCycle(hiddenProtectedVisit);
    assert.throws(() => assertResearchDiscoveryCycle(hiddenProtectedVisitSealed, { plan, analysis }),
      /valid admitted split frontier|does not reproduce its analysis/iu);
  }
});
