import { createHash } from 'node:crypto';
import {
  lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile,
} from 'node:fs/promises';
import {
  basename, dirname, isAbsolute, join, relative, resolve, sep,
} from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { sha256, stableStringify } from '../util.mjs';

export const PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_PROTOCOL =
  'eslm-processing-graph-diagnostic-export-manifest-v1';
export const PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST =
  'diagnostic-export-manifest.json';

const AUTHORITY = Object.freeze({
  evidence: 'reviewable-diagnostic-copy-only',
  answer: 'none',
  runtime: 'none',
  proof: 'none',
  catalog: 'none',
  publication: 'none',
  promotion: 'none',
});
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RUN_KINDS = Object.freeze(['pilot', 'scale']);
const ARTIFACT_LAYOUT = Object.freeze({
  pilot: Object.freeze({
    'pilot-analysis': 'pilot-analysis.json',
    'pilot-source-admission': 'pilot-source-admission.json',
    'pilot-status': 'pilot-status.json',
  }),
  scale: Object.freeze({
    'combined-analysis': 'combined-analysis.json',
    'combined-source-admission': 'combined-source-admission.json',
    'diagnostic-analysis': 'diagnostic-analysis.json',
    'oasst1-analysis': 'oasst1-analysis.json',
    'oasst1-source-admission': 'oasst1-source-admission.json',
    readiness: 'readiness.json',
    'scale-status': 'scale-status.json',
  }),
});
const PROTECTED_EXPORT_ROOTS = Object.freeze([
  resolve(PROJECT_ROOT, 'docs/results'),
  resolve(PROJECT_ROOT, 'training/research-sources'),
]);

function exactObject(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function assertRunKind(runKind) {
  if (!RUN_KINDS.includes(runKind)) {
    throw new TypeError(`Processing-graph diagnostic run kind must be one of: ${RUN_KINDS.join(', ')}.`);
  }
  return runKind;
}

function isWithin(path, root) {
  const local = relative(root, path);
  return local === '' || (local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local));
}

function resolvedOutputDirectory(outputDirectory) {
  if (typeof outputDirectory !== 'string' || outputDirectory.trim().length === 0
      || outputDirectory.includes('\0')) {
    throw new TypeError('Processing-graph diagnostic --output must name a non-empty directory.');
  }
  const target = resolve(outputDirectory);
  if (basename(target).length === 0) {
    throw new TypeError('Processing-graph diagnostic --output cannot be a filesystem root.');
  }
  const protectedRoot = PROTECTED_EXPORT_ROOTS.find((root) => isWithin(target, root));
  if (protectedRoot) {
    throw new TypeError(
      `Processing-graph diagnostics cannot target protected publication or review storage: ${protectedRoot}.`,
    );
  }
  return target;
}

async function pathExists(path, operations) {
  try {
    await operations.lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function defaultOperations() {
  return { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile };
}

export async function assertProcessingGraphDiagnosticExportTargetAvailable(
  outputDirectory, { operations: overrides = {} } = {},
) {
  const target = resolvedOutputDirectory(outputDirectory);
  const operations = { ...defaultOperations(), ...overrides };
  if (await pathExists(target, operations)) {
    throw new Error(
      `Processing-graph diagnostic export target already exists: ${target}. Choose a new directory.`,
    );
  }
  return target;
}

export function processingGraphDiagnosticByteSha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeArtifacts(runKind, artifacts) {
  const layout = ARTIFACT_LAYOUT[assertRunKind(runKind)];
  if (!Array.isArray(artifacts)) {
    throw new TypeError('Processing-graph diagnostic artifacts must be an array.');
  }
  const normalized = artifacts.map((artifact, index) => {
    exactObject(artifact, ['role', 'basename', 'bytes'], `Diagnostic artifact[${index}]`);
    if (layout[artifact.role] !== artifact.basename) {
      throw new TypeError(
        `Diagnostic artifact[${index}] does not match the closed ${runKind} role/basename layout.`,
      );
    }
    if (!Buffer.isBuffer(artifact.bytes) && typeof artifact.bytes !== 'string') {
      throw new TypeError(`Diagnostic artifact[${index}].bytes must be a Buffer or string.`);
    }
    return {
      role: artifact.role,
      basename: artifact.basename,
      bytes: Buffer.isBuffer(artifact.bytes) ? Buffer.from(artifact.bytes) : Buffer.from(artifact.bytes, 'utf8'),
    };
  }).toSorted((left, right) => left.role.localeCompare(right.role));
  const expectedRoles = Object.keys(layout).toSorted();
  if (stableStringify(normalized.map(({ role }) => role)) !== stableStringify(expectedRoles)) {
    throw new TypeError(
      `Processing-graph ${runKind} diagnostics require exactly these roles: ${expectedRoles.join(', ')}.`,
    );
  }
  if (new Set(normalized.map(({ basename: name }) => name)).size !== normalized.length) {
    throw new TypeError('Processing-graph diagnostic artifact basenames must be unique.');
  }
  return normalized;
}

function unsignedManifest(runKind, artifacts) {
  const normalized = normalizeArtifacts(runKind, artifacts);
  return {
    format: PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_PROTOCOL,
    runKind,
    artifacts: normalized.map(({ role, basename: name, bytes }) => ({
      role,
      basename: name,
      byteLength: bytes.byteLength,
      byteSha256: processingGraphDiagnosticByteSha256(bytes),
    })),
    authority: AUTHORITY,
  };
}

export function createProcessingGraphDiagnosticExportManifest({ runKind, artifacts }) {
  const unsigned = unsignedManifest(runKind, artifacts);
  return Object.freeze({
    ...unsigned,
    receiptDigest: `sha256:${sha256(stableStringify(unsigned))}`,
  });
}

export function assertProcessingGraphDiagnosticExportManifest(
  manifest, { runKind, artifacts } = {},
) {
  exactObject(
    manifest,
    ['format', 'runKind', 'artifacts', 'authority', 'receiptDigest'],
    'Processing-graph diagnostic export manifest',
  );
  assertRunKind(manifest.runKind);
  if (manifest.format !== PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_PROTOCOL
      || !DIGEST.test(manifest.receiptDigest)) {
    throw new TypeError('Processing-graph diagnostic export protocol or receipt digest is invalid.');
  }
  if (!Array.isArray(manifest.artifacts)) {
    throw new TypeError('Processing-graph diagnostic export artifacts must be an array.');
  }
  const layout = ARTIFACT_LAYOUT[manifest.runKind];
  for (const [index, artifact] of manifest.artifacts.entries()) {
    exactObject(
      artifact,
      ['role', 'basename', 'byteLength', 'byteSha256'],
      `Processing-graph diagnostic manifest artifact[${index}]`,
    );
    if (layout[artifact.role] !== artifact.basename
        || !Number.isSafeInteger(artifact.byteLength) || artifact.byteLength < 0
        || !DIGEST.test(artifact.byteSha256)) {
      throw new TypeError(`Processing-graph diagnostic manifest artifact[${index}] is invalid.`);
    }
  }
  const expectedRoles = Object.keys(layout).toSorted();
  if (stableStringify(manifest.artifacts.map(({ role }) => role)) !== stableStringify(expectedRoles)
      || stableStringify(manifest.authority) !== stableStringify(AUTHORITY)) {
    throw new TypeError('Processing-graph diagnostic export layout or authority is invalid.');
  }
  const unsigned = {
    format: manifest.format,
    runKind: manifest.runKind,
    artifacts: manifest.artifacts,
    authority: manifest.authority,
  };
  if (manifest.receiptDigest !== `sha256:${sha256(stableStringify(unsigned))}`) {
    throw new TypeError('Processing-graph diagnostic export receipt digest is invalid.');
  }
  if (runKind !== undefined && runKind !== manifest.runKind) {
    throw new TypeError('Processing-graph diagnostic export run kind does not match the expected run.');
  }
  if (artifacts !== undefined) {
    const expected = createProcessingGraphDiagnosticExportManifest({
      runKind: runKind ?? manifest.runKind,
      artifacts,
    });
    if (stableStringify(manifest) !== stableStringify(expected)) {
      throw new TypeError('Processing-graph diagnostic export does not bind the exact artifact bytes.');
    }
  }
  return manifest;
}

function requiredRecord(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} is required for a processing-graph diagnostic export.`);
  }
  return value;
}

function jsonBytes(value, path) {
  requiredRecord(value, path);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertDigestLink(actual, expected, path) {
  if (typeof expected !== 'string' || actual !== expected) {
    throw new TypeError(`${path} does not match the result receipt selected for diagnostic export.`);
  }
}

export function processingGraphPilotDiagnosticArtifacts(result) {
  requiredRecord(result, 'Pilot result');
  const analysis = requiredRecord(result.analysis, 'Pilot result.analysis');
  const admission = requiredRecord(result.sourceAdmissionGate, 'Pilot result.sourceAdmissionGate');
  const status = requiredRecord(result.status, 'Pilot result.status');
  assertDigestLink(status.analysisReceiptDigest, analysis.receiptDigest, 'Pilot status analysis digest');
  return normalizeArtifacts('pilot', [
    { role: 'pilot-analysis', basename: 'pilot-analysis.json',
      bytes: jsonBytes(analysis, 'Pilot result.analysis') },
    { role: 'pilot-source-admission', basename: 'pilot-source-admission.json',
      bytes: jsonBytes(admission, 'Pilot result.sourceAdmissionGate') },
    { role: 'pilot-status', basename: 'pilot-status.json',
      bytes: jsonBytes(status, 'Pilot result.status') },
  ]);
}

export function processingGraphScaleDiagnosticArtifacts(result) {
  requiredRecord(result, 'Scale result');
  const diagnostic = requiredRecord(result.diagnostic, 'Scale result.diagnostic');
  const oasst1Analysis = requiredRecord(result.oasst1Analysis, 'Scale result.oasst1Analysis');
  const analysis = requiredRecord(result.analysis, 'Scale result.analysis');
  const oasst1Admission = requiredRecord(
    result.oasst1AdmissionGate, 'Scale result.oasst1AdmissionGate',
  );
  const combinedAdmission = requiredRecord(
    result.crossSourceAdmissionGate, 'Scale result.crossSourceAdmissionGate',
  );
  const readiness = requiredRecord(result.readinessGate, 'Scale result.readinessGate');
  const status = requiredRecord(result.status, 'Scale result.status');
  assertDigestLink(
    status.oasst1AnalysisReceiptDigest,
    oasst1Analysis.receiptDigest,
    'Scale status OASST1 analysis digest',
  );
  assertDigestLink(
    status.analysisReceiptDigest,
    analysis.receiptDigest,
    'Scale status combined analysis digest',
  );
  assertDigestLink(
    status.readinessGateReceiptDigest,
    readiness.receiptDigest,
    'Scale status readiness digest',
  );
  return normalizeArtifacts('scale', [
    { role: 'combined-analysis', basename: 'combined-analysis.json',
      bytes: jsonBytes(analysis, 'Scale result.analysis') },
    { role: 'combined-source-admission', basename: 'combined-source-admission.json',
      bytes: jsonBytes(combinedAdmission, 'Scale result.crossSourceAdmissionGate') },
    { role: 'diagnostic-analysis', basename: 'diagnostic-analysis.json',
      bytes: jsonBytes(diagnostic, 'Scale result.diagnostic') },
    { role: 'oasst1-analysis', basename: 'oasst1-analysis.json',
      bytes: jsonBytes(oasst1Analysis, 'Scale result.oasst1Analysis') },
    { role: 'oasst1-source-admission', basename: 'oasst1-source-admission.json',
      bytes: jsonBytes(oasst1Admission, 'Scale result.oasst1AdmissionGate') },
    { role: 'readiness', basename: 'readiness.json',
      bytes: jsonBytes(readiness, 'Scale result.readinessGate') },
    { role: 'scale-status', basename: 'scale-status.json',
      bytes: jsonBytes(status, 'Scale result.status') },
  ]);
}

export async function exportProcessingGraphDiagnostics({
  runKind, result, outputDirectory, operations: overrides = {},
}) {
  const operations = { ...defaultOperations(), ...overrides };
  const target = await assertProcessingGraphDiagnosticExportTargetAvailable(
    outputDirectory, { operations },
  );
  const artifacts = runKind === 'pilot'
    ? processingGraphPilotDiagnosticArtifacts(result)
    : runKind === 'scale' ? processingGraphScaleDiagnosticArtifacts(result) : null;
  assertRunKind(runKind);
  const manifest = createProcessingGraphDiagnosticExportManifest({ runKind, artifacts });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const parent = dirname(target);
  await operations.mkdir(parent, { recursive: true });
  const canonicalParent = await operations.realpath(parent);
  const canonicalTarget = join(canonicalParent, basename(target));
  const protectedRoot = PROTECTED_EXPORT_ROOTS.find((root) => isWithin(canonicalTarget, root));
  if (protectedRoot) {
    throw new TypeError(
      `Processing-graph diagnostics cannot target protected publication or review storage: ${protectedRoot}.`,
    );
  }
  let stageRoot;
  try {
    stageRoot = await operations.mkdtemp(join(parent, '.eslm-processing-graph-diagnostic-'));
    for (const artifact of artifacts) {
      await operations.writeFile(join(stageRoot, artifact.basename), artifact.bytes, { flag: 'wx' });
    }
    await operations.writeFile(
      join(stageRoot, PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST),
      manifestBytes,
      { flag: 'wx' },
    );
    const stagedArtifacts = await Promise.all(artifacts.map(async (artifact) => ({
      ...artifact,
      bytes: await operations.readFile(join(stageRoot, artifact.basename)),
    })));
    const stagedManifest = JSON.parse(await operations.readFile(
      join(stageRoot, PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST),
      'utf8',
    ));
    assertProcessingGraphDiagnosticExportManifest(stagedManifest, { runKind, artifacts: stagedArtifacts });
    await assertProcessingGraphDiagnosticExportTargetAvailable(target, { operations });
    const exported = Object.freeze({
      outputDirectory: target,
      manifestPath: join(target, PROCESSING_GRAPH_DIAGNOSTIC_EXPORT_MANIFEST),
      manifest,
      artifacts: Object.freeze(Object.fromEntries(
        artifacts.map(({ role, basename: name }) => [role, join(target, name)]),
      )),
    });
    await operations.rename(stageRoot, target);
    return exported;
  } catch (error) {
    if (stageRoot) {
      try {
        await operations.rm(stageRoot, { recursive: true, force: true });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Processing-graph diagnostic export failed and its task-created staging directory could not be removed.',
        );
      }
    }
    throw error;
  }
}

export function parseProcessingGraphRunOptions(arguments_, runKind) {
  assertRunKind(runKind);
  if (!Array.isArray(arguments_)) {
    throw new TypeError(`Processing-graph ${runKind} arguments must be an array.`);
  }
  let publish = false;
  let output;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--publish') {
      if (publish) throw new Error(`Duplicate processing-graph ${runKind} option: --publish.`);
      publish = true;
      continue;
    }
    if (argument === '--output') {
      if (output !== undefined) throw new Error(`Duplicate processing-graph ${runKind} option: --output.`);
      const value = arguments_[index + 1];
      if (typeof value !== 'string' || value.length === 0 || value.startsWith('--')) {
        throw new Error(`Processing-graph ${runKind} --output requires a directory.`);
      }
      output = value;
      index += 1;
      continue;
    }
    if (typeof argument === 'string' && argument.startsWith('--output=')) {
      if (output !== undefined) throw new Error(`Duplicate processing-graph ${runKind} option: --output.`);
      output = argument.slice('--output='.length);
      if (output.length === 0) {
        throw new Error(`Processing-graph ${runKind} --output requires a directory.`);
      }
      continue;
    }
    throw new Error(`Unknown processing-graph ${runKind} option: ${argument}.`);
  }
  return Object.freeze({ publish, output });
}
