import { boundedText, exactKeys, identifier } from './contract-helpers.mjs';
import {
  ANALYSIS_AUTHORITY,
  DISCOVERY_HYPOTHESIS_TYPES,
} from './research-contract.mjs';

export { DISCOVERY_HYPOTHESIS_TYPES };

const STATE_DECISIONS = Object.freeze({
  retained: 'retain',
  'merge-candidate': 'merge',
  rejected: 'reject',
  deferred: 'defer',
});

function assertAnalysisAuthority(value, path) {
  exactKeys(value, Object.keys(ANALYSIS_AUTHORITY), path);
  if (Object.entries(ANALYSIS_AUTHORITY).some(([field, expected]) => value[field] !== expected)) {
    throw new TypeError(`${path} must remain non-authoritative and non-executable.`);
  }
}

export function assertInertAnalysisSemantics(analysis) {
  assertAnalysisAuthority(analysis.authority, 'Analysis receipt.authority');
  exactKeys(analysis.handoff, [
    'format', 'currentStage', 'recommendedStage', 'eligible', 'independenceGroupCount',
    'requiredVerifierInputs', 'blockingReasons', 'shardContract', 'authority',
  ], 'Analysis receipt.handoff');
  if (analysis.handoff.authority !== 'recommendation-only') {
    throw new TypeError('Analysis receipt.handoff must remain recommendation-only.');
  }
  if (!Array.isArray(analysis.hypotheses) || analysis.hypotheses.length > 256) {
    throw new TypeError('Analysis receipt hypotheses must be a bounded array.');
  }
  for (const [index, hypothesis] of analysis.hypotheses.entries()) {
    const path = `Analysis receipt.hypotheses[${index}]`;
    identifier(hypothesis?.hypothesisId, `${path}.hypothesisId`);
    if (!hypothesis.candidate || !DISCOVERY_HYPOTHESIS_TYPES.includes(hypothesis.candidate.type)) {
      throw new TypeError(`${path}.candidate.type is unsupported.`);
    }
    assertAnalysisAuthority(hypothesis.authority, `${path}.authority`);
  }
}

export function assertReviewedHypothesisSemantics(hypothesis, machineHypotheses, path) {
  const requiredAuthority = hypothesis.type === 'coordination-node'
    ? 'coordination' : hypothesis.type === 'authority-gate' ? 'gate' : null;
  if ((requiredAuthority && hypothesis.authority !== requiredAuthority)
      || (!requiredAuthority && !['none', 'proposal'].includes(hypothesis.authority))) {
    throw new TypeError(`${path}.authority contradicts its hypothesis type.`);
  }
  for (const id of hypothesis.analysisHypothesisIds) {
    const machine = machineHypotheses.get(id);
    if (machine && machine.candidate.type !== hypothesis.type) {
      throw new TypeError(`${path} maps a machine hypothesis with a different structural type.`);
    }
  }
}

export function assertConsolidationSemantics(decision, hypothesis, path) {
  const expectedDecision = STATE_DECISIONS[hypothesis.state];
  const requiresResult = ['retain', 'merge'].includes(decision.decision);
  if (decision.decision !== expectedDecision
      || requiresResult !== (decision.resultId !== null)) {
    throw new TypeError(`${path} contradicts the reviewed hypothesis state or result identity.`);
  }
  boundedText(decision.reason, `${path}.reason`);
  if (decision.reason.length < 8) {
    throw new TypeError(`${path}.reason must be bounded meaningful text.`);
  }
}

export function expectedDiscoveryCycleState(analysis, unreviewedIds) {
  return analysis.completeness.complete && unreviewedIds.length === 0 ? 'complete' : 'incomplete';
}
