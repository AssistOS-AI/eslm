import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { PROJECT_ROOT } from '../src/paths.mjs';
import {
  acquireOasst1ValidationMembership,
} from '../src/research/sources/oasst1-validation-membership.mjs';

const cacheRoot = join(
  PROJECT_ROOT,
  'training/.cache/processing-graph-research/oasst1-fdf72ae0',
);

export const DEFAULT_OASST1_VALIDATION_PARQUET = join(
  cacheRoot,
  'validation-00000-of-00001-134b8fd0c89408b6.parquet',
);
export const DEFAULT_OASST1_VALIDATION_MEMBERSHIP = join(
  cacheRoot,
  'validation-tree-membership.json',
);

export async function main() {
  const receipt = await acquireOasst1ValidationMembership({
    parquetPath: DEFAULT_OASST1_VALIDATION_PARQUET,
    membershipPath: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
  });
  process.stdout.write(`${JSON.stringify({
    sourceRevision: receipt.sourceRevision,
    split: receipt.split,
    messageCount: receipt.messageCount,
    treeCount: receipt.treeCount,
    membershipDigest: receipt.membershipDigest,
    output: DEFAULT_OASST1_VALIDATION_MEMBERSHIP,
  }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
