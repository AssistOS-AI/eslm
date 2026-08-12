const MAX_IDENTIFIER_CHARACTERS = 256;
const SEARCH_RECEIPT_STATUSES = new Set([
  'invalid-grounding-result',
  'matches-found',
  'no-match',
  'provider-error',
  'runtime-boundary-truncated',
  'unsupported-grounding-interface',
]);

function boundedIdentifier(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IDENTIFIER_CHARACTERS
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} must be a non-empty bounded identifier.`);
  }
  return value;
}

function boundedStringArray(values, { maximumItems, maximumCharacters, label }) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
  if (values.length > maximumItems) throw new Error(`${label} exceeds its item limit.`);
  return [...new Set(values.map((value) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximumCharacters
      || /[\u0000-\u001f\u007f]/u.test(value)) {
      throw new Error(`${label} contains an invalid string.`);
    }
    return value;
  }))];
}

function boundedDiagnostic(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return text.length <= 240 ? text : `${text.slice(0, 239)}…`;
}

export function makeGroundingSearchReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('Grounding search receipt must be an object.');
  }
  const kbId = boundedIdentifier(receipt.kbId, 'Grounding search receipt kbId');
  const kbVersion = receipt.kbVersion === undefined
    ? undefined : boundedIdentifier(String(receipt.kbVersion), 'Grounding search receipt kbVersion');
  const status = boundedIdentifier(receipt.status, 'Grounding search receipt status');
  if (!SEARCH_RECEIPT_STATUSES.has(status)) {
    throw new Error(`Grounding search receipt ${kbId} has unsupported status ${status}.`);
  }
  const coverage = boundedIdentifier(receipt.coverage, 'Grounding search receipt coverage');
  if (!Number.isSafeInteger(receipt.candidatesConsidered)
      || receipt.candidatesConsidered < 0 || receipt.candidatesConsidered > 1_000_000_000) {
    throw new Error(`Grounding search receipt ${kbId} requires a bounded candidate count.`);
  }
  const truncationReasons = boundedStringArray(receipt.truncationReasons ?? [], {
    maximumItems: 8,
    maximumCharacters: 120,
    label: `Grounding search receipt ${kbId} truncation reasons`,
  });
  const complete = receipt.complete === true;
  if (complete && status !== 'matches-found' && status !== 'no-match') {
    throw new Error(`Grounding search receipt ${kbId} cannot mark ${status} complete.`);
  }
  if (complete && truncationReasons.length > 0) {
    throw new Error(`Grounding search receipt ${kbId} cannot be complete after truncation.`);
  }
  if (!complete && status === 'no-match' && truncationReasons.length === 0) {
    throw new Error(`Grounding search receipt ${kbId} requires an incomplete-search reason.`);
  }
  return Object.freeze({
    kbId,
    kbVersion,
    status,
    coverage,
    complete,
    candidatesConsidered: receipt.candidatesConsidered,
    truncationReasons: Object.freeze(truncationReasons),
    ...(receipt.diagnostic ? { diagnostic: boundedDiagnostic(receipt.diagnostic) } : {}),
  });
}
