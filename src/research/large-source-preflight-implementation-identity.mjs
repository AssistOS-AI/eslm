import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { sha256, stableStringify } from '../util.mjs';

export const LARGE_SOURCE_PREFLIGHT_IMPLEMENTATION_PROTOCOL =
  'eslm-large-source-preflight-implementation-v1';

const ENTRY_PATH = 'scripts/run-oasst1-large-source-preflight.mjs';
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const SOURCE_PATH = /^(?:scripts|src)\/(?:[a-z0-9.-]+\/)*[a-z0-9.-]+\.mjs$/u;
const STATIC_IMPORT_SPECIFIER =
  /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gsu;
const DYNAMIC_IMPORT_SPECIFIER = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gsu;

function exact(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || stableStringify(Object.keys(value).toSorted())
        !== stableStringify([...fields].toSorted())) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function repositoryPath(absolutePath) {
  return relative(PROJECT_ROOT, absolutePath).split(sep).join('/');
}

function aggregateDigest(identity) {
  return `sha256:${sha256(stableStringify({
    format: identity.format,
    entryPath: identity.entryPath,
    fileCount: identity.fileCount,
    files: identity.files,
  }))}`;
}

async function staticModuleClosure(entryPath) {
  const pending = [resolve(PROJECT_ROOT, entryPath)];
  const files = new Map();
  while (pending.length > 0) {
    const absolutePath = pending.pop();
    const path = repositoryPath(absolutePath);
    if (files.has(path)) continue;
    if (!SOURCE_PATH.test(path) || path.startsWith('../')) {
      throw new TypeError(`Preflight implementation path is outside the reviewed source closure: ${path}.`);
    }
    const bytes = await readFile(absolutePath);
    const source = bytes.toString('utf8');
    files.set(path, `sha256:${sha256(bytes)}`);
    const specifiers = [
      ...source.matchAll(STATIC_IMPORT_SPECIFIER),
      ...source.matchAll(DYNAMIC_IMPORT_SPECIFIER),
    ].map((match) => match[1]);
    if (/import\s*\(\s*(?!['"])/u.test(source)) {
      throw new TypeError(`Preflight implementation uses a non-literal dynamic import: ${path}.`);
    }
    for (const specifier of specifiers) {
      if (!specifier.startsWith('.')) continue;
      const dependency = resolve(dirname(absolutePath), specifier);
      if (!dependency.endsWith('.mjs')) {
        throw new TypeError(`Preflight implementation dependency must be an explicit .mjs file: ${specifier}.`);
      }
      pending.push(dependency);
    }
  }
  return [...files.entries()].toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, digest]) => ({ path, sha256: digest }));
}

export function assertLargeSourcePreflightImplementationIdentity(identity) {
  exact(identity, ['format', 'entryPath', 'fileCount', 'files', 'aggregateDigest'],
    'Large-source preflight implementation identity');
  if (identity.format !== LARGE_SOURCE_PREFLIGHT_IMPLEMENTATION_PROTOCOL
      || identity.entryPath !== ENTRY_PATH
      || !Number.isSafeInteger(identity.fileCount) || identity.fileCount < 1
      || identity.fileCount > 512 || !Array.isArray(identity.files)
      || identity.files.length !== identity.fileCount
      || !identity.files.some((file) => file?.path === identity.entryPath)) {
    throw new TypeError('Large-source preflight implementation identity is malformed.');
  }
  let priorPath = '';
  for (const [index, file] of identity.files.entries()) {
    exact(file, ['path', 'sha256'], `Large-source preflight implementation file[${index}]`);
    if (typeof file.path !== 'string' || !SOURCE_PATH.test(file.path)
        || file.path <= priorPath || typeof file.sha256 !== 'string'
        || !DIGEST.test(file.sha256)) {
      throw new TypeError('Large-source preflight implementation files must be canonical and sorted.');
    }
    priorPath = file.path;
  }
  if (typeof identity.aggregateDigest !== 'string' || !DIGEST.test(identity.aggregateDigest)
      || identity.aggregateDigest !== aggregateDigest(identity)) {
    throw new TypeError('Large-source preflight implementation aggregate digest is invalid.');
  }
  return identity;
}

export async function largeSourcePreflightImplementationIdentity() {
  const files = await staticModuleClosure(ENTRY_PATH);
  const identity = {
    format: LARGE_SOURCE_PREFLIGHT_IMPLEMENTATION_PROTOCOL,
    entryPath: ENTRY_PATH,
    fileCount: files.length,
    files,
  };
  identity.aggregateDigest = aggregateDigest(identity);
  assertLargeSourcePreflightImplementationIdentity(identity);
  return Object.freeze(identity);
}
