import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_ROOT = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = dirname(SOURCE_ROOT);

export async function resolveProjectPath(candidate, fallback) {
  const requested = candidate ?? fallback;
  if (!requested) return undefined;
  const fromWorkingDirectory = resolve(process.cwd(), requested);
  try {
    await access(fromWorkingDirectory);
    return fromWorkingDirectory;
  } catch {
    return resolve(PROJECT_ROOT, requested);
  }
}

export function projectPath(...parts) {
  return join(PROJECT_ROOT, ...parts);
}
