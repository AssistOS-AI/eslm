#!/usr/bin/env node
import {
  publishProcessingGraphScale,
  runProcessingGraphScale,
} from '../src/research/processing-graph-scale-runner.mjs';
import {
  assertProcessingGraphDiagnosticExportTargetAvailable,
  exportProcessingGraphDiagnostics,
  parseProcessingGraphRunOptions,
} from '../src/interface/research-diagnostic-export.mjs';

const options = parseProcessingGraphRunOptions(process.argv.slice(2), 'scale');
if (options.output !== undefined) {
  await assertProcessingGraphDiagnosticExportTargetAvailable(options.output);
}
const result = await runProcessingGraphScale();
const diagnosticExport = options.output !== undefined
  ? await exportProcessingGraphDiagnostics({
    runKind: 'scale', result, outputDirectory: options.output,
  })
  : null;
const published = options.publish ? await publishProcessingGraphScale(result) : null;
process.stdout.write(`${JSON.stringify({
  format: result.status.format,
  stage: result.status.stage,
  stagedExecution: result.status.stagedExecution,
  readiness: {
    decision: result.readinessGate.decision,
    receiptDigest: result.readinessGate.receiptDigest,
    peakBytes: result.readinessGate.readiness.streaming.peakBytes,
    maximumPeakBytes: result.readinessGate.readiness.streaming.maximumPeakBytes,
  },
  analysis: {
    episodes: result.analysis.work.episodesAnalyzed,
    events: result.analysis.work.eventsVisited,
    votes: result.analysis.work.votesRetained,
    hypotheses: result.analysis.work.hypothesesRetained,
    receiptDigest: result.analysis.receiptDigest,
    handoff: result.analysis.handoff,
  },
  oasst1Analysis: {
    episodes: result.oasst1Analysis.work.episodesAnalyzed,
    hypotheses: result.oasst1Analysis.work.hypothesesRetained,
    receiptDigest: result.oasst1Analysis.receiptDigest,
    complete: result.oasst1Analysis.completeness.complete,
  },
  diagnosticExport,
  published,
}, null, 2)}\n`);
