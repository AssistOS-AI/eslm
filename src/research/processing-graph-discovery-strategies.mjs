import { sha256, stableStringify } from '../util.mjs';
import {
  RESEARCH_MEANING_CHANGING_CONTROLS,
  RESEARCH_METAMORPHIC_AUDIT_PROTOCOL,
  RESEARCH_PRESERVING_TRANSFORMS,
} from './research-metamorphic-controls.mjs';

export const PROCESSING_GRAPH_DISCOVERY_TECHNIQUES = Object.freeze([
  Object.freeze({
    id: 'task-frame-induction-v1', correlationGroup: 'task-structure',
    hypothesisType: 'coordination-node',
  }),
  Object.freeze({
    id: 'typed-operation-responsibility-v1', correlationGroup: 'typed-operation-responsibility',
    hypothesisType: 'processing-node',
  }),
  Object.freeze({
    id: 'phase-change-point-v1', correlationGroup: 'trajectory-boundary',
    hypothesisType: 'edge',
  }),
  Object.freeze({
    id: 'earliest-error-v1', correlationGroup: 'failure-localization',
    hypothesisType: 'authority-gate',
  }),
  Object.freeze({
    id: 'partial-order-motif-v1', correlationGroup: 'dependency-structure',
    hypothesisType: 'packet-field',
  }),
  Object.freeze({
    id: 'bounded-subcircuit-motif-v1', correlationGroup: 'hierarchical-subcircuit-structure',
    hypothesisType: 'nested-circuit',
  }),
  Object.freeze({
    id: 'preference-axis-v1', correlationGroup: 'quality-feedback',
    hypothesisType: 'strategy',
  }),
  Object.freeze({
    id: 'metamorphic-recurrence-v1', correlationGroup: 'metamorphic-invariance',
    hypothesisType: 'cross-type-support',
    transformProtocol: RESEARCH_METAMORPHIC_AUDIT_PROTOCOL,
    preservingTransformIds: RESEARCH_PRESERVING_TRANSFORMS,
    controlTransformIds: RESEARCH_MEANING_CHANGING_CONTROLS,
  }),
  Object.freeze({
    id: 'cross-source-recurrence-v1', correlationGroup: 'cross-source-independence',
    hypothesisType: 'cross-type-support',
  }),
]);

const DESCRIPTORS = new Map(PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.map((item) => [item.id, item]));

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function canonicalCandidate(type, responsibility, placement, {
  inputKinds = [], outputKinds = [], invariant = 'none', failureKinds = [],
  resourceDimensions = [],
} = {}) {
  return {
    type,
    responsibility,
    placement: {
      earliestAfter: placement.earliestAfter,
      latestBefore: placement.latestBefore,
      owner: placement.owner,
    },
    inputKinds: [...new Set(inputKinds)].toSorted(),
    outputKinds: [...new Set(outputKinds)].toSorted(),
    invariant,
    failureKinds: [...new Set(failureKinds)].toSorted(),
    resourceDimensions: [...new Set(resourceDimensions)].toSorted(),
  };
}

function taskFrameEvents(records) {
  return records.map((record) => {
    const { request } = record.features;
    return {
      candidate: canonicalCandidate('coordination-node', 'coordinate-typed-task-frame', {
        earliestAfter: 'language-interpretation', latestBefore: 'method-planning',
        owner: 'request-coordination',
      }, {
        inputKinds: [
          ...request.operationKinds.map((item) => `operation:${item}`),
          ...request.requiredCapabilities.map((item) => `capability:${item}`),
          ...request.constraintKinds.map((item) => `constraint:${item}`),
        ],
        outputKinds: [
          `artifact:${request.artifactKind}`,
          ...request.outputObligations.map((item) => `obligation:${item}`),
        ],
        invariant: `ordered-task-frame:${request.operationKinds.join('+')}`,
        failureKinds: ['unsupported-operation', 'unsatisfied-capability'],
        resourceDimensions: ['operations', 'subgoals'],
      }),
      direction: 'support', confidence: 0.68, record,
    };
  });
}

function typedOperationEvents(records) {
  return records.flatMap((record) => record.features.request.operationKinds.map((operation) => ({
    candidate: canonicalCandidate('processing-node', `process-typed-operation:${operation}`, {
      earliestAfter: 'request-coordination', latestBefore: 'result-construction',
      owner: 'typed-operation-processing',
    }, {
      inputKinds: [
        `operation:${operation}`,
        ...record.features.request.requiredCapabilities.map((item) => `capability:${item}`),
      ],
      outputKinds: [`artifact:${record.features.request.artifactKind}`],
      invariant: `typed-operation-responsibility:${operation}`,
      failureKinds: ['unsupported-operation', 'unsatisfied-capability'],
      resourceDimensions: ['actions', 'operations'],
    }),
    direction: 'support', confidence: 0.66, record,
  })));
}

function phaseEvents(records) {
  return records.flatMap((record) => record.features.trajectory.phaseSequence.slice(1)
    .map((toPhase, index) => {
      const fromPhase = record.features.trajectory.phaseSequence[index];
      return {
        candidate: canonicalCandidate('edge', 'carry-typed-phase-transition', {
          earliestAfter: `phase:${fromPhase}`, latestBefore: `phase:${toPhase}`,
          owner: 'trajectory-coordination',
        }, {
          inputKinds: [`phase-state:${fromPhase}`], outputKinds: [`phase-state:${toPhase}`],
          invariant: `transition:${fromPhase}->${toPhase}`,
          failureKinds: ['invalid-transition'], resourceDimensions: ['transitions'],
        }),
        direction: 'support', confidence: 0.62, record,
      };
    }));
}

function earliestErrorEvents(records) {
  return records.filter((record) => record.features.earliestError).map((record) => {
    const error = record.features.earliestError;
    return {
      candidate: canonicalCandidate('authority-gate', 'check-earliest-typed-failure-boundary', {
        earliestAfter: `phase:${error.phase}`, latestBefore: `action:${error.actionKind}`,
        owner: 'authority-validation',
      }, {
        inputKinds: [`action:${error.actionKind}`, `error:${error.errorKind}`],
        outputKinds: ['gate:accept-reject-gap'], invariant: `reject:${error.errorKind}`,
        failureKinds: [error.errorKind], resourceDimensions: ['checks'],
      }),
      direction: 'support', confidence: 0.72, record,
    };
  });
}

function partialOrderEvents(records) {
  return records.flatMap((record) => record.features.dependencyMotifs.map((motif) => ({
    candidate: canonicalCandidate('packet-field', 'preserve-typed-action-dependency', {
      earliestAfter: `action:${motif.fromKind}`, latestBefore: `action:${motif.toKind}`,
      owner: 'episode-envelope',
    }, {
      inputKinds: [`action:${motif.fromKind}`], outputKinds: [`dependency:${motif.toKind}`],
      invariant: `requires:${motif.fromKind}->${motif.toKind}`,
      failureKinds: ['missing-dependency', 'dependency-cycle'],
      resourceDimensions: ['dependencies'],
    }),
    direction: 'support', confidence: Math.min(0.78, 0.58 + motif.count * 0.04), record,
  })));
}

function boundedSubcircuitEvents(records) {
  return records.flatMap((record) => record.features.dependencyMotifs.map((motif) => ({
    candidate: canonicalCandidate('nested-circuit', 'encapsulate-bounded-phase-dependency-subcircuit', {
      earliestAfter: `phase:${motif.fromPhase}`, latestBefore: `phase:${motif.toPhase}`,
      owner: 'hierarchical-processing',
    }, {
      inputKinds: [`action:${motif.fromKind}`, `phase-state:${motif.fromPhase}`],
      outputKinds: [`action:${motif.toKind}`, `phase-state:${motif.toPhase}`],
      invariant: `bounded-subcircuit:${motif.fromPhase}/${motif.fromKind}`
        + `->${motif.toPhase}/${motif.toKind}`,
      failureKinds: ['invalid-transition', 'missing-dependency'],
      resourceDimensions: ['dependencies', 'nested-nodes'],
    }),
    direction: 'support', confidence: Math.min(0.8, 0.6 + motif.count * 0.04), record,
  })));
}

function preferenceEvents(records) {
  return records.flatMap((record) => {
    const axes = new Map();
    for (const item of record.features.feedbackAxes) {
      const current = axes.get(item.axis) ?? { support: 0, opposition: 0, strength: 0 };
      current.support += item.positiveCount + item.negativeCount;
      current.strength = Math.max(current.strength, item.maximumStrength);
      axes.set(item.axis, current);
    }
    for (const item of record.features.preferenceAxes) {
      const current = axes.get(item.axis) ?? { support: 0, opposition: 0, strength: 0 };
      current.support += item.decided;
      current.opposition += item.disagreements;
      current.strength = Math.max(current.strength, item.comparisons === 0 ? 0 : 0.5);
      axes.set(item.axis, current);
    }
    return [...axes].flatMap(([axis, counts]) => {
      const candidate = canonicalCandidate('strategy', 'rank-result-construction-candidates', {
        earliestAfter: 'candidate-construction', latestBefore: 'result-validation',
        owner: 'result-construction',
      }, {
        inputKinds: [`quality-axis:${axis}`, 'candidate-set'], outputKinds: ['ranked-candidates'],
        invariant: `preserve-authority-while-ranking:${axis}`,
        failureKinds: ['unsupported-preference', 'authority-overreach'],
        resourceDimensions: ['candidates', 'comparisons'],
      });
      const events = [];
      if (counts.support > 0) events.push({
        candidate, direction: 'support', confidence: Math.min(0.82, 0.55 + counts.strength * 0.2), record,
      });
      if (counts.opposition > 0) events.push({
        candidate, direction: 'oppose', confidence: Math.min(0.7, 0.35 + counts.opposition * 0.1), record,
      });
      return events;
    });
  });
}

const EVENT_BUILDERS = new Map([
  ['task-frame-induction-v1', taskFrameEvents],
  ['typed-operation-responsibility-v1', typedOperationEvents],
  ['phase-change-point-v1', phaseEvents],
  ['earliest-error-v1', earliestErrorEvents],
  ['partial-order-motif-v1', partialOrderEvents],
  ['bounded-subcircuit-motif-v1', boundedSubcircuitEvents],
  ['preference-axis-v1', preferenceEvents],
]);

function groupEvents(events, techniqueId) {
  const descriptor = DESCRIPTORS.get(techniqueId);
  const groups = new Map();
  for (const event of events) {
    const candidateDigest = digest(event.candidate);
    const key = `${candidateDigest}:${event.direction}`;
    const group = groups.get(key) ?? {
      techniqueId, correlationGroup: descriptor.correlationGroup,
      candidate: event.candidate, direction: event.direction, confidences: [], records: [],
    };
    group.confidences.push(event.confidence);
    group.records.push(event.record);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const evidenceMembership = [...new Map(group.records.map((item) => [
      item.evidenceDigest,
      { evidenceDigest: item.evidenceDigest, independenceGroup: item.independenceGroup },
    ])).values()].toSorted((left, right) =>
      left.evidenceDigest.localeCompare(right.evidenceDigest));
    return {
      techniqueId: group.techniqueId,
      correlationGroup: group.correlationGroup,
      candidate: group.candidate,
      direction: group.direction,
      confidence: Number((group.confidences.reduce((sum, value) => sum + value, 0)
        / group.confidences.length).toFixed(6)),
      evidenceCount: evidenceMembership.length,
      episodeSemanticDigests: [...new Set(group.records
        .map((item) => item.features.semanticDigest))].toSorted(),
      evidenceDigests: [...new Set(group.records.map((item) => item.evidenceDigest))].toSorted(),
      evidenceMembership,
      independenceGroups: [...new Set(group.records.map((item) => item.independenceGroup))].toSorted(),
    };
  }).toSorted((left, right) => {
    const candidate = digest(left.candidate).localeCompare(digest(right.candidate));
    return candidate || left.direction.localeCompare(right.direction);
  });
}

function eventsForRecord(record) {
  return [...EVENT_BUILDERS].flatMap(([techniqueId, builder]) => builder([record])
    .map((event) => ({ ...event, sourceTechniqueId: techniqueId })));
}

function eventSignature(event) {
  return stableStringify({
    sourceTechniqueId: event.sourceTechniqueId,
    candidate: event.candidate,
    direction: event.direction,
  });
}

function availableMetamorphicEvents(records) {
  return records.flatMap((record) => eventsForRecord(record).map((event) => ({
    ...event,
    record,
  }))).toSorted((left, right) => {
    const candidate = digest(left.candidate).localeCompare(digest(right.candidate));
    return candidate || left.record.evidenceDigest.localeCompare(right.record.evidenceDigest);
  });
}

export function processingGraphMetamorphicEvidenceDigests(records, budget) {
  return [...new Set(availableMetamorphicEvents(records).slice(0, budget.maxEvents)
    .map((event) => event.record.evidenceDigest))].toSorted();
}

function runMetamorphicTechnique(records, budget) {
  const techniqueId = 'metamorphic-recurrence-v1';
  const descriptor = DESCRIPTORS.get(techniqueId);
  const availableEvents = availableMetamorphicEvents(records);
  const selectedEvents = availableEvents.slice(0, budget.maxEvents);
  const auditedRecords = [...new Map(selectedEvents.map(({ record }) => [
    record.evidenceDigest,
    { record, audit: record.metamorphicAudit },
  ])).values()];
  if (auditedRecords.some(({ audit }) => !audit)) {
    throw new TypeError('Metamorphic strategy requires every selected compact audit row.');
  }
  const audits = new Map(auditedRecords.map((item) => [item.record.evidenceDigest, item.audit]));
  const visitedEvents = selectedEvents.map((event) => {
    const audit = audits.get(event.record.evidenceDigest);
    const appliedPreserving = audit.preserving.filter((variant) => variant.applied);
    const appliedControls = audit.controls.filter((variant) => variant.applied);
    const supported = appliedPreserving.length > 0 && appliedControls.length > 0
      && appliedPreserving.every((variant) => variant.passed)
      && appliedControls.every((variant) => variant.passed);
    return {
      candidate: event.candidate,
      direction: supported ? 'support' : 'oppose',
      confidence: supported ? 0.74 : 0.78,
      record: event.record,
    };
  });
  const availableProposals = groupEvents(visitedEvents, techniqueId);
  const proposals = availableProposals.slice(0, budget.maxProposals);
  const preservationChecks = auditedRecords.reduce((sum, { audit }) => sum
    + audit.preserving.filter((item) => item.applied).length, 0);
  const preservationFailures = auditedRecords.reduce((sum, { audit }) => sum
    + audit.preserving.filter((item) => item.applied && !item.passed).length, 0);
  const controlChecks = auditedRecords.reduce((sum, { audit }) => sum
    + audit.controls.filter((item) => item.applied).length, 0);
  const controlFailures = auditedRecords.reduce((sum, { audit }) => sum
    + audit.controls.filter((item) => item.applied && !item.passed).length, 0);
  return {
    receipt: {
      techniqueId, correlationGroup: descriptor.correlationGroup,
      transformProtocol: descriptor.transformProtocol,
      preservingTransformIds: descriptor.preservingTransformIds,
      controlTransformIds: descriptor.controlTransformIds,
      preservationChecks,
      preservationFailures,
      controlChecks,
      controlFailures,
      eventsAvailable: availableEvents.length, eventsVisited: visitedEvents.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: availableEvents.length === visitedEvents.length
        && availableProposals.length === proposals.length
        && preservationFailures === 0 && controlFailures === 0,
    },
    proposals,
    auditLedger: auditedRecords.map(({ record, audit }) => ({
      evidenceDigest: record.evidenceDigest,
      ...structuredClone(audit),
    })).toSorted((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest)),
  };
}

function runBaseTechnique(techniqueId, records, budget) {
  const descriptor = DESCRIPTORS.get(techniqueId);
  const availableEvents = EVENT_BUILDERS.get(techniqueId)(records)
    .toSorted((left, right) => {
      const candidate = digest(left.candidate).localeCompare(digest(right.candidate));
      return candidate || left.record.evidenceDigest.localeCompare(right.record.evidenceDigest);
    });
  const visitedEvents = availableEvents.slice(0, budget.maxEvents);
  const availableProposals = groupEvents(visitedEvents, techniqueId);
  const proposals = availableProposals.slice(0, budget.maxProposals);
  return {
    receipt: {
      techniqueId, correlationGroup: descriptor.correlationGroup,
      eventsAvailable: availableEvents.length, eventsVisited: visitedEvents.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: availableEvents.length === visitedEvents.length
        && availableProposals.length === proposals.length,
    },
    proposals,
  };
}

function runCrossSourceTechnique(baseProposals, budget) {
  const techniqueId = 'cross-source-recurrence-v1';
  const descriptor = DESCRIPTORS.get(techniqueId);
  const grouped = new Map();
  for (const proposal of baseProposals.filter((item) => item.direction === 'support')) {
    const key = digest(proposal.candidate);
    const group = grouped.get(key) ?? { candidate: proposal.candidate, proposals: [] };
    group.proposals.push(proposal);
    grouped.set(key, group);
  }
  // Recurrence exists only when one exact source-neutral candidate is supported by
  // independently collected lineages. Single-lineage candidates are not events for
  // this technique; counting them as visited would overstate transfer evidence.
  const availableEvents = [...grouped.values()].filter((event) =>
    new Set(event.proposals.flatMap((item) => item.independenceGroups)).size >= 2)
    .toSorted((left, right) => digest(left.candidate).localeCompare(digest(right.candidate)));
  const visitedEvents = availableEvents.slice(0, budget.maxEvents);
  const availableProposals = visitedEvents.flatMap((event) => {
    const independenceGroups = [...new Set(event.proposals.flatMap((item) => item.independenceGroups))].toSorted();
    return [{
      techniqueId, correlationGroup: descriptor.correlationGroup,
      candidate: event.candidate, direction: 'support',
      confidence: Number(Math.min(0.85, 0.55 + (independenceGroups.length - 1) * 0.1).toFixed(6)),
      evidenceCount: event.proposals.reduce((sum, item) => sum + item.evidenceCount, 0),
      episodeSemanticDigests: [...new Set(event.proposals
        .flatMap((item) => item.episodeSemanticDigests))].toSorted(),
      evidenceDigests: [...new Set(event.proposals.flatMap((item) => item.evidenceDigests))].toSorted(),
      independenceGroups,
      evidenceMembership: [...new Map(event.proposals
        .flatMap((item) => item.evidenceMembership)
        .map((item) => [item.evidenceDigest, item])).values()].toSorted((left, right) =>
        left.evidenceDigest.localeCompare(right.evidenceDigest)),
    }];
  });
  const proposals = availableProposals.slice(0, budget.maxProposals);
  return {
    receipt: {
      techniqueId, correlationGroup: descriptor.correlationGroup,
      eventsAvailable: availableEvents.length, eventsVisited: visitedEvents.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: availableEvents.length === visitedEvents.length
        && availableProposals.length === proposals.length,
    },
    proposals,
  };
}

export function runProcessingGraphDiscoveryStrategies(records, techniqueBudgets) {
  const runs = [];
  const baseProposals = [];
  for (const descriptor of PROCESSING_GRAPH_DISCOVERY_TECHNIQUES.filter((item) =>
    EVENT_BUILDERS.has(item.id))) {
    const run = runBaseTechnique(descriptor.id, records, techniqueBudgets[descriptor.id]);
    runs.push(run.receipt);
    baseProposals.push(...run.proposals);
  }
  const metamorphic = runMetamorphicTechnique(
    records, techniqueBudgets['metamorphic-recurrence-v1'],
  );
  runs.push(metamorphic.receipt);
  const crossSource = runCrossSourceTechnique(
    baseProposals, techniqueBudgets['cross-source-recurrence-v1'],
  );
  runs.push(crossSource.receipt);
  return {
    receipts: runs,
    proposals: [...baseProposals, ...metamorphic.proposals, ...crossSource.proposals],
    metamorphicAuditLedger: metamorphic.auditLedger,
  };
}
