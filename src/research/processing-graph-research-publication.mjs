import { createHash } from 'node:crypto';
import {
  mkdir, mkdtemp, readFile, rename, rm, writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { sha256, stableStringify } from '../util.mjs';

export const PROCESSING_GRAPH_RESEARCH_PUBLICATION_PROTOCOL =
  'eslm-processing-graph-research-publication-snapshot-v1';

const AUTHORITY = Object.freeze({
  evidence: 'historical-execution-snapshot-only',
  answer: 'none', runtime: 'none', proof: 'none', promotion: 'none',
});
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9]+(?:[._:+>@-][a-z0-9]+)*$/u;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

export function processingGraphPublicationArtifactDigest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeArtifacts(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length < 1 || artifacts.length > 16) {
    throw new TypeError('A research publication snapshot requires bounded artifacts.');
  }
  const normalized = artifacts.map((artifact, index) => {
    exact(artifact, ['role', 'path', 'bytes'], `Research publication artifact[${index}]`);
    if (typeof artifact.role !== 'string' || !IDENTIFIER.test(artifact.role)) {
      throw new TypeError(`Research publication artifact[${index}].role is invalid.`);
    }
    if (typeof artifact.path !== 'string' || artifact.path.length < 1) {
      throw new TypeError(`Research publication artifact[${index}].path is invalid.`);
    }
    const bytes = Buffer.isBuffer(artifact.bytes)
      ? artifact.bytes : Buffer.from(artifact.bytes, 'utf8');
    return { role: artifact.role, path: resolve(artifact.path), bytes };
  }).toSorted((left, right) => left.role.localeCompare(right.role));
  if (new Set(normalized.map(({ role }) => role)).size !== normalized.length
      || new Set(normalized.map(({ path }) => path)).size !== normalized.length) {
    throw new TypeError('Research publication artifact roles and paths must be unique.');
  }
  return normalized;
}

export function createProcessingGraphPublicationSnapshot({ snapshotId, artifacts }) {
  if (typeof snapshotId !== 'string' || !IDENTIFIER.test(snapshotId)) {
    throw new TypeError('Research publication snapshotId is invalid.');
  }
  const normalized = normalizeArtifacts(artifacts);
  const unsigned = {
    format: PROCESSING_GRAPH_RESEARCH_PUBLICATION_PROTOCOL,
    snapshotId,
    artifacts: normalized.map(({ role, path, bytes }) => ({
      role, fileName: basename(path), artifactDigest: processingGraphPublicationArtifactDigest(bytes),
    })),
    authority: AUTHORITY,
  };
  return Object.freeze({
    ...unsigned,
    receiptDigest: `sha256:${sha256(stableStringify(unsigned))}`,
  });
}

export function assertProcessingGraphPublicationSnapshot(
  snapshot, { snapshotId, artifacts } = {},
) {
  exact(snapshot, ['format', 'snapshotId', 'artifacts', 'authority', 'receiptDigest'],
    'Research publication snapshot');
  if (snapshot.format !== PROCESSING_GRAPH_RESEARCH_PUBLICATION_PROTOCOL
      || snapshot.snapshotId !== snapshotId || !DIGEST.test(snapshot.receiptDigest)) {
    throw new TypeError('Research publication snapshot protocol or identity is invalid.');
  }
  const expected = createProcessingGraphPublicationSnapshot({ snapshotId, artifacts });
  if (stableStringify(snapshot) !== stableStringify(expected)) {
    throw new TypeError('Research publication snapshot does not bind the exact artifact bytes.');
  }
  return snapshot;
}

function defaultOperations() {
  return { mkdir, mkdtemp, readFile, rename, rm, writeFile };
}

async function restorePriorSnapshot(targets, stageRoot, installed, backedUp, operations) {
  const failures = [];
  for (const [index, target] of [...targets.entries()].toReversed()) {
    try {
      if (installed.has(index)) await operations.rm(target.path, { force: true });
      if (backedUp.has(index)) {
        await operations.rename(join(stageRoot, `backup-${index}`), target.path);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Research publication rollback failed.');
  }
}

export async function publishProcessingGraphResearchSnapshot({
  snapshotId, artifacts, manifestPath, validate, operations: overrides = {},
}) {
  const normalized = normalizeArtifacts(artifacts);
  const resolvedManifestPath = resolve(manifestPath);
  if (normalized.some(({ path }) => path === resolvedManifestPath)) {
    throw new TypeError('Research publication manifest path must be distinct from artifact paths.');
  }
  const parent = dirname(resolvedManifestPath);
  if (normalized.some(({ path }) => dirname(path) !== parent)) {
    throw new TypeError('Atomic research publication targets must share one directory.');
  }
  const operations = { ...defaultOperations(), ...overrides };
  await operations.mkdir(parent, { recursive: true });
  const stageRoot = await operations.mkdtemp(join(parent, '.research-publication-'));
  const snapshot = createProcessingGraphPublicationSnapshot({ snapshotId, artifacts: normalized });
  const snapshotBytes = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const targets = [
    ...normalized,
    { role: 'publication-snapshot', path: resolvedManifestPath, bytes: snapshotBytes },
  ];
  const installed = new Set();
  const backedUp = new Set();
  try {
    for (const [index, target] of targets.entries()) {
      await operations.writeFile(join(stageRoot, `staged-${index}`), target.bytes);
    }
    const staged = await Promise.all(targets.map(async (target, index) => ({
      ...target, bytes: await operations.readFile(join(stageRoot, `staged-${index}`)),
    })));
    const stagedArtifacts = staged.slice(0, normalized.length);
    if (typeof validate === 'function') await validate(stagedArtifacts);
    const stagedSnapshot = JSON.parse(staged.at(-1).bytes.toString('utf8'));
    assertProcessingGraphPublicationSnapshot(stagedSnapshot, {
      snapshotId, artifacts: stagedArtifacts,
    });
    for (const [index, target] of targets.entries()) {
      try {
        await operations.rename(target.path, join(stageRoot, `backup-${index}`));
        backedUp.add(index);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    for (const [index, target] of targets.entries()) {
      await operations.rename(join(stageRoot, `staged-${index}`), target.path);
      installed.add(index);
    }
  } catch (error) {
    try {
      await restorePriorSnapshot(targets, stageRoot, installed, backedUp, operations);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError],
        'Research publication failed and could not restore the prior snapshot.');
    }
    throw error;
  } finally {
    await operations.rm(stageRoot, { recursive: true, force: true }).catch(() => {});
  }
  return Object.freeze({
    snapshotId, receiptDigest: snapshot.receiptDigest,
    manifestPath: resolvedManifestPath,
    artifacts: Object.fromEntries(normalized.map(({ role, path }) => [role, path])),
  });
}

export async function readProcessingGraphPublicationArtifact(path) {
  const bytes = await readFile(resolve(path));
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}
