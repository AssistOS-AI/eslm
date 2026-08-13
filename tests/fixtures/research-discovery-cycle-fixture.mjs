import { analyzeProcessingGraphResearch } from '../../src/research/processing-graph-research-analyzer.mjs';
import {
  RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  researchDiscoveryPlanDigest,
} from '../../src/research/research-discovery-plan-contract.mjs';
import {
  RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from '../../src/research/research-discovery-cycle-contract.mjs';
import { resolveProcessingGraphResearchWorkPolicy } from '../../src/research/processing-graph-research-work-policy.mjs';
import { createSyntheticProcessingGraphResearchFixture } from './processing-graph-research-fixture.mjs';

export async function createSyntheticDiscoveryCycleFixture() {
  const { registry, episodes } = createSyntheticProcessingGraphResearchFixture();
  const workPolicy = resolveProcessingGraphResearchWorkPolicy({
    progressionStage: 'pilot',
    limits: { maxRowsScanned: episodes.length, maxEpisodes: episodes.length },
  });
  const analysisIdentity = {
    analysisId: 'processing-graph-discovery', version: '1.0.0',
    seed: 'deterministic-research-seed', inputMode: 'iterable-or-async-iterable',
    selectionMethod: 'bounded-min-hash-v1',
  };
  const analysis = await analyzeProcessingGraphResearch({
    registry, episodes, workPolicy,
    analysisId: analysisIdentity.analysisId,
    version: analysisIdentity.version,
    seed: analysisIdentity.seed,
  });
  const plan = {
    format: 'eslm-rl-dataset-discovery-plan-v2',
    planId: 'plan:synthetic:portable-cycle',
    cycleId: 'cycle:synthetic:portable-cycle',
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
      splits: component.visibility.map(({
        split, visibility, rowsDeclared, rowsAdmitted,
      }) => ({
        name: split, visibility, rowsDeclared, rowsAdmitted,
      })),
    })),
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisIdentity,
    strategyIdentities: Object.keys(workPolicy.techniqueBudgets).toSorted(),
    workPolicy,
    authority: RESEARCH_DISCOVERY_PLAN_AUTHORITY,
  };
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
  const cycle = sealResearchDiscoveryCycle({
    format: RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
    cycleId: plan.cycleId,
    state: 'complete',
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
      reviewId: 'review:synthetic:portable-cycle',
      reviewAuthority: 'repository-maintainer-review',
      reviewedSpecifications: ['DS028', 'DS029'],
      decisionScope: 'research-consolidation-only',
    },
    hypotheses,
    unreviewedAnalysisHypothesisIds: [],
    consolidation: hypotheses.map(({ hypothesisId }) => ({
      candidateId: hypothesisId, decision: 'retain', resultId: hypothesisId,
      reason: 'The source-neutral structure remains a research candidate pending transfer and ablation.',
    })),
    analysisOmissionReasons: [],
    authority: {
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
      decisionScope: 'research-consolidation-only',
    },
  });
  return { plan, analysis, cycle };
}
