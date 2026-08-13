function canonicalizeSemanticIr(value) {
  if (Array.isArray(value)) return value.map(canonicalizeSemanticIr);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).toSorted().map((key) => [
    key, canonicalizeSemanticIr(value[key]),
  ]));
}

export function semanticSignature(ir) {
  if (!ir || typeof ir !== 'object' || Array.isArray(ir)) {
    throw new TypeError('Language inspection IR must be an object.');
  }
  return JSON.stringify(canonicalizeSemanticIr({
    query: ir.query ?? null,
    assertions: ir.assertions ?? [],
    rules: ir.rules ?? [],
    unsupportedStatements: ir.unsupportedStatements ?? [],
  }));
}

function reparseReceipt(candidate, ir) {
  return Object.freeze({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    text: candidate.text,
    confidence: candidate.confidence,
    rankScore: candidate.rankScore,
    status: ir.parseStatus,
    acceptedSemanticIr: ir.parseStatus === 'PARSED',
    semanticSignature: semanticSignature(ir),
  });
}

function assertCandidate(candidate, index) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError(`Language inspection candidate ${index} must be an object.`);
  }
  if (typeof candidate.text !== 'string') {
    throw new TypeError(`Language inspection candidate ${index}.text must be a string.`);
  }
  if (Buffer.byteLength(candidate.text, 'utf8') > MAXIMUM_CANDIDATE_TEXT_BYTES) {
    throw new TypeError(`Language inspection candidate ${index}.text exceeds the bounded input size.`);
  }
  if (typeof candidate.candidateId !== 'string' || candidate.candidateId.length === 0
    || !Number.isInteger(candidate.rank) || candidate.rank < 1 || !Number.isFinite(candidate.rankScore)) {
    throw new TypeError(
      `Language inspection candidate ${index} must expose an identity, positive integer rank, and finite rankScore.`,
    );
  }
}

export function inspectLanguageCandidates({
  candidates, maximumReparses, inspectLanguage, context = {},
}) {
  if (!Array.isArray(candidates)) {
    throw new TypeError('Language inspection candidates must be an array.');
  }
  if (candidates.length > MAXIMUM_PARSE_ONLY_REPARSES) {
    throw new TypeError(`Language inspection candidates exceed ${MAXIMUM_PARSE_ONLY_REPARSES}.`);
  }
  if (!Number.isInteger(maximumReparses) || maximumReparses < 0
    || maximumReparses > MAXIMUM_PARSE_ONLY_REPARSES) {
    throw new TypeError(
      `Language inspection maximumReparses must be an integer from 0 to ${MAXIMUM_PARSE_ONLY_REPARSES}.`,
    );
  }
  if (typeof inspectLanguage !== 'function') {
    throw new TypeError('Language inspection requires an inspectLanguage function.');
  }
  const reparses = [];
  const accepted = [];
  for (const [index, candidate] of candidates.slice(0, maximumReparses).entries()) {
    assertCandidate(candidate, index);
    const ir = inspectLanguage(candidate.text, context);
    const receipt = reparseReceipt(candidate, ir);
    reparses.push(receipt);
    if (receipt.acceptedSemanticIr) accepted.push(Object.freeze({ candidate, ir, receipt }));
  }
  return Object.freeze({
    reparses: Object.freeze(reparses),
    accepted: Object.freeze(accepted),
  });
}

export function alternativeInterpretationRequired(direct, directIr, accepted) {
  if (!direct || typeof direct !== 'object' || Array.isArray(direct)) {
    throw new TypeError('Language interpretation gate requires a direct result object.');
  }
  if (!Array.isArray(accepted)) {
    throw new TypeError('Language interpretation gate accepted candidates must be an array.');
  }
  if (['UNPARSED', 'UNKNOWN'].includes(direct.status)) return true;
  if (!['SOLVED', 'PARTIAL'].includes(direct.status) || directIr?.parseStatus !== 'PARSED') return false;
  const directSignature = semanticSignature(directIr);
  return accepted.some((item) => item?.receipt?.semanticSignature !== directSignature);
}
export const MAXIMUM_PARSE_ONLY_REPARSES = 256;
const MAXIMUM_CANDIDATE_TEXT_BYTES = 64 * 1024;
