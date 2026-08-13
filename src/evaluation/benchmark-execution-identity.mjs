import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile, sha256, stableStringify } from '../util.mjs';

export const BENCHMARK_BEHAVIOR_IDENTITY_PROTOCOL = 'eslm-benchmark-behavior-identity-v1';

const RAW_DIGEST = /^[0-9a-f]{64}$/u;

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function exactFields(value, fields, path) {
  record(value, path);
  const actual = Object.keys(value).toSorted();
  const expected = [...fields].toSorted();
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new TypeError(`${path} must contain exactly: ${fields.join(', ')}.`);
  }
}

function boundedStrings(value, path, maximum) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum
      || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 512)
      || new Set(value).size !== value.length) {
    throw new TypeError(`${path} must be a bounded unique non-empty string array.`);
  }
}

export function assertBenchmarkBehaviorIdentity(value, path = 'Benchmark behavior identity') {
  exactFields(value, ['format', 'state', 'scope', 'digest', 'files', 'runtime'], path);
  if (value.format !== BENCHMARK_BEHAVIOR_IDENTITY_PROTOCOL
      || value.state !== 'content-addressed-worktree') {
    throw new TypeError(`${path} uses an unsupported protocol or state.`);
  }
  if (typeof value.digest !== 'string' || !RAW_DIGEST.test(value.digest)) {
    throw new TypeError(`${path}.digest must be a raw lowercase SHA-256 digest.`);
  }
  if (!Number.isSafeInteger(value.files) || value.files < 1 || value.files > 100_000) {
    throw new TypeError(`${path}.files must be a bounded positive integer.`);
  }
  exactFields(value.scope, ['roots', 'explicitFiles', 'includedExtension'], `${path}.scope`);
  boundedStrings(value.scope.roots, `${path}.scope.roots`, 32);
  boundedStrings(value.scope.explicitFiles, `${path}.scope.explicitFiles`, 64);
  if (value.scope.includedExtension !== '.mjs') {
    throw new TypeError(`${path}.scope.includedExtension must be .mjs.`);
  }
  exactFields(value.runtime, ['node', 'platform', 'architecture'], `${path}.runtime`);
  for (const field of ['node', 'platform', 'architecture']) {
    if (typeof value.runtime[field] !== 'string'
        || value.runtime[field].length < 1 || value.runtime[field].length > 128) {
      throw new TypeError(`${path}.runtime.${field} must be bounded non-empty text.`);
    }
  }
  return value;
}

export function assertMatchingBenchmarkBehaviorIdentity(stored, current, path = 'Benchmark report') {
  assertBenchmarkBehaviorIdentity(stored, `${path} stored behavior identity`);
  assertBenchmarkBehaviorIdentity(current, `${path} current behavior identity`);
  if (stableStringify(stored) !== stableStringify(current)) {
    throw new Error(`${path} was executed by a different source or runtime checkpoint; regenerate its receipt.`);
  }
  return stored;
}

async function behaviorFiles(root, directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await behaviorFiles(root, relativePath));
    else if (extname(entry.name) === '.mjs') files.push(relativePath);
  }
  return files;
}

export async function benchmarkBehaviorIdentity(options = {}) {
  const root = options.root ?? PROJECT_ROOT;
  const roots = options.roots ?? ['src'];
  const explicitFiles = options.explicitFiles ?? ['package.json'];
  const files = [
    ...explicitFiles,
    ...(await Promise.all(roots.map((directory) => behaviorFiles(root, directory)))).flat(),
  ].map((path) => relative(root, join(root, path))).toSorted();
  const entries = await Promise.all(files.map(async (path) => Object.freeze({
    path,
    sha256: await hashFile(join(root, path)),
  })));
  const identity = Object.freeze({
    format: BENCHMARK_BEHAVIOR_IDENTITY_PROTOCOL,
    state: 'content-addressed-worktree',
    scope: Object.freeze({
      roots: Object.freeze([...roots]),
      explicitFiles: Object.freeze([...explicitFiles]),
      includedExtension: '.mjs',
    }),
    digest: sha256(stableStringify(entries)),
    files: entries.length,
    runtime: Object.freeze({ node: process.version, platform: process.platform, architecture: process.arch }),
  });
  assertBenchmarkBehaviorIdentity(identity);
  return identity;
}
