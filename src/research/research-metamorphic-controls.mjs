import { sha256, stableStringify } from '../util.mjs';
import {
  assertResearchEpisode,
  createResearchEpisode,
  researchEpisodeContentDigest,
} from './research-episode-contract.mjs';
import { projectResearchEpisodeFeatures } from './research-episode-features.mjs';

export const RESEARCH_METAMORPHIC_AUDIT_PROTOCOL =
  'eslm-research-episode-metamorphic-audit-v1';
export const RESEARCH_METAMORPHIC_COMMITMENT_PROTOCOL =
  'eslm-research-metamorphic-commitment-v1';

export const RESEARCH_PRESERVING_TRANSFORMS = Object.freeze([
  'opaque-join-identity-renaming',
  'nonce-argument-value-renaming',
  'request-surface-paraphrase',
  'independent-equivalent-action-ordering',
  'irrelevant-provenance-evidence-insertion',
  'unordered-feedback-permutation',
]);

export const RESEARCH_MEANING_CHANGING_CONTROLS = Object.freeze([
  'structural-contract-inversion',
  'constraint-contract-change',
  'outcome-witness-change',
]);

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function renameOpaqueJoins(episode) {
  const value = structuredClone(episode);
  const actionIds = new Map(value.actions.map((action, index) => [
    action.actionId, `metamorphic-action-${String(index).padStart(3, '0')}`,
  ]));
  value.episodeId = 'metamorphic-episode';
  value.observations.forEach((observation, index) => {
    observation.observationId = `metamorphic-observation-${String(index).padStart(3, '0')}`;
  });
  value.actions.forEach((action, index) => {
    action.actionId = actionIds.get(action.actionId);
    action.dependsOn = action.dependsOn.map((id) => actionIds.get(id)).toSorted();
  });
  value.feedback.forEach((feedback, index) => {
    feedback.feedbackId = `metamorphic-feedback-${String(index).padStart(3, '0')}`;
    if (feedback.targetKind === 'action') feedback.targetId = actionIds.get(feedback.targetId);
    else if (feedback.targetId !== null) feedback.targetId = `metamorphic-${feedback.targetKind}`;
  });
  value.preferences.forEach((preference, index) => {
    preference.preferenceId = `metamorphic-preference-${String(index).padStart(3, '0')}`;
  });
  value.provenance.recordDigest = digest({
    transform: 'opaque-join-identity-renaming',
    sourceDigest: episode.provenance.recordDigest,
  });
  value.provenance.sourceNativeIds = ['metamorphic-native-record'];
  value.provenance.spans = [];
  return createResearchEpisode(value);
}

function renameNonceArguments(episode) {
  const value = structuredClone(episode);
  value.actions.forEach((action, actionIndex) => {
    action.arguments.forEach((argument, argumentIndex) => {
      argument.value = `nonce-${argument.role}-${argument.valueKind}-${actionIndex}-${argumentIndex}`;
    });
  });
  return createResearchEpisode(value);
}

function paraphraseRequestSurface(episode) {
  const value = structuredClone(episode);
  if (value.request.visibleText
      === 'Carry out the same bounded typed task using the declared constraints.') {
    return createResearchEpisode(value);
  }
  value.request.visibleText = 'Carry out the same bounded typed task using the declared constraints.';
  value.provenance.spans = [];
  return createResearchEpisode(value);
}

function reorderIndependentEquivalentActions(episode) {
  const value = structuredClone(episode);
  const signature = (action) => stableStringify({
    phase: action.phase,
    kind: action.kind,
    arguments: action.arguments.map(({ role, valueKind }) => ({ role, valueKind })),
    stateDeltaKinds: action.stateDeltaKinds,
    outcome: action.outcome,
    errorKind: action.errorKind,
    witnessKind: action.witnessKind,
  });
  // Swapping adjacent equivalent actions is sufficient to exercise order invariance and
  // preserves every dependency on actions outside the pair. A non-adjacent swap could move
  // the later action before an intervening prerequisite or move the earlier action after an
  // intervening consumer even when the two actions do not directly depend on each other.
  for (let left = 0; left + 1 < value.actions.length; left += 1) {
    const right = left + 1;
    const first = value.actions[left];
    const second = value.actions[right];
    if (signature(first) !== signature(second)
        || second.dependsOn.includes(first.actionId)) continue;
    [value.actions[left], value.actions[right]] = [second, first];
    value.actions.forEach((action, index) => { action.ordinal = index; });
    return createResearchEpisode(value);
  }
  return createResearchEpisode(value);
}

function insertIrrelevantProvenanceEvidence(episode) {
  const value = structuredClone(episode);
  value.provenance.sourceNativeIds = [
    ...new Set([...value.provenance.sourceNativeIds, 'irrelevant-reviewed-evidence']),
  ].toSorted();
  return createResearchEpisode(value);
}

function permuteUnorderedFeedback(episode) {
  const value = structuredClone(episode);
  value.feedback.reverse();
  value.preferences.reverse();
  return createResearchEpisode(value);
}

function invertStructuralContract(episode) {
  const value = structuredClone(episode);
  value.request.operationKinds = value.request.operationKinds.length === 1
      && value.request.operationKinds[0] === 'verify' ? ['construct'] : ['verify'];
  value.request.artifactKind = value.request.artifactKind === 'verification-report'
    ? 'document' : 'verification-report';
  value.request.requiredCapabilities = value.request.requiredCapabilities.length === 1
      && value.request.requiredCapabilities[0] === 'verify' ? ['construct'] : ['verify'];
  value.actions.forEach((action) => {
    action.phase = action.phase === 'verify' ? 'construct' : 'verify';
    action.kind = action.kind === 'validate-output' ? 'construct-output' : 'validate-output';
    if (action.outcome === 'failed') {
      action.errorKind = action.errorKind === 'witness-rejected'
        ? 'output-shape-violation' : 'witness-rejected';
    }
  });
  const alternateAxis = (axis) => axis === 'safety' ? 'relevance' : 'safety';
  value.feedback.forEach((item) => { item.axis = alternateAxis(item.axis); });
  value.preferences.forEach((item) => {
    item.axes = [...new Set(item.axes.map(alternateAxis))].toSorted();
  });
  value.outcome.status = value.outcome.status === 'succeeded' ? 'partial' : 'succeeded';
  value.outcome.failureKind = 'none';
  value.outcome.witnessAvailable = !value.outcome.witnessAvailable;
  return createResearchEpisode(value);
}

function changeConstraintContract(episode) {
  const value = structuredClone(episode);
  value.request.constraintKinds = value.request.constraintKinds.includes('resource')
    ? value.request.constraintKinds.filter((item) => item !== 'resource')
    : [...value.request.constraintKinds, 'resource'].toSorted();
  return createResearchEpisode(value);
}

function changeOutcomeWitness(episode) {
  const value = structuredClone(episode);
  value.outcome.witnessAvailable = !value.outcome.witnessAvailable;
  return createResearchEpisode(value);
}

const PRESERVING_TRANSFORMS = Object.freeze([
  renameOpaqueJoins,
  renameNonceArguments,
  paraphraseRequestSurface,
  reorderIndependentEquivalentActions,
  insertIrrelevantProvenanceEvidence,
  permuteUnorderedFeedback,
]);

const CONTROL_TRANSFORMS = Object.freeze([
  invertStructuralContract,
  changeConstraintContract,
  changeOutcomeWitness,
]);

const PRESERVING_TARGETS = Object.freeze([
  (episode) => ({
    episodeId: episode.episodeId,
    observationIds: episode.observations.map((item) => item.observationId),
    actions: episode.actions.map((item) => ({
      actionId: item.actionId, dependsOn: item.dependsOn,
    })),
    feedback: episode.feedback.map((item) => ({
      feedbackId: item.feedbackId, targetId: item.targetId,
    })),
    preferenceIds: episode.preferences.map((item) => item.preferenceId),
    recordDigest: episode.provenance.recordDigest,
    sourceNativeIds: episode.provenance.sourceNativeIds,
    spans: episode.provenance.spans,
  }),
  (episode) => episode.actions.map((action) => action.arguments.map((argument) => argument.value)),
  (episode) => episode.request.visibleText,
  (episode) => episode.actions.map((action) => action.actionId),
  (episode) => episode.provenance.sourceNativeIds,
  (episode) => ({
    feedback: episode.feedback,
    preferences: episode.preferences,
  }),
]);

const CONTROL_TARGETS = Object.freeze([
  (episode) => ({
    request: {
      operationKinds: episode.request.operationKinds,
      artifactKind: episode.request.artifactKind,
      requiredCapabilities: episode.request.requiredCapabilities,
    },
    actions: episode.actions.map((action) => ({
      phase: action.phase, kind: action.kind, errorKind: action.errorKind,
    })),
    feedbackAxes: episode.feedback.map((item) => item.axis),
    preferenceAxes: episode.preferences.map((item) => item.axes),
    outcome: episode.outcome,
  }),
  (episode) => episode.request.constraintKinds,
  (episode) => episode.outcome.witnessAvailable,
]);

function auditedVariant(transformId, episode, apply, target) {
  const targetBeforeDigest = digest({ transformId, target: target(episode) });
  const variant = apply(episode);
  const targetAfterDigest = digest({ transformId, target: target(variant) });
  return {
    transformId,
    episode: variant,
    episodeContentDigest: researchEpisodeContentDigest(variant),
    targetBeforeDigest,
    targetAfterDigest,
    applied: targetBeforeDigest !== targetAfterDigest,
    features: projectResearchEpisodeFeatures(variant),
  };
}

function compactVariant(variant, baselineSemanticDigest, preserving) {
  return {
    transformId: variant.transformId,
    applied: variant.applied,
    episodeContentDigest: variant.episodeContentDigest,
    targetBeforeDigest: variant.targetBeforeDigest,
    targetAfterDigest: variant.targetAfterDigest,
    semanticDigest: variant.features.semanticDigest,
    passed: variant.applied && (preserving
      ? variant.features.semanticDigest === baselineSemanticDigest
      : variant.features.semanticDigest !== baselineSemanticDigest),
  };
}

function compactVariants(transformIds, transforms, targets, episode, baselineSemanticDigest,
  preserving) {
  return transformIds.map((transformId, index) => compactVariant(
    auditedVariant(transformId, episode, transforms[index], targets[index]),
    baselineSemanticDigest,
    preserving,
  ));
}

export function projectCompactResearchMetamorphicAudit(episode) {
  assertResearchEpisode(episode);
  const baseline = projectResearchEpisodeFeatures(episode);
  const baselineEpisodeContentDigest = researchEpisodeContentDigest(episode);
  return {
    features: baseline,
    metamorphicAudit: {
      baselineEpisodeContentDigest,
      baselineSemanticDigest: baseline.semanticDigest,
      preserving: compactVariants(
        RESEARCH_PRESERVING_TRANSFORMS, PRESERVING_TRANSFORMS, PRESERVING_TARGETS,
        episode, baseline.semanticDigest, true,
      ),
      controls: compactVariants(
        RESEARCH_MEANING_CHANGING_CONTROLS, CONTROL_TRANSFORMS, CONTROL_TARGETS,
        episode, baseline.semanticDigest, false,
      ),
    },
  };
}

export function auditResearchEpisodeMetamorphs(episode) {
  assertResearchEpisode(episode);
  const baseline = projectResearchEpisodeFeatures(episode);
  const baselineEpisodeContentDigest = researchEpisodeContentDigest(episode);
  const preservingVariants = RESEARCH_PRESERVING_TRANSFORMS.map((transformId, index) =>
    auditedVariant(transformId, episode, PRESERVING_TRANSFORMS[index], PRESERVING_TARGETS[index]));
  const controlVariants = RESEARCH_MEANING_CHANGING_CONTROLS.map((transformId, index) =>
    auditedVariant(transformId, episode, CONTROL_TRANSFORMS[index], CONTROL_TARGETS[index]));
  return {
    format: RESEARCH_METAMORPHIC_AUDIT_PROTOCOL,
    baseline,
    baselineEpisodeContentDigest,
    preservingVariants,
    controlVariants,
    preservationComplete: preservingVariants.filter((item) => item.applied).every((item) =>
      item.features.semanticDigest === baseline.semanticDigest),
    controlsDiscriminated: controlVariants.filter((item) => item.applied).every((item) =>
      item.features.semanticDigest !== baseline.semanticDigest),
  };
}

export function compactResearchMetamorphicAudit(audit) {
  if (audit?.format !== RESEARCH_METAMORPHIC_AUDIT_PROTOCOL) {
    throw new TypeError('Research metamorphic audit protocol is unsupported.');
  }
  return {
    baselineEpisodeContentDigest: audit.baselineEpisodeContentDigest,
    baselineSemanticDigest: audit.baseline.semanticDigest,
    preserving: audit.preservingVariants.map((variant) =>
      compactVariant(variant, audit.baseline.semanticDigest, true)),
    controls: audit.controlVariants.map((variant) =>
      compactVariant(variant, audit.baseline.semanticDigest, false)),
  };
}

export function researchMetamorphicAuditDigest(compactAudit) {
  return digest({
    format: RESEARCH_METAMORPHIC_COMMITMENT_PROTOCOL,
    audit: compactAudit,
  });
}
