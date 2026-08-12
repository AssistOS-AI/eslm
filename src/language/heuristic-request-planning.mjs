import {
  HEURISTIC_REQUEST_PATTERN_CATALOG, matchHeuristicRequestPatterns,
} from './heuristic-request-patterns.mjs';
import { classifyHeuristicRequestForce } from './heuristic-request-force.mjs';
import {
  extractRequestSourceMaterial, normalizedRequestText, requestInstructionText,
  segmentRequestInstructions, selectRequestTopics,
} from './heuristic-request-structure.mjs';

export const HEURISTIC_REQUEST_PLAN_PROTOCOL = 'eslm-heuristic-request-plan-v1';

const DEFAULT_LIMITS = Object.freeze({
  maximumInputBytes: 16_384,
  maximumTokens: 2_048,
  maximumInstructionSegments: 12,
  maximumIntentCandidates: 8,
  maximumOperations: 8,
  maximumTopics: 12,
  maximumTopicCharacters: 160,
  maximumMaterialCharacters: 8_192,
  minimumPlanConfidence: 0.58,
});

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freezeDeep(item);
    Object.freeze(value);
  }
  return value;
}

function tokenCount(value) {
  return normalizedRequestText(value).match(/[\p{L}\p{N}_'-]+/gu)?.length ?? 0;
}

function confidenceBand(value) {
  if (value >= 0.86) return 'high';
  if (value >= 0.68) return 'medium';
  return 'low';
}

function combinedConfidence(votes) {
  const independent = new Map();
  for (const vote of votes) {
    independent.set(vote.family, Math.max(independent.get(vote.family) ?? 0, vote.weight));
  }
  let miss = 1;
  for (const weight of independent.values()) miss *= 1 - Math.min(0.99, weight);
  return Number((1 - miss).toFixed(6));
}

function canonicalLimits(options) {
  const supplied = options.limits ?? {};
  const limits = { ...DEFAULT_LIMITS, ...supplied };
  for (const name of Object.keys(supplied)) {
    if (!Object.hasOwn(DEFAULT_LIMITS, name)) throw new Error(`Unknown heuristic request limit: ${name}.`);
  }
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value < 0
      || (name !== 'minimumPlanConfidence' && !Number.isSafeInteger(value))) {
      throw new Error(`Invalid heuristic request limit ${name}.`);
    }
  }
  if (limits.minimumPlanConfidence > 1 || limits.maximumTopics < 1 || limits.maximumOperations < 1
    || limits.maximumOperations > 8
    || limits.maximumTopicCharacters < 1 || limits.maximumMaterialCharacters < 1
    || limits.maximumInstructionSegments < 1 || limits.maximumIntentCandidates < 1) {
    throw new Error('Heuristic request limits are outside the supported finite range.');
  }
  return Object.freeze(limits);
}

function votesByIntent(matches) {
  const grouped = new Map();
  const add = (intent, vote) => {
    const list = grouped.get(intent) ?? [];
    list.push(Object.freeze(vote));
    grouped.set(intent, list);
  };
  for (const item of matches.intents.filter((match) => match.polarity === 'requested')) {
    add(item.intent, item);
  }
  for (const item of matches.artifacts.filter((match) => match.polarity === 'requested')) {
    add(item.impliedIntent, Object.freeze({
    patternId: `${item.patternId}:implied-intent`, family: 'artifact-intent',
    weight: Number((item.weight * 0.82).toFixed(6)), artifact: item.artifact,
    span: item.span, surface: item.surface, polarity: item.polarity,
    ...(item.instructionSegmentId ? { instructionSegmentId: item.instructionSegmentId } : {}),
  }));
  }
  return grouped;
}

function rankedIntentCandidates(matches, maximum) {
  const candidates = [];
  for (const [intent, votes] of votesByIntent(matches)) {
    const confidence = combinedConfidence(votes);
    candidates.push(Object.freeze({
      intent,
      confidence,
      confidenceBand: confidenceBand(confidence),
      votes: Object.freeze(votes.toSorted((left, right) => right.weight - left.weight
        || left.patternId.localeCompare(right.patternId))),
    }));
  }
  return Object.freeze(candidates.toSorted((left, right) => right.confidence - left.confidence
    || left.intent.localeCompare(right.intent)).slice(0, maximum));
}

function taggedMatches(matches, segmentId) {
  return Object.freeze(Object.fromEntries(Object.entries(matches).map(([kind, values]) => [
    kind,
    Object.freeze(values.map((value) => Object.freeze({ ...value, instructionSegmentId: segmentId }))),
  ])));
}

function orderedOperations(text, matches, candidates) {
  const anchors = [
    ...matches.intents.filter((match) => match.polarity === 'requested'
      && match.family === 'explicit-operation').map((match) => ({
      intent: match.intent, span: match.span, source: 'explicit-operation',
    })),
    ...matches.artifacts.filter((match) => match.polarity === 'requested').map((match) => ({
      intent: match.impliedIntent, span: match.span, source: 'artifact-intent',
    })),
  ].toSorted((left, right) => left.span[0] - right.span[0]
    || left.span[1] - right.span[1] || left.intent.localeCompare(right.intent));
  const artifactSemanticIntent = anchors.find((anchor) =>
    anchor.source === 'artifact-intent' && anchor.intent !== 'compose')?.intent;
  const filtered = artifactSemanticIntent
    ? anchors.filter((anchor) => !(anchor.source === 'explicit-operation' && anchor.intent === 'compose'))
    : anchors;
  const firstByIntent = [];
  const anchoredIntents = new Set();
  for (const anchor of filtered) {
    if (anchoredIntents.has(anchor.intent)) continue;
    anchoredIntents.add(anchor.intent);
    firstByIntent.push(anchor);
  }
  const explicitlyCoordinated = firstByIntent.length < 2 || firstByIntent.slice(1).every((anchor, index) => {
    const previous = firstByIntent[index];
    return /(?:\b(?:and|then|also|plus)\b|;|,)/iu.test(text.slice(previous.span[1], anchor.span[0]));
  });
  if (!explicitlyCoordinated && candidates[0]) return Object.freeze([candidates[0].intent]);
  const operations = [];
  const seen = new Set();
  for (const anchor of filtered) {
    if (seen.has(anchor.intent)) continue;
    seen.add(anchor.intent);
    operations.push(anchor.intent);
  }
  if (operations.length === 0 && candidates[0]) operations.push(candidates[0].intent);
  return Object.freeze(operations);
}

function analyzeInstructionSegments(segments, maximumCandidates) {
  return Object.freeze(segments.map((segment) => {
    const rawMatches = matchHeuristicRequestPatterns(segment.surface);
    const requestForce = classifyHeuristicRequestForce(segment.surface, rawMatches);
    const matches = requestForce.accepted ? taggedMatches(rawMatches, segment.segmentId)
      : Object.freeze({ intents: Object.freeze([]), artifacts: Object.freeze([]),
        lengths: Object.freeze([]), formats: Object.freeze([]) });
    const candidates = rankedIntentCandidates(matches, maximumCandidates);
    return Object.freeze({
      ...segment,
      requestForce,
      matches,
      ignoredMatches: requestForce.accepted ? null : taggedMatches(rawMatches, segment.segmentId),
      candidates,
      operations: orderedOperations(segment.surface, matches, candidates),
    });
  }));
}

function aggregateMatches(analyses) {
  return Object.freeze(Object.fromEntries(['intents', 'artifacts', 'lengths', 'formats'].map((kind) => [
    kind,
    Object.freeze(analyses.flatMap((analysis) => analysis.matches[kind])),
  ])));
}

function strongestValue(matches, fallback) {
  matches = matches.filter((match) => match.polarity === 'requested');
  if (matches.length === 0) return Object.freeze({ value: fallback, confidence: 0.62, votes: [] });
  const grouped = new Map();
  for (const match of matches) {
    const current = grouped.get(match.value) ?? [];
    current.push(match);
    grouped.set(match.value, current);
  }
  return [...grouped].map(([value, votes]) => ({ value, confidence: combinedConfidence(votes), votes }))
    .toSorted((left, right) => right.confidence - left.confidence || left.value.localeCompare(right.value))[0];
}

function artifactSelection(matches, primaryIntent) {
  const requestedArtifacts = matches.artifacts.filter((match) => match.polarity === 'requested');
  if (requestedArtifacts.length === 0) {
    const fallback = ({ summarize: 'summary', outline: 'outline', explain: 'explanation' })[primaryIntent]
      ?? 'response';
    return Object.freeze({ value: fallback, confidence: 0.62, votes: Object.freeze([]) });
  }
  const grouped = new Map();
  for (const match of requestedArtifacts) {
    const current = grouped.get(match.artifact) ?? [];
    current.push(match);
    grouped.set(match.artifact, current);
  }
  return [...grouped].map(([value, votes]) => ({
    value, confidence: combinedConfidence(votes), votes: Object.freeze(votes),
  })).toSorted((left, right) => right.confidence - left.confidence
    || left.value.localeCompare(right.value))[0];
}

function outputSelection(matches, intent) {
  const artifact = artifactSelection(matches, intent);
  const length = strongestValue(matches.lengths, 'standard');
  const formatFallback = ['essay', 'report', 'document', 'article'].includes(artifact.value)
    ? 'sections' : artifact.value === 'outline' || artifact.value === 'list' ? 'outline' : 'paragraphs';
  const format = strongestValue(matches.formats, formatFallback);
  return Object.freeze({
    outputContract: Object.freeze({
      artifact: artifact.value,
      format: format.value,
      length: length.value,
      citationMode: 'inline-record-citations',
      unsupportedContentPolicy: 'explicit-gap',
    }),
    confidence: Math.max(artifact.confidence, format.confidence),
    votes: Object.freeze({ artifact: artifact.votes, length: length.votes, format: format.votes }),
  });
}

function truncationReceipt(segmented, topicSelection, operationSelection, material) {
  const reasons = Object.freeze([
    ...(!segmented.complete ? ['instruction-segment-budget'] : []),
    ...(material && !material.complete ? ['source-material-character-budget'] : []),
    ...(topicSelection.omittedByCount > 0 ? ['topic-count-budget'] : []),
    ...(topicSelection.characterTruncations > 0 ? ['topic-character-budget'] : []),
    ...(topicSelection.normalizationCollisions > 0 ? ['topic-normalization-collision'] : []),
    ...(operationSelection.omitted > 0 ? ['operation-count-budget'] : []),
  ]);
  return Object.freeze({
    complete: reasons.length === 0,
    reasons,
  });
}

function selectionOperation(intent) {
  return intent === 'summarize' ? 'select-summary-content'
    : intent === 'expand' ? 'select-expansion-content'
      : intent === 'explain' ? 'select-explanatory-content'
        : intent === 'compare' ? 'select-comparison-content'
          : intent === 'outline' ? 'select-outline-content'
            : 'select-relevant-content';
}

function operationPlansFrom(analyses, topics, maximum) {
  const observed = analyses.reduce((sum, analysis) => sum + analysis.operations.length, 0);
  const plans = [];
  for (const analysis of analyses) {
    for (const intent of analysis.operations) {
      if (plans.length >= maximum) continue;
      const output = outputSelection(analysis.matches, intent);
      const operationTopics = topics.filter((topic) =>
        topic.instructionSegmentIds.includes(analysis.segmentId));
      const candidate = analysis.candidates.find((item) => item.intent === intent);
      plans.push(Object.freeze({
        operationId: `operation:${plans.length + 1}`,
        order: plans.length + 1,
        intent,
        instructionSegmentId: analysis.segmentId,
        topicIds: Object.freeze(operationTopics.map((topic) => topic.topicId)),
        outputContract: output.outputContract,
        confidence: candidate?.confidence ?? 0.62,
        votes: Object.freeze({ intent: candidate?.votes ?? Object.freeze([]), ...output.votes }),
      }));
    }
  }
  return Object.freeze({
    items: Object.freeze(plans),
    observed,
    returned: plans.length,
    omitted: Math.max(0, observed - plans.length),
    complete: observed <= maximum,
  });
}

function aggregateOutputContract(operationPlans) {
  if (operationPlans.length === 1) return operationPlans[0].outputContract;
  const lengths = operationPlans.map((operation) => operation.outputContract.length);
  const length = lengths.includes('detailed') ? 'detailed'
    : lengths.every((value) => value === 'brief') ? 'brief' : 'standard';
  return Object.freeze({
    artifact: 'composite-response',
    format: 'sections',
    length,
    citationMode: 'inline-record-citations',
    unsupportedContentPolicy: 'explicit-gap',
  });
}

function createSubrequests(operationPlans, topics, material, output) {
  const subrequests = [];
  if (material) subrequests.push(Object.freeze({
    subrequestId: 'subrequest:source:1', operation: 'extract-source-content',
    input: 'provided-material', dependsOn: Object.freeze([]),
  }));
  for (const topic of topics) subrequests.push(Object.freeze({
    subrequestId: `subrequest:retrieve:${topic.topicId.split(':').at(-1)}`,
    operation: 'retrieve-related-evidence', topic: topic.surface,
    dependsOn: Object.freeze([]),
  }));
  const shapeIds = [];
  for (const operationPlan of operationPlans) {
    const suffix = operationPlan.operationId.split(':').at(-1);
    const topicDependencies = operationPlan.topicIds.map((topicId) =>
      `subrequest:retrieve:${topicId.split(':').at(-1)}`);
    const dependencies = [
      ...(material ? ['subrequest:source:1'] : []),
      ...topicDependencies,
      ...(shapeIds.length > 0 ? [shapeIds.at(-1)] : []),
    ];
    if (operationPlan.topicIds.length > 1 || operationPlan.intent === 'compare') {
      const correlateId = `subrequest:correlate:${suffix}`;
      subrequests.push(Object.freeze({
        subrequestId: correlateId,
        operation: 'correlate-topic-evidence',
        operationId: operationPlan.operationId,
        topicIds: operationPlan.topicIds,
        dependsOn: Object.freeze(topicDependencies),
      }));
      dependencies.push(correlateId);
    }
    const selectId = `subrequest:select:${suffix}`;
    const shapeId = `subrequest:shape:${suffix}`;
    subrequests.push(Object.freeze({
      subrequestId: selectId,
      operation: selectionOperation(operationPlan.intent),
      operationId: operationPlan.operationId,
      topicIds: operationPlan.topicIds,
      dependsOn: Object.freeze([...new Set(dependencies)]),
    }));
    subrequests.push(Object.freeze({
      subrequestId: shapeId,
      operation: 'shape-output',
      operationId: operationPlan.operationId,
      outputContract: operationPlan.outputContract,
      dependsOn: Object.freeze([selectId]),
    }));
    shapeIds.push(shapeId);
  }
  if (shapeIds.length > 1) subrequests.push(Object.freeze({
    subrequestId: 'subrequest:aggregate:1',
    operation: 'aggregate-operation-outputs',
    operationIds: Object.freeze(operationPlans.map((operation) => operation.operationId)),
    outputContract: output,
    dependsOn: Object.freeze(shapeIds),
  }));
  return Object.freeze(subrequests);
}

export function planHeuristicRequest(text, options = {}) {
  if (typeof text !== 'string') throw new TypeError('Heuristic request input must be a string.');
  const limits = canonicalLimits(options);
  const inputBytes = Buffer.byteLength(text, 'utf8');
  const tokens = tokenCount(text);
  const baseReceipt = {
    protocol: HEURISTIC_REQUEST_PLAN_PROTOCOL,
    patternCatalog: HEURISTIC_REQUEST_PATTERN_CATALOG.version,
    limits,
    observed: { inputBytes, tokens },
    kbConsulted: false,
    reasonerInvoked: false,
    sessionMutated: false,
  };
  if (inputBytes > limits.maximumInputBytes || tokens > limits.maximumTokens) return freezeDeep({
    protocol: HEURISTIC_REQUEST_PLAN_PROTOCOL,
    status: 'RESOURCE_LIMIT',
    candidates: [], selectedPlan: null,
    receipt: { ...baseReceipt, complete: false, exhausted: inputBytes > limits.maximumInputBytes
      ? 'maximumInputBytes' : 'maximumTokens' },
  });
  const material = extractRequestSourceMaterial(text, limits.maximumMaterialCharacters);
  const instructionSurface = normalizedRequestText(requestInstructionText(text, material));
  const segmented = segmentRequestInstructions(text, material, limits.maximumInstructionSegments);
  const segmentAnalyses = analyzeInstructionSegments(segmented.items, limits.maximumIntentCandidates);
  const activeAnalyses = segmentAnalyses.filter((analysis) => analysis.requestForce.accepted);
  const matches = aggregateMatches(activeAnalyses);
  const ignoredMatches = Object.freeze(segmentAnalyses.filter((analysis) => analysis.ignoredMatches)
    .map((analysis) => Object.freeze({
      instructionSegmentId: analysis.segmentId,
      requestForce: analysis.requestForce,
      matches: analysis.ignoredMatches,
    })));
  const exclusions = Object.freeze([
    ...matches.intents.filter((match) => match.polarity === 'excluded'),
    ...matches.artifacts.filter((match) => match.polarity === 'excluded'),
    ...matches.formats.filter((match) => match.polarity === 'excluded'),
    ...matches.lengths.filter((match) => match.polarity === 'excluded'),
  ]);
  const candidates = rankedIntentCandidates(matches, limits.maximumIntentCandidates);
  const topicSelection = selectRequestTopics(activeAnalyses.length > 0 ? instructionSurface : '', limits,
    activeAnalyses);
  const topics = topicSelection.items;
  const operationSelection = operationPlansFrom(activeAnalyses, topics, limits.maximumOperations);
  const operationPlans = operationSelection.items;
  const truncation = truncationReceipt(segmented, topicSelection, operationSelection, material);
  const requestForce = Object.freeze({
    observedSegments: segmentAnalyses.length,
    acceptedSegments: activeAnalyses.length,
    rejectedSegments: segmentAnalyses.length - activeAnalyses.length,
    complete: segmented.complete,
  });
  if (operationPlans.length === 0 || (!material && topics.length === 0)) return freezeDeep({
    protocol: HEURISTIC_REQUEST_PLAN_PROTOCOL,
    status: 'NO_SUPPORTED_INTENT', candidates, selectedPlan: null,
    receipt: {
      ...baseReceipt,
      complete: truncation.complete,
      matches,
      ignoredMatches,
      exclusions,
      segments: segmentAnalyses,
      requestForce,
      topics,
      topicSelection,
      operationSelection,
      truncationReasons: truncation.reasons,
      observedInstructionSegments: segmented.observed,
    },
  });
  const primaryOperation = operationPlans[0];
  const selectedIntent = candidates.find((candidate) => candidate.intent === primaryOperation.intent)
    ?? candidates[0];
  const ambiguousSegments = activeAnalyses.map((analysis) => {
    const [first, second] = analysis.candidates;
    if (!second || analysis.operations.length > 1 || first.confidence - second.confidence >= 0.04) return null;
    return Object.freeze({
      instructionSegmentId: analysis.segmentId,
      top: first.intent,
      alternative: second.intent,
      margin: Number((first.confidence - second.confidence).toFixed(6)),
    });
  }).filter(Boolean);
  const ambiguous = ambiguousSegments.length > 0;
  const outputContract = aggregateOutputContract(operationPlans);
  const topicConfidence = topics.length > 0 ? Math.min(...topics.map((topic) => topic.confidence)) : 0.86;
  const operationConfidence = Math.min(...operationPlans.map((operation) => operation.confidence));
  const planConfidence = Number((operationConfidence * 0.7 + topicConfidence * 0.3).toFixed(6));
  const operations = Object.freeze(operationPlans.map((operation) => operation.intent));
  const selectedPlan = Object.freeze({
    primaryIntent: primaryOperation.intent,
    operations,
    operationPlans,
    instructionSegments: Object.freeze(activeAnalyses.map((analysis) => Object.freeze({
      segmentId: analysis.segmentId,
      surface: analysis.surface,
      requestForce: analysis.requestForce,
      operations: analysis.operations,
    }))),
    sourceMaterial: material,
    topics,
    outputContract,
    confidence: planConfidence,
    confidenceBand: confidenceBand(planConfidence),
    votes: Object.freeze({
      intent: selectedIntent.votes,
      artifact: primaryOperation.votes.artifact,
      length: primaryOperation.votes.length,
      format: primaryOperation.votes.format,
    }),
    subrequests: createSubrequests(operationPlans, topics, material, outputContract),
  });
  const status = ambiguous ? 'AMBIGUOUS'
    : planConfidence >= limits.minimumPlanConfidence ? 'PLANNED' : 'LOW_CONFIDENCE';
  return freezeDeep({
    protocol: HEURISTIC_REQUEST_PLAN_PROTOCOL,
    status,
    candidates,
    selectedPlan,
    receipt: {
      ...baseReceipt,
      complete: truncation.complete,
      matches,
      ignoredMatches,
      exclusions,
      segments: segmentAnalyses,
      requestForce,
      topicSelection,
      operationSelection,
      truncationReasons: truncation.reasons,
      observedInstructionSegments: segmented.observed,
      ambiguity: ambiguous ? Object.freeze(ambiguousSegments) : null,
    },
  });
}

export { HEURISTIC_REQUEST_PATTERN_CATALOG } from './heuristic-request-patterns.mjs';
