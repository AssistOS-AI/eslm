import { sha256, stable } from './contract-helpers.mjs';
import {
  DISCOVERY_TECHNIQUES,
  MEANING_CHANGING_CONTROLS,
  PRESERVING_TRANSFORMS,
} from './research-contract.mjs';

const DESCRIPTORS = new Map(DISCOVERY_TECHNIQUES.map((item) => [item.id, item]));
const digest = (value) => sha256(stable(value));

function candidate(type, responsibility, placement, {
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
      candidate: candidate('coordination-node', 'coordinate-typed-task-frame', {
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
    candidate: candidate('processing-node', `process-typed-operation:${operation}`, {
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
        candidate: candidate('edge', 'carry-typed-phase-transition', {
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
      candidate: candidate('authority-gate', 'check-earliest-typed-failure-boundary', {
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
    candidate: candidate('packet-field', 'preserve-typed-action-dependency', {
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
    candidate: candidate('nested-circuit', 'encapsulate-bounded-phase-dependency-subcircuit', {
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
      const value = candidate('strategy', 'rank-result-construction-candidates', {
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
        candidate: value, direction: 'support',
        confidence: Math.min(0.82, 0.55 + counts.strength * 0.2), record,
      });
      if (counts.opposition > 0) events.push({
        candidate: value, direction: 'oppose',
        confidence: Math.min(0.7, 0.35 + counts.opposition * 0.1), record,
      });
      return events;
    });
  });
}

const BUILDERS = new Map([
  ['task-frame-induction-v1', taskFrameEvents],
  ['typed-operation-responsibility-v1', typedOperationEvents],
  ['phase-change-point-v1', phaseEvents],
  ['earliest-error-v1', earliestErrorEvents],
  ['partial-order-motif-v1', partialOrderEvents],
  ['bounded-subcircuit-motif-v1', boundedSubcircuitEvents],
  ['preference-axis-v1', preferenceEvents],
]);

function groupEvents(events, techniqueId) {
  const groups = new Map();
  for (const event of events) {
    const key = `${digest(event.candidate)}:${event.direction}`;
    const group = groups.get(key) ?? {
      techniqueId, correlationGroup: DESCRIPTORS.get(techniqueId).correlationGroup,
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
      independenceGroups: [...new Set(group.records
        .map((item) => item.independenceGroup))].toSorted(),
    };
  }).toSorted((left, right) => {
    const order = digest(left.candidate).localeCompare(digest(right.candidate));
    return order || left.direction.localeCompare(right.direction);
  });
}

function recordEvents(record) {
  return [...BUILDERS].flatMap(([techniqueId, builder]) => builder([record])
    .map((event) => ({ ...event, sourceTechniqueId: techniqueId })));
}

function metamorphicEvents(records) {
  return records.flatMap((record) => recordEvents(record).map((event) => ({ ...event, record })))
    .toSorted((left, right) => {
      const order = digest(left.candidate).localeCompare(digest(right.candidate));
      return order || left.record.evidenceDigest.localeCompare(right.record.evidenceDigest);
    });
}

export function metamorphicEvidenceDigests(records, budget) {
  return [...new Set(metamorphicEvents(records).slice(0, budget.maxEvents)
    .map((event) => event.record.evidenceDigest))].toSorted();
}

function baseTechnique(techniqueId, records, budget) {
  const events = BUILDERS.get(techniqueId)(records).toSorted((left, right) => {
    const order = digest(left.candidate).localeCompare(digest(right.candidate));
    return order || left.record.evidenceDigest.localeCompare(right.record.evidenceDigest);
  });
  const visited = events.slice(0, budget.maxEvents);
  const availableProposals = groupEvents(visited, techniqueId);
  const proposals = availableProposals.slice(0, budget.maxProposals);
  return {
    receipt: {
      techniqueId, correlationGroup: DESCRIPTORS.get(techniqueId).correlationGroup,
      eventsAvailable: events.length, eventsVisited: visited.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: events.length === visited.length && availableProposals.length === proposals.length,
    },
    proposals,
  };
}

function metamorphicTechnique(records, budget) {
  const techniqueId = 'metamorphic-recurrence-v1';
  const events = metamorphicEvents(records);
  const selected = events.slice(0, budget.maxEvents);
  const audited = [...new Map(selected.map(({ record }) => [
    record.evidenceDigest, { record, audit: record.metamorphicAudit },
  ])).values()];
  if (audited.some(({ audit }) => !audit)) {
    throw new TypeError('Metamorphic strategy requires every selected compact audit row.');
  }
  const audits = new Map(audited.map((item) => [item.record.evidenceDigest, item.audit]));
  const visited = selected.map((event) => {
    const audit = audits.get(event.record.evidenceDigest);
    const preserving = audit.preserving.filter((variant) => variant.applied);
    const controls = audit.controls.filter((variant) => variant.applied);
    const supported = preserving.length > 0 && controls.length > 0
      && preserving.every((variant) => variant.passed)
      && controls.every((variant) => variant.passed);
    return {
      candidate: event.candidate,
      direction: supported ? 'support' : 'oppose',
      confidence: supported ? 0.74 : 0.78,
      record: event.record,
    };
  });
  const availableProposals = groupEvents(visited, techniqueId);
  const proposals = availableProposals.slice(0, budget.maxProposals);
  const checks = (kind) => audited.reduce((sum, { audit }) =>
    sum + audit[kind].filter((item) => item.applied).length, 0);
  const failures = (kind) => audited.reduce((sum, { audit }) =>
    sum + audit[kind].filter((item) => item.applied && !item.passed).length, 0);
  const preservationChecks = checks('preserving');
  const preservationFailures = failures('preserving');
  const controlChecks = checks('controls');
  const controlFailures = failures('controls');
  return {
    receipt: {
      techniqueId, correlationGroup: DESCRIPTORS.get(techniqueId).correlationGroup,
      transformProtocol: 'eslm-research-episode-metamorphic-audit-v1',
      preservingTransformIds: PRESERVING_TRANSFORMS,
      controlTransformIds: MEANING_CHANGING_CONTROLS,
      preservationChecks, preservationFailures, controlChecks, controlFailures,
      eventsAvailable: events.length, eventsVisited: visited.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: events.length === visited.length && availableProposals.length === proposals.length
        && preservationFailures === 0 && controlFailures === 0,
    },
    proposals,
    auditLedger: audited.map(({ record, audit }) => ({
      evidenceDigest: record.evidenceDigest, ...structuredClone(audit),
    })).toSorted((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest)),
  };
}

function crossSourceTechnique(baseProposals, budget) {
  const techniqueId = 'cross-source-recurrence-v1';
  const grouped = new Map();
  for (const proposal of baseProposals.filter((item) => item.direction === 'support')) {
    const key = digest(proposal.candidate);
    const group = grouped.get(key) ?? { candidate: proposal.candidate, proposals: [] };
    group.proposals.push(proposal);
    grouped.set(key, group);
  }
  const events = [...grouped.values()].filter((event) =>
    new Set(event.proposals.flatMap((item) => item.independenceGroups)).size >= 2)
    .toSorted((left, right) => digest(left.candidate).localeCompare(digest(right.candidate)));
  const visited = events.slice(0, budget.maxEvents);
  const availableProposals = visited.map((event) => {
    const independenceGroups = [...new Set(event.proposals
      .flatMap((item) => item.independenceGroups))].toSorted();
    return {
      techniqueId, correlationGroup: DESCRIPTORS.get(techniqueId).correlationGroup,
      candidate: event.candidate, direction: 'support',
      confidence: Number(Math.min(0.85, 0.55 + (independenceGroups.length - 1) * 0.1).toFixed(6)),
      evidenceCount: event.proposals.reduce((sum, item) => sum + item.evidenceCount, 0),
      episodeSemanticDigests: [...new Set(event.proposals
        .flatMap((item) => item.episodeSemanticDigests))].toSorted(),
      evidenceDigests: [...new Set(event.proposals
        .flatMap((item) => item.evidenceDigests))].toSorted(),
      independenceGroups,
      evidenceMembership: [...new Map(event.proposals
        .flatMap((item) => item.evidenceMembership)
        .map((item) => [item.evidenceDigest, item])).values()].toSorted((left, right) =>
        left.evidenceDigest.localeCompare(right.evidenceDigest)),
    };
  });
  const proposals = availableProposals.slice(0, budget.maxProposals);
  return {
    receipt: {
      techniqueId, correlationGroup: DESCRIPTORS.get(techniqueId).correlationGroup,
      eventsAvailable: events.length, eventsVisited: visited.length,
      proposalsAvailable: availableProposals.length, proposalsRetained: proposals.length,
      complete: events.length === visited.length && availableProposals.length === proposals.length,
    },
    proposals,
  };
}

export function runResearchStrategies(records, techniqueBudgets) {
  const receipts = [];
  const baseProposals = [];
  for (const descriptor of DISCOVERY_TECHNIQUES.filter((item) => BUILDERS.has(item.id))) {
    const run = baseTechnique(descriptor.id, records, techniqueBudgets[descriptor.id]);
    receipts.push(run.receipt);
    baseProposals.push(...run.proposals);
  }
  const metamorphic = metamorphicTechnique(records, techniqueBudgets['metamorphic-recurrence-v1']);
  receipts.push(metamorphic.receipt);
  const crossSource = crossSourceTechnique(
    baseProposals, techniqueBudgets['cross-source-recurrence-v1'],
  );
  receipts.push(crossSource.receipt);
  return {
    receipts,
    proposals: [...baseProposals, ...metamorphic.proposals, ...crossSource.proposals],
    metamorphicAuditLedger: metamorphic.auditLedger,
  };
}
