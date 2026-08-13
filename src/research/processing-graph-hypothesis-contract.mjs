import { stableStringify } from '../util.mjs';
import {
  PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL,
  computeProcessingGraphHypothesisScore,
  processingGraphCandidateSignature,
} from './processing-graph-hypothesis-coordinator.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>-][a-z0-9]+)*$/u;
const HYPOTHESIS_TYPES = new Set([
  'processing-node', 'coordination-node', 'authority-gate', 'strategy', 'edge',
  'packet-field', 'nested-circuit',
]);

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function canonicalStrings(value, path, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 256)
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical string array.`);
  }
}

function canonicalDigests(value, path, maximum = 128) {
  canonicalStrings(value, path, maximum);
  if (value.some((item) => !DIGEST.test(item))) {
    throw new TypeError(`${path} must contain only SHA-256 digests.`);
  }
}

export function assertProcessingGraphCandidate(candidate, path, sourceIdentifiers = []) {
  exact(candidate, [
    'type', 'responsibility', 'placement', 'inputKinds', 'outputKinds', 'invariant',
    'failureKinds', 'resourceDimensions',
  ], path);
  if (!HYPOTHESIS_TYPES.has(candidate.type)) throw new TypeError(`${path}.type is unsupported.`);
  for (const [field, value] of Object.entries({
    responsibility: candidate.responsibility,
    invariant: candidate.invariant,
  })) {
    if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > 512) {
      throw new TypeError(`${path}.${field} must be bounded non-empty text.`);
    }
  }
  exact(candidate.placement, ['earliestAfter', 'latestBefore', 'owner'], `${path}.placement`);
  for (const value of Object.values(candidate.placement)) {
    if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > 512) {
      throw new TypeError(`${path}.placement fields must be bounded non-empty text.`);
    }
  }
  for (const field of ['inputKinds', 'outputKinds', 'failureKinds', 'resourceDimensions']) {
    canonicalStrings(candidate[field], `${path}.${field}`);
  }
  assertSourceNeutralCandidate(candidate, sourceIdentifiers, path);
}

function assertSourceNeutralCandidate(candidate, sourceIdentifiers, path) {
  const surface = stableStringify(candidate).toLowerCase();
  if (/(?:expected|reference)[-_ ]?answer|gold[-_ ]?label|answer[-_ ]?key|dataset[-_ ]?(?:id|name)|source[-_ ]?(?:native|record|row)[-_ ]?(?:id|identifier)/u
    .test(surface)) {
    throw new TypeError(`${path} contains answer- or source-conditioned architecture.`);
  }
  for (const sourceIdentifier of sourceIdentifiers) {
    if (sourceIdentifier.length >= 4 && surface.includes(sourceIdentifier.toLowerCase())) {
      throw new TypeError(`${path} contains a registered source identity.`);
    }
  }
}

function assertVote(vote, path, policy, techniqueIds, evidenceLedger) {
  exact(vote, ['techniqueId', 'correlationGroup', 'direction', 'confidence', 'evidence'], path);
  if (!techniqueIds.includes(vote.techniqueId)
      || typeof vote.correlationGroup !== 'string' || !IDENTIFIER.test(vote.correlationGroup)
      || !['support', 'oppose'].includes(vote.direction)
      || !Number.isFinite(vote.confidence) || vote.confidence < 0 || vote.confidence > 1) {
    throw new TypeError(`${path} vote identity or confidence is invalid.`);
  }
  exact(vote.evidence, ['episodeCount', 'independenceGroupCount', 'evidenceDigests'], `${path}.evidence`);
  count(vote.evidence.episodeCount, `${path}.evidence.episodeCount`, true);
  count(vote.evidence.independenceGroupCount, `${path}.evidence.independenceGroupCount`, true);
  canonicalDigests(vote.evidence.evidenceDigests, `${path}.evidence.evidenceDigests`,
    policy.limits.maxEvidenceDigestsPerVote);
  const groups = new Set(vote.evidence.evidenceDigests.map((evidenceDigest) => {
    const entry = evidenceLedger.get(evidenceDigest);
    if (!entry) throw new TypeError(`${path} cites evidence outside the analyzed ledger.`);
    return entry.independenceGroup;
  }));
  if (vote.evidence.episodeCount !== vote.evidence.evidenceDigests.length
      || vote.evidence.independenceGroupCount !== groups.size) {
    throw new TypeError(`${path} evidence counts do not reproduce from the analyzed ledger.`);
  }
}

export function assertProcessingGraphHypothesis({
  hypothesis, index, policy, sourceIdentifiers, evidenceLedger, techniqueIds,
}) {
  const path = `Hypothesis[${index}]`;
  exact(hypothesis, [
    'format', 'hypothesisId', 'rank', 'semanticSignature', 'candidate', 'votes', 'score',
    'status', 'evidence', 'authority',
  ], path);
  if (hypothesis.format !== PROCESSING_GRAPH_HYPOTHESIS_PROTOCOL || hypothesis.rank !== index + 1) {
    throw new TypeError('Research hypothesis protocol or rank is invalid.');
  }
  assertProcessingGraphCandidate(hypothesis.candidate, `${path}.candidate`, sourceIdentifiers);
  const signature = processingGraphCandidateSignature(hypothesis.candidate);
  if (hypothesis.semanticSignature !== signature || hypothesis.hypothesisId !== `hypothesis:${signature.slice(7)}`) {
    throw new TypeError('Research hypothesis identity does not match its semantic candidate.');
  }
  if (!Array.isArray(hypothesis.votes) || hypothesis.votes.length < 1) {
    throw new TypeError('Research hypothesis must contain at least one vote.');
  }
  let priorVote = '';
  for (const [voteIndex, vote] of hypothesis.votes.entries()) {
    assertVote(vote, `${path}.votes[${voteIndex}]`, policy, techniqueIds, evidenceLedger);
    const key = `${vote.correlationGroup}:${vote.techniqueId}:${vote.direction}`;
    if (key <= priorVote) throw new TypeError('Research hypothesis votes must be canonical and unique.');
    priorVote = key;
  }
  exact(hypothesis.score, [
    'support', 'opposition', 'confidence', 'supportCorrelationGroups',
    'oppositionCorrelationGroups',
  ], `${path}.score`);
  if (stableStringify(hypothesis.score)
      !== stableStringify(computeProcessingGraphHypothesisScore(hypothesis.votes))) {
    throw new TypeError('Research hypothesis score does not reproduce from correlation-grouped votes.');
  }
  if (!['contested', 'exploratory', 'plausible'].includes(hypothesis.status)) {
    throw new TypeError('Research hypothesis status is unsupported.');
  }
  exact(hypothesis.evidence, ['episodeCount', 'independenceGroupCount', 'evidenceDigests'], `${path}.evidence`);
  count(hypothesis.evidence.episodeCount, 'Research hypothesis episode count', true);
  count(hypothesis.evidence.independenceGroupCount, 'Research hypothesis independence count', true);
  canonicalDigests(hypothesis.evidence.evidenceDigests, 'Research hypothesis evidence digests');
  const voteEvidence = [...new Set(hypothesis.votes.flatMap((vote) =>
    vote.evidence.evidenceDigests))].toSorted();
  const groups = new Set(voteEvidence.map((evidenceDigest) =>
    evidenceLedger.get(evidenceDigest).independenceGroup));
  if (stableStringify(hypothesis.evidence.evidenceDigests) !== stableStringify(voteEvidence)
      || hypothesis.evidence.episodeCount !== voteEvidence.length
      || hypothesis.evidence.independenceGroupCount !== groups.size) {
    throw new TypeError('Research hypothesis evidence does not reproduce from its votes and ledger.');
  }
  exact(hypothesis.authority, [
    'answer', 'runtime', 'proof', 'promotion', 'executablePolicy',
  ], `${path}.authority`);
  if (stableStringify(hypothesis.authority) !== stableStringify({
    answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
    executablePolicy: false,
  })) throw new TypeError('Research hypothesis must remain non-authoritative.');
}
