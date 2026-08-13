// Distinct Semantic IR alternatives closer than this rank-score delta remain unresolved.
export const HEURISTIC_SEMANTIC_TIE_MARGIN = 0.08;
export const MAXIMUM_SEMANTIC_ALTERNATIVES = 256;
const MAXIMUM_SEMANTIC_SIGNATURE_BYTES = 1024 * 1024;

function assertAcceptedCandidate(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)
    || !item.candidate || typeof item.candidate !== 'object'
    || typeof item.receipt?.semanticSignature !== 'string'
    || !Number.isFinite(item.candidate.rankScore)
    || !Number.isInteger(item.candidate.rank) || item.candidate.rank < 1) {
    throw new TypeError(`Accepted language candidate ${index} has an invalid arbitration envelope.`);
  }
  if (Buffer.byteLength(item.receipt.semanticSignature, 'utf8') > MAXIMUM_SEMANTIC_SIGNATURE_BYTES) {
    throw new TypeError(`Accepted language candidate ${index} semantic signature exceeds its byte bound.`);
  }
}

export function arbitrateSemanticAlternatives(accepted, tieMargin = HEURISTIC_SEMANTIC_TIE_MARGIN) {
  if (!Array.isArray(accepted)) {
    throw new TypeError('Accepted language candidates must be an array.');
  }
  if (accepted.length > MAXIMUM_SEMANTIC_ALTERNATIVES) {
    throw new TypeError(`Accepted language candidates exceed ${MAXIMUM_SEMANTIC_ALTERNATIVES}.`);
  }
  if (!Number.isFinite(tieMargin) || tieMargin < 0 || tieMargin > 1) {
    throw new TypeError('Semantic tie margin must be a finite number in [0, 1].');
  }
  const bySignature = new Map();
  for (const [index, item] of accepted.entries()) {
    assertAcceptedCandidate(item, index);
    const signature = item.receipt.semanticSignature;
    const current = bySignature.get(signature);
    if (!current || item.candidate.rankScore > current.candidate.rankScore
      || (item.candidate.rankScore === current.candidate.rankScore
        && item.candidate.rank < current.candidate.rank)) {
      bySignature.set(signature, item);
    }
  }
  const alternatives = [...bySignature.values()].toSorted((left, right) =>
    right.candidate.rankScore - left.candidate.rankScore
    || left.candidate.rank - right.candidate.rank
    || left.receipt.semanticSignature.localeCompare(right.receipt.semanticSignature));
  const ambiguous = alternatives.length > 1
    && alternatives[0].candidate.rankScore - alternatives[1].candidate.rankScore < tieMargin;
  return Object.freeze({
    status: alternatives.length === 0 ? 'NO_ACCEPTED_ALTERNATIVE'
      : ambiguous ? 'AMBIGUOUS' : 'SELECTED',
    selected: ambiguous ? null : alternatives[0] ?? null,
    alternatives: Object.freeze(alternatives),
    tieMargin,
  });
}
