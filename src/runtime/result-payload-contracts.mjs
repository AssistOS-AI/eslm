import { HEURISTIC_CNL_PROTOCOL } from '../language/heuristic-cnl-contract.mjs';
import {
  HEURISTIC_REQUEST_PATTERN_CATALOG, HEURISTIC_REQUEST_PLAN_PROTOCOL,
} from '../language/heuristic-request-planning.mjs';
import {
  array, boolean, boundedJson, confidence, exactKeys, finite, integer, jsonBytes, kbIdentity, kbIdentityArray,
  MAX_RESULT_ARRAY_BYTES, MAX_RESULT_ARRAY_ITEMS, objectArray, record, string, stringArray, text,
} from './result-payload-shapes.mjs';

const APPROXIMATION_PROTOCOL = HEURISTIC_CNL_PROTOCOL;
const REQUEST_PLAN_PROTOCOL = HEURISTIC_REQUEST_PLAN_PROTOCOL;
const REQUEST_PATTERN_CATALOG = HEURISTIC_REQUEST_PATTERN_CATALOG.version;
const SYNTHESIS_PROTOCOL = 'eslm-heuristic-request-synthesis-v1';
const NORMALIZATION_RESULT_PROTOCOL = 'eslm-language-agent-normalization-result-v1';
const NORMALIZATION_CANDIDATE_PROTOCOL = 'eslm-language-agent-normalization-v2';
const NORMALIZATION_RECEIPT_FORMAT = 'eslm-codex-normalization-receipt-v1';
const GROUNDING_FORMAT = 'eslm-grounding-bundle-v1';
const NORMALIZATION_ANCHOR_KINDS = new Set([
  'named-entity', 'number', 'answer-option', 'quoted-material', 'interrogative', 'lexical-content',
  'negation', 'quantifier', 'modality', 'conditional', 'temporal', 'conjunction', 'disjunction',
  'comparison', 'directed-relation',
]);

const APPROXIMATION_STATUSES = new Set([
  'CANDIDATES', 'NO_CHANGE', 'NO_SAFE_CANDIDATE', 'RESOURCE_LIMIT',
  'accepted-reparse', 'ambiguous-reparse', 'no-accepted-reparse', 'resource-limit',
]);
const REQUEST_PLAN_STATUSES = new Set([
  'PLANNED', 'AMBIGUOUS', 'LOW_CONFIDENCE', 'NO_SUPPORTED_INTENT', 'RESOURCE_LIMIT',
]);
const NORMALIZATION_STATUSES = new Set([
  'accepted', 'failed', 'proposal-limit-exhausted', 'rejected', 'reparse-rejected',
]);
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

export { NORMALIZATION_RESULT_PROTOCOL };

function approximationCandidate(candidate, path) {
  const value = record(candidate, path);
  string(value.candidateId, `${path}.candidateId`);
  integer(value.rank, `${path}.rank`, 256, 1);
  string(value.text, `${path}.text`, 65_536);
  confidence(value.confidence, `${path}.confidence`);
  finite(value.rankScore, `${path}.rankScore`, 0, 2);
  return value;
}

function approximationExtension(value, route) {
  const approximation = record(value, 'Runtime result approximation');
  if (approximation.protocol !== APPROXIMATION_PROTOCOL
    || approximation.receipt?.protocol !== APPROXIMATION_PROTOCOL) {
    throw new TypeError(`Runtime result approximation protocol must be ${APPROXIMATION_PROTOCOL}.`);
  }
  if (!APPROXIMATION_STATUSES.has(approximation.status)) {
    throw new TypeError(`Runtime result approximation has unsupported status ${String(approximation.status)}.`);
  }
  text(approximation.originalText, 'Runtime result approximation.originalText', 65_536);
  array(approximation.candidates, 'Runtime result approximation.candidates', 256)
    .forEach((candidate, index) => approximationCandidate(candidate,
      `Runtime result approximation.candidates[${index}]`));
  record(approximation.receipt, 'Runtime result approximation.receipt');
  boolean(approximation.receipt.complete, 'Runtime result approximation.receipt.complete');
  if (approximation.receipt.answerProduced !== false || approximation.receipt.kbConsulted !== false
    || approximation.receipt.sessionMutated !== false) {
    throw new TypeError('Runtime result approximation receipt must deny answer, KB, and session authority.');
  }
  if (approximation.selectedCandidate !== null && approximation.selectedCandidate !== undefined) {
    approximationCandidate(approximation.selectedCandidate,
      'Runtime result approximation.selectedCandidate');
  }
  if (approximation.recommendedCandidate !== null && approximation.recommendedCandidate !== undefined) {
    approximationCandidate(approximation.recommendedCandidate,
      'Runtime result approximation.recommendedCandidate');
  }
  if (approximation.reparses !== undefined) {
    array(approximation.reparses, 'Runtime result approximation.reparses', 128)
      .forEach((item, index) => {
        const reparse = record(item, `Runtime result approximation.reparses[${index}]`);
        string(reparse.candidateId, `Runtime result approximation.reparses[${index}].candidateId`);
        if (!['PARSED', 'UNPARSED'].includes(reparse.status)
          || reparse.acceptedSemanticIr !== (reparse.status === 'PARSED')) {
          throw new TypeError(`Runtime result approximation.reparses[${index}] has inconsistent parse status.`);
        }
      });
  }
  if (route === 'heuristic-cnl-approximated'
    && (approximation.status !== 'accepted-reparse' || !approximation.selectedCandidate)) {
    throw new TypeError('heuristic-cnl-approximated requires one accepted selected approximation.');
  }
  if (route === 'heuristic-cnl-ambiguous'
    && (approximation.status !== 'ambiguous-reparse' || approximation.selectedCandidate !== null)) {
    throw new TypeError('heuristic-cnl-ambiguous requires an unresolved approximation tie.');
  }
  boundedJson(approximation, 'Runtime result approximation', 1_048_576);
}

function requestPlanningExtension(value) {
  const planning = record(value, 'Runtime result requestPlanning');
  if (planning.protocol !== REQUEST_PLAN_PROTOCOL || planning.receipt?.protocol !== REQUEST_PLAN_PROTOCOL) {
    throw new TypeError(`Runtime result requestPlanning protocol must be ${REQUEST_PLAN_PROTOCOL}.`);
  }
  if (planning.receipt.patternCatalog !== REQUEST_PATTERN_CATALOG) {
    throw new TypeError(`Runtime result requestPlanning pattern catalog must be ${REQUEST_PATTERN_CATALOG}.`);
  }
  if (!REQUEST_PLAN_STATUSES.has(planning.status)) {
    throw new TypeError(`Runtime result requestPlanning has unsupported status ${String(planning.status)}.`);
  }
  array(planning.candidates, 'Runtime result requestPlanning.candidates', 64);
  record(planning.receipt, 'Runtime result requestPlanning.receipt');
  boolean(planning.receipt.complete, 'Runtime result requestPlanning.receipt.complete');
  if (planning.receipt.kbConsulted !== false || planning.receipt.reasonerInvoked !== false
    || planning.receipt.sessionMutated !== false) {
    throw new TypeError('Runtime result requestPlanning receipt must deny KB, reasoner, and session authority.');
  }
  const requiresPlan = ['PLANNED', 'AMBIGUOUS', 'LOW_CONFIDENCE'].includes(planning.status);
  if (requiresPlan !== Boolean(planning.selectedPlan)) {
    throw new TypeError(`Runtime result requestPlanning status ${planning.status} has inconsistent selectedPlan.`);
  }
  if (planning.selectedPlan) {
    const plan = record(planning.selectedPlan, 'Runtime result requestPlanning.selectedPlan');
    string(plan.primaryIntent, 'Runtime result requestPlanning.selectedPlan.primaryIntent');
    stringArray(plan.operations, 'Runtime result requestPlanning.selectedPlan.operations', 8, 64);
    objectArray(plan.instructionSegments,
      'Runtime result requestPlanning.selectedPlan.instructionSegments', 128, 16_384);
    objectArray(plan.topics, 'Runtime result requestPlanning.selectedPlan.topics', 64, 16_384);
    record(plan.outputContract, 'Runtime result requestPlanning.selectedPlan.outputContract');
    confidence(plan.confidence, 'Runtime result requestPlanning.selectedPlan.confidence');
    objectArray(plan.subrequests, 'Runtime result requestPlanning.selectedPlan.subrequests', 192, 65_536);
  }
  boundedJson(planning, 'Runtime result requestPlanning', 1_048_576);
}

function synthesisExtension(value, result) {
  const synthesis = record(value, 'Runtime result synthesis');
  if (synthesis.protocol !== SYNTHESIS_PROTOCOL || synthesis.status !== 'PARTIAL') {
    throw new TypeError(`Runtime result synthesis must use ${SYNTHESIS_PROTOCOL} with PARTIAL status.`);
  }
  string(synthesis.answer, 'Runtime result synthesis.answer', 262_144);
  record(synthesis.plan, 'Runtime result synthesis.plan');
  record(synthesis.evidence, 'Runtime result synthesis.evidence');
  objectArray(synthesis.evidence.selected, 'Runtime result synthesis.evidence.selected', 32, 65_536);
  const selectedIdentities = new Map();
  synthesis.evidence.selected.forEach((selection, index) => {
    const selectionPath = `Runtime result synthesis.evidence.selected[${index}]`;
    groundingEntry(selection.entry, `${selectionPath}.entry`);
    stringArray(selection.topicIds, `${selectionPath}.topicIds`, 64);
    finite(selection.topicScore, `${selectionPath}.topicScore`, 0, 1_000_000);
    finite(selection.selectionScore, `${selectionPath}.selectionScore`, 0, 1_000_000);
    stringArray(selection.reasons, `${selectionPath}.reasons`, 64, 512);
    for (const identity of selection.entry.contributingKbVersions) {
      selectedIdentities.set(`${identity.kbId}\u0000${identity.version ?? ''}`, identity);
    }
  });
  for (const field of ['candidatesConsidered', 'unrelatedEntriesOmitted', 'budgetOmitted']) {
    integer(synthesis.evidence[field], `Runtime result synthesis.evidence.${field}`, 512);
  }
  stringArray(synthesis.gaps, 'Runtime result synthesis.gaps', 64, 2_048);
  if (synthesis.gaps.length === 0) {
    throw new TypeError('Runtime result synthesis must retain at least one structural coverage gap.');
  }
  kbIdentityArray(synthesis.contributingKbVersions,
    'Runtime result synthesis.contributingKbVersions', 32);
  const declaredIdentities = new Set(synthesis.contributingKbVersions.map((identity) =>
    `${identity.kbId}\u0000${identity.version ?? ''}`));
  if (declaredIdentities.size !== selectedIdentities.size
    || [...selectedIdentities.keys()].some((identity) => !declaredIdentities.has(identity))) {
    throw new TypeError('Runtime result synthesis contributing KBs must match selected evidence.');
  }
  if (result.answer !== synthesis.answer || result.status !== 'PARTIAL') {
    throw new TypeError('heuristic request synthesis must own the matching PARTIAL answer.');
  }
  if (!result.requestPlanning?.selectedPlan) {
    throw new TypeError('Runtime result synthesis requires requestPlanning.selectedPlan.');
  }
  if (jsonBytes(synthesis.plan, 'Runtime result synthesis.plan', 262_144)
    !== jsonBytes(result.requestPlanning.selectedPlan,
      'Runtime result requestPlanning.selectedPlan', 262_144)) {
    throw new TypeError('Runtime result synthesis plan must match requestPlanning.selectedPlan.');
  }
  boundedJson(synthesis, 'Runtime result synthesis', 1_048_576);
}

function normalizationCandidate(candidate, path) {
  const value = record(candidate, path);
  exactKeys(value, ['protocol', 'operation', 'sourceLanguage', 'normalizedEnglish', 'alignments'], path);
  if (value.protocol !== NORMALIZATION_CANDIDATE_PROTOCOL) {
    throw new TypeError(`${path}.protocol must be ${NORMALIZATION_CANDIDATE_PROTOCOL}.`);
  }
  if (!['translation', 'simplification'].includes(value.operation)) {
    throw new TypeError(`${path}.operation is unsupported.`);
  }
  string(value.sourceLanguage, `${path}.sourceLanguage`, 35);
  string(value.normalizedEnglish, `${path}.normalizedEnglish`, 24_000);
  objectArray(value.alignments, `${path}.alignments`, 256, 2_048);
  value.alignments.forEach((alignment, index) => {
    const alignmentPath = `${path}.alignments[${index}]`;
    exactKeys(alignment, ['kind', 'source', 'target'], alignmentPath);
    if (!NORMALIZATION_ANCHOR_KINDS.has(alignment.kind)) {
      throw new TypeError(`${alignmentPath}.kind is unsupported.`);
    }
    string(alignment.source, `${alignmentPath}.source`);
    string(alignment.target, `${alignmentPath}.target`);
  });
}

function normalizationExtension(value, result) {
  const normalization = record(value, 'Runtime result normalization');
  if (normalization.protocol !== NORMALIZATION_RESULT_PROTOCOL) {
    throw new TypeError(`Runtime result normalization protocol must be ${NORMALIZATION_RESULT_PROTOCOL}.`);
  }
  boolean(normalization.attempted, 'Runtime result normalization.attempted');
  string(normalization.triggerStatus, 'Runtime result normalization.triggerStatus', 64);
  if (!normalization.attempted) {
    if (result.languageRoute.startsWith('language-agent-')) {
      throw new TypeError('A Language Agent route requires an attempted normalization.');
    }
    if (normalization.triggerStatus !== result.status) {
      throw new TypeError('Unattempted normalization triggerStatus must match the direct result status.');
    }
    boundedJson(normalization, 'Runtime result normalization', 4_096);
    return;
  }
  if (normalization.triggerStatus !== 'UNPARSED' || !NORMALIZATION_STATUSES.has(normalization.status)) {
    throw new TypeError('Attempted normalization requires an UNPARSED trigger and supported status.');
  }
  integer(normalization.proposalCount, 'Runtime result normalization.proposalCount', 3);
  if (normalization.proposalLimit !== 3) {
    throw new TypeError('Runtime result normalization.proposalLimit must be 3.');
  }
  integer(normalization.externalInvocations, 'Runtime result normalization.externalInvocations', 3);
  boolean(normalization.cacheHit, 'Runtime result normalization.cacheHit');
  if (normalization.requestedOperation !== undefined
    && !['translation', 'simplification'].includes(normalization.requestedOperation)) {
    throw new TypeError('Runtime result normalization.requestedOperation is unsupported.');
  }
  const receipts = array(normalization.receipts ?? [], 'Runtime result normalization.receipts', 3);
  receipts.forEach((receipt, index) => {
    const item = record(receipt, `Runtime result normalization.receipts[${index}]`);
    if (item.format !== NORMALIZATION_RECEIPT_FORMAT) {
      throw new TypeError(`Runtime result normalization.receipts[${index}] has unsupported format.`);
    }
  });
  if (normalization.receipt !== undefined
    && normalization.receipt.format !== NORMALIZATION_RECEIPT_FORMAT) {
    throw new TypeError('Runtime result normalization.receipt has unsupported format.');
  }
  if (normalization.candidate) normalizationCandidate(
    normalization.candidate, 'Runtime result normalization.candidate',
  );
  if (normalization.candidate && normalization.requestedOperation
    && normalization.candidate.operation !== normalization.requestedOperation) {
    throw new TypeError('Runtime result normalization candidate operation differs from the requested operation.');
  }
  if (normalization.status === 'accepted') {
    normalizationCandidate(normalization.candidate, 'Runtime result normalization.candidate');
    if (normalization.validation?.accepted !== true || !normalization.reparseStatus) {
      throw new TypeError('Accepted normalization requires accepted validation and a reparse status.');
    }
    if (normalization.reparseStatus !== result.status) {
      throw new TypeError('Accepted normalization reparseStatus must match the public result status.');
    }
  }
  if (['rejected', 'reparse-rejected'].includes(normalization.status) && !normalization.candidate) {
    throw new TypeError(`${normalization.status} normalization requires its rejected candidate.`);
  }
  if (normalization.status === 'rejected' && normalization.validation?.accepted !== false) {
    throw new TypeError('Rejected normalization requires a rejected validation receipt.');
  }
  if (normalization.status === 'reparse-rejected' && normalization.validation?.accepted !== true) {
    throw new TypeError('Reparse-rejected normalization requires accepted surface validation.');
  }
  if (normalization.status === 'reparse-rejected'
    && !['UNPARSED', 'AMBIGUOUS'].includes(normalization.reparseStatus)) {
    throw new TypeError('Reparse-rejected normalization requires an UNPARSED or AMBIGUOUS reparse status.');
  }
  if (normalization.externalInvocations > normalization.proposalCount
    || (normalization.cacheHit && normalization.externalInvocations !== 0)) {
    throw new TypeError('Runtime result normalization invocation accounting is inconsistent.');
  }
  if (normalization.status === 'failed' || normalization.status === 'proposal-limit-exhausted') {
    string(normalization.diagnostic, 'Runtime result normalization.diagnostic', 2_048);
  }
  boundedJson(normalization, 'Runtime result normalization', 1_048_576);
}

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

function groundingEntry(value, path) {
  const entry = record(value, path);
  kbIdentity({ kbId: entry.kbId, ...(entry.kbVersion === undefined
    ? {} : { version: entry.kbVersion }) }, path);
  string(entry.recordId, `${path}.recordId`);
  string(entry.statement, `${path}.statement`, 480);
  record(entry.semantic, `${path}.semantic`);
  string(entry.epistemicStatus, `${path}.epistemicStatus`);
  stringArray(entry.provenance, `${path}.provenance`, 16);
  if (entry.provenance.length === 0) throw new TypeError(`${path}.provenance must not be empty.`);
  kbIdentityArray(entry.contributingKbVersions, `${path}.contributingKbVersions`, 16);
  if (entry.contributingKbVersions.length === 0) {
    throw new TypeError(`${path}.contributingKbVersions must not be empty.`);
  }
  const relevance = record(entry.relevance, `${path}.relevance`);
  finite(relevance.score, `${path}.relevance.score`, 0, 1_000_000);
  stringArray(relevance.reasons, `${path}.relevance.reasons`, 8, 96);
  if (relevance.reasons.length === 0) throw new TypeError(`${path}.relevance.reasons must not be empty.`);
  boundedJson(entry.semantic, `${path}.semantic`, 4_096);
}

function groundingExtension(value, result) {
  const grounding = record(value, 'Runtime result grounding');
  if (grounding.format !== GROUNDING_FORMAT || !GROUNDING_STATUSES.has(grounding.status)) {
    throw new TypeError(`Runtime result grounding must use ${GROUNDING_FORMAT} and a supported status.`);
  }
  if (grounding.answerSupported !== false || !GROUNDING_TRIGGER_STATUSES.has(grounding.triggerStatus)) {
    throw new TypeError('Runtime result grounding must remain non-answer evidence after an eligible status.');
  }
  text(grounding.queryText, 'Runtime result grounding.queryText', 4_096);
  string(grounding.interpretation, 'Runtime result grounding.interpretation', 1_024);
  const focus = record(grounding.focus, 'Runtime result grounding.focus');
  string(focus.strategy, 'Runtime result grounding.focus.strategy');
  if (!['typed-request-plan', 'visible-request'].includes(focus.source)) {
    throw new TypeError('Runtime result grounding.focus.source is unsupported.');
  }
  stringArray(focus.terms, 'Runtime result grounding.focus.terms', 32, 480);
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
    if (candidate.selected && !focus.terms.includes(candidate.term)) {
      throw new TypeError(`${candidatePath} selects a term absent from grounding.focus.terms.`);
    }
  });
  focus.obligations.forEach((obligation, index) => {
    string(obligation.focusId, `Runtime result grounding.focus.obligations[${index}].focusId`);
    string(obligation.term, `Runtime result grounding.focus.obligations[${index}].term`);
    string(obligation.role, `Runtime result grounding.focus.obligations[${index}].role`);
    boolean(obligation.selected, `Runtime result grounding.focus.obligations[${index}].selected`);
    if (obligation.selected && !focus.terms.includes(obligation.term)) {
      throw new TypeError(`Runtime result grounding.focus.obligations[${index}] has an absent selected term.`);
    }
  });
  if ((focus.source === 'typed-request-plan') !== (focus.obligations.length > 0)) {
    throw new TypeError('Runtime result grounding focus source contradicts its typed obligations.');
  }
  const search = record(grounding.search, 'Runtime result grounding.search');
  boolean(search.complete, 'Runtime result grounding.search.complete');
  boolean(search.termSelectionComplete, 'Runtime result grounding.search.termSelectionComplete');
  const receipts = array(search.receipts, 'Runtime result grounding.search.receipts', 64);
  receipts.forEach((receipt, index) => groundingReceipt(
    receipt, `Runtime result grounding.search.receipts[${index}]`,
  ));
  const entries = array(grounding.entries, 'Runtime result grounding.entries', 32);
  entries.forEach((entry, index) => groundingEntry(entry, `Runtime result grounding.entries[${index}]`));
  record(grounding.limits, 'Runtime result grounding.limits');
  const limitRanges = {
    maximumEntries: [32, 1],
    maximumTerms: [32, 1],
    maximumLookups: [512, 1],
    maximumValuesPerLookup: [32, 1],
    maximumSources: [64, 1],
    maximumCandidateEntries: [512, 1],
    maximumOutputBytes: [1_048_576, 4_096],
    returnedEntryBytes: [1_048_576, 0],
    candidatesConsidered: [512, 0],
  };
  for (const [field, [maximum, minimum]] of Object.entries(limitRanges)) {
    integer(grounding.limits[field], `Runtime result grounding.limits.${field}`, maximum, minimum);
  }
  boolean(grounding.limits.outputTruncated, 'Runtime result grounding.limits.outputTruncated');
  if (entries.length > grounding.limits.maximumEntries
    || focus.terms.length > grounding.limits.maximumTerms
    || receipts.length > grounding.limits.maximumSources
    || grounding.limits.candidatesConsidered > grounding.limits.maximumCandidateEntries
    || grounding.limits.returnedEntryBytes > grounding.limits.maximumOutputBytes
    || grounding.limits.maximumCandidateEntries < grounding.limits.maximumEntries
    || grounding.limits.outputTruncated !== (grounding.limits.candidatesConsidered > entries.length)) {
    throw new TypeError('Runtime result grounding observed work contradicts its declared limits.');
  }
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
}

export function assertRuntimePayloadContracts(result) {
  for (const field of ['values', 'provenance']) {
    if (result[field] === undefined) continue;
    array(result[field], `Runtime result ${field}`, MAX_RESULT_ARRAY_ITEMS);
    if (field === 'provenance') result[field].forEach((item, index) =>
      record(item, `Runtime result provenance[${index}]`));
    boundedJson(result[field], `Runtime result ${field}`, MAX_RESULT_ARRAY_BYTES);
  }
  for (const field of ['usedKbVersions', 'selectedKbVersions', 'consultedKbVersions']) {
    kbIdentityArray(result[field], `Runtime result ${field}`);
  }
  objectArray(result.unresolvedSubgoals, 'Runtime result unresolvedSubgoals', 256, 262_144);
  boundedJson(result.unresolvedSubgoals, 'Runtime result unresolvedSubgoals', MAX_RESULT_ARRAY_BYTES);

  if (result.approximation !== undefined) approximationExtension(result.approximation, result.languageRoute);
  if (result.requestPlanning !== undefined) requestPlanningExtension(result.requestPlanning);
  if (result.synthesis !== undefined) synthesisExtension(result.synthesis, result);
  if (result.normalization !== undefined) normalizationExtension(result.normalization, result);
  if (result.grounding !== undefined) groundingExtension(result.grounding, result);
  return result;
}
