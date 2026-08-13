import { exactKeys, integer, same, sha256, stable } from './contract-helpers.mjs';
import {
  FEATURE_VOCABULARY as VOCABULARY,
  RESEARCH_FEATURE_PROTOCOL,
  RESEARCH_FEATURE_SCHEMA_DIGEST,
} from './research-contract.mjs';

function enumValue(value, vocabulary, path) {
  if (!vocabulary.includes(value)) throw new TypeError(`${path} is outside the closed vocabulary.`);
}

function enumArray(value, vocabulary, path, {
  maximum = 256, minimum = 0, canonical = true,
} = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum
      || value.some((item) => !vocabulary.includes(item))
      || (canonical && !same(value, [...new Set(value)].toSorted()))) {
    throw new TypeError(`${path} must be a bounded closed-vocabulary array.`);
  }
}

function compressed(values) {
  const result = [];
  for (const value of values) if (result.at(-1) !== value) result.push(value);
  return result;
}

function validateRequest(request) {
  exactKeys(request, [
    'operationKinds', 'artifactKind', 'constraintKinds', 'requiredCapabilities',
    'outputObligations',
  ], 'Research features.request');
  enumArray(request.operationKinds, VOCABULARY.operationKinds,
    'Research features.request.operationKinds', { minimum: 1, canonical: false });
  enumValue(request.artifactKind, VOCABULARY.artifactKinds,
    'Research features.request.artifactKind');
  enumArray(request.constraintKinds, VOCABULARY.constraintKinds,
    'Research features.request.constraintKinds');
  enumArray(request.requiredCapabilities, VOCABULARY.capabilityKinds,
    'Research features.request.requiredCapabilities');
  enumArray(request.outputObligations, VOCABULARY.obligationKinds,
    'Research features.request.outputObligations');
}

function validateState(state) {
  exactKeys(state, ['initialStateKinds', 'unknownKinds'], 'Research features.state');
  enumArray(state.initialStateKinds, VOCABULARY.stateKinds,
    'Research features.state.initialStateKinds');
  enumArray(state.unknownKinds, VOCABULARY.stateKinds,
    'Research features.state.unknownKinds');
  if (state.unknownKinds.some((item) => state.initialStateKinds.includes(item))) {
    throw new TypeError('Research feature known and unknown state kinds must be disjoint.');
  }
}

function validateArgument(argument, path) {
  exactKeys(argument, ['role', 'valueKind'], path);
  enumValue(argument.role, VOCABULARY.argumentRoles, `${path}.role`);
  enumValue(argument.valueKind, VOCABULARY.valueKinds, `${path}.valueKind`);
}

function validateAction(action, path) {
  exactKeys(action, [
    'phase', 'kind', 'argumentShape', 'stateDeltaKinds', 'outcome', 'errorKind', 'witnessKind',
  ], path);
  enumValue(action.phase, VOCABULARY.phases, `${path}.phase`);
  enumValue(action.kind, VOCABULARY.actionKinds, `${path}.kind`);
  if (!Array.isArray(action.argumentShape) || action.argumentShape.length > 32) {
    throw new TypeError(`${path}.argumentShape must be bounded.`);
  }
  action.argumentShape.forEach((argument, index) =>
    validateArgument(argument, `${path}.argumentShape[${index}]`));
  enumArray(action.stateDeltaKinds, VOCABULARY.stateDeltaKinds, `${path}.stateDeltaKinds`);
  enumValue(action.outcome, VOCABULARY.actionOutcomes, `${path}.outcome`);
  enumValue(action.errorKind, VOCABULARY.errorKinds, `${path}.errorKind`);
  enumValue(action.witnessKind, VOCABULARY.witnessKinds, `${path}.witnessKind`);
  if ((action.outcome === 'failed') !== (action.errorKind !== 'none')) {
    throw new TypeError(`${path} outcome and error kind are inconsistent.`);
  }
}

function validateTrajectory(trajectory) {
  exactKeys(trajectory, [
    'phaseSequence', 'observationKinds', 'actionSignatures', 'stateDeltaKinds',
    'retryKinds', 'terminationKind',
  ], 'Research features.trajectory');
  enumArray(trajectory.phaseSequence, VOCABULARY.phases,
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
    exactKeys(observation, ['phase', 'kind', 'stateDeltaKinds'], path);
    enumValue(observation.phase, VOCABULARY.phases, `${path}.phase`);
    enumValue(observation.kind, VOCABULARY.observationKinds, `${path}.kind`);
    enumArray(observation.stateDeltaKinds, VOCABULARY.stateDeltaKinds, `${path}.stateDeltaKinds`);
  });
  if (!Array.isArray(trajectory.actionSignatures) || trajectory.actionSignatures.length > 256) {
    throw new TypeError('Research feature action signatures must be bounded.');
  }
  trajectory.actionSignatures.forEach((action, index) =>
    validateAction(action, `Research features.trajectory.actionSignatures[${index}]`));
  enumArray(trajectory.stateDeltaKinds, VOCABULARY.stateDeltaKinds,
    'Research features.trajectory.stateDeltaKinds');
  enumArray(trajectory.retryKinds, VOCABULARY.actionKinds,
    'Research features.trajectory.retryKinds');
  enumValue(trajectory.terminationKind, [...VOCABULARY.actionKinds, 'none'],
    'Research features.trajectory.terminationKind');
  const actionKinds = trajectory.actionSignatures.map((action) => action.kind);
  const phases = compressed(trajectory.actionSignatures.map((action) => action.phase));
  const retries = [...new Set(actionKinds.filter((kind, index) =>
    actionKinds.indexOf(kind) !== index))].toSorted();
  const deltas = [...new Set([
    ...trajectory.observationKinds.flatMap((item) => item.stateDeltaKinds),
    ...trajectory.actionSignatures.flatMap((item) => item.stateDeltaKinds),
  ])].toSorted();
  if (!same(trajectory.phaseSequence, phases) || !same(trajectory.retryKinds, retries)
      || !same(trajectory.stateDeltaKinds, deltas)
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
    exactKeys(motif, ['fromKind', 'fromPhase', 'toKind', 'toPhase', 'relation', 'count'], path);
    enumValue(motif.fromKind, VOCABULARY.actionKinds, `${path}.fromKind`);
    enumValue(motif.toKind, VOCABULARY.actionKinds, `${path}.toKind`);
    enumValue(motif.fromPhase, VOCABULARY.phases, `${path}.fromPhase`);
    enumValue(motif.toPhase, VOCABULARY.phases, `${path}.toPhase`);
    if (motif.relation !== 'requires') throw new TypeError(`${path}.relation must be requires.`);
    integer(motif.count, `${path}.count`, 1);
    const key = stable(motif);
    if (key <= prior) throw new TypeError('Research feature dependency motifs must be canonical.');
    prior = key;
  }
}

function validateEarliestError(error, actions) {
  const expected = actions.findIndex((action) => action.outcome === 'failed');
  if (expected < 0) {
    if (error !== null) throw new TypeError('Research earliest error must be absent without a failure.');
    return;
  }
  exactKeys(error, ['position', 'phase', 'actionKind', 'errorKind'],
    'Research features.earliestError');
  integer(error.position, 'Research features.earliestError.position');
  const action = actions[expected];
  if (error.position !== expected || error.phase !== action.phase
      || error.actionKind !== action.kind || error.errorKind !== action.errorKind) {
    throw new TypeError('Research earliest error does not reproduce from action signatures.');
  }
}

function validateAxes(rows, kind) {
  if (!Array.isArray(rows) || rows.length > VOCABULARY.feedbackAxes.length) {
    throw new TypeError(`Research feature ${kind} axes must be bounded.`);
  }
  let prior = '';
  for (const [index, row] of rows.entries()) {
    const path = `Research features.${kind}Axes[${index}]`;
    exactKeys(row, kind === 'feedback'
      ? ['axis', 'positiveCount', 'negativeCount', 'maximumStrength']
      : ['axis', 'comparisons', 'decided', 'disagreements'], path);
    enumValue(row.axis, VOCABULARY.feedbackAxes, `${path}.axis`);
    if (row.axis <= prior) throw new TypeError(`Research feature ${kind} axes must be canonical.`);
    if (kind === 'feedback') {
      integer(row.positiveCount, `${path}.positiveCount`);
      integer(row.negativeCount, `${path}.negativeCount`);
      if (row.positiveCount > 1_000_000 || row.negativeCount > 1_000_000) {
        throw new TypeError(`${path} feedback counters exceed their field bounds.`);
      }
      if (row.positiveCount + row.negativeCount < 1 || !Number.isFinite(row.maximumStrength)
          || row.maximumStrength < 0 || row.maximumStrength > 1) {
        throw new TypeError(`${path} feedback counters are inconsistent.`);
      }
    } else {
      integer(row.comparisons, `${path}.comparisons`, 1);
      integer(row.decided, `${path}.decided`);
      integer(row.disagreements, `${path}.disagreements`);
      if ([row.comparisons, row.decided, row.disagreements]
        .some((value) => value > 1_000_000)) {
        throw new TypeError(`${path} preference counters exceed their field bounds.`);
      }
      if (row.decided > row.comparisons || row.disagreements > row.comparisons) {
        throw new TypeError(`${path} preference counters are inconsistent.`);
      }
    }
    prior = row.axis;
  }
  const aggregate = rows.reduce((sum, row) => sum + (kind === 'feedback'
    ? row.positiveCount + row.negativeCount : row.comparisons), 0);
  const maximum = kind === 'feedback' ? 128 : 64 * VOCABULARY.feedbackAxes.length;
  if (aggregate > maximum) {
    throw new TypeError(`Research feature ${kind} aggregate exceeds its episode bound.`);
  }
}

function validateOutcome(outcome) {
  exactKeys(outcome, [
    'status', 'resultKind', 'failureKind', 'witnessAvailable', 'criteriaKinds',
  ], 'Research features.outcome');
  enumValue(outcome.status, VOCABULARY.episodeStatuses, 'Research features.outcome.status');
  enumValue(outcome.resultKind, VOCABULARY.artifactKinds, 'Research features.outcome.resultKind');
  enumValue(outcome.failureKind, VOCABULARY.errorKinds, 'Research features.outcome.failureKind');
  if (typeof outcome.witnessAvailable !== 'boolean'
      || ((outcome.status === 'failed') !== (outcome.failureKind !== 'none'))) {
    throw new TypeError('Research feature outcome fields are inconsistent.');
  }
  enumArray(outcome.criteriaKinds, VOCABULARY.obligationKinds,
    'Research features.outcome.criteriaKinds');
}

export function researchFeatureSemanticDigest(features) {
  const core = structuredClone(features);
  delete core.format;
  delete core.schemaDigest;
  delete core.semanticDigest;
  return sha256(stable(core));
}

export function assertResearchFeatures(features) {
  exactKeys(features, [
    'format', 'schemaDigest', 'request', 'state', 'trajectory', 'dependencyMotifs',
    'earliestError', 'feedbackAxes', 'preferenceAxes', 'outcome', 'semanticDigest',
  ], 'Research episode features');
  if (features.format !== RESEARCH_FEATURE_PROTOCOL
      || features.schemaDigest !== RESEARCH_FEATURE_SCHEMA_DIGEST
      || features.semanticDigest !== researchFeatureSemanticDigest(features)
      || Buffer.byteLength(stable(features), 'utf8') > 1_048_576) {
    throw new TypeError('Research episode features are not canonical or self-consistent.');
  }
  validateRequest(features.request);
  validateState(features.state);
  validateTrajectory(features.trajectory);
  validateDependencyMotifs(features.dependencyMotifs);
  validateEarliestError(features.earliestError, features.trajectory.actionSignatures);
  validateAxes(features.feedbackAxes, 'feedback');
  validateAxes(features.preferenceAxes, 'preference');
  validateOutcome(features.outcome);
  return features;
}
