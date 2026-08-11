import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { openKnowledgePackage } from './package.mjs';

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export class KnowledgeCatalog {
  constructor(path) {
    this.path = resolve(path);
    this.entries = new Map();
  }

  async load() {
    if (!await exists(this.path)) return this;
    const value = JSON.parse(await readFile(this.path, 'utf8'));
    if (value.format !== 'eslm-kb-catalog-v1' || !Array.isArray(value.packages)) {
      throw new Error(`${this.path} is not an eslm-kb-catalog-v1 catalog.`);
    }
    this.entries = new Map(value.packages.map((entry) => [entry.kbId, entry]));
    return this;
  }

  list() {
    return [...this.entries.values()].sort((left, right) => left.kbId.localeCompare(right.kbId));
  }

  async register(manifestPath) {
    const packageHandle = await openKnowledgePackage(manifestPath);
    const entry = {
      kbId: packageHandle.manifest.kbId,
      kbVersion: packageHandle.manifest.kbVersion,
      manifestPath: relative(dirname(this.path), resolve(manifestPath)),
      namespace: packageHandle.manifest.namespace,
      languages: packageHandle.manifest.languages ?? [],
      domains: packageHandle.manifest.domains ?? [],
      capabilities: packageHandle.manifest.capabilities ?? [],
      trustLevel: packageHandle.manifest.trustLevel ?? 'local-reviewed',
    };
    this.entries.set(entry.kbId, entry);
    await this.save();
    return entry;
  }

  async unregister(kbId) {
    const removed = this.entries.delete(kbId);
    if (removed) await this.save();
    return removed;
  }

  async save() {
    const value = { format: 'eslm-kb-catalog-v1', packages: this.list() };
    await writeFile(this.path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }

  resolve(kbId) {
    const entry = this.entries.get(kbId);
    if (!entry) throw new Error(`Knowledge base is not registered: ${kbId}.`);
    return resolve(dirname(this.path), entry.manifestPath);
  }
}
