import {
  retrieveModelGrounding, retrieveSessionGrounding,
} from '../reasoning/grounding-model-retrieval.mjs';
import { limitGroundingRequestLookups } from '../reasoning/grounding-retrieval.mjs';

function truncatedSessionReceipt() {
  return {
    kbId: 'session',
    kbVersion: 'current',
    status: 'runtime-boundary-truncated',
    coverage: 'aggregate-grounding-lookup-budget',
    complete: false,
    candidatesConsidered: 0,
    truncationReasons: ['session-overlay-lookup-budget'],
  };
}

export function retrieveCoreRelatedEvidence({ model, factIndex, groundingIndex }, request, context = {}) {
  const session = context.session;
  const hasSessionKnowledge = (session?.facts?.length ?? 0) > 0
    || (session?.rules?.length ?? 0) > 0;
  const sourceSelection = request.sourceSelection;
  const sessionSelected = !sourceSelection
    || sourceSelection.some((identity) => identity.kbId === 'session');
  const baseSources = sourceSelection?.filter((identity) => identity.kbId !== 'session');
  const baseSelected = !sourceSelection || baseSources.length > 0;
  const baseLookupCount = hasSessionKnowledge && sessionSelected && baseSelected
    ? Math.ceil(request.limits.maximumLookups / 2)
    : baseSelected ? request.limits.maximumLookups : 0;
  const base = baseSelected ? retrieveModelGrounding({
    request: limitGroundingRequestLookups({
      ...request,
      ...(baseSources ? { sourceSelection: baseSources } : {}),
    }, baseLookupCount),
    model,
    factIndex,
    groundingIndex,
    maximumEntries: request.limits.maximumEntries,
  }) : { entries: [], receipts: [] };
  if (!hasSessionKnowledge || !sessionSelected) return base;
  const sessionLookupCount = request.limits.maximumLookups - baseLookupCount;
  if (sessionLookupCount === 0) {
    return { ...base, receipts: [...base.receipts, truncatedSessionReceipt()] };
  }
  const overlay = retrieveSessionGrounding(
    limitGroundingRequestLookups(request, sessionLookupCount),
    session,
  );
  return {
    entries: [...base.entries, ...overlay.entries],
    receipts: [...base.receipts, ...overlay.receipts],
  };
}
