import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PROJECT_ROOT } from '../paths.mjs';

export const ZEBRALOGIC_DATASET_REVISION = '2f94a445d7079f20146f5443e2606049de8543e0';
export const ZEBRALOGIC_PARTITION_SEED = 'eslm-zebralogic-size-stratified-partition-v1';
const EXPECTED_ROWS = 1_000;
const DEVELOPMENT_PER_SIZE = 8;
const SOURCE_PATH = `training/.cache/benchmarks/zebralogic/derived/grid_mode-${ZEBRALOGIC_DATASET_REVISION}.jsonl`;
const SOURCE_BYTES = 1_540_170;
const SOURCE_SHA256 = 'a35f4a86b003f4134b4701cd83fef56964c39628d26715e26db68bafbfb229f1';

export const ZEBRALOGIC_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-v1', id: 'zebralogic-public-grid-v1',
  dataset: 'https://huggingface.co/datasets/allenai/ZebraLogicBench',
  datasetRevision: ZEBRALOGIC_DATASET_REVISION, datasetPath: SOURCE_PATH,
  datasetBytes: SOURCE_BYTES, datasetSha256: SOURCE_SHA256,
  codeRepository: 'https://github.com/yuchenlin/ZeroEval',
  codeRevision: '8c1485edf12c6efb5f69135a562927c5ad484059',
  codeLicense: 'Apache-2.0', datasetLicense: 'not-declared',
  officialOracle: 'gated:allenai/ZebraLogicBench-private@9f39ef490ae924437376657205025f26c0bd1af3',
});
export const ZEBRALOGIC_PARTITION = Object.freeze({
  format: 'eslm-benchmark-partition-policy-v1', seed: ZEBRALOGIC_PARTITION_SEED,
  strata: 'official size field; solution and computed assignments are excluded from ranking',
  developmentPerStratum: DEVELOPMENT_PER_SIZE, developmentCount: 200,
  developmentMembershipSha256: '796d63bec8f018203f022011a94c1fdd12dd29dcd43cef02f6fc49ff6cc7d1e3',
  freshCount: 800,
  freshMembershipSha256: '6c644963f89e423620642f24363ba6a47097469891caea7133274c0ddc3caf69',
  allMembershipSha256: 'e396ae15fb3161db8729b559a4af851b28451ead1620c30b4b877338df0bfa2c',
});

export function requireZebraLogicCondition(condition, path, message) {
  if (!condition) throw new Error(`ZebraLogic ${path}: ${message}`);
}
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function zebraLogicMembershipDigest(ids) {
  return sha256(`${[...ids].sort().join('\n')}\n`);
}
function sourcePath(options = {}) {
  return options.file ?? join(PROJECT_ROOT, ZEBRALOGIC_SOURCE.datasetPath);
}
export async function hasZebraLogicSource(options = {}) {
  try {
    return (await stat(sourcePath(options))).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function validateZebraLogicSourceRecord(record, lineNumber) {
  const path = `grid-mode.jsonl:${lineNumber}`;
  requireZebraLogicCondition(plainObject(record), path, 'expected an object.');
  const fields = Object.keys(record).sort();
  requireZebraLogicCondition(
    fields.join('\0') === ['created_at', 'id', 'puzzle', 'size', 'solution'].join('\0'),
    path,
    'expected exactly created_at, id, puzzle, size, and solution.',
  );
  requireZebraLogicCondition(typeof record.id === 'string' && /^lgp-test-[2-6]x[2-6]-\d+$/u.test(record.id),
    `${path}.id`, 'invalid official grid identifier.');
  requireZebraLogicCondition(typeof record.size === 'string' && /^[2-6]\*[2-6]$/u.test(record.size),
    `${path}.size`, 'invalid official size.');
  requireZebraLogicCondition(
    typeof record.puzzle === 'string' && record.puzzle.length > 0 && !record.puzzle.includes('\0'),
    `${path}.puzzle`,
    'expected non-empty safe text.',
  );
  requireZebraLogicCondition(typeof record.created_at === 'string' && !Number.isNaN(Date.parse(record.created_at)),
    `${path}.created_at`, 'expected an ISO timestamp.');
  requireZebraLogicCondition(plainObject(record.solution), `${path}.solution`, 'expected an object.');
  requireZebraLogicCondition(Object.keys(record.solution).sort().join('\0') === ['header', 'rows'].join('\0'),
    `${path}.solution`, 'expected exactly header and rows.');
  const [houses, attributes] = record.size.split('*').map(Number);
  requireZebraLogicCondition(Array.isArray(record.solution.header)
    && record.solution.header.length === attributes + 1 && record.solution.header[0] === 'House',
  `${path}.solution.header`, 'header shape disagrees with size.');
  requireZebraLogicCondition(new Set(record.solution.header).size === record.solution.header.length,
    `${path}.solution.header`, 'duplicate attribute header.');
  requireZebraLogicCondition(Array.isArray(record.solution.rows) && record.solution.rows.length === houses,
    `${path}.solution.rows`, 'row count disagrees with size.');
  requireZebraLogicCondition(record.solution.rows.every((row) => Array.isArray(row)
    && row.length === attributes + 1 && row.every((cell) => cell === '___')),
  `${path}.solution.rows`, 'the public source must contain only redacted placeholder cells.');
}

function caseId(record) {
  return `zebralogic:${record.id}:${sha256(record.puzzle)}`;
}
export async function streamZebraLogicSource(options = {}, onRecord = undefined) {
  const path = sourcePath(options);
  const details = await stat(path);
  requireZebraLogicCondition(details.size === SOURCE_BYTES, path,
    `expected ${SOURCE_BYTES} bytes, found ${details.size}.`);
  const digest = createHash('sha256');
  const source = createReadStream(path);
  source.on('data', (chunk) => digest.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  const sizes = new Map();
  const ids = new Set();
  let records = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    records += 1;
    let record;
    try { record = JSON.parse(line); } catch (error) {
      throw new Error(`ZebraLogic grid-mode.jsonl:${records}: invalid JSON: ${error.message}`);
    }
    validateZebraLogicSourceRecord(record, records);
    const id = caseId(record);
    requireZebraLogicCondition(!ids.has(id), `grid-mode.jsonl:${records}`, 'duplicate stable identity.');
    ids.add(id);
    sizes.set(record.size, (sizes.get(record.size) ?? 0) + 1);
    await onRecord?.(record, Object.freeze({ id, lineNumber: records }));
  }
  requireZebraLogicCondition(records === EXPECTED_ROWS, path,
    `expected ${EXPECTED_ROWS} rows, found ${records}.`);
  const fileSha256 = digest.digest('hex');
  requireZebraLogicCondition(fileSha256 === SOURCE_SHA256, path,
    'content digest differs from the pinned source.');
  requireZebraLogicCondition(sizes.size === 25 && [...sizes.values()].every((count) => count === 40),
    path, 'expected 25 size strata with 40 rows each.');
  return Object.freeze({ format: 'eslm-zebralogic-source-inventory-v1', source: ZEBRALOGIC_SOURCE,
    records, bytes: details.size, sha256: fileSha256,
    sizes: Object.freeze(Object.fromEntries([...sizes].sort())), redactedSolutions: records });
}

export async function partitionZebraLogicSource(options = {}) {
  const strata = new Map();
  const inventory = await streamZebraLogicSource(options, (record, metadata) => {
    if (!strata.has(record.size)) strata.set(record.size, []);
    strata.get(record.size).push(Object.freeze({ id: metadata.id,
      rank: sha256(`${ZEBRALOGIC_PARTITION_SEED}\0${record.size}\0${metadata.id}`) }));
  });
  const development = [];
  const fresh = [];
  for (const cases of [...strata].sort(([left], [right]) => left.localeCompare(right)).map((entry) => entry[1])) {
    cases.sort((left, right) => left.rank.localeCompare(right.rank));
    development.push(...cases.slice(0, DEVELOPMENT_PER_SIZE).map((item) => item.id));
    fresh.push(...cases.slice(DEVELOPMENT_PER_SIZE).map((item) => item.id));
  }
  requireZebraLogicCondition(development.length === ZEBRALOGIC_PARTITION.developmentCount,
    'partition', 'development count changed.');
  requireZebraLogicCondition(fresh.length === ZEBRALOGIC_PARTITION.freshCount,
    'partition', 'fresh count changed.');
  requireZebraLogicCondition(
    zebraLogicMembershipDigest(development) === ZEBRALOGIC_PARTITION.developmentMembershipSha256,
    'partition', 'development membership changed.',
  );
  requireZebraLogicCondition(zebraLogicMembershipDigest(fresh) === ZEBRALOGIC_PARTITION.freshMembershipSha256,
    'partition', 'fresh membership changed.');
  requireZebraLogicCondition(
    zebraLogicMembershipDigest([...development, ...fresh]) === ZEBRALOGIC_PARTITION.allMembershipSha256,
    'partition', 'complete membership changed.',
  );
  return Object.freeze({ inventory, development: Object.freeze(development), fresh: Object.freeze(fresh) });
}

export async function inventoryZebraLogicSource(options = {}) {
  const partition = await partitionZebraLogicSource(options);
  return Object.freeze({ ...partition.inventory, partition: Object.freeze({
    development: Object.freeze({ count: partition.development.length,
      membershipSha256: zebraLogicMembershipDigest(partition.development) }),
    fresh: Object.freeze({ count: partition.fresh.length,
      membershipSha256: zebraLogicMembershipDigest(partition.fresh) }),
  }) });
}
