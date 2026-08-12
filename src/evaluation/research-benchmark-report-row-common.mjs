import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile } from '../util.mjs';
import { benchmarkCatalogFields } from './benchmark-report-catalog.mjs';
import { benchmarkReportFields } from './benchmark-report-contract.mjs';

export async function receipt(relativePath) {
  return JSON.parse(await readFile(join(PROJECT_ROOT, relativePath), 'utf8'));
}

function rate(count, total) {
  return Number.isInteger(count) && total ? count / total : null;
}

export async function executedRow(id, data) {
  const reportFields = benchmarkReportFields(id, data);
  const executedAt = data.executedAt ?? null;
  const sourceEvidence = await Promise.all(data.sourceEvidence.map(async (item) => Object.freeze({
    ...item,
    ...(item.sha256 ? {} : { sha256: await hashFile(join(PROJECT_ROOT, item.path)) }),
  })));
  return Object.freeze({
    id,
    evidenceState: data.evidenceState,
    protocol: data.protocol,
    protocolDescription: data.protocolDescription,
    samplePolicy: data.samplePolicy,
    sampleDescription: data.sampleDescription,
    splitQuality: data.splitQuality,
    ...reportFields,
    normalizationCandidates: reportFields.inputRoute === 'raw-language' ? data.normalizationCandidates : null,
    normalizationCandidateRate: reportFields.inputRoute === 'raw-language'
      ? rate(data.normalizationCandidates, data.total) : null,
    agentInvocations: data.agentInvocations,
    agentInvocationRate: rate(data.agentInvocations, data.total),
    resultOrigin: 'stored-receipt',
    checkpointState: 'historical-unverified',
    executionEvidence: Object.freeze({
      origin: 'stored-receipt',
      ...(executedAt ? { executedAt } : {}),
      ...(data.executionRoute ? { executionRoute: data.executionRoute } : {}),
      checkpointVerification: Object.freeze({
        state: 'not-audited',
        currentnessClaim: false,
        meaning: 'The stored receipt is historical until a registered cryptographic audit proves its checkpoint.',
      }),
      ...(!executedAt ? {
        reportingCompleteness: Object.freeze({
          state: 'incomplete', missingFields: Object.freeze(['executedAt']),
        }),
      } : {}),
    }),
    statusCounts: data.statusCounts,
    sampleCoverage: Object.freeze(data.sampleCoverage),
    capabilityCoverage: Object.freeze(data.capabilityCoverage),
    diagnosis: data.diagnosis,
    comparability: data.comparability,
    sourceEvidence: Object.freeze(sourceEvidence),
    evaluationIdentities: Object.freeze({
      scorer: data.scorerIdentity ?? data.protocol,
      oracle: data.oracleIdentity ?? 'host-only source oracle joined after prediction',
      partition: data.partitionIdentity ?? data.samplePolicy,
    }),
    selectedMethods: Object.freeze(data.selectedMethods ?? []),
    usedKbVersions: Object.freeze(data.usedKbVersions ?? []),
    selectedKbVersions: Object.freeze(data.selectedKbVersions ?? []),
    languagePolicy: Object.freeze(data.languagePolicy ?? {
      externalLanguageAgent: false,
      routeMeasurement: reportFields.inputRoute === 'raw-language' ? 'measured' : 'not-applicable-to-adapter-route',
    }),
    resourcePolicy: Object.freeze(data.resourcePolicy ?? { state: 'not-recorded-in-source-receipt' }),
    resourceEvidence: data.resourceEvidence ? Object.freeze(data.resourceEvidence) : null,
    ...(Number.isInteger(data.completionCount) ? { completionCount: data.completionCount } : {}),
    ...(Number.isFinite(data.completionRate) ? { completionRate: data.completionRate } : {}),
    replayCommand: data.replayCommand ?? null,
    behaviorDependency: data.behaviorDependency ?? null,
    ...(data.developmentResult ? { developmentResult: Object.freeze(data.developmentResult) } : {}),
    ...(data.strata ? { strata: Object.freeze(data.strata) } : {}),
    ...(data.subtrackResults ? { subtrackResults: Object.freeze(data.subtrackResults) } : {}),
    ...benchmarkCatalogFields(id),
  });
}
