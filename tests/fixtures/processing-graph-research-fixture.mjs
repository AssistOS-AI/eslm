import { sha256, stableStringify } from '../../src/util.mjs';
import {
  RESEARCH_COMPONENT_PROTOCOL,
  RESEARCH_EPISODE_PROTOCOL,
  RESEARCH_SOURCE_PROTOCOL,
  createResearchEpisode,
  createResearchSourceRegistry,
  researchEpisodeContentMember,
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
} from '../../src/research/processing-graph-research.mjs';

const TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'summarization', operations: ['summarize'], artifact: 'summary', axis: 'completeness',
    constraints: ['length', 'source-grounding'], capabilities: ['construct', 'parse', 'retrieve'],
    obligations: ['cited', 'concise'], steps: [
      ['parse-request', 'interpret'], ['retrieve-evidence', 'acquire'],
      ['summarize-evidence', 'construct'], ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'comparison', operations: ['compare', 'construct'], artifact: 'comparison', axis: 'relevance',
    constraints: ['completeness', 'format'], capabilities: ['construct', 'parse', 'reason', 'retrieve'],
    obligations: ['complete', 'schema-valid'], steps: [
      ['parse-request', 'interpret'], ['retrieve-evidence', 'acquire'],
      ['compare-items', 'reason'], ['construct-output', 'construct'],
      ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'planning', operations: ['plan', 'construct'], artifact: 'plan', axis: 'procedural',
    constraints: ['ordering', 'resource'], capabilities: ['construct', 'parse', 'reason'],
    obligations: ['ordered', 'schema-valid'], steps: [
      ['parse-request', 'interpret'], ['decompose-task', 'plan'], ['build-plan', 'plan'],
      ['construct-output', 'construct'], ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'tool-like', operations: ['plan', 'invoke-tool', 'verify'], artifact: 'action-result', axis: 'safety',
    constraints: ['resource', 'safety'], capabilities: ['parse', 'tool-access', 'verify'],
    obligations: ['safe', 'verified'], steps: [
      ['parse-request', 'interpret'], ['build-plan', 'plan'], ['select-tool', 'plan'],
      ['propose-action', 'execute'], ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'reasoning', operations: ['acquire-evidence', 'reason', 'verify', 'construct'],
    artifact: 'derivation', axis: 'factuality', constraints: ['consistency', 'source-grounding'],
    capabilities: ['construct', 'parse', 'reason', 'retrieve', 'verify'],
    obligations: ['cited', 'verified'], steps: [
      ['parse-request', 'interpret'], ['retrieve-evidence', 'acquire'], ['reason-step', 'reason'],
      ['validate-witness', 'verify'], ['construct-output', 'construct'],
    ],
  }),
  Object.freeze({
    id: 'verification', operations: ['verify', 'construct'], artifact: 'verification-report',
    axis: 'factuality', constraints: ['consistency'], capabilities: ['construct', 'parse', 'verify'],
    obligations: ['schema-valid', 'verified'], steps: [
      ['parse-request', 'interpret'], ['validate-witness', 'verify'],
      ['construct-output', 'construct'], ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'repair', operations: ['construct', 'verify', 'repair', 'verify'],
    artifact: 'repaired-artifact', axis: 'presentation', constraints: ['format'],
    capabilities: ['construct', 'parse', 'repair', 'verify'], obligations: ['schema-valid', 'verified'],
    failedStep: 1, steps: [
      ['parse-request', 'interpret'], ['construct-output', 'construct'],
      ['detect-error', 'verify'], ['repair-step', 'repair'], ['validate-output', 'verify'],
    ],
  }),
  Object.freeze({
    id: 'construction', operations: ['plan', 'construct', 'verify'], artifact: 'document', axis: 'style',
    constraints: ['format', 'length', 'ordering'], capabilities: ['construct', 'parse', 'verify'],
    obligations: ['complete', 'ordered', 'schema-valid'], steps: [
      ['parse-request', 'interpret'], ['decompose-task', 'plan'],
      ['construct-output', 'construct'], ['validate-output', 'verify'],
    ],
  }),
]);

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function sourceEntries(namespace) {
  return Array.from({ length: 3 }, (_, index) => {
    const sourceId = `${namespace}-source-${index + 1}`;
    return {
      format: RESEARCH_SOURCE_PROTOCOL,
      sourceId,
      revision: '1.0.0',
      owner: 'ESLM repository synthetic research fixture',
      officialUrl: `https://assistos-ai.github.io/eslm/research/${sourceId}`,
      citation: `Repository-owned synthetic processing-graph fixture ${index + 1}.`,
      independenceGroup: `${namespace}-independence-${index + 1}`,
      identity: {
        sha256: digest({ sourceId, kind: 'synthetic-source' }), bytes: 16_384,
        mediaType: 'application/jsonl',
      },
      registryState: 'pilot-approved',
    };
  });
}

function fixtureRecordDigest(namespace, template, occurrence) {
  const lexicalStem = `${namespace}-${template.id}-${occurrence}`;
  return digest({ namespace, template: template.id, occurrence, lexicalStem });
}

function componentEntries(namespace, sources, rowsPerSource, assignments) {
  return sources.map((source, index) => {
    const componentId = 'episodes';
    const projectionId = `${namespace}-projection-${index + 1}`;
    return {
      format: RESEARCH_COMPONENT_PROTOCOL,
      sourceId: source.sourceId,
      componentId,
      revision: source.revision,
      kind: 'synthetic-episodes',
      identity: {
        sha256: digest({ sourceId: source.sourceId, componentId, kind: 'component' }),
        rows: rowsPerSource[index],
      },
      rights: {
        state: 'approved', licenseId: 'mit',
        allowedUses: ['processing-graph-discovery'], redistribution: 'allowed',
      },
      visibility: [{ split: 'training', visibility: 'training-visible' }],
      projection: {
        projectionId,
        membershipDigest: researchProjectionMembershipDigest(
          projectionId,
          assignments.filter((item) => item.sourceIndex === index)
            .map((item) => fixtureRecordDigest(namespace, item.template, item.occurrence)),
          rowsPerSource[index],
        ),
        contentMembershipDigest: digest({ namespace, sourceIndex: index, pending: true }),
        rows: rowsPerSource[index],
        shardCount: 1,
        shardFormat: 'synthetic-memory',
        allowedFields: ['action-structure', 'feedback-axes', 'request-structure'],
        excludedFields: ['executable-commands', 'runtime-authority'],
        privacyReview: 'not-applicable', safetyReview: 'passed',
      },
    };
  });
}

const STATE_DELTA = Object.freeze({
  'parse-request': 'request-structured',
  'decompose-task': 'plan-created',
  'build-plan': 'plan-created',
  'retrieve-evidence': 'evidence-added',
  'compare-items': 'derivation-added',
  'summarize-evidence': 'artifact-constructed',
  'select-tool': 'action-selected',
  'propose-action': 'action-selected',
  'reason-step': 'derivation-added',
  'validate-witness': 'witness-validated',
  'detect-error': 'error-recorded',
  'repair-step': 'repair-applied',
  'construct-output': 'artifact-constructed',
  'validate-output': 'output-validated',
});

function actionsFor(template, lexicalStem) {
  return template.steps.map(([kind, phase], index) => {
    const failed = template.failedStep === index;
    const role = kind === 'select-tool' ? 'tool' : kind === 'retrieve-evidence' ? 'source' : 'target';
    return {
      actionId: `a${String(index).padStart(2, '0')}`,
      ordinal: index,
      phase,
      kind,
      arguments: [{
        role,
        valueKind: role === 'tool' ? 'identifier' : role === 'source' ? 'text' : 'entity',
        value: `${lexicalStem}-${kind}`,
      }],
      dependsOn: index === 0 ? [] : [`a${String(index - 1).padStart(2, '0')}`],
      stateDeltaKinds: [STATE_DELTA[kind]],
      outcome: failed ? 'failed' : 'succeeded',
      errorKind: failed ? 'output-shape-violation' : 'none',
      witnessKind: kind === 'validate-witness'
        ? 'symbolic-proof'
        : kind === 'validate-output' ? 'schema-check' : 'none',
    };
  });
}

function createEpisode({ namespace, template, occurrence, source, component, ordinal }) {
  const lexicalStem = `${namespace}-${template.id}-${occurrence}`;
  const actions = actionsFor(template, lexicalStem);
  const visibleText = `${lexicalStem}: complete the ${template.id} task over project-owned synthetic material.`;
  return createResearchEpisode({
    format: RESEARCH_EPISODE_PROTOCOL,
    episodeId: `${namespace}-episode-${String(ordinal + 1).padStart(2, '0')}`,
    source: {
      sourceId: source.sourceId,
      componentId: component.componentId,
      revision: source.revision,
      componentDigest: component.identity.sha256,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      split: 'training',
      visibility: 'training-visible',
      licenseId: component.rights.licenseId,
      rightsState: component.rights.state,
    },
    request: {
      visibleText,
      operationKinds: template.operations,
      artifactKind: template.artifact,
      constraintKinds: template.constraints,
      requiredCapabilities: template.capabilities,
      outputObligations: template.obligations,
    },
    initialState: { stateKinds: ['request-state'], unknownKinds: ['evidence-state'] },
    observations: [
      {
        observationId: 'o00', ordinal: 0, phase: 'interpret', kind: 'request',
        stateDeltaKinds: ['request-structured'],
      },
      {
        observationId: 'o01', ordinal: 1,
        phase: template.steps.some(([, phase]) => phase === 'acquire') ? 'acquire' : 'plan',
        kind: template.steps.some(([, phase]) => phase === 'acquire') ? 'evidence' : 'state',
        stateDeltaKinds: template.steps.some(([, phase]) => phase === 'acquire')
          ? ['evidence-added'] : ['plan-created'],
      },
    ],
    actions,
    outcome: {
      status: 'succeeded', resultKind: template.artifact, failureKind: 'none',
      witnessAvailable: actions.some((item) => item.witnessKind !== 'none'),
      criteriaKinds: template.obligations,
    },
    feedback: [{
      feedbackId: 'f00', targetKind: 'outcome', targetId: null, axis: template.axis,
      polarity: template.id === 'repair' ? 'negative' : 'positive',
      strength: template.id === 'repair' ? 0.8 : 0.7,
      sourceKind: 'synthetic',
    }],
    preferences: [{
      preferenceId: 'p00', candidateKinds: ['output', 'output'], preferredIndex: 0,
      axes: [template.axis], disagreement: template.id === 'comparison' && occurrence === 1,
    }],
    provenance: {
      recordDigest: fixtureRecordDigest(namespace, template, occurrence),
      sourceNativeIds: [`native-${template.id}-${occurrence}`], spans: [],
    },
    governance: {
      truthStatus: 'observed', epistemicStatus: 'mixed', safetyTags: ['synthetic-only'],
      privacyTags: ['no-personal-data'], projectionLosses: ['lexical-content-excluded'],
    },
    work: {
      sourceBytes: Buffer.byteLength(visibleText, 'utf8') + actions.length * 48,
      tokens: visibleText.split(/\s+/u).length + actions.length * 3,
      actions: actions.length,
      dependencies: Math.max(0, actions.length - 1),
      complete: true,
    },
  });
}

export function createSyntheticProcessingGraphResearchFixture({
  namespace = 'synthetic', occurrencesPerTemplate = 2,
} = {}) {
  if (!Number.isSafeInteger(occurrencesPerTemplate)
      || occurrencesPerTemplate < 1 || occurrencesPerTemplate > 1_024) {
    throw new TypeError('Synthetic research fixture occurrencesPerTemplate must be between 1 and 1,024.');
  }
  const assignments = TEMPLATES.flatMap((template, templateIndex) =>
    Array.from({ length: occurrencesPerTemplate }, (_, occurrence) => ({
      template, occurrence, sourceIndex: (templateIndex + occurrence) % 3,
    })));
  const rowsPerSource = Array(3).fill(0);
  for (const assignment of assignments) rowsPerSource[assignment.sourceIndex] += 1;
  const sources = sourceEntries(namespace);
  const components = componentEntries(namespace, sources, rowsPerSource, assignments);
  const episodes = assignments.map((assignment, ordinal) => createEpisode({
    namespace,
    template: assignment.template,
    occurrence: assignment.occurrence,
    source: sources[assignment.sourceIndex],
    component: components[assignment.sourceIndex],
    ordinal,
  }));
  for (const [index, component] of components.entries()) {
    component.visibility = [{
      split: 'training', visibility: 'training-visible',
      rowsDeclared: rowsPerSource[index], rowsAdmitted: rowsPerSource[index],
    }];
    const members = episodes.filter((episode) => episode.source.sourceId === component.sourceId);
    component.projection.contentMembershipDigest = researchProjectionContentMembershipDigest(
      component.projection.projectionId,
      members.map(researchEpisodeContentMember), component.identity.rows,
    );
  }
  const registry = createResearchSourceRegistry({ sources, components });
  return { registry, episodes };
}

export function createStructuralNegativeContrast(episode) {
  const contrast = structuredClone(episode);
  contrast.episodeId = `${episode.episodeId}-contrast`;
  contrast.request.operationKinds = ['verify', ...contrast.request.operationKinds];
  contrast.actions[1].phase = 'execute';
  contrast.actions[1].dependsOn = [];
  contrast.provenance.recordDigest = digest({ contrastOf: episode.provenance.recordDigest });
  contrast.provenance.sourceNativeIds = ['native-negative-contrast'];
  contrast.work.dependencies -= 1;
  return createResearchEpisode(contrast);
}
