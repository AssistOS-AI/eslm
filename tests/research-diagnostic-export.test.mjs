import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lstat, mkdtemp, readFile, readdir, rename, rm, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST,
  assertProcessingGraphDiagnosticExportManifest,
  exportProcessingGraphDiagnostics,
  parseProcessingGraphRunOptions,
  processingGraphDiagnosticByteSha256,
  processingGraphPilotDiagnosticArtifacts,
  processingGraphScaleDiagnosticArtifacts,
} from '../src/interface/research-diagnostic-export.mjs';
import { researchCommand } from '../src/interface/research-command.mjs';

const A = `sha256:${'a'.repeat(64)}`;
const B = `sha256:${'b'.repeat(64)}`;
const C = `sha256:${'c'.repeat(64)}`;

function pilotResult() {
  return {
    analysis: { format: 'test-analysis', receiptDigest: A, hypotheses: [{ hypothesisId: 'h1' }] },
    sourceAdmissionGate: { format: 'test-admission', receiptDigest: B, decision: 'admitted' },
    status: { format: 'test-pilot-status', analysisReceiptDigest: A, stage: 'complete' },
  };
}

function scaleResult() {
  return {
    diagnostic: { format: 'test-analysis', receiptDigest: A, completeness: { complete: false } },
    oasst1Analysis: { format: 'test-analysis', receiptDigest: B, hypotheses: [] },
    analysis: { format: 'test-analysis', receiptDigest: C, hypotheses: [{ hypothesisId: 'h2' }] },
    oasst1AdmissionGate: { format: 'test-admission', receiptDigest: A, decision: 'admitted' },
    crossSourceAdmissionGate: { format: 'test-admission', receiptDigest: B, decision: 'admitted' },
    readinessGate: { format: 'test-readiness', receiptDigest: A, decision: 'admitted' },
    status: {
      format: 'test-scale-status',
      oasst1AnalysisReceiptDigest: B,
      analysisReceiptDigest: C,
      readinessGateReceiptDigest: A,
      stage: 'complete',
    },
  };
}

async function absent(path) {
  try {
    await lstat(path);
    return false;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
}

test('pilot diagnostic export atomically binds the exact reviewable bytes', async (context) => {
  const parent = await mkdtemp(join(tmpdir(), 'eslm-pilot-diagnostic-'));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const outputDirectory = join(parent, 'review');
  const result = pilotResult();
  const exported = await exportProcessingGraphDiagnostics({
    runKind: 'pilot', result, outputDirectory,
  });
  const manifest = JSON.parse(await readFile(exported.manifestPath, 'utf8'));
  const artifacts = processingGraphPilotDiagnosticArtifacts(result);
  assertProcessingGraphDiagnosticExportManifest(manifest, { runKind: 'pilot', artifacts });
  assert.equal(exported.manifest.receiptDigest, manifest.receiptDigest);
  assert.equal(manifest.authority.publication, 'none');
  assert.deepEqual((await readdir(outputDirectory)).toSorted(), [
    PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST,
    ...artifacts.map(({ basename }) => basename),
  ].toSorted());
  for (const artifact of artifacts) {
    const written = await readFile(join(outputDirectory, artifact.basename));
    assert.deepEqual(written, artifact.bytes);
    const entry = manifest.artifacts.find(({ role }) => role === artifact.role);
    assert.equal(entry.byteLength, written.byteLength);
    assert.equal(entry.byteSha256, processingGraphDiagnosticByteSha256(written));
  }
});

test('scale diagnostic export includes diagnostic, source-local, combined, admission, readiness, and status receipts',
  async (context) => {
    const parent = await mkdtemp(join(tmpdir(), 'eslm-scale-diagnostic-'));
    context.after(() => rm(parent, { recursive: true, force: true }));
    const outputDirectory = join(parent, 'review');
    const result = scaleResult();
    const exported = await exportProcessingGraphDiagnostics({
      runKind: 'scale', result, outputDirectory,
    });
    const manifest = JSON.parse(await readFile(exported.manifestPath, 'utf8'));
    const artifacts = processingGraphScaleDiagnosticArtifacts(result);
    assertProcessingGraphDiagnosticExportManifest(manifest, { runKind: 'scale', artifacts });
    assert.deepEqual(manifest.artifacts.map(({ role }) => role), [
      'combined-analysis',
      'combined-source-admission',
      'diagnostic-analysis',
      'oasst1-analysis',
      'oasst1-source-admission',
      'readiness',
      'scale-status',
    ]);
  });

test('diagnostic export refuses to overwrite an existing target before writing', async (context) => {
  const parent = await mkdtemp(join(tmpdir(), 'eslm-diagnostic-no-overwrite-'));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const outputDirectory = join(parent, 'review');
  await writeFile(outputDirectory, 'operator-owned\n');
  await assert.rejects(exportProcessingGraphDiagnostics({
    runKind: 'pilot', result: pilotResult(), outputDirectory,
  }), /target already exists/u);
  assert.equal(await readFile(outputDirectory, 'utf8'), 'operator-owned\n');
});

test('an injected staging failure leaves no target and removes only its task-created staging directory',
  async (context) => {
    const parent = await mkdtemp(join(tmpdir(), 'eslm-diagnostic-failure-'));
    context.after(() => rm(parent, { recursive: true, force: true }));
    const outputDirectory = join(parent, 'review');
    const keep = join(parent, 'operator-owned.txt');
    await writeFile(keep, 'keep\n');
    let calls = 0;
    const failingWrite = async (...arguments_) => {
      calls += 1;
      if (calls === 3) throw Object.assign(new Error('injected diagnostic write failure'), { code: 'EIO' });
      return writeFile(...arguments_);
    };
    await assert.rejects(exportProcessingGraphDiagnostics({
      runKind: 'pilot', result: pilotResult(), outputDirectory,
      operations: { writeFile: failingWrite },
    }), /injected diagnostic write failure/u);
    assert.equal(await absent(outputDirectory), true);
    assert.equal(await readFile(keep, 'utf8'), 'keep\n');
    assert.deepEqual(await readdir(parent), ['operator-owned.txt']);
  });

test('an injected atomic rename failure leaves no partial target', async (context) => {
  const parent = await mkdtemp(join(tmpdir(), 'eslm-diagnostic-rename-failure-'));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const outputDirectory = join(parent, 'review');
  let injected = false;
  const failingRename = async (...arguments_) => {
    if (!injected) {
      injected = true;
      throw Object.assign(new Error('injected diagnostic rename failure'), { code: 'EIO' });
    }
    return rename(...arguments_);
  };
  await assert.rejects(exportProcessingGraphDiagnostics({
    runKind: 'pilot', result: pilotResult(), outputDirectory,
    operations: { rename: failingRename },
  }), /injected diagnostic rename failure/u);
  assert.equal(await absent(outputDirectory), true);
  assert.deepEqual(await readdir(parent), []);
});

test('diagnostic export rejects publication and review storage targets', async () => {
  await assert.rejects(exportProcessingGraphDiagnostics({
    runKind: 'pilot', result: pilotResult(),
    outputDirectory: resolve('docs/results/operator-diagnostic'),
  }), /protected publication or review storage/u);
  await assert.rejects(exportProcessingGraphDiagnostics({
    runKind: 'pilot', result: pilotResult(),
    outputDirectory: resolve('training/research-sources/operator-diagnostic'),
  }), /protected publication or review storage/u);
});

test('research command keeps diagnostic export and publication as explicit independent effects', async () => {
  const events = [];
  const output = [];
  const result = pilotResult();
  result.analysis.handoff = { eligible: false };
  await researchCommand(
    ['graph', 'pilot'],
    { output: '/tmp/eslm-command-diagnostic' },
    {
      printJson: (value) => output.push(value),
      runPilot: async () => { events.push('run'); return result; },
      publishPilot: async () => { events.push('publish'); return { receiptDigest: C }; },
      assertDiagnosticTarget: async () => events.push('target'),
      exportDiagnostics: async () => {
        events.push('export');
        return { manifest: { receiptDigest: B } };
      },
    },
  );
  assert.deepEqual(events, ['target', 'run', 'export']);
  assert.equal(output[0].diagnosticExport.manifest.receiptDigest, B);
  assert.equal(output[0].published, null);

  events.length = 0;
  output.length = 0;
  await researchCommand(
    ['graph', 'pilot'],
    { output: '/tmp/eslm-command-diagnostic-2', publish: true },
    {
      printJson: (value) => output.push(value),
      runPilot: async () => { events.push('run'); return result; },
      publishPilot: async () => { events.push('publish'); return { receiptDigest: C }; },
      assertDiagnosticTarget: async () => events.push('target'),
      exportDiagnostics: async () => { events.push('export'); return { manifest: { receiptDigest: B } }; },
    },
  );
  assert.deepEqual(events, ['target', 'run', 'export', 'publish']);
  assert.equal(output[0].published.receiptDigest, C);
});

test('standalone research runners parse only publish and one explicit diagnostic output', () => {
  assert.deepEqual(
    parseProcessingGraphRunOptions(['--output', '/tmp/review', '--publish'], 'pilot'),
    { output: '/tmp/review', publish: true },
  );
  assert.deepEqual(
    parseProcessingGraphRunOptions(['--output=/tmp/review'], 'scale'),
    { output: '/tmp/review', publish: false },
  );
  assert.throws(
    () => parseProcessingGraphRunOptions(['--output'], 'pilot'),
    /--output requires a directory/u,
  );
  assert.throws(
    () => parseProcessingGraphRunOptions(['--output=a', '--output=b'], 'scale'),
    /Duplicate/u,
  );
  assert.throws(
    () => parseProcessingGraphRunOptions(['--unknown'], 'pilot'),
    /Unknown/u,
  );
});
