import { createHash } from 'node:crypto';

const MAX_ALTERNATIVES = 32;
const MAX_EVIDENCE_RECORDS = 2_048;
const MAX_STRENGTH = 10_000;
const SEMANTIC_FAMILIES = new Set([
  'causal', 'contradiction', 'default', 'goal', 'participant', 'state', 'temporal',
]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Typed evidence comparison: ${message}`);
}
function exactFields(value, expected, path) {
  requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value),
    `${path} must be an object.`);
  const actual = Object.keys(value).toSorted();
  const wanted = [...expected].toSorted();
  requireCondition(actual.length === wanted.length
    && actual.every((field, index) => field === wanted[index]),
  `${path} must contain exactly ${wanted.join(', ')}.`);
}
function validId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9:._-]{0,159}$/u.test(value);
}
function validateProvenance(provenance, path) {
  exactFields(provenance, ['origin', 'relation', 'sourceRef'], path);
  for (const field of ['origin', 'relation', 'sourceRef']) {
    requireCondition(typeof provenance[field] === 'string' && provenance[field].length > 0
      && provenance[field].length <= 512, `${path}.${field} must be bounded non-empty text.`);
  }
}
function normalizedPolicy(policy = {}) {
  exactFields(policy, Object.hasOwn(policy, 'familyWeights')
    ? ['familyWeights', 'minimumMargin'] : ['minimumMargin'], 'policy');
  const minimumMargin = policy.minimumMargin;
  requireCondition(Number.isInteger(minimumMargin) && minimumMargin >= 0 && minimumMargin <= 1_000_000,
    'policy.minimumMargin must be an integer from 0 through 1,000,000.');
  const familyWeights = policy.familyWeights ?? {};
  requireCondition(familyWeights !== null && typeof familyWeights === 'object'
    && !Array.isArray(familyWeights), 'policy.familyWeights must be an object.');
  for (const [family, weight] of Object.entries(familyWeights)) {
    requireCondition(SEMANTIC_FAMILIES.has(family), `policy.familyWeights has unknown family ${family}.`);
    requireCondition(Number.isInteger(weight) && weight >= 0 && weight <= 100,
      `policy.familyWeights.${family} must be an integer from 0 through 100.`);
  }
  return Object.freeze({ minimumMargin, familyWeights: Object.freeze({ ...familyWeights }) });
}
function normalizedInput(input) {
  exactFields(input, ['alternatives', 'evidence', 'policy'], 'input');
  requireCondition(Array.isArray(input.alternatives) && input.alternatives.length >= 2
    && input.alternatives.length <= MAX_ALTERNATIVES,
  `input.alternatives must contain 2 through ${MAX_ALTERNATIVES} identifiers.`);
  input.alternatives.forEach((id, index) => requireCondition(validId(id),
    `input.alternatives[${index}] is invalid.`));
  requireCondition(new Set(input.alternatives).size === input.alternatives.length,
    'input.alternatives must be unique.');
  requireCondition(Array.isArray(input.evidence) && input.evidence.length <= MAX_EVIDENCE_RECORDS,
    `input.evidence must contain at most ${MAX_EVIDENCE_RECORDS} records.`);
  const evidenceIds = new Set();
  for (const [index, record] of input.evidence.entries()) {
    const path = `input.evidence[${index}]`;
    exactFields(record, [
      'alternativeId', 'direction', 'evidenceId', 'provenance', 'semanticFamily', 'strength',
    ], path);
    requireCondition(validId(record.evidenceId), `${path}.evidenceId is invalid.`);
    requireCondition(!evidenceIds.has(record.evidenceId), `${path}.evidenceId is duplicated.`);
    evidenceIds.add(record.evidenceId);
    requireCondition(input.alternatives.includes(record.alternativeId),
      `${path}.alternativeId is not declared.`);
    requireCondition(SEMANTIC_FAMILIES.has(record.semanticFamily),
      `${path}.semanticFamily is not allowlisted.`);
    requireCondition(record.direction === 'support' || record.direction === 'attack',
      `${path}.direction must be support or attack.`);
    requireCondition(Number.isInteger(record.strength) && record.strength >= 1
      && record.strength <= MAX_STRENGTH, `${path}.strength must be from 1 through ${MAX_STRENGTH}.`);
    validateProvenance(record.provenance, `${path}.provenance`);
  }
  return Object.freeze({ alternatives: Object.freeze([...input.alternatives]),
    evidence: Object.freeze([...input.evidence]), policy: normalizedPolicy(input.policy) });
}
function contribution(record, policy) {
  const familyWeight = policy.familyWeights[record.semanticFamily] ?? 1;
  return record.strength * familyWeight * (record.direction === 'support' ? 1 : -1);
}
function evidenceDigest(evidence) {
  return createHash('sha256').update(JSON.stringify(evidence.map((record) => ({
    evidenceId: record.evidenceId, alternativeId: record.alternativeId,
    semanticFamily: record.semanticFamily, direction: record.direction,
    strength: record.strength, provenance: record.provenance,
  })).toSorted((left, right) => left.evidenceId.localeCompare(right.evidenceId)))).digest('hex');
}

export function compareTypedEvidence(rawInput) {
  const input = normalizedInput(rawInput);
  const rankings = input.alternatives.map((alternativeId) => {
    const records = input.evidence.filter((record) => record.alternativeId === alternativeId)
      .map((record) => Object.freeze({ ...record, contribution: contribution(record, input.policy) }))
      .toSorted((left, right) => left.evidenceId.localeCompare(right.evidenceId));
    return Object.freeze({ alternativeId,
      score: records.reduce((sum, record) => sum + record.contribution, 0),
      support: records.filter((record) => record.direction === 'support').length,
      attacks: records.filter((record) => record.direction === 'attack').length,
      evidence: Object.freeze(records) });
  }).toSorted((left, right) => right.score - left.score
    || left.alternativeId.localeCompare(right.alternativeId));
  const evidenceRecords = rankings.reduce((sum, ranking) => sum + ranking.evidence.length, 0);
  const margin = rankings[0].score - rankings[1].score;
  if (evidenceRecords === 0 || margin === 0 || margin < input.policy.minimumMargin) {
    return Object.freeze({ status: 'UNKNOWN', values: Object.freeze([]),
      rankings: Object.freeze(rankings),
      uncertainty: Object.freeze({ kind: evidenceRecords === 0
        ? 'insufficient-evidence' : 'score-tie-or-insufficient-margin',
      margin, requiredMargin: input.policy.minimumMargin }),
      witness: Object.freeze({ kind: 'typed-evidence-abstention', evidenceSha256: evidenceDigest(input.evidence) }) });
  }
  return Object.freeze({ status: 'DEFEASIBLE', values: Object.freeze([rankings[0].alternativeId]),
    rankings: Object.freeze(rankings),
    witness: Object.freeze({ kind: 'typed-evidence-comparison', selectedAlternativeId: rankings[0].alternativeId,
      margin, requiredMargin: input.policy.minimumMargin, evidenceRecords,
      evidenceSha256: evidenceDigest(input.evidence) }) });
}

export function verifyTypedEvidenceComparison(input, result) {
  try {
    const expected = compareTypedEvidence(input);
    if (result?.status !== expected.status) return false;
    if (JSON.stringify(result?.values) !== JSON.stringify(expected.values)) return false;
    if (JSON.stringify(result?.rankings) !== JSON.stringify(expected.rankings)) return false;
    return result?.witness?.kind === expected.witness.kind
      && result.witness.evidenceSha256 === expected.witness.evidenceSha256
      && (result.status === 'UNKNOWN'
        ? JSON.stringify(result.uncertainty) === JSON.stringify(expected.uncertainty)
        : result.witness.selectedAlternativeId === expected.witness.selectedAlternativeId
          && result.witness.margin === expected.witness.margin
          && result.witness.requiredMargin === expected.witness.requiredMargin
          && result.witness.evidenceRecords === expected.witness.evidenceRecords);
  } catch {
    return false;
  }
}

export function classifyTypedUpdate(input) {
  const comparison = compareTypedEvidence(input);
  if (comparison.status === 'UNKNOWN') return comparison;
  const selected = comparison.values[0];
  requireCondition(selected === 'state:before' || selected === 'state:after',
    'typed update alternatives must be state:before and state:after.');
  return Object.freeze({ ...comparison,
    values: Object.freeze([selected === 'state:after' ? 'strengthener' : 'weakener']),
    witness: Object.freeze({ ...comparison.witness, selectedState: selected,
      classification: selected === 'state:after' ? 'strengthener' : 'weakener' }) });
}
