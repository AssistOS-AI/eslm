import {
  HEURISTIC_REQUEST_PATTERN_CATALOG, HEURISTIC_REQUEST_PLAN_PROTOCOL,
} from '../language/heuristic-request-planning.mjs';
import {
  array, boolean, boundedJson, confidence, finite, integer, objectArray, record, string,
  stringArray,
} from './result-payload-shapes.mjs';

const MAX_REQUEST_INPUT_BYTES = 65_536;
const MAX_REQUEST_TOKENS = 8_192;
const MAX_REQUEST_SEGMENTS = 128;
const MAX_REQUEST_CANDIDATES = 64;
const MAX_REQUEST_OPERATIONS = 8;
const MAX_REQUEST_TOPICS = 64;
const MAX_REQUEST_TOPIC_CHARACTERS = 4_096;
const MAX_REQUEST_MATERIAL_CHARACTERS = 65_536;
const REQUEST_STATUSES = new Set([
  'PLANNED', 'AMBIGUOUS', 'LOW_CONFIDENCE', 'NO_SUPPORTED_INTENT', 'RESOURCE_LIMIT',
]);
const TRUNCATION_REASONS = new Set([
  'instruction-segment-budget', 'source-material-character-budget', 'topic-count-budget',
  'topic-character-budget', 'topic-normalization-collision', 'operation-count-budget',
]);

function sameJson(left, right, path) {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new TypeError(`${path} contradicts the selected request plan.`);
  }
}

function confidenceBand(value) {
  return value >= 0.86 ? 'high' : value >= 0.68 ? 'medium' : 'low';
}

function requestForce(value, path) {
  const force = record(value, path);
  boolean(force.accepted, `${path}.accepted`);
  string(force.kind, `${path}.kind`, 64);
  if (force.accepted) integer(force.anchor, `${path}.anchor`, MAX_REQUEST_INPUT_BYTES);
  else if (force.anchor !== null) throw new TypeError(`${path}.anchor must be null when request force is absent.`);
  return force;
}

function matchGroups(value, path) {
  const groups = record(value, path);
  for (const field of ['intents', 'artifacts', 'lengths', 'formats']) {
    objectArray(groups[field], `${path}.${field}`, 128, 4_096);
  }
  boundedJson(groups, path, 262_144);
  return groups;
}

function candidate(value, path) {
  const item = record(value, path);
  string(item.intent, `${path}.intent`, 64);
  confidence(item.confidence, `${path}.confidence`);
  if (item.confidenceBand !== confidenceBand(item.confidence)) {
    throw new TypeError(`${path}.confidenceBand contradicts confidence.`);
  }
  objectArray(item.votes, `${path}.votes`, 64, 4_096);
  return item;
}

function outputContract(value, path) {
  const output = record(value, path);
  for (const field of ['artifact', 'format', 'length']) string(output[field], `${path}.${field}`, 64);
  if (output.citationMode !== 'inline-record-citations'
    || output.unsupportedContentPolicy !== 'explicit-gap') {
    throw new TypeError(`${path} must preserve cited output and explicit-gap policy.`);
  }
  return output;
}

function topic(value, path) {
  const item = record(value, path);
  string(item.topicId, `${path}.topicId`, 64);
  string(item.surface, `${path}.surface`, MAX_REQUEST_TOPIC_CHARACTERS);
  string(item.normalized, `${path}.normalized`, MAX_REQUEST_TOPIC_CHARACTERS);
  confidence(item.confidence, `${path}.confidence`);
  string(item.evidence, `${path}.evidence`, 64);
  stringArray(item.instructionSegmentIds, `${path}.instructionSegmentIds`, MAX_REQUEST_SEGMENTS, 64);
  integer(item.originalCharacters, `${path}.originalCharacters`, MAX_REQUEST_INPUT_BYTES, 1);
  integer(item.retainedCharacters, `${path}.retainedCharacters`, MAX_REQUEST_TOPIC_CHARACTERS, 1);
  boolean(item.complete, `${path}.complete`);
  if (item.retainedCharacters !== item.surface.length
    || item.originalCharacters < item.retainedCharacters
    || item.complete !== (item.originalCharacters === item.retainedCharacters)) {
    throw new TypeError(`${path} has inconsistent topic character accounting.`);
  }
  return item;
}

function operationPlan(value, path, index, topicIds, segmentIds) {
  const operation = record(value, path);
  string(operation.operationId, `${path}.operationId`, 64);
  integer(operation.order, `${path}.order`, MAX_REQUEST_OPERATIONS, 1);
  string(operation.intent, `${path}.intent`, 64);
  string(operation.instructionSegmentId, `${path}.instructionSegmentId`, 64);
  stringArray(operation.topicIds, `${path}.topicIds`, MAX_REQUEST_TOPICS, 64);
  outputContract(operation.outputContract, `${path}.outputContract`);
  confidence(operation.confidence, `${path}.confidence`);
  record(operation.votes, `${path}.votes`);
  boundedJson(operation.votes, `${path}.votes`, 65_536);
  if (operation.order !== index + 1 || operation.operationId !== `operation:${index + 1}`) {
    throw new TypeError(`${path} must retain contiguous operation identity and order.`);
  }
  if (!segmentIds.has(operation.instructionSegmentId)
    || operation.topicIds.some((topicId) => !topicIds.has(topicId))) {
    throw new TypeError(`${path} references an undeclared request segment or topic.`);
  }
  return operation;
}

function sourceMaterial(value, path) {
  if (value === null) return null;
  const material = record(value, path);
  string(material.text, `${path}.text`, MAX_REQUEST_MATERIAL_CHARACTERS);
  string(material.extraction, `${path}.extraction`, 64);
  for (const field of ['sourceSpan', 'containerSpan']) {
    const span = array(material[field], `${path}.${field}`, 2);
    if (span.length !== 2) throw new TypeError(`${path}.${field} must contain exactly two offsets.`);
    span.forEach((offset, index) => integer(
      offset, `${path}.${field}[${index}]`, MAX_REQUEST_INPUT_BYTES,
    ));
    if (span[1] < span[0]) throw new TypeError(`${path}.${field} offsets are reversed.`);
  }
  integer(material.originalCharacters, `${path}.originalCharacters`, MAX_REQUEST_INPUT_BYTES, 1);
  integer(material.retainedCharacters, `${path}.retainedCharacters`, MAX_REQUEST_MATERIAL_CHARACTERS, 1);
  boolean(material.complete, `${path}.complete`);
  if (material.retainedCharacters !== material.text.length
    || material.originalCharacters < material.retainedCharacters
    || material.complete !== (material.originalCharacters === material.retainedCharacters)) {
    throw new TypeError(`${path} has inconsistent source-material character accounting.`);
  }
  return material;
}

function selectedPlan(value) {
  const plan = record(value, 'Runtime result requestPlanning.selectedPlan');
  const path = 'Runtime result requestPlanning.selectedPlan';
  string(plan.primaryIntent, `${path}.primaryIntent`, 64);
  stringArray(plan.operations, `${path}.operations`, MAX_REQUEST_OPERATIONS, 64);
  if (plan.operations.length === 0) throw new TypeError(`${path}.operations must not be empty.`);
  const segments = array(plan.instructionSegments, `${path}.instructionSegments`, MAX_REQUEST_SEGMENTS);
  const segmentIds = new Set();
  segments.forEach((value, index) => {
    const segmentPath = `${path}.instructionSegments[${index}]`;
    const segment = record(value, segmentPath);
    string(segment.segmentId, `${segmentPath}.segmentId`, 64);
    string(segment.surface, `${segmentPath}.surface`, MAX_REQUEST_INPUT_BYTES);
    if (segmentIds.has(segment.segmentId)) throw new TypeError(`${path} contains a duplicate segment ID.`);
    segmentIds.add(segment.segmentId);
    if (!requestForce(segment.requestForce, `${segmentPath}.requestForce`).accepted) {
      throw new TypeError(`${segmentPath} must retain accepted request force.`);
    }
    stringArray(segment.operations, `${segmentPath}.operations`, MAX_REQUEST_OPERATIONS, 64);
  });
  const topics = array(plan.topics, `${path}.topics`, MAX_REQUEST_TOPICS);
  const topicIds = new Set();
  topics.forEach((value, index) => {
    const item = topic(value, `${path}.topics[${index}]`);
    if (topicIds.has(item.topicId)) throw new TypeError(`${path} contains a duplicate topic ID.`);
    topicIds.add(item.topicId);
    if (item.instructionSegmentIds.some((segmentId) => !segmentIds.has(segmentId))) {
      throw new TypeError(`${path}.topics[${index}] references an undeclared request segment.`);
    }
  });
  const operationPlans = array(plan.operationPlans, `${path}.operationPlans`, MAX_REQUEST_OPERATIONS);
  if (operationPlans.length === 0) throw new TypeError(`${path}.operationPlans must not be empty.`);
  operationPlans.forEach((operation, index) => operationPlan(
    operation, `${path}.operationPlans[${index}]`, index, topicIds, segmentIds,
  ));
  if (plan.operations.length !== operationPlans.length
    || plan.operations.some((operation, index) => operation !== operationPlans[index].intent)
    || plan.primaryIntent !== operationPlans[0].intent) {
    throw new TypeError(`${path} has inconsistent primary and ordered operations.`);
  }
  const segmentsById = new Map(segments.map((segment) => [segment.segmentId, segment]));
  for (const [index, operation] of operationPlans.entries()) {
    const operationPath = `${path}.operationPlans[${index}]`;
    const segment = segmentsById.get(operation.instructionSegmentId);
    if (!segment.operations.includes(operation.intent)) {
      throw new TypeError(`${operationPath}.intent is absent from its instruction segment.`);
    }
    const expectedTopicIds = topics.filter((item) =>
      item.instructionSegmentIds.includes(operation.instructionSegmentId)).map((item) => item.topicId);
    if (JSON.stringify(operation.topicIds) !== JSON.stringify(expectedTopicIds)) {
      throw new TypeError(`${operationPath}.topicIds contradict its instruction segment.`);
    }
  }
  sourceMaterial(plan.sourceMaterial, `${path}.sourceMaterial`);
  outputContract(plan.outputContract, `${path}.outputContract`);
  if (operationPlans.length === 1) {
    sameJson(plan.outputContract, operationPlans[0].outputContract, `${path}.outputContract`);
  } else {
    const lengths = operationPlans.map((operation) => operation.outputContract.length);
    const expectedLength = lengths.includes('detailed') ? 'detailed'
      : lengths.every((length) => length === 'brief') ? 'brief' : 'standard';
    if (plan.outputContract.artifact !== 'composite-response'
      || plan.outputContract.format !== 'sections' || plan.outputContract.length !== expectedLength) {
      throw new TypeError(`${path}.outputContract contradicts its ordered operation outputs.`);
    }
  }
  confidence(plan.confidence, `${path}.confidence`);
  if (plan.confidenceBand !== confidenceBand(plan.confidence)) {
    throw new TypeError(`${path}.confidenceBand contradicts confidence.`);
  }
  record(plan.votes, `${path}.votes`);
  boundedJson(plan.votes, `${path}.votes`, 65_536);
  objectArray(plan.subrequests, `${path}.subrequests`, 192, 65_536);
  return { plan, operationPlans, topics, segments };
}

function limitsReceipt(value) {
  const path = 'Runtime result requestPlanning.receipt.limits';
  const limits = record(value, path);
  integer(limits.maximumInputBytes, `${path}.maximumInputBytes`, MAX_REQUEST_INPUT_BYTES, 1);
  integer(limits.maximumTokens, `${path}.maximumTokens`, MAX_REQUEST_TOKENS, 1);
  integer(limits.maximumInstructionSegments,
    `${path}.maximumInstructionSegments`, MAX_REQUEST_SEGMENTS, 1);
  integer(limits.maximumIntentCandidates,
    `${path}.maximumIntentCandidates`, MAX_REQUEST_CANDIDATES, 1);
  integer(limits.maximumOperations, `${path}.maximumOperations`, MAX_REQUEST_OPERATIONS, 1);
  integer(limits.maximumTopics, `${path}.maximumTopics`, MAX_REQUEST_TOPICS, 1);
  integer(limits.maximumTopicCharacters,
    `${path}.maximumTopicCharacters`, MAX_REQUEST_TOPIC_CHARACTERS, 1);
  integer(limits.maximumMaterialCharacters,
    `${path}.maximumMaterialCharacters`, MAX_REQUEST_MATERIAL_CHARACTERS, 1);
  confidence(limits.minimumPlanConfidence, `${path}.minimumPlanConfidence`);
  return limits;
}

function topicSelectionReceipt(value, limits) {
  const path = 'Runtime result requestPlanning.receipt.topicSelection';
  const selection = record(value, path);
  const items = array(selection.items, `${path}.items`, MAX_REQUEST_TOPICS);
  items.forEach((item, index) => topic(item, `${path}.items[${index}]`));
  for (const field of [
    'observedCandidates', 'uniqueCandidates', 'returnedTopics', 'characterTruncations',
    'omittedByCount', 'normalizationCollisions',
  ]) integer(selection[field], `${path}.${field}`, 1_000_000);
  boolean(selection.complete, `${path}.complete`);
  if (items.length !== selection.returnedTopics || items.length > limits.maximumTopics
    || selection.observedCandidates < selection.uniqueCandidates
    || selection.uniqueCandidates !== items.length + selection.omittedByCount
      + selection.normalizationCollisions
    || selection.characterTruncations > selection.uniqueCandidates
    || selection.complete !== (selection.characterTruncations === 0
      && selection.omittedByCount === 0 && selection.normalizationCollisions === 0)) {
    throw new TypeError(`${path} has inconsistent topic-selection counters.`);
  }
  return selection;
}

function operationSelectionReceipt(value, limits, topicIds, segmentIds) {
  const path = 'Runtime result requestPlanning.receipt.operationSelection';
  const selection = record(value, path);
  const items = array(selection.items, `${path}.items`, MAX_REQUEST_OPERATIONS);
  items.forEach((operation, index) => operationPlan(
    operation, `${path}.items[${index}]`, index, topicIds, segmentIds,
  ));
  for (const field of ['observed', 'returned', 'omitted']) {
    integer(selection[field], `${path}.${field}`, 1_024);
  }
  boolean(selection.complete, `${path}.complete`);
  if (items.length !== selection.returned || items.length > limits.maximumOperations
    || selection.returned > selection.observed
    || selection.omitted !== selection.observed - selection.returned
    || selection.complete !== (selection.omitted === 0)) {
    throw new TypeError(`${path} has inconsistent operation-selection counters.`);
  }
  return selection;
}

function nonResourceReceipt(receipt, planning, planMetadata, limits) {
  const path = 'Runtime result requestPlanning.receipt';
  matchGroups(receipt.matches, `${path}.matches`);
  objectArray(receipt.ignoredMatches, `${path}.ignoredMatches`, MAX_REQUEST_SEGMENTS, 262_144);
  objectArray(receipt.exclusions, `${path}.exclusions`, 256, 4_096);
  const segments = array(receipt.segments, `${path}.segments`, MAX_REQUEST_SEGMENTS);
  const segmentIds = new Set();
  let acceptedSegments = 0;
  segments.forEach((value, index) => {
    const segmentPath = `${path}.segments[${index}]`;
    const segment = record(value, segmentPath);
    string(segment.segmentId, `${segmentPath}.segmentId`, 64);
    string(segment.surface, `${segmentPath}.surface`, MAX_REQUEST_INPUT_BYTES);
    if (segmentIds.has(segment.segmentId)) throw new TypeError(`${path} contains a duplicate segment ID.`);
    segmentIds.add(segment.segmentId);
    if (requestForce(segment.requestForce, `${segmentPath}.requestForce`).accepted) acceptedSegments += 1;
    matchGroups(segment.matches, `${segmentPath}.matches`);
    if (segment.ignoredMatches !== null) matchGroups(
      segment.ignoredMatches, `${segmentPath}.ignoredMatches`,
    );
    array(segment.candidates, `${segmentPath}.candidates`, MAX_REQUEST_CANDIDATES)
      .forEach((item, candidateIndex) => candidate(
        item, `${segmentPath}.candidates[${candidateIndex}]`,
      ));
    stringArray(segment.operations, `${segmentPath}.operations`, MAX_REQUEST_OPERATIONS, 64);
  });
  const force = record(receipt.requestForce, `${path}.requestForce`);
  for (const field of ['observedSegments', 'acceptedSegments', 'rejectedSegments']) {
    integer(force[field], `${path}.requestForce.${field}`, 1_000_000);
  }
  boolean(force.complete, `${path}.requestForce.complete`);
  integer(receipt.observedInstructionSegments,
    `${path}.observedInstructionSegments`, 1_000_000);
  if (segments.length !== force.observedSegments || segments.length > limits.maximumInstructionSegments
    || acceptedSegments !== force.acceptedSegments
    || force.rejectedSegments !== force.observedSegments - force.acceptedSegments
    || receipt.observedInstructionSegments < force.observedSegments
    || force.complete !== (receipt.observedInstructionSegments === force.observedSegments)) {
    throw new TypeError(`${path}.requestForce has inconsistent segment counters.`);
  }
  const topics = topicSelectionReceipt(receipt.topicSelection, limits);
  const topicIds = new Set(topics.items.map((item) => item.topicId));
  const operations = operationSelectionReceipt(
    receipt.operationSelection, limits, topicIds, segmentIds,
  );
  stringArray(receipt.truncationReasons, `${path}.truncationReasons`, 6, 64);
  if (new Set(receipt.truncationReasons).size !== receipt.truncationReasons.length
    || receipt.truncationReasons.some((reason) => !TRUNCATION_REASONS.has(reason))) {
    throw new TypeError(`${path}.truncationReasons contains an unsupported or duplicate reason.`);
  }
  const reasonSet = new Set(receipt.truncationReasons);
  const expected = new Map([
    ['instruction-segment-budget', !force.complete],
    ['topic-count-budget', topics.omittedByCount > 0],
    ['topic-character-budget', topics.characterTruncations > 0],
    ['topic-normalization-collision', topics.normalizationCollisions > 0],
    ['operation-count-budget', operations.omitted > 0],
  ]);
  for (const [reason, present] of expected) {
    if (reasonSet.has(reason) !== present) {
      throw new TypeError(`${path}.truncationReasons contradicts its selection counters.`);
    }
  }
  if (planMetadata) {
    if (planMetadata.segments.length > limits.maximumInstructionSegments
      || planMetadata.topics.length > limits.maximumTopics
      || planMetadata.operationPlans.length > limits.maximumOperations
      || planMetadata.topics.some((item) =>
        item.retainedCharacters > limits.maximumTopicCharacters)
      || (planMetadata.plan.sourceMaterial?.retainedCharacters ?? 0)
        > limits.maximumMaterialCharacters) {
      throw new TypeError(`${path} selected plan exceeds its declared planning limits.`);
    }
    sameJson(topics.items, planMetadata.topics, `${path}.topicSelection.items`);
    sameJson(operations.items, planMetadata.operationPlans, `${path}.operationSelection.items`);
    const incompleteMaterial = planMetadata.plan.sourceMaterial?.complete === false;
    if (reasonSet.has('source-material-character-budget') !== incompleteMaterial) {
      throw new TypeError(`${path}.truncationReasons contradicts source-material accounting.`);
    }
  } else {
    if (planning.status !== 'NO_SUPPORTED_INTENT') {
      throw new TypeError(`${path} is missing selected-plan accounting.`);
    }
    array(receipt.topics, `${path}.topics`, MAX_REQUEST_TOPICS);
    sameJson(receipt.topics, topics.items, `${path}.topics`);
  }
  boolean(receipt.complete, `${path}.complete`);
  if (receipt.complete !== (receipt.truncationReasons.length === 0)) {
    throw new TypeError(`${path}.complete contradicts truncation reasons.`);
  }
  if (planning.status === 'AMBIGUOUS') {
    const ambiguity = array(receipt.ambiguity, `${path}.ambiguity`, MAX_REQUEST_SEGMENTS);
    if (ambiguity.length === 0) throw new TypeError(`${path}.ambiguity must explain an AMBIGUOUS plan.`);
    ambiguity.forEach((value, index) => {
      const itemPath = `${path}.ambiguity[${index}]`;
      const item = record(value, itemPath);
      string(item.instructionSegmentId, `${itemPath}.instructionSegmentId`, 64);
      string(item.top, `${itemPath}.top`, 64);
      string(item.alternative, `${itemPath}.alternative`, 64);
      finite(item.margin, `${itemPath}.margin`, 0, 0.04);
    });
  } else if (receipt.ambiguity !== undefined && receipt.ambiguity !== null) {
    throw new TypeError(`${path}.ambiguity is valid only for AMBIGUOUS planning.`);
  }
}

export function assertRequestPlanningExtension(value) {
  const planning = record(value, 'Runtime result requestPlanning');
  if (planning.protocol !== HEURISTIC_REQUEST_PLAN_PROTOCOL
    || planning.receipt?.protocol !== HEURISTIC_REQUEST_PLAN_PROTOCOL) {
    throw new TypeError(
      `Runtime result requestPlanning protocol must be ${HEURISTIC_REQUEST_PLAN_PROTOCOL}.`,
    );
  }
  if (planning.receipt.patternCatalog !== HEURISTIC_REQUEST_PATTERN_CATALOG.version) {
    throw new TypeError(
      `Runtime result requestPlanning pattern catalog must be ${HEURISTIC_REQUEST_PATTERN_CATALOG.version}.`,
    );
  }
  if (!REQUEST_STATUSES.has(planning.status)) {
    throw new TypeError(`Runtime result requestPlanning has unsupported status ${String(planning.status)}.`);
  }
  const limits = limitsReceipt(planning.receipt.limits);
  const observed = record(planning.receipt.observed, 'Runtime result requestPlanning.receipt.observed');
  integer(observed.inputBytes, 'Runtime result requestPlanning.receipt.observed.inputBytes',
    1_048_576);
  integer(observed.tokens, 'Runtime result requestPlanning.receipt.observed.tokens', 1_000_000);
  if (planning.receipt.kbConsulted !== false || planning.receipt.reasonerInvoked !== false
    || planning.receipt.sessionMutated !== false) {
    throw new TypeError('Runtime result requestPlanning receipt must deny KB, reasoner, and session authority.');
  }
  const candidates = array(
    planning.candidates, 'Runtime result requestPlanning.candidates', MAX_REQUEST_CANDIDATES,
  );
  candidates.forEach((item, index) => candidate(
    item, `Runtime result requestPlanning.candidates[${index}]`,
  ));
  if (candidates.length > limits.maximumIntentCandidates) {
    throw new TypeError('Runtime result requestPlanning candidates exceed the declared planning limit.');
  }
  const requiresPlan = ['PLANNED', 'AMBIGUOUS', 'LOW_CONFIDENCE'].includes(planning.status);
  if (requiresPlan !== Boolean(planning.selectedPlan)) {
    throw new TypeError(`Runtime result requestPlanning status ${planning.status} has inconsistent selectedPlan.`);
  }
  const planMetadata = planning.selectedPlan ? selectedPlan(planning.selectedPlan) : null;
  if (planning.status === 'RESOURCE_LIMIT') {
    if (planning.receipt.complete !== false
      || !['maximumInputBytes', 'maximumTokens'].includes(planning.receipt.exhausted)
      || candidates.length !== 0) {
      throw new TypeError('RESOURCE_LIMIT requestPlanning requires an empty, incomplete bounded receipt.');
    }
    const exhausted = planning.receipt.exhausted;
    if (observed[exhausted === 'maximumInputBytes' ? 'inputBytes' : 'tokens'] <= limits[exhausted]) {
      throw new TypeError('RESOURCE_LIMIT requestPlanning did not exceed its named resource.');
    }
  } else {
    if (observed.inputBytes > limits.maximumInputBytes || observed.tokens > limits.maximumTokens) {
      throw new TypeError('Runtime result requestPlanning exceeded a resource without RESOURCE_LIMIT status.');
    }
    nonResourceReceipt(planning.receipt, planning, planMetadata, limits);
    if (planMetadata && planMetadata.plan.confidence < limits.minimumPlanConfidence
      && planning.status === 'PLANNED') {
      throw new TypeError('PLANNED requestPlanning falls below its declared confidence threshold.');
    }
    if (planMetadata && planMetadata.plan.confidence >= limits.minimumPlanConfidence
      && planning.status === 'LOW_CONFIDENCE') {
      throw new TypeError('LOW_CONFIDENCE requestPlanning meets its declared confidence threshold.');
    }
  }
  boundedJson(planning, 'Runtime result requestPlanning', 1_048_576);
  return planning;
}
