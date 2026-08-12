import {
  confidenceBand,
  freezeDeep,
  HEURISTIC_CNL_PROTOCOL,
  resolveHeuristicCnlOptions,
  resourceLimitResult,
} from './heuristic-cnl-contract.mjs';
import { generateHeuristicCnlProposals } from './heuristic-cnl-strategy-stage.mjs';
import { compareHeuristicCnlProtection } from './heuristic-cnl-protection.mjs';
import {
  analyzeHeuristicSurface,
  applyHeuristicEdits,
  editKey,
  rangesConflict,
} from './heuristic-cnl-surface.mjs';
import { createStrategyVote } from '../strategy/strategy-vote.mjs';

export {
  HEURISTIC_CNL_LIMIT_CEILINGS,
  HEURISTIC_CNL_LIMITS,
  HEURISTIC_CNL_PROTOCOL,
} from './heuristic-cnl-contract.mjs';
export {
  compareHeuristicCnlProtection,
  inspectHeuristicCnlProtection,
} from './heuristic-cnl-protection.mjs';

function rounded(value) {
  return Number(value.toFixed(6));
}

function proposalReceipt(originalText, item, index) {
  let candidateText;
  let protection;
  let error;
  try {
    candidateText = applyHeuristicEdits(originalText, item.edits);
    protection = compareHeuristicCnlProtection(originalText, candidateText, {
      sourceOperatorRealizations: item.edits.flatMap((edit) => edit.sourceOperatorRealizations ?? []),
      sourceInterrogativeRealizations: item.edits.flatMap((edit) => edit.sourceInterrogativeRealizations ?? []),
      candidateInterrogativeRealizations: item.edits.flatMap((edit) =>
        edit.candidateInterrogativeRealizations ?? []),
      candidateQuestionRealizations: item.edits.reduce((sum, edit) =>
        sum + (edit.candidateQuestionRealizations ?? 0), 0),
      candidateNamedDuplications: item.edits.flatMap((edit) => edit.candidateNamedDuplications ?? []),
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  const accepted = Boolean(candidateText && candidateText !== originalText && protection?.preserved && !error);
  return Object.freeze({
    receiptId: `heuristic-proposal:${index + 1}`,
    family: item.family,
    familyWeight: item.familyWeight,
    confidence: item.confidence,
    penalty: item.penalty ?? 0,
    accepted,
    candidateText: candidateText ?? null,
    edits: item.edits,
    evidence: item.evidence,
    uncertainties: item.uncertainties,
    protection: protection ?? null,
    ...(error ? { error } : {}),
  });
}

function aggregateEdits(receipts) {
  const byKey = new Map();
  for (const receipt of receipts.filter((item) => item.accepted)) {
    for (const edit of receipt.edits) {
      const key = editKey(edit);
      const current = byKey.get(key) ?? {
        edit,
        votes: [],
        weightedSupport: 0,
        weightedConfidence: 0,
        totalWeight: 0,
      };
      const confidence = edit.confidence ?? receipt.confidence;
      current.votes.push(Object.freeze({
        family: receipt.family,
        familyWeight: receipt.familyWeight,
        confidence,
        penalty: receipt.penalty,
        proposalReceiptId: receipt.receiptId,
        strategyVote: createStrategyVote({
          strategyId: `strategy:language:${receipt.family}`,
          candidate: key,
          confidence,
          evidence: [receipt.receiptId],
        }),
      }));
      current.weightedSupport += receipt.familyWeight * confidence;
      current.weightedConfidence += receipt.familyWeight * confidence;
      current.totalWeight += receipt.familyWeight;
      byKey.set(key, current);
    }
  }
  return [...byKey.values()].map((item) => Object.freeze({
    edit: item.edit,
    votes: Object.freeze(item.votes.sort((left, right) => left.family.localeCompare(right.family))),
    weightedSupport: rounded(item.weightedSupport),
    confidence: rounded(item.weightedConfidence / item.totalWeight),
  }));
}

function selectConsensusEdits(aggregates) {
  const selected = [];
  const rejected = [];
  const ordered = [...aggregates].sort((left, right) => right.weightedSupport - left.weightedSupport
    || right.confidence - left.confidence
    || left.edit.start - right.edit.start
    || left.edit.end - right.edit.end
    || left.edit.replacement.localeCompare(right.edit.replacement));
  for (const aggregate of ordered) {
    const conflict = selected.find((item) => rangesConflict(item.edit, aggregate.edit));
    if (conflict) {
      rejected.push(Object.freeze({
        edit: aggregate.edit,
        reason: 'lower-weight-overlapping-edit',
        winningEdit: conflict.edit,
      }));
      continue;
    }
    selected.push(aggregate);
  }
  selected.sort((left, right) => left.edit.start - right.edit.start || left.edit.end - right.edit.end);
  return Object.freeze({ selected: Object.freeze(selected), rejected: Object.freeze(rejected) });
}

function candidateConfidence(editAggregates) {
  const values = editAggregates.map((item) => item.confidence);
  const floor = Math.min(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return rounded(floor * 0.7 + mean * 0.3);
}

function uniqueRecords(records) {
  const byValue = new Map();
  for (const record of records) byValue.set(JSON.stringify(record), record);
  return [...byValue.values()];
}

function candidateFromAggregates(originalText, editAggregates, consensus, receiptIndex) {
  if (editAggregates.length === 0) return undefined;
  const text = applyHeuristicEdits(originalText, editAggregates.map((item) => item.edit));
  if (text === originalText) return undefined;
  const protection = compareHeuristicCnlProtection(originalText, text, {
    sourceOperatorRealizations: editAggregates.flatMap((item) => item.edit.sourceOperatorRealizations ?? []),
    sourceInterrogativeRealizations: editAggregates.flatMap((item) =>
      item.edit.sourceInterrogativeRealizations ?? []),
    candidateInterrogativeRealizations: editAggregates.flatMap((item) =>
      item.edit.candidateInterrogativeRealizations ?? []),
    candidateQuestionRealizations: editAggregates.reduce((sum, item) =>
      sum + (item.edit.candidateQuestionRealizations ?? 0), 0),
    candidateNamedDuplications: editAggregates.flatMap((item) => item.edit.candidateNamedDuplications ?? []),
  });
  if (!protection.preserved) return undefined;
  const families = [...new Set(editAggregates.flatMap((item) => item.votes.map((vote) => vote.family)))].sort();
  const confidence = candidateConfidence(editAggregates);
  const proposalReceiptIds = [...new Set(editAggregates.flatMap((item) =>
    item.votes.map((vote) => vote.proposalReceiptId)))].sort();
  const sourceReceipts = proposalReceiptIds.map((receiptId) => receiptIndex.get(receiptId));
  const evidence = uniqueRecords(sourceReceipts.flatMap((receipt) => receipt?.evidence ?? []));
  const uncertainties = [...new Set(sourceReceipts.flatMap((receipt) => receipt?.uncertainties ?? []))];
  const semanticRiskPenalty = rounded(Math.max(0, ...editAggregates.flatMap((item) => [
    item.edit.penalty ?? 0,
    ...item.votes.map((vote) => vote.penalty ?? 0),
  ])));
  const coverageBonus = Math.min(0.18, Math.max(0, families.length - 1) * 0.045);
  const editBonus = Math.min(0.16, Math.max(0, editAggregates.length - 1) * 0.04);
  const consensusBonus = consensus && editAggregates.length > 1 ? 0.24 : 0;
  return Object.freeze({
    text,
    confidence,
    confidenceBand: confidenceBand(confidence),
    semanticRiskPenalty,
    rankScore: rounded(Math.min(1.2,
      confidence + coverageBonus + editBonus + consensusBonus - semanticRiskPenalty * 0.15)),
    consensus,
    authority: 'surface-approximation-only',
    requiresSymbolicReparse: true,
    supportingFamilies: Object.freeze(families),
    proposalReceiptIds: Object.freeze(proposalReceiptIds),
    edits: Object.freeze(editAggregates.map((item) => Object.freeze({
      ...item.edit,
      confidence: item.confidence,
      weightedSupport: item.weightedSupport,
      votes: item.votes,
    }))),
    evidence: Object.freeze(evidence),
    uncertainties: Object.freeze(uncertainties),
    protection,
  });
}

function proposalCandidate(originalText, receipt, receiptIndex) {
  const aggregates = aggregateEdits([receipt]);
  return candidateFromAggregates(originalText, aggregates, false, receiptIndex);
}

function mergeCandidate(previous, next) {
  const families = [...new Set([...previous.supportingFamilies, ...next.supportingFamilies])].sort();
  const confidence = Math.max(previous.confidence, next.confidence);
  return Object.freeze({
    ...previous,
    confidence,
    confidenceBand: confidenceBand(confidence),
    semanticRiskPenalty: Math.min(previous.semanticRiskPenalty, next.semanticRiskPenalty),
    rankScore: Math.max(previous.rankScore, next.rankScore),
    consensus: previous.consensus || next.consensus,
    supportingFamilies: Object.freeze(families),
    proposalReceiptIds: Object.freeze([...new Set([
      ...previous.proposalReceiptIds, ...next.proposalReceiptIds,
    ])].sort()),
    evidence: Object.freeze(uniqueRecords([...previous.evidence, ...next.evidence])),
    uncertainties: Object.freeze([...new Set([...previous.uncertainties, ...next.uncertainties])]),
  });
}

function rankedCandidates(originalText, receipts, maximumCandidates, minimumConfidence) {
  const aggregates = aggregateEdits(receipts);
  const consensus = selectConsensusEdits(aggregates);
  const receiptIndex = new Map(receipts.map((receipt) => [receipt.receiptId, receipt]));
  const raw = [
    candidateFromAggregates(originalText, consensus.selected, true, receiptIndex),
    ...receipts.filter((item) => item.accepted)
      .map((item) => proposalCandidate(originalText, item, receiptIndex)),
  ].filter((item) => item && item.confidence >= minimumConfidence);
  const byText = new Map();
  for (const candidate of raw) {
    byText.set(candidate.text, byText.has(candidate.text)
      ? mergeCandidate(byText.get(candidate.text), candidate)
      : candidate);
  }
  const ordered = [...byText.values()].sort((left, right) => right.rankScore - left.rankScore
    || right.confidence - left.confidence
    || Number(right.consensus) - Number(left.consensus)
    || left.text.localeCompare(right.text)).slice(0, maximumCandidates);
  return Object.freeze({
    candidates: Object.freeze(ordered.map((candidate, index) => Object.freeze({
      candidateId: `heuristic-cnl:${index + 1}`,
      rank: index + 1,
      ...candidate,
    }))),
    consensusRejectedEdits: consensus.rejected,
  });
}

function rejectionCounts(receipts) {
  const counts = {};
  for (const receipt of receipts) {
    const reason = receipt.error ? 'invalid-edit'
      : !receipt.candidateText || receipt.candidateText === receipt.originalText ? 'unchanged'
        : !receipt.protection?.preserved ? 'protected-meaning' : receipt.accepted ? 'accepted' : 'other';
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

export function approximateControlledEnglish(text, suppliedOptions = {}) {
  if (typeof text !== 'string') throw new TypeError('Heuristic CNL input must be a string.');
  const options = resolveHeuristicCnlOptions(suppliedOptions);
  const inputBytes = Buffer.byteLength(text, 'utf8');
  const initialObserved = { inputBytes, tokens: 0, sentences: 0, proposals: 0, candidates: 0,
    editDistanceEvaluations: 0, receiptBytes: 0 };
  if (inputBytes > options.limits.maximumInputBytes) {
    return resourceLimitResult(text, options, initialObserved, 'maximumInputBytes');
  }
  const analysis = analyzeHeuristicSurface(text);
  const observed = { ...initialObserved, tokens: analysis.tokens.length, sentences: analysis.sentences.length };
  if (analysis.tokens.length > options.limits.maximumTokens) {
    return resourceLimitResult(text, options, observed, 'maximumTokens');
  }
  if (analysis.sentences.length > options.limits.maximumSentences) {
    return resourceLimitResult(text, options, observed, 'maximumSentences');
  }
  const budget = {
    maximumProposals: options.limits.maximumProposals,
    maximumEditDistanceEvaluations: options.limits.maximumEditDistanceEvaluations,
    distanceEvaluations: 0,
    distanceLimitReached: false,
  };
  const generated = generateHeuristicCnlProposals(
    analysis, budget, options.selectedStrategyIdentities,
  );
  const receipts = generated.proposals.map((item, index) => proposalReceipt(text, item, index));
  const ranked = rankedCandidates(
    text,
    receipts,
    options.limits.maximumCandidates,
    options.minimumCandidateConfidence,
  );
  observed.proposals = generated.proposals.length;
  observed.candidates = ranked.candidates.length;
  observed.editDistanceEvaluations = budget.distanceEvaluations;
  const acceptedProposalCount = receipts.filter((item) => item.accepted).length;
  const status = ranked.candidates.length > 0 ? 'CANDIDATES'
    : generated.proposals.length === 0 ? 'NO_CHANGE' : 'NO_SAFE_CANDIDATE';
  const result = {
    protocol: HEURISTIC_CNL_PROTOCOL,
    status,
    originalText: text,
    candidates: ranked.candidates,
    recommendedCandidate: ranked.candidates[0] ?? null,
    receipt: {
      protocol: HEURISTIC_CNL_PROTOCOL,
      complete: !budget.distanceLimitReached
        && generated.proposals.length < options.limits.maximumProposals,
      answerProduced: false,
      kbConsulted: false,
      sessionMutated: false,
      limits: options.limits,
      strategySelection: Object.freeze({
        stage: 'runtime.language.interpret',
        mode: options.selectedStrategyIdentities === undefined ? 'all-registered' : 'exact-allowlist',
        identities: options.selectedStrategyIdentities ?? [],
      }),
      observed,
      familyReceipts: generated.familyReceipts,
      strategyExecution: generated.strategyExecution,
      proposalReceipts: receipts,
      acceptedProposalCount,
      rejectionCounts: rejectionCounts(receipts),
      consensusRejectedEdits: ranked.consensusRejectedEdits,
      truncationReasons: Object.freeze([
        ...(budget.distanceLimitReached ? ['edit-distance-evaluation-budget'] : []),
        ...(generated.proposals.length >= options.limits.maximumProposals ? ['proposal-budget'] : []),
        ...(ranked.candidates.length >= options.limits.maximumCandidates ? ['candidate-budget-possibly-binding'] : []),
      ]),
    },
  };
  observed.receiptBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
  if (observed.receiptBytes > options.limits.maximumReceiptBytes) {
    return resourceLimitResult(text, options, observed, 'maximumReceiptBytes');
  }
  return freezeDeep(result);
}
