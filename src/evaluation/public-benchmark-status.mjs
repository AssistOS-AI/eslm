import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ewokCacheStatus } from '../benchmark-adapters/ewok.mjs';
import { PROJECT_ROOT } from '../paths.mjs';
import { BENCHMARK_ACCESS_MANIFESTS } from './benchmark-access-manifests.mjs';
import {
  auditFreshBenchmarkReceipts, FRESH_RECEIPT_AUDIT_DEFINITIONS,
} from './benchmark-receipt-audit.mjs';
import { simpleQaCacheStatus } from './simpleqa-adapter.mjs';
import { storyCloze2018CacheStatus } from './story-cloze-2018-cache.mjs';

export async function publicBenchmarkCacheStatus() {
  const statuses = [];
  for (const [id, path] of [
    ['blimp', 'training/.cache/datasets/blimp/3e56b06fcabca9b30822fc66435fca6b1aa40bb1/blimp.tar.gz'],
    ['babi', 'training/.cache/datasets/babi-v1.2/babi_tasks_1-20_v1-2.tar.gz'],
    ['clutrr', 'training/.cache/datasets/clutrr/cache-manifest.json'],
    ['entityTracking', 'training/.cache/datasets/entity-tracking/cache-manifest.json'],
  ]) {
    try {
      const bytes = await readFile(join(PROJECT_ROOT, path));
      statuses.push({ id, cached: true, path, bytes: bytes.length });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      statuses.push({ id, cached: false, path });
    }
  }
  const ewok = await ewokCacheStatus();
  statuses.push(ewok.cached ? ewok : {
    ...ewok, access: BENCHMARK_ACCESS_MANIFESTS['ewok-core-1.0'].access,
  });
  statuses.push({ id: 'storyCloze', ...await storyCloze2018CacheStatus() });
  statuses.push({ id: 'simpleqa', ...await simpleQaCacheStatus() });
  const legacyIds = new Set(statuses.map((status) => status.id));
  const audit = await auditFreshBenchmarkReceipts({
    definitions: FRESH_RECEIPT_AUDIT_DEFINITIONS.filter((definition) => legacyIds.has(definition.id)),
  });
  const auditsById = new Map(audit.rows.map((row) => [row.id, row]));
  return Object.freeze(statuses.map((status) => {
    const freshReceipt = auditsById.get(status.id);
    return Object.freeze({
      ...status,
      ...(freshReceipt ? { freshReceiptState: freshReceipt.state } : {}),
    });
  }));
}
