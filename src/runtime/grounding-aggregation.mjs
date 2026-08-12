import {
  makeGroundingEntry, makeGroundingSearchReceipt,
} from '../reasoning/grounding-retrieval.mjs';

const MAX_RECEIPTS_PER_RESULT = 16;

function sameIdentity(value, identity) {
  if (identity.kbId === 'canonical-runtime-index') {
    return identity.allowedKbVersions?.some((allowed) => value?.kbId === allowed.kbId
      && (allowed.version === undefined
        || String(value?.kbVersion ?? '') === String(allowed.version))) === true;
  }
  return value?.kbId === identity.kbId
    && (identity.version === undefined || String(value?.kbVersion ?? '') === String(identity.version));
}

function invalidReceipt(identity, diagnostic, candidatesConsidered = 0) {
  return makeGroundingSearchReceipt({
    kbId: identity.kbId,
    kbVersion: identity.version,
    status: 'invalid-grounding-result',
    coverage: 'provider-result-validation',
    complete: false,
    candidatesConsidered,
    truncationReasons: ['invalid-provider-result'],
    diagnostic,
  });
}

function addOrdinaryReceipt(target, receipt) {
  const ordinaryLimit = Math.max(0, target.request.limits.maximumSources - 1);
  if (target.receipts.length >= ordinaryLimit) return false;
  target.receipts.push(receipt);
  return true;
}

export function createGroundingAccumulator(request) {
  return {
    request,
    entries: [],
    receipts: [],
    omissions: {
      count: 0,
      candidates: 0,
      reasons: new Set(),
      diagnostics: [],
    },
  };
}

export function recordGroundingOmission(target, reason, count = 1, diagnostic) {
  if (!Number.isSafeInteger(count) || count < 1) return;
  target.omissions.count += count;
  target.omissions.reasons.add(reason);
  if (diagnostic && target.omissions.diagnostics.length < 4) {
    target.omissions.diagnostics.push(String(diagnostic).slice(0, 160));
  }
}

function recordInvalidResult(target, identity, diagnostic, candidateCount = 0) {
  recordGroundingOmission(target, 'invalid-provider-result', 1, diagnostic);
  const receipt = invalidReceipt(identity, String(diagnostic).slice(0, 240), candidateCount);
  if (!addOrdinaryReceipt(target, receipt)) {
    recordGroundingOmission(target, 'runtime-search-receipt-budget', 1);
  }
}

export function appendGroundingResult(target, result, identity) {
  const { request } = target;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    recordInvalidResult(target, identity, 'Grounding provider returned no structured result.');
    return;
  }
  const rawEntries = result.entries === undefined ? [] : result.entries;
  const rawReceipts = result.receipts ?? (result.receipt ? [result.receipt] : []);
  if (!Array.isArray(rawEntries) || !Array.isArray(rawReceipts)) {
    recordInvalidResult(target, identity, 'Grounding entries and receipts must be arrays.');
    return;
  }

  const perResultLimit = request.limits.maximumEntries * 4;
  const aggregateAvailable = Math.max(
    0, request.limits.maximumCandidateEntries - target.entries.length,
  );
  const acceptedEntryLimit = Math.min(perResultLimit, aggregateAvailable);
  let invalidEntries = 0;
  for (const rawEntry of rawEntries.slice(0, acceptedEntryLimit)) {
    try {
      if (!sameIdentity(rawEntry, identity)) throw new Error('Grounding entry identity mismatch.');
      target.entries.push(makeGroundingEntry(rawEntry));
    } catch {
      invalidEntries += 1;
    }
  }
  const omittedEntries = rawEntries.length - acceptedEntryLimit;
  if (omittedEntries > 0) {
    target.omissions.candidates += omittedEntries;
    recordGroundingOmission(target, 'runtime-candidate-entry-budget', omittedEntries);
  }

  let invalidReceipts = 0;
  const receiptLimit = identity.kbId === 'canonical-runtime-index'
    ? MAX_RECEIPTS_PER_RESULT : 1;
  const receiptSlice = rawReceipts.slice(0, receiptLimit);
  for (const rawReceipt of receiptSlice) {
    try {
      if (!sameIdentity(rawReceipt, identity)) throw new Error('Grounding receipt identity mismatch.');
      const receipt = makeGroundingSearchReceipt(rawReceipt);
      if (!addOrdinaryReceipt(target, receipt)) {
        recordGroundingOmission(target, 'runtime-search-receipt-budget', 1);
      }
    } catch {
      invalidReceipts += 1;
    }
  }
  if (rawReceipts.length > receiptSlice.length) {
    recordGroundingOmission(
      target, 'runtime-search-receipt-budget', rawReceipts.length - receiptSlice.length,
    );
  }

  if (invalidEntries > 0 || invalidReceipts > 0 || rawReceipts.length === 0) {
    recordInvalidResult(
      target,
      identity,
      `${invalidEntries} invalid entries, ${invalidReceipts} invalid receipts; receiptMissing=${rawReceipts.length === 0}`,
      Math.min(rawEntries.length, perResultLimit),
    );
  }
}

export function allocateGroundingLookupBudgets(maximumLookups, executorCount) {
  if (!Number.isSafeInteger(maximumLookups) || maximumLookups < 1
    || !Number.isSafeInteger(executorCount) || executorCount < 0) {
    throw new Error('Grounding lookup allocation requires bounded positive input.');
  }
  if (executorCount === 0) return [];
  const scheduled = Math.min(maximumLookups, executorCount);
  const base = Math.floor(maximumLookups / scheduled);
  const remainder = maximumLookups % scheduled;
  return Array.from({ length: scheduled }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function finalizeGroundingAccumulator(target) {
  if (target.omissions.count === 0) return target;
  const reasons = [...target.omissions.reasons].toSorted().slice(0, 8);
  const diagnosticParts = [
    `${target.omissions.count} bounded item(s) or source(s) omitted`,
    ...target.omissions.diagnostics,
  ];
  target.receipts.push(makeGroundingSearchReceipt({
    kbId: 'grounding-aggregator',
    kbVersion: '1',
    status: 'runtime-boundary-truncated',
    coverage: 'aggregate-grounding-budget-and-validation',
    complete: false,
    candidatesConsidered: target.omissions.candidates,
    truncationReasons: reasons,
    diagnostic: diagnosticParts.join('; '),
  }));
  return target;
}
