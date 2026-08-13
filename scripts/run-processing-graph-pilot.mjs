#!/usr/bin/env node
import {
  publishProcessingGraphPilot,
  runProcessingGraphPilot,
} from '../src/research/processing-graph-pilot-runner.mjs';
import {
  assertProcessingGraphDiagnosticExportTargetAvailable,
  exportProcessingGraphDiagnostics,
  parseProcessingGraphRunOptions,
} from '../src/interface/research-diagnostic-export.mjs';

const options = parseProcessingGraphRunOptions(process.argv.slice(2), 'pilot');
if (options.output !== undefined) {
  await assertProcessingGraphDiagnosticExportTargetAvailable(options.output);
}
const result = await runProcessingGraphPilot();
const diagnosticExport = options.output !== undefined
  ? await exportProcessingGraphDiagnostics({
    runKind: 'pilot', result, outputDirectory: options.output,
  })
  : null;
const published = options.publish ? await publishProcessingGraphPilot(result) : null;
process.stdout.write(`${JSON.stringify({
  format: result.status.format,
  stage: result.status.stage,
  aggregate: result.status.aggregate,
  registryDigest: result.registry.digest,
  analysisReceiptDigest: result.analysis.receiptDigest,
  handoff: result.analysis.handoff,
  diagnosticExport,
  published,
}, null, 2)}\n`);
