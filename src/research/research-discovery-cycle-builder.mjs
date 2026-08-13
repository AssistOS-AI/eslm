import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stableStringify } from '../util.mjs';
import { assertProcessingGraphResearchAnalysis } from './processing-graph-research-analysis-contract.mjs';
import {
  RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
  assertResearchDiscoveryCycle,
  researchDiscoveryCycleSplitAccounting,
  sealResearchDiscoveryCycle,
} from './research-discovery-cycle-contract.mjs';
import {
  assertResearchDiscoveryPlan,
  researchDiscoveryPlanDigest,
} from './research-discovery-plan-contract.mjs';

export const RESEARCH_CONSOLIDATION_REVIEW_PROTOCOL =
  'eslm-processing-graph-consolidation-review-v1';

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function analysisBinding(analysis) {
  return {
    protocol: analysis.format,
    receiptDigest: analysis.receiptDigest,
    implementationAggregateDigest: analysis.implementationIdentity.aggregateDigest,
    registryDigest: analysis.registry.digest,
    baselineGraphDigest: analysis.baselineGraph.catalogDigest,
    analysisId: analysis.analysis.analysisId,
    version: analysis.analysis.version,
    seed: analysis.analysis.seed,
  };
}

export function buildResearchDiscoveryCycle({ plan, analysis, review }) {
  assertResearchDiscoveryPlan(plan);
  assertProcessingGraphResearchAnalysis(analysis);
  exact(review, [
    'format', 'cycleId', 'review', 'hypotheses', 'consolidation',
  ], 'Research consolidation review');
  if (review.format !== RESEARCH_CONSOLIDATION_REVIEW_PROTOCOL
      || review.cycleId !== plan.cycleId) {
    throw new TypeError('Research consolidation review protocol or cycle identity is invalid.');
  }
  if (!Array.isArray(review.hypotheses) || !Array.isArray(review.consolidation)) {
    throw new TypeError('Research consolidation review hypotheses and decisions must be arrays.');
  }
  const mapped = new Set(review.hypotheses.flatMap((item) =>
    Array.isArray(item.analysisHypothesisIds) ? item.analysisHypothesisIds : []));
  const unreviewed = analysis.hypotheses.map(({ hypothesisId }) => hypothesisId)
    .filter((hypothesisId) => !mapped.has(hypothesisId)).toSorted();
  const cycle = sealResearchDiscoveryCycle({
    format: RESEARCH_DISCOVERY_CYCLE_PROTOCOL,
    cycleId: plan.cycleId,
    state: analysis.completeness.complete && unreviewed.length === 0
      ? 'complete' : 'incomplete',
    planBinding: {
      planId: plan.planId,
      planDigest: researchDiscoveryPlanDigest(plan),
    },
    analysisBinding: analysisBinding(analysis),
    splitAccounting: researchDiscoveryCycleSplitAccounting(analysis),
    review: structuredClone(review.review),
    hypotheses: structuredClone(review.hypotheses),
    unreviewedAnalysisHypothesisIds: unreviewed,
    consolidation: structuredClone(review.consolidation),
    analysisOmissionReasons: [...new Set(analysis.omissions.map(({ reason }) => reason))].toSorted(),
    authority: {
      answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
      decisionScope: 'research-consolidation-only',
    },
  });
  assertResearchDiscoveryCycle(cycle, { plan, analysis });
  return cycle;
}

export async function publishResearchDiscoveryCycle(cycle, path, { plan, analysis }) {
  assertResearchDiscoveryCycle(cycle, { plan, analysis });
  const target = resolve(path);
  await writeFile(target, `${JSON.stringify(cycle, null, 2)}\n`, 'utf8');
  return target;
}
