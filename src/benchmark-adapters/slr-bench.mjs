import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { buildSLRBenchInductionTask } from './slr-bench-induction.mjs';

export const SLR_BENCH_RELEASE = Object.freeze({
  id: 'aiml-tuda-slr-bench-v1-all',
  datasetUrl: 'https://huggingface.co/datasets/AIML-TUDA/SLR-Bench',
  datasetRevision: 'cecc0aa2602943ead28a4ea74c7a8f3c91264cbf',
  datasetLicense: 'CC-BY-4.0',
  generatorUrl: 'https://github.com/ml-research/ScalableLogicalReasoning',
  generatorRevision: '3b46979ccdf9bb1c624809cfc140fe7c5af0f778',
  generatorLicense: 'MIT',
  rewardUrl: 'https://huggingface.co/spaces/AIML-TUDA/VerifiableRewardsForScalableLogicalReasoning',
  rewardRevision: '79ef0851bd9c52f7a50aebf0f39db924d13840b9',
  config: 'v1-All',
  rawParquetShards: Object.freeze([
    Object.freeze({
      file: 'test-00000-of-00001.parquet', split: 'test', bytes: 12_229_345,
      sha256: '8f19a68e9d84edb9ca3015804e342aa4a0f43c85d13f9b88694adbe2d79f9548',
    }),
    Object.freeze({
      file: 'train-00000-of-00003.parquet', split: 'train', bytes: 6_425_086,
      sha256: 'b27b594ad2fbb251c8bd491cb3805ba4ef4ebe570eb03e7337b4911ea771b093',
    }),
    Object.freeze({
      file: 'train-00001-of-00003.parquet', split: 'train', bytes: 52_243_650,
      sha256: 'b905e239e054adb65df2178d93537186a0440870451673ceb6ae26170f199149',
    }),
    Object.freeze({
      file: 'train-00002-of-00003.parquet', split: 'train', bytes: 186_692_632,
      sha256: '446cbcd7aae0e844fd1b9f238a7b8cff89379fd396e9ff9f4f89a8ced4bf1449',
    }),
    Object.freeze({
      file: 'validation-00000-of-00001.parquet', split: 'validation', bytes: 2_479_845,
      sha256: '3b60f3f90726a94fa27de66864e848800a24edba3c8ee68ed5bdf69bc6a5e18d',
    }),
  ]),
});

const SPLITS = Object.freeze({ train: 18_053, validation: 200, test: 1_000 });
const FIELDS = Object.freeze([
  'id', 'prompt', 'ground-truth rule', 'validation program', 'symbols', 'curriculum level',
  'curriculum tier', 'rule sampling', 'rule complexity', 'background sampling', 'problem size',
  'vocabulary predicates', 'vocabulary car constants', 'validation_program_shortcuts',
]);

function invariant(condition, path, message) {
  if (!condition) throw new Error(`${path}: ${message}`);
}

function requiredString(value, path) {
  invariant(typeof value === 'string' && value.length > 0, path, 'expected a non-empty string.');
}

function stringValue(value, path) {
  invariant(typeof value === 'string', path, 'expected a string.');
}

function identifierStart(character) {
  return /[A-Za-z_]/u.test(character);
}

function identifierPart(character) {
  return /[A-Za-z0-9_]/u.test(character);
}

function tokenizeGroundProgram(source, path) {
  requiredString(source, path);
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const character = source[offset];
    if (/\s/u.test(character)) {
      offset += 1;
      continue;
    }
    if (character === '%') {
      const end = source.indexOf('\n', offset);
      offset = end === -1 ? source.length : end + 1;
      continue;
    }
    if ('(),.[]|'.includes(character)) {
      tokens.push(Object.freeze({ type: character, value: character, offset }));
      offset += 1;
      continue;
    }
    if (character === "'") {
      let end = offset + 1;
      let value = '';
      let closed = false;
      while (end < source.length) {
        if (source[end] === "'" && source[end + 1] === "'") {
          value += "'";
          end += 2;
        } else if (source[end] === "'") {
          closed = true;
          end += 1;
          break;
        } else {
          value += source[end];
          end += 1;
        }
      }
      invariant(closed, path, `unterminated quoted atom at byte ${offset}.`);
      tokens.push(Object.freeze({ type: 'atom', value, offset }));
      offset = end;
      continue;
    }
    const number = source.slice(offset).match(/^-?(?:\d+(?:\.\d+)?)/u)?.[0];
    if (number) {
      tokens.push(Object.freeze({ type: 'number', value: number, offset }));
      offset += number.length;
      continue;
    }
    if (identifierStart(character)) {
      let end = offset + 1;
      while (end < source.length && identifierPart(source[end])) end += 1;
      const value = source.slice(offset, end);
      invariant(!/^[A-Z_]/u.test(value), path,
        `validation programs must contain ground terms; found variable ${value} at byte ${offset}.`);
      tokens.push(Object.freeze({ type: 'atom', value, offset }));
      offset = end;
      continue;
    }
    throw new Error(`${path}: disallowed Prolog token at byte ${offset}; corpus programs are never executed.`);
  }
  return tokens;
}

function parseTerm(tokens, cursor, path) {
  const token = tokens[cursor.index];
  invariant(token, path, 'unexpected end of program while reading a term.');
  if (token.type === '[') {
    cursor.index += 1;
    const items = [];
    let tail;
    while (tokens[cursor.index]?.type !== ']') {
      items.push(parseTerm(tokens, cursor, path));
      if (tokens[cursor.index]?.type === '|') {
        cursor.index += 1;
        tail = parseTerm(tokens, cursor, path);
        break;
      }
      if (tokens[cursor.index]?.type === ',') cursor.index += 1;
      else break;
    }
    invariant(tokens[cursor.index]?.type === ']', path, 'unterminated list term.');
    cursor.index += 1;
    return Object.freeze({ kind: 'list', items: Object.freeze(items), tail });
  }
  invariant(token.type === 'atom' || token.type === 'number', path,
    `expected an atom, number, or list at byte ${token.offset}.`);
  cursor.index += 1;
  if (token.type === 'atom' && tokens[cursor.index]?.type === '(') {
    cursor.index += 1;
    const argumentsList = [];
    while (tokens[cursor.index]?.type !== ')') {
      argumentsList.push(parseTerm(tokens, cursor, path));
      if (tokens[cursor.index]?.type === ',') cursor.index += 1;
      else break;
    }
    invariant(tokens[cursor.index]?.type === ')', path, `unterminated compound term ${token.value}.`);
    cursor.index += 1;
    return Object.freeze({ kind: 'compound', functor: token.value, arguments: Object.freeze(argumentsList) });
  }
  return Object.freeze({ kind: token.type, value: token.value });
}

export function parseSLRValidationProgram(source, path = 'validation program') {
  const tokens = tokenizeGroundProgram(source, path);
  const cursor = { index: 0 };
  const facts = [];
  while (cursor.index < tokens.length) {
    const term = parseTerm(tokens, cursor, path);
    invariant(term.kind === 'compound', path, 'each validation statement must be a ground predicate fact.');
    invariant(tokens[cursor.index]?.type === '.', path,
      `expected a terminating period after ${term.functor}.`);
    cursor.index += 1;
    facts.push(term);
  }
  invariant(facts.length > 0, path, 'expected at least one ground validation fact.');
  return Object.freeze(facts);
}

function validateRow(record, sourceName, line) {
  const path = `${sourceName}:${line}`;
  invariant(record !== null && typeof record === 'object' && !Array.isArray(record), path,
    'expected a JSON object.');
  const keys = Object.keys(record).toSorted();
  const expected = [...FIELDS].toSorted();
  invariant(keys.length === expected.length && keys.every((key, index) => key === expected[index]), path,
    `expected exactly these fields: ${expected.join(', ')}; received: ${keys.join(', ')}.`);
  invariant(Number.isSafeInteger(record.id) && record.id >= 0, `${path}.id`,
    'expected a non-negative safe integer.');
  for (const field of [
    'prompt', 'ground-truth rule', 'validation program', 'symbols', 'curriculum tier',
    'rule sampling', 'rule complexity', 'background sampling', 'vocabulary car constants',
  ]) requiredString(record[field], `${path}.${field}`);
  stringValue(record.validation_program_shortcuts, `${path}.validation_program_shortcuts`);
  invariant(Number.isInteger(record['curriculum level'])
    && record['curriculum level'] >= 1 && record['curriculum level'] <= 20,
  `${path}.curriculum level`, 'expected an integer from 1 through 20.');
  for (const field of ['problem size', 'vocabulary predicates']) {
    invariant(Number.isSafeInteger(record[field]) && record[field] >= 0, `${path}.${field}`,
      'expected a non-negative safe integer.');
  }
  const facts = parseSLRValidationProgram(record['validation program'], `${path}.validation program`);
  return Object.freeze({ factCount: facts.length });
}

async function preparedFiles(root, split) {
  const directory = join(root, split);
  try {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => ({ name: `${split}/${entry.name}`, path: join(directory, entry.name) }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
    invariant(entries.length > 0, split, 'expected one or more prepared JSONL shards.');
    return entries;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return [{ name: `${split}.jsonl`, path: join(root, `${split}.jsonl`) }];
  }
}

async function streamSplit(root, split, onRecord) {
  invariant(Object.hasOwn(SPLITS, split), split, 'unrecognized SLR-Bench split.');
  const ids = new Set();
  const levels = {};
  const tiers = {};
  const shards = [];
  let rows = 0;
  let facts = 0;
  for (const source of await preparedFiles(root, split)) {
    const digest = createHash('sha256');
    const stream = createReadStream(source.path);
    stream.on('data', (chunk) => digest.update(chunk));
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    let shardRows = 0;
    for await (const line of lines) {
      if (!line.trim()) continue;
      rows += 1;
      shardRows += 1;
      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        throw new Error(`${source.name}:${shardRows}: invalid JSON: ${error.message}`);
      }
      const validated = validateRow(record, source.name, shardRows);
      invariant(!ids.has(record.id), `${source.name}:${shardRows}.id`, `duplicate ID ${record.id} within ${split}.`);
      ids.add(record.id);
      facts += validated.factCount;
      levels[record['curriculum level']] = (levels[record['curriculum level']] ?? 0) + 1;
      tiers[record['curriculum tier']] = (tiers[record['curriculum tier']] ?? 0) + 1;
      await onRecord?.(record);
    }
    shards.push(Object.freeze({ name: source.name, rows: shardRows, sha256: digest.digest('hex') }));
  }
  invariant(rows === SPLITS[split], split,
    `expected ${SPLITS[split]} rows from the pinned v1-All release, received ${rows}.`);
  const sha256 = createHash('sha256')
    .update(shards.map((item) => `${item.name}\0${item.rows}\0${item.sha256}`).join('\n'))
    .digest('hex');
  return Object.freeze({
    split, rows, facts, levels: Object.freeze(levels), tiers: Object.freeze(tiers),
    shards: Object.freeze(shards), sha256,
  });
}

export function slrBenchPreparedRoot(cacheRoot = join('training', '.cache')) {
  return join(cacheRoot, 'benchmarks', 'slr-bench', 'prepared');
}

export function slrBenchRawRoot(cacheRoot = join('training', '.cache')) {
  return join(cacheRoot, 'benchmarks', 'slr-bench', 'source', 'v1-All');
}

async function fileSha256(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

export async function verifySLRBenchRawParquet(root) {
  const shards = [];
  for (const descriptor of SLR_BENCH_RELEASE.rawParquetShards) {
    const path = join(root, descriptor.file);
    const file = await stat(path);
    invariant(file.size === descriptor.bytes, descriptor.file,
      `frozen source identity expects ${descriptor.bytes} bytes, received ${file.size}.`);
    const sha256 = await fileSha256(path);
    invariant(sha256 === descriptor.sha256, descriptor.file,
      `frozen source checksum mismatch: expected ${descriptor.sha256}, received ${sha256}.`);
    shards.push(Object.freeze({ ...descriptor }));
  }
  return Object.freeze({
    protocol: 'slr-bench-raw-parquet-verification-v1',
    revision: SLR_BENCH_RELEASE.datasetRevision,
    shards: Object.freeze(shards),
    bytes: shards.reduce((total, item) => total + item.bytes, 0),
  });
}

export async function inventorySLRBenchSource(root) {
  const splits = [];
  const globalIds = new Set();
  let crossSplitRepeatedIds = 0;
  for (const split of Object.keys(SPLITS)) {
    splits.push(await streamSplit(root, split, (record) => {
      if (globalIds.has(record.id)) crossSplitRepeatedIds += 1;
      else globalIds.add(record.id);
    }));
  }
  const sourceSetSha256 = createHash('sha256')
    .update(splits.map(({ split, rows, sha256 }) => `${split}\0${rows}\0${sha256}`).join('\n'))
    .digest('hex');
  return Object.freeze({
    protocol: 'slr-bench-source-inventory-v1',
    release: SLR_BENCH_RELEASE.id,
    rows: splits.reduce((total, item) => total + item.rows, 0),
    facts: splits.reduce((total, item) => total + item.facts, 0),
    idScope: 'split-local',
    uniqueNumericIds: globalIds.size,
    crossSplitRepeatedIds,
    splits: Object.freeze(splits),
    sourceSetSha256,
    validation: 'all-rows-streamed; all-validation-programs-parsed-as-inert-ground-facts',
    corpusProgramsExecuted: 0,
  });
}

export async function buildSLRBenchLifecycle(root) {
  const membership = createHash('sha256');
  const pools = { training: 0, development: 0, fresh: 0 };
  for (const split of Object.keys(SPLITS)) {
    const pool = split === 'train' ? 'training' : split === 'validation' ? 'development' : 'fresh';
    await streamSplit(root, split, (record) => {
      membership.update(`${pool}\0${split}\0${record.id}\n`);
      pools[pool] += 1;
    });
  }
  return Object.freeze({
    protocol: 'slr-bench-official-split-lifecycle-v1',
    policy: 'official-train-validation-test-splits; membership never depends on rule or validation oracle',
    training: pools.training,
    development: pools.development,
    fresh: pools.fresh,
    membershipSha256: membership.digest('hex'),
    freshVisibility: 'official-test-host-only-not-evaluated',
  });
}

function visibleTask(record, split) {
  return Object.freeze({
    taskId: `slr-bench:${split}:${record.id}`,
    sourceId: record.id,
    sourceSplit: split,
    operation: 'induce-symbolic-classification-rule',
    input: record.prompt,
    curriculum: Object.freeze({
      level: record['curriculum level'], tier: record['curriculum tier'],
      problemSize: record['problem size'], vocabularyPredicates: record['vocabulary predicates'],
    }),
    outputContract: Object.freeze({
      kind: 'safe-horn-classification-rule',
      validation: 'all-positive-examples-covered-and-all-negative-examples-rejected',
    }),
    inductionTask: buildSLRBenchInductionTask(record.prompt),
  });
}

async function collectPool(root, split) {
  const cases = [];
  const oracle = new Map();
  await streamSplit(root, split, (record) => {
    const task = visibleTask(record, split);
    cases.push(task);
    oracle.set(task.taskId, Object.freeze({
      referenceRule: record['ground-truth rule'],
      validationProgram: record['validation program'],
      validationProgramShortcuts: record.validation_program_shortcuts,
      symbols: record.symbols,
    }));
  });
  return Object.freeze({ cases: Object.freeze(cases), oracle });
}

export async function loadSLRBenchPool(root, { split = 'validation' } = {}) {
  invariant(split === 'validation', split,
    'bounded materialization is available only for validation; train must use streaming and test remains fresh.');
  const collected = await collectPool(root, split);
  return Object.freeze({
    protocol: 'slr-bench-label-free-pool-v1',
    split,
    available: collected.cases.length,
    oracle: 'host-only-not-returned',
    cases: collected.cases,
  });
}

export async function streamSLRBenchVisibleCases(root, { split = 'train', onCase } = {}) {
  invariant(split === 'train' || split === 'validation', split,
    'only official train and validation inputs may be exposed; test remains fresh host-only.');
  invariant(typeof onCase === 'function', 'onCase', 'a visible-case consumer is required.');
  let cases = 0;
  await streamSplit(root, split, async (record) => {
    cases += 1;
    await onCase(visibleTask(record, split));
  });
  return Object.freeze({
    protocol: 'slr-bench-visible-case-stream-v1', split, cases, oracle: 'host-only-not-returned',
  });
}

export async function runSLRBenchDevelopmentDiagnostic(engine, root) {
  invariant(engine && typeof engine.executeTask === 'function', 'engine', 'expected an ESLM-compatible task engine.');
  const collected = await collectPool(root, 'validation');
  const statusCounts = {};
  const testedByLevel = {};
  let answered = 0;
  for (const task of collected.cases) {
    const result = engine.executeTask(task);
    const status = result?.status ?? 'MISSING_STATUS';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    testedByLevel[task.curriculum.level] = (testedByLevel[task.curriculum.level] ?? 0) + 1;
    if (status === 'ANSWERED') answered += 1;
  }
  return Object.freeze({
    protocol: 'slr-bench-current-core-development-diagnostic-v1',
    runtimeProfile: 'direct-symbolic-no-language-agent',
    sourceSplit: 'official-validation',
    comparability: 'capability-availability diagnostic, not an official SLR-Bench score',
    tested: collected.cases.length,
    availableDevelopment: SPLITS.validation,
    freshNotTested: SPLITS.test,
    answered,
    statusCounts: Object.freeze(statusCounts),
    testedByLevel: Object.freeze(testedByLevel),
    languageAgentInvocations: 0,
    corpusProgramsExecuted: 0,
    missingCapabilityFamilies: Object.freeze([
      'inductive-safe-horn-rule-synthesis',
      'relational-and-recursive-rule-planning',
      'arithmetic-constraint-reasoning',
      'safe-candidate-rule-validation-against-labeled-examples',
    ]),
  });
}
