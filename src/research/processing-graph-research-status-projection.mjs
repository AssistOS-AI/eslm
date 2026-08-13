import {
  componentBySource,
  coverageBySource,
} from './processing-graph-research-history.mjs';

export function projectHistoricalAnalysis(analysis) {
  return {
    analysisId: analysis.analysis.analysisId,
    progressionStage: analysis.analysis.progressionStage,
    sourceCount: analysis.registry.sourceCount,
    componentCount: analysis.registry.componentCount,
    episodesAvailable: analysis.work.episodesAvailable,
    episodesReceived: analysis.work.episodesReceived,
    episodesSelected: analysis.work.episodesSelected,
    episodesAnalyzed: analysis.work.episodesAnalyzed,
    eventsVisited: analysis.work.eventsVisited,
    votes: analysis.work.votesRetained,
    hypotheses: analysis.work.hypothesesRetained,
    complete: analysis.completeness.complete,
    absenceClaimsAllowed: analysis.completeness.scopeAbsenceClaimsAllowed,
    blockers: analysis.handoff.blockingReasons,
    recommendation: analysis.handoff.recommendedStage,
    eligible: analysis.handoff.eligible,
    authority: structuredClone(analysis.authority),
    sourceCoverage: analysis.coverage.sources.map((row) => ({
      sourceId: row.sourceId,
      revision: row.revision,
      availableEpisodes: row.availableEpisodes,
      receivedEpisodes: row.received.episodes,
      selectedEpisodes: row.selected.episodes,
      analyzedEpisodes: row.analyzed.episodes,
      complete: row.complete,
    })),
    splitCoverage: structuredClone(analysis.splitCoverage),
    receiptDigest: analysis.fullAnalysis.receiptDigest,
    publicReceiptDigest: analysis.receiptDigest,
    replayState: analysis.fullAnalysis.replayState,
  };
}

function sumSplitRows(source, visibility) {
  return source.splits.filter((item) => item.visibility === visibility)
    .reduce((sum, item) => sum + item.rows, 0);
}

function historicalStage(statusRow) {
  return statusRow.state === 'large-source-analyzed' ? 'fully-analyzed' : 'pilot-analyzed';
}

function exceptionalSourceState(
  live, historical, historicalComponent, readiness, storedReadiness,
  {
    dedicatedRegistryCurrent, combinedRegistryCurrent, dedicatedEvidenceCurrent,
    combinedEvidenceCurrent, isLarge,
  },
) {
  if (live.manifestRegistryState === 'tombstoned' || live.rightsState === 'withdrawn') {
    return { state: 'withdrawn', reason: 'source-rights-or-registry-withdrawn' };
  }
  if (live.revision !== historical.revision
      || live.componentId !== historicalComponent.componentId
      || live.projectionId !== historicalComponent.projectionId
      || live.projectionDigest !== historicalComponent.projectionDigest
      || live.contentMembershipDigest !== historicalComponent.contentMembershipDigest
      || (live.admission.projectedRows !== null
        && live.admission.projectedRows !== historical.availableEpisodes)) {
    return { state: 'superseded', reason: 'published-source-projection-identity-superseded' };
  }
  if (live.manifestRegistryState !== 'pilot-approved' || live.rightsState !== 'approved') {
    return { state: 'blocked', reason: 'source-governance-not-approved' };
  }
  if (live.acquisition.state === 'blocked') {
    return { state: 'blocked', reason: live.acquisition.stopReason };
  }
  if (live.admission.state !== 'admitted') {
    return { state: 'blocked', reason: live.admission.stopReason };
  }
  if (!dedicatedRegistryCurrent || !combinedRegistryCurrent) {
    return { state: 'superseded', reason: 'published-analysis-registry-superseded' };
  }
  if (!dedicatedEvidenceCurrent || !combinedEvidenceCurrent) {
    return { state: 'superseded', reason: 'published-analysis-execution-identity-superseded' };
  }
  if (isLarge) {
    if (readiness.state !== 'admitted') {
      return { state: 'blocked', reason: readiness.stopReason };
    }
    if (readiness.stage !== 'large-corpus') {
      return { state: 'blocked', reason: 'large-source-stage-not-admitted' };
    }
    if (readiness.receiptDigest !== storedReadiness.receiptDigest) {
      return { state: 'superseded', reason: 'published-readiness-receipt-superseded' };
    }
  }
  return null;
}

function nextAllowedStage(state, acquisitionState, historical) {
  if (state === 'withdrawn') return 'purge-caches-and-reassess-derived-evidence';
  if (state === 'superseded') return 'review-and-project-current-source-revision';
  if (state === 'blocked') return 'resolve-live-source-or-readiness-gate';
  if (acquisitionState === 'reviewed') return 'acquire-frozen-source-for-replay';
  return historical === 'pilot-analyzed'
    ? 'manual-consolidation-before-large-source-readiness'
    : 'complete-cross-source-frontier-before-protected-transfer';
}

function sourceCheckpoint(live, statusRow, sourceCoverage, stagedExecution) {
  const isLarge = statusRow.state === 'large-source-analyzed';
  return {
    stage: isLarge ? 'large-corpus' : 'complete-small-component',
    shardsAvailable: isLarge ? statusRow.shards : live.shardCount,
    shardsVisited: isLarge ? statusRow.shards : live.shardCount,
    episodesAvailable: sourceCoverage.availableEpisodes,
    episodesVisited: sourceCoverage.analyzed.episodes,
    diagnostic: isLarge ? {
      shardsVisited: stagedExecution.diagnosticShards,
      episodesVisited: stagedExecution.diagnosticEpisodes,
      complete: stagedExecution.diagnosticComplete,
      unvisitedEpisodes: sourceCoverage.availableEpisodes - stagedExecution.diagnosticEpisodes,
      stopReason: stagedExecution.diagnosticOmissions[0]?.reason ?? null,
    } : null,
  };
}

export function projectLiveResearchSource({
  live, statusRow, dedicatedAnalysis, combinedAnalysis, readiness, storedReadiness,
  stagedExecution, dedicatedRegistryCurrent, combinedRegistryCurrent,
  dedicatedEvidenceCurrent, combinedEvidenceCurrent,
}) {
  const dedicatedCoverage = coverageBySource(dedicatedAnalysis).get(live.sourceId);
  const dedicatedComponent = componentBySource(dedicatedAnalysis).get(live.sourceId)?.[0];
  const combinedCoverage = coverageBySource(combinedAnalysis).get(live.sourceId);
  if (!dedicatedCoverage || !dedicatedComponent || !combinedCoverage) {
    throw new TypeError(`Published analyses omit live source ${live.sourceId}.`);
  }
  const historical = historicalStage(statusRow);
  const isLarge = statusRow.state === 'large-source-analyzed';
  const exceptional = exceptionalSourceState(
    live, dedicatedCoverage, dedicatedComponent, readiness, storedReadiness,
    {
      dedicatedRegistryCurrent, combinedRegistryCurrent, dedicatedEvidenceCurrent,
      combinedEvidenceCurrent, isLarge,
    },
  );
  const state = exceptional?.state ?? historical;
  const projectedEpisodes = live.admission.projectedRows ?? dedicatedCoverage.availableEpisodes;
  if (projectedEpisodes > live.sourceRows) {
    throw new TypeError(`Live source ${live.sourceId} projects more episodes than source rows.`);
  }
  const trainingVisibleRows = sumSplitRows(live, 'training-visible');
  const nonTrainingRows = live.sourceRows - trainingVisibleRows;
  const stopReason = exceptional?.reason ?? null;
  return {
    sourceId: live.sourceId,
    revision: live.revision,
    state,
    registryState: exceptional?.state === 'superseded'
      ? 'superseded'
      : (live.manifestRegistryState === 'pilot-approved' ? 'reviewed' : state),
    manifestRegistryState: live.manifestRegistryState,
    acquisitionState: live.acquisition.state,
    projectionState: exceptional?.state ?? 'projected',
    analysisStage: exceptional?.state ?? historical,
    historicalAnalysisStage: historical,
    visibleComponents: [{
      componentId: live.componentId,
      kind: live.componentKind,
      rightsState: live.rightsState,
      splits: structuredClone(live.splits),
    }],
    counts: {
      sourceRows: live.sourceRows,
      trainingVisibleRows,
      nonTrainingRows,
      projectedEpisodes,
      visitedEpisodes: dedicatedCoverage.analyzed.episodes,
      combinedVisitedEpisodes: combinedCoverage.analyzed.episodes,
      excludedTrainingVisibleRows: trainingVisibleRows - projectedEpisodes,
      excludedNonTrainingRows: nonTrainingRows,
      excludedRows: live.sourceRows - projectedEpisodes,
    },
    identities: {
      sourceDigest: live.sourceDigest,
      manifestDigest: live.manifestDigest,
      componentId: live.componentId,
      projectionId: live.projectionId,
      projectionDigest: live.projectionDigest,
      contentMembershipDigest: live.contentMembershipDigest,
      splitCoverage: structuredClone(dedicatedComponent.splitCoverage),
      shardCount: live.shardCount,
      shardFormat: live.shardFormat,
      sourceAdmissionReceiptDigest: live.admission.receiptDigest,
      discoveryPlanArtifactDigest: live.admission.discoveryPlanArtifactDigest,
      discoveryPlanContentDigest: live.admission.discoveryPlanContentDigest,
      readinessReceiptDigest: isLarge ? readiness.receiptDigest : null,
      preflightReceiptDigest: isLarge ? readiness.bindings?.preflightReceiptDigest ?? null : null,
    },
    checkpoint: sourceCheckpoint(live, statusRow, dedicatedCoverage, stagedExecution),
    complete: exceptional === null && dedicatedCoverage.complete,
    historicalComplete: dedicatedCoverage.complete,
    stopReason,
    nextAllowedStage: nextAllowedStage(state, live.acquisition.state, historical),
  };
}

export function strongestExceptionalResearchState(sources) {
  for (const state of ['withdrawn', 'superseded', 'blocked']) {
    if (sources.some((source) => source.state === state)) return state;
  }
  return null;
}
