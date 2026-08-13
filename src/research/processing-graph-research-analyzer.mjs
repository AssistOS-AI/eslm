import { sha256, stableStringify } from '../util.mjs';
import {
  assertResearchEpisode,
} from './research-episode-contract.mjs';
import {
  RESEARCH_EPISODE_PROJECTION_WORK,
  researchEpisodeMembershipProjection,
} from './research-episode-membership.mjs';
import {
  RESEARCH_EPISODE_FEATURE_PROTOCOL,
  RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST,
  RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS,
} from './research-episode-features.mjs';
import {
  assertResearchSourceRegistry,
  authorizeResearchEpisode,
} from './research-source-registry.mjs';
import {
  PROCESSING_GRAPH_DISCOVERY_TECHNIQUES,
  runProcessingGraphDiscoveryStrategies,
} from './processing-graph-discovery-strategies.mjs';
import {
  PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL,
  PROCESSING_GRAPH_RESEARCH_HANDOFF_PROTOCOL,
  assertProcessingGraphResearchAnalysis,
  assertProcessingGraphResearchWorkPolicy,
  resolveProcessingGraphResearchWorkPolicy,
  processingGraphResearchVerifierInputs,
} from './processing-graph-research-analysis-contract.mjs';
import {
  buildProcessingGraphHypotheses,
  buildProcessingGraphProposalLedger,
  processingGraphCorrelationGroups,
  selectFairResearchVotes,
} from './processing-graph-hypothesis-coordinator.mjs';
import {
  createResearchCoverageTracker,
  finalizeResearchCoverage,
  recordResearchCoverageWork,
  researchSplitCoverage,
} from './research-analysis-coverage.mjs';
import {
  currentProcessingGraphBaseline,
  processingGraphResearchImplementationIdentity,
} from './research-implementation-identity.mjs';
import {
  researchProjectionContentMembershipDigest,
  researchProjectionMembershipDigest,
} from './research-projection-membership.mjs';
import {
  researchAnalysisRegistrySnapshot,
  researchInputMembership,
} from './research-analysis-lineage-contract.mjs';
import {
  deriveResearchAuthorization,
  deriveResearchOmissions,
  replayResearchMembership,
} from './research-work-replay-contract.mjs';

const AUTHORITY = Object.freeze({
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'manual-review-required',
  executablePolicy: false,
});

function digest(value) {
  return `sha256:${sha256(stableStringify(value))}`;
}

function evidenceReference(episode, episodeContentDigest, featureSemanticDigest,
  metamorphicAuditDigest) {
  const reference = {
    format: 'eslm-research-evidence-reference-v3',
    sourceId: episode.source.sourceId,
    revision: episode.source.revision,
    componentId: episode.source.componentId,
    projectionDigest: episode.source.projectionDigest,
    recordDigest: episode.provenance.recordDigest,
    episodeContentDigest,
    featureSemanticDigest,
    metamorphicAuditDigest,
  };
  return { ...reference, evidenceDigest: digest(reference) };
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function resolvedPolicy(input) {
  if (input?.format) {
    assertProcessingGraphResearchWorkPolicy(input);
    return input;
  }
  return resolveProcessingGraphResearchWorkPolicy(input);
}

function selectionKey(episode, episodeContentDigest, seed) {
  return sha256(stableStringify({
    seed,
    episodeId: episode.episodeId,
    recordDigest: episode.provenance.recordDigest,
    episodeContentDigest,
    projectionDigest: episode.source.projectionDigest,
  }));
}

function compactEpisodeCarrier(episode) {
  return {
    episodeId: episode.episodeId,
    source: structuredClone(episode.source),
    provenance: { recordDigest: episode.provenance.recordDigest },
    work: structuredClone(episode.work),
  };
}

function retainBounded(selected, candidate, maximum) {
  selected.push(candidate);
  selected.sort((left, right) => left.selectionKey.localeCompare(right.selectionKey));
  if (selected.length <= maximum) return;
  selected.pop();
}

function buildHandoff(progressionStage, complete, independenceGroupCount, hypothesisCount, omissions) {
  const blockingReasons = uniqueSorted([
    ...omissions.map((item) => item.reason),
    ...(independenceGroupCount < 2 ? ['insufficient-independent-sources'] : []),
    ...(hypothesisCount < 1 ? ['no-hypotheses-retained'] : []),
  ]);
  const eligible = complete && blockingReasons.length === 0;
  const next = { probe: 'pilot', pilot: 'scale', scale: 'manual-review' }[progressionStage];
  const verifierInputs = processingGraphResearchVerifierInputs(progressionStage);
  return {
    format: PROCESSING_GRAPH_RESEARCH_HANDOFF_PROTOCOL,
    currentStage: progressionStage,
    recommendedStage: eligible ? next : 'hold',
    eligible,
    independenceGroupCount,
    requiredVerifierInputs: verifierInputs,
    blockingReasons,
    shardContract: {
      inputMode: 'iterable-or-async-iterable',
      selection: 'bounded-min-hash-v1',
      mergeOrder: 'semantic-digest',
      requiresShardMembershipDigest: true,
    },
    authority: 'recommendation-only',
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].toSorted();
}

export async function analyzeProcessingGraphResearch({
  registry,
  episodes,
  analysisId = 'processing-graph-discovery',
  version = '1.0.0',
  seed = 'deterministic-research-seed',
  workPolicy: workPolicyInput = {},
} = {}) {
  assertResearchSourceRegistry(registry);
  if (!episodes || (!episodes[Symbol.iterator] && !episodes[Symbol.asyncIterator])) {
    throw new TypeError('Research episodes must be an Iterable or AsyncIterable.');
  }
  const workPolicy = resolvedPolicy(workPolicyInput);
  const implementationIdentityPromise = processingGraphResearchImplementationIdentity();
  const baselineGraph = currentProcessingGraphBaseline();
  const coverageTracker = createResearchCoverageTracker(registry);
  const selected = [];
  const declared = { episodes: 0, bytes: 0, tokens: 0, actions: 0, dependencies: 0 };
  const expectedRows = registry.components.reduce((sum, component) =>
    sum + component.projection.rows, 0);
  const observedByComponent = new Map();
  const observedEpisodeIds = new Set();
  const observedRecords = new Set();
  let scanTruncated = false;

  for await (const episode of episodes) {
    if (declared.episodes >= expectedRows) {
      throw new Error('Research episode stream exceeds the registered projection membership count.');
    }
    const authorization = authorizeResearchEpisode(registry, episode);
    if (!authorization.allowed) {
      throw new Error(`Research episode ${episode?.episodeId ?? 'invalid-episode'} is not authorized: `
        + `${authorization.reasons.join(', ')}.`);
    }
    const recordMembershipKey = `${episode.source.sourceId}@${episode.source.revision}:` +
      `${episode.source.componentId}:${episode.provenance.recordDigest}`;
    if (observedEpisodeIds.has(episode.episodeId) || observedRecords.has(recordMembershipKey)) {
      throw new Error('Research episode stream contains duplicate episode or projection membership.');
    }
    observedEpisodeIds.add(episode.episodeId);
    observedRecords.add(recordMembershipKey);
    const componentKey = `${episode.source.sourceId}@${episode.source.revision}:${episode.source.componentId}`;
    const observedMembership = observedByComponent.get(componentKey) ?? [];
    const observedRows = observedMembership.length + 1;
    const registeredComponent = registry.components.find((component) =>
      `${component.sourceId}@${component.revision}:${component.componentId}` === componentKey);
    const registeredRows = registeredComponent.projection.rows;
    const receivedSplitRows = observedMembership.filter((member) =>
      member.split === episode.source.split && member.visibility === episode.source.visibility).length + 1;
    const admittedSplitRows = registeredComponent.visibility.find((split) =>
      split.split === episode.source.split && split.visibility === episode.source.visibility)
      ?.rowsAdmitted ?? 0;
    if (receivedSplitRows > admittedSplitRows) {
      throw new Error(`Research split ${episode.source.split} exceeds its admitted row quota.`);
    }
    if (observedRows > registeredRows) {
      throw new Error(`Research component ${componentKey} exceeds its registered projection membership count.`);
    }
    assertResearchEpisode(episode);
    declared.episodes += 1;
    declared.bytes += episode.work.sourceBytes;
    declared.tokens += episode.work.tokens;
    declared.actions += episode.work.actions;
    declared.dependencies += episode.work.dependencies;
    recordResearchCoverageWork(coverageTracker, 'received', episode);
    const membershipProjection = researchEpisodeMembershipProjection(episode);
    const episodeContentDigest = membershipProjection.member.episodeContentDigest;
    observedMembership.push(membershipProjection.member);
    observedByComponent.set(componentKey, observedMembership);
    selected.push({
      episode: compactEpisodeCarrier(episode),
      episodeContentDigest,
      selectionKey: selectionKey(episode, episodeContentDigest, seed),
      membershipProjection,
    });
    if (declared.episodes >= workPolicy.limits.maxRowsScanned
        && declared.episodes < expectedRows) {
      scanTruncated = true;
      break;
    }
  }

  let membershipAuthenticated = !scanTruncated && declared.episodes === expectedRows;
  if (membershipAuthenticated) {
    for (const component of registry.components) {
      const key = `${component.sourceId}@${component.revision}:${component.componentId}`;
      const members = observedByComponent.get(key) ?? [];
      const observedDigest = researchProjectionMembershipDigest(
        component.projection.projectionId,
        members.map((member) => member.recordDigest), component.identity.rows,
      );
      const observedContentDigest = researchProjectionContentMembershipDigest(
        component.projection.projectionId,
        members, component.identity.rows,
      );
      if (members.length !== component.projection.rows
          || observedDigest !== component.projection.membershipDigest
          || observedContentDigest !== component.projection.contentMembershipDigest) {
        throw new Error(`Research component ${key} does not match its registered projection membership.`);
      }
    }
  }
  membershipAuthenticated &&= registry.components.every((component) => {
    const key = `${component.sourceId}@${component.revision}:${component.componentId}`;
    return (observedByComponent.get(key)?.length ?? 0) === component.projection.rows;
  });
  if (!membershipAuthenticated) {
    selected.length = 0;
  } else {
    const candidates = selected.splice(0);
    for (const candidate of candidates) {
      retainBounded(selected, candidate, workPolicy.limits.maxEpisodes);
    }
  }
  for (const { episode } of selected) {
    recordResearchCoverageWork(coverageTracker, 'selected', episode);
  }
  const episodesSelected = selected.length;
  const analyzed = [];
  const analyzedWork = { bytes: 0, tokens: 0, actions: 0, dependencies: 0 };
  for (const item of selected) {
    const { episode, episodeContentDigest } = item;
    const reason = analyzedWork.bytes + episode.work.sourceBytes > workPolicy.limits.maxInputBytes
      ? 'max-input-bytes'
      : analyzedWork.tokens + episode.work.tokens > workPolicy.limits.maxTokens
        ? 'max-tokens'
      : analyzedWork.actions + episode.work.actions > workPolicy.limits.maxActions
        ? 'max-actions'
        : analyzedWork.dependencies + episode.work.dependencies > workPolicy.limits.maxDependencies
          ? 'max-dependencies'
          : null;
    if (reason) {
      continue;
    }
    analyzedWork.bytes += episode.work.sourceBytes;
    analyzedWork.tokens += episode.work.tokens;
    analyzedWork.actions += episode.work.actions;
    analyzedWork.dependencies += episode.work.dependencies;
    recordResearchCoverageWork(coverageTracker, 'analyzed', episode);
    const source = registry.sources.find((candidate) => candidate.sourceId === episode.source.sourceId
      && candidate.revision === episode.source.revision);
    const { features, metamorphicAudit, member } = item.membershipProjection;
    analyzed.push({
      features,
      metamorphicAudit,
      workComplete: episode.work.complete,
      independenceGroup: source.independenceGroup,
      ...evidenceReference(episode, episodeContentDigest, features.semanticDigest,
        member.metamorphicAuditDigest),
    });
    item.episode = null;
    item.membershipProjection = null;
  }
  selected.length = 0;
  analyzed.sort((left, right) => left.features.semanticDigest.localeCompare(right.features.semanticDigest)
    || left.evidenceDigest.localeCompare(right.evidenceDigest));
  const strategyRun = runProcessingGraphDiscoveryStrategies(analyzed, workPolicy.techniqueBudgets);
  const retainedProposals = selectFairResearchVotes(
    strategyRun.proposals, workPolicy.limits.maxVotes,
  );
  const proposalLedger = buildProcessingGraphProposalLedger(retainedProposals, workPolicy);
  const techniqueReceipts = strategyRun.receipts.map((receipt) => {
    const proposalsRetained = proposalLedger.filter((proposal) =>
      proposal.techniqueId === receipt.techniqueId).length;
    const validationComplete = (receipt.preservationFailures ?? 0) === 0
      && (receipt.controlFailures ?? 0) === 0;
    return {
      ...receipt,
      proposalsRetained,
      complete: receipt.eventsAvailable === receipt.eventsVisited
        && receipt.proposalsAvailable === proposalsRetained
        && validationComplete,
    };
  });
  const evidenceMap = new Map(analyzed.map((item) => [item.evidenceDigest, item]));
  const hypothesisBuild = buildProcessingGraphHypotheses(
    proposalLedger, workPolicy, evidenceMap,
  );
  const techniquesComplete = techniqueReceipts.every((item) => item.complete);
  const votesComplete = proposalLedger.length === techniqueReceipts
    .reduce((sum, receipt) => sum + receipt.proposalsAvailable, 0);
  const hypothesesComplete = hypothesisBuild.retained.length === hypothesisBuild.available.length;
  const coverage = finalizeResearchCoverage(coverageTracker);
  const selectedWork = coverage.componentProjections.reduce((sum, item) => ({
    bytes: sum.bytes + item.selected.sourceBytes,
    tokens: sum.tokens + item.selected.tokens,
    actions: sum.actions + item.selected.actions,
    dependencies: sum.dependencies + item.selected.dependencies,
  }), { bytes: 0, tokens: 0, actions: 0, dependencies: 0 });
  const report = {
    format: PROCESSING_GRAPH_RESEARCH_ANALYSIS_PROTOCOL,
    implementationIdentity: await implementationIdentityPromise,
    baselineGraph,
    analysis: {
      analysisId, version, seed, progressionStage: workPolicy.progressionStage,
      inputMode: 'iterable-or-async-iterable', selectionMethod: 'bounded-min-hash-v1',
    },
    registry: researchAnalysisRegistrySnapshot(registry),
    featureSchema: {
      format: RESEARCH_EPISODE_FEATURE_PROTOCOL,
      digest: RESEARCH_EPISODE_FEATURE_SCHEMA_DIGEST,
      excludedSemanticFields: RESEARCH_EPISODE_EXCLUDED_SEMANTIC_FIELDS,
    },
    workPolicy,
    authorization: {
      episodesAllowed: declared.episodes,
      episodesDenied: 0,
      receiptsDigest: digest({ pending: 'authorization-replay' }),
    },
    inputMembership: researchInputMembership(registry, observedByComponent),
    evidenceLedger: analyzed.map((item) => ({
      evidenceDigest: item.evidenceDigest,
      sourceId: item.sourceId,
      revision: item.revision,
      componentId: item.componentId,
      projectionDigest: item.projectionDigest,
      recordDigest: item.recordDigest,
      episodeContentDigest: item.episodeContentDigest,
      featureSemanticDigest: item.featureSemanticDigest,
      metamorphicAuditDigest: item.metamorphicAuditDigest,
      independenceGroup: item.independenceGroup,
    })).toSorted((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest)),
    featureLedger: analyzed.map((item) => ({
      evidenceDigest: item.evidenceDigest,
      features: structuredClone(item.features),
    })).toSorted((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest)),
    coverage,
    splitCoverage: researchSplitCoverage(coverage),
    work: {
      episodesAvailable: expectedRows,
      episodesReceived: declared.episodes,
      episodesSelected,
      episodesAnalyzed: analyzed.length,
      sourceBytesDeclared: declared.bytes,
      sourceBytesSelected: selectedWork.bytes,
      sourceBytesAnalyzed: analyzedWork.bytes,
      tokensDeclared: declared.tokens,
      tokensSelected: selectedWork.tokens,
      tokensAnalyzed: analyzedWork.tokens,
      actionsDeclared: declared.actions,
      actionsSelected: selectedWork.actions,
      actionsAnalyzed: analyzedWork.actions,
      dependenciesDeclared: declared.dependencies,
      dependenciesSelected: selectedWork.dependencies,
      dependenciesAnalyzed: analyzedWork.dependencies,
      membershipFeatureEvaluations: declared.episodes
        * RESEARCH_EPISODE_PROJECTION_WORK.featureEvaluations,
      membershipMetamorphicTransformsAttempted: declared.episodes
        * RESEARCH_EPISODE_PROJECTION_WORK.metamorphicTransformsAttempted,
      projectionCommittedMetamorphicTransformsApplied: [...observedByComponent.values()]
        .flat().reduce((sum, member) =>
          sum + member.projectionWork.metamorphicTransformsApplied, 0),
      eventsAvailable: techniqueReceipts.reduce((sum, item) => sum + item.eventsAvailable, 0),
      eventsVisited: techniqueReceipts.reduce((sum, item) => sum + item.eventsVisited, 0),
      votesAvailable: techniqueReceipts
        .reduce((sum, item) => sum + item.proposalsAvailable, 0),
      votesRetained: hypothesisBuild.retained
        .reduce((sum, hypothesis) => sum + hypothesis.votes.length, 0),
      hypothesesAvailable: hypothesisBuild.available.length,
      hypothesesRetained: hypothesisBuild.retained.length,
    },
    techniques: techniqueReceipts,
    metamorphicAuditLedger: strategyRun.metamorphicAuditLedger,
    proposalLedger,
    correlationGroups: processingGraphCorrelationGroups(),
    hypotheses: hypothesisBuild.retained,
    omissions: [],
    completeness: {
      complete: false, inputComplete: false, techniquesComplete, votesComplete,
      hypothesesComplete, scopeAbsenceClaimsAllowed: false,
    },
    handoff: buildHandoff(
      workPolicy.progressionStage, false,
      new Set(registry.sources.map((source) => source.independenceGroup)).size,
      hypothesisBuild.retained.length, [],
    ),
    authority: AUTHORITY,
  };
  const replay = replayResearchMembership(report);
  report.authorization = deriveResearchAuthorization(report);
  report.omissions = deriveResearchOmissions({
    report, replay, strategyRun, proposalLedger, hypothesisBuild,
  });
  const replayInputComplete = replay.authenticated
    && replay.received.length === replay.selected.length
    && replay.selected.length === replay.analyzed.length
    && replay.analyzed.every((member) => member.work.complete);
  const replayComplete = replayInputComplete && techniquesComplete
    && votesComplete && hypothesesComplete;
  report.completeness = {
    complete: replayComplete,
    inputComplete: replayInputComplete,
    techniquesComplete,
    votesComplete,
    hypothesesComplete,
    scopeAbsenceClaimsAllowed: replayComplete,
  };
  report.handoff = buildHandoff(
    workPolicy.progressionStage, replayComplete,
    new Set(registry.sources.map((source) => source.independenceGroup)).size,
    hypothesisBuild.retained.length, report.omissions,
  );
  report.receiptDigest = digest(report);
  assertProcessingGraphResearchAnalysis(report);
  return freezeDeep(report);
}
