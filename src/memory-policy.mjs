const MIB = 1024 * 1024;
const BASE_RESERVE_MIB = 96;
const MIN_CACHE_MIB = 16;

function positiveNumber(value, name) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
}

export function planPublicKnowledgeMemory(ids, catalog, options = {}) {
  const requestedPolicy = String(options.memoryPolicy ?? 'auto').toLocaleLowerCase('en-US');
  if (!['auto', 'eager', 'lazy'].includes(requestedPolicy)) {
    throw new Error('--memory-policy must be auto, eager, or lazy.');
  }
  const targetMiB = positiveNumber(options.memoryMb, '--memory-mb');
  const reserveBytes = BASE_RESERVE_MIB * MIB;
  const targetBytes = targetMiB === undefined ? undefined : Math.floor(targetMiB * MIB);
  let available = targetBytes === undefined ? Number.POSITIVE_INFINITY : Math.max(0, targetBytes - reserveBytes);
  const providers = [];
  const orderedIds = [...ids].sort((left, right) => (catalog[left].priority ?? 100) - (catalog[right].priority ?? 100));

  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    const definition = catalog[id];
    const eagerBytes = definition.estimatedEagerRssBytes;
    const remainingCount = orderedIds.length - index - 1;
    const minimumForRemaining = remainingCount * MIN_CACHE_MIB * MIB;
    const mode = requestedPolicy === 'eager' || (requestedPolicy === 'auto' && (targetBytes === undefined || eagerBytes + minimumForRemaining <= available))
      ? 'eager' : 'lazy';
    providers.push({ id, mode, eagerBytes, cacheBytes: 0 });
    if (mode === 'eager' && Number.isFinite(available)) available = Math.max(0, available - eagerBytes);
  }

  const lazy = providers.filter((provider) => provider.mode === 'lazy');
  if (lazy.length > 0) {
    const shared = Number.isFinite(available)
      ? Math.max(MIN_CACHE_MIB * MIB, Math.floor(available / lazy.length))
      : 64 * MIB;
    for (const provider of lazy) provider.cacheBytes = shared;
  }

  return Object.freeze({
    format: 'eslm-memory-plan-v1', requestedPolicy, effectivePolicy: providers.every((item) => item.mode === 'eager') ? 'eager' : providers.every((item) => item.mode === 'lazy') ? 'lazy' : 'adaptive',
    targetMiB, softTarget: targetMiB !== undefined, reserveMiB: BASE_RESERVE_MIB,
    providers: providers.map((provider) => Object.freeze(provider)),
  });
}

export class ShardCache {
  constructor(targetBytes, expansionFactor = 1) {
    this.targetBytes = targetBytes;
    this.expansionFactor = expansionFactor;
    this.entries = new Map();
    this.stats = { hits: 0, misses: 0, loads: 0, evictions: 0, oversizedLoads: 0, estimatedBytes: 0, peakEstimatedBytes: 0 };
  }

  async get(key, loader) {
    if (this.entries.has(key)) {
      const entry = this.entries.get(key);
      this.entries.delete(key);
      this.entries.set(key, entry);
      this.stats.hits += 1;
      return entry.value;
    }
    this.stats.misses += 1;
    const loaded = await loader();
    const estimatedBytes = Math.ceil(loaded.sourceBytes * this.expansionFactor);
    this.stats.loads += 1;
    if (estimatedBytes > this.targetBytes) {
      this.stats.oversizedLoads += 1;
      this.stats.peakEstimatedBytes = Math.max(this.stats.peakEstimatedBytes, this.stats.estimatedBytes + estimatedBytes);
      return loaded.value;
    }
    this.entries.set(key, { value: loaded.value, estimatedBytes });
    this.stats.estimatedBytes += estimatedBytes;
    this.stats.peakEstimatedBytes = Math.max(this.stats.peakEstimatedBytes, this.stats.estimatedBytes);
    this.trim();
    return loaded.value;
  }

  trim() {
    while (this.stats.estimatedBytes > this.targetBytes && this.entries.size > 0) {
      const key = this.entries.keys().next().value;
      const entry = this.entries.get(key);
      this.entries.delete(key);
      this.stats.estimatedBytes -= entry.estimatedBytes;
      this.stats.evictions += 1;
    }
  }

  snapshot() {
    return { ...this.stats, targetBytes: this.targetBytes, loadedShards: this.entries.size };
  }
}
