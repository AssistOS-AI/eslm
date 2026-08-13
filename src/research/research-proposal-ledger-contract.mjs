import { sha256, stableStringify } from '../util.mjs';
import {
  RESEARCH_MEANING_CHANGING_CONTROLS,
  RESEARCH_PRESERVING_TRANSFORMS,
  researchMetamorphicAuditDigest,
} from './research-metamorphic-controls.mjs';
import { assertResearchEpisodeFeatures } from './research-episode-features.mjs';
import {
  processingGraphMetamorphicEvidenceDigests,
  runProcessingGraphDiscoveryStrategies,
} from './processing-graph-discovery-strategies.mjs';
import { assertProcessingGraphCandidate } from './processing-graph-hypothesis-contract.mjs';
import {
  buildProcessingGraphProposalLedger,
  buildProcessingGraphHypotheses,
  processingGraphCandidateSignature,
  selectFairResearchVotes,
} from './processing-graph-hypothesis-coordinator.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function canonicalDigests(value, path, maximum) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || !DIGEST.test(item))
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical digest array.`);
  }
}

function expectedProposalDigest(proposal) {
  const unsigned = structuredClone(proposal);
  delete unsigned.proposalDigest;
  return `sha256:${sha256(stableStringify({
    format: 'eslm-processing-graph-research-proposal-v1', ...unsigned,
  }))}`;
}

export function assertProcessingGraphProposalLedger({
  ledger, policy, techniqueReceipts, evidenceLedger, sourceIdentifiers,
}) {
  if (!Array.isArray(ledger) || ledger.length > policy.limits.maxVotes) {
    throw new TypeError('Research proposal ledger exceeds its frozen vote budget.');
  }
  let priorDigest = '';
  for (const [index, proposal] of ledger.entries()) {
    const path = `Research proposal ledger[${index}]`;
    exact(proposal, [
      'proposalDigest', 'candidateSignature', 'candidate', 'techniqueId',
      'correlationGroup', 'direction', 'confidence', 'episodeSemanticDigests', 'evidence',
    ], path);
    if (!DIGEST.test(proposal.proposalDigest) || proposal.proposalDigest <= priorDigest
        || proposal.proposalDigest !== expectedProposalDigest(proposal)
        || proposal.candidateSignature !== processingGraphCandidateSignature(proposal.candidate)) {
      throw new TypeError(`${path} identity is not canonical.`);
    }
    assertProcessingGraphCandidate(proposal.candidate, `${path}.candidate`, sourceIdentifiers);
    const receipt = techniqueReceipts.find((item) => item.techniqueId === proposal.techniqueId);
    if (!receipt || receipt.correlationGroup !== proposal.correlationGroup
        || !['support', 'oppose'].includes(proposal.direction)
        || !Number.isFinite(proposal.confidence)
        || proposal.confidence < 0 || proposal.confidence > 1) {
      throw new TypeError(`${path} technique, direction, or confidence is invalid.`);
    }
    canonicalDigests(proposal.episodeSemanticDigests,
      `${path}.episodeSemanticDigests`, policy.limits.maxEpisodes);
    exact(proposal.evidence, [
      'episodeCount', 'independenceGroupCount', 'evidenceDigests',
    ], `${path}.evidence`);
    canonicalDigests(proposal.evidence.evidenceDigests,
      `${path}.evidence.evidenceDigests`, policy.limits.maxEvidenceDigestsPerVote);
    const groups = new Set(proposal.evidence.evidenceDigests.map((evidenceDigest) => {
      const evidence = evidenceLedger.get(evidenceDigest);
      if (!evidence) throw new TypeError(`${path} cites evidence outside the analyzed ledger.`);
      return evidence.independenceGroup;
    }));
    if (proposal.evidence.episodeCount !== proposal.evidence.evidenceDigests.length
        || proposal.evidence.independenceGroupCount !== groups.size) {
      throw new TypeError(`${path} evidence counters do not reproduce.`);
    }
    priorDigest = proposal.proposalDigest;
  }
  for (const receipt of techniqueReceipts) {
    if (ledger.filter((proposal) => proposal.techniqueId === receipt.techniqueId).length
        !== receipt.proposalsRetained) {
      throw new TypeError('Research proposal ledger does not reproduce technique retention.');
    }
  }
  return ledger;
}

function assertVariant(variant, transformId, baselineContent, baselineSemantic,
  preserving, path) {
  exact(variant, [
    'transformId', 'applied', 'episodeContentDigest', 'targetBeforeDigest',
    'targetAfterDigest', 'semanticDigest', 'passed',
  ], path);
  const expectedApplied = variant.targetBeforeDigest !== variant.targetAfterDigest;
  const expectedPassed = expectedApplied && (preserving
    ? variant.semanticDigest === baselineSemantic : variant.semanticDigest !== baselineSemantic);
  if (variant.transformId !== transformId || !DIGEST.test(variant.episodeContentDigest)
      || !DIGEST.test(variant.targetBeforeDigest) || !DIGEST.test(variant.targetAfterDigest)
      || !DIGEST.test(variant.semanticDigest) || variant.applied !== expectedApplied
      || (expectedApplied && variant.episodeContentDigest === baselineContent)
      || (!expectedApplied && variant.episodeContentDigest !== baselineContent)
      || variant.passed !== expectedPassed) {
    throw new TypeError(`${path} does not reproduce its metamorphic comparison.`);
  }
}

export function assertMetamorphicAuditLedger(ledger, evidenceLedger, receipt) {
  if (!Array.isArray(ledger) || ledger.length > receipt.eventsVisited) {
    throw new TypeError('Metamorphic audit ledger is not bounded by visited events.');
  }
  let priorEvidence = '';
  for (const [index, row] of ledger.entries()) {
    const path = `Metamorphic audit ledger[${index}]`;
    exact(row, [
      'evidenceDigest', 'baselineEpisodeContentDigest', 'baselineSemanticDigest',
      'preserving', 'controls',
    ], path);
    if (row.evidenceDigest <= priorEvidence || !evidenceLedger.has(row.evidenceDigest)
        || evidenceLedger.get(row.evidenceDigest).featureSemanticDigest
          !== row.baselineSemanticDigest
        || evidenceLedger.get(row.evidenceDigest).episodeContentDigest
          !== row.baselineEpisodeContentDigest
        || row.preserving.length !== RESEARCH_PRESERVING_TRANSFORMS.length
        || row.controls.length !== RESEARCH_MEANING_CHANGING_CONTROLS.length) {
      throw new TypeError(`${path} is not bound to analyzed evidence and exact transforms.`);
    }
    row.preserving.forEach((variant, variantIndex) => assertVariant(
      variant, RESEARCH_PRESERVING_TRANSFORMS[variantIndex],
      row.baselineEpisodeContentDigest, row.baselineSemanticDigest,
      true, `${path}.preserving[${variantIndex}]`,
    ));
    row.controls.forEach((variant, variantIndex) => assertVariant(
      variant, RESEARCH_MEANING_CHANGING_CONTROLS[variantIndex],
      row.baselineEpisodeContentDigest, row.baselineSemanticDigest,
      false, `${path}.controls[${variantIndex}]`,
    ));
    const committedAudit = structuredClone(row);
    delete committedAudit.evidenceDigest;
    if (researchMetamorphicAuditDigest(committedAudit)
        !== evidenceLedger.get(row.evidenceDigest).metamorphicAuditDigest) {
      throw new TypeError(`${path} does not match its externally committed audit digest.`);
    }
    priorEvidence = row.evidenceDigest;
  }
  const preservationChecks = ledger.reduce((sum, row) => sum
    + row.preserving.filter((variant) => variant.applied).length, 0);
  const controlChecks = ledger.reduce((sum, row) => sum
    + row.controls.filter((variant) => variant.applied).length, 0);
  const preservationFailures = ledger.reduce((sum, row) =>
    sum + row.preserving.filter((variant) => variant.applied && !variant.passed).length, 0);
  const controlFailures = ledger.reduce((sum, row) =>
    sum + row.controls.filter((variant) => variant.applied && !variant.passed).length, 0);
  if (receipt.preservationChecks !== preservationChecks
      || receipt.controlChecks !== controlChecks
      || receipt.preservationFailures !== preservationFailures
      || receipt.controlFailures !== controlFailures) {
    throw new TypeError('Metamorphic receipt does not reproduce from its audit ledger.');
  }
  return ledger;
}

export function assertResearchFeatureLedger(ledger, evidenceLedger) {
  if (!Array.isArray(ledger) || ledger.length !== evidenceLedger.size) {
    throw new TypeError('Research feature ledger must cover every analyzed evidence row.');
  }
  const records = [];
  let priorEvidence = '';
  for (const [index, row] of ledger.entries()) {
    exact(row, ['evidenceDigest', 'features'], `Research feature ledger[${index}]`);
    const evidence = evidenceLedger.get(row.evidenceDigest);
    assertResearchEpisodeFeatures(row.features);
    if (row.evidenceDigest <= priorEvidence || !evidence
        || row.features.semanticDigest !== evidence.featureSemanticDigest) {
      throw new TypeError('Research feature ledger is not canonical and evidence-bound.');
    }
    records.push({
      evidenceDigest: row.evidenceDigest,
      independenceGroup: evidence.independenceGroup,
      features: row.features,
    });
    priorEvidence = row.evidenceDigest;
  }
  return records.toSorted((left, right) =>
    left.features.semanticDigest.localeCompare(right.features.semanticDigest)
      || left.evidenceDigest.localeCompare(right.evidenceDigest));
}

function derivedTechniqueReceipts(strategyRun, proposalLedger) {
  return strategyRun.receipts.map((receipt) => {
    const proposalsRetained = proposalLedger.filter((proposal) =>
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

export function reproduceProcessingGraphTechniqueLayer({
  featureLedger, metamorphicAuditLedger, evidenceLedger, policy,
}) {
  const records = assertResearchFeatureLedger(featureLedger, evidenceLedger);
  const metamorphicBudget = policy.techniqueBudgets['metamorphic-recurrence-v1'];
  const expectedAudits = processingGraphMetamorphicEvidenceDigests(records, metamorphicBudget);
  if (stableStringify(metamorphicAuditLedger.map((row) => row.evidenceDigest))
      !== stableStringify(expectedAudits)) {
    throw new TypeError('Metamorphic audit ledger does not cover the exact selected evidence set.');
  }
  const auditByEvidence = new Map(metamorphicAuditLedger.map((row) => {
    const audit = structuredClone(row);
    delete audit.evidenceDigest;
    return [row.evidenceDigest, audit];
  }));
  const strategyRecords = records.map((record) => ({
    ...record,
    metamorphicAudit: auditByEvidence.get(record.evidenceDigest),
  }));
  const strategyRun = runProcessingGraphDiscoveryStrategies(
    strategyRecords, policy.techniqueBudgets,
  );
  const retained = selectFairResearchVotes(strategyRun.proposals, policy.limits.maxVotes);
  const proposalLedger = buildProcessingGraphProposalLedger(retained, policy);
  return {
    strategyRun,
    proposalLedger,
    techniqueReceipts: derivedTechniqueReceipts(strategyRun, proposalLedger),
  };
}

export function reproduceProcessingGraphHypotheses(ledger, policy, evidenceLedger) {
  const selected = selectFairResearchVotes(ledger, policy.limits.maxVotes);
  return buildProcessingGraphHypotheses(selected, policy, evidenceLedger);
}
