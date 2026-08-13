import { sha256, stable } from './contract-helpers.mjs';
import { DISCOVERY_TECHNIQUES } from './research-contract.mjs';

const AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
  executablePolicy: false,
});

export function candidateSignature(candidate) {
  return sha256(stable(candidate));
}

export function hypothesisScore(votes) {
  const groups = new Map();
  for (const vote of votes) {
    const current = groups.get(vote.correlationGroup) ?? { support: 0, opposition: 0 };
    const field = vote.direction === 'support' ? 'support' : 'opposition';
    current[field] = Math.max(current[field], vote.confidence);
    groups.set(vote.correlationGroup, current);
  }
  const support = Number([...groups.values()]
    .reduce((sum, item) => sum + item.support, 0).toFixed(6));
  const opposition = Number([...groups.values()]
    .reduce((sum, item) => sum + item.opposition, 0).toFixed(6));
  const confidence = Number((support === 0
    ? 0 : support / (support + opposition + 0.5)).toFixed(6));
  return {
    support,
    opposition,
    confidence,
    supportCorrelationGroups: [...groups].filter(([, item]) => item.support > 0).length,
    oppositionCorrelationGroups: [...groups].filter(([, item]) => item.opposition > 0).length,
  };
}

export function selectFairVotes(proposals, maximum) {
  const queues = new Map(DISCOVERY_TECHNIQUES.map(({ id }) => [
    id,
    proposals.filter((proposal) => proposal.techniqueId === id).toSorted((left, right) => {
      const order = candidateSignature(left.candidate).localeCompare(candidateSignature(right.candidate));
      return order || left.direction.localeCompare(right.direction);
    }),
  ]));
  const selected = [];
  let cursor = 0;
  while (selected.length < maximum) {
    let progressed = false;
    for (const { id } of DISCOVERY_TECHNIQUES) {
      const queue = queues.get(id);
      if (cursor < queue.length) {
        selected.push(queue[cursor]);
        progressed = true;
        if (selected.length === maximum) break;
      }
    }
    if (!progressed) break;
    cursor += 1;
  }
  return selected;
}

export function publicProposal(proposal, maximumEvidenceDigests) {
  const evidenceMembership = proposal.evidenceMembership.slice(0, maximumEvidenceDigests);
  const row = {
    candidateSignature: candidateSignature(proposal.candidate),
    candidate: structuredClone(proposal.candidate),
    techniqueId: proposal.techniqueId,
    correlationGroup: proposal.correlationGroup,
    direction: proposal.direction,
    confidence: proposal.confidence,
    episodeSemanticDigests: [...proposal.episodeSemanticDigests],
    evidence: {
      episodeCount: evidenceMembership.length,
      independenceGroupCount: new Set(evidenceMembership
        .map((item) => item.independenceGroup)).size,
      evidenceDigests: evidenceMembership.map((item) => item.evidenceDigest),
    },
  };
  return {
    proposalDigest: sha256(stable({
      format: 'eslm-processing-graph-research-proposal-v1', ...row,
    })),
    ...row,
  };
}

export function proposalLedger(proposals, policy) {
  return proposals.map((proposal) => publicProposal(
    proposal, policy.limits.maxEvidenceDigestsPerVote,
  )).toSorted((left, right) => left.proposalDigest.localeCompare(right.proposalDigest));
}

function proposalVote(proposal) {
  return {
    techniqueId: proposal.techniqueId,
    correlationGroup: proposal.correlationGroup,
    direction: proposal.direction,
    confidence: proposal.confidence,
    evidence: structuredClone(proposal.evidence),
  };
}

export function buildHypotheses(proposals, policy, evidenceLedger) {
  const grouped = new Map();
  for (const proposal of proposals) {
    const signature = proposal.candidateSignature ?? candidateSignature(proposal.candidate);
    const group = grouped.get(signature) ?? { candidate: proposal.candidate, proposals: [] };
    group.proposals.push(proposal);
    grouped.set(signature, group);
  }
  const available = [...grouped].map(([semanticSignature, group]) => {
    const votes = group.proposals.map((proposal) => proposal.proposalDigest
      ? proposalVote(proposal)
      : proposalVote(publicProposal(proposal, policy.limits.maxEvidenceDigestsPerVote)))
      .toSorted((left, right) => `${left.correlationGroup}:${left.techniqueId}:${left.direction}`
        .localeCompare(`${right.correlationGroup}:${right.techniqueId}:${right.direction}`));
    const score = hypothesisScore(votes);
    const status = score.opposition >= 0.35
      ? 'contested'
      : score.supportCorrelationGroups >= 2 && score.confidence >= 0.55
        ? 'plausible' : 'exploratory';
    const evidenceDigests = [...new Set(votes
      .flatMap((vote) => vote.evidence.evidenceDigests))].toSorted();
    const independenceGroupCount = new Set(evidenceDigests.map((evidenceDigest) =>
      evidenceLedger.get(evidenceDigest)?.independenceGroup)).size;
    return {
      format: 'eslm-processing-graph-hypothesis-v1',
      hypothesisId: `hypothesis:${semanticSignature.slice(7)}`,
      rank: 0,
      semanticSignature,
      candidate: group.candidate,
      votes,
      score,
      status,
      evidence: {
        episodeCount: evidenceDigests.length,
        independenceGroupCount,
        evidenceDigests,
      },
      authority: AUTHORITY,
    };
  }).toSorted((left, right) => right.score.confidence - left.score.confidence
    || right.score.supportCorrelationGroups - left.score.supportCorrelationGroups
    || left.semanticSignature.localeCompare(right.semanticSignature));
  const retained = available.slice(0, policy.limits.maxHypotheses)
    .map((hypothesis, index) => ({ ...hypothesis, rank: index + 1 }));
  return { available, retained };
}

export function correlationGroups() {
  const grouped = new Map();
  for (const technique of DISCOVERY_TECHNIQUES) {
    const ids = grouped.get(technique.correlationGroup) ?? [];
    ids.push(technique.id);
    grouped.set(technique.correlationGroup, ids);
  }
  return [...grouped].map(([id, techniqueIds]) => ({
    id, techniqueIds: techniqueIds.toSorted(),
  })).toSorted((left, right) => left.id.localeCompare(right.id));
}

export function retainedTechniqueReceipts(strategyRun, retainedLedger) {
  return strategyRun.receipts.map((receipt) => {
    const proposalsRetained = retainedLedger.filter((proposal) =>
      proposal.techniqueId === receipt.techniqueId).length;
    const validationComplete = (receipt.preservationFailures ?? 0) === 0
      && (receipt.controlFailures ?? 0) === 0;
    return {
      ...receipt,
      proposalsRetained,
      complete: receipt.eventsAvailable === receipt.eventsVisited
        && receipt.proposalsAvailable === proposalsRetained
        && validationComplete,
    };
  });
}
