import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export const RESEARCH_CACHE_REMOVAL_PROTOCOL = 'eslm-research-cache-removal-v1';

async function inventory(path, relative = '') {
  const records = [];
  for (const name of (await readdir(path)).toSorted()) {
    const absolute = join(path, name);
    const nextRelative = relative ? `${relative}/${name}` : name;
    const item = await lstat(absolute);
    if (item.isSymbolicLink()) throw new TypeError('Research cache removal refuses symbolic links.');
    if (item.isDirectory()) records.push(...await inventory(absolute, nextRelative));
    else if (item.isFile()) {
      const bytes = await readFile(absolute);
      records.push({ path: nextRelative, bytes: bytes.length,
        sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}` });
    } else throw new TypeError('Research cache removal accepts only regular files and directories.');
  }
  return records;
}

function targetPath(cacheRoot, sourceCacheKey) {
  if (!/^[a-z0-9][a-z0-9-]{2,127}$/u.test(sourceCacheKey)) {
    throw new TypeError('Research source cache key must be a bounded lowercase identifier.');
  }
  const root = resolve(cacheRoot);
  if (basename(root) !== 'processing-graph-research' || root === resolve('/')) {
    throw new TypeError('Research cache removal requires an explicit processing-graph-research root.');
  }
  const target = resolve(root, sourceCacheKey);
  if (dirname(target) !== root) throw new TypeError('Research cache removal target escapes its cache root.');
  return { root, target };
}

export async function inspectResearchSourceCache({ cacheRoot, sourceCacheKey }) {
  const { target } = targetPath(cacheRoot, sourceCacheKey);
  const targetStat = await lstat(target);
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
    throw new TypeError('Research source cache target must be a non-symlink directory.');
  }
  const files = await inventory(target);
  const bytes = files.reduce((sum, item) => sum + item.bytes, 0);
  const digest = createHash('sha256').update(JSON.stringify(files)).digest('hex');
  return Object.freeze({
    format: RESEARCH_CACHE_REMOVAL_PROTOCOL,
    sourceCacheKey,
    files: files.length,
    bytes,
    inventoryDigest: `sha256:${digest}`,
    removed: false,
  });
}

export async function purgeResearchSourceCache(options) {
  const receipt = await inspectResearchSourceCache(options);
  const { target } = targetPath(options.cacheRoot, options.sourceCacheKey);
  await rm(target, { recursive: true, force: false });
  try {
    await lstat(target);
    throw new Error('Research source cache target still exists after removal.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return Object.freeze({ ...receipt, removed: true });
}
