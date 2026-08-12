import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { sha256 } from '../util.mjs';
import { assertBenchmarkAcquirable } from './benchmark-access-manifests.mjs';

export const SIMPLEQA_ID = 'simpleqa-official-test-2024';
export const SIMPLEQA_CACHE_ROOT = join(PROJECT_ROOT, 'training/.cache/benchmarks/simpleqa-official-test-2024');

function parseCsv(text) {
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
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.length > 0) throw new Error(`SimpleQA CSV has a quote inside an unquoted field at offset ${index}.`);
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('SimpleQA CSV ends inside a quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows;
}

function metadataValue(metadata, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = metadata.match(new RegExp(`'${escapedKey}'\\s*:\\s*'((?:\\\\.|[^'])*)'`, 'u'));
  return match?.[1]?.replace(/\\'/gu, "'").replace(/\\\\/gu, '\\');
}

function validateSimpleQaRows(bytes) {
  const rows = parseCsv(bytes.toString('utf8').replace(/^\uFEFF/u, ''));
  if (rows.length < 2) throw new Error('SimpleQA CSV must contain a header and at least one data row.');
  const expectedHeader = assertBenchmarkAcquirable(SIMPLEQA_ID).expectedArtifact.header;
  if (JSON.stringify(rows[0]) !== JSON.stringify(expectedHeader)) {
    throw new Error(`SimpleQA CSV header mismatch: ${JSON.stringify(rows[0])}`);
  }
  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index];
    if (values.length !== expectedHeader.length) {
      throw new Error(`SimpleQA CSV row ${index + 1} has ${values.length} fields; expected ${expectedHeader.length}.`);
    }
    if (!values[1].trim()) throw new Error(`SimpleQA CSV row ${index + 1} has an empty problem.`);
    if (!values[2].trim()) throw new Error(`SimpleQA CSV row ${index + 1} has an empty answer.`);
  }
  return rows.slice(1);
}

export function parseSimpleQaEvaluationCsv(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('SimpleQA evaluation input must be a Buffer.');
  const rows = validateSimpleQaRows(bytes);
  const cases = [];
  const oracle = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const [metadata, problem, answer] = rows[index];
    const id = `simpleqa:test:${String(index + 1).padStart(5, '0')}`;
    cases.push(Object.freeze({
      id,
      family: 'SimpleQA',
      split: 'test',
      kind: 'qa',
      text: problem,
      strata: Object.freeze({
        topic: metadataValue(metadata, 'topic') ?? 'unknown',
        answerType: metadataValue(metadata, 'answer_type') ?? 'unknown',
      }),
    }));
    oracle.set(id, answer);
  }
  return Object.freeze({
    format: 'eslm-simpleqa-evaluation-pool-v1',
    cases: Object.freeze(cases),
    oracle,
    leakagePolicy: Object.freeze({
      cases: 'evaluation-visible-label-free',
      oracle: 'local-evaluator-only-never-synthesis-visible',
    }),
  });
}

function cachePaths(cacheRoot) {
  return {
    raw: join(cacheRoot, 'raw', 'simple_qa_test_set.csv'),
    manifest: join(cacheRoot, 'cache-manifest.json'),
  };
}

export async function acquireSimpleQa(options = {}) {
  const source = assertBenchmarkAcquirable(SIMPLEQA_ID);
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new Error('SimpleQA acquisition requires a fetch implementation.');
  }
  const cacheRoot = options.cacheRoot ?? SIMPLEQA_CACHE_ROOT;
  const response = await fetchImplementation(source.source);
  if (!response.ok) throw new Error(`SimpleQA download failed with HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = sha256(bytes);
  if (bytes.length !== source.expectedArtifact.bytes) {
    throw new Error(`SimpleQA byte-size mismatch: ${bytes.length}; expected ${source.expectedArtifact.bytes}.`);
  }
  if (digest !== source.expectedArtifact.sha256) {
    throw new Error(`SimpleQA SHA-256 mismatch: ${digest}; expected ${source.expectedArtifact.sha256}.`);
  }
  const pool = parseSimpleQaEvaluationCsv(bytes);
  const paths = cachePaths(cacheRoot);
  await mkdir(join(cacheRoot, 'raw'), { recursive: true });
  const temporaryRaw = `${paths.raw}.tmp-${process.pid}`;
  await writeFile(temporaryRaw, bytes);
  await rename(temporaryRaw, paths.raw);
  const manifest = {
    format: 'eslm-benchmark-cache-v1',
    benchmarkId: SIMPLEQA_ID,
    adapter: 'eslm-simpleqa-evaluation-pool-v1',
    source: {
      url: source.source,
      repository: source.sourceRepository,
      revision: source.sourceRevision,
      evaluatorPath: source.evaluatorPath,
    },
    artifact: {
      path: relative(PROJECT_ROOT, paths.raw),
      bytes: bytes.length,
      sha256: digest,
      records: pool.cases.length,
      header: source.expectedArtifact.header,
    },
    splitIsolation: source.oraclePolicy,
    scoring: source.officialScoring,
  };
  const temporaryManifest = `${paths.manifest}.tmp-${process.pid}`;
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryManifest, paths.manifest);
  return Object.freeze({ manifest: Object.freeze(manifest), pool });
}

export async function openSimpleQaCache(options = {}) {
  const source = assertBenchmarkAcquirable(SIMPLEQA_ID);
  const paths = cachePaths(options.cacheRoot ?? SIMPLEQA_CACHE_ROOT);
  const [manifestText, bytes, rawStat] = await Promise.all([
    readFile(paths.manifest, 'utf8'),
    readFile(paths.raw),
    stat(paths.raw),
  ]);
  const manifest = JSON.parse(manifestText);
  if (manifest.format !== 'eslm-benchmark-cache-v1' || manifest.benchmarkId !== SIMPLEQA_ID) {
    throw new Error(`Unsupported SimpleQA cache manifest at ${paths.manifest}.`);
  }
  const digest = sha256(bytes);
  if (rawStat.size !== source.expectedArtifact.bytes || manifest.artifact.bytes !== rawStat.size) {
    throw new Error(`SimpleQA cached byte-size mismatch at ${paths.raw}.`);
  }
  if (digest !== source.expectedArtifact.sha256 || manifest.artifact.sha256 !== digest) {
    throw new Error(`SimpleQA cached SHA-256 mismatch at ${paths.raw}: ${digest}.`);
  }
  const pool = parseSimpleQaEvaluationCsv(bytes);
  if (manifest.artifact.records !== pool.cases.length) {
    throw new Error(`SimpleQA cached record-count mismatch: ${pool.cases.length}.`);
  }
  return Object.freeze({ manifest: Object.freeze(manifest), pool });
}

export async function simpleQaCacheStatus(options = {}) {
  try {
    const opened = await openSimpleQaCache(options);
    return Object.freeze({
      benchmarkId: SIMPLEQA_ID,
      cached: true,
      artifact: opened.manifest.artifact,
      leakagePolicy: opened.pool.leakagePolicy,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return Object.freeze({
        benchmarkId: SIMPLEQA_ID,
        cached: false,
        reason: 'Run explicit SimpleQA acquisition before evaluation.',
      });
    }
    throw error;
  }
}

function deterministicOrder(left, right, seed) {
  return sha256(`${seed}:${left.id}`).localeCompare(sha256(`${seed}:${right.id}`));
}

export function sampleSimpleQa(pool, count, seed = 'eslm-simpleqa-probe-v1') {
  if (!Number.isInteger(count) || count < 1) throw new Error('SimpleQA sample count must be a positive integer.');
  if (count > pool.cases.length) throw new Error(`SimpleQA sample count ${count} exceeds ${pool.cases.length} cases.`);
  const groups = new Map();
  for (const item of pool.cases) {
    const topic = item.strata.topic;
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(item);
  }
  const queues = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([, items]) => items.sort((left, right) => deterministicOrder(left, right, seed)));
  const selected = [];
  while (selected.length < count) {
    let advanced = false;
    for (const queue of queues) {
      const item = queue.shift();
      if (!item) continue;
      selected.push(item);
      advanced = true;
      if (selected.length === count) break;
    }
    if (!advanced) break;
  }
  return Object.freeze(selected);
}

function normalizedExactAnswer(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export async function runSimpleQaDiagnosticProbe(engine, pool, options = {}) {
  if (!engine || typeof engine.ask !== 'function') throw new Error('SimpleQA probe requires an ESLM engine.');
  const seed = options.seed ?? 'eslm-simpleqa-probe-v1';
  const sample = sampleSimpleQa(pool, options.count ?? 100, seed);
  const outcomes = [];
  const strategyResults = [];
  for (const item of sample) {
    const result = await engine.ask(item.text);
    strategyResults.push(Object.freeze({
      workPolicy: result.workPolicy,
      ...(result.approximation?.receipt?.strategyExecution ? {
        approximation: Object.freeze({
          receipt: Object.freeze({ strategyExecution: result.approximation.receipt.strategyExecution }),
        }),
      } : {}),
    }));
    const expected = pool.oracle.get(item.id);
    outcomes.push(Object.freeze({
      id: item.id,
      topic: item.strata.topic,
      status: result.status,
      languageRoute: result.languageRoute,
      methodId: result.plan?.methodId,
      usedKbVersions: Object.freeze(result.usedKbVersions ?? []),
      exactMatch: normalizedExactAnswer(result.answer) === normalizedExactAnswer(expected),
      wouldRequireLanguageFallback: result.status === 'UNPARSED',
    }));
  }
  const statusCounts = {};
  const topicCounts = {};
  for (const outcome of outcomes) {
    statusCounts[outcome.status] = (statusCounts[outcome.status] ?? 0) + 1;
    topicCounts[outcome.topic] = (topicCounts[outcome.topic] ?? 0) + 1;
  }
  const exact = outcomes.filter((outcome) => outcome.exactMatch).length;
  const fallback = outcomes.filter((outcome) => outcome.wouldRequireLanguageFallback).length;
  const selectedMethods = [...new Set(outcomes.map((outcome) => outcome.methodId).filter(Boolean))].toSorted();
  const usedKbVersionsByIdentity = new Map();
  for (const value of outcomes.flatMap((outcome) => outcome.usedKbVersions)) {
    if (!value?.kbId) continue;
    usedKbVersionsByIdentity.set(`${value.kbId}\u0000${value.version ?? ''}`, Object.freeze({
      kbId: value.kbId, ...(value.version ? { version: value.version } : {}),
    }));
  }
  return Object.freeze({
    format: 'eslm-simpleqa-diagnostic-report-v1',
    benchmarkId: SIMPLEQA_ID,
    protocol: 'deterministic-normalized-exact-match-diagnostic',
    comparability: 'not-an-official-simpleqa-score',
    scoringReason:
      'The official protocol uses semantic model grading; this probe intentionally does not invoke a judge.',
    seed,
    total: outcomes.length,
    exact,
    exactRate: exact / outcomes.length,
    wouldRequireLanguageFallback: fallback,
    languageFallbackRate: fallback / outcomes.length,
    statusCounts: Object.freeze(statusCounts),
    topicCounts: Object.freeze(topicCounts),
    selectedMethods: Object.freeze(selectedMethods),
    usedKbVersions: Object.freeze([...usedKbVersionsByIdentity.values()].toSorted((left, right) =>
      left.kbId.localeCompare(right.kbId) || String(left.version).localeCompare(String(right.version)))),
    strategyResults: Object.freeze(strategyResults),
    outcomes: Object.freeze(outcomes),
  });
}
