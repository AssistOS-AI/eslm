import {
  array, boolean, boundedJson, finite, integer, kbIdentity, objectArray, record, string,
  stringArray, text,
} from './result-payload-shapes.mjs';
import { assertGroundingEntry } from './result-grounding-entry-contract.mjs';
import { assertResultStrategySelection } from './result-strategy-contract.mjs';
import { normalizedGroundingPlanTopic } from '../reasoning/grounding-query-focus.mjs';

const GROUNDING_FORMAT = 'eslm-grounding-bundle-v1';
const GROUNDING_STATUSES = new Set([
  'RELATED_EVIDENCE_FOUND', 'NO_RELATED_EVIDENCE', 'SEARCH_INCOMPLETE',
]);
const GROUNDING_TRIGGER_STATUSES = new Set([
  'AMBIGUOUS', 'INCONSISTENT_CONTEXT', 'MISSING_KNOWLEDGE', 'NO_APPLICABLE_METHOD',
  'PARTIAL', 'UNDERDETERMINED', 'UNKNOWN', 'UNPARSED', 'UNVERIFIED_NORMALIZATION',
  'UNSUPPORTED_OUTPUT',
]);
const GROUNDING_RECEIPT_STATUSES = new Set([
  'invalid-grounding-result', 'matches-found', 'no-match', 'provider-error',
  'runtime-boundary-truncated', 'unsupported-grounding-interface',
]);

function groundingReceipt(value, path) {
  const receipt = record(value, path);
  kbIdentity({ kbId: receipt.kbId, ...(receipt.kbVersion === undefined
    ? {} : { version: receipt.kbVersion }) }, path);
  if (!GROUNDING_RECEIPT_STATUSES.has(receipt.status)) {
    throw new TypeError(`${path}.status is unsupported.`);
  }
  string(receipt.coverage, `${path}.coverage`);
  boolean(receipt.complete, `${path}.complete`);
  integer(receipt.candidatesConsidered, `${path}.candidatesConsidered`, 1_000_000_000);
  stringArray(receipt.truncationReasons, `${path}.truncationReasons`, 8, 120);
  if (receipt.complete && !['matches-found', 'no-match'].includes(receipt.status)) {
    throw new TypeError(`${path} cannot mark ${receipt.status} complete.`);
  }
  if (receipt.complete && receipt.truncationReasons.length > 0) {
    throw new TypeError(`${path} cannot be complete after truncation.`);
  }
  if (!receipt.complete && receipt.status === 'no-match' && receipt.truncationReasons.length === 0) {
    throw new TypeError(`${path} requires an incomplete-search reason.`);
  }
  if (receipt.diagnostic !== undefined) string(receipt.diagnostic, `${path}.diagnostic`, 240);
}

function groundingFocus(grounding, result) {
  const focus = record(grounding.focus, 'Runtime result grounding.focus');
  if (focus.strategy !== 'semantic-role-phrase-morphology-v3') {
    throw new TypeError('Runtime result grounding.focus.strategy is unsupported.');
  }
  if (!['all-registered', 'exact-allowlist'].includes(focus.strategyMode)) {
    throw new TypeError('Runtime result grounding.focus.strategyMode is unsupported.');
  }
  assertResultStrategySelection({
    mode: focus.strategyMode,
    identities: focus.strategySelection,
    stage: 'runtime.knowledge.focus',
    result,
    path: 'Runtime result grounding.focus strategy selection',
  });
  if (!['typed-request-plan', 'visible-request'].includes(focus.source)) {
    throw new TypeError('Runtime result grounding.focus.source is unsupported.');
  }
  stringArray(focus.terms, 'Runtime result grounding.focus.terms', 32, 480);
  if (new Set(focus.terms).size !== focus.terms.length) {
    throw new TypeError('Runtime result grounding.focus.terms must be unique.');
  }
  objectArray(focus.candidates, 'Runtime result grounding.focus.candidates', 256, 4_096);
  objectArray(focus.obligations, 'Runtime result grounding.focus.obligations', 32, 4_096);
  const candidateIds = new Set();
  focus.candidates.forEach((candidate, index) => {
    const candidatePath = `Runtime result grounding.focus.candidates[${index}]`;
    string(candidate.candidateId, `${candidatePath}.candidateId`);
    if (candidateIds.has(candidate.candidateId)) {
      throw new TypeError('Runtime result grounding.focus.candidates requires unique candidate IDs.');
    }
    candidateIds.add(candidate.candidateId);
    string(candidate.term, `${candidatePath}.term`, 480);
    string(candidate.role, `${candidatePath}.role`);
    string(candidate.kind, `${candidatePath}.kind`);
    finite(candidate.score, `${candidatePath}.score`, 0, 1_000_000);
    boolean(candidate.included, `${candidatePath}.included`);
    boolean(candidate.selected, `${candidatePath}.selected`);
    if (candidate.selected && !candidate.included) {
      throw new TypeError(`${candidatePath} cannot select an excluded focus candidate.`);
    }
    if (candidate.selected && !focus.terms.includes(candidate.term)) {
      throw new TypeError(`${candidatePath} selects a term absent from grounding.focus.terms.`);
    }
  });
  const selectedCandidateTerms = new Set(focus.candidates
    .filter((candidate) => candidate.selected).map((candidate) => candidate.term));
  if (focus.terms.length !== selectedCandidateTerms.size
    || focus.terms.some((term) => !selectedCandidateTerms.has(term))) {
    throw new TypeError('Runtime result grounding.focus.terms contradicts its selected candidates.');
  }
  const obligationIds = new Set();
  focus.obligations.forEach((obligation, index) => {
    string(obligation.focusId, `Runtime result grounding.focus.obligations[${index}].focusId`);
    if (obligationIds.has(obligation.focusId)) {
      throw new TypeError('Runtime result grounding.focus.obligations requires unique focus IDs.');
    }
    obligationIds.add(obligation.focusId);
    string(obligation.term, `Runtime result grounding.focus.obligations[${index}].term`);
    string(obligation.role, `Runtime result grounding.focus.obligations[${index}].role`);
    boolean(obligation.selected, `Runtime result grounding.focus.obligations[${index}].selected`);
    if (obligation.selected !== focus.terms.includes(obligation.term)) {
      throw new TypeError(
        `Runtime result grounding.focus.obligations[${index}] contradicts selected terms.`,
      );
    }
  });
  if ((focus.source === 'typed-request-plan') !== (focus.obligations.length > 0)) {
    throw new TypeError('Runtime result grounding focus source contradicts its typed obligations.');
  }
  const plannedTopics = result.requestPlanning?.status === 'PLANNED'
    ? (result.requestPlanning.selectedPlan?.topics ?? []).slice(0, 32) : [];
  if (plannedTopics.length > 0 && (focus.source !== 'typed-request-plan'
    || focus.obligations.length !== plannedTopics.length
    || focus.obligations.some((obligation, index) => {
      const topic = plannedTopics[index];
      return obligation.focusId !== topic.topicId
        || obligation.term !== normalizedGroundingPlanTopic(topic.normalized)
        || obligation.role !== 'request-topic';
    }))) {
    throw new TypeError('Runtime result grounding typed focus contradicts its selected request plan.');
  }
  return focus;
}

function groundingEntries(grounding) {
  const entries = array(grounding.entries, 'Runtime result grounding.entries', 32);
  const entryIds = new Set();
  entries.forEach((entry, index) => {
    assertGroundingEntry(entry, `Runtime result grounding.entries[${index}]`);
    const identity = `${entry.kbId}\u0000${entry.kbVersion}\u0000${entry.recordId}`;
    if (entryIds.has(identity)) {
      throw new TypeError('Runtime result grounding.entries contains duplicate record identity.');
    }
    entryIds.add(identity);
  });
  return entries;
}

function groundingLimits(grounding, focus, receipts, entries) {
  const limits = record(grounding.limits, 'Runtime result grounding.limits');
  const ranges = {
    maximumEntries: [32, 1], maximumTerms: [32, 1], maximumLookups: [512, 1],
    maximumValuesPerLookup: [32, 1], maximumSources: [64, 1],
    maximumCandidateEntries: [512, 1], maximumOutputBytes: [1_048_576, 4_096],
    returnedEntryBytes: [1_048_576, 0], candidatesConsidered: [512, 0],
  };
  for (const [field, [maximum, minimum]] of Object.entries(ranges)) {
    integer(limits[field], `Runtime result grounding.limits.${field}`, maximum, minimum);
  }
  boolean(limits.outputTruncated, 'Runtime result grounding.limits.outputTruncated');
  const returnedEntryBytes = entries.reduce((total, entry) =>
    total + Buffer.byteLength(JSON.stringify(entry), 'utf8'), 0);
  if (entries.length > limits.maximumEntries || focus.terms.length > limits.maximumTerms
    || receipts.length > limits.maximumSources || limits.candidatesConsidered < entries.length
    || limits.candidatesConsidered > limits.maximumCandidateEntries
    || limits.returnedEntryBytes !== returnedEntryBytes
    || limits.returnedEntryBytes > limits.maximumOutputBytes
    || limits.maximumCandidateEntries < limits.maximumEntries
    || limits.outputTruncated !== (limits.candidatesConsidered > entries.length)) {
    throw new TypeError('Runtime result grounding observed work contradicts its declared limits.');
  }
}

export function assertGroundingExtension(value, result) {
  const grounding = record(value, 'Runtime result grounding');
  if (grounding.format !== GROUNDING_FORMAT || !GROUNDING_STATUSES.has(grounding.status)) {
    throw new TypeError(`Runtime result grounding must use ${GROUNDING_FORMAT} and a supported status.`);
  }
  if (grounding.answerSupported !== false || !GROUNDING_TRIGGER_STATUSES.has(grounding.triggerStatus)) {
    throw new TypeError('Runtime result grounding must remain non-answer evidence after an eligible status.');
  }
  text(grounding.queryText, 'Runtime result grounding.queryText', 4_096);
  string(grounding.interpretation, 'Runtime result grounding.interpretation', 1_024);
  const focus = groundingFocus(grounding, result);
  const search = record(grounding.search, 'Runtime result grounding.search');
  boolean(search.complete, 'Runtime result grounding.search.complete');
  boolean(search.termSelectionComplete, 'Runtime result grounding.search.termSelectionComplete');
  if (!['all-registered', 'exact-allowlist'].includes(search.relevanceStrategyMode)) {
    throw new TypeError('Runtime result grounding.search.relevanceStrategyMode is unsupported.');
  }
  assertResultStrategySelection({
    mode: search.relevanceStrategyMode,
    identities: search.relevanceStrategySelection,
    stage: 'runtime.evidence.assess',
    result,
    path: 'Runtime result grounding.search relevance strategy selection',
  });
  const receipts = array(search.receipts, 'Runtime result grounding.search.receipts', 64);
  receipts.forEach((receipt, index) => groundingReceipt(
    receipt, `Runtime result grounding.search.receipts[${index}]`,
  ));
  const entries = groundingEntries(grounding);
  groundingLimits(grounding, focus, receipts, entries);
  const computedComplete = receipts.length > 0 && search.termSelectionComplete
    && receipts.every((receipt) => receipt.complete);
  if (search.complete !== computedComplete) {
    throw new TypeError('Runtime result grounding search completeness contradicts its receipts.');
  }
  const hasEvidence = entries.length > 0;
  if ((grounding.status === 'RELATED_EVIDENCE_FOUND') !== hasEvidence
    || (grounding.status === 'NO_RELATED_EVIDENCE' && !search.complete)
    || (grounding.status === 'SEARCH_INCOMPLETE' && search.complete)) {
    throw new TypeError('Runtime result grounding status contradicts evidence or search completeness.');
  }
  const plannedRoute = ['heuristic-request-planned', 'heuristic-request-synthesis'].includes(
    result.languageRoute,
  );
  if (grounding.triggerStatus !== result.status
    && !(plannedRoute && grounding.triggerStatus === 'UNPARSED')) {
    throw new TypeError('Runtime result grounding triggerStatus does not match its primary route.');
  }
  boundedJson(grounding, 'Runtime result grounding', 1_572_864);
  return grounding;
}
