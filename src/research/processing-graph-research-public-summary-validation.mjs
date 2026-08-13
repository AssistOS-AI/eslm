import { stableStringify } from '../util.mjs';
import { PROCESSING_GRAPH_DISCOVERY_TECHNIQUES } from
  './processing-graph-discovery-strategies.mjs';
import {
  PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL,
  computeProcessingGraphHypothesisScore,
  processingGraphCandidateSignature,
  processingGraphCorrelationGroups,
} from './processing-graph-hypothesis-coordinator.mjs';
import { assertProcessingGraphCandidate } from './processing-graph-hypothesis-contract.mjs';
import { processingGraphResearchVerifierInputs } from
  './processing-graph-research-analysis-contract.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
  executablePolicy: false,
});

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function canonicalStrings(value, path, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 512)
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical string array.`);
  }
}

function assertTechniqueReceipts(receipts, policy) {
  if (!Array.isArray(receipts) || receipts.length !== PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.length) {
    throw new TypeError('Public research receipt must summarize every discovery technique.');
  }
  for (const [index, receipt] of receipts.entries()) {
    const descriptor = PROCESSING_GRAPH_DISCOVERY_TECHNIQUES[index];
    const common = [
      'techniqueId', 'correlationGroup', 'eventsAvailable', 'eventsVisited',
      'proposalsAvailable', 'proposalsRetained', 'complete',
    ];
    const metamorphic = [
      'transformProtocol', 'preservingTransformIds', 'controlTransformIds',
      'preservationChecks', 'preservationFailures', 'controlChecks', 'controlFailures',
    ];
    exact(receipt, descriptor.transformProtocol ? [...common, ...metamorphic] : common,
      `Public technique receipt[${index}]`);
    if (receipt.techniqueId !== descriptor.id
        || receipt.correlationGroup !== descriptor.correlationGroup) {
      throw new TypeError('Public technique summaries are not canonical.');
    }
    for (const field of [
      'eventsAvailable', 'eventsVisited', 'proposalsAvailable', 'proposalsRetained',
    ]) count(receipt[field], `Public technique ${field}`);
    let validationComplete = true;
    if (descriptor.transformProtocol) {
      if (receipt.transformProtocol !== descriptor.transformProtocol
          || stableStringify(receipt.preservingTransformIds)
            !== stableStringify(descriptor.preservingTransformIds)
          || stableStringify(receipt.controlTransformIds)
            !== stableStringify(descriptor.controlTransformIds)) {
        throw new TypeError('Public metamorphic technique identities are not canonical.');
      }
      for (const field of [
        'preservationChecks', 'preservationFailures', 'controlChecks', 'controlFailures',
      ]) count(receipt[field], `Public technique ${field}`);
      validationComplete = receipt.preservationFailures === 0 && receipt.controlFailures === 0;
    }
    const budget = policy.techniqueBudgets[receipt.techniqueId];
    const complete = receipt.eventsAvailable === receipt.eventsVisited
      && receipt.proposalsAvailable === receipt.proposalsRetained && validationComplete;
    if (receipt.eventsVisited > Math.min(receipt.eventsAvailable, budget.maxEvents)
        || receipt.proposalsRetained > Math.min(receipt.proposalsAvailable, budget.maxProposals)
        || receipt.complete !== complete) {
      throw new TypeError('Public technique summary does not reconcile with its frozen budget.');
    }
  }
}

function assertVote(vote, path, policy, techniqueById, independenceGroupCount) {
  exact(vote, ['techniqueId', 'correlationGroup', 'direction', 'confidence', 'evidence'], path);
  const descriptor = techniqueById.get(vote.techniqueId);
  if (!descriptor || vote.correlationGroup !== descriptor.correlationGroup
      || !['support', 'oppose'].includes(vote.direction)
      || !Number.isFinite(vote.confidence) || vote.confidence < 0 || vote.confidence > 1) {
    throw new TypeError(`${path} identity or confidence is invalid.`);
  }
  exact(vote.evidence, ['episodeCount', 'independenceGroupCount', 'evidenceDigests'], `${path}.evidence`);
  count(vote.evidence.episodeCount, `${path}.evidence.episodeCount`, { positive: true });
  count(vote.evidence.independenceGroupCount, `${path}.evidence.independenceGroupCount`, { positive: true });
  canonicalStrings(vote.evidence.evidenceDigests, `${path}.evidence.evidenceDigests`,
    policy.limits.maxEvidenceDigestsPerVote);
  if (vote.evidence.evidenceDigests.some((item) => !DIGEST.test(item))
      || vote.evidence.episodeCount !== vote.evidence.evidenceDigests.length
      || vote.evidence.independenceGroupCount > vote.evidence.episodeCount
      || vote.evidence.independenceGroupCount > independenceGroupCount) {
    throw new TypeError(`${path} evidence summary is inconsistent.`);
  }
}

function assertHypotheses(receipt, registry) {
  if (!Array.isArray(receipt.hypotheses)
      || receipt.hypotheses.length > receipt.workPolicy.limits.maxHypotheses) {
    throw new TypeError('Public research hypotheses must be bounded.');
  }
  const sourceIdentifiers = [...new Set([
    ...registry.sources.flatMap((item) => [item.sourceId, item.revision, item.independenceGroup]),
    ...registry.components.flatMap((item) => [
      item.sourceId, item.revision, item.componentId, item.projection.projectionId,
    ]),
  ])].toSorted();
  const techniqueById = new Map(PROCESSING_GRAPH_DISCOVERY_TECHNIQUES
    .map((item) => [item.id, item]));
  for (const [index, hypothesis] of receipt.hypotheses.entries()) {
    const path = `Public hypothesis[${index}]`;
    exact(hypothesis, [
      'format', 'hypothesisId', 'rank', 'semanticSignature', 'candidate', 'votes', 'score',
      'status', 'evidence', 'authority',
    ], path);
    assertProcessingGraphCandidate(hypothesis.candidate, `${path}.candidate`, sourceIdentifiers);
    const signature = processingGraphCandidateSignature(hypothesis.candidate);
    if (hypothesis.format !== PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL
        || hypothesis.rank !== index + 1 || hypothesis.semanticSignature !== signature
        || hypothesis.hypothesisId !== `hypothesis:${signature.slice(7)}`
        || !Array.isArray(hypothesis.votes) || hypothesis.votes.length < 1) {
      throw new TypeError(`${path} identity or rank is invalid.`);
    }
    let priorVote = '';
    for (const [voteIndex, vote] of hypothesis.votes.entries()) {
      assertVote(vote, `${path}.votes[${voteIndex}]`, receipt.workPolicy, techniqueById,
        receipt.registry.independenceGroupCount);
      const key = `${vote.correlationGroup}:${vote.techniqueId}:${vote.direction}`;
      if (key <= priorVote) throw new TypeError(`${path} votes must be canonical and unique.`);
      priorVote = key;
    }
    const score = computeProcessingGraphHypothesisScore(hypothesis.votes);
    const status = score.opposition >= 0.35 ? 'contested'
      : score.supportCorrelationGroups >= 2 && score.confidence >= 0.55
        ? 'plausible' : 'exploratory';
    const evidenceDigests = [...new Set(hypothesis.votes
      .flatMap((vote) => vote.evidence.evidenceDigests))].toSorted();
    exact(hypothesis.evidence, ['episodeCount', 'independenceGroupCount', 'evidenceDigests'],
      `${path}.evidence`);
    if (stableStringify(hypothesis.score) !== stableStringify(score)
        || hypothesis.status !== status
        || stableStringify(hypothesis.evidence.evidenceDigests) !== stableStringify(evidenceDigests)
        || hypothesis.evidence.episodeCount !== evidenceDigests.length
        || hypothesis.evidence.independenceGroupCount < 1
        || hypothesis.evidence.independenceGroupCount > receipt.registry.independenceGroupCount
        || stableStringify(hypothesis.authority) !== stableStringify(AUTHORITY)) {
      throw new TypeError(`${path} score, evidence, status, or authority is inconsistent.`);
    }
  }
  const ordered = [...receipt.hypotheses].toSorted((left, right) =>
    right.score.confidence - left.score.confidence
      || right.score.supportCorrelationGroups - left.score.supportCorrelationGroups
      || left.semanticSignature.localeCompare(right.semanticSignature));
  if (stableStringify(ordered.map(({ semanticSignature }) => semanticSignature))
      !== stableStringify(receipt.hypotheses.map(({ semanticSignature }) => semanticSignature))) {
    throw new TypeError('Public research hypotheses are not in deterministic rank order.');
  }
}

function assertCompletenessAndHandoff(receipt) {
  exact(receipt.completeness, [
    'complete', 'inputComplete', 'techniquesComplete', 'votesComplete',
    'hypothesesComplete', 'scopeAbsenceClaimsAllowed',
  ], 'Public research completeness');
  if (Object.values(receipt.completeness).some((value) => typeof value !== 'boolean')) {
    throw new TypeError('Public research completeness fields must be boolean.');
  }
  const inputComplete = receipt.coverage.componentProjections.every((item) => item.complete);
  const techniquesComplete = receipt.techniques.every((item) => item.complete);
  const votesComplete = receipt.techniques.reduce((sum, item) => sum + item.proposalsRetained, 0)
    === receipt.work.votesAvailable;
  const hypothesesComplete = receipt.work.hypothesesRetained === receipt.work.hypothesesAvailable;
  const complete = inputComplete && techniquesComplete && votesComplete && hypothesesComplete;
  if (stableStringify(receipt.completeness) !== stableStringify({
    complete, inputComplete, techniquesComplete, votesComplete, hypothesesComplete,
    scopeAbsenceClaimsAllowed: complete,
  }) || (receipt.omissions.length === 0) !== complete) {
    throw new TypeError('Public research completeness does not reproduce from compact work summaries.');
  }
  exact(receipt.handoff, [
    'format', 'currentStage', 'recommendedStage', 'eligible', 'independenceGroupCount',
    'requiredVerifierInputs', 'blockingReasons', 'shardContract', 'authority',
  ], 'Public research handoff');
  canonicalStrings(receipt.handoff.requiredVerifierInputs, 'Public verifier inputs');
  canonicalStrings(receipt.handoff.blockingReasons, 'Public handoff blockers');
  const blockers = [...new Set([
    ...receipt.omissions.map(({ reason }) => reason),
    ...(receipt.registry.independenceGroupCount < 2 ? ['insufficient-independent-sources'] : []),
    ...(receipt.hypotheses.length < 1 ? ['no-hypotheses-retained'] : []),
  ])].toSorted();
  const eligible = complete && receipt.registry.independenceGroupCount >= 2 && blockers.length === 0;
  const recommendedStage = eligible
    ? { probe: 'pilot', pilot: 'scale', scale: 'manual-review' }[receipt.analysis.progressionStage]
    : 'hold';
  exact(receipt.handoff.shardContract, [
    'inputMode', 'selection', 'mergeOrder', 'requiresShardMembershipDigest',
  ], 'Public research shard contract');
  if (receipt.handoff.format !== 'eslm-processing-graph-research-handoff-v1'
      || receipt.handoff.currentStage !== receipt.analysis.progressionStage
      || receipt.handoff.independenceGroupCount !== receipt.registry.independenceGroupCount
      || stableStringify(receipt.handoff.requiredVerifierInputs)
        !== stableStringify(processingGraphResearchVerifierInputs(receipt.analysis.progressionStage))
      || stableStringify(receipt.handoff.blockingReasons) !== stableStringify(blockers)
      || receipt.handoff.eligible !== eligible || receipt.handoff.recommendedStage !== recommendedStage
      || receipt.handoff.shardContract.inputMode !== 'iterable-or-async-iterable'
      || receipt.handoff.shardContract.selection !== 'bounded-min-hash-v1'
      || receipt.handoff.shardContract.mergeOrder !== 'semantic-digest'
      || receipt.handoff.shardContract.requiresShardMembershipDigest !== true
      || receipt.handoff.authority !== 'recommendation-only') {
    throw new TypeError('Public research handoff does not reproduce from compact evidence.');
  }
}

export function assertProcessingGraphResearchPublicSummaries(receipt, registry) {
  assertTechniqueReceipts(receipt.techniques, receipt.workPolicy);
  if (receipt.work.eventsAvailable !== receipt.techniques
    .reduce((sum, item) => sum + item.eventsAvailable, 0)
      || receipt.work.eventsVisited !== receipt.techniques
        .reduce((sum, item) => sum + item.eventsVisited, 0)
      || receipt.work.votesAvailable !== receipt.techniques
        .reduce((sum, item) => sum + item.proposalsAvailable, 0)
      || stableStringify(receipt.correlationGroups)
        !== stableStringify(processingGraphCorrelationGroups())) {
    throw new TypeError('Public research technique and correlation summaries do not reconcile.');
  }
  assertHypotheses(receipt, registry);
  if (receipt.work.hypothesesRetained !== receipt.hypotheses.length
      || receipt.work.votesRetained !== receipt.hypotheses
        .reduce((sum, hypothesis) => sum + hypothesis.votes.length, 0)) {
    throw new TypeError('Public research hypotheses do not reconcile with compact work counters.');
  }
  assertCompletenessAndHandoff(receipt);
}
