import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

export function contentDigest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function filesUnder(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    const target = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

export async function executableCheckpointDigest(repositoryRoot) {
  const files = await filesUnder(resolve(repositoryRoot, 'src'));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(repositoryRoot, file));
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

export async function knowledgePackageManifestDigests(repositoryRoot, packageIds) {
  const values = [];
  for (const packageId of packageIds) {
    const manifest = resolve(repositoryRoot, `training/KBs/${packageId}/package/manifest.json`);
    values.push(contentDigest(await readFile(manifest)));
  }
  return values.toSorted();
}
