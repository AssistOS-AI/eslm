import { sha256, stableStringify } from '../util.mjs';

export const RESEARCH_EPISODE_PROTOCOL = 'eslm-research-episode-v1';

export const RESEARCH_EPISODE_VOCABULARY = Object.freeze({
  operationKinds: Object.freeze([
    'acquire-evidence', 'compare', 'construct', 'invoke-tool', 'plan', 'reason', 'repair',
    'summarize', 'verify',
  ]),
  artifactKinds: Object.freeze([
    'action-result', 'comparison', 'derivation', 'document', 'evidence-set', 'none', 'plan',
    'repaired-artifact', 'summary', 'verification-report',
  ]),
  constraintKinds: Object.freeze([
    'completeness', 'consistency', 'format', 'length', 'ordering', 'resource', 'safety',
    'source-grounding',
  ]),
  capabilityKinds: Object.freeze([
    'construct', 'parse', 'reason', 'repair', 'retrieve', 'tool-access', 'verify',
  ]),
  obligationKinds: Object.freeze([
    'cited', 'complete', 'concise', 'ordered', 'safe', 'schema-valid', 'verified',
  ]),
  stateKinds: Object.freeze([
    'action-state', 'artifact-state', 'evidence-state', 'plan-state', 'request-state',
    'verification-state',
  ]),
  phases: Object.freeze([
    'acquire', 'construct', 'execute', 'interpret', 'plan', 'reason', 'repair', 'terminate',
    'verify',
  ]),
  observationKinds: Object.freeze([
    'candidate', 'error', 'evidence', 'feedback', 'request', 'state', 'tool-result',
  ]),
  actionKinds: Object.freeze([
    'abstain', 'build-plan', 'compare-items', 'construct-output', 'decompose-task',
    'detect-error', 'parse-request', 'propose-action', 'reason-step', 'repair-step',
    'retrieve-evidence', 'select-tool', 'summarize-evidence', 'terminate',
    'validate-output', 'validate-witness',
  ]),
  argumentRoles: Object.freeze([
    'candidate', 'constraint', 'criterion', 'evidence', 'format', 'object', 'source',
    'subject', 'target', 'tool',
  ]),
  valueKinds: Object.freeze([
    'boolean', 'collection', 'entity', 'identifier', 'number', 'relation', 'schema', 'text',
  ]),
  stateDeltaKinds: Object.freeze([
    'action-selected', 'artifact-constructed', 'derivation-added', 'error-recorded',
    'evidence-added', 'output-validated', 'plan-created', 'repair-applied',
    'request-structured', 'terminated', 'witness-validated',
  ]),
  actionOutcomes: Object.freeze(['failed', 'not-observed', 'succeeded']),
  errorKinds: Object.freeze([
    'capability-unavailable', 'constraint-violation', 'invalid-state-transition', 'none',
    'output-shape-violation', 'unsupported-claim', 'witness-rejected',
  ]),
  witnessKinds: Object.freeze([
    'evidence-citation', 'none', 'schema-check', 'state-check', 'symbolic-proof',
  ]),
  episodeStatuses: Object.freeze(['abstained', 'failed', 'partial', 'succeeded']),
  feedbackAxes: Object.freeze([
    'coherence', 'completeness', 'complexity', 'correctness', 'efficiency', 'factuality',
    'helpfulness', 'presentation', 'procedural', 'quality', 'relevance', 'safety', 'style',
    'verbosity',
  ]),
  polarities: Object.freeze(['negative', 'positive']),
  feedbackSources: Object.freeze(['automatic', 'human', 'synthetic']),
  candidateKinds: Object.freeze(['action', 'explanation', 'output', 'plan']),
  truthStatuses: Object.freeze(['claimed', 'observed', 'unknown']),
  epistemicStatuses: Object.freeze([
    'derived', 'direct', 'human-feedback', 'mixed', 'model-output', 'unknown',
  ]),
});

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/u;

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exact(value, fields, path) {
  record(value, path);
  if (stableStringify(Object.keys(value).toSorted()) !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function identifier(value, path, maximum = 160) {
  if (typeof value !== 'string' || value.length > maximum || !IDENTIFIER.test(value)) {
    throw new TypeError(`${path} must be a bounded canonical identifier.`);
  }
}

function text(value, path, maximum = 8_192) {
  if (typeof value !== 'string' || value.length < 1 || Buffer.byteLength(value, 'utf8') > maximum) {
    throw new TypeError(`${path} must be bounded non-empty text.`);
  }
}

function count(value, path, maximum = 1_000_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${path} must be a bounded non-negative integer.`);
  }
}

function enumValue(value, values, path) {
  if (!values.includes(value)) throw new TypeError(`${path} uses an unknown closed-vocabulary value.`);
}

function canonicalEnumArray(value, values, path, { minimum = 0, maximum = 32 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => !values.includes(item))
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical closed-vocabulary array.`);
  }
}

function orderedEnumArray(value, values, path, { minimum = 0, maximum = 32 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => !values.includes(item))) {
    throw new TypeError(`${path} must be a bounded ordered closed-vocabulary array.`);
  }
}

function canonicalIdentifiers(value, path, maximum = 64) {
  if (!Array.isArray(value) || value.length > maximum
      || value.some((item) => typeof item !== 'string' || !IDENTIFIER.test(item))
      || stableStringify(value) !== stableStringify([...new Set(value)].toSorted())) {
    throw new TypeError(`${path} must be a bounded canonical identifier array.`);
  }
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function validateSource(source) {
  exact(source, [
    'sourceId', 'componentId', 'revision', 'componentDigest', 'projectionId',
    'projectionDigest', 'split', 'visibility', 'licenseId', 'rightsState',
  ], 'Research episode source');
  for (const field of ['sourceId', 'componentId', 'revision', 'projectionId', 'split', 'licenseId']) {
    identifier(source[field], `Research episode source.${field}`);
  }
  if (!DIGEST.test(source.componentDigest)) throw new TypeError('Research componentDigest must be a SHA-256 digest.');
  if (!DIGEST.test(source.projectionDigest)) throw new TypeError('Research projectionDigest must be a SHA-256 digest.');
  enumValue(source.visibility, ['training-visible', 'development-visible', 'protected'], 'Research source visibility');
  enumValue(source.rightsState, ['approved', 'denied', 'review-required', 'withdrawn'], 'Research rights state');
}

function validateRequest(request) {
  exact(request, [
    'visibleText', 'operationKinds', 'artifactKind', 'constraintKinds',
    'requiredCapabilities', 'outputObligations',
  ], 'Research request');
  text(request.visibleText, 'Research request.visibleText');
  orderedEnumArray(request.operationKinds, RESEARCH_EPISODE_VOCABULARY.operationKinds,
    'Research request.operationKinds', { minimum: 1 });
  enumValue(request.artifactKind, RESEARCH_EPISODE_VOCABULARY.artifactKinds, 'Research request.artifactKind');
  canonicalEnumArray(request.constraintKinds, RESEARCH_EPISODE_VOCABULARY.constraintKinds,
    'Research request.constraintKinds');
  canonicalEnumArray(request.requiredCapabilities, RESEARCH_EPISODE_VOCABULARY.capabilityKinds,
    'Research request.requiredCapabilities');
  canonicalEnumArray(request.outputObligations, RESEARCH_EPISODE_VOCABULARY.obligationKinds,
    'Research request.outputObligations');
}

function validateInitialState(state) {
  exact(state, ['stateKinds', 'unknownKinds'], 'Research initial state');
  canonicalEnumArray(state.stateKinds, RESEARCH_EPISODE_VOCABULARY.stateKinds,
    'Research initial state.stateKinds');
  canonicalEnumArray(state.unknownKinds, RESEARCH_EPISODE_VOCABULARY.stateKinds,
    'Research initial state.unknownKinds');
  if (state.unknownKinds.some((item) => state.stateKinds.includes(item))) {
    throw new TypeError('Research initial known and unknown state kinds must be disjoint.');
  }
}

function validateObservations(observations) {
  if (!Array.isArray(observations) || observations.length > 256) {
    throw new TypeError('Research observations must be a bounded array.');
  }
  for (const [index, item] of observations.entries()) {
    exact(item, ['observationId', 'ordinal', 'phase', 'kind', 'stateDeltaKinds'], `Observation[${index}]`);
    identifier(item.observationId, `Observation[${index}].observationId`);
    if (item.ordinal !== index) throw new TypeError('Research observation ordinals must be contiguous.');
    enumValue(item.phase, RESEARCH_EPISODE_VOCABULARY.phases, `Observation[${index}].phase`);
    enumValue(item.kind, RESEARCH_EPISODE_VOCABULARY.observationKinds, `Observation[${index}].kind`);
    canonicalEnumArray(item.stateDeltaKinds, RESEARCH_EPISODE_VOCABULARY.stateDeltaKinds,
      `Observation[${index}].stateDeltaKinds`);
  }
  if (new Set(observations.map((item) => item.observationId)).size !== observations.length) {
    throw new TypeError('Research observation identifiers must be unique.');
  }
}

function validateActions(actions) {
  if (!Array.isArray(actions) || actions.length > 256) throw new TypeError('Research actions must be a bounded array.');
  const seen = new Set();
  let dependencies = 0;
  for (const [index, action] of actions.entries()) {
    exact(action, [
      'actionId', 'ordinal', 'phase', 'kind', 'arguments', 'dependsOn', 'stateDeltaKinds',
      'outcome', 'errorKind', 'witnessKind',
    ], `Action[${index}]`);
    identifier(action.actionId, `Action[${index}].actionId`);
    if (seen.has(action.actionId) || action.ordinal !== index) {
      throw new TypeError('Research action identifiers must be unique and ordinals contiguous.');
    }
    enumValue(action.phase, RESEARCH_EPISODE_VOCABULARY.phases, `Action[${index}].phase`);
    enumValue(action.kind, RESEARCH_EPISODE_VOCABULARY.actionKinds, `Action[${index}].kind`);
    if (!Array.isArray(action.arguments) || action.arguments.length > 32) {
      throw new TypeError(`Action[${index}].arguments must be bounded.`);
    }
    for (const [argumentIndex, argument] of action.arguments.entries()) {
      exact(argument, ['role', 'valueKind', 'value'], `Action[${index}].arguments[${argumentIndex}]`);
      enumValue(argument.role, RESEARCH_EPISODE_VOCABULARY.argumentRoles, 'Research argument role');
      enumValue(argument.valueKind, RESEARCH_EPISODE_VOCABULARY.valueKinds, 'Research argument value kind');
      text(argument.value, 'Research inert argument value', 2_048);
    }
    canonicalIdentifiers(action.dependsOn, `Action[${index}].dependsOn`, 64);
    if (action.dependsOn.some((dependency) => !seen.has(dependency))) {
      throw new TypeError('Research action dependencies must reference earlier actions only.');
    }
    dependencies += action.dependsOn.length;
    canonicalEnumArray(action.stateDeltaKinds, RESEARCH_EPISODE_VOCABULARY.stateDeltaKinds,
      `Action[${index}].stateDeltaKinds`);
    enumValue(action.outcome, RESEARCH_EPISODE_VOCABULARY.actionOutcomes, `Action[${index}].outcome`);
    enumValue(action.errorKind, RESEARCH_EPISODE_VOCABULARY.errorKinds, `Action[${index}].errorKind`);
    enumValue(action.witnessKind, RESEARCH_EPISODE_VOCABULARY.witnessKinds, `Action[${index}].witnessKind`);
    if (action.outcome === 'failed' && action.errorKind === 'none'
        || action.outcome !== 'failed' && action.errorKind !== 'none') {
      throw new TypeError('Research action outcome and errorKind are inconsistent.');
    }
    seen.add(action.actionId);
  }
  return dependencies;
}

function validateOutcome(outcome) {
  exact(outcome, [
    'status', 'resultKind', 'failureKind', 'witnessAvailable', 'criteriaKinds',
  ], 'Research outcome');
  enumValue(outcome.status, RESEARCH_EPISODE_VOCABULARY.episodeStatuses, 'Research outcome.status');
  enumValue(outcome.resultKind, RESEARCH_EPISODE_VOCABULARY.artifactKinds, 'Research outcome.resultKind');
  enumValue(outcome.failureKind, RESEARCH_EPISODE_VOCABULARY.errorKinds, 'Research outcome.failureKind');
  if (typeof outcome.witnessAvailable !== 'boolean') throw new TypeError('Research outcome witness must be boolean.');
  canonicalEnumArray(outcome.criteriaKinds, RESEARCH_EPISODE_VOCABULARY.obligationKinds,
    'Research outcome.criteriaKinds');
  if (outcome.status === 'failed' && outcome.failureKind === 'none'
      || outcome.status !== 'failed' && outcome.failureKind !== 'none') {
    throw new TypeError('Research outcome status and failureKind are inconsistent.');
  }
}

function validateFeedback(feedback, actions) {
  if (!Array.isArray(feedback) || feedback.length > 128) throw new TypeError('Research feedback must be bounded.');
  const actionIds = new Set(actions.map((item) => item.actionId));
  for (const [index, item] of feedback.entries()) {
    exact(item, [
      'feedbackId', 'targetKind', 'targetId', 'axis', 'polarity', 'strength', 'sourceKind',
    ], `Feedback[${index}]`);
    identifier(item.feedbackId, `Feedback[${index}].feedbackId`);
    enumValue(item.targetKind, ['action', 'episode', 'outcome'], `Feedback[${index}].targetKind`);
    if (item.targetId !== null) identifier(item.targetId, `Feedback[${index}].targetId`);
    if (item.targetKind === 'action' && !actionIds.has(item.targetId)) {
      throw new TypeError('Action feedback must reference an action in the episode.');
    }
    enumValue(item.axis, RESEARCH_EPISODE_VOCABULARY.feedbackAxes, `Feedback[${index}].axis`);
    enumValue(item.polarity, RESEARCH_EPISODE_VOCABULARY.polarities, `Feedback[${index}].polarity`);
    if (!Number.isFinite(item.strength) || item.strength < 0 || item.strength > 1) {
      throw new TypeError('Research feedback strength must be a finite rate.');
    }
    enumValue(item.sourceKind, RESEARCH_EPISODE_VOCABULARY.feedbackSources,
      `Feedback[${index}].sourceKind`);
  }
  if (new Set(feedback.map((item) => item.feedbackId)).size !== feedback.length) {
    throw new TypeError('Research feedback identifiers must be unique.');
  }
}

function validatePreferences(preferences) {
  if (!Array.isArray(preferences) || preferences.length > 64) throw new TypeError('Research preferences must be bounded.');
  for (const [index, item] of preferences.entries()) {
    exact(item, [
      'preferenceId', 'candidateKinds', 'preferredIndex', 'axes', 'disagreement',
    ], `Preference[${index}]`);
    identifier(item.preferenceId, `Preference[${index}].preferenceId`);
    if (!Array.isArray(item.candidateKinds) || item.candidateKinds.length < 2
        || item.candidateKinds.length > 16
        || item.candidateKinds.some((kind) => !RESEARCH_EPISODE_VOCABULARY.candidateKinds.includes(kind))) {
      throw new TypeError('Research preference candidates must use the closed vocabulary.');
    }
    if (item.preferredIndex !== null
        && (!Number.isSafeInteger(item.preferredIndex) || item.preferredIndex < 0
          || item.preferredIndex >= item.candidateKinds.length)) {
      throw new TypeError('Research preferredIndex must select a candidate or be null.');
    }
    canonicalEnumArray(item.axes, RESEARCH_EPISODE_VOCABULARY.feedbackAxes,
      `Preference[${index}].axes`, { minimum: 1 });
    if (typeof item.disagreement !== 'boolean') throw new TypeError('Research disagreement must be boolean.');
  }
  if (new Set(preferences.map((item) => item.preferenceId)).size !== preferences.length) {
    throw new TypeError('Research preference identifiers must be unique.');
  }
}

function validateProvenance(provenance) {
  exact(provenance, ['recordDigest', 'sourceNativeIds', 'spans'], 'Research provenance');
  if (!DIGEST.test(provenance.recordDigest)) throw new TypeError('Research recordDigest must be a SHA-256 digest.');
  canonicalIdentifiers(provenance.sourceNativeIds, 'Research sourceNativeIds');
  if (!Array.isArray(provenance.spans) || provenance.spans.length > 64) {
    throw new TypeError('Research provenance spans must be bounded.');
  }
  for (const [index, span] of provenance.spans.entries()) {
    exact(span, ['field', 'start', 'end'], `Research span[${index}]`);
    identifier(span.field, `Research span[${index}].field`);
    count(span.start, `Research span[${index}].start`);
    count(span.end, `Research span[${index}].end`);
    if (span.end <= span.start) throw new TypeError('Research provenance spans must be non-empty.');
  }
}

function validateGovernance(governance) {
  exact(governance, [
    'truthStatus', 'epistemicStatus', 'safetyTags', 'privacyTags', 'projectionLosses',
  ], 'Research governance');
  enumValue(governance.truthStatus, RESEARCH_EPISODE_VOCABULARY.truthStatuses,
    'Research governance.truthStatus');
  enumValue(governance.epistemicStatus, RESEARCH_EPISODE_VOCABULARY.epistemicStatuses,
    'Research governance.epistemicStatus');
  for (const field of ['safetyTags', 'privacyTags', 'projectionLosses']) {
    canonicalIdentifiers(governance[field], `Research governance.${field}`);
  }
}

export function assertResearchEpisode(episode) {
  exact(episode, [
    'format', 'episodeId', 'source', 'request', 'initialState', 'observations', 'actions',
    'outcome', 'feedback', 'preferences', 'provenance', 'governance', 'work',
  ], 'Research episode');
  if (episode.format !== RESEARCH_EPISODE_PROTOCOL) throw new TypeError('Research episode protocol is unsupported.');
  identifier(episode.episodeId, 'Research episode.episodeId');
  validateSource(episode.source);
  validateRequest(episode.request);
  validateInitialState(episode.initialState);
  validateObservations(episode.observations);
  const dependencyCount = validateActions(episode.actions);
  validateOutcome(episode.outcome);
  validateFeedback(episode.feedback, episode.actions);
  validatePreferences(episode.preferences);
  validateProvenance(episode.provenance);
  validateGovernance(episode.governance);
  exact(episode.work, ['sourceBytes', 'tokens', 'actions', 'dependencies', 'complete'], 'Research episode work');
  for (const field of ['sourceBytes', 'tokens', 'actions', 'dependencies']) {
    count(episode.work[field], `Research episode work.${field}`);
  }
  if (episode.work.sourceBytes < 1 || episode.work.tokens < 1
      || typeof episode.work.complete !== 'boolean' || episode.work.actions !== episode.actions.length
      || episode.work.dependencies !== dependencyCount) {
    throw new TypeError('Research episode work does not reconcile with its graph.');
  }
  return episode;
}

export function createResearchEpisode(input) {
  const episode = structuredClone(input);
  assertResearchEpisode(episode);
  return freezeDeep(episode);
}

export function researchEpisodeAuditDigest(episode) {
  assertResearchEpisode(episode);
  return `sha256:${sha256(stableStringify(episode))}`;
}

export function researchEpisodeContentDigest(episode) {
  assertResearchEpisode(episode);
  const content = structuredClone(episode);
  delete content.source.projectionDigest;
  return `sha256:${sha256(stableStringify({
    format: 'eslm-research-episode-content-v2',
    episode: content,
  }))}`;
}
