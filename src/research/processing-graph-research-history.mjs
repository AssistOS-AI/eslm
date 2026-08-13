import { assertLargeSourceReadinessGate } from './large-source-readiness-gate.mjs';
import { stableStringify } from '../util.mjs';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const ANALYSIS_IDS = Object.freeze({
  pilot: 'helpsteer2-gsm8k-small-pilot',
  largeSource: 'oasst1-complete-source-analysis',
  combined: 'three-source-processing-graph-analysis',
});

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || JSON.stringify(Object.keys(value).toSorted()) !== JSON.stringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function count(value, path, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new TypeError(`${path} must be a bounded ${positive ? 'positive' : 'non-negative'} integer.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function assertSourceRow(row, index) {
  const path = `Processing-graph source status[${index}]`;
  const common = ['sourceId', 'state', 'rawRows', 'projectedEpisodes', 'projectionDigest', 'complete'];
  const largeOnly = [
    'rawMessages', 'projectedMessages', 'excludedRows', 'projectionManifestDigest', 'shards',
  ];
  if (row?.state === 'pilot-analyzed') exact(row, common, path);
  else if (row?.state === 'large-source-analyzed') exact(row, [...common, ...largeOnly], path);
  else throw new TypeError(`${path}.state is unsupported.`);
  if (typeof row.sourceId !== 'string' || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(row.sourceId)) {
    throw new TypeError(`${path}.sourceId must be a canonical identifier.`);
  }
  count(row.rawRows, `${path}.rawRows`, { positive: true });
  count(row.projectedEpisodes, `${path}.projectedEpisodes`, { positive: true });
  digest(row.projectionDigest, `${path}.projectionDigest`);
  if (row.projectedEpisodes > row.rawRows || typeof row.complete !== 'boolean') {
    throw new TypeError(`${path} projection counts or completeness are inconsistent.`);
  }
  if (row.state === 'large-source-analyzed') {
    for (const field of ['rawMessages', 'projectedMessages', 'excludedRows']) {
      count(row[field], `${path}.${field}`);
    }
    count(row.shards, `${path}.shards`, { positive: true });
    digest(row.projectionManifestDigest, `${path}.projectionManifestDigest`);
    if (row.projectedEpisodes + row.excludedRows !== row.rawRows
        || row.projectedMessages > row.rawMessages) {
      throw new TypeError(`${path} large-source projection counts do not reconcile.`);
    }
  }
}

function assertStagedExecution(value) {
  const fields = [
    'diagnosticShards', 'diagnosticEpisodes', 'diagnosticComplete', 'diagnosticOmissions',
    'fullShards', 'fullLargeSourceEpisodes', 'fullLargeSourceComplete',
    'crossSourceEpisodesAvailable', 'crossSourceEpisodesAnalyzed', 'crossSourceComplete',
  ];
  exact(value, fields, 'Processing-graph staged execution');
  for (const field of [
    'diagnosticShards', 'diagnosticEpisodes', 'fullShards', 'fullLargeSourceEpisodes',
    'crossSourceEpisodesAvailable', 'crossSourceEpisodesAnalyzed',
  ]) count(value[field], `Processing-graph staged execution.${field}`, { positive: true });
  if (value.diagnosticComplete !== false || value.fullLargeSourceComplete !== true
      || value.crossSourceComplete !== false || value.diagnosticShards >= value.fullShards
      || value.diagnosticEpisodes >= value.fullLargeSourceEpisodes
      || value.crossSourceEpisodesAnalyzed >= value.crossSourceEpisodesAvailable
      || !Array.isArray(value.diagnosticOmissions) || value.diagnosticOmissions.length < 1) {
    throw new TypeError('Processing-graph staged execution does not preserve its bounded frontiers.');
  }
  for (const [index, omission] of value.diagnosticOmissions.entries()) {
    exact(omission, ['scope', 'reason', 'count'], `Processing-graph diagnostic omission[${index}]`);
    if (typeof omission.scope !== 'string' || typeof omission.reason !== 'string') {
      throw new TypeError('Processing-graph diagnostic omission labels must be strings.');
    }
    count(omission.count, `Processing-graph diagnostic omission[${index}].count`, { positive: true });
  }
  if (!value.diagnosticOmissions.some((item) => item.reason === 'projection-membership-incomplete')) {
    throw new TypeError('Processing-graph diagnostic status must retain its incomplete membership frontier.');
  }
}

export function assertProcessingGraphSourceStatus(value) {
  exact(value, [
    'format', 'stage', 'sources', 'stagedExecution', 'oasst1AnalysisReceiptDigest',
    'analysisReceiptDigest', 'readinessGateReceiptDigest', 'hypotheses', 'nextGate', 'authority',
  ], 'Processing-graph source status');
  if (value.format !== 'eslm-processing-graph-scale-status-v1'
      || value.stage !== 'complete-large-source-bounded-cross-source-analysis'
      || value.authority !== 'research-status-only'
      || value.nextGate !== 'manual-consolidation-and-independent-transfer'
      || !Array.isArray(value.sources) || value.sources.length !== 3) {
    throw new TypeError('Processing-graph source status is malformed or unsupported.');
  }
  for (const [index, row] of value.sources.entries()) assertSourceRow(row, index);
  if (new Set(value.sources.map((row) => row.sourceId)).size !== value.sources.length
      || value.sources.filter((row) => row.state === 'pilot-analyzed').length !== 2
      || value.sources.filter((row) => row.state === 'large-source-analyzed').length !== 1) {
    throw new TypeError('Processing-graph source states must identify two pilot and one large source.');
  }
  assertStagedExecution(value.stagedExecution);
  digest(value.oasst1AnalysisReceiptDigest, 'Processing-graph OASST1 receipt digest');
  digest(value.analysisReceiptDigest, 'Processing-graph combined receipt digest');
  digest(value.readinessGateReceiptDigest, 'Processing-graph readiness-gate receipt digest');
  count(value.hypotheses, 'Processing-graph retained hypotheses');
  return value;
}

export function coverageBySource(analysis) {
  return new Map(analysis.coverage.sources.map((row) => [row.sourceId, row]));
}

export function componentBySource(analysis) {
  const grouped = new Map();
  for (const row of analysis.coverage.componentProjections) {
    const rows = grouped.get(row.sourceId) ?? [];
    rows.push(row);
    grouped.set(row.sourceId, rows);
  }
  return grouped;
}

function assertSourceCoverage(analysis, statusRows, path, { compareCompleteness }) {
  if (analysis.registry.sourceCount !== statusRows.length
      || analysis.coverage.sources.length !== statusRows.length) {
    throw new TypeError(`${path} source count does not match the source-status stage.`);
  }
  const coverage = coverageBySource(analysis);
  const components = componentBySource(analysis);
  for (const row of statusRows) {
    const source = coverage.get(row.sourceId);
    const sourceComponents = components.get(row.sourceId) ?? [];
    if (!source || sourceComponents.length !== 1 || source.componentCount !== 1
        || source.projectionCount !== 1 || source.availableEpisodes !== row.projectedEpisodes
        || sourceComponents[0].projectionDigest !== row.projectionDigest
        || (compareCompleteness && source.complete !== row.complete)) {
      throw new TypeError(`${path} source ${row.sourceId} does not reconcile with source status.`);
    }
  }
  if (coverage.size !== statusRows.length) {
    throw new TypeError(`${path} contains an undeclared source.`);
  }
}

function assertSameSourceIdentity(dedicated, combined, sourceIds) {
  const dedicatedCoverage = coverageBySource(dedicated);
  const combinedCoverage = coverageBySource(combined);
  const dedicatedComponents = componentBySource(dedicated);
  const combinedComponents = componentBySource(combined);
  for (const sourceId of sourceIds) {
    const first = dedicatedCoverage.get(sourceId);
    const second = combinedCoverage.get(sourceId);
    const firstComponent = dedicatedComponents.get(sourceId)?.[0];
    const secondComponent = combinedComponents.get(sourceId)?.[0];
    if (!first || !second || !firstComponent || !secondComponent
        || first.revision !== second.revision
        || first.availableEpisodes !== second.availableEpisodes
        || firstComponent.componentId !== secondComponent.componentId
        || firstComponent.projectionId !== secondComponent.projectionId
        || firstComponent.projectionDigest !== secondComponent.projectionDigest
        || firstComponent.contentMembershipDigest !== secondComponent.contentMembershipDigest
        || stableStringify(firstComponent.splitCoverage.map((row) => ({
          split: row.split, visibility: row.visibility,
          rowsDeclared: row.rowsDeclared, rowsAdmitted: row.rowsAdmitted,
        }))) !== stableStringify(secondComponent.splitCoverage.map((row) => ({
          split: row.split, visibility: row.visibility,
          rowsDeclared: row.rowsDeclared, rowsAdmitted: row.rowsAdmitted,
        })))) {
      throw new TypeError(`Processing-graph source ${sourceId} changes identity between stage receipts.`);
    }
  }
}

function sameAuthority(left, right) {
  return ['answer', 'runtime', 'proof', 'promotion', 'executablePolicy']
    .every((field) => left[field] === right[field]);
}

export function processingGraphHistoricalFullAnalysisDigest(receipt) {
  const value = receipt?.fullAnalysis?.receiptDigest;
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError('Historical public receipt does not bind a full analysis digest.');
  }
  return value;
}

export function assertProcessingGraphHistoricalStages(
  pilot, readinessValue, largeSource, combined, sourceStatus,
) {
  const readiness = assertLargeSourceReadinessGate(readinessValue);
  if (readiness.decision !== 'admit' || readiness.failures.length !== 0) {
    throw new TypeError('Published processing-graph execution contradicts a blocked readiness receipt.');
  }
  if (pilot.analysis.analysisId !== ANALYSIS_IDS.pilot
      || pilot.analysis.progressionStage !== 'pilot'
      || !pilot.completeness.complete || !pilot.handoff.eligible
      || pilot.handoff.recommendedStage !== 'scale'
      || largeSource.analysis.analysisId !== ANALYSIS_IDS.largeSource
      || largeSource.analysis.progressionStage !== 'scale'
      || !largeSource.completeness.complete || largeSource.handoff.eligible
      || !largeSource.handoff.blockingReasons.includes('insufficient-independent-sources')
      || combined.analysis.analysisId !== ANALYSIS_IDS.combined
      || combined.analysis.progressionStage !== 'scale'
      || combined.completeness.complete || combined.handoff.eligible
      || !combined.handoff.blockingReasons.includes('max-episodes')) {
    throw new TypeError('Processing-graph analyses do not preserve the pilot, large, and bounded combined stages.');
  }
  const pilotRows = sourceStatus.sources.filter((row) => row.state === 'pilot-analyzed');
  const largeRows = sourceStatus.sources.filter((row) => row.state === 'large-source-analyzed');
  const [readinessSourceId, readinessRevision] = readiness.readiness.sourceRevision.split('@');
  const readinessCoverage = largeSource.coverage.sources[0];
  const readinessComponent = largeSource.coverage.componentProjections[0];
  if (readinessSourceId !== readinessCoverage.sourceId
      || readinessRevision !== readinessCoverage.revision
      || readiness.readiness.componentId !== readinessComponent.componentId
      || readiness.readiness.projectionId !== readinessComponent.projectionId
      || readiness.readiness.pilotProjectionDigest !== readinessComponent.projectionDigest
      || readiness.readiness.pilot.rowsAvailable !== readinessCoverage.availableEpisodes) {
    throw new TypeError('Processing-graph readiness gate does not match the analyzed large-source projection.');
  }
  assertSourceCoverage(pilot, pilotRows, 'Processing-graph pilot', { compareCompleteness: true });
  assertSourceCoverage(largeSource, largeRows, 'Processing-graph large-source analysis', {
    compareCompleteness: true,
  });
  assertSourceCoverage(combined, sourceStatus.sources, 'Processing-graph combined analysis', {
    compareCompleteness: false,
  });
  assertSameSourceIdentity(pilot, combined, pilotRows.map((row) => row.sourceId));
  assertSameSourceIdentity(largeSource, combined, largeRows.map((row) => row.sourceId));
  const staged = sourceStatus.stagedExecution;
  if (staged.fullLargeSourceEpisodes !== largeSource.work.episodesAnalyzed
      || staged.crossSourceEpisodesAvailable !== combined.work.episodesAvailable
      || staged.crossSourceEpisodesAnalyzed !== combined.work.episodesAnalyzed
      || staged.fullLargeSourceComplete !== largeSource.completeness.complete
      || staged.crossSourceComplete !== combined.completeness.complete
      || sourceStatus.analysisReceiptDigest !== processingGraphHistoricalFullAnalysisDigest(combined)
      || sourceStatus.oasst1AnalysisReceiptDigest
        !== processingGraphHistoricalFullAnalysisDigest(largeSource)
      || sourceStatus.readinessGateReceiptDigest !== readiness.receiptDigest
      || sourceStatus.hypotheses !== combined.hypotheses.length
      || !sameAuthority(pilot.authority, largeSource.authority)
      || !sameAuthority(pilot.authority, combined.authority)) {
    throw new TypeError('Processing-graph research status contradicts its stage receipts.');
  }
  return readiness;
}
