import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import {
  PROCESSING_GRAPH_CATALOG,
  PROCESSING_GRAPH_CATALOG_PROTOCOL,
  assertProcessingGraphCatalog,
  processingGraphCatalogDigest,
  processingGraphTopologyDigest,
} from '../processing-graph/index.mjs';
import { sha256, stableStringify } from '../util.mjs';

export const RESEARCH_IMPLEMENTATION_IDENTITY_PROTOCOL =
  'eslm-processing-graph-research-implementation-v1';

// Only modules that can change graph discovery semantics belong in an analysis receipt.
// Operational publication, status, cache removal, and large-source preflight modules have
// their own receipts and must not invalidate an already computed scientific analysis.
const SOURCE_ROOTS = Object.freeze(['src/processing-graph']);
const RESEARCH_ANALYSIS_FILES = Object.freeze([
  'processing-graph-discovery-strategies.mjs',
  'processing-graph-hypothesis-contract.mjs',
  'processing-graph-hypothesis-coordinator.mjs',
  'processing-graph-research-analysis-contract.mjs',
  'processing-graph-research-analyzer.mjs',
  'processing-graph-research-work-policy.mjs',
  'research-analysis-coverage.mjs',
  'research-analysis-lineage-contract.mjs',
  'research-episode-contract.mjs',
  'research-episode-features.mjs',
  'research-episode-membership.mjs',
  'research-implementation-identity.mjs',
  'research-metamorphic-controls.mjs',
  'research-projection-membership.mjs',
  'research-proposal-ledger-contract.mjs',
  'research-source-registry.mjs',
  'research-work-replay-contract.mjs',
].map((name) => `src/research/${name}`));
const SHARED_ANALYSIS_FILES = Object.freeze(['src/util.mjs']);
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const SOURCE_PATH = /^src\/(?:[a-z0-9.-]+\/)*[a-z0-9.-]+\.mjs$/u;
const STATIC_LOCAL_IMPORT = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/gu;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function digest(value, path) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 digest.`);
  }
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function aggregateImplementationDigest(identity) {
  return `sha256:${sha256(stableStringify({
    format: identity.format,
    fileCount: identity.fileCount,
    files: identity.files,
  }))}`;
}

async function sourceFiles(relativeDirectory) {
  const directory = join(PROJECT_ROOT, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await sourceFiles(relativePath));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) files.push(relativePath);
  }
  return files;
}

async function staticLocalImportClosure(roots) {
  const closure = new Set(roots);
  const pending = [...roots];
  while (pending.length > 0) {
    const path = pending.pop();
    const source = await readFile(join(PROJECT_ROOT, path), 'utf8');
    for (const match of source.matchAll(STATIC_LOCAL_IMPORT)) {
      const imported = normalize(join(dirname(path), match[1]));
      if (!imported.startsWith('src/') || !imported.endsWith('.mjs')) {
        throw new TypeError(`Research semantic import ${match[1]} from ${path} is unsupported.`);
      }
      if (!closure.has(imported)) {
        closure.add(imported);
        pending.push(imported);
      }
    }
  }
  return [...closure].toSorted();
}

export function assertResearchImplementationIdentity(identity) {
  exact(identity, ['format', 'fileCount', 'files', 'aggregateDigest'], 'Research implementation identity');
  if (identity.format !== RESEARCH_IMPLEMENTATION_IDENTITY_PROTOCOL
      || !Number.isSafeInteger(identity.fileCount) || identity.fileCount < 1
      || identity.fileCount > 512 || !Array.isArray(identity.files)
      || identity.files.length !== identity.fileCount) {
    throw new TypeError('Research implementation identity protocol or file count is invalid.');
  }
  let priorPath = '';
  for (const [index, file] of identity.files.entries()) {
    exact(file, ['path', 'sha256'], `Research implementation file[${index}]`);
    if (typeof file.path !== 'string' || !SOURCE_PATH.test(file.path)
        || file.path <= priorPath || file.path.includes('..')) {
      throw new TypeError('Research implementation paths must be unique canonical source-relative paths.');
    }
    digest(file.sha256, `Research implementation file[${index}].sha256`);
    priorPath = file.path;
  }
  digest(identity.aggregateDigest, 'Research implementation aggregate digest');
  if (identity.aggregateDigest !== aggregateImplementationDigest(identity)) {
    throw new TypeError('Research implementation aggregate digest does not match its file ledger.');
  }
  return identity;
}

export async function processingGraphResearchImplementationIdentity() {
  const roots = [
    ...(await Promise.all(SOURCE_ROOTS.map(sourceFiles))).flat(),
    ...await sourceFiles('src/research/sources'),
    ...RESEARCH_ANALYSIS_FILES,
    ...SHARED_ANALYSIS_FILES,
  ].toSorted();
  const paths = await staticLocalImportClosure(roots);
  const files = await Promise.all(paths.map(async (path) => ({
    path,
    sha256: `sha256:${sha256(await readFile(join(PROJECT_ROOT, path)))}`,
  })));
  const identity = {
    format: RESEARCH_IMPLEMENTATION_IDENTITY_PROTOCOL,
    fileCount: files.length,
    files,
  };
  identity.aggregateDigest = aggregateImplementationDigest(identity);
  assertResearchImplementationIdentity(identity);
  return freezeDeep(identity);
}

export function currentProcessingGraphBaseline() {
  assertProcessingGraphCatalog(PROCESSING_GRAPH_CATALOG);
  return freezeDeep({
    format: PROCESSING_GRAPH_CATALOG_PROTOCOL,
    catalogDigest: processingGraphCatalogDigest(PROCESSING_GRAPH_CATALOG),
    topologyDigest: processingGraphTopologyDigest(PROCESSING_GRAPH_CATALOG),
  });
}
