import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { hashFile, sha256 } from '../util.mjs';

export const EWOK_SOURCE = Object.freeze({
  family: 'EWoK-core-1.0',
  repository: 'https://github.com/ewok-core/ewok-paper',
  repositoryCommit: '9e40d30e242925866ee50448f80a13bcdf971318',
  protectedArchivePath: 'training/.cache/benchmarks/ewok-core-1.0/source/analysis-data.zip',
  protectedArchiveSha256: '545bc1affc1df4629e60537478308c1242d9e33fa115a789982e0ba745bdc6f0',
  configArchivePath: 'training/.cache/benchmarks/ewok-core-1.0/source/config.zip',
  configArchiveSha256: '4bbae97ab5661a2bbaa108c20691c57c3537b94aa2b19eb83f97ca8ae24bbd22',
  protectedInventoryPath: 'training/.cache/benchmarks/ewok-core-1.0/protected/data/items_in_results.csv',
  protectedInventorySha256: '9265834e807e9ccdcca9ef7685e2ddba4971c923dc3472bc8a6abd89858de840',
  protectedRemovalPath: 'training/.cache/benchmarks/ewok-core-1.0/protected/config/utils/remove_from_results.csv',
  protectedRemovalSha256: '0ba1be945b9e2ff5526987e10e93e1fe0e7014632f84aad49920eb7f21a0a4c3',
  protectedReversalPath: 'training/.cache/benchmarks/ewok-core-1.0/protected/config/utils/flagged_reverse.csv',
  protectedReversalSha256: '6338c175f8d05f40f25687792a5ed10d9826c4374ca0f0b4ec4caa20def2ed40',
  license: 'CC BY 4.0 with EWoK Terms of Use',
  terms: 'https://github.com/ewok-core/ewok-paper/blob/main/TERMS_OF_USE.txt',
  redistribution: 'Keep source and derivatives password-protected or behind gated authentication; never publish plaintext rows.',
});

const ITEM_COLUMNS = Object.freeze([
  'MetaTemplateID', 'TemplateID', 'PairID', 'Domain', 'ConceptA', 'ConceptB',
  'Target1', 'Target2', 'TargetDiff', 'Context1', 'Context2', 'ContextDiff',
  'ContextType', 'TemplateName', 'TemplateIndex', 'ItemTags',
]);
const INVENTORY_COLUMNS = Object.freeze(['', ...ITEM_COLUMNS, 'DomainId', 'Version']);
const REMOVAL_COLUMNS = Object.freeze(['Domain', 'Context1', 'Context2', 'Target1', 'Target2']);
const REVERSAL_COLUMNS = Object.freeze([
  'id', 'Context1', 'Context2', 'Target1', 'Target2', 'problem', 'mse', 'ctxvar',
  'tgtvar', 'gold', 'response_mean', 'response_count', 'response_std', 'MetaTemplateID', 'TemplateID',
]);
const MAX_ROWS = 100_000;

function assertCondition(condition, message) {
  if (!condition) throw new Error(`Invalid EWoK source: ${message}`);
}

function parseCsvRows(text) {
  assertCondition(typeof text === 'string', 'CSV input must be text.');
  assertCondition(!text.includes('\0'), 'CSV input contains a NUL byte.');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') {
      assertCondition(field.length === 0, `unexpected quote at character ${index}.`);
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      if (row.some((value) => value.length > 0)) rows.push(row);
      assertCondition(rows.length <= MAX_ROWS + 2, `CSV exceeds ${MAX_ROWS} data rows.`);
      row = [];
      field = '';
    } else field += character;
  }
  assertCondition(!quoted, 'CSV ends inside a quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ''));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows.filter((values) => !values[0]?.startsWith('# EWoK canary UUID'));
}

function recordsWithColumns(text, sourceName, expectedColumns) {
  const rows = parseCsvRows(text);
  assertCondition(rows.length >= 2, `${sourceName} needs a header and at least one record.`);
  const header = rows[0];
  assertCondition(
    header.length === expectedColumns.length && header.every((field, index) => field === expectedColumns[index]),
    `${sourceName} has an unsupported column contract.`,
  );
  return rows.slice(1).map((values, index) => {
    assertCondition(values.length === header.length, `${sourceName} row ${index + 2} has the wrong field count.`);
    return Object.fromEntries(header.map((field, position) => [field || '_rowIndex', values[position]]));
  });
}

function validateText(value, field, sourceName, rowNumber, options = {}) {
  assertCondition(typeof value === 'string', `${sourceName} row ${rowNumber} has a non-text ${field}.`);
  if (!options.allowEmpty) assertCondition(value.trim().length > 0, `${sourceName} row ${rowNumber} has an empty ${field}.`);
  assertCondition(value.length <= 20_000, `${sourceName} row ${rowNumber} has an oversized ${field}.`);
  assertCondition(!/[\0\r\n]/u.test(value), `${sourceName} row ${rowNumber} has an unsafe ${field}.`);
}

function itemTuple(record) {
  return [record.Domain, record.Context1, record.Context2, record.Target1, record.Target2].join('\0');
}

function textTuple(record) {
  return [record.Context1, record.Context2, record.Target1, record.Target2].join('\0');
}

function setFromAuxiliaryCsv(text, sourceName, columns, key) {
  return new Set(recordsWithColumns(text, sourceName, columns).map(key));
}

export function adaptEwokCsv(text, options = {}) {
  const { sourceName = 'EWoK CSV', version = 'unknown', excluded = new Set(), reversed = new Set() } = options;
  const rows = parseCsvRows(text);
  const expectedColumns = rows[0]?.length === INVENTORY_COLUMNS.length ? INVENTORY_COLUMNS : ITEM_COLUMNS;
  const records = recordsWithColumns(text, sourceName, expectedColumns);
  const visible = [];
  const oracle = [];
  const ids = new Set();
  let excludedCount = 0;
  let reversedCount = 0;
  for (const [index, original] of records.entries()) {
    const rowNumber = index + 2;
    if (excluded.has(itemTuple(original))) {
      excludedCount += 1;
      continue;
    }
    const record = { ...original };
    if (reversed.has(textTuple(record))) {
      [record.Target1, record.Target2] = [record.Target2, record.Target1];
      reversedCount += 1;
    }
    for (const field of ['MetaTemplateID', 'TemplateID', 'Domain', 'ConceptA', 'ConceptB',
      'Target1', 'Target2', 'Context1', 'Context2', 'ContextType', 'TemplateName']) {
      validateText(record[field], field, sourceName, rowNumber);
    }
    validateText(record.PairID, 'PairID', sourceName, rowNumber, { allowEmpty: true });
    assertCondition(/^\d+$/u.test(record.TemplateIndex), `${sourceName} row ${rowNumber} has an invalid TemplateIndex.`);
    const itemVersion = record.Version ?? version;
    validateText(itemVersion, 'Version', sourceName, rowNumber);
    const baseId = sha256([
      itemVersion, record.MetaTemplateID, record.TemplateID, record.Domain,
      record.Target1, record.Target2, record.Context1, record.Context2,
    ].join('\0')).slice(0, 24);
    for (const targetIndex of [1, 2]) {
      const id = `ewok:${itemVersion}:${baseId}:target-${targetIndex}`;
      assertCondition(!ids.has(id), `${sourceName} row ${rowNumber} produces duplicate case ${id}.`);
      ids.add(id);
      visible.push(Object.freeze({
        format: 'eslm-benchmark-case-v1', id, family: 'ewok', split: 'development-inspected',
        kind: 'context-preference', target: record[`Target${targetIndex}`],
        contexts: Object.freeze([record.Context1, record.Context2]),
        metadata: Object.freeze({
          domain: record.Domain, concepts: Object.freeze([record.ConceptA, record.ConceptB]),
          contextType: record.ContextType, templateName: record.TemplateName,
          version: itemVersion, targetIndex,
        }),
      }));
      oracle.push(Object.freeze({ id, preferredContext: targetIndex }));
    }
  }
  return Object.freeze({
    pool: Object.freeze(visible), oracle: Object.freeze(oracle),
    sourceRows: records.length, retainedRows: visible.length / 2, excludedRows: excludedCount,
    reversedRows: reversedCount,
  });
}

function stableStratifiedSample(cases, limit, seed) {
  if (limit === undefined || limit >= cases.length) return cases;
  assertCondition(Number.isInteger(limit) && limit > 0, 'sample limit must be a positive integer.');
  const groups = new Map();
  for (const item of cases) {
    const key = `${item.metadata.domain}\0${item.metadata.version}\0${item.metadata.targetIndex}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const group of groups.values()) group.sort((left, right) =>
    sha256(`${seed}\0${left.id}`).localeCompare(sha256(`${seed}\0${right.id}`)));
  const selected = [];
  const keys = [...groups.keys()].sort();
  while (selected.length < limit) {
    let progressed = false;
    for (const key of keys) {
      const item = groups.get(key).shift();
      if (!item) continue;
      selected.push(item);
      progressed = true;
      if (selected.length === limit) break;
    }
    if (!progressed) break;
  }
  return selected;
}

async function verifiedText(relativePath, expectedDigest) {
  const path = join(PROJECT_ROOT, relativePath);
  const digest = await hashFile(path);
  assertCondition(digest === expectedDigest, `${relativePath} checksum mismatch.`);
  return Object.freeze({ path: relativePath, digest, text: await readFile(path, 'utf8') });
}

export async function ewokCacheStatus() {
  try {
    await Promise.all([
      access(join(PROJECT_ROOT, EWOK_SOURCE.protectedArchivePath)),
      access(join(PROJECT_ROOT, EWOK_SOURCE.configArchivePath)),
      access(join(PROJECT_ROOT, EWOK_SOURCE.protectedInventoryPath)),
      access(join(PROJECT_ROOT, EWOK_SOURCE.protectedRemovalPath)),
      access(join(PROJECT_ROOT, EWOK_SOURCE.protectedReversalPath)),
    ]);
    return Object.freeze({ id: 'ewok', cached: true, path: EWOK_SOURCE.protectedInventoryPath });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return Object.freeze({ id: 'ewok', cached: false, path: EWOK_SOURCE.protectedInventoryPath });
  }
}

export async function probeEwokProtectedCache(options = {}) {
  const [archiveDigest, configArchiveDigest, inventory, removal, reversal] = await Promise.all([
    hashFile(join(PROJECT_ROOT, EWOK_SOURCE.protectedArchivePath)),
    hashFile(join(PROJECT_ROOT, EWOK_SOURCE.configArchivePath)),
    verifiedText(EWOK_SOURCE.protectedInventoryPath, EWOK_SOURCE.protectedInventorySha256),
    verifiedText(EWOK_SOURCE.protectedRemovalPath, EWOK_SOURCE.protectedRemovalSha256),
    verifiedText(EWOK_SOURCE.protectedReversalPath, EWOK_SOURCE.protectedReversalSha256),
  ]);
  assertCondition(archiveDigest === EWOK_SOURCE.protectedArchiveSha256, 'protected analysis archive checksum mismatch.');
  assertCondition(configArchiveDigest === EWOK_SOURCE.configArchiveSha256, 'protected config archive checksum mismatch.');
  const excluded = setFromAuxiliaryCsv(
    removal.text, 'remove_from_results.csv', REMOVAL_COLUMNS, itemTuple,
  );
  const reversed = setFromAuxiliaryCsv(
    reversal.text, 'flagged_reverse.csv', REVERSAL_COLUMNS, textTuple,
  );
  const adapted = adaptEwokCsv(inventory.text, {
    sourceName: 'items_in_results.csv', excluded, reversed,
  });
  assertCondition(adapted.sourceRows === 4_397, `expected 4,397 analysis inventory rows, found ${adapted.sourceRows}.`);
  assertCondition(adapted.excludedRows === 25, `expected 25 explicit removals, found ${adapted.excludedRows}.`);
  assertCondition(adapted.retainedRows === 4_372, `expected 4,372 retained analysis-snapshot items, found ${adapted.retainedRows}.`);
  assertCondition(adapted.pool.length === 8_744, `expected 8,744 target-context decisions, found ${adapted.pool.length}.`);
  const seed = options.seed ?? 'eslm-ewok-development-probe-v1';
  const sampledPool = stableStratifiedSample(adapted.pool, options.limit ?? 110, seed);
  const oracleById = new Map(adapted.oracle.map((item) => [item.id, item]));
  return Object.freeze({
    format: 'eslm-benchmark-source-probe-v1', source: EWOK_SOURCE,
    archives: Object.freeze([
      { path: EWOK_SOURCE.protectedArchivePath, sha256: archiveDigest },
      { path: EWOK_SOURCE.configArchivePath, sha256: configArchiveDigest },
    ]),
    validation: Object.freeze({
      inventoryRows: adapted.sourceRows, excludedRows: adapted.excludedRows,
      reversedRows: adapted.reversedRows, retainedSnapshotItems: adapted.retainedRows,
      decisions: adapted.pool.length,
      protectedFiles: Object.freeze([
        { path: inventory.path, sha256: inventory.digest },
        { path: removal.path, sha256: removal.digest },
        { path: reversal.path, sha256: reversal.digest },
      ]),
    }),
    sample: Object.freeze({
      policy: 'stable round-robin across domain, dataset version, and target position',
      visibility: 'development-inspected', seed,
      cases: Object.freeze(sampledPool),
      oracle: Object.freeze(sampledPool.map((item) => oracleById.get(item.id))),
    }),
  });
}

export async function scoreEwokProbe(engine, cases, oracle) {
  const expected = new Map(oracle.map((item) => [item.id, item.preferredContext]));
  const outcomes = [];
  for (const item of cases) {
    assertCondition(expected.has(item.id), `oracle is missing ${item.id}.`);
    const scored = await Promise.all(item.contexts.map((context) => engine.scoreCompatibility
      ? engine.scoreCompatibility(context, item.target)
      : engine.scorePlausibility ? engine.scorePlausibility(`${context} ${item.target}`)
        : engine.score(`${context} ${item.target}`)));
    const scores = scored.map((result) => result.score);
    const preferred = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 1 : 2;
    outcomes.push(Object.freeze({
      id: item.id, domain: item.metadata.domain, pass: preferred === expected.get(item.id),
      tie: preferred === null, preferred, evidenceCounts: scored.map((result) => result.evidence?.length ?? 0),
    }));
  }
  const correct = outcomes.filter((item) => item.pass).length;
  return Object.freeze({
    protocol: 'ewok-symbolic-context-preference-development-diagnostic-v1',
    total: outcomes.length, correct, ties: outcomes.filter((item) => item.tie).length,
    accuracy: outcomes.length ? correct / outcomes.length : 0,
    outcomes: Object.freeze(outcomes),
  });
}
