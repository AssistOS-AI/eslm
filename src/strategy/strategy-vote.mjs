export function createStrategyVote({ strategyId, strategyVersion = '1', candidate, confidence, evidence = [] }) {
  if (typeof strategyId !== 'string' || !/^strategy:[a-z0-9][a-z0-9:-]*$/u.test(strategyId)) {
    throw new Error('A strategy vote requires a namespaced strategy ID.');
  }
  if (typeof strategyVersion !== 'string' || !/^\d+$/u.test(strategyVersion)) {
    throw new Error('A strategy vote requires a numeric revision string.');
  }
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('A strategy vote confidence must be from 0 through 1.');
  }
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 256) {
    throw new Error('A strategy vote candidate must be bounded text.');
  }
  if (!Array.isArray(evidence) || evidence.length > 16 || evidence.some((item) =>
    typeof item !== 'string' || item.length === 0 || item.length > 256)) {
    throw new Error('A strategy vote evidence list must be bounded text references.');
  }
  return Object.freeze({
    format: 'eslm-strategy-vote-v1',
    strategyId,
    strategyVersion,
    candidate,
    confidence,
    evidence: Object.freeze([...new Set(evidence)].toSorted()),
    truthAuthorized: false,
  });
}
