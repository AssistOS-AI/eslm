import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile, sha256, stableStringify } from '../util.mjs';

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
  return Object.freeze({
    format: 'eslm-benchmark-behavior-identity-v1',
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
}
