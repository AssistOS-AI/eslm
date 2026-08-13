import { exactKeys, integer, same, sha256, stable } from './contract-helpers.mjs';
import { componentKey } from './analysis-lineage-validator.mjs';
import { candidateSignature, proposalLedger } from './research-hypothesis-replay.mjs';
import { RESEARCH_ANALYSIS_PROTOCOL } from './research-contract.mjs';

const DIMENSIONS = ['sourceBytes', 'tokens', 'actions', 'dependencies'];
const LIMITS = {
  sourceBytes: 'maxInputBytes', tokens: 'maxTokens',
  actions: 'maxActions', dependencies: 'maxDependencies',
};

function selectionKey(member, component, seed) {
  return sha256(stable({
    seed, episodeId: member.episodeId, recordDigest: member.recordDigest,
    episodeContentDigest: member.episodeContentDigest,
    projectionDigest: component.projection.membershipDigest,
  }));
}

export function replayMembers(analysis) {
  const received = analysis.inputMembership.flatMap((entry) => {
    const component = analysis.registry.components.find((item) =>
      componentKey(item) === componentKey(entry));
    return entry.members.map((member) => ({
      ...structuredClone(member), component, componentKey: componentKey(entry),
      selectionKey: selectionKey(member, component, analysis.analysis.seed),
    }));
  });
  const authenticated = analysis.inputMembership.every((entry) => entry.complete);
  if (!authenticated) return {
    authenticated, received, selected: [], analyzed: [], resourceOmissions: new Map(),
  };
  const selected = received.toSorted((left, right) =>
    left.selectionKey.localeCompare(right.selectionKey))
    .slice(0, analysis.workPolicy.limits.maxEpisodes);
  const used = Object.fromEntries(DIMENSIONS.map((field) => [field, 0]));
  const resourceOmissions = new Map();
  const analyzed = selected.filter((member) => {
    const exceeded = DIMENSIONS.find((field) =>
      used[field] + member.work[field] > analysis.workPolicy.limits[LIMITS[field]]);
    if (exceeded) {
      const reason = `max-${exceeded === 'sourceBytes' ? 'input-bytes' : exceeded}`;
      const rows = resourceOmissions.get(reason) ?? [];
      rows.push(member);
      resourceOmissions.set(reason, rows);
      return false;
    }
    for (const field of DIMENSIONS) used[field] += member.work[field];
    return true;
  });
  return { authenticated, received, selected, analyzed, resourceOmissions };
}

function emptyWork() {
  return { episodes: 0, sourceBytes: 0, tokens: 0, actions: 0, dependencies: 0 };
}

function totals(members) {
  const result = emptyWork();
  for (const member of members) {
    result.episodes += 1;
    for (const field of DIMENSIONS) result[field] += member.work[field];
  }
  return result;
}

function phaseMembers(replay, phase) {
  return phase === 'received' ? replay.received
    : phase === 'selected' ? replay.selected : replay.analyzed;
}

function expectedCoverage(analysis, replay) {
  const componentProjections = analysis.registry.components.map((component) => {
    const source = analysis.registry.sources.find((item) => item.sourceId === component.sourceId
      && item.revision === component.revision);
    const phases = Object.fromEntries(['received', 'selected', 'analyzed'].map((phase) => [
      phase, totals(phaseMembers(replay, phase).filter((member) =>
        member.componentKey === componentKey(component))),
    ]));
    const splitCoverage = component.visibility.map((split) => ({
      ...structuredClone(split),
      rowsReceived: replay.received.filter((member) =>
        member.componentKey === componentKey(component)
        && member.split === split.split && member.visibility === split.visibility).length,
      rowsSelected: replay.selected.filter((member) =>
        member.componentKey === componentKey(component)
        && member.split === split.split && member.visibility === split.visibility).length,
      rowsAnalyzed: replay.analyzed.filter((member) =>
        member.componentKey === componentKey(component)
        && member.split === split.split && member.visibility === split.visibility).length,
    }));
    const upstreamIncompleteEpisodes = replay.analyzed.filter((member) =>
      member.componentKey === componentKey(component) && !member.work.complete).length;
    const complete = phases.received.episodes === component.projection.rows
      && phases.selected.episodes === component.projection.rows
      && phases.analyzed.episodes === component.projection.rows
      && upstreamIncompleteEpisodes === 0;
    return {
      sourceId: component.sourceId,
      revision: component.revision,
      independenceGroup: source.independenceGroup,
      componentId: component.componentId,
      projectionId: component.projection.projectionId,
      projectionDigest: component.projection.membershipDigest,
      contentMembershipDigest: component.projection.contentMembershipDigest,
      splitCoverage,
      availableEpisodes: component.projection.rows,
      ...phases,
      upstreamIncompleteEpisodes,
      complete,
    };
  }).toSorted((left, right) => componentKey(left).localeCompare(componentKey(right)));
  const grouped = new Map();
  for (const component of componentProjections) {
    const key = `${component.sourceId}@${component.revision}`;
    const row = grouped.get(key) ?? {
      sourceId: component.sourceId, revision: component.revision,
      independenceGroup: component.independenceGroup,
      componentCount: 0, projectionCount: 0, availableEpisodes: 0,
      received: emptyWork(), selected: emptyWork(), analyzed: emptyWork(),
      upstreamIncompleteEpisodes: 0, complete: true,
    };
    row.componentCount += 1;
    row.projectionCount += 1;
    row.availableEpisodes += component.availableEpisodes;
    for (const phase of ['received', 'selected', 'analyzed']) {
      for (const field of ['episodes', ...DIMENSIONS]) row[phase][field] += component[phase][field];
    }
    row.upstreamIncompleteEpisodes += component.upstreamIncompleteEpisodes;
    row.complete &&= component.complete;
    grouped.set(key, row);
  }
  return {
    format: 'eslm-processing-graph-research-coverage-v1',
    sources: [...grouped.values()].toSorted((left, right) =>
      `${left.sourceId}@${left.revision}`.localeCompare(`${right.sourceId}@${right.revision}`)),
    componentProjections,
  };
}

export function assertWorkAndCoverage(analysis, replay) {
  exactKeys(analysis.work, [
    'episodesAvailable', 'episodesReceived', 'episodesSelected', 'episodesAnalyzed',
    'sourceBytesDeclared', 'sourceBytesSelected', 'sourceBytesAnalyzed',
    'tokensDeclared', 'tokensSelected', 'tokensAnalyzed',
    'actionsDeclared', 'actionsSelected', 'actionsAnalyzed',
    'dependenciesDeclared', 'dependenciesSelected', 'dependenciesAnalyzed',
    'membershipFeatureEvaluations', 'membershipMetamorphicTransformsAttempted',
    'projectionCommittedMetamorphicTransformsApplied',
    'eventsAvailable', 'eventsVisited', 'votesAvailable', 'votesRetained',
    'hypothesesAvailable', 'hypothesesRetained',
  ], 'Analysis work');
  for (const [field, value] of Object.entries(analysis.work)) integer(value, `Analysis work.${field}`);
  const received = totals(replay.received);
  const selected = totals(replay.selected);
  const analyzed = totals(replay.analyzed);
  const expected = {
    episodesAvailable: analysis.registry.components.reduce((sum, component) =>
      sum + component.projection.rows, 0),
    episodesReceived: received.episodes, episodesSelected: selected.episodes,
    episodesAnalyzed: analyzed.episodes, sourceBytesDeclared: received.sourceBytes,
    sourceBytesSelected: selected.sourceBytes, sourceBytesAnalyzed: analyzed.sourceBytes,
    tokensDeclared: received.tokens, tokensSelected: selected.tokens, tokensAnalyzed: analyzed.tokens,
    actionsDeclared: received.actions, actionsSelected: selected.actions,
    actionsAnalyzed: analyzed.actions, dependenciesDeclared: received.dependencies,
    dependenciesSelected: selected.dependencies, dependenciesAnalyzed: analyzed.dependencies,
    membershipFeatureEvaluations: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.featureEvaluations, 0),
    membershipMetamorphicTransformsAttempted: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.metamorphicTransformsAttempted, 0),
    projectionCommittedMetamorphicTransformsApplied: replay.received.reduce((sum, member) =>
      sum + member.projectionWork.metamorphicTransformsApplied, 0),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (analysis.work[field] !== value) {
      throw new TypeError(`Analysis work.${field} does not reproduce from committed members.`);
    }
  }
  if (analysis.work.episodesReceived > analysis.workPolicy.limits.maxRowsScanned) {
    throw new TypeError('Analysis received work exceeds the frozen scan budget.');
  }
  if (!same(analysis.coverage, expectedCoverage(analysis, replay))) {
    throw new TypeError('Analysis coverage does not reproduce exact member execution work.');
  }
  const expectedEvidence = replay.analyzed.map((member) =>
    `${member.componentKey}:${member.recordDigest}:${member.episodeContentDigest}`).toSorted();
  const observedEvidence = analysis.evidenceLedger.map((entry) =>
    `${componentKey(entry)}:${entry.recordDigest}:${entry.episodeContentDigest}`).toSorted();
  if (!same(expectedEvidence, observedEvidence)) {
    throw new TypeError('Analysis evidence does not reproduce resource-admitted member selection.');
  }
}

class CommutativeDigest {
  count = 0;
  sum = 0n;
  xor = 0n;

  add(value) {
    const number = BigInt(`0x${sha256(value).slice(7)}`);
    this.count += 1;
    this.sum = (this.sum + number) % (1n << 256n);
    this.xor ^= number;
  }

  finish(label) {
    return sha256(stable({
      label, count: this.count,
      sum: this.sum.toString(16).padStart(64, '0'),
      xor: this.xor.toString(16).padStart(64, '0'),
    }));
  }
}

function addOmission(rows, scope, reason, count, frontierValues = []) {
  if (count < 1) return;
  const frontier = new CommutativeDigest();
  for (const value of frontierValues) frontier.add(String(value));
  if (frontierValues.length === 0) frontier.add(`${scope}:${reason}:${count}`);
  rows.push({ scope, reason, count, frontierDigest: frontier.finish(`${scope}:${reason}`) });
}

export function deriveOmissions(analysis, replay, strategyRun, retainedLedger, hypothesisBuild) {
  const omissions = [];
  const expectedRows = analysis.work.episodesAvailable;
  if (replay.received.length < expectedRows) {
    if (replay.received.length >= analysis.workPolicy.limits.maxRowsScanned
        && analysis.workPolicy.limits.maxRowsScanned < expectedRows) {
      addOmission(omissions, 'input', 'max-rows-scanned', expectedRows - replay.received.length,
        analysis.registry.components.map((item) => item.projection.membershipDigest));
    } else {
      const receivedKeys = new Set(replay.received.map((member) => member.componentKey));
      addOmission(omissions, 'input', 'projection-membership-incomplete',
        expectedRows - replay.received.length,
        analysis.registry.components.filter((component) => !receivedKeys.has(componentKey(component))
          || analysis.inputMembership.find((entry) =>
            componentKey(entry) === componentKey(component)).receivedEpisodes < component.projection.rows)
          .map((item) => item.projection.membershipDigest));
    }
  }
  if (!replay.authenticated) {
    addOmission(omissions, 'input', 'membership-not-authenticated', 1,
      analysis.registry.components.map((item) => item.projection.contentMembershipDigest));
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
  const evidenceByMember = new Map(analysis.evidenceLedger.map((entry) => [
    `${componentKey(entry)}:${entry.recordDigest}`, entry.evidenceDigest,
  ]));
  addOmission(omissions, 'input', 'upstream-incomplete', incomplete.length,
    incomplete.map((member) =>
      evidenceByMember.get(`${member.componentKey}:${member.recordDigest}`)));
  for (const receipt of strategyRun.receipts) {
    addOmission(omissions, 'technique', `${receipt.techniqueId}-max-events`,
      receipt.eventsAvailable - receipt.eventsVisited, [stable(receipt)]);
    addOmission(omissions, 'technique', `${receipt.techniqueId}-max-proposals`,
      receipt.proposalsAvailable - receipt.proposalsRetained, [stable(receipt)]);
    addOmission(omissions, 'technique', `${receipt.techniqueId}-validation-failures`,
      (receipt.preservationFailures ?? 0) + (receipt.controlFailures ?? 0), [stable(receipt)]);
  }
  const allProposals = proposalLedger(strategyRun.proposals, analysis.workPolicy);
  const retained = new Set(retainedLedger.map((proposal) => proposal.proposalDigest));
  const omittedProposals = allProposals.filter((proposal) => !retained.has(proposal.proposalDigest));
  addOmission(omissions, 'vote', 'max-votes', omittedProposals.length,
    omittedProposals.map((proposal) => candidateSignature(proposal.candidate)));
  addOmission(omissions, 'hypothesis', 'max-hypotheses',
    hypothesisBuild.available.length - hypothesisBuild.retained.length,
    hypothesisBuild.available.slice(hypothesisBuild.retained.length)
      .map((hypothesis) => hypothesis.semanticSignature));
  return omissions.toSorted((left, right) =>
    `${left.scope}:${left.reason}`.localeCompare(`${right.scope}:${right.reason}`));
}

export function expectedHandoff(analysis, complete, omissions) {
  const blockingReasons = [...new Set([
    ...omissions.map((item) => item.reason),
    ...(analysis.registry.independenceGroupCount < 2
      ? ['insufficient-independent-sources'] : []),
    ...(analysis.hypotheses.length < 1 ? ['no-hypotheses-retained'] : []),
  ])].toSorted();
  const eligible = complete && blockingReasons.length === 0;
  const next = { probe: 'pilot', pilot: 'scale', scale: 'manual-review' }[
    analysis.analysis.progressionStage];
  const requiredVerifierInputs = [
    RESEARCH_ANALYSIS_PROTOCOL, 'eslm-rl-dataset-discovery-plan-v2',
    'eslm-rl-dataset-discovery-cycle-v3', 'eslm-rl-dataset-source-manifest-v2',
    'projection-membership-digest', 'rights-receipts', 'split-ledger',
    ...(['pilot', 'scale'].includes(analysis.analysis.progressionStage)
      ? ['eslm-rl-large-source-readiness-v1'] : []),
  ].toSorted();
  return {
    format: 'eslm-processing-graph-research-handoff-v1',
    currentStage: analysis.analysis.progressionStage,
    recommendedStage: eligible ? next : 'hold',
    eligible,
    independenceGroupCount: analysis.registry.independenceGroupCount,
    requiredVerifierInputs,
    blockingReasons,
    shardContract: {
      inputMode: 'iterable-or-async-iterable', selection: 'bounded-min-hash-v1',
      mergeOrder: 'semantic-digest', requiresShardMembershipDigest: true,
    },
    authority: 'recommendation-only',
  };
}
