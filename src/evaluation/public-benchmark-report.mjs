import {
  auditFreshBenchmarkReceipts, FRESH_RECEIPT_AUDIT_DEFINITIONS,
} from './benchmark-receipt-audit.mjs';
import { validatePublicBenchmarkRows } from './benchmark-report-contract.mjs';
import { RESEARCH_BENCHMARK_CATALOG } from './benchmark-research-catalog.mjs';
import { executePublicBenchmarkRows } from './public-benchmark-probes.mjs';
import { researchBenchmarkReportRows } from './research-benchmark-report-rows.mjs';

export function assemblePublicBenchmarkReport(rows, options = {}) {
  const assembledAt = options.assembledAt ?? new Date().toISOString();
  const requestedBenchmarkIds = Object.freeze([...(options.selected ?? rows.map((row) => row.id))]);
  const executedNowIds = Object.freeze(rows.filter((row) => row.resultOrigin === 'current-execution')
    .map((row) => row.id));
  const receiptIds = Object.freeze(rows.filter((row) => row.resultOrigin === 'stored-receipt')
    .map((row) => row.id));
  const notExecutedIds = Object.freeze(rows.filter((row) => !['current-execution', 'stored-receipt']
    .includes(row.resultOrigin)).map((row) => row.id));
  return Object.freeze({
    format: 'eslm-public-benchmark-probe-report-v2',
    assembledAt,
    assembly: Object.freeze({
      mode: executedNowIds.length > 0 && receiptIds.length > 0
        ? 'mixed-current-execution-and-stored-receipts'
        : executedNowIds.length > 0 ? 'current-row-execution'
          : receiptIds.length > 0 ? 'stored-receipt-assembly' : 'no-execution-assembly',
      requestedBenchmarkIds,
      executedNowIds,
      receiptIds,
      notExecutedIds,
      ...(options.receiptAudit ? { receiptAudit: options.receiptAudit.summary } : {}),
    }),
    evidenceRegime: 'Current fresh evaluations, historical or invalid receipts, development probes, and diagnostics are labeled separately; forced-choice abstentions remain in the end-to-end denominator while selective accuracy stays null when there are no attempts.',
    languageAgentPolicy: 'No Language Agent calls were made. normalizationCandidateRate counts direct UNPARSED cases that would trigger the optional profile; null means that direct-language eligibility was not measured.',
    rows: Object.freeze([...rows]),
  });
}

function withReceiptAudit(row, audit) {
  if (!audit) return row;
  const mismatches = audit.dependencies.files.filter((item) => item.state !== 'match');
  const evidenceState = (current) => {
    if (audit.state === 'current' || !current?.includes('fresh')) return current;
    if (['historical-stale', 'historical-unrecoverable'].includes(audit.state)) {
      return 'historical-fresh-evaluation';
    }
    return audit.state === 'invalid' ? 'invalid-fresh-evaluation' : 'unavailable-fresh-evaluation';
  };
  const executionEvidence = (existing = {}) => Object.freeze({
    ...existing,
    ...(audit.executedAt && !existing.executedAt ? { executedAt: audit.executedAt } : {}),
    frozenAt: audit.frozenAt,
    freeze: audit.freeze,
    result: audit.result,
    auxiliaryArtifacts: audit.auxiliaryArtifacts,
    receiptBindingState: audit.receiptBinding.state,
    receiptValidity: audit.receiptValidity,
    checkpointVerification: Object.freeze({
      state: 'cryptographic-audit',
      outcome: audit.state,
      currentnessClaim: audit.state === 'current',
    }),
    dependencyAudit: Object.freeze({
      state: audit.state,
      checked: audit.dependencies.checked,
      matching: audit.dependencies.matching,
      changed: audit.dependencies.changed,
      missing: audit.dependencies.missing,
      mismatches: Object.freeze(mismatches),
    }),
  });
  if (audit.scope.kind === 'subtrack') {
    let matched = false;
    const subtrackResults = (row.subtrackResults ?? []).map((subtrack) => {
      if (subtrack.id !== audit.scope.id) return subtrack;
      matched = true;
      const updatedState = evidenceState(subtrack.evidenceState);
      return Object.freeze({
        ...subtrack,
        ...(updatedState !== subtrack.evidenceState
          ? { recordedEvidenceState: subtrack.evidenceState, evidenceState: updatedState } : {}),
        checkpointState: audit.state,
        executionEvidence: executionEvidence({ executedAt: subtrack.executedAt ?? audit.executedAt }),
      });
    });
    if (!matched) throw new Error(`${row.id}: receipt audit targets absent subtrack ${audit.scope.id}.`);
    return Object.freeze({
      ...row,
      subtrackResults: Object.freeze(subtrackResults),
      receiptAudits: Object.freeze([{ scope: audit.scope, state: audit.state }]),
    });
  }
  const updatedState = evidenceState(row.evidenceState);
  return Object.freeze({
    ...row,
    ...(updatedState !== row.evidenceState
      ? { recordedEvidenceState: row.evidenceState, evidenceState: updatedState } : {}),
    checkpointState: audit.state,
    executionEvidence: executionEvidence(row.executionEvidence),
  });
}

export async function runPublicBenchmarkProbes(engines, options = {}) {
  const selected = options.selected ?? [
    'blimp', 'babi', 'clutrr', 'entityTracking', 'ewok', 'storyCloze', 'simpleqa',
    ...Object.keys(RESEARCH_BENCHMARK_CATALOG),
  ];
  const legacyRows = options.legacyRows
    ? Object.freeze([...options.legacyRows])
    : await executePublicBenchmarkRows(engines, { ...options, selected });
  const researchIds = selected.filter((id) => RESEARCH_BENCHMARK_CATALOG[id]);
  const researchRows = await researchBenchmarkReportRows({ selectedIds: researchIds });
  const byId = new Map([...legacyRows, ...researchRows].map((row) => [row.id, row]));
  const missingRequestedIds = selected.filter((id) => !byId.has(id));
  if (missingRequestedIds.length > 0) {
    throw new Error(`Public benchmark report assembly is missing requested rows: ${missingRequestedIds.join(', ')}.`);
  }
  const auditDefinitions = FRESH_RECEIPT_AUDIT_DEFINITIONS.filter((definition) => selected.includes(definition.id));
  const receiptAudit = await auditFreshBenchmarkReceipts({ definitions: auditDefinitions });
  const auditsById = new Map(receiptAudit.rows.map((audit) => [audit.id, audit]));
  const rows = selected.map((id) => byId.get(id))
    .map((row) => withReceiptAudit(row, auditsById.get(row.id)));
  validatePublicBenchmarkRows(rows, selected, {
    requireExecutionResources: options.requireExecutionResources === true,
  });
  return assemblePublicBenchmarkReport(rows, { selected, receiptAudit });
}
