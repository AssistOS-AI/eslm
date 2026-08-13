import {
  publishProcessingGraphPilot, runProcessingGraphPilot,
} from '../research/processing-graph-pilot-runner.mjs';
import {
  publishProcessingGraphScale, runProcessingGraphScale,
} from '../research/processing-graph-scale-runner.mjs';
import { processingGraphResearchStatus } from '../research/processing-graph-research-status.mjs';
import {
  assertProcessingGraphDiagnosticExportTargetAvailable,
  exportProcessingGraphDiagnostics,
} from './research-diagnostic-export.mjs';

export async function researchCommand(args, options, {
  printJson,
  researchStatus = processingGraphResearchStatus,
  runPilot = runProcessingGraphPilot,
  publishPilot = publishProcessingGraphPilot,
  runScale = runProcessingGraphScale,
  publishScale = publishProcessingGraphScale,
  assertDiagnosticTarget = assertProcessingGraphDiagnosticExportTargetAvailable,
  exportDiagnostics = exportProcessingGraphDiagnostics,
}) {
  if (args[0] !== 'graph') throw new Error('research currently supports only the graph program.');
  const action = args[1];
  if (action === 'status') {
    if (options.publish) {
      throw new Error('research graph status is read-only and rejects --publish.');
    }
    if (options.output !== undefined) {
      throw new Error('research graph status does not produce a diagnostic --output directory.');
    }
    printJson(await researchStatus());
    return;
  }
  if (action === 'pilot') {
    if (options.output !== undefined) await assertDiagnosticTarget(options.output);
    const result = await runPilot();
    const diagnosticExport = options.output !== undefined ? await exportDiagnostics({
      runKind: 'pilot', result, outputDirectory: options.output,
    }) : null;
    const published = options.publish ? await publishPilot(result) : null;
    printJson({
      status: result.status,
      handoff: result.analysis.handoff,
      diagnosticExport,
      published,
    });
    return;
  }
  if (action === 'scale') {
    if (options.output !== undefined) await assertDiagnosticTarget(options.output);
    const result = await runScale();
    const diagnosticExport = options.output !== undefined ? await exportDiagnostics({
      runKind: 'scale', result, outputDirectory: options.output,
    }) : null;
    const published = options.publish ? await publishScale(result) : null;
    printJson({
      status: result.status,
      handoff: result.analysis.handoff,
      diagnosticExport,
      published,
    });
    return;
  }
  throw new Error('research graph expects status, pilot, or scale.');
}
