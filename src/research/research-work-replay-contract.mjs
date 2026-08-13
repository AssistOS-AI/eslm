import { sha256, stableStringify } from '../util.mjs';
import { authorizeResearchEpisode } from './research-source-registry.mjs';
import {
  buildProcessingGraphProposalLedger,
  processingGraphCandidateSignature,
} from './processing-graph-hypothesis-coordinator.mjs';

const WORK_DIMENSIONS = Object.freeze([
  ['sourceBytes', 'maxInputBytes'],
  ['tokens', 'maxTokens'],
  ['actions', 'maxActions'],
  ['dependencies', 'maxDependencies'],
]);

function componentKey(value) {
  return `${value.sourceId}@${value.revision}:${value.componentId}`;
}

function emptyWork() {
  return { episodes: 0, sourceBytes: 0, tokens: 0, actions: 0, dependencies: 0 };
}

function addWork(target, work) {
  target.episodes += 1;
  for (const [dimension] of WORK_DIMENSIONS) target[dimension] += work[dimension];
}

function selectionKey(member, component, seed) {
  return sha256(stableStringify({
    seed,
    episodeId: member.episodeId,
    recordDigest: member.recordDigest,
    episodeContentDigest: member.episodeContentDigest,
    projectionDigest: component.projection.membershipDigest,
  }));
}

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

class CommutativeDigest {
  #count = 0;
  #sum = 0n;
  #xor = 0n;

  add(value) {
    const hash = sha256(value);
    const number = BigInt(`0x${hash}`);
    this.#count += 1;
    this.#sum = (this.#sum + number) % (1n << 256n);
    this.#xor ^= number;
  }

  finish(label) {
    return digest({
      label, count: this.#count,
      sum: this.#sum.toString(16).padStart(64, '0'),
      xor: this.#xor.toString(16).padStart(64, '0'),
    });
  }
}

export function replayResearchMembership(report) {
  const registryComponents = new Map(report.registry.components.map((component) => [
    componentKey(component), component,
  ]));
  const received = report.inputMembership.flatMap((entry) => {
    const component = registryComponents.get(componentKey(entry));
    return entry.members.map((member) => ({
      ...structuredClone(member), component, componentKey: componentKey(entry),
      selectionKey: selectionKey(member, component, report.analysis.seed),
    }));
  });
  const authenticated = report.inputMembership.every((entry) => entry.complete);
  if (!authenticated) return {
    authenticated, received, selected: [], analyzed: [], resourceOmissions: new Map(),
  };
  const selected = received.toSorted((left, right) =>
    left.selectionKey.localeCompare(right.selectionKey))
    .slice(0, report.workPolicy.limits.maxEpisodes);
  const used = Object.fromEntries(WORK_DIMENSIONS.map(([dimension]) => [dimension, 0]));
  const resourceOmissions = new Map();
  const analyzed = selected.filter((member) => {
    const exceeded = WORK_DIMENSIONS.find(([dimension, limit]) =>
      used[dimension] + member.work[dimension] > report.workPolicy.limits[limit]);
    if (exceeded) {
      const reason = `max-${exceeded[0] === 'sourceBytes' ? 'input-bytes' : exceeded[0]}`;
      const rows = resourceOmissions.get(reason) ?? [];
      rows.push(member);
      resourceOmissions.set(reason, rows);
      return false;
    }
    for (const [dimension] of WORK_DIMENSIONS) used[dimension] += member.work[dimension];
    return true;
  });
  return { authenticated, received, selected, analyzed, resourceOmissions };
}

function totals(members) {
  const result = emptyWork();
  for (const member of members) addWork(result, member.work);
  return result;
}

function assertAggregateWork(report, replay) {
  const available = report.registry.components.reduce((sum, component) =>
    sum + component.projection.rows, 0);
  const received = totals(replay.received);
  const selected = totals(replay.selected);
  const analyzed = totals(replay.analyzed);
  const expected = {
    episodesAvailable: available,
    episodesReceived: received.episodes,
    episodesSelected: selected.episodes,
    episodesAnalyzed: analyzed.episodes,
    sourceBytesDeclared: received.sourceBytes,
    sourceBytesSelected: selected.sourceBytes,
    sourceBytesAnalyzed: analyzed.sourceBytes,
    tokensDeclared: received.tokens,
    tokensSelected: selected.tokens,
    tokensAnalyzed: analyzed.tokens,
    actionsDeclared: received.actions,
    actionsSelected: selected.actions,
    actionsAnalyzed: analyzed.actions,
    dependenciesDeclared: received.dependencies,
    dependenciesSelected: selected.dependencies,
    dependenciesAnalyzed: analyzed.dependencies,
    membershipFeatureEvaluations: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.featureEvaluations, 0),
    membershipMetamorphicTransformsAttempted: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.metamorphicTransformsAttempted, 0),
    projectionCommittedMetamorphicTransformsApplied: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.metamorphicTransformsApplied, 0),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (report.work[field] !== value) {
      throw new TypeError(`Research work.${field} does not reproduce from committed members.`);
    }
  }
  if (report.work.episodesReceived > report.workPolicy.limits.maxRowsScanned) {
    throw new TypeError('Research received work exceeds the frozen scan budget.');
  }
}

export function assertResearchFeatureWorkReplay(report, memberships, evidenceLedger) {
  const auditByEvidence = new Map(report.metamorphicAuditLedger.map((row) => [
    row.evidenceDigest,
    [...row.preserving, ...row.controls]
      .filter((variant) => variant.applied).map((variant) => variant.transformId).toSorted(),
  ]));
  for (const row of report.featureLedger) {
    const evidence = evidenceLedger.get(row.evidenceDigest);
    const member = memberships.get(componentKey(evidence)).get(evidence.recordDigest);
    const dependencies = row.features.dependencyMotifs.reduce((sum, motif) => sum + motif.count, 0);
    if (member.work.actions !== row.features.trajectory.actionSignatures.length
        || member.work.dependencies !== dependencies) {
      throw new TypeError('Research member work does not reproduce from committed structural features.');
    }
    const replayedAppliedTransformIds = auditByEvidence.get(row.evidenceDigest);
    if (replayedAppliedTransformIds
        && stableStringify(member.projectionWork.appliedTransformIds)
          !== stableStringify(replayedAppliedTransformIds)) {
      throw new TypeError(
        'Research projection-committed metamorphic applications do not match replayed audit evidence.',
      );
    }
  }
}

function phaseMembers(replay, phase) {
  return phase === 'received' ? replay.received
    : phase === 'selected' ? replay.selected : replay.analyzed;
}

function assertCoverage(report, replay) {
  for (const component of report.coverage.componentProjections) {
    for (const phase of ['received', 'selected', 'analyzed']) {
      const members = phaseMembers(replay, phase).filter((member) =>
        member.componentKey === componentKey(component));
      if (stableStringify(component[phase]) !== stableStringify(totals(members))) {
        throw new TypeError(`Research component ${phase} work does not reproduce from committed members.`);
      }
    }
    for (const split of component.splitCoverage) {
      for (const phase of ['received', 'selected', 'analyzed']) {
        const expected = phaseMembers(replay, phase).filter((member) =>
          member.componentKey === componentKey(component)
          && member.split === split.split && member.visibility === split.visibility).length;
        const field = `rows${phase[0].toUpperCase()}${phase.slice(1)}`;
        if (split[field] !== expected) {
          throw new TypeError(`Research split ${field} does not reproduce from committed members.`);
        }
      }
    }
    const incomplete = replay.analyzed.filter((member) =>
      member.componentKey === componentKey(component) && !member.work.complete).length;
    if (component.upstreamIncompleteEpisodes !== incomplete) {
      throw new TypeError('Research upstream-incomplete coverage does not reproduce from committed members.');
    }
  }
}

function assertEvidence(report, replay) {
  const expected = replay.analyzed.map((member) =>
    `${member.componentKey}:${member.recordDigest}:${member.episodeContentDigest}`).toSorted();
  const observed = report.evidenceLedger.map((entry) =>
    `${componentKey(entry)}:${entry.recordDigest}:${entry.episodeContentDigest}`).toSorted();
  if (stableStringify(observed) !== stableStringify(expected)) {
    throw new TypeError('Research evidence does not reproduce the resource-admitted member set.');
  }
}

export function assertResearchWorkReplay(report) {
  const replay = replayResearchMembership(report);
  assertAggregateWork(report, replay);
  assertCoverage(report, replay);
  assertEvidence(report, replay);
  if (!replay.authenticated && (report.proposalLedger.length > 0 || report.hypotheses.length > 0
      || report.evidenceLedger.length > 0 || report.metamorphicAuditLedger.length > 0)) {
    throw new TypeError('Unauthenticated membership cannot support research evidence or hypotheses.');
  }
  return replay;
}

function addOmission(rows, scope, reason, count, frontierValues = []) {
  if (count < 1) return;
  const frontier = new CommutativeDigest();
  for (const value of frontierValues) frontier.add(String(value));
  if (frontierValues.length === 0) frontier.add(`${scope}:${reason}:${count}`);
  rows.push({ scope, reason, count, frontierDigest: frontier.finish(`${scope}:${reason}`) });
}

function registeredEpisodeEnvelope(registry, entry, member) {
  const component = registry.components.find((item) => componentKey(item) === componentKey(entry));
  return {
    episodeId: member.episodeId,
    source: {
      sourceId: component.sourceId,
      componentId: component.componentId,
      revision: component.revision,
      componentDigest: component.identity.sha256,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      split: member.split,
      visibility: member.visibility,
      licenseId: component.rights.licenseId,
      rightsState: component.rights.state,
    },
  };
}

export function deriveResearchAuthorization(report) {
  const registry = {
    format: report.registry.format,
    sources: report.registry.sources,
    components: report.registry.components,
    digest: report.registry.digest,
  };
  const frontier = new CommutativeDigest();
  let allowed = 0;
  let denied = 0;
  for (const entry of report.inputMembership) {
    for (const member of entry.members) {
      const receipt = authorizeResearchEpisode(
        registry, registeredEpisodeEnvelope(registry, entry, member),
      );
      frontier.add(stableStringify(receipt));
      if (receipt.allowed) allowed += 1;
      else denied += 1;
    }
  }
  return {
    episodesAllowed: allowed,
    episodesDenied: denied,
    receiptsDigest: frontier.finish('authorization-receipts'),
  };
}

export function deriveResearchOmissions({
  report, replay, strategyRun, proposalLedger, hypothesisBuild,
}) {
  const omissions = [];
  const expectedRows = report.work.episodesAvailable;
  if (replay.received.length < expectedRows) {
    if (replay.received.length >= report.workPolicy.limits.maxRowsScanned
        && report.workPolicy.limits.maxRowsScanned < expectedRows) {
      addOmission(omissions, 'input', 'max-rows-scanned',
        expectedRows - replay.received.length,
        report.registry.components.map((component) => component.projection.membershipDigest));
    } else {
      const receivedKeys = new Set(replay.received.map((member) => member.componentKey));
      addOmission(omissions, 'input', 'projection-membership-incomplete',
        expectedRows - replay.received.length,
        report.registry.components.filter((component) => !receivedKeys.has(componentKey(component))
          || report.inputMembership.find((entry) => componentKey(entry) === componentKey(component))
            .receivedEpisodes < component.projection.rows)
          .map((component) => component.projection.membershipDigest));
    }
  }
  if (!replay.authenticated) {
    addOmission(omissions, 'input', 'membership-not-authenticated', 1,
      report.registry.components.map((component) => component.projection.contentMembershipDigest));
  } else {
    const selectedKeys = new Set(replay.selected.map((member) => member.selectionKey));
    const omitted = replay.received.filter((member) => !selectedKeys.has(member.selectionKey));
    addOmission(omissions, 'input', 'max-episodes', omitted.length,
      omitted.map((member) => member.selectionKey));
  }
  for (const [reason, members] of replay.resourceOmissions) {
    addOmission(omissions, 'input', reason, members.length,
      members.map((member) => member.selectionKey));
  }
  const incomplete = replay.analyzed.filter((member) => !member.work.complete);
  const evidenceByMember = new Map(report.evidenceLedger.map((entry) => [
    `${componentKey(entry)}:${entry.recordDigest}`, entry.evidenceDigest,
  ]));
  addOmission(omissions, 'input', 'upstream-incomplete', incomplete.length,
    incomplete.map((member) => evidenceByMember.get(`${member.componentKey}:${member.recordDigest}`)));

  for (const receipt of strategyRun.receipts) {
    addOmission(omissions, 'technique', `${receipt.techniqueId}-max-events`,
      receipt.eventsAvailable - receipt.eventsVisited, [stableStringify(receipt)]);
    addOmission(omissions, 'technique', `${receipt.techniqueId}-max-proposals`,
      receipt.proposalsAvailable - receipt.proposalsRetained, [stableStringify(receipt)]);
    addOmission(omissions, 'technique', `${receipt.techniqueId}-validation-failures`,
      (receipt.preservationFailures ?? 0) + (receipt.controlFailures ?? 0),
      [stableStringify(receipt)]);
  }
  const allProposalLedger = buildProcessingGraphProposalLedger(strategyRun.proposals, report.workPolicy);
  const retained = new Set(proposalLedger.map((proposal) => proposal.proposalDigest));
  const omittedProposals = allProposalLedger.filter((proposal) => !retained.has(proposal.proposalDigest));
  addOmission(omissions, 'vote', 'max-votes', omittedProposals.length,
    omittedProposals.map((proposal) => processingGraphCandidateSignature(proposal.candidate)));
  addOmission(omissions, 'hypothesis', 'max-hypotheses',
    hypothesisBuild.available.length - hypothesisBuild.retained.length,
    hypothesisBuild.available.slice(hypothesisBuild.retained.length)
      .map((hypothesis) => hypothesis.semanticSignature));
  return omissions.toSorted((left, right) =>
    `${left.scope}:${left.reason}`.localeCompare(`${right.scope}:${right.reason}`));
}
