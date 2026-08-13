import {
  HEURISTIC_CNL_LIMIT_CEILINGS, HEURISTIC_CNL_PROTOCOL,
} from '../language/heuristic-cnl-contract.mjs';
import { assertEnglishLikelihoodReceipt } from '../language/english-likelihood.mjs';
import { builtinStrategyDescriptors } from '../strategy/builtin-strategy-catalog.mjs';
import { strategyIdentity } from '../strategy/strategy-contract.mjs';
import {
  array, boolean, boundedJson, confidence, exactKeys, finite, integer, kbIdentity, kbIdentityArray,
  MAX_RESULT_ARRAY_BYTES, MAX_RESULT_ARRAY_ITEMS, objectArray, record, string, stringArray, text,
} from './result-payload-shapes.mjs';
import { assertGroundingExtension } from './result-grounding-contract.mjs';
import { assertRequestPlanningExtension } from './result-request-planning-contract.mjs';
import { assertSynthesisExtension } from './result-synthesis-contract.mjs';
import {
  assertResultStrategySelection, assertStrategyExecutionReceipt,
} from './result-strategy-contract.mjs';

const APPROXIMATION_PROTOCOL = HEURISTIC_CNL_PROTOCOL;
const NORMALIZATION_RESULT_PROTOCOL = 'eslm-language-agent-normalization-result-v1';
const NORMALIZATION_CANDIDATE_PROTOCOL = 'eslm-language-agent-normalization-v2';
const NORMALIZATION_RECEIPT_FORMAT = /^eslm-[a-z0-9][a-z0-9-]{0,63}-normalization-receipt-v[1-9]\d*$/u;
const NORMALIZATION_ANCHOR_KINDS = new Set([
  'named-entity', 'number', 'answer-option', 'quoted-material', 'interrogative', 'lexical-content',
  'negation', 'quantifier', 'modality', 'conditional', 'temporal', 'conjunction', 'disjunction',
  'comparison', 'directed-relation',
]);

const APPROXIMATION_STATUSES = new Set([
  'CANDIDATES', 'NO_CHANGE', 'NO_SAFE_CANDIDATE', 'RESOURCE_LIMIT',
  'accepted-reparse', 'ambiguous-reparse', 'no-accepted-reparse', 'resource-limit',
]);
const NORMALIZATION_STATUSES = new Set([
  'accepted', 'failed', 'proposal-limit-exhausted', 'rejected', 'reparse-rejected',
]);
const NORMALIZATION_PROPOSAL_STRATEGIES = Object.freeze({
  translation: 'strategy:language:external-translation-proposal@1',
  simplification: 'strategy:language:external-simplification-proposal@1',
});
const LANGUAGE_STRATEGY_IDENTITIES = Object.freeze(builtinStrategyDescriptors('runtime.language.interpret')
  .filter((descriptor) => descriptor.implementationState === 'coordinated')
  .map(strategyIdentity).toSorted());

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

function approximationCandidateCoreMatches(left, right) {
  return left.candidateId === right.candidateId
    && left.rank === right.rank
    && left.text === right.text
    && left.confidence === right.confidence
    && left.rankScore === right.rankScore;
}

function declaredApproximationCandidate(candidate, candidates, path) {
  const declared = candidates.find((item) => item.candidateId === candidate.candidateId);
  if (!declared || !approximationCandidateCoreMatches(candidate, declared)) {
    throw new TypeError(`${path} must match one declared approximation candidate.`);
  }
  return declared;
}

function approximationExtension(value, result) {
  const approximation = record(value, 'Runtime result approximation');
  if (approximation.protocol !== APPROXIMATION_PROTOCOL
    || approximation.receipt?.protocol !== APPROXIMATION_PROTOCOL) {
    throw new TypeError(`Runtime result approximation protocol must be ${APPROXIMATION_PROTOCOL}.`);
  }
  if (!APPROXIMATION_STATUSES.has(approximation.status)) {
    throw new TypeError(`Runtime result approximation has unsupported status ${String(approximation.status)}.`);
  }
  text(approximation.originalText, 'Runtime result approximation.originalText', 65_536);
  const candidates = array(approximation.candidates, 'Runtime result approximation.candidates', 256);
  const candidateIds = new Set();
  candidates.forEach((candidate, index) => {
    approximationCandidate(candidate, `Runtime result approximation.candidates[${index}]`);
    if (candidateIds.has(candidate.candidateId)) {
      throw new TypeError('Runtime result approximation candidate IDs must be unique.');
    }
    if (candidate.rank !== index + 1) {
      throw new TypeError('Runtime result approximation candidate ranks must follow result order.');
    }
    candidateIds.add(candidate.candidateId);
  });
  record(approximation.receipt, 'Runtime result approximation.receipt');
  const strategySelection = record(approximation.receipt.strategySelection,
    'Runtime result approximation.receipt.strategySelection');
  if (strategySelection.stage !== 'runtime.language.interpret') {
    throw new TypeError('Runtime result approximation strategySelection has the wrong stage.');
  }
  assertResultStrategySelection({
    mode: strategySelection.mode,
    identities: strategySelection.identities,
    stage: strategySelection.stage,
    result,
    path: 'Runtime result approximation.receipt.strategySelection',
  });
  if (approximation.receipt.strategyExecution === undefined) {
    if (!['RESOURCE_LIMIT', 'resource-limit'].includes(approximation.status)) {
      throw new TypeError('Runtime result approximation requires its strategy execution receipt.');
    }
  } else {
    const execution = assertStrategyExecutionReceipt(approximation.receipt.strategyExecution, result);
    const executed = strategySelection.identities.filter((identity) =>
      identity !== 'strategy:language:direct-controlled-parser@1');
    const expectedExecuted = strategySelection.mode === 'all-registered'
      ? LANGUAGE_STRATEGY_IDENTITIES : executed;
    if (JSON.stringify(execution.selectedStrategies) !== JSON.stringify(expectedExecuted)) {
      throw new TypeError('Runtime result approximation strategy selection contradicts execution receipt.');
    }
  }
  boolean(approximation.receipt.complete, 'Runtime result approximation.receipt.complete');
  if (approximation.receipt.answerProduced !== false || approximation.receipt.kbConsulted !== false
    || approximation.receipt.sessionMutated !== false) {
    throw new TypeError('Runtime result approximation receipt must deny answer, KB, and session authority.');
  }
  const limits = record(approximation.receipt.limits, 'Runtime result approximation.receipt.limits');
  const observed = record(approximation.receipt.observed, 'Runtime result approximation.receipt.observed');
  for (const [field, maximum] of Object.entries(HEURISTIC_CNL_LIMIT_CEILINGS)) {
    integer(limits[field], `Runtime result approximation.receipt.limits.${field}`, maximum, 1);
  }
  const observedLimits = {
    inputBytes: 1_048_576,
    tokens: HEURISTIC_CNL_LIMIT_CEILINGS.maximumTokens + 1,
    sentences: HEURISTIC_CNL_LIMIT_CEILINGS.maximumSentences + 1,
    proposals: HEURISTIC_CNL_LIMIT_CEILINGS.maximumProposals,
    candidates: HEURISTIC_CNL_LIMIT_CEILINGS.maximumCandidates,
    editDistanceEvaluations: HEURISTIC_CNL_LIMIT_CEILINGS.maximumEditDistanceEvaluations,
    receiptBytes: 16_777_216,
  };
  for (const [field, maximum] of Object.entries(observedLimits)) {
    integer(observed[field], `Runtime result approximation.receipt.observed.${field}`, maximum);
  }
  const resourceLimited = ['RESOURCE_LIMIT', 'resource-limit'].includes(approximation.status);
  const receiptOverflow = resourceLimited
    && approximation.receipt.exhaustedResource === 'maximumReceiptBytes';
  if ((!receiptOverflow && approximation.candidates.length !== observed.candidates)
    || approximation.candidates.length > limits.maximumCandidates
    || observed.proposals > limits.maximumProposals
    || observed.editDistanceEvaluations > limits.maximumEditDistanceEvaluations) {
    throw new TypeError('Runtime result approximation observed work contradicts its limits or candidates.');
  }
  objectArray(approximation.receipt.familyReceipts,
    'Runtime result approximation.receipt.familyReceipts', 64, 16_384);
  if (approximation.receipt.proposalReceipts !== undefined) objectArray(
    approximation.receipt.proposalReceipts,
    'Runtime result approximation.receipt.proposalReceipts', 1_024, 65_536,
  );
  stringArray(approximation.receipt.truncationReasons,
    'Runtime result approximation.receipt.truncationReasons', 8, 120);
  if (resourceLimited
    && (approximation.receipt.complete !== false || approximation.candidates.length !== 0)) {
    throw new TypeError('RESOURCE_LIMIT approximation requires an empty, incomplete receipt.');
  }
  if (resourceLimited) {
    if (!Object.hasOwn(HEURISTIC_CNL_LIMIT_CEILINGS, approximation.receipt.exhaustedResource)) {
      throw new TypeError('RESOURCE_LIMIT approximation must name its exhausted resource.');
    }
    if (!approximation.receipt.truncationReasons.includes(approximation.receipt.exhaustedResource)) {
      throw new TypeError('RESOURCE_LIMIT approximation must receipt its exhausted resource.');
    }
  }
  if (approximation.selectedCandidate !== null && approximation.selectedCandidate !== undefined) {
    approximationCandidate(approximation.selectedCandidate,
      'Runtime result approximation.selectedCandidate');
    declaredApproximationCandidate(
      approximation.selectedCandidate, candidates, 'Runtime result approximation.selectedCandidate',
    );
  }
  if (approximation.recommendedCandidate !== null && approximation.recommendedCandidate !== undefined) {
    approximationCandidate(approximation.recommendedCandidate,
      'Runtime result approximation.recommendedCandidate');
    const declared = declaredApproximationCandidate(
      approximation.recommendedCandidate, candidates,
      'Runtime result approximation.recommendedCandidate',
    );
    if (declared !== candidates[0]) {
      throw new TypeError('Runtime result approximation recommendedCandidate must be the first candidate.');
    }
  }
  const recommendationMissing = approximation.recommendedCandidate === null
    || approximation.recommendedCandidate === undefined;
  if ((candidates.length === 0 && approximation.recommendedCandidate !== null)
    || (candidates.length > 0 && recommendationMissing)) {
    throw new TypeError('Runtime result approximation recommendation must match candidate availability.');
  }
  if (approximation.reparses !== undefined) {
    const reparses = array(approximation.reparses, 'Runtime result approximation.reparses', 128);
    const reparsedIds = new Set();
    reparses.forEach((item, index) => {
      const reparse = record(item, `Runtime result approximation.reparses[${index}]`);
      string(reparse.candidateId, `Runtime result approximation.reparses[${index}].candidateId`);
      integer(reparse.rank, `Runtime result approximation.reparses[${index}].rank`, 256, 1);
      string(reparse.text, `Runtime result approximation.reparses[${index}].text`, 65_536);
      confidence(reparse.confidence, `Runtime result approximation.reparses[${index}].confidence`);
      finite(reparse.rankScore, `Runtime result approximation.reparses[${index}].rankScore`, 0, 2);
      string(reparse.semanticSignature,
        `Runtime result approximation.reparses[${index}].semanticSignature`, 262_144);
      if (!['PARSED', 'UNPARSED'].includes(reparse.status)
        || reparse.acceptedSemanticIr !== (reparse.status === 'PARSED')) {
        throw new TypeError(`Runtime result approximation.reparses[${index}] has inconsistent parse status.`);
      }
      if (reparsedIds.has(reparse.candidateId)) {
        throw new TypeError('Runtime result approximation reparses must reference unique candidates.');
      }
      const declared = candidates[index];
      if (!declared || !approximationCandidateCoreMatches(reparse, declared)) {
        throw new TypeError('Runtime result approximation reparses must follow declared candidate order.');
      }
      reparsedIds.add(reparse.candidateId);
    });
    if (approximation.selectedCandidate
      && !reparses.some((reparse) => reparse.candidateId === approximation.selectedCandidate.candidateId
        && reparse.status === 'PARSED')) {
      throw new TypeError('Runtime result approximation selectedCandidate requires a successful reparse.');
    }
  }
  if (result.languageRoute === 'heuristic-cnl-approximated'
    && (approximation.status !== 'accepted-reparse' || !approximation.selectedCandidate)) {
    throw new TypeError('heuristic-cnl-approximated requires one accepted selected approximation.');
  }
  if (result.languageRoute === 'heuristic-cnl-ambiguous'
    && (approximation.status !== 'ambiguous-reparse' || approximation.selectedCandidate !== null)) {
    throw new TypeError('heuristic-cnl-ambiguous requires an unresolved approximation tie.');
  }
  boundedJson(approximation, 'Runtime result approximation', 1_048_576);
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

function normalizationReceipt(value, path) {
  const receipt = record(value, path);
  string(receipt.format, `${path}.format`, 128);
  if (!NORMALIZATION_RECEIPT_FORMAT.test(receipt.format)) {
    throw new TypeError(`${path} must expose a versioned Language Agent receipt format.`);
  }
  boundedJson(receipt, path, 262_144);
  return receipt;
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
  if (!normalization.requestedOperation
    || normalization.strategyIdentity !== NORMALIZATION_PROPOSAL_STRATEGIES[normalization.requestedOperation]
    || normalization.stage !== 'runtime.language.interpret'
    || normalization.proposalRole !== 'untrusted-language-form-candidate'
    || normalization.answerAuthority !== 'none') {
    throw new TypeError('Attempted normalization requires exact host-owned proposal-strategy accounting.');
  }
  const receipts = array(normalization.receipts ?? [], 'Runtime result normalization.receipts', 3);
  receipts.forEach((receipt, index) => normalizationReceipt(
    receipt, `Runtime result normalization.receipts[${index}]`,
  ));
  if (normalization.receipt !== undefined) normalizationReceipt(
    normalization.receipt, 'Runtime result normalization.receipt',
  );
  if (normalization.receipt !== undefined
    && (receipts.length === 0
      || JSON.stringify(normalization.receipt) !== JSON.stringify(receipts.at(-1)))) {
    throw new TypeError('Runtime result normalization receipt must match the last bounded receipt.');
  }
  if (normalization.candidate) normalizationCandidate(
    normalization.candidate, 'Runtime result normalization.candidate',
  );
  if (normalization.validation !== undefined) {
    const validation = record(normalization.validation, 'Runtime result normalization.validation');
    boolean(validation.accepted, 'Runtime result normalization.validation.accepted');
    boundedJson(validation, 'Runtime result normalization.validation', 262_144);
  }
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
    if (['UNPARSED', 'AMBIGUOUS', 'UNVERIFIED_NORMALIZATION'].includes(normalization.reparseStatus)) {
      throw new TypeError('Accepted normalization requires a supported symbolic reparse status.');
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
    || normalization.proposalCount > normalization.externalInvocations + (normalization.cacheHit ? 1 : 0)) {
    throw new TypeError('Runtime result normalization invocation accounting is inconsistent.');
  }
  if (normalization.status === 'failed' || normalization.status === 'proposal-limit-exhausted') {
    string(normalization.diagnostic, 'Runtime result normalization.diagnostic', 2_048);
  }
  if (normalization.status === 'proposal-limit-exhausted'
    && (normalization.proposalCount !== normalization.proposalLimit || normalization.candidate)) {
    throw new TypeError('Proposal-limit exhaustion requires all bounded slots and no accepted candidate.');
  }
  boundedJson(normalization, 'Runtime result normalization', 1_048_576);
}

function provenanceItem(value, path) {
  const item = record(value, path);
  if (!Object.values(item).some((field) => field !== undefined)) {
    throw new TypeError(`${path} must expose at least one provenance field.`);
  }
  for (const field of ['fact', 'rule', 'method']) {
    if (item[field] !== undefined) string(item[field], `${path}.${field}`);
  }
  if (item.source !== undefined) stringArray(item.source, `${path}.source`, 64, 2_048);
  if (item.provenanceIds !== undefined) {
    stringArray(item.provenanceIds, `${path}.provenanceIds`, 64, 2_048);
  }
  if (item.kbId !== undefined || item.kbVersion !== undefined) {
    kbIdentity({ kbId: item.kbId, version: item.kbVersion }, path, true);
  }
  if (item.kbSources !== undefined) {
    kbIdentityArray(item.kbSources, `${path}.kbSources`, 64, true);
  }
  boundedJson(item, path, 262_144);
  return item;
}

export function assertRuntimePayloadContracts(result) {
  for (const field of ['values', 'provenance']) {
    if (result[field] === undefined) continue;
    array(result[field], `Runtime result ${field}`, MAX_RESULT_ARRAY_ITEMS);
    if (field === 'provenance') result[field].forEach((item, index) =>
      provenanceItem(item, `Runtime result provenance[${index}]`));
    boundedJson(result[field], `Runtime result ${field}`, MAX_RESULT_ARRAY_BYTES);
  }
  for (const field of ['usedKbVersions', 'selectedKbVersions', 'consultedKbVersions']) {
    kbIdentityArray(result[field], `Runtime result ${field}`, 256, true);
  }
  objectArray(result.unresolvedSubgoals, 'Runtime result unresolvedSubgoals', 256, 262_144);
  result.unresolvedSubgoals.forEach((subgoal, index) => {
    if (!Object.values(subgoal).some((field) => field !== undefined)) {
      throw new TypeError(
        `Runtime result unresolvedSubgoals[${index}] must expose a structured gap field.`,
      );
    }
  });
  boundedJson(result.unresolvedSubgoals, 'Runtime result unresolvedSubgoals', MAX_RESULT_ARRAY_BYTES);

  if (result.approximation !== undefined) approximationExtension(result.approximation, result);
  if (result.languageAssessment !== undefined) {
    assertEnglishLikelihoodReceipt(result.languageAssessment);
  }
  if (result.requestPlanning !== undefined) assertRequestPlanningExtension(result.requestPlanning);
  if (result.synthesis !== undefined) assertSynthesisExtension(result.synthesis, result);
  if (result.normalization !== undefined) normalizationExtension(result.normalization, result);
  if (result.grounding !== undefined) assertGroundingExtension(result.grounding, result);
  return result;
}
