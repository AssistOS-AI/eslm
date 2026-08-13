import { sha256, stableStringify } from '../util.mjs';
import {
  RESEARCH_EPISODE_PROTOCOL,
  RESEARCH_EPISODE_VOCABULARY,
  assertResearchEpisode,
} from './research-episode-contract.mjs';

export const RESEARCH_EPISODE_FEATURE_PROTOCOL = 'eslm-research-episode-features-v1';
export const RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS = Object.freeze([
  'action-identifiers', 'argument-values', 'episode-identifiers', 'provenance-spans',
  'request-text', 'source-component-identifiers', 'source-native-identifiers',
]);
export const RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST = `sha256:${sha256(stableStringify({
  sourceProtocol: RESEARCH_EPISODE_PROTOCOL,
  featureProtocol: RESEARCH_EPISODE_FEATURE_PROTOCOL,
  vocabulary: RESEARCH_EPISODE_VOCABULARY,
  excluded: RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS,
}))}`;

const FEATURE_FIELDS = Object.freeze([
  'format', 'schemaDigest', 'request', 'state', 'trajectory', 'dependencyMotifs',
  'earliestError', 'feedbackAxes', 'preferenceAxes', 'outcome', 'semanticDigest',
]);

function plainJson(value) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(plainJson);
  return typeof value === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && Object.values(value).every(plainJson);
}

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function enumValue(value, vocabulary, path) {
  if (!vocabulary.includes(value)) throw new TypeError(`${path} is outside the closed vocabulary.`);
}

function enumArray(value, vocabulary, path, {
  maximum = 256, minimum = 0, canonical = true,
} = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => !vocabulary.includes(item))
      || (canonical && stableStringify(value)
        !== stableStringify([...new Set(value)].toSorted()))) {
    throw new TypeError(`${path} must be a bounded closed-vocabulary array.`);
  }
}

function boundedCount(value, path, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0) || value > 1_000_000) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function validateRequest(request) {
  exact(request, [
    'operationKinds', 'artifactKind', 'constraintKinds', 'requiredCapabilities',
    'outputObligations',
  ], 'Research features.request');
  enumArray(request.operationKinds, RESEARCH_EPISODE_VOCABULARY.operationKinds,
    'Research features.request.operationKinds', { minimum: 1, canonical: false });
  enumValue(request.artifactKind, RESEARCH_EPISODE_VOCABULARY.artifactKinds,
    'Research features.request.artifactKind');
  enumArray(request.constraintKinds, RESEARCH_EPISODE_VOCABULARY.constraintKinds,
    'Research features.request.constraintKinds');
  enumArray(request.requiredCapabilities, RESEARCH_EPISODE_VOCABULARY.capabilityKinds,
    'Research features.request.requiredCapabilities');
  enumArray(request.outputObligations, RESEARCH_EPISODE_VOCABULARY.obligationKinds,
    'Research features.request.outputObligations');
}

function validateState(state) {
  exact(state, ['initialStateKinds', 'unknownKinds'], 'Research features.state');
  enumArray(state.initialStateKinds, RESEARCH_EPISODE_VOCABULARY.stateKinds,
    'Research features.state.initialStateKinds');
  enumArray(state.unknownKinds, RESEARCH_EPISODE_VOCABULARY.stateKinds,
    'Research features.state.unknownKinds');
  if (state.unknownKinds.some((item) => state.initialStateKinds.includes(item))) {
    throw new TypeError('Research feature known and unknown state kinds must be disjoint.');
  }
}

function validateArgumentShape(argument, path) {
  exact(argument, ['role', 'valueKind'], path);
  enumValue(argument.role, RESEARCH_EPISODE_VOCABULARY.argumentRoles, `${path}.role`);
  enumValue(argument.valueKind, RESEARCH_EPISODE_VOCABULARY.valueKinds, `${path}.valueKind`);
}

function validateActionSignature(action, path) {
  exact(action, [
    'phase', 'kind', 'argumentShape', 'stateDeltaKinds', 'outcome', 'errorKind', 'witnessKind',
  ], path);
  enumValue(action.phase, RESEARCH_EPISODE_VOCABULARY.phases, `${path}.phase`);
  enumValue(action.kind, RESEARCH_EPISODE_VOCABULARY.actionKinds, `${path}.kind`);
  if (!Array.isArray(action.argumentShape) || action.argumentShape.length > 32) {
    throw new TypeError(`${path}.argumentShape must be bounded.`);
  }
  action.argumentShape.forEach((argument, index) =>
    validateArgumentShape(argument, `${path}.argumentShape[${index}]`));
  enumArray(action.stateDeltaKinds, RESEARCH_EPISODE_VOCABULARY.stateDeltaKinds,
    `${path}.stateDeltaKinds`);
  enumValue(action.outcome, RESEARCH_EPISODE_VOCABULARY.actionOutcomes, `${path}.outcome`);
  enumValue(action.errorKind, RESEARCH_EPISODE_VOCABULARY.errorKinds, `${path}.errorKind`);
  enumValue(action.witnessKind, RESEARCH_EPISODE_VOCABULARY.witnessKinds, `${path}.witnessKind`);
  if ((action.outcome === 'failed') !== (action.errorKind !== 'none')) {
    throw new TypeError(`${path} outcome and error kind are inconsistent.`);
  }
}

function validateTrajectory(trajectory) {
  exact(trajectory, [
    'phaseSequence', 'observationKinds', 'actionSignatures', 'stateDeltaKinds',
    'retryKinds', 'terminationKind',
  ], 'Research features.trajectory');
  enumArray(trajectory.phaseSequence, RESEARCH_EPISODE_VOCABULARY.phases,
    'Research features.trajectory.phaseSequence', { canonical: false });
  if (trajectory.phaseSequence.some((phase, index) =>
    index > 0 && phase === trajectory.phaseSequence[index - 1])) {
    throw new TypeError('Research feature phase sequence must be compressed.');
  }
  if (!Array.isArray(trajectory.observationKinds) || trajectory.observationKinds.length > 256) {
    throw new TypeError('Research feature observations must be bounded.');
  }
  trajectory.observationKinds.forEach((observation, index) => {
    const path = `Research features.trajectory.observationKinds[${index}]`;
    exact(observation, ['phase', 'kind', 'stateDeltaKinds'], path);
    enumValue(observation.phase, RESEARCH_EPISODE_VOCABULARY.phases, `${path}.phase`);
    enumValue(observation.kind, RESEARCH_EPISODE_VOCABULARY.observationKinds, `${path}.kind`);
    enumArray(observation.stateDeltaKinds, RESEARCH_EPISODE_VOCABULARY.stateDeltaKinds,
      `${path}.stateDeltaKinds`);
  });
  if (!Array.isArray(trajectory.actionSignatures) || trajectory.actionSignatures.length > 256) {
    throw new TypeError('Research feature action signatures must be bounded.');
  }
  trajectory.actionSignatures.forEach((action, index) =>
    validateActionSignature(action, `Research features.trajectory.actionSignatures[${index}]`));
  enumArray(trajectory.stateDeltaKinds, RESEARCH_EPISODE_VOCABULARY.stateDeltaKinds,
    'Research features.trajectory.stateDeltaKinds');
  enumArray(trajectory.retryKinds, RESEARCH_EPISODE_VOCABULARY.actionKinds,
    'Research features.trajectory.retryKinds');
  enumValue(trajectory.terminationKind, [...RESEARCH_EPISODE_VOCABULARY.actionKinds, 'none'],
    'Research features.trajectory.terminationKind');
  const phases = compressed(trajectory.actionSignatures.map((action) => action.phase));
  const actionKinds = trajectory.actionSignatures.map((action) => action.kind);
  const retries = uniqueSorted(actionKinds.filter((kind, index) => actionKinds.indexOf(kind) !== index));
  const deltas = uniqueSorted([
    ...trajectory.observationKinds.flatMap((item) => item.stateDeltaKinds),
    ...trajectory.actionSignatures.flatMap((item) => item.stateDeltaKinds),
  ]);
  if (stableStringify(trajectory.phaseSequence) !== stableStringify(phases)
      || stableStringify(trajectory.retryKinds) !== stableStringify(retries)
      || stableStringify(trajectory.stateDeltaKinds) !== stableStringify(deltas)
      || trajectory.terminationKind !== (actionKinds.at(-1) ?? 'none')) {
    throw new TypeError('Research feature trajectory summaries do not reproduce.');
  }
}

function validateDependencyMotifs(motifs) {
  if (!Array.isArray(motifs) || motifs.length > 1_024) {
    throw new TypeError('Research feature dependency motifs must be bounded.');
  }
  let prior = '';
  for (const [index, motif] of motifs.entries()) {
    const path = `Research features.dependencyMotifs[${index}]`;
    exact(motif, ['fromKind', 'fromPhase', 'toKind', 'toPhase', 'relation', 'count'], path);
    enumValue(motif.fromKind, RESEARCH_EPISODE_VOCABULARY.actionKinds, `${path}.fromKind`);
    enumValue(motif.toKind, RESEARCH_EPISODE_VOCABULARY.actionKinds, `${path}.toKind`);
    enumValue(motif.fromPhase, RESEARCH_EPISODE_VOCABULARY.phases, `${path}.fromPhase`);
    enumValue(motif.toPhase, RESEARCH_EPISODE_VOCABULARY.phases, `${path}.toPhase`);
    if (motif.relation !== 'requires') throw new TypeError(`${path}.relation must be requires.`);
    boundedCount(motif.count, `${path}.count`, { positive: true });
    const key = stableStringify(motif);
    if (key <= prior) throw new TypeError('Research feature dependency motifs must be canonical.');
    prior = key;
  }
}

function validateEarliestError(error, actions) {
  const expectedIndex = actions.findIndex((action) => action.outcome === 'failed');
  if (expectedIndex < 0) {
    if (error !== null) throw new TypeError('Research earliest error must be absent without a failure.');
    return;
  }
  exact(error, ['position', 'phase', 'actionKind', 'errorKind'], 'Research features.earliestError');
  boundedCount(error.position, 'Research features.earliestError.position');
  const action = actions[expectedIndex];
  if (error.position !== expectedIndex || error.phase !== action.phase
      || error.actionKind !== action.kind || error.errorKind !== action.errorKind) {
    throw new TypeError('Research earliest error does not reproduce from action signatures.');
  }
}

function validateAxisRows(rows, kind) {
  if (!Array.isArray(rows) || rows.length > RESEARCH_EPISODE_VOCABULARY.feedbackAxes.length) {
    throw new TypeError(`Research feature ${kind} axes must be bounded.`);
  }
  let prior = '';
  for (const [index, row] of rows.entries()) {
    const path = `Research features.${kind}Axes[${index}]`;
    const fields = kind === 'feedback'
      ? ['axis', 'positiveCount', 'negativeCount', 'maximumStrength']
      : ['axis', 'comparisons', 'decided', 'disagreements'];
    exact(row, fields, path);
    enumValue(row.axis, RESEARCH_EPISODE_VOCABULARY.feedbackAxes, `${path}.axis`);
    if (row.axis <= prior) throw new TypeError(`Research feature ${kind} axes must be canonical.`);
    if (kind === 'feedback') {
      boundedCount(row.positiveCount, `${path}.positiveCount`);
      boundedCount(row.negativeCount, `${path}.negativeCount`);
      if (row.positiveCount + row.negativeCount < 1
          || !Number.isFinite(row.maximumStrength)
          || row.maximumStrength < 0 || row.maximumStrength > 1) {
        throw new TypeError(`${path} feedback counters are inconsistent.`);
      }
    } else {
      boundedCount(row.comparisons, `${path}.comparisons`, { positive: true });
      boundedCount(row.decided, `${path}.decided`);
      boundedCount(row.disagreements, `${path}.disagreements`);
      if (row.decided > row.comparisons || row.disagreements > row.comparisons) {
        throw new TypeError(`${path} preference counters are inconsistent.`);
      }
    }
    prior = row.axis;
  }
  const aggregate = rows.reduce((sum, row) => sum + (kind === 'feedback'
    ? row.positiveCount + row.negativeCount : row.comparisons), 0);
  const maximum = kind === 'feedback'
    ? 128 : 64 * RESEARCH_EPISODE_VOCABULARY.feedbackAxes.length;
  if (aggregate > maximum) {
    throw new TypeError(`Research feature ${kind} aggregate exceeds its episode bound.`);
  }
}

function validateOutcome(outcome) {
  exact(outcome, [
    'status', 'resultKind', 'failureKind', 'witnessAvailable', 'criteriaKinds',
  ], 'Research features.outcome');
  enumValue(outcome.status, RESEARCH_EPISODE_VOCABULARY.episodeStatuses,
    'Research features.outcome.status');
  enumValue(outcome.resultKind, RESEARCH_EPISODE_VOCABULARY.artifactKinds,
    'Research features.outcome.resultKind');
  enumValue(outcome.failureKind, RESEARCH_EPISODE_VOCABULARY.errorKinds,
    'Research features.outcome.failureKind');
  if (typeof outcome.witnessAvailable !== 'boolean'
      || ((outcome.status === 'failed') !== (outcome.failureKind !== 'none'))) {
    throw new TypeError('Research feature outcome fields are inconsistent.');
  }
  enumArray(outcome.criteriaKinds, RESEARCH_EPISODE_VOCABULARY.obligationKinds,
    'Research features.outcome.criteriaKinds');
}

export function researchEpisodeFeatureSemanticDigest(features) {
  const core = structuredClone(features);
  delete core.format;
  delete core.schemaDigest;
  delete core.semanticDigest;
  return `sha256:${sha256(stableStringify(core))}`;
}

export function assertResearchEpisodeFeatures(features) {
  if (!features || typeof features !== 'object' || Array.isArray(features)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(features))
      || stableStringify(Object.keys(features).toSorted())
        !== stableStringify([...FEATURE_FIELDS].toSorted())
      || features.format !== RESEARCH_EPISODE_FEATURE_PROTOCOL
      || features.schemaDigest !== RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST
      || !plainJson(features)
      || Buffer.byteLength(stableStringify(features), 'utf8') > 1_048_576
      || features.semanticDigest !== researchEpisodeFeatureSemanticDigest(features)) {
    throw new TypeError('Research episode features are not canonical or self-consistent.');
  }
  validateRequest(features.request);
  validateState(features.state);
  validateTrajectory(features.trajectory);
  validateDependencyMotifs(features.dependencyMotifs);
  validateEarliestError(features.earliestError, features.trajectory.actionSignatures);
  validateAxisRows(features.feedbackAxes, 'feedback');
  validateAxisRows(features.preferenceAxes, 'preference');
  validateOutcome(features.outcome);
  return features;
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function uniqueSorted(values) {
  return [...new Set(values)].toSorted();
}

function compressed(values) {
  const result = [];
  for (const value of values) {
    if (result.at(-1) !== value) result.push(value);
  }
  return result;
}

function actionShape(action) {
  return {
    phase: action.phase,
    kind: action.kind,
    argumentShape: action.arguments.map(({ role, valueKind }) => ({ role, valueKind })),
    stateDeltaKinds: action.stateDeltaKinds,
    outcome: action.outcome,
    errorKind: action.errorKind,
    witnessKind: action.witnessKind,
  };
}

function dependencyMotifs(actions) {
  const actionsById = new Map(actions.map((action) => [action.actionId, action]));
  const counts = new Map();
  for (const action of actions) {
    for (const dependency of action.dependsOn) {
      const predecessor = actionsById.get(dependency);
      const key = stableStringify({
        fromKind: predecessor.kind,
        fromPhase: predecessor.phase,
        toKind: action.kind,
        toPhase: action.phase,
        relation: 'requires',
      });
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts].map(([key, count]) => ({ ...JSON.parse(key), count }))
    .toSorted((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
}

function feedbackAxes(feedback) {
  const grouped = new Map();
  for (const item of feedback) {
    const current = grouped.get(item.axis) ?? {
      axis: item.axis, positiveCount: 0, negativeCount: 0, maximumStrength: 0,
    };
    current[`${item.polarity}Count`] += 1;
    current.maximumStrength = Math.max(current.maximumStrength, item.strength);
    grouped.set(item.axis, current);
  }
  return [...grouped.values()].toSorted((left, right) => left.axis.localeCompare(right.axis));
}

function preferenceAxes(preferences) {
  const grouped = new Map();
  for (const preference of preferences) {
    for (const axis of preference.axes) {
      const current = grouped.get(axis) ?? {
        axis, comparisons: 0, decided: 0, disagreements: 0,
      };
      current.comparisons += 1;
      current.decided += preference.preferredIndex === null ? 0 : 1;
      current.disagreements += preference.disagreement ? 1 : 0;
      grouped.set(axis, current);
    }
  }
  return [...grouped.values()].toSorted((left, right) => left.axis.localeCompare(right.axis));
}

export function projectResearchEpisodeFeatures(episode) {
  assertResearchEpisode(episode);
  const earliestFailedAction = episode.actions.find((action) => action.outcome === 'failed');
  const actionKinds = episode.actions.map((action) => action.kind);
  const core = {
    request: {
      operationKinds: episode.request.operationKinds,
      artifactKind: episode.request.artifactKind,
      constraintKinds: episode.request.constraintKinds,
      requiredCapabilities: episode.request.requiredCapabilities,
      outputObligations: episode.request.outputObligations,
    },
    state: {
      initialStateKinds: episode.initialState.stateKinds,
      unknownKinds: episode.initialState.unknownKinds,
    },
    trajectory: {
      phaseSequence: compressed(episode.actions.map((action) => action.phase)),
      observationKinds: episode.observations.map((item) => ({
        phase: item.phase, kind: item.kind, stateDeltaKinds: item.stateDeltaKinds,
      })),
      actionSignatures: episode.actions.map(actionShape),
      stateDeltaKinds: uniqueSorted([
        ...episode.observations.flatMap((item) => item.stateDeltaKinds),
        ...episode.actions.flatMap((item) => item.stateDeltaKinds),
      ]),
      retryKinds: uniqueSorted(actionKinds.filter((kind, index) => actionKinds.indexOf(kind) !== index)),
      terminationKind: actionKinds.at(-1) ?? 'none',
    },
    dependencyMotifs: dependencyMotifs(episode.actions),
    earliestError: earliestFailedAction ? {
      position: earliestFailedAction.ordinal,
      phase: earliestFailedAction.phase,
      actionKind: earliestFailedAction.kind,
      errorKind: earliestFailedAction.errorKind,
    } : null,
    feedbackAxes: feedbackAxes(episode.feedback),
    preferenceAxes: preferenceAxes(episode.preferences),
    outcome: {
      status: episode.outcome.status,
      resultKind: episode.outcome.resultKind,
      failureKind: episode.outcome.failureKind,
      witnessAvailable: episode.outcome.witnessAvailable,
      criteriaKinds: episode.outcome.criteriaKinds,
    },
  };
  const features = {
    format: RESEARCH_EPISODE_FEATURE_PROTOCOL,
    schemaDigest: RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST,
    ...core,
    semanticDigest: `sha256:${sha256(stableStringify(core))}`,
  };
  assertResearchEpisodeFeatures(features);
  return freezeDeep(features);
}
