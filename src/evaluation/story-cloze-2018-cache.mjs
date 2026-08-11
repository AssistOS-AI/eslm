import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PROJECT_ROOT } from '../paths.mjs';
import { sha256 } from '../util.mjs';
import {
  adaptStoryCloze2018Csv,
  deriveStoryCloze2018Partition,
  STORY_CLOZE_2018_HEADERS,
  STORY_CLOZE_2018_ID,
} from './story-cloze-2018-adapter.mjs';

const MAX_REDIRECTS = 6;

export const STORY_CLOZE_2018_CACHE_ROOT = join(
  PROJECT_ROOT, 'training/.cache/benchmarks/story-cloze-winter-2018',
);

export const STORY_CLOZE_2018_SOURCE = Object.freeze({
  format: 'eslm-benchmark-source-registration-v1',
  id: STORY_CLOZE_2018_ID,
  family: 'Story Cloze',
  version: 'Winter 2018 bias-reduced release',
  task: 'select the coherent fifth sentence for a four-sentence story',
  landingPage: 'https://cs.rochester.edu/nlp/rocstories/',
  artifacts: Object.freeze({
    validation: Object.freeze({
      split: 'validation',
      sourceUrl: 'https://goo.gl/XWjas1',
      filename: 'validation.csv',
      bytes: 483_099,
      sha256: '1e8f4987664c12889426465481d998f843ad844cc97ba5d99f30c9032329664b',
      records: 1_571,
      header: STORY_CLOZE_2018_HEADERS.validation,
      oracle: 'delivered in AnswerRightEnding; host scorer only',
    }),
    test: Object.freeze({
      split: 'test',
      sourceUrl: 'https://goo.gl/BcTtB4',
      filename: 'test.csv',
      bytes: 493_717,
      sha256: '59b595fb2a12e0e4a659ab3a9ae42fcc7dfa2bda95977be018315e8284bd864a',
      records: 1_571,
      header: STORY_CLOZE_2018_HEADERS.test,
      oracle: 'official-evaluator-only; absent from the delivered test CSV',
    }),
  }),
  accessAndTerms: Object.freeze({
    accessMethod: 'official access-form delivery',
    authorizationEvidence:
      'The operator confirmed completion of the access flow and supplied the delivered short links.',
    deliveredTerms: 'No separate terms artifact accompanied the supplied validation and test links.',
    publicLicense: 'The official landing page does not state a reusable public dataset license.',
    storage: 'Keep source rows only in ignored protected cache.',
    redistribution:
      'Do not redistribute source rows or assume permission beyond the authorized research use.',
  }),
  citation: Object.freeze({
    authors: 'Rishi Sharma, James Allen, Omid Bakhshandeh, and Nasrin Mostafazadeh',
    title: 'Tackling the Story Ending Biases in The Story Cloze Test',
    venue: 'ACL 2018',
    url: 'https://aclanthology.org/P18-2119/',
    doi: '10.18653/v1/P18-2119',
  }),
});

function fail(message) {
  throw new Error(`Invalid Story Cloze 2018 cache: ${message}`);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function cachePaths(cacheRoot) {
  return Object.freeze({
    validation: join(cacheRoot, 'raw', STORY_CLOZE_2018_SOURCE.artifacts.validation.filename),
    test: join(cacheRoot, 'raw', STORY_CLOZE_2018_SOURCE.artifacts.test.filename),
    manifest: join(cacheRoot, 'cache-manifest.json'),
  });
}

function permittedDownloadUrl(url) {
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) return false;
  return url.hostname === 'goo.gl'
    || url.hostname === 'docs.google.com'
    || url.hostname.endsWith('.googleusercontent.com');
}

async function registeredArtifactBytes(response, expectedBytes) {
  assertCondition(response.body, 'download response has no body.');
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    assertCondition(total <= expectedBytes,
      `download exceeds the registered ${expectedBytes}-byte artifact identity.`);
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}

async function downloadDeliveredCsv(sourceUrl, expectedBytes, fetchImplementation) {
  let current = new URL(sourceUrl);
  assertCondition(permittedDownloadUrl(current), `download URL is not permitted: ${current.origin}.`);
  const redirectChain = [current.href];
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetchImplementation(current, {
      method: 'GET', redirect: 'manual', headers: { accept: 'text/csv,text/plain;q=0.5' },
      signal: AbortSignal.timeout(60_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      assertCondition(redirects < MAX_REDIRECTS, `download exceeds ${MAX_REDIRECTS} redirects.`);
      const location = response.headers.get('location');
      assertCondition(location, `HTTP ${response.status} redirect has no Location header.`);
      current = new URL(location, current);
      assertCondition(permittedDownloadUrl(current), `redirect target is not permitted: ${current.origin}.`);
      redirectChain.push(current.href);
      continue;
    }
    assertCondition(response.ok, `download failed with HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get('content-length'));
    assertCondition(!Number.isFinite(declaredLength) || declaredLength === expectedBytes,
      `declared download size does not match the registered ${expectedBytes}-byte artifact.`);
    const bytes = await registeredArtifactBytes(response, expectedBytes);
    return Object.freeze({ bytes, resolvedUrl: current.href, redirectChain: Object.freeze(redirectChain) });
  }
  fail(`download exceeds ${MAX_REDIRECTS} redirects.`);
}

async function atomicWrite(path, contents) {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, contents);
  await rename(temporary, path);
}

function assertArtifact(bytes, artifact, adapted) {
  assertCondition(bytes.length === artifact.bytes,
    `${artifact.split} byte-size mismatch: ${bytes.length}; expected ${artifact.bytes}.`);
  const digest = sha256(bytes);
  assertCondition(digest === artifact.sha256,
    `${artifact.split} SHA-256 mismatch: ${digest}; expected ${artifact.sha256}.`);
  assertCondition(adapted.sourceRows === artifact.records,
    `${artifact.split} row-count mismatch: ${adapted.sourceRows}; expected ${artifact.records}.`);
  return digest;
}

export async function acquireStoryCloze2018(options = {}) {
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  assertCondition(typeof fetchImplementation === 'function', 'acquisition requires a fetch implementation.');
  const cacheRoot = options.cacheRoot ?? STORY_CLOZE_2018_CACHE_ROOT;
  const paths = cachePaths(cacheRoot);
  const acquired = {};
  for (const split of ['validation', 'test']) {
    const artifact = STORY_CLOZE_2018_SOURCE.artifacts[split];
    const downloaded = await downloadDeliveredCsv(artifact.sourceUrl, artifact.bytes, fetchImplementation);
    const adapted = adaptStoryCloze2018Csv(downloaded.bytes, { split });
    const digest = assertArtifact(downloaded.bytes, artifact, adapted);
    acquired[split] = Object.freeze({ artifact, downloaded, adapted, digest });
  }
  await mkdir(join(cacheRoot, 'raw'), { recursive: true });
  await atomicWrite(paths.validation, acquired.validation.downloaded.bytes);
  await atomicWrite(paths.test, acquired.test.downloaded.bytes);
  const artifacts = Object.fromEntries(['validation', 'test'].map((split) => {
    const item = acquired[split];
    return [split, {
      split, sourceUrl: item.artifact.sourceUrl, resolvedUrl: item.downloaded.resolvedUrl,
      redirectChain: item.downloaded.redirectChain, path: relative(PROJECT_ROOT, paths[split]),
      bytes: item.downloaded.bytes.length, sha256: item.digest, records: item.adapted.sourceRows,
      header: item.artifact.header, oracle: item.artifact.oracle,
    }];
  }));
  const manifest = {
    format: 'eslm-benchmark-cache-v1', benchmarkId: STORY_CLOZE_2018_ID,
    adapter: 'eslm-adapted-benchmark-v1',
    source: {
      family: STORY_CLOZE_2018_SOURCE.family, version: STORY_CLOZE_2018_SOURCE.version,
      landingPage: STORY_CLOZE_2018_SOURCE.landingPage, citation: STORY_CLOZE_2018_SOURCE.citation,
    },
    accessAndTerms: STORY_CLOZE_2018_SOURCE.accessAndTerms,
    artifacts,
    splitIsolation: {
      validation: acquired.validation.adapted.leakagePolicy,
      test: acquired.test.adapted.leakagePolicy,
    },
    evaluationReadiness: {
      state: 'cached-source-with-generic-narrative-method',
      denominator: null,
      diagnosis:
        'The source is validated and a bounded narrative method exists. Measured development and fresh '
        + 'receipts remain separate from this acquisition manifest. The label-free test split still requires '
        + 'the external official evaluator.',
    },
  };
  await atomicWrite(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  return Object.freeze({
    manifest: Object.freeze(manifest),
    validation: acquired.validation.adapted,
    test: acquired.test.adapted,
  });
}

export async function openStoryCloze2018Cache(options = {}) {
  const cacheRoot = options.cacheRoot ?? STORY_CLOZE_2018_CACHE_ROOT;
  const paths = cachePaths(cacheRoot);
  const manifest = JSON.parse(await readFile(paths.manifest, 'utf8'));
  assertCondition(manifest.format === 'eslm-benchmark-cache-v1'
    && manifest.benchmarkId === STORY_CLOZE_2018_ID, 'cache manifest identity is invalid.');
  const opened = {};
  for (const split of ['validation', 'test']) {
    const expected = STORY_CLOZE_2018_SOURCE.artifacts[split];
    const [bytes, fileStat] = await Promise.all([readFile(paths[split]), stat(paths[split])]);
    const adapted = adaptStoryCloze2018Csv(bytes, { split });
    const digest = assertArtifact(bytes, expected, adapted);
    const recorded = manifest.artifacts?.[split];
    assertCondition(recorded?.bytes === fileStat.size && recorded.sha256 === digest
      && recorded.records === adapted.sourceRows, `${split} cache manifest evidence is inconsistent.`);
    opened[split] = adapted;
  }
  return Object.freeze({ manifest: Object.freeze(manifest), ...opened });
}

export async function openStoryCloze2018Partition(partitionManifest, poolName, options = {}) {
  assertCondition(partitionManifest?.format === 'eslm-story-cloze-partition-v1',
    'partition manifest format is invalid.');
  assertCondition(poolName === 'development' || poolName === 'fresh',
    'partition pool must be development or fresh.');
  const paths = cachePaths(options.cacheRoot ?? STORY_CLOZE_2018_CACHE_ROOT);
  const bytes = await readFile(paths.validation);
  assertCondition(sha256(bytes) === partitionManifest.sourceSha256,
    'partition source digest does not match the cached validation artifact.');
  const derived = deriveStoryCloze2018Partition(bytes, {
    seed: partitionManifest.seed, freshCount: partitionManifest.freshCases,
  });
  assertCondition(derived.partitionDigest === partitionManifest.partitionDigest,
    'partition digest does not reproduce from cached label-free identifiers.');
  const freshIds = new Set(partitionManifest.freshIds);
  const labelBlind = adaptStoryCloze2018Csv(bytes, {
    split: 'validation', oracleAllowlist: new Set(),
  });
  const selected = new Set(labelBlind.pool.filter((item) =>
    (poolName === 'fresh') === freshIds.has(item.id)).map((item) => item.id));
  const adapted = adaptStoryCloze2018Csv(bytes, { split: 'validation', oracleAllowlist: selected });
  const pool = adapted.pool.filter((item) => selected.has(item.id));
  const oracle = adapted.oracle.filter((item) => selected.has(item.id));
  assertCondition(pool.length === selected.size && oracle.length === selected.size,
    `${poolName} pool and oracle counts do not agree.`);
  return Object.freeze({
    ...adapted, partition: poolName, pool: Object.freeze(pool), oracle: Object.freeze(oracle),
    leakagePolicy: Object.freeze({
      pool: poolName === 'development' ? 'development-visible-label-free' : 'fresh-evaluation-visible-label-free',
      oracle: poolName === 'development'
        ? 'development host scorer only; aggregate failures may guide the current cycle'
        : 'fresh host scorer only; one aggregate evaluation after the development freeze',
    }),
  });
}

export async function storyCloze2018CacheStatus(options = {}) {
  try {
    const opened = await openStoryCloze2018Cache(options);
    return Object.freeze({
      benchmarkId: STORY_CLOZE_2018_ID, cached: true,
      artifacts: Object.freeze(Object.fromEntries(['validation', 'test'].map((split) => [split, Object.freeze({
        path: opened.manifest.artifacts[split].path, bytes: opened.manifest.artifacts[split].bytes,
        sha256: opened.manifest.artifacts[split].sha256, records: opened.manifest.artifacts[split].records,
        oracle: opened.manifest.artifacts[split].oracle,
      })]))),
      splitIsolation: Object.freeze(opened.manifest.splitIsolation),
      evaluationReadiness: Object.freeze(opened.manifest.evaluationReadiness),
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return Object.freeze({
        benchmarkId: STORY_CLOZE_2018_ID, cached: false,
        access: STORY_CLOZE_2018_SOURCE.accessAndTerms,
        reason: 'Acquire the operator-authorized delivered validation and test links into ignored cache.',
      });
    }
    throw error;
  }
}
